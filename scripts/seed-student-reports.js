import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

const supabase = createClient(supabaseUrl, supabaseKey);

export const studentReportsSeedData = [
  {
    report_id: 'LR-12',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#14',
    equipment: 'Monitor',
    computer_center: 'Computer Center 5',
    room: 'Room 204',
    date_submitted: '2026-10-17T15:45:00.000Z',
    date_time: 'Oct 17, 2026, 3:45 PM',
    status: 'Under Review',
    description: 'Monitor display flickering intermittently and showing vertical green artifacts during laboratory session.',
    remarks: 'Assigned for hardware diagnostic by technical personnel.',
    history: [{ action: 'Submitted', time: 'Oct 17, 3:45 PM', by: 'Angel Lae Martinez' }],
  },
  {
    report_id: 'LR-11',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#10',
    equipment: 'Network/Internet',
    computer_center: 'Computer Center 5',
    room: 'Room 204',
    date_submitted: '2026-10-17T15:45:00.000Z',
    date_time: 'Oct 17, 2026, 3:45 PM',
    status: 'Under Repair',
    description: 'PC not connecting to internet gateway; LAN port link LED off.',
    remarks: 'Technician currently re-terminating patch panel drop cable.',
    history: [{ action: 'Submitted', time: 'Oct 17, 3:45 PM' }, { action: 'Under repair', time: 'Oct 17, 4:05 PM' }],
  },
  {
    report_id: 'LR-10',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#13',
    equipment: 'System Unit/CPU',
    computer_center: 'Computer Center 8',
    room: 'Room 209',
    date_submitted: '2026-10-15T08:45:00.000Z',
    date_time: 'Oct 15, 2026, 8:45 AM',
    status: 'Resolved',
    description: 'Power supply unit fan making rattling noise.',
    remarks: 'Fan assembly cleaned and lubricated. Thermal check completed normal.',
    history: [{ action: 'Submitted', time: 'Oct 15, 8:45 AM' }, { action: 'Resolved', time: 'Oct 15, 11:20 AM' }],
  },
  {
    report_id: 'LR-09',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#13',
    equipment: 'Keyboard',
    computer_center: 'Computer Center 5',
    room: 'Room 204',
    date_submitted: '2026-10-12T09:05:00.000Z',
    date_time: 'Oct 12, 2026, 9:05 AM',
    status: 'Resolved',
    description: 'Spacebar key sticking and unresponsive.',
    remarks: 'Replaced with spare mechanical membrane keyboard from stock.',
    history: [{ action: 'Submitted', time: 'Oct 12, 9:05 AM' }, { action: 'Resolved', time: 'Oct 12, 10:15 AM' }],
  },
  {
    report_id: 'LR-08',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#13',
    equipment: 'Monitor',
    computer_center: 'Computer Center 5',
    room: 'Room 204',
    date_submitted: '2026-10-07T15:30:00.000Z',
    date_time: 'Oct 07, 2026, 3:30 PM',
    status: 'Resolved',
    description: 'HDMI signal drop when adjusting monitor angle.',
    remarks: 'Defective HDMI cable replaced with high-speed gold connector cable.',
    history: [{ action: 'Submitted', time: 'Oct 07, 3:30 PM' }, { action: 'Resolved', time: 'Oct 07, 4:45 PM' }],
  },
  {
    report_id: 'LR-07',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#04',
    equipment: 'Mouse',
    computer_center: 'Computer Center 2',
    room: 'Room 202',
    date_submitted: '2026-10-06T11:15:00.000Z',
    date_time: 'Oct 06, 2026, 11:15 AM',
    status: 'Resolved',
    description: 'Optical mouse sensor jumps across screen erratically.',
    remarks: 'Lens cleaned and desk surface pad provided.',
    history: [{ action: 'Submitted', time: 'Oct 06, 11:15 AM' }, { action: 'Resolved', time: 'Oct 06, 1:00 PM' }],
  },
  {
    report_id: 'LR-06',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#22',
    equipment: 'Software/OS',
    computer_center: 'Computer Center 1',
    room: 'Room 201',
    date_submitted: '2026-10-05T14:20:00.000Z',
    date_time: 'Oct 05, 2026, 2:20 PM',
    status: 'Resolved',
    description: 'C++ Compiler path missing in environment variables.',
    remarks: 'Environment paths corrected and tested with GCC build.',
    history: [{ action: 'Submitted', time: 'Oct 05, 2:20 PM' }, { action: 'Resolved', time: 'Oct 05, 3:45 PM' }],
  },
  {
    report_id: 'LR-05',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#35',
    equipment: 'Network/Internet',
    computer_center: 'Computer Center 4',
    room: 'Room 204',
    date_submitted: '2026-10-05T09:40:00.000Z',
    date_time: 'Oct 05, 2026, 9:40 AM',
    status: 'Resolved',
    description: 'Intermittent connection drops during lab networking exam.',
    remarks: 'RJ-45 connector re-crimped and patch cable tested.',
    history: [{ action: 'Submitted', time: 'Oct 05, 9:40 AM' }, { action: 'Resolved', time: 'Oct 05, 10:30 AM' }],
  },
  {
    report_id: 'LR-04',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#18',
    equipment: 'Power (AVR/UPS)',
    computer_center: 'Computer Center 3',
    room: 'Room 203',
    date_submitted: '2026-10-04T16:10:00.000Z',
    date_time: 'Oct 04, 2026, 4:10 PM',
    status: 'Resolved',
    description: 'AVR power switch loose and turning off with vibration.',
    remarks: 'Replaced AVR with tested 500W unit.',
    history: [{ action: 'Submitted', time: 'Oct 04, 4:10 PM' }, { action: 'Resolved', time: 'Oct 04, 5:15 PM' }],
  },
  {
    report_id: 'LR-03',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#07',
    equipment: 'System Unit/CPU',
    computer_center: 'Computer Center 6',
    room: 'Room 206',
    date_submitted: '2026-10-04T10:05:00.000Z',
    date_time: 'Oct 04, 2026, 10:05 AM',
    status: 'Resolved',
    description: 'Memory beep code on workstation start.',
    remarks: 'DDR4 RAM contact pins cleaned and reseated in primary slot.',
    history: [{ action: 'Submitted', time: 'Oct 04, 10:05 AM' }, { action: 'Resolved', time: 'Oct 04, 11:40 AM' }],
  },
  {
    report_id: 'LR-02',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#29',
    equipment: 'Keyboard',
    computer_center: 'Computer Center 7',
    room: 'Room 207',
    date_submitted: '2026-10-03T13:30:00.000Z',
    date_time: 'Oct 03, 2026, 1:30 PM',
    status: 'Resolved',
    description: 'Enter key stuck down after beverage spill residue.',
    remarks: 'Key switch assembly cleaned and dried thoroughly.',
    history: [{ action: 'Submitted', time: 'Oct 03, 1:30 PM' }, { action: 'Resolved', time: 'Oct 03, 3:00 PM' }],
  },
  {
    report_id: 'LR-01',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#02',
    equipment: 'Monitor',
    computer_center: 'Computer Center 10',
    room: 'Room 210',
    date_submitted: '2026-10-02T08:15:00.000Z',
    date_time: 'Oct 02, 2026, 8:15 AM',
    status: 'Resolved',
    description: 'Display output black screen while PC running.',
    remarks: 'DisplayPort cable connected properly to discrete GPU.',
    history: [{ action: 'Submitted', time: 'Oct 02, 8:15 AM' }, { action: 'Resolved', time: 'Oct 02, 9:20 AM' }],
  },
  {
    report_id: 'LR-13',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#25',
    equipment: 'Mouse',
    computer_center: 'Computer Center 9',
    room: 'Room 209',
    date_submitted: '2026-10-16T10:30:00.000Z',
    date_time: 'Oct 16, 2026, 10:30 AM',
    status: 'Resolved',
    description: 'Left mouse button double-clicks on single tap.',
    remarks: 'Mouse replaced with new optical mouse from storage.',
    history: [{ action: 'Submitted', time: 'Oct 16, 10:30 AM' }, { action: 'Resolved', time: 'Oct 16, 11:15 AM' }],
  },
  {
    report_id: 'LR-14',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#38',
    equipment: 'System Unit/CPU',
    computer_center: 'Computer Center 8',
    room: 'Room 208',
    date_submitted: '2026-10-14T13:15:00.000Z',
    date_time: 'Oct 14, 2026, 1:15 PM',
    status: 'Resolved',
    description: 'CMOS date and time resets on every power cycle.',
    remarks: 'Installed fresh CR2032 lithium battery and saved BIOS configuration.',
    history: [{ action: 'Submitted', time: 'Oct 14, 1:15 PM' }, { action: 'Resolved', time: 'Oct 14, 2:30 PM' }],
  },
  {
    report_id: 'LR-15',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#19',
    equipment: 'Network/Internet',
    computer_center: 'Computer Center 6',
    room: 'Room 206',
    date_submitted: '2026-10-13T11:00:00.000Z',
    date_time: 'Oct 13, 2026, 11:00 AM',
    status: 'Resolved',
    description: 'Static IP conflict detected on local subnet.',
    remarks: 'Configured DHCP reservation and flushed DNS cache.',
    history: [{ action: 'Submitted', time: 'Oct 13, 11:00 AM' }, { action: 'Resolved', time: 'Oct 13, 11:50 AM' }],
  },
  {
    report_id: 'LR-16',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#31',
    equipment: 'Monitor',
    computer_center: 'Computer Center 7',
    room: 'Room 207',
    date_submitted: '2026-10-11T16:00:00.000Z',
    date_time: 'Oct 11, 2026, 4:00 PM',
    status: 'Resolved',
    description: 'Monitor brightness flickering when setting above 70%.',
    remarks: 'Power brick replaced with original manufacturer 19V supply.',
    history: [{ action: 'Submitted', time: 'Oct 11, 4:00 PM' }, { action: 'Resolved', time: 'Oct 11, 5:10 PM' }],
  },
  {
    report_id: 'LR-17',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#08',
    equipment: 'Software/OS',
    computer_center: 'Computer Center 2',
    room: 'Room 202',
    date_submitted: '2026-10-09T14:50:00.000Z',
    date_time: 'Oct 09, 2026, 2:50 PM',
    status: 'Resolved',
    description: 'Corrupt Node.js global binaries throwing ENOENT error.',
    remarks: 'Node LTS re-installed and npm cache cleared.',
    history: [{ action: 'Submitted', time: 'Oct 09, 2:50 PM' }, { action: 'Resolved', time: 'Oct 09, 4:00 PM' }],
  },
  {
    report_id: 'LR-18',
    student_id: '24-0041-147',
    student_name: 'Angel Lae Martinez',
    year_block: '3rd year, BLK 2',
    unit_number: 'PC-#40',
    equipment: 'Keyboard',
    computer_center: 'Computer Center 10',
    room: 'Room 210',
    date_submitted: '2026-10-08T09:15:00.000Z',
    date_time: 'Oct 08, 2026, 9:15 AM',
    status: 'Resolved',
    description: 'Backspace key spring unseated.',
    remarks: 'Stabilizer wire reseated and keycap tested.',
    history: [{ action: 'Submitted', time: 'Oct 08, 9:15 AM' }, { action: 'Resolved', time: 'Oct 08, 10:20 AM' }],
  },
];

async function seedStudentReports() {
  console.log('🚀 Seeding reports_of_student table (18 reports: 1 Under Review, 1 Under Repair, 16 Resolved)...');

  // 1. Check if table reports_of_student exists in Supabase
  const { error: testErr } = await supabase.from('reports_of_student').select('id').limit(1);

  if (testErr && testErr.code === 'PGRST205') {
    console.error('❌ Table "reports_of_student" does not exist yet in Supabase schema.');
    console.log('👉 Please execute "phases/reports_of_student.sql" in your Supabase SQL Editor first!');
    console.log('   Location: phases/reports_of_student.sql');
    return;
  }

  // 2. Upsert each report with accurate Manila laboratory hours timestamp
  let inserted = 0;
  for (const report of studentReportsSeedData) {
    let dateSubmittedUtc = report.date_submitted;
    if (report.date_time) {
      const match = report.date_time.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        const [_, mStr, dStr, yStr, hrStr, minStr, ampm] = match;
        const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const month = months[mStr.toLowerCase()];
        const day = dStr.padStart(2, '0');
        let hour = parseInt(hrStr, 10);
        if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
        if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
        const hourFormatted = String(hour).padStart(2, '0');
        const isoManila = `${yStr}-${month}-${day}T${hourFormatted}:${minStr}:00+08:00`;
        dateSubmittedUtc = new Date(isoManila).toISOString();
      }
    }

    const payload = {
      ...report,
      date_submitted: dateSubmittedUtc,
      created_at: dateSubmittedUtc,
    };

    const { error } = await supabase
      .from('reports_of_student')
      .upsert(payload, { onConflict: 'report_id' });

    if (error) {
      console.error(`❌ Error upserting ${report.report_id}:`, error.message);
    } else {
      inserted++;
      console.log(`✅ [${report.report_id}] ${report.unit_number} (${report.equipment}) - ${report.status} (${report.computer_center})`);
    }
  }

  console.log(`🎉 Seeding finished! Successfully processed ${inserted}/18 reports.`);
}

seedStudentReports();
