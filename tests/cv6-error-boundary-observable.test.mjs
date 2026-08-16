import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * The CV6 crash screen must stay machine-detectable.
 *
 * On 2026-08-15 the dashboard rendered its error boundary for every signed-in user and
 * nobody could tell from outside, because the only way to detect it was matching the words
 * "hit a snag" — and a room's message preview legitimately reads "That task hit a snag and
 * was marked failed". Text matching therefore reported a healthy dashboard as crashed and
 * would equally report a crashed one as healthy.
 *
 * The fix was a test hook plus a labelled log. This test exists because I added that hook
 * and then wrote it into diagnose.mjs and into a worker brief as a required contract —
 * without anything stopping someone renaming it and silently reverting detection to prose.
 */

const src = readFileSync(new URL('../src/dashboard/cv6next/CornerCV6.jsx', import.meta.url), 'utf8')

const boundaryStart = src.indexOf('class ScreenBoundary')
const boundaryEnd = src.indexOf('\nclass ', boundaryStart + 1) === -1
  ? src.indexOf('\nfunction ', boundaryStart + 1)
  : src.indexOf('\nclass ', boundaryStart + 1)
const boundary = src.slice(boundaryStart, boundaryEnd > 0 ? boundaryEnd : boundaryStart + 4000)

test('ScreenBoundary exists', () => {
  assert.notEqual(boundaryStart, -1, 'ScreenBoundary class not found in CornerCV6.jsx')
})

test('the crash screen carries a stable test hook, not just prose', () => {
  assert.match(
    boundary,
    /data-testid="cv6-screen-error"/,
    'ScreenBoundary must render data-testid="cv6-screen-error". diagnose.mjs and the E2E ' +
    'suite key off it; without it, crash detection falls back to matching "hit a snag", ' +
    'which a room message preview can contain.',
  )
})

test('the crash is logged with a greppable tag and the view that broke', () => {
  assert.match(
    boundary,
    /componentDidCatch/,
    'ScreenBoundary must implement componentDidCatch. React logs the error but does not ' +
    'attribute it to a boundary, which is why the 2026-08-15 cause took a bundle demangle ' +
    'to find.',
  )
  assert.match(boundary, /\[cv6-screen-error\]/, 'the log must carry the [cv6-screen-error] tag')
  assert.match(boundary, /componentDidCatch\([\s\S]{0,200}viewKey/, 'the log must name the view that broke')
})
