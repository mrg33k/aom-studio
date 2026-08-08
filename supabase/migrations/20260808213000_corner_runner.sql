-- corner:integrations R3 — user-owned Corner Runner devices and local Codex jobs.
-- ChatGPT/Codex credentials never enter Supabase. Pairing codes and device
-- bearer tokens are stored only as SHA-256 hashes and every table is
-- service-role-only; browser and runner access goes through authenticated APIs.

CREATE TABLE IF NOT EXISTS public.corner_runner_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  code_hash text NOT NULL UNIQUE,
  requested_name text,
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  device_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.corner_runner_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  name text NOT NULL,
  platform text,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'offline'
    CHECK (status IN ('offline', 'online', 'working', 'error')),
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.corner_runner_pairings
  DROP CONSTRAINT IF EXISTS corner_runner_pairings_device_id_fkey;
ALTER TABLE public.corner_runner_pairings
  ADD CONSTRAINT corner_runner_pairings_device_id_fkey
  FOREIGN KEY (device_id) REFERENCES public.corner_runner_devices(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.corner_runner_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.corner_runner_devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  message_id text NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'claimed', 'running', 'completed', 'failed', 'cancelled')),
  lease_expires_at timestamptz,
  claimed_at timestamptz,
  finished_at timestamptz,
  error text,
  result_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS corner_runner_devices_owner_idx
  ON public.corner_runner_devices (user_id, client_id, revoked_at, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS corner_runner_pairings_owner_idx
  ON public.corner_runner_pairings (user_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS corner_runner_jobs_device_queue_idx
  ON public.corner_runner_jobs (device_id, status, created_at);
CREATE INDEX IF NOT EXISTS corner_runner_jobs_owner_idx
  ON public.corner_runner_jobs (user_id, client_id, created_at DESC);

ALTER TABLE public.corner_runner_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corner_runner_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corner_runner_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.corner_runner_pairings FROM anon, authenticated;
REVOKE ALL ON TABLE public.corner_runner_devices FROM anon, authenticated;
REVOKE ALL ON TABLE public.corner_runner_jobs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.corner_runner_pairings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.corner_runner_devices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.corner_runner_jobs TO service_role;

-- Atomically trade a valid single-use pairing code for a device record. The
-- raw code and raw device token never reach this function, only their hashes.
CREATE OR REPLACE FUNCTION public.claim_corner_runner_pairing(
  p_code_hash text,
  p_token_hash text,
  p_name text,
  p_platform text DEFAULT NULL
)
RETURNS TABLE (id uuid, user_id uuid, client_id text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pairing public.corner_runner_pairings%ROWTYPE;
  claimed public.corner_runner_devices%ROWTYPE;
BEGIN
  SELECT * INTO pairing
  FROM public.corner_runner_pairings
  WHERE code_hash = p_code_hash
    AND claimed_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pairing code is invalid or expired' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.corner_runner_devices (
    user_id, client_id, name, platform, token_hash, status, last_seen_at, updated_at
  ) VALUES (
    pairing.user_id,
    pairing.client_id,
    left(coalesce(nullif(trim(p_name), ''), coalesce(pairing.requested_name, 'My computer')), 80),
    left(nullif(trim(p_platform), ''), 80),
    p_token_hash,
    'online',
    now(),
    now()
  ) RETURNING * INTO claimed;

  UPDATE public.corner_runner_pairings
  SET claimed_at = now(), device_id = claimed.id
  WHERE corner_runner_pairings.id = pairing.id;

  RETURN QUERY SELECT claimed.id, claimed.user_id, claimed.client_id, claimed.name;
END;
$$;

-- One device claims one queued (or expired-lease) job at a time. SKIP LOCKED
-- keeps duplicate runner processes from ever receiving the same live lease.
CREATE OR REPLACE FUNCTION public.claim_corner_runner_job(
  p_device_id uuid,
  p_lease_seconds integer DEFAULT 120
)
RETURNS SETOF public.corner_runner_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.corner_runner_jobs AS jobs
  SET status = 'claimed',
      claimed_at = coalesce(jobs.claimed_at, now()),
      lease_expires_at = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 600))),
      updated_at = now()
  WHERE jobs.id = (
    SELECT candidate.id
    FROM public.corner_runner_jobs AS candidate
    WHERE candidate.device_id = p_device_id
      AND (
        candidate.status = 'queued'
        OR (candidate.status IN ('claimed', 'running') AND candidate.lease_expires_at < now())
      )
    ORDER BY candidate.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING jobs.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_corner_runner_pairing(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_corner_runner_job(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_corner_runner_pairing(text, text, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_corner_runner_job(uuid, integer)
  TO service_role;
