import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

async function openFixtureRoom(page) {
  await page.goto(`${BASE}/dashboard?cv6=1&view=home&demo=mobile-viewport`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-cv6]').first().waitFor()
  await page.getByRole('button', { name: 'Search', exact: true }).first().click()
  await page.getByPlaceholder('Search rooms and missions…').fill('Web')
  await page.locator('.sres', { hasText: 'Web' }).first().click()
  const chat = page.locator('[data-screen="chat-room"]')
  await expect(chat).toBeVisible()
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.cv6-workspace-canvas')
    const column = document.querySelector('[data-workspace-column][data-column-type="chat"]')
    return canvas && column && Math.abs(canvas.scrollLeft - column.offsetLeft) <= 2
  })
}

test('mobile removes sibling-page footer padding and keeps the composer on the active viewport edge', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto(`${BASE}/dashboard?cv6=1&view=command`, { waitUntil: 'domcontentloaded' })
  const siblingPadding = await page.locator('.scrbody:visible').first().evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))
  expect(siblingPadding).toBeLessThan(100)

  await page.route('**/api/dashboard/supabase-messages**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }))
  await openFixtureRoom(page)

  const resting = await page.evaluate(() => {
    const shell = document.querySelector('.cv6-app-shell').getBoundingClientRect()
    const composer = document.querySelector('[data-screen="chat-room"] > .mcomposer').getBoundingClientRect()
    const input = document.querySelector('[data-testid="cv6-chat-input"]')
    return {
      shellBottomGap: Math.abs(window.innerHeight - shell.bottom),
      composerBottomGap: shell.bottom - composer.bottom,
      inputFontSize: parseFloat(getComputedStyle(input).fontSize),
    }
  })
  expect(resting.shellBottomGap).toBeLessThanOrEqual(1)
  expect(resting.composerBottomGap).toBeLessThanOrEqual(40)
  expect(resting.inputFontSize).toBeGreaterThanOrEqual(16)
  await page.screenshot({ path: '/tmp/corner-cv6-mobile-resting.png' })

  await page.locator('[data-testid="cv6-chat-input"]').focus()
  await expect(page.locator('html.cv6-keyboard-open')).toBeVisible()
  await page.waitForTimeout(420)
  await page.evaluate(() => {
    const root = document.documentElement
    root.classList.add('cv6-keyboard-open')
    root.style.setProperty('--cv6-viewport-height', '430px')
    root.style.setProperty('--cv6-viewport-top', '72px')
  })
  const focused = await page.evaluate(() => {
    const shell = document.querySelector('.cv6-app-shell').getBoundingClientRect()
    const composer = document.querySelector('[data-screen="chat-room"] > .mcomposer').getBoundingClientRect()
    return { top: shell.top, height: shell.height, composerBottomGap: shell.bottom - composer.bottom }
  })
  expect(focused.top).toBeCloseTo(72, 0)
  expect(focused.height).toBeCloseTo(430, 0)
  expect(focused.composerBottomGap).toBeLessThanOrEqual(9)
  await page.screenshot({ path: '/tmp/corner-cv6-mobile-keyboard-viewport.png' })
})
