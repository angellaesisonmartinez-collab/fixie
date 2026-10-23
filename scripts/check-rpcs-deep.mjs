import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ieznsbzddanjwmnpvncs.supabase.co',
  'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr'
);

async function checkProcs() {
  const testNames = [
    'exec',
    'exec_sql',
    'execute_sql',
    'run_sql',
    'drop_tables',
    'cleanup_tables',
    'update_admin_account_credentials'
  ];

  for (const name of testNames) {
    const { data, error } = await supabase.rpc(name, {});
    console.log(`RPC ${name}:`, error ? error.message : data);
  }
}

checkProcs();
