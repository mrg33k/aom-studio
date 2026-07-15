import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'
const URL = `${BASE}/dashboard?cv6=1`

async function openCv6(page, viewport) {
  await page.setViewportSize(viewport)
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-cv6]').first().waitFor({ timeout: 15_000 })
  await page.locator('.cv6-screen-stage').waitFor({ timeout: 15_000 })
}

async function barHeight(locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  return box.height
}

test('desktop keeps one 80px top bar across sibling tools', async ({ page }) => {
  await openCv6(page, { width: 1440, height: 950 })
  const topbar = page.locator('[data-cv6][data-app-theme] > .topbar')
  const tools = [
    ['Home', 'home'],
    ['Files', 'organize'],
    ['Email', 'support'],
    ['Tracker', 'tracker'],
    ['Command', 'command'],
  ]
  const heights = []

  for (const [label, view] of tools) {
    await page.getByRole('button', { name: label, exact: true }).click()
    await expect(page.locator('.cv6-screen-stage')).toHaveAttribute('data-cv6-view', view)
    await expect(topbar).toBeVisible()
    await expect(topbar.getByRole('button', { name: 'Search', exact: true })).toBeVisible()
    await expect(topbar.getByRole('button', { name: 'Profile', exact: true })).toBeVisible()
    heights.push(await barHeight(topbar))
  }

  expect(new Set(heights).size).toBe(1)
  expect(heights[0]).toBe(80)
})

test('390px tools share header order, names, focus, targets, and held press state', async ({ page }) => {
  await openCv6(page, { width: 390, height: 844 })

  const homeHeader = page.locator('.cv6-screen-stage .mhdr').first()
  const homeMenu = homeHeader.getByRole('button', { name: 'Menu', exact: true })
  const homeSearch = homeHeader.getByRole('button', { name: 'Search', exact: true })
  const homeTitle = homeHeader.locator('.mhtitle')
  const [menuBox, titleBox, searchBox] = await Promise.all([
    homeMenu.boundingBox(), homeTitle.boundingBox(), homeSearch.boundingBox(),
  ])
  expect(menuBox.x).toBeLessThan(titleBox.x)
  expect(titleBox.x).toBeLessThan(searchBox.x)

  const tools = [
    ['Files', 'organize'],
    ['Email', 'support'],
    ['Tracker', 'tracker'],
    ['Command', 'command'],
  ]
  const heights = []
  let lastHeader

  for (const [label, view] of tools) {
    await page.getByRole('button', { name: 'Menu', exact: true }).first().click()
    const drawer = page.locator('.navdrawer')
    await expect(drawer).toBeVisible()
    await drawer.locator('.navrow', { hasText: label }).click()
    await expect(page.locator('.cv6-screen-stage')).toHaveAttribute('data-cv6-view', view)

    const header = page.locator('.cv6-screen-stage .mhdr').first()
    lastHeader = header
    await expect(header).toBeVisible()
    for (const name of ['Back', 'Search', 'Menu']) {
      const control = header.getByRole('button', { name, exact: true })
      await expect(control).toBeVisible()
      const box = await control.boundingBox()
      // Allow device-pixel float noise: a CSS 44px box can measure 43.99999….
      expect(box.width).toBeGreaterThanOrEqual(43.5)
      expect(box.height).toBeGreaterThanOrEqual(43.5)
    }
    const boxes = await Promise.all([
      header.getByRole('button', { name: 'Back', exact: true }).boundingBox(),
      header.locator('.mhtitle').boundingBox(),
      header.getByRole('button', { name: 'Search', exact: true }).boundingBox(),
      header.getByRole('button', { name: 'Menu', exact: true }).boundingBox(),
    ])
    expect(boxes[0].x).toBeLessThan(boxes[1].x)
    expect(boxes[1].x).toBeLessThan(boxes[2].x)
    expect(boxes[2].x).toBeLessThan(boxes[3].x)
    expect(boxes[1].width).toBeGreaterThan(120)
    heights.push(await barHeight(header))
  }

  expect(new Set(heights).size).toBe(1)
  expect(heights[0]).toBe(60)

  const back = lastHeader.getByRole('button', { name: 'Back', exact: true })
  // :focus-visible needs keyboard modality; bare programmatic focus() may not match.
  await page.keyboard.press('Tab')
  await back.focus()
  await expect.poll(() => back.evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe('none')

  const search = lastHeader.getByRole('button', { name: 'Search', exact: true })
  const searchBoxLast = await search.boundingBox()
  await page.mouse.move(searchBoxLast.x + searchBoxLast.width / 2, searchBoxLast.y + searchBoxLast.height / 2)
  await page.mouse.down()
  await expect(search).toHaveAttribute('data-cv6-pressed', 'true')
  await expect(search).toHaveClass(/is-pressed/)
  await page.mouse.move(1, 300)
  await page.mouse.up()
  await expect(search).toHaveAttribute('data-cv6-pressed', 'false')
})
