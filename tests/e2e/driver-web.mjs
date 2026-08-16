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

export function createWebDriver({ surface, cfg, cdp, headless = true, slowMo = 0, targetRoom = null, onLog = () => {} }) {
  let browser, context, page, secondPage;
  let netCapture = null;

  const log = (m) => onLog(`[${surface}] ${m}`);

  const composer = () => asLocator(page, cfg.composer);
  const sendBtn = () => asLocator(page, cfg.sendButton);

  const d = {
    name: surface,
    supportsViewport: true,
    canonicalRoomPattern: cfg.canonicalRoomPattern,

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
      const candidates = cfg.roomRow
        ? page.locator(cfg.roomRow.selector)
        : scope.locator('a[href*="/room"], a[href*="/chat"], [data-room-id], [role="listitem"], nav button');
      const n = Math.min(await candidates.count().catch(() => 0), 80);
      const out = [];
      for (let i = 0; i < n; i++) {
        const el = candidates.nth(i);
        const raw = (await el.innerText().catch(() => '')).trim();
        const key = await el.getAttribute('data-cv6-arg').catch(() => null)
          || await el.getAttribute('data-room-id').catch(() => null);
        // The first line is a monogram avatar ("BR"); the room's name is the next
        // non-empty line. Falling back to line 0 would name every room by its initials.
        const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);
        const title = (lines.length > 1 && /^[A-Z]{1,3}$/.test(lines[0]) ? lines[1] : lines[0]) || '';
        if (title) out.push({ title, key, index: i });
      }
      // De-duplicate by visible title: the same room rendered twice in one list is a real
      // product bug (rooms.no-duplicate-aom), but the same room in two nav regions is not.
      const seen = new Set();
      return out.filter((r) => { const k = r.title.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    },

    async openAnyRoom() {
      const rooms = await d.listRooms();
      // Every run posts real messages and wakes real agents, so target is deliberate:
      // an explicit --room wins, then a room that looks like a test room, and only then
      // whatever is first. Never silently pick the busiest live room.
      const preferred =
        (targetRoom && rooms.find((r) => r.key === targetRoom || new RegExp(targetRoom, 'i').test(r.title || ''))) ||
        rooms.find((r) => /test|sandbox|scratch|acceptance/i.test(r.title || '')) ||
        rooms.find((r) => (d.canonicalRoomPattern || /^aom$/i).test((r.title || '').trim())) ||
        rooms[0];
      if (!preferred) return null;
      return (await d.reopenRoom(preferred)) ? preferred : null;
    },

    async reopenRoom(room) {
      if (!room) return false;
      try {
        // Prefer the row's own stable key over its visible title. Two rooms can share a
        // display name (this dashboard really does show "Corner" as both an agent and a
        // project), so clicking by text opens whichever one happens to be first.
        if (room.key && cfg.roomRow) {
          // Build the keyed selector from EVERY row variant, not just the first one. The
          // row class changes with viewport (mresumecard on phone, projrow/missrow on
          // desktop), and hardcoding one of them silently matches nothing on the other
          // layout — which reads as "could not open any room" on a working dashboard.
          const keyed = cfg.roomRow.selector
            .split(',')
            .map((part) => part.trim()
              .replace('[data-cv6-arg]', `[data-cv6-arg="${room.key}"]`)
              .replace('[data-room-id]', `[data-room-id="${room.key}"]`))
            .join(', ');
          const byKey = page.locator(keyed);
          if (await byKey.count().catch(() => 0)) {
            // Try a REAL pointer click first — that is what a person does, and if it
            // fails to open the room that is a product finding worth surfacing.
            await byKey.first().click({ timeout: 15000 }).catch(() => {});
            if (await d.waitForRoom(8000)) return true;

            // CV6's room rows sit under swipe/pointer recognisers (row swipe-archive,
            // rail pointer freeze) that can swallow a synthetic mouse press. Fall back to
            // the element's own click handler, but SAY SO rather than passing silently —
            // if a real click never works, that is a tap bug, not a test detail.
            log(`real pointer click did not open "${room.title}"; retrying with a direct element click`);
            d.pointerClickFailures = (d.pointerClickFailures || 0) + 1;
            await page.evaluate((sel) => document.querySelector(sel)?.click(), keyed).catch(() => {});
            return d.waitForRoom();
          }
        }
        const link = asLocator(page, cfg.roomLink(room.title));
        if (await link.count().catch(() => 0)) await link.first().click({ timeout: 15000 });
        else await page.getByText(room.title, { exact: false }).first().click({ timeout: 15000 });
      } catch { return false; }
      return d.waitForRoom();
    },

    // Wait for the room to actually open rather than sleeping a fixed 2.5s and hoping.
    // The room transition is animated and data-driven, so a fixed sleep reports "could
    // not open any room" on a dashboard that opens rooms perfectly well.
    async waitForRoom(timeout = 20000) {
      const marker = asLocator(page, cfg.inRoomMarker || cfg.composer);
      try { await marker.first().waitFor({ state: 'attached', timeout }); } catch { return false; }
      await d.settle(1200);
      return true;
    },

    async inRoom() {
      const marker = asLocator(page, cfg.inRoomMarker || cfg.composer);
      try { return (await marker?.count()) > 0; } catch { return false; }
    },

    async leaveRoom() {
      const nav = asLocator(page, cfg.roomsNav);
      try { if (await nav?.count()) { await nav.first().click(); await d.settle(1500); return true; } } catch {}
      await page.goto(cfg.url, { waitUntil: 'domcontentloaded' });
      await d.settle(2000);
      return true;
    },

    // ------------------------------------------------------------ the thread
    // One browser-side pass. Reading 29 message rows attribute-by-attribute over CDP is
    // ~120 round trips and slow enough to blow the waitForMessage budget on its own.
    async threadMessages() {
      const m = cfg.message;
      return await page.evaluate(({ selector, userTurnAttr, idAttr, agentAttr, timeAttr, roleAttr }) => {
        return [...document.querySelectorAll(selector)].slice(0, 400).map((el) => {
          const has = (a) => a && el.hasAttribute(a);
          const get = (a) => (a ? el.getAttribute(a) : null);
          // CV6 marks the viewer's own turns with a bare data-userturn attribute and gives
          // agent turns no role attribute at all, so "not a user turn" IS the agent turn.
          const role = get(roleAttr) || (has(userTurnAttr) ? 'user' : 'assistant');
          const at = get(timeAttr);
          return {
            id: get(idAttr) || undefined,
            text: (el.innerText || '').trim(),
            role,
            agent: get(agentAttr) || undefined,
            at: at ? (Number(at) || at) : undefined,
          };
        });
      }, {
        selector: m.selector,
        userTurnAttr: m.userTurnAttr || null,
        idAttr: m.idAttr || 'data-message-id',
        agentAttr: m.agentAttr || null,
        timeAttr: m.timeAttr || null,
        roleAttr: m.roleAttr || null,
      }).catch(() => []);
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
      const c = composer().first();
      await c.waitFor({ state: 'attached', timeout: 20000 });
      // Do NOT gate typing on a click. The composer is often overlapped by a sticky
      // footer or mid-transition, so click() times out on an element that fill() drives
      // perfectly well. A click timeout here reads as "CV6 cannot send messages", which
      // is false and would poison the baseline.
      try { await c.fill(text, { timeout: 15000 }); return; } catch {}
      await c.click({ force: true, timeout: 10000 });
      await c.fill(text, { force: true, timeout: 10000 });
    },
    async composerValue() {
      const c = composer();
      try { return (await c.first().inputValue().catch(() => c.first().innerText())) || ''; } catch { return ''; }
    },
    async composerFocused() {
      try { return await composer().first().evaluate((el) => el === document.activeElement); } catch { return false; }
    },
    async send() {
      // Try the surface's explicit send control, then its accessible name, then Enter.
      // CV6 uses a different send button on Home than inside a room, so a single
      // selector is not enough and Enter is the reliable floor.
      const candidates = [];
      if (cfg.sendButton?.selector) candidates.push(page.locator(cfg.sendButton.selector));
      if (cfg.sendButton?.role) candidates.push(page.getByRole(cfg.sendButton.role, { name: cfg.sendButton.name }));
      for (const c of candidates) {
        try {
          if (await c.count().catch(() => 0)) { await c.first().click({ timeout: 8000 }); return; }
        } catch { /* fall through to the next strategy */ }
      }
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
