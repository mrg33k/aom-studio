import { test, expect } from 'playwright/test';

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173';

async function openRoomFromSearch(page, roomName) {
  await page.getByRole('button', { name: 'Search', exact: true }).first().click();
  await page.getByPlaceholder('Search rooms and missions…').fill(roomName);
  await page.locator('.sres', { hasText: roomName }).first().click();
  const column = page.locator('[data-workspace-column][data-column-type="chat"]', { hasText: roomName }).last();
  await expect(column).toBeVisible();
  return column;
}

test('desktop stacks independent chat and Email columns on one page', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`${BASE}/dashboard?cv6=1&view=home`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cv6]').first().waitFor();

  const webColumn = await openRoomFromSearch(page, 'Web');
  const webBox = await webColumn.boundingBox();
  expect(webBox.width).toBeLessThan(700);
  await openRoomFromSearch(page, 'Content');
  await expect(page.locator('[data-column-type="chat"]')).toHaveCount(2);
  expect(context.pages()).toHaveLength(1);

  // Reopening an existing room focuses it; it never creates a duplicate.
  await openRoomFromSearch(page, 'Web');
  await expect(page.locator('[data-column-type="chat"]')).toHaveCount(2);

  await page.getByRole('button', { name: 'Open Email column' }).click();
  await expect(page.locator('[data-column-type="email"]')).toBeVisible();
  expect(context.pages()).toHaveLength(1);
  await page.screenshot({ path: '/tmp/corner-cv6-workspace-columns.png', fullPage: true });
});

test('chat and Email opens never emit a browser popup', async ({ page }) => {
  const popups = [];
  page.on('popup', (popup) => popups.push(popup));
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`${BASE}/dashboard?cv6=1&view=home`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cv6]').first().waitFor();
  await openRoomFromSearch(page, 'Web');
  await page.getByRole('button', { name: 'Open Email column' }).click();
  await page.waitForTimeout(100);
  expect(popups).toHaveLength(0);
});
