import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

async function openFixtureRoom(page) {
  await page.goto(`${BASE}/dashboard?cv6=1&view=home&demo=r15-shell`, { waitUntil: 'domcontentloaded' })
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
  return chat
}

test('mobile shell reaches the physical bottom and Chat header actions are circular icons', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/dashboard?cv6=1&view=command`, { waitUntil: 'domcontentloaded' })
  const shell = page.locator('.cv6-app-shell')
  await expect(shell).toBeVisible()
  await page.evaluate(() => document.documentElement.style.setProperty('--cv6-viewport-height', '700px'))
  const resting = await shell.evaluate((el) => {
    const rect = el.getBoundingClientRect()
    return { top: rect.top, bottom: rect.bottom, height: rect.height, viewport: window.innerHeight }
  })
  expect(resting.top).toBeCloseTo(0, 0)
  expect(resting.bottom).toBeCloseTo(resting.viewport, 0)
  expect(resting.height).toBeCloseTo(resting.viewport, 0)

  await page.route('**/api/dashboard/supabase-messages**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }))
  const chat = await openFixtureRoom(page)
  const files = chat.getByRole('button', { name: 'Files', exact: true })
  const more = chat.getByRole('button', { name: 'More', exact: true })
  for (const button of [files, more]) {
    await expect(button.locator('svg')).toHaveCount(1)
    expect((await button.textContent()).trim()).toBe('')
    const box = await button.boundingBox()
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1)
  }

  const geometry = await page.evaluate(() => {
    const shellRect = document.querySelector('.cv6-app-shell').getBoundingClientRect()
    const composerRect = document.querySelector('[data-screen="chat-room"] > .mcomposer').getBoundingClientRect()
    return { shellBottomGap: window.innerHeight - shellRect.bottom, composerBottomGap: shellRect.bottom - composerRect.bottom }
  })
  expect(geometry.shellBottomGap).toBeLessThanOrEqual(1)
  expect(geometry.composerBottomGap).toBeLessThanOrEqual(40)

  await files.click()
  await expect(page.getByText('Files', { exact: true }).last()).toBeVisible()
  await page.getByRole('button', { name: 'Close files' }).last().click()
  await more.click()
  await expect(page.getByRole('menu', { name: /More for Web/ })).toBeVisible()
  await page.screenshot({ path: '/tmp/corner-r15-mobile-shell-icons.png' })
})
