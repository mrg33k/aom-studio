// GET /api/dashboard/status?client=aom
// Agent status, recent messages, tasks and projects in one snapshot for the
// dashboard (was /api/dashboard/supabase-status; that path re-exports this).
// Everything comes from Convex now (corner:retire-supabase R2, 2026-09-03):
//   agents:listStatus  the roster with idle/working and the task in hand
//   rooms:listRooms    project rooms and direct-chat titles
//   projects:list      the project registry (projectDefs, archived set)
//   messages:listSince the latest lines across the world
//   tasks:find         the queue
// The response keeps the shape useDataPipe expects. The legacy `tasks` list is
// the same Convex queue seen through the old status names, and `events` stays
// empty (the events ledger is not tenant-scoped).
// Caller must pass Authorization: Bearer <jwt>; verifyTenant gates by tenant.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { classifyCommandWorkBucket } from '../_lib/commandWorkStatus.js';
import { convexQuery } from '../_lib/reportsStore.js';
import { toLegacyRow } from './messages.js';

const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);
const AGENT_TITLE_OVERRIDES = { ea: 'EA', aom: 'AOM', qa: 'QA', os: 'OS', ai: 'AI' };
function agentTitle(slug) {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return 'Agent';
  if (AGENT_TITLE_OVERRIDES[key]) return AGENT_TITLE_OVERRIDES[key];
  return key.split(/[-_\s]+/).map((w) => AGENT_TITLE_OVERRIDES[w] || w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const ACTIVE_STATUSES = ['queued', 'running', 'building', 'needs_input', 'blocked'];
const DONE_STATUSES = ['done', 'failed'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  const requestedRaw = req.query.client && String(req.query.client).trim();
  if (!requestedRaw) return res.status(401).json({ error: 'Missing client' });
  const requested = requestedRaw.toLowerCase();
  let clientId;
  const vtStart = Date.now();
  let vtMs = 0;
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req));
    vtMs = Date.now() - vtStart;
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  // Per-query timing so the slow one is visible in the logs.
  const timings = {};
  const timed = async (label, p) => { const s = Date.now(); const r = await p; timings[label] = Date.now() - s; return r; };
  const tAll = Date.now();
  const safe = (p) => p.catch(() => []);
  try {
    const sinceMs = Date.now() - 7 * 24 * 3600 * 1000;
    const [agents, rooms, allProjects, recentMessages, activeTasks, doneTasks] = await Promise.all([
      timed('agents', safe(convexQuery('agents:listStatus', { worldId: clientId }))),
      timed('rooms', safe(convexQuery('rooms:listRooms', { worldId: clientId, filter: 'all' }))),
      timed('projects', safe(convexQuery('projects:list', { worldId: clientId, includeArchived: true }))),
      timed('messages', safe(convexQuery('messages:listSince', { worldSlug: clientId, since: sinceMs, limit: 100 }))),
      timed('tasks_active', safe(convexQuery('tasks:find', { client_id: clientId, status_in: ACTIVE_STATUSES, order: 'priority.desc,sort_order.asc,created_at.asc', limit: 100 }))),
      timed('tasks_done', safe(convexQuery('tasks:find', { client_id: clientId, status_in: DONE_STATUSES, order: 'completed_at.desc.nullslast', limit: 50 }))),
    ]);
    timings._total = Date.now() - tAll;
    timings._verifyTenant = vtMs;
    {
      const slowest = Object.entries(timings).filter(([k]) => !k.startsWith('_')).sort((a, b) => b[1] - a[1])[0];
      console.log(`[status] client=${clientId} total=${timings._total}ms slowest=${slowest ? slowest[0] + ':' + slowest[1] + 'ms' : 'n/a'} all=${JSON.stringify(timings)}`);
    }

    // Task rows carry the full brief. The feed renders one line, so trim the
    // long text fields and keep only scalar metadata.
    const TASK_TEXT_MAX = 280;
    const slimMeta = (md) => {
      if (!md || typeof md !== 'object' || Array.isArray(md)) return md;
      const out = {};
      for (const [k, v] of Object.entries(md)) {
        if (v == null || typeof v === 'object') continue;
        out[k] = (typeof v === 'string' && v.length > TASK_TEXT_MAX) ? v.slice(0, TASK_TEXT_MAX) : v;
      }
      return out;
    };
    const slimTask = (t) => {
      if (!t || typeof t !== 'object') return t;
      const out = { ...t };
      for (const f of ['text', 'description', 'result', 'error']) {
        if (typeof out[f] === 'string' && out[f].length > TASK_TEXT_MAX) out[f] = out[f].slice(0, TASK_TEXT_MAX);
      }
      if (out.metadata && typeof out.metadata === 'object') out.metadata = slimMeta(out.metadata);
      out.bucket = classifyCommandWorkBucket(out.status);
      return out;
    };
    const tasksV2 = [...(activeTasks || []), ...(doneTasks || [])].map(slimTask);
    // One queue now. The legacy list is the same rows so the pills that read
    // `tasks` (queued, done awaiting approval, blocked) keep working.
    const tasks = tasksV2;

    // Messages: one-line preview only.
    const MSG_TEXT_MAX = 240;
    const messages = (Array.isArray(recentMessages) ? recentMessages : []).map((m) => {
      const row = toLegacyRow(m, { world: clientId, room: { legacyRoomId: m.legacyRoomId, project: m.project, kind: m.roomKind, title: m.roomTitle } });
      if (typeof row.text === 'string' && row.text.length > MSG_TEXT_MAX) row.text = row.text.slice(0, MSG_TEXT_MAX);
      return row;
    });

    // Projects: the registry is projectDefs; archived slugs hide their rooms.
    const projectRows = Array.isArray(allProjects) ? allProjects : [];
    const projectDefs = projectRows.filter((p) => !p.archived && p.isActive).map((p) => ({
      id: String(p._id), slug: p.slug, name: p.name, client_id: p.clientId || clientId, color: p.color || null,
      is_active: !!p.isActive, recency_weight: p.recencyWeight ?? 0, repo_path: p.repoPath || p.projectPath || null,
      created_at: iso(p.createdAt), updated_at: iso(p.updatedAt),
    }));
    const archivedSlugs = new Set(projectRows.filter((p) => p.archived || p.isActive === false).map((p) => p.slug));
    const isInfra = (slug) => {
      if (!slug) return false;
      const s = String(slug).toLowerCase();
      return s === 'bridge-smoke' || s.startsWith('lab-') || s.startsWith('qa-') || s.startsWith('smoke-') || s.startsWith('proj-tool-') || s.startsWith('loop-test-') || s === 'daily-research';
    };
    const roomRows = Array.isArray(rooms) ? rooms : [];
    const projectList = roomRows
      .filter((r) => r.kind === 'project' && !r.archived && !archivedSlugs.has(r.project) && !isInfra(r.project))
      .map((r) => ({
        id: String(r._id), slug: r.project || r.title, name: r.title, type: 'project', client_id: clientId,
        status: 'idle', color: r.tint || null, hidden: false,
        last_message_at: iso(r.lastMessage?.createdAt), last_message_text: r.lastMessage?.text || '',
        updated_at: iso(r.lastMessage?.createdAt ?? r.createdAt),
      }));

    // Direct-chat titles: an agent room whose title is not the plain agent name.
    const chatTitles = {};
    for (const r of roomRows) {
      if (r.kind !== 'agent' || !r.specialist) continue;
      const title = String(r.title || '').trim();
      if (title && title !== agentTitle(r.specialist)) chatTitles[r.specialist] = title;
    }

    const agentList = Array.isArray(agents) ? agents : [];
    const agentStatuses = agentList.map((a) => ({
      slug: a.slug,
      name: a.title,
      display_name: null,
      role: a.subtitle || '',
      chatTitle: chatTitles[a.slug] || null,
      status: a.status || 'idle',
      currentTask: a.currentTask || '',
      color: a.color,
      updatedAt: iso(a.updatedAt),
      statusSource: null,
      statusSetAt: iso(a.updatedAt),
      last_naming_nudge_at: null,
      is_super: false,
      is_ea: a.slug === 'ea',
      is_terminal: false,
      is_owner: false,
    }));

    const hourAgo = Date.now() - 3600000;
    const lastHour = messages.filter((m) => Date.parse(m.timestamp) > hourAgo);
    const blockers = tasks.filter((t) => t.status === 'blocked').map((t) => ({ text: t.text, agent: t.agent, project: t.project }));

    res.status(200).json({
      agents: agentStatuses,
      projects: projectList,
      projectDefs,
      messages: messages.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)),
      tasks,
      events: [],
      tasksV2,
      blockers,
      throughput: {
        messagesLastHour: lastHour.length,
        activeAgents: agentList.filter((a) => a.status === 'working').length,
        blockedAgents: agentList.filter((a) => a.status === 'blocked').length,
      },
      lastUpdated: new Date().toISOString(),
      source: 'convex',
      clientId,
      _timings: timings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
