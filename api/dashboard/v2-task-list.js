// GET /api/dashboard/v2-task-list
// Lists v2 tasks from Supabase with optional status filter + pagination.
// Caller must pass Authorization: Bearer <jwt>; verifyTenant gates by tenant.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_CLIENT_ID = 'aom';
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
].join(',');

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

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

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

  const params = [
    `select=${SELECT_COLUMNS}`,
    `client_id=eq.${encodeURIComponent(clientId)}`,
    'order=priority.desc,sort_order.asc,created_at.asc',
    `limit=${limit}`,
    `offset=${offset}`,
  ];

  const statusList = statusParam
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if (statusList.length > 0) {
    params.push(`status=in.(${statusList.map(value => encodeURIComponent(value)).join(',')})`);
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?${params.join('&')}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
      },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: errText });
    }

    const tasks = await resp.json();
    const countHeader = resp.headers.get('content-range');
    let total = Array.isArray(tasks) ? tasks.length : 0;
    if (countHeader) {
      const match = countHeader.match(/\/(\d+)$/);
      if (match) total = Number.parseInt(match[1], 10);
    }

    return res.status(200).json({ tasks, total });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
