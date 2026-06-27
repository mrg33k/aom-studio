// Corner Test Pass 5c: Steve Coach grading current HEAD (e1b8d09)
// Tests the ACTUAL running state including 3bf22be (conversation ranking) + e1b8d09 (Vegas v2)
// Proper password handling + defocus before keyboard shortcuts

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

  page.on('pageerror', (err) => log('PAGE_ERROR', 'WARN', err.message.slice(0, 120)))

  try {
    // STEP 0: Load + authenticate
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(1500)

    const pwInput = await page.$('input[type="password"]')
    if (pwInput) {
      await pwInput.fill('aomhq')
      await page.click('button:has-text("ENTER")')
      await page.waitForTimeout(3000)
      log('T0', 'PASS', 'Authenticated via password gate')
    } else {
      log('T0', 'PASS', 'No password gate (already authenticated)')
    }

    // Defocus any input before keyboard shortcuts
    await page.click('body', { position: { x: 10, y: 10 } })
    await page.waitForTimeout(500)

    // SCREENSHOT: Game mode initial
    await page.screenshot({ path: `${DIR}/p5c-01-game.png` })

    // ============================================================
    // T1: Building renders
    // ============================================================
    const buildingImg = await page.$('img[src*="full-office"]')
    if (buildingImg) {
      const box = await buildingImg.boundingBox()
      log('T1', 'PASS', `Building ${Math.round(box.width)}x${Math.round(box.height)}px`)
    } else {
      log('T1', 'WARN', 'No full-office image found')
    }

    // ============================================================
    // T2: HUD pills with recency ordering
    // ============================================================
    const pillInfo = await page.evaluate(() => {
      const pills = []
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const text = btn.textContent?.trim()
        const rect = btn.getBoundingClientRect()
        // HUD pills: in bottom area, medium size
        if (rect.bottom > window.innerHeight - 250 && rect.height >= 40 && rect.height <= 70 &&
            rect.width > 50 && rect.width < 280 && text && text.length < 30) {
          pills.push({ text, x: Math.round(rect.x), y: Math.round(rect.y), h: Math.round(rect.height), w: Math.round(rect.width) })
        }
      }
      pills.sort((a, b) => a.x - b.x)
      return pills
    })

    if (pillInfo.length > 3) {
      const pillTexts = pillInfo.map(p => p.text.replace(/\n/g, ' ').trim())
      const cornerPill = pillInfo.find(p => p.text.toLowerCase().includes('corner'))
      const todayFirst = pillInfo[0]?.text?.toLowerCase().includes('today')

      log('T2a', pillInfo.length >= 5 ? 'PASS' : 'WARN', `${pillInfo.length} pills: ${pillTexts.slice(0, 6).join(' | ')}`)
      log('T2b', todayFirst ? 'PASS' : 'WARN', `First pill: "${pillTexts[0]}" (expected Today)`)
      log('T2c', cornerPill ? 'PASS' : 'FAIL', cornerPill ? `Corner pill at position ${pillInfo.indexOf(cornerPill) + 1}` : 'No "Corner" pill found')
    } else {
      log('T2', 'WARN', `Only ${pillInfo.length} pills found`)
    }

    // ============================================================
    // T3: Conversation ranking endpoint
    // ============================================================
    try {
      const res = await page.evaluate(async () => {
        const r = await fetch('/api/local/project-recency')
        if (!r.ok) return { status: r.status, ok: false }
        const json = await r.json()
        return { ok: true, scores: json.scores, count: Object.keys(json.scores || {}).length }
      })

      if (res.ok && res.count > 0) {
        log('T3', 'PASS', `Conversation ranking endpoint returns ${res.count} project scores`)
      } else if (res.ok) {
        log('T3', 'WARN', `Endpoint returns OK but ${res.count} scores`)
      } else {
        log('T3', 'FAIL', `Endpoint returned ${res.status}`)
      }
    } catch (e) {
      log('T3', 'FAIL', `Endpoint error: ${e.message}`)
    }

    // ============================================================
    // T4: Room click -> chat agent switch
    // ============================================================
    // Get chat placeholder before
    const chatBefore = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]')
      for (const inp of inputs) {
        if (inp.placeholder.toLowerCase().includes('message')) return inp.placeholder
      }
      return null
    })

    // Find and click a room that's NOT the default agent
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
      // Click a room in the middle (likely Bobby or Colton)
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

      await page.screenshot({ path: `${DIR}/p5c-02-room-click.png` })

      if (chatBefore && chatAfter && chatBefore !== chatAfter) {
        log('T4', 'PASS', `Chat switched: "${chatBefore}" -> "${chatAfter}"`)
      } else {
        log('T4', 'WARN', `Before: "${chatBefore}" After: "${chatAfter}"`)
      }
    } else {
      log('T4', 'WARN', `Only ${rooms.length} clickable rooms found`)
    }

    // ============================================================
    // T5: Right-click context menu (commit 3bf22be)
    // ============================================================
    if (rooms.length > 0) {
      await page.mouse.click(rooms[0].x, rooms[0].y, { button: 'right' })
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${DIR}/p5c-03-right-click.png` })

      const contextMenu = await page.evaluate(() => {
        const menus = document.querySelectorAll('[role="menu"], [class*="context"], [class*="Context"]')
        if (menus.length > 0) return { found: true, items: menus[0].textContent?.slice(0, 200) }
        // Also check for any new overlay that appeared
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

      // Dismiss menu
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }

    // ============================================================
    // T6: Checklist mode (keyboard 2)
    // ============================================================
    await page.click('body', { position: { x: 10, y: 10 } })
    await page.waitForTimeout(200)
    await page.keyboard.press('2')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${DIR}/p5c-04-checklist.png` })

    const checklistData = await page.evaluate(() => {
      const text = document.body.innerText
      const projects = []
      for (const kw of ['Today', 'Corner', 'AOM Site', 'Phase 2', 'Outreach', 'Advisory', 'Deadlines', 'Infra', 'This Week', 'Ambition']) {
        if (text.includes(kw)) projects.push(kw)
      }
      // Count checkboxes
      const checkboxes = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]')
      // Count small clickable elements (checkbox-sized)
      let checkStyleCount = 0
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const r = btn.getBoundingClientRect()
        if (r.width >= 16 && r.width <= 40 && r.height >= 16 && r.height <= 40 && r.y > 60) checkStyleCount++
      }
      return { projects, checkboxes: checkboxes.length, checkStyle: checkStyleCount }
    })

    log('T6a', checklistData.projects.length >= 4 ? 'PASS' : 'FAIL',
      `Projects in checklist: ${checklistData.projects.join(', ')}`)
    log('T6b', checklistData.checkboxes > 0 || checklistData.checkStyle > 3 ? 'PASS' : 'WARN',
      `Checkboxes: ${checklistData.checkboxes} native, ${checklistData.checkStyle} styled`)

    // ============================================================
    // T7: Megaboard mode (keyboard 3)
    // ============================================================
    await page.click('body', { position: { x: 10, y: 10 } })
    await page.waitForTimeout(200)
    await page.keyboard.press('3')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${DIR}/p5c-05-megaboard.png` })

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

    log('T7', megaData.hasParty && megaData.hasMission ? 'PASS' : 'WARN',
      `Megaboard: Party=${megaData.hasParty}, Mission=${megaData.hasMission}, HP=${megaData.hasHP}, Agents=${megaData.agentCount}`)

    // ============================================================
    // T8: Back to game + 30-second test
    // ============================================================
    await page.click('body', { position: { x: 10, y: 10 } })
    await page.waitForTimeout(200)
    await page.keyboard.press('1')
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${DIR}/p5c-06-game-final.png` })

    const vitals = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase()
      const agentNames = ['bobby', 'steffen', 'steve', 'elon', 'alex', 'cleo', 'jacob', 'elmo', 'colton', 'tony', 'mom', 'patrik']
      let agents = 0
      for (const n of agentNames) { if (text.includes(n)) agents++ }

      return {
        agents,
        hasStatus: text.includes('active') || text.includes('idle') || text.includes('working') || text.includes('done') || text.includes('paused') || text.includes('blocked'),
        hasProjects: text.includes('corner') || text.includes('outreach') || text.includes('advisory') || text.includes('today') || text.includes('ambition'),
        hasChat: text.includes('message'),
        hasCorner: text.includes('corner'),
      }
    })

    const vitalsCount = [vitals.agents >= 6, vitals.hasStatus, vitals.hasProjects, vitals.hasChat].filter(Boolean).length
    log('T8', vitalsCount >= 3 ? 'PASS' : 'WARN',
      `Day vitals: ${vitals.agents} agents, status=${vitals.hasStatus}, projects=${vitals.hasProjects}, chat=${vitals.hasChat}, CORNER=${vitals.hasCorner}`)

    // ============================================================
    // T9: In-room name badges (commit 3bf22be)
    // ============================================================
    const badges = await page.evaluate(() => {
      // Look for small text elements inside the building area with agent names
      const elements = []
      const spans = document.querySelectorAll('span, div')
      const agentNames = ['BOBBY', 'STEFFEN', 'STEVE', 'ELON', 'ALEX', 'CLEO', 'JACOB', 'ELMO', 'COLTON', 'TONY', 'MOM', 'PATRIK']
      for (const el of spans) {
        const text = el.textContent?.trim()?.toUpperCase()
        const rect = el.getBoundingClientRect()
        if (text && agentNames.includes(text) && rect.width > 20 && rect.width < 150 && rect.height > 8 && rect.height < 30 && rect.y < window.innerHeight - 200) {
          const style = getComputedStyle(el)
          elements.push({ name: text, fontSize: style.fontSize, fontWeight: style.fontWeight, y: Math.round(rect.y) })
        }
      }
      return elements
    })

    if (badges.length >= 5) {
      log('T9', 'PASS', `${badges.length} in-room name badges found (${badges.slice(0, 4).map(b => b.name).join(', ')}...)`)
    } else {
      log('T9', 'WARN', `Only ${badges.length} name badges found`)
    }

    // ============================================================
    // T10: Vegas Energy metrics
    // ============================================================
    const vegasCheck = await page.evaluate(() => {
      const metrics = { pillHeight: 0, fontSize: 0, fontWeight: 0, borderRadius: 0 }
      const buttons = document.querySelectorAll('button, [role="button"]')
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect()
        if (rect.bottom > window.innerHeight - 250 && rect.height >= 40 && rect.height <= 70 && rect.width > 50) {
          const style = getComputedStyle(btn)
          metrics.pillHeight = Math.max(metrics.pillHeight, Math.round(rect.height))
          metrics.fontSize = Math.max(metrics.fontSize, parseInt(style.fontSize))
          metrics.fontWeight = Math.max(metrics.fontWeight, parseInt(style.fontWeight))
          metrics.borderRadius = Math.max(metrics.borderRadius, parseInt(style.borderRadius))
        }
      }
      return metrics
    })

    log('T10', vegasCheck.pillHeight >= 50 ? 'PASS' : 'WARN',
      `Vegas: pill=${vegasCheck.pillHeight}px, font=${vegasCheck.fontSize}px/${vegasCheck.fontWeight}, radius=${vegasCheck.borderRadius}px`)

  } catch (err) {
    log('RUNTIME', 'FAIL', err.message.slice(0, 200))
    await page.screenshot({ path: `${DIR}/p5c-error.png` }).catch(() => {})
  }

  await browser.close()

  // Summary
  console.log('\n=== PASS 5c RESULTS ===\n')
  const pass = R.filter(r => r.status === 'PASS').length
  const fail = R.filter(r => r.status === 'FAIL').length
  const warn = R.filter(r => r.status === 'WARN').length
  console.log(`${R.length} tests | ${pass} PASS | ${fail} FAIL | ${warn} WARN\n`)
  for (const r of R) console.log(`  [${r.status}] ${r.test}: ${r.detail}`)

  fs.writeFileSync(`${DIR}/pass5c-results.json`, JSON.stringify({ commit: 'e1b8d09', tests: R, summary: { pass, fail, warn } }, null, 2))
}

run().catch(console.error)
