// GET /api/dashboard/airpods-attention?client=<world>
// Returns a deduped queue of attention items for the voice runtime: durable
// rows from the Convex airpodsAttention table plus real task truth from the
// task queue (blocked, failed, needs input, done in the last day).
//
// corner:retire-supabase (2026-09-03): was the Supabase airpods_attention_items
// table. Acknowledge and snooze are recorded in keyed state on Convex
// (state kind "airpods_attention", one row per world) by airpods-action's
// manage_attention, and applied here on read, so a cleared item stays cleared
// across polls without materializing one row per task version.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';
import crypto from 'crypto';

export const ATTENTION_STATE_KIND = 'airpods_attention';

function durableId(value) {
  const hex = crypto.createHash('sha256').update(value).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  const compact = hex.join('');
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

function taskPriority(status) {
  if (status === 'needs_input' || status === 'needs_verification') return 'approval';
  if (status === 'blocked') return 'blocker';
  if (status === 'failed') return 'failure';
  if (status === 'done') return 'completion';
  return 'progress';
}

function kindPriority(kind) {
  const k = String(kind || '').toLowerCase();
  if (['approval', 'blocker', 'failure', 'requested', 'question', 'completion', 'progress'].includes(k)) return k;
  if (k === 'needs_input') return 'approval';
  if (k === 'mention') return 'requested';
  return 'progress';
}

function taskRoom(task) {
  const mission = task.metadata?.mission_slug;
  if (mission) return mission;
  return task.project || task.agent || null;
}

// The world's ack/snooze map: { [itemId]: { status, snoozed_until, at } }.
export async function readAttentionState(tenant) {
  try {
    const row = await convexQuery('state:get', { kind: ATTENTION_STATE_KIND, scopeId: '', worldId: tenant });
    return row && row.value && typeof row.value === 'object' ? row.value : {};
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const requested = String(req.query.client || '').trim().toLowerCase();
  if (!requested) return res.status(400).json({ error: 'client required' });
  let tenant;
  try { ({ tenant } = await verifyTenant(requested, req)); }
  catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message });
    throw error;
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const since = now - 24 * 60 * 60 * 1000;

  try {
    const [durable, tasks, marks] = await Promise.all([
      convexQuery('airpods:attention', { worldId: tenant, limit: 100 }).catch(() => []),
      convexQuery('tasks:find', {
        client_id: tenant,
        status_in: ['blocked', 'failed', 'needs_input', 'done'],
        order: 'created_at.desc',
        limit: 50,
      }).catch(() => []),
      readAttentionState(tenant),
    ]);

    const byKey = new Map();

    for (const row of Array.isArray(durable) ? durable : []) {
      const key = `attention:${row._id}:1`;
      byKey.set(key, {
        id: row._id, world_id: tenant,
        source_type: 'attention', source_id: row._id, version: 1,
        priority: kindPriority(row.kind),
        title: String(row.text || '').slice(0, 200) || 'Needs your attention',
        detail: row.kind || 'attention',
        room_key: row.roomId || null,
        payload: { kind: row.kind, message_id: row.messageId || null },
        status: 'queued',
        created_at: row.createdAt ? new Date(row.createdAt).toISOString() : nowIso,
      });
    }

    for (const task of Array.isArray(tasks) ? tasks : []) {
      const createdMs = Date.parse(task.completed_at || task.created_at || nowIso);
      if (!Number.isFinite(createdMs) || createdMs < since) continue;
      const version = Math.floor(createdMs / 1000);
      const key = `task:${task.id}:${version}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        id: durableId(`${tenant}:${key}`), world_id: tenant,
        source_type: 'task', source_id: task.id, version,
        priority: taskPriority(task.status),
        title: task.title || 'Task update',
        detail: task.status,
        room_key: taskRoom(task),
        payload: { status: task.status, project: task.project, agent: task.agent, mission_slug: task.metadata?.mission_slug || null },
        status: 'queued',
        created_at: task.completed_at || task.created_at || nowIso,
      });
    }

    // Apply what the person already did with these items.
    const items = [...byKey.values()]
      .map((item) => {
        const mark = marks[item.id];
        if (!mark) return item;
        if (mark.status === 'acknowledged') return { ...item, status: 'acknowledged', acknowledged_at: mark.at || null };
        if (mark.status === 'snoozed') return { ...item, snoozed_until: mark.snoozed_until || null };
        return item;
      })
      .filter((item) => item.status !== 'acknowledged')
      .filter((item) => !item.snoozed_until || new Date(item.snoozed_until).getTime() <= now)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
      .slice(0, 100);

    return res.status(200).json({ items });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Could not read attention items', items: [] });
  }
}
