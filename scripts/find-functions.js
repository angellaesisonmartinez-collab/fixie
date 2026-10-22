import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ieznsbzddanjwmnpvncs.supabase.co',
  'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr'
);

async function findFunctions() {
  const { data, error } = await supabase.from('information_schema.routines').select('*');
  console.log('routines:', data, error);
}

findFunctions();
