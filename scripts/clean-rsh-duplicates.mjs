import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDuplicates() {
  console.log('=== Inspecting & Cleaning Duplicates in report_status_history ===');
  const { data: allHistory, error } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  console.log(`Total history records before cleaning: ${allHistory.length}`);

  // Group by report_id
  const byReport = {};
  allHistory.forEach(h => {
    if (!byReport[h.report_id]) byReport[h.report_id] = [];
    byReport[h.report_id].push(h);
  });

  const idsToDelete = [];

  for (const [reportId, rows] of Object.entries(byReport)) {
    // For each report:
    // 1. Keep earliest 'Submitted' entry
    // 2. Remove identical consecutive statuses or test artifacts where status was toggled repeatedly in seconds
    const seenStatuses = new Set();
    const kept = [];

    // First check if this report is LR-24 which had test spam
    for (let i = 0; i < rows.length; i++) {
      const cur = rows[i];
      const prev = kept[kept.length - 1];

      // If duplicate status within 5 seconds of previous, it's a double-click/double-insert
      if (prev && prev.status === cur.status && Math.abs(new Date(cur.created_at) - new Date(prev.created_at)) < 5000) {
        idsToDelete.push(cur.id);
        continue;
      }

      // If status is 'Submitted' and we already have a Submitted entry, delete the later duplicate Submitted
      if (cur.status === 'Submitted' && seenStatuses.has('Submitted')) {
        idsToDelete.push(cur.id);
        continue;
      }

      seenStatuses.add(cur.status);
      kept.push(cur);
    }
  }

  console.log(`Found ${idsToDelete.length} duplicate/redundant entries to delete.`);
  if (idsToDelete.length > 0) {
    // delete in batches of 20
    for (let i = 0; i < idsToDelete.length; i += 20) {
      const batch = idsToDelete.slice(i, i + 20);
      const { error: delErr } = await supabase
        .from('report_status_history')
        .delete()
        .in('id', batch);
      if (delErr) {
        console.error('Delete error:', delErr);
      }
    }
    console.log('Deleted duplicate entries.');
  }

  // Also check LR-24 specifically
  const { data: lr24Rep } = await supabase.from('reports').select('id, status').eq('report_id', 'LR-24').single();
  if (lr24Rep) {
    const { data: lr24Hist } = await supabase
      .from('report_status_history')
      .select('*')
      .eq('report_id', lr24Rep.id)
      .order('created_at', { ascending: true });
    console.log(`LR-24 history count: ${lr24Hist.length}`);
    if (lr24Hist.length > 5) {
      // LR-24 has 30+ test loop artifacts!
      // Keep only authentic progression:
      // Submitted (earliest)
      // If status is Submitted, keep only the authentic Submitted entry!
      const sub = lr24Hist.find(h => h.status === 'Submitted');
      const toRemove = lr24Hist.filter(h => h.id !== sub?.id).map(h => h.id);
      await supabase.from('report_status_history').delete().in('id', toRemove);
      console.log(`Cleaned ${toRemove.length} test loop records from LR-24, left authentic Submitted entry.`);
    }
  }

  // Also check LR-22
  const { data: lr22Rep } = await supabase.from('reports').select('id, status').eq('report_id', 'LR-22').single();
  if (lr22Rep) {
    const { data: lr22Hist } = await supabase
      .from('report_status_history')
      .select('*')
      .eq('report_id', lr22Rep.id)
      .order('created_at', { ascending: true });
    console.log(`LR-22 history count: ${lr22Hist.length}`);
    // If it has spam from earlier test script
    if (lr22Hist.length > 5) {
      const sub = lr22Hist.find(h => h.status === 'Submitted') || {
        report_id: lr22Rep.id,
        status: 'Submitted',
        created_at: '2026-10-17T16:40:22.485462+00:00'
      };
      const repair = lr22Hist.find(h => h.status === 'Under Repair');
      // keep only authentic entries
      const keepIds = new Set([sub.id, repair?.id].filter(Boolean));
      const toRemove = lr22Hist.filter(h => !keepIds.has(h.id)).map(h => h.id);
      await supabase.from('report_status_history').delete().in('id', toRemove);
      console.log(`Cleaned ${toRemove.length} test records from LR-22.`);
    }
  }

  const { data: finalHistory } = await supabase.from('report_status_history').select('*');
  console.log(`Total clean history records remaining: ${finalHistory.length}`);
}

cleanDuplicates().catch(console.error);
