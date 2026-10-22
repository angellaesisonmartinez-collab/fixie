const path = require('path');
const { createClient } = require(path.resolve('c:/Users/Lenovo V14/OneDrive/Documents/itsme-fixie1 - Copy/itsme-fixie/node_modules/@supabase/supabase-js'));
const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const sb = createClient(supabaseUrl, supabaseKey);

const REPORT_STUDENT_UUIDS = {
  'LR-01': 'e101ced6-cc94-4d17-83e7-c519782f7dba', // Chryztel Geene Salvador
  'LR-02': 'c52fa8d2-b505-4249-b012-060e313fe18e', // Bianca Allyzon Antonio
  'LR-03': 'd0a857f1-87a1-49a4-b0c7-5c3d61e78ecd', // Emmanuel Gaspar
  'LR-04': 'd907e0ff-fe9c-4d19-aac5-f826e311b5ef', // Jazmin Bayudan
  'LR-05': 'c16771bd-67f2-4bb2-9191-0e2dcb69a511', // Jeane Kelly Mina
  'LR-06': '81ccc938-0114-4894-8034-50b71a7aca74', // Alyssa Ramos
  'LR-07': '21877a55-8600-4a5d-88ce-4e0746c23898', // Maria Reyes
  'LR-08': '82f230ea-abdb-4bc2-8fea-e87eb897299c', // Juan Dela Cruz
  'LR-09': 'a9974b97-4eb0-4876-8a62-cdc86023bbd4', // Reyn Arahan
  'LR-10': '51664213-275b-4e67-9024-d92d7e0a8022', // Jennelyn Vergara
  'LR-11': '9002d8e6-bc03-4070-8aae-299147dead9a', // Angel Lae Martinez
  'LR-12': '81ccc938-0114-4894-8034-50b71a7aca74', // Alyssa Ramos
  'LR-13': '309bd498-9f2f-4753-a6ad-e27642a377b7', // Justine Kate Abello
  'LR-14': 'bbb5f955-b361-4929-8055-031d61dd4f58', // John Lester Tan
  'LR-15': 'e101ced6-cc94-4d17-83e7-c519782f7dba', // Chryztel Geene Salvador
  'LR-16': 'c52fa8d2-b505-4249-b012-060e313fe18e', // Bianca Allyzon Antonio
  'LR-17': 'd0a857f1-87a1-49a4-b0c7-5c3d61e78ecd', // Emmanuel Gaspar
  'LR-18': '43516fd4-6370-409e-96c0-5acc8d56d9c6', // Phia Cayetano
  'LR-19': '43516fd4-6370-409e-96c0-5acc8d56d9c6', // Phia Cayetano
  'LR-20': '21877a55-8600-4a5d-88ce-4e0746c23898', // Maria Reyes
  'LR-21': '82f230ea-abdb-4bc2-8fea-e87eb897299c', // Juan Dela Cruz
  'LR-22': 'a9974b97-4eb0-4876-8a62-cdc86023bbd4', // Reyn Arahan
  'LR-23': '51664213-275b-4e67-9024-d92d7e0a8022', // Jennelyn Vergara
  'LR-24': '9002d8e6-bc03-4070-8aae-299147dead9a', // Angel Lae Martinez
};

(async () => {
  console.log('=== RESTORING ORIGINAL REPORT OWNERS IN SUPABASE ===\n');

  // 1. Restore reports table student_id
  for (const [reportId, uuid] of Object.entries(REPORT_STUDENT_UUIDS)) {
    const { error } = await sb
      .from('reports')
      .update({ student_id: uuid })
      .eq('report_id', reportId);
    if (error) {
      console.error(`Failed to update ${reportId}:`, error.message);
    } else {
      console.log(`Restored ${reportId} -> student UUID ${uuid}`);
    }
  }

  // 2. Restore reports_of_student table to Angel Lae Martinez
  const { error: rosErr } = await sb
    .from('reports_of_student')
    .update({
      student_id: '24-0041-147',
      student_name: 'Angel Lae Martinez',
      year_block: 'BSIT 3-2'
    })
    .in('report_id', Object.keys(REPORT_STUDENT_UUIDS).slice(0, 18));

  if (rosErr) {
    console.error('Failed to restore reports_of_student:', rosErr.message);
  } else {
    console.log('Restored LR-01 to LR-18 in reports_of_student to Angel Lae Martinez.');
  }

  // 3. Delete extra rows added to reports_of_student for Maria Ortiz
  const { error: delErr } = await sb
    .from('reports_of_student')
    .delete()
    .eq('student_id', '24-0872-090')
    .in('report_id', ['LR-19', 'LR-20', 'LR-21', 'LR-22', 'LR-23', 'LR-24']);

  if (delErr) {
    console.error('Failed to clean up Maria Ortiz rows:', delErr.message);
  } else {
    console.log('Cleaned up extra rows for Maria Ortiz from reports_of_student.');
  }

  console.log('\n=== RESTORATION COMPLETE ===');
})();
