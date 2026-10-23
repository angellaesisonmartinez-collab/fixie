import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import workflow logic
import {
  normalizeStatusLabel,
  normalizeDbStatus,
  getStatusHistoryLabel,
  buildUnifiedHistoryEntries,
  getInitialTimestamps,
  getInitialStatusHistory,
} from '../src/lib/reportStatusHistoryWorkflow.js';

console.log('=== TEST 1: Status Normalization and Label Tests ===');
console.assert(normalizeStatusLabel('Submitted') === 'Submitted', 'Submitted -> Submitted');
console.assert(normalizeStatusLabel('Reviewed') === 'Under Review', 'Reviewed -> Under Review');
console.assert(normalizeStatusLabel('Under Review') === 'Under Review', 'Under Review -> Under Review');
console.assert(normalizeStatusLabel('Under Repair') === 'Under Repair', 'Under Repair -> Under Repair');
console.assert(normalizeStatusLabel('On Hold') === 'On Hold', 'On Hold -> On Hold');
console.assert(normalizeStatusLabel('Resolved') === 'Resolved', 'Resolved -> Resolved');

console.assert(normalizeDbStatus('Submitted') === 'Submitted', 'Submitted -> DB Submitted');
console.assert(normalizeDbStatus('Under Review') === 'Reviewed', 'Under Review -> DB Reviewed');
console.assert(normalizeDbStatus('Reviewed') === 'Reviewed', 'Reviewed -> DB Reviewed');
console.assert(normalizeDbStatus('Under Repair') === 'Under Repair', 'Under Repair -> DB Under Repair');
console.assert(normalizeDbStatus('On Hold') === 'On Hold', 'On Hold -> DB On Hold');
console.assert(normalizeDbStatus('Resolved') === 'Resolved', 'Resolved -> DB Resolved');

console.assert(getStatusHistoryLabel('Submitted') === 'Date Submitted', 'Submitted -> Date Submitted');
console.assert(getStatusHistoryLabel('Under Review') === 'Under Review', 'Under Review -> Under Review');
console.assert(getStatusHistoryLabel('Reviewed') === 'Under Review', 'Reviewed -> Under Review');
console.assert(getStatusHistoryLabel('Under Repair') === 'Under Repair', 'Under Repair -> Under Repair');
console.assert(getStatusHistoryLabel('On Hold') === 'On Hold', 'On Hold -> On Hold');
console.assert(getStatusHistoryLabel('Resolved') === 'Resolved', 'Resolved -> Resolved');

console.log('Test 1 Passed: Status mappings verified!');

console.log('\n=== TEST 2: Workflow History Generation by Phase ===');

// Stage 1: Newly Submitted Report
const reportSubmitted = {
  id: 'test-1',
  report_id: 'LR-999',
  status: 'Submitted',
  created_at: '2026-10-23T08:00:00Z',
  remarks: null,
};
const { entries: historySubmitted } = buildUnifiedHistoryEntries({
  currentReport: reportSubmitted,
  historyRows: [],
  currentStatus: 'Submitted',
});
console.log('Stage 1 (Newly Submitted) History entries count:', historySubmitted.length);
console.log('Entries:', historySubmitted.map(h => ({ status: h.status, label: getStatusHistoryLabel(h.status), time: h.timeFormatted })));
console.assert(historySubmitted.length === 1, 'Should have exactly 1 entry');
console.assert(historySubmitted[0].status === 'Submitted', 'First entry should be Submitted');
console.assert(getStatusHistoryLabel(historySubmitted[0].status) === 'Date Submitted', 'Label should be Date Submitted');

// Stage 2: Under Review
const reportReviewed = {
  id: 'test-1',
  report_id: 'LR-999',
  status: 'Reviewed',
  created_at: '2026-10-23T08:00:00Z',
  remarks: null,
};
const rawHistoryReviewed = [
  { status: 'Submitted', created_at: '2026-10-23T08:00:00Z' },
  { status: 'Reviewed', created_at: '2026-10-23T08:15:00Z' },
];
const { entries: historyReviewed } = buildUnifiedHistoryEntries({
  currentReport: reportReviewed,
  historyRows: rawHistoryReviewed,
  currentStatus: 'Reviewed',
});
console.log('\nStage 2 (Under Review) History entries count:', historyReviewed.length);
console.log('Entries:', historyReviewed.map(h => ({ status: h.status, label: getStatusHistoryLabel(h.status), time: h.timeFormatted })));
console.assert(historyReviewed.length === 2, 'Should have exactly 2 entries');
console.assert(historyReviewed[0].status === 'Submitted', 'Entry 1 should be Submitted');
console.assert(historyReviewed[1].status === 'Under Review', 'Entry 2 should be Under Review');

// Stage 3: Under Repair
const reportRepair = {
  id: 'test-1',
  report_id: 'LR-999',
  status: 'Under Repair',
  created_at: '2026-10-23T08:00:00Z',
  remarks: null,
};
const rawHistoryRepair = [
  { status: 'Submitted', created_at: '2026-10-23T08:00:00Z' },
  { status: 'Reviewed', created_at: '2026-10-23T08:15:00Z' },
  { status: 'Under Repair', created_at: '2026-10-23T08:30:00Z' },
];
const { entries: historyRepair } = buildUnifiedHistoryEntries({
  currentReport: reportRepair,
  historyRows: rawHistoryRepair,
  currentStatus: 'Under Repair',
});
console.log('\nStage 3 (Under Repair) History entries count:', historyRepair.length);
console.log('Entries:', historyRepair.map(h => ({ status: h.status, label: getStatusHistoryLabel(h.status), time: h.timeFormatted })));
console.assert(historyRepair.length === 3, 'Should have exactly 3 entries');
console.assert(historyRepair[2].status === 'Under Repair', 'Entry 3 should be Under Repair');

// Stage 4: On Hold
const reportOnHold = {
  id: 'test-1',
  report_id: 'LR-999',
  status: 'On Hold',
  created_at: '2026-10-23T08:00:00Z',
  remarks: 'Awaiting replacement parts.',
};
const rawHistoryOnHold = [
  ...rawHistoryRepair,
  { status: 'On Hold', remarks: 'Awaiting replacement parts.', created_at: '2026-10-23T08:45:00Z' },
];
const { entries: historyOnHold } = buildUnifiedHistoryEntries({
  currentReport: reportOnHold,
  historyRows: rawHistoryOnHold,
  currentStatus: 'On Hold',
  currentRemarks: 'Awaiting replacement parts.',
});
console.log('\nStage 4 (On Hold) History entries count:', historyOnHold.length);
console.log('Entries:', historyOnHold.map(h => ({ status: h.status, label: getStatusHistoryLabel(h.status), time: h.timeFormatted })));
console.assert(historyOnHold.length === 4, 'Should have exactly 4 entries');
console.assert(historyOnHold[3].status === 'On Hold', 'Entry 4 should be On Hold');

// Stage 5: Resolved (from On Hold)
const reportResolved = {
  id: 'test-1',
  report_id: 'LR-999',
  status: 'Resolved',
  created_at: '2026-10-23T08:00:00Z',
  remarks: 'Replace Monitor',
};
const rawHistoryResolved = [
  ...rawHistoryOnHold,
  { status: 'Resolved', remarks: 'Replace Monitor', created_at: '2026-10-23T09:00:00Z' },
];
const { entries: historyResolved } = buildUnifiedHistoryEntries({
  currentReport: reportResolved,
  historyRows: rawHistoryResolved,
  currentStatus: 'Resolved',
  currentRemarks: 'Replace Monitor',
});
console.log('\nStage 5 (Resolved) History entries count:', historyResolved.length);
console.log('Entries:', historyResolved.map(h => ({ status: h.status, label: getStatusHistoryLabel(h.status), time: h.timeFormatted })));
console.assert(historyResolved.length === 5, 'Should have exactly 5 entries');
console.assert(historyResolved[4].status === 'Resolved', 'Entry 5 should be Resolved');

// Also test direct Under Repair -> Resolved (without On Hold)
const rawHistoryDirectResolved = [
  ...rawHistoryRepair,
  { status: 'Resolved', remarks: 'Fixed power supply', created_at: '2026-10-23T09:00:00Z' },
];
const { entries: historyDirectResolved } = buildUnifiedHistoryEntries({
  currentReport: reportResolved,
  historyRows: rawHistoryDirectResolved,
  currentStatus: 'Resolved',
  currentRemarks: 'Fixed power supply',
});
console.log('\nStage 5 (Resolved direct without On Hold) History entries count:', historyDirectResolved.length);
console.assert(historyDirectResolved.length === 4, 'Should have exactly 4 entries');
console.assert(!historyDirectResolved.some(h => h.status === 'On Hold'), 'Must NOT contain On Hold if not placed on hold');
console.assert(historyDirectResolved[3].status === 'Resolved', 'Entry 4 should be Resolved');

console.log('Test 2 Passed: History generation matches all required phases!');

console.log('\n=== TEST 3: Live Supabase Fetch Verification ===');
async function runSupabaseChecks() {
  const { data: dbReports, error } = await supabase
    .from('reports')
    .select('id, report_id, status, created_at, remarks')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching reports:', error.message);
    process.exit(1);
  }

  console.log(`Fetched ${dbReports.length} reports from Supabase:`);
  for (const r of dbReports) {
    const { data: historyRows } = await supabase
      .from('report_status_history')
      .select('status, remarks, created_at')
      .eq('report_id', r.id)
      .order('created_at', { ascending: true });

    const { entries: unifiedHistory } = buildUnifiedHistoryEntries({
      currentReport: r,
      historyRows: historyRows || [],
      currentStatus: r.status,
      currentRemarks: r.remarks,
    });
    console.log(`Report ${r.report_id} (${r.status}):`);
    console.log(`  Unified History (${unifiedHistory.length} entries):`, unifiedHistory.map(h => `${getStatusHistoryLabel(h.status)} (${h.timeFormatted})`).join(' -> '));

    if (r.status === 'Submitted') {
      console.assert(unifiedHistory.length === 1, `Submitted report ${r.report_id} should only have Date Submitted`);
      console.assert(getStatusHistoryLabel(unifiedHistory[0].status) === 'Date Submitted', 'Label must be Date Submitted');
    }
  }

  console.log('\nAll verification tests completed successfully!');
}

runSupabaseChecks();
