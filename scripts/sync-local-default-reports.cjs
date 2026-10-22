const fs = require('fs');
const path = require('path');

const correctMap = {
  "LR-12": { date: "Oct 17, 2026", time: "3:45 PM", utc: "2026-10-17T07:45:00.000Z" },
  "LR-11": { date: "Oct 17, 2026", time: "3:45 PM", utc: "2026-10-17T07:45:00.000Z" },
  "LR-10": { date: "Oct 15, 2026", time: "8:45 AM", utc: "2026-10-15T00:45:00.000Z" },
  "LR-09": { date: "Oct 12, 2026", time: "9:05 AM", utc: "2026-10-12T01:05:00.000Z" },
  "LR-08": { date: "Oct 07, 2026", time: "3:30 PM", utc: "2026-10-07T07:30:00.000Z" },
  "LR-07": { date: "Oct 06, 2026", time: "11:15 AM", utc: "2026-10-06T03:15:00.000Z", unit: "PC-#04", eq: "Mouse", cc: "Computer Center 2", rm: "Room 202", desc: "Optical sensor tracking erratic on mousepad surface.", rem: "Sensor lens cleaned and mousepad replaced." },
  "LR-06": { date: "Oct 05, 2026", time: "2:20 PM", utc: "2026-10-05T06:20:00.000Z" },
  "LR-05": { date: "Oct 05, 2026", time: "9:40 AM", utc: "2026-10-05T01:40:00.000Z" },
  "LR-04": { date: "Oct 04, 2026", time: "4:10 PM", utc: "2026-10-04T08:10:00.000Z" },
  "LR-03": { date: "Oct 04, 2026", time: "10:05 AM", utc: "2026-10-04T02:05:00.000Z" },
  "LR-02": { date: "Oct 03, 2026", time: "1:30 PM", utc: "2026-10-03T05:30:00.000Z" },
  "LR-01": { date: "Oct 02, 2026", time: "8:15 AM", utc: "2026-10-02T00:15:00.000Z" },
  "LR-13": { date: "Oct 16, 2026", time: "10:30 AM", utc: "2026-10-16T02:30:00.000Z" },
  "LR-14": { date: "Oct 14, 2026", time: "1:15 PM", utc: "2026-10-14T05:15:00.000Z" },
  "LR-15": { date: "Oct 13, 2026", time: "11:00 AM", utc: "2026-10-13T03:00:00.000Z" },
  "LR-16": { date: "Oct 11, 2026", time: "4:00 PM", utc: "2026-10-11T08:00:00.000Z" },
  "LR-17": { date: "Oct 09, 2026", time: "2:50 PM", utc: "2026-10-09T06:50:00.000Z" },
  "LR-18": { date: "Oct 08, 2026", time: "9:15 AM", utc: "2026-10-08T01:15:00.000Z" },
};

// 1. Update StudentSubmittedReportsPage.jsx
const submittedReportsPath = path.resolve('src/components/StudentSubmittedReportsPage.jsx');
let sContent = fs.readFileSync(submittedReportsPath, 'utf-8');

for (const [id, info] of Object.entries(correctMap)) {
  const blockRegex = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?)(raw_created_at:\\s*')[^']+(')`);
  if (blockRegex.test(sContent)) {
    sContent = sContent.replace(blockRegex, `$1$2${info.utc}$3`);
  }
}

// Ensure LR-07 has its distinct information matching database
const lr07OldBlock = `    id: 'LR-07',
    report_id: 'LR-07',
    unit_number: 'PC-#18',
    unitNumber: 'PC-#18',
    equipment: 'Power (AVR / UPS / Outlet)',
    location_center: 'Computer Center 5',
    locationCenter: 'Computer Center 5',
    location_room: 'Room 204',
    locationRoom: 'Room 204',
    submitted_date: 'Oct 07, 2026',
    submittedDate: 'Oct 07, 2026',
    submitted_time: '3:30 PM',
    submittedTime: '3:30 PM',
    raw_created_at: '2026-10-06T03:15:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    displayStatus: 'RESOLVED',
    status_class: 'status-resolved',
    statusClass: 'status-resolved',
    student_name: 'Angel Lae Martinez',
    reportedByName: 'Angel Lae Martinez',
    student_year_block: 'BSIT 3-2',
    reportedByYearBlock: 'BSIT 3-2',
    description: 'AVR power strip switch loose and intermittent current flow.',
    attachment: {
      name: 'pc014_power_unit.jpg',
      size: '1.4MB',
    },
    remarks: 'Replaced AVR power unit with new tested 500W surge-protected model.',
    history: [
      { action: 'Submitted by Angel Lae Martinez', time: 'Oct 07, 3:30 PM' },
      { action: 'Resolved', time: 'Oct 07, 5:00 PM' }
    ],`;

const lr07NewBlock = `    id: 'LR-07',
    report_id: 'LR-07',
    unit_number: 'PC-#04',
    unitNumber: 'PC-#04',
    equipment: 'Mouse',
    location_center: 'Computer Center 2',
    locationCenter: 'Computer Center 2',
    location_room: 'Room 202',
    locationRoom: 'Room 202',
    submitted_date: 'Oct 06, 2026',
    submittedDate: 'Oct 06, 2026',
    submitted_time: '11:15 AM',
    submittedTime: '11:15 AM',
    raw_created_at: '2026-10-06T03:15:00.000Z',
    status: 'Resolved',
    display_status: 'RESOLVED',
    displayStatus: 'RESOLVED',
    status_class: 'status-resolved',
    statusClass: 'status-resolved',
    student_name: 'Angel Lae Martinez',
    reportedByName: 'Angel Lae Martinez',
    student_year_block: 'BSIT 3-2',
    reportedByYearBlock: 'BSIT 3-2',
    description: 'Optical sensor tracking erratic on mousepad surface.',
    attachment: {
      name: 'pc014_power_unit.jpg',
      size: '1.4MB',
    },
    remarks: 'Sensor lens cleaned and mousepad replaced.',
    history: [
      { action: 'Submitted by Angel Lae Martinez', time: 'Oct 06, 11:15 AM' },
      { action: 'Resolved', time: 'Oct 06, 1:30 PM' }
    ],`;

if (sContent.includes(lr07OldBlock)) {
  sContent = sContent.replace(lr07OldBlock, lr07NewBlock);
}

fs.writeFileSync(submittedReportsPath, sContent, 'utf-8');
console.log('Updated StudentSubmittedReportsPage.jsx successfully!');

// 2. Update StudentDashboard.jsx
const dashboardPath = path.resolve('src/components/StudentDashboard.jsx');
let dContent = fs.readFileSync(dashboardPath, 'utf-8');

for (const [id, info] of Object.entries(correctMap)) {
  const dRegex = new RegExp(`(id:\\s*'${id}'[\\s\\S]*?)(date_submitted:\\s*')[^']+(')`);
  if (dRegex.test(dContent)) {
    dContent = dContent.replace(dRegex, `$1$2${info.utc}$3`);
  }
}

// Update LR-07 in StudentDashboard.jsx as well
const dLr07Regex = /id:\s*'LR-07'[\s\S]*?history:\s*\[[\s\S]*?\]\s*,/g;
const dLr07OldMatch = dContent.match(dLr07Regex);
if (dLr07OldMatch) {
  const dLr07NewBlock = `id: 'LR-07',
    report_id: 'LR-07',
    unitNumber: 'PC-#04',
    equipment: 'Mouse',
    locationCenter: 'Computer Center 2',
    locationRoom: 'Room 202',
    submittedDate: 'Oct 06, 2026',
    submittedTime: '11:15 AM',
    date_submitted: '2026-10-06T03:15:00.000Z',
    status: 'Resolved',
    displayStatus: 'RESOLVED',
    statusClass: 'status-resolved',
    reportedByName: 'Angel Lae Martinez',
    reportedByYearBlock: 'BSIT 3-2',
    avatar: angelAvatar,
    description: 'Optical sensor tracking erratic on mousepad surface.',
    attachment: {
      name: 'pc014_power_unit.jpg',
      size: '1.4MB',
    },
    remarks: 'Sensor lens cleaned and mousepad replaced.',
    history: [{ action: 'Submitted', time: 'Oct 06, 11:15 AM' }, { action: 'Resolved', time: 'Oct 06, 1:30 PM' }],`;
  dContent = dContent.replace(dLr07OldMatch[0], dLr07NewBlock);
}

fs.writeFileSync(dashboardPath, dContent, 'utf-8');
console.log('Updated StudentDashboard.jsx successfully!');
