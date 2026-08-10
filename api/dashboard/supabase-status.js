// GET /api/dashboard/supabase-status?client=aom
// Returns agent status, messages, and tasks from Supabase.
// Optional ?client= query param scopes all table fetches to a specific tenant.
// Default client_id = 'aom' (us). This is the multi-tenant isolation foundation.
// Caller must pass Authorization: Bearer <jwt>; verifyTenant gates by tenant.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { classifyCommandWorkBucket } from '../_lib/commandWorkStatus.js';
import { directChatTitlesByAgent } from '../_lib/chatTitles.js';

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

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // Resolve + verify tenant. Falls back to 'aom' default; verifyTenant
  // requires a JWT and proves the caller may access that tenant.
  const requested = (req.query.client && req.query.client.trim())
    ? req.query.client.trim().toLowerCase()
    : DEFAULT_CLIENT_ID;
  let clientId;
  const _vtStart = Date.now();
  let _vtMs = 0;
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req));
    _vtMs = Date.now() - _vtStart;
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  // Filter all queries by client_id for multi-tenant isolation.
  // Requires: ALTER TABLE messages ADD COLUMN client_id text DEFAULT 'aom';
  //           ALTER TABLE tasks ADD COLUMN client_id text DEFAULT 'aom';
  //           ALTER TABLE agent_status ADD COLUMN client_id text DEFAULT 'aom';
  // Until those columns exist, Supabase silently ignores the filter -- safe to include always.
  const clientFilter = `&client_id=eq.${encodeURIComponent(clientId)}`;

  // corner:corner-ui-cv6 (2026-06-24): per-query timing so we fix the REAL slow
  // query (Patrik: "load time is real bad waiting for projects"). Additive only —
  // wraps each parallel query in a timer; the response carries `_timings` (ms) and
  // the slowest query is logged. Safe to leave in; remove once the bottleneck is fixed.
  const _timings = {};
  const _timed = async (label, p) => { const s = Date.now(); const r = await p; _timings[label] = Date.now() - s; return r; };
  const _tAll = Date.now();
  try {
    const [agents, messages, activeTasks, recentDone, projectDefs, rawEvents, tasksV2Active, tasksV2Done, archivedProjects, chatTitleRooms] = await Promise.all([
      _timed('agent_status', supabaseGet('agent_status', `order=slug${clientFilter}`)),
      _timed('messages', supabaseGet('messages', `order=timestamp.desc&limit=100${clientFilter}`)),
      // Legacy active tasks ONLY. Allowlist (not denylist) so v2 terminal
      // statuses (done/failed/cancelled) can never slip through unbounded -- that
      // bug pulled 700+ stale rows / 4MB per dashboard load (2026-05-18).
      _timed('tasks_active', supabaseGet('tasks', `status=in.(queued,active,todo,working,needs_input)&order=created_at.desc&limit=100${clientFilter}`)),
      // Recent completed tasks (legacy: status=completed only -- v2 done/failed fetched below)
      _timed('tasks_done', supabaseGet('tasks', `status=eq.completed&order=completed_at.desc&limit=50${clientFilter}`)),
      _timed('projects', supabaseGet('projects', `is_active=eq.true&order=recency_weight.desc${clientFilter}`)),
      // Events feed: DISABLED (corner:tenant-isolation R1). The `events` table has
      // NO client_id column, so the old `&client_id=eq.<clientId>` filter 400'd on
      // every load and this feed has been empty for everyone regardless — the
      // prior "scoped by migration 010, no post-filter needed" comment was FALSE.
      // Because events cannot be tenant-scoped at the DB, we do NOT read it here:
      // dropping the filter would leak every world's events into this feed. Any
      // per-project event surface (doc-updates / missions-created) gates in the
      // API layer via verifyProjectAccess. Kept as [] so the response shape holds.
      Promise.resolve([]),
      // Architecture v2: tasks with v2 statuses (source of truth for Right Now bar).
      // Right Now bar = status building | running | qa. running is set by task-runner.sh claim.
      // These rows have agent_identity + title columns (v2 schema added by migration 20260401000001).
      _timed('tasksV2_active', supabaseGet('tasks', `status=in.(queued,classifying,planning,building,running,qa)&order=priority.desc,sort_order.asc,created_at.asc&limit=100${clientFilter}`).catch(() => [])),
      // V2 done/failed tasks for completed section
      _timed('tasksV2_done', supabaseGet('tasks', `status=in.(done,failed)&order=completed_at.desc&limit=50${clientFilter}`).catch(() => [])),
      // corner:corner-ui-cv6 wd40 DEF-4: archived project slugs (tiny query).
      // The room list / pickers are built from agent_status type='project'
      // rows below; those rows have no is_active column, so an archived
      // project (projects.is_active=false) whose agent_status row wasn't
      // flipped to hidden would still render with a live dot. This set
      // closes that gap server-side for every consumer of this endpoint.
      _timed('projects_archived', supabaseGet('projects', `is_active=eq.false&select=slug${clientFilter}`).catch(() => [])),
      _timed('chat_titles', supabaseGet('rooms', `type=eq.chat&select=id,name${clientFilter}`).catch(() => [])),
    ]);
    _timings._total = Date.now() - _tAll;
    _timings._verifyTenant = _vtMs;
    { const slowest = Object.entries(_timings).filter(([k]) => k !== '_total').sort((a, b) => b[1] - a[1])[0];
      console.log(`[supabase-status] client=${clientId} total=${_timings._total}ms slowest=${slowest ? slowest[0] + ':' + slowest[1] + 'ms' : 'n/a'} all=${JSON.stringify(_timings)}`); }
    // corner:dashboard-speed (2026-06-02): task rows carry the full brief in
    // `text` and `description` (~3.6KB each). The dashboard feed/bar only render
    // a single line from them, but the raw payload was ~427KB for tasksV2 alone
    // (80% of the supabase-status response) and re-fired on every realtime change
    // + 60s poll — the page-load slowness Patrik + Courtney reported. Truncate the
    // two text columns to a display length here; the full brief is fetched
    // separately by any task-detail surface that needs it. All other fields
    // (id/status/title/agent_identity/project/error/metadata/...) pass through.
    // corner:corner-ui-cv6 (2026-06-24): measured the live payload — tasksV2 was 127KB of a
    // 256KB response (50 rows). Per row: metadata 48KB total (nested plans/logs/sub-results
    // NOTHING in the dashboard reads — only the scalar metadata.project is used), result 14KB,
    // text/description already trimmed. The big page can't process that fast (load felt slow).
    // So: truncate the long text fields AND slim metadata to scalar keys only (drop nested
    // objects/arrays — the dead weight), keeping metadata.project + any small scalar.
    const TASK_TEXT_MAX = 280;
    const slimMeta = (md) => {
      if (!md || typeof md !== 'object' || Array.isArray(md)) return md;
      const out = {};
      for (const [k, v] of Object.entries(md)) {
        if (v == null || typeof v === 'object') continue; // drop nested objects/arrays (the bulk)
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
      // corner:corner-ui-cv6 R-CMD-BUCKETS (2026-07-18): stamp the normalized
      // work bucket (proposed | inprogress | done | blocked | failed | null)
      // right here so every consumer renders the SAME three-buckets truth —
      // Patrik's "Command center doesn't know what's in progress vs proposed
      // vs done" was every task reaching the surface status-blind.
      out.bucket = classifyCommandWorkBucket(out.status);
      return out;
    };
    const tasks = [...activeTasks, ...recentDone].map(slimTask);

    // corner:corner-ui-cv6 (2026-06-24): same payload-slim for messages. The feed renders
    // ONLY a one-line preview (Command ledger firstLine, recency by timestamp/project), but
    // the query returned 100 FULL message bodies (agent messages run long). Mirror slimTask:
    // truncate text to a preview length; all other fields (project/timestamp/agent/metadata/
    // id) pass through. Cuts the largest remaining response payload Patrik waits on.
    const MSG_TEXT_MAX = 240;
    const slimMessage = (m) => {
      if (!m || typeof m !== 'object') return m;
      const out = { ...m };
      if (typeof out.text === 'string' && out.text.length > MSG_TEXT_MAX) out.text = out.text.slice(0, MSG_TEXT_MAX);
      if (typeof out.content === 'string' && out.content.length > MSG_TEXT_MAX) out.content = out.content.slice(0, MSG_TEXT_MAX);
      return out;
    };

    // Architecture v2: task-runner tasks (building/qa = Right Now, queued/planning = queue)
    // Separate from legacy tasks to avoid double-counting in existing pill logic.
    const tasksV2 = [...tasksV2Active, ...tasksV2Done].map(slimTask);

    // Events feed intentionally empty — see the disabled query above. `events`
    // has no client_id column and cannot be tenant-scoped at the DB, so it is
    // not read here (fails closed rather than leaking cross-world).
    const recentEvents = rawEvents;

    // Split agents vs projects.
    // R77-t10 follow-up: respect agent_status.hidden — Patrik's complaint of
    // "extra agent for arsenal in Ben's room" was the duplicate `arsenal`
    // row (hidden=true after migration 028) still flowing through because
    // this splitter didn't filter by hidden, and the row mapper below
    // didn't even project the field. Now: hidden rows are dropped here
    // so they never reach the client.
    const visibleAgents = agents.filter(a => !a.hidden);
    const agentList = visibleAgents.filter(a => a.type === 'agent');
    // wd40 DEF-4: drop agent_status project rooms whose projects row is
    // archived — projects.is_active is the canonical lifecycle flag.
    const archivedSlugs = new Set((archivedProjects || []).map(p => p.slug).filter(Boolean));
    const projectList = visibleAgents.filter(a => a.type === 'project' && !archivedSlugs.has(a.slug));

    // Build status format matching what useDataPipe expects.
    // agent_status table is the SOLE source of truth for agent status.
    // status_source and status_set_at are included for transparency.
    const chatTitles = directChatTitlesByAgent(chatTitleRooms, clientId);
    const agentStatuses = agentList.map(a => ({
      slug: a.slug,
      name: a.name,
      display_name: a.display_name || null,
      role: a.role,
      chatTitle: chatTitles[a.slug] || null,
      status: a.status || 'idle',
      currentTask: a.current_task || '',
      color: a.color,
      updatedAt: a.updated_at || null,
      statusSource: a.status_source || null,
      statusSetAt: a.status_set_at || null,
      last_naming_nudge_at: a.last_naming_nudge_at || null,
      is_super: a.is_super || false,
      is_ea: a.is_ea || false,
      is_terminal: a.is_terminal || false,
      is_owner: a.is_owner || false,
    }));

    // Build throughput from recent messages
    const now = new Date();
    const hourAgo = new Date(now - 3600000).toISOString();
    const recentMessages = messages.filter(m => m.timestamp > hourAgo);

    // Build blockers from tasks
    const blockers = tasks
      .filter(t => t.status === 'blocked')
      .map(t => ({
        text: t.text,
        agent: t.agent,
        project: t.project,
      }));

    res.status(200).json({
      agents: agentStatuses,
      projects: projectList,
      projectDefs,
      messages: messages.map(slimMessage).reverse(), // oldest first, text trimmed to preview length
      tasks,
      events: recentEvents, // newest-first; for activity feed ONLY -- NOT for status or RNB derivation
      tasksV2,              // Architecture v2: task-runner tasks. Right Now = status building|qa only.
      blockers,
      throughput: {
        messagesLastHour: recentMessages.length,
        activeAgents: agentList.filter(a => a.status === 'working').length,
        blockedAgents: agentList.filter(a => a.status === 'blocked').length,
      },
      lastUpdated: new Date().toISOString(),
      source: 'supabase',
      clientId,   // echo back which tenant was served
      _timings,   // per-query ms + _total; diagnostic for the projects load-time fix
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
