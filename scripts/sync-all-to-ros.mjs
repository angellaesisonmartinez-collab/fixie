import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ieznsbzddanjwmnpvncs.supabase.co',
  'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr'
);

async function syncReportsOfStudent() {
  const { data: reports, error: rErr } = await supabase
    .from('reports')
    .select('*, students(*)')
    .in('report_id', ['LR-19', 'LR-20', 'LR-21', 'LR-22', 'LR-23', 'LR-24']);

  if (rErr || !reports) {
    console.error('Error fetching reports:', rErr);
    return;
  }

  for (const r of reports) {
    const st = r.students || {};
    const parts = (r.room || '').split(',');
    const center = parts[0]?.trim() || 'Computer Center';
    const room = parts[1]?.trim() || parts[0]?.trim() || 'Room';

    const payload = {
      report_id: r.report_id,
      student_id: st.student_id || r.student_id,
      student_name: st.name || `${st.first_name || ''} ${st.last_name || ''}`.trim(),
      year_block: st.year_block || 'N/A',
      unit_number: r.unit_number,
      equipment: r.equipment,
      computer_center: center,
      room: room,
      date_submitted: r.created_at,
      date_time: new Date(r.created_at).toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      status: r.status,
      description: r.description,
      remarks: r.remarks,
      history: [{ action: 'Submitted', time: new Date(r.created_at).toISOString() }],
      created_at: r.created_at,
      updated_at: r.updated_at,
    };

    const { data, error } = await supabase
      .from('reports_of_student')
      .upsert(payload, { onConflict: 'report_id' });

    if (error) {
      console.error(`Error syncing ${r.report_id}:`, error.message);
    } else {
      console.log(`Successfully synced ${r.report_id} into reports_of_student!`);
    }
  }

  // Also check LR-12 in reports vs reports_of_student
  const { data: ros12 } = await supabase.from('reports_of_student').select('report_id, status').eq('report_id', 'LR-12').single();
  const { data: rep12 } = await supabase.from('reports').select('report_id, status').eq('report_id', 'LR-12').single();
  console.log('LR-12 in reports_of_student:', ros12);
  console.log('LR-12 in reports:', rep12);
}

syncReportsOfStudent();
