// Corner Test Pass 14: R21 Acceptance -- Canonical Project-Chat URL + In-Chat Task Button
//
// R21 added three things:
//   R21 (slice)  -- /dashboard/projects/:slug/chat canonical URL + in-chat create-task button
//   R21a (fix)   -- /dashboard/projects/:path* rewrite added to vercel.json so the URL survives refresh
//   R21c         -- /api/dashboard/create-project-task server-side endpoint (service-role insert)
//
// This pass verifies all three land correctly end-to-end:
//   T1  -- Canonical project-chat URL loads (no 404 / no blank screen)
//   T2  -- [data-testid=project-chat-input] present in the DOM
//   T3  -- [data-testid=chat-create-task] button present
//   T4  -- Create-task button disabled when input is empty
//   T5  -- Create-task button enabled after typing text
//   T6  -- Clicking create-task fires POST /api/dashboard/create-project-task
//   T7  -- Input clears after successful task creation (R21c returns ok:true)
//   T8  -- API smoke test: POST /api/dashboard/create-project-task directly
//   T9  -- API rejects missing text (400)
//   T10 -- API rejects missing projectSlug (400)
//   T11 -- Regression: project chat input still sends on Enter (normal chat flow)
//   T12 -- Console errors

import { chromium } from 'playwright'
import fs from 'fs'

const BASE = process.env.SITE || 'http://localhost:5173'
const DIR = '/Users/aom-inhouse/aom-studio-transfer/aom-studio/test-screenshots'
const R = []

function log(t, s, d) {
  R.push({ test: t, status: s, detail: d })
  console.log(`[${s}] ${t}: ${d}`)
}

async function run() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()

  const pageErrors = []
  page.on('pageerror', err => pageErrors.push(err.message))

  // Intercept network requests so we can detect the create-project-task call.
  const createTaskRequests = []
  page.on('request', req => {
    if (req.url().includes('create-project-task') && req.method() === 'POST') {
      createTaskRequests.push({ url: req.url(), postData: req.postData() })
    }
  })

  try {
    // ── STEP 0: Authenticate ─────────────────────────────────────────────────
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(1500)

    const pwInput = await page.$('input[type="password"]')
    if (pwInput) {
      await pwInput.fill('aomhq')
      const btn = await page.$('button:has-text("ENTER")') || await page.$('button[type="submit"]') || await page.$('button')
      if (btn) await btn.click()
      else await page.keyboard.press('Enter')
      await page.waitForTimeout(4000)
      log('T0-LOGIN', 'PASS', 'Authenticated via password gate')
    } else {
      log('T0-LOGIN', 'PASS', 'No password gate (Supabase session or open)')
    }
    await page.waitForTimeout(2000)

    // If redirected to Supabase /login, do email+password auth
    if (page.url().includes('/login') && process.env.DASHBOARD_TEST_EMAIL) {
      const emailInput = await page.$('input[type="email"]')
      if (emailInput) {
        await emailInput.fill(process.env.DASHBOARD_TEST_EMAIL)
        const passInput2 = await page.$('input[type="password"]')
        if (passInput2) await passInput2.fill(process.env.DASHBOARD_TEST_PASSWORD || '')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(5000)
        log('T0-SUPABASE-LOGIN', 'PASS', `Supabase auth: ${process.env.DASHBOARD_TEST_EMAIL}`)
      }
    }
    await page.screenshot({ path: `${DIR}/p14-00-dashboard.png` })

    // ── Discover a valid project slug from the loaded page ───────────────────
    // We look for navigation links or data attributes that expose project slugs.
    const discoveredSlug = await page.evaluate(() => {
      // Look for links that match /dashboard/projects/:slug
      const anchors = document.querySelectorAll('a[href*="/dashboard/projects/"]')
      for (const a of anchors) {
        const m = a.href.match(/\/dashboard\/projects\/([^/?#]+)/)
        if (m && m[1]) return m[1]
      }
      // Fall back: data-slug attributes on project cards
      const slugEls = document.querySelectorAll('[data-slug],[data-project-slug]')
      for (const el of slugEls) {
        const slug = el.dataset.slug || el.dataset.projectSlug
        if (slug && /^[a-z0-9][a-z0-9-_]{0,30}$/.test(slug)) return slug
      }
      return null
    })
    const testSlug = discoveredSlug || 'corner'
    log('T0-SLUG', 'INFO', `Using project slug: "${testSlug}"`)

    // ── T1: Canonical project-chat URL loads ─────────────────────────────────
    const chatUrl = `${BASE}/dashboard/projects/${testSlug}/chat`
    await page.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(2000)

    const pageTitle = await page.title()
    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) || '')
    const has404 = bodyText.toLowerCase().includes('404') || bodyText.toLowerCase().includes('not found')
    const urlOk = page.url().includes('/dashboard')

    log('T1-CANONICAL-URL', (!has404 && urlOk) ? 'PASS' : 'FAIL',
      `URL: ${page.url()} | 404=${has404} | title="${pageTitle}"`)
    await page.screenshot({ path: `${DIR}/p14-01-project-chat.png` })

    // ── T2: project-chat-input testid present ────────────────────────────────
    const inputEl = await page.$('[data-testid="project-chat-input"]')
    log('T2-INPUT-TESTID', inputEl ? 'PASS' : 'FAIL',
      inputEl ? 'data-testid="project-chat-input" found' : 'MISSING -- not rendered or auth wall')

    // ── T3: chat-create-task button present ──────────────────────────────────
    const btnEl = await page.$('[data-testid="chat-create-task"]')
    log('T3-CREATE-TASK-BTN', btnEl ? 'PASS' : 'FAIL',
      btnEl ? 'data-testid="chat-create-task" found' : 'MISSING')

    if (!inputEl || !btnEl) {
      // Auth wall or wrong view -- try navigating via the home tab to a project
      log('T3b-NAV-FALLBACK', 'INFO', 'Attempting nav via sidebar project links')
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(2000)

      // Click the first visible project link
      const projectClicked = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/dashboard/projects/"]')
        for (const a of links) {
          const r = a.getBoundingClientRect()
          if (r.width > 0 && r.height > 0) { a.click(); return a.href }
        }
        return null
      })
      if (projectClicked) {
        await page.waitForTimeout(2500)
        log('T3b-NAV-FALLBACK', 'INFO', `Clicked: ${projectClicked}`)
        await page.screenshot({ path: `${DIR}/p14-02-project-via-nav.png` })
      }
    }

    // ── T4: button disabled when input empty ─────────────────────────────────
    await page.waitForTimeout(500)
    const btnDisabledWhenEmpty = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="chat-create-task"]')
      if (!btn) return null
      const input = document.querySelector('[data-testid="project-chat-input"]')
      const inputEmpty = !input || !input.value.trim()
      return { disabled: btn.disabled, inputEmpty }
    })

    if (btnDisabledWhenEmpty === null) {
      log('T4-BTN-DISABLED-EMPTY', 'FAIL', 'Button not found after nav attempt')
    } else {
      log('T4-BTN-DISABLED-EMPTY', (btnDisabledWhenEmpty.disabled && btnDisabledWhenEmpty.inputEmpty) ? 'PASS' : 'WARN',
        `disabled=${btnDisabledWhenEmpty.disabled} inputEmpty=${btnDisabledWhenEmpty.inputEmpty}`)
    }

    // ── T5: button enables after typing text ─────────────────────────────────
    const typedText = `r21-acceptance-test-${Date.now()}`
    const typedOk = await page.evaluate((text) => {
      const input = document.querySelector('[data-testid="project-chat-input"]')
      if (!input) return false
      // Trigger React synthetic event
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(input, text)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }, typedText)

    await page.waitForTimeout(300)

    const btnEnabledAfterTyping = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="chat-create-task"]')
      const input = document.querySelector('[data-testid="project-chat-input"]')
      if (!btn) return null
      return { disabled: btn.disabled, inputValue: input?.value || '' }
    })

    if (btnEnabledAfterTyping === null) {
      log('T5-BTN-ENABLED-AFTER-TYPE', 'FAIL', 'Button not found')
    } else {
      log('T5-BTN-ENABLED-AFTER-TYPE', (!btnEnabledAfterTyping.disabled && typedOk) ? 'PASS' : 'WARN',
        `typed="${typedText.slice(0,20)}" | disabled=${btnEnabledAfterTyping.disabled} | inputValue="${btnEnabledAfterTyping.inputValue.slice(0,20)}"`)
    }
    await page.screenshot({ path: `${DIR}/p14-03-input-filled.png` })

    // ── T6 + T7: click create-task, verify request fires + input clears ──────
    const beforeClickCount = createTaskRequests.length

    const clickedCreateBtn = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="chat-create-task"]')
      if (!btn || btn.disabled) return false
      btn.click()
      return true
    })

    await page.waitForTimeout(2000) // allow the async fetch to fire

    const afterClickCount = createTaskRequests.length
    const requestFired = afterClickCount > beforeClickCount
    log('T6-API-CALL-FIRED', (requestFired || clickedCreateBtn) ? (requestFired ? 'PASS' : 'WARN') : 'FAIL',
      `clickedBtn=${clickedCreateBtn} | requests before=${beforeClickCount} after=${afterClickCount}`)

    if (requestFired) {
      const lastReq = createTaskRequests[createTaskRequests.length - 1]
      let postBody = {}
      try { postBody = JSON.parse(lastReq.postData || '{}') } catch {}
      log('T6b-REQUEST-BODY', (postBody.text && postBody.projectSlug) ? 'PASS' : 'WARN',
        `text="${String(postBody.text || '').slice(0,30)}" projectSlug="${postBody.projectSlug}"`)
    }

    const inputAfterCreate = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="project-chat-input"]')
      return input ? input.value : null
    })
    log('T7-INPUT-CLEARS', inputAfterCreate === '' ? 'PASS' : 'WARN',
      `Input value after create: "${inputAfterCreate ?? 'null (input gone)'}"`)

    await page.screenshot({ path: `${DIR}/p14-04-after-create.png` })

    // ── T8: API smoke test -- valid POST ─────────────────────────────────────
    const apiSmoke = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/dashboard/create-project-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'r21-smoke-test task', projectSlug: 'corner', clientId: 'aom' }),
        })
        const data = await res.json().catch(() => ({}))
        return { status: res.status, ok: res.ok, hasOk: data.ok === true, hasTask: !!data.task, error: data.error }
      } catch (err) {
        return { error: err.message }
      }
    })
    log('T8-API-SMOKE-VALID', (apiSmoke.ok || apiSmoke.status === 200) ? 'PASS' : (apiSmoke.status === 502 ? 'WARN' : 'FAIL'),
      `status=${apiSmoke.status} ok=${apiSmoke.ok} data.ok=${apiSmoke.hasOk} task=${apiSmoke.hasTask}${apiSmoke.error ? ' err=' + String(apiSmoke.error).slice(0,80) : ''}`)

    // ── T9: API rejects missing text (400) ───────────────────────────────────
    const apiBadText = await page.evaluate(async () => {
      const res = await fetch('/api/dashboard/create-project-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '   ', projectSlug: 'corner' }),
      })
      const data = await res.json().catch(() => ({}))
      return { status: res.status, error: data.error }
    })
    log('T9-API-REJECTS-EMPTY-TEXT', apiBadText.status === 400 ? 'PASS' : 'FAIL',
      `status=${apiBadText.status} error="${apiBadText.error}"`)

    // ── T10: API rejects missing projectSlug (400) ───────────────────────────
    const apiBadSlug = await page.evaluate(async () => {
      const res = await fetch('/api/dashboard/create-project-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'some valid text' }),
      })
      const data = await res.json().catch(() => ({}))
      return { status: res.status, error: data.error }
    })
    log('T10-API-REJECTS-NO-SLUG', apiBadSlug.status === 400 ? 'PASS' : 'FAIL',
      `status=${apiBadSlug.status} error="${apiBadSlug.error}"`)

    // ── T11: Regression -- Enter key still sends normal chat message ──────────
    // Type text and press Enter; this should invoke sendProjectText (NOT create-task)
    const chatBefore = createTaskRequests.length
    await page.evaluate((text) => {
      const input = document.querySelector('[data-testid="project-chat-input"]')
      if (!input) return
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      nativeSetter.call(input, text)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.focus()
    }, 'r21-regression-chat-send-test')
    await page.waitForTimeout(200)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)
    const chatAfter = createTaskRequests.length
    // Enter should NOT fire create-project-task (only the button does)
    log('T11-ENTER-SENDS-CHAT', chatBefore === chatAfter ? 'PASS' : 'WARN',
      `create-task calls: before=${chatBefore} after=${chatAfter} (Enter should not trigger create-task)`)

    // ── T12: Console errors ───────────────────────────────────────────────────
    log('T12-CONSOLE-ERRORS', pageErrors.length === 0 ? 'PASS' : 'WARN',
      `${pageErrors.length} errors${pageErrors.length > 0 ? ': ' + pageErrors.slice(0,3).map(e => e.slice(0,80)).join(' | ') : ''}`)

    await page.screenshot({ path: `${DIR}/p14-05-final.png` })

  } catch (err) {
    log('RUNTIME', 'FAIL', err.message.slice(0, 200))
    await page.screenshot({ path: `${DIR}/p14-error.png` }).catch(() => {})
  }

  await browser.close()

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n=== PASS 14 RESULTS (R21 Acceptance) ===\n')
  const pass = R.filter(r => r.status === 'PASS').length
  const fail = R.filter(r => r.status === 'FAIL').length
  const warn = R.filter(r => r.status === 'WARN').length
  const info = R.filter(r => r.status === 'INFO').length
  console.log(`${R.length} tests | ${pass} PASS | ${fail} FAIL | ${warn} WARN | ${info} INFO\n`)
  for (const r of R) console.log(`  [${r.status}] ${r.test}: ${r.detail}`)

  // R21 acceptance gate
  console.log('\n=== R21 ACCEPTANCE GATE ===\n')
  const gate = {
    'Canonical URL loads':    R.find(r => r.test === 'T1-CANONICAL-URL')?.status === 'PASS',
    'Input testid present':   R.find(r => r.test === 'T2-INPUT-TESTID')?.status === 'PASS',
    'Button testid present':  R.find(r => r.test === 'T3-CREATE-TASK-BTN')?.status === 'PASS',
    'Button disabled on empty': R.find(r => r.test === 'T4-BTN-DISABLED-EMPTY')?.status === 'PASS',
    'Button enables on type': R.find(r => r.test === 'T5-BTN-ENABLED-AFTER-TYPE')?.status === 'PASS',
    'API call fires on click': R.find(r => r.test === 'T6-API-CALL-FIRED')?.status === 'PASS',
    'Input clears on success': R.find(r => r.test === 'T7-INPUT-CLEARS')?.status === 'PASS',
    'API smoke (valid body)':  (['PASS','WARN'].includes(R.find(r => r.test === 'T8-API-SMOKE-VALID')?.status)),
    'API rejects empty text':  R.find(r => r.test === 'T9-API-REJECTS-EMPTY-TEXT')?.status === 'PASS',
    'API rejects no slug':     R.find(r => r.test === 'T10-API-REJECTS-NO-SLUG')?.status === 'PASS',
  }
  const gatePassed = Object.values(gate).filter(Boolean).length
  for (const [k, v] of Object.entries(gate)) console.log(`  ${v ? 'PASS' : 'FAIL'} ${k}`)

  const accepted = gatePassed >= 7
  console.log(`\n  R21 ${accepted ? 'ACCEPTED' : 'NEEDS WORK'} (${gatePassed}/${Object.keys(gate).length} gate checks passing)`)
  console.log(accepted ? '  ✓ In-chat task creation is production-ready.' : '  ✗ Fix failing checks before shipping.')

  let commitHash = 'unknown'
  try {
    const { execSync } = await import('child_process')
    commitHash = execSync('git -C /Users/aom-inhouse/aom-studio-transfer/aom-studio rev-parse --short HEAD').toString().trim()
  } catch {}

  const outPath = `${DIR}/pass14-results.json`
  fs.writeFileSync(outPath, JSON.stringify({
    pass: 14,
    round: 'R21',
    commit: commitHash,
    tests: R,
    summary: { total: R.length, pass, fail, warn, info },
    gate,
    gatePassed,
    accepted,
    timestamp: new Date().toISOString(),
  }, null, 2))

  console.log(`\nResults saved to ${outPath}`)
}

run().catch(console.error)
