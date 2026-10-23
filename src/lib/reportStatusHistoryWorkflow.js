import { supabase } from './supabase.js';
import { parseReportDateTime, formatManilaHistoryTime } from './reportDateUtils.js';

// Module-level caches for instantaneous modal rendering and zero network round-trip overhead
export const reportHistoryCache = new Map();
export const canonicalUuidCache = new Map();

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
 * Resolves canonical reports.id UUID and human report_id (e.g. 'LR-24')
 */
export async function getCanonicalReportInfo(rep) {
  if (!rep) return { canonicalUuid: null, reportCode: null };
  const isUuid = (val) =>
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  const humanCode = rep.report_id && !isUuid(rep.report_id)
    ? rep.report_id
    : (!isUuid(rep.id) ? rep.id : null);

  const candidates = [rep.canonical_uuid, rep.canonicalUuid, rep.id, rep.report_uuid, rep.uuid].filter(isUuid);
  if (candidates.length > 0) {
    const canonicalUuid = candidates[0];
    if (humanCode) canonicalUuidCache.set(humanCode, canonicalUuid);
    canonicalUuidCache.set(canonicalUuid, canonicalUuid);
    return { canonicalUuid, reportCode: humanCode };
  }

  if (humanCode && canonicalUuidCache.has(humanCode)) {
    return { canonicalUuid: canonicalUuidCache.get(humanCode), reportCode: humanCode };
  }
  if (rep.id && canonicalUuidCache.has(rep.id)) {
    return { canonicalUuid: canonicalUuidCache.get(rep.id), reportCode: humanCode };
  }

  if (humanCode) {
    try {
      const { data } = await supabase
        .from('reports')
        .select('id, report_id')
        .eq('report_id', humanCode)
        .maybeSingle();
      if (data?.id) {
        canonicalUuidCache.set(humanCode, data.id);
        canonicalUuidCache.set(data.id, data.id);
        return { canonicalUuid: data.id, reportCode: data.report_id || humanCode };
      }
    } catch {}
  }

  if (humanCode) {
    try {
      const { data: rosRow } = await supabase
        .from('reports_of_student')
        .select('id, report_id')
        .eq('report_id', humanCode)
        .maybeSingle();
      if (rosRow?.id && isUuid(rosRow.id)) {
        canonicalUuidCache.set(humanCode, rosRow.id);
        return { canonicalUuid: rosRow.id, reportCode: humanCode };
      }
    } catch {}
  }

  return { canonicalUuid: null, reportCode: humanCode };
}

export function normalizeStatusLabel(st) {
  const s = String(st || '').toLowerCase().trim();
  if (s.includes('resolve')) return 'Resolved';
  if (s === 'on hold' || s === 'on_hold' || s.includes('hold')) return 'On Hold';
  if (s.includes('repair')) return 'Under Repair';
  if (s === 'reviewed' || s === 'under review' || s === 'under_review') return 'Under Review';
  if (s === 'submitted' || s.includes('submit')) return 'Submitted';
  return 'Submitted';
}

export function normalizeDbStatus(st) {
  const s = String(st || '').toLowerCase().trim();
  if (s.includes('resolve')) return 'Resolved';
  if (s === 'on hold' || s === 'on_hold' || s.includes('hold')) return 'On Hold';
  if (s.includes('repair')) return 'Under Repair';
  if (s === 'reviewed' || s === 'under review' || s === 'under_review') return 'Reviewed';
  if (s === 'submitted' || s.includes('submit')) return 'Submitted';
  return st || 'Submitted';
}

/**
 * Returns human-readable label for status history entries:
 * 'Submitted' -> 'Date Submitted', 'Under Review' -> 'Under Review',
 * 'Under Repair' -> 'Under Repair', 'On Hold' -> 'On Hold', 'Resolved' -> 'Resolved'.
 */
export function getStatusHistoryLabel(status) {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'submitted' || s.includes('submit')) return 'Date Submitted';
  if (s === 'under review' || s === 'under_review' || s === 'reviewed') return 'Under Review';
  if (s === 'under repair' || s.includes('repair')) return 'Under Repair';
  if (s === 'on hold' || s === 'on_hold' || s.includes('hold')) return 'On Hold';
  if (s.includes('resolve')) return 'Resolved';
  return status || 'Under Review';
}

/**
 * Ensures timestamp display strictly adheres to 'MMM DD, YYYY • h:mm A' format.
 */
export function formatStatusHistoryDisplayTime(timeInput) {
  if (!timeInput) return '';
  if (timeInput instanceof Date) {
    return formatManilaHistoryTime(timeInput);
  }
  const str = String(timeInput).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return formatManilaHistoryTime(str);
  }
  return str
    .replace(/\s*•\s*/g, ' • ')
    .replace(/, (?=\d{1,2}:\d{2}\s*(?:AM|PM))/i, ' • ');
}

/**
 * Builds unified status history list combining database audit rows and student history.
 * Displays history in true chronological order (oldest to newest):
 * 1. Newly Submitted: displays only "Date Submitted" (with original submission timestamp)
 * 2. Under Review: retains "Date Submitted" and adds "Under Review" (actual timestamp Review was clicked)
 * 3. Under Repair: adds "Under Repair" (actual timestamp Start Repair was clicked)
 * 4. On Hold: adds "On Hold" only if explicitly placed on hold
 * 5. Resolved: adds "Resolved" (whether from Under Repair or On Hold)
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
      status: normalizeDbStatus(row.status),
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
        status: normalizeDbStatus(rawAction),
        remarks: h.remarksText || h.remarks || null,
        created_at: h.time || h.created_at,
      });
    }
  }

  // 3. Ensure authentic "Submitted" entry exists as baseline (Date Submitted)
  // Date Submitted must strictly represent the original submission timestamp, not updated_at
  const submissionTimestamp =
    currentReport.created_at ||
    currentReport.raw_created_at ||
    currentReport.date_submitted ||
    rawList.find((e) => e.status === 'Submitted')?.created_at ||
    new Date().toISOString();

  const submittedRow = rawList.find((e) => e.status === 'Submitted');
  const subTime = submittedRow?.created_at || submissionTimestamp;
  const formattedSubTime = formatManilaHistoryTime(subTime);

  entries.push({
    status: 'Submitted',
    remarks: null,
    timeFormatted: formattedSubTime,
    createdAt: subTime,
  });
  timestamps.submitted = formattedSubTime;

  // Normalized current status of the report
  const normCurrent = normalizeDbStatus(currentStatus || currentReport.status || 'Submitted');

  // Check if an authentic review event has occurred or status is past review
  const reviewedRow = rawList.find(
    (e) => e.status === 'Reviewed' || e.status === 'Under Review'
  );
  const isReviewedOrBeyond =
    Boolean(reviewedRow) ||
    normCurrent === 'Reviewed' ||
    normCurrent === 'Under Repair' ||
    normCurrent === 'On Hold' ||
    normCurrent === 'Resolved' ||
    Boolean(currentReport.reviewed_at);

  if (isReviewedOrBeyond && normCurrent !== 'Submitted') {
    const reviewTime =
      reviewedRow?.created_at ||
      currentReport.reviewed_at ||
      (normCurrent === 'Reviewed' ? currentReport.updated_at : null) ||
      subTime;
    const formattedRevTime = formatManilaHistoryTime(reviewTime);

    entries.push({
      status: 'Under Review',
      remarks: null,
      timeFormatted: formattedRevTime,
      createdAt: reviewTime,
    });
    timestamps.reviewed = formattedRevTime;
  }

  // Check if repair event has occurred or status is past repair
  const underRepairRow = rawList.find((e) => e.status === 'Under Repair');
  const isRepairOrBeyond =
    Boolean(underRepairRow) ||
    normCurrent === 'Under Repair' ||
    normCurrent === 'On Hold' ||
    normCurrent === 'Resolved' ||
    Boolean(currentReport.under_repair_at);

  if (
    isRepairOrBeyond &&
    normCurrent !== 'Submitted' &&
    normCurrent !== 'Reviewed'
  ) {
    const repairTime =
      underRepairRow?.created_at ||
      currentReport.under_repair_at ||
      (normCurrent === 'Under Repair' ? currentReport.updated_at : null) ||
      subTime;
    const formattedRepairTime = formatManilaHistoryTime(repairTime);

    entries.push({
      status: 'Under Repair',
      remarks: null,
      timeFormatted: formattedRepairTime,
      createdAt: repairTime,
    });
    timestamps.underRepair = formattedRepairTime;
  }

  // On Hold entry: ONLY if Technical Personnel explicitly selected Mark On Hold
  const onHoldRow = rawList.find((e) => e.status === 'On Hold');
  const wasOrIsOnHold =
    Boolean(onHoldRow) ||
    normCurrent === 'On Hold' ||
    Boolean(currentReport.has_been_on_hold) ||
    Boolean(currentReport.on_hold_at);

  if (wasOrIsOnHold) {
    const onHoldTime =
      onHoldRow?.created_at ||
      currentReport.on_hold_at ||
      (normCurrent === 'On Hold' ? currentReport.updated_at : null) ||
      new Date().toISOString();
    const formattedHoldTime = formatManilaHistoryTime(onHoldTime);
    const holdRemarks =
      onHoldRow?.remarks ||
      currentReport.remarks ||
      (normCurrent === 'On Hold' ? currentRemarks : null);

    entries.push({
      status: 'On Hold',
      remarks: holdRemarks,
      timeFormatted: formattedHoldTime,
      createdAt: onHoldTime,
    });
    timestamps.onHold = formattedHoldTime;
  }

  // Resolved entry: when Technical Personnel clicked Mark as Resolved
  const resolvedRow = rawList.find((e) => e.status === 'Resolved');
  const isResolved = Boolean(resolvedRow) || normCurrent === 'Resolved';

  if (isResolved) {
    const resolvedTime =
      resolvedRow?.created_at ||
      currentReport.resolved_at ||
      currentReport.updated_at ||
      new Date().toISOString();
    const formattedResTime = formatManilaHistoryTime(resolvedTime);
    const resRemarks =
      resolvedRow?.remarks ||
      currentReport.remarks ||
      (normCurrent === 'Resolved' ? currentRemarks : null);

    entries.push({
      status: 'Resolved',
      remarks: resRemarks,
      timeFormatted: formattedResTime,
      createdAt: resolvedTime,
    });
    timestamps.resolved = formattedResTime;
  }

  return { entries, timestamps };
}

/**
 * Initialize timestamps mapping
 */
export function getInitialTimestamps(report) {
  const parsed = parseReportDateTime(report);
  let subTime = parsed.dateTimeDisplay || formatManilaHistoryTime(report?.created_at || new Date());

  const status = normalizeDbStatus(report?.status || 'Submitted');

  const reviewedHistoryItem = report?.history?.find((h) => {
    const act = (h.action || h.status || '').toLowerCase();
    return act.includes('review') || act === 'reviewed';
  });
  const repairHistoryItem = report?.history?.find((h) => (h.action || h.status || '').toLowerCase().includes('repair'));
  const onHoldHistoryItem = report?.history?.find((h) => (h.action || h.status || '').toLowerCase().includes('hold'));
  const resolvedHistoryItem = report?.history?.find((h) => (h.action || h.status || '').toLowerCase().includes('resolve'));

  const updatedAtFormatted = report?.updated_at ? formatManilaHistoryTime(report.updated_at) : null;

  const reviewTimeVal = reviewedHistoryItem?.time || report?.reviewed_at;
  const reviewedTime = reviewTimeVal
    ? formatManilaHistoryTime(reviewTimeVal)
    : (report?.timestamps?.reviewed || ((status === 'Reviewed' || status === 'Under Repair' || status === 'On Hold' || status === 'Resolved') ? updatedAtFormatted : null));

  const repairTimeVal = repairHistoryItem?.time || report?.under_repair_at;
  const underRepairTime = repairTimeVal
    ? formatManilaHistoryTime(repairTimeVal)
    : (report?.timestamps?.underRepair || ((status === 'Under Repair' || status === 'On Hold' || status === 'Resolved') ? updatedAtFormatted : null));

  const onHoldTimeVal = onHoldHistoryItem?.time || report?.on_hold_at;
  const onHoldTime = onHoldTimeVal
    ? formatManilaHistoryTime(onHoldTimeVal)
    : (report?.timestamps?.onHold || (status === 'On Hold' ? updatedAtFormatted : null));

  const resolvedTimeVal = resolvedHistoryItem?.time || report?.resolved_at;
  const resolvedTime = resolvedTimeVal
    ? formatManilaHistoryTime(resolvedTimeVal)
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

/**
 * Returns instant status history from cache, report.history, or baseline synthesis.
 */
export function getInitialStatusHistory(report) {
  if (!report) return [];
  const targetId = report.report_id || report.id;
  const curUuid = getReportUuid(report);

  if (targetId && reportHistoryCache.has(targetId)) {
    return reportHistoryCache.get(targetId);
  }
  if (curUuid && reportHistoryCache.has(curUuid)) {
    return reportHistoryCache.get(curUuid);
  }

  // If report has history array (e.g. from student report or reports_of_student)
  if (Array.isArray(report.history) && report.history.length > 0) {
    const unified = buildUnifiedHistoryEntries({
      studentHistoryArray: report.history,
      currentReport: report,
      currentStatus: report.status,
      currentRemarks: report.remarks,
    });
    if (unified.entries && unified.entries.length > 0) {
      if (targetId) reportHistoryCache.set(targetId, unified.entries);
      if (curUuid) reportHistoryCache.set(curUuid, unified.entries);
      return unified.entries;
    }
  }

  // Synthesize immediate baseline history matching report's current status and timestamps
  const timestamps = getInitialTimestamps(report);
  const status = normalizeDbStatus(report.status || 'Submitted');
  const entries = [];

  const subTime = timestamps.submitted || formatManilaHistoryTime(report.created_at || new Date());
  entries.push({
    status: 'Submitted',
    remarks: null,
    timeFormatted: subTime,
    createdAt: report.created_at || new Date().toISOString(),
  });

  const revTime = timestamps.reviewed;
  if (revTime && (status === 'Reviewed' || status === 'Under Repair' || status === 'On Hold' || status === 'Resolved')) {
    entries.push({
      status: 'Under Review',
      remarks: null,
      timeFormatted: revTime,
      createdAt: report.reviewed_at || report.updated_at || report.created_at || new Date().toISOString(),
    });
  }

  const repairTime = timestamps.underRepair;
  if (repairTime && (status === 'Under Repair' || status === 'On Hold' || status === 'Resolved')) {
    entries.push({
      status: 'Under Repair',
      remarks: null,
      timeFormatted: repairTime,
      createdAt: report.under_repair_at || report.updated_at || report.created_at || new Date().toISOString(),
    });
  }

  const holdTime = timestamps.onHold;
  const wasOnHold = status === 'On Hold' || report.has_been_on_hold || report.on_hold_at || Boolean(holdTime);
  if (holdTime && wasOnHold && (status === 'On Hold' || status === 'Resolved')) {
    entries.push({
      status: 'On Hold',
      remarks: report.remarks || null,
      timeFormatted: holdTime,
      createdAt: report.on_hold_at || report.updated_at || new Date().toISOString(),
    });
  }

  const resTime = timestamps.resolved;
  if (resTime && status === 'Resolved') {
    entries.push({
      status: 'Resolved',
      remarks: report.remarks || null,
      timeFormatted: resTime,
      createdAt: report.resolved_at || report.updated_at || new Date().toISOString(),
    });
  }

  if (targetId && entries.length > 0) {
    reportHistoryCache.set(targetId, entries);
  }
  if (curUuid && entries.length > 0) {
    reportHistoryCache.set(curUuid, entries);
  }

  return entries;
}
