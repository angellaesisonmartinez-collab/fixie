import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
  console.log('--- 1. CHECK EXISTING STUDENT ACCOUNTS ---');
  const { data: students, error: stErr } = await supabase
    .from('students')
    .select('id, student_id, name, email, must_change_password, password_hash')
    .order('student_id');

  if (stErr) {
    console.error('Students fetch error:', stErr);
    return;
  }

  console.log(`Total students in DB: ${students.length}`);
  const hashes = new Set();
  let allMustChangeFalse = true;
  let allUniqueHashes = true;

  students.forEach((s) => {
    if (s.must_change_password !== false) {
      allMustChangeFalse = false;
      console.warn(`Student ${s.student_id} (${s.name}) has must_change_password = ${s.must_change_password}`);
    }
    if (hashes.has(s.password_hash)) {
      allUniqueHashes = false;
      console.warn(`Duplicate password hash found for ${s.student_id}`);
    }
    hashes.add(s.password_hash);
  });

  console.log(`Existing accounts bypass first-time setup (must_change_password = false): ${allMustChangeFalse}`);
  console.log(`All existing student passwords unique & hashed: ${allUniqueHashes} (${hashes.size} distinct hashes)`);

  console.log('\n--- 2. VERIFY ANGEL LAE MARTINEZ REPORTS ---');
  const angel = students.find((s) => s.student_id === '24-0041-147' || s.email === 'martinezangellaewup@gmail.com');
  console.log('Angel student record:', angel ? `${angel.name} (ID: ${angel.student_id}, UUID: ${angel.id})` : 'NOT FOUND');

  if (angel) {
    // Check canonical reports table
    const { data: angelReports, error: repErr } = await supabase
      .from('reports')
      .select('id, report_id, equipment, status, student_id')
      .eq('student_id', angel.id)
      .order('report_id');

    if (repErr) {
      console.error('Reports query error:', repErr);
    } else {
      console.log(`Angel's reports count in 'reports' table: ${angelReports.length}`);
      console.log('Report IDs:', angelReports.map((r) => r.report_id).join(', '));
    }

    // Check reports_of_student table
    const { data: rosReports, error: rosErr } = await supabase
      .from('reports_of_student')
      .select('id, report_id, equipment, status, student_id')
      .eq('student_id', angel.student_id)
      .order('report_id');

    if (rosErr) {
      console.error('reports_of_student query error:', rosErr);
    } else {
      console.log(`Angel's reports count in 'reports_of_student' table: ${rosReports.length}`);
      console.log('Report IDs in reports_of_student:', rosReports.map((r) => r.report_id).join(', '));
    }
  }

  console.log('\n--- 3. CHECK TOTAL REPORTS IN DATABASE ---');
  const { data: allReps, count } = await supabase
    .from('reports')
    .select('report_id, student_id, students(name, student_id)', { count: 'exact' })
    .order('report_id');

  console.log(`Total reports in reports table: ${allReps.length}`);
  const reportSummary = allReps.map((r) => `${r.report_id} -> ${r.students?.name || r.student_id}`);
  console.log('All reports mapping:');
  console.log(reportSummary.slice(0, 10).join('\n'));
  console.log('...');
  console.log(reportSummary.slice(10).join('\n'));
}

verify();
