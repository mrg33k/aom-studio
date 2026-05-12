-- ============================================================
-- Migration 037: Cage-match B1 — single state table with kind column
-- Date: 2026-05-11
-- Mission: corner:launch-mvp (chat-perf-finishing R2)
--
-- Status: CAGE-MATCH CANDIDATE. Table is prefixed `cm_` so it doesn't pollute
--         the production schema. Lives alongside B2 in public schema until the
--         benchmark in scripts/cage-match-state-bench.py picks a winner.
--
-- After the benchmark:
--   - If B1 wins, cm_state gets renamed to `state` (or its content/shape
--     promoted), migration 038 deleted, cm_b2_* tables dropped.
--   - If B1 loses, this entire file is deleted and cm_state is dropped.
--
-- See: corner/missions/launch-mvp/research/2026-05-11-events-state-split-cage-match.md
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cm_state (
  kind        TEXT NOT NULL,
  scope_id    TEXT NOT NULL,
  client_id   TEXT NOT NULL,
  payload     JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kind, scope_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_cm_state_client_kind_updated
  ON public.cm_state (client_id, kind, updated_at DESC);

-- Service-role only for the cage-match. RLS gets applied when the winner is
-- promoted (we copy the events table's policy pattern then).
ALTER TABLE public.cm_state ENABLE ROW LEVEL SECURITY;

-- Writer template (do not run as part of migration — for documentation):
--   INSERT INTO cm_state (kind, scope_id, client_id, payload)
--   VALUES ($1, $2, $3, $4)
--   ON CONFLICT (kind, scope_id, client_id)
--   DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();

-- Rollback:
--   DROP TABLE IF EXISTS public.cm_state;
