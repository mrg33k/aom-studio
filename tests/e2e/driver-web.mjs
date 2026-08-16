/**
 * driver-web.mjs — mission: corner:convex-multi-agent
 *
 * Drives any web Corner surface (CV6 or corner-convex) through the verb contract in
 * capabilities.mjs. All surface-specific knowledge comes from surfaces.mjs; there are no
 * hardcoded selectors here.
 *
 * Two connection modes:
 *   cdp    — attach to the already-signed-in robot Chrome on :9222. Required for the live
 *            dashboard, which needs Patrik's real session. Never touches his daily window;
 *            it opens its own tab.
 *   launch — a fresh headless browser. Used for surfaces that sign in from scratch.
 */

import { chromium } from '@playwright/test';

const asLocator = (scope, sel) => {
  if (!sel) return null;
  if (sel.selector) return scope.locator(sel.selector);
  if (sel.role) return scope.getByRole(sel.role, sel.name ? { name: sel.name } : undefined);
  if (sel.placeholder) return scope.getByPlaceholder(sel.placeholder);
  if (sel.text) return scope.getByText(sel.text);
  return null;
};

export function createWebDriver({ surface, cfg, cdp, headless = true, slowMo = 0, onLog = () => {} }) {
  let browser, context, page, secondPage;
  let netCapture = null;

  const log = (m) => onLog(`[${surface}] ${m}`);

  const composer = () => asLocator(page, cfg.composer);
  const sendBtn = () => asLocator(page, cfg.sendButton);

  const d = {
    name: surface,
    supportsViewport: true,

    // ------------------------------------------------------------ lifecycle
    async start() {
      if (cdp) {
        browser = await chromium.connectOverCDP(cdp);
        context = browser.contexts()[0] || (await browser.newContext());
      } else {
        browser = await chromium.launch({ headless, slowMo });
        context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      }
      page = await context.newPage();
      page.on('request', (r) => { if (netCapture) netCapture.push(r.url()); });
      await page.goto(cfg.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await d.settle(2500);
    },

    async stop() {
      try { await secondPage?.close(); } catch {}
      try { await page?.close(); } catch {}
      // Only tear the browser down if we launched it. Never kill the shared robot Chrome.
      if (!cdp) { try { await browser?.close(); } catch {} }
    },

    async restart() {
      try { await page?.close(); } catch {}
      page = await context.newPage();
      page.on('request', (r) => { if (netCapture) netCapture.push(r.url()); });
      await page.goto(cfg.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await d.settle(2500);
    },

    async reload() { await page.reload({ waitUntil: 'domcontentloaded' }); await d.settle(2500); },
    async settle(ms = 1000) { await page.waitForTimeout(ms); },
    async screenshot(name) {
      try { await page.screenshot({ path: `tests/e2e/artifacts/${surface}-${name}.png`, fullPage: false }); } catch {}
    },

    // ------------------------------------------------------------ getting in
    async signIn() {
      const a = cfg.auth || {};
      if (a.mode === 'existing-session') return; // the attached profile is already signed in
      if (a.mode === 'email') {
        const field = asLocator(page, a.emailField);
        if (await field?.count()) {
          await field.first().fill(a.email);
          const submit = asLocator(page, a.submit);
          if (await submit?.count()) await submit.first().click();
          await d.settle(3000);
        }
      }
    },

    async isSignedIn() {
      const marker = asLocator(page, cfg.auth?.signedInMarker);
      if (!marker) return true;
      try { return (await marker.count()) > 0; } catch { return false; }
    },

    // ------------------------------------------------------------ rooms
    async listRooms() {
      const scope = cfg.roomList?.container ? page.locator(cfg.roomList.container).first() : page;
      const candidates = scope.locator('a[href*="/room"], a[href*="/chat"], [data-room-id], [role="listitem"], nav button');
      const n = Math.min(await candidates.count().catch(() => 0), 80);
      const out = [];
      for (let i = 0; i < n; i++) {
        const t = (await candidates.nth(i).innerText().catch(() => '')).trim().split('\n')[0];
        if (t) out.push({ title: t, index: i });
      }
      // De-duplicate by visible title: the same room rendered twice in one list is a real
      // product bug (rooms.no-duplicate-aom), but the same room in two nav regions is not.
      const seen = new Set();
      return out.filter((r) => { const k = r.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    },

    async openAnyRoom() {
      const rooms = await d.listRooms();
      const preferred = rooms.find((r) => /ahead of market/i.test(r.title)) || rooms[0];
      if (!preferred) return null;
      return (await d.reopenRoom(preferred)) ? preferred : null;
    },

    async reopenRoom(room) {
      if (!room) return false;
      const link = asLocator(page, cfg.roomLink(room.title));
      try {
        if (await link.count()) { await link.first().click({ timeout: 15000 }); }
        else { await page.getByText(room.title, { exact: false }).first().click({ timeout: 15000 }); }
      } catch { return false; }
      await d.settle(2500);
      return d.inRoom();
    },

    async inRoom() { try { return (await composer()?.count()) > 0; } catch { return false; } },

    async leaveRoom() {
      const nav = asLocator(page, cfg.roomsNav);
      try { if (await nav?.count()) { await nav.first().click(); await d.settle(1500); return true; } } catch {}
      await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
      await d.settle(2000);
      return true;
    },

    // ------------------------------------------------------------ the thread
    async threadMessages() {
      const els = page.locator(cfg.message.selector);
      const n = Math.min(await els.count().catch(() => 0), 300);
      const out = [];
      for (let i = 0; i < n; i++) {
        const el = els.nth(i);
        const [text, role, agent, at] = await Promise.all([
          el.innerText().catch(() => ''),
          el.getAttribute('data-role').catch(() => null),
          el.getAttribute('data-agent-slug').catch(() => null),
          el.getAttribute('data-created-at').catch(() => null),
        ]);
        out.push({
          text: (text || '').trim(),
          role: role || (agent ? 'assistant' : undefined),
          agent: agent || undefined,
          at: at ? Number(at) || at : undefined,
        });
      }
      return out;
    },

    async waitForMessage(pred, timeout = 20000, { noRefresh = false } = {}) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        const msgs = await d.threadMessages();
        if (msgs.some(pred)) return true;
        await page.waitForTimeout(1000);
        if (!noRefresh && Date.now() > deadline - 1500) break;
      }
      return false;
    },

    // ------------------------------------------------------------ composing
    async typeInComposer(text) {
      const c = composer();
      await c.first().click({ timeout: 15000 });
      await c.first().fill(text);
    },
    async composerValue() {
      const c = composer();
      try { return (await c.first().inputValue().catch(() => c.first().innerText())) || ''; } catch { return ''; }
    },
    async composerFocused() {
      try { return await composer().first().evaluate((el) => el === document.activeElement); } catch { return false; }
    },
    async send() {
      const btn = sendBtn();
      try {
        if (await btn?.count()) { await btn.first().click({ timeout: 10000 }); return; }
      } catch {}
      await composer().first().press('Enter');
    },

    // ------------------------------------------------------------ the team
    async mentionSuggestions(prefix) {
      await d.typeInComposer(`@${prefix}`);
      await d.settle(900);
      const menu = page.locator(cfg.mentionMenu.selector).first();
      if (!(await menu.count().catch(() => 0))) { await composer().first().fill(''); return []; }
      const items = menu.locator(cfg.mentionItem.selector);
      const n = Math.min(await items.count().catch(() => 0), 25);
      const out = [];
      for (let i = 0; i < n; i++) {
        const el = items.nth(i);
        const raw = (await el.innerText().catch(() => '')).trim();
        const slugAttr = await el.getAttribute('data-mention-slug').catch(() => null);
        const slug = slugAttr || (raw.match(/@([a-z0-9_-]+)/i)?.[1] || '').toLowerCase();
        const title = raw.replace(/@[a-z0-9_-]+/i, '').replace(/[—–-]\s*$/, '').trim();
        out.push({ title: title || undefined, slug: slug || undefined, raw });
      }
      await composer().first().fill('');
      return out;
    },

    // ------------------------------------------------------------ realtime, via a real second client
    async injectExternalMessage(room, text) {
      try {
        secondPage = secondPage || (await context.newPage());
        await secondPage.goto(cfg.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await secondPage.waitForTimeout(2500);
        const link = asLocator(secondPage, cfg.roomLink(room.title));
        if (await link.count()) await link.first().click({ timeout: 15000 });
        else await secondPage.getByText(room.title, { exact: false }).first().click({ timeout: 15000 });
        await secondPage.waitForTimeout(2000);
        const c2 = asLocator(secondPage, cfg.composer).first();
        await c2.click({ timeout: 10000 });
        await c2.fill(text);
        const b2 = asLocator(secondPage, cfg.sendButton);
        if (await b2?.count()) await b2.first().click(); else await c2.press('Enter');
        await secondPage.waitForTimeout(1500);
        return true;
      } catch { return false; }
    },

    // ------------------------------------------------------------ the rest of the room
    async listFiles() {
      const t = asLocator(page, cfg.filesPanel);
      if (!t || !(await t.count().catch(() => 0))) return null;
      try { await t.first().click({ timeout: 8000 }); await d.settle(1500); } catch { return null; }
      const items = page.locator('[data-file-id], [role="listitem"]');
      const n = await items.count().catch(() => 0);
      return Array.from({ length: Math.min(n, 50) }, (_, i) => `file-${i}`);
    },

    async addChecklistItem(text) {
      const t = asLocator(page, cfg.checklistAdd);
      if (!t || !(await t.count().catch(() => 0))) return false;
      try {
        await t.first().click({ timeout: 8000 });
        await d.settle(1000);
        const input = page.locator('input[type="text"], textarea').last();
        await input.fill(text);
        await input.press('Enter');
        await d.settle(1200);
        return true;
      } catch { return false; }
    },
    async listChecklistItems() {
      const items = page.locator('[data-checklist-item], [role="listitem"]');
      const n = Math.min(await items.count().catch(() => 0), 60);
      const out = [];
      for (let i = 0; i < n; i++) out.push((await items.nth(i).innerText().catch(() => '')).trim());
      return out;
    },

    async liveProgressCardCount() {
      if (!cfg.progressCard) return 0;
      return await page.locator(cfg.progressCard.selector).count().catch(() => 0);
    },
    async canEditOwnProfile() {
      const t = asLocator(page, cfg.profileEdit);
      return !!(t && (await t.count().catch(() => 0)));
    },
    async canSwitchTheme() {
      const t = asLocator(page, cfg.themeToggle);
      if (!t || !(await t.count().catch(() => 0))) return false;
      try {
        const before = await page.evaluate(() => document.documentElement.getAttribute('data-app-theme') || document.documentElement.getAttribute('data-theme') || '');
        await t.first().click({ timeout: 8000 });
        await d.settle(1200);
        const after = await page.evaluate(() => document.documentElement.getAttribute('data-app-theme') || document.documentElement.getAttribute('data-theme') || '');
        return before !== after;
      } catch { return false; }
    },

    // ------------------------------------------------------------ layout
    async setViewport(width, height) { await page.setViewportSize({ width, height }); await d.settle(1200); },
    async composerBottomGap() {
      try {
        return await composer().first().evaluate((el) => {
          const r = el.getBoundingClientRect();
          return Math.round(window.innerHeight - r.bottom);
        });
      } catch { return null; }
    },
    async horizontalOverflowPx() {
      try {
        return await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      } catch { return 0; }
    },

    // ------------------------------------------------------------ network
    beginNetworkCapture() { netCapture = []; return true; },
    async endNetworkCapture() { const c = netCapture || []; netCapture = null; return c; },
  };

  return d;
}
