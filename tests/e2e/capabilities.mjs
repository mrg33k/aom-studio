/**
 * capabilities.mjs — mission: corner:convex-multi-agent
 *
 * THE ONE LIST. Everything Corner does that a user would notice, written once, in terms
 * of what a person does and sees — never in terms of a component, selector, or database.
 *
 * That is what makes it portable. The same list grades:
 *   - CV6           (the live dashboard, today's bar)
 *   - convex-web    (corner-convex.vercel.app)
 *   - ios           (the real native app in the simulator)
 *
 * Run it against CV6 first and freeze the result as the baseline. That baseline IS
 * "everything that worked on CV6". The other two surfaces are then graded against it,
 * so "is it as good as CV6 yet" becomes a number instead of an opinion.
 *
 * ADDING A CAPABILITY: add it here, then implement any new driver verb in every driver.
 * Never add a check that only one surface can answer — that breaks comparability, which
 * is the entire point of this file.
 *
 * TIERS
 *   core    — if this fails the surface is not usable. Blocks any domain swap.
 *   parity  — CV6 does it; a replacement must too before it can take over.
 *   polish  — quality of feel. Tracked, does not block.
 */

export const TIERS = ['core', 'parity', 'polish'];

/** Unique marker per run so assertions never collide across surfaces or reruns. */
export const mkToken = (surface) =>
  `E2E-${surface.toUpperCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();

/**
 * Each capability: { id, title, tier, run(d, ctx) -> true | string }
 *   return true      → PASS
 *   return a string  → FAIL, and the string is the reason (shown as the work item)
 *   throw            → FAIL with the exception message
 *
 * `d` is the driver (see drivers/README for the verb contract).
 * `ctx` carries { token, surface, log }.
 */
export const CAPABILITIES = [
  // ---------------------------------------------------------------- getting in
  {
    id: 'auth.signin',
    title: 'A real user signs in and lands in the app',
    tier: 'core',
    async run(d) {
      await d.signIn();
      return (await d.isSignedIn()) || 'sign-in did not reach an authenticated app shell';
    },
  },
  {
    id: 'rooms.list',
    title: 'The room list loads with the user\'s rooms',
    tier: 'core',
    async run(d) {
      const rooms = await d.listRooms();
      if (!Array.isArray(rooms)) return 'driver did not return a room list';
      return rooms.length > 0 || 'room list is empty for an authenticated user';
    },
  },
  {
    id: 'rooms.no-duplicate-aom',
    title: 'The house room appears exactly once, not as two aliases',
    tier: 'core',
    async run(d) {
      // The room's display name differs by surface ("AOM" on CV6, "Ahead of Market"
      // elsewhere), so the pattern comes from the surface config rather than being
      // hardcoded here. What is being graded is that ONE room shows up ONCE.
      const pattern = d.canonicalRoomPattern || /ahead of market|^aom$/i;
      const rooms = await d.listRooms();
      const hits = rooms.filter((r) => pattern.test((r.title || '').trim()));
      if (hits.length === 0) return `no house room matching ${pattern} in a list of ${rooms.length}`;
      return hits.length === 1 || `the house room appears ${hits.length} times: ${hits.map((h) => h.key || h.title).join(', ')}`;
    },
  },
  {
    id: 'room.open',
    title: 'Opening a room shows that room\'s conversation',
    tier: 'core',
    async run(d, ctx) {
      const room = await d.openAnyRoom();
      if (!room) return 'could not open any room';
      ctx.room = room;
      return (await d.inRoom()) || `opened ${room.title} but no conversation view rendered`;
    },
  },
  {
    id: 'thread.history',
    title: 'Existing messages render, oldest to newest',
    tier: 'core',
    async run(d) {
      const msgs = await d.threadMessages();
      if (!Array.isArray(msgs)) return 'driver did not return messages';
      if (msgs.length === 0) return true; // an empty room is legitimate, not a failure
      const ts = msgs.map((m) => m.at).filter(Boolean);
      if (ts.length < 2) return true;
      const ordered = ts.every((v, i) => i === 0 || v >= ts[i - 1]);
      return ordered || 'messages are not in chronological order';
    },
  },

  // ---------------------------------------------------------------- the core loop
  {
    id: 'compose.send',
    title: 'Typing in the visible composer and sending puts the message in the conversation',
    tier: 'core',
    async run(d, ctx) {
      await d.typeInComposer(ctx.token);
      await d.send();
      const ok = await d.waitForMessage((m) => (m.text || '').includes(ctx.token), 20000);
      return ok || `sent message containing ${ctx.token} never appeared in the thread`;
    },
  },
  {
    id: 'compose.clears',
    title: 'The composer empties immediately after sending',
    tier: 'parity',
    async run(d) {
      const v = await d.composerValue();
      return (v || '').trim() === '' || `composer still holds "${String(v).slice(0, 40)}"`;
    },
  },
  {
    id: 'compose.keeps-focus',
    title: 'The composer keeps focus so you can keep typing',
    tier: 'polish',
    async run(d) {
      return (await d.composerFocused()) || 'focus left the composer after send';
    },
  },
  {
    id: 'compose.no-double-send',
    title: 'Hitting send twice quickly does not post the message twice',
    tier: 'parity',
    async run(d, ctx) {
      const probe = `${ctx.token}-DOUBLE`;
      await d.typeInComposer(probe);
      await d.send();
      await d.send(); // the second one must be a no-op: composer is already empty
      await d.waitForMessage((m) => (m.text || '').includes(probe), 20000);
      await d.settle(2500);
      const msgs = await d.threadMessages();
      const n = msgs.filter((m) => (m.text || '').includes(probe)).length;
      return n === 1 || `message posted ${n} times`;
    },
  },
  {
    id: 'agent.replies',
    title: 'An agent answers in the room',
    tier: 'core',
    async run(d, ctx) {
      const ok = await d.waitForMessage(
        (m) => m.role === 'assistant' && !(m.text || '').includes(ctx.token),
        90000,
      );
      return ok || 'no agent reply within 90s';
    },
  },

  // ---------------------------------------------------------------- it stays there
  {
    id: 'thread.persists-navigate',
    title: 'Leaving the room and coming back keeps the conversation',
    tier: 'core',
    async run(d, ctx) {
      await d.leaveRoom();
      await d.reopenRoom(ctx.room);
      const msgs = await d.threadMessages();
      return msgs.some((m) => (m.text || '').includes(ctx.token)) || 'message gone after re-entering the room';
    },
  },
  {
    id: 'thread.persists-restart',
    title: 'Fully restarting the app keeps the conversation',
    tier: 'core',
    async run(d, ctx) {
      await d.restart();
      await d.signIn();
      await d.reopenRoom(ctx.room);
      const msgs = await d.threadMessages();
      return msgs.some((m) => (m.text || '').includes(ctx.token)) || 'message gone after restarting the app';
    },
  },
  {
    id: 'thread.realtime',
    title: 'A message sent from somewhere else shows up without touching anything',
    tier: 'core',
    async run(d, ctx) {
      const probe = `${ctx.token}-EXTERNAL`;
      const injected = await d.injectExternalMessage(ctx.room, probe);
      if (!injected) return 'driver could not inject an external message (backend write path unavailable)';
      const ok = await d.waitForMessage((m) => (m.text || '').includes(probe), 20000, { noRefresh: true });
      return ok || 'external message did not arrive without a manual refresh';
    },
  },

  // ---------------------------------------------------------------- the team
  // NOTE: CV6 has no @-autocomplete at all today (nothing in src/dashboard/cv6next matches
  // /mention|autocomplete/). These must therefore report as GAPS on that surface, not as
  // failures — and crucially `mention.unknown-not-rerouted` must not PASS just because a
  // surface offers nothing at all. A check that passes by absence is a false pass, and a
  // false pass in the baseline becomes a bar the replacement is silently held to.
  {
    id: 'mention.autocomplete-opens',
    title: 'Typing @ offers the team, showing both the human role and the handle',
    tier: 'parity',
    async run(d) {
      const items = await d.mentionSuggestions('');
      if (items === null) return 'no mention autocomplete on this surface';
      if (items.length === 0) return 'the mention menu exists but typing @ offered nothing';
      const labelled = items.some((i) => i.title && i.slug);
      return labelled || `suggestions lack a human role or a handle: ${JSON.stringify(items.slice(0, 3))}`;
    },
  },
  {
    id: 'mention.roles-resolve',
    title: '@web, @design and @systems resolve to the right teammates',
    tier: 'parity',
    async run(d) {
      const probe = await d.mentionSuggestions('');
      if (probe === null) return 'no mention autocomplete on this surface';
      const want = { web: 'bobby', design: 'steffen', systems: 'elon' };
      const wrong = [];
      for (const [typed, expected] of Object.entries(want)) {
        const items = await d.mentionSuggestions(typed);
        const top = items?.[0];
        if (!top || top.slug !== expected) wrong.push(`@${typed}→${top?.slug || 'nothing'} (want ${expected})`);
      }
      return wrong.length === 0 || wrong.join(', ');
    },
  },
  {
    id: 'mention.unknown-not-rerouted',
    title: 'An unknown handle is not silently answered by someone else',
    tier: 'parity',
    async run(d) {
      const items = await d.mentionSuggestions('zzzznotarealagent');
      // Absence of the whole feature is a gap, NOT a pass. Without this guard a surface
      // with no autocomplete scores a free point here.
      if (items === null) return 'no mention autocomplete on this surface';
      return items.length === 0 || `offered ${items.map((i) => i.slug).join(', ')} for an unknown handle`;
    },
  },
  {
    id: 'mention.routes-to-named-agent',
    title: 'Naming a teammate gets an answer from that teammate',
    tier: 'parity',
    async run(d, ctx) {
      const probe = `${ctx.token}-MENTION`;
      await d.typeInComposer(`@bobby ${probe} which deployment is live right now?`);
      await d.send();
      const ok = await d.waitForMessage(
        (m) => m.role === 'assistant' && /bobby/i.test(m.agent || m.author || ''),
        90000,
      );
      return ok || 'the named teammate did not answer';
    },
  },

  // ---------------------------------------------------------------- multi-agent conversation
  // New capability the Convex build adds; CV6 has no equivalent, so these report as gaps
  // there and as "ahead of the bar" once Convex has them. Straight from the mission spec.
  {
    id: 'agents.two-specialties-both-answer',
    title: 'Asking about two specialties gets both teammates, not one',
    tier: 'parity',
    async run(d, ctx) {
      const probe = `${ctx.token}-MULTI`;
      await d.typeInComposer(`@bobby @steffen ${probe} what shipped on the site this week and does the design hold up?`);
      await d.send();
      await d.waitForMessage((m) => (m.text || '').includes(probe), 20000);
      const before = (await d.threadMessages()).length;
      await d.settle(2000);
      const ok = await d.waitForMessage((m) => m.role === 'assistant', 120000);
      if (!ok) return 'no agent answered a two-specialty question';
      const replies = (await d.threadMessages()).slice(before).filter((m) => m.role === 'assistant');
      const who = new Set(replies.map((r) => r.agent).filter(Boolean));
      if (who.size >= 2) return true;
      // Fall back to name-in-text when the surface does not tag rows with an agent slug.
      const named = new Set();
      for (const r of replies) for (const n of ['bobby', 'steffen']) if (new RegExp(n, 'i').test(r.text || '')) named.add(n);
      return named.size >= 2 || `only ${who.size || named.size || 0} teammate(s) contributed`;
    },
  },
  {
    id: 'agents.no-repeated-conclusion',
    title: 'Two teammates in one turn do not say the same thing',
    tier: 'parity',
    async run(d) {
      const replies = (await d.threadMessages()).filter((m) => m.role === 'assistant').slice(-2);
      if (replies.length < 2) return 'fewer than two agent replies to compare';
      // Cheap overlap check on content words. Near-identical conclusions are the failure
      // the novelty gate exists to prevent.
      const words = (s) => new Set(String(s || '').toLowerCase().match(/[a-z]{5,}/g) || []);
      const a = words(replies[0].text), b = words(replies[1].text);
      if (a.size < 5 || b.size < 5) return true;
      const shared = [...a].filter((w) => b.has(w)).length;
      const overlap = shared / Math.min(a.size, b.size);
      return overlap < 0.6 || `the two replies share ${Math.round(overlap * 100)}% of their content words`;
    },
  },
  {
    id: 'agents.reply-is-short',
    title: 'An ordinary reply stays short: 3 sentences or 3 bullets, usually under 60 words',
    tier: 'parity',
    async run(d) {
      const last = (await d.threadMessages()).filter((m) => m.role === 'assistant').slice(-1)[0];
      if (!last) return 'no agent reply to measure';
      const text = String(last.text || '').replace(/^\s*\w+\s*\n/, ''); // drop a leading name line
      const words = (text.match(/\S+/g) || []).length;
      const bullets = (text.match(/^\s*[-•*]\s+/gm) || []).length;
      const sentences = (text.match(/[.!?](\s|$)/g) || []).length;
      if (bullets > 0) return bullets <= 3 || `${bullets} bullets`;
      if (sentences > 3 && words > 60) return `${sentences} sentences / ${words} words`;
      return true;
    },
  },
  {
    id: 'agents.no-canned-opener',
    title: 'No "Bobby here", no headings, no restating the question back',
    tier: 'parity',
    async run(d) {
      const last = (await d.threadMessages()).filter((m) => m.role === 'assistant').slice(-1)[0];
      if (!last) return 'no agent reply to measure';
      const t = String(last.text || '');
      const bad = [
        [/\b(bobby|steffen|elon|rex)\s+here\b/i, 'canned introduction'],
        [/^\s*#{1,6}\s/m, 'markdown heading'],
        [/^\s*\*{0,2}(Finding|Analysis|Response|Summary|Answer)\*{0,2}\s*:/im, 'labelled section'],
      ];
      const hit = bad.find(([re]) => re.test(t));
      return !hit || `reply contains a ${hit[1]}`;
    },
  },

  // ---------------------------------------------------------------- the rest of the room
  {
    id: 'files.panel',
    title: 'The room\'s files are listed',
    tier: 'parity',
    async run(d) {
      const files = await d.listFiles();
      return Array.isArray(files) || 'no files panel on this surface';
    },
  },
  {
    id: 'checklist.persists',
    title: 'A room checklist survives a reload',
    tier: 'parity',
    async run(d, ctx) {
      const item = `${ctx.token}-TASK`;
      const added = await d.addChecklistItem(item);
      if (!added) return 'no room checklist on this surface';
      await d.reload();
      await d.reopenRoom(ctx.room);
      const items = await d.listChecklistItems();
      return items.some((t) => (t || '').includes(item)) || 'checklist item lost after reload';
    },
  },
  {
    id: 'progress.single-card',
    title: 'While an agent works there is exactly one live progress card',
    tier: 'polish',
    async run(d) {
      const n = await d.liveProgressCardCount();
      return n <= 1 || `${n} live progress cards on screen at once`;
    },
  },
  {
    id: 'profile.edit',
    title: 'A user can change their own initials and colour',
    tier: 'polish',
    async run(d) {
      return (await d.canEditOwnProfile()) || 'no way to edit your own profile';
    },
  },
  {
    id: 'theme.control',
    title: 'The theme control changes the app\'s appearance',
    tier: 'polish',
    async run(d) {
      return (await d.canSwitchTheme()) || 'no working theme control';
    },
  },

  // ---------------------------------------------------------------- mobile shape
  {
    id: 'mobile.composer-on-edge',
    title: 'At phone width the composer sits on the bottom edge and follows the keyboard',
    tier: 'parity',
    async run(d) {
      if (!d.supportsViewport) return true; // native decides its own layout
      await d.setViewport(390, 844);
      const gap = await d.composerBottomGap();
      if (gap == null) return 'could not measure the composer position';
      return gap <= 24 || `composer sits ${gap}px above the bottom edge`;
    },
  },
  {
    id: 'layout.composer-does-not-cover-content',
    title: 'The composer is pinned to the bottom, not floating over the list',
    tier: 'parity',
    async run(d) {
      const overlap = await d.composerOverlapPx();
      if (overlap == null) return 'could not measure the composer against the list';
      // Seen on corner-convex 2026-08-16: the composer sits mid-screen with room rows
      // rendering behind and below it, so the list is unreadable under the input.
      return overlap <= 0 || `${overlap}px of list content renders underneath the composer`;
    },
  },
  {
    id: 'mobile.no-horizontal-scroll',
    title: 'At phone width nothing scrolls sideways',
    tier: 'parity',
    async run(d) {
      if (!d.supportsViewport) return true;
      await d.setViewport(390, 844);
      const over = await d.horizontalOverflowPx();
      return (over || 0) <= 0 || `page scrolls ${over}px sideways`;
    },
  },

  // ---------------------------------------------------------------- desktop shape
  // Added 2026-08-16 after a full day of green runs on a desktop that rendered as a
  // phone column: every layout check above pins the viewport to 390x844, so the suite
  // was structurally blind to the desktop. These two make that class of miss impossible.
  {
    id: 'desktop.rooms-beside-conversation',
    title: 'On a big screen, opening a room keeps the rooms list visible beside the conversation',
    tier: 'parity',
    async run(d) {
      if (!d.supportsViewport) return true; // native decides its own layout
      await d.setViewport(1440, 900);
      if (!(await d.isSignedIn())) { await d.signIn(); }
      if (!(await d.inRoom())) { if (!(await d.openAnyRoom())) return 'no room could be opened'; }
      const info = await d.desktopSideBySideInfo?.();
      if (!info) return 'could not measure the desktop layout';
      return !!info.rail || 'opening a room leaves nothing beside it — one pane at a time is phone behaviour at 1440px';
    },
  },
  {
    id: 'desktop.uses-the-width',
    title: 'On a big screen the app uses the screen, not a centred phone column',
    tier: 'parity',
    async run(d) {
      if (!d.supportsViewport) return true;
      await d.setViewport(1440, 900);
      if (!(await d.isSignedIn())) { await d.signIn(); }
      if (!(await d.inRoom())) { if (!(await d.openAnyRoom())) return 'no room could be opened'; }
      const info = await d.desktopSideBySideInfo?.();
      if (!info?.composer) return 'could not measure the desktop layout';
      // Thresholds are bracketed by live measurements (2026-08-16): CV6's real desktop
      // spans 48% by this measure (the right-hand drawer is invisible to it), while the
      // shipped phone-column defect measured 39% with nothing beside it. Two ways to pass:
      // panes beside the conversation, or a single pane that is genuinely wide (focus mode).
      const left = Math.min(info.composer.x, info.rail ? info.rail.x : info.composer.x);
      const right = Math.max(info.composer.x + info.composer.width, info.rail ? info.rail.x + info.rail.width : 0);
      const used = Math.round(right - left);
      const ratio = used / info.viewport.width;
      if (info.rail && ratio >= 0.45) return true;
      if (!info.rail && info.composer.width / info.viewport.width >= 0.55) return true;
      return `layout spans ${used}px of ${info.viewport.width} (${Math.round(ratio * 100)}%)${info.rail ? '' : ' with nothing beside it'} — a phone column on a desktop display`;
    },
  },

  // ---------------------------------------------------------------- the backend claim
  {
    id: 'backend.convex-only-messages',
    title: 'Sending and receiving touches Convex and no Supabase message traffic',
    tier: 'core',
    async run(d, ctx) {
      const net = d.beginNetworkCapture?.();
      if (!net) return 'driver cannot observe network traffic';
      await d.typeInComposer(`${ctx.token}-NET`);
      await d.send();
      await d.waitForMessage((m) => (m.text || '').includes(`${ctx.token}-NET`), 20000);
      await d.settle(3000);
      const reqs = await d.endNetworkCapture();

      const offenders = reqs.filter((u) =>
        /supabase-messages/.test(u) ||
        /supabase\.co\/rest\/v1\/messages/.test(u) ||
        /supabase\.co\/realtime.*messages/.test(u));
      const convexHits = reqs.filter((u) => /convex\.(cloud|site)/.test(u));

      if (offenders.length) return `${offenders.length} Supabase message call(s): ${offenders.slice(0, 3).join(', ')}`;
      return convexHits.length > 0 || 'no Convex traffic observed during send/receive';
    },
  },
];

export const byTier = (tier) => CAPABILITIES.filter((c) => c.tier === tier);
export const byId = (id) => CAPABILITIES.find((c) => c.id === id);
