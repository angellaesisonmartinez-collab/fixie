import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateLR30() {
  console.log('=== Step 1: Checking LR-30 in angel-reports ===');
  const { data: existingAngel, error: checkErr } = await supabase
    .from('angel-reports')
    .select('*')
    .eq('report_id', 'LR-30');

  if (checkErr) {
    console.error('Error checking angel-reports:', checkErr.message);
    return;
  }

  if (existingAngel && existingAngel.length > 0) {
    console.log('LR-30 already exists in angel-reports:', existingAngel[0]);
    return;
  }

  console.log('LR-30 is missing from angel-reports. Fetching from canonical reports and reports_of_student...');

  const { data: canonReport } = await supabase
    .from('reports')
    .select('*')
    .eq('report_id', 'LR-30')
    .maybeSingle();

  const { data: rosReport } = await supabase
    .from('reports_of_student')
    .select('*')
    .eq('report_id', 'LR-30')
    .maybeSingle();

  const { data: historyRows } = await supabase
    .from('report_status_history')
    .select('*')
    .eq('report_id', canonReport?.id)
    .order('created_at', { ascending: true });

  console.log('Canonical report found:', canonReport?.report_id, canonReport?.status);
  console.log('ROS report found:', rosReport?.report_id, rosReport?.status);
  console.log('History rows found:', historyRows?.length);

  const historyPayload = (historyRows || []).map(h => ({
    status: h.status,
    action: h.status,
    time: h.created_at,
    remarksText: h.remarks || null,
  }));

  const payload = {
    report_id: 'LR-30',
    student_id: '24-0041-147',
    student_uuid: '9002d8e6-bc03-4070-8aae-299147dead9a',
    student_name: 'Angel Lae Martinez',
    year_block: 'BSIT 3-2',
    unit_number: canonReport?.unit_number || rosReport?.unit_number || 'PC-#26',
    equipment: canonReport?.equipment || rosReport?.equipment || 'Network/Internet (Cable, Port, DNS)',
    computer_center: rosReport?.computer_center || 'Computer Center 6',
    room: rosReport?.room || 'Room 206',
    date_submitted: canonReport?.created_at || '2026-10-23T05:45:42+00:00',
    date_time: rosReport?.date_time || 'Oct 23, 2026, 01:45 PM',
    status: canonReport?.status || 'Reviewed',
    description: canonReport?.description || rosReport?.description || 'There seem to be a problem in the network, it suddenly became unavailable.',
    remarks: canonReport?.remarks || null,
    photo_url: canonReport?.photo_url || null,
    storage_folder: 'angel-reports',
    history: historyPayload.length > 0 ? historyPayload : (rosReport?.history || []),
    created_at: canonReport?.created_at || '2026-10-23T05:45:42+00:00',
    updated_at: canonReport?.updated_at || new Date().toISOString(),
  };

  console.log('=== Step 2: Inserting LR-30 into angel-reports ===');
  const { data: inserted, error: insErr } = await supabase
    .from('angel-reports')
    .insert([payload])
    .select();

  if (insErr) {
    console.error('Failed to insert LR-30 into angel-reports:', insErr.message);
  } else {
    console.log('SUCCESSFULLY inserted LR-30 into angel-reports:', inserted);
  }

  // Verification check
  const { data: verifyData } = await supabase
    .from('angel-reports')
    .select('report_id, status, student_id, student_name, created_at, updated_at')
    .eq('report_id', 'LR-30');

  console.log('=== Step 3: Verified in angel-reports ===', verifyData);
}

migrateLR30();
