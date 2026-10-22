import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listReportsSummary() {
  const { data: reports } = await supabase
    .from('reports')
    .select('id, report_id, status, remarks, created_at, updated_at')
    .order('created_at', { ascending: true });

  console.log('Total reports:', reports.length);
  for (const r of reports) {
    const { data: hist } = await supabase
      .from('report_status_history')
      .select('status, created_at, remarks')
      .eq('report_id', r.id)
      .order('created_at', { ascending: true });

    console.log(`${r.report_id} (${r.status}): ${hist.map(h => h.status).join(' -> ')}`);
  }
}

listReportsSummary();
