import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

// Unique, secure password per student meeting all 5 requirements:
// >= 8 chars, uppercase, lowercase, number, special character
export const STUDENT_CREDENTIALS = {
  '22-0941-301': { name: 'Alyssa Ramos', password: 'Alyssa!Fixie#22' },
  '24-0041-147': { name: 'Angel Lae Martinez', password: 'Angel!Fixie#24' },
  '24-2026-106': { name: 'Bianca Allyzon Antonio', password: 'Bianca#Fixie!26' },
  '24-2026-107': { name: 'Chryztel Geene Salvador', password: 'Geene!Fixie#27' },
  '24-0132-062': { name: 'Emmanuel Gaspar', password: 'Emman#Fixie!28' },
  '24-2745-132': { name: 'Jazmin Bayudan', password: 'Jazmin!Fixie#29' },
  '24-1003-101': { name: 'Jeane Kelly Mina', password: 'Jeane#Fixie!30' },
  '24-2026-340': { name: 'Jennelyn Vergara', password: 'Jenny!Fixie#31' },
  '24-2026-108': { name: 'John Lester Tan', password: 'Lester#Fixie!32' },
  '24-0031-267': { name: 'Juan Dela Cruz', password: 'Juan!Fixie#33' },
  '24-2026-109': { name: 'Justine Kate Abello', password: 'Kate#Fixie!34' },
  '24-0872-090': { name: 'Maria Ortiz', password: 'MOrtiz!Fixie#35' },
  '24-8521-063': { name: 'Maria Reyes', password: 'MReyes#Fixie!36' },
  '24-4011-088': { name: 'Phia Cayetano', password: 'Phia!Fixie#37' },
  '24-7345-853': { name: 'Reyn Arahan', password: 'Reyn#Fixie!38' },
};

async function updateExistingStudents() {
  console.log('--- Fetching all existing students from Supabase ---');
  const { data: students, error: fetchErr } = await supabase
    .from('students')
    .select('*');

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${students.length} students. Updating each account...`);

  for (const student of students) {
    const creds = STUDENT_CREDENTIALS[student.student_id];
    if (!creds) {
      console.warn(`No predefined credentials for ${student.student_id} (${student.name})`);
      continue;
    }

    const password_hash = bcrypt.hashSync(creds.password, 10);

    const { error: updateErr } = await supabase
      .from('students')
      .update({
        password_hash,
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', student.id);

    if (updateErr) {
      console.error(`Error updating student ${student.student_id}:`, updateErr.message);
    } else {
      console.log(`Updated ${student.student_id} (${student.name}): must_change_password=false, unique password hash set.`);
    }
  }

  console.log('\n--- Verifying final status of students ---');
  const { data: after, error: verifyErr } = await supabase
    .from('students')
    .select('student_id, name, email, status, must_change_password')
    .order('name');

  if (verifyErr) {
    console.error('Verify error:', verifyErr);
  } else {
    console.table(after);
  }
}

updateExistingStudents();
