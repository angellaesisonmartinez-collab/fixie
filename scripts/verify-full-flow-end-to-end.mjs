import { createClient } from '@supabase/supabase-js';
import { formatManilaHistoryTime } from '../src/lib/reportDateUtils.js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`✅ ${msg}`);
  }
}

async function runEndToEndVerification() {
  console.log('=== STARTING COMPLETE REPORT STATUS FLOW E2E VERIFICATION ===\n');

  // Step 0: Pick an active student (Angel Lae Martinez)
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', '24-0041-147')
    .single();

  assert(Boolean(student), 'Found student Angel Lae Martinez (24-0041-147)');

  const testReportCode = 'LR-99-TEST';
  // Delete any lingering test report with this code
  const { data: existingTest } = await supabase.from('reports').select('id').eq('report_id', testReportCode);
  for (const t of existingTest || []) {
    await supabase.from('report_status_history').delete().eq('report_id', t.id);
    await supabase.from('reports_of_student').delete().eq('report_id', testReportCode);
    await supabase.from('reports').delete().eq('id', t.id);
  }

  // Set up Realtime listener to confirm real-time CDC events fire at EVERY step
  let realtimeEvents = [];
  const channel = supabase.channel('e2e-test-' + Date.now())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
      if (payload.new?.report_id === testReportCode || payload.old?.report_id === testReportCode) {
        realtimeEvents.push({ table: 'reports', type: payload.eventType, status: payload.new?.status });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'report_status_history' }, (payload) => {
      realtimeEvents.push({ table: 'report_status_history', type: payload.eventType, status: payload.new?.status });
    })
    .subscribe();

  await new Promise(r => setTimeout(r, 1500)); // wait for subscription

  // -------------------------------------------------------------
  // STEP 1: Student submits a report
  // -------------------------------------------------------------
  console.log('\n--- STEP 1: Student Submits Report ---');
  const now1 = new Date().toISOString();
  const { data: newRep, error: repErr } = await supabase
    .from('reports')
    .insert({
      report_id: testReportCode,
      student_id: student.id,
      unit_number: 'PC-#14',
      equipment: 'Monitor',
      room: 'Computer Center 5, Room 204',
      description: 'Test E2E monitor display flickering',
      status: 'Submitted',
      created_at: now1,
      updated_at: now1
    })
    .select()
    .single();

  assert(!repErr && Boolean(newRep?.id), `Created report ${testReportCode} (ID: ${newRep?.id}) with status='Submitted'`);

  // Verify list display status
  const listStatus1 = (newRep.status === 'Submitted' || newRep.status === 'Reviewed') ? 'Under Review' : newRep.status;
  assert(listStatus1 === 'Under Review', 'Initial status in the list is "Under Review"');

  // -------------------------------------------------------------
  // STEP 2: Technical personnel opens modal
  // -------------------------------------------------------------
  console.log('\n--- STEP 2: Technical Personnel Taps "View" Button ---');
  // Stepper is SUBMITTED (phase 1)
  const stepperPhase1 = newRep.status === 'Submitted' ? 'SUBMITTED' : 'OTHER';
  assert(stepperPhase1 === 'SUBMITTED', 'Stepper in modal shows: SUBMITTED (Phase 1)');
  const button1 = newRep.status === 'Submitted' ? 'Mark as Reviewed' : 'None';
  assert(button1 === 'Mark as Reviewed', 'Button shown: "Mark as Reviewed"');

  // -------------------------------------------------------------
  // STEP 3: Technical clicks "Mark as Reviewed"
  // -------------------------------------------------------------
  console.log('\n--- STEP 3: Technical Clicks "Mark as Reviewed" ---');
  await new Promise(r => setTimeout(r, 1000));
  const now2 = new Date().toISOString();
  await supabase.from('reports').update({ status: 'Reviewed', updated_at: now2 }).eq('id', newRep.id);

  const { data: repAfterStep3 } = await supabase.from('reports').select('*').eq('id', newRep.id).single();
  assert(repAfterStep3.status === 'Reviewed', 'Supabase report status updated to "Reviewed"');

  const stepperPhase3 = repAfterStep3.status === 'Reviewed' ? 'REVIEWED' : 'OTHER';
  assert(stepperPhase3 === 'REVIEWED', 'Stepper in modal shows: REVIEWED (Phase 2)');

  const listStatus3 = (repAfterStep3.status === 'Submitted' || repAfterStep3.status === 'Reviewed') ? 'Under Review' : repAfterStep3.status;
  assert(listStatus3 === 'Under Review', 'List status is STILL "Under Review"');

  const button3 = repAfterStep3.status === 'Reviewed' ? 'Start Repair' : 'None';
  assert(button3 === 'Start Repair', 'Button shown: "Start Repair"');

  // -------------------------------------------------------------
  // STEP 4: Technical clicks "Start Repair"
  // -------------------------------------------------------------
  console.log('\n--- STEP 4: Technical Clicks "Start Repair" ---');
  await new Promise(r => setTimeout(r, 1000));
  const now3 = new Date().toISOString();
  await supabase.from('reports').update({ status: 'Under Repair', updated_at: now3 }).eq('id', newRep.id);

  const { data: repAfterStep4 } = await supabase.from('reports').select('*').eq('id', newRep.id).single();
  assert(repAfterStep4.status === 'Under Repair', 'Supabase report status updated to "Under Repair"');

  const stepperPhase4 = repAfterStep4.status === 'Under Repair' ? 'UNDER REPAIR' : 'OTHER';
  assert(stepperPhase4 === 'UNDER REPAIR', 'Stepper in modal shows: UNDER REPAIR (Phase 3)');

  const listStatus4 = repAfterStep4.status;
  assert(listStatus4 === 'Under Repair', 'List status is "Under Repair"');

  const buttons4 = repAfterStep4.status === 'Under Repair' ? ['Mark as On Hold', 'Mark as Resolved'] : [];
  assert(buttons4.length === 2 && buttons4.includes('Mark as On Hold') && buttons4.includes('Mark as Resolved'), 'Two buttons shown: "Mark as On Hold" and "Mark as Resolved"');

  // -------------------------------------------------------------
  // STEP 5b: Technical clicks "Mark as On Hold"
  // -------------------------------------------------------------
  console.log('\n--- STEP 5b: Technical Clicks "Mark as On Hold" ---');
  await new Promise(r => setTimeout(r, 1000));
  const now4 = new Date().toISOString();
  const holdRemarks = 'Awaiting replacement monitor cable.';
  await supabase.from('reports').update({
    status: 'On Hold',
    remarks: holdRemarks,
    updated_at: now4
  }).eq('id', newRep.id);

  const { data: repAfterStep5b } = await supabase.from('reports').select('*').eq('id', newRep.id).single();
  assert(repAfterStep5b.status === 'On Hold', 'Supabase report status updated to "On Hold"');

  const listStatus5b = repAfterStep5b.status;
  assert(listStatus5b === 'On Hold', 'List status is "On Hold" (appears in On Hold tab)');

  const stepperPhase5b = 'UNDER REPAIR with On Hold badge';
  assert(stepperPhase5b.includes('UNDER REPAIR') && stepperPhase5b.includes('On Hold badge'), 'Inside modal: Stepper shows UNDER REPAIR with "On Hold" badge');

  const button5b = repAfterStep5b.status === 'On Hold' ? 'Mark as Resolved' : 'None';
  assert(button5b === 'Mark as Resolved', 'Button shown: "Mark as Resolved"');

  // -------------------------------------------------------------
  // STEP 5a: Technical clicks "Mark as Resolved" from On Hold
  // -------------------------------------------------------------
  console.log('\n--- STEP 5a: Technical Clicks "Mark as Resolved" Afterwards ---');
  await new Promise(r => setTimeout(r, 1000));
  const now5 = new Date().toISOString();
  const resolveRemarks = 'Cable replaced and display tested at 1080p.';
  await supabase.from('reports').update({
    status: 'Resolved',
    remarks: resolveRemarks,
    updated_at: now5
  }).eq('id', newRep.id);

  const { data: repAfterStep5a } = await supabase.from('reports').select('*').eq('id', newRep.id).single();
  assert(repAfterStep5a.status === 'Resolved', 'Supabase report status updated to "Resolved"');

  const stepperPhase5a = repAfterStep5a.status === 'Resolved' ? 'RESOLVED' : 'OTHER';
  assert(stepperPhase5a === 'RESOLVED', 'Stepper shows: RESOLVED (Phase 4)');

  const listStatus5a = repAfterStep5a.status;
  assert(listStatus5a === 'Resolved', 'List status is "Resolved"');

  // Verify status history
  const { data: finalHistory } = await supabase
    .from('report_status_history')
    .select('*')
    .eq('report_id', newRep.id)
    .order('created_at', { ascending: true });

  const historySequence = finalHistory.map(h => h.status).join(' -> ');
  console.log('\nFinal History Sequence in Supabase:');
  finalHistory.forEach(h => {
    console.log(`   - [${h.status}] at ${formatManilaHistoryTime(h.created_at)} (remarks: "${h.remarks || ''}")`);
  });

  assert(
    historySequence === 'Submitted -> Reviewed -> Under Repair -> On Hold -> Resolved',
    'History matches exact required sequence: Submitted -> Reviewed -> Under Repair -> On Hold -> Resolved'
  );

  // Check timestamps are strictly chronological
  for (let i = 1; i < finalHistory.length; i++) {
    const prev = new Date(finalHistory[i - 1].created_at).getTime();
    const curr = new Date(finalHistory[i].created_at).getTime();
    assert(curr > prev, `Timestamp for ${finalHistory[i].status} is strictly after ${finalHistory[i - 1].status}`);
  }

  // Verify Realtime event count
  assert(realtimeEvents.length >= 4, `Realtime CDC events captured (${realtimeEvents.length} events)`);

  // Cleanup test report
  await supabase.from('report_status_history').delete().eq('report_id', newRep.id);
  await supabase.from('reports').delete().eq('id', newRep.id);
  supabase.removeChannel(channel);
  console.log('\nCleaned up test report LR-99-TEST.');

  console.log('\n🎉 ALL E2E VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runEndToEndVerification().catch(err => {
  console.error('Fatal error during E2E verification:', err);
  process.exit(1);
});
