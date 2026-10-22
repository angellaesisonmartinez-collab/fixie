import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectReports() {
  const { data: reports, error } = await supabase.from('reports').select('*').order('report_id');
  if (error) {
    console.error('Error fetching reports:', error);
    return;
  }
  console.log(`Found ${reports.length} reports in 'reports' table:`);
  reports.forEach(r => {
    console.log(`[${r.report_id}] equipment: ${r.equipment} | unit: ${r.unit_number} | photo_url: ${r.photo_url} | desc: ${r.description?.slice(0, 40)}...`);
  });

  const { data: rosReports, error: rosErr } = await supabase.from('reports_of_student').select('*').order('report_id');
  if (rosErr) {
    console.log('Error fetching reports_of_student:', rosErr);
  } else {
    console.log(`\nFound ${rosReports.length} reports in 'reports_of_student' table:`);
    rosReports.forEach(r => {
      console.log(`[${r.report_id}] ${r.student_name} (${r.student_id}) | unit: ${r.unit_number} | photo_url: ${r.photo_url || '(none)'}`);
    });
  }
}

inspectReports();
