import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

const { default: avatarHandler } = await import('../api/dashboard/avatar.js');

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('profile API refuses both anonymous and cross-account writes', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  let res = responseRecorder();
  await avatarHandler({ method: 'POST', headers: {}, body: { initials: 'PX' } }, res);
  assert.equal(res.statusCode, 401);

  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return jsonResponse({ id: 'caller-1', email: 'patrik@example.com', user_metadata: { world: 'aom' } });
  };
  res = responseRecorder();
  await avatarHandler({
    method: 'POST',
    headers: { authorization: 'Bearer signed-token' },
    body: { user_id: 'someone-else', initials: 'PX', color: '#7C3AED' },
  }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(calls.length, 1, 'foreign writes stop after resolving the signed-in caller');
  assert.equal(calls[0].url, 'https://example.supabase.co/auth/v1/user');
});

test('profile API preserves account metadata and updates only the caller identity', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const writes = [];
  globalThis.fetch = async (url, options = {}) => {
    const href = String(url);
    if (href.endsWith('/auth/v1/user')) {
      return jsonResponse({ id: 'caller-1', email: 'patrik@example.com', user_metadata: { world: 'aom' } });
    }
    if (href.endsWith('/auth/v1/admin/users/caller-1') && options.method !== 'PUT') {
      return jsonResponse({
        id: 'caller-1',
        email: 'patrik@example.com',
        user_metadata: { world: 'aom', full_name: 'Patrik Simpson', untouched: 'keep-me', avatar_url: 'https://cdn/old.jpg' },
      });
    }
    if (href.endsWith('/auth/v1/admin/users/caller-1') && options.method === 'PUT') {
      writes.push(JSON.parse(options.body));
      return jsonResponse({ ok: true });
    }
    throw new Error(`Unexpected request: ${href}`);
  };

  const res = responseRecorder();
  await avatarHandler({
    method: 'POST',
    headers: { authorization: 'Bearer signed-token' },
    body: { initials: 'ps', color: '#7C3AED', remove_image: true },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, avatar_url: null, initials: 'PS', color: '#7C3AED' });
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].user_metadata, {
    world: 'aom',
    full_name: 'Patrik Simpson',
    untouched: 'keep-me',
    avatar_url: null,
    avatar_initials: 'PS',
    avatar_color: '#7C3AED',
  });
});
