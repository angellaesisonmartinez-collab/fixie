import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAllDetails() {
  const { data: reports, error: repErr } = await supabase
    .from('reports')
    .select('*, students(*)');

  if (repErr) {
    console.error('Error fetching reports:', repErr);
    return;
  }

  const { data: history, error: histErr } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: true });

  console.log(`\nVerified ${reports.length} reports in shared 'reports' table:`);
  for (const r of reports) {
    const rHist = (history || []).filter(h => h.report_id === r.id);
    const student = r.students;
    const studentLabel = student ? `${student.first_name} ${student.last_name} (${student.student_id})` : `UNLINKED (${r.student_id})`;
    console.log(`- ${r.report_id || r.id}: Status="${r.status}", Student=${studentLabel}, Lab=${r.computer_center || r.room || 'N/A'}, HistoryCount=${rHist.length}, Photo=${Boolean(r.photo_url)}`);
  }
}

verifyAllDetails();
