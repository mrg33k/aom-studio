import test from 'node:test';
import assert from 'node:assert/strict';
import { writeMessageRow } from '../../api/_lib/write-message.js';

test('a repeated client message id returns the existing durable row without another insert', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  const existing = { id: 'server-row-1', role: 'user', text: 'hello', client_id: 'aom' };
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return { ok: true, json: async () => [existing], text: async () => '' };
  };
  try {
    const result = await writeMessageRow({
      supabaseUrl: 'https://db.example', headers: {}, text: 'hello', role: 'user',
      clientId: 'aom', userId: 'user-1', metadata: { client_message_id: 'outbox-12345678-1234-1234-1234-123456789012' },
    });
    assert.equal(result.ok, true);
    assert.equal(result.idempotent, true);
    assert.equal(result.row.id, 'server-row-1');
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /metadata->>client_message_id=eq\.outbox-/);
    assert.notEqual(calls[0].options.method, 'POST');
  } finally {
    global.fetch = originalFetch;
  }
});

test('a new client message id performs exactly one insert', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (options.method === 'POST') {
      const row = JSON.parse(options.body);
      return { ok: true, json: async () => [row], text: async () => '' };
    }
    return { ok: true, json: async () => [], text: async () => '' };
  };
  try {
    const result = await writeMessageRow({
      supabaseUrl: 'https://db.example', headers: {}, text: 'hello', role: 'user',
      clientId: 'aom', userId: 'user-1', metadata: { client_message_id: 'outbox-abcdefab-cdef-abcd-efab-cdefabcdefab' },
    });
    assert.equal(result.ok, true);
    assert.equal(result.idempotent, false);
    assert.equal(calls.filter((call) => call.options.method === 'POST').length, 1);
  } finally {
    global.fetch = originalFetch;
  }
});
