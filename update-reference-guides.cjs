const { createClient } = require('@supabase/supabase-js');
const client = createClient('https://ieznsbzddanjwmnpvncs.supabase.co', 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr');

async function run() {
  await client.from('guides').update({
    title: 'Laboratory rules and proper use of equipment',
    content: 'To keep the laboratory ready for everyone, please follow these rules:\n1. No food, drinks, or open containers allowed near workstations.\n2. Handle monitors, keyboards, mice, and peripherals with care.\n3. Do not disconnect or switch cables, adapters, or power cords.\n4. Keep bags and personal items on designated bag racks.\n5. Clean your workstation and push chairs in completely before leaving.'
  }).eq('id', 'a3ccbcb6-1be5-4ef9-83e5-5fda12064241');

  await client.from('guides').update({
    title: 'Laboratory rules and proper use of equipment',
    content: 'To keep the laboratory ready for everyone, please follow these rules:\n1. A valid School ID is mandatory before entering the computer laboratory.\n2. Maintain silence and refrain from disorderly conduct.\n3. Save work to personal external or cloud drives.\n4. Log out and shut down your computer properly after each session.'
  }).eq('id', '654a302d-30a2-43d7-bb63-96489ce7ebb9');

  await client.from('guides').update({
    title: 'How to report a problem in LabReady',
    content: 'If you notice something wrong with a computer, file a report instead of telling a classmate.\n1. Open the Fixie / LabReady portal and click "Report a Problem".\n2. Select your Computer Center and assigned Room Number.\n3. Specify the affected hardware component.\n4. Input the precise Unit Number (e.g. PC-#14).\n5. Detail the observed malfunction and optionally attach a photo.\n6. Click "Submit Report" to notify technical personnel immediately.'
  }).eq('id', '24aed21c-afd4-498f-93a7-46033f2aee0c');

  await client.from('guides').update({
    title: 'Log out and shut down after use',
    content: 'Before leaving your seat, log out of your account and shut down the computer properly.\n1. Save all open documents and projects to cloud storage or personal drives.\n2. Sign out of all institutional email and personal web accounts.\n3. Shut down the PC through the operating system Start menu.\n4. Do not turn off power strips or surge protectors directly.'
  }).eq('id', 'd8ee4eba-77f6-4967-996a-9442cc01d103');

  await client.from('guides').update({
    title: 'Back up your files before leaving',
    content: 'Files saved on laboratory PCs may be removed during maintenance or software updates.\n1. Local workstation drives are deep-frozen and wiped regularly upon restart.\n2. Upload your coursework to your school Google Drive or OneDrive.\n3. Use personal USB flash drives safely and eject properly before unplugging.\n4. Technical personnel cannot recover files wiped during scheduled maintenance.'
  }).eq('id', 'ed55fac3-ca8d-42f7-ba9a-959faa920015');

  console.log('Successfully updated 5 reference guides in Supabase!');
  process.exit(0);
}
run();
