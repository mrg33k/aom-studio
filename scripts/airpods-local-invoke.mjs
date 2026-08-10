// Invoke the real voice-session handler in-process, with production env, and
// print the session config it would serve. Lets the bench exercise the TUNED
// code without deploying it: Vercel preview URLs are SSO-walled, and pushing an
// unverified prompt to production to test it is exactly backwards.

import path from 'node:path';

const ROOT = process.argv[2];
const API = process.argv[3];
const body = JSON.parse(process.argv[4] || '{}');
const jwt = process.env.CORNER_QA_JWT;

// The GEMINI_API_KEY that `vercel env pull --environment=production` returns is
// rejected by Google (API_KEY_INVALID), while the deployed function mints tokens
// fine — so the running deployment is using a key this pull does not surface.
// Not worth chasing here: the ephemeral token is independent of the prompt, so
// the bench mints a REAL one from production and only borrows the setupMessage
// from this local handler. Stub the mint so the handler can finish.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('/v1beta/auth_tokens')) {
    return new Response(JSON.stringify({ name: 'LOCAL_STUB_TOKEN' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }
  return realFetch(url, init);
};

const mod = await import(path.join(ROOT, API));
const handler = mod.default;

const req = {
  method: 'POST',
  headers: { authorization: `Bearer ${jwt}`, origin: 'http://localhost:5173', 'content-type': 'application/json' },
  body,
};

let statusCode = 200;
let payload = null;
const res = {
  setHeader() {},
  status(c) { statusCode = c; return this; },
  json(v) { payload = v; return this; },
  end() { return this; },
};

await handler(req, res);
process.stdout.write(JSON.stringify({ statusCode, payload }));
