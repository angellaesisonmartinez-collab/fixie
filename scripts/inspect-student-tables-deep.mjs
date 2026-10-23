import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

// List of all students and possible names from the prompt and codebase:
// alyssa-reports, angel-reports, bianca-reports, chryztel-reports, emmanuel-reports, jazmin-reports, jeane-reports, jennelyn-reports, john-reports, juan-reports, justine-reports, maria-reports, maria_ortiz-reports, phia-reports, reyn-reports
async function inspectTables() {
  const { data: students, error: sErr } = await supabase.from('students').select('*');
  console.log(`Fetched ${students?.length || 0} students.`);

  // Generate candidate table names from students + prompt
  const candidateTables = new Set([
    'alyssa-reports',
    'angel-reports',
    'bianca-reports',
    'chryztel-reports',
    'emmanuel-reports',
    'jazmin-reports',
    'jeane-reports',
    'jennelyn-reports',
    'john-reports',
    'juan-reports',
    'justine-reports',
    'maria-reports',
    'maria_ortiz-reports',
    'maria-ortiz-reports',
    'phia-reports',
    'reyn-reports',
    'reports',
    'reports_of_student',
    'report_status_history'
  ]);

  if (students) {
    for (const s of students) {
      const first = (s.first_name || '').toLowerCase().trim();
      const last = (s.last_name || '').toLowerCase().trim();
      const full = (s.name || `${first} ${last}`).toLowerCase().trim();
      if (first) {
        candidateTables.add(`${first}-reports`);
        candidateTables.add(`${first}_reports`);
      }
      if (last) {
        candidateTables.add(`${last}-reports`);
      }
      if (first && last) {
        candidateTables.add(`${first}-${last}-reports`);
        candidateTables.add(`${first}_${last}-reports`);
        candidateTables.add(`${first}_${last}_reports`);
      }
    }
  }

  console.log(`Checking ${candidateTables.size} candidate table names...`);
  const existingTables = [];
  const tableDataMap = {};

  for (const tableName of candidateTables) {
    const { data, error } = await supabase.from(tableName).select('*');
    if (!error) {
      existingTables.push(tableName);
      tableDataMap[tableName] = data;
      console.log(`[EXISTS] Table "${tableName}": ${data.length} records`);
    } else {
      // If error is not table not found, log it
      if (!error.message.includes('relation') && !error.message.includes('does not exist')) {
        console.log(`[ERROR] Table "${tableName}": ${error.message}`);
      }
    }
  }

  console.log('\n=== Summary of Existing Tables ===');
  console.log(existingTables);

  // Now compare records with shared 'reports' table
  const sharedReports = tableDataMap['reports'] || [];
  console.log(`\nShared reports table count: ${sharedReports.length}`);
  const sharedIds = new Set(sharedReports.map(r => r.report_id || r.id));
  const sharedDbUuids = new Set(sharedReports.map(r => r.id));

  const individualStudentTables = existingTables.filter(t => t !== 'reports' && t !== 'reports_of_student' && t !== 'report_status_history');
  console.log('\n=== Comparing Individual Student Tables with Shared `reports` Table ===');

  let totalStudentTableRecords = 0;
  let missingInShared = [];

  for (const tName of individualStudentTables) {
    const records = tableDataMap[tName];
    totalStudentTableRecords += records.length;
    console.log(`\n--- Table: ${tName} (${records.length} records) ---`);
    for (const rec of records) {
      const repCode = rec.report_id || rec.id;
      const matched = sharedReports.find(sr => (sr.report_id && sr.report_id === repCode) || sr.id === rec.id || sr.id === rec.student_uuid);
      if (matched) {
        console.log(`  ✓ ${repCode}: Matched in shared reports (status: "${matched.status}", student_id: "${matched.student_id}")`);
      } else {
        console.log(`  ✗ ${repCode}: MISSING from shared reports! Full data:`, rec);
        missingInShared.push({ table: tName, record: rec });
      }
    }
  }

  console.log(`\nTotal student-specific table records: ${totalStudentTableRecords}`);
  console.log(`Missing records in shared table: ${missingInShared.length}`);
}

inspectTables();
