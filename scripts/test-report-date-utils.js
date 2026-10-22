import {
  checkLaboratoryHours,
  formatManilaDate,
  formatManilaTime,
  formatManilaDateTime,
  formatManilaLiveClock,
  parseReportDateTime,
  LAB_HOURS_ERROR_MESSAGE,
} from '../src/lib/reportDateUtils.js';

console.log('--- Testing Lab Hours Validation ---');

// 1. Test 6:59 AM (Out of hours)
const earlyMorning = new Date('2026-10-20T06:59:00+08:00');
const earlyRes = checkLaboratoryHours(earlyMorning);
console.log('6:59 AM Manila:', earlyRes.isAllowed === false ? 'PASS (Blocked)' : 'FAIL', earlyRes);

// 2. Test 7:00 AM (In hours, right at opening)
const openingTime = new Date('2026-10-20T07:00:00+08:00');
const openRes = checkLaboratoryHours(openingTime);
console.log('7:00 AM Manila:', openRes.isAllowed === true ? 'PASS (Allowed)' : 'FAIL', openRes);

// 3. Test 12:00 PM Noon (In hours)
const noon = new Date('2026-10-20T12:00:00+08:00');
const noonRes = checkLaboratoryHours(noon);
console.log('12:00 PM Manila:', noonRes.isAllowed === true ? 'PASS (Allowed)' : 'FAIL', noonRes);

// 4. Test 9:00 PM (In hours, right at closing)
const closingTime = new Date('2026-10-20T21:00:00+08:00');
const closeRes = checkLaboratoryHours(closingTime);
console.log('9:00 PM Manila:', closeRes.isAllowed === true ? 'PASS (Allowed)' : 'FAIL', closeRes);

// 5. Test 9:01 PM (Out of hours)
const lateNight = new Date('2026-10-20T21:01:00+08:00');
const lateRes = checkLaboratoryHours(lateNight);
console.log('9:01 PM Manila:', lateRes.isAllowed === false ? 'PASS (Blocked)' : 'FAIL', lateRes);

// 6. Test 4:59 AM (The exact bug timestamp from Image 1)
const bugTime = new Date('2026-10-17T20:59:43+00:00'); // 4:59:43 AM Manila
const bugRes = checkLaboratoryHours(bugTime);
console.log('4:59 AM Manila (Image 1 bug):', bugRes.isAllowed === false ? 'PASS (Blocked)' : 'FAIL', bugRes);

console.log('\n--- Testing Date Formatting ---');
console.log('Format Manila Date (Oct 17, 2026 15:45 +08:00):', formatManilaDate('2026-10-17T15:45:00+08:00'));
console.log('Format Manila Time (Oct 17, 2026 15:45 +08:00):', formatManilaTime('2026-10-17T15:45:00+08:00'));
console.log('Format Manila DateTime:', formatManilaDateTime('2026-10-17T15:45:00+08:00'));
console.log('Format Live Clock:', formatManilaLiveClock('2026-10-20T14:30:00+08:00'));

console.log('\n--- Testing parseReportDateTime ---');
// Case A: item with date_time (seed format)
const itemA = { date_time: 'Oct 17, 2026, 3:45 PM', date_submitted: '2026-10-17T07:45:00.000Z' };
console.log('Case A (with date_time):', parseReportDateTime(itemA));

// Case B: item from reports_of_student with date_submitted
const itemB = { date_submitted: '2026-10-17T07:45:00.000Z' };
console.log('Case B (with date_submitted UTC):', parseReportDateTime(itemB));

// Case C: item from reports with created_at
const itemC = { created_at: '2026-10-17T02:40:00+00:00' };
console.log('Case C (reports table created_at):', parseReportDateTime(itemC));
