-- ==============================================================================
-- FIXIE: SAFE SCHEMA MIGRATION & REPORT STATUS RECONCILIATION
-- Project: https://ieznsbzddanjwmnpvncs.supabase.co
-- Description:
-- 1. Updates check constraints on public.reports, public.report_status_history,
--    and public.reports_of_student to support 'Under Review'.
-- 2. Updates the 5 mismatched reports (LR-12, LR-24, LR-28, LR-29, LR-30)
--    from 'Submitted'/'Reviewed' to 'Under Review' matching the system source of truth.
-- 3. Preserves all other report fields, remarks, timestamps, and history.
-- ==============================================================================

BEGIN;

-- Step 1: Update public.reports table check constraint to support 'Under Review'
ALTER TABLE public.reports 
DROP CONSTRAINT IF EXISTS reports_status_check;

ALTER TABLE public.reports 
ADD CONSTRAINT reports_status_check 
CHECK (status IN ('Under Review', 'Under Repair', 'On Hold', 'Resolved', 'Submitted', 'Reviewed'));

-- Step 2: Update public.report_status_history table check constraint to support 'Under Review'
ALTER TABLE public.report_status_history 
DROP CONSTRAINT IF EXISTS report_status_history_status_check;

ALTER TABLE public.report_status_history 
ADD CONSTRAINT report_status_history_status_check 
CHECK (status IN ('Under Review', 'Under Repair', 'On Hold', 'Resolved', 'Submitted', 'Reviewed'));

-- Step 3: Update public.reports_of_student table check constraint
ALTER TABLE public.reports_of_student 
DROP CONSTRAINT IF EXISTS reports_of_student_status_check;

ALTER TABLE public.reports_of_student 
ADD CONSTRAINT reports_of_student_status_check 
CHECK (status IN ('Under Review', 'Under Repair', 'On Hold', 'Resolved', 'Submitted', 'Reviewed'));

-- Step 4: Reconcile only the mismatched reports in public.reports
-- Preserving original created_at timestamps, remarks, student associations, and attachments
UPDATE public.reports 
SET status = 'Under Review'
WHERE report_id IN ('LR-12', 'LR-24', 'LR-28', 'LR-29', 'LR-30');

-- Step 5: Reconcile public.reports_of_student table for 1:1 parity
UPDATE public.reports_of_student 
SET status = 'Under Review'
WHERE report_id IN ('LR-12', 'LR-24', 'LR-28', 'LR-29', 'LR-30');

COMMIT;

-- Step 6: Verification Query
SELECT report_id, status, unit_number, equipment, created_at, remarks
FROM public.reports 
WHERE report_id IN ('LR-12', 'LR-24', 'LR-28', 'LR-29', 'LR-30')
ORDER BY CAST(SUBSTRING(report_id FROM 4) AS INTEGER) DESC;
