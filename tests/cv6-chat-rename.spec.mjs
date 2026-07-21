import { test, expect } from 'playwright/test';

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173';

async function openWeb(page, width) {
  await page.setViewportSize({ width, height: width > 800 ? 900 : 844 });
  await page.goto(`${BASE}/dashboard?cv6=1&view=home&demo=rename-chat`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cv6]').first().waitFor();
  await page.getByRole('button', { name: 'Search', exact: true }).first().click();
  await page.getByPlaceholder('Search rooms and missions…').fill('Web');
  await page.locator('.sres', { hasText: 'Web' }).first().click();
}

test('desktop renames a direct chat while keeping its specialist identity', async ({ page }) => {
  let patchBody = null;
  await page.route('**/api/dashboard/room-title', async (route) => {
    patchBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, room: { name: patchBody.title } }) });
  });
  await page.route('**/api/dashboard/supabase-messages**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }));
  await page.route('**/api/dashboard/review-queue**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }));

  await openWeb(page, 1440);
  await expect(page.getByRole('button', { name: 'Rename chat' })).toHaveCount(0);
  await page.getByRole('button', { name: 'More', exact: true }).last().click();
  await page.getByTestId('room-settings-trigger').click();
  await expect(page.getByTestId('room-settings-dialog')).toBeVisible();
  await page.getByLabel('Chat name').fill('Website refresh');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.getByText('Name saved')).toBeVisible();
  await page.getByRole('button', { name: 'Close room settings' }).last().click();
  await expect(page.getByTestId('room-settings-dialog')).toHaveCount(0);
  await expect(page.getByText('Website refresh', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Web specialist', { exact: true })).toBeVisible();
  await expect(page.locator('[data-column-type="chat"]', { hasText: 'Website refresh' })).toBeVisible();
  expect(patchBody).toMatchObject({ agent: 'bobby', title: 'Website refresh' });
});

test('mobile exposes the same persistent rename interaction', async ({ page }) => {
  await page.route('**/api/dashboard/room-title', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, room: { name: 'Launch site' } }) }));
  await page.route('**/api/dashboard/supabase-messages**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }));

  await openWeb(page, 390);
  await expect(page.getByRole('button', { name: 'Rename chat' })).toHaveCount(0);
  await page.getByRole('button', { name: 'More', exact: true }).last().click();
  await page.getByTestId('room-settings-trigger').click();
  await page.getByLabel('Chat name').fill('Launch site');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Close room settings' }).click();

  await expect(page.locator('.mttl')).toHaveText('Launch site');
  await expect(page.locator('.msub')).toHaveText('Web specialist');
});

test('mobile room settings restore access and specialist controls without document scroll', async ({ page }) => {
  await page.route('**/api/dashboard/agent-model**', async (route) => {
    if (route.request().method() === 'PATCH') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: { bobby: 'default' } }) });
  });
  await page.route('**/api/dashboard/agent-voice**', async (route) => {
    if (route.request().method() === 'PATCH') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ voices: { bobby: 'kore' } }) });
  });
  await page.route('**/api/dashboard/supabase-messages**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }));

  await openWeb(page, 390);
  await page.getByRole('button', { name: 'More', exact: true }).last().click();
  await page.getByTestId('room-settings-trigger').click();
  await page.getByTestId('room-settings-tab-access').click();
  await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeVisible();
  await expect(page.getByText('Add a new workspace member first, then send them the room link above.')).toBeVisible();
  await expect(page.getByTestId('room-settings-dialog').locator('a[target="_blank"]')).toHaveCount(0);
  await page.getByTestId('room-settings-tab-specialist').click();
  await expect(page.getByLabel('Model')).toBeVisible();
  await expect(page.getByTestId('room-settings-dialog').getByLabel('Voice')).toBeVisible();

  const viewport = await page.evaluate(() => {
    const shell = document.querySelector('.cv6-app-shell');
    return {
      shell: Math.round(shell.getBoundingClientRect().height),
      visual: Math.round(window.visualViewport?.height || window.innerHeight),
      documentRange: Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight),
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });
  expect(Math.abs(viewport.shell - viewport.visual)).toBeLessThanOrEqual(1);
  expect(viewport.documentRange).toBe(0);
  expect(viewport.bodyOverflow).toBe('hidden');
});
