import { test, expect } from 'playwright/test';

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173';

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
]) {
  test(`${viewport.name} user can edit their own profile initials and color`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${BASE}/dashboard?cv6=1&demo=profile-avatar`, { waitUntil: 'domcontentloaded' });

    const avatar = page.getByRole('button', { name: 'Edit your profile picture' });
    await expect(avatar).toBeVisible();
    const pencil = avatar.locator('.cv6-room-avatar-edit');
    const geometry = await page.evaluate(() => {
      const avatarNode = document.querySelector('.cv6-user-profile-avatar');
      const editNode = avatarNode?.querySelector('.cv6-room-avatar-edit');
      if (!avatarNode || !editNode) return null;
      const a = avatarNode.getBoundingClientRect();
      const e = editNode.getBoundingClientRect();
      return { avatarRight: a.right, avatarBottom: a.bottom, editRight: e.right, editBottom: e.bottom, editLeft: e.left, editTop: e.top };
    });
    expect(geometry).not.toBeNull();
    expect(geometry.editRight).toBeGreaterThanOrEqual(geometry.avatarRight);
    expect(geometry.editBottom).toBeGreaterThanOrEqual(geometry.avatarBottom);

    await avatar.click();
    const dialog = page.getByTestId('profile-avatar-editor');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Two initials').fill('PX');
    await dialog.getByRole('button', { name: 'Use color #BE185D' }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(avatar).toContainText('PX');
    await expect(avatar).toHaveCSS('background-color', 'rgb(190, 24, 93)');
  });
}
