import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

test('composer resolves, displays, and changes the room model from Commands', async ({ page }) => {
  const models = { _all: 'opus', 'renderer-room': 'default' }
  const modelPatches = []
  const messagePosts = []

  await page.route('**/api/dashboard/agent-model*', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = JSON.parse(route.request().postData() || '{}')
      modelPatches.push(body)
      models[body.slug] = body.model
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models }) })
  })
  await page.route('**/api/dashboard/supabase-messages', async (route) => {
    if (route.request().method() === 'POST') {
      messagePosts.push(JSON.parse(route.request().postData() || '{}'))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message: { id: 'composer-model-user' } }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) })
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle&theme=light`, { waitUntil: 'domcontentloaded' })

  await expect(page.getByTestId('cv6-current-model')).toHaveText('Opus')
  const containment = await page.evaluate(() => {
    const input = document.querySelector('[data-testid="cv6-chat-input"]')
    const attach = document.querySelector('.cv6-composer-attach')
    return {
      inside: Boolean(input?.parentElement?.contains(attach)),
      attachWidth: attach?.getBoundingClientRect().width,
      attachHeight: attach?.getBoundingClientRect().height,
    }
  })
  expect(containment).toEqual({ inside: true, attachWidth: 32, attachHeight: 32 })
  await expect(page.locator('[data-role="composer-actions"] .cv6-mode-toggle')).toHaveCount(0)

  await page.getByTestId('cv6-commands-menu-button').click()
  await expect(page.getByTestId('cv6-commands-mode-toggle')).toBeVisible()
  await expect(page.getByTestId('cv6-commands-model')).toContainText('Model: Claude Opus')
  const popoverColors = await page.getByTestId('cv6-commands-menu-popover').evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, color: style.color }
  })
  expect(popoverColors).toEqual({ background: 'rgb(255, 255, 255)', color: 'rgb(24, 24, 27)' })

  await page.getByTestId('cv6-commands-model').click()
  await page.getByTestId('cv6-commands-model-openai-gpt-5.6').click()
  await expect.poll(() => modelPatches.length).toBe(1)
  expect(modelPatches[0]).toMatchObject({ slug: 'renderer-room', model: 'openai-gpt-5.6', client_id: 'local-render' })
  await expect(page.getByTestId('cv6-current-model')).toHaveText('OpenAI GPT-5.6')

  await page.getByTestId('cv6-commands-menu-button').click()
  await page.getByRole('button', { name: 'plan', exact: true }).click()
  await page.getByTestId('cv6-commands-menu-scrim').click()
  await page.getByTestId('cv6-chat-input').fill('Plan this with OpenAI')
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect.poll(() => messagePosts.length).toBe(1)
  expect(messagePosts[0].metadata?.interaction_mode).toBe('plan')
})

test('local Codex opens secure runner pairing before saving the room model', async ({ page }) => {
  const modelPatches = []
  await page.route('**/api/dashboard/agent-model*', async (route) => {
    if (route.request().method() === 'PATCH') {
      modelPatches.push(JSON.parse(route.request().postData() || '{}'))
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: {} }) })
  })
  await page.route('**/api/runner/pair*', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'ABCD-EFGH-JKLM-NPQR',
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
          downloadUrl: 'https://aheadofmarket.com/downloads/corner-runner.mjs',
        }),
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ devices: [] }) })
  })
  await page.route('**/api/dashboard/supabase-messages*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) })
  })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle&theme=light`, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('cv6-commands-menu-button').click()
  await page.getByTestId('cv6-commands-model').click()
  await page.getByTestId('cv6-commands-model-codex-local').click()

  await expect(page.getByTestId('corner-runner-dialog')).toBeVisible()
  expect(modelPatches).toHaveLength(0)
  await page.getByTestId('corner-runner-create-pairing').click()
  await expect(page.getByTestId('corner-runner-pairing-code')).toHaveText('ABCD-EFGH-JKLM-NPQR')
  await expect(page.getByRole('link', { name: 'Download Corner Runner' })).toHaveAttribute('href', 'https://aheadofmarket.com/downloads/corner-runner.mjs')
})
