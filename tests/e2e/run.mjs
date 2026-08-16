#!/usr/bin/env node
/**
 * run.mjs — mission: corner:convex-multi-agent
 *
 * The end-to-end suite. One capability list, run against one surface at a time, producing
 * a scorecard you can compare across surfaces and across time.
 *
 * THE WORKFLOW THIS EXISTS FOR
 *   1. Capture what CV6 does today, and freeze it as the bar:
 *        node tests/e2e/run.mjs --surface cv6 --cdp http://127.0.0.1:9222 \
 *                               --save-baseline tests/e2e/baseline-cv6.json
 *   2. Grade a replacement against that bar, any time you like:
 *        node tests/e2e/run.mjs --surface convex-web \
 *                               --baseline tests/e2e/baseline-cv6.json
 *   3. The printed REGRESSIONS list is the work list. When it is empty, the replacement
 *      does everything CV6 did, and that is a fact rather than an opinion.
 *
 * Exit codes:  0 = met the bar (or all checks passed if no baseline)   1 = did not
 *
 * This file is the judge. Whoever is driving the loop does not edit it.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { CAPABILITIES, mkToken } from './capabilities.mjs';
import { getSurface, surfaceNames } from './surfaces.mjs';
import { createWebDriver } from './driver-web.mjs';

const argv = process.argv.slice(2);
const arg = (n, f) => { const i = argv.indexOf(`--${n}`); return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : f; };
const flag = (n) => argv.includes(`--${n}`);

const SURFACE = arg('surface', 'cv6');
const CDP = arg('cdp', process.env.CORNER_CDP || null);
const BASELINE = arg('baseline', null);
const SAVE_BASELINE = arg('save-baseline', null);
const ONLY = arg('only', null);          // comma-separated capability ids
const TIER = arg('tier', null);          // core | parity | polish
const HEADLESS = !flag('headed');
const JSON_OUT = flag('json');

if (flag('help') || flag('list-surfaces')) {
  console.log(`surfaces: ${surfaceNames().join(', ')}`);
  console.log(`capabilities: ${CAPABILITIES.length} (${CAPABILITIES.filter(c=>c.tier==='core').length} core)`);
  process.exit(0);
}

const cfg = getSurface(SURFACE);
const token = mkToken(SURFACE);

let selected = CAPABILITIES;
if (TIER) selected = selected.filter((c) => c.tier === TIER);
if (ONLY) { const ids = ONLY.split(',').map((s) => s.trim()); selected = selected.filter((c) => ids.includes(c.id)); }

const results = [];
const log = (m) => { if (!JSON_OUT) console.log(`     ${m}`); };

function line(cap, status, detail) {
  if (JSON_OUT) return;
  const badge = status === 'pass' ? 'PASS' : status === 'gap' ? 'GAP ' : 'FAIL';
  console.log(`${badge}  [${cap.tier}] ${cap.id}  ${cap.title}${detail ? `\n        → ${detail}` : ''}`);
}

async function main() {
  if (!JSON_OUT) {
    console.log(`\nCorner end-to-end — ${cfg.label}`);
    console.log(`  url      : ${cfg.url}`);
    console.log(`  mode     : ${CDP ? `attached to ${CDP}` : 'fresh browser'}`);
    console.log(`  checks   : ${selected.length}`);
    console.log(`  token    : ${token}\n`);
  }

  mkdirSync('tests/e2e/artifacts', { recursive: true });

  const driver = createWebDriver({ surface: SURFACE, cfg, cdp: CDP, headless: HEADLESS, onLog: log });
  const ctx = { token, surface: SURFACE, log };

  try {
    await driver.start();
  } catch (e) {
    console.error(`could not open ${cfg.url}: ${e.message}`);
    process.exit(1);
  }

  for (const cap of selected) {
    let status = 'fail';
    let detail = '';
    try {
      const r = await cap.run(driver, ctx);
      if (r === true) status = 'pass';
      else {
        detail = String(r);
        // "this surface does not have it" is a GAP (a work item), not a broken product.
        status = /not claimed|no .* on this surface|driver could not|driver cannot|unavailable/i.test(detail) ? 'gap' : 'fail';
      }
    } catch (e) {
      detail = e.message?.slice(0, 300) || String(e);
    }
    if (status !== 'pass') await driver.screenshot(cap.id.replace(/\./g, '-'));
    results.push({ id: cap.id, tier: cap.tier, title: cap.title, status, detail });
    line(cap, status, detail);
  }

  await driver.stop();

  // ------------------------------------------------------------------ scorecard
  const pass = results.filter((r) => r.status === 'pass');
  const fail = results.filter((r) => r.status === 'fail');
  const gap = results.filter((r) => r.status === 'gap');
  const scorecard = {
    surface: SURFACE, label: cfg.label, url: cfg.url,
    at: new Date().toISOString(), token,
    passed: pass.length, failed: fail.length, gaps: gap.length, total: results.length,
    results,
  };

  if (SAVE_BASELINE) {
    mkdirSync(dirname(SAVE_BASELINE), { recursive: true });
    writeFileSync(SAVE_BASELINE, JSON.stringify(scorecard, null, 2));
    if (!JSON_OUT) console.log(`\nbaseline written: ${SAVE_BASELINE}  (${pass.length} capabilities are now the bar)`);
  }

  // ------------------------------------------------------------------ verdict
  let exitCode = fail.length > 0 ? 1 : 0;

  if (!JSON_OUT) console.log(`\n${pass.length} pass / ${fail.length} fail / ${gap.length} gap  of ${results.length}`);

  if (BASELINE && existsSync(BASELINE)) {
    const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
    const barIds = new Set(base.results.filter((r) => r.status === 'pass').map((r) => r.id));
    const regressions = results.filter((r) => barIds.has(r.id) && r.status !== 'pass');
    const ahead = results.filter((r) => r.status === 'pass' && !barIds.has(r.id));

    scorecard.baseline = { file: BASELINE, surface: base.surface, bar: barIds.size, regressions: regressions.length };
    exitCode = regressions.length > 0 ? 1 : 0;

    if (!JSON_OUT) {
      console.log(`\n=== measured against ${base.label} (${barIds.size} capabilities in the bar) ===`);
      if (regressions.length === 0) {
        console.log(`MEETS THE BAR: ${cfg.label} does everything ${base.label} does.`);
      } else {
        console.log(`\nBEHIND THE BAR on ${regressions.length} of ${barIds.size} — this is the work list:`);
        for (const [i, r] of regressions.entries()) {
          console.log(`  ${i + 1}. [${r.tier}] ${r.id} — ${r.title}`);
          if (r.detail) console.log(`         ${r.detail}`);
        }
      }
      if (ahead.length) console.log(`\nAhead of the bar on ${ahead.length}: ${ahead.map((r) => r.id).join(', ')}`);
    }
  }

  if (JSON_OUT) console.log(JSON.stringify(scorecard, null, 2));
  else if (fail.length) {
    console.log(`\nFAILING (not explained by a missing feature):`);
    fail.forEach((f, i) => console.log(`  ${i + 1}. ${f.id} — ${f.detail}`));
  }

  process.exit(exitCode);
}

main().catch((e) => { console.error('runner crashed:', e); process.exit(1); });
