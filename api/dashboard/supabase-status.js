// GET /api/dashboard/supabase-status?client=aom
// Returns agent status, messages, and tasks from Supabase.
// Optional ?client= query param scopes all table fetches to a specific tenant.
// Default client_id = 'aom' (us). This is the multi-tenant isolation foundation.

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

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // Resolve client_id -- scopes all queries to the correct tenant.
  // ?client=acme in the URL overrides the default.
  const clientId = (req.query.client && req.query.client.trim())
    ? req.query.client.trim().toLowerCase()
    : DEFAULT_CLIENT_ID;

  // Filter all queries by client_id for multi-tenant isolation.
  // Requires: ALTER TABLE messages ADD COLUMN client_id text DEFAULT 'aom';
  //           ALTER TABLE tasks ADD COLUMN client_id text DEFAULT 'aom';
  //           ALTER TABLE agent_status ADD COLUMN client_id text DEFAULT 'aom';
  // Until those columns exist, Supabase silently ignores the filter -- safe to include always.
  const clientFilter = `&client_id=eq.${encodeURIComponent(clientId)}`;

  try {
    const [agents, messages, activeTasks, recentDone, projectDefs, rawEvents, tasksV2Active, tasksV2Done] = await Promise.all([
      supabaseGet('agent_status', `order=slug${clientFilter}`),
      supabaseGet('messages', `order=timestamp.desc&limit=100${clientFilter}`),
      // Non-completed, non-blocked tasks (legacy statuses only -- queued, active, todo, working, done, rejected, failed)
      // V2 statuses (classifying, planning, building, qa) are fetched separately below as tasksV2Active.
      supabaseGet('tasks', `status=not.in.(completed,blocked,classifying,planning,building,qa)&order=created_at.desc${clientFilter}`),
      // Recent completed tasks (legacy: status=completed only -- v2 done/failed fetched below)
      supabaseGet('tasks', `status=eq.completed&order=completed_at.desc&limit=50${clientFilter}`),
      supabaseGet('projects', `is_active=eq.true&order=recency_weight.desc${clientFilter}`),
      // Events table: for activity feed display ONLY. NOT used for status derivation or RNB.
      // agent_status table is the sole source of truth for all agent status.
      // client_id column added by migration 010 -- filter applies to all tenants including AOM.
      supabaseGet('events', `order=timestamp.desc&limit=200&timestamp=gte.${new Date(Date.now() - 30 * 60 * 1000).toISOString()}${clientFilter}`),
      // Architecture v2: tasks with v2 statuses (source of truth for Right Now bar).
      // Right Now bar = ONLY status=building or status=qa. Hard rule.
      // These rows have agent_identity + title columns (v2 schema added by migration 20260401000001).
      supabaseGet('tasks', `status=in.(queued,classifying,planning,building,qa)&order=priority.desc,sort_order.asc,created_at.asc&limit=100${clientFilter}`).catch(() => []),
      // V2 done/failed tasks for completed section
      supabaseGet('tasks', `status=in.(done,failed)&order=completed_at.desc&limit=50${clientFilter}`).catch(() => []),
    ]);
    const tasks = [...activeTasks, ...recentDone];

    // Architecture v2: task-runner tasks (building/qa = Right Now, queued/planning = queue)
    // Separate from legacy tasks to avoid double-counting in existing pill logic.
    const tasksV2 = [...tasksV2Active, ...tasksV2Done];

    // Events are scoped by client_id at the DB level (migration 010 added the column + RLS).
    // No post-filter needed -- all tenants including AOM see only their own events.
    const recentEvents = rawEvents;

    // Split agents vs projects
    const agentList = agents.filter(a => a.type === 'agent');
    const projectList = agents.filter(a => a.type === 'project');

    // Build status format matching what useDataPipe expects.
    // agent_status table is the SOLE source of truth for agent status.
    // status_source and status_set_at are included for transparency.
    const agentStatuses = agentList.map(a => ({
      slug: a.slug,
      name: a.name,
      role: a.role,
      status: a.status || 'idle',
      currentTask: a.current_task || '',
      color: a.color,
      updatedAt: a.updated_at || null,
      statusSource: a.status_source || null,
      statusSetAt: a.status_set_at || null,
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
      messages: messages.reverse(), // oldest first
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
