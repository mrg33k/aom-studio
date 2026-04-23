// GET /api/dashboard/project-narrative?world=<client_id>&scope=all|<slug>
//
// R62-writer (session 21) — reads the latest LLM-composed narrative paragraph
// from the events table (event_type='project_narrative') for a tenant + scope.
// Composition happens in a background script (scripts/compose-project-narrative.py)
// triggered on meaningful events by scripts/project-summary-daemon.py. The
// dashboard subscribes to the same event stream via Supabase realtime to get
// updates without polling.
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SLUG_RE = /^[a-z0-9][a-z0-9-_:]{0,64}$/i;

async function supa(path) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!resp.ok) return [];
  return resp.json().catch(() => []);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const world = (req.query.world || '').toString();
  const scope = (req.query.scope || 'all').toString();

  if (!SLUG_RE.test(world)) return res.status(400).json({ error: 'bad_world' });
  if (scope !== 'all' && !SLUG_RE.test(scope)) return res.status(400).json({ error: 'bad_scope' });

  try {
    const agentFilter = `agent=eq.${encodeURIComponent(scope)}`;
    const rows = await supa(
      `events?event_type=eq.project_narrative&${agentFilter}&order=timestamp.desc&limit=1&select=payload,timestamp`
    );

    // Match tenant via payload.tenant_id. The server-side JSONB filter
    // `payload->>tenant_id=eq.<world>` would be cleaner, but Supabase REST's
    // JSONB filter support varies; filter in JS for reliability.
    const row = rows.find(r => (r?.payload?.tenant_id || '') === world);
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
