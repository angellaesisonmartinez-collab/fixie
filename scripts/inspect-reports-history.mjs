import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: reports, error: errRep } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: true });

  if (errRep) {
    console.error('Error fetching reports:', errRep);
    return;
  }

  const { data: history, error: errHist } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: true });

  if (errHist) {
    console.error('Error fetching history:', errHist);
    return;
  }

  console.log(`Total reports: ${reports.length}`);
  console.log(`Total history rows: ${history.length}`);

  for (const r of reports) {
    const rHist = history.filter(h => h.report_id === r.id);
    console.log(`\nReport: id=${r.id}, code=${r.report_id}, status="${r.status}", remarks="${r.remarks || ''}", created_at=${r.created_at}, updated_at=${r.updated_at}`);
    console.log(`  History count: ${rHist.length}`);
    rHist.forEach(h => {
      console.log(`    - [${h.status}] created_at=${h.created_at}, remarks="${h.remarks || ''}" (id: ${h.id})`);
    });
  }
}

inspect();
