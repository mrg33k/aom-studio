import { test, expect } from 'playwright/test';

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173';

function installChecklistApi(page) {
  const rooms = {};
  const actions = [];
  let serial = 0;
  page.route('**/api/dashboard/room-checklists**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      const room = new URL(request.url()).searchParams.get('room');
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ room, lists: rooms[room] || [] }) });
      return;
    }
    const body = JSON.parse(request.postData() || '{}');
    actions.push(body);
    const source = rooms[body.room] || (rooms[body.room] = []);
    const list = () => source.find((entry) => entry.id === body.list_id);
    if (body.action === 'create-list') source.push({ id: `list-${++serial}`, title: body.title, collapsed: false, items: [] });
    if (body.action === 'rename-list') list().title = body.title;
    if (body.action === 'toggle-list') list().collapsed = !list().collapsed;
    if (body.action === 'delete-list') rooms[body.room] = source.filter((entry) => entry.id !== body.list_id);
    if (body.action === 'add-item') list().items.push({ id: `item-${++serial}`, text: body.text, done: false });
    if (body.action === 'edit-item') list().items.find((entry) => entry.id === body.item_id).text = body.text;
    if (body.action === 'toggle-item') {
      const item = list().items.find((entry) => entry.id === body.item_id);
      item.done = !item.done;
    }
    if (body.action === 'delete-item') list().items = list().items.filter((entry) => entry.id !== body.item_id);
    if (body.action === 'share-list') {
      const destination = rooms[body.target_room] || (rooms[body.target_room] = []);
      const clone = JSON.parse(JSON.stringify(list()));
      clone.id = `list-${++serial}`;
      clone.items = clone.items.map((item) => ({ ...item, id: `item-${++serial}` }));
      destination.push(clone);
      if (body.mode === 'move') rooms[body.room] = source.filter((entry) => entry.id !== body.list_id);
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, lists: rooms[body.room] || [] }) });
  });
  return { rooms, actions };
}

async function openMobileFixture(page) {
  await page.route('**/api/dashboard/message-steps*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ steps: [] }) }));
  await page.goto(`${BASE}/dashboard?cv6=1&demo=mobile-chat-lifecycle`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="cv6-chat-input"]').waitFor({ state: 'visible', timeout: 15_000 });
}

test('per-room checklist keeps drafts, persists lists, plays an item, and copies or moves explicitly', async ({ page }) => {
  const api = installChecklistApi(page);
  const sent = [];
  await page.route('**/api/dashboard/supabase-messages', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    sent.push(body);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await openMobileFixture(page);
  await page.evaluate(() => document.documentElement.setAttribute('data-app-theme', 'glass'));

  const chatInput = page.locator('[data-testid="cv6-chat-input"]');
  await chatInput.fill('A draft that should survive checklist mode');
  const toggle = page.locator('[data-testid="room-checklist-toggle"]');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('[data-testid="room-checklist-panel"]')).toBeVisible();
  await expect(chatInput).toBeHidden();

  await page.getByRole('button', { name: /Start a list/ }).click();
  await page.getByLabel('New list title').fill('Launch notes');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const addItem = page.getByRole('textbox', { name: 'Add item to Launch notes' });
  await addItem.fill('Draft the intro');
  await addItem.press('Enter');
  await expect(page.getByLabel('Checklist item')).toHaveValue('Draft the intro');

  const visual = await page.evaluate(() => {
    const alpha = (value) => {
      const parts = String(value).match(/rgba?\(([^)]+)\)/)?.[1]?.split(/[\s,\/]+/).filter(Boolean) || [];
      return parts.length > 3 ? Number(parts[3]) : 1;
    };
    const composer = document.querySelector('.cv6-floating-composer');
    const list = document.querySelector('[data-testid="room-checklist-list"]');
    const heading = document.querySelector('[data-role="checklist-heading"]');
    const panel = document.querySelector('[data-testid="room-checklist-panel"]');
    const composerStyle = getComputedStyle(composer);
    const listStyle = getComputedStyle(list);
    return {
      composerAlpha: alpha(composerStyle.backgroundColor),
      listAlpha: alpha(listStyle.backgroundColor),
      composerPaddingTop: parseFloat(composerStyle.paddingTop),
      headingHeight: heading.getBoundingClientRect().height,
      panelGap: parseFloat(getComputedStyle(panel).rowGap),
    };
  });
  expect(visual.composerAlpha).toBe(1);
  expect(visual.listAlpha).toBe(1);
  expect(visual.composerPaddingTop).toBeGreaterThanOrEqual(14);
  expect(visual.headingHeight).toBeGreaterThanOrEqual(58);
  expect(visual.panelGap).toBeGreaterThanOrEqual(13);

  await page.getByLabel('Collapse Launch notes').click();
  await expect(page.getByLabel('Expand Launch notes')).toBeVisible();
  await page.screenshot({ path: '/tmp/cv6-room-checklists-collapsed.png', fullPage: false });
  await page.getByLabel('Expand Launch notes').click();

  await page.getByLabel('Send Draft the intro to agent').click();
  await expect.poll(() => sent.filter((entry) => entry.text === 'Draft the intro').length).toBe(1);
  expect(sent.find((entry) => entry.text === 'Draft the intro')?.metadata?.interaction_mode).toBe('work');
  await page.getByLabel('Complete item').click();
  await expect(page.getByLabel('Reopen item')).toBeVisible();
  await expect(page.getByLabel('Checklist item')).toHaveCSS('text-decoration-line', 'line-through');

  await page.getByLabel('Share Launch notes').click();
  await page.getByLabel('Destination room').selectOption({ label: 'Another Room · agent' });
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  expect(api.rooms['agent:another-room']).toHaveLength(1);
  expect(api.rooms['agent:renderer-room']).toHaveLength(1);
  expect(api.actions.at(-1)).toMatchObject({ action: 'share-list', mode: 'copy', target_room: 'agent:another-room' });
  await page.screenshot({ path: '/tmp/cv6-room-checklists-mobile.png', fullPage: true });

  await toggle.click();
  await expect(chatInput).toBeVisible();
  await expect(chatInput).toHaveValue('A draft that should survive checklist mode');
  await toggle.click();
  await expect(page.getByLabel('List title')).toHaveValue('Launch notes');

  await page.getByLabel('Share Launch notes').click();
  await page.getByLabel('Destination room').selectOption({ label: 'Fixture Project · project' });
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await expect(page.getByLabel('List title')).toHaveCount(0);
  expect(api.rooms['project:fixture-project']).toHaveLength(1);
  expect(api.rooms['agent:renderer-room']).toHaveLength(0);

  const geometry = await page.locator('.mcomposer').evaluate((composer) => {
    const panel = composer.querySelector('[data-testid="room-checklist-panel"]');
    const box = composer.getBoundingClientRect();
    const panelBox = panel?.getBoundingClientRect();
    return { composerBottom: box.bottom, viewport: window.innerHeight, panelHeight: panelBox?.height || 0 };
  });
  expect(geometry.viewport - geometry.composerBottom).toBeGreaterThanOrEqual(8);
  expect(geometry.panelHeight).toBeLessThanOrEqual(Math.min(geometry.viewport * .52, 470) + 2);
});

test('desktop room composer exposes the same checklist control', async ({ page }) => {
  installChecklistApi(page);
  await page.route('**/api/dashboard/supabase-messages**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ messages: [] }) }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/dashboard?cv6=1&view=home&demo=r16-composer-bottom`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-cv6]').first().waitFor({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Search', exact: true }).first().click();
  await page.getByPlaceholder('Search rooms and missions…').fill('Web');
  await page.locator('.sres', { hasText: 'Web' }).first().click();
  const toggle = page.locator('[data-testid="room-checklist-toggle"]').last();
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('[data-testid="room-checklist-panel"]').last()).toBeVisible();
  await expect(page.getByText('private until you press Play').last()).toBeVisible();
  await page.screenshot({ path: '/tmp/cv6-room-checklists-desktop.png', fullPage: true });
});
