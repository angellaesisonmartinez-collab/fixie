import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ieznsbzddanjwmnpvncs.supabase.co',
  'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr'
);

async function testUpdate() {
  console.log('Testing update status to On Hold...');
  const { data, error } = await supabase
    .from('reports')
    .update({ status: 'On Hold' })
    .eq('report_id', 'LR-19')
    .select();

  console.log('Update result:', data, 'Error:', error);
}

testUpdate();
