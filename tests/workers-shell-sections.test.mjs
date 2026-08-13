// R-SMOOTHNESS Round H — the background-work status board + push triggers.
import { test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const shell = readFileSync(new URL('../src/dashboard/cv6next/WorkersShell.jsx', import.meta.url), 'utf8')
const steward = readFileSync(new URL('../api/_lib/roomSteward.js', import.meta.url), 'utf8')
const taskComplete = readFileSync(new URL('../../scripts/task-complete.sh', import.meta.url), 'utf8')

test('board sections render in the proven order with needs-you first', () => {
  const order = ['Waiting on you', 'Queued', 'Finished recently', 'Failed']
  let last = -1
  for (const label of order) {
    const idx = shell.indexOf(`label="${label}"`)
    assert.ok(idx > -1, `section ${label} present`)
    assert.ok(idx > last, `section ${label} in order`)
    last = idx
  }
  // the question is shown and answerable inline, posting to the task's room
  assert.match(shell, /metadata\?\.question/)
  assert.match(shell, /AnswerBox/)
  assert.match(shell, /supabase-messages/)
})

test('web push fires on the needs-you TRANSITION, never on repeat sweeps', () => {
  // steward: guard compares the PREVIOUS receipt state before notifying
  assert.match(steward, /receipt\.state !== 'needs_attention' && health\.state === 'needs_attention'/)
  assert.match(steward, /notifyNeedsYou/)
  assert.match(steward, /tag: `needs-you-\$\{receipt\.message_id\}`/)
  // task lane: push where the needs_input status is written, tagged per task
  assert.match(taskComplete, /task-\{sys\.argv\[3\]\}/)
  assert.match(taskComplete, /x-push-secret/)
})

test('no DDL and no new row vocabularies in the push path', () => {
  assert.ok(!/sender_role/.test(steward.slice(steward.indexOf('notifyNeedsYou'))), 'push path writes no message rows')
})
