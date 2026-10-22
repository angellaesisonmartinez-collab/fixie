import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

const PHOTO_FILES = {
  'pc014_monitor_display.jpg': 'src/assets/report-photos/pc014_monitor_display.jpg',
  'pc010_network_lan.jpg': 'src/assets/report-photos/pc010_network_lan.jpg',
  'pc013_power_unit.jpg': 'src/assets/report-photos/pc013_power_unit.jpg',
  'pc013_keyboard.jpg': 'src/assets/report-photos/pc013_keyboard.jpg',
  'pc004_mouse.jpg': 'src/assets/report-photos/pc004_mouse.jpg',
};

// Map existing reports to their authentic photo attachments
const REPORT_PHOTO_MAPPING = {
  'LR-12': 'pc014_monitor_display.jpg',
  'LR-24': 'pc014_monitor_display.jpg',
  'LR-11': 'pc010_network_lan.jpg',
  'LR-10': 'pc013_power_unit.jpg',
  'LR-09': 'pc013_keyboard.jpg',
  'LR-08': 'pc014_monitor_display.jpg',
  'LR-07': 'pc004_mouse.jpg',
  'LR-04': 'pc013_power_unit.jpg',
  'LR-02': 'pc013_keyboard.jpg',
  'LR-01': 'pc014_monitor_display.jpg',
  'LR-22': 'pc010_network_lan.jpg',
  'LR-21': 'pc010_network_lan.jpg',
  'LR-13': 'pc004_mouse.jpg',
};

async function migrateReportPhotos() {
  console.log('=== 1. UPLOADING REPORT ATTACHMENT PHOTOS TO SUPABASE STORAGE ===');
  const uploadedUrls = {};

  for (const [filename, relPath] of Object.entries(PHOTO_FILES)) {
    const fullPath = path.resolve(relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`File missing: ${fullPath}`);
      continue;
    }

    const fileBuf = fs.readFileSync(fullPath);
    const storagePath = `reports/${filename}`;
    console.log(`Uploading ${filename} (${fileBuf.length} bytes) to storage avatars/${storagePath}...`);

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(storagePath, fileBuf, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadErr) {
      console.error(`Upload error for ${filename}:`, uploadErr);
    } else {
      console.log(`Uploaded successfully:`, uploadData);
    }

    const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
    const finalUrl = pubData?.publicUrl || `${supabaseUrl}/storage/v1/object/public/avatars/${storagePath}`;
    uploadedUrls[filename] = finalUrl;
    console.log(`Public URL for ${filename} -> ${finalUrl}`);
  }

  console.log('\n=== 2. UPDATING SUPABASE reports TABLE WITH photo_url ===');
  for (const [reportId, filename] of Object.entries(REPORT_PHOTO_MAPPING)) {
    const photoUrl = uploadedUrls[filename];
    if (!photoUrl) continue;

    const { data, error } = await supabase
      .from('reports')
      .update({
        photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('report_id', reportId)
      .select('id, report_id, equipment, unit_number, photo_url');

    if (error) {
      console.error(`Error updating report ${reportId}:`, error.message);
    } else {
      console.log(`Updated ${reportId}: photo_url -> ${photoUrl}`);
    }
  }

  console.log('\n=== 3. VERIFYING REPORTS IN SUPABASE ===');
  const { data: verifyReports, error: vErr } = await supabase
    .from('reports')
    .select('report_id, equipment, unit_number, photo_url, status')
    .order('report_id');

  if (vErr) {
    console.error('Verify error:', vErr);
  } else {
    console.table(verifyReports);
  }
}

migrateReportPhotos().catch(console.error);
