-- ==============================================================================
-- FIXIE: REPORT ATTACHMENT IMAGES STORAGE BUCKET & SECURITY POLICIES
-- Project: https://ieznsbzddanjwmnpvncs.supabase.co
-- Table: public.reports (column: photo_url TEXT)
-- Storage Bucket: 'reports' (and 'avatars/reports' backward-compatible namespace)
-- ==============================================================================

-- 1. Ensure 'photo_url' column exists on public.reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Create public storage bucket 'reports' for problem report attached pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports', 
  'reports', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- 3. Configure storage access policies for 'reports' bucket
-- Allows Technical Personnel and authenticated students to view, upload, and manage report images
DO $$
BEGIN
  -- Allow SELECT (view images) for Technical Personnel and report viewers
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow view access to report images'
  ) THEN
    CREATE POLICY "Allow view access to report images" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'reports' OR (bucket_id = 'avatars' AND name LIKE 'reports/%'));
  END IF;

  -- Allow INSERT (upload images) for Students and Technical Personnel
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow upload access to report images'
  ) THEN
    CREATE POLICY "Allow upload access to report images" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'reports' OR (bucket_id = 'avatars' AND name LIKE 'reports/%'));
  END IF;

  -- Allow UPDATE for report images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Allow update access to report images'
  ) THEN
    CREATE POLICY "Allow update access to report images" 
    ON storage.objects FOR UPDATE 
    USING (bucket_id = 'reports' OR (bucket_id = 'avatars' AND name LIKE 'reports/%'));
  END IF;
END $$;
