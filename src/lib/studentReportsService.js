import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, safeRealtimeChannel, safeRemoveChannel } from './supabase.js';
import { parseReportDateTime } from './reportDateUtils.js';
import { formatStudentName, formatYearBlock } from './studentFormatUtils.js';
import { getReportAttachment } from './reportAttachmentUtils.js';
import { resolveAuthenticReportStudent } from './reportStudentMapping.js';
import { getStudentAvatar } from './studentAvatarUtils.js';
import { subscribeToReportUpdates, registerVisibilityAndOnlineSync } from './realtimeSyncService.js';
import angelAvatar from '../assets/avatars/angel.png';

/**
 * Generate safe snake_case table name for a student
 * Example: 'Angel Lae Martinez' -> 'angel_lae_martinez_reports'
 */
export function getStudentReportsTableName(name) {
  if (!name) return 'student_reports';
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${clean}_reports`;
}

/**
 * Single canonical normalization function for student reports.
 * Used identically across Dashboard Stat Cards, My Reports, Active Reports,
 * Recent Reports, and Technical Personnel Reports.
 */
export function normalizeStudentReportItem(item, studentContext = null) {
  if (!item) return null;

  const rawStatus = item.status || 'Submitted';
  let displayStatus = 'RESOLVED';
  let statusClass = 'status-resolved';

  if (rawStatus === 'Submitted' || rawStatus === 'Under Review' || rawStatus === 'Reviewed') {
    displayStatus = 'UNDER REVIEW';
    statusClass = 'status-under-review';
  } else if (rawStatus === 'Under Repair' || rawStatus === 'Under repair') {
    displayStatus = 'UNDER REPAIR';
    statusClass = 'status-under-repair';
  } else if (rawStatus === 'On Hold' || rawStatus === 'on_hold') {
    displayStatus = 'ON HOLD';
    statusClass = 'status-on-hold';
  }

  const parsedDT = parseReportDateTime(item);
  const submittedDate = parsedDT.submittedDate;
  const submittedTime = parsedDT.submittedTime;

  let locCenter = item.location_center || item.computer_center || item.locationCenter;
  let locRoom = item.location_room || item.room || item.locationRoom;
  if (item.room && (typeof item.room === 'string') && item.room.includes(',')) {
    const parts = item.room.split(',');
    if (parts.length >= 2) {
      locCenter = parts[0].trim();
      locRoom = parts[1].trim();
    }
  }
  locCenter = locCenter || 'Computer Center';
  locRoom = locRoom || 'Room';

  // Resolve student reporter information
  const reportId = item.report_id || item.id || '';
  const authStudent = resolveAuthenticReportStudent(reportId, item.students || studentContext);

  const reporterName =
    formatStudentName(item.student_name || item.reportedByName || authStudent?.name || authStudent?.full_name || studentContext?.name || studentContext?.full_name) ||
    'Student Reporter';

  const reporterYearBlock =
    formatYearBlock(item.year_block || item.student_year_block || item.reportedByYearBlock || authStudent?.year_block || studentContext?.year_block) ||
    'BSIT 3-2';

  const reporterAvatar =
    authStudent?.avatar ||
    getStudentAvatar(authStudent || studentContext) ||
    (reporterName.toLowerCase().includes('angel') ? angelAvatar : null);

  const isUuid = (val) =>
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const resolvedUuid =
    isUuid(item.id)
      ? item.id
      : (isUuid(item.canonicalUuid)
          ? item.canonicalUuid
          : (isUuid(item.canonical_uuid)
              ? item.canonical_uuid
              : (isUuid(item.report_uuid)
                  ? item.report_uuid
                  : (isUuid(item.uuid) ? item.uuid : null))));

  return {
    id: reportId,
    report_id: reportId,
    canonicalUuid: resolvedUuid,
    canonical_uuid: resolvedUuid,
    report_uuid: resolvedUuid,
    unit_number: item.unit_number || item.unitNumber || 'PC-#01',
    unitNumber: item.unit_number || item.unitNumber || 'PC-#01',
    equipment: item.equipment || 'Equipment',
    computer_center: locCenter,
    locationCenter: locCenter,
    location_center: locCenter,
    room: locRoom,
    locationRoom: locRoom,
    location_room: locRoom,
    submittedDate,
    submitted_date: submittedDate,
    submittedTime,
    submitted_time: submittedTime,
    date_submitted: parsedDT.rawCreatedAt,
    raw_created_at: parsedDT.rawCreatedAt,
    created_at: parsedDT.rawCreatedAt,
    updated_at: item.updated_at || parsedDT.rawCreatedAt,
    status: rawStatus,
    display_status: displayStatus,
    displayStatus,
    status_class: statusClass,
    statusClass,
    student_id: item.student_id || authStudent?.student_id || studentContext?.student_id,
    student_name: reporterName,
    reportedByName: reporterName,
    student_year_block: reporterYearBlock,
    reportedByYearBlock: reporterYearBlock,
    avatar: reporterAvatar,
    description: item.description || '',
    remarks: item.remarks || null,
    photo_url: item.photo_url || item.photoUrl || null,
    attachment: getReportAttachment(item),
    history: Array.isArray(item.history) ? item.history : [],
    timestamps: item.timestamps || null,
    has_been_on_hold: Boolean(item.has_been_on_hold || item.on_hold_at || rawStatus === 'On Hold'),
  };
}

// Module-level in-memory cache and in-flight request tracker for instantaneous loads
const studentReportsCache = new Map();
const inFlightStudentRequests = new Map();

export function createEmptyStudentReportsData() {
  return {
    reports: [],
    activeReports: [],
    recentReports: [],
    stats: {
      total: 0,
      submitted: 0,
      underReview: 0,
      underRepair: 0,
      resolved: 0,
      onHold: 0,
      activeReportsCount: 0,
      resolvedCount: 0,
      savedGuidesCount: 0,
    },
    savedGuideIds: [],
  };
}

/**
 * Retrieve cached student reports and stats synchronously (0ms)
 */
export function getCachedStudentReports(studentKey) {
  if (!studentKey) return null;
  const isLester =
    studentKey === '24-2026-108' ||
    studentKey === 'bbb5f955-b361-4929-8055-031d61dd4f58' ||
    studentKey === 'lester@gmail.com';

  const cleanData = (parsed) => {
    if (!parsed || !Array.isArray(parsed.reports)) return null;
    if (!isLester) {
      const hasLR27 = parsed.reports.some(
        (r) => r.report_id === 'LR-27' || r.id === 'LR-27'
      );
      if (hasLR27) {
        parsed.reports = parsed.reports.filter(
          (r) => r.report_id !== 'LR-27' && r.id !== 'LR-27'
        );
        parsed.activeReports = (parsed.activeReports || []).filter(
          (r) => r.report_id !== 'LR-27' && r.id !== 'LR-27'
        );
        parsed.recentReports = (parsed.recentReports || []).filter(
          (r) => r.report_id !== 'LR-27' && r.id !== 'LR-27'
        );
        if (parsed.stats) {
          parsed.stats.total = parsed.reports.length;
          parsed.stats.resolved = parsed.reports.filter(
            (r) => r.status === 'Resolved' || r.display_status === 'RESOLVED'
          ).length;
          parsed.stats.resolvedCount = parsed.stats.resolved;
          parsed.stats.activeReportsCount = parsed.activeReports.length;
        }
      }
    }
    return parsed;
  };

  if (studentReportsCache.has(studentKey)) {
    const memData = cleanData(studentReportsCache.get(studentKey));
    if (memData) return memData;
  }
  try {
    const stored = sessionStorage.getItem(`fixie_student_reports_cache_${studentKey}`);
    if (stored) {
      const parsed = cleanData(JSON.parse(stored));
      if (parsed) {
        studentReportsCache.set(studentKey, parsed);
        return parsed;
      }
    }
  } catch {}
  return null;
}

/**
 * Persist cached student reports into memory and sessionStorage
 */
export function setCachedStudentReports(studentKey, data) {
  if (!studentKey || !data) return;
  studentReportsCache.set(studentKey, data);
  try {
    sessionStorage.setItem(`fixie_student_reports_cache_${studentKey}`, JSON.stringify(data));
  } catch {}
}

/**
 * Invalidate student reports cache
 */
export function invalidateStudentReportsCache(studentKey) {
  if (studentKey) {
    studentReportsCache.delete(studentKey);
    try {
      sessionStorage.removeItem(`fixie_student_reports_cache_${studentKey}`);
    } catch {}
  } else {
    studentReportsCache.clear();
  }
}

/**
 * Shared function to fetch authentic reports and statistics from Supabase
 * for a specific student with parallel queries and request deduplication.
 * Uses Supabase as the single source of truth.
 */
export async function fetchStudentReportsAndStats(student) {
  if (!student) {
    return createEmptyStudentReportsData();
  }

  // 1. Resolve student UUID and Student Number
  const sId = student.student_id || student.username;
  const sUuid = student.id;
  const sEmail = student.email;
  const cacheKey = sId || sUuid || sEmail;

  if (!cacheKey) {
    return createEmptyStudentReportsData();
  }

  // Deduplicate concurrent in-flight requests for the same student
  if (inFlightStudentRequests.has(cacheKey)) {
    return inFlightStudentRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      let resolvedUuid = sUuid;
      let resolvedId = sId;
      let resolvedEmail = sEmail;
      let resolvedName = student.name || student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim();

      const isUuid = (val) =>
        typeof val === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      // Verify and resolve student profile if UUID or student_id is missing or not a valid UUID
      if (!isUuid(resolvedUuid) || !resolvedId) {
        try {
          let query = supabase.from('students').select('*');
          if (resolvedId) query = query.eq('student_id', resolvedId);
          else if (resolvedEmail) query = query.eq('email', resolvedEmail);
          else if (isUuid(resolvedUuid)) query = query.eq('id', resolvedUuid);

          const { data: dbSt } = await query.maybeSingle();
          if (dbSt) {
            resolvedUuid = dbSt.id;
            resolvedId = dbSt.student_id;
            resolvedEmail = dbSt.email;
            resolvedName = dbSt.name || `${dbSt.first_name || ''} ${dbSt.last_name || ''}`.trim();
          }
        } catch (err) {
          console.warn('Student profile resolution notice:', err.message);
        }
      }

      const isTargetJohnLester =
        resolvedId === '24-2026-108' ||
        resolvedUuid === 'bbb5f955-b361-4929-8055-031d61dd4f58' ||
        resolvedEmail === 'lester@gmail.com';

      const reportsMap = new Map();

      // Helper to add reports safely without duplication and with strict ownership verification
      const addReports = (list) => {
        if (!Array.isArray(list)) return;
        for (const item of list) {
          if (!item) continue;
          const key = item.report_id || item.id;
          if (!key) continue;

          // LR-27 MUST ONLY appear in John Lester's account
          if (key === 'LR-27') {
            if (!isTargetJohnLester) {
              continue;
            }
          }

          // Check ownership: report must belong to this student
          const itemStudentId = item.student_id || item.studentId;
          const itemStudentUuid = item.student_uuid || item.canonicalUuid || item.canonical_uuid || item.user_id;

          const matchesId = resolvedId && itemStudentId === resolvedId;
          const matchesUuid = resolvedUuid && (itemStudentId === resolvedUuid || itemStudentUuid === resolvedUuid);
          const matchesJoinedStudent = item.students && (item.students.id === resolvedUuid || item.students.student_id === resolvedId);

          if (!matchesId && !matchesUuid && !matchesJoinedStudent) {
            // Strictly reject reports that do not belong to the logged-in student
            continue;
          }

          const normalized = normalizeStudentReportItem(item, {
            id: resolvedUuid,
            student_id: resolvedId,
            name: resolvedName,
            email: resolvedEmail,
          });

          // Prefer row with newer updated_at/created_at, but preserve photo_url if present
          if (!reportsMap.has(key)) {
            reportsMap.set(key, normalized);
          } else {
            const existing = reportsMap.get(key);
            const existingTime = new Date(existing.date_submitted || existing.created_at || 0).getTime();
            const newTime = new Date(normalized.date_submitted || normalized.created_at || 0).getTime();
            const mergedPhotoUrl = normalized.photo_url || existing.photo_url || null;
            const mergedAttachment = normalized.attachment || existing.attachment || null;

            if (newTime >= existingTime) {
              reportsMap.set(key, {
                ...normalized,
                photo_url: mergedPhotoUrl,
                attachment: mergedAttachment,
              });
            } else {
              reportsMap.set(key, {
                ...existing,
                photo_url: mergedPhotoUrl,
                attachment: mergedAttachment,
              });
            }
          }
        }
      };

      // Only incorporate locally submitted reports for THIS student (DO NOT load global 'fixie_student_reports')
      try {
        if (resolvedId) {
          const studentStored = localStorage.getItem(`fixie_student_reports_${resolvedId}`);
          if (studentStored) addReports(JSON.parse(studentStored));
        }
      } catch {}

      // Prepare parallel queries for Supabase (filtered strictly by student)
      const queryPromises = [];

      // Query 1: `reports_of_student` table
      if (resolvedId || resolvedUuid) {
        let rosQuery = supabase.from('reports_of_student').select('*').order('date_submitted', { ascending: false });
        if (resolvedId && resolvedUuid) {
          rosQuery = rosQuery.or(`student_id.eq.${resolvedId},student_id.eq.${resolvedUuid}`);
        } else if (resolvedId) {
          rosQuery = rosQuery.eq('student_id', resolvedId);
        } else {
          rosQuery = rosQuery.eq('student_id', resolvedUuid);
        }

        queryPromises.push(
          rosQuery
            .then(({ data, error }) => {
              if (!error && Array.isArray(data)) return { type: 'ros', data };
              return { type: 'ros', data: [] };
            })
            .catch(() => ({ type: 'ros', data: [] }))
        );
      }

      // Query 2: canonical `reports` table (single source of truth - strictly filtered by UUID)
      if (resolvedUuid && isUuid(resolvedUuid)) {
        queryPromises.push(
          supabase
            .from('reports')
            .select('*, students(*)')
            .eq('student_id', resolvedUuid)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
              if (!error && Array.isArray(data)) return { type: 'rep', data };
              if (error) console.warn('Supabase reports query notice:', error.message);
              return { type: 'rep', data: [] };
            })
            .catch(() => ({ type: 'rep', data: [] }))
        );
      }

      // Query 3: `saved_guides` for this student
      if (resolvedUuid && isUuid(resolvedUuid)) {
        queryPromises.push(
          supabase
            .from('saved_guides')
            .select('guide_id')
            .eq('student_id', resolvedUuid)
            .then(({ data, error }) => {
              if (!error && Array.isArray(data)) {
                return { type: 'saved_guides', data: data.map((row) => row.guide_id).filter(Boolean) };
              }
              return { type: 'saved_guides', data: [] };
            })
            .catch(() => ({ type: 'saved_guides', data: [] }))
        );
      }

      // Execute all Supabase queries simultaneously in parallel
      const settledResults = await Promise.allSettled(queryPromises);

      let savedGuideIds = [];

      for (const res of settledResults) {
        if (res.status === 'fulfilled' && res.value) {
          if (res.value.type === 'saved_guides') {
            savedGuideIds = res.value.data || [];
          } else if (Array.isArray(res.value.data)) {
            addReports(res.value.data);
          }
        }
      }

      // All reports for this student sorted chronologically descending
      const allReports = Array.from(reportsMap.values()).sort((a, b) => {
        const timeA = new Date(a.date_submitted || a.created_at || 0).getTime();
        const timeB = new Date(b.date_submitted || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      // Calculate accurate statistics directly from data
      let submitted = 0;
      let underReview = 0;
      let underRepair = 0;
      let resolved = 0;
      let onHold = 0;

      for (const r of allReports) {
        const st = r.status;
        const disp = r.displayStatus || r.display_status;

        if (st === 'Submitted') {
          submitted += 1;
        }

        if (st === 'Under Review' || st === 'Reviewed' || st === 'Submitted' || disp === 'UNDER REVIEW') {
          underReview += 1;
        } else if (st === 'Under Repair' || st === 'Under repair' || disp === 'UNDER REPAIR') {
          underRepair += 1;
        } else if (st === 'Resolved' || disp === 'RESOLVED') {
          resolved += 1;
        } else if (st === 'On Hold' || st === 'on_hold' || disp === 'ON HOLD') {
          onHold += 1;
        }
      }

      // Active reports are tickets not resolved
      const activeReportsList = allReports.filter((r) => {
        const st = r.status;
        const disp = r.displayStatus || r.display_status;
        return st !== 'Resolved' && disp !== 'RESOLVED';
      });

      // Recent reports are strictly the student's latest reports (up to 5) by actual timestamp
      const recentReportsList = allReports.slice(0, 5);

      const stats = {
        total: allReports.length,
        submitted,
        underReview,
        underRepair,
        resolved,
        onHold,
        activeReportsCount: activeReportsList.length,
        resolvedCount: resolved,
        savedGuidesCount: savedGuideIds.length,
      };

      const finalResult = {
        reports: allReports,
        activeReports: activeReportsList,
        recentReports: recentReportsList,
        stats,
        savedGuideIds,
      };

      // Store in memory & session cache
      setCachedStudentReports(cacheKey, finalResult);
      if (resolvedId && resolvedId !== cacheKey) {
        setCachedStudentReports(resolvedId, finalResult);
      }
      if (resolvedUuid && resolvedUuid !== cacheKey) {
        setCachedStudentReports(resolvedUuid, finalResult);
      }

      return finalResult;
    } finally {
      inFlightStudentRequests.delete(cacheKey);
    }
  })();

  inFlightStudentRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Shared React hook for consuming student reports, active reports,
 * recent reports, and dashboard statistics with instant cache + real-time sync.
 */
export function useStudentReports(studentProfile, { enabled = true } = {}) {
  const studentKey = useMemo(() => {
    return studentProfile?.student_id || studentProfile?.id || studentProfile?.email || '';
  }, [studentProfile?.student_id, studentProfile?.id, studentProfile?.email]);

  const [data, setData] = useState(() => {
    const cached = getCachedStudentReports(studentKey);
    if (cached) return cached;
    return createEmptyStudentReportsData();
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (!enabled) return false;
    const cached = getCachedStudentReports(studentKey);
    return !cached;
  });

  const loadData = useCallback(async (isBackground = false) => {
    if (!enabled || !studentKey) {
      setIsLoading(false);
      return;
    }
    const hasCache = Boolean(getCachedStudentReports(studentKey));
    if (!hasCache && !isBackground) {
      setIsLoading(true);
    }
    try {
      const res = await fetchStudentReportsAndStats(studentProfile);
      setData(res);
    } catch (err) {
      console.warn('Error loading student reports data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, studentKey, studentProfile]);

  useEffect(() => {
    if (enabled && studentKey) {
      const cached = getCachedStudentReports(studentKey);
      if (cached) {
        setData(cached);
      }
      loadData(Boolean(cached));
    }
  }, [enabled, studentKey]);

  // Real-time synchronization listeners
  useEffect(() => {
    if (!enabled || !studentKey) return;

    // Helper to compute stats from a reports array
    const recomputeStudentStats = (reportsArr, prevStats = {}) => {
      let submitted = 0;
      let underReview = 0;
      let underRepair = 0;
      let onHold = 0;
      let resolved = 0;

      reportsArr.forEach((r) => {
        if (r.status === 'Submitted') submitted += 1;
        if (r.status === 'Submitted' || r.status === 'Reviewed' || r.status === 'Under Review') underReview += 1;
        if (r.status === 'Under Repair' || r.status === 'Under repair') underRepair += 1;
        if (r.status === 'On Hold' || r.status === 'on_hold') onHold += 1;
        if (r.status === 'Resolved') resolved += 1;
      });

      const activeReportsList = reportsArr.filter(
        (r) => r.status !== 'Resolved' && r.display_status !== 'RESOLVED'
      );

      return {
        stats: {
          ...prevStats,
          total: reportsArr.length,
          submitted,
          underReview,
          underRepair,
          onHold,
          resolved,
          activeReportsCount: activeReportsList.length,
          resolvedCount: resolved,
        },
        activeReports: activeReportsList,
        recentReports: reportsArr.slice(0, 3),
      };
    };

    const handleSyncReportPayload = (payload) => {
      if (!payload) return;
      const targetId = payload.report_id || payload.id || payload.reportId;
      const eventType = payload.eventType || (payload.report ? 'INSERT' : 'UPDATE');
      const newStatus = payload.new_status || payload.newStatus || payload.status;
      const newRemarks = payload.remarks !== undefined ? payload.remarks : payload.newRemarks;

      // LR-27 updates should only ever affect John Lester's account
      if (targetId === 'LR-27') {
        const isLester =
          studentKey === '24-2026-108' ||
          studentKey === 'bbb5f955-b361-4929-8055-031d61dd4f58' ||
          studentKey === 'lester@gmail.com';
        if (!isLester) return;
      }

      if (eventType === 'DELETE') {
        setData((prev) => {
          if (!prev || !Array.isArray(prev.reports)) return prev;
          const updatedReports = prev.reports.filter(
            (r) =>
              r.report_id !== targetId &&
              r.id !== targetId &&
              r.canonicalUuid !== targetId &&
              r.report_uuid !== targetId
          );
          if (updatedReports.length === prev.reports.length) return prev;
          const computed = recomputeStudentStats(updatedReports, prev.stats);
          const updated = {
            ...prev,
            reports: updatedReports,
            activeReports: computed.activeReports,
            recentReports: computed.recentReports,
            stats: computed.stats,
          };
          setCachedStudentReports(studentKey, updated);
          return updated;
        });
      } else if (eventType === 'INSERT') {
        const rawReport = payload.report || payload.new || payload;
        const payloadStudent =
          rawReport.student_id ||
          rawReport.studentId ||
          rawReport.student_uuid ||
          payload.student_id ||
          payload.studentId;

        const belongsToThisStudent =
          !payloadStudent ||
          payloadStudent === studentProfile?.id ||
          payloadStudent === studentProfile?.student_id ||
          payloadStudent === studentKey;

        if (belongsToThisStudent) {
          const normalized = normalizeStudentReportItem(rawReport, studentProfile);
          if (normalized) {
            setData((prev) => {
              if (!prev || !Array.isArray(prev.reports)) return prev;
              const exists = prev.reports.some(
                (r) =>
                  r.report_id === normalized.report_id ||
                  r.id === normalized.id ||
                  (normalized.canonicalUuid && (r.canonicalUuid === normalized.canonicalUuid || r.id === normalized.canonicalUuid))
              );
              if (exists) return prev;
              const updatedReports = [normalized, ...prev.reports];
              const computed = recomputeStudentStats(updatedReports, prev.stats);
              const updated = {
                ...prev,
                reports: updatedReports,
                activeReports: computed.activeReports,
                recentReports: computed.recentReports,
                stats: computed.stats,
              };
              setCachedStudentReports(studentKey, updated);
              return updated;
            });
          }
        }
      } else if (targetId && (newStatus || newRemarks !== undefined)) {
        setData((prev) => {
          if (!prev || !Array.isArray(prev.reports)) return prev;
          let matched = false;
          const updatedReports = prev.reports.map((r) => {
            const isMatch =
              r.report_id === targetId ||
              r.id === targetId ||
              r.canonicalUuid === targetId ||
              r.report_uuid === targetId ||
              (payload.canonicalUuid && (r.canonicalUuid === payload.canonicalUuid || r.report_uuid === payload.canonicalUuid || r.id === payload.canonicalUuid)) ||
              (payload.reportCode && (r.report_id === payload.reportCode || r.id === payload.reportCode));

            if (isMatch) {
              matched = true;
              return normalizeStudentReportItem({
                ...r,
                status: newStatus || r.status,
                remarks: newRemarks !== undefined ? newRemarks : r.remarks,
                updated_at: payload.updated_at || new Date().toISOString(),
              });
            }
            return r;
          });

          if (!matched) {
            const payloadStudent = payload.student_id || payload.student_uuid || payload.studentId;
            if (
              payloadStudent &&
              (payloadStudent === studentProfile?.id || payloadStudent === studentProfile?.student_id)
            ) {
              loadData(true);
            }
            return prev;
          }

          const computed = recomputeStudentStats(updatedReports, prev.stats);
          const updated = {
            ...prev,
            reports: updatedReports,
            activeReports: computed.activeReports,
            recentReports: computed.recentReports,
            stats: computed.stats,
          };
          setCachedStudentReports(studentKey, updated);
          return updated;
        });
      }
    };

    // 1. Supabase real-time channel with collision-safe unique name
    let channel = null;
    try {
      const isUuid = (val) =>
        typeof val === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const studentUuid = studentProfile?.id;
      const validUuid = isUuid(studentUuid) ? studentUuid : null;
      const schoolId = studentProfile?.student_id;

      let ch = safeRealtimeChannel(`student-reports-sync-${studentKey}`);

      if (validUuid) {
        ch = ch.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reports',
            filter: `student_id=eq.${validUuid}`,
          },
          (p) => {
            handleSyncReportPayload({
              ...p.new,
              ...p.old,
              eventType: p.eventType,
              new: p.new,
              old: p.old,
            });
            loadData(true);
          }
        );
      }

      if (schoolId) {
        ch = ch.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reports_of_student',
            filter: `student_id=eq.${schoolId}`,
          },
          (p) => {
            handleSyncReportPayload({
              ...p.new,
              ...p.old,
              eventType: p.eventType,
              new: p.new,
              old: p.old,
            });
            loadData(true);
          }
        );
      }

      if (validUuid) {
        ch = ch.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'saved_guides',
            filter: `student_id=eq.${validUuid}`,
          },
          () => {
            loadData(true);
          }
        );
      }

      channel = ch.subscribe();
    } catch (chanErr) {
      console.warn('Realtime subscription setup note:', chanErr);
    }

    // 2. Centralized Realtime Broadcast & Cross-tab listener
    const unsubscribeSync = subscribeToReportUpdates(handleSyncReportPayload);

    // 3. Cross-component window events
    const handleStatusUpdate = () => loadData(true);
    const handleSavedUpdate = (e) => {
      if (typeof e.detail?.count === 'number') {
        setData((prev) => {
          const updated = {
            ...prev,
            stats: {
              ...prev.stats,
              savedGuidesCount: e.detail.count,
            },
            savedGuideIds: e.detail.savedIds || prev.savedGuideIds,
          };
          setCachedStudentReports(studentKey, updated);
          return updated;
        });
      } else {
        loadData(true);
      }
    };

    window.addEventListener('fixie_report_status_updated', handleStatusUpdate);
    window.addEventListener('fixie_report_submitted', handleStatusUpdate);
    window.addEventListener('fixie_saved_guides_updated', handleSavedUpdate);

    // 4. Tab visibility and network reconnect refetching
    const unsubVisibility = registerVisibilityAndOnlineSync(() => loadData(true));

    return () => {
      safeRemoveChannel(channel);
      unsubscribeSync();
      unsubVisibility();
      window.removeEventListener('fixie_report_status_updated', handleStatusUpdate);
      window.removeEventListener('fixie_report_submitted', handleStatusUpdate);
      window.removeEventListener('fixie_saved_guides_updated', handleSavedUpdate);
    };
  }, [enabled, studentKey, loadData]);

  return {
    ...data,
    isLoading: enabled ? isLoading : false,
    refetch: () => loadData(false),
  };
}

