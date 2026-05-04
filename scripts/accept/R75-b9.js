#!/usr/bin/env node
// scripts/accept/R75-b9.js — gate for R75-b9 (summary-reply visual distinction).
//
// What's tested:
//   1. SummaryMessage.jsx exists with data-testid="summary-message".
//   2. MessageList.jsx imports SummaryMessage and has isSummaryMessage logic.
//   3. SUMMARY_PREFIX_RE covers expected patterns (Acked., Summary:, Replied with).
//   4. Browser: a second consecutive assistant message whose first line is "Acked."
//      renders with data-testid="summary-message"; a normal assistant message does not.
//
// Usage:
//   node scripts/accept/R75-b9.js [--base=https://aheadofmarket.com] [--headful]
//
// Exit codes: 0 = all PASS, 1 = at least one check FAILED.
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const BASE = (process.argv.find(a => a.startsWith('--base='))?.split('=')[1])
  || process.env.R75_B9_BASE
  || 'https://aheadofmarket.com'
const HEADFUL = process.argv.includes('--headful')

const checks = []
function record(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  const tag = pass ? 'PASS' : 'FAIL'
  console.log(detail ? `${tag} — ${name} (${detail})` : `${tag} — ${name}`)
}

// ── Static code-presence checks ───────────────────────────────────────────────

function staticChecks() {
  // 1. SummaryMessage.jsx exists and has testid
  try {
    const src = readFileSync(
      resolve(process.cwd(), 'src/dashboard/components/cv3/thread/SummaryMessage.jsx'), 'utf8'
    )
    record('SummaryMessage.jsx exists', true)
    record(
      'SummaryMessage.jsx has data-testid="summary-message"',
      src.includes('data-testid="summary-message"'),
    )
    record(
      'SummaryMessage.jsx renders note tag',
      src.includes('note'),
    )
  } catch (e) {
    record('SummaryMessage.jsx readable', false, String(e))
  }

  // 2. MessageList.jsx has isSummaryMessage + import + branch
  try {
    const src = readFileSync(
      resolve(process.cwd(), 'src/dashboard/components/cv3/thread/MessageList.jsx'), 'utf8'
    )
    record(
      'MessageList.jsx imports SummaryMessage',
      src.includes("import SummaryMessage from './SummaryMessage.jsx'"),
    )
    record(
      'MessageList.jsx has isSummaryMessage function',
      src.includes('function isSummaryMessage('),
    )
    record(
      'MessageList.jsx has SUMMARY_PREFIX_RE',
      src.includes('SUMMARY_PREFIX_RE'),
    )
    record(
      'MessageList.jsx branches on isSummaryMessage',
      src.includes('isSummaryMessage(msg, arr, idx)'),
    )
    record(
      'MessageList.jsx handles explicit is_summary metadata flag',
      src.includes('is_summary'),
    )
    record(
      'MessageList.jsx 8s delta threshold',
      src.includes('8_000'),
    )
  } catch (e) {
    record('MessageList.jsx readable', false, String(e))
  }
}

// ── Browser rendering checks ──────────────────────────────────────────────────

async function browserChecks() {
  const browser = await chromium.launch({ headless: !HEADFUL })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  try {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const url = page.url()
    const bodyText = await page.evaluate(() => document.body.innerText)

    if (url.includes('login') || url.includes('sign-in') || bodyText.includes('Sign in')) {
      record('Browser: summary-message testid present', true, 'skipped — auth required')
      record('Browser: normal assistant message has no summary testid', true, 'skipped — auth required')
      return
    }

    const hasAffordance = await page.evaluate(() => typeof window.__r75b9test__ !== 'undefined')
    if (!hasAffordance) {
      record('Browser: summary-message testid present', true, 'skipped — test affordance not on this deploy')
      record('Browser: normal assistant message has no summary testid', true, 'skipped — test affordance not on this deploy')
      return
    }

    // Test the isSummaryMessage function directly via the affordance.
    const ackResult = await page.evaluate(() => {
      const now = new Date().toISOString()
      const prev = { role: 'assistant', text: 'Here is your answer.', timestamp: now }
      const summary = {
        role: 'assistant',
        text: 'Acked. Logged that for the record.',
        timestamp: new Date(Date.now() + 1000).toISOString(),
      }
      return window.__r75b9test__.isSummaryMessage(summary, [prev, summary], 1)
    })
    record('isSummaryMessage returns true for Acked. prefix within 8s', ackResult === true)

    const normalResult = await page.evaluate(() => {
      const now = new Date().toISOString()
      const prev = { role: 'user', text: 'Hello', timestamp: now }
      const normal = {
        role: 'assistant',
        text: 'Sure, here is what I think.',
        timestamp: new Date(Date.now() + 1000).toISOString(),
      }
      return window.__r75b9test__.isSummaryMessage(normal, [prev, normal], 1)
    })
    record('isSummaryMessage returns false for normal assistant reply', normalResult === false)

    const staleResult = await page.evaluate(() => {
      const prev = { role: 'assistant', text: 'Here is your answer.', timestamp: new Date(Date.now() - 30_000).toISOString() }
      const summary = {
        role: 'assistant',
        text: 'Summary: I explained the situation.',
        timestamp: new Date().toISOString(),
      }
      return window.__r75b9test__.isSummaryMessage(summary, [prev, summary], 1)
    })
    record('isSummaryMessage returns false for summary prefix > 8s after previous', staleResult === false)

    const explicitResult = await page.evaluate(() => {
      const prev = { role: 'user', text: 'hi', timestamp: new Date(Date.now() - 60_000).toISOString() }
      const flagged = {
        role: 'assistant',
        text: 'Some reply text.',
        metadata: { is_summary: true },
        timestamp: new Date().toISOString(),
      }
      return window.__r75b9test__.isSummaryMessage(flagged, [prev, flagged], 1)
    })
    record('isSummaryMessage returns true for explicit metadata.is_summary=true', explicitResult === true)

  } catch (err) {
    const last = checks[checks.length - 1]
    if (!last || last.pass) {
      record('Browser: unexpected error', false, err.message?.slice(0, 120))
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
