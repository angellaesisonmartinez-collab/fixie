import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateStudentsDates() {
  console.log('🔄 Updating students dates to September 01-10 in Supabase...');

  const studentUpdates = [
    // Page 1 (8 active students in UI)
    {
      student_id: '24-0041-147',
      name: 'Angel Lae Martinez',
      first_name: 'Angel Lae',
      middle_name: 'Santos',
      last_name: 'Martinez',
      year_block: '3rd year, BLK 2',
      email: 'angellae@gmail.com',
      date_registered: '2026-09-10',
      created_at: '2026-09-10T08:30:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    {
      student_id: '24-2026-340',
      name: 'Jennelyn Vergara',
      first_name: 'Jennelyn',
      middle_name: 'Garcia',
      last_name: 'Vergara',
      year_block: '3rd year, BLK 2',
      email: 'jennelyn@gmail.com',
      date_registered: '2026-09-10',
      created_at: '2026-09-10T08:15:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    {
      student_id: '24-7345-853',
      name: 'Reyn Arahan',
      first_name: 'Reyn',
      middle_name: null,
      last_name: 'Arahan',
      year_block: '3rd year, BLK 1',
      email: 'reyn.arahan@gmail.com',
      date_registered: '2026-09-09',
      created_at: '2026-09-09T09:00:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    {
      student_id: '24-0031-267',
      name: 'Juan Dela Cruz',
      first_name: 'Juan',
      middle_name: 'Navarro',
      last_name: 'Dela Cruz',
      year_block: '2nd year, BLK 2',
      email: 'juan.delacruz@gmail.com',
      date_registered: '2026-09-08',
      created_at: '2026-09-08T14:00:00.000Z',
      status: 'active',
      must_change_password: true,
    },
    {
      student_id: '24-8521-063',
      name: 'Maria Reyes',
      first_name: 'Maria',
      middle_name: 'Clara',
      last_name: 'Reyes',
      year_block: '1st year, BLK 1',
      email: 'maria.reyes@gmail.com',
      date_registered: '2026-09-08',
      created_at: '2026-09-08T10:00:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    {
      student_id: '24-1003-101',
      name: 'Jeane Kelly Mina',
      first_name: 'Jeane Kelly',
      middle_name: 'Ramos',
      last_name: 'Mina',
      year_block: '3rd year, BLK 2',
      email: 'jeanekelly@gmail.com',
      date_registered: '2026-09-07',
      created_at: '2026-09-07T16:00:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    {
      student_id: '24-2745-132',
      name: 'Jazmin Bayudan',
      first_name: 'Jazmin',
      middle_name: 'Dela Cruz',
      last_name: 'Bayudan',
      year_block: '3rd year, BLK 2',
      email: 'jazmin@gmail.com',
      date_registered: '2026-09-07',
      created_at: '2026-09-07T11:00:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    {
      student_id: '24-0132-062',
      name: 'Emmanuel Gaspar',
      first_name: 'Emmanuel',
      middle_name: 'Bautista',
      last_name: 'Gaspar',
      year_block: '3rd year, BLK 1',
      email: 'emmang@gmail.com',
      date_registered: '2026-09-06',
      created_at: '2026-09-06T10:00:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    // Page 2 (4 active students)
    {
      student_id: '24-2026-106',
      name: 'Bianca Allyzon Antonio',
      first_name: 'Bianca Allyzon',
      middle_name: 'Reyes',
      last_name: 'Antonio',
      year_block: '3rd year, BLK 1',
      email: 'bianca@gmail.com',
      date_registered: '2026-09-05',
      created_at: '2026-09-05T10:00:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    {
      student_id: '24-2026-107',
      name: 'Chryztel Geene Salvador',
      first_name: 'Chryztel Geene',
      middle_name: 'Flores',
      last_name: 'Salvador',
      year_block: '3rd year, BLK 1',
      email: 'geene@gmail.com',
      date_registered: '2026-09-04',
      created_at: '2026-09-04T10:00:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    {
      student_id: '24-2026-108',
      name: 'John Lester Tan',
      first_name: 'John Lester',
      middle_name: 'Mercado',
      last_name: 'Tan',
      year_block: '3rd year, BLK 1',
      email: 'lester@gmail.com',
      date_registered: '2026-09-03',
      created_at: '2026-09-03T10:00:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    {
      student_id: '24-2026-109',
      name: 'Justine Kate Abello',
      first_name: 'Justine Kate',
      middle_name: 'Castro',
      last_name: 'Abello',
      year_block: '3rd year, BLK 2',
      email: 'kate@gmail.com',
      date_registered: '2026-09-02',
      created_at: '2026-09-02T10:00:00.000Z',
      status: 'active',
      must_change_password: false,
    },
    // Disabled account (1 student)
    {
      student_id: '22-0941-301',
      name: 'Alyssa Ramos',
      first_name: 'Alyssa',
      middle_name: 'Mae',
      last_name: 'Ramos',
      year_block: '1st year, BLK 1',
      email: 'alyssa.ramos@gmail.com',
      date_registered: '2026-09-01',
      created_at: '2026-09-01T10:00:00.000Z',
      status: 'disabled',
      must_change_password: false,
    },
  ];

  for (const st of studentUpdates) {
    const { error } = await supabase
      .from('students')
      .upsert(
        {
          student_id: st.student_id,
          name: st.name,
          first_name: st.first_name,
          middle_name: st.middle_name,
          last_name: st.last_name,
          year_block: st.year_block,
          email: st.email,
          date_registered: st.date_registered,
          created_at: st.created_at,
          must_change_password: st.must_change_password,
          status: st.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      );

    if (error) {
      console.error(`Error updating ${st.student_id}:`, error.message);
    } else {
      console.log(`✅ ${st.student_id} -> ${st.date_registered} (${st.status})`);
    }
  }

  // Verify
  const { data: all } = await supabase
    .from('students')
    .select('student_id, name, date_registered, status, year_block')
    .order('date_registered', { ascending: false });

  console.log('\nVerified in DB:');
  console.log('Total count:', all.length);
  const activeCount = all.filter((s) => s.status === 'active').length;
  const disabledCount = all.filter((s) => s.status === 'disabled').length;
  console.log(`Active: ${activeCount}, Disabled: ${disabledCount}`);
  all.forEach((s) => {
    console.log(`[${s.student_id}] ${s.name} - ${s.year_block} - ${s.date_registered} - ${s.status}`);
  });
}

updateStudentsDates();
