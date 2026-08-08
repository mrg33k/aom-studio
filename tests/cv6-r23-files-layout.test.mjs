import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chat = readFileSync(new URL('../src/dashboard/cv6next/ChatLifecycle.jsx', import.meta.url), 'utf8');
const shelf = readFileSync(new URL('../src/dashboard/cv6next/ChatDesktop.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8');

test('Files prefers a two-column preview grid while retaining explicit list mode', () => {
  assert.match(shelf, /FILES_PREF_DEFAULTS\s*=\s*\{\s*layout:\s*'grid'/);
  assert.match(chat, /aria-label="Grid view"/);
  assert.match(chat, /aria-label="List view"/);
  assert.match(chat, /className=\{`cv6-fs-grid is-\$\{viewMode\}`\}/);
  assert.match(css, /\.cv6-fs-grid\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.cv6-fs-grid\.is-list\s*\{[^}]*grid-template-columns:minmax\(0,1fr\)/s);
});

test('grid cards request resized imagery and fit the complete preview', () => {
  assert.match(chat, /mfsThumbSrc\(f\.url,\s*440\)/);
  assert.match(chat, /className="cv6-fs-preview-img"/);
  assert.match(css, /\.cv6-fs-preview-img\s*\{[^}]*object-fit:contain/s);
  assert.match(shelf, /\?'}w=440/);
  assert.match(shelf, /objectFit:\s*'contain'/);
});

test('layout persists and every file type uses the in-app preview handoff', () => {
  assert.match(shelf, /export function writeFilesPrefs/);
  assert.match(chat, /writeFilesPrefs\(\{\s*layout:\s*next\s*\}\)/);
  assert.match(chat, /if \(onReview\) \{ onReview\(f\); return; \}/);
  assert.match(shelf, /if \(onReview\) \{ onReview\(it\); return; \}/);
  assert.match(chat, /`Preview \$\{f\.name\}`/);
});
