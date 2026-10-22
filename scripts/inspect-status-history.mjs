import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- Inspecting report_status_history table ---');
  const { data: histSample, error: histErr } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (histErr) {
    console.error('report_status_history error:', histErr);
  } else {
    console.log(`Found ${histSample.length} recent entries in report_status_history:`);
    console.log(JSON.stringify(histSample, null, 2));
  }

  console.log('\n--- Inspecting reports columns and sample ---');
  const { data: repSample, error: repErr } = await supabase
    .from('reports')
    .select('*')
    .limit(2);
  if (repErr) console.error('reports error:', repErr);
  else console.log('reports sample keys:', Object.keys(repSample[0] || {}));

  console.log('\n--- Inspecting reports_of_student sample ---');
  const { data: rosSample, error: rosErr } = await supabase
    .from('reports_of_student')
    .select('*')
    .limit(2);
  if (rosErr) console.error('ros error:', rosErr);
  else console.log('ros sample keys:', Object.keys(rosSample[0] || {}));

  console.log('\n--- Testing insert permissions on report_status_history ---');
  // test inserting a dummy record if possible or check
}

main().catch(console.error);
