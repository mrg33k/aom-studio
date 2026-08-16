#!/usr/bin/env node
/**
 * debug-dom.mjs — mission: corner:convex-multi-agent
 *
 * Signs into a surface and reports the handles a driver could actually key on: test ids,
 * repeated row shapes, inputs, and buttons. Use this when writing or repairing a surface
 * map in surfaces.mjs, instead of guessing selectors and reading the failures backwards.
 *
 *   node tests/e2e/debug-dom.mjs --surface convex-web
 *   node tests/e2e/debug-dom.mjs --surface cv6 --cdp http://127.0.0.1:9222
 */

import { chromium } from '@playwright/test';
import { getSurface } from './surfaces.mjs';
import { createWebDriver } from './driver-web.mjs';
import { mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, f) => { const i = argv.indexOf(`--${n}`); return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : f; };

const surface = arg('surface', 'convex-web');
const cfg = getSurface(surface);
const CDP = arg('cdp', null);
mkdirSync('tests/e2e/artifacts', { recursive: true });

const d = createWebDriver({ surface, cfg, cdp: CDP, headless: true, onLog: (m) => console.log('   ', m) });
await d.start();
await d.signIn();
await d.settle(4000);

const report = await d.raw().evaluate(() => {
  const testids = [...new Set([...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid')))];
  const dataAttrs = new Map();
  for (const el of document.querySelectorAll('*')) {
    for (const a of el.attributes) {
      if (a.name.startsWith('data-') && a.name !== 'data-testid') dataAttrs.set(a.name, (dataAttrs.get(a.name) || 0) + 1);
    }
  }
  // Find the most repeated class shape — usually the list-row component.
  const classCounts = new Map();
  for (const el of document.querySelectorAll('div,li,a,button')) {
    const c = (el.className || '').toString().trim().split(/\s+/)[0];
    if (c && c.length > 2) classCounts.set(c, (classCounts.get(c) || 0) + 1);
  }
  const links = [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')))].slice(0, 15);
  return {
    url: location.href,
    testids: testids.slice(0, 40),
    dataAttrs: [...dataAttrs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
    repeatedClasses: [...classCounts.entries()].filter(([, n]) => n > 3).sort((a, b) => b[1] - a[1]).slice(0, 15),
    links,
    inputs: [...document.querySelectorAll('input,textarea')].map((e) => `${e.tagName}|${e.type || ''}|${e.getAttribute('placeholder') || ''}|${e.getAttribute('data-testid') || ''}`),
    buttons: [...document.querySelectorAll('button')].map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 20),
  };
});

console.log('\nurl              :', report.url);
console.log('\ndata-testids     :', report.testids.length ? report.testids.join(', ') : '(none)');
console.log('\nother data-attrs :');
report.dataAttrs.forEach(([k, n]) => console.log(`   ${String(n).padStart(4)}  ${k}`));
console.log('\nrepeated classes (likely row components):');
report.repeatedClasses.forEach(([k, n]) => console.log(`   ${String(n).padStart(4)}  .${k}`));
console.log('\nlinks            :', report.links.join(', ') || '(none)');
console.log('\ninputs           :', report.inputs.join('  ||  ') || '(none)');
console.log('\nbuttons          :', report.buttons.join(' | '));

await d.screenshot('dom-probe');
await d.stop();
process.exit(0);
