-- corner:one-write-path R7 (2026-07-23): trigger v2 — project-aware, malformed-
-- composite re-derivation, metadata rewrite. Kills the two generators of
-- "two rooms, one topic" AT INSERT:
--
--   1. bare slug + project used to canonicalize through the GLOBAL first-wins
--      table, ignoring NEW.project (AOM 'social' -> ambition-mechanical:social).
--   2. malformed composites ('social:social' double-prefix junk) passed through
--      every layer unchanged and self-perpetuated.
--
-- v2 rules (exact parity with scripts/lib/room_canon.py and
-- src/dashboard/data/canonicalize-mission-slug.js — one vector suite, three mirrors):
--   BARE m + project p:  scoped (p,m) -> known-project compose p:m ->
--                        global first-wins -> leave bare.
--   COMPOSITE m:         known canonical -> unchanged; else re-derive by tail:
--                        scoped (p,t) -> global t -> p:t if p known -> unchanged.
--   When canonicalization changes m, metadata.mission_slug is REWRITTEN so the
--   row itself is corrected, not just its room_id.
--
-- mission_slug_canon_all: ALL (raw, canon) pairs + project prefix. The winners
-- table (mission_slug_canon, PK raw) can only hold first-wins winners, so a
-- legit losing-side composite (space-rising:website when aztacoboys:website won
-- the raw) would look "unknown" and get corrupted — the all-pairs table is what
-- makes known-canonical and scoped checks safe. Populated by
-- scripts/sync-mission-canon.py (v2). While EMPTY, the trigger falls back to
-- exactly v1 behavior (safe deploy gap between migration and first sync).
--
-- Non-destructive: BEFORE INSERT only; history untouched. Rollback: re-apply
-- the v1 body preserved in the comment block at the bottom of this file.

CREATE TABLE IF NOT EXISTS mission_slug_canon_all (
  raw     text NOT NULL,
  canon   text NOT NULL,
  project text NOT NULL,
  PRIMARY KEY (raw, canon)
);
CREATE INDEX IF NOT EXISTS idx_msca_project ON mission_slug_canon_all (project);
CREATE INDEX IF NOT EXISTS idx_msca_canon   ON mission_slug_canon_all (canon);
GRANT SELECT ON mission_slug_canon_all TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON mission_slug_canon_all TO service_role;

CREATE OR REPLACE FUNCTION public.messages_derive_room_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  cid      text;
  m        text;
  m0       text;
  c        text;
  t        text;
  p        text;
  derived  text;
  have_all boolean;
BEGIN
  cid := COALESCE(NULLIF(trim(NEW.client_id), ''), 'aom');
  IF cid LIKE 'shared:%' THEN
    derived := cid;
  ELSE
    m := NULLIF(trim(COALESCE(NEW.metadata->>'mission_slug', '')), '');
    p := NULLIF(trim(COALESCE(NEW.project, '')), '');
    IF m IS NOT NULL THEN
      m0 := m;
      SELECT EXISTS (SELECT 1 FROM mission_slug_canon_all LIMIT 1) INTO have_all;
      IF position(':' in m) = 0 THEN
        -- BARE: scoped -> known-project compose -> global first-wins -> bare
        c := NULL;
        IF have_all AND p IS NOT NULL THEN
          SELECT canon INTO c FROM mission_slug_canon_all
            WHERE raw = m AND project = p LIMIT 1;
          IF c IS NULL AND EXISTS (SELECT 1 FROM mission_slug_canon_all WHERE project = p) THEN
            c := p || ':' || m;
          END IF;
        END IF;
        IF c IS NULL THEN
          SELECT canon INTO c FROM mission_slug_canon WHERE raw = m;
        END IF;
        IF c IS NOT NULL THEN m := c; END IF;
      ELSIF have_all AND NOT EXISTS (SELECT 1 FROM mission_slug_canon_all WHERE canon = m) THEN
        -- MALFORMED COMPOSITE: re-derive by tail: scoped -> global -> p:t -> unchanged
        t := regexp_replace(m, '^.*:', '');
        c := NULL;
        IF p IS NOT NULL THEN
          SELECT canon INTO c FROM mission_slug_canon_all
            WHERE raw = t AND project = p LIMIT 1;
        END IF;
        IF c IS NULL THEN
          SELECT canon INTO c FROM mission_slug_canon WHERE raw = t;
        END IF;
        IF c IS NULL AND p IS NOT NULL
           AND EXISTS (SELECT 1 FROM mission_slug_canon_all WHERE project = p) THEN
          c := p || ':' || t;
        END IF;
        IF c IS NOT NULL THEN m := c; END IF;
      END IF;
      IF m IS DISTINCT FROM m0 THEN
        NEW.metadata := jsonb_set(COALESCE(NEW.metadata, '{}'::jsonb),
                                  '{mission_slug}', to_jsonb(m), true);
      END IF;
      derived := cid || ':mission:' || m;
    ELSIF p IS NOT NULL THEN
      derived := cid || ':project:' || p;
    ELSE
      derived := cid || ':agent:' || COALESCE(NULLIF(trim(NEW.agent), ''), 'elon');
    END IF;
  END IF;

  IF NEW.room_id IS NULL OR trim(NEW.room_id) = '' THEN
    NEW.room_id := derived;
  ELSIF NEW.room_id <> derived THEN
    RAISE EXCEPTION 'room_id "%" does not match derived "%" for this row (one-write-path R4: route deliberately or let the trigger derive)',
      NEW.room_id, derived;
  END IF;
  RETURN NEW;
END $function$;

-- ============================================================================
-- ROLLBACK REFERENCE — the exact v1 body live before this migration
-- (fetched from prod 2026-07-23). To roll back, re-run CREATE OR REPLACE with:
--
-- DECLARE
--   cid     text;
--   m       text;
--   c       text;
--   derived text;
-- BEGIN
--   cid := COALESCE(NULLIF(trim(NEW.client_id), ''), 'aom');
--   IF cid LIKE 'shared:%' THEN
--     derived := cid;
--   ELSE
--     m := NULLIF(trim(COALESCE(NEW.metadata->>'mission_slug', '')), '');
--     IF m IS NOT NULL THEN
--       IF position(':' in m) = 0 THEN
--         SELECT canon INTO c FROM mission_slug_canon WHERE raw = m;
--         IF c IS NOT NULL THEN m := c; END IF;
--       END IF;
--       derived := cid || ':mission:' || m;
--     ELSIF NULLIF(trim(COALESCE(NEW.project, '')), '') IS NOT NULL THEN
--       derived := cid || ':project:' || trim(NEW.project);
--     ELSE
--       derived := cid || ':agent:' || COALESCE(NULLIF(trim(NEW.agent), ''), 'elon');
--     END IF;
--   END IF;
--   IF NEW.room_id IS NULL OR trim(NEW.room_id) = '' THEN
--     NEW.room_id := derived;
--   ELSIF NEW.room_id <> derived THEN
--     RAISE EXCEPTION 'room_id "%" does not match derived "%" for this row (one-write-path R4: route deliberately or let the trigger derive)',
--       NEW.room_id, derived;
--   END IF;
--   RETURN NEW;
-- END
-- ============================================================================
