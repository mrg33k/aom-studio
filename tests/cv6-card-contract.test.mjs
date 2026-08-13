// R-SMOOTHNESS Round F — card contract honesty.
import { test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { createSummaryBlock } from '../src/dashboard/cv6next/data/blockSchema.js'

test('summary card headline drift is closed', () => {
  const schema = readFileSync(new URL('../src/dashboard/cv6next/data/blockSchema.js', import.meta.url), 'utf8')
  assert.match(schema, /@property \{string\} \[headline\]/)
  const withHeadline = createSummaryBlock(1, ['b'], [], [], 'The answer')
  assert.equal(withHeadline.headline, 'The answer')
  const without = createSummaryBlock(1, ['b'])
  assert.ok(!('headline' in without), 'no empty headline key on legacy calls')
  const doctrine = readFileSync(new URL('../../scripts/prompt_doctrine.py', import.meta.url), 'utf8')
  const exemplars = doctrine.split('"type\\":\\"summary\\"').length - 1 + doctrine.split('"type":"summary"').length - 1
  const withHead = doctrine.split('headline').length - 1
  assert.ok(exemplars >= 2, 'both doctrine exemplars present')
  assert.ok(withHead >= 2, 'headline in both doctrine exemplars')
})

test('live step row carries the action glyph (tool-card read)', () => {
  const worklist = readFileSync(new URL('../src/dashboard/cv6next/RoomWorkList.jsx', import.meta.url), 'utf8')
  assert.match(worklist, /actionGlyph\(activeLabel\)/)
  const goalThread = readFileSync(new URL('../src/dashboard/cv6next/ChatGoalThread.jsx', import.meta.url), 'utf8')
  assert.match(goalThread, /export function actionGlyph/)
})

test('no fake dock: DEMO_JOB is gone and the dock hides without a live job', () => {
  const dock = readFileSync(new URL('../src/dashboard/cv6next/ActivityDock.jsx', import.meta.url), 'utf8')
  assert.ok(!/DEMO_JOB|isDemonstration/.test(dock), 'demo fixture fully excised')
  assert.match(dock, /if \(!currentJob\) return null/)
})
