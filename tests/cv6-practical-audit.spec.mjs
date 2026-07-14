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
    !/Failed to load resource/.test(line)
  ))
}

test.describe('CV6 practical product audit', () => {
  test('desktop user can orient, open work, and move across sibling tools', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    const errors = await openCv6(page)

    await expect(page.locator('.ctile', { hasText: 'Home' })).toBeVisible()
    await expect(page.getByText('All rooms').first()).toBeVisible()
    await expect(page.getByText('PROJECTS · 84')).toHaveCount(0)
    await expect(page.getByText('Show 78 more projects')).toHaveCount(0)

    const navLabels = await page.locator('.ctile .clab').allTextContents()
    expect(navLabels).toEqual(['Home', 'Files', 'Email', 'Tracker', 'Command', 'Scribe'])

    await page.getByRole('button', { name: 'Search' }).first().click()
    await page.getByPlaceholder('Search rooms and missions…').fill('space')
    await expect(page.getByText('Nothing matches “space”.')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'New' }).click()
    await expect(page.getByText('Creation needs a connected workspace. Local mode is read-only.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Read-only locally' })).toBeVisible()
    await page.locator('[data-action="setComposerMode"][data-target="project"]').click()
    await expect(page.getByText('New project')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Read-only locally' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.locator('[data-action="toggleAgents"]:visible').first().click()
    await expect(page.locator('[data-action="openRoom"]:visible').first()).toBeVisible()
    await page.locator('[data-action="openRoom"]:visible').first().click()
    await expect(page.getByText('No messages in this room yet. Connect a workspace to send messages.')).toBeVisible()
    await expect(page.getByText('Chat needs a connected workspace. Local mode is read-only.')).toBeVisible()
    await expect(page.getByTestId('cv6-chat-input')).toBeDisabled()
    await expect(page.getByText('Getting started')).toHaveCount(0)
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
      if (tool === 'Email') {
        await expect(page.getByText("We couldn't reach your inbox")).toHaveCount(0)
        await expect(page.getByText("You're all caught up")).toHaveCount(1)
        await expect(page.getByText("You're all caught up")).toBeVisible()
        await page.getByRole('button', { name: 'Campaign' }).click()
        await expect(page.getByText("Campaigns didn’t load")).toHaveCount(0)
        await expect(page.getByText('No campaigns yet')).toBeVisible()
        await expect(page.getByText('Create your first campaign')).toHaveCount(0)
        await page.getByRole('button', { name: 'Inbox' }).click()
      }
      if (tool === 'Tracker') {
        await expect(page.getByText('Loading the tracker…')).toHaveCount(0)
        await expect(page.getByText('No bugs in this tracker')).toBeVisible()
      }
      if (tool === 'Command') {
        await expect(page.getByText('No rooms yet')).toBeVisible()
      }
      if (tool === 'Scribe') {
        await expect(page.getByText('Ready to capture. Press Start and speak.')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Start capture' })).toBeVisible()
        await expect(page.locator('[data-screen="livescribe-desktop"] [data-state="error"]')).toBeHidden()
        await expect(page.locator('[data-screen="livescribe-desktop"] .rec')).toHaveClass(/is-off/)
        await expect(page.locator('[data-screen="livescribe-desktop"] .wave')).toHaveClass(/is-off/)
      }
    }

    expect(productConsoleErrors(errors)).toEqual([])
  })

  test('mobile user can search, open the drawer, and use the same core tools', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const errors = await openCv6(page)

    await expect(page.getByRole('button', { name: 'Search' }).first()).toBeVisible()
    await expect(page.getByText('Show 78 more rooms')).toHaveCount(0)
    await page.getByRole('button', { name: 'Search' }).first().click()
    await page.waitForTimeout(350)
    await expect(page.getByPlaceholder('Search rooms and missions…')).toBeVisible()
    await page.getByPlaceholder('Search rooms and missions…').fill('space')
    await expect(page.getByText('Nothing matches “space”.')).toBeVisible()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'New' }).click()
    await expect(page.getByText('Creation needs a connected workspace. Local mode is read-only.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Read-only locally' })).toBeVisible()
    await page.locator('[data-action="setComposerMode"][data-target="project"]').click()
    await expect(page.getByText('New project')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Read-only locally' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await page.locator('[data-action="toggleAgents"]:visible').first().click()
    await expect(page.locator('[data-action="openRoom"]:visible').first()).toBeVisible()
    await page.locator('[data-action="openRoom"]:visible').first().click()
    await expect(page.getByText('No messages with Web yet')).toBeVisible()
    await expect(page.getByText('Connect a workspace to send messages.')).toBeVisible()
    await expect(page.getByText('Chat needs a connected workspace. Local mode is read-only.')).toBeVisible()
    await expect(page.getByTestId('cv6-chat-input')).toBeDisabled()
    await expect(page.getByText('Getting started')).toHaveCount(0)
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
      if (tool === 'Email') {
        await expect(page.getByText('Email').first()).toBeVisible()
        await expect(page.getByText('Support', { exact: true })).toHaveCount(0)
        await expect(page.getByText("We couldn't reach your inbox")).toHaveCount(0)
        await expect(page.getByText("You're all caught up")).toHaveCount(1)
        await expect(page.getByText("You're all caught up")).toBeVisible()
        await page.getByRole('button', { name: 'Campaign' }).click()
        await expect(page.getByText("Campaigns didn’t load")).toHaveCount(0)
        await expect(page.getByText('No campaigns yet')).toBeVisible()
        await expect(page.getByText('Create your first campaign')).toHaveCount(0)
        await page.getByRole('button', { name: 'Inbox' }).click()
      }
      if (tool === 'Tracker') {
        await expect(page.getByText('Loading the tracker…')).toHaveCount(0)
        await expect(page.getByText('No bugs in this tracker')).toBeVisible()
      }
      if (tool === 'Command') {
        await expect(page.getByText('No rooms yet')).toBeVisible()
      }
      if (tool === 'Live Scribe') {
        await expect(page.getByText('Ready to capture. Press Start and speak.')).toBeVisible()
        await expect(page.getByRole('button', { name: 'Start capture' })).toBeVisible()
        await expect(page.locator('[data-screen="livescribe-mobile"] [data-state="error"]')).toBeHidden()
        await expect(page.locator('[data-screen="livescribe-mobile"] .rec')).toHaveClass(/is-off/)
        await expect(page.locator('[data-screen="livescribe-mobile"] .wave')).toHaveClass(/is-off/)
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
