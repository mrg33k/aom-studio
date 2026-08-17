import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

test('375px room keeps every frequent control at least 44px with no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('cv6-chat-input')).toBeVisible()

  const geometry = await page.evaluate(() => {
    const selectors = [
      '.cv6-room-avatar-button',
      '.cv6-composer-attach',
      '[data-role="composer-actions"] button',
    ].join(',')
    const controls = [...document.querySelectorAll(selectors)].map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        name: element.getAttribute('aria-label') || element.title || element.textContent?.trim(),
        width: rect.width,
        height: rect.height,
      }
    })
    return {
      innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls,
    }
  })

  expect(geometry.innerWidth).toBe(375)
  expect(geometry.scrollWidth).toBe(375)
  expect(geometry.controls.length).toBeGreaterThanOrEqual(6)
  expect(geometry.controls.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true)
})
