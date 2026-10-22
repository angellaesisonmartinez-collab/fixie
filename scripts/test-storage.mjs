import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
  const { data: bData, error: bErr } = await supabase.storage.listBuckets();
  console.log('listBuckets:', bData, bErr);

  const { data: files, error: fErr } = await supabase.storage.from('avatars').list();
  console.log('avatars files:', files, fErr);

  // Check reports bucket
  const { data: repFiles, error: repFErr } = await supabase.storage.from('reports').list();
  console.log('reports bucket files:', repFiles, repFErr);

  // Check report-photos or report_attachments
  const { data: cData, error: cErr } = await supabase.storage.createBucket('reports', { public: true });
  console.log('createBucket reports:', cData, cErr);

  const { data: cData2, error: cErr2 } = await supabase.storage.createBucket('report-attachments', { public: true });
  console.log('createBucket report-attachments:', cData2, cErr2);
}

testStorage();
