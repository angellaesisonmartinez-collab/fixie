import pg from 'pg';
const { Client } = pg;

async function testConnection(pwd) {
  console.log(`Testing password: ${pwd}`);
  const client = new Client({
    host: 'db.ieznsbzddanjwmnpvncs.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: pwd,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log('CONNECTED TO POSTGRES SUCCESSFULLY with', pwd);
    const res = await client.query('SELECT current_database(), current_user;');
    console.log(res.rows);
    await client.end();
    return true;
  } catch (err) {
    console.log('Failed with', pwd, err.message);
    try { await client.end(); } catch {}
    return false;
  }
}

async function run() {
  const passwords = [
    'Fixie@ICT2026!',
    'Fixie@ICT2026',
    'postgres',
    'admin'
  ];

  for (const p of passwords) {
    if (await testConnection(p)) break;
  }
}

run();
