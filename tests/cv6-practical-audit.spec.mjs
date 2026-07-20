import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

async function openCv6(page, query = 'view=home') {
  const errors = []
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) errors.push(`${msg.type()}: ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  await page.goto(`${BASE}/dashboard?cv6=1&${query}`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-cv6]').first().waitFor({ timeout: 15_000 })
  await page.waitForTimeout(500)
  return errors
}

async function expectNoCrash(page) {
  await expect(page.locator('text=/Something went wrong|Cannot read properties|Unhandled/i')).toHaveCount(0)
}

function productConsoleErrors(errors) {
  return errors.filter((line) => !/Failed to load resource/.test(line))
}

test.describe('CV6 One Page practical product audit', () => {
  test('desktop keeps the room-first navigation and explains advanced tools', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    const errors = await openCv6(page)

    await expect(page.getByRole('button', { name: 'Open Rooms home' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rooms', exact: true }).first()).toBeVisible()
    await expect(page.locator('.ctile')).toHaveCount(0)
    await expect(page.getByText('All rooms').first()).toBeVisible()

    await page.getByRole('button', { name: 'Search', exact: true }).first().click()
    await page.getByPlaceholder('Search rooms and missions…').fill('space')
    await expect(page.getByText('Nothing matches “space”.')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'New' }).click()
    await expect(page.getByText('Creation needs a connected workspace. Local mode is read-only.')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.getByRole('button', { name: 'Search', exact: true }).first().click()
    await page.getByPlaceholder('Search rooms and missions…').fill('web')
    await page.locator('.sres', { hasText: 'Web' }).first().click()
    await expect(page.getByRole('button', { name: 'All rooms' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Rooms', exact: true }).last()).toBeVisible()
    await expect(page.getByText('No messages in this room yet. Connect a workspace to send messages.')).toBeVisible()
    await expect(page.getByText("Couldn't load this chat's files right now. They're safe — it retries automatically.")).toBeVisible()

    for (const [view, label] of [['organize', 'Files'], ['command', 'Command'], ['tracker', 'Tracker'], ['livescribe', 'Scribe']]) {
      await page.goto(`${BASE}/dashboard?cv6=1&view=${view}`, { waitUntil: 'domcontentloaded' })
      await page.locator('[data-cv6]').first().waitFor()
      await expect(page.getByText('Advanced tool', { exact: true })).toBeVisible()
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: 'All rooms' })).toBeVisible()
      await expectNoCrash(page)
    }

    await page.goto(`${BASE}/dashboard?cv6=1&view=settings`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /Planned/ }).click()
    await expect(page.getByText('Planned capabilities', { exact: true })).toBeVisible()
    await expect(page.getByText('COMING LATER')).toHaveCount(4)
    await page.getByRole('button', { name: /Appearance/ }).click()
    await page.getByRole('button', { name: /Light Choose/ }).click()
    await expect(page.locator('html[data-app-theme="light"]')).toBeVisible()
    await expectNoCrash(page)

    expect(productConsoleErrors(errors)).toEqual([])
  })

  test('mobile drawer, settings honesty, and chat files use the new product shape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const errors = await openCv6(page)

    await page.getByRole('button', { name: 'Menu', exact: true }).first().click()
    const drawer = page.locator('.navdrawer')
    await expect(drawer).toBeVisible()
    expect(await drawer.locator('.nl').allTextContents()).toEqual(['Rooms', 'Email', 'Settings'])
    const drawerBox = await drawer.boundingBox()
    expect(drawerBox.x).toBeGreaterThan(70)

    await drawer.getByRole('button', { name: /Settings/ }).click()
    await expect(page.getByText('Available now and planned')).toBeVisible()
    await page.getByRole('button', { name: /Planned/ }).click()
    await expect(page.getByText('COMING LATER')).toHaveCount(4)

    await page.getByRole('button', { name: 'Menu', exact: true }).first().click()
    await page.locator('.navdrawer').getByRole('button', { name: /Rooms/ }).click()
    await page.locator('[data-action="toggleAgents"]:visible').first().click()
    await page.locator('[data-action="openRoom"]:visible').first().click()
    await expect(page.getByText('Chat needs a connected workspace. Local mode is read-only.')).toBeVisible()
    await page.getByTestId('chat-files-button').click()
    await expect(page.getByText('Files in this room')).toBeVisible()
    await expect(page.getByText("Couldn't load this chat's files right now. They're safe — it retries automatically.")).toBeVisible()
    await page.getByRole('button', { name: 'Close files' }).press('Enter')

    await page.getByRole('button', { name: 'Menu', exact: true }).first().click()
    await page.locator('.navdrawer').getByRole('button', { name: /Email/ }).click()
    await expect(page.getByRole('button', { name: 'Inbox' })).toBeVisible()
    await expectNoCrash(page)

    expect(productConsoleErrors(errors)).toEqual([])
  })
})
