import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('=== Checking Reports vs Status History ===');
  const { data: reports, error: repErr } = await supabase
    .from('reports')
    .select('id, report_id, status, created_at, updated_at, remarks');
  
  if (repErr) {
    console.error('reports fetch error:', repErr);
    return;
  }

  const { data: history, error: histErr } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: true });

  if (histErr) {
    console.error('history fetch error:', histErr);
    return;
  }

  console.log(`Total reports: ${reports.length}`);
  console.log(`Total history entries: ${history.length}`);

  // Check which reports are missing "Submitted" entry
  const reportsWithoutSubmitted = [];
  const reportsWithNoHistoryAtAll = [];
  const reportHistoryMap = {};

  history.forEach(h => {
    if (!reportHistoryMap[h.report_id]) reportHistoryMap[h.report_id] = [];
    reportHistoryMap[h.report_id].push(h);
  });

  for (const r of reports) {
    const hist = reportHistoryMap[r.id] || [];
    if (hist.length === 0) {
      reportsWithNoHistoryAtAll.push(r);
    }
    const hasSubmitted = hist.some(h => h.status === 'Submitted');
    if (!hasSubmitted) {
      reportsWithoutSubmitted.push(r);
    }
  }

  console.log(`Reports with NO history at all: ${reportsWithNoHistoryAtAll.length}`);
  reportsWithNoHistoryAtAll.forEach(r => console.log(` - ${r.report_id} (${r.id}): status=${r.status}`));

  console.log(`Reports missing 'Submitted' history: ${reportsWithoutSubmitted.length}`);
  reportsWithoutSubmitted.forEach(r => console.log(` - ${r.report_id} (${r.id}): status=${r.status}, created_at=${r.created_at}`));

  // Check if status matches latest history entry
  console.log('\n=== Checking Status Consistency with Latest History ===');
  let mismatchCount = 0;
  for (const r of reports) {
    const hist = reportHistoryMap[r.id] || [];
    if (hist.length > 0) {
      // sort by created_at desc
      const sorted = [...hist].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latest = sorted[0];
      if (latest.status !== r.status) {
        console.log(`Mismatch on ${r.report_id} (${r.id}): report.status="${r.status}" vs latest_history="${latest.status}" (${latest.created_at})`);
        mismatchCount++;
      }
    }
  }
  console.log(`Total mismatches between report.status and latest history: ${mismatchCount}`);
}

check().catch(console.error);
