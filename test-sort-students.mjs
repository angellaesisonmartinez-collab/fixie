import assert from 'node:assert';
import { sortStudentsByRegistrationDateDesc } from './src/components/StudentsPage.jsx';

// 1. Verify that newest registration date comes first
const s1 = { name: 'Student Sept 28', date_registered: '2026-09-28', created_at: '2026-09-28T08:30:00.000Z' };
const s2 = { name: 'Student Sept 27', date_registered: '2026-09-27', created_at: '2026-09-27T09:00:00.000Z' };
assert(sortStudentsByRegistrationDateDesc(s1, s2) < 0, 'Sept 28 should come before Sept 27');
assert(sortStudentsByRegistrationDateDesc(s2, s1) > 0, 'Sept 27 should come after Sept 28');

// 2. Verify that Maria Ortiz (registered Sept 10, but created_at Oct 17) comes AFTER Sept 28 and Sept 25
const mariaOrtiz = { name: 'Maria Ortiz', date_registered: '2026-09-10', created_at: '2026-10-17T21:04:27.194+00:00' };
const jazminBayudan = { name: 'Jazmin Bayudan', date_registered: '2026-09-25', created_at: '2026-09-07T11:00:00+00:00' };
assert(sortStudentsByRegistrationDateDesc(jazminBayudan, mariaOrtiz) < 0, 'Jazmin (Sept 25) should come before Maria Ortiz (Sept 10)');
assert(sortStudentsByRegistrationDateDesc(s1, mariaOrtiz) < 0, 'Angel Lae (Sept 28) should come before Maria Ortiz (Sept 10)');

// 3. Verify tie breaker on same registration date: Angel Lae Martinez (08:30) vs Jennelyn Vergara (08:15)
const angel = { name: 'Angel Lae Martinez', date_registered: '2026-09-28', created_at: '2026-09-28T08:30:00.000Z' };
const jennelyn = { name: 'Jennelyn Vergara', date_registered: '2026-09-28', created_at: '2026-09-10T08:15:00.000Z' };
assert(sortStudentsByRegistrationDateDesc(angel, jennelyn) < 0, 'Angel should come before Jennelyn on Sept 28');

// 4. Verify newly registered student today always comes at the very top
const newStudentToday = { name: 'New Student Today', date_registered: '2026-10-20', created_at: '2026-10-20T05:00:00.000Z' };
const list = [mariaOrtiz, s2, angel, jennelyn, jazminBayudan, newStudentToday];
list.sort(sortStudentsByRegistrationDateDesc);
assert.strictEqual(list[0].name, 'New Student Today', 'Newly registered student should be at index 0');
assert.strictEqual(list[1].name, 'Angel Lae Martinez', 'Angel Lae Martinez should be at index 1');
assert.strictEqual(list[2].name, 'Jennelyn Vergara', 'Jennelyn Vergara should be at index 2');
assert.strictEqual(list[3].name, 'Student Sept 27', 'Student Sept 27 should be at index 3');
assert.strictEqual(list[4].name, 'Jazmin Bayudan', 'Jazmin Bayudan should be at index 4');
assert.strictEqual(list[5].name, 'Maria Ortiz', 'Maria Ortiz should be at index 5');

console.log('All student sorting tests passed successfully!');
