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
// Caller passes Authorization: Bearer <jwt>; verifyTenant gates by tenant. Task rows
// come from the Convex queue (corner:retire-supabase R1, 2026-09-03).

import { convexQuery } from '../_lib/reportsStore.js';
import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';

// The world this request is scoped to. An explicit value wins; otherwise the world is
// resolved from the VERIFIED JWT — never a hardcoded default.
//
// This read `DEFAULT_CLIENT_ID = 'aom'` (2026-07-27 audit): one world hardcoded in place
// of the one that should be resolved. Invisible to the people most likely to test it —
// Patrik, Ash and Courtney are all world 'aom' — and silently wrong for every other
// world, whose world-less request was filed against Patrik's namespace and then refused
// for the wrong reason. useRunningTasks already sends ?client=<worldId> and refuses to
// fetch without one, so this only changes a request that omits it.
//
// No session → 401. A verified session whose account carries no world → an explicit 400
// naming the fix, never a silent fallback into another world.
async function scopeWorld(explicit, req) {
  const given = explicit == null ? '' : String(explicit).trim();
  if (given) return given.toLowerCase();
  const who = await callerIdentity(req);
  if (!who) throw new TenantAuthError('jwt required', 401);
  if (!who.world) throw new TenantAuthError('this account is not in a world; send an explicit world', 400);
  return who.world;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Cache-Control', 'no-store');

  let clientId;
  try {
    const requested = await scopeWorld(req.query.client, req);
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
  // corner:retire-supabase R1 (2026-09-03): the task queue is on Convex.
  const rows = await convexQuery('tasks:find', {
    client_id: clientId,
    status_in: ['building', 'running'],
    ...(optProject ? { project: optProject } : {}),
    order: 'started_at.desc.nullslast,created_at.desc',
    limit: 25,
  });

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
  // Follow-ups still live in the Supabase `followups` table. Not read here any
  // more (no Supabase reads from this endpoint); they come back on Convex in
  // corner:retire-supabase R2.
  const followupRows = [];

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
