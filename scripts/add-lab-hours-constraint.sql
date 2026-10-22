-- ==============================================================================
-- FIXIE LABORATORY OPERATING HOURS ENFORCEMENT
-- Reference Timezone: Asia/Manila (UTC+8)
-- Operating Hours: 7:00 AM to 9:00 PM (07:00:00 to 21:00:00) inclusive
-- ==============================================================================

-- 1. Helper function to validate if a timestamptz falls within 7:00 AM - 9:00 PM Manila time
CREATE OR REPLACE FUNCTION public.check_laboratory_hours_manila(ts timestamptz)
RETURNS boolean AS $$
DECLARE
  manila_time time;
BEGIN
  IF ts IS NULL THEN
    RETURN true;
  END IF;
  manila_time := (ts AT TIME ZONE 'Asia/Manila')::time;
  RETURN manila_time >= '07:00:00'::time AND manila_time <= '21:00:00'::time;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Add CHECK constraint on public.reports table
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS check_lab_operating_hours;

ALTER TABLE public.reports
  ADD CONSTRAINT check_lab_operating_hours
  CHECK (public.check_laboratory_hours_manila(created_at));

-- 3. Add CHECK constraint on public.reports_of_student table
ALTER TABLE public.reports_of_student
  DROP CONSTRAINT IF EXISTS check_lab_operating_hours_ros;

ALTER TABLE public.reports_of_student
  ADD CONSTRAINT check_lab_operating_hours_ros
  CHECK (
    public.check_laboratory_hours_manila(date_submitted) AND
    public.check_laboratory_hours_manila(created_at)
  );
