import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedReports() {
  console.log('🚀 Seeding reports table with exact 24 reports matching specification...');

  // 1. Fetch student IDs from database
  const { data: students, error: stdErr } = await supabase.from('students').select('id, student_id, name');
  if (stdErr || !students || students.length === 0) {
    console.error('Failed to fetch students:', stdErr);
    return;
  }

  const studentMap = {};
  students.forEach((s) => {
    studentMap[s.student_id] = s.id;
    studentMap[s.name] = s.id;
  });

  const getStudentId = (key) => studentMap[key] || students[0].id;

  // 2. Define the exact 24 reports
  // Equipment choices: System Unit/CPU, Monitor, Keyboard, Mouse, Network/Internet, Power (AVR/UPS/Outlet), Software/OS
  // Computer Center 1-10 (Rooms 201-210), PC#1-PC#40
  const reportsData = [
    // --- 5 RECENT REPORTS (As shown in dashboard UI) ---
    {
      report_id: 'LR-24',
      student_id: getStudentId('24-0041-147'), // Angel Lae S. Martinez
      room: 'Computer Center 3, Room 203',
      equipment: 'Monitor',
      unit_number: 'PC-#14',
      description: 'Screen display flickers intermittently when running graphics applications.',
      status: 'Reviewed', // Grouped under "Under Review" in UI
      remarks: null,
      created_at: '2026-10-17T02:40:00.000Z', // 10:40 AM UTC+8
      updated_at: '2026-10-17T02:45:00.000Z',
    },
    {
      report_id: 'LR-23',
      student_id: getStudentId('24-2026-340'), // Jennelyn Vergara
      room: 'Computer Center 4, Room 204',
      equipment: 'Network/Internet',
      unit_number: 'PC-#12',
      description: 'No ethernet connection detected; LAN port indicator is unlit.',
      status: 'Reviewed', // Grouped under "Under Review" in UI
      remarks: null,
      created_at: '2026-10-16T01:30:00.000Z', // 9:30 AM UTC+8
      updated_at: '2026-10-16T01:40:00.000Z',
    },
    {
      report_id: 'LR-22',
      student_id: getStudentId('24-7345-853'), // Reyn Arahan
      room: 'Computer Center 3, Room 203',
      equipment: 'Network/Internet',
      unit_number: 'PC-#23',
      description: 'Damaged RJ-45 jack causing packet loss and intermittent drops.',
      status: 'Under Repair',
      remarks: 'Port keystone needs replacement. Parts requisition submitted.',
      created_at: '2026-10-15T05:30:00.000Z', // 1:30 PM UTC+8
      updated_at: '2026-10-15T06:00:00.000Z',
    },
    {
      report_id: 'LR-21',
      student_id: getStudentId('24-0031-267'), // Juan Dela Cruz
      room: 'Computer Center 6, Room 206',
      equipment: 'Network/Internet',
      unit_number: 'PC-#03',
      description: 'High packet loss encountered during lab networking practical exercise.',
      status: 'Resolved',
      remarks: 'Re-crimped RJ-45 connector and tested continuous ping at 0% drop rate.',
      created_at: '2026-10-14T06:45:00.000Z', // 2:45 PM UTC+8
      updated_at: '2026-10-14T07:15:00.000Z',
    },
    {
      report_id: 'LR-20',
      student_id: getStudentId('24-8521-063'), // Maria Reyes
      room: 'Computer Center 5, Room 205',
      equipment: 'Network/Internet',
      unit_number: 'PC-#13',
      description: 'Slow gateway response and intermittent DNS lookup timeouts.',
      status: 'Resolved',
      remarks: 'Replaced patch cable with Cat6 shielded cable. Full gigabit link restored.',
      created_at: '2026-10-12T07:15:00.000Z', // 3:15 PM UTC+8
      updated_at: '2026-10-12T08:00:00.000Z',
    },

    // --- 8 MORE RESOLVED REPORTS THIS MONTH (OCTOBER 2026) -> Total 10 resolved this month ---
    {
      report_id: 'LR-19',
      student_id: getStudentId('Phia Cayetano'),
      room: 'Computer Center 2, Room 205',
      equipment: 'Monitor',
      unit_number: 'PC-#18',
      description: 'Display output intermittently blank or flickering under load.',
      status: 'Resolved',
      remarks: 'Replaced video cable and reset display configuration.',
      created_at: '2026-10-12T07:15:00.000Z', // 3:15 PM UTC+8
      updated_at: '2026-10-12T07:45:00.000Z',
    },
    {
      report_id: 'LR-18',
      student_id: getStudentId('Phia Cayetano'),
      room: 'Computer Center 2, Room 205',
      equipment: 'Keyboard',
      unit_number: 'PC-#14',
      description: 'Sticky key switches and unresponsiveness on spacebar and enter.',
      status: 'Resolved',
      remarks: 'Cleaned switches and replaced worn keycaps.',
      created_at: '2026-10-12T07:15:00.000Z', // 3:15 PM UTC+8
      updated_at: '2026-10-12T07:50:00.000Z',
    },
    {
      report_id: 'LR-17',
      student_id: getStudentId('24-0132-062'), // Emmanuel Gaspar
      room: 'Computer Center 7, Room 207',
      equipment: 'System Unit/CPU',
      unit_number: 'PC-#31',
      description: 'CPU fan making loud grinding noise during boot.',
      status: 'Resolved',
      remarks: 'Replaced chassis fan and reapplied thermal paste. Temperatures normal.',
      created_at: '2026-10-09T02:15:00.000Z',
      updated_at: '2026-10-09T04:30:00.000Z',
    },
    {
      report_id: 'LR-16',
      student_id: getStudentId('24-2026-106'), // Bianca Allyzon Antonio
      room: 'Computer Center 8, Room 208',
      equipment: 'Power (AVR/UPS/Outlet)',
      unit_number: 'PC-#09',
      description: 'AVR power switch clicks off when PC starts high-load processes.',
      status: 'Resolved',
      remarks: 'Defective fuse replaced and surge suppression load-tested.',
      created_at: '2026-10-08T05:10:00.000Z',
      updated_at: '2026-10-08T07:00:00.000Z',
    },
    {
      report_id: 'LR-15',
      student_id: getStudentId('24-2026-107'), // Chryztel Geene Salvador
      room: 'Computer Center 9, Room 209',
      equipment: 'Software/OS',
      unit_number: 'PC-#17',
      description: 'Compiler license expired on IDE toolchain.',
      status: 'Resolved',
      remarks: 'Renewed institutional license server key and verified compiler build.',
      created_at: '2026-10-07T03:45:00.000Z',
      updated_at: '2026-10-07T05:00:00.000Z',
    },
    {
      report_id: 'LR-14',
      student_id: getStudentId('24-2026-108'), // John Lester Tan
      room: 'Computer Center 10, Room 210',
      equipment: 'Monitor',
      unit_number: 'PC-#35',
      description: 'HDMI color tint shifted towards heavy yellow/green.',
      status: 'Resolved',
      remarks: 'Replaced bent HDMI cable and recalibrated color profile.',
      created_at: '2026-10-05T01:30:00.000Z',
      updated_at: '2026-10-05T03:00:00.000Z',
    },
    {
      report_id: 'LR-13',
      student_id: getStudentId('24-2026-109'), // Justine Kate Abello
      room: 'Computer Center 4, Room 204',
      equipment: 'Keyboard',
      unit_number: 'PC-#19',
      description: 'NumPad keys 4, 5, 6 unresponsive.',
      status: 'Resolved',
      remarks: 'Firmware updated and cable seated properly in rear USB 3.0 port.',
      created_at: '2026-10-04T07:00:00.000Z',
      updated_at: '2026-10-04T08:30:00.000Z',
    },
    {
      report_id: 'LR-12',
      student_id: getStudentId('22-0941-301'), // Alyssa Ramos (disabled student)
      room: 'Computer Center 5, Room 205',
      equipment: 'Mouse',
      unit_number: 'PC-#08',
      description: 'Left mouse button double-clicks on single press.',
      status: 'Resolved',
      remarks: 'Replaced microswitch. Verified click reliability in diagnostic tool.',
      created_at: '2026-10-02T02:00:00.000Z',
      updated_at: '2026-10-02T04:00:00.000Z',
    },

    // --- ALL 21 RESOLVED REPORTS ARE RESOLVED THIS MONTH (OCTOBER 2026) ---
    {
      report_id: 'LR-11',
      student_id: getStudentId('24-0041-147'),
      room: 'Computer Center 2, Room 202',
      equipment: 'System Unit/CPU',
      unit_number: 'PC-#27',
      description: 'Unexpected reboot during file indexing.',
      status: 'Resolved',
      remarks: 'RAM module reseated and memory diagnostics passed clean.',
      created_at: '2026-10-04T05:00:00.000Z',
      updated_at: '2026-10-04T07:00:00.000Z',
    },
    {
      report_id: 'LR-10',
      student_id: getStudentId('24-2026-340'),
      room: 'Computer Center 3, Room 203',
      equipment: 'Power (AVR/UPS/Outlet)',
      unit_number: 'PC-#15',
      description: 'Power strip outlet loose causing sudden shutdown.',
      status: 'Resolved',
      remarks: 'Replaced electrical wall outlet plate and tightened terminal lugs.',
      created_at: '2026-10-04T08:15:00.000Z',
      updated_at: '2026-10-04T09:30:00.000Z',
    },
    {
      report_id: 'LR-09',
      student_id: getStudentId('24-7345-853'),
      room: 'Computer Center 1, Room 201',
      equipment: 'Software/OS',
      unit_number: 'PC-#30',
      description: 'Windows audio service crashing repeatedly.',
      status: 'Resolved',
      remarks: 'Realtek audio driver reinstalled from OEM repository.',
      created_at: '2026-10-03T01:30:00.000Z',
      updated_at: '2026-10-03T03:00:00.000Z',
    },
    {
      report_id: 'LR-08',
      student_id: getStudentId('24-0031-267'),
      room: 'Computer Center 6, Room 206',
      equipment: 'Monitor',
      unit_number: 'PC-#04',
      description: 'Monitor resolution locked at 1024x768.',
      status: 'Resolved',
      remarks: 'Installed updated Intel display graphics drivers.',
      created_at: '2026-10-03T06:10:00.000Z',
      updated_at: '2026-10-03T07:30:00.000Z',
    },
    {
      report_id: 'LR-07',
      student_id: getStudentId('24-8521-063'),
      room: 'Computer Center 7, Room 207',
      equipment: 'Keyboard',
      unit_number: 'PC-#21',
      description: 'Caps Lock LED stuck on; typing produces mixed casing.',
      status: 'Resolved',
      remarks: 'Keyboard controller reset; normal operation verified.',
      created_at: '2026-10-02T02:00:00.000Z',
      updated_at: '2026-10-02T03:30:00.000Z',
    },
    {
      report_id: 'LR-06',
      student_id: getStudentId('22-0941-301'), // Disabled student test
      room: 'Computer Center 5, Room 204',
      equipment: 'Mouse',
      unit_number: 'PC-#08',
      description: 'Scroll wheel loose and skips lines when scrolling.',
      status: 'Resolved',
      remarks: 'Optical wheel encoder cleaned and tested.',
      created_at: '2026-10-02T04:20:00.000Z',
      updated_at: '2026-10-02T05:40:00.000Z',
    },
    {
      report_id: 'LR-05',
      student_id: getStudentId('24-1003-101'),
      room: 'Computer Center 8, Room 208',
      equipment: 'Network/Internet',
      unit_number: 'PC-#11',
      description: 'DHCP auto-assigning 169.254.x.x link-local IP.',
      status: 'Resolved',
      remarks: 'Switch port VLAN membership reconfigured in rack 2.',
      created_at: '2026-10-02T06:40:00.000Z',
      updated_at: '2026-10-02T07:50:00.000Z',
    },
    {
      report_id: 'LR-04',
      student_id: getStudentId('24-2745-132'),
      room: 'Computer Center 9, Room 209',
      equipment: 'System Unit/CPU',
      unit_number: 'PC-#38',
      description: 'Front panel USB 3.0 ports failing to recognize flash drives.',
      status: 'Resolved',
      remarks: 'Reconnected front-panel motherboard header cable.',
      created_at: '2026-10-01T01:15:00.000Z',
      updated_at: '2026-10-01T02:30:00.000Z',
    },
    {
      report_id: 'LR-03',
      student_id: getStudentId('24-0132-062'),
      room: 'Computer Center 10, Room 210',
      equipment: 'Power (AVR/UPS/Outlet)',
      unit_number: 'PC-#25',
      description: 'UPS beeping continuously on AC power line.',
      status: 'Resolved',
      remarks: 'Battery calibrated and sensitivity potentiometer adjusted.',
      created_at: '2026-10-01T03:00:00.000Z',
      updated_at: '2026-10-01T04:30:00.000Z',
    },
    {
      report_id: 'LR-02',
      student_id: getStudentId('24-2026-106'),
      room: 'Computer Center 5, Room 206',
      equipment: 'Keyboard',
      unit_number: 'PC-#14',
      description: 'Multiple keys unresponsive after morning cleaning.',
      status: 'Resolved',
      remarks: 'Replacement keyboard issued from stock. Verified operational.',
      created_at: '2026-10-01T06:15:00.000Z',
      updated_at: '2026-10-01T07:30:00.000Z',
    },
    {
      report_id: 'LR-01',
      student_id: getStudentId('24-2026-107'),
      room: 'Computer Center 5, Room 204',
      equipment: 'Software/OS',
      unit_number: 'PC-#18',
      description: 'Operating system fails to boot into desktop; blue screen error encountered.',
      status: 'Resolved',
      remarks: 'OS re-imaged and updated. Verified operational.',
      created_at: '2026-10-01T08:45:00.000Z',
      updated_at: '2026-10-01T09:30:00.000Z',
    },
  ];

  console.log(`Seeding ${reportsData.length} reports...`);

  // 3. Clear existing reports to ensure clean sequence and accurate stats
  const { error: delErr } = await supabase.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    console.warn('Delete warning:', delErr.message);
  }

  // 4. Insert all 24 reports
  for (const report of reportsData) {
    const { error: insErr } = await supabase.from('reports').upsert(report, { onConflict: 'report_id' });
    if (insErr) {
      console.error(`Failed to insert ${report.report_id}:`, insErr.message);
    } else {
      console.log(`✅ Upserted ${report.report_id} (${report.equipment} - ${report.status})`);
    }
  }

  console.log('🎉 Successfully seeded 24 reports!');
}

seedReports();
