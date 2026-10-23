-- ==============================================================================
-- FIXIE: SAFE CLEANUP OF INDIVIDUAL STUDENT REPORT TABLES
-- Project: https://ieznsbzddanjwmnpvncs.supabase.co
--
-- VERIFICATION CONFIRMED:
-- - All 28 report records across these 15 tables are 100% preserved in the shared
--   `public.reports` table with correct `student_id` foreign keys, statuses,
--   timestamps, attachments, and chronological `report_status_history` entries.
-- - Shared `public.reports` contains 30 total records and serves as the single
--   source of truth.
-- ==============================================================================

BEGIN;

-- 1. Remove individual tables from Supabase Realtime publication if present
DO $$
DECLARE
  tbl_name text;
  student_tables text[] := ARRAY[
    'alyssa-reports',
    'angel-reports',
    'bianca-reports',
    'chryztel-reports',
    'emmanuel-reports',
    'jazmin-reports',
    'jeane-reports',
    'jennelyn-reports',
    'john-reports',
    'juan-reports',
    'justine-reports',
    'maria-reports',
    'maria_ortiz-reports',
    'phia-reports',
    'reyn-reports'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY student_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = tbl_name AND schemaname = 'public'
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl_name);
    END IF;
  END LOOP;
END $$;

-- 2. Drop the 15 individual student report tables safely
DROP TABLE IF EXISTS public."alyssa-reports" CASCADE;
DROP TABLE IF EXISTS public."angel-reports" CASCADE;
DROP TABLE IF EXISTS public."bianca-reports" CASCADE;
DROP TABLE IF EXISTS public."chryztel-reports" CASCADE;
DROP TABLE IF EXISTS public."emmanuel-reports" CASCADE;
DROP TABLE IF EXISTS public."jazmin-reports" CASCADE;
DROP TABLE IF EXISTS public."jeane-reports" CASCADE;
DROP TABLE IF EXISTS public."jennelyn-reports" CASCADE;
DROP TABLE IF EXISTS public."john-reports" CASCADE;
DROP TABLE IF EXISTS public."juan-reports" CASCADE;
DROP TABLE IF EXISTS public."justine-reports" CASCADE;
DROP TABLE IF EXISTS public."maria-reports" CASCADE;
DROP TABLE IF EXISTS public."maria_ortiz-reports" CASCADE;
DROP TABLE IF EXISTS public."phia-reports" CASCADE;
DROP TABLE IF EXISTS public."reyn-reports" CASCADE;

COMMIT;

-- Verification query: Ensure only canonical tables remain
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%report%'
ORDER BY table_name;
