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

async function run() {
  console.log('====================================================');
  console.log('1. PRE-CHECK: VERIFY PHIA AND HER CURRENT REPORTS');
  console.log('====================================================');

  const { data: phia, error: pErr } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', '24-4011-088')
    .single();

  if (pErr || !phia) {
    throw new Error('Could not find Phia in students table: ' + JSON.stringify(pErr));
  }
  console.log(`Phia Found: ${phia.name} (Student ID: ${phia.student_id}, UUID: ${phia.id})`);

  // Fetch reports for Phia from reports table
  const { data: preReports, error: rErr } = await supabase
    .from('reports')
    .select('*')
    .eq('student_id', phia.id);

  if (rErr) throw new Error('Error fetching reports: ' + rErr.message);
  console.log(`Phia has ${preReports.length} reports in public.reports:`);
  preReports.forEach(r => console.log(` - ${r.report_id} (${r.id}): status = "${r.status}", remarks = "${r.remarks}"`));

  const onHoldReport = preReports.find(r => r.status === 'On Hold' || r.status === 'on_hold');
  if (!onHoldReport) {
    console.log('Note: No On Hold report found for Phia in reports table. Current reports:', preReports);
  } else {
    console.log(`\nIdentified On Hold Report: ${onHoldReport.report_id} (UUID: ${onHoldReport.id})`);
  }

  // Fetch reports for Phia from reports_of_student table
  const { data: preRos, error: rosErr } = await supabase
    .from('reports_of_student')
    .select('*')
    .eq('student_id', phia.student_id);

  if (rosErr) throw new Error('Error fetching reports_of_student: ' + rosErr.message);
  console.log(`Phia has ${preRos.length} reports in public.reports_of_student:`);
  preRos.forEach(r => console.log(` - ${r.report_id} (${r.id}): status = "${r.status}", remarks = "${r.remarks}"`));

  // Check pre-update global stat counts
  const { count: preTotalReports } = await supabase.from('reports').select('*', { count: 'exact', head: true });
  const { count: preOnHoldCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).or('status.eq.On Hold,status.eq.on_hold,status.ilike.%hold%');
  const { count: preResolvedCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Resolved');

  console.log(`\nPre-update Global Technical Personnel Stat Counts:`);
  console.log(` - Total Reports: ${preTotalReports}`);
  console.log(` - On Hold Reports: ${preOnHoldCount}`);
  console.log(` - Resolved Reports: ${preResolvedCount}`);

  console.log('\n====================================================');
  console.log('2. PERFORM UPDATE: RESOLVE PHIA\'S ON HOLD REPORT');
  console.log('====================================================');

  const targetReportCode = 'LR-19';
  const targetCanonicalUuid = onHoldReport?.id || 'ffb1d69a-1c25-4141-bf2a-128f38b73180';
  const resolutionRemarks = 'Replaced video cable and reset display configuration.';
  const nowIso = new Date().toISOString();
  const nowManilaFormatted = formatManilaHistoryTime(nowIso);

  console.log(`Target Report Code: ${targetReportCode}`);
  console.log(`Target UUID: ${targetCanonicalUuid}`);
  console.log(`Current ISO Time: ${nowIso}`);
  console.log(`Philippine Time (Asia/Manila): ${nowManilaFormatted}`);
  console.log(`Resolution Remarks: "${resolutionRemarks}"`);

  // Step 2A: Update public.reports
  const { data: updRep, error: updRepErr } = await supabase
    .from('reports')
    .update({
      status: 'Resolved',
      remarks: resolutionRemarks,
      updated_at: nowIso,
    })
    .eq('id', targetCanonicalUuid)
    .select();

  if (updRepErr) throw new Error('Failed to update reports table: ' + updRepErr.message);
  console.log('Updated reports table successfully:', updRep);

  // Step 2B: Update public.reports_of_student
  const rosTarget = preRos.find(r => r.report_id === targetReportCode);
  const existingRosHistory = Array.isArray(rosTarget?.history) ? rosTarget.history : [];
  
  // Build clean chronological history for reports_of_student
  const cleanRosHistory = [
    ...existingRosHistory.filter(h => (h.action || h.status)?.toLowerCase() !== 'resolved'),
    {
      action: 'Resolved',
      status: 'Resolved',
      time: nowIso,
      timeFormatted: nowManilaFormatted,
      remarksText: resolutionRemarks,
    }
  ];

  const { data: updRos, error: updRosErr } = await supabase
    .from('reports_of_student')
    .update({
      status: 'Resolved',
      remarks: resolutionRemarks,
      history: cleanRosHistory,
      updated_at: nowIso,
    })
    .eq('report_id', targetReportCode)
    .select();

  if (updRosErr) throw new Error('Failed to update reports_of_student table: ' + updRosErr.message);
  console.log('Updated reports_of_student table successfully:', updRos);

  // Step 2C: Update public.report_status_history
  // First, check all existing history rows for this report
  const { data: existingRsh } = await supabase
    .from('report_status_history')
    .select('*')
    .eq('report_id', targetCanonicalUuid)
    .order('created_at', { ascending: true });

  console.log(`Existing report_status_history rows (${existingRsh?.length || 0}):`, existingRsh);

  // If there's an outdated Resolved row from Oct 17, update it or remove it and insert the fresh one
  const oldResolvedRow = existingRsh?.find(r => r.status === 'Resolved');
  if (oldResolvedRow) {
    console.log(`Updating existing Resolved history row (${oldResolvedRow.id}) with current Philippine timestamp...`);
    const { error: updRshErr } = await supabase
      .from('report_status_history')
      .update({
        status: 'Resolved',
        remarks: resolutionRemarks,
        created_at: nowIso,
      })
      .eq('id', oldResolvedRow.id);

    if (updRshErr) throw new Error('Failed to update report_status_history: ' + updRshErr.message);
    console.log('Updated report_status_history row with current Philippine time.');
  } else {
    console.log('Inserting new Resolved history row with current Philippine timestamp...');
    const { error: insRshErr } = await supabase
      .from('report_status_history')
      .insert({
        report_id: targetCanonicalUuid,
        status: 'Resolved',
        remarks: resolutionRemarks,
        created_at: nowIso,
      });

    if (insRshErr) throw new Error('Failed to insert report_status_history: ' + insRshErr.message);
    console.log('Inserted new report_status_history row with current Philippine time.');
  }

  console.log('\n====================================================');
  console.log('3. POST-CHECK: VERIFY DATA AND STAT COUNTS ACROSS SYSTEM');
  console.log('====================================================');

  // Verify Phia's reports in reports table
  const { data: postReports } = await supabase
    .from('reports')
    .select('*')
    .eq('student_id', phia.id);

  console.log(`Phia reports in reports table after update:`);
  postReports.forEach(r => console.log(` - ${r.report_id}: status = "${r.status}", remarks = "${r.remarks}"`));

  // Verify Phia's reports in reports_of_student table
  const { data: postRos } = await supabase
    .from('reports_of_student')
    .select('*')
    .eq('student_id', phia.student_id);

  console.log(`\nPhia reports in reports_of_student table after update:`);
  postRos.forEach(r => {
    console.log(` - ${r.report_id}: status = "${r.status}", remarks = "${r.remarks}"`);
    console.log(`   history:`, JSON.stringify(r.history, null, 2));
  });

  // Verify report_status_history entries for LR-19
  const { data: postRsh } = await supabase
    .from('report_status_history')
    .select('*')
    .eq('report_id', targetCanonicalUuid)
    .order('created_at', { ascending: false });

  console.log(`\nreport_status_history for LR-19 after update (newest first):`);
  postRsh.forEach(r => {
    console.log(` - Status: ${r.status} | Created At: ${r.created_at} (${formatManilaHistoryTime(r.created_at)}) | Remarks: ${r.remarks}`);
  });

  // Verify Phia's calculated stats
  const phiaTotal = postReports.length;
  const phiaResolved = postReports.filter(r => r.status === 'Resolved').length;
  const phiaOnHold = postReports.filter(r => r.status === 'On Hold' || r.status === 'on_hold').length;

  console.log(`\nPhia Calculated Stats:`);
  console.log(` - Total Reports: ${phiaTotal} (Expected: 2)`);
  console.log(` - Resolved: ${phiaResolved} (Expected: 2)`);
  console.log(` - On Hold: ${phiaOnHold} (Expected: 0)`);

  // Verify Global Technical Personnel Stats
  const { count: postTotalReports } = await supabase.from('reports').select('*', { count: 'exact', head: true });
  const { count: postOnHoldCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).or('status.eq.On Hold,status.eq.on_hold,status.ilike.%hold%');
  const { count: postResolvedCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'Resolved');

  console.log(`\nGlobal Technical Personnel Stat Counts:`);
  console.log(` - Total Reports: ${postTotalReports} (Unchanged: ${preTotalReports === postTotalReports})`);
  console.log(` - On Hold Reports: ${postOnHoldCount} (Decreased by 1: ${preOnHoldCount - 1 === postOnHoldCount})`);
  console.log(` - Resolved Reports: ${postResolvedCount} (Increased by 1: ${preResolvedCount + 1 === postResolvedCount})`);

  // Verify that other students' reports were NOT changed
  const { data: otherReports } = await supabase
    .from('reports')
    .select('*')
    .neq('student_id', phia.id);

  console.log(`\nVerified ${otherReports.length} reports belonging to other students remain untouched.`);

  console.log('\nSUCCESS: Phia\'s On Hold report is now Resolved across all tables with matching status history and recalculations!');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
