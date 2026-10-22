import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

const supabase = createClient(supabaseUrl, supabaseKey);

function parseDateTimeToManilaIso(dtStr) {
  if (!dtStr) return null;
  // e.g. "Oct 17, 2026, 3:45 PM" or "Oct 02, 2026, 8:15 AM"
  const match = dtStr.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const [_, mStr, dStr, yStr, hrStr, minStr, ampm] = match;
  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const month = months[mStr.toLowerCase()];
  const day = dStr.padStart(2, '0');
  const year = yStr;
  let hour = parseInt(hrStr, 10);
  if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
  if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
  const hourFormatted = String(hour).padStart(2, '0');
  
  // Philippine Time is UTC+8:00
  const isoWithOffset = `${year}-${month}-${day}T${hourFormatted}:${minStr}:00+08:00`;
  const d = new Date(isoWithOffset);
  return {
    isoWithOffset,
    utcIso: d.toISOString(),
  };
}

async function fixStudentReportsDates() {
  console.log('Fetching all reports from reports_of_student...');
  const { data: rows, error } = await supabase
    .from('reports_of_student')
    .select('report_id, date_time, date_submitted, created_at');

  if (error) {
    console.error('Error fetching rows:', error);
    return;
  }

  console.log(`Found ${rows.length} rows. Updating timestamps to authentic Manila laboratory hours...`);

  for (const row of rows) {
    const parsed = parseDateTimeToManilaIso(row.date_time);
    if (!parsed) {
      console.warn(`Could not parse date_time for ${row.report_id}: "${row.date_time}"`);
      continue;
    }

    const { error: updateErr } = await supabase
      .from('reports_of_student')
      .update({
        date_submitted: parsed.utcIso,
        created_at: parsed.utcIso,
      })
      .eq('report_id', row.report_id);

    if (updateErr) {
      console.error(`Failed to update ${row.report_id}:`, updateErr);
    } else {
      console.log(`Updated ${row.report_id}: ${row.date_time} -> ${parsed.utcIso} (${parsed.isoWithOffset})`);
    }
  }

  console.log('Finished updating reports_of_student.');
}

fixStudentReportsDates();
