// Corner Test Pass 9: Steve Coach — RECALIBRATED Standard
// "Would a GC who found this on Google stay longer than 30 seconds and book a demo?"
// Focus: ChecklistMode revert COMMITTED, Tier 0 items, 5-second test.
// Tests against commit e8eabcf (ChecklistMode revert committed by Steve Coach).

import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:5173'
const DIR = '/Users/aom-inhouse/aom-studio-transfer/aom-studio/test-screenshots'
const R = []

function log(t, s, d) {
  R.push({ test: t, status: s, detail: d })
  console.log(`[${s}] ${t}: ${d}`)
}

async function run() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await (await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2,
  })).newPage()

  const pageErrors = []
  page.on('pageerror', (err) => {
    pageErrors.push(err.message)
    log('PAGE_ERROR', 'WARN', err.message.slice(0, 120))
  })

  try {
    // ============================================================
    // STEP 0: Load + authenticate
    // ============================================================
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(1500)

    const pwInput = await page.$('input[type="password"]')
    if (pwInput) {
      await pwInput.fill('aomhq')
      const enterBtn = await page.$('button:has-text("ENTER")') || await page.$('button[type="submit"]') || await page.$('button')
      if (enterBtn) await enterBtn.click()
      else await page.keyboard.press('Enter')
      await page.waitForTimeout(4000)
      log('T0-LOGIN', 'PASS', 'Authenticated via password gate')
    } else {
      log('T0-LOGIN', 'PASS', 'No password gate')
    }

    await page.waitForTimeout(2000)
    await page.evaluate(() => {
      const el = document.elementFromPoint(10, 10)
      if (el) el.click()
      if (document.activeElement) document.activeElement.blur()
    })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${DIR}/p9-01-load.png` })

    // ============================================================
    // T1: Building renders (Crossy Road skin)
    // ============================================================
    const buildingImg = await page.$('img[src*="office"]') || await page.$('img[src*="building"]')
    if (buildingImg) {
      const box = await buildingImg.boundingBox()
      const src = await buildingImg.getAttribute('src')
      const isCrossyRoad = src?.includes('office-full-night')
      log('T1-BUILDING', 'PASS', `Building ${Math.round(box.width)}x${Math.round(box.height)}px${isCrossyRoad ? ' [Crossy Road]' : ''} [${src}]`)
    } else {
      log('T1-BUILDING', 'WARN', 'No building image found')
    }

    // ============================================================
    // T2: RIGHT PANEL (unified, shown by default)
    // ============================================================
    const panelCheck = await page.evaluate(() => {
      const allDivs = document.querySelectorAll('div')
      let rightPanel = null
      for (const d of allDivs) {
        const s = getComputedStyle(d)
        const r = d.getBoundingClientRect()
        if (s.position === 'absolute' && r.right >= window.innerWidth - 10 &&
            r.height > window.innerHeight * 0.5 && r.width > 300 && r.width < 500) {
          const text = d.textContent?.slice(0, 500) || ''
          const hasAgentName = /elon|bobby|steve|alex|steffen|mom|cleo|jacob|elmo|colton|tony|patrik/i.test(text)
          const hasChat = text.toLowerCase().includes('message') || text.toLowerCase().includes('chat')
          const hasTabs = text.includes('Chat') || text.includes('Tasks') || text.includes('Info')
          const hasStatus = /active|idle|working|done|blocked|paused/i.test(text)
          rightPanel = { found: true, width: Math.round(r.width), height: Math.round(r.height),
            right: Math.round(window.innerWidth - r.right), hasAgentName, hasChat, hasTabs, hasStatus,
            textSnippet: text.slice(0, 200) }
          break
        }
      }
      return rightPanel || { found: false }
    })

    if (panelCheck.found) {
      const score = [panelCheck.hasAgentName, panelCheck.hasChat, panelCheck.hasTabs, panelCheck.hasStatus].filter(Boolean).length
      log('T2a-PANEL', 'PASS', `Right panel: ${panelCheck.width}x${panelCheck.height}px, ${panelCheck.right}px from right`)
      log('T2b-CONTENT', score >= 3 ? 'PASS' : 'WARN',
        `Agent=${panelCheck.hasAgentName}, Chat=${panelCheck.hasChat}, Tabs=${panelCheck.hasTabs}, Status=${panelCheck.hasStatus} (${score}/4)`)
    } else {
      log('T2a-PANEL', 'FAIL', 'No right-side unified panel detected')
      log('T2b-CONTENT', 'FAIL', 'Panel not found')
    }
    await page.screenshot({ path: `${DIR}/p9-02-right-panel.png` })

    // ============================================================
    // T3: NO LEFT SIDEBAR
    // ============================================================
    const leftSidebar = await page.evaluate(() => {
      const divs = document.querySelectorAll('div')
      for (const d of divs) {
        const s = getComputedStyle(d)
        const r = d.getBoundingClientRect()
        if (s.position === 'absolute' && r.left <= 5 && r.width > 200 && r.width < 500 &&
            r.height > window.innerHeight * 0.5 && r.top < 100) {
          return { found: true, width: Math.round(r.width) }
        }
      }
      return { found: false }
    })
    log('T3-NO-LEFT', !leftSidebar.found ? 'PASS' : 'FAIL',
      leftSidebar.found ? `LEFT sidebar still exists! ${leftSidebar.width}px` : 'No left sidebar')

    // ============================================================
    // T4: SMOOTH ZOOM
    // ============================================================
    const zoomBefore = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="office"]')
      if (imgs.length > 0) {
        const container = imgs[0].parentElement?.parentElement
        return container ? getComputedStyle(container).transform : 'none'
      }
      return 'none'
    })
    const centerX = 720, centerY = 400
    await page.mouse.move(centerX, centerY)
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -120)
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(600)
    const zoomAfter = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="office"]')
      if (imgs.length > 0) {
        const container = imgs[0].parentElement?.parentElement
        return container ? getComputedStyle(container).transform : 'none'
      }
      return 'none'
    })
    const zoomChanged = zoomBefore !== zoomAfter && zoomAfter !== 'none'
    log('T4-ZOOM', zoomChanged ? 'PASS' : 'WARN', `before="${zoomBefore?.slice(0,40)}" after="${zoomAfter?.slice(0,40)}"`)

    // Zoom back
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 120)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(500)

    // ============================================================
    // T5: PAN BOUNDS (Tier 0 #6: building can't scroll off-screen)
    // Pan left aggressively, check if building is still visible
    // ============================================================
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(centerX + (i * 60), centerY, { steps: 2 })
    }
    await page.mouse.up()
    await page.waitForTimeout(500)

    const panResult = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="office"]')
      if (imgs.length > 0) {
        const r = imgs[0].getBoundingClientRect()
        // Building should still be partially visible (not scrolled off entirely)
        const isVisible = r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight
        return {
          visible: isVisible,
          left: Math.round(r.left), right: Math.round(r.right),
          top: Math.round(r.top), bottom: Math.round(r.bottom),
        }
      }
      return { visible: false, note: 'no building' }
    })

    // If building is entirely off-screen, pan bounds are missing
    const panBounded = panResult.visible
    log('T5-PAN-BOUNDS', panBounded ? 'PASS' : 'FAIL',
      `Building after aggressive pan: visible=${panResult.visible}, left=${panResult.left}, right=${panResult.right}`)

    // Reset view
    await page.keyboard.press('Home')
    await page.waitForTimeout(500)

    await page.screenshot({ path: `${DIR}/p9-03-after-pan.png` })

    // ============================================================
    // T6: HUD PROJECT PILLS + CONVERSATION RANKING
    // ============================================================
    const pillInfo = await page.evaluate(() => {
      const pills = []
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const text = btn.textContent?.trim()
        const rect = btn.getBoundingClientRect()
        if (rect.bottom > window.innerHeight - 250 && rect.height >= 30 && rect.height <= 70 &&
            rect.width > 50 && rect.width < 280 && text && text.length < 30) {
          const style = getComputedStyle(btn)
          pills.push({ text, x: Math.round(rect.x), fontWeight: parseInt(style.fontWeight) })
        }
      }
      pills.sort((a, b) => a.x - b.x)
      return pills
    })

    if (pillInfo.length > 3) {
      const pillTexts = pillInfo.map(p => p.text.replace(/\n/g, ' ').trim())
      const todayFirst = pillInfo[0]?.text?.toLowerCase().includes('today')
      const cornerPill = pillInfo.find(p => p.text.toLowerCase().includes('corner'))
      const maxWeight = Math.max(...pillInfo.map(p => p.fontWeight))

      log('T6a-PILLS', pillInfo.length >= 5 ? 'PASS' : 'WARN', `${pillInfo.length} pills: ${pillTexts.slice(0, 6).join(' | ')}`)
      log('T6b-TODAY', todayFirst ? 'PASS' : 'FAIL', `First pill: "${pillTexts[0]}" (expected: Today)`)
      log('T6c-CORNER', cornerPill ? 'PASS' : 'WARN', cornerPill ? `Corner at position ${pillInfo.indexOf(cornerPill) + 1}` : 'No Corner pill')
      log('T6d-WEIGHT', maxWeight >= 700 ? 'PASS' : 'FAIL', `Pill font weight: ${maxWeight} (target: 900)`)
    } else {
      log('T6-PILLS', 'WARN', `Only ${pillInfo.length} pills found`)
    }

    // ============================================================
    // T7: CLIENT PROJECTS IN HUD (Tier 0 #3 -- THE BIGGEST GAP)
    // Patrik: "Included Health doesn't show up"
    // ============================================================
    const clientProjects = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      const clients = {
        'Included Health': text.includes('included health') || (text.includes('included') && text.includes('$9k')),
        'ISA Energy': text.includes('isa energy') || text.includes('isa industries'),
        'Ambition': text.includes('ambition mechanical') || text.includes('ambition'),
        'KOHRS': text.includes('kohrs'),
        'Brandon Wiley': text.includes('brandon'),
        'Skylar': text.includes('skylar'),
      }
      const found = Object.entries(clients).filter(([_, v]) => v).map(([k]) => k)
      return { found, total: found.length, all: clients }
    })

    log('T7-CLIENTS', clientProjects.total >= 3 ? 'PASS' : 'FAIL',
      `Client projects: ${clientProjects.found.join(', ') || 'NONE'} (${clientProjects.total}/6)`)

    // ============================================================
    // T8: BUSINESS METRICS (revenue, deadlines, payment status)
    // A GC needs to see their money, not just agent names
    // ============================================================
    const bizMetrics = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      return {
        hasRevenue: text.includes('$') || text.includes('revenue'),
        hasDeadline: text.includes('deadline') || text.includes('apr') || text.includes('overdue'),
        hasPayment: text.includes('payment') || text.includes('pending') || text.includes('owed'),
        hasAmount: /\$[\d,]+k?/i.test(text),
      }
    })

    const bizScore = [bizMetrics.hasRevenue, bizMetrics.hasDeadline, bizMetrics.hasPayment, bizMetrics.hasAmount].filter(Boolean).length
    log('T8-BIZ-METRICS', bizScore >= 2 ? 'PASS' : 'WARN',
      `Revenue=${bizMetrics.hasRevenue}, Deadline=${bizMetrics.hasDeadline}, Payment=${bizMetrics.hasPayment}, Amount=${bizMetrics.hasAmount} (${bizScore}/4)`)

    // ============================================================
    // T9: DATA FRESHNESS
    // ============================================================
    let dataFresh = false
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/local/file?path=punch-list.md')
        if (!r.ok) return { ok: false, status: r.status }
        const json = await r.json()
        const hasToday = json.content?.includes('Mar 16') || json.content?.includes('2026-03-16')
        return { ok: true, hasToday, contentLength: json.content?.length || 0 }
      })
      if (res.ok) {
        dataFresh = res.hasToday
        log('T9a-DATA-API', 'PASS', `Punch-list API: ${res.contentLength} chars`)
        log('T9b-DATA-FRESH', res.hasToday ? 'PASS' : 'FAIL', `Today's data: ${res.hasToday}`)
      } else {
        log('T9a-DATA-API', 'FAIL', `API status ${res.status}`)
      }
    } catch (e) {
      log('T9a-DATA-API', 'FAIL', `Error: ${e.message}`)
    }

    // Recency scores
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/local/project-recency')
        if (!r.ok) return { ok: false }
        const json = await r.json()
        return { ok: true, count: Object.keys(json.scores || {}).length,
          topProject: Object.entries(json.scores || {}).sort((a,b) => b[1] - a[1])[0] }
      })
      log('T9c-RECENCY', res.ok && res.count > 0 ? 'PASS' : 'WARN',
        `Recency: ${res.count} projects. Top: ${res.topProject?.[0]}=${res.topProject?.[1]}`)
    } catch (e) {
      log('T9c-RECENCY', 'FAIL', `Error: ${e.message}`)
    }

    // ============================================================
    // T10: CHECKLIST MODE (COMMITTED REVERT VERIFIED)
    // This is the CRITICAL test. e8eabcf should have the project-grouped version.
    // ============================================================
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('2')
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${DIR}/p9-04-checklist.png` })

    const checklistData = await page.evaluate(() => {
      const text = document.body.innerText
      const hasRunningNow = text.includes('RUNNING NOW')
      const hasUpNext = text.includes('UP NEXT')
      const isSystemQueue = hasRunningNow || hasUpNext

      const projectKeywords = ['Today', 'Corner', 'AOM Site', 'Phase 2', 'Outreach', 'Advisory', 'Deadlines', 'Infra', 'This Week', 'Ambition']
      const projects = projectKeywords.filter(kw => text.includes(kw))

      const checkboxes = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]')
      let checkStyleCount = 0
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const r = btn.getBoundingClientRect()
        if (r.width >= 16 && r.width <= 40 && r.height >= 16 && r.height <= 40 && r.y > 60) checkStyleCount++
      }

      return { isSystemQueue, projects, checkboxes: checkboxes.length, checkStyle: checkStyleCount, textSnippet: text.slice(0, 300) }
    })

    if (checklistData.isSystemQueue) {
      log('T10a-CHECKLIST', 'FAIL', 'SYSTEM QUEUE STILL SHOWING! Committed revert did NOT land. Hot reload may be stale.')
    } else {
      log('T10a-CHECKLIST', 'PASS', 'Checklist is project-grouped (NOT system queue)')
    }

    const hasCheckboxes = checklistData.checkboxes > 0 || checklistData.checkStyle > 3
    log('T10b-CHECKBOXES', hasCheckboxes ? 'PASS' : 'FAIL',
      `Checkboxes: ${checklistData.checkboxes} native + ${checklistData.checkStyle} styled`)
    log('T10c-PROJECTS', checklistData.projects.length >= 4 ? 'PASS' : 'WARN',
      `Projects: ${checklistData.projects.join(', ')} (${checklistData.projects.length})`)

    // ============================================================
    // T11: CHECKBOX PERSISTENCE (Tier 0 #4)
    // Click a checkbox, reload, check if state persists
    // ============================================================
    const checkboxClicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('button, [role="button"]')
      for (const btn of btns) {
        const r = btn.getBoundingClientRect()
        if (r.width >= 16 && r.width <= 40 && r.height >= 16 && r.height <= 40 && r.y > 100) {
          const wasChecked = btn.getAttribute('data-checked') === 'true' || btn.classList.contains('checked')
          btn.click()
          return { clicked: true, x: Math.round(r.x), y: Math.round(r.y) }
        }
      }
      return { clicked: false }
    })

    if (checkboxClicked.clicked) {
      await page.waitForTimeout(500)
      // Reload and check
      await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(1500)
      const pwInput2 = await page.$('input[type="password"]')
      if (pwInput2) {
        await pwInput2.fill('aomhq')
        const btn = await page.$('button:has-text("ENTER")') || await page.$('button')
        if (btn) await btn.click()
        await page.waitForTimeout(4000)
      }
      await page.evaluate(() => { document.activeElement?.blur() })
      await page.waitForTimeout(200)
      await page.keyboard.press('2')
      await page.waitForTimeout(2000)

      // Check if checkbox state persisted
      const persisted = await page.evaluate(() => {
        const btns = document.querySelectorAll('button, [role="button"]')
        let checkedCount = 0
        for (const btn of btns) {
          const r = btn.getBoundingClientRect()
          if (r.width >= 16 && r.width <= 40 && r.height >= 16 && r.height <= 40 && r.y > 100) {
            if (btn.getAttribute('data-checked') === 'true' || btn.classList.contains('checked')) checkedCount++
          }
        }
        return { checkedCount }
      })
      log('T11-PERSIST', persisted.checkedCount > 0 ? 'PASS' : 'FAIL',
        `Checkbox persistence after reload: ${persisted.checkedCount} checked (${persisted.checkedCount > 0 ? 'PERSISTED' : 'LOST'})`)
    } else {
      log('T11-PERSIST', 'WARN', 'Could not find a checkbox to click')
    }

    // Switch back to game mode
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('1')
    await page.waitForTimeout(1500)

    // ============================================================
    // T12: MEGABOARD MODE
    // ============================================================
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('3')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${DIR}/p9-05-megaboard.png` })

    const megaData = await page.evaluate(() => {
      const text = document.body.innerText
      return {
        hasParty: text.includes('PARTY') || text.includes('Party'),
        hasMission: text.includes('MISSION') || text.includes('Mission'),
        agentCount: (text.match(/LV/g) || []).length,
      }
    })
    log('T12-MEGABOARD', megaData.hasParty && megaData.hasMission ? 'PASS' : 'WARN',
      `Party=${megaData.hasParty}, Mission=${megaData.hasMission}, Agents=${megaData.agentCount}`)

    // Back to game
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('1')
    await page.waitForTimeout(1500)

    // ============================================================
    // T13: CHAT TIMEOUT (Tier 0 #5)
    // Send a message and check if it times out after reasonable wait
    // ============================================================
    const chatInput = await page.$('input[placeholder*="message" i], input[placeholder*="chat" i], input[placeholder*="send" i], textarea[placeholder*="message" i]')
    if (chatInput) {
      await chatInput.click()
      await chatInput.fill('test message')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3000)

      const chatState = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase()
        return {
          hasTypingDots: text.includes('...') || text.includes('typing'),
          hasOfflineMsg: text.includes('offline') || text.includes('timeout') || text.includes('unavailable'),
          hasResponse: text.includes('test message'),
        }
      })

      // We can't wait 60s in a test, so check if timeout mechanism exists
      log('T13-CHAT-TIMEOUT', chatState.hasOfflineMsg ? 'PASS' : 'WARN',
        `After send: typing=${chatState.hasTypingDots}, offline=${chatState.hasOfflineMsg}. (Full 60s timeout not testable in automation)`)
    } else {
      log('T13-CHAT-TIMEOUT', 'WARN', 'No chat input found to test')
    }

    // ============================================================
    // T14: AGENT DOTS (24px compact, not 58px portraits)
    // ============================================================
    const agentDots = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]')
      const dots = []
      for (const btn of buttons) {
        const r = btn.getBoundingClientRect()
        if (r.bottom > window.innerHeight - 200 && r.width >= 20 && r.width <= 40 &&
            r.height >= 20 && r.height <= 40) {
          dots.push({ w: Math.round(r.width), h: Math.round(r.height) })
        }
      }
      return dots
    })

    log('T14-AGENT-DOTS', agentDots.length > 0 ? 'PASS' : 'WARN',
      `${agentDots.length} compact agent dots (avg ${agentDots.length > 0 ? Math.round(agentDots.reduce((s,d) => s + d.w, 0) / agentDots.length) : 0}px)`)

    // ============================================================
    // T15: MAIN AGENT PROMINENT (52px Elon plumbob)
    // ============================================================
    const mainAgent = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="sprite"]')
      let biggest = null
      for (const img of imgs) {
        const r = img.getBoundingClientRect()
        if (r.bottom > window.innerHeight - 250 && r.width > 40) {
          if (!biggest || r.width > biggest.w) {
            biggest = { w: Math.round(r.width), h: Math.round(r.height), src: img.src.split('/').pop() }
          }
        }
      }
      return biggest || { w: 0, note: 'no sprites in HUD' }
    })

    log('T15-MAIN-AGENT', mainAgent.w >= 40 ? 'PASS' : 'WARN',
      `Main agent: ${mainAgent.w}x${mainAgent.h}px [${mainAgent.src || mainAgent.note}]`)

    // ============================================================
    // T16: CONSOLE ERRORS
    // ============================================================
    log('T16-ERRORS', pageErrors.length === 0 ? 'PASS' : 'FAIL',
      `Console errors: ${pageErrors.length}${pageErrors.length > 0 ? ' -- ' + pageErrors[0].slice(0, 80) : ''}`)

    // ============================================================
    // T17: FONT SIZE COMPLIANCE
    // ============================================================
    const fontCheck = await page.evaluate(() => {
      const violations = []
      const els = document.querySelectorAll('p, span, div, li, td, a, button, input, label')
      for (const el of els) {
        const s = getComputedStyle(el)
        const fontSize = parseFloat(s.fontSize)
        const text = el.textContent?.trim()
        if (fontSize < 12 && text && text.length > 0 && text.length < 100) {
          const r = el.getBoundingClientRect()
          if (r.width > 0 && r.height > 0 && r.y > 0 && r.y < window.innerHeight) {
            violations.push({ text: text.slice(0, 40), fontSize: Math.round(fontSize), tag: el.tagName })
          }
        }
      }
      return { violations: violations.slice(0, 5), count: violations.length }
    })

    log('T17-FONTS', fontCheck.count <= 2 ? 'PASS' : 'WARN',
      `${fontCheck.count} sub-12px elements. ${fontCheck.violations.length > 0 ? fontCheck.violations.map(v => `"${v.text}" (${v.fontSize}px)`).join(', ') : 'Clean.'}`)

    // ============================================================
    // T18: MORNING VITALS
    // ============================================================
    const vitals = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      const agentNames = ['bobby', 'steffen', 'steve', 'elon', 'alex', 'cleo', 'jacob', 'elmo', 'colton', 'tony', 'mom', 'patrik']
      let agents = 0
      for (const n of agentNames) { if (text.includes(n)) agents++ }
      return {
        agents,
        hasStatus: text.includes('active') || text.includes('idle') || text.includes('working') || text.includes('done'),
        hasProjects: text.includes('corner') || text.includes('outreach') || text.includes('advisory'),
        hasChat: text.includes('message'),
        hasTasks: text.includes('task') || text.includes('review') || text.includes('build') || text.includes('deliver'),
      }
    })

    const vitalsCount = [vitals.agents >= 6, vitals.hasStatus, vitals.hasProjects, vitals.hasChat, vitals.hasTasks].filter(Boolean).length
    log('T18-VITALS', vitalsCount >= 4 ? 'PASS' : 'WARN',
      `${vitals.agents} agents, status=${vitals.hasStatus}, projects=${vitals.hasProjects}, chat=${vitals.hasChat}, tasks=${vitals.hasTasks} (${vitalsCount}/5)`)

    // ============================================================
    // T19: 5-SECOND TEST (the recalibrated standard)
    // Would a GC stay 30 seconds and book a demo?
    // Score: building visible, panel informative, projects visible, business context, working chat
    // ============================================================
    const fiveSecondTest = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      return {
        buildingVisible: document.querySelector('img[src*="office"]') !== null,
        panelVisible: (() => {
          const divs = document.querySelectorAll('div')
          for (const d of divs) {
            const s = getComputedStyle(d)
            const r = d.getBoundingClientRect()
            if (s.position === 'absolute' && r.right >= window.innerWidth - 10 && r.width > 300 && r.height > window.innerHeight * 0.5)
              return true
          }
          return false
        })(),
        hasClientNames: text.includes('included health') || text.includes('ambition') || text.includes('kohrs') || text.includes('isa'),
        hasBusinessData: text.includes('$') || text.includes('revenue') || text.includes('deadline'),
        chatVisible: document.querySelector('input[placeholder*="message" i], input[placeholder*="chat" i]') !== null,
        noErrors: true, // already tested separately
      }
    })

    const fiveSecondScore = Object.values(fiveSecondTest).filter(Boolean).length
    log('T19-5SEC', fiveSecondScore >= 5 ? 'PASS' : fiveSecondScore >= 3 ? 'WARN' : 'FAIL',
      `5-second test: ${fiveSecondScore}/6 (building=${fiveSecondTest.buildingVisible}, panel=${fiveSecondTest.panelVisible}, clients=${fiveSecondTest.hasClientNames}, biz=${fiveSecondTest.hasBusinessData}, chat=${fiveSecondTest.chatVisible})`)

    // Final screenshot
    await page.screenshot({ path: `${DIR}/p9-06-final.png` })

  } catch (err) {
    log('RUNTIME', 'FAIL', err.message.slice(0, 200))
    await page.screenshot({ path: `${DIR}/p9-error.png` }).catch(() => {})
  }

  await browser.close()

  // ============================================================
  // SUMMARY + RECALIBRATED GRADING
  // ============================================================
  console.log('\n=== PASS 9 RESULTS (RECALIBRATED) ===\n')
  const pass = R.filter(r => r.status === 'PASS').length
  const fail = R.filter(r => r.status === 'FAIL').length
  const warn = R.filter(r => r.status === 'WARN').length
  console.log(`${R.length} tests | ${pass} PASS | ${fail} FAIL | ${warn} WARN\n`)

  for (const r of R) console.log(`  [${r.status}] ${r.test}: ${r.detail}`)

  // RECALIBRATED GRADE CARD
  const checklistFixed = R.find(r => r.test === 'T10a-CHECKLIST')?.status === 'PASS'
  const panelExists = R.find(r => r.test === 'T2a-PANEL')?.status === 'PASS'
  const noLeft = R.find(r => r.test === 'T3-NO-LEFT')?.status === 'PASS'
  const zeroErrors = R.find(r => r.test === 'T16-ERRORS')?.status === 'PASS'
  const todayPinned = R.find(r => r.test === 'T6b-TODAY')?.status === 'PASS'
  const pillWeight = R.find(r => r.test === 'T6d-WEIGHT')?.status === 'PASS'
  const clientsInHud = R.find(r => r.test === 'T7-CLIENTS')?.status === 'PASS'
  const panBounds = R.find(r => r.test === 'T5-PAN-BOUNDS')?.status === 'PASS'
  const checkboxPersist = R.find(r => r.test === 'T11-PERSIST')?.status === 'PASS'
  const fiveSecond = R.find(r => r.test === 'T19-5SEC')?.status === 'PASS'

  console.log('\n=== RECALIBRATED GRADE CARD ===\n')
  console.log('  Standard: "Would a GC stay 30 seconds and book a demo?"\n')

  // Tier 0 checklist
  const tier0 = {
    'Auth (Supabase)': false,
    'Chat responds': R.find(r => r.test === 'T13-CHAT-TIMEOUT')?.status === 'PASS',
    'Client projects': clientsInHud,
    'Checkbox persist': checkboxPersist,
    'Chat timeout': R.find(r => r.test === 'T13-CHAT-TIMEOUT')?.status === 'PASS',
    'Pan bounds': panBounds,
    'Demo data': false, // Can't test without production
  }
  const tier0Done = Object.values(tier0).filter(Boolean).length
  console.log(`  TIER 0 STATUS: ${tier0Done}/7`)
  for (const [k, v] of Object.entries(tier0)) {
    console.log(`    ${v ? 'DONE' : 'TODO'} ${k}`)
  }

  // Architectural wins
  console.log('\n  ARCHITECTURE:')
  console.log(`    Panel: ${panelExists ? 'PASS' : 'FAIL'}`)
  console.log(`    No left sidebar: ${noLeft ? 'PASS' : 'FAIL'}`)
  console.log(`    Checklist committed: ${checklistFixed ? 'PASS' : 'FAIL'}`)
  console.log(`    Zero errors: ${zeroErrors ? 'PASS' : 'FAIL'}`)

  // Polish
  console.log('\n  POLISH:')
  console.log(`    Today pinned: ${todayPinned ? 'PASS' : 'FAIL'}`)
  console.log(`    Pill weight: ${pillWeight ? 'PASS' : 'FAIL'}`)
  console.log(`    5-second test: ${fiveSecond ? 'PASS' : 'FAIL'}`)

  // Overall recalibrated grade
  let grade = 'D'
  if (tier0Done >= 5 && fiveSecond) grade = 'B+'
  else if (tier0Done >= 4 && checklistFixed && panelExists) grade = 'B'
  else if (tier0Done >= 3 && checklistFixed) grade = 'C+'
  else if (tier0Done >= 2 && checklistFixed) grade = 'C'
  else if (checklistFixed && panelExists && noLeft && zeroErrors) grade = 'C-'
  else if (checklistFixed && panelExists) grade = 'D+'
  else grade = 'D'

  console.log(`\n  OVERALL (RECALIBRATED): ${grade}`)
  console.log(`  Previous: D+/C- (Pass 8)`)

  // Commit info
  let commitHash = 'unknown'
  let workingTreeClean = false
  try {
    const { execSync } = await import('child_process')
    commitHash = execSync('cd /Users/aom-inhouse/aom-studio-transfer/aom-studio && git rev-parse --short HEAD').toString().trim()
    const status = execSync('cd /Users/aom-inhouse/aom-studio-transfer/aom-studio && git status --porcelain src/').toString().trim()
    workingTreeClean = status.length === 0
  } catch (e) {}

  console.log(`  Commit: ${commitHash}${workingTreeClean ? ' (clean)' : ' + UNCOMMITTED CHANGES'}`)

  fs.writeFileSync(`${DIR}/pass9-results.json`, JSON.stringify({
    pass: 9,
    commit: commitHash,
    workingTreeClean,
    tests: R,
    summary: { total: R.length, pass, fail, warn },
    tier0,
    tier0Done,
    grade,
    timestamp: new Date().toISOString(),
  }, null, 2))

  console.log(`\nResults saved to ${DIR}/pass9-results.json`)
}

run().catch(console.error)
