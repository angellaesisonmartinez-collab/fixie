import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=== TEST: VERIFY REPORTS MODAL REMARKS AND LOADING SPEED ===\n');

const modalFilePath = resolve('src/components/ReportDetailsModal.jsx');
const reportsPageFilePath = resolve('src/components/ReportsPage.jsx');

const modalCode = readFileSync(modalFilePath, 'utf8');
const reportsPageCode = readFileSync(reportsPageFilePath, 'utf8');

// 1. Verify remarks on status history items is removed
const hasTpRemarksInsideHistory = modalCode.includes('tp-history-remarks-subline');
console.log('1. Remarks inside TP status history removed:', !hasTpRemarksInsideHistory);
if (hasTpRemarksInsideHistory) {
  console.error('FAIL: Found tp-history-remarks-subline inside TP status history rendering!');
  process.exit(1);
}

const hasStudentRemarksInsideHistory = modalCode.includes('student-history-remarks-line');
console.log('2. Remarks inside Student status history removed:', !hasStudentRemarksInsideHistory);
if (hasStudentRemarksInsideHistory) {
  console.error('FAIL: Found student-history-remarks-line inside Student status history rendering!');
  process.exit(1);
}

// 2. Verify remarks is placed on top of the status
const tpResolvedRemarksTop = modalCode.includes('report-resolved-remarks-line');
console.log('3. Remarks rendered on top of status in TP view:', tpResolvedRemarksTop);
if (!tpResolvedRemarksTop) {
  console.error('FAIL: report-resolved-remarks-line missing on top of status!');
  process.exit(1);
}

const studentRemarksTop = modalCode.includes('student-remarks-top-block');
console.log('4. Remarks rendered on top of status in Student view:', studentRemarksTop);
if (!studentRemarksTop) {
  console.error('FAIL: student-remarks-top-block missing on top of status in Student view!');
  process.exit(1);
}

// 3. Verify instant status history initialization (no slow loading)
const hasInitialStatusHistoryHelper = modalCode.includes('export function getInitialStatusHistory(report)');
console.log('5. getInitialStatusHistory helper defined:', hasInitialStatusHistoryHelper);
if (!hasInitialStatusHistoryHelper) {
  console.error('FAIL: getInitialStatusHistory helper is missing!');
  process.exit(1);
}

const usesGetInitialStatusHistoryInState = modalCode.includes('useState(() => getInitialStatusHistory(report))');
console.log('6. statusHistory state initialized immediately with getInitialStatusHistory:', usesGetInitialStatusHistoryInState);
if (!usesGetInitialStatusHistoryInState) {
  console.error('FAIL: statusHistory does not use getInitialStatusHistory for initial state!');
  process.exit(1);
}

// 4. Verify parallel queries via Promise.all in loadFreshReportAndHistory
const hasParallelFetch = modalCode.includes('Promise.all([historyPromise, liveReportPromise, liveRosPromise])');
console.log('7. Parallel Supabase queries via Promise.all implemented:', hasParallelFetch);
if (!hasParallelFetch) {
  console.error('FAIL: loadFreshReportAndHistory does not use Promise.all for parallel queries!');
  process.exit(1);
}

// 5. Verify caching mechanisms
const hasReportHistoryCache = modalCode.includes('export const reportHistoryCache = new Map()');
console.log('8. Module-level reportHistoryCache exported:', hasReportHistoryCache);
if (!hasReportHistoryCache) {
  console.error('FAIL: reportHistoryCache missing in ReportDetailsModal.jsx!');
  process.exit(1);
}

const reportsPageImportsCache = reportsPageCode.includes('reportHistoryCache');
console.log('9. ReportsPage imports reportHistoryCache for prefetching:', reportsPageImportsCache);
if (!reportsPageImportsCache) {
  console.error('FAIL: ReportsPage does not import reportHistoryCache!');
  process.exit(1);
}

const reportsPagePrefetchesHistory = reportsPageCode.includes('historyByReportId');
console.log('10. ReportsPage prefetches report_status_history in parallel with reports:', reportsPagePrefetchesHistory);
if (!reportsPagePrefetchesHistory) {
  console.error('FAIL: ReportsPage does not prefetch report_status_history!');
  process.exit(1);
}

console.log('\n=== ALL 10 ASSERTIONS PASSED SUCCESSFULLY! ===');
