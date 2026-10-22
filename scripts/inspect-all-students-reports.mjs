import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAll() {
  console.log('=== 1. STUDENTS ===');
  const { data: students, error: sErr } = await supabase.from('students').select('*');
  if (sErr) console.error('Students error:', sErr);
  else {
    console.log(`Total students: ${students.length}`);
    students.forEach(s => {
      console.log(`Student: [${s.student_id}] ${s.name || (s.first_name + ' ' + s.last_name)} | UUID: ${s.id || s.uuid} | email: ${s.email}`);
    });
  }

  console.log('\n=== 2. ALL REPORTS IN `reports` ===');
  const { data: reports, error: rErr } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (rErr) console.error('Reports error:', rErr);
  else {
    console.log(`Total reports: ${reports.length}`);
    reports.forEach(r => {
      console.log(`Report: ${r.report_id} | status: ${r.status} | student_id: ${r.student_id} | student_name: ${r.student_name} | student_uuid: ${r.student_uuid || r.user_id}`);
    });
  }

  console.log('\n=== 3. ALL REPORTS IN `reports_of_student` ===');
  const { data: sReports, error: srErr } = await supabase.from('reports_of_student').select('*').order('created_at', { ascending: false });
  if (srErr) console.log('reports_of_student error:', srErr.message);
  else {
    console.log(`Total reports_of_student: ${sReports.length}`);
    sReports.forEach(r => {
      console.log(`StudentReport: ${r.report_id} | status: ${r.status} | student_id: ${r.student_id} | student_name: ${r.student_name}`);
    });
  }

  // Check saved guides or guide views
  console.log('\n=== 4. SAVED GUIDES / GUIDES ===');
  const { data: guides, error: gErr } = await supabase.from('guides').select('id, title, is_saved').limit(5);
  if (gErr) console.log('guides error:', gErr.message);
  else console.log('guides sample:', guides);

  const { data: savedGuides, error: sgErr } = await supabase.from('saved_guides').select('*');
  if (sgErr) console.log('saved_guides table error:', sgErr.message);
  else console.log('saved_guides rows:', savedGuides?.length);

  const { data: userSavedGuides, error: usgErr } = await supabase.from('student_saved_guides').select('*');
  if (usgErr) console.log('student_saved_guides table error:', usgErr.message);
  else console.log('student_saved_guides rows:', userSavedGuides?.length);

  // Check possible student specific tables
  for (const s of (students || [])) {
    const safeName = (s.name || `${s.first_name}_${s.last_name}`).toLowerCase().replace(/[^a-z0-9]/g, '_') + '_reports';
    const { data: tData, error: tErr } = await supabase.from(safeName).select('*').limit(1);
    if (!tErr) {
      console.log(`Found table: ${safeName} with data!`);
    }
  }
}

inspectAll();
