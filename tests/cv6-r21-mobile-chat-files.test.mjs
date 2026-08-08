import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const chat = fs.readFileSync(new URL('../src/dashboard/cv6next/ChatLifecycle.jsx', import.meta.url), 'utf8');
const composer = fs.readFileSync(new URL('../src/dashboard/cv6next/Cv6InputBar.jsx', import.meta.url), 'utf8');
const messages = fs.readFileSync(new URL('../src/dashboard/cv6next/MessageThread.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8');

test('mobile agent turns give the transcript a centered symmetric width', () => {
  assert.match(messages, /className="cv6-mobile-turn-avatar"/);
  assert.match(css, /\.cv6-mobile-turn-avatar\s*\{\s*display:none\s*!important/);
  assert.match(css, /data-screen="chat-room"\]\s*>\s*\.scrbody\s*\{[^}]*padding-left:12px\s*!important;[^}]*padding-right:12px\s*!important/s);
});

test('composer is a compact multiline field that grows only to a bounded height', () => {
  assert.match(composer, /<textarea[\s\S]*rows=\{1\}/);
  assert.match(composer, /Math\.min\(118,\s*Math\.max\(24,\s*field\.scrollHeight\)\)/);
  assert.match(composer, /field\.scrollHeight\s*>\s*118\s*\?\s*'auto'\s*:\s*'hidden'/);
  assert.match(css, /button\.cv6-composer-primary\s*\{[^}]*width:34px\s*!important;[^}]*border-radius:8px\s*!important/s);
  assert.match(css, /button\.cv6-composer-util\s*\{[^}]*height:30px\s*!important;[^}]*border-radius:7px\s*!important/s);
});

test('files open from a deliberate upward overscroll and close from the drawer handle', () => {
  assert.match(chat, /remaining\s*>\s*10/);
  assert.match(chat, /dy\s*<\s*-58/);
  assert.match(chat, /setFilesSheetOpen\(true\)/);
  assert.match(chat, /className="cv6-fs-drag-zone"/);
  assert.match(chat, /current\.lastY\s*-\s*current\.startY\s*>\s*72/);
  assert.match(chat, /onTouchMove=\{moveSheetDrag\}/);
});

test('mobile Files is a two-column overview with real selection and no rendered swipe underlay', () => {
  assert.match(chat, /className="cv6-fs-grid"/);
  assert.match(css, /\.cv6-fs-grid\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(chat, /aria-pressed=\{selectMode\}/);
  assert.match(chat, /const saveSelected = useCallback/);
  assert.match(chat, /Save<\/button>/);
  assert.doesNotMatch(chat, /<SwipeFileRow\b/);
});

test('glass menus remain opaque across the chat and Files HUD', () => {
  assert.match(css, /\.cv6-chat-more-menu\s*\{[^}]*background:var\(--composer-solid,\s*#131317\)/s);
  assert.match(css, /\.cv6-fs-menu\s*\{[^}]*background:var\(--composer-solid,\s*#131317\)/s);
});
