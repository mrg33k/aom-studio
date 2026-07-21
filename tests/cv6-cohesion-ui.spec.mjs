import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

async function open(page, query) {
  await page.goto(`${BASE}/dashboard?cv6=1&${query}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-cv6]').first().waitFor({ timeout: 15_000 })
}

test('desktop room spine and file rail keep context and attention honest', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  const now = new Date().toISOString()
  const attachments = [
    { id: 'a1', role: 'assistant', agent: 'web', timestamp: now, metadata: { attachment: { url: 'https://fixture.local/draft-strategy.pdf', name: 'draft-strategy.pdf', mime: 'application/pdf', size: 184320 } } },
    { id: 'u1', role: 'user', user_name: 'Patrik', timestamp: now, metadata: { attachment: { url: 'https://fixture.local/final-copy.docx', name: 'final-copy.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 28672 } } },
  ]
  await page.route('**/api/dashboard/supabase-messages**', async (route) => {
    const url = new URL(route.request().url())
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: url.searchParams.get('attachments') === '1' ? attachments : [] }) })
  })
  await page.route('**/api/dashboard/review-queue**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [{ id: 'https://fixture.local/draft-strategy.pdf', path: 'https://fixture.local/draft-strategy.pdf', name: 'draft-strategy.pdf' }], total: 1 }) }))

  await open(page, 'view=home')
  await page.getByRole('button', { name: 'Search', exact: true }).first().click()
  await page.getByPlaceholder('Search rooms and missions…').fill('web')
  await page.locator('.sres', { hasText: 'Web' }).first().click()

  await expect(page.getByRole('button', { name: 'All rooms' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rooms', exact: true }).last()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review draft-strategy.pdf' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open final-copy.docx' })).toBeVisible()
  await expect(page.getByText('Review', { exact: true })).toBeVisible()
  await page.screenshot({ path: '/tmp/corner-m11-desktop.png', fullPage: true })
})

test('Email automation separates policy, watcher freshness, and control', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.route('**/api/dashboard/support-autoreply**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ control: null, can_restore: true, file_state: { mode: 'live', answer_mode: 'send', threshold_min: 8, synced_at: new Date().toISOString() } }),
  }))
  await open(page, 'demo=email-autoreply')
  await expect(page.getByText('Live', { exact: true })).toBeVisible()
  await expect(page.getByText(/Watcher checked just now/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await page.screenshot({ path: '/tmp/corner-m11-email.png', fullPage: true })
})

test('mobile Settings makes planned capability status explicit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'view=settings')
  await page.getByRole('button', { name: /Planned/ }).click()
  await expect(page.getByText('COMING LATER')).toHaveCount(4)
  await page.screenshot({ path: '/tmp/corner-m11-settings-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const drawer = page.locator('.navdrawer')
  await expect(drawer).toBeVisible()
  expect(await drawer.locator('.nl').allTextContents()).toEqual(['Rooms', 'Email', 'Settings'])
  await page.waitForTimeout(250)
  await page.screenshot({ path: '/tmp/corner-m11-mobile.png', fullPage: true })
})

test('M12 mobile Home gives recent work and room types distinct visual homes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'demo=m12-mobile&screen=home')

  await expect(page.getByText('Pick up where')).toBeVisible()
  await expect(page.getByText('Projects', { exact: true })).toBeVisible()
  await expect(page.getByText('Agent rooms', { exact: true })).toBeVisible()
  await expect(page.getByText(/Chat-serving alert/)).toHaveCount(0)
  await expect(page.locator('.mresumecard')).toHaveCount(4)

  const rail = page.locator('.mresumelist')
  expect(await rail.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  const agentCard = await page.locator('.agent-rooms').boundingBox()
  const projectList = await page.locator('.project-list').boundingBox()
  expect(agentCard.y + agentCard.height).toBeLessThan(projectList.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: '/tmp/corner-m12-home.png', fullPage: true })
})

test('M12 mobile Email reserves clean geometry for tabs, policy, and filters', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/dashboard/support-autoreply**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ control: null, can_restore: true, file_state: { mode: 'live', answer_mode: 'send', threshold_min: 8, synced_at: new Date().toISOString() } }),
  }))
  await open(page, 'demo=m12-mobile&screen=email')

  await expect(page.getByText('People-first inbox')).toBeVisible()
  await expect(page.getByText('Needs a reply')).toBeVisible()
  await expect(page.locator('.needs-count')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()

  const tabs = await page.locator('.cv6-email-tabs').boundingBox()
  const policy = await page.locator('.cv6-autoreply-strip').boundingBox()
  const filters = await page.locator('[data-screen="support-inbox"] .mhchips').boundingBox()
  expect(tabs.y + tabs.height).toBeLessThanOrEqual(policy.y + 0.5)
  expect(policy.y + policy.height).toBeLessThanOrEqual(filters.y + 0.5)
  expect(await page.locator('.email-assign').first().evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: '/tmp/corner-m12-email.png', fullPage: true })
})
