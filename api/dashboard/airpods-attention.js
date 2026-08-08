// GET /api/dashboard/airpods-attention?client=<world>
// Returns a deduped queue of durable attention items plus real task truth.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function read(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!response.ok) return [];
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

function durableId(value) {
  const hex = crypto.createHash('sha256').update(value).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  const compact = hex.join('');
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

async function insertAttention(rows) {
  if (!rows.length) return true;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/airpods_attention_items?on_conflict=world_id,source_type,source_id,version`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  return response.ok;
}

function taskPriority(status) {
  if (status === 'needs_input' || status === 'needs_verification') return 'approval';
  if (status === 'blocked') return 'blocker';
  if (status === 'failed') return 'failure';
  if (status === 'done') return 'completion';
  return 'progress';
}

function taskRoom(task) {
  const mission = task.metadata?.mission_slug;
  if (mission) return mission;
  return task.project || task.agent || null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });
  const requested = String(req.query.client || '').trim().toLowerCase();
  if (!requested) return res.status(400).json({ error: 'client required' });
  let tenant;
  try { ({ tenant } = await verifyTenant(requested, req)); }
  catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message });
    throw error;
  }

  const now = new Date().toISOString();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [queued, tasks] = await Promise.all([
    read(`airpods_attention_items?world_id=eq.${encodeURIComponent(tenant)}&status=in.(queued,prompted)&or=(snoozed_until.is.null,snoozed_until.lte.${encodeURIComponent(now)})&order=created_at.asc&limit=100`),
    read(`tasks?client_id=eq.${encodeURIComponent(tenant)}&status=in.(blocked,failed,needs_input,needs_verification,done)&updated_at=gte.${encodeURIComponent(since)}&order=updated_at.desc&limit=50&select=id,title,status,project,agent,metadata,updated_at,completed_at`),
  ]);

  const byKey = new Map();
  for (const item of queued) byKey.set(`${item.source_type}:${item.source_id}:${item.version || 1}`, item);
  const taskItems = [];
  for (const task of tasks) {
    const version = Math.floor(Date.parse(task.updated_at || task.completed_at || now) / 1000);
    const key = `task:${task.id}:${version}`;
    if (byKey.has(key)) continue;
    const item = {
      id: durableId(`${tenant}:${key}`), world_id: tenant,
      source_type: 'task', source_id: task.id, version,
      priority: taskPriority(task.status),
      title: task.title || 'Task update',
      detail: task.status,
      room_key: taskRoom(task),
      payload: { status: task.status, project: task.project, agent: task.agent, mission_slug: task.metadata?.mission_slug || null },
      status: 'queued', created_at: task.updated_at || task.completed_at || now,
    };
    taskItems.push(item);
    byKey.set(key, item);
  }

  // Materializing task truth makes acknowledge/snooze durable. Ignore-on-conflict
  // preserves an earlier acknowledgement for the same task version.
  if (await insertAttention(taskItems)) {
    const durable = await read(`airpods_attention_items?world_id=eq.${encodeURIComponent(tenant)}&status=in.(queued,prompted)&or=(snoozed_until.is.null,snoozed_until.lte.${encodeURIComponent(now)})&order=created_at.asc&limit=100`);
    return res.status(200).json({ items: durable });
  }
  return res.status(200).json({ items: [...byKey.values()], durable: false });
}
