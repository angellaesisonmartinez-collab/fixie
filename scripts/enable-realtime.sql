-- ==============================================================================
-- FIXIE: ENABLE SUPABASE REALTIME REPLICATION FOR ALL TABLES
-- Enables Change Data Capture (CDC) via supabase_realtime publication
-- and ensures REPLICA IDENTITY FULL for UPDATE/DELETE event payloads.
-- ==============================================================================

-- 1. Add tables to supabase_realtime publication (safe idempotency)
DO $$
BEGIN
  -- reports
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'reports' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  END IF;

  -- reports_of_student
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'reports_of_student' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports_of_student;
  END IF;

  -- report_status_history
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'report_status_history' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_status_history;
  END IF;

  -- students
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'students' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  END IF;

  -- guides
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'guides' AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guides;
  END IF;

  -- saved_guides (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_guides') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'saved_guides' AND schemaname = 'public'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_guides;
    END IF;
  END IF;
END $$;

-- 2. Enable REPLICA IDENTITY FULL for detailed old/new record contents on UPDATE and DELETE
ALTER TABLE public.reports REPLICA IDENTITY FULL;
ALTER TABLE public.reports_of_student REPLICA IDENTITY FULL;
ALTER TABLE public.report_status_history REPLICA IDENTITY FULL;
ALTER TABLE public.students REPLICA IDENTITY FULL;
ALTER TABLE public.guides REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_guides') THEN
    ALTER TABLE public.saved_guides REPLICA IDENTITY FULL;
  END IF;
END $$;

-- 3. Ensure Row Level Security (RLS) policies allow SELECT so clients receive realtime events
-- (Supabase Realtime enforces RLS on postgres_changes)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select for student and technical personnel" ON public.reports;
CREATE POLICY "Allow select for student and technical personnel"
ON public.reports
FOR SELECT
TO authenticated, anon
USING (true);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select for all students and admin" ON public.students;
CREATE POLICY "Allow select for all students and admin"
ON public.students
FOR SELECT
TO authenticated, anon
USING (true);

ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select for guides" ON public.guides;
CREATE POLICY "Allow select for guides"
ON public.guides
FOR SELECT
TO authenticated, anon
USING (true);

ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select for report_status_history" ON public.report_status_history;
CREATE POLICY "Allow select for report_status_history"
ON public.report_status_history
FOR SELECT
TO authenticated, anon
USING (true);

-- 4. Verification output
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
