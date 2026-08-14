// GET /api/dashboard/project-paragraph?world=<client_id>&scope=all|<slug>[&expanded=0|1]
//
// R62 (session 20) — the living paragraph shown above the tasks-view
// WeeklyStatsCard + ActiveTasksSection stack. Composes a 2-3 sentence
// summary of the most-recent activity either across every project
// (scope=all) or scoped to a single project (scope=<slug>). No LLM
// calls — NO Anthropic-from-dashboard rule. Pure template-based
// synthesis of recent messages + scaffold events + task counts.
//
// R62-writer (deferred sub-round) will replace this endpoint with a
// daemon-written `project_state_summary` cache table; for now every
// request recomposes from source on demand.
//
// Response shape:
//   {
//     scope: 'all' | '<slug>',
//     paragraph: '<2-3 sentence summary>',
//     detail?: '<longer detail block, only when expanded=1>',
//     updated_at: '<iso8601 — latest data point the paragraph drew from>',
//     sources: { messages: N, events: N, projects: N, open_tasks: N }
//   }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SLUG_RE = /^[a-z0-9][a-z0-9-_:]{0,64}$/i;

async function supa(path) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!resp.ok) return [];
  return resp.json().catch(() => []);
}

function fmtTimeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

async function composeAll(world) {
  // Pull the 10 most-recent messages with a project set across the tenant,
  // plus the 5 most-recent scaffold events. Count distinct projects + open
  // tasks to ground the summary.
  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [msgs, events, openTasks] = await Promise.all([
    supa(
      `messages?client_id=eq.${encodeURIComponent(world)}` +
      `&project=not.is.null` +
      `&timestamp=gte.${sinceIso}` +
      `&select=project,text,timestamp,agent` +
      `&order=timestamp.desc&limit=20`,
    ),
    supa(
      `events?client_id=eq.${encodeURIComponent(world)}` +
      `&event_type=in.(scaffold_file,project_state_summary)` +
      `&created_at=gte.${sinceIso}` +
      `&select=event_type,metadata,created_at` +
      `&order=created_at.desc&limit=10`,
    ),
    supa(
      `tasks?client_id=eq.${encodeURIComponent(world)}` +
      `&status=in.(queued,running,needs_input)` +
      `&select=id,metadata,updated_at,created_at` +
      `&order=created_at.desc&limit=50`,
    ),
  ]);
  const distinctProjects = new Set(msgs.map(m => m.project).filter(Boolean));
  const openCount = openTasks.length;
  const latest = msgs[0];
  const latestProject = latest?.project || null;
  const latestWhen = latest?.timestamp ? fmtTimeAgo(latest.timestamp) : 'a while';

  let paragraph;
  if (distinctProjects.size === 0 && openCount === 0) {
    paragraph = 'Nothing has moved in the last 7 days. Projects are quiet, no tasks are waiting, and the queue is clear.';
  } else if (distinctProjects.size === 0) {
    paragraph = `The queue has ${openCount} open task${openCount === 1 ? '' : 's'} but no project chats have seen activity in the last 7 days. Worth a check on why.`;
  } else {
    const projList = [...distinctProjects].slice(0, 3).join(', ');
    paragraph =
      `Activity across ${distinctProjects.size} project${distinctProjects.size === 1 ? '' : 's'} in the last 7 days` +
      `${projList ? ` (${projList}${distinctProjects.size > 3 ? ', …' : ''})` : ''}. ` +
      `Last inbound was ${latestWhen}${latestProject ? ` in ${latestProject}` : ''}. ` +
      `${openCount} open task${openCount === 1 ? '' : 's'} queued or running.`;
  }

  const detail = {
    recent_activity: msgs.slice(0, 6).map(m => ({
      project: m.project,
      when: fmtTimeAgo(m.timestamp),
      preview: (m.text || '').slice(0, 140),
      agent: m.agent,
    })),
    scaffold_events: events.slice(0, 5).map(e => ({
      type: e.event_type,
      when: fmtTimeAgo(e.created_at),
      meta: e.metadata || {},
    })),
  };

  return {
    paragraph,
    detail,
    sources: {
      messages: msgs.length,
      events: events.length,
      projects: distinctProjects.size,
      open_tasks: openCount,
    },
    updated_at: latest?.timestamp || new Date().toISOString(),
  };
}

async function composeProject(world, slug) {
  const sinceIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const [msgs, events, openTasks] = await Promise.all([
    supa(
      `messages?client_id=eq.${encodeURIComponent(world)}` +
      `&project=eq.${encodeURIComponent(slug)}` +
      `&timestamp=gte.${sinceIso}` +
      `&select=text,timestamp,role,agent` +
      `&order=timestamp.desc&limit=20`,
    ),
    supa(
      `events?client_id=eq.${encodeURIComponent(world)}` +
      `&metadata->>project=eq.${encodeURIComponent(slug)}` +
      `&created_at=gte.${sinceIso}` +
      `&select=event_type,metadata,created_at` +
      `&order=created_at.desc&limit=10`,
    ),
    supa(
      `tasks?client_id=eq.${encodeURIComponent(world)}` +
      `&status=in.(queued,running,needs_input)` +
      `&metadata->>project=eq.${encodeURIComponent(slug)}` +
      `&select=id,title,text,metadata,updated_at&order=created_at.desc&limit=20`,
    ),
  ]);
  const latest = msgs[0];
  const latestWhen = latest?.timestamp ? fmtTimeAgo(latest.timestamp) : 'a while';
  const openCount = openTasks.length;
  let paragraph;
  if (msgs.length === 0 && events.length === 0 && openCount === 0) {
    paragraph = `${slug} has been quiet for the last 14 days. No messages, no scaffold updates, no open tasks.`;
  } else {
    const lastRole = latest?.role || 'agent';
    paragraph =
      `${slug}: last ${lastRole === 'user' ? 'prompt' : 'update'} was ${latestWhen}. ` +
      `${msgs.length} message${msgs.length === 1 ? '' : 's'} + ${events.length} scaffold change${events.length === 1 ? '' : 's'} in the last 14 days. ` +
      `${openCount} open task${openCount === 1 ? '' : 's'} in flight.`;
  }
  const detail = {
    recent_messages: msgs.slice(0, 6).map(m => ({
      when: fmtTimeAgo(m.timestamp),
      preview: (m.text || '').slice(0, 160),
      role: m.role,
      agent: m.agent,
    })),
    scaffold_events: events.slice(0, 6).map(e => ({
      type: e.event_type,
      when: fmtTimeAgo(e.created_at),
      meta: e.metadata || {},
    })),
    open_tasks: openTasks.slice(0, 8).map(t => ({
      title: t.title || (typeof t.text === 'string' ? t.text.split('|')[0]?.trim() : '') || 'Task',
      updated: fmtTimeAgo(t.updated_at),
    })),
  };
  return {
    paragraph,
    detail,
    sources: {
      messages: msgs.length,
      events: events.length,
      projects: 1,
      open_tasks: openCount,
    },
    updated_at: latest?.timestamp || new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const _worldRaw = req.query.world && String(req.query.world).trim();
  if (!_worldRaw) return res.status(401).json({ error: 'Missing client' });
  const world = _worldRaw;
  if (!SLUG_RE.test(world)) return res.status(400).json({ error: 'invalid world' });
  const scope = String(req.query.scope || 'all').trim();
  if (scope !== 'all' && !SLUG_RE.test(scope)) return res.status(400).json({ error: 'invalid scope' });
  const expanded = req.query.expanded === '1' || req.query.expanded === 'true';

  let tenant;
  try {
    ({ tenant } = await verifyTenant(world, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  try {
    const composed = scope === 'all' ? await composeAll(tenant) : await composeProject(tenant, scope);
    const body = {
      scope,
      paragraph: composed.paragraph,
      updated_at: composed.updated_at,
      sources: composed.sources,
    };
    if (expanded) body.detail = composed.detail;
    return res.status(200).json(body);
  } catch (err) {
    console.error('[project-paragraph] error', err);
    return res.status(500).json({ error: 'failed to compose paragraph' });
  }
}
