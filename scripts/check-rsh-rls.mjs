import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRsh() {
  // Test querying report_status_history by report_id
  const { data: rep } = await supabase.from('reports').select('id, report_id').limit(1).single();
  const { data: hist, error } = await supabase
    .from('report_status_history')
    .select('*')
    .eq('report_id', rep.id);

  console.log(`Querying history for report ${rep.report_id} (${rep.id}):`);
  if (error) console.error('Error:', error.message);
  else console.log(`SUCCESS! Found ${hist.length} history rows.`);
}

checkRsh().catch(console.error);
