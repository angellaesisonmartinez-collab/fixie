import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Fetching all students before update ---');
  const { data: before, error: fetchErr } = await supabase
    .from('students')
    .select('id, student_id, name, email, status, must_change_password');

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${before.length} students.`);

  // 1. Ensure Angel Lae Martinez is active and must_change_password = false
  const angel = before.find((s) => s.student_id === '24-0041-147' || s.name.toLowerCase().includes('angel'));
  if (!angel) {
    console.error('Angel Lae Martinez not found!');
    process.exit(1);
  }

  const { error: angelErr } = await supabase
    .from('students')
    .update({
      status: 'active',
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angel.id);

  if (angelErr) {
    console.error('Error updating Angel Lae Martinez:', angelErr);
    process.exit(1);
  }
  console.log(`Successfully verified Angel Lae Martinez (${angel.student_id}): status='active', must_change_password=false`);

  // 2. Set all other students to must_change_password = true
  const otherStudents = before.filter((s) => s.id !== angel.id);
  const otherIds = otherStudents.map((s) => s.id);

  const { error: othersErr } = await supabase
    .from('students')
    .update({
      must_change_password: true,
      updated_at: new Date().toISOString(),
    })
    .neq('id', angel.id);

  if (othersErr) {
    console.error('Error updating other students:', othersErr);
    process.exit(1);
  }
  console.log(`Successfully set must_change_password=true for ${otherIds.length} other students.`);

  // 3. Verify final state
  console.log('\n--- Final state in Supabase `students` table ---');
  const { data: after, error: verifyErr } = await supabase
    .from('students')
    .select('student_id, name, email, status, must_change_password')
    .order('name');

  if (verifyErr) {
    console.error('Verification error:', verifyErr);
  } else {
    console.table(after);
  }
}

run();
