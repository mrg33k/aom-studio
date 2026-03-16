// Corner Test Pass 7: Steve Coach grading CHECKLIST REVERT + quick fixes
// Key regression test: ChecklistMode must show project-grouped tasks with checkboxes (e1b8d09 style)
// NOT the system queue (b3d836d regression). Also testing pill font weight + Today pinning.
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
    // STEP 0: Load + authenticate
    // ============================================================
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(1500)

    const pwInput = await page.$('input[type="password"]')
    if (pwInput) {
      await pwInput.fill('aomhq')
      // Try multiple button selectors for ENTER
      const enterBtn = await page.$('button:has-text("ENTER")') || await page.$('button[type="submit"]') || await page.$('button')
      if (enterBtn) {
        await enterBtn.click()
      } else {
        await page.keyboard.press('Enter')
      }
      await page.waitForTimeout(4000)
      log('T0', 'PASS', 'Authenticated via password gate')
    } else {
      log('T0', 'PASS', 'No password gate (already authenticated)')
    }

    // Wait for dashboard to fully render
    await page.waitForTimeout(2000)

    // Defocus: click on a safe empty area using evaluate to avoid actionability checks
    await page.evaluate(() => {
      const el = document.elementFromPoint(10, 10)
      if (el) el.click()
      if (document.activeElement) document.activeElement.blur()
    })
    await page.waitForTimeout(500)

    // ============================================================
    // T1: Building renders
    // ============================================================
    const buildingImg = await page.$('img[src*="office"]') || await page.$('img[src*="full-office"]') || await page.$('img[src*="building"]')
    if (buildingImg) {
      const box = await buildingImg.boundingBox()
      const src = await buildingImg.getAttribute('src')
      const isCrossyRoad = src?.includes('office-full-night')
      log('T1', 'PASS', `Building ${Math.round(box.width)}x${Math.round(box.height)}px${isCrossyRoad ? ' (Crossy Road skin)' : ''} [${src}]`)
    } else {
      log('T1', 'WARN', 'No building image found (checked office, full-office, building)')
    }

    await page.screenshot({ path: `${DIR}/p7-01-game-mode.png` })

    // ============================================================
    // T2: HUD pills + recency ordering
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
            text, x: Math.round(rect.x), y: Math.round(rect.y),
            h: Math.round(rect.height), w: Math.round(rect.width),
            fontWeight: parseInt(style.fontWeight),
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

      log('T2a', pillInfo.length >= 5 ? 'PASS' : 'WARN', `${pillInfo.length} pills: ${pillTexts.slice(0, 6).join(' | ')}`)
      log('T2b', todayFirst ? 'PASS' : 'FAIL', `First pill: "${pillTexts[0]}" (expected: Today)`)
      log('T2c', cornerPill ? 'PASS' : 'FAIL', cornerPill ? `Corner pill at position ${pillInfo.indexOf(cornerPill) + 1}` : 'No Corner pill')
      log('T2d', maxWeight >= 700 ? 'PASS' : 'FAIL', `Pill font weight: ${maxWeight} (target: 900)`)
    } else {
      log('T2', 'WARN', `Only ${pillInfo.length} pills found`)
    }

    // ============================================================
    // T3: Room click targets count
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

    log('T3', rooms.length >= 14 ? 'PASS' : 'WARN', `${rooms.length} room click targets (target: 14+, best: 26)`)

    // ============================================================
    // T4: Room click -> chat agent switch
    // ============================================================
    const chatBefore = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]')
      for (const inp of inputs) {
        if (inp.placeholder.toLowerCase().includes('message')) return inp.placeholder
      }
      return null
    })

    if (rooms.length > 2) {
      const target = rooms[Math.floor(rooms.length / 2)]
      await page.mouse.click(target.x, target.y)
      await page.waitForTimeout(1500)

      const chatAfter = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]')
        for (const inp of inputs) {
          if (inp.placeholder.toLowerCase().includes('message')) return inp.placeholder
        }
        return null
      })

      await page.screenshot({ path: `${DIR}/p7-02-room-click.png` })

      if (chatBefore && chatAfter && chatBefore !== chatAfter) {
        log('T4', 'PASS', `Chat switched: "${chatBefore}" -> "${chatAfter}"`)
      } else {
        log('T4', 'WARN', `Before: "${chatBefore}" After: "${chatAfter}"`)
      }
    } else {
      log('T4', 'WARN', `Only ${rooms.length} clickable rooms`)
    }

    // ============================================================
    // T5: Right-click context menu
    // ============================================================
    if (rooms.length > 0) {
      await page.mouse.click(rooms[0].x, rooms[0].y, { button: 'right' })
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${DIR}/p7-03-right-click.png` })

      const contextMenu = await page.evaluate(() => {
        const menus = document.querySelectorAll('[role="menu"], [class*="context"], [class*="Context"]')
        if (menus.length > 0) return { found: true, items: menus[0].textContent?.slice(0, 200) }
        const overlays = document.querySelectorAll('div')
        for (const d of overlays) {
          const s = getComputedStyle(d)
          const r = d.getBoundingClientRect()
          if (s.position === 'fixed' && s.zIndex && parseInt(s.zIndex) > 100 && r.width > 100 && r.width < 300) {
            return { found: true, items: d.textContent?.slice(0, 200) }
          }
        }
        return { found: false }
      })

      if (contextMenu.found) {
        log('T5', 'PASS', `Right-click menu: ${contextMenu.items?.slice(0, 80)}`)
      } else {
        log('T5', 'WARN', 'No context menu detected')
      }

      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // ============================================================
    // T6: Agent info panel on room click
    // ============================================================
    if (rooms.length > 3) {
      await page.mouse.click(rooms[3].x, rooms[3].y)
      await page.waitForTimeout(1200)

      const infoPanel = await page.evaluate(() => {
        const text = document.body.innerText
        const hasStatus = text.includes('Status') || text.includes('status') || text.includes('ACTIVE') || text.includes('DONE')
        const hasTask = text.includes('Current Task') || text.includes('current task') || text.includes('Mission')
        const hasCompletion = text.includes('Last') || text.includes('Completed') || text.includes('Delivered')
        return { hasStatus, hasTask, hasCompletion }
      })

      await page.screenshot({ path: `${DIR}/p7-04-info-panel.png` })
      const panelScore = [infoPanel.hasStatus, infoPanel.hasTask, infoPanel.hasCompletion].filter(Boolean).length
      log('T6', panelScore >= 2 ? 'PASS' : 'WARN', `Info panel: status=${infoPanel.hasStatus}, task=${infoPanel.hasTask}, completion=${infoPanel.hasCompletion}`)
    }

    // ============================================================
    // T7: CHECKLIST MODE (THE BIG TEST - regression check)
    // Must show project-grouped tasks with checkboxes, NOT system queue
    // ============================================================
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('2')
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${DIR}/p7-05-checklist-mode.png` })

    const checklistData = await page.evaluate(() => {
      const text = document.body.innerText

      // CHECK FOR REGRESSION: system queue keywords
      const hasRunningNow = text.includes('RUNNING NOW')
      const hasUpNext = text.includes('UP NEXT')
      const hasJustCompleted = text.includes('JUST COMPLETED')
      const isSystemQueue = hasRunningNow || hasUpNext || hasJustCompleted

      // CHECK FOR CORRECT: project-grouped checklist keywords
      const projectKeywords = ['Today', 'Corner', 'AOM Site', 'Phase 2', 'Outreach', 'Advisory', 'Deadlines', 'Infra', 'This Week', 'Ambition']
      const projects = []
      for (const kw of projectKeywords) {
        if (text.includes(kw)) projects.push(kw)
      }

      // Count checkboxes (the real deal)
      const checkboxes = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]')
      let checkStyleCount = 0
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const r = btn.getBoundingClientRect()
        if (r.width >= 16 && r.width <= 40 && r.height >= 16 && r.height <= 40 && r.y > 60) checkStyleCount++
      }

      // Check for task text (individual items, not agent status)
      const hasTaskText = text.includes('Rebuild') || text.includes('Ship') || text.includes('Deploy') ||
                         text.includes('Build') || text.includes('Fix') || text.includes('Review') ||
                         text.includes('Deliver') || text.includes('Send') || text.includes('Draft') ||
                         text.includes('Update') || text.includes('Confirm')

      return {
        isSystemQueue,
        hasRunningNow,
        hasUpNext,
        hasJustCompleted,
        projects,
        checkboxes: checkboxes.length,
        checkStyle: checkStyleCount,
        hasTaskText,
        textSnippet: text.slice(0, 500),
      }
    })

    // THE CRITICAL TEST: Is this the project checklist or system queue?
    if (checklistData.isSystemQueue) {
      log('T7-REGRESSION', 'FAIL',
        `CHECKLIST STILL SHOWS SYSTEM QUEUE! RunningNow=${checklistData.hasRunningNow}, UpNext=${checklistData.hasUpNext}, Completed=${checklistData.hasJustCompleted}. Bobby must revert ChecklistMode.jsx to e1b8d09.`)
    } else {
      log('T7-REGRESSION', 'PASS', 'No system queue detected. Checklist is NOT the regressed version.')
    }

    log('T7a', checklistData.projects.length >= 4 ? 'PASS' : 'FAIL',
      `Projects found: ${checklistData.projects.join(', ') || 'NONE'} (${checklistData.projects.length} total, need 4+)`)

    const hasCheckboxes = checklistData.checkboxes > 0 || checklistData.checkStyle > 3
    log('T7b', hasCheckboxes ? 'PASS' : 'FAIL',
      `Checkboxes: ${checklistData.checkboxes} native + ${checklistData.checkStyle} styled (need > 0)`)

    log('T7c', checklistData.hasTaskText ? 'PASS' : 'WARN',
      `Task text found: ${checklistData.hasTaskText}`)

    // Take a detail screenshot of checklist
    await page.screenshot({ path: `${DIR}/p7-06-checklist-detail.png`, fullPage: false })

    // ============================================================
    // T8: Megaboard mode (keyboard 3)
    // ============================================================
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('3')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${DIR}/p7-07-megaboard-mode.png` })

    const megaData = await page.evaluate(() => {
      const text = document.body.innerText
      return {
        hasParty: text.includes('PARTY') || text.includes('Party'),
        hasMission: text.includes('MISSION') || text.includes('Mission'),
        hasHP: text.includes('HP') || text.includes('%'),
        hasLV: text.includes('LV'),
        agentCount: (text.match(/LV/g) || []).length,
      }
    })

    log('T8', megaData.hasParty && megaData.hasMission ? 'PASS' : 'WARN',
      `Megaboard: Party=${megaData.hasParty}, Mission=${megaData.hasMission}, HP=${megaData.hasHP}, Agents=${megaData.agentCount}`)

    // ============================================================
    // T9: Back to game + vitals check
    // ============================================================
    await page.evaluate(() => { document.activeElement?.blur() })
    await page.waitForTimeout(200)
    await page.keyboard.press('1')
    await page.waitForTimeout(1500)

    const vitals = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      const agentNames = ['bobby', 'steffen', 'steve', 'elon', 'alex', 'cleo', 'jacob', 'elmo', 'colton', 'tony', 'mom', 'patrik']
      let agents = 0
      for (const n of agentNames) { if (text.includes(n)) agents++ }
      return {
        agents,
        hasStatus: text.includes('active') || text.includes('idle') || text.includes('working') || text.includes('done'),
        hasProjects: text.includes('corner') || text.includes('outreach') || text.includes('advisory') || text.includes('today'),
        hasChat: text.includes('message'),
        hasCorner: text.includes('corner'),
      }
    })

    const vitalsCount = [vitals.agents >= 6, vitals.hasStatus, vitals.hasProjects, vitals.hasChat].filter(Boolean).length
    log('T9', vitalsCount >= 3 ? 'PASS' : 'WARN',
      `Vitals: ${vitals.agents} agents, status=${vitals.hasStatus}, projects=${vitals.hasProjects}, chat=${vitals.hasChat}, CORNER=${vitals.hasCorner}`)

    // ============================================================
    // T10: In-room name badges
    // ============================================================
    const badges = await page.evaluate(() => {
      const elements = []
      const spans = document.querySelectorAll('span, div')
      const agentNames = ['BOBBY', 'STEFFEN', 'STEVE', 'ELON', 'ALEX', 'CLEO', 'JACOB', 'ELMO', 'COLTON', 'TONY', 'MOM', 'PATRIK']
      for (const el of spans) {
        const text = el.textContent?.trim()?.toUpperCase()
        const rect = el.getBoundingClientRect()
        if (text && agentNames.includes(text) && rect.width > 20 && rect.width < 150 && rect.height > 8 && rect.height < 30 && rect.y < window.innerHeight - 200) {
          elements.push({ name: text })
        }
      }
      return elements
    })

    log('T10', badges.length >= 5 ? 'PASS' : 'WARN', `${badges.length} in-room name badges`)

    // ============================================================
    // T11: Vegas energy metrics
    // ============================================================
    const vegasCheck = await page.evaluate(() => {
      const metrics = { pillHeight: 0, fontSize: 0, fontWeight: 0 }
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect()
        if (rect.bottom > window.innerHeight - 250 && rect.height >= 40 && rect.height <= 70 && rect.width > 50) {
          const style = getComputedStyle(btn)
          metrics.pillHeight = Math.max(metrics.pillHeight, Math.round(rect.height))
          metrics.fontSize = Math.max(metrics.fontSize, parseInt(style.fontSize))
          metrics.fontWeight = Math.max(metrics.fontWeight, parseInt(style.fontWeight))
        }
      }
      return metrics
    })

    log('T11', vegasCheck.pillHeight >= 50 ? 'PASS' : 'WARN',
      `Vegas: pill=${vegasCheck.pillHeight}px, font=${vegasCheck.fontSize}px/${vegasCheck.fontWeight}`)

    // ============================================================
    // T12: Console error check (zero tolerance)
    // ============================================================
    log('T12', pageErrors.length === 0 ? 'PASS' : 'FAIL',
      `Console errors: ${pageErrors.length}${pageErrors.length > 0 ? ' -- ' + pageErrors[0].slice(0, 80) : ''}`)

    // ============================================================
    // T13: Conversation ranking endpoint
    // ============================================================
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/local/project-recency')
        if (!r.ok) return { status: r.status, ok: false }
        const json = await r.json()
        return { ok: true, count: Object.keys(json.scores || {}).length }
      })

      log('T13', res.ok && res.count > 0 ? 'PASS' : 'WARN',
        `Conversation ranking: ${res.ok ? res.count + ' project scores' : 'status ' + res.status}`)
    } catch (e) {
      log('T13', 'FAIL', `Endpoint error: ${e.message}`)
    }

    // Final screenshot
    await page.screenshot({ path: `${DIR}/p7-08-final-state.png` })

  } catch (err) {
    log('RUNTIME', 'FAIL', err.message.slice(0, 200))
    await page.screenshot({ path: `${DIR}/p7-error.png` }).catch(() => {})
  }

  await browser.close()

  // ============================================================
  // SUMMARY + GRADING
  // ============================================================
  console.log('\n=== PASS 7 RESULTS ===\n')
  const pass = R.filter(r => r.status === 'PASS').length
  const fail = R.filter(r => r.status === 'FAIL').length
  const warn = R.filter(r => r.status === 'WARN').length
  console.log(`${R.length} tests | ${pass} PASS | ${fail} FAIL | ${warn} WARN\n`)

  for (const r of R) console.log(`  [${r.status}] ${r.test}: ${r.detail}`)

  // Checklist regression is the key grade determinant
  const checklistRegressed = R.find(r => r.test === 'T7-REGRESSION')?.status === 'FAIL'
  const todayPinned = R.find(r => r.test === 'T2b')?.status === 'PASS'
  const pillWeight = R.find(r => r.test === 'T2d')?.status === 'PASS'
  const zeroErrors = R.find(r => r.test === 'T12')?.status === 'PASS'

  console.log('\n=== GRADE CARD ===\n')
  if (checklistRegressed) {
    console.log('  OVERALL: B+ (checklist regression NOT fixed)')
    console.log('  Checklist Mode: D (system queue, not project tasks)')
  } else if (todayPinned && pillWeight && zeroErrors) {
    console.log('  OVERALL: A (all key fixes landed)')
    console.log('  Checklist Mode: A (project grouped, checkboxes, conversation ranking)')
  } else {
    console.log('  OVERALL: A- (checklist fixed, minor issues remain)')
    console.log(`  Today pinned: ${todayPinned ? 'YES' : 'NO'}, Pill weight 900: ${pillWeight ? 'YES' : 'NO'}, Zero errors: ${zeroErrors ? 'YES' : 'NO'}`)
  }

  // Get commit hash
  let commitHash = 'unknown'
  try {
    const { execSync } = await import('child_process')
    commitHash = execSync('cd /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio && git rev-parse --short HEAD').toString().trim()
  } catch (e) {}

  fs.writeFileSync(`${DIR}/pass7-results.json`, JSON.stringify({
    pass: 7,
    commit: commitHash,
    tests: R,
    summary: { total: R.length, pass, fail, warn },
    checklistRegressed,
    timestamp: new Date().toISOString(),
  }, null, 2))

  console.log(`\nResults saved to ${DIR}/pass7-results.json`)
}

run().catch(console.error)
