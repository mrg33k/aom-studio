// GET /api/dashboard/running-tasks?client=<world>[&project=<slug>]
//
// The chat "working in the background" card's data source. Returns ONLY the tasks a
// background agent is ACTIVELY executing right now (status building | running) for the
// tenant — the honest set behind an elapsed count-up timer. Deliberately excludes
// queued/planning (not started yet, no real elapsed) and done/failed (finished — the
// card must vanish). Slim shape; scoped by client_id for multi-tenant isolation and,
// optionally, narrowed to one project.
//
// Caller passes Authorization: Bearer <jwt>; verifyTenant gates by tenant. Same auth +
// supabaseGet idiom as supabase-status.js.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const DEFAULT_CLIENT_ID = 'aom';

async function supabaseGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const requested = (req.query.client && req.query.client.trim())
    ? req.query.client.trim().toLowerCase()
    : DEFAULT_CLIENT_ID;
  let clientId;
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  const clientFilter = `&client_id=eq.${encodeURIComponent(clientId)}`;
  const select = 'select=id,title,text,description,agent,agent_identity,builder,project,created_at,started_at,status,metadata';
  // started_at first (set by task-runner on claim) so the freshest job leads; nulls last.
  const rows = await supabaseGet(
    'tasks',
    `status=in.(building,running)&order=started_at.desc.nullslast,created_at.desc&limit=25${clientFilter}&${select}`,
  );

  const optProject = (req.query.project && String(req.query.project).trim())
    ? String(req.query.project).trim()
    : null;

  const tasks = (Array.isArray(rows) ? rows : [])
    .map((t) => {
      const md = t.metadata || {};
      return {
        id: t.id,
        title: t.title || t.description || (t.text ? String(t.text).split('\n')[0] : '') || 'Working…',
        who: t.agent_identity || t.builder || t.agent || 'agent',
        project: t.project || md.project || null,
        since: t.started_at || t.created_at || null,
        status: t.status,
      };
    })
    .filter((t) => !optProject || t.project === optProject);

  return res.status(200).json({ tasks, count: tasks.length });
}
