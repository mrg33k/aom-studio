import { test, expect } from 'playwright/test';

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173';

async function installFixtureRoutes(page) {
  const saves = [];
  await page.route('**/api/dashboard/preferences**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ value: null }) });
      return;
    }
    saves.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.route('**/api/dashboard/room-checklists**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        room: 'agent:renderer-room',
        lists: [{
          id: 'r19-list',
          title: 'Launch quality',
          collapsed: false,
          items: [
            { id: 'r19-done', text: 'Check desktop', done: true },
            { id: 'r19-open', text: 'Check mobile', done: false },
          ],
        }],
      }),
    });
  });
  await page.route('**/api/dashboard/message-steps*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ steps: [] }) }));
  return saves;
}

test('mobile chat edits room identity, shows truthful presence, and keeps controls compact', async ({ page }) => {
  const saves = await installFixtureRoutes(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle`, { waitUntil: 'domcontentloaded' });

  const avatar = page.getByRole('button', { name: 'Edit Renderer Room picture' });
  await expect(avatar).toBeVisible();
  await expect(avatar.locator('.cv6-room-presence')).toBeVisible();
  await avatar.click();

  const dialog = page.getByRole('dialog', { name: /Make Renderer Room recognizable/ });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Two initials').fill('UX');
  await dialog.getByRole('button', { name: 'Use color #BE185D' }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(avatar).toContainText('UX');
  await expect.poll(() => saves.length).toBe(1);
  expect(saves[0]).toMatchObject({ key: 'cv6_room_identities_v1', client_id: 'local-render' });
  expect(saves[0].value['agent:renderer-room']).toMatchObject({ initials: 'UX', color: '#BE185D', image: '' });

  const geometry = await page.evaluate(() => ({
    header: [...document.querySelectorAll('.cv6-chat-header-button')].map((node) => node.getBoundingClientRect().height),
    composer: [...document.querySelectorAll('.cv6-composer-primary')].map((node) => node.getBoundingClientRect().height),
  }));
  expect(geometry.header.every((height) => height === 36)).toBe(true);
  expect(geometry.composer.every((height) => height === 34)).toBe(true);
});

test('checklist reports progress and Escape preserves an edited item before closing the panel', async ({ page }) => {
  await installFixtureRoutes(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('room-checklist-toggle').click();

  const progress = page.getByRole('progressbar', { name: 'Launch quality progress' });
  await expect(progress).toHaveAttribute('aria-valuenow', '50');
  await expect(progress.locator('span')).toHaveAttribute('style', /width: 50%/);

  const item = page.getByLabel('Checklist item').nth(1);
  await item.fill('Do not keep this edit');
  await item.press('Escape');
  await expect(item).toHaveValue('Check mobile');
  await expect(page.getByTestId('room-checklist-panel')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('room-checklist-panel')).toBeHidden();
  await expect(page.getByTestId('cv6-chat-input')).toBeVisible();
});
