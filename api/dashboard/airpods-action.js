// POST /api/dashboard/airpods-action
// Authenticated, tenant-scoped action broker for the global CV6 voice runtime.
// The model may request only allowlisted operations; this endpoint owns authority,
// idempotency, speaker attribution, project scope, and the durable audit record.

import crypto from 'crypto';
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' };
import { verifyTenant, verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js';
import { writeMessageRow, makeProjectScopeAuthorizer } from '../_lib/write-message.js';
import {
  AIRPODS_ALLOWED_ACTIONS,
  authorityForAction,
  cleanArguments,
  idempotencyKey,
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
  const taskFilter = `client_id=eq.${encodeURIComponent(clientId)}&status=neq.done&order=updated_at.desc&limit=20&select=id,title,status,agent,project,metadata,updated_at`;
  const agentFilter = `client_id=eq.${encodeURIComponent(clientId)}&select=agent_slug,status,current_task,updated_at`;
  const doneFilter = `client_id=eq.${encodeURIComponent(clientId)}&status=eq.done&order=completed_at.desc&limit=5&select=id,title,agent,completed_at`;
  const [tasks, agents, completed] = await Promise.all([
    db(`tasks?${taskFilter}`), db(`agent_status?${agentFilter}`), db(`tasks?${doneFilter}`),
  ]);
  const active = tasks.filter((task) => ['queued', 'active', 'building', 'qa', 'planning', 'classifying'].includes(task.status));
  const blockers = tasks.filter((task) => ['blocked', 'failed', 'needs_input', 'needs_verification'].includes(task.status));
  return { active, blockers, completed, agents: agents.filter((agent) => agent.status && agent.status !== 'idle') };
}

async function workspaceRooms(clientId) {
  const [projects, statuses] = await Promise.all([
    db(`projects?client_id=eq.${encodeURIComponent(clientId)}&is_active=eq.true&select=slug,name&order=name.asc`),
    db(`agent_status?client_id=eq.${encodeURIComponent(clientId)}&type=in.(agent,mission)&select=slug,name,type,status,current_task&order=name.asc`),
  ]);
  const projectSet = new Set(projects.map((project) => project.slug));
  const rooms = [
    ...projects.map((project) => ({ id: project.slug, name: project.name || project.slug, type: 'project', project: project.slug })),
    ...statuses.map((status) => {
      const type = status.type === 'mission' ? 'mission' : 'agent';
      const project = type === 'mission' && String(status.slug || '').includes(':') ? String(status.slug).split(':')[0] : null;
      return { id: status.slug, name: status.name || status.slug, type, project, status: status.status || null, current_task: status.current_task || null };
    }),
  ];
  if (clientId === 'aom') {
    for (const mission of missionsRegistry?.missions || []) {
      if (mission.is_done || mission.status === 'archived' || !projectSet.has(mission.project_slug)) continue;
      rooms.push({ id: mission.slug, name: mission.name, type: 'mission', project: mission.project_slug, status: mission.status || null });
    }
  }
  const seen = new Set();
  return rooms.filter((room) => room.id && room.name && !seen.has(`${room.type}:${room.id}`) && seen.add(`${room.type}:${room.id}`)).slice(0, 240);
}

async function resolveRoom(args, req, tenant) {
  const requested = String(args.room_id || '').trim();
  const requestedType = String(args.room_type || '').trim().toLowerCase();
  if (!requested) throw new Error('room_id required');
  const rooms = await workspaceRooms(tenant);
  const room = rooms.find((item) => item.id === requested && (!requestedType || item.type === requestedType))
    || rooms.find((item) => item.name.toLowerCase() === requested.toLowerCase() && (!requestedType || item.type === requestedType));
  if (!room) throw new Error(`Room not found in this workspace: ${requested}`);
  if (room.type === 'project') await verifyProjectAccess(room.id, req);
  if (room.type === 'mission') await verifyProjectAccess(room.project, req);
  return room;
}

async function readRoomStatus(args, req, tenant) {
  const room = await resolveRoom(args, req, tenant);
  let tasks = [];
  let messages = [];
  if (room.type === 'agent') {
    [tasks, messages] = await Promise.all([
      db(`tasks?client_id=eq.${encodeURIComponent(tenant)}&agent=eq.${encodeURIComponent(room.id)}&status=neq.done&order=updated_at.desc&limit=12&select=id,title,status,agent,project,metadata,updated_at`),
      db(`messages?client_id=eq.${encodeURIComponent(tenant)}&agent=eq.${encodeURIComponent(room.id)}&order=timestamp.desc&limit=8&select=role,text,timestamp,user_name,project,mission`),
    ]);
  } else {
    const project = room.project || room.id;
    [tasks, messages] = await Promise.all([
      db(`tasks?client_id=eq.${encodeURIComponent(tenant)}&project=eq.${encodeURIComponent(project)}&status=neq.done&order=updated_at.desc&limit=30&select=id,title,status,agent,project,metadata,updated_at`),
      db(`messages?client_id=eq.${encodeURIComponent(tenant)}&project=eq.${encodeURIComponent(project)}&order=timestamp.desc&limit=20&select=role,text,timestamp,user_name,project,mission`),
    ]);
    if (room.type === 'mission') {
      const bare = room.id.split(':').pop();
      tasks = tasks.filter((task) => [room.id, bare].includes(String(task.metadata?.mission_slug || '')));
      messages = messages.filter((message) => [room.id, bare].includes(String(message.mission || '')));
    }
  }
  const recent = messages.slice(0, 6).map((message) => ({ role: message.role, author: message.user_name || null, text: String(message.text || '').slice(0, 500), at: message.timestamp }));
  return {
    ok: true,
    spoken_summary: `${room.name} has ${tasks.length} active item${tasks.length === 1 ? '' : 's'}${recent.length ? ` and ${recent.length} recent update${recent.length === 1 ? '' : 's'}` : ''}.`,
    room,
    active_tasks: tasks.slice(0, 12),
    recent_updates: recent,
  };
}

async function createTask(args, req, identity) {
  const project = String(args.project || '').trim();
  const missionSlug = String(args.mission_slug || '').trim();
  const title = String(args.title || '').trim().slice(0, 240);
  if (!project || !missionSlug || !title) throw new Error('title, project, and mission_slug are required');
  const scope = await verifyProjectAccess(project, req);
  const row = {
    title,
    text: String(args.description || title).trim(),
    description: String(args.description || title).trim(),
    status: 'queued',
    source: 'airpods-mode',
    client_id: scope.tenant,
    created_by: identity.userId,
    project,
    ...(args.agent ? { agent: String(args.agent).trim() } : {}),
    metadata: {
      mission_slug: missionSlug,
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
  const missionSlug = String(args.mission_slug || '').trim();
  let queuedTask = null;
  if (project && missionSlug) {
    const title = String(args.title || instruction.split(/[.!?]/)[0] || instruction).trim().slice(0, 180);
    queuedTask = await createTask({ title, description: instruction, project, mission_slug: missionSlug, agent }, req, identity);
  }
  return {
    ok: true,
    spoken_summary: queuedTask
      ? `I posted the instruction and queued trackable work in ${missionSlug}.`
      : 'I posted that instruction to the room. No trackable mission task was created.',
    entities: [{ type: 'message', id: result.row?.id }, ...(queuedTask?.entities || [])],
    ui_effect: project
      ? { type: 'open_room', room: args.mission_slug
        ? { id: missionSlug.split(':').pop(), name: missionSlug, isMission: true, missionSlug, projectSlug: project }
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

async function execute(action, args, req, tenant, identity, sessionId) {
  if (action === 'read_workspace_status') {
    const status = await workspaceStatus(tenant);
    return { ok: true, spoken_summary: `${status.active.length} active, ${status.blockers.length} need attention, and ${status.completed.length} recently completed.`, status };
  }
  if (action === 'list_rooms') {
    const rooms = await workspaceRooms(tenant);
    return { ok: true, spoken_summary: `I found ${rooms.length} rooms in this workspace.`, rooms };
  }
  if (action === 'read_room_status') return readRoomStatus(args, req, tenant);
  if (action === 'open_tool' || action === 'navigate') {
    const target = uiTool(args.tool || args.target);
    const allowed = new Set(['home', 'chat', 'support', 'organize', 'command', 'tracker', 'livescribe', 'settings', 'workers']);
    if (!allowed.has(target)) throw new Error('That CV6 tool is not available');
    return { ok: true, spoken_summary: `Opening ${args.tool || args.target}.`, ui_effect: { type: 'navigate', target } };
  }
  if (action === 'open_room') {
    const resolved = await resolveRoom(args, req, tenant);
    const id = resolved.id;
    const type = resolved.type;
    const room = {
      id: type === 'mission' ? id.split(':').pop() : id, name: resolved.name,
      ...(type === 'project' ? { isProject: true } : {}),
      ...(type === 'mission' ? { isMission: true, missionSlug: id, projectSlug: resolved.project || '' } : {}),
    };
    return { ok: true, spoken_summary: `Opening ${room.name}.`, ui_effect: { type: 'open_room', room } };
  }
  if (action === 'create_task') return createTask(args, req, identity);
  if (action === 'start_work') return startWork(args, req, tenant, identity, sessionId);
  if (action === 'manage_attention') return manageAttention(args, tenant);
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
  const callerKey = idempotencyKey({ supplied: body.idempotency_key, sessionId, action, args });
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
