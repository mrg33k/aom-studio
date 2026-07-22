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

test('desktop Rooms stays narrow and opens clean adjacent room columns', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`${BASE}/dashboard?cv6=1&view=home`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cv6]').first().waitFor();

  const roomsColumn = page.locator('[data-workspace-column="base"]');
  const roomsBox = await roomsColumn.boundingBox();
  expect(roomsBox.width).toBeGreaterThanOrEqual(330);
  expect(roomsBox.width).toBeLessThanOrEqual(350);
  await expect(page.getByRole('button', { name: 'New project' })).toBeVisible();
  await page.getByRole('button', { name: 'New project' }).click();
  await expect(page.getByText('New project', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  // The normal All Rooms row is the open action; there is no pin/dock step.
  await page.locator('[data-screen="home-desktop"] [data-action="toggleAgents"]').click();
  await page.locator('[data-screen="home-desktop"] [data-action="openRoom"]', { hasText: 'Web' }).click();
  const webColumn = page.locator('[data-workspace-column][data-column-type="chat"]', { hasText: 'Web' }).last();
  await expect(webColumn).toBeVisible();
  const webBox = await webColumn.boundingBox();
  expect(webBox.width).toBeGreaterThanOrEqual(390);
  expect(webBox.width).toBeLessThanOrEqual(410);
  const layoutGap = await webColumn.evaluate((column) => {
    const rooms = document.querySelector('[data-workspace-column="base"]');
    return column.offsetLeft - (rooms.offsetLeft + rooms.offsetWidth);
  });
  expect(Math.abs(layoutGap)).toBeLessThanOrEqual(1);
  expect(await webColumn.evaluate((node) => getComputedStyle(node).boxShadow)).toBe('none');
  await expect(webColumn.getByRole('button', { name: 'Close Web' })).toBeVisible();

  await openRoomFromSearch(page, 'Content');
  await expect(page.locator('[data-column-type="chat"]')).toHaveCount(2);
  expect(context.pages()).toHaveLength(1);

  const contentColumn = page.locator('[data-workspace-column][data-column-type="chat"]', { hasText: 'Content' }).last();
  await expect(contentColumn.getByRole('button', { name: 'Close Content' })).toBeVisible();
  await webColumn.getByRole('button', { name: 'Close Web' }).click();
  await expect(page.locator('[data-column-type="chat"]')).toHaveCount(1);
  await expect(contentColumn).toBeVisible();

  // Reopening an existing room focuses it; it never creates a duplicate.
  await openRoomFromSearch(page, 'Content');
  await expect(page.locator('[data-column-type="chat"]')).toHaveCount(1);

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
