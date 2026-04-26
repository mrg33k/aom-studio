-- ============================================================
-- Migration 028: R77-t10 — arsenal room shape correctness
-- Generated: 2026-04-25 (revised mid-session for expanded scope)
-- Mission: corner:tenant-isolation
--
-- Patrik flagged: Ben's room renders 5 super agents instead of 1 EA + 5
-- project rooms (Sourcing, Arsenal Directory, Valor, S3C, Space Rising).
-- Pre-flight (service-role probes) found the rooms exist *partially*:
--
--   agent_status (arsenal): 5 rows — ea, arsenal, arsenal-directory,
--     sourcing, valor. ALL type='agent', is_super=false. So the dashboard
--     splitter (api/dashboard/supabase-status.js — agentList vs
--     projectList by `type` field) puts them all in the agent column.
--
--   projects (arsenal): only 1 row — Arsenal (slug=arsenal). The
--     three rooms above were never seeded into the projects table.
--
--   projects (aom, MISTAGGED): 1 row — S3C Semiconductor (slug=s3c)
--     created 2026-03-31 under client_id='aom'. Same mis-seeding pattern
--     as arsenal-ea (R77-t0 finding: agents/projects created during
--     Ben-tenant work but tagged client_id='aom'). Move to 'arsenal'.
--
--   tasks (mistagged): 1 row — project='arsenal-directory'
--     client_id='aom'. Same pattern; re-tag to 'arsenal'.
--
--   events (project_summary): the daemon writes summaries for sourcing,
--     arsenal-directory, valor, s3c agent slugs every ~minute. So those
--     "projects" already exist conceptually — they just never got the
--     projects-table row that tells the dashboard to render them as
--     project cards.
--
--   space-rising: NOT in any table. Net new — Patrik flagged it as
--     Ben's project; he'll explain more during onboarding.
--
-- Render path (no code change required for this round):
--   api/dashboard/supabase-status.js:75-76
--     const agentList   = agents.filter(a => a.type === 'agent');
--     const projectList = agents.filter(a => a.type === 'project');
--   Setting type='project' on the agent_status rows + seeding projects
--   table is sufficient.
--
-- Conversation continuity (the trust point):
--   useChatMessages.js:269-285 loads project chat messages with
--     where client_id=arsenal AND (project=<slug> OR agent='project:<slug>')
--   So the existing rows (project='sourcing' x2, project='arsenal-directory'
--   x2 in messages, plus the project-summary events) keep rendering after
--   the reclassify. No history loss.
-- ============================================================


-- ── 1. Promote EA to super agent (mirror Elon shape — is_super + is_ea) ──────

UPDATE public.agent_status
   SET is_super = true,
       is_ea = true
 WHERE client_id = 'arsenal'
   AND slug = 'ea';


-- ── 2. Reclassify Sourcing / Arsenal Directory / Valor as project rooms ─────

UPDATE public.agent_status
   SET type = 'project'
 WHERE client_id = 'arsenal'
   AND slug IN ('sourcing', 'arsenal-directory', 'valor');


-- ── 3. Hide duplicate 'arsenal' agent_status row ─────────────────────────────
-- The world itself IS Arsenal; projects.arsenal already carries the
-- world-level project. The agent_status arsenal row was inserted by
-- migration 025 (Ben rooms regression fix); duplicates without adding
-- signal. Hide rather than DELETE — recoverable if needed (R77-t0b lesson).

UPDATE public.agent_status
   SET hidden = true
 WHERE client_id = 'arsenal'
   AND slug = 'arsenal';


-- ── 4. Seed agent_status rows for s3c + space-rising ─────────────────────────
-- Same shape as the existing 4 rooms (type='project', is_super=false,
-- is_assignable=true, hidden=false, status='idle').

INSERT INTO public.agent_status
  (slug, client_id, name, role, type, is_super, is_assignable, hidden,
   status, project_folder)
SELECT new_a.slug, 'arsenal', new_a.name, new_a.role, 'project',
       false, true, false, 'idle', new_a.slug
  FROM (VALUES
    ('s3c',          'S3C Semiconductor', 'S3C semiconductor project'),
    ('space-rising', 'Space Rising',      'Space Rising brand mission')
  ) AS new_a(slug, name, role)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.agent_status a
    WHERE a.slug = new_a.slug
      AND a.client_id = 'arsenal'
 );


-- ── 5. Move mistagged S3C project from aom → arsenal ─────────────────────────
-- projects.s3c was created under client_id='aom' (2026-03-31), but it's
-- Ben's semiconductor project. Same mis-seeding pattern as arsenal-ea.
-- Re-tag in place so we don't churn the UUID and break any downstream
-- references (event payloads, chat history).

UPDATE public.projects
   SET client_id = 'arsenal'
 WHERE slug = 's3c'
   AND client_id = 'aom';


-- ── 6. Re-tag mistagged arsenal-directory task ───────────────────────────────
-- Same root cause as #5. One task with project='arsenal-directory' landed
-- under client_id='aom'.

UPDATE public.tasks
   SET client_id = 'arsenal'
 WHERE project = 'arsenal-directory'
   AND client_id = 'aom';


-- ── 7. Seed projects table rows for the 4 net-new project rooms ──────────────
-- s3c is handled by §5 (move). The other 4 (sourcing, arsenal-directory,
-- valor, space-rising) need fresh projects rows.
-- color=#6B8AB0 matches AOM's 'ben' project color; Patrik / Ben can
-- customize via agent-customize endpoint later.
-- Idempotent NOT EXISTS guard.

INSERT INTO public.projects (slug, name, client_id, type, is_active, color)
SELECT new_p.slug, new_p.name, 'arsenal', 'project', true, '#6B8AB0'
  FROM (VALUES
    ('sourcing',          'Sourcing'),
    ('arsenal-directory', 'Arsenal Directory'),
    ('valor',             'Valor'),
    ('space-rising',      'Space Rising')
  ) AS new_p(slug, name)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.projects p
    WHERE p.slug = new_p.slug
      AND p.client_id = 'arsenal'
 );


-- ── Done ──────────────────────────────────────────────────────────────────────
-- Post-migration verification (service role):
--   1. agent_status?client_id=eq.arsenal&select=slug,type,is_super,is_ea,hidden
--      → 7 rows total:
--        ea (type=agent, is_super=true, is_ea=true, hidden=false)
--        sourcing | arsenal-directory | valor | s3c | space-rising
--          (all type=project, is_super=false, hidden=false)
--        arsenal (type=agent, hidden=true)
--   2. projects?client_id=eq.arsenal&order=slug
--      → 6 rows: arsenal + arsenal-directory + s3c + sourcing + space-rising + valor
--   3. projects?slug=eq.s3c
--      → 1 row, client_id=arsenal (no longer aom)
--   4. messages?client_id=eq.arsenal&project=in.(sourcing,arsenal-directory)
--      → 4 historical messages preserved.
--   5. tasks?project=eq.arsenal-directory
--      → client_id=arsenal (re-tagged).
