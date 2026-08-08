import { test, expect } from 'playwright/test';

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173';

test('mobile Files switches between a resized preview grid and persistent list view', async ({ page }) => {
  const now = new Date().toISOString();
  await page.route('**/api/dashboard/preferences**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ value: null }),
  }));
  await page.route('**/api/dashboard/supabase-messages?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      messages: [
        {
          id: 'r23-image',
          role: 'assistant',
          agent: 'renderer-room',
          timestamp: now,
          text: '',
          metadata: { attachments: [{ url: `${BASE}/corner-og.png`, name: 'grid-preview.png', mime: 'image/png', size: 18500 }] },
        },
        {
          id: 'r23-document',
          role: 'assistant',
          agent: 'renderer-room',
          timestamp: now,
          text: '',
          metadata: { attachments: [{ url: `${BASE}/cv4-static/DESIGN.md`, name: 'DESIGN.md', mime: 'text/markdown', size: 8200 }] },
        },
      ],
    }),
  }));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('chat-files-button').click();

  const sheet = page.locator('.cv6-fs-sheet');
  await expect(sheet).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.locator('.cv6-fs-grid.is-grid')).toBeVisible();

  const preview = sheet.locator('.cv6-fs-preview-img').first();
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(preview).toHaveCSS('object-fit', 'contain');

  await page.getByRole('button', { name: 'List view' }).click();
  await expect(page.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet.locator('.cv6-fs-grid.is-list')).toBeVisible();
  await expect(sheet.locator('.cv6-fs-card.is-list')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cv6.filesShelf.prefs') || '{}').layout)).toBe('list');

  await page.getByRole('button', { name: 'Close files' }).last().click();
  await page.getByTestId('chat-files-button').click();
  await expect(page.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Grid view' }).click();
  await page.getByRole('button', { name: 'Preview grid-preview.png' }).click();
  await expect(sheet).toBeHidden();
});
