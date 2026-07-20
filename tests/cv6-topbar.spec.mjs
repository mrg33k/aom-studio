import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

async function openView(page, viewport, view = 'home') {
  await page.setViewportSize(viewport)
  await page.goto(`${BASE}/dashboard?cv6=1&view=${view}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-cv6]').first().waitFor({ timeout: 15_000 })
  await page.locator('.cv6-screen-stage').waitFor({ timeout: 15_000 })
}

test('desktop keeps one compact room-first top bar across sibling views', async ({ page }) => {
  const heights = []
  for (const view of ['home', 'organize', 'support', 'tracker', 'command']) {
    await openView(page, { width: 1440, height: 950 }, view)
    const topbar = page.locator('[data-cv6][data-app-theme] > div > .topbar')
    await expect(topbar.getByRole('button', { name: 'Open Rooms home' })).toBeVisible()
    await expect(topbar.getByRole('button', { name: 'Rooms', exact: true })).toBeVisible()
    await expect(topbar.getByRole('button', { name: 'Search', exact: true })).toBeVisible()
    await expect(topbar.getByRole('button', { name: 'Profile', exact: true })).toBeVisible()
    await expect(topbar.locator('.ctile')).toHaveCount(0)
    heights.push((await topbar.boundingBox()).height)
  }
  expect(new Set(heights).size).toBe(1)
  expect(heights[0]).toBe(80)
})

test('390px menu trigger and right-side drawer share one spatial model', async ({ page }) => {
  await openView(page, { width: 390, height: 844 })
  const header = page.locator('.cv6-screen-stage .mhdr').first()
  const menu = header.getByRole('button', { name: 'Menu', exact: true })
  const search = header.getByRole('button', { name: 'Search', exact: true })
  await expect(menu).toBeVisible()
  await expect(search).toBeVisible()
  const menuBox = await menu.boundingBox()
  const searchBox = await search.boundingBox()
  expect(menuBox.x).toBeGreaterThan(searchBox.x)

  await menu.click()
  const drawer = page.locator('.navdrawer')
  await expect(drawer).toBeVisible()
  expect(await drawer.locator('.nl').allTextContents()).toEqual(['Rooms', 'Email', 'Settings'])
  const box = await drawer.boundingBox()
  expect(box.x).toBeGreaterThan(70)

  await drawer.getByRole('button', { name: /Settings/ }).click()
  const settingsHeader = page.locator('.cv6-screen-stage .mhdr').first()
  for (const name of ['Back to Rooms', 'Search', 'Menu']) {
    const control = settingsHeader.getByRole('button', { name, exact: true })
    await expect(control).toBeVisible()
    const controlBox = await control.boundingBox()
    expect(controlBox.width).toBeGreaterThanOrEqual(35.5)
    expect(controlBox.height).toBeGreaterThanOrEqual(35.5)
  }
})
