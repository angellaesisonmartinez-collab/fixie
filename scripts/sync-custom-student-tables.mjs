import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAll() {
  console.log('========================================================');
  console.log('SYNCING CUSTOM STUDENT TABLES (phia-reports & jennelyn-reports)');
  console.log('========================================================');

  // 1. Fetch canonical reports table
  const { data: canonicalReports } = await supabase.from('reports').select('*');
  const repMap = new Map();
  canonicalReports.forEach(r => repMap.set(r.report_id, r));

  // 2. Update phia-reports
  console.log('\n--- Updating phia-reports table ---');
  const lr19Canonical = repMap.get('LR-19');
  const nowIso = new Date().toISOString();

  const { data: updPhia, error: pErr } = await supabase
    .from('phia-reports')
    .update({
      status: 'Resolved',
      remarks: 'Replaced video cable and reset display configuration.',
      updated_at: nowIso,
    })
    .eq('report_id', 'LR-19')
    .select();

  if (pErr) console.error('Error updating phia-reports:', pErr);
  else console.log('Successfully updated phia-reports LR-19:', updPhia);

  // 3. Update jennelyn-reports
  console.log('\n--- Updating jennelyn-reports table ---');
  const lr23Canonical = repMap.get('LR-23');

  const { data: updJen, error: jErr } = await supabase
    .from('jennelyn-reports')
    .update({
      status: 'On Hold',
      remarks: lr23Canonical?.remarks || 'Pending network diagnosis.',
      updated_at: nowIso,
    })
    .eq('report_id', 'LR-23')
    .select();

  if (jErr) console.error('Error updating jennelyn-reports:', jErr);
  else console.log('Successfully updated jennelyn-reports LR-23:', updJen);

  // 4. Check and sync any other student tables
  const allStudentTables = [
    'angel-reports',
    'phia-reports',
    'jennelyn-reports',
    'jazmin-reports',
    'juan-reports',
    'maria-reports',
    'emmanuel-reports',
    'alyssa-reports',
    'reyn-reports',
  ];

  console.log('\n--- Verifying all custom student tables ---');
  for (const t of allStudentTables) {
    const { data: rows, error } = await supabase.from(t).select('*');
    if (!error && rows) {
      for (const r of rows) {
        const can = repMap.get(r.report_id);
        if (can && r.status !== can.status) {
          console.log(`Syncing ${t} ${r.report_id}: ${r.status} -> ${can.status}`);
          await supabase.from(t).update({
            status: can.status,
            remarks: can.remarks,
            updated_at: nowIso,
          }).eq('report_id', r.report_id);
        }
      }
    }
  }

  // 5. Final check of phia-reports and jennelyn-reports
  console.log('\n--- FINAL VERIFICATION: phia-reports ---');
  const { data: finalPhia } = await supabase.from('phia-reports').select('report_id, status, remarks, updated_at');
  console.log(finalPhia);

  console.log('\n--- FINAL VERIFICATION: jennelyn-reports ---');
  const { data: finalJen } = await supabase.from('jennelyn-reports').select('report_id, status, remarks, updated_at');
  console.log(finalJen);
}

syncAll().catch(console.error);
