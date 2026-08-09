// POST /api/dashboard/airpods-action
// Authenticated, tenant-scoped action broker for the global CV6 voice runtime.
// The model may request only allowlisted operations; this endpoint owns authority,
// idempotency, speaker attribution, project scope, and the durable audit record.

import crypto from 'crypto';
import { verifyTenant, verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js';
import { writeMessageRow, makeProjectScopeAuthorizer } from '../_lib/write-message.js';
import { authorizeTaskProject, taskScopeDenialMessage } from '../_lib/taskScope.js';
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' };
import {
  AIRPODS_ALLOWED_ACTIONS,
  authorityForAction,
  cleanArguments,
  idempotencyKey,
  resolveRoomCandidate,
  signConfirmation,
  verifyConfirmation,
} from '../_lib/airpods.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIRM_SECRET = process.env.AIRPODS_CONFIRMATION_SECRET || SUPABASE_KEY || '';

const headers = (prefer = 'return=representation') => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: prefer,
});

async function db(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || body?.error || `Supabase ${response.status}`);
  return body;
}

function uiTool(tool) {
  const map = {
    rooms: 'chat', email: 'support', files: 'organize', scribe: 'livescribe',
    'background work': 'workers', background: 'workers',
  };
  return map[String(tool || '').trim().toLowerCase()] || String(tool || 'home').trim().toLowerCase();
}

async function workspaceStatus(clientId) {
  const taskFilter = `client_id=eq.${encodeURIComponent(clientId)}&status=neq.done&order=created_at.desc&limit=20&select=id,title,description,status,agent,project,error,attempt_count,max_attempts,metadata,created_at`;
  const agentFilter = `client_id=eq.${encodeURIComponent(clientId)}&select=slug,status,current_task,updated_at`;
  const doneFilter = `client_id=eq.${encodeURIComponent(clientId)}&status=eq.done&order=completed_at.desc&limit=5&select=id,title,agent,completed_at`;
  const [tasks, agents, completed] = await Promise.all([
    db(`tasks?${taskFilter}`), db(`agent_status?${agentFilter}`), db(`tasks?${doneFilter}`),
  ]);
  const active = tasks.filter((task) => ['queued', 'active', 'building', 'qa', 'planning', 'classifying'].includes(task.status));
  const blockers = tasks.filter((task) => ['blocked', 'failed', 'needs_input', 'needs_verification'].includes(task.status));
  return { active, blockers, completed, agents: agents.filter((agent) => agent.status && agent.status !== 'idle') };
}

async function readTaskStatus(args, tenant) {
  const taskId = String(args.task_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) throw new Error('A valid task_id is required');
  const rows = await db(`tasks?client_id=eq.${encodeURIComponent(tenant)}&id=eq.${encodeURIComponent(taskId)}&limit=1&select=id,title,text,description,status,agent,project,project_path,error,attempt_count,max_attempts,metadata,created_at,completed_at`);
  const task = Array.isArray(rows) ? rows[0] : null;
  if (!task) throw new Error('Task not found in this workspace');
  const reason = String(task.error || '').trim();
  return {
    ok: true,
    spoken_summary: reason
      ? `${task.title || 'The task'} is ${task.status}. It ${task.status === 'failed' ? 'failed' : 'reports'} because ${reason}.`
      : `${task.title || 'The task'} is ${task.status}; no failure reason is recorded.`,
    task,
    entities: [{ type: 'task', id: task.id, title: task.title || null, status: task.status, agent: task.agent || null }],
  };
}

function activityTerms(value) {
  return String(value || '').toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length > 1).slice(0, 12) || [];
}

function roomLabel(message) {
  const mission = String(message?.metadata?.mission_slug || '').trim();
  if (mission) return { room_key: `mission:${mission}`, room_name: mission };
  if (message?.project) return { room_key: `project:${message.project}`, room_name: String(message.project) };
  return { room_key: `agent:${message?.agent || 'corner'}`, room_name: String(message?.agent || 'Corner') };
}

function activityScore(message, terms) {
  if (!terms.length) return 1;
  const haystack = [message?.text, message?.agent, message?.project, message?.source, message?.metadata?.mission_slug]
    .filter(Boolean).join(' ').toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function activityMatches(score, terms) {
  if (!terms.length) return true;
  return score >= Math.max(1, Math.ceil(terms.length / 2));
}

async function recentWorkspaceActivity(clientId, query) {
  const rows = await db(`messages?client_id=eq.${encodeURIComponent(clientId)}&order=timestamp.desc&limit=300&select=id,agent,project,role,text,timestamp,source,metadata,user_name`);
  const terms = activityTerms(query);
  return (Array.isArray(rows) ? rows : [])
    .map((message) => ({ message, score: activityScore(message, terms) }))
    .filter(({ score }) => activityMatches(score, terms))
    .sort((a, b) => b.score - a.score || String(b.message.timestamp || '').localeCompare(String(a.message.timestamp || '')))
    .slice(0, 12)
    .map(({ message }) => {
      const room = roomLabel(message);
      return {
        source_type: 'corner_room', source_label: `${room.room_name} room`,
        room_key: room.room_key, room_name: room.room_name, timestamp: message.timestamp || null,
        author: message.role === 'user' ? (message.user_name || 'Workspace member') : (message.agent || 'Corner agent'),
        excerpt: String(message.text || '').replace(/\s+/g, ' ').trim().slice(0, 360),
      };
    });
}

async function recentGithubActivity(clientId, query) {
  // Repository access is AOM-internal: never expose it to another tenant or a
  // shared room. Report availability explicitly so voice cannot bluff a check.
  if (clientId !== 'aom') return { availability: 'not_available_for_this_workspace', items: [] };
  const token = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
  const owner = process.env.VERCEL_GIT_REPO_OWNER || 'mrg33k';
  const repo = process.env.VERCEL_GIT_REPO_SLUG || 'aom-studio';
  if (!owner || !repo) return { availability: 'not_configured', items: [] };
  try {
    const githubUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=30`;
    const requestHeaders = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    let response = await fetch(githubUrl, {
      headers: requestHeaders,
      signal: AbortSignal.timeout(5000),
    });
    // The repository is public, while the legacy VITE_GITHUB_TOKEN may expire.
    // Retry anonymously instead of letting a stale optional token disable a
    // source that requires no credential.
    if ((response.status === 401 || response.status === 403) && token) {
      response = await fetch(githubUrl, {
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(5000),
      });
    }
    if (!response.ok) return { availability: `unavailable_${response.status}`, items: [] };
    const terms = activityTerms(query);
    const commits = await response.json();
    const items = (Array.isArray(commits) ? commits : [])
      .map((commit) => ({ commit, score: activityScore({ text: commit?.commit?.message }, terms) }))
      .filter(({ score }) => activityMatches(score, terms))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ commit }) => ({
        source_type: 'github_commit', source_label: `GitHub ${owner}/${repo}`,
        timestamp: commit?.commit?.author?.date || null,
        author: commit?.commit?.author?.name || commit?.author?.login || 'Unknown',
        excerpt: String(commit?.commit?.message || '').replace(/\s+/g, ' ').trim().slice(0, 360),
        reference: commit?.html_url || null, sha: String(commit?.sha || '').slice(0, 7),
      }));
    return { availability: 'available', items };
  } catch {
    return { availability: 'unavailable', items: [] };
  }
}

async function readRecentActivity(clientId, args) {
  const query = String(args.query || '').trim().slice(0, 240);
  const [roomItems, github] = await Promise.all([
    recentWorkspaceActivity(clientId, query),
    args.include_github === false ? Promise.resolve({ availability: 'not_requested', items: [] }) : recentGithubActivity(clientId, query),
  ]);
  const items = [...roomItems, ...github.items]
    .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .slice(0, 16);
  return {
    ok: true, query, checked_at: new Date().toISOString(),
    sources: { corner_rooms: 'available', github: github.availability }, items,
    spoken_summary: items.length
      ? `I found ${items.length} recent workspace source${items.length === 1 ? '' : 's'} that may answer that.`
      : 'I did not find a matching recent record. That is not proof the event did not happen.',
  };
}

function roomCandidate({ key, name, type, slug, project, room, aliases = [] }) {
  return { room_key: key, room_name: name, room_type: type, slug, project: project || null, room, aliases };
}

async function roomDirectory(clientId) {
  const [projects, statuses] = await Promise.all([
    db(`projects?client_id=eq.${encodeURIComponent(clientId)}&is_active=eq.true&select=slug,name`),
    db(`agent_status?client_id=eq.${encodeURIComponent(clientId)}&type=in.(agent,mission)&select=slug,name,type,status,current_task`),
  ]);
  const rooms = new Map();
  const add = (candidate) => { if (candidate?.room_key) rooms.set(candidate.room_key, candidate); };

  for (const project of projects || []) {
    if (!project?.slug) continue;
    const name = project.name || project.slug;
    add(roomCandidate({
      key: `project:${project.slug}`, name, type: 'project', slug: project.slug,
      room: { id: project.slug, name, isProject: true }, aliases: [project.slug],
    }));
  }
  for (const row of statuses || []) {
    if (!row?.slug) continue;
    const name = row.name || row.slug;
    if (row.type === 'mission' && row.slug.includes(':')) {
      const [project, ...rest] = row.slug.split(':');
      const bare = rest.join(':');
      add(roomCandidate({
        key: `mission:${row.slug}`, name, type: 'mission', slug: row.slug, project,
        room: { id: bare, name, isMission: true, missionSlug: row.slug, projectSlug: project },
        aliases: [bare, row.slug, `${project} ${name}`],
      }));
    } else if (row.type === 'agent') {
      add(roomCandidate({
        key: `agent:${row.slug}`, name, type: 'agent', slug: row.slug,
        room: { id: row.slug, name }, aliases: [row.slug],
      }));
    }
  }
  if (clientId === 'aom') {
    for (const mission of missionsRegistry?.missions || []) {
      if (!mission?.slug || mission.is_done || mission.status === 'archived') continue;
      const project = mission.project_slug || String(mission.slug).split(':')[0];
      const fullSlug = String(mission.slug).includes(':') ? String(mission.slug) : `${project}:${mission.slug}`;
      const bare = fullSlug.slice(fullSlug.indexOf(':') + 1);
      const name = mission.name || mission.raw_slug || bare;
      if (rooms.has(`mission:${fullSlug}`)) continue;
      add(roomCandidate({
        key: `mission:${fullSlug}`, name, type: 'mission', slug: fullSlug, project,
        room: { id: bare, name, isMission: true, missionSlug: fullSlug, projectSlug: project, path: mission.path || null },
        aliases: [bare, fullSlug, `${project} ${name}`],
      }));
    }
  }
  return [...rooms.values()];
}

async function resolveRoom(args, tenant) {
  const resolution = resolveRoomCandidate(await roomDirectory(tenant), args);
  if (resolution.resolved) return { ok: true, room: resolution.resolved };
  const count = resolution.candidates.length;
  return {
    ok: true,
    resolved: false,
    needs_clarification: true,
    reason: resolution.reason,
    candidates: resolution.candidates,
    spoken_summary: count
      ? `I found ${count} possible rooms. Which one do you mean?`
      : 'I could not find that room. Try its project, mission, or agent name.',
  };
}

async function readRoomStatus(args, tenant) {
  const resolution = await resolveRoom(args, tenant);
  if (!resolution.room) return resolution;
  const match = resolution.room;
  let tasks = [];
  let messages = [];
  if (match.room_type === 'agent') {
    [tasks, messages] = await Promise.all([
      db(`tasks?client_id=eq.${encodeURIComponent(tenant)}&agent=eq.${encodeURIComponent(match.slug)}&status=neq.done&order=created_at.desc&limit=12&select=id,title,status,agent,project,metadata,created_at`),
      db(`messages?client_id=eq.${encodeURIComponent(tenant)}&agent=eq.${encodeURIComponent(match.slug)}&order=timestamp.desc&limit=8&select=role,text,timestamp,user_name,project,metadata`),
    ]);
  } else {
    const project = match.project || match.slug;
    [tasks, messages] = await Promise.all([
      db(`tasks?client_id=eq.${encodeURIComponent(tenant)}&project=eq.${encodeURIComponent(project)}&status=neq.done&order=created_at.desc&limit=30&select=id,title,status,agent,project,metadata,created_at`),
      db(`messages?client_id=eq.${encodeURIComponent(tenant)}&project=eq.${encodeURIComponent(project)}&order=timestamp.desc&limit=20&select=role,text,timestamp,user_name,project,metadata`),
    ]);
    if (match.room_type === 'mission') {
      const bare = match.slug.split(':').pop();
      tasks = tasks.filter((task) => [match.slug, bare].includes(String(task.metadata?.mission_slug || '')));
      messages = messages.filter((message) => [match.slug, bare].includes(String(message.metadata?.mission_slug || '')));
    }
  }
  const recent = messages.slice(0, 6).map((message) => ({ role: message.role, author: message.user_name || null, text: String(message.text || '').slice(0, 500), at: message.timestamp }));
  return {
    ok: true, resolved: true, room_key: match.room_key,
    spoken_summary: `${match.room_name} has ${tasks.length} active item${tasks.length === 1 ? '' : 's'}${recent.length ? ` and ${recent.length} recent update${recent.length === 1 ? '' : 's'}` : ''}.`,
    room: { room_key: match.room_key, room_name: match.room_name, room_type: match.room_type, project: match.project },
    active_tasks: tasks.slice(0, 12), recent_updates: recent,
  };
}

async function createTask(args, req, identity) {
  const project = String(args.project || '').trim();
  const missionSlug = String(args.mission_slug || '').trim();
  const title = String(args.title || '').trim().slice(0, 240);
  if (!project || !missionSlug || !title) throw new Error('title, project, and mission_slug are required');
  const verdict = await authorizeTaskProject({ req, clientId: identity.tenant, projectSlug: project });
  if (!verdict.ok) throw new Error(taskScopeDenialMessage({ clientId: identity.tenant, projectSlug: project, reason: verdict.reason }));
  const projectRows = await db(`projects?client_id=eq.${encodeURIComponent(identity.tenant)}&slug=eq.${encodeURIComponent(project)}&limit=1&select=slug,repo_path`);
  const projectRow = Array.isArray(projectRows) ? projectRows[0] : null;
  if (!projectRow) throw new Error('Authorized project record not found');
  const row = {
    title,
    text: String(args.description || title).trim(),
    description: String(args.description || title).trim(),
    status: 'queued',
    source: 'airpods-mode',
    client_id: identity.tenant,
    created_by: identity.userId,
    project,
    project_path: projectRow.repo_path || '',
    ...(args.agent ? { agent: String(args.agent).trim() } : {}),
    metadata: {
      mission_slug: missionSlug,
      repo: projectRow.slug,
      created_via: 'airpods-mode',
      requested_by_name: identity.userName || null,
      requested_by_email: identity.email || null,
    },
  };
  const rows = await db('tasks', { method: 'POST', body: JSON.stringify(row) });
  const task = Array.isArray(rows) ? rows[0] : rows;
  return {
    ok: true,
    spoken_summary: `Queued ${title}.`,
    entities: [{ type: 'task', id: task?.id, title, project, mission_slug: missionSlug }],
    ui_effect: { type: 'open_room', room: { id: missionSlug, name: title, isMission: true, missionSlug, projectSlug: project } },
  };
}

async function startWork(args, req, tenant, identity, sessionId) {
  const instruction = String(args.instruction || '').trim();
  if (!instruction) throw new Error('instruction is required');
  const project = String(args.project || '').trim() || null;
  if (project) await verifyProjectAccess(project, req);
  const agent = String(args.agent || 'corner').trim() || 'corner';
  const authorizer = makeProjectScopeAuthorizer({ req, clientId: tenant });
  const result = await writeMessageRow({
    supabaseUrl: SUPABASE_URL,
    headers: headers(),
    text: instruction,
    role: 'user',
    source: 'airpods-mode',
    agent,
    clientId: tenant,
    project,
    mission: String(args.mission_slug || '').trim() || null,
    authorizeProjectScope: authorizer,
    metadata: { airpods_session_id: sessionId, interaction_mode: 'work' },
    userId: identity.userId,
    userName: identity.userName,
    worldId: identity.world,
  });
  if (!result.ok) throw new Error(result.error || 'Could not start work');
  return {
    ok: true,
    spoken_summary: 'I sent that to the room and work is starting.',
    entities: [{ type: 'message', id: result.row?.id }],
    ui_effect: project
      ? { type: 'open_room', room: args.mission_slug
        ? { id: args.mission_slug, name: args.mission_slug, isMission: true, missionSlug: args.mission_slug, projectSlug: project }
        : { id: project, name: project, isProject: true } }
      : { type: 'open_room', room: { id: agent, name: agent } },
  };
}

async function manageAttention(args, tenant) {
  const ids = Array.isArray(args.item_ids) ? args.item_ids.filter(Boolean).slice(0, 50) : [];
  if (!ids.length) throw new Error('item_ids required');
  const operation = args.operation === 'snooze' ? 'snooze' : 'acknowledge';
  const patch = operation === 'snooze'
    ? { status: 'queued', snoozed_until: new Date(Date.now() + Math.max(1, Number(args.minutes) || 15) * 60_000).toISOString(), updated_at: new Date().toISOString() }
    : { status: 'acknowledged', acknowledged_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  await db(`airpods_attention_items?world_id=eq.${encodeURIComponent(tenant)}&id=in.(${ids.map(encodeURIComponent).join(',')})`, { method: 'PATCH', body: JSON.stringify(patch) });
  return { ok: true, spoken_summary: operation === 'snooze' ? 'I’ll bring those back later.' : 'Got it. Those are cleared.' };
}

async function reassignTask(args, tenant) {
  const taskId = String(args.task_id || '').trim();
  const agent = String(args.agent || '').trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(taskId) || !agent) throw new Error('task_id and agent are required');
  const [tasks, agents] = await Promise.all([
    db(`tasks?client_id=eq.${encodeURIComponent(tenant)}&id=eq.${encodeURIComponent(taskId)}&limit=1&select=id,title,text,agent,status,project,metadata`),
    db(`agent_status?client_id=eq.${encodeURIComponent(tenant)}&slug=eq.${encodeURIComponent(agent)}&type=eq.agent&limit=1&select=slug,name`),
  ]);
  const task = Array.isArray(tasks) ? tasks[0] : null;
  if (!task) throw new Error('Task not found in this workspace');
  if (!Array.isArray(agents) || !agents[0]) throw new Error('Agent not found in this workspace');
  const rows = await db(`tasks?client_id=eq.${encodeURIComponent(tenant)}&id=eq.${encodeURIComponent(taskId)}`, {
    method: 'PATCH', body: JSON.stringify({ agent }),
  });
  const updated = Array.isArray(rows) ? rows[0] : rows;
  return {
    ok: true,
    spoken_summary: `Reassigned ${task.title || task.text || 'the task'} to ${agents[0].name || agent}.`,
    entities: [{ type: 'task', id: taskId, title: task.title || task.text || null, agent }],
    task: updated || { ...task, agent },
  };
}

async function execute(action, args, req, tenant, identity, sessionId) {
  if (action === 'read_workspace_status') {
    const status = await workspaceStatus(tenant);
    return { ok: true, spoken_summary: `${status.active.length} active, ${status.blockers.length} need attention, and ${status.completed.length} recently completed.`, status };
  }
  if (action === 'read_recent_activity') return readRecentActivity(tenant, args);
  if (action === 'read_task_status') return readTaskStatus(args, tenant);
  if (action === 'list_rooms') {
    const rooms = (await roomDirectory(tenant)).slice(0, 240).map((room) => ({ room_key: room.room_key, room_name: room.room_name, room_type: room.room_type, project: room.project }));
    return { ok: true, spoken_summary: `I found ${rooms.length} rooms in this workspace.`, rooms };
  }
  if (action === 'open_tool' || action === 'navigate') {
    const target = uiTool(args.tool || args.target);
    const allowed = new Set(['home', 'chat', 'support', 'organize', 'command', 'tracker', 'livescribe', 'settings', 'workers']);
    if (!allowed.has(target)) throw new Error('That CV6 tool is not available');
    return { ok: true, spoken_summary: `Opening ${args.tool || args.target}.`, ui_effect: { type: 'navigate', target, request_id: crypto.randomUUID() } };
  }
  if (action === 'close_room') {
    let room = null;
    if (args.room_key || args.query || args.room_query) {
      const resolution = await resolveRoom(args, tenant);
      if (!resolution.room) return resolution;
      room = resolution.room.room;
    }
    return {
      ok: true,
      spoken_summary: room ? `Closing ${room.name || 'that room'}.` : 'Closing the current room.',
      ui_effect: { type: 'close_room', room, request_id: crypto.randomUUID() },
    };
  }
  if (action === 'find_rooms') {
    const resolution = await resolveRoom(args, tenant);
    if (resolution.room) {
      return { ok: true, resolved: true, candidates: [{ room_key: resolution.room.room_key, room_name: resolution.room.room_name, room_type: resolution.room.room_type, project: resolution.room.project }], spoken_summary: `I found ${resolution.room.room_name}.` };
    }
    return resolution;
  }
  if (action === 'read_room_status') return readRoomStatus(args, tenant);
  if (action === 'open_room') {
    const resolution = await resolveRoom(args, tenant);
    if (!resolution.room) return resolution;
    const match = resolution.room;
    if (match.room_type === 'project') await verifyProjectAccess(match.slug, req);
    if (match.room_type === 'mission') await verifyProjectAccess(match.project, req);
    return {
      ok: true, resolved: true, room_key: match.room_key,
      spoken_summary: `Opening ${match.room_name}.`,
      ui_effect: { type: 'open_room', room: match.room, request_id: crypto.randomUUID() },
    };
  }
  if (action === 'create_task') return createTask(args, req, identity);
  if (action === 'reassign_task') return reassignTask(args, tenant);
  if (action === 'start_work') return startWork(args, req, tenant, identity, sessionId);
  if (action === 'manage_attention') return manageAttention(args, tenant);
  if (action === 'end_voice_session') return { ok: true, closing: true, spoken_summary: 'Ending the voice session now.' };
  throw new Error('Action is allowlisted but has no executor');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const body = req.body || {};
  const action = String(body.action || '').trim();
  const args = cleanArguments(body.arguments);
  const requestedTenant = String(body.client_id || '').trim().toLowerCase();
  if (!requestedTenant || !action) return res.status(400).json({ error: 'client_id and action required' });

  let identity;
  try { identity = await verifyTenant(requestedTenant, req); }
  catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message });
    throw error;
  }

  if (action === 'confirm_consequential_action') {
    const payload = verifyConfirmation(args.confirmation_token, CONFIRM_SECRET);
    if (!payload || payload.worldId !== identity.tenant || payload.userId !== identity.userId) return res.status(400).json({ error: 'Confirmation expired or invalid' });
    if (args.confirmed !== true) return res.status(200).json({ ok: true, refused: true, spoken_summary: 'Okay, I did not do that.' });
    return res.status(501).json({ error: 'That consequential executor is not enabled in AirPods mode yet; nothing changed.' });
  }

  if (!AIRPODS_ALLOWED_ACTIONS.has(action)) return res.status(400).json({ error: `Action not allowed: ${action}` });
  const sessionId = String(body.session_id || '').trim() || null;
  const authority = authorityForAction(action);
  // Fresh reads get a unique audit entry rather than a replayed answer. That
  // preserves current state and keeps the conversation/action join complete.
  const freshReads = new Set(['read_workspace_status', 'read_recent_activity', 'read_task_status', 'list_rooms', 'find_rooms', 'read_room_status']);
  const callerKey = freshReads.has(action)
    ? `fresh:${action}:${crypto.randomUUID()}`
    : idempotencyKey({ supplied: body.idempotency_key, sessionId, action, args });
  // Namespace even caller-supplied keys. The database uniqueness constraint is
  // global, while replay visibility must never cross a world or user boundary.
  const key = crypto.createHash('sha256')
    .update(`${identity.tenant}:${identity.userId}:${callerKey}`)
    .digest('hex');

  try {
    const prior = await db(`airpods_actions?world_id=eq.${encodeURIComponent(identity.tenant)}&user_id=eq.${encodeURIComponent(identity.userId)}&idempotency_key=eq.${encodeURIComponent(key)}&select=result,status,error&limit=1`);
    if (Array.isArray(prior) && prior[0]?.status === 'succeeded') return res.status(200).json({ ...prior[0].result, replayed: true });

    if (authority === 'confirm') {
      const token = signConfirmation({ action, args, worldId: identity.tenant, userId: identity.userId, exp: Date.now() + 5 * 60_000 }, CONFIRM_SECRET);
      await db('airpods_actions?on_conflict=idempotency_key', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ idempotency_key: key, session_id: sessionId, world_id: identity.tenant, user_id: identity.userId, speaker_name: identity.userName, action, authority, arguments: args, confirmation_state: 'pending', status: 'started' }),
      });
      return res.status(200).json({ ok: false, requires_confirmation: true, confirmation_token: token, spoken_summary: `Please confirm that you want me to ${action.replaceAll('_', ' ')}.` });
    }

    await db('airpods_actions?on_conflict=idempotency_key', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ idempotency_key: key, session_id: sessionId, world_id: identity.tenant, user_id: identity.userId, speaker_name: identity.userName, action, authority, arguments: args, confirmation_state: 'not_required', status: 'started' }),
    });
    const result = await execute(action, args, req, identity.tenant, identity, sessionId);
    await db(`airpods_actions?idempotency_key=eq.${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify({ status: 'succeeded', result, completed_at: new Date().toISOString() }) });
    return res.status(200).json(result);
  } catch (error) {
    try { await db(`airpods_actions?idempotency_key=eq.${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify({ status: 'failed', error: String(error?.message || error), completed_at: new Date().toISOString() }) }); } catch { /* audit insert itself may have failed */ }
    return res.status(500).json({ error: error?.message || 'Action failed' });
  }
}
