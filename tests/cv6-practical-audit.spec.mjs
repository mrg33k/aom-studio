import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

async function openCv6(page) {
  const errors = []
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) errors.push(`${msg.type()}: ${msg.text()}`)
  })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  await page.goto(`${BASE}/dashboard?cv6=1`, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-cv6]').first().waitFor({ timeout: 15_000 })
  await page.waitForTimeout(750)
  return errors
}

async function expectNoCrash(page) {
  await expect(page.locator('text=/Something went wrong|Cannot read properties|Unhandled/i')).toHaveCount(0)
}

function productConsoleErrors(errors) {
  return errors.filter((line) => (
    !/Failed to load resource/.test(line) &&
    !/Unexpected token '\/'.*is not valid JSON/.test(line)
  ))
}

test.describe('CV6 practical product audit', () => {
  test('desktop user can orient, open work, and move across sibling tools', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    const errors = await openCv6(page)

    await expect(page.locator('.ctile', { hasText: 'Home' })).toBeVisible()
    await expect(page.getByText('All rooms').first()).toBeVisible()

    const navLabels = await page.locator('.ctile .clab').allTextContents()
    expect(navLabels).toEqual(['Home', 'Files', 'Email', 'Tracker', 'Command', 'Scribe'])

    const firstRecent = page.locator('[data-action="openRecent"]:visible').first()
    if (await firstRecent.count()) {
      await firstRecent.click()
    } else if (await page.locator('[data-action="toggleAgents"]:visible').count()) {
      await page.locator('[data-action="toggleAgents"]:visible').first().click()
      await page.locator('[data-action="openRoom"]:visible').first().click()
    } else if (await page.locator('[data-action="toggleProjectMissions"]:visible').count()) {
      const firstProject = page.locator('[data-action="toggleProjectMissions"]:visible').first()
      await firstProject.click()
    } else {
      await expect(page.getByText('No active goal')).toBeVisible()
    }
    await expectNoCrash(page)

    for (const tool of ['Files', 'Email', 'Tracker', 'Command', 'Scribe', 'Home']) {
      await page.locator('.ctile', { hasText: tool }).click()
      await page.waitForTimeout(350)
      await expectNoCrash(page)
      await expect(page.locator('[data-cv6]').first()).toBeVisible()
      if (tool === 'Files') {
        await expect(page.getByText("We couldn't load your files")).toHaveCount(0)
        await expect(page.getByText('Nothing personal yet')).toBeVisible()
      }
      if (tool === 'Tracker') {
        await expect(page.getByText('Loading the tracker…')).toHaveCount(0)
        await expect(page.getByText('No bugs in this tracker')).toBeVisible()
      }
      if (tool === 'Command') {
        await expect(page.getByText('No rooms yet')).toBeVisible()
      }
    }

    expect(productConsoleErrors(errors)).toEqual([])
  })

  test('mobile user can search, open the drawer, and use the same core tools', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const errors = await openCv6(page)

    await expect(page.getByRole('button', { name: 'Search' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Search' }).first().click()
    await page.waitForTimeout(350)
    await expect(page.getByPlaceholder('Search rooms and missions…')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Menu' }).first().click()
    await expect(page.locator('.navdrawer')).toBeVisible()
    const drawerLabels = await page.locator('.navdrawer .nl').allTextContents()
    expect(drawerLabels).toEqual(['Home', 'Files', 'Email', 'Tracker', 'Command', 'Live Scribe'])

    for (const tool of ['Files', 'Email', 'Tracker', 'Command', 'Live Scribe', 'Home']) {
      await page.locator('.navdrawer .navrow', { hasText: tool }).click()
      await page.waitForTimeout(350)
      await expectNoCrash(page)
      if (tool === 'Files') {
        await expect(page.getByText("We couldn't load your files")).toHaveCount(0)
        await expect(page.getByRole('button', { name: /Personal 0 files/ })).toBeVisible()
        await page.getByRole('button', { name: /Personal 0 files/ }).click()
        await expect(page.getByText('Nothing personal yet')).toBeVisible()
      }
      if (tool === 'Tracker') {
        await expect(page.getByText('Loading the tracker…')).toHaveCount(0)
        await expect(page.getByText('No bugs in this tracker')).toBeVisible()
      }
      if (tool === 'Command') {
        await expect(page.getByText('No rooms yet')).toBeVisible()
      }
      if (tool !== 'Home') {
        await expect(page.getByRole('button', { name: 'Menu' }).first()).toBeVisible()
        await page.getByRole('button', { name: 'Menu' }).first().click()
        await expect(page.locator('.navdrawer')).toBeVisible()
      }
    }

    expect(productConsoleErrors(errors)).toEqual([])
  })
})
