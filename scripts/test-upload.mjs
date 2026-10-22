import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  const dummyBuffer = Buffer.from('test image content');
  const { data, error } = await supabase.storage.from('reports').upload('test.txt', dummyBuffer, {
    contentType: 'text/plain',
    upsert: true
  });
  console.log('Upload to reports bucket:', data, error);

  const { data: data2, error: error2 } = await supabase.storage.from('avatars').upload('test.txt', dummyBuffer, {
    contentType: 'text/plain',
    upsert: true
  });
  console.log('Upload to avatars bucket:', data2, error2);

  const { data: urlData } = supabase.storage.from('reports').getPublicUrl('test.txt');
  console.log('Public URL reports:', urlData);
}

testUpload();
