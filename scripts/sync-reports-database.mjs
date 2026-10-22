import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncReports() {
  console.log('--- Synchronizing reports between reports_of_student and reports ---');

  // 1. Fetch Angel Lae Martinez UUID
  const { data: angel, error: angelErr } = await supabase
    .from('students')
    .select('id, student_id, name')
    .eq('student_id', '24-0041-147')
    .single();

  if (angelErr || !angel) {
    console.error('Angel not found:', angelErr);
    process.exit(1);
  }
  console.log('Found Angel:', angel);

  // 2. Fetch Maria Ortiz UUID (for LR-24 so Angel has exactly 18 reports)
  const { data: mariaOrtiz } = await supabase
    .from('students')
    .select('id, student_id, name')
    .eq('student_id', '24-0872-090')
    .single();

  // 3. Fetch all 18 reports from reports_of_student
  const { data: studentReports, error: rosErr } = await supabase
    .from('reports_of_student')
    .select('*')
    .order('report_id');

  if (rosErr) {
    console.error('Error fetching reports_of_student:', rosErr);
    process.exit(1);
  }
  console.log(`Found ${studentReports.length} student reports in reports_of_student.`);

  // 4. Update reports table in Supabase for LR-01 to LR-18
  for (const sr of studentReports) {
    // Map status for reports table check constraint ('Submitted', 'Reviewed', 'Under Repair', 'Resolved', 'On Hold')
    let repStatus = sr.status;
    if (repStatus === 'Under Review') {
      repStatus = 'Reviewed';
    }

    const updatePayload = {
      student_id: angel.id,
      equipment: sr.equipment,
      unit_number: sr.unit_number,
      room: sr.computer_center ? `${sr.computer_center}, ${sr.room}` : sr.room,
      description: sr.description,
      status: repStatus,
      remarks: sr.remarks,
      updated_at: new Date().toISOString(),
    };

    const { error: repUpdateErr } = await supabase
      .from('reports')
      .update(updatePayload)
      .eq('report_id', sr.report_id);

    if (repUpdateErr) {
      console.error(`Failed to update ${sr.report_id} in reports table:`, repUpdateErr.message);
    } else {
      console.log(`Synced ${sr.report_id}: status='${sr.status}', student=Angel Lae Martinez`);
    }
  }

  // 5. Update LR-24 to Maria Ortiz if it was assigned to Angel
  if (mariaOrtiz) {
    const { error: lr24Err } = await supabase
      .from('reports')
      .update({
        student_id: mariaOrtiz.id,
        updated_at: new Date().toISOString(),
      })
      .eq('report_id', 'LR-24');

    if (lr24Err) console.warn('LR-24 update note:', lr24Err.message);
    else console.log('LR-24 re-assigned to Maria Ortiz to maintain Angel’s exact 18 reports count.');
  }

  // 6. Verification
  console.log('\n--- Verifying Angel reports in `reports` table ---');
  const { data: angelReportsInReports } = await supabase
    .from('reports')
    .select('report_id, student_id, equipment, status, students(name, student_id)')
    .eq('student_id', angel.id)
    .order('report_id');

  console.log(`Angel reports count in \`reports\`: ${angelReportsInReports?.length}`);
  console.table(angelReportsInReports?.map(r => ({
    report_id: r.report_id,
    student: r.students?.name,
    student_id: r.students?.student_id,
    equipment: r.equipment,
    status: r.status,
  })));

  console.log('\n--- Verifying Angel reports in `reports_of_student` table ---');
  const { data: angelReportsInRos } = await supabase
    .from('reports_of_student')
    .select('report_id, student_id, student_name, equipment, status')
    .eq('student_id', '24-0041-147')
    .order('report_id');

  console.log(`Angel reports count in \`reports_of_student\`: ${angelReportsInRos?.length}`);
}

syncReports();
