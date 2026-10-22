import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- 1. BACKING UP STUDENTS AND REPORTS DATA ---');
  const { data: students, error: stErr } = await supabase.from('students').select('*');
  if (stErr) console.error('Error fetching students:', stErr);
  else console.log(`Fetched ${students.length} students.`);

  const { data: reports, error: repErr } = await supabase.from('reports').select('*');
  if (repErr) console.error('Error fetching reports:', repErr);
  else console.log(`Fetched ${reports.length} reports.`);

  const { data: studentReports, error: srepErr } = await supabase.from('reports_of_student').select('*');
  if (srepErr) console.error('Error fetching reports_of_student:', srepErr);
  else console.log(`Fetched ${studentReports ? studentReports.length : 0} reports_of_student.`);

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ students, reports, studentReports }, null, 2));
  console.log(`Saved backup to ${backupFile}`);

  console.log('--- 2. CHECKING profile_photo COLUMN ON students TABLE ---');
  const { data: photoColCheck, error: photoColErr } = await supabase.from('students').select('profile_photo').limit(1);
  if (photoColErr) {
    console.log('profile_photo column check:', photoColErr.message);
  } else {
    console.log('profile_photo column ALREADY EXISTS!');
  }

  console.log('--- 3. CHECKING STORAGE BUCKETS ---');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  console.log('listBuckets:', bErr ? bErr.message : buckets);

  console.log('--- 4. CHECKING EXISTING AVATAR ASSETS ---');
  const avatarDir = path.resolve('src/assets/avatars');
  if (fs.existsSync(avatarDir)) {
    console.log('Existing avatar files:', fs.readdirSync(avatarDir));
  }
}

run().catch(console.error);
