#!/usr/bin/env node
/**
 * diagnose.mjs — mission: corner:convex-multi-agent
 *
 * Point it at a Corner surface and it tells you what a signed-in person actually sees:
 * the visible text, every console error, whether the error boundary fired, and which
 * backends the page talked to. This is the first thing to run when a surface "is broken",
 * before changing a single line.
 *
 *   node tests/e2e/diagnose.mjs                                   # live dashboard via robot Chrome
 *   node tests/e2e/diagnose.mjs --url https://corner-convex.vercel.app --fresh
 */

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, f) => { const i = argv.indexOf(`--${n}`); return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : f; };
const flag = (n) => argv.includes(`--${n}`);

const URL_ = arg('url', 'https://www.aheadofmarket.com/dashboard');
const CDP = flag('fresh') ? null : arg('cdp', 'http://127.0.0.1:9222');
const WAIT = Number(arg('wait', '10000'));

mkdirSync('tests/e2e/artifacts', { recursive: true });

const browser = CDP ? await chromium.connectOverCDP(CDP) : await chromium.launch({ headless: true });
const ctx = CDP ? (browser.contexts()[0] || await browser.newContext()) : await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [], requests = [], failed = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 500)); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${(e.stack || e.message).slice(0, 800)}`));
page.on('request', (r) => requests.push(r.url()));
page.on('requestfailed', (r) => failed.push(`${r.url().slice(0, 120)} — ${r.failure()?.errorText || 'failed'}`));

console.log(`diagnose: ${URL_}  (${CDP ? `attached ${CDP}` : 'fresh browser'})\n`);
await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(WAIT);

console.log('=== landed on ===');
console.log(page.url());

// One browser-side pass. Playwright text matchers over a heavy app DOM are slow enough
// to look like a hang, so everything visual is extracted in a single evaluate().
const snapshot = await page.evaluate(() => {
  const t = (document.body?.innerText || '').trim();
  // Detect the crash screen by its test hook, NOT by its prose. A room's message preview
  // can legitimately read "That task hit a snag", which made text matching report a
  // perfectly healthy dashboard as crashed.
  const el = document.querySelector('[data-testid="cv6-screen-error"], [data-testid="screen-error"]');
  const boundary = el ? (el.textContent || 'screen error').trim().slice(0, 80) : null;
  const countRole = (sel) => document.querySelectorAll(sel).length;
  return {
    text: t.slice(0, 1500),
    boundary: boundary ? boundary[0] : null,
    rootChildren: document.getElementById('root')?.childElementCount ?? -1,
    buttons: countRole('button'),
    links: countRole('a[href]'),
    roomish: countRole('a[href*="/room"], a[href*="/chat"], [data-room-id]'),
    testids: [...new Set([...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid')))].slice(0, 40),
  };
}).catch((e) => ({ text: `(evaluate failed: ${e.message})`, boundary: null, rootChildren: -1, buttons: 0, links: 0, roomish: 0, testids: [] }));

console.log('\n=== what a person sees ===');
console.log(snapshot.text || '(nothing rendered)');

console.log(`\n=== error boundary visible? === ${snapshot.boundary ? `YES — "${snapshot.boundary}"` : 'no'}`);
console.log(`=== app mounted? === #root children: ${snapshot.rootChildren}, buttons: ${snapshot.buttons}, links: ${snapshot.links}, room-ish elements: ${snapshot.roomish}`);
if (snapshot.testids.length) console.log(`=== data-testids present ===\n  ${snapshot.testids.join('\n  ')}`);

console.log('\n=== console errors ===');
console.log(errors.length ? errors.join('\n---\n') : '(none)');

console.log('\n=== failed requests ===');
console.log(failed.length ? failed.slice(0, 15).join('\n') : '(none)');

const host = (u) => { try { return new URL(u).host; } catch { return u.slice(0, 40); } };
const tally = {};
for (const r of requests) tally[host(r)] = (tally[host(r)] || 0) + 1;
console.log('\n=== backends contacted ===');
Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([h, n]) => console.log(`  ${String(n).padStart(4)}  ${h}`));

const msgApi = requests.filter((u) => /supabase-messages|rest\/v1\/messages|realtime.*messages/.test(u));
const convex = requests.filter((u) => /convex\.(cloud|site)/.test(u));
console.log(`\n  supabase message calls : ${msgApi.length}`);
console.log(`  convex calls           : ${convex.length}`);

const shot = `tests/e2e/artifacts/diagnose-${host(URL_).replace(/\W/g, '-')}.png`;
await page.screenshot({ path: shot });
console.log(`\nscreenshot: ${shot}`);

await page.close();
// Same trap as debug-room.mjs: an attached CDP connection never lets node exit on its
// own. Close the browser only when we launched it; otherwise just exit.
if (!CDP) await browser.close();
process.exit(snapshot.boundary ? 1 : 0);
