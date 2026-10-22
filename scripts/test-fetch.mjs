async function testFetch() {
  const url = 'https://ieznsbzddanjwmnpvncs.supabase.co/storage/v1/object/public/avatars/reports/pc014_monitor_display.png';
  const res = await fetch(url);
  console.log('Fetch status:', res.status, res.headers.get('content-type'));
  const buf = await res.arrayBuffer();
  console.log('Fetched bytes:', buf.byteLength);
}

testFetch();
