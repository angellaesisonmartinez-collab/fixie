import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function planHistoryBackfill() {
  const { data: reports, error: errRep } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: true });

  const { data: allHistory, error: errHist } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: true });

  if (errRep || errHist) {
    console.error('Error:', errRep || errHist);
    return;
  }

  console.log(`Analyzing ${reports.length} reports and ${allHistory.length} existing history rows...\n`);

  const reportPlans = [];

  for (const r of reports) {
    const existing = allHistory.filter(h => h.report_id === r.id);
    const existingStatuses = existing.map(h => h.status);
    const hadOnHold = existing.some(h => h.status === 'On Hold') || r.has_been_on_hold;

    // Determine target chain
    let targetSteps = [];
    if (r.status === 'Submitted') {
      targetSteps = ['Submitted'];
    } else if (r.status === 'Reviewed' || r.status === 'Under Review') {
      targetSteps = ['Submitted', 'Reviewed'];
    } else if (r.status === 'Under Repair') {
      targetSteps = ['Submitted', 'Reviewed', 'Under Repair'];
    } else if (r.status === 'On Hold') {
      targetSteps = ['Submitted', 'Reviewed', 'Under Repair', 'On Hold'];
    } else if (r.status === 'Resolved') {
      if (hadOnHold) {
        targetSteps = ['Submitted', 'Reviewed', 'Under Repair', 'On Hold', 'Resolved'];
      } else {
        targetSteps = ['Submitted', 'Reviewed', 'Under Repair', 'Resolved'];
      }
    }

    const missingSteps = targetSteps.filter(s => !existingStatuses.includes(s));
    const extraDuplicateSteps = [];
    const seen = new Set();
    for (const h of existing) {
      if (seen.has(h.status) || !targetSteps.includes(h.status)) {
        extraDuplicateSteps.push(h);
      } else {
        seen.add(h.status);
      }
    }

    reportPlans.push({
      id: r.id,
      code: r.report_id,
      status: r.status,
      remarks: r.remarks,
      created_at: r.created_at,
      updated_at: r.updated_at,
      existingCount: existing.length,
      existingStatuses: existing.map(h => `${h.status}(${h.created_at.slice(11, 19)})`).join(' -> '),
      targetSteps: targetSteps.join(' -> '),
      missingSteps,
      duplicateCount: extraDuplicateSteps.length,
      needsFix: missingSteps.length > 0 || extraDuplicateSteps.length > 0 || existing.length !== targetSteps.length
    });
  }

  console.log('=== REPORTS SUMMARY & BACKFILL PLAN ===');
  let fixCount = 0;
  for (const p of reportPlans) {
    if (p.needsFix) {
      fixCount++;
      console.log(`[FIX NEEDED] ${p.code} (${p.status}):`);
      console.log(`   Current: ${p.existingStatuses}`);
      console.log(`   Target:  ${p.targetSteps}`);
      if (p.missingSteps.length) console.log(`   Missing: ${p.missingSteps.join(', ')}`);
      if (p.duplicateCount) console.log(`   Extra/duplicate entries: ${p.duplicateCount}`);
    } else {
      console.log(`[OK] ${p.code} (${p.status}): ${p.targetSteps}`);
    }
  }
  console.log(`\nTotal reports requiring history backfill/cleanup: ${fixCount} of ${reports.length}`);
}

planHistoryBackfill();
