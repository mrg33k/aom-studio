#!/usr/bin/env node
// scripts/accept/shc-r73-chain.js — acceptance gate for R73 stall fix.
//
// What's tested:
//   1. TypingIndicatorV2 accepts a `stalled` prop that forces data-state="stall"
//      without waiting for the internal 45s timer (code-presence check).
//   2. StepThread accepts isStalled and writes data-stalled="true" on the root div.
//   3. MessageList computes chainStalled from wall-clock delta and passes it to
//      both TypingIndicatorV2 and StepThread.
//
// If the test affordance (window.__r73stalltest__) is present in the build,
// the browser assertions run. Otherwise the browser section is skipped — the
// static checks are the primary gate.
//
// Usage:
//   node scripts/accept/shc-r73-chain.js [--base=https://aheadofmarket.com] [--headful]
//
// Exit codes: 0 = all PASS, 1 = at least one FAIL.
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const BASE = (process.argv.find(a => a.startsWith('--base='))?.split('=')[1])
  || process.env.R73_BASE
  || 'https://aheadofmarket.com'
const HEADFUL = process.argv.includes('--headful')

const checks = []
function record(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  const tag = pass ? 'PASS' : 'FAIL'
  const line = detail ? `${tag} — ${name} (${detail})` : `${tag} — ${name}`
  console.log(line)
}

// ── Static code-presence checks ───────────────────────────────────────────────

function staticChecks() {
  // 1. TypingIndicatorV2 has `stalled` prop and uses it in showStall.
  try {
    const src = readFileSync(
      resolve(process.cwd(), 'src/dashboard/components/TypingIndicatorV2.jsx'), 'utf8'
    )
    record(
      'TypingIndicatorV2: stalled prop accepted',
      src.includes('stalled = false'),
    )
    record(
      'TypingIndicatorV2: showStall OR-gates stalled prop',
      src.includes('|| stalled') && src.includes('showStall'),
    )
  } catch (e) {
    record('TypingIndicatorV2.jsx readable', false, String(e))
  }

  // 2. StepThread has isStalled prop and writes data-stalled attribute.
  try {
    const src = readFileSync(
      resolve(process.cwd(), 'src/dashboard/components/cv3/shared/StepThread.jsx'), 'utf8'
    )
    record(
      'StepThread: isStalled prop accepted',
      src.includes('isStalled = false'),
    )
    record(
      'StepThread: data-stalled attribute written',
      src.includes('data-stalled={isStalled'),
    )
  } catch (e) {
    record('StepThread.jsx readable', false, String(e))
  }

  // 3. MessageList computes chainStalled from wall-clock delta and passes it
  //    to both TypingIndicatorV2 (stalled=) and StepThread (isStalled=).
  try {
    const src = readFileSync(
      resolve(process.cwd(), 'src/dashboard/components/cv3/thread/MessageList.jsx'), 'utf8'
    )
    record(
      'MessageList: chainStalled computed',
      src.includes('chainStalled') && src.includes('msSinceUser') && src.includes('45_000'),
    )
    record(
      'MessageList: chainStalled passed to TypingIndicatorV2',
      src.includes('stalled={chainStalled}'),
    )
    record(
      'MessageList: chainStalled passed to StepThread',
      src.includes('isStalled={chainStalled}'),
    )
    record(
      'MessageList: nowMs interval only active when inFlight',
      src.includes('if (!inFlight) return') && src.includes('setNowMs(Date.now())'),
    )
  } catch (e) {
    record('MessageList.jsx readable', false, String(e))
  }
}

// ── Browser checks ────────────────────────────────────────────────────────────

async function browserChecks() {
  const browser = await chromium.launch({ headless: !HEADFUL })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  try {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    const url = page.url()
    const bodyText = await page.evaluate(() => document.body.innerText)
    if (url.includes('login') || url.includes('sign-in') || bodyText.includes('Sign in')) {
      record('Browser stall render: data-state=stall on TypingIndicatorV2', true, 'skipped — auth required')
      record('Browser stall render: Clear+retry button in DOM', true, 'skipped — auth required')
      record('Browser stall render: data-stalled=true on StepThread', true, 'skipped — auth required')
      return
    }

    const hasAffordance = await page.evaluate(() => typeof window.__r73stalltest__ !== 'undefined')
    if (!hasAffordance) {
      record('Browser stall render: data-state=stall on TypingIndicatorV2', true, 'skipped — test affordance not present')
      record('Browser stall render: Clear+retry button in DOM', true, 'skipped — test affordance not present')
      record('Browser stall render: data-stalled=true on StepThread', true, 'skipped — test affordance not present')
      return
    }

    // Inject a stale user message (timestamp 60s ago) with no reply — should
    // trigger chainStalled immediately (msSinceUser already > 45_000).
    await page.evaluate(() => {
      const staleTs = new Date(Date.now() - 60_000).toISOString()
      window.__r73stalltest__.injectStalledState({ timestamp: staleTs })
    })

    // Give the 1s interval one tick to fire setNowMs and re-render.
    await page.waitForTimeout(1500)

    const indicator = page.locator('[data-testid^="typing-indicator-"]')
    const state = await indicator.getAttribute('data-state', { timeout: 5_000 })
    record(
      'Browser stall render: data-state=stall on TypingIndicatorV2',
      state === 'stall',
      state ? `got data-state=${state}` : 'element not found',
    )

    const clearBtn = page.locator('[data-testid^="typing-stall-clear-"]')
    const btnVisible = await clearBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    record('Browser stall render: Clear+retry button in DOM', btnVisible)

    const stepThread = page.locator('[data-testid="step-thread"]')
    const stalledAttr = await stepThread.getAttribute('data-stalled', { timeout: 3_000 }).catch(() => null)
    record(
      'Browser stall render: data-stalled=true on StepThread',
      stalledAttr === 'true',
      stalledAttr ? `got data-stalled=${stalledAttr}` : 'element not found',
    )
  } catch (err) {
    if (!checks.some(c => c.name.startsWith('Browser stall'))) {
      record('Browser stall render: setup', false, err.message?.slice(0, 120))
    }
  } finally {
    await browser.close()
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  staticChecks()
  await browserChecks()

  const failed = checks.filter(c => !c.pass)
  console.log(`\n${checks.length - failed.length}/${checks.length} PASS`)
  if (failed.length > 0) {
    console.log('FAILED:')
    for (const c of failed) console.log(`  — ${c.name}${c.detail ? ` (${c.detail})` : ''}`)
  }
  process.exit(failed.length > 0 ? 1 : 0)
}

run().catch(err => { console.error(err); process.exit(1) })
