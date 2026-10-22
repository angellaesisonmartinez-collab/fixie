import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.ieznsbzddanjwmnpvncs:final-examitpe12@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'public.students'::regclass;
  `);
  console.log('Constraints on students:');
  console.log(res.rows);

  const existing = await client.query(`
    SELECT id, student_id, name, email FROM public.students WHERE email ILIKE '%martinezangellaewup%';
  `);
  console.log('Existing students with martinezangellaewup:');
  console.log(existing.rows);

  await client.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
