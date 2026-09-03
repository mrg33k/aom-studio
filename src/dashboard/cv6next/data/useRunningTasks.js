// cv6next: room-scoped feed of work that is still in flight for this room.
//
// Powers the chat "working in the background" card (Patrik 2026-07-25: "no way for a user
// to know a background task is actively running"): a card with an elapsed timer that
// appears only while it runs, then vanishes.
//
// TWO kinds, because tasks alone left the card blank exactly when it was needed:
//   tasks    — dispatched jobs actively executing (Convex tasks, building | running)
//   promises — pending come-backs (Convex followups, status open): an agent said it would
//              report back and has not. This is the only signal that survives past the
//              agent's reply, which is when the room's `awaiting` step strip disappears
//              and the user starts asking "is it actually running?".
//
// Both are scoped to the viewer's world and narrowed to the room's project when the room
// maps to one. Both are LIVE Convex subscriptions (useConvexLive): the websocket pushes a
// new list the moment a row changes. No polling, no realtime channel to babysit.

import { useMemo } from 'react';
import { useWorldId } from '../../lib/tenantContext.jsx';
import { convexWorldId, useConvexLive } from '../../lib/convex.js';

// The project a room maps to: a project room -> its own slug; a mission room -> its parent
// project (explicit field, else the slug before ':'). 1:1 / world rooms return null, so the
// card shows every running job in the world, the honest answer to "is anything running?".
function roomProjectSlug(room) {
  if (!room) return null;
  if (room.isProject) return room.slug || room.id || null;
  if (room.isMission) {
    if (room.projectSlug) return room.projectSlug;
    if (room.project) return room.project;
    const ms = String(room.missionSlug || room.id || '');
    if (ms.includes(':')) return ms.split(':')[0];
  }
  return null;
}

const EMPTY = { tasks: [], promises: [] };

function shapeTask(t) {
  const md = t.metadata || {};
  return {
    id: t.id,
    title: t.title || t.description || (t.text ? String(t.text).split('\n')[0] : '') || 'Working…',
    who: t.agent_identity || t.builder || t.agent || 'agent',
    project: t.project || md.project || null,
    since: t.started_at || t.created_at || null,
    status: t.status,
  };
}

function shapePromise(f) {
  return {
    id: String(f._id || f.id || ''),
    title: String(f.text || '').trim() || 'Coming back with an update',
    who: f.agentSlug || 'agent',
    project: f.project || null,
    mission: f.mission || null,
    since: f.createdAt ? new Date(f.createdAt).toISOString() : null,
    due: f.dueAt ? new Date(f.dueAt).toISOString() : null,
  };
}

export function useRunningTasks(room) {
  const worldId = useWorldId();
  const world = convexWorldId(worldId);
  const projectSlug = roomProjectSlug(room);
  const scoped = !!world && world !== 'local-render';

  const tasksLive = useConvexLive('tasks:find', scoped ? {
    client_id: world,
    status_in: ['building', 'running'],
    ...(projectSlug ? { project: projectSlug } : {}),
    order: 'started_at.desc.nullslast,created_at.desc',
    limit: 25,
  } : null);
  const promisesLive = useConvexLive('followups:listPending', scoped ? {
    worldId: world,
    ...(projectSlug ? { project: projectSlug } : {}),
    limit: 50,
  } : null);

  return useMemo(() => {
    if (!scoped) return EMPTY;
    const tasks = Array.isArray(tasksLive.value) ? tasksLive.value.map(shapeTask) : [];
    const promises = Array.isArray(promisesLive.value) ? promisesLive.value.map(shapePromise) : [];
    return { tasks, promises };
  }, [scoped, tasksLive.value, promisesLive.value]);
}
