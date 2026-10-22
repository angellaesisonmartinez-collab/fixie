import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTrigger() {
  console.log('Testing whether Supabase has a database trigger on reports table...');

  // Create test report
  const now = new Date().toISOString();
  const { data: rep, error: repErr } = await supabase.from('reports').insert({
    report_id: 'TRIGGER-TEST',
    student_id: '9002d8e6-bc03-4070-8aae-299147dead9a',
    room: 'Room 204',
    equipment: 'Monitor',
    unit_number: 'PC-01',
    description: 'Test description',
    status: 'Submitted',
    created_at: now
  }).select().maybeSingle();

  if (repErr) {
    console.error('Insert error:', repErr);
    return;
  }
  console.log('Created report TRIGGER-TEST, ID:', rep.id);

  // Check history immediately
  const { data: hist1 } = await supabase.from('report_status_history').select('*').eq('report_id', rep.id);
  console.log('History rows after INSERT into reports (without manual rsh insert):', hist1.length);
  hist1.forEach(h => console.log('   -> status:', h.status));

  // Now update reports status to Reviewed
  await supabase.from('reports').update({ status: 'Reviewed', updated_at: new Date().toISOString() }).eq('id', rep.id);

  // Check history immediately
  const { data: hist2 } = await supabase.from('report_status_history').select('*').eq('report_id', rep.id);
  console.log('History rows after UPDATE reports status to Reviewed (without manual rsh insert):', hist2.length);
  hist2.forEach(h => console.log('   -> status:', h.status, 'remarks:', h.remarks));

  // Now update reports status to On Hold with remarks
  await supabase.from('reports').update({ status: 'On Hold', remarks: 'Awaiting parts', updated_at: new Date().toISOString() }).eq('id', rep.id);
  const { data: hist3 } = await supabase.from('report_status_history').select('*').eq('report_id', rep.id);
  console.log('History rows after UPDATE to On Hold:', hist3.length);
  hist3.forEach(h => console.log('   -> status:', h.status, 'remarks:', h.remarks));

  // Cleanup
  await supabase.from('report_status_history').delete().eq('report_id', rep.id);
  await supabase.from('reports').delete().eq('id', rep.id);
}

testTrigger();
