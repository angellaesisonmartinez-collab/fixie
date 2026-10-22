import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateGuides() {
  console.log('🔄 Adjusting guide dates so Page 1 matches reference layout...');

  const { data: guides, error } = await supabase.from('guides').select('*');
  if (error || !guides) {
    console.error('Error fetching guides:', error);
    return;
  }

  const updates = [
    { match: 'Rule 01:', created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-10-01T10:00:00.000Z' },
    { match: 'Rule 02:', created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-10-01T09:30:00.000Z' },
    { match: 'Rule 03:', created_at: '2026-09-01T08:00:00.000Z', updated_at: '2026-10-01T09:00:00.000Z' },
    { match: 'Submit an Accurate Problem Report', created_at: '2026-09-15T09:00:00.000Z', updated_at: '2026-09-30T14:20:00.000Z' },
    { match: 'Laboratory Operating Hours', created_at: '2026-09-22T08:00:00.000Z', updated_at: '2026-09-22T08:00:00.000Z' },
    { match: 'End of Semester Machine Maintenance', created_at: '2026-09-15T08:00:00.000Z', updated_at: '2026-09-15T08:00:00.000Z' },
    { match: 'Identify Your Computer Center', created_at: '2026-09-10T08:00:00.000Z', updated_at: '2026-09-14T11:00:00.000Z' },
  ];

  // Rules 4 to 21 spread between Sep 14 and Sep 01
  for (let i = 4; i <= 21; i++) {
    const pad = i < 10 ? '0' + i : '' + i;
    const day = Math.max(1, 15 - Math.floor((i - 3) * 0.7));
    const dayStr = day < 10 ? '0' + day : '' + day;
    const hour = (10 + (i % 8)).toString().padStart(2, '0');
    updates.push({
      match: 'Rule ' + pad + ':',
      created_at: '2026-09-01T08:00:00.000Z',
      updated_at: `2026-09-${dayStr}T${hour}:00:00.000Z`
    });
  }

  for (const guide of guides) {
    const matched = updates.find(u => guide.title.includes(u.match));
    if (matched) {
      await supabase
        .from('guides')
        .update({
          created_at: matched.created_at,
          updated_at: matched.updated_at
        })
        .eq('id', guide.id);
    }
  }

  console.log('✅ Guide dates updated successfully.');
}

updateGuides();
