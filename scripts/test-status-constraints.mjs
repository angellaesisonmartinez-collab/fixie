import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testStatuses() {
  const testStatuses = ['Submitted', 'Reviewed', 'Under Review', 'Under Repair', 'On Hold', 'Resolved'];
  console.log('Testing which statuses can be saved in report_status_history...');
  
  // Get an existing report ID
  const { data: report } = await supabase.from('reports').select('id, status').limit(1).single();
  const testReportId = report.id;
  const originalStatus = report.status;

  for (const s of testStatuses) {
    const { data, error } = await supabase.from('report_status_history').insert({
      report_id: testReportId,
      status: s,
      remarks: 'test constraint check',
      created_at: new Date().toISOString()
    }).select();

    if (error) {
      console.log(`report_status_history REJECTED status "${s}":`, error.message);
    } else {
      console.log(`report_status_history ACCEPTED status "${s}" (id: ${data[0].id})`);
      // Delete test row
      await supabase.from('report_status_history').delete().eq('id', data[0].id);
    }
  }

  console.log('\nTesting which statuses can be saved in reports table...');
  for (const s of testStatuses) {
    const { error } = await supabase.from('reports').update({
      status: s
    }).eq('id', testReportId);

    if (error) {
      console.log(`reports REJECTED status "${s}":`, error.message);
    }
  }

  // Restore original status
  await supabase.from('reports').update({ status: originalStatus }).eq('id', testReportId);
  console.log(`Restored reports original status to: "${originalStatus}"`);
}

testStatuses();
