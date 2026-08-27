// Tests for wolfpack-site/api/lead.js — the lead-delivery serverless function.
// Run: node --test tests/wolfpack-lead.test.mjs
// Never touches the real network: globalThis.fetch is stubbed in every handler test.

import test from 'node:test';
import assert from 'node:assert/strict';

import handler, { validateLead, buildLeadEmail } from '../wolfpack-site/api/lead.js';

process.env.RESEND_API_KEY = 'test-resend-key';

const realFetch = globalThis.fetch;

function humanLead(overrides = {}) {
  return {
    name: 'Dana Ortiz',
    company: 'Ortiz Property Group',
    phone: '(602) 555-0147',
    email: 'dana@ortizpg.com',
    need: 'Hydro jetting',
    message: 'Main line backs up every month, need a quote.',
    sourcePage: '/services/hydro-jetting/',
    startedAt: Date.now() - 5000,
    website: '',
    ...overrides,
  };
}

// Mock of Vercel's Node response API: res.status(n).json(obj), plus setHeader/end.
function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      this.ended = true;
      return this;
    },
    end(chunk) {
      this.ended = true;
      if (chunk !== undefined) this.body = chunk;
      return this;
    },
  };
}

function mockReq(body, { method = 'POST', ip = '203.0.113.10' } = {}) {
  return {
    method,
    headers: { 'x-forwarded-for': ip },
    body,
  };
}

// Stub fetch; records calls, never hits the network.
function stubFetch({ status = 200 } = {}) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => '',
      json: async () => ({}),
    };
  };
  return calls;
}

test.afterEach(() => {
  globalThis.fetch = realFetch;
});

// --- validateLead ---

test('validateLead: valid lead with name + phone passes', () => {
  const result = validateLead(humanLead({ email: '' }));
  assert.equal(result.ok, true);
  assert.equal(result.lead.name, 'Dana Ortiz');
  assert.equal(result.lead.phone, '(602) 555-0147');
  assert.equal(result.lead.need, 'Hydro jetting');
});

test('validateLead: trims and length-bounds fields', () => {
  const result = validateLead(humanLead({ name: `  ${'x'.repeat(300)}  ` }));
  assert.equal(result.ok, true);
  assert.equal(result.lead.name.length, 100);
});

test('validateLead: name-only (no phone, no email) fails', () => {
  const result = validateLead(humanLead({ phone: '', email: '' }));
  assert.deepEqual(result, { ok: false, errors: ['invalid'] });
});

test('validateLead: bad email with no phone fails, valid email alone passes', () => {
  assert.equal(validateLead(humanLead({ phone: '', email: 'not-an-email' })).ok, false);
  assert.equal(validateLead(humanLead({ phone: '', email: 'a@b.co' })).ok, true);
});

test('validateLead: missing name fails', () => {
  const result = validateLead(humanLead({ name: '   ' }));
  assert.deepEqual(result, { ok: false, errors: ['invalid'] });
});

test('validateLead: honeypot filled fails', () => {
  const result = validateLead(humanLead({ website: 'http://spam.example' }));
  assert.deepEqual(result, { ok: false, errors: ['invalid'] });
});

test('validateLead: missing startedAt fails', () => {
  const input = humanLead();
  delete input.startedAt;
  assert.deepEqual(validateLead(input), { ok: false, errors: ['invalid'] });
});

test('validateLead: too-fast startedAt fails', () => {
  const result = validateLead(humanLead({ startedAt: Date.now() - 200 }));
  assert.deepEqual(result, { ok: false, errors: ['invalid'] });
});

// --- buildLeadEmail ---

test('buildLeadEmail: subject and bodies include the key fields', () => {
  const { lead } = validateLead(humanLead());
  const email = buildLeadEmail(lead);

  assert.equal(email.subject, 'Wolfpack website lead — Hydro jetting');
  for (const part of ['Hydro jetting', '(602) 555-0147', '/services/hydro-jetting/', 'Dana Ortiz', 'dana@ortizpg.com']) {
    assert.ok(email.text.includes(part), `text missing ${part}`);
    assert.ok(email.html.includes(part), `html missing ${part}`);
  }
  // timestamp present
  assert.match(email.text, /Received: \d{4}-\d{2}-\d{2}T/);
});

test('buildLeadEmail: escapes html in visitor input', () => {
  const { lead } = validateLead(humanLead({ message: '<script>alert(1)</script>' }));
  const email = buildLeadEmail(lead);
  assert.ok(!email.html.includes('<script>'));
  assert.ok(email.html.includes('&lt;script&gt;'));
});

// --- handler ---

test('handler: non-POST gets 405', async () => {
  const res = mockRes();
  await handler(mockReq(undefined, { method: 'GET', ip: '198.51.100.1' }), res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'POST');
});

test('handler: bad JSON gets 400', async () => {
  stubFetch();
  const res = mockRes();
  await handler(mockReq('{not json', { ip: '198.51.100.2' }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.ok, false);
});

test('handler: invalid lead gets 422 and never calls fetch', async () => {
  const calls = stubFetch();
  const res = mockRes();
  await handler(mockReq(humanLead({ name: '' }), { ip: '198.51.100.3' }), res);
  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.body, { ok: false, error: 'invalid' });
  assert.equal(calls.length, 0);
});

test('handler: valid lead sends to exactly the two approved recipients and returns ok', async () => {
  const calls = stubFetch({ status: 200 });
  const res = mockRes();
  await handler(mockReq(humanLead(), { ip: '198.51.100.4' }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });

  assert.equal(calls.length, 1);
  const call = calls[0];
  assert.equal(call.url, 'https://api.resend.com/emails');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers.Authorization, 'Bearer test-resend-key');

  const payload = JSON.parse(call.options.body);
  assert.deepEqual(payload.to, ['Service@wolfpackcompanies.com', 'hello@aom-inhouse.com']);
  assert.equal(payload.reply_to, 'dana@ortizpg.com');
  assert.ok(payload.subject.includes('Hydro jetting'));
  assert.ok(payload.text.includes('(602) 555-0147'));
  assert.ok(payload.html.includes('/services/hydro-jetting/'));
});

test('handler: Resend non-2xx returns 502 delivery-failed', async () => {
  stubFetch({ status: 401 });
  const res = mockRes();
  await handler(mockReq(humanLead(), { ip: '198.51.100.5' }), res);
  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.body, { ok: false, error: 'delivery-failed' });
});

test('handler: fetch throwing returns 502 delivery-failed', async () => {
  globalThis.fetch = async () => {
    throw new Error('network down');
  };
  const res = mockRes();
  await handler(mockReq(humanLead(), { ip: '198.51.100.6' }), res);
  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.body, { ok: false, error: 'delivery-failed' });
});

test('handler: 6th accepted attempt from the same IP is rate-limited', async () => {
  stubFetch({ status: 200 });
  const ip = '198.51.100.77';

  for (let i = 0; i < 5; i++) {
    const res = mockRes();
    await handler(mockReq(humanLead(), { ip }), res);
    assert.equal(res.statusCode, 200, `attempt ${i + 1} should pass`);
  }

  const res = mockRes();
  await handler(mockReq(humanLead(), { ip }), res);
  assert.equal(res.statusCode, 429);
  assert.deepEqual(res.body, { ok: false, error: 'rate-limited' });
});

test('handler: rejected attempts do not count toward the rate limit', async () => {
  const calls = stubFetch({ status: 200 });
  const ip = '198.51.100.88';

  for (let i = 0; i < 7; i++) {
    const res = mockRes();
    await handler(mockReq(humanLead({ website: 'spam' }), { ip }), res);
    assert.equal(res.statusCode, 422);
  }
  assert.equal(calls.length, 0);

  const res = mockRes();
  await handler(mockReq(humanLead(), { ip }), res);
  assert.equal(res.statusCode, 200);
});
