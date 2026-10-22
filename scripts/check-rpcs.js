import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ieznsbzddanjwmnpvncs.supabase.co',
  'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr'
);

async function checkRpcs() {
  const rpcs = [
    'exec',
    'execute',
    'execute_sql',
    'run_sql',
    'update_admin_account_credentials',
    'exec_sql'
  ];

  for (const rpc of rpcs) {
    const { data, error } = await supabase.rpc(rpc, {});
    console.log(`RPC ${rpc}:`, error ? error.message : data);
  }
}

checkRpcs();
