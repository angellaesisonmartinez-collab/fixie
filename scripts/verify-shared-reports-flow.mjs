import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAllReportsViaSharedTable() {
  console.log('Testing Shared `reports` table access for all students & TP...');

  // 1. Fetch all reports with student relation as TP does
  const { data: allReports, error } = await supabase
    .from('reports')
    .select('*, students(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shared reports:', error);
    process.exit(1);
  }

  console.log(`\nTotal reports in shared table: ${allReports.length} (Expected: 30)`);
  if (allReports.length !== 30) {
    throw new Error(`Expected 30 reports, got ${allReports.length}`);
  }

  // 2. Group by student
  const studentReportsMap = {};
  for (const r of allReports) {
    const studentName = r.students ? `${r.students.first_name} ${r.students.last_name}` : 'Unknown';
    if (!studentReportsMap[studentName]) {
      studentReportsMap[studentName] = [];
    }
    studentReportsMap[studentName].push(r.report_id);
  }

  console.log('\nBreakdown by student:');
  for (const [name, rList] of Object.entries(studentReportsMap)) {
    console.log(`- ${name}: ${rList.length} reports -> [${rList.join(', ')}]`);
  }

  // Verify key student counts
  console.log('\nAsserting student counts:');
  const asserts = [
    ['Angel Lae Martinez', 16],
    ['Alyssa Ramos', 2],
    ['Phia Cayetano', 2],
    ['Chryztel Geene Salvador', 1],
    ['Jennelyn Vergara', 1],
    ['John Lester Tan', 1],
    ['Juan Dela Cruz', 1],
    ['Maria Reyes', 1],
    ['Maria Ortiz', 1],
    ['Bianca Allyzon Antonio', 1],
    ['Reyn Arahan', 1],
    ['Margaret Subong', 2],
  ];

  for (const [name, count] of asserts) {
    const actual = studentReportsMap[name]?.length || 0;
    if (actual !== count) {
      throw new Error(`Mismatch for ${name}: expected ${count}, got ${actual}`);
    }
    console.log(`✓ ${name}: ${actual}/${count} reports verified`);
  }

  // 3. Status History verification
  const { data: history, error: hErr } = await supabase
    .from('report_status_history')
    .select('*');

  if (hErr) {
    throw new Error(`Failed to fetch history: ${hErr.message}`);
  }
  console.log(`\nTotal status history entries: ${history.length} verified.`);

  console.log('\n=============================================');
  console.log('ALL VERIFICATIONS PASSED VIA SHARED `reports` TABLE!');
  console.log('=============================================');
}

testAllReportsViaSharedTable().catch(err => {
  console.error(err);
  process.exit(1);
});
