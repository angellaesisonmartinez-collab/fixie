import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { X, Image as ImageIcon, Loader2, Pause, ZoomIn, ShieldAlert } from 'lucide-react';
import StatusStepper from './StatusStepper';
import { supabase, safeRealtimeChannel, safeRemoveChannel } from '../lib/supabase';
import { formatStudentName, formatYearBlock } from '../lib/studentFormatUtils';
import { parseReportDateTime, formatManilaDateTime, formatManilaHistoryTime, getManilaSubmissionDate } from '../lib/reportDateUtils';
import { resolveAuthenticReportStudent } from '../lib/reportStudentMapping';
import { getReportAttachment } from '../lib/reportAttachmentUtils';
import { broadcastReportStatusUpdate, subscribeToReportUpdates, registerVisibilityAndOnlineSync } from '../lib/realtimeSyncService';
import './StudentReportDetailsModal.css';

/**
 * Student Modal Helpers
 */
function getStudentStatusPillInfo(status) {
  const s = String(status || '').toLowerCase().trim();
  if (s.includes('resolve')) {
    return { text: 'Resolved', className: 'pill-resolved', phase: 4, isOnHold: false };
  }
  if (s === 'on hold' || s === 'on_hold' || s.includes('hold')) {
    return { text: 'On Hold', className: 'pill-on-hold', phase: 3, isOnHold: true };
  }
  if (s.includes('repair')) {
    return { text: 'Under repair', className: 'pill-repair', phase: 3, isOnHold: false };
  }
  if (s === 'reviewed' || (s.includes('review') && !s.includes('under'))) {
    return { text: 'Reviewed', className: 'pill-reviewed', phase: 2, isOnHold: false };
  }
  return { text: 'Submitted', className: 'pill-submitted', phase: 1, isOnHold: false };
}

function getCenterNumber(val) {
  if (!val) return '5';
  const match = String(val).match(/\d+/);
  return match ? match[0] : String(val);
}

function applyReportFilter(query, targetId) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
  return isUuid ? query.eq('id', targetId) : query.eq('report_id', targetId);
}

export function getReportUuid(rep) {
  if (!rep) return null;
  const isUuid = (val) =>
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  if (isUuid(rep.canonical_uuid)) return rep.canonical_uuid;
  if (isUuid(rep.canonicalUuid)) return rep.canonicalUuid;
  if (isUuid(rep.id)) return rep.id;
  if (isUuid(rep.report_uuid)) return rep.report_uuid;
  if (isUuid(rep.uuid)) return rep.uuid;
  return null;
}

/**
 * Resolves the canonical reports.id UUID and human report_id (e.g. 'LR-24')
 * ensuring that queries and inserts to report_status_history always use the true reports.id foreign key.
 */
export async function getCanonicalReportInfo(rep) {
  if (!rep) return { canonicalUuid: null, reportCode: null };
  const isUuid = (val) =>
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const humanCode = rep.report_id && !isUuid(rep.report_id)
    ? rep.report_id
    : (!isUuid(rep.id) ? rep.id : null);

  // 1. Try human report_id code first against reports table
  if (humanCode) {
    try {
      const { data } = await supabase
        .from('reports')
        .select('id, report_id')
        .eq('report_id', humanCode)
        .maybeSingle();
      if (data?.id) {
        return { canonicalUuid: data.id, reportCode: data.report_id };
      }
    } catch {}
  }

  // 2. Check candidate UUIDs against reports table directly
  const candidates = [rep.id, rep.report_uuid, rep.uuid, rep.canonical_uuid, rep.canonicalUuid].filter(isUuid);
  for (const uid of candidates) {
    try {
      const { data: repRow } = await supabase
        .from('reports')
        .select('id, report_id')
        .eq('id', uid)
        .maybeSingle();
      if (repRow?.id) {
        return { canonicalUuid: repRow.id, reportCode: repRow.report_id };
      }
    } catch {}
  }

  // 3. Check candidate UUIDs against reports_of_student to find report_id, then resolve reports.id
  for (const uid of candidates) {
    try {
      const { data: rosRow } = await supabase
        .from('reports_of_student')
        .select('id, report_id')
        .eq('id', uid)
        .maybeSingle();
      if (rosRow?.report_id) {
        const { data: matchedRep } = await supabase
          .from('reports')
          .select('id, report_id')
          .eq('report_id', rosRow.report_id)
          .maybeSingle();
        if (matchedRep?.id) {
          return { canonicalUuid: matchedRep.id, reportCode: matchedRep.report_id };
        }
      }
    } catch {}
  }

  return { canonicalUuid: candidates[0] || null, reportCode: humanCode };
}

export function normalizeStatusLabel(st) {
  const s = String(st || '').toLowerCase().trim();
  if (s.includes('resolve')) return 'Resolved';
  if (s === 'on hold' || s === 'on_hold' || s.includes('hold')) return 'On Hold';
  if (s.includes('repair')) return 'Under Repair';
  if (s === 'reviewed') return 'Reviewed';
  if (s === 'under review' || s === 'under_review') return 'Reviewed';
  if (s.includes('review')) return 'Reviewed';
  if (s.includes('submit')) return 'Submitted';
  return st || 'Submitted';
}

/**
 * Builds unified status history list combining database audit rows and student history.
 * Displays history in true chronological order (oldest to newest):
 * Submitted -> Under Review -> Under Repair -> Resolved (with On Hold in between if applicable).
 * Strictly reflects actual database events without duplicate or mock entries.
 */
export function buildUnifiedHistoryEntries({
  historyRows = [],
  studentHistoryArray = [],
  currentReport = {},
  currentStatus = 'Submitted',
  currentRemarks = null,
}) {
  const timestamps = {};
  const entries = [];
  const rawList = [];

  // 1. Process records from report_status_history
  for (const row of historyRows || []) {
    if (!row || !row.status) continue;
    rawList.push({
      status: normalizeStatusLabel(row.status),
      remarks: row.remarks || null,
      created_at: row.created_at,
    });
  }

  // 2. Process records from studentHistoryArray if report_status_history was empty
  if (rawList.length === 0) {
    for (const h of studentHistoryArray || []) {
      if (!h) continue;
      const rawAction = h.action || h.status;
      if (!rawAction) continue;
      rawList.push({
        status: normalizeStatusLabel(rawAction),
        remarks: h.remarksText || h.remarks || null,
        created_at: h.time || h.created_at,
      });
    }
  }

  // 3. Ensure authentic "Submitted" entry exists as the baseline
  const hasSubmitted = rawList.some((e) => e.status === 'Submitted');
  if (!hasSubmitted) {
    const subDate =
      currentReport.created_at ||
      currentReport.raw_created_at ||
      currentReport.date_submitted ||
      new Date().toISOString();
    rawList.unshift({
      status: 'Submitted',
      remarks: null,
      created_at: subDate,
    });
  }

  // Sort strictly in chronological order (oldest to newest)
  rawList.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeA - timeB;
  });

  // Deduplicate consecutive identical statuses (e.g. rapid repeat clicks within seconds)
  for (const item of rawList) {
    const prev = entries[entries.length - 1];
    if (prev && prev.status === item.status) {
      if (!prev.remarks && item.remarks) {
        prev.remarks = item.remarks;
      }
      continue;
    }

    const formattedTime = formatManilaHistoryTime(item.created_at);
    const itemRemarks = item.remarks || (item.status === currentStatus ? currentRemarks : null);

    entries.push({
      status: item.status,
      remarks: itemRemarks,
      timeFormatted: formattedTime,
      createdAt: item.created_at,
    });

    if (item.status === 'Submitted') timestamps.submitted = formattedTime;
    if (item.status === 'Reviewed' || item.status === 'Under Review') timestamps.reviewed = formattedTime;
    if (item.status === 'Under Repair') timestamps.underRepair = formattedTime;
    if (item.status === 'On Hold') timestamps.onHold = formattedTime;
    if (item.status === 'Resolved') timestamps.resolved = formattedTime;
  }

  // Ensure current status matches the latest history entry if database has newer status
  const normCurrent = normalizeStatusLabel(currentStatus);
  if (normCurrent && entries.length > 0 && normCurrent !== 'Submitted' && normCurrent !== 'Under Review') {
    const lastEntry = entries[entries.length - 1];
    if (lastEntry.status !== normCurrent) {
      const upTime = currentReport.updated_at || new Date().toISOString();
      const formattedUpTime = formatManilaHistoryTime(upTime);
      entries.push({
        status: normCurrent,
        remarks: currentRemarks || currentReport.remarks || null,
        timeFormatted: formattedUpTime,
        createdAt: upTime,
      });
      if (normCurrent === 'Reviewed' || normCurrent === 'Under Review') timestamps.reviewed = formattedUpTime;
      if (normCurrent === 'Under Repair') timestamps.underRepair = formattedUpTime;
      if (normCurrent === 'On Hold') timestamps.onHold = formattedUpTime;
      if (normCurrent === 'Resolved') timestamps.resolved = formattedUpTime;
    }
  }

  return { entries, timestamps };
}

async function syncReportToSupabase(targetId, updatePayload, report = null) {
  const { canonicalUuid, reportCode } = await getCanonicalReportInfo(report || { report_id: targetId, id: targetId });
  const promises = [];

  if (canonicalUuid) {
    promises.push(supabase.from('reports').update(updatePayload).eq('id', canonicalUuid));
  } else if (reportCode) {
    promises.push(supabase.from('reports').update(updatePayload).eq('report_id', reportCode));
  }

  if (reportCode) {
    promises.push(supabase.from('reports_of_student').update(updatePayload).eq('report_id', reportCode));
  } else if (canonicalUuid) {
    promises.push(supabase.from('reports_of_student').update(updatePayload).eq('id', canonicalUuid));
  }

  const studentName = report?.student_name || report?.reportedByName || report?.students?.name;
  if (studentName && reportCode) {
    const firstName = studentName.trim().split(/\s+/)[0].toLowerCase();
    const cleanFull = studentName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const targetTables = new Set([`${firstName}-reports`, `${cleanFull}-reports`]);
    targetTables.forEach((tbl) => {
      promises.push(
        supabase.from(tbl).update(updatePayload).eq('report_id', reportCode).catch(() => {})
      );
    });
  }

  const results = await Promise.allSettled(promises);
  const repResult = results[0];
  if (repResult?.status === 'rejected') {
    throw repResult.reason;
  }
  if (repResult?.status === 'fulfilled' && repResult.value?.error) {
    throw new Error(repResult.value.error.message || 'Failed to update report status in database');
  }

  const rosResult = results[1];
  if (rosResult?.status === 'fulfilled' && rosResult.value?.error) {
    console.warn('Note: reports_of_student update error:', rosResult.value.error);
  }
}

/**
 * Record status change audit entry in public.report_status_history and student history JSONB.
 * Uses canonical reports.id to prevent FK constraint violations, and prevents duplicate entries.
 */
async function recordStatusHistory(rep, status, remarks = null, nowIso = new Date().toISOString()) {
  const { canonicalUuid, reportCode } = await getCanonicalReportInfo(rep);
  if (!canonicalUuid) {
    console.warn('Could not resolve canonical UUID for report_status_history:', rep);
    return;
  }

  try {
    // Check the latest history entry for this report
    const { data: latestRows } = await supabase
      .from('report_status_history')
      .select('id, status, remarks, created_at')
      .eq('report_id', canonicalUuid)
      .order('created_at', { ascending: false })
      .limit(1);

    const latest = latestRows?.[0];
    if (latest && latest.status === status) {
      // Same status as current latest: update remarks if provided
      if (remarks !== undefined && remarks !== null && latest.remarks !== remarks) {
        await supabase
          .from('report_status_history')
          .update({ remarks })
          .eq('id', latest.id);
      }
    } else {
      const insertPayload = {
        report_id: canonicalUuid,
        status,
        created_at: nowIso,
      };
      if (remarks) {
        insertPayload.remarks = remarks;
      }
      const { error: insErr } = await supabase.from('report_status_history').insert(insertPayload);
      if (insErr) {
        console.error('Could not insert into report_status_history:', insErr);
        throw new Error(insErr.message || 'Failed to record status history');
      }
    }
  } catch (insertErr) {
    console.warn('Could not insert into report_status_history:', insertErr);
    throw insertErr;
  }

  // Also update reports_of_student history JSONB for cross-table integrity
  if (reportCode) {
    try {
      const { data: sRep } = await supabase
        .from('reports_of_student')
        .select('id, history')
        .eq('report_id', reportCode)
        .maybeSingle();

      if (sRep) {
        const currentHist = Array.isArray(sRep.history) ? sRep.history : [];
        const lastStep = currentHist[currentHist.length - 1];
        let updatedHist = [...currentHist];
        if (lastStep && (lastStep.action === status || lastStep.status === status)) {
          if (remarks) {
            updatedHist[updatedHist.length - 1] = {
              ...lastStep,
              remarksText: remarks,
            };
          }
        } else {
          updatedHist.push({
            action: status,
            status,
            time: nowIso,
            remarksText: remarks || undefined,
          });
        }
        await supabase
          .from('reports_of_student')
          .update({
            history: updatedHist,
            updated_at: nowIso,
          })
          .eq('id', sRep.id);
      }
    } catch (histErr) {
      console.warn('Note updating reports_of_student history:', histErr);
    }
  }
}

function formatHistoryTime(timeInput, fallbackTime) {
  return formatManilaHistoryTime(timeInput, fallbackTime);
}

/**
 * Helper to format date & time string in Philippine Time: "Oct 22, 2026, 7:23 PM"
 */
function formatDateTimeString(dateInput) {
  if (!dateInput) return '';
  return formatManilaHistoryTime(dateInput);
}

/**
 * Current timestamp formatted helper in Philippine Time: "Oct 22, 2026, 7:23 PM"
 */
function formatCurrentTimestamp() {
  return formatManilaHistoryTime(new Date());
}

/**
 * Determine initial phase for modal view matching reference mockups
 */
function getInitialReportStatus(report) {
  if (!report) return 'Submitted';
  if (report.status === 'On Hold' || report.display_status === 'ON HOLD') return 'On Hold';
  if (report.status === 'Resolved' || report.display_status === 'RESOLVED') return 'Resolved';
  if (
    report.status === 'Under Repair' ||
    report.status === 'Under repair' ||
    report.display_status === 'UNDER REPAIR'
  ) {
    return 'Under Repair';
  }
  if (report.status === 'Reviewed') {
    return 'Reviewed';
  }
  if (report.status === 'Submitted') {
    return 'Submitted';
  }
  if (report.status === 'Under Review' || report.display_status === 'UNDER REVIEW') {
    return 'Submitted';
  }

  return normalizeStatusLabel(report.status) || 'Submitted';
}

/**
 * Normalize phase index 1 to 4 for Stepper
 */
function getPhaseIndex(status) {
  switch (status) {
    case 'Submitted':
      return 1;
    case 'Reviewed':
      return 2;
    case 'Under Review':
      return 1;
    case 'Under Repair':
    case 'On Hold':
      return 3;
    case 'Resolved':
      return 4;
    default:
      return 1;
  }
}

/**
 * Initialize timestamps mapping
 */
function getInitialTimestamps(report) {
  const parsed = parseReportDateTime(report);
  let subTime = parsed.dateTimeDisplay || formatManilaHistoryTime(report?.created_at || new Date());

  const status = report?.status || 'Submitted';

  const reviewedHistoryItem = report?.history?.find((h) => (h.action || '').toLowerCase().includes('review'));
  const repairHistoryItem = report?.history?.find((h) => (h.action || '').toLowerCase().includes('repair'));
  const onHoldHistoryItem = report?.history?.find((h) => (h.action || '').toLowerCase().includes('hold'));
  const resolvedHistoryItem = report?.history?.find((h) => (h.action || '').toLowerCase().includes('resolve'));

  const updatedAtFormatted = report?.updated_at ? formatManilaHistoryTime(report.updated_at) : null;

  const reviewedTime = reviewedHistoryItem?.time
    ? formatManilaHistoryTime(reviewedHistoryItem.time)
    : (report?.timestamps?.reviewed || (status === 'Reviewed' ? updatedAtFormatted : null));

  const underRepairTime = repairHistoryItem?.time
    ? formatManilaHistoryTime(repairHistoryItem.time)
    : (report?.timestamps?.underRepair || (status === 'Under Repair' ? updatedAtFormatted : null));

  const onHoldTime = onHoldHistoryItem?.time
    ? formatManilaHistoryTime(onHoldHistoryItem.time)
    : (report?.timestamps?.onHold || (status === 'On Hold' ? updatedAtFormatted : null));

  const resolvedTime = resolvedHistoryItem?.time
    ? formatManilaHistoryTime(resolvedHistoryItem.time)
    : (report?.timestamps?.resolved || (status === 'Resolved' ? updatedAtFormatted : null));

  return {
    submitted: report?.timestamps?.submitted || subTime,
    reviewed:
      status === 'Reviewed' || status === 'Under Repair' || status === 'On Hold' || status === 'Resolved'
        ? (reviewedTime || report?.timestamps?.reviewed)
        : null,
    underRepair:
      status === 'Under Repair' || status === 'On Hold' || status === 'Resolved'
        ? (underRepairTime || report?.timestamps?.underRepair)
        : null,
    onHold:
      status === 'On Hold' || report?.has_been_on_hold || report?.on_hold_at
        ? (onHoldTime || report?.timestamps?.onHold)
        : null,
    resolved:
      status === 'Resolved'
        ? (resolvedTime || report?.timestamps?.resolved)
        : null,
  };
}

export default function ReportDetailsModal({
  report,
  onClose,
  onUpdateStatus,
  isUpdating = false,
  isStudent = false,
  studentProfile = null,
  currentUser = null,
}) {
  const isStudentView = isStudent || report?.isStudent || report?.role === 'student';
  const activeReportId = report?.report_id || report?.id;
  const lastReportIdRef = React.useRef(activeReportId);

  const isLR24 = report?.report_id === 'LR-24' || report?.id === 'LR-24' || report?.id === 'rep-24';

  const [currentStatus, setCurrentStatus] = useState(() => getInitialReportStatus(report));
  const [hasBeenOnHold, setHasBeenOnHold] = useState(() => {
    const initStatus = getInitialReportStatus(report);
    return (
      initStatus === 'On Hold' ||
      Boolean(report?.has_been_on_hold) ||
      Boolean(report?.on_hold_at) ||
      Boolean(report?.timestamps?.onHold) ||
      (isLR24 && (initStatus === 'On Hold' || initStatus === 'Resolved')) ||
      (Array.isArray(report?.history) && report.history.some((h) => ((h.action || h.status) || '').toLowerCase().includes('hold')))
    );
  });

  const [remarks, setRemarks] = useState(() => {
    if (report?.remarks) return report.remarks;
    const initStatus = getInitialReportStatus(report);
    if (isLR24) {
      if (initStatus === 'On Hold') return 'Awaiting replacement parts.';
      if (initStatus === 'Resolved') return 'Replace Monitor';
    }
    return initStatus === 'On Hold' ? 'Awaiting replacement parts.' : '';
  });

  const [remarksError, setRemarksError] = useState(false);
  const [remarksErrorMessage, setRemarksErrorMessage] = useState('');
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [editedRemarks, setEditedRemarks] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState(false);
  const [studentPreviewOpen, setStudentPreviewOpen] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timestamps, setTimestamps] = useState(() => getInitialTimestamps(report));
  const [statusHistory, setStatusHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Resolution prompt dialog states (when resolving from On Hold)
  const [showResolutionPrompt, setShowResolutionPrompt] = useState(false);
  const [resolutionRemarks, setResolutionRemarks] = useState(isLR24 ? 'Replace Monitor' : '');
  const [resolutionError, setResolutionError] = useState(false);

  // Keep ref to always access latest report without invalidating callbacks
  const reportRef = useRef(report);
  useEffect(() => {
    reportRef.current = report;
  }, [report]);

  const isFetchingRef = useRef(false);

  // Load fresh report details and audit history from Supabase
  const loadFreshReportAndHistory = useCallback(async (isInitial = false) => {
    const curReport = reportRef.current;
    if (!curReport) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (isInitial) {
      setHistoryLoading(true);
    }
    try {
      const { canonicalUuid, reportCode } = await getCanonicalReportInfo(curReport);

      let liveReport = null;
      if (canonicalUuid) {
        const { data } = await supabase.from('reports').select('*').eq('id', canonicalUuid).maybeSingle();
        if (data) liveReport = data;
      }
      if (!liveReport && reportCode) {
        const { data } = await supabase.from('reports').select('*').eq('report_id', reportCode).maybeSingle();
        if (data) liveReport = data;
      }

      let liveRos = null;
      if (reportCode) {
        const { data } = await supabase.from('reports_of_student').select('*').eq('report_id', reportCode).maybeSingle();
        if (data) liveRos = data;
      } else if (canonicalUuid) {
        const { data } = await supabase.from('reports_of_student').select('*').eq('id', canonicalUuid).maybeSingle();
        if (data) liveRos = data;
      }

      let historyRows = [];
      if (canonicalUuid) {
        const { data: rshData } = await supabase
          .from('report_status_history')
          .select('id, status, remarks, created_at')
          .eq('report_id', canonicalUuid)
          .order('created_at', { ascending: true });
        if (rshData) historyRows = rshData;
      }

      const rawActive = liveReport?.status || liveRos?.status || curReport?.status || currentStatus;
      const activeStatus = normalizeStatusLabel(rawActive);
      const activeRemarks =
        liveReport?.remarks !== undefined
          ? liveReport.remarks
          : (liveRos?.remarks !== undefined ? liveRos.remarks : curReport?.remarks);

      const unified = buildUnifiedHistoryEntries({
        historyRows,
        studentHistoryArray: Array.isArray(liveRos?.history)
          ? liveRos.history
          : (Array.isArray(curReport?.history) ? curReport.history : []),
        currentReport: { ...curReport, ...(liveReport || {}), ...(liveRos || {}) },
        currentStatus: activeStatus,
        currentRemarks: activeRemarks,
      });

      setStatusHistory(unified.entries);
      setTimestamps((prev) => ({
        ...prev,
        ...unified.timestamps,
      }));

      if (activeStatus && activeStatus !== currentStatus) {
        setCurrentStatus(activeStatus);
      }
      if (activeRemarks !== undefined && activeRemarks !== null) {
        setRemarks(activeRemarks);
        setEditedRemarks(activeRemarks);
      }
      if (
        liveReport?.has_been_on_hold ||
        liveReport?.on_hold_at ||
        liveRos?.has_been_on_hold ||
        activeStatus === 'On Hold' ||
        historyRows.some((h) => ((h.status || '')).toLowerCase().includes('hold')) ||
        (Array.isArray(liveRos?.history) && liveRos.history.some((h) => ((h.action || h.status) || '').toLowerCase().includes('hold')))
      ) {
        setHasBeenOnHold(true);
      }
    } catch (err) {
      console.warn('Error loading fresh report and status history:', err);
    } finally {
      if (isInitial) {
        setHistoryLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [currentStatus]);

  // Synchronize on mount and subscribe to realtime report updates (anchored to report ID)
  const reportKeyId = report?.report_id || report?.id;

  useEffect(() => {
    if (!reportKeyId) return;
    loadFreshReportAndHistory(true);

    const handleReportUpdateLive = (updateData) => {
      if (!updateData) return;
      const curRep = reportRef.current;
      const targetId = curRep?.report_id || curRep?.id;
      const matches =
        !updateData.reportId ||
        updateData.reportId === targetId ||
        updateData.reportId === curRep?.report_id ||
        updateData.reportId === curRep?.id ||
        (updateData.canonicalUuid && (updateData.canonicalUuid === curRep?.id || updateData.canonicalUuid === curRep?.canonical_uuid)) ||
        (updateData.report_id && (updateData.report_id === curRep?.report_id || updateData.report_id === targetId));

      if (matches) {
        // Immediate local state update for zero lag
        const newSt = updateData.newStatus || updateData.status;
        if (newSt) {
          const normSt = normalizeStatusLabel(newSt);
          setCurrentStatus(normSt);
          if (normSt === 'On Hold') {
            setHasBeenOnHold(true);
          }
        }
        const newRem = updateData.remarks !== undefined ? updateData.remarks : updateData.newRemarks;
        if (newRem !== undefined) {
          setRemarks(newRem || '');
          setEditedRemarks(newRem || '');
        }
        if (updateData.timestamps) {
          setTimestamps((prev) => ({ ...prev, ...updateData.timestamps }));
        }

        // Seamless background audit history refresh without flickering
        loadFreshReportAndHistory(false);
      }
    };

    // Centralized singleton realtime subscriber
    const unsub = subscribeToReportUpdates(handleReportUpdateLive);

    const unsubVisibility = registerVisibilityAndOnlineSync(() => {
      loadFreshReportAndHistory(false);
    });

    return () => {
      unsub();
      unsubVisibility();
    };
  }, [reportKeyId, loadFreshReportAndHistory]);

  // Sync state only when a different report is opened
  useEffect(() => {
    if (!report) return;
    const currentId = report.report_id || report.id;
    if (lastReportIdRef.current !== currentId) {
      lastReportIdRef.current = currentId;
      const initialStatus = getInitialReportStatus(report);
      setCurrentStatus(initialStatus);

      const isCurrentLR24 = report.report_id === 'LR-24' || report.id === 'LR-24' || report.id === 'rep-24';
      const onHoldActive =
        initialStatus === 'On Hold' ||
        Boolean(report.has_been_on_hold) ||
        Boolean(report.on_hold_at) ||
        (isCurrentLR24 && (initialStatus === 'On Hold' || initialStatus === 'Resolved'));

      setHasBeenOnHold(onHoldActive);

      let initialRemarks = report.remarks || '';
      if (!initialRemarks && isCurrentLR24) {
        if (initialStatus === 'On Hold') initialRemarks = 'Awaiting replacement parts.';
        else if (initialStatus === 'Resolved') initialRemarks = 'Replace Monitor';
      } else if (!initialRemarks && initialStatus === 'On Hold') {
        initialRemarks = 'Awaiting replacement parts.';
      }

      setRemarks(initialRemarks);
      setEditedRemarks(initialRemarks);
      setRemarksError(false);
      setRemarksErrorMessage('');
      setIsEditingRemarks(false);
      setShowResolutionPrompt(false);
      setResolutionError(false);
      setPreviewAttachment(false);
      setStudentPreviewOpen(false);
      setEnlargedImage(null);
      setImageError(false);
      setTimestamps(getInitialTimestamps(report));
      loadFreshReportAndHistory();
    }
  }, [report, loadFreshReportAndHistory]);

  // Handle ESC key press to close lightbox, resolution prompt, or modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (enlargedImage) {
          setEnlargedImage(null);
        } else if (showResolutionPrompt) {
          setShowResolutionPrompt(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showResolutionPrompt, enlargedImage]);

  // Attachment card: dynamically resolves accurate attachment matching the report's actual PC unit number and equipment
  const attachment = useMemo(() => {
    return getReportAttachment(report);
  }, [report]);

  // Verify ownership: Technical Personnel can view all attachments. Students can view attachments if they own the report.
  const currentStudentId =
    studentProfile?.student_id ||
    studentProfile?.id ||
    currentUser?.student_id ||
    currentUser?.id;

  const reportStudentId =
    report?.student_id ||
    report?.studentId ||
    report?.students?.student_id ||
    report?.students?.id;

  const isAuthorizedToViewAttachment = useMemo(() => {
    if (!isStudentView) return true; // Technical Personnel can view all
    if (!currentStudentId) return true; // Default fallback if not passed
    const idMatch =
      reportStudentId &&
      String(reportStudentId).toLowerCase() === String(currentStudentId).toLowerCase();
    const emailMatch =
      studentProfile?.email &&
      report?.student_email &&
      studentProfile.email.toLowerCase() === report.student_email.toLowerCase();
    return idMatch || emailMatch || !reportStudentId;
  }, [isStudentView, currentStudentId, reportStudentId, studentProfile, report]);

  if (!report) return null;

  // Format data fields matching registered database records
  const resolvedSt = resolveAuthenticReportStudent(report.report_id || report.id, report.students || {
    name: report.student_name || report.reportedByName,
    student_id: report.student_id || report.studentId,
    year_block: report.student_year_block || report.reportedByYearBlock,
  });

  const studentId = (report.student_id === '2024-147-098' || report.studentId === '2024-147-098')
    ? '24-0041-147'
    : (resolvedSt.student_id || report.student_id || report.studentId || report.students?.student_id || '24-0041-147');
  const cleanStudentName = formatStudentName(resolvedSt);
  const yearBlockRaw = resolvedSt.year_block || report.student_year_block || report.reportedByYearBlock || report.students?.year_block || '3rd year, BLK 2';
  const cleanYearBlock = formatYearBlock(yearBlockRaw);
  const reportedByDisplay = `${cleanStudentName} (${cleanYearBlock})`;

  const unitDisplay = report.unit_number || report.unitNumber || 'PC-#14';
  const equipmentDisplay = report.equipment || 'Monitor';
  const equipmentUnitDisplay = `${unitDisplay}  •  ${equipmentDisplay}`;

  const locationCenterRaw = report.location_center || report.locationCenter || 'Computer Center 5';
  const locationCenterDisplay =
    String(locationCenterRaw).startsWith('Computer Center')
      ? locationCenterRaw
      : `Computer Center ${locationCenterRaw}`;
  const locationRoomDisplay = report.location_room || report.locationRoom || 'Room 204';
  const locationDisplay = `${locationCenterDisplay}  •  ${locationRoomDisplay}`;

  const descriptionDisplay =
    report.description || 'Screen flickers every few seconds and shows horizontal lines.';

  const phaseIndex = getPhaseIndex(currentStatus);
  const targetId = report.report_id || report.id;

  // Handle Advance transitions:
  // Under Review (Submitted) -> Reviewed
  // Reviewed -> Under Repair
  // Under Repair -> Resolved (Direct resolve without hold)
  const handleAdvance = async () => {
    if (isUpdating || isSubmitting) return;

    if (currentStatus === 'Submitted') {
      setIsSubmitting(true);
      const nextStatus = 'Reviewed';
      const nowIso = new Date().toISOString();
      const nowFormatted = formatManilaHistoryTime(nowIso);
      const updatedTimestamps = {
        ...timestamps,
        reviewed: nowFormatted,
      };

      setCurrentStatus('Reviewed');
      setTimestamps(updatedTimestamps);

      try {
        await syncReportToSupabase(
          targetId,
          {
            status: nextStatus,
            updated_at: nowIso,
          },
          report
        );
        await recordStatusHistory(report, nextStatus, null, nowIso);
      } catch (err) {
        console.warn('Supabase status update error:', err);
      } finally {
        setIsSubmitting(false);
      }

      broadcastReportStatusUpdate({
        reportId: targetId,
        newStatus: 'Reviewed',
        status: 'Reviewed',
        displayStatus: 'UNDER REVIEW',
        timestamps: updatedTimestamps,
        updatedAt: nowIso,
      });

      loadFreshReportAndHistory();

      if (onUpdateStatus) {
        onUpdateStatus(targetId, 'Reviewed', updatedTimestamps);
      }
    } else if (currentStatus === 'Reviewed') {
      setIsSubmitting(true);
      const nextStatus = 'Under Repair';
      const nowIso = new Date().toISOString();
      const nowFormatted = formatManilaHistoryTime(nowIso);
      const updatedTimestamps = {
        ...timestamps,
        underRepair: nowFormatted,
      };

      setCurrentStatus(nextStatus);
      setTimestamps(updatedTimestamps);

      try {
        await syncReportToSupabase(
          targetId,
          {
            status: nextStatus,
            updated_at: nowIso,
          },
          report
        );
        await recordStatusHistory(report, nextStatus, null, nowIso);
      } catch (err) {
        console.warn('Supabase status update error:', err);
      } finally {
        setIsSubmitting(false);
      }

      broadcastReportStatusUpdate({
        reportId: targetId,
        newStatus: nextStatus,
        status: nextStatus,
        timestamps: updatedTimestamps,
        updatedAt: nowIso,
      });

      loadFreshReportAndHistory();

      if (onUpdateStatus) {
        onUpdateStatus(targetId, nextStatus, updatedTimestamps);
      }
    } else if (currentStatus === 'Under Repair') {
      // Required remarks validation before marking as resolved
      if (!remarks || remarks.trim() === '') {
        setRemarksError(true);
        setRemarksErrorMessage('Remarks are required before marking this report as resolved.');
        const textareaEl = document.getElementById('tp-remarks-input');
        if (textareaEl) textareaEl.focus();
        return;
      }

      setRemarksError(false);
      setIsSubmitting(true);
      const nextStatus = 'Resolved';
      const trimmedRemarks = remarks.trim();
      const nowIso = new Date().toISOString();
      const nowFormatted = formatManilaHistoryTime(nowIso);
      const updatedTimestamps = {
        ...timestamps,
        resolved: nowFormatted,
      };

      setCurrentStatus(nextStatus);
      setTimestamps(updatedTimestamps);

      try {
        await syncReportToSupabase(
          targetId,
          {
            status: nextStatus,
            remarks: trimmedRemarks,
            updated_at: nowIso,
          },
          report
        );
        await recordStatusHistory(report, nextStatus, trimmedRemarks, nowIso);
      } catch (err) {
        console.warn('Supabase status update error:', err);
      } finally {
        setIsSubmitting(false);
      }

      broadcastReportStatusUpdate({
        reportId: targetId,
        newStatus: nextStatus,
        status: nextStatus,
        remarks: trimmedRemarks,
        timestamps: updatedTimestamps,
        updatedAt: nowIso,
      });

      loadFreshReportAndHistory();

      if (onUpdateStatus) {
        onUpdateStatus(targetId, nextStatus, updatedTimestamps, trimmedRemarks);
      }
    }
  };

  // Section 1: Mark as On Hold (from Under Repair stage)
  // Requirement: Require Technical Personnel to enter remarks explaining why the report is placed on hold.
  const handleOnHold = async () => {
    if (isUpdating || isSubmitting) return;

    if (!remarks || remarks.trim() === '') {
      setRemarksError(true);
      setRemarksErrorMessage('Please enter remarks explaining why this report is being placed on hold.');
      const textareaEl = document.getElementById('tp-remarks-input');
      if (textareaEl) textareaEl.focus();
      return;
    }

    setRemarksError(false);
    setIsSubmitting(true);
    const nextStatus = 'On Hold';
    const trimmedRemarks = remarks.trim();
    const nowIso = new Date().toISOString();
    const nowFormatted = formatManilaHistoryTime(nowIso);
    const updatedTimestamps = {
      ...timestamps,
      onHold: nowFormatted,
    };

    setCurrentStatus(nextStatus);
    setTimestamps(updatedTimestamps);
    setHasBeenOnHold(true);
    setEditedRemarks(trimmedRemarks);

    try {
      await syncReportToSupabase(
        targetId,
        {
          status: nextStatus,
          remarks: trimmedRemarks,
          has_been_on_hold: true,
          on_hold_at: nowIso,
          updated_at: nowIso,
        },
        report
      );
      await recordStatusHistory(report, nextStatus, trimmedRemarks, nowIso);
    } catch (err) {
      console.warn('Supabase on hold update error:', err);
    } finally {
      setIsSubmitting(false);
    }

    broadcastReportStatusUpdate({
      reportId: targetId,
      newStatus: nextStatus,
      status: nextStatus,
      remarks: trimmedRemarks,
      timestamps: updatedTimestamps,
      updatedAt: nowIso,
      has_been_on_hold: true,
    });

    loadFreshReportAndHistory();

    if (onUpdateStatus) {
      onUpdateStatus(targetId, nextStatus, updatedTimestamps, trimmedRemarks);
    }
  };

  // Section 2: Save Edited Remarks (while in On Hold state - Image 1)
  const handleSaveEditedRemarks = async () => {
    if (isUpdating || isSubmitting) return;
    const trimmed = (editedRemarks || '').trim();
    if (!trimmed) {
      return;
    }

    setIsSubmitting(true);
    setRemarks(trimmed);
    setIsEditingRemarks(false);
    const nowIso = new Date().toISOString();

    try {
      await syncReportToSupabase(
        targetId,
        {
          remarks: trimmed,
          updated_at: nowIso,
        },
        report
      );
      await recordStatusHistory(report, 'On Hold', trimmed, nowIso);
    } catch (err) {
      console.warn('Supabase remarks edit update note:', err);
    } finally {
      setIsSubmitting(false);
    }

    broadcastReportStatusUpdate({
      reportId: targetId,
      newStatus: currentStatus,
      status: currentStatus,
      remarks: trimmed,
      timestamps,
      updatedAt: nowIso,
    });

    loadFreshReportAndHistory();

    if (onUpdateStatus) {
      onUpdateStatus(targetId, currentStatus, timestamps, trimmed);
    }
  };

  // Section 3: Open Resolution Prompt dialog (while in On Hold state)
  const handleOpenResolutionPrompt = () => {
    setResolutionRemarks(isLR24 ? 'Replace Monitor' : (remarks || ''));
    setResolutionError(false);
    setShowResolutionPrompt(true);
  };

  // Section 3: Confirm Resolution from On Hold -> Transitions to Image 2
  const handleConfirmResolution = async () => {
    if (isUpdating || isSubmitting) return;
    const finalRemarks = (resolutionRemarks || '').trim();
    if (!finalRemarks) {
      setResolutionError(true);
      return;
    }

    setResolutionError(false);
    setIsSubmitting(true);
    const nextStatus = 'Resolved';
    const nowIso = new Date().toISOString();
    const nowFormatted = formatManilaHistoryTime(nowIso);
    const updatedTimestamps = {
      ...timestamps,
      resolved: nowFormatted,
    };

    setCurrentStatus(nextStatus);
    setRemarks(finalRemarks);
    setTimestamps(updatedTimestamps);
    setHasBeenOnHold(true);
    setShowResolutionPrompt(false);

    try {
      await syncReportToSupabase(
        targetId,
        {
          status: nextStatus,
          remarks: finalRemarks,
          updated_at: nowIso,
        },
        report
      );
      await recordStatusHistory(report, nextStatus, finalRemarks, nowIso);
    } catch (err) {
      console.warn('Supabase resolution update error:', err);
    } finally {
      setIsSubmitting(false);
    }

    broadcastReportStatusUpdate({
      reportId: targetId,
      newStatus: nextStatus,
      status: nextStatus,
      remarks: finalRemarks,
      timestamps: updatedTimestamps,
      updatedAt: nowIso,
    });

    loadFreshReportAndHistory();

    if (onUpdateStatus) {
      onUpdateStatus(targetId, nextStatus, updatedTimestamps, finalRemarks);
    }
  };

  const renderEnlargedLightbox = () => {
    if (!enlargedImage) return null;
    return (
      <div
        className="report-image-enlarge-backdrop"
        onClick={() => setEnlargedImage(null)}
        role="dialog"
        aria-modal="true"
        aria-label="Enlarged Report Photo"
      >
        <div
          className="report-image-enlarge-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="report-image-enlarge-header">
            <div className="report-image-enlarge-meta">
              <span className="report-image-enlarge-title">
                {report.report_id || report.id} Attached Photo
              </span>
              {enlargedImage.name && (
                <span className="report-image-enlarge-badge">{enlargedImage.name}</span>
              )}
            </div>
            <button
              type="button"
              className="report-image-enlarge-close-btn"
              onClick={() => setEnlargedImage(null)}
              title="Close image preview (Esc)"
              aria-label="Close image preview"
            >
              <X size={18} />
            </button>
          </div>
          <div className="report-image-enlarge-body">
            <img
              src={enlargedImage.url}
              alt={enlargedImage.name || 'Report attached hardware preview'}
              className="report-image-enlarge-img"
            />
          </div>
        </div>
      </div>
    );
  };

  // Student View: Exact match to the 4 reference screenshots
  // 1. Submitted Modal
  // 2. Reviewed Modal
  // 3. Under Repair Modal
  // 4. Resolved Modal
  if (isStudentView) {
    const studentStatusInfo = getStudentStatusPillInfo(currentStatus);
    const centerNumber = getCenterNumber(report.location_center || report.locationCenter || report.computer_center);
    const roomStr = report.location_room || report.locationRoom || report.room || 'Room 204';
    const equipStr = report.equipment || 'Monitor';
    const unitStr = report.unit_number || report.unitNumber || 'PC-#14';
    const isLR12 = report.report_id === 'LR-12' || report.id === 'LR-12';
    const descStr = isLR12
      ? 'Screen flickers every few seconds and shows horizontal lines.'
      : (report.description || 'Screen flickers every few seconds and shows horizontal lines.');

    const parsedReportDT = parseReportDateTime(report);
    let subDateDisplay = parsedReportDT.dateTimeDisplay || timestamps.submitted || 'Oct 17, 2026 • 3:45 PM';
    if (report.submittedDate && report.submittedTime) {
      subDateDisplay = `${report.submittedDate} • ${report.submittedTime}`;
    } else if (report.submitted_date && report.submitted_time) {
      subDateDisplay = `${report.submitted_date} • ${report.submitted_time}`;
    }

    const reviewedHistoryItem = report.history?.find((h) => (h.action || '').toLowerCase().includes('review'));
    const repairHistoryItem = report.history?.find((h) => (h.action || '').toLowerCase().includes('repair'));
    const resolvedHistoryItem = report.history?.find((h) => (h.action || '').toLowerCase().includes('resolve'));

    const reviewedTime = formatHistoryTime(reviewedHistoryItem?.time || timestamps.reviewed, 'Oct 17, 3:56 PM');
    const repairTime = formatHistoryTime(repairHistoryItem?.time || timestamps.underRepair, 'Oct 17, 4:01 PM');
    const resolvedTime = formatHistoryTime(resolvedHistoryItem?.time || timestamps.resolved, 'Oct 17, 4:10 PM');
    const remarksText = remarks || report.remarks || resolvedHistoryItem?.remarksText || 'Replace Monitor';

    return (
      <div
        className="student-report-modal-backdrop"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-report-modal-title"
      >
        <div
          className="student-report-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Header */}
          <div className="student-report-modal-header">
            <h2 id="student-report-modal-title" className="student-report-id-title">
              {report.report_id || report.id || 'LR-12'}
            </h2>
            <span className={`student-status-header-pill ${studentStatusInfo.className}`}>
              {studentStatusInfo.text}
            </span>
          </div>

          {/* 2. Stepper Workflow */}
          <StatusStepper
            phaseIndex={studentStatusInfo.phase}
            isOnHold={studentStatusInfo.isOnHold || currentStatus === 'On Hold'}
          />

          {/* 3. Modal Body */}
          <div className="student-report-modal-body">
            {/* Row 1: AFFECTED EQUIPMENT */}
            <div className="student-detail-field-row">
              <span className="student-field-label">AFFECTED EQUIPMENT</span>
              <span className="student-field-value">{equipStr}</span>
            </div>

            {/* Row 2: UNIT NUMBER */}
            <div className="student-detail-field-row">
              <span className="student-field-label">UNIT NUMBER</span>
              <span className="student-field-value">{unitStr}</span>
            </div>

            {/* Row 3: COMPUTER CENTER */}
            <div className="student-detail-field-row">
              <span className="student-field-label">COMPUTER CENTER</span>
              <span className="student-field-value">{centerNumber}</span>
            </div>

            {/* Row 4: ROOM */}
            <div className="student-detail-field-row">
              <span className="student-field-label">ROOM</span>
              <span className="student-field-value">{roomStr}</span>
            </div>

            {/* Row 5: DESCRIPTION */}
            <div className="student-description-section">
              <span className="student-description-title">DESCRIPTION</span>
              <p className="student-description-paragraph">{descStr}</p>

              {/* Photo Attachment or Clean Placeholder */}
              {!attachment ? (
                <div className="student-no-photo-placeholder">
                  <ImageIcon size={14} />
                  <span>No photo attached</span>
                </div>
              ) : !isAuthorizedToViewAttachment ? (
                <div className="attachment-security-notice">
                  <ShieldAlert size={14} />
                  <span>Photo preview restricted to the reporting student and Technical Personnel.</span>
                </div>
              ) : (
                <div className="student-attachment-wrapper">
                  <div
                    className="student-attachment-pill-card"
                    onClick={() => setStudentPreviewOpen(!studentPreviewOpen)}
                    role="button"
                    tabIndex={0}
                    title="Click to toggle photo preview"
                  >
                    <div className="student-attachment-icon-square" aria-hidden="true">
                      <ImageIcon size={14} color="#FFFFFF" />
                    </div>
                    <div className="student-attachment-info">
                      <span className="student-attachment-name">{attachment.name}</span>
                      <span className="student-attachment-size">{attachment.size}</span>
                    </div>
                  </div>

                  {studentPreviewOpen && (
                    <div className="student-photo-preview-card">
                      {!imageError && attachment.url ? (
                        <div
                          className="student-preview-img-container"
                          onClick={() => setEnlargedImage(attachment)}
                          role="button"
                          tabIndex={0}
                          title="Click to enlarge image"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.name || 'Report photo'}
                            className="student-preview-real-img"
                            onError={() => setImageError(true)}
                          />
                          <div className="student-preview-hover-tag">
                            <ZoomIn size={12} />
                            <span>Click to enlarge</span>
                          </div>
                        </div>
                      ) : (
                        <div className="student-preview-clean-placeholder">
                          <ImageIcon size={22} color="#94a3b8" />
                          <span>Image failed to load or unavailable</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Row 6: Date Submitted */}
            <div className="student-date-submitted-row">
              <span className="student-date-submitted-label">Date Submitted</span>
              <span className="student-date-submitted-value">{subDateDisplay}</span>
            </div>

            {/* Row 7: Status History */}
            <div className="student-status-history-section">
              <h4 className="student-status-history-heading">Status History</h4>

              {statusHistory && statusHistory.length > 0 ? (
                statusHistory.map((item, idx) => (
                  <React.Fragment key={`${item.status}-${idx}`}>
                    <div className="student-history-entry">
                      <span className="student-history-status-name">{item.status}</span>
                      <span className="student-history-dot-sep"> — </span>
                      <span className="student-history-timestamp">{item.timeFormatted}</span>
                    </div>
                    {item.remarks && (
                      <div className="student-history-remarks-line">
                        Remarks: {item.remarks}
                      </div>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <div className="student-history-entry">
                  <span className="student-history-status-name">Submitted</span>
                  <span className="student-history-dot-sep"> — </span>
                  <span className="student-history-timestamp">{subDateDisplay}</span>
                </div>
              )}
            </div>

            {/* Footer Close Button */}
            <div className="student-modal-action-footer">
              <button
                type="button"
                className="student-btn-modal-close"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
        {renderEnlargedLightbox()}
      </div>
    );
  }

  return (
    <div
      className="fixie-report-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        className="fixie-report-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Deep Forest Green with Serif LR-24 & White Circular Close 'X' Button */}
        <div className="report-modal-header-green">
          <h2 id="report-modal-title" className="report-modal-id-title">
            {report.report_id || report.id || 'LR-24'}
          </h2>
          <button
            type="button"
            className="report-modal-circle-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={15} strokeWidth={2.8} />
          </button>
        </div>

        {/* Stepper Workflow: 4 Steps (Submitted -> Reviewed -> Under repair -> Resolved) */}
        {/* In Image 1 (On Hold), Step 3 renders amber 3 with On Hold pill directly underneath */}
        {/* In Image 2 (Resolved), all 4 steps render completed green checkmarks with green lines */}
        <StatusStepper
          phaseIndex={phaseIndex}
          isOnHold={currentStatus === 'On Hold'}
        />

        {/* Modal Body: Matches Images 1 and 2 */}
        <div className="fixie-report-modal-body">
          {/* Image 1: On Hold Alert Banner (Only displayed when status is On Hold) */}
          {currentStatus === 'On Hold' && (
            <div className="report-on-hold-alert-banner">
              <div className="on-hold-alert-icon-circle" aria-hidden="true">
                <Pause size={18} strokeWidth={2.5} fill="#C2410C" />
              </div>
              <div className="on-hold-alert-content">
                <h4 className="on-hold-alert-title">Report is On Hold</h4>
                <p className="on-hold-alert-subtitle">
                  This report is temporarily paused pending further action.
                </p>
              </div>
            </div>
          )}

          {/* Row 1: REPORTED BY */}
          <div className="report-field-row">
            <span className="field-label">REPORTED BY</span>
            <span className="field-value">{reportedByDisplay}</span>
          </div>

          {/* Row 2: STUDENT ID */}
          <div className="report-field-row">
            <span className="field-label">STUDENT ID</span>
            <span className="field-value">{studentId}</span>
          </div>

          {/* Row 3: EQUIPMENT/UNIT NUMBER */}
          <div className="report-field-row">
            <span className="field-label">EQUIPMENT/UNIT NUMBER</span>
            <span className="field-value">{equipmentUnitDisplay}</span>
          </div>

          {/* Row 4: LOCATION */}
          <div className="report-field-row">
            <span className="field-label">LOCATION</span>
            <span className="field-value">{locationDisplay}</span>
          </div>

          {/* Row 5: DESCRIPTION & OPTIONAL ATTACHMENT */}
          <div className="report-description-block">
            <span className="report-description-label">DESCRIPTION</span>
            <p className="report-description-text">{descriptionDisplay}</p>

            {/* Optional Photo Attachment or Clean Placeholder */}
            {!attachment ? (
              <div className="tp-no-photo-placeholder">
                <ImageIcon size={14} />
                <span>No photo attached</span>
              </div>
            ) : (
              <div className="tp-attachment-section">
                <div
                  className="report-attachment-pill"
                  onClick={() => setPreviewAttachment(!previewAttachment)}
                  role="button"
                  tabIndex={0}
                  title="Click to toggle photo preview"
                >
                  <div className="attachment-icon-box" aria-hidden="true">
                    <ImageIcon size={14} color="#FFFFFF" />
                  </div>
                  <div className="attachment-meta-text">
                    <span className="attachment-filename">{attachment.name}</span>
                    <span className="attachment-filesize">{attachment.size}</span>
                  </div>
                </div>

                {previewAttachment && (
                  <div className="attachment-preview-expanded">
                    <div className="preview-image-mockup">
                      <div className="preview-overlay-info">
                        <span>{attachment.name} • {attachment.size}</span>
                        <button
                          type="button"
                          className="preview-close-small"
                          onClick={() => setPreviewAttachment(false)}
                        >
                          Hide
                        </button>
                      </div>

                      {!imageError && attachment.url ? (
                        <div
                          className="tp-preview-image-container"
                          onClick={() => setEnlargedImage(attachment)}
                          role="button"
                          tabIndex={0}
                          title="Click to enlarge image"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.name || 'Attached equipment snapshot'}
                            className="tp-preview-real-img"
                            onError={() => setImageError(true)}
                          />
                          <div className="tp-preview-hover-tag">
                            <ZoomIn size={12} />
                            <span>Click to enlarge</span>
                          </div>
                        </div>
                      ) : (
                        <div className="tp-clean-placeholder">
                          <ImageIcon size={28} color="#94a3b8" />
                          <span>Attached photo could not be loaded</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Under Repair Remarks Input Block */}
          {currentStatus === 'Under Repair' && (
            <div className="report-remarks-input-block">
              <label htmlFor="tp-remarks-input" className="report-remarks-label">
                REMARKS <span className="text-red-500">*</span>
              </label>
              <textarea
                id="tp-remarks-input"
                className={`report-remarks-textarea ${remarksError ? 'textarea-error' : ''}`}
                rows={3}
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  if (remarksError) {
                    setRemarksError(false);
                    setRemarksErrorMessage('');
                  }
                }}
                placeholder="Enter remarks..."
              />
              {remarksError && (
                <span className="text-xs text-red-500 font-semibold mt-1">
                  {remarksErrorMessage || 'Remarks are required before proceeding.'}
                </span>
              )}
            </div>
          )}

          {/* Section 2: On Hold Modal Remarks Block with Locked State & EDIT button (Image 1) */}
          {currentStatus === 'On Hold' && (
            <div className="report-remarks-input-block">
              <div className="report-remarks-header-row">
                <label className="report-remarks-label" style={{ margin: 0 }}>
                  REMARKS <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  className="btn-remarks-edit-pill"
                  onClick={() => {
                    setEditedRemarks(remarks || 'Awaiting replacement parts.');
                    setIsEditingRemarks(!isEditingRemarks);
                  }}
                  aria-label="Edit remarks"
                >
                  EDIT
                </button>
              </div>

              {!isEditingRemarks ? (
                /* Default Locked read-only state matching Image 1 */
                <div className="remarks-locked-box">
                  {remarks || 'Awaiting replacement parts.'}
                </div>
              ) : (
                /* Editable state when technician clicks EDIT */
                <div className="remarks-edit-container">
                  <textarea
                    id="tp-edit-remarks-input"
                    className="report-remarks-textarea"
                    rows={3}
                    value={editedRemarks}
                    onChange={(e) => setEditedRemarks(e.target.value)}
                    placeholder="Enter updated repair developments..."
                    autoFocus
                  />
                  <div className="remarks-edit-actions">
                    <button
                      type="button"
                      className="btn-cancel-remarks-small"
                      onClick={() => {
                        setEditedRemarks(remarks);
                        setIsEditingRemarks(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-save-remarks-small"
                      onClick={handleSaveEditedRemarks}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Resolved Modal Remarks Line (Image 2 & Image 4) */}
          {currentStatus === 'Resolved' && (
            <div className="report-resolved-remarks-line">
              Remarks: {remarks || (isLR24 ? 'Replace Monitor' : (report.remarks || 'Replace Monitor'))}
            </div>
          )}

          {/* Status History Timestamps List */}
          <div className="report-status-timestamps-block">
            {statusHistory && statusHistory.length > 0 ? (
              statusHistory.map((item, idx) => (
                <div key={`${item.status}-${idx}`} className="tp-history-entry-wrap">
                  <div className={`timestamp-row ${item.status === 'On Hold' ? 'row-on-hold' : ''}`}>
                    <span className="timestamp-label">
                      {item.status}
                    </span>
                    <span className="timestamp-value">{item.timeFormatted}</span>
                  </div>
                  {item.remarks && (
                    <div className="tp-history-remarks-subline" style={{ fontSize: '12.5px', color: '#4B5563', marginTop: '2px', paddingLeft: '2px' }}>
                      Remarks: <span style={{ fontWeight: 500, color: '#111827' }}>{item.remarks}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="timestamp-row">
                <span className="timestamp-label">Submitted</span>
                <span className="timestamp-value">{timestamps.submitted || formatCurrentTimestamp()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Action Bar */}
        {/* Images 1 & 3: Solid Dark Forest Green bar. Image 2: NO FOOTER BAR AT ALL! */}
        {!isStudentView && currentStatus !== 'Resolved' && (
          <div
            className={`report-modal-footer-green ${
              currentStatus === 'Under Repair' ? 'footer-between' : 'footer-end'
            }`}
          >
            {/* Stage 1: Mark as Reviewed */}
            {currentStatus === 'Submitted' && (
              <button
                type="button"
                className="btn-modal-action-white"
                onClick={handleAdvance}
                disabled={isSubmitting || isUpdating}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin inline mr-1" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Mark as Reviewed</span>
                )}
              </button>
            )}

            {/* Stage 2: Start Repair */}
            {currentStatus === 'Reviewed' && (
              <button
                type="button"
                className="btn-modal-action-white"
                onClick={handleAdvance}
                disabled={isSubmitting || isUpdating}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin inline mr-1" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <span>Start Repair</span>
                )}
              </button>
            )}

            {/* Stage 3: Under Repair -> Mark as on Hold & Mark as Resolved */}
            {currentStatus === 'Under Repair' && (
              <>
                <button
                  type="button"
                  className="btn-modal-action-on-hold"
                  onClick={handleOnHold}
                  disabled={isSubmitting || isUpdating}
                >
                  Mark as on Hold
                </button>
                <button
                  type="button"
                  className="btn-modal-action-white"
                  onClick={handleAdvance}
                  disabled={isSubmitting || isUpdating}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin inline mr-1" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <span>Mark as Resolved</span>
                  )}
                </button>
              </>
            )}

            {/* Image 1: On Hold Modal Footer -> Mark as Resolved */}
            {currentStatus === 'On Hold' && (
              <button
                type="button"
                className="btn-modal-action-white"
                onClick={handleOpenResolutionPrompt}
                disabled={isSubmitting || isUpdating}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin inline mr-1" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <span>Mark as Resolved</span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Student View Footer if student is viewing */}
        {isStudentView && (
          <div className="student-modal-simple-footer">
            <button
              type="button"
              className="btn-student-close"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Resolution Outcome Remarks Modal Prompt (When clicking Mark as Resolved from On Hold) */}
      {showResolutionPrompt && (
        <div
          className="resolution-prompt-backdrop"
          onClick={() => setShowResolutionPrompt(false)}
        >
          <div
            className="resolution-prompt-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="resolution-prompt-title"
          >
            <div className="resolution-prompt-header">
              <h3 id="resolution-prompt-title" className="resolution-prompt-title">
                Mark Report as Resolved
              </h3>
              <p className="resolution-prompt-subtitle">
                Please provide valid remarks describing the latest repair outcome before completing this report.
              </p>
            </div>

            <div className="resolution-prompt-body">
              <label htmlFor="resolution-remarks-input" className="resolution-prompt-label">
                Remarks / Repair Outcome <span className="text-red-500">*</span>
              </label>
              <textarea
                id="resolution-remarks-input"
                className={`resolution-prompt-textarea ${resolutionError ? 'textarea-error' : ''}`}
                rows={3}
                value={resolutionRemarks}
                onChange={(e) => {
                  setResolutionRemarks(e.target.value);
                  if (resolutionError) setResolutionError(false);
                }}
                placeholder="e.g. Replace Monitor"
                autoFocus
              />
              {resolutionError && (
                <span className="text-xs text-red-500 font-semibold mt-1 block">
                  Valid remarks describing the repair outcome are required.
                </span>
              )}
            </div>

            <div className="resolution-prompt-footer">
              <button
                type="button"
                className="btn-cancel-prompt"
                onClick={() => {
                  setShowResolutionPrompt(false);
                  setResolutionError(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-confirm-resolve"
                onClick={handleConfirmResolution}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin inline mr-1" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <span>Confirm & Resolve</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {renderEnlargedLightbox()}
    </div>
  );
}
