import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRshPermissions() {
  console.log('Testing SELECT on report_status_history:');
  const { data: selData, error: selErr } = await supabase
    .from('report_status_history')
    .select('*')
    .limit(5);
  console.log('SELECT result:', selErr ? selErr.message : `SUCCESS, read ${selData.length} rows`);

  // Get a sample report id
  const { data: rep } = await supabase.from('reports').select('id, report_id').limit(1).single();
  console.log('Testing INSERT on report_status_history for report', rep?.report_id);

  const { data: insData, error: insErr } = await supabase
    .from('report_status_history')
    .insert({
      report_id: rep.id,
      status: 'Submitted',
      created_at: new Date().toISOString()
    })
    .select();
  console.log('INSERT result:', insErr ? insErr.message : `SUCCESS, inserted id ${insData[0]?.id}`);

  if (insData && insData[0]?.id) {
    // Clean up
    const { error: delErr } = await supabase
      .from('report_status_history')
      .delete()
      .eq('id', insData[0].id);
    console.log('DELETE cleanup result:', delErr ? delErr.message : 'SUCCESS');
  }
}

testRshPermissions().catch(console.error);
