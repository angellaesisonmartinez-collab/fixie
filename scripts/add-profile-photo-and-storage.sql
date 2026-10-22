-- ==============================================================================
-- FIXIE: STUDENT PROFILE PHOTO & STORAGE CONFIGURATION
-- Schema modification and data consistency update for student profile pictures
-- ==============================================================================

-- 1. Add profile_photo column to public.students table only if it does not exist
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- 2. Create public storage bucket 'avatars' for profile pictures (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, 
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Configure storage access policies for the 'avatars' bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access on avatars'
  ) THEN
    CREATE POLICY "Public Access on avatars" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Upload on avatars'
  ) THEN
    CREATE POLICY "Public Upload on avatars" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Update on avatars'
  ) THEN
    CREATE POLICY "Public Update on avatars" 
    ON storage.objects FOR UPDATE 
    USING (bucket_id = 'avatars');
  END IF;
END $$;

-- 4. Update existing students with their assigned unique profile photo path
UPDATE public.students SET profile_photo = 'avatars/angel.png' WHERE student_id = '24-0041-147';
UPDATE public.students SET profile_photo = 'avatars/jennelyn.png' WHERE student_id = '24-2026-340';
UPDATE public.students SET profile_photo = 'avatars/jeane.png' WHERE student_id = '24-1003-101';
UPDATE public.students SET profile_photo = 'avatars/jazmin.png' WHERE student_id = '24-2745-132';
UPDATE public.students SET profile_photo = 'avatars/phia.png' WHERE student_id = '24-4011-088';
UPDATE public.students SET profile_photo = 'avatars/juan.png' WHERE student_id = '24-0031-267';
UPDATE public.students SET profile_photo = 'avatars/maria.png' WHERE student_id = '24-8521-063';
UPDATE public.students SET profile_photo = 'avatars/emmanuel.png' WHERE student_id = '24-0132-062';
UPDATE public.students SET profile_photo = 'avatars/bianca.png' WHERE student_id = '24-2026-106';
UPDATE public.students SET profile_photo = 'avatars/chryztel.png' WHERE student_id = '24-2026-107';
UPDATE public.students SET profile_photo = 'avatars/lester.png' WHERE student_id = '24-2026-108';
UPDATE public.students SET profile_photo = 'avatars/kate.png' WHERE student_id = '24-2026-109';
UPDATE public.students SET profile_photo = 'avatars/maria_ortiz.png' WHERE student_id = '24-0872-090';
UPDATE public.students SET profile_photo = 'avatars/alyssa.png' WHERE student_id = '22-0941-301';
UPDATE public.students SET profile_photo = 'avatars/reyn.png' WHERE student_id = '24-7345-853';

-- 5. Verification query
SELECT student_id, name, year_block, email, profile_photo, status 
FROM public.students 
ORDER BY name;
