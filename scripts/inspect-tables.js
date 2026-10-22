import pg from 'pg';
const { Client } = pg;

async function test(port, user) {
  console.log(`Testing port ${port} with user ${user}...`);
  const client = new Client({
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: port,
    database: 'postgres',
    user: user,
    password: 'final-examitpe12',
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log(`Connected successfully on port ${port} with user ${user}!`);
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));

    for (const t of ['reports', 'reports_of_student', 'computer_centers', 'rooms', 'students']) {
      const colRes = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [t]);
      if (colRes.rows.length > 0) {
        console.log(`\nColumns in ${t}:`, colRes.rows.map(c => `${c.column_name} (${c.data_type})`));
      } else {
        console.log(`\nTable ${t} does NOT exist.`);
      }
    }

    await client.end();
    return true;
  } catch (e) {
    console.log(`Failed on port ${port} user ${user}:`, e.message);
    try { await client.end(); } catch {}
    return false;
  }
}

async function main() {
  if (await test(5432, 'postgres.ieznsbzddanjwmnpvncs')) return;
  if (await test(6543, 'postgres.ieznsbzddanjwmnpvncs')) return;
}

main();
