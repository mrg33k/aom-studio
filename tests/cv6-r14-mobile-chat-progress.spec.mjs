import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

async function open(page, query) {
  await page.goto(`${BASE}/dashboard?cv6=1&${query}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-cv6]').first().waitFor({ timeout: 15_000 })
}

test('mobile recent chats accept a real horizontal touch swipe', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'demo=m12-mobile&screen=home')

  const rail = page.locator('.mresumelist')
  await expect(page.locator('.mresumecard')).toHaveCount(4)
  expect(await rail.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  expect(await rail.evaluate((el) => getComputedStyle(el).touchAction)).toContain('pan-x')
  expect(await page.locator('.mresumecard').first().evaluate((el) => getComputedStyle(el).touchAction)).toContain('pan-x')

  const box = await rail.boundingBox()
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
  const y = box.y + box.height / 2
  const startX = box.x + box.width - 28
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] })
  for (const distance of [50, 100, 150, 200]) {
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX - distance, y }] })
    await page.waitForTimeout(24)
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => rail.evaluate((el) => el.scrollLeft)).toBeGreaterThan(80)
})

test('one live progress bar follows the bottom of the active mobile chat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/dashboard/supabase-messages**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }))
  await open(page, 'demo=mobile-chat-lifecycle')

  await expect(page.locator('[data-cv6-live-work]')).toHaveCount(1)
  await expect(page.locator('.cv6-live-progress')).toHaveCount(1)
  await expect(page.locator('[data-message-id="mobile-stale-progress"] .cv6-live-progress')).toHaveCount(0)
  await expect(page.locator('[data-message-id="mobile-stale-progress"] .gstep.is-done')).toHaveCount(1)
  expect(await page.evaluate(() => {
    const thread = document.querySelector('[data-cv6-message-thread][data-mode="latest-day"]')
    return !!thread && thread.lastElementChild?.hasAttribute('data-cv6-live-work')
  })).toBe(true)

  await expect.poll(() => page.locator('.scrbody').evaluate((el) => Math.round(el.scrollHeight - el.scrollTop - el.clientHeight))).toBeLessThanOrEqual(2)
  const geometry = await page.evaluate(() => {
    const scroll = document.querySelector('[data-screen="chat-room"] > .scrbody').getBoundingClientRect()
    const live = document.querySelector('[data-cv6-live-work]').getBoundingClientRect()
    const composer = document.querySelector('[data-screen="chat-room"] > .mcomposer').getBoundingClientRect()
    return { scrollTop: scroll.top, liveTop: live.top, liveBottom: live.bottom, composerTop: composer.top }
  })
  expect(geometry.liveTop).toBeGreaterThanOrEqual(geometry.scrollTop)
  expect(geometry.liveBottom).toBeLessThanOrEqual(geometry.composerTop + 4)
  await page.screenshot({ path: '/tmp/corner-r14-mobile-live-tail.png' })
})
