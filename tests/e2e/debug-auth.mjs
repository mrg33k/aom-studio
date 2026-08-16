#!/usr/bin/env node
/**
 * debug-auth.mjs — mission: corner:convex-multi-agent
 *
 * Walks a surface's sign-in one step at a time and reports what was on screen at each
 * step, so "sign-in did not reach an authenticated app shell" becomes an actual reason.
 *
 *   node tests/e2e/debug-auth.mjs --surface convex-web
 */

import { chromium } from '@playwright/test';
import { getSurface } from './surfaces.mjs';
import { mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, f) => { const i = argv.indexOf(`--${n}`); return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : f; };

const cfg = getSurface(arg('surface', 'convex-web'));
const a = cfg.auth || {};
mkdirSync('tests/e2e/artifacts', { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });

const shot = async (n) => { await page.screenshot({ path: `tests/e2e/artifacts/auth-${n}.png` }); };
const state = async (label) => {
  const s = await page.evaluate(() => ({
    url: location.href,
    text: (document.body.innerText || '').trim().slice(0, 320),
    inputs: [...document.querySelectorAll('input')].map((e) => `${e.type}|${e.name}|${e.placeholder}`),
    buttons: [...document.querySelectorAll('button')].map((b) => (b.innerText || '').trim()).filter(Boolean).slice(0, 10),
    rooms: document.querySelectorAll('[data-room-id], a[href^="/room/"]').length,
  }));
  console.log(`\n--- ${label} ---`);
  console.log('url    :', s.url);
  console.log('inputs :', JSON.stringify(s.inputs));
  console.log('buttons:', JSON.stringify(s.buttons));
  console.log('rooms  :', s.rooms);
  console.log('text   :', s.text.replace(/\n/g, ' / ').slice(0, 240));
  return s;
};

await page.goto(cfg.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
await state('landing'); await shot('1-landing');

for (const [i, step] of (a.preSteps || []).entries()) {
  const b = step.role ? page.getByRole(step.role, { name: step.name }) : page.locator(step.selector);
  const n = await b.count().catch(() => 0);
  console.log(`\npreStep ${i}: ${JSON.stringify(String(step.name || step.selector))} → ${n} match(es)`);
  if (n) { await b.first().click({ timeout: 10000 }).catch((e) => console.log('  click failed:', e.message.split('\n')[0])); await page.waitForTimeout(2500); }
}
await state('after preSteps'); await shot('2-after-presteps');

const field = page.locator(a.emailField.selector);
const fn = await field.count().catch(() => 0);
console.log(`\nemail field → ${fn} match(es)`);
if (fn) {
  await field.first().fill(a.email);
  const submit = page.getByRole(a.submit.role, { name: a.submit.name });
  const sn = await submit.count().catch(() => 0);
  console.log(`submit button → ${sn} match(es)`);
  if (sn) await submit.first().click({ timeout: 10000 }).catch((e) => console.log('  click failed:', e.message.split('\n')[0]));
  else await field.first().press('Enter');
  await page.waitForTimeout(6000);
}
const after = await state('after submit'); await shot('3-after-submit');

console.log('\nconsole errors:', errs.length ? errs.slice(0, 6).join(' | ') : '(none)');
console.log(after.rooms > 0 ? '\nSIGNED IN — rooms are visible.' : '\nNOT SIGNED IN — no room elements after submit.');

await browser.close();
process.exit(after.rooms > 0 ? 0 : 1);
