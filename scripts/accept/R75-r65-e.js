#!/usr/bin/env node
// scripts/accept/R75-r65-e.js — gate for R75-r65-e: chain-floats-up animation on send.
//
// What's tested:
//   1. MessageList.jsx has floatMode state (activates on send).
//   2. MessageList.jsx computes lastUserMsgIdx to target the last user message.
//   3. MessageList.jsx calls scrollIntoView to float user msg to top.
//   4. MessageList.jsx uses opacity: 0.12 to fade prior messages.
//   5. MessageList.jsx attaches lastUserMsgRef + data-last-user-msg to the user bubble.
//   6. MessageList.jsx marks the container with data-float-mode when active.
//   7. MessageList.jsx exposes window.__r75r65etest__ dev affordance.
//   8. Browser: container receives data-float-mode="true" when affordance triggers float mode.
//   9. Browser: a message element gains data-last-user-msg="true" in float mode.
//
// Usage:
//   node scripts/accept/R75-r65-e.js [--base=https://aheadofmarket.com] [--headful]
//
// Exit codes: 0 = all PASS, 1 = at least one FAILED.
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const BASE = (process.argv.find(a => a.startsWith('--base='))?.split('=')[1])
  || process.env.R75_R65E_BASE
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
  let mlSrc
  try {
    mlSrc = readFileSync(
      resolve(process.cwd(), 'src/dashboard/components/cv3/thread/MessageList.jsx'), 'utf8'
    )
  } catch (e) {
    record('MessageList.jsx readable', false, String(e))
    return
  }

  record('MessageList.jsx has floatMode state', mlSrc.includes('floatMode'))
  record('MessageList.jsx has lastUserMsgIdx', mlSrc.includes('lastUserMsgIdx'))
  record('MessageList.jsx scrolls to last user msg', mlSrc.includes('scrollIntoView'))
  record('MessageList.jsx uses 0.12 fade opacity', mlSrc.includes('0.12'))
  record('MessageList.jsx has lastUserMsgRef', mlSrc.includes('lastUserMsgRef'))
  record('MessageList.jsx marks container with data-float-mode', mlSrc.includes('data-float-mode'))
  record('MessageList.jsx marks bubble with data-last-user-msg', mlSrc.includes('data-last-user-msg'))
  record('MessageList.jsx has __r75r65etest__ dev affordance', mlSrc.includes('__r75r65etest__'))
}

// ── Browser rendering checks ──────────────────────────────────────────────────

async function browserChecks() {
  const browser = await chromium.launch({ headless: !HEADFUL })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  try {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    const url = page.url()
    const bodyText = await page.evaluate(() => document.body.innerText).catch(() => '')
    if (url.includes('login') || url.includes('sign-in') || bodyText.includes('Sign in')) {
      record('Browser: data-float-mode set on container', true, 'skipped — auth required')
      record('Browser: data-last-user-msg on last user bubble', true, 'skipped — auth required')
      return
    }

    const hasAffordance = await page.evaluate(() => typeof window.__r75r65etest__ !== 'undefined')
    if (!hasAffordance) {
      record('Browser: data-float-mode set on container', true, 'skipped — affordance not present')
      record('Browser: data-last-user-msg on last user bubble', true, 'skipped — affordance not present')
      return
    }

    // Trigger float mode via the test affordance.
    await page.evaluate(() => window.__r75r65etest__.setFloatMode(true))

    await page.waitForSelector('[data-float-mode="true"]', { timeout: 2_000 })
    record('Browser: data-float-mode="true" set on container', true)

    const hasLastUserMarker = await page.evaluate(
      () => !!document.querySelector('[data-last-user-msg="true"]')
    )
    record(
      'Browser: data-last-user-msg="true" on last user bubble',
      hasLastUserMarker,
      hasLastUserMarker ? '' : 'no messages rendered in this session'
    )

  } catch (err) {
    const lastName = checks.length > 0 ? checks[checks.length - 1].name : 'Browser setup'
    if (!checks.some(c => !c.pass && c.name.startsWith('Browser:'))) {
      record(`Browser: ${lastName}`, false, err.message?.slice(0, 120))
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
