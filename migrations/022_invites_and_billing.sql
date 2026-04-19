-- Migration 022: Invite mechanism + billing wiring (R8b)
-- Run in: Supabase Dashboard > SQL Editor
-- Project: mcngatprgluexjjcqpkp
--
-- Context:
--   R8b wires two production surfaces for Corner launch:
--     1. Invite send + accept (distinct from onboarding)
--     2. Billing entitlement mirror for Stripe pro-tier upgrades
--
--   Pattern reference: projects/foreman/research/R8.md
--     - Invite tokens: signed (sha256 hash stored), email-scoped, single-use, 48h TTL
--     - Entitlements: Stripe is the billing ledger, this DB is the entitlement source
--     - Read plan_tier from worlds.plan_tier at request time, never from Stripe

-- ── 1. invites table ───────────────────────────────────────────────────────────
-- Stores the sha256 hash of each invite token (plaintext lives only in the link).
-- token_hash is unique so consumption is a single row check.

CREATE TABLE IF NOT EXISTS invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   text UNIQUE NOT NULL,
  email        text NOT NULL,
  world_slug   text,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  invited_by   uuid,
  expires_at   timestamptz NOT NULL,
  consumed_at  timestamptz,
  consumed_by  uuid,
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_email       ON invites(lower(email));
CREATE INDEX IF NOT EXISTS idx_invites_world_slug  ON invites(world_slug);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at  ON invites(expires_at);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- No anon / authenticated policies: service role only (API endpoints use service key).
-- The accept-invite flow runs through /api/accept-invite which bypasses RLS via service key.
DROP POLICY IF EXISTS "deny_all_invites" ON invites;
CREATE POLICY "deny_all_invites" ON invites FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ── 2. worlds billing columns ──────────────────────────────────────────────────
-- plan_tier is the entitlement source. Stripe webhook updates it; product reads it.
-- stripe_customer_id / stripe_subscription_id are the back-link for webhook lookups.

ALTER TABLE worlds ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'free';
ALTER TABLE worlds ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE worlds ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE worlds ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz;

-- Guard the tier values. IF NOT EXISTS equivalent via DO block (CHECK has no IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'worlds_plan_tier_check'
  ) THEN
    ALTER TABLE worlds
      ADD CONSTRAINT worlds_plan_tier_check
      CHECK (plan_tier IN ('free','pro','enterprise'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_worlds_stripe_customer     ON worlds(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_worlds_stripe_subscription ON worlds(stripe_subscription_id);

-- ── Done ────────────────────────────────────────────────────────────────────────
-- Summary:
--   invites                 -- Table + RLS (service-role-only). Signed tokens, 48h TTL.
--   worlds.plan_tier        -- free | pro | enterprise (default free).
--   worlds.stripe_customer_id / stripe_subscription_id / plan_updated_at
--
-- Service role bypasses RLS -- webhook + invite endpoints use SUPABASE_SERVICE_ROLE_KEY.
