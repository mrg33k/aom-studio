// corner:cv6-polish R3 — chat send feel. The composer clears the instant a send
// fires, keeps focus, and a fast double Enter can never post twice. Runs on the
// real mobile ChatLifecycle via the no-auth demo fixture; Playwright owns the
// POSTs, so the live send path is exercised without a workspace.
import { test, expect } from '@playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

test('composer clears instantly, keeps focus, and never double-sends on fast Enter', async ({ page }) => {
  const posts = []
  await page.route('**/api/dashboard/supabase-messages', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      posts.push(JSON.parse(request.postData() || '{}'))
      // Hold the response open long enough that a double Enter would land inside
      // the in-flight window if the guard were missing.
      await new Promise((resolve) => setTimeout(resolve, 600))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message: { id: 'test-1' } }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) })
  })
  await page.route('**/api/dashboard/message-steps*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ steps: [] }) }))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-cv6-message-thread][data-variant="mobile"][data-mode="latest-day"]').waitFor({ timeout: 15_000 })

  const box = page.locator('textarea, input[type="text"]').last()
  await box.waitFor({ state: 'visible', timeout: 10_000 })
  await box.click()
  await box.fill('Send feel proof')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')

  // Cleared the moment the first Enter fired, and still focused for the next thought.
  await expect(box).toHaveValue('')
  await expect(box).toBeFocused()

  // The held-open window has passed; exactly one message POST went out.
  await page.waitForTimeout(900)
  const sends = posts.filter((p) => p && p.text === 'Send feel proof')
  expect(sends.length).toBe(1)
})

test('day-fold headers and chips acknowledge the press', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle`, { waitUntil: 'domcontentloaded' })
  const folded = page.locator('.goalcard .gc-head').first()
  await folded.waitFor({ state: 'visible', timeout: 15_000 })
  const beforeBox = await folded.boundingBox()
  await page.mouse.move(beforeBox.x + beforeBox.width / 2, beforeBox.y + beforeBox.height / 2)
  await page.mouse.down()
  await expect.poll(() => folded.evaluate((n) => Number(getComputedStyle(n).opacity))).toBeLessThan(0.9)
  await page.mouse.up()
})
