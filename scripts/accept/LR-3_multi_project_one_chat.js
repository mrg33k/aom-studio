#!/usr/bin/env node
// scripts/accept/LR-3_multi_project_one_chat.js — Playwright gate for LR-3.
//
// LR-3: Multi-project + mission scaffolding from one conversation.
//
// Mission: corner:launch-readiness · LR-3
//
// Acceptance criteria (BUILD.md):
//   A user describes 3 distinct work areas in one conversation;
//   EA scaffolds 3 projects + at least one mission per project;
//   each project's room exists in the dashboard chat picker.
//
// Gate checks (4/4 required for PASS):
//   1. Batch scaffold API: ok=true, 3 results, all items ok.
//   2. Supabase: 3 project rows in projects table (client_id=TEST_WORLD).
//   3. Supabase: each project has ≥1 mission in events (agent='{slug}:*').
//   4. Dashboard: all 3 project cards visible in the chat sidebar.
//
// Test approach:
//   Creates a fresh test user (has_completed_onboarding=true, world=TEST_WORLD).
//   Logs in via browser — the session cookie lets /api/dashboard/ea-scaffold-batch
//   verify the tenant via verifyTenant (callerWorld === requestedTenant).
//   Calls ea-scaffold-batch directly from the authenticated browser context to
//   simulate the EA tool call with 3 items mirroring the BUILD.md scenario
//   ("bakery in Phoenix / B2B sales pipeline / documentary film shoot").
//   Verifies Supabase state and dashboard UI (project cards in sidebar).
//
// Usage:
//   node scripts/accept/LR-3_multi_project_one_chat.js [--base=URL] [--headful]
//
// Env (auto-loaded from .env.prod if present):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Exit codes: 0 = 4/4 PASS, 1 = at least one FAIL.

import { chromium } from 'playwright'
import { readFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

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
  || process.env.LR3_BASE || 'https://aheadofmarket.com'
const HEADFUL = process.argv.includes('--headful')
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const TS = Date.now()
const TEST_WORLD = `lr3test${TS}`
const TEST_EMAIL = `lr3test+${TS}@aheadofmarket.com`
const TEST_PWD = `LR3Test${TS}!`
const TEST_NAME = 'LR3 Test'
const WORKSPACE_NAME = 'LR3 Test Corp'
const SCREENSHOTS_DIR = `/tmp/lr3-accept-${TS}`

// Three distinct work areas from the BUILD.md scenario.
const BATCH_ITEMS = [
  {
    name: 'Phoenix Bakery',
    description: 'Local artisan bakery in Phoenix — product development, events, and catering.',
    mission: {
      name: 'First brief',
      description: 'Vision interview for Phoenix Bakery.',
    },
  },
  {
    name: 'B2B Sales Pipeline',
    description: 'Outreach pipeline for B2B sales — lead gen, email sequences, and CRM.',
    mission: {
      name: 'First brief',
      description: 'Vision interview for B2B Sales Pipeline.',
    },
  },
  {
    name: 'Documentary Film Shoot',
    description: 'Organize a feature documentary — pre-production, shoot logistics, and post.',
    mission: {
      name: 'First brief',
      description: 'Vision interview for Documentary Film Shoot.',
    },
  },
]

// Expected slugs (mirrors ea-scaffold-batch slugify logic).
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

const EXPECTED_SLUGS = BATCH_ITEMS.map(i => slugify(i.name))

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
        workspace_name: WORKSPACE_NAME,
        has_completed_onboarding: true,
        onboarded: true,
      },
    }),
  })
  if (!res.ok) throw new Error(`createUser ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function deleteTestUser() {
  if (!testUserId || !SVC_KEY) return
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${testUserId}`, {
    method: 'DELETE',
    headers: sbHeaders(),
  }).catch(() => {})
}

async function deleteTestProjects() {
  for (const slug of EXPECTED_SLUGS) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(TEST_WORLD)}`,
      { method: 'DELETE', headers: sbHeaders() }
    ).catch(() => {})
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== LR-3 gate: 3 projects + missions from one conversation (Playwright) ===')
  console.log(`Base:        ${BASE}`)
  console.log(`Test email:  ${TEST_EMAIL}`)
  console.log(`Test world:  ${TEST_WORLD}`)
  console.log(`Items:       ${BATCH_ITEMS.map(i => i.name).join(', ')}\n`)

  if (!SVC_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not set — cannot run live gate')
    process.exit(2)
  }

  mkdirSync(SCREENSHOTS_DIR, { recursive: true })

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
  console.log('--- Browser: signing in and calling ea-scaffold-batch ---')

  const browser = await chromium.launch({ headless: !HEADFUL })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[browser error] ${msg.text().slice(0, 200)}`)
  })

  let apiResult = null
  let projectCardsFound = []

  try {
    // Sign in
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PWD)
    await page.click('button[type="submit"]')

    // Wait for post-login redirect (onboarding complete → dashboard)
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 })
    console.log(`Post-login URL: ${page.url()}`)

    // If AuthGuard sent us to onboarding despite onboarded=true, navigate to dashboard
    if (page.url().includes('onboarding')) {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    }
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-dashboard.png`, fullPage: true })
    console.log('Signed in, on dashboard')

    // From the authenticated browser context, call ea-scaffold-batch directly.
    // The session cookie is sent automatically; verifyTenant reads it and matches
    // TEST_WORLD === user.user_metadata.world → tenant verified.
    console.log('Calling ea-scaffold-batch with 3 items...')
    apiResult = await page.evaluate(async ({ items, world }) => {
      try {
        const res = await fetch('/api/dashboard/ea-scaffold-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenant: world, items }),
        })
        const text = await res.text()
        try { return { ok: res.ok, status: res.status, body: JSON.parse(text) } }
        catch { return { ok: res.ok, status: res.status, body: text } }
      } catch (err) {
        return { ok: false, error: String(err) }
      }
    }, { items: BATCH_ITEMS, world: TEST_WORLD })

    console.log(`API response: status=${apiResult.status}, ok=${apiResult.ok}`)
    if (apiResult.body?.results) {
      for (const r of apiResult.body.results) {
        console.log(`  ${r.ok ? '✓' : '✗'} ${r.name} (slug=${r.slug}, mission=${r.mission_slug})`)
      }
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-post-scaffold.png`, fullPage: true })

    // Reload dashboard to pick up new project rooms
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    // Give the UI 4 seconds to load project list from Supabase
    await page.waitForTimeout(4000)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-dashboard-reload.png`, fullPage: true })

    // Verify project cards appear in the sidebar
    for (const slug of EXPECTED_SLUGS) {
      const card = page.locator(`[data-testid="project-card-${slug}"]`)
      const visible = await card.isVisible({ timeout: 8000 }).catch(() => false)
      projectCardsFound.push({ slug, visible })
      console.log(`  Project card "${slug}" visible: ${visible}`)
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-project-cards.png`, fullPage: true })

  } catch (err) {
    console.error('Browser test error:', err.message?.slice(0, 200))
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/error.png`, fullPage: true }).catch(() => {})
  } finally {
    await browser.close()
  }

  // ── Check 1: API returned ok=true, 3 results, all items ok ────────────────
  const resultsArr = apiResult?.body?.results || []
  const apiOk = apiResult?.ok === true
    && apiResult?.body?.ok === true
    && resultsArr.length === BATCH_ITEMS.length
    && resultsArr.every(r => r.ok)
  record(
    'API: ea-scaffold-batch returns ok=true, 3 items all successful',
    apiOk,
    apiOk
      ? `3/3 ok (slugs: ${resultsArr.map(r => r.slug).join(', ')})`
      : `status=${apiResult?.status}, ok=${apiResult?.body?.ok}, results=${JSON.stringify(resultsArr.map(r => ({ slug: r.slug, ok: r.ok, err: r.error })))}`
  )

  // ── Supabase verification ──────────────────────────────────────────────────
  console.log('\n--- Supabase state verification ---')
  await new Promise(r => setTimeout(r, 2000))

  // ── Check 2: 3 project rows in projects table ─────────────────────────────
  let foundProjects = []
  try {
    const rows = await sbGet(
      `projects?client_id=eq.${encodeURIComponent(TEST_WORLD)}&is_active=eq.true&select=id,slug,name&order=created_at.desc&limit=20`
    )
    foundProjects = rows.filter(r => EXPECTED_SLUGS.includes(r.slug))
    const allFound = EXPECTED_SLUGS.every(slug => foundProjects.some(r => r.slug === slug))
    record(
      'Supabase: 3 project rows created (client_id=test_world, named appropriately)',
      allFound,
      allFound
        ? `found: ${foundProjects.map(r => `"${r.name}" (${r.slug})`).join(', ')}`
        : `missing slugs: ${EXPECTED_SLUGS.filter(s => !foundProjects.some(r => r.slug === s)).join(', ')}`
    )
  } catch (e) {
    record('Supabase: 3 project rows created', false, e.message?.slice(0, 80))
  }

  // ── Check 3: each project has ≥1 mission in events ───────────────────────
  try {
    const missionResults = []
    for (const slug of EXPECTED_SLUGS) {
      const events = await sbGet(
        `events?event_type=eq.scaffold_file&agent=like.${encodeURIComponent(slug + ':')}*&select=agent,payload&limit=10`
      )
      const missionAgents = [...new Set(events.map(e => e.agent).filter(Boolean))]
      missionResults.push({ slug, missionCount: missionAgents.length, agents: missionAgents })
    }
    const allHaveMissions = missionResults.every(r => r.missionCount > 0)
    record(
      'Supabase: each project has ≥1 mission scaffolded in events (agent=slug:*)',
      allHaveMissions,
      allHaveMissions
        ? missionResults.map(r => `${r.slug}: ${r.agents.join(', ')}`).join(' | ')
        : `missing missions: ${missionResults.filter(r => r.missionCount === 0).map(r => r.slug).join(', ')}`
    )
  } catch (e) {
    record('Supabase: missions in events', false, e.message?.slice(0, 80))
  }

  // ── Check 4: dashboard shows all 3 project cards ─────────────────────────
  const allCardsVisible = EXPECTED_SLUGS.every(slug => {
    const found = projectCardsFound.find(c => c.slug === slug)
    return found?.visible === true
  })
  record(
    'Dashboard: all 3 project rooms visible in chat sidebar',
    allCardsVisible,
    allCardsVisible
      ? `all 3 cards visible (${EXPECTED_SLUGS.join(', ')})`
      : `missing: ${projectCardsFound.filter(c => !c.visible).map(c => c.slug).join(', ')}`
  )

  // ── Cleanup ────────────────────────────────────────────────────────────────
  console.log('\n--- Cleanup ---')
  await deleteTestProjects()
  await deleteTestUser()
  console.log(`Deleted test user ${testUserId} and test projects`)

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
  console.error('LR-3 gate error:', err)
  deleteTestUser().catch(() => {})
  process.exit(1)
})
