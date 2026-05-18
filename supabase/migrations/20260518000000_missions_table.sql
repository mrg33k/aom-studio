-- Missions table for the bulletproof browser (R-MP-3 + R-DC-5 + R-MP-5).
-- Replaces the registry JSON as the source of truth for mission state.
-- The registry stays as the build-time scaffold seed.
--
-- Apply via Supabase Studio SQL Editor OR `supabase db push --linked`.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.missions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL,                  -- e.g. "ambition-mechanical:hero"
  raw_slug        text NOT NULL,                  -- e.g. "hero"
  name            text NOT NULL,
  project_slug    text NOT NULL,
  workstream_slug text,                            -- null = top-level (Corner-shape)
  status          text NOT NULL DEFAULT 'active', -- active | done | pending
  is_done         boolean NOT NULL DEFAULT false,
  last_updated    timestamptz,
  world           text NOT NULL DEFAULT 'aom',
  sort_order      integer NOT NULL DEFAULT 1000,  -- midpoint algorithm for drag-reorder
  archived_at     timestamptz,                    -- R-MP-5 cascade-archive
  archived_by     text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  path            text,                            -- filesystem path under corner/
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Slug must be unique within a world (cross-tenant uniqueness not required).
CREATE UNIQUE INDEX IF NOT EXISTS missions_world_slug_uidx
  ON public.missions (world, slug);

-- Common query paths.
CREATE INDEX IF NOT EXISTS missions_world_project_idx
  ON public.missions (world, project_slug);
CREATE INDEX IF NOT EXISTS missions_world_workstream_idx
  ON public.missions (world, project_slug, workstream_slug);
CREATE INDEX IF NOT EXISTS missions_archived_idx
  ON public.missions (archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS missions_last_updated_idx
  ON public.missions (last_updated DESC NULLS LAST);

-- updated_at trigger.
CREATE OR REPLACE FUNCTION public.missions_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS missions_updated_at_trg ON public.missions;
CREATE TRIGGER missions_updated_at_trg
  BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.missions_set_updated_at();

-- Realtime publication so the dashboard mission-tree subscribes natively.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'missions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
  END IF;
END $$;

-- RLS — service role bypasses; authenticated users read via JWT world claim.
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS missions_select_own_world ON public.missions;
CREATE POLICY missions_select_own_world ON public.missions
  FOR SELECT TO authenticated
  USING (
    world = COALESCE((auth.jwt() ->> 'world')::text, 'aom')
    OR EXISTS (
      -- shared project access via project_access table (existing pattern)
      SELECT 1 FROM public.project_access pa
      WHERE pa.client_id = COALESCE((auth.jwt() ->> 'world')::text, 'aom')
        AND pa.project_slug = public.missions.project_slug
    )
  );

DROP POLICY IF EXISTS missions_insert_service ON public.missions;
CREATE POLICY missions_insert_service ON public.missions
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS missions_update_service ON public.missions;
CREATE POLICY missions_update_service ON public.missions
  FOR UPDATE TO authenticated USING (false);

-- service_role bypasses RLS automatically; writes happen via the
-- service-role-keyed API endpoints (missions-tree.js / future write
-- endpoints), never directly from the dashboard JWT.

COMMENT ON TABLE public.missions IS 'Bulletproof mission browser source of truth. See corner/missions/mission-panel/.';
COMMENT ON COLUMN public.missions.archived_at IS 'R-MP-5 cascade-archive timestamp. NULL = active.';
COMMENT ON COLUMN public.missions.sort_order IS 'Midpoint algorithm for drag-reorder. Re-balanced periodically by the API.';
