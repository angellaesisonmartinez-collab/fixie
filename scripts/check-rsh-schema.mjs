import pg from 'pg';
const { Client } = pg;

async function checkSchema() {
  const uri = 'postgresql://postgres.ieznsbzddanjwmnpvncs:final-examitpe12@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString: uri,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Check columns of report_status_history
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'report_status_history'
      ORDER BY ordinal_position;
    `);
    console.log('report_status_history columns:', cols.rows);

    // Check foreign keys and constraints on report_status_history
    const constr = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'report_status_history';
    `);
    console.log('report_status_history constraints:', constr.rows);

    // Check RLS policies on report_status_history
    const pols = await client.query(`
      SELECT polname, polcmd, polroles::regrole[], polqual, polwithcheck
      FROM pg_policy
      WHERE polrelid = 'public.report_status_history'::regclass;
    `);
    console.log('report_status_history policies:', pols.rows);

    // Check publication/realtime for report_status_history
    const pub = await client.query(`
      SELECT * FROM pg_publication_tables WHERE tablename IN ('reports', 'report_status_history', 'reports_of_student');
    `);
    console.log('supabase_realtime publication tables:', pub.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err);
    try { await client.end(); } catch {}
  }
}

checkSchema();
