import { createClient } from '@supabase/supabase-js';
import {
  formatManilaHistoryTime,
  formatManilaDate,
  formatManilaTime,
  formatManilaDateTime,
  checkLaboratoryHours,
} from '../src/lib/reportDateUtils.js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeStatusLabel(st) {
  const s = String(st || '').toLowerCase().trim();
  if (s.includes('resolve')) return 'Resolved';
  if (s === 'on hold' || s === 'on_hold' || s.includes('hold')) return 'On Hold';
  if (s.includes('repair')) return 'Under Repair';
  if (s.includes('review')) return 'Under Review';
  if (s.includes('submit')) return 'Submitted';
  return st || 'Submitted';
}

function buildUnifiedHistoryEntries({
  historyRows = [],
  studentHistoryArray = [],
  currentReport = {},
  currentStatus = 'Submitted',
  currentRemarks = null,
}) {
  const timestamps = {};
  const entries = [];
  const rawList = [];

  for (const row of historyRows || []) {
    if (!row || !row.status) continue;
    rawList.push({
      status: normalizeStatusLabel(row.status),
      remarks: row.remarks || null,
      created_at: row.created_at,
    });
  }

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

  rawList.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeA - timeB;
  });

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
    if (item.status === 'Under Review') timestamps.reviewed = formattedTime;
    if (item.status === 'Under Repair') timestamps.underRepair = formattedTime;
    if (item.status === 'On Hold') timestamps.onHold = formattedTime;
    if (item.status === 'Resolved') timestamps.resolved = formattedTime;
  }

  const normCurrent = normalizeStatusLabel(currentStatus);
  if (normCurrent && entries.length > 0) {
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
      if (normCurrent === 'Under Review') timestamps.reviewed = formattedUpTime;
      if (normCurrent === 'Under Repair') timestamps.underRepair = formattedUpTime;
      if (normCurrent === 'On Hold') timestamps.onHold = formattedUpTime;
      if (normCurrent === 'Resolved') timestamps.resolved = formattedUpTime;
    }
  }

  return { entries, timestamps };
}

async function verify() {
  console.log('=====================================================');
  console.log('1. VERIFYING SUPABASE STATUS HISTORY INTEGRITY');
  console.log('=====================================================');

  const { data: reports, error: rErr } = await supabase
    .from('reports')
    .select('id, report_id, status, remarks, created_at, updated_at');
  if (rErr) throw rErr;

  const { data: allHistory, error: hErr } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: true });
  if (hErr) throw hErr;

  console.log(`Total reports in public.reports: ${reports.length}`);
  console.log(`Total entries in public.report_status_history: ${allHistory.length}`);

  const historyByReport = {};
  allHistory.forEach((h) => {
    if (!historyByReport[h.report_id]) historyByReport[h.report_id] = [];
    historyByReport[h.report_id].push(h);
  });

  let submittedCount = 0;
  let chronologicalCheckPassed = true;

  for (const rep of reports) {
    const hist = historyByReport[rep.id] || [];
    const hasSubmitted = hist.some((h) => h.status === 'Submitted');
    if (hasSubmitted) submittedCount++;
    else {
      console.error(`FAIL: Report ${rep.report_id} (${rep.id}) is missing 'Submitted' history entry!`);
    }

    // Verify chronological ordering
    for (let i = 1; i < hist.length; i++) {
      const prevTime = new Date(hist[i - 1].created_at).getTime();
      const currTime = new Date(hist[i].created_at).getTime();
      if (currTime < prevTime) {
        console.error(`FAIL: Out-of-order history for report ${rep.report_id}: ${hist[i - 1].created_at} vs ${hist[i].created_at}`);
        chronologicalCheckPassed = false;
      }
    }
  }

  console.log(`Reports with authentic 'Submitted' history: ${submittedCount}/${reports.length}`);
  console.log(`Chronological ordering check: ${chronologicalCheckPassed ? 'PASSED ✅' : 'FAILED ❌'}`);

  console.log('\n=====================================================');
  console.log('2. VERIFYING UNIFIED HISTORY BUILDER & FORMATTER');
  console.log('=====================================================');

  // Test sample report LR-19 (Phia)
  const rep19 = reports.find((r) => r.report_id === 'LR-19');
  if (rep19) {
    const hist19 = historyByReport[rep19.id] || [];
    const unified19 = buildUnifiedHistoryEntries({
      historyRows: hist19,
      currentReport: rep19,
      currentStatus: rep19.status,
      currentRemarks: rep19.remarks,
    });

    console.log(`LR-19 (${rep19.status}) Unified History entries (${unified19.entries.length}):`);
    unified19.entries.forEach((e, idx) => {
      console.log(`  ${idx + 1}. [${e.status}] — ${e.timeFormatted} ${e.remarks ? '| Remarks: ' + e.remarks : ''}`);
    });

    const first = unified19.entries[0];
    const last = unified19.entries[unified19.entries.length - 1];
    const isFirstSubmitted = first?.status === 'Submitted';
    const isLastCurrent = last?.status === normalizeStatusLabel(rep19.status);
    console.log(`LR-19 First entry is Submitted: ${isFirstSubmitted ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`LR-19 Last entry matches current status (${rep19.status}): ${isLastCurrent ? 'PASS ✅' : 'FAIL ❌'}`);
  }

  // Test sample report LR-23 (Jennelyn)
  const rep23 = reports.find((r) => r.report_id === 'LR-23');
  if (rep23) {
    const hist23 = historyByReport[rep23.id] || [];
    const unified23 = buildUnifiedHistoryEntries({
      historyRows: hist23,
      currentReport: rep23,
      currentStatus: rep23.status,
      currentRemarks: rep23.remarks,
    });

    console.log(`\nLR-23 (${rep23.status}) Unified History entries (${unified23.entries.length}):`);
    unified23.entries.forEach((e, idx) => {
      console.log(`  ${idx + 1}. [${e.status}] — ${e.timeFormatted} ${e.remarks ? '| Remarks: ' + e.remarks : ''}`);
    });

    const first = unified23.entries[0];
    const last = unified23.entries[unified23.entries.length - 1];
    console.log(`LR-23 First entry is Submitted: ${first?.status === 'Submitted' ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`LR-23 Last entry matches current status (${rep23.status}): ${last?.status === normalizeStatusLabel(rep23.status) ? 'PASS ✅' : 'FAIL ❌'}`);
  }

  console.log('\n=====================================================');
  console.log('3. VERIFYING DATE & TIME FORMATTERS (PHILIPPINE TIME)');
  console.log('=====================================================');
  const now = new Date();
  const manilaFormatted = formatManilaHistoryTime(now);
  console.log('Current Date in Philippine Time:', manilaFormatted);
  console.log('Format Manila Date:', formatManilaDate(now));
  console.log('Format Manila Time:', formatManilaTime(now));
  console.log('Format Manila DateTime:', formatManilaDateTime(now));

  // Lab hours check
  const labCheck = checkLaboratoryHours(now);
  console.log(`Laboratory Hours check at ${labCheck.formattedTime} Manila:`, labCheck.isAllowed ? 'OPEN (Allowed)' : 'CLOSED (Blocked)');
  console.log('Lab Hours error message if blocked:', labCheck.errorMessage);

  console.log('\nALL VERIFICATION STEPS COMPLETE! ✅');
}

verify().catch(console.error);
