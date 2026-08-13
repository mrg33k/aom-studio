import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8')

test('R16 removes the resting safe-area spacer from the mobile composer', () => {
  assert.match(css, /\[data-cv6\] \.mcomposer \{[^}]*bottom:20px !important;/)
  assert.doesNotMatch(css, /\[data-cv6\] \.mcomposer \{[^}]*safe-area-inset-bottom/)
  assert.match(css, /\[data-cv6\]\[data-screen="chat-room"\] > \.scrbody \{ padding-bottom:calc\(var\(--cv6-composer-h, 108px\) \+ 32px\) !important; \}/)
  assert.match(css, /html\.cv6-keyboard-open \[data-cv6\] \.mcomposer \{ bottom:8px !important; \}/)
})
