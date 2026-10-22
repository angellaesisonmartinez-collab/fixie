import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillSubmittedHistory() {
  console.log('=== Backfilling Submitted Status History for Old Reports ===');
  
  // 1. Fetch all reports
  const { data: reports, error: repErr } = await supabase
    .from('reports')
    .select('id, report_id, status, created_at, updated_at, description');

  if (repErr) {
    console.error('Failed to fetch reports:', repErr);
    return;
  }

  // 2. Fetch existing history entries
  const { data: existingHistory, error: histErr } = await supabase
    .from('report_status_history')
    .select('*');

  if (histErr) {
    console.error('Failed to fetch history:', histErr);
    return;
  }

  const reportsWithSubmitted = new Set(
    existingHistory
      .filter(h => h.status === 'Submitted')
      .map(h => h.report_id)
  );

  const missingSubmittedReports = reports.filter(r => !reportsWithSubmitted.has(r.id));
  console.log(`Found ${missingSubmittedReports.length} reports missing 'Submitted' history entry.`);

  const toInsert = missingSubmittedReports.map(r => ({
    report_id: r.id,
    status: 'Submitted',
    remarks: null,
    created_at: r.created_at || new Date().toISOString()
  }));

  if (toInsert.length > 0) {
    const { data: inserted, error: insErr } = await supabase
      .from('report_status_history')
      .insert(toInsert)
      .select();

    if (insErr) {
      console.error('Error inserting backfill records:', insErr);
      return;
    }
    console.log(`Successfully backfilled ${inserted.length} 'Submitted' entries into report_status_history!`);
  }

  // 3. Also check if any report's current status is missing from report_status_history
  // e.g. if report is "Resolved" or "Under Repair" or "Reviewed" / "Under Review" or "On Hold"
  const historyByReport = {};
  const { data: allHistoryNow } = await supabase.from('report_status_history').select('*');
  allHistoryNow.forEach(h => {
    if (!historyByReport[h.report_id]) historyByReport[h.report_id] = [];
    historyByReport[h.report_id].push(h);
  });

  const missingCurrentStatus = [];
  for (const r of reports) {
    const entries = historyByReport[r.id] || [];
    const hasCurrent = entries.some(e => e.status === r.status);
    if (!hasCurrent) {
      missingCurrentStatus.push(r);
    }
  }

  console.log(`Reports missing their current status in history: ${missingCurrentStatus.length}`);
  for (const r of missingCurrentStatus) {
    console.log(`Report ${r.report_id} has status "${r.status}" not found in history`);
    const { error: insErr } = await supabase
      .from('report_status_history')
      .insert({
        report_id: r.id,
        status: r.status,
        remarks: r.remarks || null,
        created_at: r.updated_at || r.created_at || new Date().toISOString()
      });
    if (insErr) console.error(`Error adding current status for ${r.report_id}:`, insErr.message);
    else console.log(`Added current status "${r.status}" for ${r.report_id}`);
  }

  // 4. Verification
  console.log('\n=== Final Verification of Status History Coverage ===');
  const { data: finalHistory } = await supabase.from('report_status_history').select('*');
  const finalByReport = {};
  finalHistory.forEach(h => {
    if (!finalByReport[h.report_id]) finalByReport[h.report_id] = [];
    finalByReport[h.report_id].push(h);
  });

  let allGood = true;
  for (const r of reports) {
    const entries = finalByReport[r.id] || [];
    const hasSub = entries.some(e => e.status === 'Submitted');
    if (!hasSub) {
      console.error(`ERROR: ${r.report_id} still missing 'Submitted' entry!`);
      allGood = false;
    }
  }

  if (allGood) {
    console.log(`SUCCESS: All ${reports.length} reports now have authentic 'Submitted' history entries!`);
  }
}

backfillSubmittedHistory().catch(console.error);
