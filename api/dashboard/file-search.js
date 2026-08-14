// GET /api/dashboard/file-search?world=<client_id>&q=<query>
//
// R68 (session 21) — surfaces MD files across every project in the home
// search bar. Queries the events table for event_type='scaffold_file' rows
// (R55 auto-surfaces MD writes into this table) and matches the query
// against filename + content (case-insensitive). Cross-project hits return
// with a project label so the home dashboard can render "#ambition-mechanical"
// or similar.
//
// Response shape:
//   {
//     q: <normalized query>,
//     hits: [{
//       id:        <event id>
//       project:   <slug>          // 'ambition-mechanical', 'corner', ...
//       parent:    <slug> | null   // for nested missions: 'ambition-mechanical'
//       filename:  <basename>      // 'VISION.md', 'research/R12.md'
//       preview:   <string>        // ~220 chars around the first match
//       updated_at: <iso>
//     }]
//   }
//
// Limit 15 hits. Does not paginate — this is a search surface, not an index.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SLUG_RE = /^[a-z0-9][a-z0-9-_:]{0,64}$/i;
const MAX_HITS = 15;
const PREVIEW_RADIUS = 110; // chars before + after the first match

async function supa(path) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!resp.ok) return [];
  return resp.json().catch(() => []);
}

function parseAgent(agent) {
  // Agent key can be a plain project slug ('corner') or parent:child ('aom:aom-lut').
  if (!agent) return { project: '', parent: null };
  if (agent.includes(':')) {
    const [parent, child] = agent.split(':', 2);
    return { project: child, parent };
  }
  return { project: agent, parent: null };
}

function buildPreview(content, qLower) {
  if (!content) return '';
  const lc = content.toLowerCase();
  const idx = lc.indexOf(qLower);
  if (idx < 0) return content.slice(0, PREVIEW_RADIUS * 2);
  const start = Math.max(0, idx - PREVIEW_RADIUS);
  const end = Math.min(content.length, idx + qLower.length + PREVIEW_RADIUS);
  let slice = content.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) slice = '…' + slice;
  if (end < content.length) slice = slice + '…';
  return slice;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const world = (req.query.world || '').toString();
  const qRaw = (req.query.q || '').toString().trim();

  if (!SLUG_RE.test(world)) return res.status(400).json({ error: 'bad_world' });

  let tenant;
  try {
    ({ tenant } = await verifyTenant(world, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  if (qRaw.length < 2 || qRaw.length > 80) {
    return res.status(200).json({ q: qRaw, hits: [] });
  }

  // PostgREST ilike filter on JSONB children is supported with `->>` operator.
  // Filter filename OR content. Cap rows to a sane bound to keep the query
  // fast — the ORDER BY timestamp.desc + limit 200 means the newest files
  // win when there's overflow.
  const ilikeQ = `*${qRaw.replace(/[\*%]/g, '')}*`;
  const orClause = encodeURIComponent(
    `payload->>filename.ilike.${ilikeQ},payload->>content.ilike.${ilikeQ}`
  );

  try {
    const rows = await supa(
      `events?event_type=eq.scaffold_file&or=(${orClause})&order=timestamp.desc&limit=200&select=id,agent,payload,timestamp`
    );

    const qLower = qRaw.toLowerCase();
    const hits = [];
    for (const row of rows) {
      if (hits.length >= MAX_HITS) break;
      const filename = row?.payload?.filename || '';
      const content = row?.payload?.content || '';
      const { project, parent } = parseAgent(row.agent);
      if (!filename || !project) continue;
      // Tenant scope: writers tag payload.tenant_id (AOM-EA scripts hardcode
      // 'aom' since the repo IS AOM's). Pre-tagging rows are treated as 'aom'
      // — every existing scaffold_file row was authored from AOM-EA before the
      // tagging change shipped. Cross-tenant search is blocked here.
      const rowTenant = row?.payload?.tenant_id || '';
      if (rowTenant !== tenant) continue;
      // Belt-and-suspenders: confirm a real text match (ilike is case-
      // insensitive Postgres; we verify in JS too so the preview is accurate).
      const haystack = `${filename} ${content}`.toLowerCase();
      if (!haystack.includes(qLower)) continue;
      hits.push({
        id: row.id,
        project,
        parent,
        filename,
        preview: buildPreview(content, qLower),
        updated_at: row?.payload?.updated_at || row.timestamp || null,
      });
    }

    return res.status(200).json({ q: qRaw, hits });
  } catch (err) {
    return res.status(500).json({ error: 'internal', detail: String(err).slice(0, 200) });
  }
}
