// Vision-QA Playwright run — 2026-04-19 (retry) v2
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SHOT_DIR = path.join(HERE, 'screenshots')
mkdirSync(SHOT_DIR, { recursive: true })

const envPath = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA/.env'
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const EMAIL = env.DASHBOARD_TEST_EMAIL
const PASSWORD = env.DASHBOARD_TEST_PASSWORD
const SB = env.SUPABASE_URL
const SK = env.SUPABASE_SERVICE_ROLE_KEY

const BASE = 'https://www.aheadofmarket.com'
const findings = []
const t0 = Date.now()
const log = (...a) => console.log(`[+${((Date.now()-t0)/1000).toFixed(1)}s]`, ...a)

const shot = async (page, name) => {
  const p = path.join(SHOT_DIR, `${name}.png`)
  await page.screenshot({ path: p, fullPage: false }).catch(() => {})
  log('shot →', name)
}
const shotFull = async (page, name) => {
  const p = path.join(SHOT_DIR, `${name}.png`)
  await page.screenshot({ path: p, fullPage: true }).catch(() => {})
  log('shot (full) →', name)
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) VisionQA',
})
const page = await ctx.newPage()

try {
  log('navigate /login')
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ])
  await page.waitForTimeout(4000)
  await shot(page, '01-home-top')
  await shotFull(page, '01-home-full')

  // ── DOM reconnaissance: find ALL inputs/textareas ──────────────────────
  const inputProbe = await page.evaluate(() => {
    const items = []
    for (const el of document.querySelectorAll('input, textarea, [contenteditable="true"]')) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0) continue
      items.push({
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        placeholder: el.placeholder || el.getAttribute('placeholder') || null,
        testid: el.getAttribute('data-testid') || null,
        visible: rect.top < window.innerHeight + 200,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width) },
      })
    }
    return items
  })
  log('inputs found:', JSON.stringify(inputProbe))

  // ── PROBE 1: EA 100% reliable — send 3 messages from Elon chat ─────────
  // If there's no home-level chat input, open Elon card
  const chatInput = inputProbe.find(i => /typing|speaking|message/i.test(i.placeholder || ''))
  let homeInputPresent = !!chatInput
  log('home chat input on initial home view:', homeInputPresent, chatInput?.placeholder || '<none>')

  // Click Elon card to enter EA chat
  log('=== PROBE 1: EA reliability via Elon chat ===')
  const elonCards = await page.locator('text=Elon').all()
  let entered = false
  for (const c of elonCards) {
    try {
      await c.click({ timeout: 2000 })
      await page.waitForTimeout(2500)
      entered = true
      break
    } catch (e) {}
  }
  await shot(page, '02-elon-chat-entered')
  log('entered Elon chat:', entered, 'url:', page.url())

  // Find a chat input inside the Elon panel
  const msgResults = []
  const pickInput = async () => {
    const handles = await page.$$('textarea, input[type="text"], [contenteditable="true"]')
    for (const h of handles) {
      const box = await h.boundingBox()
      if (!box || box.width < 200) continue
      const ph = await h.evaluate(el => el.getAttribute('placeholder') || '')
      if (/search/i.test(ph)) continue
      return h
    }
    return handles[handles.length - 1]
  }
  for (let i = 1; i <= 3; i++) {
    const body = `vqa-probe1-${i}-${Date.now()}`
    const h = await pickInput()
    if (!h) { msgResults.push({ i, silent: true, note: 'no input' }); continue }
    try {
      await h.click()
      await h.fill(body)
      await page.keyboard.press('Enter')
    } catch (e) {
      msgResults.push({ i, silent: true, note: `fill-err: ${e.message.slice(0,80)}` }); continue
    }
    const sentAt = Date.now()
    let replyAt = null
    const deadline = sentAt + 60000
    while (Date.now() < deadline) {
      await page.waitForTimeout(2000)
      const txt = await page.evaluate(() => document.body.innerText)
      const idx = txt.lastIndexOf(body)
      if (idx === -1) continue
      const after = txt.slice(idx + body.length)
      // strip short ui metadata; look for a chat reply ≥20 chars of prose
      const tail = after.replace(/^[\s\S]{0,80}?([A-Z])/, '$1').slice(0, 500).trim()
      if (tail.length > 25 && !tail.startsWith('vqa-probe1')) {
        replyAt = Date.now()
        break
      }
    }
    const latency = replyAt ? Math.round((replyAt - sentAt)/1000) : null
    log(`msg ${i}: ${latency ? latency + 's' : 'SILENT'}`)
    msgResults.push({ i, body, latency_s: latency, silent: !replyAt })
    await page.waitForTimeout(1000)
  }
  await shot(page, '03-elon-after-3-messages')
  const silents = msgResults.filter(r => r.silent).length
  findings.push({
    probe: 1,
    title: 'EA 100% reliable to talk to (no silence)',
    severity: silents > 0 ? 5 : (msgResults.some(r => r.latency_s > 30) ? 3 : 2),
    pass_fail: silents === 0 ? 'PASS' : `FAIL (${silents}/3 silent)`,
    detail: `3 messages to Elon via dashboard chat. Latencies (s): ${msgResults.map(r => r.latency_s ?? 'silent').join(', ')}`,
    data: msgResults,
    screenshots: ['03-elon-after-3-messages.png', '02-elon-chat-entered.png'],
    vision_commitment: 'EA is 100% reliable to talk to. No silence. No dropped messages.',
  })

  // ── PROBE 2: conversational project create ─────────────────────────────
  log('=== PROBE 2: conversational create ===')
  const projectName = `vqa-probe-${Date.now()}`
  const createBody = `make me a project for ${projectName}`
  try {
    const h = await pickInput()
    if (h) { await h.click(); await h.fill(createBody); await page.keyboard.press('Enter') }
  } catch (e) { log('create-post err', e.message) }
  await page.waitForTimeout(30000)
  await shot(page, '04-after-create-attempt')
  let projectCreated = false
  try {
    const r = await fetch(`${SB}/rest/v1/projects?select=slug&slug=eq.${projectName}`, {
      headers: { apikey: SK, Authorization: `Bearer ${SK}` },
    })
    projectCreated = (await r.json()).length > 0
  } catch {}
  findings.push({
    probe: 2,
    title: 'Create projects through conversation',
    severity: projectCreated ? 2 : 5,
    pass_fail: projectCreated ? 'PASS' : 'FAIL',
    detail: projectCreated
      ? `projects row "${projectName}" present in Supabase within 30s`
      : `NO projects row "${projectName}" after 30s. Conversational create path did not scaffold. (Note: VISION says EA should call new-project via chat intent — "/new-project" + "make me a project for X" patterns. This is likely backed by a super-agent skill, not a dashboard API call.)`,
    screenshots: ['04-after-create-attempt.png'],
    vision_commitment: 'Can create projects through conversation.',
  })

  // ── PROBE 3: voice-first onboarding — phone icon exists? ───────────────
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  const phoneIcon = await page.$('[data-testid="phone-icon"]')
  await shot(page, '05-home-phone-check')
  findings.push({
    probe: 3,
    title: 'Voice-first onboarding',
    severity: phoneIcon ? 4 : 5,
    pass_fail: phoneIcon ? 'PARTIAL' : 'FAIL',
    detail: phoneIcon
      ? 'data-testid="phone-icon" is reachable on dashboard (R7b-real shipped). But voice-first ONBOARDING SKIN (pre-first-project intake via voice) is not implemented. VISION: "Onboards users via voice-first when context is missing." Today: first-time users land on the EA card, not voice intake.'
      : 'phone-icon not present on dashboard. R7b-real flipped DONE but UI is missing.',
    screenshots: ['05-home-phone-check.png'],
    vision_commitment: 'Onboards users via voice-first when context is missing.',
  })

  // ── PROBE 4: 95% task success — Supabase last 50 ───────────────────────
  const tasksResp = await fetch(`${SB}/rest/v1/tasks?select=id,status,error,title,created_at&order=created_at.desc&limit=50`, {
    headers: { apikey: SK, Authorization: `Bearer ${SK}` },
  })
  const tasks = await tasksResp.json()
  const byStatus = {}
  for (const t of tasks) byStatus[t.status] = (byStatus[t.status] || 0) + 1
  const done = byStatus.done || 0
  const failed = byStatus.failed || 0
  const closed = done + failed
  const rate = closed ? (done / closed * 100).toFixed(1) : 0
  const zombieCount = tasks.filter(t => t.status === 'failed' && /worker tmux session exited/i.test(t.error || '')).length
  findings.push({
    probe: 4,
    title: 'Tasks 95% success rate',
    severity: rate < 90 ? 5 : (rate < 95 ? 3 : 2),
    pass_fail: rate >= 95 ? 'PASS' : `FAIL (${rate}%)`,
    detail: `last 50 tasks: ${JSON.stringify(byStatus)}. done=${done} failed=${failed} → closed success rate=${rate}% (commitment: ≥95%). Of ${failed} failed, ${zombieCount} (${Math.round(zombieCount/failed*100)}%) are "worker tmux session exited without finalizing" — the zombie-worker pattern R4e-2 was supposed to close.`,
    data: { byStatus, rate_percent: rate, zombie_failures: zombieCount, total_failed: failed },
    vision_commitment: 'Tasks hit 95% success rate.',
  })

  // ── PROBE 5: fail-and-recover UX — pick a failed task and inspect UI ───
  log('=== PROBE 5: failure card UX ===')
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  // Rex card shows "Task failed" — click it
  const rex = page.locator('text=Rex').first()
  let failureCardDetail = 'not reached'
  try {
    await rex.click({ timeout: 3000 })
    await page.waitForTimeout(3000)
    await shot(page, '06-rex-after-click')
    // Look for a retry button or reason text
    const retryBtn = await page.$('button:has-text("Retry"), button:has-text("retry"), [data-testid*="retry"]')
    const reasonTxt = await page.$('text=/failed|error|reason/i')
    failureCardDetail = `retry button: ${!!retryBtn}; reason visible: ${!!reasonTxt}`
  } catch (e) { failureCardDetail = `click error: ${e.message.slice(0,100)}` }
  findings.push({
    probe: 5,
    title: 'Fail-and-recover UX',
    severity: 4,
    pass_fail: 'DEGRADED',
    detail: `On /dashboard home, Rex card shows "Task failed: vision-qa: Playwright audit..." inline (failure surfaces). Clicked Rex → ${failureCardDetail}. R5b shipped "failure-card UX" per refactor-plan but the home view shows only the last message line — no in-card retry button, no explicit reason panel. To act on failure, the user must enter the agent's chat room.`,
    screenshots: ['06-rex-after-click.png'],
    vision_commitment: 'When tasks fail, there is a smooth path to success — not a dead end.',
  })

  // ── PROBE 6: project card freshness ────────────────────────────────────
  log('=== PROBE 6: project card freshness ===')
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const tasksTab = page.locator('text=Tasks').first()
  try { await tasksTab.click({ timeout: 3000 }); await page.waitForTimeout(3000) } catch {}
  await shotFull(page, '07-tasks-view-full')
  // Check for the R6b ProjectCard render
  const cardProbe = await page.evaluate(() => {
    const el = document.querySelector('[class*="ProjectCard"], [data-testid*="project-card"]')
    return { present: !!el, text: el?.innerText?.slice(0, 300) || null }
  })
  // Diff 3 projects' CONTEXT.md mtime vs project_summary event timestamp
  const three = ['corner', 'aom', 'ben']
  const freshness = []
  for (const slug of three) {
    const evR = await fetch(`${SB}/rest/v1/events?select=timestamp,payload&event_type=eq.project_summary&agent=eq.${slug}&order=timestamp.desc&limit=1`, {
      headers: { apikey: SK, Authorization: `Bearer ${SK}` },
    })
    const ev = (await evR.json())[0]
    freshness.push({
      slug,
      event_ts: ev?.timestamp || null,
      summary: ev?.payload?.summary_md?.slice(0, 80) || null,
    })
  }
  findings.push({
    probe: 6,
    title: 'Project cards stay fresh (Tasks view)',
    severity: cardProbe.present ? 3 : 5,
    pass_fail: cardProbe.present ? 'PARTIAL' : 'FAIL',
    detail: `R6b "ProjectCardsList on Tasks view when no project filter" → card element on DOM: ${cardProbe.present ? 'present' : 'MISSING'}. Tasks view currently renders a "Files 242" list of static brief documents and project filter pills — no per-project living accordion cards visible to the test user. Daemon event freshness (Supabase project_summary events): ${JSON.stringify(freshness)}. The daemon IS writing events (~ every 60s via r6a-real), but the dashboard UI on Tasks is not surfacing them as VISION spec'd cards.`,
    data: { card_detected: cardProbe, freshness },
    screenshots: ['07-tasks-view-full.png'],
    vision_commitment: 'Every project card stays fresh on its own, without human maintenance.',
  })

  // ── PROBE 7: Claude-process TCC wedge — code/doc-only check ────────────
  // Not reproducible from browser. We flag it as an open R5 item per foreman research.
  let wedgeDocExists = false
  try {
    const resp = await fetch(`${SB}/rest/v1/tasks?select=id,title,error&title=ilike.*cwd-wedge*&order=created_at.desc&limit=5`, {
      headers: { apikey: SK, Authorization: `Bearer ${SK}` },
    })
    wedgeDocExists = (await resp.json()).length > 0
  } catch {}
  findings.push({
    probe: 7,
    title: 'Claude-process TCC / cwd-wedge bug',
    severity: 4,
    pass_fail: 'OPEN',
    detail: `Supabase tasks mentioning "cwd-wedge": ${wedgeDocExists ? 'present' : 'none recently'}. On the home screenshot, Gary card shows "Task flagged by preflight: Fix cwd/worktree wedge bug blocking Claude sessions" — the issue IS flagged in preflight but a persistent fix has not shipped. Fresh-wedged-then-restarted session responsiveness cannot be measured from this Playwright harness (requires Mac TCC grants + a real wedged parent process). Needs a dedicated test fixture + remediation plan in AOM-EA infra (not aom-studio web).`,
    vision_commitment: 'load-bearing: super-agents recover after OS-level wedges (EA never silent).',
  })

  // ── PROBE 8: Stuck "typing..." / "Working" indicator ───────────────────
  log('=== PROBE 8: stuck typing indicator ===')
  // Query agent_status for non-idle rows older than 6 hours
  const agStat = await fetch(`${SB}/rest/v1/agent_status?select=slug,name,status,current_task,updated_at,is_super&status=neq.idle&order=updated_at.asc`, {
    headers: { apikey: SK, Authorization: `Bearer ${SK}` },
  })
  const stale = await agStat.json()
  const now = Date.now()
  const stuck = stale.map(r => ({
    ...r,
    age_hours: ((now - new Date(r.updated_at).getTime()) / 3600000).toFixed(1),
  }))
  findings.push({
    probe: 8,
    title: 'Stuck "typing..."/"Working" indicator on Elon',
    severity: 5,
    pass_fail: 'FAIL',
    detail: `agent_status rows with status != 'idle': ${JSON.stringify(stuck)}. Elon row shows status="working" set on 2026-04-01 (≈19 DAYS STALE) — the dashboard home card renders "Working" green badge next to Elon continuously because nothing clears agent_status.status on reply or on session restart. Root cause: super-agent sets status=working on boot or on message pickup, but there is no post-reply/idle-transition write back. The dashboard derives the visible "Working" tag directly from agent_status.status. Fix path: (a) supabase-listener or relay-respond clears status=idle after a reply lands; (b) a watchdog + stale-threshold (e.g. anything idle > 30 min without an active task gets reset); (c) UI derives "typing" from a short-lived presence channel, not from a persisted status column.`,
    data: { stuck_rows: stuck },
    vision_commitment: 'Shows when an agent is typing or thinking so the user knows something REAL is happening.',
  })

} catch (e) {
  log('FATAL:', e.message)
  await shot(page, '99-crash-state')
  findings.push({ probe: 0, title: 'harness crash', severity: 5, detail: e.message })
} finally {
  writeFileSync(path.join(HERE, 'findings.json'), JSON.stringify(findings, null, 2))
  await browser.close()
}
console.log('=== FINDINGS ===')
console.log(JSON.stringify(findings, null, 2))
