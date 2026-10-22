import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillHistory() {
  console.log('=== Step 1: Backup current report_status_history ===');
  const { data: allReports, error: errRep } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: true });

  const { data: allHistory, error: errHist } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: true });

  const { data: allRos } = await supabase
    .from('reports_of_student')
    .select('*');

  if (errRep || errHist) {
    console.error('Fetch error:', errRep || errHist);
    return;
  }

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(
    path.join(backupDir, `rsh_backup_${Date.now()}.json`),
    JSON.stringify(allHistory, null, 2)
  );
  console.log(`Backed up ${allHistory.length} history records.\n`);

  const estimatedReports = [];

  for (const r of allReports) {
    const existing = allHistory.filter(h => h.report_id === r.id);
    const existingSubmitted = existing.find(h => h.status === 'Submitted');
    const existingReviewed = existing.find(h => h.status === 'Reviewed');
    const existingUnderRepair = existing.find(h => h.status === 'Under Repair');
    const existingOnHold = existing.find(h => h.status === 'On Hold');
    const existingResolved = existing.find(h => h.status === 'Resolved');

    const hadOnHold = Boolean(existingOnHold || r.has_been_on_hold);

    // Target sequence
    let targetStatuses = [];
    if (r.status === 'Submitted') {
      targetStatuses = ['Submitted'];
    } else if (r.status === 'Reviewed' || r.status === 'Under Review') {
      targetStatuses = ['Submitted', 'Reviewed'];
    } else if (r.status === 'Under Repair') {
      targetStatuses = ['Submitted', 'Reviewed', 'Under Repair'];
    } else if (r.status === 'On Hold') {
      targetStatuses = ['Submitted', 'Reviewed', 'Under Repair', 'On Hold'];
    } else if (r.status === 'Resolved') {
      if (hadOnHold) {
        targetStatuses = ['Submitted', 'Reviewed', 'Under Repair', 'On Hold', 'Resolved'];
      } else {
        targetStatuses = ['Submitted', 'Reviewed', 'Under Repair', 'Resolved'];
      }
    }

    // Determine timestamps for each target status
    const stepEntries = [];
    const estimatedStepsForReport = [];

    // 1. Submitted
    const subIso = existingSubmitted?.created_at || r.created_at || new Date().toISOString();
    stepEntries.push({
      status: 'Submitted',
      created_at: subIso,
      remarks: existingSubmitted?.remarks || null,
      isEstimated: !existingSubmitted
    });

    const subTimeMs = new Date(subIso).getTime();

    // 2. Final step timestamp
    let finalIso = null;
    let finalRemarks = r.remarks || null;
    if (r.status === 'Resolved') {
      finalIso = existingResolved?.created_at || r.updated_at || new Date(subTimeMs + 45 * 60 * 1000).toISOString();
      finalRemarks = existingResolved?.remarks || r.remarks || null;
    } else if (r.status === 'On Hold') {
      finalIso = existingOnHold?.created_at || r.updated_at || new Date(subTimeMs + 30 * 60 * 1000).toISOString();
      finalRemarks = existingOnHold?.remarks || r.remarks || null;
    } else if (r.status === 'Under Repair') {
      finalIso = existingUnderRepair?.created_at || r.updated_at || new Date(subTimeMs + 20 * 60 * 1000).toISOString();
      finalRemarks = existingUnderRepair?.remarks || r.remarks || null;
    } else if (r.status === 'Reviewed' || r.status === 'Under Review') {
      finalIso = existingReviewed?.created_at || r.updated_at || new Date(subTimeMs + 10 * 60 * 1000).toISOString();
      finalRemarks = existingReviewed?.remarks || null;
    }

    const finalTimeMs = finalIso ? new Date(finalIso).getTime() : subTimeMs + 60 * 60 * 1000;
    const totalSpanMs = Math.max(finalTimeMs - subTimeMs, 30 * 60 * 1000); // at least 30 minutes span

    // 3. Middle steps
    if (targetStatuses.includes('Reviewed')) {
      if (existingReviewed) {
        stepEntries.push({
          status: 'Reviewed',
          created_at: existingReviewed.created_at,
          remarks: existingReviewed.remarks || null,
          isEstimated: false
        });
      } else {
        // Estimate Reviewed timestamp
        const revMs = subTimeMs + Math.floor(totalSpanMs * 0.25);
        const revIso = new Date(revMs).toISOString();
        stepEntries.push({
          status: 'Reviewed',
          created_at: revIso,
          remarks: null,
          isEstimated: true
        });
        estimatedStepsForReport.push('Reviewed');
      }
    }

    if (targetStatuses.includes('Under Repair')) {
      if (existingUnderRepair) {
        stepEntries.push({
          status: 'Under Repair',
          created_at: existingUnderRepair.created_at,
          remarks: existingUnderRepair.remarks || null,
          isEstimated: false
        });
      } else {
        // Estimate Under Repair timestamp
        const repairMs = subTimeMs + Math.floor(totalSpanMs * 0.55);
        const repairIso = new Date(repairMs).toISOString();
        stepEntries.push({
          status: 'Under Repair',
          created_at: repairIso,
          remarks: null,
          isEstimated: true
        });
        estimatedStepsForReport.push('Under Repair');
      }
    }

    if (targetStatuses.includes('On Hold')) {
      if (existingOnHold) {
        stepEntries.push({
          status: 'On Hold',
          created_at: existingOnHold.created_at,
          remarks: existingOnHold.remarks || r.remarks || 'Awaiting replacement parts.',
          isEstimated: false
        });
      } else {
        const holdMs = subTimeMs + Math.floor(totalSpanMs * 0.75);
        const holdIso = new Date(holdMs).toISOString();
        stepEntries.push({
          status: 'On Hold',
          created_at: holdIso,
          remarks: r.remarks || 'Awaiting replacement parts.',
          isEstimated: true
        });
        estimatedStepsForReport.push('On Hold');
      }
    }

    if (targetStatuses.includes('Resolved')) {
      stepEntries.push({
        status: 'Resolved',
        created_at: finalIso,
        remarks: finalRemarks,
        isEstimated: !existingResolved
      });
      if (!existingResolved) estimatedStepsForReport.push('Resolved');
    }

    // Sort strictly chronological
    stepEntries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Ensure monotonically increasing timestamps (each step at least 2 minutes after preceding)
    for (let i = 1; i < stepEntries.length; i++) {
      const prevMs = new Date(stepEntries[i - 1].created_at).getTime();
      const curMs = new Date(stepEntries[i].created_at).getTime();
      if (curMs <= prevMs) {
        const adjustedMs = prevMs + 120 * 1000;
        stepEntries[i].created_at = new Date(adjustedMs).toISOString();
      }
    }

    if (estimatedStepsForReport.length > 0) {
      estimatedReports.push({
        report_id: r.report_id,
        id: r.id,
        status: r.status,
        estimatedSteps: estimatedStepsForReport
      });
    }

    // Now delete old history for this report and insert clean target history
    const { error: delErr } = await supabase
      .from('report_status_history')
      .delete()
      .eq('report_id', r.id);

    if (delErr) {
      console.error(`Error deleting history for ${r.report_id}:`, delErr);
      continue;
    }

    const rowsToInsert = stepEntries.map(s => ({
      report_id: r.id,
      status: s.status,
      remarks: s.remarks,
      created_at: s.created_at
    }));

    const { error: insErr } = await supabase
      .from('report_status_history')
      .insert(rowsToInsert);

    if (insErr) {
      console.error(`Error inserting history for ${r.report_id}:`, insErr);
      continue;
    }

    // Also synchronize reports_of_student history JSONB array
    const rosMatch = allRos?.find(ros => ros.report_id === r.report_id || ros.id === r.id);
    if (rosMatch) {
      const rosHistory = stepEntries.map(s => ({
        action: s.status,
        status: s.status,
        time: s.created_at,
        remarksText: s.remarks || undefined
      }));

      await supabase
        .from('reports_of_student')
        .update({
          history: rosHistory,
          status: r.status,
          remarks: r.remarks,
          updated_at: r.updated_at || new Date().toISOString()
        })
        .eq('id', rosMatch.id);
    }

    console.log(`Updated ${r.report_id} (${r.status}): ${stepEntries.map(s => s.status).join(' -> ')}`);
  }

  console.log('\n=== Backfill Complete! ===');
  console.log(`Total reports backfilled: ${allReports.length}`);
  console.log(`Reports with estimated step timestamps (${estimatedReports.length}):`);
  estimatedReports.forEach(e => {
    console.log(`  - ${e.report_id} (${e.status}): estimated [${e.estimatedSteps.join(', ')}]`);
  });
}

backfillHistory();
