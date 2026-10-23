import { supabase } from '../src/lib/supabase.js';
import bcrypt from 'bcryptjs';

async function testLogin(identifier, password) {
  const trimmedIdentifier = identifier.trim();
  let studentRecord = null;
  if (/^\d{2}-\d{4}-\d{3}$/.test(trimmedIdentifier)) {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', trimmedIdentifier)
      .maybeSingle();
    studentRecord = data;
  } else if (trimmedIdentifier.includes('@')) {
    const [userPart, domainPart] = trimmedIdentifier.split('@');
    const { data: candidates } = await supabase
      .from('students')
      .select('*')
      .or(`email.eq.${trimmedIdentifier},email.ilike.${userPart}+%@${domainPart}`)
      .limit(10);
    if (candidates && candidates.length > 0) {
      const matched = candidates.find((c) => {
        try {
          return c.password_hash && bcrypt.compareSync(password, c.password_hash);
        } catch {
          return false;
        }
      });
      studentRecord = matched || candidates[0];
    }
  }

  console.log(`\n--- Test identifier: "${identifier}" with password: "${password}" ---`);
  if (!studentRecord) {
    console.log('Result: Student record NOT found in database.');
    return;
  }
  console.log(`Found: [${studentRecord.student_id}] ${studentRecord.name} (${studentRecord.email})`);
  const isMatch = studentRecord.password_hash && bcrypt.compareSync(password, studentRecord.password_hash);
  console.log(`Password match: ${isMatch}`);
  console.log(`Account status: ${studentRecord.status}`);
  console.log(`must_change_password: ${studentRecord.must_change_password}`);
}

async function run() {
  await testLogin('24-1234-123', 'Margaret!Fixie#12');
  await testLogin('24-0041-147', 'Angel!Fixie#24');
  await testLogin('24-4011-088', 'Phia!Fixie#37');
  await testLogin('martinezangellaewup@gmail.com', 'Margaret!Fixie#12');
  await testLogin('martinezangellaewup@gmail.com', 'Angel!Fixie#24');
}

run();
