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

test.describe('CV6 shared message renderer', () => {
  test('demo blocks exposes the core block vocabulary', async ({ page }) => {
    await page.goto(`${BASE}/dashboard?cv6=1&demo=blocks`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-cv6]').first().waitFor({ timeout: 15_000 })

    await expect(page.getByText('Summary')).toBeVisible()
    await expect(page.getByText('Quick question')).toBeVisible()
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
})
