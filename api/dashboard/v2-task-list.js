// GET /api/dashboard/v2-task-list
// Lists v2 tasks from the Convex task queue (corner:retire-supabase R1,
// 2026-09-03; was Supabase) with optional status filter + pagination.
// Caller must pass Authorization: Bearer <jwt>; verifyTenant gates by tenant.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const SELECT_COLUMNS = [
  'id',
  'title',
  'text',
  'description',
  'status',
  'complexity',
  'planner',
  'builder',
  'priority',
  'sort_order',
  'agent_identity',
  'result',
  'error',
  'created_by',
  'created_at',
  'started_at',
  'completed_at',
  'qa_score',
  'token_cost',
  'metadata',
];

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const statusParam = typeof req.query.status === 'string' ? req.query.status : '';
  const _rawClient = typeof req.query.client_id === 'string' ? req.query.client_id.trim() : '';
  if (!_rawClient) return res.status(401).json({ error: 'Missing client' });
  const requested = _rawClient.toLowerCase();
  let clientId;
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  const limit = clampInt(req.query.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(req.query.offset, 0, 0, Number.MAX_SAFE_INTEGER);

  const statusList = statusParam
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  try {
    const args = {
      client_id: clientId,
      order: 'priority.desc,sort_order.asc,created_at.asc',
    };
    if (statusList.length === 1) args.status = statusList[0];
    else if (statusList.length > 1) args.status_in = statusList;

    const all = await convexQuery('tasks:find', args);
    const rows = Array.isArray(all) ? all : [];
    const tasks = rows.slice(offset, offset + limit).map((t) => {
      const out = {};
      for (const col of SELECT_COLUMNS) out[col] = t[col] ?? null;
      return out;
    });
    return res.status(200).json({ tasks, total: rows.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
