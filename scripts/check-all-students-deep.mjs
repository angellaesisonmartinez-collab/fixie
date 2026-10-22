import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEveryStudent() {
  const { data: students } = await supabase.from('students').select('*').order('student_id');
  const { data: reports } = await supabase.from('reports').select('*').order('report_id');
  const { data: studentReports } = await supabase.from('reports_of_student').select('*').order('report_id');
  const { data: savedGuides } = await supabase.from('saved_guides').select('*');

  console.log(`\n================ TOTAL STUDENTS: ${students.length} ================`);
  for (const s of students) {
    const sId = s.student_id;
    const sUuid = s.id;
    const sName = s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim();

    // reports in `reports` table
    const matchedReports = reports.filter(r => r.student_id === sUuid || r.student_id === sId);
    
    // reports in `reports_of_student`
    const matchedStudentReports = studentReports.filter(r => r.student_id === sId || r.student_id === sUuid);

    // saved guides
    const studentSaved = savedGuides.filter(g => g.student_id === sUuid || g.student_id === sId);

    console.log(`\nSTUDENT: [${sId}] ${sName} (UUID: ${sUuid})`);
    console.log(`  Email: ${s.email}`);
    console.log(`  Saved Guides in DB: ${studentSaved.length}`);
    console.log(`  Reports in 'reports': ${matchedReports.length} -> [${matchedReports.map(r => `${r.report_id}:${r.status}`).join(', ')}]`);
    console.log(`  Reports in 'reports_of_student': ${matchedStudentReports.length} -> [${matchedStudentReports.map(r => `${r.report_id}:${r.status}`).join(', ')}]`);
  }
}

checkEveryStudent();
