import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8')
const lifecycle = readFileSync(new URL('../src/dashboard/cv6next/ChatLifecycle.jsx', import.meta.url), 'utf8')
const desktop = readFileSync(new URL('../src/dashboard/cv6next/ChatDesktop.jsx', import.meta.url), 'utf8')
const thread = readFileSync(new URL('../src/dashboard/cv6next/MessageThread.jsx', import.meta.url), 'utf8')

test('R14 keeps recent chats swipeable and live progress singular at the tail', () => {
  assert.match(css, /\.mresumelist,[\s\S]*?\.mresumecard \{\s*touch-action:pan-x pan-y;/)
  assert.match(thread, /export function settleHistoricalBlocks/)
  assert.match(thread, /data-cv6-live-work=/)
  assert.match(lifecycle, /liveProgressKey/)
  // Round G: the scrollTo semantics moved to the ONE shared hook (useStickToBottom).
  const hook = readFileSync(new URL('../src/dashboard/cv6next/useStickToBottom.js', import.meta.url), 'utf8')
  assert.match(hook, /el\.scrollTo\(\{ top: el\.scrollHeight, behavior \}\)/)
  assert.match(lifecycle, /useStickToBottom\(\{/)
  assert.doesNotMatch(lifecycle, /height: awaiting \? '78vh'/)
  // Round G: the live-step follow semantics live in the hook; desktop passes its liveKey.
  assert.match(hook, /steps and the streaming draft grow scrollHeight/)
  assert.match(desktop, /useStickToBottom\(\{/)
})
