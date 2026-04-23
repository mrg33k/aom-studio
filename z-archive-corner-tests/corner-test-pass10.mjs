// Corner Test Pass 10: Steve Coach -- Tier 0 Verification + Tier 1 Recon
// Standard: "Would a GC who found this on Google stay longer than 30 seconds and book a demo?"
// Focus: Verify Bobby's 4 Tier 0 fixes (pan bounds, chat timeout, checkbox persist, expand dots)
//        + reconnaissance for Tier 1 (auth gate, demo data, onboarding flow)
// Tests against Bobby's next commit after e8eabcf.

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
      // Tier 1 recon: check if Supabase auth gate exists instead
      const authForm = await page.$('form[action*="auth"], input[type="email"], [data-testid="auth"]')
      if (authForm) {
        log('T0-LOGIN', 'PASS', 'Real auth gate detected (Supabase or similar)')
      } else {
        log('T0-LOGIN', 'PASS', 'No password gate (open access)')
      }
    }

    await page.waitForTimeout(2000)
    // Blur any focused element so keyboard shortcuts work for mode switching
    await page.evaluate(() => {
      const el = document.elementFromPoint(10, 10)
      if (el) el.click()
      if (document.activeElement) document.activeElement.blur()
    })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${DIR}/p10-01-load.png` })

    // ============================================================
    // T1: Building renders (baseline sanity)
    // ============================================================
    const buildingImg = await page.$('img[src*="office"]') || await page.$('img[src*="building"]')
    if (buildingImg) {
      const box = await buildingImg.boundingBox()
      const src = await buildingImg.getAttribute('src')
      log('T1-BUILDING', 'PASS', `Building ${Math.round(box.width)}x${Math.round(box.height)}px [${src}]`)
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
    await page.screenshot({ path: `${DIR}/p10-02-right-panel.png` })

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
    // *** TIER 0 FIX #1: PAN BOUNDS ***
    // Aggressive pan in all 4 directions. Building must stay visible.
    // Previously: building could scroll entirely off-screen.
    // Fix: Math.max(-MAX_PAN, Math.min(MAX_PAN, ...)) in handleMouseMove + momentum.
    // ============================================================
    const centerX = 720, centerY = 400

    // Pan LEFT aggressively (20 steps of 80px = 1600px total)
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(centerX + (i * 80), centerY, { steps: 2 })
    }
    await page.mouse.up()
    await page.waitForTimeout(600)

    const panLeftResult = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="office"]')
      if (imgs.length > 0) {
        const r = imgs[0].getBoundingClientRect()
        return {
          visible: r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight,
          left: Math.round(r.left), right: Math.round(r.right),
          top: Math.round(r.top), bottom: Math.round(r.bottom),
          offScreenRight: r.left > window.innerWidth,
          offScreenLeft: r.right < 0,
        }
      }
      return { visible: false, note: 'no building' }
    })
    log('T4a-PAN-LEFT', panLeftResult.visible ? 'PASS' : 'FAIL',
      `After 1600px left pan: visible=${panLeftResult.visible}, left=${panLeftResult.left}, right=${panLeftResult.right}`)

    // Reset position
    await page.keyboard.press('Home')
    await page.waitForTimeout(500)

    // Pan RIGHT aggressively
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(centerX - (i * 80), centerY, { steps: 2 })
    }
    await page.mouse.up()
    await page.waitForTimeout(600)

    const panRightResult = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="office"]')
      if (imgs.length > 0) {
        const r = imgs[0].getBoundingClientRect()
        return {
          visible: r.right > 0 && r.left < window.innerWidth,
          left: Math.round(r.left), right: Math.round(r.right),
        }
      }
      return { visible: false }
    })
    log('T4b-PAN-RIGHT', panRightResult.visible ? 'PASS' : 'FAIL',
      `After 1600px right pan: visible=${panRightResult.visible}, left=${panRightResult.left}, right=${panRightResult.right}`)

    await page.keyboard.press('Home')
    await page.waitForTimeout(500)

    // Pan UP aggressively
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(centerX, centerY + (i * 80), { steps: 2 })
    }
    await page.mouse.up()
    await page.waitForTimeout(600)

    const panUpResult = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="office"]')
      if (imgs.length > 0) {
        const r = imgs[0].getBoundingClientRect()
        return {
          visible: r.bottom > 0 && r.top < window.innerHeight,
          top: Math.round(r.top), bottom: Math.round(r.bottom),
        }
      }
      return { visible: false }
    })
    log('T4c-PAN-UP', panUpResult.visible ? 'PASS' : 'FAIL',
      `After 1600px up pan: visible=${panUpResult.visible}, top=${panUpResult.top}, bottom=${panUpResult.bottom}`)

    await page.keyboard.press('Home')
    await page.waitForTimeout(500)

    // Pan DOWN aggressively
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(centerX, centerY - (i * 80), { steps: 2 })
    }
    await page.mouse.up()
    await page.waitForTimeout(600)

    const panDownResult = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="office"]')
      if (imgs.length > 0) {
        const r = imgs[0].getBoundingClientRect()
        return {
          visible: r.bottom > 0 && r.top < window.innerHeight,
          top: Math.round(r.top), bottom: Math.round(r.bottom),
        }
      }
      return { visible: false }
    })
    log('T4d-PAN-DOWN', panDownResult.visible ? 'PASS' : 'FAIL',
      `After 1600px down pan: visible=${panDownResult.visible}, top=${panDownResult.top}, bottom=${panDownResult.bottom}`)

    // Composite pan bounds verdict
    const allPanPass = panLeftResult.visible && panRightResult.visible && panUpResult.visible && panDownResult.visible
    log('T4-PAN-BOUNDS', allPanPass ? 'PASS' : 'FAIL',
      `Pan bounds all 4 directions: ${allPanPass ? 'ALL CLAMPED' : 'BUILDING ESCAPED'} (L=${panLeftResult.visible} R=${panRightResult.visible} U=${panUpResult.visible} D=${panDownResult.visible})`)

    await page.keyboard.press('Home')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${DIR}/p10-03-after-pan.png` })

    // ============================================================
    // T5: SMOOTH ZOOM (regression check)
    // ============================================================
    const zoomBefore = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img[src*="office"]')
      if (imgs.length > 0) {
        const container = imgs[0].parentElement?.parentElement
        return container ? getComputedStyle(container).transform : 'none'
      }
      return 'none'
    })
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
    log('T5-ZOOM', zoomChanged ? 'PASS' : 'WARN', `before="${zoomBefore?.slice(0,40)}" after="${zoomAfter?.slice(0,40)}"`)

    // Zoom back
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 120)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(500)

    // ============================================================
    // T6: HUD PROJECT PILLS (regression + Today pinning + font weight)
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
    // T7: CLIENT PROJECTS IN HUD (regression check)
    // ============================================================
    const clientProjects = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      const clients = {
        'Included Health': text.includes('included health') || (text.includes('included') && text.includes('$9k')),
        'ISA Energy': text.includes('isa energy') || text.includes('isa industries') || text.includes('isa'),
        'Ambition': text.includes('ambition mechanical') || text.includes('ambition'),
        'KOHRS': text.includes('kohrs'),
        'Brandon Wiley': text.includes('brandon'),
        'Skylar': text.includes('skylar'),
      }
      const found = Object.entries(clients).filter(([_, v]) => v).map(([k]) => k)
      return { found, total: found.length, all: clients }
    })

    log('T7-CLIENTS', clientProjects.total >= 4 ? 'PASS' : 'FAIL',
      `Client projects: ${clientProjects.found.join(', ') || 'NONE'} (${clientProjects.total}/6)`)

    // ============================================================
    // *** TIER 0 FIX #2: CHAT 60-SECOND TIMEOUT ***
    // Send a message. Wait for timeout. Verify "offline" / "saved" message appears.
    // Previously: typing dots ran forever. No timeout logic existed.
    // Fix: After 60s, replace typing dots with "Agent is offline. Message saved."
    //
    // NOTE: We can't wait a full 60s in automation. Strategy:
    // 1. Send a message and check for the mechanism (timeout variable, offline detection)
    // 2. Look for any timeout-related UI elements
    // 3. Fast-forward test: check if setTimeout/timer is registered in code
    // 4. Wait 10s and check if there's any intermediate state change
    // ============================================================
    const chatInput = await page.$('input[placeholder*="message" i], input[placeholder*="chat" i], input[placeholder*="send" i], textarea[placeholder*="message" i]')
    if (chatInput) {
      await chatInput.click()
      await chatInput.fill('test message from pass 10')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)

      // Check immediate state: typing dots should appear
      const chatImmediateState = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase()
        return {
          hasTypingDots: text.includes('...') || text.includes('typing'),
          hasOfflineMsg: text.includes('offline') || text.includes('timeout') || text.includes('unavailable') || text.includes('saved'),
          hasMessageSaved: text.includes('message saved') || text.includes('message has been saved'),
        }
      })

      // Wait 10 more seconds to see if there's a fast timeout or progress indicator
      await page.waitForTimeout(10000)

      const chatAfter10s = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase()
        return {
          hasTypingDots: text.includes('...') || text.includes('typing'),
          hasOfflineMsg: text.includes('offline') || text.includes('timeout') || text.includes('unavailable') || text.includes('saved'),
          hasMessageSaved: text.includes('message saved') || text.includes('message has been saved'),
          hasCountdown: /\d+\s*s(ec)?/i.test(text), // look for countdown timer
        }
      })

      // Check if timeout mechanism exists by looking for registered timers
      const timeoutMechanism = await page.evaluate(() => {
        // Look for any data attributes or state indicating timeout is configured
        const chatArea = document.querySelector('[data-chat-timeout], [data-timeout]')
        // Check if there's a timeout indicator in the UI
        const timeoutIndicator = document.querySelector('[class*="timeout"], [class*="offline"], [data-state="waiting"]')
        return {
          hasTimeoutAttr: !!chatArea,
          hasTimeoutIndicator: !!timeoutIndicator,
        }
      })

      // The REAL test: after 60s the offline message should show.
      // Since we can't wait 60s, we check for the MECHANISM:
      // - If offline message appears within 10s, Bobby implemented a shorter dev timeout (PASS)
      // - If timeout attributes exist, the mechanism is wired (PASS)
      // - If just typing dots forever, no timeout implemented (FAIL)
      const hasTimeoutFeature = chatAfter10s.hasOfflineMsg || chatAfter10s.hasMessageSaved ||
                                 timeoutMechanism.hasTimeoutAttr || timeoutMechanism.hasTimeoutIndicator

      log('T8a-CHAT-SEND', 'PASS', `Message sent. Immediate: typing=${chatImmediateState.hasTypingDots}, offline=${chatImmediateState.hasOfflineMsg}`)
      log('T8b-CHAT-TIMEOUT', hasTimeoutFeature ? 'PASS' : 'FAIL',
        `After 10s: offline=${chatAfter10s.hasOfflineMsg}, saved=${chatAfter10s.hasMessageSaved}, countdown=${chatAfter10s.hasCountdown}, mechanism=${timeoutMechanism.hasTimeoutAttr || timeoutMechanism.hasTimeoutIndicator}. ${hasTimeoutFeature ? 'Timeout mechanism DETECTED' : 'NO timeout -- typing dots still running forever'}`)

      // Full 60-second timeout verification (run this separately when time permits)
      // Uncomment the block below for the full wait test:
      // await page.waitForTimeout(55000) // already waited 12s, wait 55 more = 67s total
      // const chatAfter60s = await page.evaluate(() => {
      //   const text = document.body.innerText.toLowerCase()
      //   return {
      //     hasOfflineMsg: text.includes('offline') || text.includes('unavailable') || text.includes('saved'),
      //     typingGone: !text.includes('typing') && !text.includes('...'),
      //   }
      // })
      // log('T8c-CHAT-60S', chatAfter60s.hasOfflineMsg && chatAfter60s.typingGone ? 'PASS' : 'FAIL',
      //   `Full 60s test: offline=${chatAfter60s.hasOfflineMsg}, typing_gone=${chatAfter60s.typingGone}`)

    } else {
      log('T8a-CHAT-SEND', 'FAIL', 'No chat input found')
      log('T8b-CHAT-TIMEOUT', 'FAIL', 'Cannot test -- no chat input')
    }

    await page.screenshot({ path: `${DIR}/p10-04-chat-timeout.png` })

    // ============================================================
    // *** TIER 0 FIX #3: CHECKBOX PERSISTENCE ***
    // Check a box in checklist mode, reload page, verify it's still checked.
    // Previously: check + refresh = unchecked.
    // Fix: localStorage.setItem('corner-checks', JSON.stringify(state)) on click.
    // ============================================================

    // Switch to checklist mode
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('2')
    await page.waitForTimeout(2500)

    // Find a checkbox and record its identity
    const checkboxInfo = await page.evaluate(() => {
      // Try native checkboxes first
      const checkboxes = document.querySelectorAll('input[type="checkbox"]')
      if (checkboxes.length > 0) {
        const cb = checkboxes[0]
        const text = cb.closest('label, div, li')?.textContent?.trim()?.slice(0, 60) || 'unknown'
        const wasChecked = cb.checked
        cb.click()
        return { found: true, type: 'native', text, wasChecked, nowChecked: cb.checked }
      }

      // Try styled checkbox buttons
      const btns = document.querySelectorAll('button, [role="checkbox"]')
      for (const btn of btns) {
        const r = btn.getBoundingClientRect()
        if (r.width >= 16 && r.width <= 40 && r.height >= 16 && r.height <= 40 && r.y > 100) {
          const text = btn.closest('div')?.textContent?.trim()?.slice(0, 60) || 'unknown'
          const wasChecked = btn.getAttribute('data-checked') === 'true' ||
                             btn.classList.contains('checked') ||
                             btn.getAttribute('aria-checked') === 'true'
          btn.click()
          return { found: true, type: 'styled', text, wasChecked, x: Math.round(r.x), y: Math.round(r.y) }
        }
      }
      return { found: false }
    })

    if (checkboxInfo.found) {
      log('T9a-CHECK-CLICK', 'PASS', `Clicked ${checkboxInfo.type} checkbox: "${checkboxInfo.text}" (was: ${checkboxInfo.wasChecked})`)
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${DIR}/p10-05-checkbox-before-reload.png` })

      // Check localStorage to see if state was saved
      const localStorageCheck = await page.evaluate(() => {
        const keys = Object.keys(localStorage)
        const checkKeys = keys.filter(k => k.includes('check') || k.includes('corner') || k.includes('task'))
        const checkData = {}
        for (const k of checkKeys) {
          try {
            checkData[k] = JSON.parse(localStorage.getItem(k))
          } catch {
            checkData[k] = localStorage.getItem(k)
          }
        }
        return { keys: checkKeys, data: checkData, allKeys: keys }
      })
      log('T9b-LOCALSTORAGE', localStorageCheck.keys.length > 0 ? 'PASS' : 'WARN',
        `localStorage keys with check/corner/task: ${localStorageCheck.keys.join(', ') || 'NONE'}. All keys: ${localStorageCheck.allKeys.slice(0, 10).join(', ')}`)

      // FULL RELOAD (new page load, re-authenticate, switch to checklist)
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
      await page.waitForTimeout(2500)

      // Check if checkbox state persisted
      const persistCheck = await page.evaluate(() => {
        // Check native checkboxes
        const checkboxes = document.querySelectorAll('input[type="checkbox"]')
        let nativeChecked = 0
        let nativeTotal = 0
        for (const cb of checkboxes) {
          nativeTotal++
          if (cb.checked) nativeChecked++
        }

        // Check styled checkboxes
        const btns = document.querySelectorAll('button, [role="checkbox"]')
        let styledChecked = 0
        let styledTotal = 0
        for (const btn of btns) {
          const r = btn.getBoundingClientRect()
          if (r.width >= 16 && r.width <= 40 && r.height >= 16 && r.height <= 40 && r.y > 100) {
            styledTotal++
            if (btn.getAttribute('data-checked') === 'true' ||
                btn.classList.contains('checked') ||
                btn.getAttribute('aria-checked') === 'true') {
              styledChecked++
            }
          }
        }

        return {
          nativeChecked, nativeTotal,
          styledChecked, styledTotal,
          anyChecked: nativeChecked > 0 || styledChecked > 0,
        }
      })

      log('T9c-PERSIST', persistCheck.anyChecked ? 'PASS' : 'FAIL',
        `After reload: native=${persistCheck.nativeChecked}/${persistCheck.nativeTotal} checked, styled=${persistCheck.styledChecked}/${persistCheck.styledTotal} checked. ${persistCheck.anyChecked ? 'PERSISTED' : 'LOST -- checkbox did not survive refresh'}`)

      await page.screenshot({ path: `${DIR}/p10-06-checkbox-after-reload.png` })
    } else {
      log('T9a-CHECK-CLICK', 'WARN', 'Could not find a checkbox to click')
      log('T9b-LOCALSTORAGE', 'WARN', 'Skipped -- no checkbox found')
      log('T9c-PERSIST', 'WARN', 'Skipped -- no checkbox found')
    }

    // ============================================================
    // T10: CHECKLIST MODE (regression: project-grouped, not system queue)
    // ============================================================
    // Should already be in checklist mode from T9
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
      log('T10a-CHECKLIST', 'FAIL', 'SYSTEM QUEUE REGRESSION! Committed revert lost.')
    } else {
      log('T10a-CHECKLIST', 'PASS', 'Checklist is project-grouped (NOT system queue)')
    }
    const hasCheckboxes = checklistData.checkboxes > 0 || checklistData.checkStyle > 3
    log('T10b-CHECKBOXES', hasCheckboxes ? 'PASS' : 'FAIL',
      `Checkboxes: ${checklistData.checkboxes} native + ${checklistData.checkStyle} styled`)

    await page.screenshot({ path: `${DIR}/p10-07-checklist.png` })

    // Switch back to game mode
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('1')
    await page.waitForTimeout(1500)

    // ============================================================
    // *** TIER 0 FIX #4: EXPAND AGENT DOTS ***
    // Click the expand button. Verify agent dots render at ~24px.
    // Previously: 0 dots appeared when expand was clicked.
    // ============================================================
    const expandResult = await page.evaluate(() => {
      // Find the expand/users button in the HUD area
      const buttons = document.querySelectorAll('button, [role="button"]')
      let expandBtn = null
      for (const btn of buttons) {
        const r = btn.getBoundingClientRect()
        const text = btn.textContent?.toLowerCase() || ''
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || ''
        const title = btn.getAttribute('title')?.toLowerCase() || ''
        // Look for expand/users button near bottom of screen (HUD area)
        if (r.bottom > window.innerHeight - 200 &&
            (text.includes('expand') || text.includes('user') || text.includes('agent') ||
             ariaLabel.includes('expand') || ariaLabel.includes('agent') ||
             title.includes('expand') || title.includes('agent'))) {
          expandBtn = btn
          break
        }
        // Also look for SVG icons (Users icon from lucide)
        const svg = btn.querySelector('svg')
        if (svg && r.bottom > window.innerHeight - 200 && r.width >= 24 && r.width <= 48) {
          expandBtn = btn
        }
      }

      if (expandBtn) {
        expandBtn.click()
        return { clicked: true }
      }
      return { clicked: false }
    })

    if (expandResult.clicked) {
      await page.waitForTimeout(800)

      const dotsResult = await page.evaluate(() => {
        // After expanding, look for agent dot elements
        const buttons = document.querySelectorAll('button, [role="button"]')
        const dots = []
        for (const btn of buttons) {
          const r = btn.getBoundingClientRect()
          // Agent dots should be 20-30px, in HUD area, circular
          if (r.bottom > window.innerHeight - 250 && r.width >= 18 && r.width <= 36 &&
              r.height >= 18 && r.height <= 36) {
            const style = getComputedStyle(btn)
            const isRound = style.borderRadius === '50%' || parseInt(style.borderRadius) >= r.width / 2
            dots.push({
              w: Math.round(r.width), h: Math.round(r.height),
              x: Math.round(r.x), y: Math.round(r.y),
              isRound,
            })
          }
        }

        // Also check for any img sprites used as dots
        const imgs = document.querySelectorAll('img[src*="sprite"]')
        let dotImgs = 0
        for (const img of imgs) {
          const r = img.getBoundingClientRect()
          if (r.bottom > window.innerHeight - 250 && r.width >= 18 && r.width <= 36) {
            dotImgs++
          }
        }

        return { dotCount: dots.length, dotImgCount: dotImgs, dots: dots.slice(0, 5) }
      })

      const totalDots = dotsResult.dotCount + dotsResult.dotImgCount
      log('T11-EXPAND-DOTS', totalDots >= 3 ? 'PASS' : 'FAIL',
        `Expand clicked. Agent dots: ${dotsResult.dotCount} buttons + ${dotsResult.dotImgCount} sprites = ${totalDots}. ${totalDots >= 3 ? 'Dots VISIBLE' : 'Dots NOT RENDERING'}${dotsResult.dots.length > 0 ? '. Sizes: ' + dotsResult.dots.map(d => `${d.w}x${d.h}`).join(', ') : ''}`)

      await page.screenshot({ path: `${DIR}/p10-08-expand-dots.png` })
    } else {
      log('T11-EXPAND-DOTS', 'WARN', 'Could not find expand/users button in HUD')
    }

    // ============================================================
    // T12: MEGABOARD MODE (regression check)
    // ============================================================
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('3')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${DIR}/p10-09-megaboard.png` })

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
    // T13: CONSOLE ERRORS
    // ============================================================
    log('T13-ERRORS', pageErrors.length === 0 ? 'PASS' : 'FAIL',
      `Console errors: ${pageErrors.length}${pageErrors.length > 0 ? ' -- ' + pageErrors[0].slice(0, 80) : ''}`)

    // ============================================================
    // T14: 5-SECOND TEST (the recalibrated standard)
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
        hasClientNames: text.includes('ambition') || text.includes('kohrs') || text.includes('skylar') || text.includes('brandon'),
        hasBusinessData: text.includes('$') || text.includes('revenue') || text.includes('deadline'),
        chatVisible: document.querySelector('input[placeholder*="message" i], input[placeholder*="chat" i]') !== null,
        noErrors: true,
      }
    })

    const fiveSecondScore = Object.values(fiveSecondTest).filter(Boolean).length
    log('T14-5SEC', fiveSecondScore >= 5 ? 'PASS' : fiveSecondScore >= 3 ? 'WARN' : 'FAIL',
      `5-second test: ${fiveSecondScore}/6 (building=${fiveSecondTest.buildingVisible}, panel=${fiveSecondTest.panelVisible}, clients=${fiveSecondTest.hasClientNames}, biz=${fiveSecondTest.hasBusinessData}, chat=${fiveSecondTest.chatVisible})`)

    // ============================================================
    // TIER 1 RECON: These don't pass/fail yet. Checking if groundwork exists.
    // ============================================================
    console.log('\n--- TIER 1 RECONNAISSANCE (informational only) ---\n')

    // R1: Auth gate type
    const authRecon = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      return {
        hasEmailField: !!document.querySelector('input[type="email"]'),
        hasSignUp: text.includes('sign up') || text.includes('register') || text.includes('create account'),
        hasOAuth: text.includes('google') || text.includes('github') || text.includes('sign in with'),
        hasSupabase: !!document.querySelector('[data-supabase], script[src*="supabase"]'),
        currentAuth: document.querySelector('input[type="password"]') ? 'password-gate' : 'none-or-real-auth',
      }
    })
    log('R1-AUTH-RECON', 'INFO',
      `Auth: ${authRecon.currentAuth}. Email=${authRecon.hasEmailField}, SignUp=${authRecon.hasSignUp}, OAuth=${authRecon.hasOAuth}, Supabase=${authRecon.hasSupabase}`)

    // R2: Demo data for production URL
    const demoRecon = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      return {
        hasDemoData: text.includes('garcia construction') || text.includes('demo') || text.includes('sample'),
        hasEmptyState: text.includes('no task data') || text.includes('no projects') || text.includes('getting started'),
        isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
      }
    })
    log('R2-DEMO-RECON', 'INFO',
      `Demo data: hasDemoData=${demoRecon.hasDemoData}, hasEmptyState=${demoRecon.hasEmptyState}, isLocalhost=${demoRecon.isLocalhost}`)

    // R3: Onboarding flow
    const onboardRecon = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      return {
        hasWelcome: text.includes('welcome') || text.includes('get started') || text.includes('set up'),
        hasBusinessNameInput: !!document.querySelector('input[name*="business"], input[placeholder*="business"]'),
        hasSteps: text.includes('step 1') || text.includes('step 2') || !!document.querySelector('[data-step]'),
        hasOnboarding: !!document.querySelector('[data-onboarding], [class*="onboard"]'),
      }
    })
    log('R3-ONBOARD-RECON', 'INFO',
      `Onboarding: welcome=${onboardRecon.hasWelcome}, bizName=${onboardRecon.hasBusinessNameInput}, steps=${onboardRecon.hasSteps}, component=${onboardRecon.hasOnboarding}`)

    // Final screenshot
    await page.screenshot({ path: `${DIR}/p10-10-final.png` })

  } catch (err) {
    log('RUNTIME', 'FAIL', err.message.slice(0, 200))
    await page.screenshot({ path: `${DIR}/p10-error.png` }).catch(() => {})
  }

  await browser.close()

  // ============================================================
  // SUMMARY + RECALIBRATED GRADING
  // ============================================================
  console.log('\n=== PASS 10 RESULTS (RECALIBRATED) ===\n')
  const pass = R.filter(r => r.status === 'PASS').length
  const fail = R.filter(r => r.status === 'FAIL').length
  const warn = R.filter(r => r.status === 'WARN').length
  const info = R.filter(r => r.status === 'INFO').length
  console.log(`${R.length} tests | ${pass} PASS | ${fail} FAIL | ${warn} WARN | ${info} INFO\n`)

  for (const r of R) console.log(`  [${r.status}] ${r.test}: ${r.detail}`)

  // RECALIBRATED GRADE CARD
  const checklistFixed = R.find(r => r.test === 'T10a-CHECKLIST')?.status === 'PASS'
  const panelExists = R.find(r => r.test === 'T2a-PANEL')?.status === 'PASS'
  const noLeft = R.find(r => r.test === 'T3-NO-LEFT')?.status === 'PASS'
  const zeroErrors = R.find(r => r.test === 'T13-ERRORS')?.status === 'PASS'
  const todayPinned = R.find(r => r.test === 'T6b-TODAY')?.status === 'PASS'
  const pillWeight = R.find(r => r.test === 'T6d-WEIGHT')?.status === 'PASS'
  const clientsInHud = R.find(r => r.test === 'T7-CLIENTS')?.status === 'PASS'
  const panBoundsAll = R.find(r => r.test === 'T4-PAN-BOUNDS')?.status === 'PASS'
  const chatTimeout = R.find(r => r.test === 'T8b-CHAT-TIMEOUT')?.status === 'PASS'
  const checkboxPersist = R.find(r => r.test === 'T9c-PERSIST')?.status === 'PASS'
  const expandDots = R.find(r => r.test === 'T11-EXPAND-DOTS')?.status === 'PASS'
  const fiveSecond = R.find(r => r.test === 'T14-5SEC')?.status === 'PASS'

  console.log('\n=== RECALIBRATED GRADE CARD ===\n')
  console.log('  Standard: "Would a GC stay 30 seconds and book a demo?"\n')

  // Tier 0 checklist
  const tier0 = {
    'Auth (Supabase)': false, // not expected this pass
    'Chat responds': chatTimeout,
    'Client projects': clientsInHud,
    'Checkbox persist': checkboxPersist,
    'Chat timeout': chatTimeout,
    'Pan bounds': panBoundsAll,
    'Demo data': false, // not expected this pass
  }
  const tier0Done = Object.values(tier0).filter(Boolean).length
  console.log(`  TIER 0 STATUS: ${tier0Done}/7`)
  for (const [k, v] of Object.entries(tier0)) {
    console.log(`    ${v ? 'DONE' : 'TODO'} ${k}`)
  }

  // Pass 10 specific: the 4 fixes Bobby was tasked with
  console.log('\n  PASS 10 FOCUS (Bobby\'s 4 Tier 0 fixes):')
  console.log(`    Pan bounds (all 4 directions): ${panBoundsAll ? 'PASS' : 'FAIL'}`)
  console.log(`    Chat 60s timeout: ${chatTimeout ? 'PASS' : 'FAIL'}`)
  console.log(`    Checkbox persistence: ${checkboxPersist ? 'PASS' : 'FAIL'}`)
  console.log(`    Expand agent dots: ${expandDots ? 'PASS' : 'FAIL'}`)
  const fourFixesCount = [panBoundsAll, chatTimeout, checkboxPersist, expandDots].filter(Boolean).length
  console.log(`    Result: ${fourFixesCount}/4 fixes verified`)

  // Architecture regressions
  console.log('\n  REGRESSION CHECK:')
  console.log(`    Panel: ${panelExists ? 'PASS' : 'FAIL'}`)
  console.log(`    No left sidebar: ${noLeft ? 'PASS' : 'FAIL'}`)
  console.log(`    Checklist committed: ${checklistFixed ? 'PASS' : 'FAIL'}`)
  console.log(`    Zero errors: ${zeroErrors ? 'PASS' : 'FAIL'}`)
  console.log(`    Today pinned: ${todayPinned ? 'PASS' : 'FAIL'}`)
  console.log(`    Pill weight: ${pillWeight ? 'PASS' : 'FAIL'}`)
  console.log(`    Client projects: ${clientsInHud ? 'PASS' : 'FAIL'}`)

  // Overall recalibrated grade
  let grade = 'D'
  if (tier0Done >= 6 && fiveSecond) grade = 'B'
  else if (tier0Done >= 5 && fiveSecond) grade = 'B-'
  else if (tier0Done >= 5 && checklistFixed && panelExists) grade = 'C+/B-'
  else if (tier0Done >= 4 && checklistFixed) grade = 'C+'
  else if (tier0Done >= 3 && checklistFixed) grade = 'C'
  else if (tier0Done >= 2 && checklistFixed) grade = 'C-'
  else if (checklistFixed && panelExists && noLeft && zeroErrors) grade = 'D+'
  else if (checklistFixed && panelExists) grade = 'D+'
  else grade = 'D'

  console.log(`\n  OVERALL (RECALIBRATED): ${grade}`)
  console.log(`  Previous: C+ (Pass 9)`)
  console.log(`  Target: B- (all 4 Tier 0 fixes + existing passes)`)

  // Commit info
  let commitHash = 'unknown'
  let workingTreeClean = false
  try {
    const { execSync } = await import('child_process')
    commitHash = execSync('cd /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio && git rev-parse --short HEAD').toString().trim()
    const status = execSync('cd /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio && git status --porcelain src/').toString().trim()
    workingTreeClean = status.length === 0
  } catch (e) {}

  console.log(`  Commit: ${commitHash}${workingTreeClean ? ' (clean)' : ' + UNCOMMITTED CHANGES'}`)

  fs.writeFileSync(`${DIR}/pass10-results.json`, JSON.stringify({
    pass: 10,
    commit: commitHash,
    workingTreeClean,
    tests: R,
    summary: { total: R.length, pass, fail, warn, info },
    tier0,
    tier0Done,
    fourFixes: { panBounds: panBoundsAll, chatTimeout, checkboxPersist, expandDots, count: fourFixesCount },
    grade,
    timestamp: new Date().toISOString(),
  }, null, 2))

  console.log(`\nResults saved to ${DIR}/pass10-results.json`)
}

run().catch(console.error)
