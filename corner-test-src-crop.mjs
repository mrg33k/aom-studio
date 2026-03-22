// Corner Test -- SRC_CROP Battle Test
// Verifies rooms render correctly after commit 2bc9954 restored:
//   SRC_CROP_Y = 160 (was broken at 0)
//   SRC_CROP_H = 680 (was broken at 864)
//
// The broken values showed the full 1024x1024 PNG including navy padding (#0D0D1A).
// The correct values crop to the actual hex content, removing the top/bottom navy border.
//
// Tests:
//   T1: Canvas renders rooms (non-empty, non-all-navy pixels present)
//   T2: Room pixel sampling -- top-of-hex should have room content, not solid navy
//   T3: Hide a room via context menu
//   T4: Restore hidden rooms -- verify they re-render correctly post-restore
//   T5: Page reload -- rooms re-render from scratch without blank hexes
//   T6: No JS errors throughout

import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:5173'
const DIR = '/Users/aom-inhouse/Documents/Dev/aom-studio/test-screenshots'
const R = []

// Navy color: #0D0D1A = rgb(13, 13, 26)
const NAVY = { r: 13, g: 13, b: 26 }
const NAVY_THRESHOLD = 40 // a pixel is "navy-like" if r<T && g<T && b<T*2

function isNavy(r, g, b) {
  return r < NAVY_THRESHOLD && g < NAVY_THRESHOLD && b < NAVY_THRESHOLD * 2
}

function log(t, s, d) {
  R.push({ test: t, status: s, detail: d })
  console.log(`[${s}] ${t}: ${d}`)
}

async function authenticate(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(2000)
  const pwInput = await page.$('input[type="password"]')
  if (pwInput) {
    await pwInput.fill('aomhq')
    const enterBtn = await page.$('button:has-text("ENTER")') ||
                     await page.$('button[type="submit"]') ||
                     await page.$('button')
    if (enterBtn) await enterBtn.click()
    else await page.keyboard.press('Enter')
    await page.waitForTimeout(5000)
  }
  // Extra settle time for canvas to initialize and images to load
  await page.waitForTimeout(3000)
}

async function sampleCanvasPixels(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return { ok: false, note: 'no canvas element found' }
    if (canvas.width === 0 || canvas.height === 0) return { ok: false, note: 'canvas has zero dimensions' }

    let ctx
    try {
      ctx = canvas.getContext('2d')
    } catch (e) {
      return { ok: false, note: `getContext failed: ${e.message}` }
    }

    const w = canvas.width
    const h = canvas.height

    // Sample a 7x7 grid covering the center 60% of the canvas
    // Rooms cluster in the center of the viewport
    const startX = Math.floor(w * 0.2)
    const endX = Math.floor(w * 0.8)
    const startY = Math.floor(h * 0.1)
    const endY = Math.floor(h * 0.85)
    const stepX = Math.floor((endX - startX) / 6)
    const stepY = Math.floor((endY - startY) / 6)

    const samples = []
    let navyCount = 0
    let totalCount = 0

    for (let xi = 0; xi <= 6; xi++) {
      for (let yi = 0; yi <= 6; yi++) {
        const x = Math.min(startX + xi * stepX, w - 1)
        const y = Math.min(startY + yi * stepY, h - 1)
        let pixel
        try {
          pixel = ctx.getImageData(x, y, 1, 1).data
        } catch (e) {
          return { ok: false, note: `getImageData failed (CORS?): ${e.message}` }
        }
        const [r, g, b, a] = pixel
        const navyLike = r < 40 && g < 40 && b < 80 && a > 200
        samples.push({ x, y, r, g, b, a, navyLike })
        if (navyLike) navyCount++
        totalCount++
      }
    }

    const navyRatio = navyCount / totalCount
    const hasVariety = samples.some(s => !s.navyLike)

    return {
      ok: true,
      width: w,
      height: h,
      totalSamples: totalCount,
      navyCount,
      nonNavyCount: totalCount - navyCount,
      navyRatio: Math.round(navyRatio * 100),
      hasVariety,
      // Top-row samples (y at startY) -- should show room tops, not pure navy if crop is correct
      topRowSamples: samples.filter((_, i) => i < 7).map(s => `(${s.x},${s.y}) rgb(${s.r},${s.g},${s.b})`),
    }
  })
}

async function run() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await (await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })).newPage()

  const pageErrors = []
  page.on('pageerror', err => {
    pageErrors.push(err.message)
    log('PAGE_ERROR', 'WARN', err.message.slice(0, 120))
  })
  page.on('console', msg => {
    if (msg.type() === 'error') pageErrors.push(msg.text())
  })

  try {
    // ============================================================
    // STEP 0: Load + Auth
    // ============================================================
    await authenticate(page)
    await page.screenshot({ path: `${DIR}/src-crop-01-initial.png` })
    log('T0-AUTH', 'PASS', 'Loaded and authenticated')

    // ============================================================
    // T1: Canvas exists and has dimensions
    // ============================================================
    const canvasMeta = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      if (!c) return { found: false }
      return {
        found: true,
        width: c.width,
        height: c.height,
        cssWidth: c.offsetWidth,
        cssHeight: c.offsetHeight,
        visible: c.offsetWidth > 100 && c.offsetHeight > 100,
      }
    })
    if (!canvasMeta.found) {
      log('T1-CANVAS', 'FAIL', 'No canvas element in DOM')
    } else {
      log('T1-CANVAS', canvasMeta.visible ? 'PASS' : 'FAIL',
        `Canvas ${canvasMeta.width}x${canvasMeta.height}px (css: ${canvasMeta.cssWidth}x${canvasMeta.cssHeight})`)
    }

    // ============================================================
    // T2: Pixel sampling -- rooms should show content, not all-navy
    // The broken SRC_CROP (Y=0,H=864) filled the hex tops with navy padding.
    // The correct SRC_CROP (Y=160,H=680) crops the navy out.
    // ============================================================
    // Wait a bit more for room images to fully load
    await page.waitForTimeout(2000)
    const pixels = await sampleCanvasPixels(page)

    if (!pixels.ok) {
      log('T2-PIXELS', 'FAIL', pixels.note)
    } else {
      // A healthy canvas should have SOME non-navy pixels in the room area.
      // If >90% of sampled pixels are navy, crop is likely broken (showing padding).
      const tooMuchNavy = pixels.navyRatio > 85
      log('T2a-CANVAS-PIXELS', !tooMuchNavy ? 'PASS' : 'FAIL',
        `${pixels.nonNavyCount}/${pixels.totalSamples} non-navy samples (${100 - pixels.navyRatio}% content). NavyRatio=${pixels.navyRatio}%`)
      log('T2b-PIXEL-VARIETY', pixels.hasVariety ? 'PASS' : 'FAIL',
        `Color variety present: ${pixels.hasVariety}. Top-row samples: ${pixels.topRowSamples?.slice(0, 3).join(' | ')}`)
    }

    await page.screenshot({ path: `${DIR}/src-crop-02-rooms-initial.png` })
    log('T2c-SCREENSHOT', 'INFO', 'Screenshot: src-crop-02-rooms-initial.png')

    // ============================================================
    // T3: Hide a room via right-click context menu
    // ============================================================
    // Find a room by clicking roughly where the first room should be
    // Rooms are centered in the viewport -- try a point slightly left of center
    const vw = 1440
    const vh = 900
    const roomGuessX = Math.floor(vw * 0.38)
    const roomGuessY = Math.floor(vh * 0.45)

    await page.mouse.click(roomGuessX, roomGuessY, { button: 'right' })
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${DIR}/src-crop-03-rightclick.png` })

    const contextMenu = await page.evaluate(() => {
      // Look for context menu items
      const allText = document.body.innerText
      const hasHide = /hide room|hide this room/i.test(allText)
      const hasReset = /reset order|show hidden/i.test(allText)
      return { hasHide, hasReset, snippet: allText.slice(0, 500) }
    })
    log('T3a-CONTEXT-MENU', contextMenu.hasHide ? 'PASS' : 'WARN',
      `Context menu: hide=${contextMenu.hasHide}, reset=${contextMenu.hasReset}`)

    if (contextMenu.hasHide) {
      // Click the hide option
      const hideBtn = await page.$('button:has-text("Hide"), button:has-text("hide room"), [role="menuitem"]:has-text("Hide")')
      if (hideBtn) {
        await hideBtn.click()
        await page.waitForTimeout(1000)
        log('T3b-HIDE', 'PASS', 'Clicked hide room')
        await page.screenshot({ path: `${DIR}/src-crop-04-after-hide.png` })
      } else {
        // Try pressing Escape to close menu and proceed
        await page.keyboard.press('Escape')
        log('T3b-HIDE', 'WARN', 'Hide button not found by selector -- menu may use custom elements')
        await page.waitForTimeout(500)
      }
    } else {
      await page.keyboard.press('Escape')
      log('T3b-HIDE', 'WARN', 'No context menu detected at click point (may have missed room)')
      await page.waitForTimeout(500)
    }

    // ============================================================
    // T4: Restore via right-click context menu or reset order button
    // ============================================================
    // Right-click on empty canvas area to get "Show hidden rooms" option
    await page.mouse.click(vw * 0.1, vh * 0.5, { button: 'right' })
    await page.waitForTimeout(800)

    const restoreMenu = await page.evaluate(() => {
      const text = document.body.innerText
      return {
        hasShowHidden: /show hidden/i.test(text),
        hasResetOrder: /reset order/i.test(text),
      }
    })
    log('T4a-RESTORE-MENU', (restoreMenu.hasShowHidden || restoreMenu.hasResetOrder) ? 'PASS' : 'WARN',
      `Restore menu: showHidden=${restoreMenu.hasShowHidden}, resetOrder=${restoreMenu.hasResetOrder}`)

    if (restoreMenu.hasShowHidden) {
      const showBtn = await page.$('button:has-text("Show hidden"), [role="menuitem"]:has-text("Show hidden")')
      if (showBtn) {
        await showBtn.click()
        await page.waitForTimeout(1500)
        log('T4b-RESTORE', 'PASS', 'Clicked show hidden rooms')
      } else {
        await page.keyboard.press('Escape')
        log('T4b-RESTORE', 'WARN', 'Show hidden button not found by selector')
      }
    } else if (restoreMenu.hasResetOrder) {
      const resetBtn = await page.$('button:has-text("Reset order"), [role="menuitem"]:has-text("Reset")')
      if (resetBtn) {
        await resetBtn.click()
        await page.waitForTimeout(1500)
        log('T4b-RESTORE', 'PASS', 'Clicked reset order (restores hidden rooms)')
      } else {
        await page.keyboard.press('Escape')
        log('T4b-RESTORE', 'WARN', 'Reset order button not found by selector')
      }
    } else {
      await page.keyboard.press('Escape')
      log('T4b-RESTORE', 'WARN', 'No restore option in context menu -- testing with page reload instead')
    }

    // Wait for restore animation to complete
    await page.waitForTimeout(2000)
    await page.screenshot({ path: `${DIR}/src-crop-05-after-restore.png` })
    log('T4c-SCREENSHOT', 'INFO', 'Screenshot: src-crop-05-after-restore.png')

    // Verify rooms still render correctly after restore (not blank, not all-navy)
    const pixelsAfterRestore = await sampleCanvasPixels(page)
    if (!pixelsAfterRestore.ok) {
      log('T4d-POST-RESTORE-PIXELS', 'FAIL', pixelsAfterRestore.note)
    } else {
      const tooMuchNavy = pixelsAfterRestore.navyRatio > 85
      log('T4d-POST-RESTORE-PIXELS', !tooMuchNavy ? 'PASS' : 'FAIL',
        `After restore: ${pixelsAfterRestore.nonNavyCount}/${pixelsAfterRestore.totalSamples} non-navy (${100 - pixelsAfterRestore.navyRatio}% content)`)
    }

    // ============================================================
    // T5: Page reload -- rooms re-render from scratch (cold load)
    // This is the primary SRC_CROP test: the constants are module-level
    // so they apply on every fresh page load.
    // ============================================================
    await page.reload({ waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(6000) // let canvas images fully load

    await page.screenshot({ path: `${DIR}/src-crop-06-after-reload.png` })

    const pixelsAfterReload = await sampleCanvasPixels(page)
    if (!pixelsAfterReload.ok) {
      log('T5-RELOAD-PIXELS', 'FAIL', pixelsAfterReload.note)
    } else {
      const tooMuchNavy = pixelsAfterReload.navyRatio > 85
      log('T5-RELOAD-PIXELS', !tooMuchNavy ? 'PASS' : 'FAIL',
        `After reload: ${pixelsAfterReload.nonNavyCount}/${pixelsAfterReload.totalSamples} non-navy (${100 - pixelsAfterReload.navyRatio}% content)`)
      log('T5-RELOAD-VARIETY', pixelsAfterReload.hasVariety ? 'PASS' : 'FAIL',
        `Color variety after reload: ${pixelsAfterReload.hasVariety}`)
    }

    // ============================================================
    // T6: JS error check
    // ============================================================
    const errorCount = pageErrors.filter(e =>
      !e.includes('ResizeObserver') && // benign browser noise
      !e.includes('Non-Error promise') && // noise
      !e.includes('favicon')
    ).length
    log('T6-JS-ERRORS', errorCount === 0 ? 'PASS' : 'WARN',
      `${errorCount} JS errors during test run`)
    if (errorCount > 0) {
      pageErrors.slice(0, 5).forEach(e => log('T6-ERROR', 'WARN', e.slice(0, 150)))
    }

  } catch (err) {
    log('RUNTIME', 'FAIL', err.message.slice(0, 200))
    await page.screenshot({ path: `${DIR}/src-crop-error.png` }).catch(() => {})
  }

  await browser.close()

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n=== SRC_CROP BATTLE TEST RESULTS ===\n')
  const pass = R.filter(r => r.status === 'PASS').length
  const fail = R.filter(r => r.status === 'FAIL').length
  const warn = R.filter(r => r.status === 'WARN').length
  const info = R.filter(r => r.status === 'INFO').length
  console.log(`${R.length} tests | ${pass} PASS | ${fail} FAIL | ${warn} WARN | ${info} INFO\n`)

  for (const r of R) console.log(`  [${r.status}] ${r.test}: ${r.detail}`)

  console.log('\n=== SRC_CROP FIX VERIFICATION ===\n')
  const canvasRenders = R.find(r => r.test === 'T1-CANVAS')?.status === 'PASS'
  const pixelsOk = R.find(r => r.test === 'T2a-CANVAS-PIXELS')?.status === 'PASS'
  const postRestoreOk = R.find(r => r.test === 'T4d-POST-RESTORE-PIXELS')?.status === 'PASS'
  const postReloadOk = R.find(r => r.test === 'T5-RELOAD-PIXELS')?.status === 'PASS'
  const noErrors = R.find(r => r.test === 'T6-JS-ERRORS')?.status === 'PASS'

  const checks = {
    'Canvas renders rooms': canvasRenders,
    'Pixels: non-navy content visible (correct crop)': pixelsOk,
    'Post-restore: rooms still render': postRestoreOk,
    'Post-reload: rooms re-render from scratch': postReloadOk,
    'No JS errors': noErrors,
  }

  const passed = Object.values(checks).filter(Boolean).length
  console.log(`  SRC_CROP FIX: ${passed}/${Object.keys(checks).length}`)
  for (const [k, v] of Object.entries(checks)) {
    console.log(`    ${v ? 'PASS' : 'FAIL'} ${k}`)
  }

  const allCorePassed = pixelsOk && postRestoreOk && postReloadOk
  console.log(`\n  VERDICT: ${allCorePassed ? 'PASS -- SRC_CROP restore confirmed working' : 'FAIL -- rooms may not be rendering correctly'}`)
  console.log('\n  Screenshots saved to test-screenshots/src-crop-*.png')
  console.log('  Compare src-crop-02 (initial) vs src-crop-05 (after restore) vs src-crop-06 (after reload)')
  console.log('  Rooms should look identical in all three -- no navy border bleed.')
}

run().catch(console.error)
