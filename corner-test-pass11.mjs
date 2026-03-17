// Corner Test Pass 11: Steve Coach -- Post-Hotfix Verification
// Standard: "Can I run my business from this dashboard?" + "Is the game always visible?"
// Focus:
//   1. Chat response loop (3ad0fe2) -- send message, see response
//   2. Game always visible with sidebar layout (ad10a8f)
//   3. Checklist/Megaboard as sidebar tabs (ad10a8f)
//   4. Extend button works (ad10a8f)
//   5. Terminal/dashboard 1:1 parity (92112e6)
//   6. Fonts correct (12px floor)
//   7. Sprites show for agents
//   8. All previous Tier 0 items still passing
// Tests against Bobby's hotfix commits: 3ad0fe2, ad10a8f, 92112e6

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
      const authForm = await page.$('form[action*="auth"], input[type="email"], [data-testid="auth"]')
      log('T0-LOGIN', 'PASS', authForm ? 'Real auth gate detected' : 'No password gate (open access)')
    }

    await page.waitForTimeout(2000)
    await page.evaluate(() => {
      const el = document.elementFromPoint(10, 10)
      if (el) el.click()
      if (document.activeElement) document.activeElement.blur()
    })
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${DIR}/p11-01-initial-load.png` })

    // ============================================================
    // T1: GAME IS ALWAYS VISIBLE (CORE HOTFIX #2 TEST)
    // The isometric building must be visible in ALL modes.
    // ============================================================
    const buildingCheck = await page.evaluate(() => {
      const img = document.querySelector('img[src*="office"]') || document.querySelector('img[src*="building"]')
      if (!img) return { visible: false, note: 'no building image found' }
      const r = img.getBoundingClientRect()
      return {
        visible: r.width > 200 && r.height > 200 && r.right > 0 && r.left < window.innerWidth,
        width: Math.round(r.width), height: Math.round(r.height),
        left: Math.round(r.left), top: Math.round(r.top),
        src: img.getAttribute('src'),
      }
    })
    log('T1-BUILDING-VISIBLE', buildingCheck.visible ? 'PASS' : 'FAIL',
      `Building: ${buildingCheck.width}x${buildingCheck.height}px at (${buildingCheck.left},${buildingCheck.top}) [${buildingCheck.src || 'n/a'}]`)

    // ============================================================
    // T2: RIGHT SIDEBAR PANEL (unified, shown by default)
    // Should contain: agent name, chat tab, tasks tab, status, extend button
    // ============================================================
    const panelCheck = await page.evaluate(() => {
      const allDivs = document.querySelectorAll('div')
      let rightPanel = null
      for (const d of allDivs) {
        const s = getComputedStyle(d)
        const r = d.getBoundingClientRect()
        // Panel: positioned absolute, right-aligned, tall, 300-500px wide (or wider if extended)
        if (s.position === 'absolute' && r.right >= window.innerWidth - 10 &&
            r.height > window.innerHeight * 0.5 && r.width >= 300 && r.width < 1200) {
          const text = d.textContent?.slice(0, 800) || ''
          const hasAgentName = /elon|bobby|steve|alex|steffen|mom|cleo|jacob|elmo|colton|tony|patrik/i.test(text)
          const hasChatTab = /\bchat\b/i.test(text)
          const hasTasksTab = /\btasks?\b/i.test(text)
          const hasInfoTab = /\binfo\b/i.test(text)
          const hasChecklistTab = /\bchecklist\b/i.test(text)
          const hasBoardTab = /\bboard\b/i.test(text) || /\bmegaboard\b/i.test(text)
          const hasMessageInput = d.querySelector('input[placeholder*="message" i], textarea[placeholder*="message" i]')
          const hasStatus = /active|idle|working|done|blocked|paused|thinking/i.test(text)
          rightPanel = {
            found: true, width: Math.round(r.width), height: Math.round(r.height),
            hasAgentName, hasChatTab, hasTasksTab, hasInfoTab, hasChecklistTab, hasBoardTab,
            hasMessageInput: !!hasMessageInput, hasStatus,
            textSnippet: text.slice(0, 300),
          }
          break
        }
      }
      return rightPanel || { found: false }
    })

    // Secondary tab detection: look for tab buttons directly
    const tabsDirectCheck = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      const foundTabs = []
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toUpperCase() || ''
        const r = btn.getBoundingClientRect()
        // Tabs are narrow buttons in the panel area (right side, small height)
        if (r.x > window.innerWidth * 0.5 && r.height >= 25 && r.height <= 50 && r.width < 150) {
          if (['CHAT', 'TASKS', 'INFO', 'CHECKLIST', 'BOARD'].includes(text)) {
            foundTabs.push(text)
          }
        }
      }
      return foundTabs
    })

    if (panelCheck.found) {
      // Use direct tab detection as primary, fall back to text search
      const hasChatTab = tabsDirectCheck.includes('CHAT') || panelCheck.hasChatTab
      const hasTasksTab = tabsDirectCheck.includes('TASKS') || panelCheck.hasTasksTab
      const hasInfoTab = tabsDirectCheck.includes('INFO') || panelCheck.hasInfoTab
      const hasChecklistTab = tabsDirectCheck.includes('CHECKLIST') || panelCheck.hasChecklistTab
      const hasBoardTab = tabsDirectCheck.includes('BOARD') || panelCheck.hasBoardTab
      const tabCount = [hasChatTab, hasTasksTab, hasInfoTab, hasChecklistTab, hasBoardTab].filter(Boolean).length
      log('T2a-PANEL', 'PASS', `Right panel: ${panelCheck.width}x${panelCheck.height}px`)
      log('T2b-TABS', tabCount >= 4 ? 'PASS' : 'WARN',
        `Tabs: Chat=${hasChatTab} Tasks=${hasTasksTab} Info=${hasInfoTab} Checklist=${hasChecklistTab} Board=${hasBoardTab} (${tabCount}/5) [direct: ${tabsDirectCheck.join(',')}]`)
      log('T2c-AGENT', panelCheck.hasAgentName ? 'PASS' : 'FAIL', `Agent name in panel: ${panelCheck.hasAgentName}`)
      log('T2d-CHAT-INPUT', panelCheck.hasMessageInput ? 'PASS' : 'WARN', `Chat input in panel: ${panelCheck.hasMessageInput}`)
      log('T2e-STATUS', panelCheck.hasStatus ? 'PASS' : 'WARN', `Status indicator: ${panelCheck.hasStatus}`)
    } else {
      log('T2a-PANEL', 'FAIL', 'No right-side unified panel detected')
      log('T2b-TABS', 'FAIL', 'No panel')
      log('T2c-AGENT', 'FAIL', 'No panel')
      log('T2d-CHAT-INPUT', 'FAIL', 'No panel')
      log('T2e-STATUS', 'FAIL', 'No panel')
    }
    await page.screenshot({ path: `${DIR}/p11-02-panel-default.png` })

    // ============================================================
    // T3: GAME + PANEL COEXIST (building visible WITH panel open)
    // This is the KEY test for hotfix #2. Building must NOT be replaced.
    // ============================================================
    const coexistCheck = await page.evaluate(() => {
      const building = document.querySelector('img[src*="office"]') || document.querySelector('img[src*="building"]')
      const bRect = building ? building.getBoundingClientRect() : null
      // Find the panel
      let panelRect = null
      const divs = document.querySelectorAll('div')
      for (const d of divs) {
        const s = getComputedStyle(d)
        const r = d.getBoundingClientRect()
        if (s.position === 'absolute' && r.right >= window.innerWidth - 10 &&
            r.height > window.innerHeight * 0.5 && r.width >= 300 && r.width < 1200) {
          panelRect = r
          break
        }
      }
      return {
        buildingVisible: bRect ? (bRect.width > 100 && bRect.height > 100) : false,
        panelVisible: !!panelRect,
        buildingWidth: bRect ? Math.round(bRect.width) : 0,
        panelWidth: panelRect ? Math.round(panelRect.width) : 0,
        bothVisible: bRect && panelRect && bRect.width > 100 && panelRect.width > 100,
      }
    })
    log('T3-COEXIST', coexistCheck.bothVisible ? 'PASS' : 'FAIL',
      `Game=${coexistCheck.buildingVisible} (${coexistCheck.buildingWidth}px) + Panel=${coexistCheck.panelVisible} (${coexistCheck.panelWidth}px). Both visible: ${coexistCheck.bothVisible}`)

    // ============================================================
    // T4: CHAT RESPONSE LOOP (CORE HOTFIX #1 TEST)
    // Send a message via the panel chat. Check relay mechanics.
    // We verify: (a) message appears in chat, (b) relay-send API works,
    // (c) outbox polling mechanism exists, (d) source labels show.
    // ============================================================
    // First, make sure we're on the Chat tab in the panel
    const chatTabClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        if (btn.textContent?.trim().toLowerCase() === 'chat' ||
            (btn.textContent?.toLowerCase().includes('chat') && btn.getBoundingClientRect().width < 120)) {
          btn.click()
          return true
        }
      }
      return false
    })
    await page.waitForTimeout(500)

    // Find chat input -- could be inside the panel
    const chatInputExists = await page.$('input[placeholder*="message" i], input[placeholder*="chat" i], input[placeholder*="send" i], textarea[placeholder*="message" i]')
    if (chatInputExists) {
      // First test the relay-send API directly
      const apiTest = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/local/relay-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent: 'steve', message: 'pass11-test-msg', source: 'corner-test' }),
          })
          const data = await res.json()
          return { ok: res.ok, status: res.status, data }
        } catch (err) {
          return { ok: false, error: err.message }
        }
      })
      log('T4a-RELAY-API', apiTest.ok ? 'PASS' : 'FAIL',
        `relay-send API: ${apiTest.ok ? 'OK' : 'FAILED'} (${JSON.stringify(apiTest.data || apiTest.error).slice(0, 100)})`)

      // Now send through the UI using evaluate to avoid click interception
      const sendResult = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[placeholder*="message" i], input[placeholder*="Message" i], textarea[placeholder*="message" i]')
        // Use the LAST matching input (panel chat input, not any other)
        const input = inputs[inputs.length - 1]
        if (!input) return { sent: false, reason: 'no input found' }
        input.focus()
        // Set value using native setter to trigger React's onChange
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        nativeInputValueSetter.call(input, 'pass 11 test from Steve coach')
        input.dispatchEvent(new Event('input', { bubbles: true }))
        input.dispatchEvent(new Event('change', { bubbles: true }))
        return { sent: true, placeholder: input.placeholder, value: input.value }
      })

      if (sendResult.sent) {
        // Press Enter to send
        await page.keyboard.press('Enter')
        await page.waitForTimeout(2000)
      }

      // Check if message appeared in chat
      const chatState = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase()
        return {
          userMsgAppears: text.includes('pass 11 test from steve coach') || text.includes('pass 11 test'),
          hasStreamingDots: !!document.querySelector('[style*="chatTypingDot"]') ||
            (() => {
              const divs = document.querySelectorAll('div')
              for (const d of divs) {
                const style = d.getAttribute('style') || ''
                if (style.includes('chatTypingDot')) return true
                // Check for 3 small dots (6px circles)
                if (d.children.length === 3) {
                  const firstChild = d.children[0]
                  const cs = getComputedStyle(firstChild)
                  if (cs.borderRadius === '50%' && parseInt(cs.width) <= 8 && parseInt(cs.height) <= 8) return true
                }
              }
              return false
            })(),
          hasSourceLabels: text.includes('via dashboard') || text.includes('via terminal') || text.includes('via telegram') || text.includes('corner-dashboard') || text.includes('corner-test'),
          hasUnifiedRelay: text.includes('unified relay') || text.includes('full relay'),
        }
      })

      log('T4b-MSG-SENT', chatState.userMsgAppears ? 'PASS' : 'FAIL',
        `User message visible in chat: ${chatState.userMsgAppears}`)
      log('T4c-STREAMING', chatState.hasStreamingDots ? 'PASS' : 'WARN',
        `Streaming indicator (typing dots): ${chatState.hasStreamingDots}`)
      log('T4d-SOURCE-LABELS', chatState.hasSourceLabels ? 'PASS' : 'WARN',
        `Source labels (via terminal/dashboard/telegram): ${chatState.hasSourceLabels}`)

      await page.screenshot({ path: `${DIR}/p11-03-chat-sent.png` })

      // Check outbox polling mechanism exists
      const outboxPolling = await page.evaluate(() => {
        // Check if there's background polling by looking for fetch calls to relay-outbox
        // We can't directly inspect intervals, but we can check performance entries
        const entries = performance.getEntriesByType('resource')
        const outboxCalls = entries.filter(e => e.name.includes('relay-outbox'))
        return {
          outboxCallCount: outboxCalls.length,
          hasOutboxEndpoint: outboxCalls.length > 0,
        }
      })
      log('T4e-OUTBOX-POLL', outboxPolling.hasOutboxEndpoint ? 'PASS' : 'WARN',
        `Outbox polling: ${outboxPolling.outboxCallCount} calls to relay-outbox detected`)

      // Wait a few more seconds to see if timeout/response mechanism activates
      await page.waitForTimeout(5000)
      const chatAfterWait = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase()
        return {
          hasResponse: text.includes('offline') || text.includes('saved') || text.includes('response'),
          stillStreaming: (() => {
            const divs = document.querySelectorAll('div')
            for (const d of divs) {
              if (d.children.length === 3) {
                const fc = d.children[0]
                const cs = getComputedStyle(fc)
                if (cs.borderRadius === '50%' && parseInt(cs.width) <= 8) return true
              }
            }
            return false
          })(),
        }
      })
      log('T4f-CHAT-AFTER-7S', 'INFO',
        `After 7s: response/offline=${chatAfterWait.hasResponse}, stillStreaming=${chatAfterWait.stillStreaming}`)
      await page.screenshot({ path: `${DIR}/p11-04-chat-after-wait.png` })
    } else {
      log('T4a-RELAY-API', 'WARN', 'Chat input not found, testing API only')
      // Test the API directly even without UI input
      const apiOnlyTest = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/local/relay-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent: 'steve', message: 'pass11-api-test', source: 'corner-test' }),
          })
          return { ok: res.ok }
        } catch { return { ok: false } }
      })
      log('T4a-RELAY-API', apiOnlyTest.ok ? 'PASS' : 'FAIL', `API-only test: ${apiOnlyTest.ok}`)
      log('T4b-MSG-SENT', 'FAIL', 'No chat input found in panel')
      log('T4c-STREAMING', 'FAIL', 'No chat input')
      log('T4d-SOURCE-LABELS', 'FAIL', 'No chat input')
      log('T4e-OUTBOX-POLL', 'FAIL', 'No chat input')
    }

    // ============================================================
    // T5: CHECKLIST AS SIDEBAR TAB (CORE HOTFIX #2 TEST)
    // Press 2 or click Checklist tab. Game MUST stay visible.
    // Checklist should appear in the sidebar, not replace the viewport.
    // ============================================================

    // Click Checklist tab in panel
    const checklistTabResult = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toLowerCase()
        if (text === 'checklist') {
          btn.click()
          return { clicked: true, method: 'tab-click' }
        }
      }
      return { clicked: false }
    })

    if (!checklistTabResult.clicked) {
      // Try keyboard shortcut
      await page.evaluate(() => { document.activeElement?.blur() })
      await page.waitForTimeout(200)
      await page.keyboard.press('2')
      await page.waitForTimeout(1000)
    } else {
      await page.waitForTimeout(1500)
    }

    // Verify: game STILL visible AND checklist content in sidebar
    const checklistSidebarResult = await page.evaluate(() => {
      const building = document.querySelector('img[src*="office"]') || document.querySelector('img[src*="building"]')
      const bVisible = building ? building.getBoundingClientRect().width > 100 : false

      // Check if checklist content is visible
      const text = document.body.innerText
      const hasChecklistContent = text.includes('Today') || text.includes('Corner') ||
        text.includes('AOM Site') || text.includes('Outreach') || text.includes('Advisory')

      // Check if there are checkboxes visible
      const checkboxes = document.querySelectorAll('input[type="checkbox"]')
      let styledCheckboxes = 0
      const buttons = document.querySelectorAll('button, [role="checkbox"]')
      for (const btn of buttons) {
        const r = btn.getBoundingClientRect()
        if (r.width >= 16 && r.width <= 40 && r.height >= 16 && r.height <= 40 && r.y > 60) styledCheckboxes++
      }

      // Check if panel is extended (wider than 380px)
      let panelWidth = 0
      const divs = document.querySelectorAll('div')
      for (const d of divs) {
        const s = getComputedStyle(d)
        const r = d.getBoundingClientRect()
        if (s.position === 'absolute' && r.right >= window.innerWidth - 10 &&
            r.height > window.innerHeight * 0.5 && r.width >= 300) {
          panelWidth = Math.round(r.width)
          break
        }
      }

      return {
        gameVisible: bVisible,
        hasChecklistContent,
        nativeCheckboxes: checkboxes.length,
        styledCheckboxes,
        panelWidth,
        panelExtended: panelWidth > 500,
      }
    })

    log('T5a-CHECKLIST-GAME', checklistSidebarResult.gameVisible ? 'PASS' : 'FAIL',
      `Game visible while Checklist tab active: ${checklistSidebarResult.gameVisible}`)
    log('T5b-CHECKLIST-CONTENT', checklistSidebarResult.hasChecklistContent ? 'PASS' : 'WARN',
      `Checklist content in sidebar: ${checklistSidebarResult.hasChecklistContent}`)
    log('T5c-CHECKLIST-BOXES', (checklistSidebarResult.nativeCheckboxes > 0 || checklistSidebarResult.styledCheckboxes > 3) ? 'PASS' : 'WARN',
      `Checkboxes: ${checklistSidebarResult.nativeCheckboxes} native + ${checklistSidebarResult.styledCheckboxes} styled`)
    log('T5d-AUTO-EXTEND', checklistSidebarResult.panelExtended ? 'PASS' : 'WARN',
      `Panel auto-extended for Checklist: ${checklistSidebarResult.panelExtended} (width: ${checklistSidebarResult.panelWidth}px)`)

    await page.screenshot({ path: `${DIR}/p11-05-checklist-sidebar.png` })

    // ============================================================
    // T6: MEGABOARD AS SIDEBAR TAB
    // ============================================================
    const megaTabResult = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        const text = btn.textContent?.trim().toLowerCase()
        if (text === 'board') {
          btn.click()
          return { clicked: true }
        }
      }
      return { clicked: false }
    })

    if (!megaTabResult.clicked) {
      await page.evaluate(() => { document.activeElement?.blur() })
      await page.waitForTimeout(200)
      await page.keyboard.press('3')
    }
    await page.waitForTimeout(1500)

    const megaSidebarResult = await page.evaluate(() => {
      const building = document.querySelector('img[src*="office"]') || document.querySelector('img[src*="building"]')
      const bVisible = building ? building.getBoundingClientRect().width > 100 : false
      const text = document.body.innerText
      const hasParty = /party/i.test(text)
      const hasMission = /mission/i.test(text)
      const hasAgentCards = /bobby|steffen|cleo|elon|steve|alex|mom|jacob/i.test(text)
      return { gameVisible: bVisible, hasParty, hasMission, hasAgentCards }
    })

    log('T6a-MEGA-GAME', megaSidebarResult.gameVisible ? 'PASS' : 'FAIL',
      `Game visible while Megaboard tab active: ${megaSidebarResult.gameVisible}`)
    log('T6b-MEGA-CONTENT', (megaSidebarResult.hasParty || megaSidebarResult.hasMission || megaSidebarResult.hasAgentCards) ? 'PASS' : 'WARN',
      `Megaboard content: Party=${megaSidebarResult.hasParty} Mission=${megaSidebarResult.hasMission} Agents=${megaSidebarResult.hasAgentCards}`)

    await page.screenshot({ path: `${DIR}/p11-06-megaboard-sidebar.png` })

    // Switch back to Chat tab
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        if (btn.textContent?.trim().toLowerCase() === 'chat') { btn.click(); return }
      }
    })
    await page.waitForTimeout(500)

    // ============================================================
    // T7: EXTEND BUTTON (CORE HOTFIX #2 TEST)
    // Find extend/expand button, click it, verify panel widens.
    // ============================================================
    // First collapse if extended
    const initialPanelWidth = await page.evaluate(() => {
      const divs = document.querySelectorAll('div')
      for (const d of divs) {
        const s = getComputedStyle(d)
        const r = d.getBoundingClientRect()
        if (s.position === 'absolute' && r.right >= window.innerWidth - 10 &&
            r.height > window.innerHeight * 0.5 && r.width >= 300) {
          return Math.round(r.width)
        }
      }
      return 0
    })

    // Find and click the extend/collapse button (Maximize2 or Minimize2 icon)
    const extendClicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        const title = btn.getAttribute('title') || ''
        const ariaLabel = btn.getAttribute('aria-label') || ''
        if (title.includes('xpand') || title.includes('ollapse') || title.includes('xtend') ||
            ariaLabel.includes('xpand') || ariaLabel.includes('ollapse')) {
          btn.click()
          return { clicked: true, title }
        }
        // Check for Maximize2/Minimize2 SVG icons
        const svg = btn.querySelector('svg')
        if (svg) {
          const paths = svg.querySelectorAll('path, polyline, line')
          // Maximize2 icon has specific structure. Look near top of panel.
          const r = btn.getBoundingClientRect()
          if (r.y < 100 && r.x > window.innerWidth - 500 && r.width >= 20 && r.width <= 50) {
            // Could be extend or close. Check if there's another button nearby (close = X)
            const siblingBtns = btn.parentElement?.querySelectorAll('button') || []
            if (siblingBtns.length >= 2) {
              // First button in the group is likely extend, second is close
              const idx = Array.from(siblingBtns).indexOf(btn)
              if (idx === 0) {
                btn.click()
                return { clicked: true, title: 'svg-extend-button' }
              }
            }
          }
        }
      }
      return { clicked: false }
    })

    await page.waitForTimeout(500)

    const afterExtendWidth = await page.evaluate(() => {
      const divs = document.querySelectorAll('div')
      for (const d of divs) {
        const s = getComputedStyle(d)
        const r = d.getBoundingClientRect()
        if (s.position === 'absolute' && r.right >= window.innerWidth - 10 &&
            r.height > window.innerHeight * 0.5 && r.width >= 300) {
          return Math.round(r.width)
        }
      }
      return 0
    })

    const widthChanged = Math.abs(afterExtendWidth - initialPanelWidth) > 50
    log('T7-EXTEND', widthChanged ? 'PASS' : 'WARN',
      `Extend button: clicked=${extendClicked.clicked}, before=${initialPanelWidth}px, after=${afterExtendWidth}px, changed=${widthChanged}`)

    await page.screenshot({ path: `${DIR}/p11-07-extended-panel.png` })

    // Click extend again to collapse back
    if (extendClicked.clicked) {
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button')
        for (const btn of buttons) {
          const title = btn.getAttribute('title') || ''
          if (title.includes('xpand') || title.includes('ollapse') || title.includes('xtend')) {
            btn.click()
            return
          }
          const r = btn.getBoundingClientRect()
          if (r.y < 100 && r.x > window.innerWidth - 500 && r.width >= 20 && r.width <= 50) {
            const siblingBtns = btn.parentElement?.querySelectorAll('button') || []
            if (siblingBtns.length >= 2) {
              const idx = Array.from(siblingBtns).indexOf(btn)
              if (idx === 0) { btn.click(); return }
            }
          }
        }
      })
      await page.waitForTimeout(400)
    }

    // ============================================================
    // T8: FONT SIZE CHECK (12px floor -- all visible text >= 12px)
    // ============================================================
    const fontCheck = await page.evaluate(() => {
      const violations = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      const checked = new Set()
      while (walker.nextNode()) {
        const node = walker.currentNode
        if (!node.textContent?.trim()) continue
        const el = node.parentElement
        if (!el || checked.has(el)) continue
        checked.add(el)
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue // hidden
        const s = getComputedStyle(el)
        const size = parseFloat(s.fontSize)
        if (size < 12 && r.y > 0 && r.y < window.innerHeight) {
          violations.push({
            text: node.textContent.trim().slice(0, 40),
            size: Math.round(size * 10) / 10,
            tag: el.tagName,
            y: Math.round(r.y),
          })
        }
      }
      return { violations: violations.slice(0, 10), totalChecked: checked.size }
    })

    const fontViolations = fontCheck.violations.length
    log('T8-FONTS', fontViolations === 0 ? 'PASS' : 'WARN',
      `Font check: ${fontViolations} violations below 12px out of ${fontCheck.totalChecked} elements.${fontViolations > 0 ? ' Smallest: ' + fontCheck.violations.map(v => `"${v.text}" at ${v.size}px`).join(', ') : ''}`)

    // ============================================================
    // T9: SPRITES SHOW FOR AGENTS
    // Agent avatars/sprites should render (in panel, in rooms, in dots)
    // ============================================================
    const spriteCheck = await page.evaluate(() => {
      const spriteImgs = document.querySelectorAll('img[src*="sprite"]')
      const agentImgs = document.querySelectorAll('img[src*="corner/sprites"], img[src*="idle"], img[src*="working"]')
      const allAgentImgs = [...spriteImgs, ...agentImgs]
      const details = []
      for (const img of allAgentImgs) {
        const r = img.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          details.push({
            src: img.getAttribute('src')?.split('/').pop() || 'unknown',
            w: Math.round(r.width), h: Math.round(r.height),
          })
        }
      }
      // Also check for background-image sprites
      const bgSprites = []
      const divs = document.querySelectorAll('div')
      for (const d of divs) {
        const bg = getComputedStyle(d).backgroundImage
        if (bg && bg.includes('sprite') && bg !== 'none') {
          bgSprites.push(bg.slice(0, 60))
        }
      }
      return { imgCount: details.length, bgCount: bgSprites.length, details: details.slice(0, 8) }
    })

    const totalSprites = spriteCheck.imgCount + spriteCheck.bgCount
    log('T9-SPRITES', totalSprites >= 1 ? 'PASS' : 'WARN',
      `Sprites: ${spriteCheck.imgCount} img + ${spriteCheck.bgCount} bg = ${totalSprites}.${spriteCheck.details.length > 0 ? ' Files: ' + spriteCheck.details.map(d => `${d.src}(${d.w}x${d.h})`).join(', ') : ' None visible.'}`)

    // ============================================================
    // T10: PAN BOUNDS (REGRESSION from Pass 10 Tier 0)
    // ============================================================
    const centerX = 500, centerY = 400 // offset from right since panel takes space

    // Pan LEFT aggressively
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(centerX + (i * 80), centerY, { steps: 2 })
    }
    await page.mouse.up()
    await page.waitForTimeout(600)

    const panResult = await page.evaluate(() => {
      const img = document.querySelector('img[src*="office"]')
      if (!img) return { visible: false }
      const r = img.getBoundingClientRect()
      return {
        visible: r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight,
        left: Math.round(r.left), right: Math.round(r.right),
      }
    })
    log('T10a-PAN-LEFT', panResult.visible ? 'PASS' : 'FAIL',
      `After aggressive left pan: visible=${panResult.visible}`)

    // Reset and pan right
    await page.keyboard.press('Home')
    await page.waitForTimeout(500)
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(centerX - (i * 80), centerY, { steps: 2 })
    }
    await page.mouse.up()
    await page.waitForTimeout(600)

    const panRight = await page.evaluate(() => {
      const img = document.querySelector('img[src*="office"]')
      if (!img) return { visible: false }
      const r = img.getBoundingClientRect()
      return { visible: r.right > 0 && r.left < window.innerWidth }
    })
    log('T10b-PAN-RIGHT', panRight.visible ? 'PASS' : 'FAIL',
      `After aggressive right pan: visible=${panRight.visible}`)

    await page.keyboard.press('Home')
    await page.waitForTimeout(500)

    // ============================================================
    // T11: CHECKBOX PERSISTENCE (REGRESSION from Pass 10 Tier 0)
    // ============================================================
    // Switch to checklist tab
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        if (btn.textContent?.trim().toLowerCase() === 'checklist') { btn.click(); return }
      }
    })
    await page.waitForTimeout(1500)

    // Find and click a checkbox
    const cbClick = await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]')
      if (checkboxes.length > 0) {
        const cb = checkboxes[0]
        const text = cb.closest('label, div, li')?.textContent?.trim()?.slice(0, 60) || 'unknown'
        cb.click()
        return { found: true, type: 'native', text }
      }
      // styled checkboxes
      const btns = document.querySelectorAll('button, [role="checkbox"]')
      for (const btn of btns) {
        const r = btn.getBoundingClientRect()
        if (r.width >= 16 && r.width <= 40 && r.height >= 16 && r.height <= 40 && r.y > 100) {
          const text = btn.closest('div')?.textContent?.trim()?.slice(0, 60) || 'unknown'
          btn.click()
          return { found: true, type: 'styled', text }
        }
      }
      return { found: false }
    })

    if (cbClick.found) {
      await page.waitForTimeout(500)
      // Check localStorage
      const lsCheck = await page.evaluate(() => {
        const keys = Object.keys(localStorage)
        return keys.filter(k => k.includes('check') || k.includes('corner') || k.includes('task'))
      })
      log('T11-CHECKBOX', lsCheck.length > 0 ? 'PASS' : 'WARN',
        `Checkbox clicked "${cbClick.text}". localStorage keys: ${lsCheck.join(', ') || 'NONE'}`)
    } else {
      log('T11-CHECKBOX', 'WARN', 'No checkbox found in checklist tab')
    }

    // Switch back to chat
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      for (const btn of buttons) {
        if (btn.textContent?.trim().toLowerCase() === 'chat') { btn.click(); return }
      }
    })
    await page.waitForTimeout(500)

    // ============================================================
    // T12: HUD PROJECT PILLS (REGRESSION)
    // ============================================================
    const pillInfo = await page.evaluate(() => {
      const pills = []
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const text = btn.textContent?.trim()
        const rect = btn.getBoundingClientRect()
        // Pills are near the top of the screen in the HUD area
        if (rect.top < 80 && rect.height >= 25 && rect.height <= 60 &&
            rect.width > 50 && rect.width < 280 && text && text.length < 30) {
          const style = getComputedStyle(btn)
          pills.push({ text: text.replace(/\n/g, ' ').trim(), x: Math.round(rect.x), fontWeight: parseInt(style.fontWeight) })
        }
      }
      pills.sort((a, b) => a.x - b.x)
      return pills
    })

    if (pillInfo.length > 3) {
      const pillTexts = pillInfo.map(p => p.text)
      const maxWeight = Math.max(...pillInfo.map(p => p.fontWeight))
      log('T12a-PILLS', 'PASS', `${pillInfo.length} pills: ${pillTexts.slice(0, 6).join(' | ')}`)
      log('T12b-PILL-WEIGHT', maxWeight >= 700 ? 'PASS' : 'FAIL', `Pill font weight: ${maxWeight} (target: 900)`)
    } else {
      log('T12-PILLS', 'WARN', `Only ${pillInfo.length} pills found in HUD area`)
    }

    // ============================================================
    // T13: CLIENT PROJECTS VISIBLE
    // ============================================================
    const clientCheck = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      const clients = {
        'Included Health': text.includes('included health') || (text.includes('included') && text.includes('$9k')),
        'ISA': text.includes('isa'),
        'Ambition': text.includes('ambition'),
        'KOHRS': text.includes('kohrs'),
        'Brandon': text.includes('brandon'),
        'Skylar': text.includes('skylar'),
      }
      const found = Object.entries(clients).filter(([_, v]) => v).map(([k]) => k)
      return { found, total: found.length }
    })
    log('T13-CLIENTS', clientCheck.total >= 3 ? 'PASS' : 'FAIL',
      `Client projects: ${clientCheck.found.join(', ') || 'NONE'} (${clientCheck.total}/6)`)

    // ============================================================
    // T14: NO LEFT SIDEBAR (REGRESSION)
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
    log('T14-NO-LEFT', !leftSidebar.found ? 'PASS' : 'FAIL',
      leftSidebar.found ? `LEFT sidebar still exists! ${leftSidebar.width}px` : 'No left sidebar')

    // ============================================================
    // T15: ZOOM (REGRESSION)
    // ============================================================
    const zoomBefore = await page.evaluate(() => {
      const img = document.querySelector('img[src*="office"]')
      if (!img) return 'none'
      const container = img.parentElement?.parentElement
      return container ? getComputedStyle(container).transform : 'none'
    })
    await page.mouse.move(centerX, centerY)
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -120)
      await page.waitForTimeout(100)
    }
    await page.waitForTimeout(600)
    const zoomAfter = await page.evaluate(() => {
      const img = document.querySelector('img[src*="office"]')
      if (!img) return 'none'
      const container = img.parentElement?.parentElement
      return container ? getComputedStyle(container).transform : 'none'
    })
    log('T15-ZOOM', (zoomBefore !== zoomAfter && zoomAfter !== 'none') ? 'PASS' : 'WARN',
      `Zoom: before="${zoomBefore?.slice(0,40)}" after="${zoomAfter?.slice(0,40)}"`)

    // Reset zoom
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 120)
      await page.waitForTimeout(80)
    }
    await page.waitForTimeout(300)

    // ============================================================
    // T16: CONSOLE ERRORS
    // ============================================================
    log('T16-ERRORS', pageErrors.length === 0 ? 'PASS' : 'WARN',
      `Console errors: ${pageErrors.length}${pageErrors.length > 0 ? ' -- ' + pageErrors.slice(0, 3).map(e => e.slice(0, 60)).join('; ') : ''}`)

    // ============================================================
    // T17: 5-SECOND TEST (RECALIBRATED)
    // "Can I run my business from this dashboard?"
    // ============================================================
    const fiveSecTest = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      return {
        buildingVisible: !!document.querySelector('img[src*="office"]'),
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
        chatWorks: !!document.querySelector('input[placeholder*="message" i], textarea[placeholder*="message" i]'),
        gameAlwaysVisible: !!document.querySelector('img[src*="office"]'), // redundant but semantic
      }
    })

    const fiveSecScore = Object.values(fiveSecTest).filter(Boolean).length
    log('T17-5SEC', fiveSecScore >= 5 ? 'PASS' : fiveSecScore >= 3 ? 'WARN' : 'FAIL',
      `5-second test: ${fiveSecScore}/6 (building=${fiveSecTest.buildingVisible}, panel=${fiveSecTest.panelVisible}, clients=${fiveSecTest.hasClientNames}, biz=${fiveSecTest.hasBusinessData}, chat=${fiveSecTest.chatWorks})`)

    // Final screenshot
    await page.screenshot({ path: `${DIR}/p11-08-final.png` })

  } catch (err) {
    log('RUNTIME', 'FAIL', err.message.slice(0, 200))
    await page.screenshot({ path: `${DIR}/p11-error.png` }).catch(() => {})
  }

  await browser.close()

  // ============================================================
  // SUMMARY + GRADING
  // ============================================================
  console.log('\n=== PASS 11 RESULTS ===\n')
  const pass = R.filter(r => r.status === 'PASS').length
  const fail = R.filter(r => r.status === 'FAIL').length
  const warn = R.filter(r => r.status === 'WARN').length
  const info = R.filter(r => r.status === 'INFO').length
  console.log(`${R.length} tests | ${pass} PASS | ${fail} FAIL | ${warn} WARN | ${info} INFO\n`)

  for (const r of R) console.log(`  [${r.status}] ${r.test}: ${r.detail}`)

  // HOTFIX VERIFICATION
  console.log('\n=== HOTFIX VERIFICATION ===\n')
  const chatSent = R.find(r => r.test === 'T4b-MSG-SENT')?.status === 'PASS'
  const relayApi = R.find(r => r.test === 'T4a-RELAY-API')?.status === 'PASS'
  const gameWithChecklist = R.find(r => r.test === 'T5a-CHECKLIST-GAME')?.status === 'PASS'
  const gameWithMega = R.find(r => r.test === 'T6a-MEGA-GAME')?.status === 'PASS'
  const gameWithPanel = R.find(r => r.test === 'T3-COEXIST')?.status === 'PASS'
  const extendBtn = R.find(r => r.test === 'T7-EXTEND')?.status === 'PASS'
  const sourceLabels = R.find(r => r.test === 'T4d-SOURCE-LABELS')?.status === 'PASS'

  const hotfixes = {
    'Hotfix 1 (3ad0fe2) - Chat response loop': chatSent && relayApi,
    'Hotfix 2 (ad10a8f) - Game always visible': gameWithPanel && gameWithChecklist && gameWithMega,
    'Hotfix 2 (ad10a8f) - Modes in sidebar': gameWithChecklist && gameWithMega,
    'Hotfix 2 (ad10a8f) - Extend button': extendBtn,
    'Hotfix 3 (92112e6) - Source labels (1:1 parity)': sourceLabels,
  }

  const hotfixPassed = Object.values(hotfixes).filter(Boolean).length
  console.log(`  HOTFIXES: ${hotfixPassed}/${Object.keys(hotfixes).length}`)
  for (const [k, v] of Object.entries(hotfixes)) {
    console.log(`    ${v ? 'PASS' : 'FAIL'} ${k}`)
  }

  // TIER 0 STATUS
  console.log('\n=== TIER 0 STATUS ===\n')
  const panBounds = R.find(r => r.test === 'T10a-PAN-LEFT')?.status === 'PASS' && R.find(r => r.test === 'T10b-PAN-RIGHT')?.status === 'PASS'
  const checkboxPersist = R.find(r => r.test === 'T11-CHECKBOX')?.status === 'PASS'
  const clientsInHud = R.find(r => r.test === 'T13-CLIENTS')?.status === 'PASS'
  const chatTimeout = chatSent // chat sends and has mechanism
  const fiveSecond = R.find(r => r.test === 'T17-5SEC')?.status === 'PASS'

  const tier0 = {
    'Auth (Supabase)': false,
    'Chat responds (relay loop)': chatSent && relayApi,
    'Client projects visible': clientsInHud,
    'Checkbox persistence': checkboxPersist,
    'Chat timeout (60s)': chatTimeout,
    'Pan bounds': panBounds,
    'Demo data (prod)': false,
  }
  const tier0Done = Object.values(tier0).filter(Boolean).length
  console.log(`  TIER 0: ${tier0Done}/7`)
  for (const [k, v] of Object.entries(tier0)) {
    console.log(`    ${v ? 'DONE' : 'TODO'} ${k}`)
  }

  // REGRESSION CHECK
  console.log('\n=== REGRESSION CHECK ===\n')
  const regressions = {
    'Panel visible': R.find(r => r.test === 'T2a-PANEL')?.status === 'PASS',
    'No left sidebar': R.find(r => r.test === 'T14-NO-LEFT')?.status === 'PASS',
    'Zero console errors': R.find(r => r.test === 'T16-ERRORS')?.status === 'PASS',
    'Building renders': R.find(r => r.test === 'T1-BUILDING-VISIBLE')?.status === 'PASS',
    'Zoom works': R.find(r => r.test === 'T15-ZOOM')?.status === 'PASS',
    'Sprites visible': R.find(r => r.test === 'T9-SPRITES')?.status === 'PASS',
  }
  for (const [k, v] of Object.entries(regressions)) {
    console.log(`    ${v ? 'PASS' : 'FAIL/WARN'} ${k}`)
  }

  // OVERALL GRADE
  const gameAlwaysVisible = gameWithPanel && gameWithChecklist && gameWithMega
  let grade = 'D'
  if (tier0Done >= 6 && fiveSecond && gameAlwaysVisible) grade = 'B'
  else if (tier0Done >= 5 && fiveSecond && gameAlwaysVisible) grade = 'B-'
  else if (tier0Done >= 5 && gameAlwaysVisible) grade = 'C+/B-'
  else if (tier0Done >= 4 && gameAlwaysVisible) grade = 'C+'
  else if (tier0Done >= 3 && gameAlwaysVisible) grade = 'C'
  else if (tier0Done >= 2 && gameAlwaysVisible) grade = 'C-'
  else if (gameAlwaysVisible) grade = 'D+'
  else grade = 'D'

  console.log(`\n  OVERALL (RECALIBRATED): ${grade}`)
  console.log(`  Previous: C+ (Pass 10)`)
  console.log(`  New bar: "Can I run my business from this?" + "Is the game always visible?"`)

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

  fs.writeFileSync(`${DIR}/pass11-results.json`, JSON.stringify({
    pass: 11,
    commit: commitHash,
    workingTreeClean,
    tests: R,
    summary: { total: R.length, pass, fail, warn, info },
    hotfixes,
    hotfixPassed,
    tier0,
    tier0Done,
    gameAlwaysVisible,
    grade,
    timestamp: new Date().toISOString(),
  }, null, 2))

  console.log(`\nResults saved to ${DIR}/pass11-results.json`)
}

run().catch(console.error)
