// node:test — node --test tests/api/_lib/mailAccess.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'

const calls = []
const gmailRequiredScopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
]
const gmailFullScopes = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
]

globalThis.fetch = async (url, init) => {
  calls.push({ url, init })
  if (url.includes('tenant_users?user_id=eq.user-1')) {
    return { ok: true, json: async () => [{ tenant_id: 'aom' }, { tenant_id: 'ben' }] }
  }
  if (url.includes('account_integrations?or=')) {
    return {
      ok: true,
      json: async () => [
        { id: 'c-personal', user_id: 'user-1', workspace_id: null, integration_slug: 'gmail',
          status: 'connected', connected_at: '2026-05-10', config: { account_email: 'p@x.com', connector_user_id: 'user-1', granted_scopes: gmailRequiredScopes } },
        { id: 'c-team-aom', user_id: null, workspace_id: 'aom', integration_slug: 'gmail',
          status: 'connected', connected_at: '2026-05-12', config: { account_email: 'hello@aom-inhouse.com', connector_user_id: 'user-1', granted_scopes: gmailFullScopes } },
      ],
    }
  }
  return { ok: false, status: 404, json: async () => ({}) }
}
process.env.SUPABASE_URL = 'https://stub.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'srvc-key'

const { listConnectionsForUser, assertCanUseConnection } = await import('../../../api/_lib/mailAccess.js')

test('listConnectionsForUser returns personal + workspace rows with scope tag', async () => {
  calls.length = 0
  const out = await listConnectionsForUser('user-1')
  assert.equal(out.length, 2)
  const personal = out.find(c => c.id === 'c-personal')
  const team = out.find(c => c.id === 'c-team-aom')
  assert.equal(personal.scope, 'personal')
  assert.equal(team.scope, 'team')
  assert.equal(team.workspace_id, 'aom')
})

test('listConnectionsForUser hides a Gmail row missing required OAuth scopes', async () => {
  globalThis.fetch = async (url) => {
    if (url.includes('tenant_users?user_id=eq.user-1')) {
      return { ok: true, json: async () => [] }
    }
    if (url.includes('account_integrations?or=')) {
      return {
        ok: true,
        json: async () => [
          { id: 'c-under-scoped', user_id: 'user-1', workspace_id: null, integration_slug: 'gmail',
            status: 'connected', connected_at: '2026-05-10', config: { granted_scopes: ['openid', 'email'] } },
        ],
      }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }

  assert.deepEqual(await listConnectionsForUser('user-1'), [])
})

test('assertCanUseConnection allows owner of personal row', async () => {
  globalThis.fetch = async (url) => {
    if (url.includes('account_integrations?id=eq.c-personal')) {
      return { ok: true, json: async () => [{ id: 'c-personal', user_id: 'user-1', workspace_id: null }] }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }
  await assertCanUseConnection('user-1', 'c-personal')
})

test('assertCanUseConnection allows member of team row', async () => {
  globalThis.fetch = async (url) => {
    if (url.includes('account_integrations?id=eq.c-team-aom')) {
      return { ok: true, json: async () => [{ id: 'c-team-aom', user_id: null, workspace_id: 'aom' }] }
    }
    if (url.includes('tenant_users?user_id=eq.user-1')) {
      return { ok: true, json: async () => [{ tenant_id: 'aom' }] }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }
  await assertCanUseConnection('user-1', 'c-team-aom')
})

test('assertCanUseConnection rejects non-member', async () => {
  globalThis.fetch = async (url) => {
    if (url.includes('tenant_users?user_id=eq.user-2')) {
      return { ok: true, json: async () => [] }
    }
    if (url.includes('account_integrations?id=eq.c-team-aom')) {
      return { ok: true, json: async () => [{ id: 'c-team-aom', user_id: null, workspace_id: 'aom' }] }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }
  await assert.rejects(
    () => assertCanUseConnection('user-2', 'c-team-aom'),
    /forbidden/i,
  )
})
