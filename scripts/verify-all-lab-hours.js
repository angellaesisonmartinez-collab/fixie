import {
  checkLaboratoryHours,
  formatManilaDate,
  formatManilaTime,
  formatManilaDateTime,
  formatManilaHistoryTime,
  parseReportDateTime,
  LAB_HOURS_ERROR_MESSAGE,
} from '../src/lib/reportDateUtils.js';

console.log('====================================================');
console.log('LABORATORY OPERATING HOURS & TIMEZONE VERIFICATION');
console.log('====================================================\n');

// 1. Verification of Submission Boundary Times (Asia/Manila UTC+8)
const testCases = [
  { name: '12:00 AM Midnight', iso: '2026-10-20T00:00:00+08:00', expected: false },
  { name: '4:59 AM (Image 1 bug)', iso: '2026-10-20T04:59:00+08:00', expected: false },
  { name: '6:59 AM (1 minute before opening)', iso: '2026-10-20T06:59:59+08:00', expected: false },
  { name: '7:00 AM (Opening exact)', iso: '2026-10-20T07:00:00+08:00', expected: true },
  { name: '12:00 PM Midday', iso: '2026-10-20T12:00:00+08:00', expected: true },
  { name: '3:45 PM Afternoon', iso: '2026-10-20T15:45:00+08:00', expected: true },
  { name: '9:00 PM (Closing exact)', iso: '2026-10-20T21:00:00+08:00', expected: true },
  { name: '9:01 PM (1 minute after closing)', iso: '2026-10-20T21:01:00+08:00', expected: false },
  { name: '11:45 PM Late night', iso: '2026-10-20T23:45:00+08:00', expected: false },
];

let allPassed = true;
for (const tc of testCases) {
  const d = new Date(tc.iso);
  const res = checkLaboratoryHours(d);
  const passed = res.isAllowed === tc.expected;
  if (!passed) allPassed = false;
  console.log(
    `[${passed ? 'PASS' : 'FAIL'}] ${tc.name.padEnd(35)} -> ${res.formattedTime.padEnd(10)} (Allowed: ${res.isAllowed})`
  );
}

console.log('\n--- Status History Formatter (Elimination of 12:00 AM) ---');
const historyTests = [
  { input: '2026-10-17T07:45:00.000Z', expectedTime: '3:45 PM' },
  { input: '2026-10-11T08:00:00.000Z', expectedTime: '4:00 PM' }, // Previous 12:00 AM bug
  { input: '2026-10-06T03:15:00.000Z', expectedTime: '11:15 AM' },
  { input: 'Oct 17, 3:56 PM', expectedTime: '3:56 PM' },
];

for (const ht of historyTests) {
  const formatted = formatManilaHistoryTime(ht.input);
  const includesExpected = formatted.includes(ht.expectedTime);
  if (!includesExpected) allPassed = false;
  console.log(
    `[${includesExpected ? 'PASS' : 'FAIL'}] Input: "${ht.input}" -> Formatted: "${formatted}"`
  );
}

console.log('\n====================================================');
console.log(`VERIFICATION RESULT: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
console.log('====================================================');

if (!allPassed) {
  process.exit(1);
}
