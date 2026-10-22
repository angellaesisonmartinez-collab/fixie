import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDemo() {
  console.log('🔄 Resetting Technical Personnel credentials to default...');

  // Try the comprehensive RPC first
  const { error: rpcError } = await supabase.rpc('reset_fixie_demo_state');

  if (!rpcError) {
    console.log('✅ reset_fixie_demo_state executed successfully!');
  } else {
    console.log('ℹ️ RPC note:', rpcError.message);
  }

  // Ensure technical_personnel row is directly updated to default values
  const { data, error: tableError } = await supabase
    .from('technical_personnel')
    .update({
      username: 'ict-admin',
      is_setup_complete: false,
      updated_at: new Date().toISOString(),
    })
    .eq('registered_email', 'angellaemrtnz@gmail.com')
    .select();

  if (tableError) {
    console.error('❌ Error updating technical_personnel table:', tableError.message);
  } else {
    console.log('✅ Technical Personnel reset completed:');
    console.log('   Username: ict-admin');
    console.log('   Password: Fixie@ICT2026!');
    console.log('   is_setup_complete: false');
    console.log(JSON.stringify(data, null, 2));
  }
}

resetDemo();
