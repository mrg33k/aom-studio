// The dashboard origin allowlist, lifted verbatim out of the sibling endpoints
// that already carried it inline (retry-task.js, create-mission-from-drawer.js,
// invite-create.js, session-handoff.js, voice-*.js, embed/create.js ...).
//
// NOT a new auth mechanism — the same patterns, the same env override, the same
// `Vary: Origin` + credentials behaviour. It lives here only so the r7 lane
// could gate ten endpoints without pasting the block ten more times and letting
// the copies drift apart, which is how `*` survived on half this tree.
//
// CORS is NOT authorization. A non-browser client sends whatever Origin it
// likes, so every endpoint using this MUST still gate on verifyTenant /
// verifyProjectAccess / an internal secret. This narrows the browser blast
// radius (no drive-by cross-site POST from a random page riding a live
// dashboard session); it does not decide who may act.
//
// Underscore-prefixed dir keeps this file out of Vercel's serverless routing.

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

export function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

// Echo the caller's origin only when it is one of ours. An origin we do not
// recognise gets NO Access-Control-Allow-Origin header at all, so the browser
// refuses to hand the response back — the same shape retry-task.js already had.
export function applyCors(req, res, methods = 'GET,POST,OPTIONS') {
  const origin = req.headers?.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', `${methods.replace(/,?OPTIONS$/i, '')},OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// Uniform error shape for a thrown TenantAuthError / WorldAuthError, so a gated
// endpoint answers 401 for "no session" and 403 for "not your world" instead of
// leaking a 500 with a stack.
export function sendAuthError(res, err) {
  const status = Number(err?.status) || 403;
  return res.status(status).json({ error: err?.message || 'forbidden' });
}
