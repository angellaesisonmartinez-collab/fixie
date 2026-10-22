import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

// 1x1 transparent PNG
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function testSubfolder() {
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload('reports/pc014_monitor_display.png', pngBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  console.log('Subfolder upload result:', data, error);
  const { data: pubUrl } = supabase.storage.from('avatars').getPublicUrl('reports/pc014_monitor_display.png');
  console.log('Public URL:', pubUrl);
}

testSubfolder();
