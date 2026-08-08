import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8');

test('selected chat columns do not paint a persistent accent outline', () => {
  assert.doesNotMatch(css, /\.cv6-workspace-column\[data-knav-zone=[^\]]+\]\s*\{[^}]*box-shadow\s*:[^;}]*var\(--accent\)/s);
});

test('keyboard-only focus affordances remain available', () => {
  assert.match(css, /:where\(button, a\[href\], \[role="button"\]\):focus-visible\s*\{[^}]*outline\s*:\s*2px solid var\(--accent\)/s);
});
