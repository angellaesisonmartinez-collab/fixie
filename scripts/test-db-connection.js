import pg from 'pg';
const { Client } = pg;

async function testUri() {
  const uri = 'postgresql://postgres.ieznsbzddanjwmnpvncs:final-examitpe12@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres';
  const client = new Client({
    connectionString: uri,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('SUCCESS! Connected to PostgreSQL.');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.computer_centers (
        id SERIAL PRIMARY KEY,
        center_number INT NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        room TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE public.computer_centers ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Allow read access to computer_centers" ON public.computer_centers;
      CREATE POLICY "Allow read access to computer_centers" ON public.computer_centers FOR SELECT USING (true);
      INSERT INTO public.computer_centers (center_number, name, room) VALUES
        (1, 'Computer Center 1', 'Room 201'),
        (2, 'Computer Center 2', 'Room 202'),
        (3, 'Computer Center 3', 'Room 203'),
        (4, 'Computer Center 4', 'Room 204'),
        (5, 'Computer Center 5', 'Room 205'),
        (6, 'Computer Center 6', 'Room 206'),
        (7, 'Computer Center 7', 'Room 207'),
        (8, 'Computer Center 8', 'Room 208'),
        (9, 'Computer Center 9', 'Room 209'),
        (10, 'Computer Center 10', 'Room 210')
      ON CONFLICT (center_number) DO UPDATE
      SET name = EXCLUDED.name, room = EXCLUDED.room;
    `);
    console.log('Successfully created and seeded computer_centers table!');
    const check = await client.query('SELECT * FROM public.computer_centers ORDER BY center_number;');
    console.log('computer_centers rows:', check.rows);
    await client.end();
  } catch (err) {
    console.log('Connection note:', err.message);
    try { await client.end(); } catch {}
  }
}

testUri();
