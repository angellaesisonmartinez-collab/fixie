import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

// Map of updates by report_status_history ID
// We want all timestamps in Manila time (UTC+8) to fall strictly between 7:00 AM and 9:00 PM
async function run() {
  console.log('Fetching all report_status_history...');
  const { data: history, error: hErr } = await supabase
    .from('report_status_history')
    .select('*')
    .order('created_at', { ascending: true });

  if (hErr) throw hErr;

  const { data: reports, error: rErr } = await supabase
    .from('reports')
    .select('id, report_id');
  if (rErr) throw rErr;

  const repMap = {};
  reports.forEach(r => repMap[r.id] = r.report_id);

  let updatedCount = 0;

  for (const h of history) {
    const d = new Date(h.created_at);
    const code = repMap[h.report_id] || h.report_id;
    const hourManila = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }).format(d), 10);
    
    // Check if out of lab hours (outside 7am - 9pm Manila)
    if (hourManila < 7 || hourManila >= 21) {
      let newDate = new Date(d);
      
      // Specifically handle the 16:40:xxZ cluster (which is 12:40 AM Manila)
      // When UTC hour is 16 and Manila date is Oct 18, 12:40 AM:
      // Subtracting 8 hours UTC makes it Oct 17, 08:40 UTC -> 4:40 PM Manila!
      if (d.getUTCHours() === 16 && (code.startsWith('LR-0') || code.startsWith('LR-1') || code.startsWith('LR-2'))) {
        if (code === 'LR-25') {
          // LR-25 Under Repair is 7:24 PM Oct 22 (11:24 UTC). Resolved was 16:24 UTC.
          // Set to 12:24 UTC -> 8:24 PM Manila
          newDate.setUTCHours(12);
        } else {
          // Default shift: subtract 8 hours from UTC hour (e.g. 16:40 UTC -> 08:40 UTC = 4:40 PM Manila)
          newDate.setUTCHours(8);
        }
      } else if (code === 'LR-19' && h.status === 'Resolved') {
        // Oct 22 17:30 UTC -> 1:30 AM Oct 23. Under repair was 7:30 PM, On hold was 7:35 PM.
        // Set to 12:30 UTC -> 8:30 PM Manila
        newDate.setUTCHours(12);
      } else if (code === 'LR-19' && h.status === 'Reviewed') {
        // Oct 14 21:48 UTC -> Oct 15 5:48 AM Manila
        // Change to Oct 15 01:48 UTC -> 9:48 AM Manila
        newDate.setUTCDate(15);
        newDate.setUTCHours(1);
      } else if (code === 'LR-12' && h.status === 'Reviewed') {
        // Oct 21 13:05 UTC (9:05 PM Manila) -> shift to 12:55 UTC (8:55 PM Manila)
        newDate.setUTCHours(12);
        newDate.setUTCMinutes(55);
      } else if (code === 'LR-11' && h.status === 'Reviewed') {
        // Oct 8 13:01 UTC (9:01 PM Manila) -> shift to 12:45 UTC (8:45 PM Manila)
        newDate.setUTCHours(12);
        newDate.setUTCMinutes(45);
      } else if (code === 'LR-11' && h.status === 'Under Repair') {
        // Oct 21 13:05 UTC (9:05 PM Manila) -> shift to 12:50 UTC (8:50 PM Manila)
        newDate.setUTCHours(12);
        newDate.setUTCMinutes(50);
      } else if (code === 'LR-05' && h.status === 'Under Repair') {
        // Oct 12 13:20 UTC (9:20 PM Manila) -> shift to 10:20 UTC (6:20 PM Manila)
        newDate.setUTCHours(10);
      } else if (code === 'LR-09' && h.status === 'Reviewed') {
        // Oct 6 17:17 UTC (1:17 AM Manila) -> shift to 09:17 UTC (5:17 PM Manila)
        newDate.setUTCHours(9);
      } else if (code === 'LR-08' && h.status === 'Reviewed') {
        // Oct 6 20:47 UTC (4:47 AM Manila) -> shift to 08:47 UTC (4:47 PM Manila)
        newDate.setUTCHours(8);
      } else if (code === 'LR-15' && h.status === 'Reviewed') {
        // Oct 9 18:58 UTC (2:58 AM Manila) -> shift to 08:58 UTC (4:58 PM Manila)
        newDate.setUTCHours(8);
      } else if (code === 'LR-16' && h.status === 'Reviewed') {
        // Oct 10 14:02 UTC (10:02 PM Manila) -> shift to 11:02 UTC (7:02 PM Manila)
        newDate.setUTCHours(11);
      } else if (code === 'LR-17' && h.status === 'Under Repair') {
        // Oct 13 19:46 UTC (3:46 AM Manila) -> shift to 09:46 UTC (5:46 PM Manila)
        newDate.setUTCHours(9);
      } else if ((code === 'LR-18' || code === 'LR-20') && h.status === 'Reviewed') {
        // Oct 13 15:36 UTC (11:36 PM Manila) -> shift to 09:36 UTC (5:36 PM Manila)
        newDate.setUTCHours(9);
      } else if (code === 'LR-21' && h.status === 'Under Repair') {
        // Oct 16 13:21 UTC (9:21 PM Manila) -> shift to 11:21 UTC (7:21 PM Manila)
        newDate.setUTCHours(11);
      } else if (code === 'LR-22' && h.status === 'Reviewed') {
        // Oct 15 20:17 UTC (4:17 AM Manila) -> shift to Oct 16 01:17 UTC (9:17 AM Manila)
        newDate.setUTCDate(16);
        newDate.setUTCHours(1);
      } else if (code === 'LR-22' && h.status === 'Under Repair') {
        // Oct 17 16:40 UTC -> shift to Oct 17 09:40 UTC (5:40 PM Manila)
        newDate.setUTCHours(9);
      } else if (code === 'LR-23' && h.status === 'Reviewed') {
        // Oct 17 16:40 UTC -> shift to Oct 17 09:40 UTC (5:40 PM Manila)
        newDate.setUTCHours(9);
      } else {
        // Generic fallback for any other out of hours:
        // If before 7 AM (hourManila < 7), shift to 9:00 AM Manila (01:00 UTC)
        // If after 9 PM (hourManila >= 21), shift to 8:30 PM Manila (12:30 UTC)
        if (hourManila < 7) {
          newDate.setUTCHours(1);
          newDate.setUTCMinutes(0);
        } else {
          newDate.setUTCHours(12);
          newDate.setUTCMinutes(30);
        }
      }

      const iso = newDate.toISOString();
      const newHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }).format(newDate), 10);
      const newStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(newDate);
      
      console.log(`Updating ${code} [${h.status}]: was ${h.created_at} -> now ${iso} (${newStr}, hour=${newHour})`);
      
      const { error: uErr } = await supabase
        .from('report_status_history')
        .update({ created_at: iso })
        .eq('id', h.id);

      if (uErr) {
        console.error(`Failed to update ${h.id}:`, uErr);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} rows in report_status_history.`);

  // Also synchronize reports_of_student JSON history if it exists
  console.log('Checking reports_of_student for history sync...');
  const { data: studentReports, error: sErr } = await supabase
    .from('reports_of_student')
    .select('id, report_id, history');

  if (!sErr && studentReports && studentReports.length > 0) {
    // Re-fetch all updated history
    const { data: allHistory } = await supabase
      .from('report_status_history')
      .select('*')
      .order('created_at', { ascending: true });

    const historyByReportId = {};
    for (const h of (allHistory || [])) {
      if (!historyByReportId[h.report_id]) historyByReportId[h.report_id] = [];
      historyByReportId[h.report_id].push(h);
    }

    for (const sr of studentReports) {
      const matchHist = historyByReportId[sr.id] || historyByReportId[sr.report_id];
      if (matchHist && matchHist.length > 0) {
        const formattedHistory = matchHist.map(h => ({
          id: h.id,
          status: h.status,
          date: new Date(h.created_at).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }),
          time: new Date(h.created_at).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }),
          created_at: h.created_at,
          notes: h.notes || null,
          changed_by: h.changed_by || null
        }));

        await supabase
          .from('reports_of_student')
          .update({ history: formattedHistory })
          .eq('id', sr.id);
      }
    }
    console.log('Synchronized reports_of_student history.');
  }
}

run().catch(console.error);
