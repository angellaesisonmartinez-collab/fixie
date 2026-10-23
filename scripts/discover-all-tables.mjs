async function listAllExposedTables() {
  const url = 'https://ieznsbzddanjwmnpvncs.supabase.co/rest/v1/';
  const key = 'sb_publishable_U9igmXfsc3LK2ota2FuC6w_QxW2ojfr';
  
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });

  const schema = await res.json();
  console.log('Top level keys:', Object.keys(schema));
  if (schema.paths) {
    const paths = Object.keys(schema.paths).map(p => p.replace(/^\//, ''));
    console.log('All paths (tables/views/rpcs):', paths);
    const studentReportTables = paths.filter(p => p.includes('-reports') || p.includes('report'));
    console.log('\nReport-related paths:');
    console.log(studentReportTables);
  }
  if (schema.definitions) {
    console.log('Definitions keys:', Object.keys(schema.definitions));
  }
}

listAllExposedTables();
