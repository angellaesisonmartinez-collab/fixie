import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('1. Testing select from report_status_history:');
  const { data: hist, error: err1 } = await supabase
    .from('report_status_history')
    .select('*')
    .limit(5);
  console.log('Select result:', { count: hist?.length, err1 });

  console.log('\n2. Testing select a report:');
  const { data: reps, error: err2 } = await supabase
    .from('reports')
    .select('id, report_id, status, updated_at')
    .limit(3);
  console.log('Reports sample:', reps, err2);

  if (reps && reps[0]) {
    const testRep = reps[0];
    console.log(`\n3. Testing select report_status_history for report id=${testRep.id} (report_id=${testRep.report_id}):`);
    const { data: repHist, error: err3 } = await supabase
      .from('report_status_history')
      .select('*')
      .eq('report_id', testRep.id);
    console.log(`History count for ${testRep.id}:`, repHist?.length, err3);

    const { data: repHist2, error: err3b } = await supabase
      .from('report_status_history')
      .select('*')
      .eq('report_id', testRep.report_id);
    console.log(`History count for ${testRep.report_id}:`, repHist2?.length, err3b);
  }

  console.log('\n4. Testing check constraints on report_status_history (what statuses are allowed):');
  // Check if insert works
  const dummyReportId = reps[0]?.id;
  if (dummyReportId) {
    const testStatus = 'Under Repair';
    const { data: insData, error: insErr } = await supabase
      .from('report_status_history')
      .insert({
        report_id: dummyReportId,
        status: testStatus,
        remarks: 'Verification check entry'
      })
      .select();
    console.log('Insert test:', insData, insErr);

    if (insData && insData[0]) {
      // Clean up test entry
      const { error: delErr } = await supabase
        .from('report_status_history')
        .delete()
        .eq('id', insData[0].id);
      console.log('Cleanup delete:', delErr);
    }
  }
}

testSupabase();
