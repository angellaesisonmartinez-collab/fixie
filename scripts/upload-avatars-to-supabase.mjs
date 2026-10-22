import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

const STUDENT_AVATAR_FILES = {
  '24-0041-147': 'angel.png',
  '24-2026-340': 'jennelyn.png',
  '24-1003-101': 'jeane.png',
  '24-2745-132': 'jazmin.png',
  '24-4011-088': 'phia.png',
  '24-0031-267': 'juan.png',
  '24-8521-063': 'maria.png',
  '24-0132-062': 'emmanuel.png',
  '24-2026-106': 'bianca.png',
  '24-2026-107': 'chryztel.png',
  '24-2026-108': 'lester.png',
  '24-2026-109': 'kate.png',
  '24-0872-090': 'maria_ortiz.png',
  '22-0941-301': 'alyssa.png',
  '24-7345-853': 'reyn.png',
};

async function uploadAndSyncAvatars() {
  console.log('--- Uploading Avatars to Supabase Storage & Updating Students ---');
  const avatarsDir = path.resolve('src/assets/avatars');

  for (const [studentId, fileName] of Object.entries(STUDENT_AVATAR_FILES)) {
    const filePath = path.join(avatarsDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    console.log(`Uploading ${fileName} for ${studentId}...`);

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(fileName, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.warn(`Storage upload note for ${fileName}:`, uploadErr.message);
    } else {
      console.log(`Successfully uploaded ${fileName} to avatars bucket.`);
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const photoUrl = urlData?.publicUrl || `${supabaseUrl}/storage/v1/object/public/avatars/${fileName}`;

    const { error: updateErr } = await supabase
      .from('students')
      .update({
        profile_photo: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', studentId);

    if (updateErr) {
      console.warn(`Database update note for ${studentId}:`, updateErr.message);
    } else {
      console.log(`Updated ${studentId} profile_photo -> ${photoUrl}`);
    }
  }

  console.log('\n--- Final Verification from Supabase ---');
  const { data: finalStudents, error: fetchErr } = await supabase
    .from('students')
    .select('student_id, name, year_block, email, profile_photo');

  if (fetchErr) {
    console.error('Fetch error:', fetchErr.message);
  } else {
    console.table(finalStudents);
  }
}

uploadAndSyncAvatars().catch(console.error);
