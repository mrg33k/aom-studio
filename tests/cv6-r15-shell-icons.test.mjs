import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8')
const mobile = readFileSync(new URL('../src/dashboard/cv6next/ChatLifecycle.jsx', import.meta.url), 'utf8')
const desktop = readFileSync(new URL('../src/dashboard/cv6next/ChatDesktop.jsx', import.meta.url), 'utf8')

test('R15 pins the resting shell to the viewport and uses icon-only chat actions', () => {
  assert.match(css, /\[data-cv6\]\.cv6-app-shell \{[\s\S]*?bottom:0;[\s\S]*?height:auto;/)
  assert.match(css, /html\.cv6-keyboard-open \[data-cv6\]\.cv6-app-shell \{[\s\S]*?height:var\(--cv6-viewport-height/)
  assert.match(css, /\.cv6-chat-header-button \{[\s\S]*?width:38px;[\s\S]*?border-radius:50% !important;/)
  assert.match(css, /@media \(max-width:640px\) \{[\s\S]*?\.cv6-chat-header-button \{ width:44px; min-width:44px; height:44px; \}/)
  assert.doesNotMatch(css, /\.cv6-chat-header-button \{[\s\S]*?min-width:58px/)
  for (const source of [mobile, desktop]) {
    assert.match(source, /className="cv6-chat-header-button" aria-label="Files"[^>]*>[\s\S]*?<svg/)
    assert.match(source, /className="cv6-chat-header-button" aria-label="More"[^>]*>[\s\S]*?<svg/)
  }
})
