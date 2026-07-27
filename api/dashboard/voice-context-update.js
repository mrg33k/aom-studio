// POST /api/dashboard/voice-context-update
// Thin proxy: voice chat calls this to update project CONTEXT.md on disk via RAG server.
// Body: { slug, section, content, action }
//
// AUTH (corner:identity-attribution, 2026-07-27). CONTEXT.md is room CANON —
// rule 5 makes every agent read it fresh before acting. An unauthenticated write
// here is not a one-shot message, it is a DURABLE prompt injection into the
// source of truth, re-read by every future session in that room. So:
//   - the caller must hold a verified session and pass the PROJECT access check,
//   - the verified tenant + author are passed down to the RAG server, and the
//     appended block is signed with who changed it,
//   - CORS is the dashboard origins, not `*`.
//
// r2 corrections — the first pass over-tightened this LIVE voice tool twice:
//   1. It resolved the holder world and called verifyTenant(holderWorld, req).
//      That never consults project_access for a plain world string, so Ash or
//      Courtney (world 'aom', not super-admins) saying "record that we're going
//      with option B" in a Space Rising room got a 403 — space-rising is
//      arsenal-held and AOM reaches it through a grant. verifyProjectAccess()
//      is the check that actually answers "may this caller reach this project".
//   2. It 404'd when the slug had no projects row. 4 of the 33 registry
//      projects (blacknight, bridge-smoke, pala, rex) have no row, so Patrik on
//      a call in the Rex room silently lost every write — VoiceChat swallows the
//      error and tells the model it failed. An unregistered project slug is not
//      an authorization failure. Those keep the verified-session floor, which is
//      still strictly tighter than the wide-open endpoint this replaced.
//
// r3 addition — the gate above is a front door on a building whose back door
// was open. The RAG server this proxies to (https://rag.aheadofmarket.com) had
// no credential check on /update-project-context, so the canon-write this file
// protects was reachable without ever touching this file. Fixed on both sides
// together: rag-server.py requires X-RAG-Tunnel-Secret on that route (failing
// CLOSED when unset) and we send it below. DEPLOY: RAG_TUNNEL_SECRET must be
// set to the same value in the Vercel project env AND on the daemon box
// (`launchctl setenv RAG_TUNNEL_SECRET <value>`, then restart the daemon), or
// voice context updates return 503 here / 503 there.

import { verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js';

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin));
}

function applyCors(req, res) {
  const origin = req.headers?.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { slug, section, content, action = 'append' } = req.body || {};
  if (!slug || !section || !content) {
    return res.status(400).json({ error: 'slug, section, and content required' });
  }

  // Authorization is PROJECT access: holder world, any world holding a
  // project_access grant, the holder world's admins, or the super-admin. A slug
  // with no projects row has no holder world to check and keeps the
  // verified-session floor — an unregistered project is not a forbidden one.
  let verified;
  try {
    verified = await verifyProjectAccess(slug, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  // Sign the block. verifyProjectAccess already resolved the speaker from the
  // JWT, so no second /auth/v1/user round trip. If we cannot name the author we
  // say so in those words rather than letting the canon imply it was Patrik
  // (RULE 2).
  const who = verified.userName || verified.email || 'an unidentified Corner session';
  const stampedContent = `${content}\n\n_(via voice — ${who}, ${new Date().toISOString().slice(0, 10)})_`;

  const RAG_URL = process.env.RAG_SERVER_URL || 'https://rag.aheadofmarket.com';

  // r3 — the back door behind this front door. Everything above gates the
  // CALLER; none of it gated the SERVICE. rag.aheadofmarket.com is on the
  // public internet and POST /update-project-context reached its handler with
  // no credential of any kind, so an attacker with a real project slug could
  // write into that project's CONTEXT.md and skip this file entirely. The RAG
  // server now requires a shared secret on that route; we present it here.
  //
  // No fallback value on purpose. A write that cannot prove it came from this
  // proxy must not be attempted — the RAG server would (correctly) refuse it,
  // and a 401 the model reads as "the tool is broken" is worse than saying so.
  const RAG_TUNNEL_SECRET = process.env.RAG_TUNNEL_SECRET;
  if (!RAG_TUNNEL_SECRET) {
    console.error('[voice-context-update] RAG_TUNNEL_SECRET is not set on this deployment; refusing the write');
    return res.status(503).json({
      error: 'context updates are unavailable: RAG_TUNNEL_SECRET is not configured on this deployment',
    });
  }

  try {
    const ragResp = await fetch(`${RAG_URL}/update-project-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RAG-Tunnel-Secret': RAG_TUNNEL_SECRET,
      },
      body: JSON.stringify({
        slug,
        section,
        content: stampedContent,
        action,
        // Passed down so the RAG server can refuse a mismatched write; extra
        // keys are ignored by the current handler (body.get based).
        // verified.tenant is the project's holder world, or the caller's own
        // world when the project has no projects row — honest either way, never
        // a world we only assumed.
        client_id: verified.tenant,
        updated_by: verified.userId || null,
        updated_by_name: verified.userName || null,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (ragResp.ok) {
      const result = await ragResp.json();
      return res.status(200).json(result);
    }

    // Preserve the RAG server's own error text so the client can surface the
    // real reason (permission denied, invalid section, etc.) instead of a
    // generic status code.
    let detail = '';
    try {
      const body = await ragResp.text();
      if (body) {
        try {
          const parsed = JSON.parse(body);
          detail = parsed.error || parsed.message || body;
        } catch {
          detail = body;
        }
      }
    } catch {}

    return res.status(ragResp.status).json({
      error: `RAG server returned ${ragResp.status}${detail ? `: ${detail}` : ''}`,
    });
  } catch (err) {
    // Classify fetch-level failures (timeout, DNS, refused) so the client
    // toast tells the user what went wrong rather than just "Failed".
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    const reason = isTimeout
      ? `RAG server did not respond within 5s (${err.name})`
      : err.message || String(err);
    return res.status(502).json({ error: reason });
  }
}
