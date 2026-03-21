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
    const [agents, messages, activeTasks, recentDone] = await Promise.all([
      supabaseGet('agent_status', `order=slug${clientFilter}`),
      supabaseGet('messages', `order=timestamp.desc&limit=100${clientFilter}`),
      // Non-completed, non-blocked tasks (queued, active, todo, working, done, rejected, failed)
      supabaseGet('tasks', `status=not.in.(completed,blocked)&order=created_at.desc${clientFilter}`),
      // Recent completed tasks (for completed feed)
      supabaseGet('tasks', `status=eq.completed&order=completed_at.desc&limit=50${clientFilter}`),
    ]);
    const tasks = [...activeTasks, ...recentDone];

    // Split agents vs projects
    const agentList = agents.filter(a => a.type === 'agent');
    const projectList = agents.filter(a => a.type === 'project');

    // Build status format matching what useDataPipe expects
    const agentStatuses = agentList.map(a => ({
      slug: a.slug,
      name: a.name,
      role: a.role,
      status: a.status || 'idle',
      currentTask: a.current_task || '',
      color: a.color,
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
      messages: messages.reverse(), // oldest first
      tasks,
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
