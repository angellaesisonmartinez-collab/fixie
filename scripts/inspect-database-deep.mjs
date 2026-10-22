import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('=== Checking Reports Statuses ===');
  const { data: reports, error: repErr } = await supabase
    .from('reports')
    .select('id, report_id, status, created_at, updated_at');
  if (repErr) {
    console.error('reports error:', repErr);
  } else {
    console.log(`Total reports in public.reports: ${reports.length}`);
    const statusCounts = {};
    reports.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });
    console.log('Status counts in reports:', statusCounts);
  }

  console.log('\n=== Testing Status values (Under Review, Reviewed, etc) ===');
  if (reports && reports.length > 0) {
    const testId = reports[0].id;
    const testOrig = reports[0].status;
    for (const testStatus of ['Under Review', 'Reviewed', 'Under Repair', 'On Hold', 'Resolved', 'Submitted']) {
      const { error: testErr } = await supabase
        .from('reports')
        .update({ status: testStatus })
        .eq('id', testId);
      console.log(`Update reports to "${testStatus}":`, testErr ? testErr.message : 'SUCCESS');
    }
    // restore original
    await supabase.from('reports').update({ status: testOrig }).eq('id', testId);

    // Also test report_status_history insert
    for (const testStatus of ['Under Review', 'Reviewed', 'Under Repair', 'On Hold', 'Resolved', 'Submitted']) {
      const { error: rshErr } = await supabase
        .from('report_status_history')
        .insert({ report_id: testId, status: testStatus, remarks: 'test' });
      console.log(`Insert report_status_history with "${testStatus}":`, rshErr ? rshErr.message : 'SUCCESS');
      if (!rshErr) {
        // delete test row
        await supabase
          .from('report_status_history')
          .delete()
          .eq('report_id', testId)
          .eq('remarks', 'test');
      }
    }
  }

  console.log('\n=== Inspecting All report_status_history rows ===');
  const { data: allHistory, error: allHistErr } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: true });
  if (allHistErr) {
    console.error('report_status_history query error:', allHistErr);
  } else {
    console.log(`Total rows in report_status_history: ${allHistory.length}`);
    const rshStatusCounts = {};
    allHistory.forEach(h => {
      rshStatusCounts[h.status] = (rshStatusCounts[h.status] || 0) + 1;
    });
    console.log('Status counts in report_status_history:', rshStatusCounts);
    console.log('Sample history entries:');
    allHistory.slice(0, 5).forEach(h => console.log(h));
  }
}

inspect().catch(console.error);
