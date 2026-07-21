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
  await page.getByTestId('rename-chat-button').click();
  await page.getByLabel('Chat name').fill('Website refresh');
  await page.getByRole('button', { name: 'Save name' }).click();

  await expect(page.getByTestId('rename-chat-dialog')).toHaveCount(0);
  await expect(page.getByText('Website refresh', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Web specialist', { exact: true })).toBeVisible();
  await expect(page.locator('[data-chat-room-rail] .room', { hasText: 'Website refresh' })).toBeVisible();
  expect(patchBody).toMatchObject({ agent: 'bobby', title: 'Website refresh' });
});

test('mobile exposes the same persistent rename interaction', async ({ page }) => {
  await page.route('**/api/dashboard/room-title', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, room: { name: 'Launch site' } }) }));
  await page.route('**/api/dashboard/supabase-messages**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }));

  await openWeb(page, 390);
  await page.getByTestId('rename-chat-button').click();
  await page.getByLabel('Chat name').fill('Launch site');
  await page.getByRole('button', { name: 'Save name' }).click();

  await expect(page.locator('.mttl')).toHaveText('Launch site');
  await expect(page.locator('.msub')).toHaveText('Web specialist');
});
