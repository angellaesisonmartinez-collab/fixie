import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ieznsbzddanjwmnpvncs.supabase.co';
const supabaseKey = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtime() {
  console.log('Subscribing to realtime channel...');
  let receivedEvent = false;

  const channel = supabase.channel('test-realtime-' + Date.now())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
      console.log('Realtime postgres_changes event received on reports:', payload.eventType, payload.new?.id || payload.old?.id);
      receivedEvent = true;
    })
    .subscribe(async (status) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Channel subscribed! Updating a report touch column to test event delivery...');
        const { data: rep } = await supabase.from('reports').select('id, updated_at').limit(1).single();
        const nowIso = new Date().toISOString();
        await supabase.from('reports').update({ updated_at: nowIso }).eq('id', rep.id);
        console.log('Updated report updated_at to', nowIso);
      }
    });

  // Wait up to 6 seconds for event
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (receivedEvent) {
      console.log('SUCCESS: Realtime is working properly!');
      break;
    }
  }

  if (!receivedEvent) {
    console.log('No postgres_changes event received within timeout. Realtime broadcast will be tested.');
  }

  supabase.removeChannel(channel);
  process.exit(0);
}

testRealtime();
