import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chat = readFileSync(new URL('../src/dashboard/cv6next/ChatLifecycle.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8');

test('chat lifecycle exposes one responsive reading lane', () => {
  assert.match(chat, /className="cv6-chat-reading-lane"/);
  assert.match(css, /\.cv6-chat-reading-lane\s*\{[^}]*max-width:760px;[^}]*margin-inline:auto;/s);
});

test('repeated turn avatars cannot offset chat at tablet or desktop widths', () => {
  assert.match(css, /\[data-screen="chat-room"\] \.cv6-mobile-turn-avatar\s*\{\s*display:none !important;/);
});

test('iPad uses a centered 720px touch canvas instead of a stretched phone surface', () => {
  assert.match(css, /@media \(min-width:641px\) and \(max-width:899px\)/);
  assert.match(css, /\[data-screen="chat-room"\] > \.scrbody\s*\{[^}]*calc\(\(100% - 720px\) \/ 2\)/s);
  assert.match(css, /\[data-screen="chat-room"\] > \.mcomposer\s*\{[^}]*max-width:720px;[^}]*margin-inline:auto;/s);
  assert.match(css, /\[data-screen="chat-room"\] \.cv6-fs-sheet\s*\{[^}]*max-width:720px;/s);
});
