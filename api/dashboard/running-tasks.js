// GET /api/dashboard/running-tasks?client=<world>[&project=<slug>]
//
// The chat "working in the background" card's data source. Two DIFFERENT kinds of
// in-flight work, because covering only the first is what made the card useless:
//
//   tasks[]    — dispatched jobs a background worker is ACTIVELY executing right now
//                (status building | running). Excludes queued/planning (not started, no
//                real elapsed) and done/failed (finished — the card must vanish).
//   promises[] — pending come-backs (`followups` rows, status pending): an agent said in
//                the room that it would report back and has not yet.
//
// WHY promises were added (2026-07-25). The card shipped reading ONLY the tasks table, and
// Patrik still asked "how long has the build been running / is it actually running" eight
// times that day. The reason: work started INSIDE a room turn never creates a task row, and
// the room's own live step strip only renders while `awaiting` is true — the moment the
// agent replies "it's building in the background now", the strip disappears and the tasks
// table is empty, so the UI goes silent exactly when the user starts wondering. A pending
// followup is the one durable record that survives past that reply, so it is the honest
// signal for "something is still coming".
//
// Honesty rule (no fake UI): a pending followup means an agent COMMITTED to come back, not
// that a process is provably burning CPU. The two are returned as separate arrays and the
// card labels them differently — never merge them into one "working" claim.
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

  const optProject = (req.query.project && String(req.query.project).trim())
    ? String(req.query.project).trim()
    : null;

  const clientFilter = `&client_id=eq.${encodeURIComponent(clientId)}`;
  // Scope by project in the QUERY, not after — otherwise limit=25 is applied to the
  // whole world first and a project's running job can fall off the page when many jobs
  // run at once, leaving the card empty for a room that genuinely has work in flight.
  const projectFilter = optProject ? `&project=eq.${encodeURIComponent(optProject)}` : '';
  const select = 'select=id,title,text,description,agent,agent_identity,builder,project,created_at,started_at,status,metadata';
  // started_at first (set by task-runner on claim) so the freshest job leads; nulls last.
  const rows = await supabaseGet(
    'tasks',
    `status=in.(building,running)${projectFilter}&order=started_at.desc.nullslast,created_at.desc&limit=25${clientFilter}&${select}`,
  );

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

  // Pending come-backs for this room. `trigger_ref` carries the ISO due time the
  // registrar stamped (created + FOLLOWUP_DEFAULT_DELAY_MIN); `promise_context` is the
  // sentence the agent actually said, so the card can show the commitment verbatim
  // rather than a generic "working" line.
  const followupSelect = 'select=id,agent,project,mission,promise_context,trigger_ref,created_at,status';
  const followupRows = await supabaseGet(
    'followups',
    `status=eq.pending${projectFilter}&order=created_at.desc&limit=25${clientFilter}&${followupSelect}`,
  );

  const promises = (Array.isArray(followupRows) ? followupRows : [])
    .map((f) => ({
      id: f.id,
      title: String(f.promise_context || '').trim() || 'Coming back with an update',
      who: f.agent || 'agent',
      project: f.project || null,
      mission: f.mission || null,
      since: f.created_at || null,
      due: f.trigger_ref || null,
    }))
    .filter((p) => !optProject || p.project === optProject);

  return res.status(200).json({
    tasks,
    promises,
    count: tasks.length + promises.length,
  });
}
