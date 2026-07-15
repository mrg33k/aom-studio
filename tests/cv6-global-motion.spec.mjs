import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'
const FIXTURE = `${BASE}/dashboard?cv6=1&demo=global-motion`
const GENERIC_SPINNERS = '.spinner, .aspin, .ad-spin, [class*="spinner"], [data-testid*="spinner"]'

for (const viewport of [
  { name: 'desktop', width: 1440, height: 950 },
  { name: '390px mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name} uses the Corner logo loader only while the fixture load is in flight`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto(FIXTURE, { waitUntil: 'domcontentloaded' })

    const fixture = page.locator('[data-load-in-flight="true"]')
    await expect(fixture).toBeVisible()
    await expect(page.getByRole('status', { name: 'Gathering your rooms' })).toBeVisible()
    await expect(fixture.locator('[data-cv6-logo-loader]')).toHaveCount(1)
    await expect(fixture.locator('.cv6-logo-loader__mark')).toBeVisible()
    await expect(fixture.locator(GENERIC_SPINNERS)).toHaveCount(0)
  })
}

test('template action control exposes held press state and a 44px mobile target', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(FIXTURE, { waitUntil: 'domcontentloaded' })

  const action = page.getByRole('button', { name: 'Acknowledge loading' })
  await expect(action).toBeVisible()
  const box = await action.boundingBox()
  expect(box).not.toBeNull()
  expect(box.width).toBeGreaterThanOrEqual(44)
  expect(box.height).toBeGreaterThanOrEqual(44)

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(action).toHaveAttribute('data-cv6-pressed', 'true')
  await expect(action).toHaveClass(/is-pressed/)
  await page.mouse.up()
  await expect(action).toHaveAttribute('data-cv6-pressed', 'false')
})

test('loader follows the live dark, light, and glass accent/mask tokens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  const themes = [
    { id: 'dark', accent: 'rgb(59, 130, 246)', asset: 'corner-logo-white.svg' },
    { id: 'light', accent: 'rgb(0, 102, 255)', asset: 'corner-logo.svg' },
    { id: 'glass', accent: 'rgb(91, 155, 255)', asset: 'corner-logo-white.svg' },
  ]

  for (const theme of themes) {
    await page.goto(`${FIXTURE}&theme=${theme.id}`, { waitUntil: 'domcontentloaded' })
    const root = page.locator('[data-load-in-flight="true"]')
    const loader = root.locator('[data-cv6-logo-loader]')
    const fill = loader.locator('.cv6-logo-loader__fill')
    await expect(root).toHaveAttribute('data-app-theme', theme.id)
    await expect(loader).toHaveAttribute('data-theme', theme.id)
    await expect.poll(() => fill.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(theme.accent)
    await expect.poll(() => fill.evaluate((node) => getComputedStyle(node).webkitMaskImage || getComputedStyle(node).maskImage)).toContain(theme.asset)
  }
})
