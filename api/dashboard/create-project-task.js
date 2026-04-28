// POST /api/dashboard/create-project-task
// R21c. Server-side task creation scoped to a project. Mirrors
// lib/rexTaskClient.js createTaskWithRex but runs with the service role
// key so RLS on dependent tables (events triggers, etc.) doesn't block
// the client-side insert.
//
// Body: { text, projectSlug, clientId?, userId?, mission_slug? }
// Returns: { ok: true, task: { id, title, status, project } }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const { text, projectSlug, clientId, userId, mission_slug: rawMission } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  const slug = (projectSlug || '').toString().trim().toLowerCase() || null;
  if (!slug) return res.status(400).json({ error: 'projectSlug is required' });
  if (!/^[a-z0-9][a-z0-9-_]{0,64}$/.test(slug)) {
    return res.status(400).json({ error: 'invalid projectSlug' });
  }

  const missionSlug = (rawMission || '').toString().trim() || null;
  if (!missionSlug) {
    console.warn(
      '[mission-first] WARN: no mission_slug in create-project-task request. ' +
      'Pass mission_slug in request body. Hard error flip date: 2026-05-28.',
    );
    // Fire-and-forget — do not await or let failure block task creation.
    _logMissionWarnEvent({ project: slug, source: 'create-project-task.js' }).catch(() => {});
  }

  const title = cleanTitle(text);
  const client = clientId && /^[a-z0-9][a-z0-9-_:]{0,64}$/i.test(clientId) ? clientId : 'aom';

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
    };
    if (missionSlug) metadata.mission_slug = missionSlug;

    const row = {
      title,
      text,
      description: text,
      status: 'queued',
      source: 'corner-dashboard-task',
      client_id: client,
      created_by: userId || null,
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
