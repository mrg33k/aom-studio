import { test, expect } from 'playwright/test';

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173';

async function openRoomFromSearch(page, roomName) {
  await page.getByRole('button', { name: 'Search', exact: true }).first().click();
  await page.getByPlaceholder('Search rooms and missions…').fill(roomName);
  await page.locator('.sres', { hasText: roomName }).first().click();
  await expect(page.getByRole('button', { name: new RegExp(`Open ${roomName} in a new window`, 'i') })).toBeVisible();
}

test('desktop opens two independently reloadable chat windows', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`${BASE}/dashboard?cv6=1&view=home`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cv6]').first().waitFor();

  await openRoomFromSearch(page, 'Web');
  await page.screenshot({ path: '/tmp/corner-m13-main-chat.png', fullPage: true });
  const [webWindow] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Open Web in a new window' }).click(),
  ]);
  await webWindow.locator('[data-chat-window="1"]').waitFor();
  await expect(webWindow.getByText('Independent chat window')).toBeVisible();
  await expect(webWindow.locator('[data-chat-room-rail]')).toHaveCount(0);
  await expect(webWindow.locator('.cv6-chat-popout')).toHaveCount(0);
  await expect(webWindow).toHaveTitle('Web · Corner chat');
  const webRoomId = new URL(webWindow.url()).searchParams.get('room');
  expect(webRoomId).toBeTruthy();
  expect(new URL(webWindow.url()).searchParams.has('world')).toBe(false);

  const contentRow = page.locator('[data-chat-room-rail] .room', { hasText: 'Content' }).first();
  await contentRow.click();
  const [contentWindow] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Open Content in a new window' }).click(),
  ]);
  await contentWindow.locator('[data-chat-window="1"]').waitFor();
  await expect(contentWindow).toHaveTitle('Content · Corner chat');
  const contentRoomId = new URL(contentWindow.url()).searchParams.get('room');
  expect(contentRoomId).toBeTruthy();
  expect(contentRoomId).not.toBe(webRoomId);
  expect(context.pages()).toHaveLength(3);

  // A child reload resolves from its URL and never overwrites the shared cold-start room.
  await page.evaluate(() => localStorage.setItem('cv6.lastRoom', 'm13-sentinel'));
  await webWindow.reload({ waitUntil: 'domcontentloaded' });
  await webWindow.locator('[data-chat-window="1"]').waitFor();
  await expect(webWindow).toHaveTitle('Web · Corner chat');
  expect(await page.evaluate(() => localStorage.getItem('cv6.lastRoom'))).toBe('m13-sentinel');

  await webWindow.screenshot({ path: '/tmp/corner-m13-chat-window.png', fullPage: true });
});

test('desktop explains how to recover when the browser blocks a chat window', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto(`${BASE}/dashboard?cv6=1&view=home`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cv6]').first().waitFor();
  await openRoomFromSearch(page, 'Web');
  await page.evaluate(() => { window.open = () => null; });
  await page.getByRole('button', { name: 'Open Web in a new window' }).click();
  await expect(page.getByText('Your browser blocked the chat window. Allow pop-ups for Corner and try again.')).toBeVisible();
});
