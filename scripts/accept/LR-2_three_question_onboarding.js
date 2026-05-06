#!/usr/bin/env node
// scripts/accept/LR-2_three_question_onboarding.js — Playwright gate for LR-2.
//
// Dynamic acceptance gate: creates a fresh test user via Supabase admin API,
// walks the three-question onboarding flow in text mode, captures screenshots,
// and verifies Supabase state post-flow.
//
// Complements the static code-presence gate: LR-2_onboarding_scaffold.py
//
// Five acceptance checks (maps to LR-2 BUILD.md acceptance criteria):
//   1. All 3 questions render in fixed order (Q1 workspace → Q2 work areas → Q3 first project).
//   2. EA narrates conversationally at Q1_CONFIRMED and Q2_CONFIRMED.
//   3. SCAFFOLDING phase renders "Building your Corner..." with a step thread.
//   4. Supabase: workspace_name set, work_areas set, has_completed_onboarding=true.
//   5. Supabase: project row inserted + events table has VISION.md + CONTEXT.md stubs.
//
// Usage:
//   node scripts/accept/LR-2_three_question_onboarding.js [--base=URL] [--headful]
//
// Env (auto-loaded from .env.prod if present):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Exit codes: 0 = 5/5 PASS, 1 = at least one FAIL.

import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

// Load .env.prod if needed
;(function loadEnv() {
  try {
    const lines = readFileSync(resolve(ROOT, '.env.prod'), 'utf8').split('\n')
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n]*)"?/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/\\n$/, '').trim()
    }
  } catch {}
})()

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1]
  || process.env.LR2_BASE || 'https://aheadofmarket.com'
const HEADFUL = process.argv.includes('--headful')
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Test constants
const TS = Date.now()
const TEST_WORLD = `lr2test${TS}`
const TEST_EMAIL = `lr2test+${TS}@aheadofmarket.com`
const TEST_PWD = `LR2Test${TS}!`
const TEST_NAME = 'LR2 Test'
const WORKSPACE_ANSWER = 'LR2 Test Corp'
const WORK_AREAS_ANSWER = 'video editing and brand design'
// Timestamp suffix ensures globally-unique slug each run.
// NOTE: projects_slug_key is a global unique constraint (not per-world) — a separate
// bug that should be fixed (slugs should be unique per client_id, not across tenants).
const FIRST_PROJECT_ANSWER = `LR2 Test Project ${TS}`
const SCREENSHOTS_DIR = `/tmp/lr2-accept-${TS}`

let testUserId = null
const checks = []

function record(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  const tag = pass ? 'PASS' : 'FAIL'
  console.log(detail ? `${tag} — ${name} (${detail})` : `${tag} — ${name}`)
}

function sbHeaders() {
  return {
    apikey: SVC_KEY,
    Authorization: `Bearer ${SVC_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders() })
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function createTestUser() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PWD,
      email_confirm: true,
      user_metadata: {
        world: TEST_WORLD,
        display_name: TEST_NAME,
        workspace_name: TEST_NAME,
        has_completed_onboarding: false,
        onboarded: false,
        // No temp_password flag — avoids /change-password redirect in AuthGuard
      },
    }),
  })
  if (!res.ok) throw new Error(`createUser ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function getTestUserMeta() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${testUserId}`, {
    headers: sbHeaders(),
  })
  if (!res.ok) throw new Error(`getUser ${res.status}: ${(await res.text()).slice(0, 80)}`)
  return (await res.json()).user_metadata || {}
}

async function deleteTestUser() {
  if (!testUserId || !SVC_KEY) return
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${testUserId}`, {
    method: 'DELETE',
    headers: sbHeaders(),
  }).catch(() => {})
}

// Answer a question in text mode (handles both auto-visible input and voice fallback)
async function answerQuestion(page, answer, screenshotName) {
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/${screenshotName}`, fullPage: true })
  // "Type instead" button appears when voice IS available; if voice isn't available
  // the text input renders automatically. Handle both.
  const typeInstead = page.locator('button:has-text("Type instead")')
  const isTypeVisible = await typeInstead.isVisible({ timeout: 2000 }).catch(() => false)
  if (isTypeVisible) await typeInstead.click()
  const input = page.locator('input[placeholder="Type your answer..."]')
  await input.waitFor({ state: 'visible', timeout: 5000 })
  await input.fill(answer)
  await page.keyboard.press('Enter')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== LR-2 gate: three-question onboarding (Playwright) ===')
  console.log(`Base:       ${BASE}`)
  console.log(`Test email: ${TEST_EMAIL}`)
  console.log(`Test world: ${TEST_WORLD}\n`)

  if (!SVC_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not set — cannot run live gate')
    process.exit(2)
  }

  mkdirSync(SCREENSHOTS_DIR, { recursive: true })

  // Setup: create test user (no temp_password so AuthGuard doesn't redirect to /change-password)
  console.log('--- Setup: creating test user ---')
  try {
    const user = await createTestUser()
    testUserId = user.id
    console.log(`User created: id=${testUserId}\n`)
  } catch (e) {
    console.error('Failed to create test user:', e.message)
    process.exit(2)
  }

  // ── Browser flow ──────────────────────────────────────────────────────────
  console.log('--- Browser: walking three-question flow ---')

  const browser = await chromium.launch({ headless: !HEADFUL })
  // Context-level initScript: sets corner-qa-active before any page JS
  // so AuthGuard forces /onboarding/voice and OnboardingVoice skips redirect-away
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => {
    sessionStorage.setItem('corner-qa-active', 'true')
  })
  const page = await ctx.newPage()

  // Log browser errors (silent best-effort writes would otherwise be invisible)
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[browser error] ${msg.text().slice(0, 200)}`)
  })

  let q1Ok = false
  let q2Ok = false
  let q3Ok = false
  let q1NarOk = false
  let q2NarOk = false
  let scaffoldingOk = false
  let flowComplete = false

  try {
    // Sign in via login form
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PWD)
    await page.click('button[type="submit"]')

    // AuthGuard sees corner-qa-active=true → redirects to /onboarding/voice
    await page.waitForURL('**/onboarding/voice', { timeout: 25_000 })
    console.log(`Landed: ${page.url()}`)

    // INTRO phase — "Let's set up your command center."
    await page.waitForSelector('text=Let\'s set up your command center', { timeout: 10_000 })
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-intro.png`, fullPage: true })
    console.log('INTRO rendered')

    // Start onboarding
    await page.click('text=Get started')

    // Q1 — workspace name
    await page.waitForSelector('text=What\'s your workspace called?', { timeout: 10_000 })
    q1Ok = true
    console.log('Q1 rendered: "What\'s your workspace called?"')
    await answerQuestion(page, WORKSPACE_ANSWER, '02-q1-listening.png')

    // Q1_CONFIRMED narration
    await page.waitForSelector('text=Setting up', { timeout: 8_000 })
    const q1BodyText = await page.textContent('body')
    q1NarOk = q1BodyText.includes('home base')
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-q1-confirmed.png`, fullPage: true })
    console.log(`Q1 confirmed, narration "home base" visible: ${q1NarOk}`)

    // Q2 — work areas
    await page.waitForSelector('text=What kinds of work do you do?', { timeout: 10_000 })
    q2Ok = true
    console.log('Q2 rendered: "What kinds of work do you do?"')
    await answerQuestion(page, WORK_AREAS_ANSWER, '04-q2-listening.png')

    // Q2_CONFIRMED narration
    await page.waitForSelector('text=tools to your toolkit', { timeout: 8_000 })
    const q2BodyText = await page.textContent('body')
    q2NarOk = q2BodyText.includes('tools to your toolkit')
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-q2-confirmed.png`, fullPage: true })
    console.log(`Q2 confirmed, narration "tools to your toolkit" visible: ${q2NarOk}`)

    // Q3 — first project
    await page.waitForSelector('text=What\'s the first thing you want help with?', { timeout: 10_000 })
    q3Ok = true
    console.log('Q3 rendered: "What\'s the first thing you want help with?"')
    await answerQuestion(page, FIRST_PROJECT_ANSWER, '06-q3-listening.png')

    // Q3_CONFIRMED
    await page.waitForSelector('text=Scaffolding', { timeout: 10_000 })
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-q3-confirmed.png`, fullPage: true })
    console.log('Q3 confirmed, "Scaffolding..." narration visible')

    // SCAFFOLDING phase: "Building your Corner..." + step thread
    await page.waitForSelector('text=Building your Corner', { timeout: 12_000 })
    await page.waitForSelector('text=Creating your workspace', { timeout: 10_000 })
    const scaffoldBody = await page.textContent('body')
    scaffoldingOk = scaffoldBody.includes('Building your Corner')
      && scaffoldBody.includes('Creating your workspace')
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-scaffolding.png`, fullPage: true })
    console.log(`SCAFFOLDING step thread visible: ${scaffoldingOk}`)

    // DONE redirect to /dashboard (SCAFFOLDING total ~11s from Q3 answer)
    await page.waitForURL('**/dashboard', { timeout: 25_000 })
    // Allow best-effort background writes to settle before closing the browser:
    // markOnboardingComplete() (updateUser) and scaffold-project fetch are fire-and-forget.
    // Without this pause, the browser closes mid-flight and the writes are lost.
    await page.waitForTimeout(6000)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-done-dashboard.png`, fullPage: true })
    console.log('DONE — redirected to /dashboard')
    flowComplete = true

  } catch (err) {
    console.error('Browser test error:', err.message?.slice(0, 200))
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/error.png`, fullPage: true }).catch(() => {})
  } finally {
    await browser.close()
  }

  // ── Check 1: three questions in order ─────────────────────────────────────
  record(
    'UI: all 3 questions render in fixed order (Q1 workspace → Q2 work areas → Q3 first project)',
    q1Ok && q2Ok && q3Ok,
    q1Ok && q2Ok && q3Ok ? 'all 3 rendered' : `Q1=${q1Ok} Q2=${q2Ok} Q3=${q3Ok}`
  )

  // ── Check 2: narration ─────────────────────────────────────────────────────
  record(
    'UI: EA narrates conversationally at Q1_CONFIRMED ("home base") and Q2_CONFIRMED ("tools to your toolkit")',
    q1NarOk && q2NarOk,
    q1NarOk && q2NarOk ? 'both narration lines visible' : `Q1nar=${q1NarOk} Q2nar=${q2NarOk}`
  )

  // ── Check 3: scaffolding step thread ─────────────────────────────────────
  record(
    'UI: SCAFFOLDING renders "Building your Corner..." with step thread ("Creating your workspace...")',
    scaffoldingOk,
    scaffoldingOk ? 'step thread visible' : flowComplete ? 'scaffolding check failed' : 'browser flow incomplete'
  )

  // ── Supabase state verification ────────────────────────────────────────────
  console.log('\n--- Supabase state verification ---')
  // Allow async writes to settle
  await new Promise(r => setTimeout(r, 3000))

  // ── Check 4: user metadata ─────────────────────────────────────────────────
  try {
    const meta = await getTestUserMeta()
    const workspaceOk = meta.workspace_name === WORKSPACE_ANSWER
    const workAreasOk = Array.isArray(meta.work_areas) && meta.work_areas.length > 0
    const onboardedOk = meta.has_completed_onboarding === true
    record(
      'Supabase: workspace_name set, work_areas (recipe flask seeds) set, has_completed_onboarding=true',
      workspaceOk && workAreasOk && onboardedOk,
      `workspace="${meta.workspace_name}", work_areas=[${(meta.work_areas || []).join(',')}], onboarded=${meta.has_completed_onboarding}`
    )
  } catch (e) {
    record('Supabase: user metadata check', false, e.message?.slice(0, 80))
  }

  // ── Check 5: project row + scaffold stubs ─────────────────────────────────
  try {
    const projectSlug = FIRST_PROJECT_ANSWER
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
    const rows = await sbGet(
      `projects?client_id=eq.${encodeURIComponent(TEST_WORLD)}&order=created_at.desc&limit=5`
    )
    const projectRow = rows.find(p => p.slug === projectSlug)

    if (!projectRow) {
      record(
        'Supabase: project row inserted + events table has VISION.md + CONTEXT.md stubs',
        false,
        `no project row for slug="${projectSlug}" world="${TEST_WORLD}" (${rows.length} rows in world)`
      )
    } else {
      const events = await sbGet(
        `events?event_type=eq.scaffold_file&agent=eq.${encodeURIComponent(projectSlug)}&select=payload&limit=10`
      )
      const filenames = events.map(e => e.payload?.filename).filter(Boolean)
      const hasVision = filenames.some(f => f === 'VISION.md')
      const hasContext = filenames.some(f => f === 'CONTEXT.md')
      record(
        'Supabase: project row inserted + events table has VISION.md + CONTEXT.md stubs',
        hasVision && hasContext,
        hasVision && hasContext
          ? `project slug="${projectSlug}", ${filenames.length} stubs: [${filenames.join(', ')}]`
          : `project found (slug=${projectSlug}) but stubs missing (found: [${filenames.join(', ') || 'none'}])`
      )
    }
  } catch (e) {
    record('Supabase: project row + scaffold stubs', false, e.message?.slice(0, 80))
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  console.log('\n--- Cleanup ---')
  await deleteTestUser()
  console.log(`Deleted test user ${testUserId}`)

  // ── Final report ──────────────────────────────────────────────────────────
  const passed = checks.filter(c => c.pass).length
  const total = checks.length
  console.log(`\n${passed}/${total} PASS`)
  if (passed < total) {
    console.log('FAILED:')
    checks.filter(c => !c.pass).forEach(c =>
      console.log(`  — ${c.name}${c.detail ? ` (${c.detail})` : ''}`)
    )
  }
  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`)
  process.exit(passed === total ? 0 : 1)
}

run().catch(err => {
  console.error('LR-2 gate error:', err)
  deleteTestUser().catch(() => {})
  process.exit(1)
})
