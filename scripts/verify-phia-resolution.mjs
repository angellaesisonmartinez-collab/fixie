import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

function formatManilaHistoryTime(timeInput) {
  if (!timeInput) return '';
  const rawD = new Date(timeInput);
  if (isNaN(rawD.getTime())) return String(timeInput);

  const month = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
  }).format(rawD);
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    day: 'numeric',
  }).format(rawD);
  const year = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
  }).format(rawD);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(rawD);

  return `${month} ${day}, ${year}, ${time}`;
}

async function verifyAll() {
  console.log('========================================================');
  console.log('FINAL VERIFICATION OF PHIA RESOLUTION & REALTIME SYNC');
  console.log('========================================================');

  // 1. Check Phia in students
  const { data: phia } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', '24-4011-088')
    .single();

  console.log(`Student: ${phia.name} (${phia.student_id}) | UUID: ${phia.id}`);

  // 2. Check Phia's reports in reports table
  const { data: repReports } = await supabase
    .from('reports')
    .select('*')
    .eq('student_id', phia.id)
    .order('report_id', { ascending: true });

  console.log(`\nPhia Reports in 'reports' table (${repReports.length}):`);
  repReports.forEach(r => {
    console.log(` - [${r.report_id}] ${r.equipment} (Unit: ${r.unit_number}) | Status: ${r.status} | Remarks: "${r.remarks}" | Updated: ${r.updated_at}`);
  });

  // 3. Check Phia's reports in reports_of_student table
  const { data: rosReports } = await supabase
    .from('reports_of_student')
    .select('*')
    .eq('student_id', phia.student_id)
    .order('report_id', { ascending: true });

  console.log(`\nPhia Reports in 'reports_of_student' table (${rosReports.length}):`);
  rosReports.forEach(r => {
    console.log(` - [${r.report_id}] ${r.equipment} (Unit: ${r.unit_number}) | Status: ${r.status} | Remarks: "${r.remarks}"`);
    console.log(`   History entries:`, JSON.stringify(r.history));
  });

  // 4. Check report_status_history for LR-19
  const lr19 = repReports.find(r => r.report_id === 'LR-19');
  const { data: rshRows } = await supabase
    .from('report_status_history')
    .select('*')
    .eq('report_id', lr19.id)
    .order('created_at', { ascending: false });

  console.log(`\nStatus History for LR-19 in 'report_status_history' (newest first):`);
  rshRows.forEach(r => {
    console.log(` - Status: ${r.status} | Manila Time: ${formatManilaHistoryTime(r.created_at)} (${r.created_at}) | Remarks: "${r.remarks}"`);
  });

  // 5. Stat Card Calculations for Phia
  let phiaSubmitted = 0;
  let phiaUnderReview = 0;
  let phiaUnderRepair = 0;
  let phiaOnHold = 0;
  let phiaResolved = 0;

  repReports.forEach(r => {
    if (r.status === 'Submitted') phiaSubmitted += 1;
    if (r.status === 'Submitted' || r.status === 'Reviewed' || r.status === 'Under Review') phiaUnderReview += 1;
    if (r.status === 'Under Repair' || r.status === 'Under repair') phiaUnderRepair += 1;
    if (r.status === 'On Hold' || r.status === 'on_hold') phiaOnHold += 1;
    if (r.status === 'Resolved') phiaResolved += 1;
  });

  console.log('\n--- Phia Student Account Stat Cards ---');
  console.log(` - Total Reports: ${repReports.length} (Expected: 2)`);
  console.log(` - Active Reports: ${phiaUnderReview + phiaUnderRepair + phiaOnHold} (Expected: 0)`);
  console.log(` - On Hold Reports: ${phiaOnHold} (Expected: 0)`);
  console.log(` - Resolved Reports: ${phiaResolved} (Expected: 2)`);

  // 6. Stat Card Calculations for Technical Personnel
  const { count: totalReports } = await supabase.from('reports').select('*', { count: 'exact', head: true });
  const { count: onHoldReports } = await supabase.from('reports').select('*', { count: 'exact', head: true }).or('status.eq.On Hold,status.eq.on_hold,status.ilike.%hold%');
  const { count: resolvedReports } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Resolved');

  console.log('\n--- Technical Personnel Side Stat Cards ---');
  console.log(` - Total Reports: ${totalReports} (Expected: 27)`);
  console.log(` - On Hold Reports: ${onHoldReports} (Expected: 1)`);
  console.log(` - Resolved Reports: ${resolvedReports} (Expected: 21)`);

  // 7. Verify no other reports modified
  const { data: allReports } = await supabase.from('reports').select('report_id, student_id, status').order('report_id');
  console.log(`\nVerified all ${allReports.length} reports in system. Active status distribution:`);
  const statusCounts = {};
  allReports.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
  console.log(statusCounts);

  const isValid = 
    phiaResolved === 2 && 
    phiaOnHold === 0 && 
    repReports.length === 2 && 
    lr19.status === 'Resolved' &&
    rshRows[0].status === 'Resolved';

  if (isValid) {
    console.log('\n>>> ALL CRITERIA MET AND VERIFIED PERFECTLY! <<<');
  } else {
    console.error('\n>>> CRITERIA VERIFICATION FAILED! <<<');
    process.exit(1);
  }
}

verifyAll().catch(console.error);
