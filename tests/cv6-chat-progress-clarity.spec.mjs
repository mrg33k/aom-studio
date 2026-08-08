import { test, expect } from 'playwright/test';

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173';

test('an established room keeps one changing progress card at the tail and names Activity work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/dashboard/supabase-messages**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }));
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cv6-message-thread][data-mode="latest-day"]').waitFor({ timeout: 15_000 });

  await expect(page.locator('[data-cv6-live-work]')).toHaveCount(1);
  await expect(page.locator('.cv6-step-card')).toHaveCount(1);
  await expect(page.locator('.cv6-sc-bar')).toHaveCount(1);
  await expect(page.locator('.cv6-sc-current')).toHaveText('Keeping mobile gallery compatibility');
  await expect(page.locator('.gstep.is-active')).toHaveCount(0);
  expect(await page.evaluate(() => {
    const thread = document.querySelector('[data-cv6-message-thread][data-mode="latest-day"]');
    const live = document.querySelector('[data-cv6-live-work]');
    return !!thread && !!live && !!(thread.compareDocumentPosition(live) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);

  await page.getByRole('button', { name: 'Activity' }).click();
  await expect(page.locator('.cv6-work-dropdown .cv6-wl-label')).toHaveText('Keeping mobile gallery compatibility');
  await expect(page.locator('.cv6-work-dropdown .cv6-wl-label', { hasText: /^Working$/ })).toHaveCount(0);

  await expect.poll(() => page.locator('.scrbody').evaluate((el) => Math.round(el.scrollHeight - el.scrollTop - el.clientHeight))).toBeLessThanOrEqual(2);
});
