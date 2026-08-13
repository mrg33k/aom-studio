// R-SMOOTHNESS Round D — streaming consumption contract (source assertions).
// The engine may stream a live draft, but the shipped contract of
// useRoomThread.js (:197) must survive: stream failures are silent no-ops,
// the draft never enters messages, and the real row kills the draft.
import { test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const engine = readFileSync(new URL('../src/dashboard/cv6next/data/useRoomThread.js', import.meta.url), 'utf8')
const draftModule = readFileSync(new URL('../src/dashboard/cv6next/StreamingDraft.jsx', import.meta.url), 'utf8')
const desktop = readFileSync(new URL('../src/dashboard/cv6next/ChatDesktop.jsx', import.meta.url), 'utf8')
const lifecycle = readFileSync(new URL('../src/dashboard/cv6next/ChatLifecycle.jsx', import.meta.url), 'utf8')
const worklist = readFileSync(new URL('../src/dashboard/cv6next/RoomWorkList.jsx', import.meta.url), 'utf8')

test('engine owns one stream per turn, keyed by lastSentId', () => {
  assert.match(engine, /startTurnStream\(this\.state\.lastSentId\)/)
  assert.match(engine, /if \(!messageId \|\| this\.streamKey === messageId\) return/)
})

test('stream aborts with the other turn polls', () => {
  assert.match(engine, /stopTurnPolls\(\) \{[\s\S]{0,300}?this\.stopTurnStream\(\)/)
})

test('stream path commits draft only — never messages/awaiting/liveSteps', () => {
  const body = engine.slice(engine.indexOf('startTurnStream(messageId)'), engine.indexOf('// The turn-scoped polls'))
  assert.match(body, /commit\(\{ draft: \{ text: fullText, streaming: true \} \}\)/)
  assert.ok(!/commit\(\{[^}]*(messages|awaiting|liveSteps)/.test(body), 'stream must not touch turn-authority state')
  assert.match(body, /catch\(\(\) => \{/)
})

test('real row clears the draft in project(), same synchronous pass', () => {
  assert.match(engine, /this\.state\.draft && newestReply && this\.lastSentTs && tms\(newestReply\) >= this\.lastSentTs/)
})

test('snapshot exposes draft only while awaiting; new turns start clean', () => {
  assert.match(engine, /draft: s\.awaiting \? s\.draft : null/)
  assert.match(engine, /awaiting: true, liveSteps: \[\], draft: null/)
})

test('StreamingDraft renders through the shared markdown path on both surfaces', () => {
  assert.match(draftModule, /export default function StreamingDraft/)
  const draftBody = draftModule
  assert.match(draftBody, /ChatMessageRenderer content=\{draft\.text\}/)
  for (const [name, src] of [['ChatDesktop', desktop], ['ChatLifecycle', lifecycle]]) {
    const draftIdx = src.indexOf('<StreamingDraft')
    const worklistIdx = src.indexOf('<RoomWorkList', draftIdx)
    assert.ok(draftIdx > -1 && worklistIdx > draftIdx, `${name}: StreamingDraft mounts directly above RoomWorkList`)
  }
})

test('cold-spawn waking state is receipt-driven and honest (D4)', () => {
  assert.match(worklist, /turnHealth\?\.state === 'accepted'/)
  assert.match(worklist, /awaitingSince && \(Date\.now\(\) - awaitingSince > 8000\)/)
  assert.match(worklist, /'Waking the room'/)
})
