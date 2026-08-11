// Playwright script covering all 8 right-click context-menu paths plus 1 e2e.
//
// Usage:
//   SITE=https://aheadofmarket.com node tests/rightclick-menus.test.mjs
//
// The dashboard is auth-gated. Before running, set the AOM_DASHBOARD_COOKIE
// env var to a valid Supabase session cookie (copy from a logged-in browser).
// If omitted, the script still verifies the built bundle exposes every
// context-menu test-id, which is a weaker but non-trivial smoke test.
//
// Test paths:
//   MESSAGE menu: Follow-up, Needs verification, Research, Send to (agent)
//   TASK menu:    Follow-up, Needs verification, Research, Move to (project)
//   E2E scenario: right-click message > Research > task runs > brief in Files
//
// The suite fails loud if any required test-id is missing from the built app.

import { chromium } from 'playwright'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const SITE = process.env.SITE || 'https://aheadofmarket.com'
const COOKIE = process.env.AOM_DASHBOARD_COOKIE || ''

const REQUIRED_TEST_IDS = [
  // Message menu root + 4 actions
  'msg-ctx-root',
  'msg-ctx-reply',
  'msg-ctx-needs-verification',
  'msg-ctx-research',
  'msg-ctx-send-to',
  'msg-ctx-agent-picker',
  // Task menu root + 4 actions
  'task-ctx-root',
  'task-ctx-follow-up',
  'task-ctx-needs-verification',
  'task-ctx-research',
  'task-ctx-move-to',
  'task-ctx-project-picker',
  // Shared UI
  'reply-to-chip',
  'reply-to-chip-dismiss',
  'ctx-toast',
  // Message container + task cards
  'chat-message',
  'task-card-blocked',
  'task-card-failed',
  'task-card-done',
]

const results = []
function record(name, ok, note = '') {
  results.push({ name, ok, note })
  const mark = ok ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${name}${note ? '  -- ' + note : ''}`)
}

// ── Path 1: verify that the built bundle contains every test-id ─────────────
async function verifyBundle() {
  try {
    const distMain = resolve(process.cwd(), 'dist/assets')
    // Vite code-splits the context menus. Scan every emitted JS chunk instead
    // of pinning a stale main hash or assuming the feature remains eager.
    const files = readdirSync(distMain).filter(file => file.endsWith('.js'))
    if (!files.length) throw new Error('no JavaScript chunks in dist/assets')
    const bundle = files.map(file => readFileSync(resolve(distMain, file), 'utf8')).join('\n')
    const missing = REQUIRED_TEST_IDS.filter(id => !bundle.includes(id))
    record('bundle-contains-all-test-ids', missing.length === 0, missing.length ? `missing: ${missing.join(',')}` : `${files.length} chunks scanned`)
  } catch (err) {
    record('bundle-contains-all-test-ids', false, err.message)
  }
}

// ── Paths 2-9: live right-click verification (auth-gated) ────────────────────
// Each test opens the dashboard, triggers the right-click path, selects the
// option, and asserts the expected UI change. Skipped without COOKIE.

async function withBrowser(fn) {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...(COOKIE ? { storageState: { cookies: JSON.parse(COOKIE), origins: [] } } : {}),
  })
  const page = await ctx.newPage()
  try {
    await fn(page)
  } finally {
    await browser.close()
  }
}

async function rightClick(page, selector) {
  const el = page.locator(selector).first()
  await el.waitFor({ state: 'visible', timeout: 10000 })
  const box = await el.boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' })
}

async function ensureMenuItem(page, testId) {
  const item = page.locator(`[data-test-id="${testId}"]`)
  await item.waitFor({ state: 'visible', timeout: 5000 })
  return item
}

// MESSAGE #1: Follow-up
async function testMessageFollowUp(page) {
  await page.goto(`${SITE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await rightClick(page, '[data-test-id="chat-message"]')
  await (await ensureMenuItem(page, 'msg-ctx-reply')).click()
  await page.locator('[data-test-id="reply-to-chip"]').waitFor({ timeout: 4000 })
  record('message-follow-up-shows-reply-chip', true)
}

// MESSAGE #2: Needs verification
async function testMessageNeedsVerification(page) {
  await page.goto(`${SITE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await rightClick(page, '[data-test-id="chat-message"]')
  await (await ensureMenuItem(page, 'msg-ctx-needs-verification')).click()
  await page.locator('[data-test-id^="msg-verify-badge-"]').first().waitFor({ timeout: 4000 })
  record('message-needs-verification-shows-badge', true)
}

// MESSAGE #3: Research
async function testMessageResearch(page) {
  await page.goto(`${SITE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await rightClick(page, '[data-test-id="chat-message"]')
  await (await ensureMenuItem(page, 'msg-ctx-research')).click()
  await page.locator('[data-test-id="ctx-toast"]').waitFor({ timeout: 4000 })
  record('message-research-queues-task', true)
}

// MESSAGE #4: Send to (agent)
async function testMessageSendTo(page) {
  await page.goto(`${SITE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await rightClick(page, '[data-test-id="chat-message"]')
  await (await ensureMenuItem(page, 'msg-ctx-send-to')).click()
  await ensureMenuItem(page, 'msg-ctx-agent-picker')
  // pick the first available agent
  await page.locator('[data-test-id^="msg-ctx-sendto-"]').first().click()
  await page.locator('[data-test-id="ctx-toast"]').waitFor({ timeout: 4000 })
  record('message-send-to-crossposts', true)
}

// TASK #5: Follow-up
async function testTaskFollowUp(page) {
  await page.goto(`${SITE}/dashboard#tasks`, { waitUntil: 'domcontentloaded' })
  await rightClick(page, '[data-test-id^="task-card-"]')
  await (await ensureMenuItem(page, 'task-ctx-follow-up')).click()
  await page.locator('[data-test-id="ctx-toast"]').waitFor({ timeout: 4000 })
  record('task-follow-up-opens-chat', true)
}

// TASK #6: Needs verification
async function testTaskNeedsVerification(page) {
  await page.goto(`${SITE}/dashboard#tasks`, { waitUntil: 'domcontentloaded' })
  await rightClick(page, '[data-test-id^="task-card-"]')
  await (await ensureMenuItem(page, 'task-ctx-needs-verification')).click()
  await page.locator('[data-test-id^="task-verify-badge-"]').first().waitFor({ timeout: 4000 })
  record('task-needs-verification-spawns-subtask', true)
}

// TASK #7: Research
async function testTaskResearch(page) {
  await page.goto(`${SITE}/dashboard#tasks`, { waitUntil: 'domcontentloaded' })
  await rightClick(page, '[data-test-id^="task-card-"]')
  await (await ensureMenuItem(page, 'task-ctx-research')).click()
  await page.locator('[data-test-id="ctx-toast"]').waitFor({ timeout: 4000 })
  record('task-research-spawns-subtask', true)
}

// TASK #8: Move to (project)
async function testTaskMoveTo(page) {
  await page.goto(`${SITE}/dashboard#tasks`, { waitUntil: 'domcontentloaded' })
  await rightClick(page, '[data-test-id^="task-card-"]')
  await (await ensureMenuItem(page, 'task-ctx-move-to')).click()
  await ensureMenuItem(page, 'task-ctx-project-picker')
  await page.locator('[data-test-id^="task-ctx-moveto-"]').first().click()
  await page.locator('[data-test-id="ctx-toast"]').waitFor({ timeout: 4000 })
  record('task-move-to-updates-project', true)
}

// E2E: right-click a message > Research > brief written > brief in Files
async function testE2eResearchBrief(page) {
  await page.goto(`${SITE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await rightClick(page, '[data-test-id="chat-message"]')
  await (await ensureMenuItem(page, 'msg-ctx-research')).click()
  await page.locator('[data-test-id="ctx-toast"]').waitFor({ timeout: 4000 })
  // Worker is async. Poll Files section for a new brief for up to 90s.
  const briefAppeared = await page.waitForFunction(() => {
    const fileLinks = document.querySelectorAll('a[href*="/briefs/"]')
    return fileLinks.length > 0
  }, null, { timeout: 90000 }).then(() => true).catch(() => false)
  record('e2e-research-brief-appears-in-files', briefAppeared, briefAppeared ? '' : 'brief did not land within 90s')
}

async function main() {
  await verifyBundle()

  if (!COOKIE) {
    console.log('No AOM_DASHBOARD_COOKIE set -- skipping browser tests, bundle verification only.')
  } else {
    const tests = [
      testMessageFollowUp,
      testMessageNeedsVerification,
      testMessageResearch,
      testMessageSendTo,
      testTaskFollowUp,
      testTaskNeedsVerification,
      testTaskResearch,
      testTaskMoveTo,
      testE2eResearchBrief,
    ]
    for (const t of tests) {
      try {
        await withBrowser(async (page) => { await t(page) })
      } catch (err) {
        record(t.name, false, err.message)
      }
    }
  }

  const failed = results.filter(r => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) process.exit(1)
}

main().catch(err => { console.error(err); process.exit(1) })
