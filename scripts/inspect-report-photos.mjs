import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDetails() {
  const { data: repData, error: repErr } = await supabase.from('reports').select('*').limit(2);
  console.log('reports sample keys:', repData ? Object.keys(repData[0]) : repErr);
  console.log('reports sample 0:', repData ? repData[0] : null);

  const { data: rosData, error: rosErr } = await supabase.from('reports_of_student').select('*').limit(2);
  console.log('reports_of_student sample keys:', rosData ? Object.keys(rosData[0]) : rosErr);
  console.log('reports_of_student sample 0:', rosData ? rosData[0] : null);

  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  console.log('storage buckets:', buckets, 'bErr:', bErr);
}

checkDetails();
