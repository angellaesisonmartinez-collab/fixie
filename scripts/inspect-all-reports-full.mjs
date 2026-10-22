import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAll() {
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: true });

  const { data: history } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: true });

  const { data: ros } = await supabase
    .from('reports_of_student')
    .select('*')
    .order('created_at', { ascending: true });

  console.log(`=== Total reports: ${reports?.length} ===`);
  console.log(`=== Total history rows: ${history?.length} ===`);
  console.log(`=== Total reports_of_student: ${ros?.length} ===`);

  for (const r of reports || []) {
    const rHist = history?.filter(h => h.report_id === r.id) || [];
    console.log(`\nReport: id=${r.id}, code=${r.report_id}, status="${r.status}", student_id=${r.student_id}`);
    console.log(`  created_at: ${r.created_at}, updated_at: ${r.updated_at}, remarks: "${r.remarks || ''}"`);
    console.log(`  History (${rHist.length}):`);
    rHist.forEach((h, i) => {
      console.log(`    [${i + 1}] status="${h.status}", created_at=${h.created_at}, remarks="${h.remarks || ''}" (id: ${h.id})`);
    });
  }
}

inspectAll();
