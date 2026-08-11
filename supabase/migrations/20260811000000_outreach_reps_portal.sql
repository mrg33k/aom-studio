-- Rep portal tables (2026-08-11)
-- outreach_reps: lightweight username/password list for sales reps
-- outreach_touchpoints.rep_username: tracks which rep logged each call

CREATE TABLE IF NOT EXISTS public.outreach_reps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'rep' CHECK (role IN ('admin', 'rep')),
  trusted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.outreach_reps ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "public_read" ON public.outreach_reps
  FOR SELECT USING (true);

ALTER TABLE public.outreach_touchpoints
  ADD COLUMN IF NOT EXISTS rep_username text;
