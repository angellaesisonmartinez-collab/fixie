import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const tables = {
    'angel-reports': '9002d8e6-bc03-4070-8aae-299147dead9a',
    'alyssa-reports': '81ccc938-0114-4894-8034-50b71a7aca74',
    'phia-reports': '43516fd4-6370-409e-96c0-5acc8d56d9c6',
    'maria-reports': '21877a55-8600-4a5d-88ce-4e0746c23898',
    'juan-reports': '82f230ea-abdb-4bc2-8fea-e87eb897299c',
    'reyn-reports': 'a9974b97-4eb0-4876-8a62-cdc86023bbd4',
    'jennelyn-reports': '51664213-275b-4e67-9024-d92d7e0a8022',
  };

  const { data: canonical } = await supabase.from('reports').select('*');

  for (const [tbl, studentUuid] of Object.entries(tables)) {
    const studentCanon = canonical.filter(r => r.student_id === studentUuid);
    const { data: customData, error } = await supabase.from(tbl).select('report_id');
    if (error) {
      console.log(`Table ${tbl}: ERROR ${error.message}`);
      continue;
    }
    const customIds = new Set((customData || []).map(r => r.report_id));
    
    const missingInCustom = studentCanon.filter(r => !customIds.has(r.report_id));
    if (missingInCustom.length > 0) {
      console.log(`Table ${tbl} (student ${studentUuid}) is MISSING:`, missingInCustom.map(r => r.report_id));
    } else {
      console.log(`Table ${tbl} has all canonical reports (${studentCanon.map(r => r.report_id).join(', ')})`);
    }
  }
}

run();
