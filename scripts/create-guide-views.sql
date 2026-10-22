-- ==============================================================================
-- FIXIE: CREATE GUIDE_VIEWS TABLE TO TRACK PER-STUDENT VIEWED STATUS
-- Project: https://ieznsbzddanjwmnpvncs.supabase.co
-- Safe to re-run multiple times
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.guide_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_guide_view UNIQUE (student_id, guide_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.guide_views ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access matching other student portal tables
DROP POLICY IF EXISTS "Allow select on guide_views" ON public.guide_views;
CREATE POLICY "Allow select on guide_views"
  ON public.guide_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert on guide_views" ON public.guide_views;
CREATE POLICY "Allow insert on guide_views"
  ON public.guide_views FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on guide_views" ON public.guide_views;
CREATE POLICY "Allow update on guide_views"
  ON public.guide_views FOR UPDATE USING (true);

-- Index for instant lookup by student_id
CREATE INDEX IF NOT EXISTS idx_guide_views_student_id ON public.guide_views (student_id);
