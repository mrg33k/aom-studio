import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

async function openFixtureRoom(page) {
  await page.route('**/api/dashboard/supabase-messages**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }))
  await page.goto(`${BASE}/dashboard?cv6=1&view=home&demo=r16-composer-bottom`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-cv6]').first().waitFor()
  await page.getByRole('button', { name: 'Search', exact: true }).first().click()
  await page.getByPlaceholder('Search rooms and missions…').fill('Web')
  await page.locator('.sres', { hasText: 'Web' }).first().click()
  await expect(page.locator('[data-screen="chat-room"]')).toBeVisible()
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.cv6-workspace-canvas')
    const column = document.querySelector('[data-workspace-column][data-column-type="chat"]')
    return canvas && column && Math.abs(canvas.scrollLeft - column.offsetLeft) <= 2
  })
}

test('440px mobile composer lands 20px above the physical viewport and stays keyboard-aware', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 956 })
  await openFixtureRoom(page)

  const resting = await page.evaluate(() => {
    const shell = document.querySelector('.cv6-app-shell').getBoundingClientRect()
    const column = document.querySelector('[data-workspace-column][data-column-type="chat"]').getBoundingClientRect()
    const room = document.querySelector('[data-screen="chat-room"]').getBoundingClientRect()
    const composer = document.querySelector('[data-screen="chat-room"] > .mcomposer').getBoundingClientRect()
    const scroll = document.querySelector('[data-screen="chat-room"] > .scrbody')
    return {
      viewport: window.innerHeight,
      shellBottom: shell.bottom,
      columnBottom: column.bottom,
      roomBottom: room.bottom,
      composerBottom: composer.bottom,
      composerBottomGap: room.bottom - composer.bottom,
      transcriptBottomPadding: parseFloat(getComputedStyle(scroll).paddingBottom),
    }
  })
  expect(resting.shellBottom).toBeCloseTo(resting.viewport, 0)
  expect(resting.columnBottom).toBeCloseTo(resting.viewport, 0)
  expect(resting.roomBottom).toBeCloseTo(resting.viewport, 0)
  expect(resting.composerBottomGap).toBeCloseTo(20, 0)
  expect(resting.transcriptBottomPadding).toBeCloseTo(122, 0)
  await page.screenshot({ path: '/tmp/corner-r16-composer-bottom.png' })

  await page.locator('[data-testid="cv6-chat-input"]').focus()
  await expect(page.locator('html.cv6-keyboard-open')).toBeVisible()
  await page.evaluate(() => {
    const root = document.documentElement
    root.classList.add('cv6-keyboard-open')
    root.style.setProperty('--cv6-viewport-height', '500px')
    root.style.setProperty('--cv6-viewport-top', '70px')
  })
  const focused = await page.evaluate(() => {
    const shell = document.querySelector('.cv6-app-shell').getBoundingClientRect()
    const composer = document.querySelector('[data-screen="chat-room"] > .mcomposer').getBoundingClientRect()
    return { shellTop: shell.top, shellHeight: shell.height, composerBottomGap: shell.bottom - composer.bottom }
  })
  expect(focused.shellTop).toBeCloseTo(70, 0)
  expect(focused.shellHeight).toBeCloseTo(500, 0)
  expect(focused.composerBottomGap).toBeCloseTo(8, 0)
})
