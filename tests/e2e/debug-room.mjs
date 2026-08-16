#!/usr/bin/env node
/**
 * debug-room.mjs — mission: corner:convex-multi-agent
 *
 * When a capability says "could not open any room", this says WHY. It walks the exact
 * path the driver walks and prints what it saw at each step: viewport, which row classes
 * are actually present, the room it chose, the keyed selector it built, and whether the
 * room marker appeared after the click.
 *
 *   node tests/e2e/debug-room.mjs --surface cv6 --cdp http://127.0.0.1:9222
 */

import { chromium } from '@playwright/test';
import { getSurface } from './surfaces.mjs';

const argv = process.argv.slice(2);
const arg = (n, f) => { const i = argv.indexOf(`--${n}`); return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : f; };

const cfg = getSurface(arg('surface', 'cv6'));
const CDP = arg('cdp', 'http://127.0.0.1:9222');

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
const page = await context.newPage();
await page.goto(cfg.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);

console.log('viewport      :', JSON.stringify(page.viewportSize()));
console.log('url           :', page.url());

const shape = await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  mresumecard: document.querySelectorAll('.mresumecard[data-cv6-arg]').length,
  projrow: document.querySelectorAll('.projrow[data-cv6-arg]').length,
  missrow: document.querySelectorAll('.missrow[data-cv6-arg]').length,
  recentrow: document.querySelectorAll('.recentrow[data-cv6-arg]').length,
  restrow: document.querySelectorAll('.restrow[data-cv6-arg]').length,
  anyCv6Arg: document.querySelectorAll('[data-cv6-arg]').length,
  chatInput: document.querySelectorAll('[data-testid="cv6-chat-input"]').length,
  intakeInput: document.querySelectorAll('[data-testid="cv6-intake-input"]').length,
  sampleKeys: [...document.querySelectorAll('[data-cv6-arg]')].slice(0, 12).map((e) => `${e.className.split(' ')[0]}|${e.getAttribute('data-cv6-arg')}`),
}));
console.log('page shape    :', JSON.stringify(shape, null, 2));

const rows = page.locator(cfg.roomRow.selector);
const n = await rows.count();
console.log(`roomRow match : ${n} using ${cfg.roomRow.selector}`);

if (n === 0) { console.log('\nNo room rows. That is the failure.'); await page.close(); process.exit(1); }

const key = await rows.nth(0).getAttribute('data-cv6-arg');
const cls = await rows.nth(0).getAttribute('class');
console.log(`first row     : class="${cls}" key="${key}"`);

const keyed = cfg.roomRow.selector.split(',')
  .map((p) => p.trim().replace('[data-cv6-arg]', `[data-cv6-arg="${key}"]`).replace('[data-room-id]', `[data-room-id="${key}"]`))
  .join(', ');
console.log('keyed selector:', keyed);
console.log('keyed matches :', await page.locator(keyed).count());

console.log('\nclicking...');
await page.locator(keyed).first().click({ timeout: 15000 }).catch((e) => console.log('CLICK FAILED:', e.message.split('\n')[0]));
await page.waitForTimeout(6000);

const after = await page.evaluate(() => ({
  chatInput: document.querySelectorAll('[data-testid="cv6-chat-input"]').length,
  placeholder: document.querySelector('[data-testid="cv6-chat-input"]')?.getAttribute('placeholder') || null,
  messages: document.querySelectorAll('[data-cv6-message-turn][data-message-id]').length,
  url: location.href,
}));
console.log('after click   :', JSON.stringify(after, null, 2));
console.log(after.chatInput > 0 ? '\nROOM OPENED — the driver path works here.' : '\nROOM DID NOT OPEN — this is the real failure point.');

await page.close();
// A CDP connection keeps the event loop alive forever, so without an explicit exit the
// process hangs and piped stdout never flushes — it looks exactly like a frozen browser.
// Do NOT call browser.close() here: this connection is Patrik's shared robot Chrome.
process.exit(after.chatInput > 0 ? 0 : 1);
