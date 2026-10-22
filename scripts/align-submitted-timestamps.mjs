import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function alignSubmittedTimestamps() {
  console.log('=== Checking all reports for authentic Submitted timestamps ===');
  const { data: reports } = await supabase.from('reports').select('id, report_id, created_at, status');
  const { data: history } = await supabase.from('report_status_history').select('*').order('created_at', { ascending: true });

  const historyByRep = {};
  history.forEach(h => {
    if (!historyByRep[h.report_id]) historyByRep[h.report_id] = [];
    historyByRep[h.report_id].push(h);
  });

  for (const r of reports) {
    const hist = historyByRep[r.id] || [];
    const sub = hist.find(h => h.status === 'Submitted');
    if (sub) {
      // The submitted entry should have created_at equal to or earlier than the report creation or earliest status
      const repCreatedTime = new Date(r.created_at).getTime();
      const subTime = new Date(sub.created_at).getTime();

      // Check if any other status in history is earlier than Submitted
      const earlierOther = hist.find(h => h.status !== 'Submitted' && new Date(h.created_at).getTime() < subTime);
      if (earlierOther || subTime > repCreatedTime + 1000) {
        console.log(`Fixing Submitted time for ${r.report_id}: subTime (${sub.created_at}) > repCreated (${r.created_at}) or earlier status found`);
        const authenticTime = r.created_at;
        await supabase
          .from('report_status_history')
          .update({ created_at: authenticTime })
          .eq('id', sub.id);
        
        // If there were test rows dated before authentic creation, remove them
        if (earlierOther && new Date(earlierOther.created_at).getTime() < new Date(authenticTime).getTime()) {
          console.log(`Removing pre-submission test row ${earlierOther.status} (${earlierOther.created_at}) for ${r.report_id}`);
          await supabase.from('report_status_history').delete().eq('id', earlierOther.id);
        }
      }
    }
  }

  console.log('Timestamp alignment complete!');
}

alignSubmittedTimestamps().catch(console.error);
