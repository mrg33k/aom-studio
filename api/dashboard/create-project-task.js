// POST /api/dashboard/create-project-task
// R21c. Server-side task creation scoped to a project. Mirrors
// lib/rexTaskClient.js createTaskWithRex but runs with the service role
// key so RLS on dependent tables (events triggers, etc.) doesn't block
// the client-side insert.
//
// Body: { text, projectSlug, clientId?, mission_slug? }
// Returns: { ok: true, task: { id, title, status, project } }
//
// AUTH (corner:identity-attribution, 2026-07-27). The row this endpoint writes
// is status='queued', and scripts/task-runner.sh claims queued rows and runs
// their free text as the brief of a fresh Claude Code session on Patrik's Mac.
// Unauthenticated that is remote code execution from the open internet. So:
//   - a valid JWT is required and must pass verifyTenant() for the world,
//   - `created_by` comes from the JWT, never from the body (a task attributed
//     to a name the caller chose is exactly the "Patrik said X" forgery),
//   - CORS is the dashboard origins, not `*`.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { authorizeTaskProject, taskScopeDenialMessage } from '../_lib/taskScope.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin));
}

function applyCors(req, res) {
  const origin = req.headers?.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function cleanTitle(raw) {
  const s = (raw || '').trim().replace(/\s+/g, ' ');
  if (!s) return 'Untitled task';
  return s.length > 140 ? s.slice(0, 137) + '…' : s;
}

// Fire-and-forget: log mission_first_warn to events table.
async function _logMissionWarnEvent({ project, source }) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  const now = new Date().toISOString();
  const event = {
    id: crypto.randomUUID(),
    timestamp: now,
    agent: 'corner-dashboard',
    event_type: 'mission_first_warn',
    payload: { project: project || '', source: source || 'create-project-task.js', timestamp: now },
  };
  await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(event),
  });
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const { text, projectSlug, clientId, mission_slug: rawMission, ops_query } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  // Tenant gate BEFORE anything is written. verifyTenant admits the owner world
  // and (for shared:<slug>) any world holding a project_access grant.
  const _reqClient = clientId && String(clientId).trim();
  if (!_reqClient) return res.status(401).json({ error: 'Missing client' });
  let verified;
  try {
    verified = await verifyTenant(_reqClient.toLowerCase(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  const slug = (projectSlug || '').toString().trim().toLowerCase() || null;
  if (!slug) return res.status(400).json({ error: 'projectSlug is required' });
  if (!/^[a-z0-9][a-z0-9-_]{0,64}$/.test(slug)) {
    return res.status(400).json({ error: 'invalid projectSlug' });
  }

  // --- PROJECT SCOPE (r7) ---------------------------------------------------
  // verifyTenant above answered "may this caller act inside their own WORLD".
  // It says NOTHING about `slug`, and until now nothing else did either: the
  // shape regex was the only check the slug ever faced. Everything the slug
  // then steers is execution — `project` and `metadata.repo` pick the checkout
  // task-runner.sh cds into, `project_path` is read straight out of
  // projects.repo_path FOR THAT SLUG regardless of which world holds it, and
  // `text` becomes a fresh sub-agent's brief.
  //
  // VERIFIED live: POST {clientId:'arsenal', projectSlug:'corner'} passed
  // verifyTenant (genuinely arsenal's own world) and produced a queued row with
  // project_path = AOM's aom-studio checkout. That is arbitrary agent execution
  // in another world's repository from an ordinary cross-world login.
  //
  // Same decision as every message writer (verifyProjectAccess, reached through
  // makeProjectScopeAuthorizer) — see api/_lib/taskScope.js for the one rule
  // that path adds and why. REFUSING, not dropping: a task stripped of its
  // project still runs, and "runs somewhere else" is the bug.
  const scopeVerdict = await authorizeTaskProject({ req, clientId: verified.tenant, projectSlug: slug });
  if (!scopeVerdict.ok) {
    console.warn(
      `[create-project-task] project scope DENIED: tenant "${verified.tenant}" slug "${slug}" — ${scopeVerdict.reason}`,
    );
    return res.status(403).json({
      error: taskScopeDenialMessage({ clientId: verified.tenant, projectSlug: slug, reason: scopeVerdict.reason }),
      code: 'PROJECT_SCOPE_DENIED',
    });
  }

  const missionSlug = (rawMission || '').toString().trim() || null;
  if (!missionSlug) {
    if (!ops_query) {
      return res.status(400).json({
        error: 'mission_slug is required. Every task must belong to a mission. Pass mission_slug in the request body, or set ops_query:true for legitimate non-mission operational tasks.',
        code: 'MISSION_SLUG_REQUIRED',
      });
    }
    // ops_query opt-out: log for observability but allow through.
    _logMissionWarnEvent({ project: slug, source: 'create-project-task.js' }).catch(() => {});
  }

  const title = cleanTitle(text);
  const client = verified.tenant;
  // Who queued this is derived from the JWT. If identity can't be resolved we
  // leave created_by null — an unattributed task, never a borrowed name.
  const identity = await callerIdentity(req).catch(() => null);
  const createdBy = identity?.userId || verified.userId || null;

  try {
    // Resolve repo_path for this slug so the runner knows where to cd.
    let repoPath = '';
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&select=repo_path&limit=1`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
      );
      if (r.ok) {
        const rows = await r.json();
        repoPath = (Array.isArray(rows) && rows[0] && rows[0].repo_path) || '';
      }
    } catch (_) { /* best effort */ }

    const metadata = {
      repo: slug,
      created_via: 'r21c-in-chat',
      model: 'sonnet',
      // Verified author, carried into the brief's metadata so a worker reading
      // the row can see WHO asked — and see the absence when nobody is named.
      requested_by_name: identity?.userName || null,
      requested_by_email: identity?.email || null,
    };
    if (missionSlug) metadata.mission_slug = missionSlug;

    const row = {
      title,
      text,
      description: text,
      status: 'queued',
      source: 'corner-dashboard-task',
      client_id: client,
      created_by: createdBy,
      project: slug,
      project_path: repoPath,
      metadata,
    };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      return res.status(502).json({ error: `Supabase insert failed: ${t.slice(0, 200)}` });
    }
    const inserted = await resp.json();
    const task = (Array.isArray(inserted) && inserted[0]) || null;
    return res.status(200).json({
      ok: true,
      task: task ? { id: task.id, title: task.title, status: task.status, project: task.project } : null,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'unknown error' });
  }
}
