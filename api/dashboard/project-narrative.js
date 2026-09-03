// GET /api/dashboard/project-narrative?world=<client_id>&scope=all|<slug>
//
// R62-writer (session 21): reads the latest LLM-composed narrative paragraph
// from the events ledger (event_type='project_narrative') for a tenant + scope.
// Composition happens in a background script (scripts/compose-project-narrative.py)
// triggered on meaningful events by scripts/project-summary-daemon.py.
//
// corner:retire-supabase (2026-09-03): the events come from the Convex events
// table (events:find). Was the Supabase events table.
//
// Response shape:
//   {
//     scope: 'all' | '<slug>',
//     overview: '<1-3 sentence narrative>',
//     details: '<3-4 paragraph continuation>',
//     composed_at: '<iso8601>',
//     trigger: { type: string, ... } | null,
//     empty?: true  // when no narrative has been composed yet
//   }
//
// When empty, the client should render a placeholder or fall back to the
// legacy /api/dashboard/project-paragraph endpoint.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';

const SLUG_RE = /^[a-z0-9][a-z0-9-_:]{0,64}$/i;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const world = (req.query.world || '').toString();
  const scope = (req.query.scope || 'all').toString();

  if (!SLUG_RE.test(world)) return res.status(400).json({ error: 'bad_world' });
  if (scope !== 'all' && !SLUG_RE.test(scope)) return res.status(400).json({ error: 'bad_scope' });

  let tenant;
  try {
    ({ tenant } = await verifyTenant(world, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  try {
    // Newest first for this scope; the tenant match runs on payload.tenant_id
    // here, so a handful of rows is read rather than exactly one.
    const rows = await convexQuery('events:find', {
      event_type: 'project_narrative',
      agent: scope,
      order: 'desc',
      limit: 25,
    });

    const row = (Array.isArray(rows) ? rows : []).find(r => (r?.payload?.tenant_id || '') === tenant);
    if (!row) {
      return res.status(200).json({ scope, empty: true });
    }
    const p = row.payload || {};
    return res.status(200).json({
      scope,
      overview: p.overview || '',
      details: p.details || '',
      composed_at: p.composed_at || row.timestamp || null,
      trigger: p.trigger || null,
      revision: p.revision || null,
      model: p.model || null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'internal', detail: String(err).slice(0, 200) });
  }
}
