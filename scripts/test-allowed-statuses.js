import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ieznsbzddanjwmnpvncs.supabase.co',
  'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr'
);

async function testStatuses() {
  const candidateStatuses = [
    'Submitted',
    'Reviewed',
    'Under Repair',
    'Resolved',
    'On Hold',
    'On-Hold',
    'Hold',
    'on_hold'
  ];

  for (const s of candidateStatuses) {
    const { error } = await supabase
      .from('reports')
      .update({ status: s })
      .eq('report_id', 'LR-24');

    console.log(`Status "${s}":`, error ? error.message : 'SUCCESS');
    if (!error) {
      // restore to Submitted
      await supabase.from('reports').update({ status: 'Submitted' }).eq('report_id', 'LR-24');
    }
  }
}

testStatuses();
