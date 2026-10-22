import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const possibleTables = [
    'computer_centers',
    'computer_center',
    'centers',
    'rooms',
    'computer_center_rooms',
    'locations',
    'lab_rooms',
    'laboratories',
    'reports',
    'reports_of_student',
    'students',
    'guides'
  ];

  for (const table of possibleTables) {
    const { data, error } = await supabase.from(table).select('*').limit(3);
    if (error) {
      console.log(`Table '${table}': ERROR or NOT FOUND (${error.message})`);
    } else {
      console.log(`Table '${table}': EXISTS! Sample rows:`, data);
    }
  }

  // Also inspect sample row of reports and reports_of_student to see exact column names and types
  const { data: repSample } = await supabase.from('reports').select('*').limit(1);
  console.log('\nSample reports row:', repSample);

  const { data: sRepSample } = await supabase.from('reports_of_student').select('*').limit(1);
  console.log('\nSample reports_of_student row:', sRepSample);
}

check();
