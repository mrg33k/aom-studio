import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

const now = new Date('2026-07-14T18:00:00.000Z')
const ts = (minutesAgo) => new Date(now.getTime() - minutesAgo * 60_000).toISOString()

async function seedCatchUp(page) {
  let sent = null
  await page.route('**/api/local/file?**', async (route) => {
    await route.fulfill({ json: { content: '' } })
  })
  await page.route('**/api/dashboard/supabase-status?**', async (route) => {
    await route.fulfill({
      json: {
        agents: [{ slug: 'corner', name: 'Corner', status: 'idle' }],
        projects: [{ id: 'renderer-room', slug: 'renderer-room', name: 'Renderer Room', status: 'IDLE' }],
        projectDefs: [],
        tasks: [],
        tasksV2: [],
        messages: [
          {
            id: 'seed-user',
            role: 'user',
            agent: 'corner',
            project: 'renderer-room',
            source: 'corner-dashboard',
            text: 'Please audit the renderer.',
            timestamp: ts(20),
            metadata: { mission_slug: 'modal-proof' },
          },
          {
            id: 'seed-ask',
            role: 'assistant',
            agent: 'corner',
            project: 'renderer-room',
            text: 'Can you confirm the renderer migration?',
            timestamp: ts(10),
            metadata: { mission_slug: 'modal-proof', needs_input: true },
          },
        ],
      },
    })
  })
  await page.route('**/api/dashboard/supabase-messages*', async (route) => {
    if (route.request().method() === 'POST') {
      sent = route.request().postDataJSON()
      await route.fulfill({ json: { ok: true, message: { id: 'posted-message' } } })
      return
    }
    await route.fulfill({
      json: {
        messages: [
          {
            id: 'thread-user',
            role: 'user',
            agent: 'corner',
            project: 'renderer-room',
            source: 'corner-dashboard',
            text: 'Please audit the renderer.',
            timestamp: ts(20),
            metadata: { mission_slug: 'modal-proof' },
          },
          {
            id: 'thread-agent',
            role: 'assistant',
            agent: 'corner',
            project: 'renderer-room',
            text: 'This plain reply should be transformed into a block.',
            timestamp: ts(9),
            metadata: {
              mission_slug: 'modal-proof',
              result_payload: {
                type: 'link',
                payload: 'https://example.test/renderer-report',
                summary: 'Renderer report is live',
              },
            },
          },
        ],
      },
    })
  })
  await page.route('**/api/dashboard/message-steps?**', async (route) => {
    await route.fulfill({
      json: {
        steps: [
          { id: 'step-1', parent_message_id: 'thread-user', step_index: 0, text: 'Loaded renderer map', timestamp: ts(18) },
          { id: 'step-2', parent_message_id: 'thread-user', step_index: 1, text: 'Verified modal renderer', timestamp: ts(17) },
        ],
      },
    })
  })
  await page.route('**/api/dashboard/room-goal-steps?**', async (route) => route.fulfill({ json: { list: [] } }))
  await page.route('**/api/dashboard/room-goals?**', async (route) => route.fulfill({ json: { rooms: {} } }))
  await page.route('**/api/dashboard/project-summary?**', async (route) => route.fulfill({ json: { event: { payload: {} } } }))
  await page.route('**/api/dashboard/active-agents?**', async (route) => route.fulfill({ json: { agents: [] } }))
  await page.route('**/api/dashboard/state-board?**', async (route) => route.fulfill({ json: { columns: [] } }))
  await page.route('**/api/dashboard/routines?**', async (route) => route.fulfill({ json: { routines: [] } }))
  await page.route('**/api/dashboard/cv6-bugs**', async (route) => route.fulfill({ json: { bugs: [] } }))
  await page.route('**/api/dashboard/admin-tickets**', async (route) => route.fulfill({ json: { tickets: [] } }))
  await page.route('**/api/dashboard/trackers?**', async (route) => route.fulfill({ json: { trackers: [] } }))
  await page.route('**/api/dashboard/review-queue?**', async (route) => route.fulfill({ json: { items: [], total: 0 } }))
  return () => sent
}

async function seedDesktopChat(page) {
  await page.route('**/api/local/file?**', async (route) => {
    await route.fulfill({ json: { content: '' } })
  })
  await page.route('**/api/dashboard/supabase-status?**', async (route) => {
    await route.fulfill({
      json: {
        agents: [{ slug: 'corner', title: 'Corner', name: 'Corner', status: 'idle' }],
        projects: [{ id: 'renderer-room', slug: 'renderer-room', name: 'Renderer Room', status: 'IDLE' }],
        projectDefs: [],
        tasks: [],
        tasksV2: [],
        messages: [],
      },
    })
  })
  await page.route('**/api/dashboard/supabase-messages*', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: { ok: true, message: { id: 'desktop-posted-message' } } })
      return
    }
    const nowMs = Date.now()
    const at = (minutesAgo) => new Date(nowMs - minutesAgo * 60_000).toISOString()
    await route.fulfill({
      json: {
        messages: [
          {
            id: 'desktop-old-user',
            role: 'user',
            agent: 'corner',
            project: 'renderer-room',
            source: 'corner-dashboard',
            text: 'Older day request for the desktop renderer.',
            timestamp: at(60 * 48),
          },
          {
            id: 'desktop-old-agent',
            role: 'assistant',
            agent: 'corner',
            project: 'renderer-room',
            text: 'Older day reply folded under the day card.',
            timestamp: at(60 * 48 - 5),
          },
          {
            id: 'desktop-agent-text',
            role: 'assistant',
            agent: 'corner',
            project: 'renderer-room',
            text: 'Desktop text bubble renders through the shared renderer.',
            timestamp: at(35),
          },
          {
            id: 'desktop-agent-attachment',
            role: 'assistant',
            agent: 'corner',
            project: 'renderer-room',
            text: '',
            timestamp: at(32),
            metadata: {
              attachments: [{
                url: '/demo/desktop-renderer-audit.pdf',
                name: 'desktop-renderer-audit.pdf',
                mime: 'application/pdf',
                size: 24000,
              }],
            },
          },
          {
            id: 'desktop-agent-link-chip',
            role: 'assistant',
            agent: 'corner',
            project: 'renderer-room',
            text: 'Desktop link and chips are ready. https://example.test/desktop-renderer-report',
            timestamp: at(28),
            metadata: {
              result_payload: {
                type: 'link',
                payload: 'https://example.test/desktop-renderer-report',
                summary: 'Desktop renderer report is live',
              },
              chips: ['Approve desktop renderer', 'Ask for changes'],
            },
          },
          {
            id: 'desktop-live-user',
            role: 'user',
            agent: 'corner',
            project: 'renderer-room',
            source: 'corner-dashboard',
            text: 'Keep working on the desktop renderer.',
            timestamp: at(1),
          },
        ],
      },
    })
  })
  await page.route('**/api/dashboard/message-steps?**', async (route) => {
    await route.fulfill({
      json: {
        steps: [
          { id: 'desktop-live-step-1', parent_message_id: 'desktop-live-user', step_index: 0, text: 'Reading desktop thread fixture', timestamp: ts(1) },
          { id: 'desktop-live-step-2', parent_message_id: 'desktop-live-user', step_index: 1, text: 'Checking shared renderer output', timestamp: ts(0) },
        ],
      },
    })
  })
  await page.route('**/api/dashboard/room-goal-steps?**', async (route) => route.fulfill({ json: { list: [] } }))
  await page.route('**/api/dashboard/room-goals?**', async (route) => route.fulfill({ json: { rooms: {} } }))
  await page.route('**/api/dashboard/project-summary?**', async (route) => route.fulfill({ json: { event: { payload: {} } } }))
  await page.route('**/api/dashboard/active-agents?**', async (route) => route.fulfill({ json: { agents: [] } }))
  await page.route('**/api/dashboard/state-board?**', async (route) => route.fulfill({ json: { columns: [] } }))
  await page.route('**/api/dashboard/routines?**', async (route) => route.fulfill({ json: { routines: [] } }))
  await page.route('**/api/dashboard/cv6-bugs**', async (route) => route.fulfill({ json: { bugs: [] } }))
  await page.route('**/api/dashboard/admin-tickets**', async (route) => route.fulfill({ json: { tickets: [] } }))
  await page.route('**/api/dashboard/trackers?**', async (route) => route.fulfill({ json: { trackers: [] } }))
  await page.route('**/api/dashboard/review-queue?**', async (route) => route.fulfill({ json: { items: [], total: 0 } }))
  await page.route('**/api/dashboard/missions-tree?**', async (route) => route.fulfill({ json: { projects: [] } }))
  await page.route('**/api/dashboard/list-chat-files?**', async (route) => route.fulfill({ json: { files: [] } }))
  await page.route('**/api/dashboard/project-files?**', async (route) => route.fulfill({ json: { files: [], total: 0 } }))
}

test.describe('CV6 shared message renderer', () => {
  test('demo blocks exposes the core block vocabulary', async ({ page }) => {
    await page.goto(`${BASE}/dashboard?cv6=1&demo=blocks`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-cv6]').first().waitFor({ timeout: 15_000 })

    await expect(page.getByText('Summary')).toBeVisible()
    await expect(page.getByText('Quick question')).toBeVisible()
    await expect(page.locator('.cblk.is-question strong').filter({ hasText: 'Choose the first pilot team' }).last()).toBeVisible()
    await expect(page.locator('.csum strong').filter({ hasText: 'Expansion:' })).toBeVisible()
    await expect(page.getByText(/\*\*Choose the first pilot team/)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Send as me/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Confirm & send/ })).toBeVisible()
    await expect(page.getByText('Show code')).toBeVisible()
    await expect(page.getByText('7 framing shots')).toBeVisible()
    await expect(page.locator('.cmail-tag').filter({ hasText: /^Email$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Review/ })).toBeVisible()
  })

  test('Catch Up modal renders transformed blocks, link cards, and still sends', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    const getSent = await seedCatchUp(page)
    await page.goto(`${BASE}/dashboard?cv6=1&demo=catchup-modal`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-cv6-message-thread][data-variant="modal"]').waitFor({ timeout: 15_000 })

    await expect(page.getByText('Loaded renderer map')).toBeVisible()
    await expect(page.getByText('This plain reply should be transformed into a block.')).toBeVisible()
    await expect(page.getByRole('link', { name: /example\.test/ })).toBeVisible()

    await page.getByPlaceholder(/Reply to/).fill('Looks good from Catch Up')
    await page.getByTitle('Send').click()
    await expect.poll(() => getSent()?.text).toBe('Looks good from Catch Up')
  })

  test('Home quick thread renders text, attachments, and link cards through the shared renderer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await page.goto(`${BASE}/dashboard?cv6=1&demo=home-quick-thread`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-screen="home-desktop"]').waitFor({ timeout: 15_000 })

    await page.getByText('Renderer Room').first().click()
    const homeThread = page.locator('[data-cv6-message-thread][data-variant="homeQuick"]')
    await homeThread.waitFor({ timeout: 15_000 })

    await expect(homeThread.getByText('Home quick thread has a fresh seeded reply.')).toBeVisible()
    await expect(homeThread.getByText('renderer-audit.pdf')).toBeVisible()
    await expect(homeThread.getByRole('button', { name: /^Review$/ })).toBeVisible()
    await expect(homeThread.getByRole('link', { name: /example\.test/ })).toBeVisible()
  })

  test('Desktop Chat renders folded days, rich messages, chips, and live work through the shared renderer', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 950 })
    await seedDesktopChat(page)
    await page.goto(`${BASE}/dashboard?cv6=1&view=chat`, { waitUntil: 'domcontentloaded' })

    const latestThread = page.locator('[data-cv6-message-thread][data-variant="desktop"][data-mode="latest-day"]')
    await latestThread.waitFor({ timeout: 15_000 })

    await expect(page.locator('.goalcard').filter({ hasText: '2 messages' })).toBeVisible()
    await expect(latestThread.getByText('Desktop text bubble renders through the shared renderer.')).toBeVisible()
    await expect(latestThread.getByText('desktop-renderer-audit.pdf')).toBeVisible()
    await expect(latestThread.getByRole('button', { name: /^Review$/ })).toBeVisible()
    await expect(latestThread.getByRole('link', { name: /example\.test/ })).toBeVisible()
    await expect(latestThread.getByRole('button', { name: 'Approve desktop renderer' })).toBeVisible()
    await expect(page.getByText('Checking shared renderer output').first()).toBeVisible()

    await page.locator('.goalcard').filter({ hasText: '2 messages' }).getByRole('button').click()
    const foldedThread = page.locator('[data-cv6-message-thread][data-variant="desktop"][data-mode="day-folded"]')
    await expect(foldedThread.getByText('Older day reply folded under the day card.')).toBeVisible()
  })

  test('Mobile ChatLifecycle keeps folded days, clamp, gallery, and one-card live progress', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle`, { waitUntil: 'domcontentloaded' })

    const latestThread = page.locator('[data-cv6-message-thread][data-variant="mobile"][data-mode="latest-day"]')
    await latestThread.waitFor({ timeout: 15_000 })

    const foldedDay = page.locator('.goalcard').filter({ hasText: '2 messages' })
    await expect(foldedDay).toBeVisible()
    await foldedDay.click()
    const foldedThread = page.locator('[data-cv6-message-thread][data-variant="mobile"][data-mode="day-folded"]')
    await expect(foldedThread.getByText('Older mobile reply stays inside the folded day.')).toBeVisible()

    await expect(latestThread.getByText('Mobile long message clamp proof begins here.')).toBeVisible()
    await expect(latestThread.getByRole('button', { name: 'Show more' })).toBeVisible()
    await latestThread.getByRole('button', { name: 'Show more' }).click()
    await expect(latestThread.getByRole('button', { name: 'Show less' })).toBeVisible()

    await expect(latestThread.getByText('sent 1 file')).toBeVisible()
    await expect(latestThread.getByRole('button', { name: 'mobile-gallery-proof.png' })).toBeVisible()
    // R-CHAT-FILE-MODAL: the fixture now carries a second, docs-only gallery
    // (pdf + md) feeding the chat file modal, so 'Review all' appears twice.
    await expect(latestThread.getByText('sent 2 files')).toBeVisible()
    await expect(latestThread.getByRole('button', { name: 'Review all' }).first()).toBeVisible()
    await expect(latestThread.locator('[data-cv6-live-work]')).toHaveCount(0)
    const liveCard = page.locator('.cv6-step-card[data-cv6-live-work]')
    await expect(liveCard).toBeVisible()
    await expect(liveCard.locator('.cv6-sc-current')).toHaveText('Keeping mobile gallery compatibility')
  })
})
