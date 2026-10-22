-- ==============================================================================
-- FIXIE: SAFE SCHEMA MIGRATION - CREATE COMPUTER CENTERS LOOKUP TABLE
-- Project: https://ieznsbzddanjwmnpvncs.supabase.co
-- Description:
-- Creates public.computer_centers table with center number, name, and room.
-- Safe to run multiple times without duplicating data (ON CONFLICT DO UPDATE).
-- Enables RLS with read-only access for authenticated and anonymous users.
-- ==============================================================================

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.computer_centers (
  id SERIAL PRIMARY KEY,
  center_number INT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  room TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.computer_centers ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow read access for authenticated and anon roles
DROP POLICY IF EXISTS "Allow read access to computer_centers" ON public.computer_centers;
CREATE POLICY "Allow read access to computer_centers"
  ON public.computer_centers
  FOR SELECT
  USING (true);

-- 4. Seed 10 computer centers with mapped rooms idempotently
INSERT INTO public.computer_centers (center_number, name, room)
VALUES
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
SET name = EXCLUDED.name,
    room = EXCLUDED.room;
