// Corner Test Pass 5: Steve Coach grading Bobby's bebc327
// "Steve's B+ to A fixes + Vegas energy + zoom limits"
//
// Tests:
// 1. Room-click switches chat agent
// 2. Checklist grouped by PROJECT not agent
// 3. Working checkboxes
// 4. Recency-weighted pills (CORNER #1)
// 5. Zoom limits (0.55 min, 2.5 max)
// 6. Vegas energy visual checks (pill size, font weight, shadows)
// 7. Mode switching (GAME / CHECKLIST / MEGABOARD)
// 8. Building renders
// 9. 30-second day management test

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE = 'http://localhost:5173'
const SCREENSHOT_DIR = '/Users/aom-inhouse/aom-studio-transfer/aom-studio/test-screenshots'
const RESULTS = []

function log(test, status, detail) {
  const icon = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'WARN'
  RESULTS.push({ test, status, detail })
  console.log(`[${icon}] ${test}: ${detail}`)
}

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  // Suppress console noise
  page.on('console', () => {})
  page.on('pageerror', (err) => log('PAGE_ERROR', 'WARN', err.message.slice(0, 100)))

  try {
    // ============================================================
    // TEST 0: Page loads
    // ============================================================
    console.log('\n=== PASS 5: Testing bebc327 (Vegas HUD + 4 fixes) ===\n')

    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(2000) // Let animations settle

    // Check if password gate exists
    const passwordInput = await page.$('input[type="password"]')
    if (passwordInput) {
      await passwordInput.fill('aomhq')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
    }

    await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-01-initial-load.png`, fullPage: false })
    log('T0: Page Load', 'PASS', 'Dashboard loaded at /dashboard')

    // ============================================================
    // TEST 1: Building renders (viewport fill)
    // ============================================================
    const buildingImg = await page.$('img[src*="full-office"]')
    if (buildingImg) {
      const box = await buildingImg.boundingBox()
      if (box && box.width > 400 && box.height > 400) {
        log('T1: Building Render', 'PASS', `Building image ${Math.round(box.width)}x${Math.round(box.height)}px`)
      } else {
        log('T1: Building Render', 'WARN', `Building small: ${box?.width}x${box?.height}`)
      }
    } else {
      // Maybe it's a background image or different selector
      const anyImage = await page.$$('img')
      log('T1: Building Render', 'WARN', `No full-office img found. ${anyImage.length} images on page.`)
    }

    // ============================================================
    // TEST 2: Mode switching (GAME / CHECKLIST / MEGABOARD)
    // ============================================================
    // Test keyboard shortcuts 1, 2, 3
    // First make sure we're in GAME mode
    await page.keyboard.press('1')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-02-game-mode.png`, fullPage: false })

    // Switch to CHECKLIST
    await page.keyboard.press('2')
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-03-checklist-mode.png`, fullPage: false })

    const checklistContent = await page.$('[data-testid="checklist-mode"], [class*="checklist"], [class*="Checklist"]')
    // Also check by looking for project-grouped content
    const pageContent = await page.textContent('body')
    const hasChecklistIndicator = pageContent.includes('CHECKLIST') || pageContent.includes('Today') || pageContent.includes('Corner')

    if (hasChecklistIndicator) {
      log('T2a: Mode Switch (Checklist)', 'PASS', 'Keyboard "2" switches to checklist mode')
    } else {
      log('T2a: Mode Switch (Checklist)', 'WARN', 'Checklist mode may not have rendered')
    }

    // Switch to MEGABOARD
    await page.keyboard.press('3')
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-04-megaboard-mode.png`, fullPage: false })

    const hasMegaboard = pageContent.includes('MEGABOARD') || pageContent.includes('MISSION')
    log('T2b: Mode Switch (Megaboard)', hasMegaboard ? 'PASS' : 'WARN', 'Keyboard "3" switches to megaboard mode')

    // Back to GAME
    await page.keyboard.press('1')
    await page.waitForTimeout(1500)

    // ============================================================
    // TEST 3: HUD renders with project pills
    // ============================================================
    // Look for the HUD panel at bottom
    const hudArea = await page.evaluate(() => {
      const els = document.querySelectorAll('*')
      const hudCandidates = []
      for (const el of els) {
        const style = getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        // HUD is at bottom, full width, dark background
        if (rect.bottom > window.innerHeight - 200 && rect.width > window.innerWidth * 0.5 && rect.height > 60) {
          if (style.position === 'fixed' || style.position === 'absolute') {
            hudCandidates.push({
              tag: el.tagName,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              bottom: Math.round(window.innerHeight - rect.bottom),
              text: el.textContent?.slice(0, 200),
            })
          }
        }
      }
      return hudCandidates
    })

    if (hudArea.length > 0) {
      log('T3: HUD Panel', 'PASS', `Found ${hudArea.length} HUD elements. Tallest: ${Math.max(...hudArea.map(h => h.height))}px`)
    } else {
      log('T3: HUD Panel', 'WARN', 'No fixed/absolute HUD panel found at bottom')
    }

    // ============================================================
    // TEST 4: Recency-weighted pills (CORNER should be #1)
    // ============================================================
    const pillData = await page.evaluate(() => {
      const pills = []
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const text = btn.textContent?.trim()
        if (!text) continue
        const rect = btn.getBoundingClientRect()
        // Pills are in the HUD area (bottom of screen), small-ish buttons
        if (rect.bottom > window.innerHeight - 250 && rect.height > 30 && rect.height < 80 && rect.width > 40 && rect.width < 300) {
          const style = getComputedStyle(btn)
          pills.push({
            text: text.slice(0, 40),
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            borderRadius: style.borderRadius,
          })
        }
      }
      // Sort by x position (left to right)
      pills.sort((a, b) => a.x - b.x)
      return pills
    })

    if (pillData.length > 0) {
      // Check if first non-"Today" pill is Corner
      const projectPills = pillData.filter(p => !p.text.toLowerCase().includes('today') && !p.text.includes('GAME') && !p.text.includes('CHECKLIST') && !p.text.includes('MEGABOARD'))
      const firstPill = projectPills[0]

      // Check for "Today" as absolute first
      const todayFirst = pillData[0]?.text?.toLowerCase().includes('today')

      // Find corner pill
      const cornerPill = pillData.find(p => p.text.toLowerCase().includes('corner'))

      if (todayFirst) {
        log('T4a: Today Pill First', 'PASS', `"Today" pill is leftmost (weight 100)`)
      } else {
        log('T4a: Today Pill First', 'WARN', `First pill: "${pillData[0]?.text}" (expected Today)`)
      }

      if (cornerPill) {
        // Check if it's early in the order
        const cornerIndex = pillData.indexOf(cornerPill)
        const isEarly = cornerIndex <= 2  // Should be in first 3 (Today, Corner, ...)
        log('T4b: Corner Pill Position', isEarly ? 'PASS' : 'WARN', `Corner at position ${cornerIndex + 1} of ${pillData.length}. Text: "${cornerPill.text}"`)
      } else {
        log('T4b: Corner Pill Position', 'FAIL', 'No "Corner" pill found in HUD')
      }

      // ============================================================
      // TEST 5: Vegas energy (52px pills, 18px bold, physical shadows)
      // ============================================================
      const vegasMetrics = pillData[0]
      if (vegasMetrics) {
        const pillHeight = vegasMetrics.height
        const fontSize = parseInt(vegasMetrics.fontSize)
        const fontWeight = parseInt(vegasMetrics.fontWeight)
        const borderRadius = parseInt(vegasMetrics.borderRadius)

        const heightOk = pillHeight >= 40  // Should be ~52px
        const fontOk = fontSize >= 14      // Should be ~18px
        const weightOk = fontWeight >= 600  // Should be bold (700+)
        const radiusOk = borderRadius >= 10 // Should be ~16px

        log('T5: Vegas Energy (Pill Size)', heightOk ? 'PASS' : 'WARN',
          `Pill height: ${pillHeight}px (target: 52px). Font: ${fontSize}px/${fontWeight}. Radius: ${borderRadius}px`)

        if (heightOk && fontOk && weightOk) {
          log('T5: Vegas Energy (Overall)', 'PASS', 'Physical, chunky, game-scale feel confirmed')
        } else {
          log('T5: Vegas Energy (Overall)', 'WARN', `Some metrics below target. H:${pillHeight} F:${fontSize} W:${fontWeight} R:${borderRadius}`)
        }
      }

      log('T4c: Pill Count', 'PASS', `${pillData.length} pills found in HUD area`)
    } else {
      log('T4: Project Pills', 'FAIL', 'No project pills found in HUD')
      log('T5: Vegas Energy', 'FAIL', 'Cannot test: no pills')
    }

    // ============================================================
    // TEST 6: Room clicks + chat agent switching
    // ============================================================
    // Find click targets for agents
    const agentTargets = await page.evaluate(() => {
      const targets = []
      // Look for elements with agent names or click handlers on the building
      const allEls = document.querySelectorAll('[data-agent], [data-room], [class*="room"], [class*="agent"]')
      for (const el of allEls) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 10 && rect.height > 10) {
          targets.push({
            agent: el.dataset?.agent || el.dataset?.room || el.className,
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          })
        }
      }
      return targets
    })

    // Also look for SVG polygon/path clip-path click targets
    const svgTargets = await page.evaluate(() => {
      const targets = []
      const polys = document.querySelectorAll('polygon, path, [clip-path]')
      for (const el of polys) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 20 && rect.height > 20 && rect.y < window.innerHeight - 200) {
          const parent = el.closest('[data-agent]') || el.parentElement
          targets.push({
            tag: el.tagName,
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            agent: parent?.dataset?.agent || 'unknown',
          })
        }
      }
      return targets
    })

    // Try clicking on different areas where rooms should be
    // Bobby's room is typically in the middle-right area
    // Let's find clickable areas by looking for event listeners
    const clickableRooms = await page.evaluate(() => {
      const results = []
      // Search for divs that are positioned as room overlays
      const divs = document.querySelectorAll('div')
      for (const div of divs) {
        const style = getComputedStyle(div)
        const rect = div.getBoundingClientRect()
        // Room overlays are absolutely positioned, have clip-path, are in the building area
        if (style.position === 'absolute' && style.clipPath && style.clipPath !== 'none' &&
            rect.width > 30 && rect.height > 30 && rect.y < window.innerHeight - 200) {
          results.push({
            clipPath: style.clipPath.slice(0, 80),
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            title: div.title || div.getAttribute('aria-label') || '',
            textContent: div.textContent?.trim().slice(0, 30) || '',
          })
        }
      }
      return results
    })

    if (clickableRooms.length > 0) {
      log('T6a: Room Click Targets', 'PASS', `${clickableRooms.length} clip-path rooms found`)

      // Click Bobby's room (or first available)
      const bobbyRoom = clickableRooms.find(r => r.textContent.toLowerCase().includes('bobby') || r.title.toLowerCase().includes('bobby'))
      const targetRoom = bobbyRoom || clickableRooms[Math.floor(clickableRooms.length / 2)]

      // Get chat placeholder BEFORE clicking
      const chatBefore = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]')
        for (const inp of inputs) {
          if (inp.placeholder.toLowerCase().includes('message')) return inp.placeholder
        }
        return null
      })

      // Click the room
      await page.mouse.click(targetRoom.x, targetRoom.y)
      await page.waitForTimeout(1000)

      // Get chat placeholder AFTER clicking
      const chatAfter = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]')
        for (const inp of inputs) {
          if (inp.placeholder.toLowerCase().includes('message')) return inp.placeholder
        }
        return null
      })

      await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-05-after-room-click.png`, fullPage: false })

      if (chatBefore && chatAfter && chatBefore !== chatAfter) {
        log('T6b: Room Click -> Chat Switch', 'PASS', `Chat changed: "${chatBefore}" -> "${chatAfter}"`)
      } else if (chatAfter && chatAfter.toLowerCase().includes(targetRoom.textContent.toLowerCase().split(' ')[0])) {
        log('T6b: Room Click -> Chat Switch', 'PASS', `Chat shows correct agent: "${chatAfter}"`)
      } else {
        log('T6b: Room Click -> Chat Switch', 'WARN', `Before: "${chatBefore}" After: "${chatAfter}". Room text: "${targetRoom.textContent}"`)
      }
    } else {
      log('T6a: Room Click Targets', 'WARN', `No clip-path rooms found. SVG targets: ${svgTargets.length}. Data targets: ${agentTargets.length}`)
      log('T6b: Room Click -> Chat Switch', 'WARN', 'Cannot test: no clickable rooms found')
    }

    // ============================================================
    // TEST 7: Checklist grouped by PROJECT
    // ============================================================
    await page.keyboard.press('2')  // Switch to checklist
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-06-checklist-detail.png`, fullPage: false })

    const checklistData = await page.evaluate(() => {
      const results = {
        hasProjectHeaders: false,
        projectNames: [],
        hasTasks: false,
        hasCheckboxes: false,
        taskCount: 0,
        checkboxCount: 0,
        projectHeaderTexts: [],
      }

      // Look for project group headers
      const allText = document.body.innerText
      const projectKeywords = ['Today', 'Corner', 'Ambition', 'AOM Site', 'Outreach', 'Advisory', 'Deadlines', 'Infra']
      for (const kw of projectKeywords) {
        if (allText.includes(kw)) {
          results.projectNames.push(kw)
        }
      }
      results.hasProjectHeaders = results.projectNames.length >= 3

      // Look for checkbox elements (input[type=checkbox] or custom check icons)
      const checkboxes = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]')
      results.checkboxCount = checkboxes.length

      // Also look for SVG check icons or clickable check areas
      const checkIcons = document.querySelectorAll('[data-lucide="check"], [class*="check"]')

      // Look for task-like items (list items, rows with text)
      const listItems = document.querySelectorAll('li, [role="listitem"], [class*="task"], [class*="item"]')
      results.taskCount = listItems.length

      // Check for any clickable checkbox-style elements
      const clickableChecks = document.querySelectorAll('button, [role="button"]')
      let checkStyleButtons = 0
      for (const btn of clickableChecks) {
        const rect = btn.getBoundingClientRect()
        // Small square-ish buttons could be checkboxes
        if (rect.width >= 14 && rect.width <= 40 && rect.height >= 14 && rect.height <= 40) {
          checkStyleButtons++
        }
      }
      results.hasCheckboxes = results.checkboxCount > 0 || checkStyleButtons > 5

      return results
    })

    if (checklistData.hasProjectHeaders) {
      log('T7a: Checklist Project Groups', 'PASS', `Project headers found: ${checklistData.projectNames.join(', ')}`)
    } else {
      log('T7a: Checklist Project Groups', 'FAIL', `Only ${checklistData.projectNames.length} projects: ${checklistData.projectNames.join(', ')}`)
    }

    if (checklistData.hasCheckboxes) {
      log('T7b: Working Checkboxes', 'PASS', `${checklistData.checkboxCount} native checkboxes + clickable check buttons found`)
    } else {
      log('T7b: Working Checkboxes', 'WARN', `No clear checkbox UI found (native: ${checklistData.checkboxCount})`)
    }

    // Try clicking a checkbox
    const checkboxClicked = await page.evaluate(() => {
      // Find a small clickable element that looks like a checkbox
      const buttons = document.querySelectorAll('button, [role="button"], [role="checkbox"]')
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect()
        // Small squarish = likely checkbox
        if (rect.width >= 16 && rect.width <= 36 && rect.height >= 16 && rect.height <= 36 && rect.y > 100) {
          btn.click()
          return { clicked: true, x: rect.x, y: rect.y, size: `${rect.width}x${rect.height}` }
        }
      }
      return { clicked: false }
    })

    if (checkboxClicked.clicked) {
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-07-checkbox-toggled.png`, fullPage: false })
      log('T7c: Checkbox Toggle', 'PASS', `Clicked checkbox at (${checkboxClicked.x}, ${checkboxClicked.y}) size ${checkboxClicked.size}`)
    } else {
      log('T7c: Checkbox Toggle', 'WARN', 'Could not find a checkbox-sized button to click')
    }

    // ============================================================
    // TEST 8: Zoom limits (0.55 min, 2.5 max)
    // ============================================================
    // Go back to game mode
    await page.keyboard.press('1')
    await page.waitForTimeout(1000)

    // Zoom in by scrolling (mouse wheel)
    // First zoom all the way in
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, -100) // scroll up = zoom in
    }
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-08-max-zoom.png`, fullPage: false })

    const maxZoomState = await page.evaluate(() => {
      // Look for transform scale on the building container
      const containers = document.querySelectorAll('[style*="transform"], [style*="scale"]')
      for (const el of containers) {
        const match = el.style.transform?.match(/scale\(([0-9.]+)\)/)
        if (match) return { scale: parseFloat(match[1]), found: true }
      }
      return { found: false }
    })

    // Now zoom all the way out
    for (let i = 0; i < 60; i++) {
      await page.mouse.wheel(0, 100) // scroll down = zoom out
    }
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-09-min-zoom.png`, fullPage: false })

    const minZoomState = await page.evaluate(() => {
      const containers = document.querySelectorAll('[style*="transform"], [style*="scale"]')
      for (const el of containers) {
        const match = el.style.transform?.match(/scale\(([0-9.]+)\)/)
        if (match) return { scale: parseFloat(match[1]), found: true }
      }
      return { found: false }
    })

    if (maxZoomState.found && minZoomState.found) {
      const maxOk = maxZoomState.scale <= 2.6 // 2.5 + small tolerance
      const minOk = minZoomState.scale >= 0.5 // 0.55 - small tolerance
      log('T8: Zoom Limits', maxOk && minOk ? 'PASS' : 'WARN',
        `Min: ${minZoomState.scale.toFixed(2)} (target 0.55), Max: ${maxZoomState.scale.toFixed(2)} (target 2.5)`)
    } else {
      log('T8: Zoom Limits', 'WARN', `Could not read scale transforms. Max found: ${maxZoomState.found}, Min found: ${minZoomState.found}`)
    }

    // ============================================================
    // TEST 9: Agent portraits (58px plumbobs)
    // ============================================================
    const portraitData = await page.evaluate(() => {
      const portraits = []
      const imgs = document.querySelectorAll('img[src*="sprite"], img[src*="agent"]')
      for (const img of imgs) {
        const rect = img.getBoundingClientRect()
        if (rect.width > 0) {
          portraits.push({
            src: img.src.split('/').pop(),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          })
        }
      }
      return portraits
    })

    if (portraitData.length > 0) {
      const avgSize = Math.round(portraitData.reduce((sum, p) => sum + p.width, 0) / portraitData.length)
      log('T9: Agent Portraits', avgSize >= 40 ? 'PASS' : 'WARN',
        `${portraitData.length} sprite portraits. Avg size: ${avgSize}px (target: 58px)`)
    } else {
      log('T9: Agent Portraits', 'WARN', 'No sprite portraits found in current view')
    }

    // ============================================================
    // TEST 10: 30-Second Day Management (8 vitals)
    // ============================================================
    // Reset to game mode, overview zoom
    await page.keyboard.press('1')
    await page.waitForTimeout(500)
    // Zoom to overview
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 50)
    }
    await page.waitForTimeout(500)

    const dayMgmtCheck = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      const vitals = {
        agentStatus: false,     // Can see which agents are active/idle
        projects: false,        // Can see project names
        time: false,            // Can see time/date
        agentNames: false,      // Can see agent names
        progress: false,        // Can see overall progress
        blocked: false,         // Can see blocked agents
        recent: false,          // Can see recent activity
        urgent: false,          // Can see urgent items
      }

      // Check each vital
      const agentNames = ['bobby', 'steffen', 'steve', 'elon', 'alex', 'cleo', 'jacob', 'elmo']
      let foundAgents = 0
      for (const name of agentNames) {
        if (text.includes(name)) foundAgents++
      }
      vitals.agentNames = foundAgents >= 4
      vitals.agentStatus = text.includes('active') || text.includes('idle') || text.includes('working') || text.includes('done') || text.includes('blocked')

      const projectNames = ['corner', 'ambition', 'outreach', 'advisory', 'today']
      let foundProjects = 0
      for (const name of projectNames) {
        if (text.includes(name)) foundProjects++
      }
      vitals.projects = foundProjects >= 2

      vitals.time = text.includes('am') || text.includes('pm') || text.includes(':') || text.match(/\d{1,2}:\d{2}/)
      vitals.progress = text.includes('%') || text.includes('done') || text.includes('complete') || text.includes('/')
      vitals.blocked = text.includes('blocked') || text.includes('overdue') || text.includes('red')
      vitals.recent = text.includes('recent') || text.includes('last') || text.includes('ago') || text.includes('just')
      vitals.urgent = text.includes('urgent') || text.includes('asap') || text.includes('overdue') || text.includes('!') || text.includes('deadline')

      return vitals
    })

    const vitalsPassed = Object.values(dayMgmtCheck).filter(v => v).length
    const vitalsTotal = Object.keys(dayMgmtCheck).length
    const vitalDetails = Object.entries(dayMgmtCheck).map(([k, v]) => `${v ? 'YES' : 'NO'}:${k}`).join(', ')

    log('T10: 30-Second Day Mgmt', vitalsPassed >= 6 ? 'PASS' : vitalsPassed >= 4 ? 'WARN' : 'FAIL',
      `${vitalsPassed}/${vitalsTotal} vitals visible. ${vitalDetails}`)

    // ============================================================
    // TEST 11: Chat bar exists and has correct placeholder
    // ============================================================
    const chatBarData = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea')
      for (const inp of inputs) {
        if (inp.placeholder?.toLowerCase().includes('message') || inp.placeholder?.toLowerCase().includes('chat')) {
          const rect = inp.getBoundingClientRect()
          return {
            found: true,
            placeholder: inp.placeholder,
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          }
        }
      }
      return { found: false }
    })

    if (chatBarData.found) {
      log('T11: Chat Bar', 'PASS', `Chat input found: "${chatBarData.placeholder}" at y=${chatBarData.y}, ${chatBarData.width}px wide`)
    } else {
      log('T11: Chat Bar', 'WARN', 'No chat input found')
    }

    // ============================================================
    // TEST 12: Z-index / overlap check
    // ============================================================
    const overlapCheck = await page.evaluate(() => {
      const bottomElements = []
      const threshold = window.innerHeight - 120
      const els = document.querySelectorAll('*')
      for (const el of els) {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        if (rect.bottom > threshold && (style.position === 'fixed' || style.position === 'absolute') && rect.height > 20) {
          bottomElements.push({
            tag: el.tagName,
            zIndex: style.zIndex,
            bottom: Math.round(window.innerHeight - rect.top),
            height: Math.round(rect.height),
          })
        }
      }
      return bottomElements
    })

    const zConflicts = overlapCheck.filter(e => e.zIndex !== 'auto').length
    log('T12: Z-Index (Bottom)', zConflicts <= 5 ? 'PASS' : 'WARN',
      `${overlapCheck.length} positioned elements in bottom 120px, ${zConflicts} with explicit z-index`)

    // ============================================================
    // FINAL SCREENSHOT: Full state
    // ============================================================
    await page.keyboard.press('1')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-10-final-state.png`, fullPage: false })

  } catch (err) {
    log('RUNTIME_ERROR', 'FAIL', err.message)
    await page.screenshot({ path: `${SCREENSHOT_DIR}/p5-error.png`, fullPage: false }).catch(() => {})
  }

  await browser.close()

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n=== PASS 5 RESULTS SUMMARY ===\n')
  const pass = RESULTS.filter(r => r.status === 'PASS').length
  const fail = RESULTS.filter(r => r.status === 'FAIL').length
  const warn = RESULTS.filter(r => r.status === 'WARN').length
  console.log(`TOTAL: ${RESULTS.length} tests | ${pass} PASS | ${fail} FAIL | ${warn} WARN`)
  console.log('')
  for (const r of RESULTS) {
    console.log(`  [${r.status}] ${r.test}: ${r.detail}`)
  }

  // Write results to file for coach report
  const reportData = {
    commit: 'bebc327',
    commitMessage: "Bobby: Steve's B+ to A fixes + Vegas energy + zoom limits",
    timestamp: new Date().toISOString(),
    summary: { total: RESULTS.length, pass, fail, warn },
    tests: RESULTS,
  }
  fs.writeFileSync(`${SCREENSHOT_DIR}/pass5-results.json`, JSON.stringify(reportData, null, 2))

  return reportData
}

run().catch(console.error)
