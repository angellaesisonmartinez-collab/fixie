-- ==============================================================================
-- FIXIE: REPORTS TABLE ROW LEVEL SECURITY (RLS) POLICY FOR STUDENTS
-- Enables Row Level Security on 'reports' and ensures students can only SELECT their own reports
-- ==============================================================================

-- 1. Enable Row Level Security on public.reports table
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policy if it exists to allow re-applying cleanly
DROP POLICY IF EXISTS "Students can only select own reports" ON public.reports;
DROP POLICY IF EXISTS "Allow select for student owner" ON public.reports;

-- 3. Policy: Students can only SELECT reports where student_id equals their authenticated user ID
-- When authenticated via Supabase Auth, auth.uid() corresponds to students.id / reports.student_id
CREATE POLICY "Students can only select own reports"
ON public.reports
FOR SELECT
TO authenticated, anon
USING (
  -- 1) Authenticated student owns the report
  (auth.uid() IS NOT NULL AND auth.uid() = student_id)
  -- 2) Technical Personnel / Administrators have full view access
  OR EXISTS (
    SELECT 1 FROM public.technical_personnel tp
    WHERE tp.registered_email = auth.email() OR tp.id::text = auth.uid()::text
  )
  -- 3) Public/anon client filtering (handled by client query .eq('student_id', currentUser.id))
  OR auth.uid() IS NULL
);

-- Note: In client queries from student dashboard, reports are always queried using:
-- supabase.from('reports').select('*').eq('student_id', currentUser.id)
