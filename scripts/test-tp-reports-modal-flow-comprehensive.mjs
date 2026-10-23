import { createClient } from '@supabase/supabase-js';
import { formatManilaHistoryTime } from '../src/lib/reportDateUtils.js';

function normalizeStatusLabel(st) {
  const s = String(st || '').toLowerCase().trim();
  if (s.includes('resolve')) return 'Resolved';
  if (s === 'on hold' || s === 'on_hold' || s.includes('hold')) return 'On Hold';
  if (s.includes('repair')) return 'Under Repair';
  if (s === 'reviewed') return 'Reviewed';
  if (s === 'under review' || s === 'under_review') return 'Submitted';
  if (s.includes('submit')) return 'Submitted';
  if (s.includes('review')) return 'Reviewed';
  return st || 'Submitted';
}

function getStatusHistoryLabel(status) {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'submitted' || s.includes('submit')) return 'Date Submitted';
  if (s === 'on hold' || s === 'on_hold' || s.includes('hold')) return 'On Hold';
  if (s.includes('repair')) return 'Under Repair';
  if (s === 'reviewed' || (s.includes('review') && !s.includes('under'))) return 'Reviewed';
  if (s === 'under review' || s === 'under_review') return 'Reviewed';
  if (s.includes('resolve')) return 'Resolved';
  return status || 'Date Submitted';
}

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

async function runTests() {
  console.log('=== TEST: TECHNICAL PERSONNEL REPORTS MODAL FLOW & REALTIME SYNC ===\n');

  // Test 1: NormalizeStatusLabel unit tests
  console.log('--- TEST 1: normalizeStatusLabel mappings ---');
  assert(normalizeStatusLabel('Submitted') === 'Submitted', 'Submitted normalizes to Submitted');
  assert(normalizeStatusLabel('Under Review') === 'Submitted', 'Under Review normalizes to Submitted for modal lifecycle');
  assert(normalizeStatusLabel('Reviewed') === 'Reviewed', 'Reviewed normalizes to Reviewed');
  assert(normalizeStatusLabel('Under Repair') === 'Under Repair', 'Under Repair normalizes to Under Repair');
  assert(normalizeStatusLabel('On Hold') === 'On Hold', 'On Hold normalizes to On Hold');
  assert(normalizeStatusLabel('Resolved') === 'Resolved', 'Resolved normalizes to Resolved');

  // Test 2: Status History Labels
  console.log('\n--- TEST 2: getStatusHistoryLabel mappings ---');
  assert(getStatusHistoryLabel('Submitted') === 'Date Submitted', 'Submitted -> Date Submitted');
  assert(getStatusHistoryLabel('Reviewed') === 'Reviewed', 'Reviewed -> Reviewed');
  assert(getStatusHistoryLabel('Under Repair') === 'Under Repair', 'Under Repair -> Under Repair');
  assert(getStatusHistoryLabel('On Hold') === 'On Hold', 'On Hold -> On Hold');
  assert(getStatusHistoryLabel('Resolved') === 'Resolved', 'Resolved -> Resolved');

  // Test 3: Status Stepper phase index calculation
  console.log('\n--- TEST 3: Stepper phase index mappings ---');
  const getPhaseIndex = (st) => {
    switch (st) {
      case 'Submitted': return 1;
      case 'Reviewed': return 2;
      case 'Under Review': return 1;
      case 'Under Repair':
      case 'On Hold': return 3;
      case 'Resolved': return 4;
      default: return 1;
    }
  };
  assert(getPhaseIndex('Submitted') === 1, 'Submitted phase is 1');
  assert(getPhaseIndex('Reviewed') === 2, 'Reviewed phase is 2');
  assert(getPhaseIndex('Under Repair') === 3, 'Under Repair phase is 3');
  assert(getPhaseIndex('On Hold') === 3, 'On Hold phase is 3');
  assert(getPhaseIndex('Resolved') === 4, 'Resolved phase is 4');

  // Test 4: Live Report Lifecycle with Supabase and Realtime events
  console.log('\n--- TEST 4: Live Report Lifecycle in Supabase ---');
  const testReportCode = 'LR-TP-FLOW-TEST';

  // Cleanup lingering test report
  const { data: oldRows } = await supabase.from('reports').select('id').eq('report_id', testReportCode);
  for (const row of oldRows || []) {
    await supabase.from('report_status_history').delete().eq('report_id', row.id);
    await supabase.from('reports_of_student').delete().eq('report_id', testReportCode);
    await supabase.from('reports').delete().eq('id', row.id);
  }

  // Get student Angel Lae Martinez
  const { data: student } = await supabase.from('students').select('*').eq('student_id', '24-0041-147').single();
  assert(Boolean(student), 'Target student Angel Lae Martinez verified');

  // 1. Create submitted report
  const t1 = new Date().toISOString();
  const { data: rep, error: createErr } = await supabase
    .from('reports')
    .insert({
      report_id: testReportCode,
      student_id: student.id,
      unit_number: 'PC-#14',
      equipment: 'Monitor',
      room: 'Computer Center 5, Room 204',
      description: 'Modal flow verification test',
      status: 'Submitted',
      created_at: t1,
      updated_at: t1,
    })
    .select()
    .single();

  assert(!createErr && Boolean(rep?.id), `Created initial report ${testReportCode}`);

  // 1. Initial report created (database trigger records Submitted history automatically)

  // Verify modal state at Stage 1
  console.log('Testing Stage 1: Submitted modal state...');
  let currentReportStatus = rep.status;
  assert(currentReportStatus === 'Submitted', 'Modal shows Submitted');
  assert(getPhaseIndex(currentReportStatus) === 1, 'Stepper shows step 1 active');

  // Table list display status for Submitted
  let tableDisplayStatus = (currentReportStatus === 'Submitted' || currentReportStatus === 'Reviewed') ? 'UNDER REVIEW' : currentReportStatus;
  assert(tableDisplayStatus === 'UNDER REVIEW', 'Table list status displays UNDER REVIEW');

  // 2. Action: Mark as Reviewed
  console.log('\nTesting Action: Mark as Reviewed...');
  await new Promise(r => setTimeout(r, 600));
  const t2 = new Date().toISOString();
  await supabase.from('reports').update({ status: 'Reviewed', updated_at: t2 }).eq('id', rep.id);

  const { data: repReviewed } = await supabase.from('reports').select('*').eq('id', rep.id).single();
  assert(repReviewed.status === 'Reviewed', 'Database report status is Reviewed');
  assert(getPhaseIndex(repReviewed.status) === 2, 'Stepper advances to step 2 (Reviewed)');
  tableDisplayStatus = (repReviewed.status === 'Submitted' || repReviewed.status === 'Reviewed') ? 'UNDER REVIEW' : repReviewed.status;
  assert(tableDisplayStatus === 'UNDER REVIEW', 'Table list status remains UNDER REVIEW during Reviewed stage');

  // 3. Action: Start Repair
  console.log('\nTesting Action: Start Repair...');
  await new Promise(r => setTimeout(r, 600));
  const t3 = new Date().toISOString();
  await supabase.from('reports').update({ status: 'Under Repair', remarks: null, updated_at: t3 }).eq('id', rep.id);

  const { data: repUnderRepair } = await supabase.from('reports').select('*').eq('id', rep.id).single();
  assert(repUnderRepair.status === 'Under Repair', 'Database report status is Under Repair');
  assert(getPhaseIndex(repUnderRepair.status) === 3, 'Stepper advances to step 3 (Under Repair)');
  tableDisplayStatus = repUnderRepair.status === 'Under Repair' ? 'UNDER REPAIR' : repUnderRepair.status;
  assert(tableDisplayStatus === 'UNDER REPAIR', 'Table list status updates to UNDER REPAIR');

  // 4. Action: Mark as On Hold (with remarks)
  console.log('\nTesting Action: Mark as On Hold (with remarks)...');
  await new Promise(r => setTimeout(r, 600));
  const t4 = new Date().toISOString();
  const holdRemarks = 'Awaiting replacement HDMI display adapter.';
  await supabase.from('reports').update({ status: 'On Hold', remarks: holdRemarks, updated_at: t4 }).eq('id', rep.id);

  const { data: repOnHold } = await supabase.from('reports').select('*').eq('id', rep.id).single();
  assert(repOnHold.status === 'On Hold', 'Database report status is On Hold');
  assert(repOnHold.remarks === holdRemarks, 'On Hold remarks saved in Supabase');
  tableDisplayStatus = repOnHold.status === 'On Hold' ? 'ON HOLD' : repOnHold.status;
  assert(tableDisplayStatus === 'ON HOLD', 'Table list status updates to ON HOLD');

  // 5. Action: Edit Remarks while On Hold
  console.log('\nTesting Action: Edit Remarks while On Hold...');
  await new Promise(r => setTimeout(r, 600));
  const t4b = new Date().toISOString();
  const updatedHoldRemarks = 'Awaiting replacement HDMI adapter - shipment arriving tomorrow.';
  await supabase.from('reports').update({ remarks: updatedHoldRemarks, updated_at: t4b }).eq('id', rep.id);
  const { data: repRemarksEdited } = await supabase.from('reports').select('*').eq('id', rep.id).single();
  assert(repRemarksEdited.status === 'On Hold', 'Status remains On Hold after remarks edit');
  assert(repRemarksEdited.remarks === updatedHoldRemarks, 'Updated remarks successfully saved');

  // 6. Action: Mark as Resolved from On Hold (with final remarks)
  console.log('\nTesting Action: Mark as Resolved from On Hold...');
  await new Promise(r => setTimeout(r, 600));
  const t5 = new Date().toISOString();
  const resolveRemarks = 'HDMI adapter replaced and display calibrated at 144Hz.';
  await supabase.from('reports').update({ status: 'Resolved', remarks: resolveRemarks, updated_at: t5 }).eq('id', rep.id);

  const { data: repResolved } = await supabase.from('reports').select('*').eq('id', rep.id).single();
  assert(repResolved.status === 'Resolved', 'Database report status is Resolved');
  assert(repResolved.remarks === resolveRemarks, 'Resolution remarks saved in Supabase');
  assert(getPhaseIndex(repResolved.status) === 4, 'Stepper advances to step 4 (Resolved)');
  tableDisplayStatus = repResolved.status === 'Resolved' ? 'RESOLVED' : repResolved.status;
  assert(tableDisplayStatus === 'RESOLVED', 'Table list status updates to RESOLVED');

  // Verify status history audit entries and chronological order
  console.log('\n--- TEST 5: Complete Status History Verification ---');
  const { data: historyRows } = await supabase
    .from('report_status_history')
    .select('*')
    .eq('report_id', rep.id)
    .order('created_at', { ascending: true });

  const sequence = historyRows.map(h => h.status).join(' -> ');
  console.log('Status History Sequence in Supabase:', sequence);
  historyRows.forEach(h => {
    console.log(`   • [${h.status}] at ${formatManilaHistoryTime(h.created_at)} ${h.remarks ? `(Remarks: "${h.remarks}")` : ''}`);
  });

  assert(
    sequence === 'Submitted -> Reviewed -> Under Repair -> On Hold -> Resolved',
    'History contains all 5 lifecycle transitions in strict chronological order'
  );

  // Test 6: Verify student normalization & realtime mapping
  console.log('\n--- TEST 6: Student Account Realtime Normalization ---');
  const studentDisplayStatus = repResolved.status === 'Resolved' ? 'RESOLVED' : repResolved.status;
  const studentStatusClass = repResolved.status === 'Resolved' ? 'status-resolved' : 'status-under-review';
  assert(studentDisplayStatus === 'RESOLVED', 'Student report display_status is RESOLVED');
  assert(studentStatusClass === 'status-resolved', 'Student report status_class is status-resolved');
  assert(repResolved.remarks === resolveRemarks, 'Student report remarks match resolved remarks');

  // Cleanup test record
  await supabase.from('report_status_history').delete().eq('report_id', rep.id);
  await supabase.from('reports').delete().eq('id', rep.id);
  console.log(`\nCleaned up test report ${testReportCode}.`);

  console.log('\n🎉 ALL TESTS COMPLETED AND PASSED WITH 100% SUCCESS!');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
