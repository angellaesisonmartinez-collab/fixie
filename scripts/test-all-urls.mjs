async function testAllUrls() {
  const urls = [
    'https://ieznsbzddanjwmnpvncs.supabase.co/storage/v1/object/public/avatars/reports/pc014_monitor_display.jpg',
    'https://ieznsbzddanjwmnpvncs.supabase.co/storage/v1/object/public/avatars/reports/pc010_network_lan.jpg',
    'https://ieznsbzddanjwmnpvncs.supabase.co/storage/v1/object/public/avatars/reports/pc013_power_unit.jpg',
    'https://ieznsbzddanjwmnpvncs.supabase.co/storage/v1/object/public/avatars/reports/pc013_keyboard.jpg',
    'https://ieznsbzddanjwmnpvncs.supabase.co/storage/v1/object/public/avatars/reports/pc004_mouse.jpg'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`URL: ${url.split('/').pop()} -> Status: ${res.status} Content-Type: ${res.headers.get('content-type')} (${res.headers.get('content-length')} bytes)`);
    } catch (err) {
      console.log(`Failed: ${url}`, err.message);
    }
  }
}

testAllUrls();
