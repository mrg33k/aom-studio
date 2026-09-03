// GET  /api/dashboard/room-agent?client=CLIENT_ID
//   -> { agents: [{ slug, title, name, role }], assignments: { roomKey: slug, ... } }
// PATCH /api/dashboard/room-agent  { room, agent, client_id }
//   -> assigns which specialist answers that room (or 'default' to clear).
//
// Room keys are canonical bridge slugs:
//   agent:<slug> | project:<slug> | mission:<project>:<mission>
//
// Backend: Convex (corner:retire-supabase R2, 2026-09-03). The roster is
// agents:listStatus (live, never a baked-in copy). The assignment is the
// room's own `specialist` field (rooms:setSpecialist), which is what the
// dispatcher and the room bridge read per message. There is no separate
// preference row any more.
//
// An agent room's identity IS its specialist, so a 1:1 room cannot be handed
// to a different agent here (it would merge into that agent's room). Only
// project and mission rooms take an assignment.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { AGENT_TITLES } from '../../src/dashboard/cv6next/data/agentTitles.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';

const ROOM_KEY_RE = /^(agent:[a-z0-9_-]+|project:[a-z0-9_-]+|mission:[a-z0-9_-]+:[a-z0-9_-]+)$/;
const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function getRoster(clientId) {
  const rows = await convexQuery('agents:listStatus', { worldId: clientId });
  return (Array.isArray(rows) ? rows : [])
    .map((a) => ({
      slug: a.slug,
      // Tenant agents carry their real name; the AGENT_TITLES doctrine map
      // only describes the aom roster.
      title: (clientId !== 'aom' && a.title) || AGENT_TITLES[a.slug] || a.title || a.slug,
      name: a.title || '',
      role: a.subtitle || '',
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

// Canonical room key for a Convex room row, or null for rooms with no key.
function roomKeyOf(room) {
  const parts = String(room.legacyRoomId || '').split(':');
  if (room.kind === 'project') {
    const project = room.project || (parts[1] === 'project' ? parts.slice(2).join(':') : slugify(room.title));
    return project ? `project:${project}` : null;
  }
  if (room.kind === 'mission') {
    const project = room.project || (parts[1] === 'mission' && parts.length >= 4 ? parts[2] : '');
    const leaf = parts[1] === 'mission' ? (parts.length >= 4 ? parts.slice(3).join(':') : parts.slice(2).join(':')) : '';
    const mission = leaf || slugify(room.title);
    return project && mission ? `mission:${project}:${mission}` : null;
  }
  const agent = room.specialist || (parts[1] === 'agent' ? parts.slice(2).join(':') : '');
  return agent ? `agent:${agent}` : null;
}

async function getAssignments(clientId) {
  const rooms = await convexQuery('rooms:listRooms', { worldId: clientId, filter: 'all' });
  const out = {};
  for (const room of Array.isArray(rooms) ? rooms : []) {
    if (room.kind === 'agent' || !room.specialist) continue;
    const key = roomKeyOf(room);
    if (key) out[key] = room.specialist;
  }
  return out;
}

// Legacy room id for a room key in this world.
function legacyRoomId(clientId, room) {
  return `${clientId}:${room}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    let tenant;
    try {
      ({ tenant } = await verifyTenant(req.query.client || '', req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    try {
      const [agents, assignments] = await Promise.all([getRoster(tenant), getAssignments(tenant)]);
      return res.status(200).json({ agents, assignments });
    } catch (err) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  }

  if (req.method === 'PATCH') {
    const { room, agent } = req.body || {};
    let tenant;
    try {
      ({ tenant } = await verifyTenant(req.body?.client_id || '', req));
    } catch (err) {
      if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
    if (!room || !ROOM_KEY_RE.test(String(room))) {
      return res.status(400).json({ error: 'room must be agent:<slug>, project:<slug>, or mission:<project>:<mission>' });
    }
    if (!agent) return res.status(400).json({ error: 'agent required (a roster slug, or "default" to clear)' });
    if (String(room).startsWith('agent:')) {
      return res.status(400).json({ error: 'a direct chat is already answered by its own agent; pick a project or mission room' });
    }

    try {
      if (agent !== 'default') {
        const roster = await getRoster(tenant);
        if (!roster.some((a) => a.slug === agent)) {
          return res.status(400).json({ error: `unknown agent "${agent}", not in the live roster` });
        }
      }
      const roomId = legacyRoomId(tenant, String(room));
      try {
        await convexMutation('rooms:setSpecialist', { roomId, specialist: agent === 'default' ? null : agent });
      } catch (err) {
        if (!/Room not found/i.test(String(err?.message || ''))) throw err;
        if (agent === 'default') {
          // Nothing to clear on a room that does not exist yet.
          return res.status(200).json({ ok: true, assignments: await getAssignments(tenant) });
        }
        // First assignment on a room nobody has spoken in yet: create it.
        const world = await convexQuery('worlds:getBySlug', { slug: tenant });
        if (!world) return res.status(404).json({ error: `world "${tenant}" not found` });
        const [kind, ...rest] = String(room).split(':');
        const project = rest[0];
        const title = kind === 'mission' ? rest.slice(1).join(':') : project;
        await convexMutation('rooms:createRoom', {
          worldId: String(world._id), title, kind, project, specialist: agent,
        });
      }
      const assignments = await getAssignments(tenant);
      return res.status(200).json({ ok: true, assignments });
    } catch (err) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  }

  return res.status(405).json({ error: 'GET or PATCH only' });
}
