import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../src/dashboard/cv6next/CornerCV6.jsx', import.meta.url), 'utf8')
const input = readFileSync(new URL('../src/dashboard/cv6next/Cv6InputBar.jsx', import.meta.url), 'utf8')

test('mobile footer clearance stays chat-only and follows the focused visual viewport', () => {
  assert.doesNotMatch(css, /\[data-cv6\] \.scrbody \{ padding-bottom:calc\(150px/)
  assert.match(css, /\[data-cv6\]\[data-screen="chat-room"\] > \.scrbody/)
  assert.match(css, /html\.cv6-keyboard-open \[data-cv6\] \.mcomposer \{ bottom:8px !important; \}/)
  assert.match(shell, /viewport\?\.offsetTop/)
  assert.match(shell, /document\.addEventListener\('focusin', syncFocusedViewport\)/)
  assert.match(input, /fontSize: 16/)
})
