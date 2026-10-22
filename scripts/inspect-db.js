import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- INSPECTING SUPABASE ---');
  
  // 1. Check reports table
  const { data: reports, error: rErr } = await supabase
    .from('reports')
    .select('id, report_id, status, equipment, unit_number, created_at')
    .order('created_at', { ascending: false });

  if (rErr) {
    console.error('Error fetching reports:', rErr);
  } else {
    console.log(`Total rows in 'reports': ${reports.length}`);
    const counts = {};
    reports.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1);
    console.log('Status breakdown in reports:', counts);
    console.log('Top 7 reports:');
    reports.slice(0, 7).forEach(r => console.log(`  ${r.report_id} | ${r.status} | ${r.unit_number} | ${r.equipment}`));
  }

  // 2. Check reports_of_student table
  const { data: sReports, error: srErr } = await supabase
    .from('reports_of_student')
    .select('id, report_id, status, equipment, unit_number, created_at')
    .order('created_at', { ascending: false });

  if (srErr) {
    console.log('Error or no reports_of_student:', srErr.message);
  } else {
    console.log(`Total rows in 'reports_of_student': ${sReports.length}`);
    const sCounts = {};
    sReports.forEach(r => sCounts[r.status] = (sCounts[r.status] || 0) + 1);
    console.log('Status breakdown in reports_of_student:', sCounts);
  }
}

inspect();
