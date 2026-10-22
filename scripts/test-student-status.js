import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ieznsbzddanjwmnpvncs.supabase.co',
  'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr'
);

async function testUpdateStudentReports() {
  const { data, error } = await supabase
    .from('reports_of_student')
    .update({ status: 'On Hold' })
    .eq('report_id', 'LR-12')
    .select();

  console.log('Update reports_of_student result:', data, 'Error:', error);
}

testUpdateStudentReports();
