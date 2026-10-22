import pg from 'pg';
const { Client } = pg;

async function testPooler() {
  const uris = [
    'postgresql://postgres.ieznsbzddanjwmnpvncs:final-examitpe12@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres',
    'postgresql://postgres.ieznsbzddanjwmnpvncs:final-examitpe12@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require',
    'postgresql://postgres:final-examitpe12@db.ieznsbzddanjwmnpvncs.supabase.co:5432/postgres'
  ];

  for (const uri of uris) {
    console.log('Testing URI:', uri.replace(/:final-examitpe12@/, ':***@'));
    const client = new Client({
      connectionString: uri,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000
    });
    try {
      await client.connect();
      console.log('SUCCESS with URI!');
      const res = await client.query('SELECT 1;');
      console.log('Query result:', res.rows);
      await client.end();
      return;
    } catch (err) {
      console.log('Failed:', err.message);
      try { await client.end(); } catch {}
    }
  }
}

testPooler();
