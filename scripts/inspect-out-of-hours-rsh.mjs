import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: reports } = await supabase.from('reports').select('id, report_id');
  const repMap = {};
  reports.forEach(r => repMap[r.id] = r.report_id);

  const { data: history } = await supabase.from('report_status_history').select('*').order('created_at', { ascending: true });
  
  const byRep = {};
  for (const h of history) {
    const code = repMap[h.report_id] || h.report_id;
    if (!byRep[code]) byRep[code] = [];
    const d = new Date(h.created_at);
    const manilaTimeStr = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
    const manilaDateStr = d.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
    const hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }).format(d), 10);
    const isOut = hour < 7 || hour >= 21;
    byRep[code].push({ id: h.id, status: h.status, created_at: h.created_at, manila: `${manilaDateStr}, ${manilaTimeStr}`, isOut, hour });
  }

  let totalOut = 0;
  for (const [code, rows] of Object.entries(byRep)) {
    const outRows = rows.filter(r => r.isOut);
    if (outRows.length > 0) {
      totalOut += outRows.length;
      console.log(`\n=== ${code} ===`);
      rows.forEach(r => console.log(`  ${r.isOut ? '❌' : '✅'} [${r.status}] ${r.manila} (${r.created_at})`));
    }
  }
  console.log(`\nTotal out-of-hours records: ${totalOut}`);
}

run().catch(console.error);
