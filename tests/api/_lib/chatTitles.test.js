import assert from 'node:assert/strict'
import test from 'node:test'

import { directChatTitleRoomId, directChatTitlesByAgent, normalizeChatTitle } from '../../../api/_lib/chatTitles.js'

test('builds tenant-scoped synthetic room ids for direct chat titles', () => {
  assert.equal(directChatTitleRoomId('AOM', 'Bobby'), 'chat:aom:agent:bobby')
  assert.equal(directChatTitleRoomId('aom', '../bad'), '')
})

test('reads only valid direct-chat titles for the requested tenant', () => {
  assert.deepEqual(directChatTitlesByAgent([
    { id: 'chat:aom:agent:bobby', name: 'Website refresh' },
    { id: 'chat:other:agent:bobby', name: 'Wrong tenant' },
    { id: 'bobby', name: 'Canonical agent row' },
  ], 'aom'), { bobby: 'Website refresh' })
})

test('normalizes whitespace and rejects blank or overlong titles', () => {
  assert.equal(normalizeChatTitle('  Website   refresh  '), 'Website refresh')
  assert.equal(normalizeChatTitle('   '), '')
  assert.equal(normalizeChatTitle('x'.repeat(81)), '')
})
