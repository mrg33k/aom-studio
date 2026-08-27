import { test, expect } from '@playwright/test'

const routes = ['/', '/services/', '/hydro-jetting/', '/property-managers/', '/general-contractors/', '/scottsdale/', '/contact/']
const widths = [320, 360, 390, 430, 768, 1024, 1280, 1440]

for (const route of routes) {
  for (const width of widths) {
    test(`${route} clean at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 })
      const errors = []
      page.on('console', message => message.type() === 'error' && errors.push(message.text()))
      page.on('pageerror', error => errors.push(String(error)))
      await page.goto(route, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `horizontal overflow ${overflow}px`).toBeLessThanOrEqual(1)
      expect(errors).toEqual([])
    })
  }
}

test('mobile navigation and request dialog are keyboard reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('[data-loader]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await page.locator('.menu-button').click()
  await expect(page.locator('#mobile-navigation')).toBeVisible()
  await page.locator('#mobile-navigation a[href="/property-managers/"]').first().focus()
  await page.locator('.menu-button').click()
  await expect(page.locator('#mobile-navigation')).toBeHidden()
  await page.locator('a[href="#contact"]').first().click()
  await expect(page.locator('#lead-dialog')).toBeVisible()
  await expect(page.locator('[data-lead-panel="0"]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#lead-dialog')).toBeHidden()
})

test('lead drawer wizard advances and gates success on server response', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('[data-loader]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await page.locator('a[href="#contact"]').first().click()
  const dialog = page.locator('#lead-dialog')
  await expect(dialog).toBeVisible()
  const continueButton = page.locator('[data-lead-continue]')
  await expect(continueButton).toBeDisabled()
  await page.locator('.need-option').first().click()
  await expect(continueButton).toBeEnabled()
  await continueButton.click()
  await expect(page.locator('[data-lead-panel="1"]')).toBeVisible()
  await page.locator('[name="name"]').fill('QA Test')
  await page.locator('[name="phone"]').fill('602-555-0100')
  await page.route('**/api/lead', route => route.fulfill({ status: 502, contentType: 'application/json', body: '{"ok":false}' }))
  await page.locator('#lead-form [type="submit"]').click()
  await expect(page.locator('[data-lead-status]')).toContainText('did not go through')
  await expect(page.locator('[data-lead-panel="2"]')).toBeHidden()
  await page.unroute('**/api/lead')
  await page.route('**/api/lead', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }))
  await page.locator('#lead-form [type="submit"]').click()
  await expect(page.locator('[data-lead-panel="2"]')).toBeVisible()
  await expect(page.locator('[data-lead-panel="2"]')).toContainText('Got it.')
})

test('theme toggle persists via wp-v2-theme', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('[data-theme-toggle]').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.locator('[data-theme-toggle]').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('reduced motion disables loader and marquee animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page.locator('[data-loader]')).toHaveCount(0)
  const animation = await page.locator('.marquee-track').evaluate(el => getComputedStyle(el).animationName)
  expect(animation).toBe('none')
})

test('images have alt text and tap targets are 44px on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const missingAlt = await page.evaluate(() => [...document.images].filter(img => img.alt === undefined || img.getAttribute('alt') === null).length)
  expect(missingAlt).toBe(0)
  await page.locator('.menu-button').click()
  const small = await page.evaluate(() => {
    const targets = [...document.querySelectorAll('#mobile-navigation a, .menu-button, .header-call, [data-theme-toggle]')]
    return targets
      .map(el => ({ label: el.textContent?.trim().slice(0, 24) || el.className, h: el.getBoundingClientRect().height }))
      .filter(t => t.h > 0 && t.h < 40)
  })
  expect(small, JSON.stringify(small)).toEqual([])
})
