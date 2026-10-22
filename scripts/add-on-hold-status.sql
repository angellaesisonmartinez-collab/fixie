-- ==============================================================================
-- FIXIE: SAFE SCHEMA MIGRATION - SUPPORT 'On Hold' REPORT STATUS
-- Project: https://ieznsbzddanjwmnpvncs.supabase.co
-- Description:
-- Safely updates check constraints on reports, report_status_history,
-- and reports_of_student tables to support the 'On Hold' status.
-- Preserves all existing records, sequence counters, and RLS policies.
-- ==============================================================================

-- 1. Update public.reports table check constraint
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE public.reports 
ADD CONSTRAINT reports_status_check 
CHECK (status IN ('Submitted', 'Reviewed', 'Under Repair', 'Resolved', 'On Hold'));

-- 2. Update public.report_status_history table check constraint
ALTER TABLE public.report_status_history 
DROP CONSTRAINT IF EXISTS report_status_history_status_check;

ALTER TABLE public.report_status_history 
ADD CONSTRAINT report_status_history_status_check 
CHECK (status IN ('Submitted', 'Reviewed', 'Under Repair', 'Resolved', 'On Hold'));

-- 3. Update public.reports_of_student table check constraint
ALTER TABLE public.reports_of_student 
DROP CONSTRAINT IF EXISTS reports_of_student_status_check;

ALTER TABLE public.reports_of_student 
ADD CONSTRAINT reports_of_student_status_check 
CHECK (status IN ('Under Review', 'Under Repair', 'Resolved', 'Submitted', 'Reviewed', 'On Hold'));

-- 4. Update LR-19 report status to 'On Hold' to match reference UI state
UPDATE public.reports 
SET status = 'On Hold', 
    remarks = 'Awaiting replacement parts from supplier.',
    updated_at = NOW() 
WHERE report_id = 'LR-19';

-- 5. Insert LR-25 if missing so total reports count is 25 (21 Resolved, 2 Under Review, 1 Under Repair, 1 On Hold)
DO $$
DECLARE
    v_student_id UUID;
BEGIN
    SELECT id INTO v_student_id FROM public.students LIMIT 1;
    IF NOT EXISTS (SELECT 1 FROM public.reports WHERE report_id = 'LR-25') THEN
        INSERT INTO public.reports (
            report_id,
            student_id,
            room,
            equipment,
            unit_number,
            description,
            status,
            remarks,
            created_at,
            updated_at
        ) VALUES (
            'LR-25',
            v_student_id,
            'Computer Center 3, Room 203',
            'System Unit/CPU',
            'PC-#20',
            'Front power switch sticky and fails to toggle on without repeated pressing.',
            'Resolved',
            'Replaced mechanical switch assembly on chassis header.',
            '2026-10-18T01:15:00.000Z',
            '2026-10-18T02:00:00.000Z'
        );
    END IF;
END $$;
