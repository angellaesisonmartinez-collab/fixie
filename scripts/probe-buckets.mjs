import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

// 1x1 transparent PNG
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function testBuckets() {
  const bucketCandidates = [
    'reports',
    'report-photos',
    'report_photos',
    'report-attachments',
    'report_attachments',
    'reports-photos',
    'attachments',
    'photos',
    'images',
    'public',
    'avatars',
  ];

  for (const b of bucketCandidates) {
    const { data, error } = await supabase.storage.from(b).upload('probe.png', pngBuffer, {
      contentType: 'image/png',
      upsert: true
    });
    if (error) {
      console.log(`Bucket [${b}]: ERROR ->`, error.message, error.statusCode);
    } else {
      console.log(`Bucket [${b}]: SUCCESS ->`, data);
      const { data: pubUrl } = supabase.storage.from(b).getPublicUrl('probe.png');
      console.log(`Public URL:`, pubUrl);
    }
  }
}

testBuckets();
