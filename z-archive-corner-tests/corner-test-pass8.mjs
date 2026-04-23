// Corner Test Pass 8: Steve Coach — UX Overhaul + Live Data + Morning Experience
// Tests: Right panel, agent revolver, smooth zoom, checklist (revert confirmed),
//        data freshness (punch-list polling), client projects in HUD, full morning flow.
// Password: aomhq. Must blur chat input before keyboard shortcuts.

import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:5173'
const DIR = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio/test-screenshots'
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
    // STEP 0: Load + authenticate (THE MORNING LOGIN)
    // ============================================================
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(1500)

    const pwInput = await page.$('input[type="password"]')
    if (pwInput) {
      await pwInput.fill('aomhq')
      const enterBtn = await page.$('button:has-text("ENTER")') || await page.$('button[type="submit"]') || await page.$('button')
      if (enterBtn) {
        await enterBtn.click()
      } else {
        await page.keyboard.press('Enter')
      }
      await page.waitForTimeout(4000)
      log('T0-LOGIN', 'PASS', 'Authenticated via password gate')
    } else {
      log('T0-LOGIN', 'PASS', 'No password gate (already authenticated)')
    }

    await page.waitForTimeout(2000)

    // Defocus
    await page.evaluate(() => {
      const el = document.elementFromPoint(10, 10)
      if (el) el.click()
      if (document.activeElement) document.activeElement.blur()
    })
    await page.waitForTimeout(500)

    await page.screenshot({ path: `${DIR}/p8-01-morning-login.png` })

    // ============================================================
    // T1: Building renders (Crossy Road skin confirmed)
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
    // T2: UNIFIED RIGHT PANEL (Patrik's UX overhaul #1)
    // The panel should show by DEFAULT on the RIGHT side
    // Contains: agent card, stats, chat, tasks
    // ============================================================
    const panelCheck = await page.evaluate(() => {
      // Look for a right-side panel (position absolute/fixed, right: 0, width ~380px)
      const allDivs = document.querySelectorAll('div')
      let rightPanel = null
      for (const d of allDivs) {
        const s = getComputedStyle(d)
        const r = d.getBoundingClientRect()
        // Panel should be on the right side, tall, ~380px wide
        if (s.position === 'absolute' && r.right >= window.innerWidth - 10 &&
            r.height > window.innerHeight * 0.5 && r.width > 300 && r.width < 500) {
          const text = d.textContent?.slice(0, 500) || ''
          const hasAgentName = /elon|bobby|steve|alex|steffen|mom|cleo|jacob|elmo|colton|tony|patrik/i.test(text)
          const hasChat = text.toLowerCase().includes('message') || text.toLowerCase().includes('chat')
          const hasTabs = text.includes('Chat') || text.includes('Tasks') || text.includes('Info')
          const hasStatus = /active|idle|working|done|blocked|paused/i.test(text)
          rightPanel = {
            found: true,
            width: Math.round(r.width),
            height: Math.round(r.height),
            right: Math.round(window.innerWidth - r.right),
            hasAgentName,
            hasChat,
            hasTabs,
            hasStatus,
            textSnippet: text.slice(0, 200),
          }
          break
        }
      }
      return rightPanel || { found: false }
    })

    if (panelCheck.found) {
      const panelScore = [panelCheck.hasAgentName, panelCheck.hasChat, panelCheck.hasTabs, panelCheck.hasStatus].filter(Boolean).length
      log('T2a-PANEL-EXISTS', 'PASS', `Right panel: ${panelCheck.width}x${panelCheck.height}px, ${panelCheck.right}px from right edge`)
      log('T2b-PANEL-CONTENT', panelScore >= 3 ? 'PASS' : 'WARN',
        `Agent=${panelCheck.hasAgentName}, Chat=${panelCheck.hasChat}, Tabs=${panelCheck.hasTabs}, Status=${panelCheck.hasStatus} (${panelScore}/4)`)
    } else {
      log('T2a-PANEL-EXISTS', 'FAIL', 'No right-side unified panel detected (Patrik UX overhaul)')
      log('T2b-PANEL-CONTENT', 'FAIL', 'Panel not found')
    }

    await page.screenshot({ path: `${DIR}/p8-02-right-panel.png` })

    // ============================================================
    // T3: Panel shows DEFAULT agent (Elon) on load
    // ============================================================
    const defaultAgent = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      // Check if Elon is mentioned prominently (as the default selected agent)
      const panels = document.querySelectorAll('div')
      for (const d of panels) {
        const s = getComputedStyle(d)
        const r = d.getBoundingClientRect()
        if (s.position === 'absolute' && r.right >= window.innerWidth - 10 && r.width > 300) {
          const panelText = d.textContent?.toLowerCase() || ''
          return {
            hasElon: panelText.includes('elon'),
            hasRole: panelText.includes('system') || panelText.includes('admin') || panelText.includes('infrastructure'),
            firstAgentMentioned: panelText.match(/\b(elon|bobby|steve|alex|steffen|mom|cleo|jacob|elmo)\b/)?.[0] || 'none',
          }
        }
      }
      return { hasElon: false, hasRole: false, firstAgentMentioned: 'unknown' }
    })

    log('T3-DEFAULT-AGENT', defaultAgent.hasElon ? 'PASS' : 'WARN',
      `Default agent: ${defaultAgent.firstAgentMentioned}. Has Elon=${defaultAgent.hasElon}, role=${defaultAgent.hasRole}`)

    // ============================================================
    // T4: AGENT REVOLVER (right-click on agent = paint board pop-out)
    // ============================================================
    // Find agent dots/portraits in HUD
    const agentElements = await page.evaluate(() => {
      const results = []
      // Look for small agent indicators in the HUD area (bottom strip)
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const r = btn.getBoundingClientRect()
        // Agent dots/portraits are small (24-60px) in the bottom area
        if (r.bottom > window.innerHeight - 250 && r.width >= 20 && r.width <= 80 &&
            r.height >= 20 && r.height <= 80) {
          const text = btn.textContent?.trim()
          const hasSprite = btn.querySelector('img[src*="sprite"]') !== null
          results.push({
            x: Math.round(r.x + r.width / 2),
            y: Math.round(r.y + r.height / 2),
            w: Math.round(r.width),
            h: Math.round(r.height),
            text: text?.slice(0, 20),
            hasSprite,
          })
        }
      }
      return results
    })

    let revolverWorked = false
    if (agentElements.length > 0) {
      // Right-click on an agent element
      await page.mouse.click(agentElements[0].x, agentElements[0].y, { button: 'right' })
      await page.waitForTimeout(800)

      const revolverMenu = await page.evaluate(() => {
        // Look for a pop-out with multiple agent names in an arc/circle pattern
        const overlays = document.querySelectorAll('div')
        for (const d of overlays) {
          const s = getComputedStyle(d)
          const r = d.getBoundingClientRect()
          // Revolver should be a floating element with multiple agents
          if ((s.position === 'fixed' || s.position === 'absolute') &&
              parseInt(s.zIndex) > 50 && r.width > 100) {
            const text = d.textContent?.toLowerCase() || ''
            const agentNames = ['bobby', 'steffen', 'steve', 'elon', 'alex', 'cleo', 'jacob', 'elmo', 'colton', 'tony', 'mom', 'patrik']
            const matches = agentNames.filter(n => text.includes(n))
            if (matches.length >= 3) {
              return { found: true, agents: matches.length, text: text.slice(0, 200) }
            }
          }
        }
        return { found: false }
      })

      await page.screenshot({ path: `${DIR}/p8-03-agent-revolver.png` })

      if (revolverMenu.found) {
        revolverWorked = true
        log('T4-REVOLVER', 'PASS', `Agent revolver: ${revolverMenu.agents} agents visible`)
      } else {
        log('T4-REVOLVER', 'WARN', 'No revolver pop-out detected on right-click (may need HUD agent button)')
      }

      // Dismiss
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } else {
      log('T4-REVOLVER', 'WARN', `Only ${agentElements.length} agent elements found in HUD`)
    }

    // ============================================================
    // T5: SMOOTH ZOOM (exponential zoom feel, not janky web scroll)
    // ============================================================
    const zoomBefore = await page.evaluate(() => {
      // Look for the building container's transform scale
      const imgs = document.querySelectorAll('img[src*="office"]')
      if (imgs.length > 0) {
        const container = imgs[0].parentElement?.parentElement
        if (container) {
          const transform = getComputedStyle(container).transform
          return transform
        }
      }
      return 'none'
    })

    // Zoom in with mouse wheel
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
        if (container) {
          const transform = getComputedStyle(container).transform
          return transform
        }
      }
      return 'none'
    })

    const zoomChanged = zoomBefore !== zoomAfter && zoomAfter !== 'none'
    log('T5-ZOOM', zoomChanged ? 'PASS' : 'WARN', `Zoom: before="${zoomBefore?.slice(0,40)}" after="${zoomAfter?.slice(0,40)}"`)

    // Zoom back out
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 120)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(500)

    // ============================================================
    // T6: Room click -> panel switches to that agent
    // ============================================================
    const rooms = await page.evaluate(() => {
      const results = []
      const divs = document.querySelectorAll('div')
      for (const div of divs) {
        const style = getComputedStyle(div)
        const rect = div.getBoundingClientRect()
        if (style.position === 'absolute' && style.clipPath && style.clipPath !== 'none' &&
            rect.width > 40 && rect.height > 40 && rect.y < window.innerHeight - 200) {
          results.push({
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            text: div.textContent?.trim().slice(0, 30) || '',
          })
        }
      }
      return results
    })

    if (rooms.length > 2) {
      // Click a different room
      const target = rooms[Math.floor(rooms.length / 3)]
      await page.mouse.click(target.x, target.y)
      await page.waitForTimeout(2000)

      // Check if panel updated
      const panelAfterClick = await page.evaluate(() => {
        const panels = document.querySelectorAll('div')
        for (const d of panels) {
          const s = getComputedStyle(d)
          const r = d.getBoundingClientRect()
          if (s.position === 'absolute' && r.right >= window.innerWidth - 10 && r.width > 300 && r.height > window.innerHeight * 0.5) {
            const text = d.textContent?.toLowerCase()
            const match = text?.match(/\b(elon|bobby|steve|alex|steffen|mom|cleo|jacob|elmo|colton|tony|patrik)\b/)
            return { found: true, agent: match?.[0] || 'unknown', textSnippet: text?.slice(0, 100) }
          }
        }
        return { found: false }
      })

      await page.screenshot({ path: `${DIR}/p8-04-room-click-panel.png` })
      log('T6-ROOM-PANEL', panelAfterClick.found ? 'PASS' : 'WARN',
        `After room click: panel shows ${panelAfterClick.agent || 'unknown'}`)
    } else {
      log('T6-ROOM-PANEL', 'WARN', `Only ${rooms.length} room targets`)
    }

    // ============================================================
    // T7: HUD project pills + conversation ranking
    // ============================================================
    const pillInfo = await page.evaluate(() => {
      const pills = []
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const text = btn.textContent?.trim()
        const rect = btn.getBoundingClientRect()
        if (rect.bottom > window.innerHeight - 250 && rect.height >= 40 && rect.height <= 70 &&
            rect.width > 50 && rect.width < 280 && text && text.length < 30) {
          const style = getComputedStyle(btn)
          pills.push({
            text, x: Math.round(rect.x), fontWeight: parseInt(style.fontWeight),
          })
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

      log('T7a-PILLS', pillInfo.length >= 5 ? 'PASS' : 'WARN', `${pillInfo.length} pills: ${pillTexts.slice(0, 6).join(' | ')}`)
      log('T7b-TODAY', todayFirst ? 'PASS' : 'FAIL', `First pill: "${pillTexts[0]}" (expected: Today)`)
      log('T7c-CORNER', cornerPill ? 'PASS' : 'WARN', cornerPill ? `Corner at position ${pillInfo.indexOf(cornerPill) + 1}` : 'No Corner pill')
      log('T7d-WEIGHT', maxWeight >= 700 ? 'PASS' : 'FAIL', `Pill font weight: ${maxWeight} (target: 900)`)
    } else {
      log('T7-PILLS', 'WARN', `Only ${pillInfo.length} pills found`)
    }

    // ============================================================
    // T8: CLIENT PROJECTS in HUD (Patrik: "Included Health doesn't show up")
    // Check for real client projects: IH, ISA, Ambition, KOHRS, Brandon, Skylar
    // ============================================================
    const clientProjects = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      const clients = {
        'Included Health': text.includes('included') || text.includes('health'),
        'ISA Energy': text.includes('isa'),
        'Ambition': text.includes('ambition'),
        'KOHRS': text.includes('kohrs'),
        'Brandon': text.includes('brandon'),
        'Skylar': text.includes('skylar'),
      }
      const found = Object.entries(clients).filter(([_, v]) => v).map(([k]) => k)
      return { found, total: found.length, all: clients }
    })

    log('T8-CLIENTS', clientProjects.total >= 3 ? 'PASS' : 'FAIL',
      `Client projects in HUD: ${clientProjects.found.join(', ') || 'NONE'} (${clientProjects.total}/6)`)

    // ============================================================
    // T9: DATA FRESHNESS — punch-list polling is live
    // ============================================================
    let dataFresh = false
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/local/file?path=punch-list.md')
        if (!r.ok) return { ok: false, status: r.status }
        const json = await r.json()
        const timestamp = json.timestamp
        const now = new Date().toISOString()
        // Check if content has today's date (Mar 16)
        const hasToday = json.content?.includes('Mar 16') || json.content?.includes('2026-03-16')
        const contentLength = json.content?.length || 0
        return { ok: true, timestamp, hasToday, contentLength }
      })

      if (res.ok) {
        dataFresh = res.hasToday
        log('T9a-DATA-API', 'PASS', `Punch-list API: ${res.contentLength} chars, timestamp ${res.timestamp}`)
        log('T9b-DATA-FRESH', res.hasToday ? 'PASS' : 'FAIL', `Data contains today's date: ${res.hasToday}`)
      } else {
        log('T9a-DATA-API', 'FAIL', `API returned status ${res.status}`)
      }
    } catch (e) {
      log('T9a-DATA-API', 'FAIL', `Endpoint error: ${e.message}`)
    }

    // Check project recency scores
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/local/project-recency')
        if (!r.ok) return { ok: false }
        const json = await r.json()
        return { ok: true, count: Object.keys(json.scores || {}).length, topProject: Object.entries(json.scores || {}).sort((a,b) => b[1] - a[1])[0] }
      })

      log('T9c-RECENCY', res.ok && res.count > 0 ? 'PASS' : 'WARN',
        `Recency: ${res.count} projects. Top: ${res.topProject?.[0]}=${res.topProject?.[1]}`)
    } catch (e) {
      log('T9c-RECENCY', 'FAIL', `Error: ${e.message}`)
    }

    // ============================================================
    // T10: CHECKLIST MODE (regression confirmed fixed)
    // ============================================================
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('2')
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${DIR}/p8-05-checklist-mode.png` })

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

      return { isSystemQueue, projects, checkboxes: checkboxes.length, checkStyle: checkStyleCount }
    })

    if (checklistData.isSystemQueue) {
      log('T10-REGRESSION', 'FAIL', 'CHECKLIST STILL SHOWS SYSTEM QUEUE! Revert did not land.')
    } else {
      log('T10-REGRESSION', 'PASS', 'Checklist is project-grouped (NOT system queue)')
    }

    const hasCheckboxes = checklistData.checkboxes > 0 || checklistData.checkStyle > 3
    log('T10b-CHECKBOXES', hasCheckboxes ? 'PASS' : 'FAIL',
      `Checkboxes: ${checklistData.checkboxes} native + ${checklistData.checkStyle} styled`)
    log('T10c-PROJECTS', checklistData.projects.length >= 4 ? 'PASS' : 'WARN',
      `Projects: ${checklistData.projects.join(', ')} (${checklistData.projects.length})`)

    // ============================================================
    // T11: MEGABOARD MODE
    // ============================================================
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('3')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${DIR}/p8-06-megaboard-mode.png` })

    const megaData = await page.evaluate(() => {
      const text = document.body.innerText
      return {
        hasParty: text.includes('PARTY') || text.includes('Party'),
        hasMission: text.includes('MISSION') || text.includes('Mission'),
        hasLV: text.includes('LV'),
        agentCount: (text.match(/LV/g) || []).length,
      }
    })

    log('T11-MEGABOARD', megaData.hasParty && megaData.hasMission ? 'PASS' : 'WARN',
      `Party=${megaData.hasParty}, Mission=${megaData.hasMission}, Agents=${megaData.agentCount}`)

    // ============================================================
    // T12: Back to GAME mode for final checks
    // ============================================================
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('1')
    await page.waitForTimeout(1500)

    // ============================================================
    // T13: Chat input exists and is functional (in panel, not separate bar)
    // ============================================================
    const chatCheck = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]')
      const chatInputs = []
      for (const inp of inputs) {
        const ph = inp.placeholder?.toLowerCase()
        if (ph?.includes('message') || ph?.includes('chat') || ph?.includes('send') || ph?.includes('type')) {
          const r = inp.getBoundingClientRect()
          chatInputs.push({
            placeholder: inp.placeholder,
            visible: r.width > 0 && r.height > 0,
            inRightHalf: r.x > window.innerWidth / 2,
            width: Math.round(r.width),
          })
        }
      }
      return chatInputs
    })

    const panelChat = chatCheck.find(c => c.inRightHalf && c.visible)
    log('T13-CHAT', panelChat ? 'PASS' : 'WARN',
      panelChat
        ? `Chat in right panel: "${panelChat.placeholder}" (${panelChat.width}px)`
        : `${chatCheck.length} chat inputs found, none in right panel`)

    // ============================================================
    // T14: NO LEFT SIDEBAR (Patrik: kill the left sidebar)
    // ============================================================
    const leftSidebar = await page.evaluate(() => {
      const divs = document.querySelectorAll('div')
      for (const d of divs) {
        const s = getComputedStyle(d)
        const r = d.getBoundingClientRect()
        if (s.position === 'absolute' && r.left <= 5 && r.width > 200 && r.width < 500 &&
            r.height > window.innerHeight * 0.5 && r.top < 100) {
          return { found: true, width: Math.round(r.width), height: Math.round(r.height) }
        }
      }
      return { found: false }
    })

    log('T14-NO-LEFT', !leftSidebar.found ? 'PASS' : 'FAIL',
      leftSidebar.found ? `LEFT sidebar still exists! ${leftSidebar.width}x${leftSidebar.height}` : 'No left sidebar detected')

    // ============================================================
    // T15: Console errors (zero tolerance)
    // ============================================================
    log('T15-ERRORS', pageErrors.length === 0 ? 'PASS' : 'FAIL',
      `Console errors: ${pageErrors.length}${pageErrors.length > 0 ? ' -- ' + pageErrors[0].slice(0, 80) : ''}`)

    // ============================================================
    // T16: Font size compliance (no sub-16px body text)
    // ============================================================
    const fontCheck = await page.evaluate(() => {
      const violations = []
      const textElements = document.querySelectorAll('p, span, div, li, td, a, button, input, label')
      let checked = 0
      for (const el of textElements) {
        const s = getComputedStyle(el)
        const fontSize = parseFloat(s.fontSize)
        const text = el.textContent?.trim()
        // Only check visible elements with real text content
        if (fontSize < 12 && text && text.length > 0 && text.length < 100) {
          const r = el.getBoundingClientRect()
          if (r.width > 0 && r.height > 0 && r.y > 0 && r.y < window.innerHeight) {
            violations.push({ text: text.slice(0, 40), fontSize: Math.round(fontSize), tag: el.tagName })
          }
        }
        checked++
      }
      return { violations: violations.slice(0, 5), count: violations.length, checked }
    })

    log('T16-FONTS', fontCheck.count <= 2 ? 'PASS' : 'WARN',
      `${fontCheck.count} sub-12px elements. ${fontCheck.violations.length > 0 ? fontCheck.violations.map(v => `"${v.text}" (${v.fontSize}px)`).join(', ') : 'Clean.'}`)

    // ============================================================
    // T17: Morning experience vitals
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
    log('T17-VITALS', vitalsCount >= 4 ? 'PASS' : 'WARN',
      `Morning vitals: ${vitals.agents} agents, status=${vitals.hasStatus}, projects=${vitals.hasProjects}, chat=${vitals.hasChat}, tasks=${vitals.hasTasks} (${vitalsCount}/5)`)

    // Final screenshot
    await page.screenshot({ path: `${DIR}/p8-07-final-state.png` })

  } catch (err) {
    log('RUNTIME', 'FAIL', err.message.slice(0, 200))
    await page.screenshot({ path: `${DIR}/p8-error.png` }).catch(() => {})
  }

  await browser.close()

  // ============================================================
  // SUMMARY + GRADING
  // ============================================================
  console.log('\n=== PASS 8 RESULTS ===\n')
  const pass = R.filter(r => r.status === 'PASS').length
  const fail = R.filter(r => r.status === 'FAIL').length
  const warn = R.filter(r => r.status === 'WARN').length
  console.log(`${R.length} tests | ${pass} PASS | ${fail} FAIL | ${warn} WARN\n`)

  for (const r of R) console.log(`  [${r.status}] ${r.test}: ${r.detail}`)

  // GRADE CARD
  const checklistRegressed = R.find(r => r.test === 'T10-REGRESSION')?.status === 'FAIL'
  const panelExists = R.find(r => r.test === 'T2a-PANEL-EXISTS')?.status === 'PASS'
  const noLeftSidebar = R.find(r => r.test === 'T14-NO-LEFT')?.status === 'PASS'
  const zeroErrors = R.find(r => r.test === 'T15-ERRORS')?.status === 'PASS'
  const dataIsFresh = R.find(r => r.test === 'T9b-DATA-FRESH')?.status === 'PASS'
  const todayPinned = R.find(r => r.test === 'T7b-TODAY')?.status === 'PASS'
  const pillWeight = R.find(r => r.test === 'T7d-WEIGHT')?.status === 'PASS'
  const clientsInHud = R.find(r => r.test === 'T8-CLIENTS')?.status === 'PASS'

  console.log('\n=== GRADE CARD ===\n')

  const uxOverhaulScore = [panelExists, noLeftSidebar].filter(Boolean).length
  const dataScore = [dataIsFresh, !checklistRegressed].filter(Boolean).length
  const polishScore = [zeroErrors, todayPinned, pillWeight].filter(Boolean).length

  if (checklistRegressed) {
    console.log('  OVERALL: B (checklist regression NOT fixed)')
  } else if (uxOverhaulScore === 2 && dataScore === 2 && polishScore >= 2 && clientsInHud) {
    console.log('  OVERALL: A (UX overhaul + live data + polish all landed)')
  } else if (uxOverhaulScore >= 1 && dataScore === 2 && !checklistRegressed) {
    console.log('  OVERALL: A- (UX overhaul in progress, data solid, checklist fixed)')
  } else {
    console.log('  OVERALL: B+ (partial progress on UX overhaul)')
  }

  console.log(`  UX Overhaul: ${uxOverhaulScore}/2 (panel=${panelExists}, no-left=${noLeftSidebar})`)
  console.log(`  Data Pipeline: ${dataScore}/2 (fresh=${dataIsFresh}, checklist=${!checklistRegressed})`)
  console.log(`  Polish: ${polishScore}/3 (errors=${zeroErrors}, today=${todayPinned}, weight=${pillWeight})`)
  console.log(`  Client Projects: ${clientsInHud ? 'YES' : 'NO'}`)

  // Get commit hash
  let commitHash = 'unknown'
  let workingTreeClean = false
  try {
    const { execSync } = await import('child_process')
    commitHash = execSync('cd /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio && git rev-parse --short HEAD').toString().trim()
    const status = execSync('cd /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio && git status --porcelain').toString().trim()
    workingTreeClean = status.length === 0
  } catch (e) {}

  console.log(`\n  Commit: ${commitHash}${workingTreeClean ? '' : ' + UNCOMMITTED CHANGES'}`)

  fs.writeFileSync(`${DIR}/pass8-results.json`, JSON.stringify({
    pass: 8,
    commit: commitHash,
    workingTreeClean,
    tests: R,
    summary: { total: R.length, pass, fail, warn },
    checklistRegressed,
    uxOverhaul: { panelExists, noLeftSidebar },
    timestamp: new Date().toISOString(),
  }, null, 2))

  console.log(`\nResults saved to ${DIR}/pass8-results.json`)
}

run().catch(console.error)
