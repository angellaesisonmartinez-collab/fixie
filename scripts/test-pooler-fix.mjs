import pg from 'pg';
const { Client } = pg;

async function test() {
  const client = new Client({
    connectionString: 'postgresql://postgres.ieznsbzddanjwmnpvncs:final-examitpe12@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('SUCCESS CONNECTED TO SUPABASE POSTGRES DIRECTLY!');
    const res = await client.query('SELECT version();');
    console.log('Postgres version:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
