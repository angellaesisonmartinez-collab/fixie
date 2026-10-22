import pg from 'pg';
const { Client } = pg;

async function testDirect() {
  const client = new Client({
    host: 'db.ieznsbzddanjwmnpvncs.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'final-examitpe12',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to db.ieznsbzddanjwmnpvncs.supabase.co directly...');
    await client.connect();
    console.log('DIRECT CONNECT SUCCESSFUL!');
    await client.end();
  } catch (err) {
    console.log('Direct connect failed:', err.message);
    try { await client.end(); } catch {}
  }
}

testDirect();
