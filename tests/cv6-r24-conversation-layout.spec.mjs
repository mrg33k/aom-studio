import { test, expect } from 'playwright/test';

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173';

test('conversation stays centered on iPad and desktop while Files uses the tablet canvas', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle`, { waitUntil: 'domcontentloaded' });

  const lane = page.locator('.cv6-chat-reading-lane');
  const composer = page.locator('[data-screen="chat-room"] > .mcomposer');
  await expect(lane).toBeVisible();
  await expect(page.locator('.cv6-mobile-turn-avatar').first()).toHaveCSS('display', 'none');

  const tablet = await page.evaluate(() => {
    const laneBox = document.querySelector('.cv6-chat-reading-lane').getBoundingClientRect();
    const composerBox = document.querySelector('[data-screen="chat-room"] > .mcomposer').getBoundingClientRect();
    return {
      laneWidth: laneBox.width,
      laneCenter: (laneBox.left + laneBox.right) / 2,
      composerWidth: composerBox.width,
      composerCenter: (composerBox.left + composerBox.right) / 2,
    };
  });
  expect(tablet.laneWidth).toBe(720);
  expect(tablet.composerWidth).toBe(720);
  expect(Math.abs(tablet.laneCenter - 384)).toBeLessThanOrEqual(1);
  expect(Math.abs(tablet.composerCenter - 384)).toBeLessThanOrEqual(1);

  await page.getByTestId('chat-files-button').click();
  const sheet = page.locator('.cv6-fs-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveCSS('width', '720px');
  const sheetBox = await sheet.boundingBox();
  expect(Math.abs((sheetBox.x + sheetBox.width / 2) - 384)).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const desktop = await page.locator('.cv6-chat-reading-lane').boundingBox();
  expect(desktop.width).toBe(760);
  expect(Math.abs((desktop.x + desktop.width / 2) - 720)).toBeLessThanOrEqual(1);
});
