// corner:cv6-polish R3 — stylesheet contract for chat tap acknowledgment.
// Headless :active polling is unreliable, so the press rules are asserted at the
// stylesheet layer (same pattern as the topbar geometry contract); the behavior
// itself is verified live after deploy.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8')

test('chips and day-fold headers carry the shared press vocabulary', () => {
  assert.match(css, /\.chip-btn:active[\s\S]{0,200}scale\(var\(--press-scale/)
  assert.match(css, /\.gc-head:active\s*\{\s*opacity/)
})

test('chip touch hit-area extends without changing the visual, reduced-motion guarded', () => {
  assert.match(css, /\.chip-btn::before[\s\S]{0,280}inset:\s*-4px/)
  assert.match(css, /prefers-reduced-motion[\s\S]{0,400}\.chip-btn:active[\s\S]{0,80}transform:\s*none/)
})
