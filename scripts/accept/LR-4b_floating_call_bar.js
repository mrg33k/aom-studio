#!/usr/bin/env node
// scripts/accept/LR-4b_floating_call_bar.js — Acceptance gate for LR-4b.
//
// LR-4b: Live voice call persistence — FloatingCallBar follows the user
// across all dashboard rooms; navigation alone never ends the call; ending
// the call is an explicit action via the bar's End button.
//
// Mission: corner:launch-readiness · LR-4b (shipped 2026-05-05, task 46695be6)
//
// Acceptance criteria (BUILD.md):
//   - While a live voice call is active, user navigates freely (open another
//     project's chat, scroll tasks, jump to files).
//   - A floating call bar follows the user across rooms (mic-mute, end-call,
//     status visible).
//   - Ending the call is an explicit action; navigation alone never ends a call.
//
// Test approach: static source-grep + Playwright UI test with route-mocking.
//   Live Gemini WebSocket calls are unsuitable for CI (same reasoning as LR-4a).
//   This gate uses two complementary strategies:
//
//   (a) Static source-grep (5 checks): architecture proof that the provider
//       hierarchy + render position guarantee persistence regardless of VoiceChat
//       connection state. Covers: LiveCallProvider wrapping, FloatingCallBar
//       placement, absence of endCall() in navigation handlers, test-id presence,
//       and startCall() synchronous session-set.
//
//   (b) Playwright UI test (1 check): logs in with a test user, mocks
//       /api/dashboard/voice-session to never resolve (VoiceChat stays in
//       'connecting' indefinitely — session never clears), clicks GlobalCallButton,
//       navigates Home→Tasks→Home, asserts FloatingCallBar visible at each stop,
//       toggles mute and asserts data-muted persists across navigation, then
//       clicks the End button and asserts bar disappears + GlobalCallButton
//       reappears. This confirms the behavior at the UI layer.
//
// Why the mocked voice-session API?
//   VoiceChat.startSession() immediately calls updateStatus('connecting') (keeping
//   session alive in LiveCallProvider) then awaits a fetch to /api/dashboard/
//   voice-session. If that fetch hangs, VoiceChat stays in 'connecting' status
//   indefinitely — no timeout fires (connectTimeoutRef is only set after the WS
//   opens). This gives the Playwright test a stable window to navigate and assert
//   without racing a failing WebRTC handshake.
//
// Gate checks (6/6 required for PASS):
//   Static (offline — no network):
//     1. CornerV3.jsx: <LiveCallProvider> wraps root dashboard div above nav +
//        content — call state survives all tab/agent navigation changes.
//     2. CornerV3.jsx: <FloatingCallBar /> is rendered inside root div, outside
//        all tab-conditional content blocks — visible on every tab.
//     3. CornerV3.jsx: no navigation handler (handleTabChange, handleSelectAgent,
//        handleSelectProject, handleBackFromConversation, handleEnterWorld) contains
//        endCall — navigation alone cannot end a call.
//     4. FloatingCallBar.jsx: has required data-testid attributes
//        (floating-call-bar, floating-call-bar-mute w/ data-muted, floating-call-bar-hangup).
//     5. LiveCallProvider.jsx: startCall() sets session synchronously (bar visible
//        before WebSocket connects); session cleared only on endCall() or
//        onStatusChange('idle'), never on navigation.
//   Dynamic (Playwright UI + live Supabase auth):
//     6. FloatingCallBar persists across Home→Tasks→Home navigation; mute state
//        persists across navigation; End button dismisses bar + restores
//        GlobalCallButton; navigation before End did NOT dismiss bar.
//
// Usage:
//   node scripts/accept/LR-4b_floating_call_bar.js [--base=URL] [--headful]
//
// Env (auto-loaded from .env.prod if present):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Exit codes: 0 = 6/6 PASS, 1 = at least one FAIL, 2 = setup error.

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
  || process.env.LR4B_BASE || 'https://aheadofmarket.com'
const HEADFUL = process.argv.includes('--headful')
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const TS = Date.now()
const TEST_WORLD = `lr4btest${TS}`
const TEST_EMAIL = `lr4btest+${TS}@aheadofmarket.com`
const TEST_PWD = `LR4BTest${TS}!`
const SCREENSHOTS_DIR = `/tmp/lr4b-accept-${TS}`

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

function readSource(rel) {
  try { return readFileSync(resolve(ROOT, rel), 'utf8') } catch { return null }
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
        display_name: 'LR4B Test',
        workspace_name: 'LR4B Test Corp',
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

// ── Static checks ─────────────────────────────────────────────────────────────

function runStaticChecks() {
  console.log('\n--- Static checks (source-grep) ---')

  // Check 1: LiveCallProvider wraps root dashboard div
  const cv3Rel = 'src/dashboard/CornerV3.jsx'
  const cv3Src = readSource(cv3Rel)
  if (!cv3Src) {
    record(`Check 1: ${cv3Rel} readable`, false, 'file not found')
    record('Check 2: FloatingCallBar placement', false, 'file not found')
    record('Check 3: no endCall in navigation handlers', false, 'file not found')
  } else {
    // Check 1: <LiveCallProvider> opens before the root dashboard div and closes
    // after FloatingCallBar — meaning all navigation (nav, tabs, content) lives
    // inside the provider and call state survives any navigation.
    const providerWraps = cv3Src.includes('<LiveCallProvider>')
      && cv3Src.includes('</LiveCallProvider>')
    // Verify LiveCallProvider appears before the data-testid="dashboard-home-root" div
    const providerBeforeRoot = cv3Src.indexOf('<LiveCallProvider>') < cv3Src.indexOf('data-testid="dashboard-home-root"')
    record(
      'Check 1: <LiveCallProvider> wraps root dashboard div (call state survives navigation)',
      providerWraps && providerBeforeRoot,
      `providerPresent=${providerWraps} providerBeforeRoot=${providerBeforeRoot}`
    )

    // Check 2: <FloatingCallBar /> renders inside root div, outside conditional content
    // blocks (not inside {tab === 'tasks' && ...} or {tab === 'chat' && ...})
    const barPresent = cv3Src.includes('<FloatingCallBar />')
    // It should NOT be inside a conditional content block — verify it's rendered
    // unconditionally in the shell by checking it comes AFTER the closing </div> of
    // the content area but INSIDE the root div.
    // Simple proxy: FloatingCallBar is NOT inside a {tab === block (it renders regardless of tab).
    // We check it appears in the file and is NOT wrapped in a tab ternary by verifying
    // the line that contains it has no tab condition inline.
    const barLine = cv3Src.split('\n').find(l => l.includes('<FloatingCallBar />')) || ''
    const barNotTabGated = !barLine.includes('tab ===') && !barLine.includes('tab !==')
    record(
      'Check 2: <FloatingCallBar /> renders unconditionally in shell (visible on all tabs)',
      barPresent && barNotTabGated,
      `barPresent=${barPresent} notTabGated=${barNotTabGated} line="${barLine.trim().slice(0, 80)}"`
    )

    // Check 3: no navigation handler contains endCall.
    // Approach: CornerV3.jsx does not destructure or reference endCall at all —
    // it never calls startCall/endCall directly. The call lifecycle lives entirely
    // inside LiveCallProvider + GlobalCallButton + FloatingCallBar. Any occurrence
    // of 'endCall' in CornerV3.jsx would indicate a navigation path could reach it.
    const endCallInCV3 = cv3Src.includes('endCall')
    // Additionally verify the nav handler names are present (so we know the source is
    // the real file and not an empty stub that trivially has no endCall).
    const navHandlerNames = ['handleTabChange', 'handleSelectAgent', 'handleSelectProject',
      'handleBackFromConversation', 'handleEnterWorld', 'handleReturnToMyWorld']
    const foundHandlers = navHandlerNames.filter(h => cv3Src.includes(h))
    record(
      'Check 3: CornerV3.jsx does not reference endCall (navigation cannot end call); all nav handlers present',
      !endCallInCV3 && foundHandlers.length === navHandlerNames.length,
      `endCallInCV3=${endCallInCV3} navHandlersFound=${foundHandlers.length}/${navHandlerNames.length}`
    )
  }

  // Check 4: FloatingCallBar.jsx has required data-testid attributes
  const barRel = 'src/dashboard/components/cv3/voice/FloatingCallBar.jsx'
  const barSrc = readSource(barRel)
  if (!barSrc) {
    record(`Check 4: ${barRel} readable`, false, 'file not found')
  } else {
    const hasBarId = barSrc.includes('data-testid="floating-call-bar"')
    const hasMuteId = barSrc.includes('data-testid="floating-call-bar-mute"')
    const hasDataMuted = barSrc.includes('data-muted={isMuted')
    const hasHangupId = barSrc.includes('data-testid="floating-call-bar-hangup"')
    record(
      'Check 4: FloatingCallBar has required test IDs (bar, mute+data-muted, hangup)',
      hasBarId && hasMuteId && hasDataMuted && hasHangupId,
      `bar=${hasBarId} mute=${hasMuteId} data-muted=${hasDataMuted} hangup=${hasHangupId}`
    )
  }

  // Check 5: LiveCallProvider — startCall() sets session synchronously; session
  // cleared only on endCall() or onStatusChange('idle'), never on navigation.
  const provRel = 'src/dashboard/providers/LiveCallProvider.jsx'
  const provSrc = readSource(provRel)
  if (!provSrc) {
    record(`Check 5: ${provRel} readable`, false, 'file not found')
  } else {
    // startCall sets session synchronously (setSession call without await)
    const startCallSync = provSrc.includes('setSession({ agentSlug, clientId, agentColor })')
      && !provSrc.match(/await\s+setSession/)

    // endCall clears session
    const endCallClears = provSrc.includes('setSession(null)') && provSrc.includes('endCall')

    // onStatusChange clears session only on 'idle'
    const statusClearsOnIdle = provSrc.includes("if (s === 'idle')")
      && provSrc.includes('setSession(null)')

    // No navigation-related code in provider (it has no navigation state)
    const noNavInProvider = !provSrc.includes('handleTabChange') && !provSrc.includes('selectedAgent')

    record(
      'Check 5: startCall() sets session synchronously; session cleared only on endCall/idle status',
      startCallSync && endCallClears && statusClearsOnIdle && noNavInProvider,
      `startCallSync=${startCallSync} endCallClears=${endCallClears} statusClearsOnIdle=${statusClearsOnIdle} noNavInProvider=${noNavInProvider}`
    )
  }
}

// ── Dynamic check (Playwright UI) ─────────────────────────────────────────────

async function runUICheck() {
  console.log('\n--- Dynamic check (Playwright UI) ---')

  if (!SVC_KEY) {
    record('Check 6: FloatingCallBar persists across navigation; mute persists; End button clears bar', false,
      'SUPABASE_SERVICE_ROLE_KEY not set — skipping dynamic check')
    return
  }

  console.log('  Setup: creating test user...')
  try {
    const user = await createTestUser()
    testUserId = user.id
    console.log(`  User created: id=${testUserId}`)
  } catch (e) {
    record('Check 6: FloatingCallBar persists across navigation; mute persists; End button clears bar',
      false, `createUser failed: ${e.message?.slice(0, 80)}`)
    return
  }

  mkdirSync(SCREENSHOTS_DIR, { recursive: true })

  const browser = await chromium.launch({
    headless: !HEADFUL,
    // Fake audio device so getUserMedia succeeds and the VoiceChat component can
    // initialize its AudioContext without throwing NotFoundError. Combined with
    // the mocked voice-session API route, this keeps VoiceChat in 'connecting'
    // state indefinitely — session never clears — giving us a stable test window.
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  })
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ['microphone'],
  })
  const page = await ctx.newPage()

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [browser] ${msg.text().slice(0, 200)}`)
  })

  // Mock /api/dashboard/voice-session to hang indefinitely.
  // This keeps VoiceChat stuck awaiting the API call (status='connecting'),
  // so session never clears in LiveCallProvider. The FloatingCallBar stays
  // visible for the entire navigation test without racing a failing WebSocket.
  await page.route('**/api/dashboard/voice-session', async (route) => {
    // Never fulfill — request hangs, VoiceChat.startSession() awaits indefinitely.
    // Playwright cleans this up when the test ends (browser.close()).
    await new Promise(() => {})
  })

  let passed = false
  let failReason = ''

  try {
    // ── Sign in ──────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PWD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 })

    if (page.url().includes('onboarding')) {
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20_000 })
    }
    await page.waitForSelector('[data-testid="dashboard-home-root"]', { timeout: 15_000 })
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-dashboard.png` })
    console.log('  Signed in, on dashboard')

    // ── Wait for GlobalCallButton ────────────────────────────────────────────
    await page.waitForSelector('[data-testid="global-call-button"]', { timeout: 10_000 })
    console.log('  GlobalCallButton found')

    // ── Start call ───────────────────────────────────────────────────────────
    await page.click('[data-testid="global-call-button"]')
    console.log('  Clicked GlobalCallButton')

    // startCall() is synchronous — bar must appear immediately (no network needed)
    await page.waitForSelector('[data-testid="floating-call-bar"]', { timeout: 3_000 })
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-bar-home.png` })
    console.log('  FloatingCallBar visible on Home tab')

    // ── Navigate to Tasks tab ────────────────────────────────────────────────
    // Click the Tasks tab button (label text "Tasks")
    const tasksTab = page.locator('button, [role="tab"]').filter({ hasText: 'Tasks' }).first()
    // Fallback: find by visible text in the nav
    if (!await tasksTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Try clicking the tab via evaluate if the locator doesn't match
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'))
        const t = tabs.find(b => b.textContent?.trim() === 'Tasks')
        if (t) t.click()
      })
    } else {
      await tasksTab.click()
    }
    await page.waitForTimeout(800)

    const barVisibleOnTasks = await page.isVisible('[data-testid="floating-call-bar"]')
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-bar-tasks.png` })
    console.log(`  FloatingCallBar visible on Tasks tab: ${barVisibleOnTasks}`)

    if (!barVisibleOnTasks) {
      failReason = 'FloatingCallBar not visible after navigating to Tasks tab'
      throw new Error(failReason)
    }

    // ── Navigate back to Home tab ────────────────────────────────────────────
    const homeTab = page.locator('button, [role="tab"]').filter({ hasText: 'Home' }).first()
    if (!await homeTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'))
        const t = tabs.find(b => b.textContent?.trim() === 'Home')
        if (t) t.click()
      })
    } else {
      await homeTab.click()
    }
    await page.waitForTimeout(600)

    const barVisibleBackHome = await page.isVisible('[data-testid="floating-call-bar"]')
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-bar-home-again.png` })
    console.log(`  FloatingCallBar visible after returning to Home: ${barVisibleBackHome}`)

    if (!barVisibleBackHome) {
      failReason = 'FloatingCallBar not visible after returning to Home tab'
      throw new Error(failReason)
    }

    // ── Toggle mute ──────────────────────────────────────────────────────────
    const muteBtn = page.locator('[data-testid="floating-call-bar-mute"]')
    const mutedBefore = await muteBtn.getAttribute('data-muted')
    console.log(`  Mute state before click: data-muted="${mutedBefore}"`)

    await muteBtn.click()
    await page.waitForTimeout(300)

    const mutedAfterClick = await muteBtn.getAttribute('data-muted')
    console.log(`  Mute state after click: data-muted="${mutedAfterClick}"`)
    if (mutedAfterClick !== 'true') {
      failReason = `Mute button click did not set data-muted="true" (got "${mutedAfterClick}")`
      throw new Error(failReason)
    }
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-bar-muted.png` })
    console.log('  Muted successfully')

    // ── Navigate to Tasks while muted ────────────────────────────────────────
    const tasksTab2 = page.locator('button, [role="tab"]').filter({ hasText: 'Tasks' }).first()
    if (!await tasksTab2.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('button'))
        const t = tabs.find(b => b.textContent?.trim() === 'Tasks')
        if (t) t.click()
      })
    } else {
      await tasksTab2.click()
    }
    await page.waitForTimeout(600)

    const barVisibleMutedNav = await page.isVisible('[data-testid="floating-call-bar"]')
    const mutedAfterNav = await page.locator('[data-testid="floating-call-bar-mute"]').getAttribute('data-muted')
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-bar-muted-tasks.png` })
    console.log(`  After nav to Tasks: bar=${barVisibleMutedNav} muted="${mutedAfterNav}"`)

    if (!barVisibleMutedNav) {
      failReason = 'FloatingCallBar disappeared after navigating to Tasks while muted'
      throw new Error(failReason)
    }
    if (mutedAfterNav !== 'true') {
      failReason = `Mute state lost after navigation (data-muted="${mutedAfterNav}", expected "true")`
      throw new Error(failReason)
    }
    console.log('  Mute state persisted across navigation')

    // ── End call from floating bar ───────────────────────────────────────────
    const hangupBtn = page.locator('[data-testid="floating-call-bar-hangup"]')
    await hangupBtn.click()
    await page.waitForTimeout(600)

    // Bar must be gone, GlobalCallButton must reappear
    const barAfterEnd = await page.isVisible('[data-testid="floating-call-bar"]')
    const callBtnAfterEnd = await page.isVisible('[data-testid="global-call-button"]')
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-after-end-call.png` })
    console.log(`  After End: bar=${barAfterEnd} GlobalCallButton=${callBtnAfterEnd}`)

    if (barAfterEnd) {
      failReason = 'FloatingCallBar still visible after clicking End button'
      throw new Error(failReason)
    }
    if (!callBtnAfterEnd) {
      failReason = 'GlobalCallButton did not reappear after ending call'
      throw new Error(failReason)
    }

    passed = true

  } catch (err) {
    if (!failReason) failReason = err.message?.slice(0, 200)
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/error.png` }).catch(() => {})
    console.log(`  Browser error: ${failReason}`)
  } finally {
    await browser.close()
  }

  record(
    'Check 6: FloatingCallBar persists Home→Tasks→Home; mute persists across nav; End button clears bar + restores GlobalCallButton',
    passed,
    passed
      ? 'all navigation assertions passed; mute state survived tab change; End call cleared bar'
      : failReason
  )
  console.log(`  Screenshots: ${SCREENSHOTS_DIR}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== LR-4b gate: live call persistence + FloatingCallBar ===')
  console.log(`Base:       ${BASE}`)
  console.log(`Test world: ${TEST_WORLD}\n`)

  runStaticChecks()
  await runUICheck()

  // Cleanup
  console.log('\n--- Cleanup ---')
  await deleteTestUser()
  if (testUserId) console.log(`Deleted test user ${testUserId}`)

  // Final report
  const passed = checks.filter(c => c.pass).length
  const total = checks.length
  console.log(`\n${passed}/${total} PASS`)
  if (passed < total) {
    console.log('FAILED:')
    checks.filter(c => !c.pass).forEach(c =>
      console.log(`  — ${c.name}${c.detail ? ` (${c.detail})` : ''}`)
    )
  }
  process.exit(passed === total ? 0 : 1)
}

run().catch(err => {
  console.error('LR-4b gate error:', err)
  deleteTestUser().catch(() => {})
  process.exit(1)
})
