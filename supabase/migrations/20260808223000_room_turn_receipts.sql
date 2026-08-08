-- corner:truth-contracts R8 — one durable reliability receipt per dashboard turn.
-- Service-role only: browsers read it through the tenant-authenticated room-health API.

CREATE TABLE IF NOT EXISTS public.room_turn_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  room_id text NOT NULL,
  agent text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text NOT NULL DEFAULT 'central' CHECK (route IN ('central', 'local')),
  job_id uuid,
  state text NOT NULL DEFAULT 'accepted'
    CHECK (state IN ('accepted', 'active', 'recovering', 'replied', 'settled', 'needs_attention')),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  heartbeat_at timestamptz,
  replied_at timestamptz,
  visible_at timestamptz,
  settled_at timestamptz,
  last_checked_at timestamptz,
  last_repair_at timestamptz,
  repair_count integer NOT NULL DEFAULT 0 CHECK (repair_count BETWEEN 0 AND 3),
  last_repair text,
  last_error text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_turn_receipts_health_idx
  ON public.room_turn_receipts (state, accepted_at);
CREATE INDEX IF NOT EXISTS room_turn_receipts_tenant_room_idx
  ON public.room_turn_receipts (client_id, room_id, accepted_at DESC);

ALTER TABLE public.room_turn_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.room_turn_receipts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.room_turn_receipts TO service_role;
