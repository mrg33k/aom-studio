// Gauntlet R27 — the web client must ask Convex for person-specific truth.
// These source contracts guard the integration boundary; MessageRow behavior is
// exercised by native XCTest and the production builds compile both clients.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('rail, send, and read receipt use one signed-in identity bridge', () => {
  const identity = read('src/dashboard/cv6next/data/convexIdentity.js');
  const rail = read('src/dashboard/cv6next/data/convexRooms.js');
  const thread = read('src/dashboard/cv6next/data/useRoomThread.js');

  assert.match(identity, /supabase\.auth\.getSession\(\)/);
  assert.match(identity, /userEmail:/);
  assert.match(rail, /rooms:listRooms'[\s\S]{0,120}userId/);
  assert.match(thread, /reads:markRead/);
  assert.doesNotMatch(thread, /rooms:markRead/);
  assert.match(thread, /messages:send'[\s\S]{0,320}userEmail:/);
  assert.match(thread, /messages:send'[\s\S]{0,320}userName:/);
});

test('null unread values do not falsely advertise read-state support', () => {
  const rail = read('src/dashboard/cv6next/data/convexRooms.js');
  assert.match(rail, /typeof r\.unreadCount === 'number'/);
  assert.doesNotMatch(rail, /r\.unreadCount !== undefined/);
});

test('duplicate thread rows keep the longer payload', () => {
  const thread = read('src/dashboard/cv6next/data/useRoomThread.js');
  assert.match(thread, /mapped\.text\.length > rows\[existingIndex\]\.text\.length/);
});

test('native source decodes Convex authorship and restored source time', () => {
  const row = read('ios-native/Corner/Models/MessageRow.swift');
  const rooms = read('ios-native/Corner/Services/RoomStore.swift');
  const reads = read('ios-native/Corner/Services/ReadStateStore.swift');

  assert.match(row, /case convexAgentSlug = "agentSlug"/);
  assert.match(row, /case convexCreatedAt = "createdAt"/);
  assert.match(row, /convexCreatedAt \?\? convexMS/);
  assert.match(rooms, /rooms:listRooms/);
  assert.match(rooms, /args\["userId"\] = email/);
  assert.match(reads, /reads:markRead/);
  assert.doesNotMatch(reads, /rooms:markRead/);
});

test('first-glance experience carries structure, attribution, unread, and the New boundary', () => {
  const shell = read('src/dashboard/cv6next/CornerCV6.jsx');
  const rooms = read('src/dashboard/cv6next/data/convexRooms.js');
  const desktop = read('src/dashboard/cv6next/templates/home-desktop.html');
  const mobile = read('src/dashboard/cv6next/templates/home-mobile.html');
  const lifecycle = read('src/dashboard/cv6next/ChatLifecycle.jsx');
  const thread = read('src/dashboard/cv6next/MessageThread.jsx');

  assert.match(shell, /const HOME_LOADING_HTML = `[\s\S]*cv6-home-skeleton-rail[\s\S]*cv6-home-skeleton-main/,
    'Home loading must preserve the directory and work-surface geometry');
  assert.match(rooms, /const author = !preview \? '' : \(r\.lastMessage\?\.agentSlug \? titleForAgent/,
    'recent rooms must derive an honest last-message author');
  assert.match(rooms, /roomObj: \{[^}]*unreadCount/,
    'the unread count must survive the rail-to-room navigation seam');
  for (const template of [desktop, mobile]) {
    assert.match(template, /data-bind="rec\.author"/);
    assert.match(template, /class="cv6-unread-count"[^>]*data-bind="rec\.unreadCount"/);
  }
  assert.match(lifecycle, /threadMessages\[Math\.max\(0, threadMessages\.length - count\)\]/,
    'the New boundary must come from ordered messages plus server unread count');
  assert.match(thread, /className="cv6-new-divider" role="separator" aria-label="New messages"/);
  assert.match(lifecycle, />\s*Jump to latest\s*</);
});

test('the transcript has one author treatment, full-size text, and readable day history', () => {
  const lifecycle = read('src/dashboard/cv6next/ChatLifecycle.jsx');
  const thread = read('src/dashboard/cv6next/MessageThread.jsx');
  const chatCss = read('src/dashboard/cv6next/cv6-chat.css');

  assert.doesNotMatch(thread, /showHandoff|handoff-\$\{i\}/,
    'agent identity must not repeat in a handoff rule immediately above its bubble');
  assert.doesNotMatch(thread, /Show more|is-clamped/,
    'ordinary chat text must render in full without a per-message disclosure tap');
  assert.match(thread, /fontSize: 15\.5/,
    'message body text must meet the 15–16px reading floor');
  assert.match(chatCss, /\.cv6-mobile-turn-avatar \{ display:flex; \}/,
    'agent avatars must remain visible');
  assert.match(lifecycle, /groups\.map\(\(group, index\) =>/,
    'every day must render as readable history instead of a collapsed summary');
  assert.match(chatCss, /\.daydiv \{ position:sticky;/,
    'day markers must survive transcript scrolling');
});

test('native returns to the room and keeps the transcript and composer readable', () => {
  const router = read('ios-native/Corner/Services/AppRouter.swift');
  const root = read('ios-native/Corner/Views/RootView.swift');
  const chat = read('ios-native/Corner/Views/ChatView.swift');
  const bubble = read('ios-native/Corner/Views/MessageBubbleView.swift');

  assert.match(router, /func restoreLastRoom\(for world: String\?\)/);
  assert.match(router, /room\.world == world/,
    'restored navigation must never cross the signed-in tenant');
  assert.match(root, /router\.restoreLastRoom\(for: api\.world\)/);
  assert.match(chat, /toolbarBackground\(Theme\.ground, for: \.navigationBar\)/,
    'the transcript must not bleed through a transparent navigation header');
  assert.match(chat, /private func opensDay\(/);
  assert.match(chat, /private func opensUnread\(/);
  assert.match(chat, /UserDefaults\.standard\.set\(new, forKey: draftStorageKey\)/);
  assert.doesNotMatch(chat, /composerCollapsed|scheduleCollapse/,
    'sending must not replace the primary composer with a pencil button');
  assert.doesNotMatch(bubble, /clampThreshold|naturalProseHeight|Show more/,
    'native message prose must render in full');
});

test('native unread truth reaches the room rail and app icon without global clears', () => {
  const rooms = read('ios-native/Corner/Services/RoomStore.swift');
  const push = read('ios-native/Corner/Services/PushService.swift');
  const root = read('ios-native/Corner/Views/RootView.swift');
  const chat = read('ios-native/Corner/Views/ChatView.swift');
  const rail = read('ios-native/Corner/Views/RoomListView.swift');

  assert.match(rooms, /let hasUnread: Bool\?/);
  assert.match(rooms, /PushService\.shared\.reconcileUnread\(recent\)/);
  assert.match(push, /func reconcileUnread\(_ rooms: \[RoomStore\.RecentRoom\]\)/);
  assert.match(push, /func markRoomRead\(_ roomID: String\)/);
  assert.match(push, /@Published private\(set\) var badgeCount = 0/);
  assert.doesNotMatch(root, /push\.clearBadge\(\)/,
    'foregrounding the app must not erase unread state for every room');
  assert.match(chat, /PushService\.shared\.markRoomRead\(model\.room\.roomID\)/);
  assert.match(rail, /if locallyRead \{ return false \}/,
    'a device receipt must suppress a stale server count immediately');
  assert.match(rail, /entry\.author\.isEmpty \? entry\.preview/);
  assert.match(rail, /Text\(room\.typeLabel\)/);
});

test('web drafts survive navigation and mobile renders one active viewport', () => {
  const lifecycle = read('src/dashboard/cv6next/ChatLifecycle.jsx');
  const fullComposer = read('src/dashboard/cv6next/Cv6FullComposer.jsx');
  const desktop = read('src/dashboard/cv6next/ChatDesktop.jsx');
  const shell = read('src/dashboard/cv6next/CornerCV6.jsx');
  const navCss = read('src/dashboard/cv6next/cv6-nav.css');

  assert.match(lifecycle, /localStorage\.setItem\(key, value\)/);
  assert.match(fullComposer, /localStorage\.setItem\(draftStorageKey, input\)/);
  for (const source of [lifecycle, desktop]) {
    assert.doesNotMatch(source, /composerCollapsed|sendAndCollapse|cv6-chat-fab/,
      'the primary composer must remain present after send');
  }
  assert.match(shell, /data-column-active=\{activeColumnId === column\.id \? '1'/);
  assert.match(navCss, /\.cv6-workspace-column\[data-column-active="1"\] \{ display:flex; \}/);
  assert.match(navCss, /\.cv6-workspace-canvas:not\(\[data-column-count="0"\]\) \.cv6-workspace-base,[\s\S]{0,90}\.cv6-workspace-column \{ display:none; \}/,
    'inactive mobile surfaces must not double the layout width');
  assert.match(navCss, /@media \(min-width:900px\)[\s\S]{0,500}\.cv6-workspace-column \{ display:none; \}[\s\S]{0,220}\.cv6-workspace-column\[data-column-active="1"\]/,
    'desktop must retain mounted room state without laying conversations side by side');
  assert.match(navCss, /@media \(min-width:900px\)[\s\S]{0,260}\.cv6-workspace-canvas \{ overflow:hidden; \}/,
    'desktop room switching must not create a horizontal page');
});

test('same-named mission rooms show the parent project on web and native', () => {
  const shell = read('src/dashboard/cv6next/CornerCV6.jsx');
  const nativeRail = read('ios-native/Corner/Views/RoomListView.swift');

  assert.match(shell, /r\.kind === 'mission' && r\.sub[\s\S]{0,100}`\$\{r\.sub\} · Mission`/,
    'a mission chip must disambiguate identical leaf names with their project');
  assert.match(nativeRail, /if case \.mission = room\.kind, !room\.subtitle\.isEmpty/,
    'native mission rows must expose the same parent-project context');
  assert.match(shell, /activeRoomColumnId === `chat:\$\{roomColumnKey\(recentRoomObj\(r\)\)\}`/,
    'the rail selection must follow the real routed room, including reload and browser Back');
});

test('desktop room switching is keyboard complete and archive is discoverable', () => {
  const search = read('src/dashboard/cv6next/Search.jsx');
  const swipe = read('src/dashboard/cv6next/useRoomSwipeArchive.js');
  const homeCss = read('src/dashboard/cv6next/cv6-home.css');
  const homeData = read('src/dashboard/cv6next/data/useHomeData.js');

  assert.match(search, /role="combobox"/);
  assert.match(search, /aria-activedescendant=/);
  assert.match(search, /role="listbox"/);
  assert.match(search, /role="option" aria-selected=/);
  assert.match(search, /e\.key === 'ArrowDown'/);
  assert.match(search, /pick\(flatResults\[selectedIndex\]\)/,
    'Enter must open the active result, not a hard-wired first result');
  assert.match(swipe, /className = 'cv6-desktop-archive-btn'/);
  assert.match(swipe, /await doArchive\(target, null\)/,
    'the desktop affordance must reuse the recoverable archive driver');
  assert.match(homeCss, /\.cv6-desktop-archive-btn/);
  assert.match(homeData, /export function useChatList\(\)[\s\S]*const convexRail = useConvexRail\(worldId\)/,
    'the command palette and room directory must search the same Convex room plane as Home');
});

test('reply context connects the visible message, composer, and both write planes', () => {
  const lifecycle = read('src/dashboard/cv6next/ChatLifecycle.jsx');
  const thread = read('src/dashboard/cv6next/MessageThread.jsx');
  const actions = read('src/dashboard/cv6next/MessageReactions.jsx');
  const composer = read('src/dashboard/cv6next/Cv6FullComposer.jsx');
  const input = read('src/dashboard/cv6next/Cv6InputBar.jsx');
  const data = read('src/dashboard/cv6next/data/useRoomThread.js');
  const endpoint = read('api/dashboard/supabase-messages.js');

  assert.match(actions, /aria-label={`Reply to message from \$\{replyTarget\.label\}`}/);
  assert.match(thread, /data-testid="cv6-reply-quote"/,
    'a stored parent must render as useful quoted context after reload');
  assert.match(lifecycle, /onReply=\{setReplyTo\}/);
  assert.match(lifecycle, /replyTo=\{replyTo\} onReplyToChange=\{setReplyTo\}/);
  assert.match(input, /data-test-id="reply-to-chip"/);
  assert.match(input, /aria-label="Cancel reply"/);
  assert.match(composer, /sendOpts\.replyTo = String\(replySnap\.id\)/);
  assert.match(composer, /if \(ok !== false\) \{ acceptIfRouted\(\); setReplyTo\(null\)/,
    'failed sends must retain the reply target');
  assert.match(data, /payload\.reply_to = String\(options\.replyTo\)/);
  assert.match(data, /\{ replyTo: String\(options\.replyTo\) \}/,
    'Convex writes must carry the same parent as Supabase writes');
  assert.match(endpoint, /replyTo: reply_to/);
});

test('cold start is one product-shaped paint and returns to the last room', () => {
  const html = read('index.html');
  const main = read('src/main.jsx');
  const shell = read('src/dashboard/cv6next/CornerCV6.jsx');
  const nativeRail = read('ios-native/Corner/Views/RoomListView.swift');

  assert.match(html, /id="cv6-boot-loader"[\s\S]*class="cv6-boot-workspace"/,
    'the earliest HTML paint must show dashboard geometry, not a centered logo');
  assert.match(html, /cv6-boot-rail[\s\S]*cv6-boot-main/);
  assert.match(main, /window\.location\.pathname\.startsWith\('\/dashboard'\)\) loadCornerCV6\(\)/,
    'the dashboard graph must load in parallel with the auth check');
  assert.match(main, /if \(!checked\) \{[\s\S]{0,80}return <DashboardBootSkeleton/);
  assert.match(shell, /localStorage\.getItem\('cv6\.lastRoom'\)/);
  assert.match(shell, /window\.history\.replaceState\(\{ restoredRoom:/,
    'a validated cold-start room must own a canonical, reloadable URL');
  assert.doesNotMatch(nativeRail, /ProgressView\(\)\.controlSize\(\.small\)[\s\S]{0,100}Loading your rooms/,
    'native cold load must hold room-shaped geometry instead of adding a spinner phase');
  assert.match(nativeRail, /accessibilityLabel\("Loading recent rooms"\)/);
});

test('empty, first-load failure, and stale refresh are distinct recoverable states', () => {
  const rail = read('src/dashboard/cv6next/data/convexRooms.js');
  const homeData = read('src/dashboard/cv6next/data/useHomeData.js');
  const home = read('src/dashboard/cv6next/CornerCV6.jsx');
  const thread = read('src/dashboard/cv6next/data/useRoomThread.js');

  assert.match(rail, /hasOfflineCopy \? 'refreshing' : 'loading'/);
  assert.match(rail, /\{ status: 'stale', shaped: store\.shaped, worldId \}/,
    'a refresh failure must preserve the last verified room directory');
  assert.match(homeData, /convexRail\.status === 'error' \? 'error' : 'loading'/,
    'a first-load failure must never be presented as an honestly empty account');
  assert.match(home, /Rooms not syncing/);
  assert.match(home, /Couldn&apos;t load your rooms|Couldn't load your rooms/);
  assert.match(thread, /if \(this\.state\.status === 'loading'\) this\.commit\(\{ status: 'error' \}\)/,
    'a failed first thread load must render the thread error rather than an empty conversation');
  assert.match(thread, /this\.updateConnection\(\{ feed: 'stale' \}\)/,
    'later thread failures must keep cached messages and expose stale feed health');
});

test('keyboard help, unread traversal, and thread focus are complete and discoverable', () => {
  const shell = read('src/dashboard/cv6next/CornerCV6.jsx');
  const overlay = read('src/dashboard/cv6next/KeyboardShortcutsOverlay.jsx');
  const nav = read('src/dashboard/cv6next/SharedNav.jsx');
  const thread = read('src/dashboard/cv6next/MessageThread.jsx');
  const actions = read('src/dashboard/cv6next/MessageReactions.jsx');
  const homeData = read('src/dashboard/cv6next/data/useHomeData.js');

  assert.match(shell, /e\.altKey && e\.shiftKey[\s\S]{0,160}ArrowDown[\s\S]{0,80}ArrowUp/);
  assert.match(shell, /roomRegistry\.data\?\.recent[\s\S]{0,160}Number\(item\?\.needsCount\) > 0/,
    'unread traversal must consume server truth instead of inventing recency state');
  assert.match(shell, /e\.key\.toLowerCase\(\) === 't'[\s\S]{0,500}cv6-message-reply-btn/);
  assert.match(shell, /e\.key\.toLowerCase\(\) === 'm'[\s\S]{0,220}focusComposer\(\)/,
    'the explicit composer shortcut must target the active room');
  assert.match(shell, /e\.key\.length === 1[\s\S]{0,180}focusComposer\(e\.key\)/,
    'typing from inert transcript space must preserve the first character');
  assert.match(shell, /const interactive = focused\?\.closest\?\.\('button, a,/);
  assert.match(shell, /e\.key\.length === 1[\s\S]{0,240}&& !interactive/,
    'printable-key handoff must not steal activation keys from controls');
  assert.match(homeData, /recent: recentRows/,
    'the shell must receive exact Convex room handles for mission/project/direct unread rows');
  assert.match(overlay, /Previous unread room/);
  assert.match(overlay, /Focus the latest message thread/);
  assert.match(overlay, /Jump to the message composer/);
  assert.match(overlay, /Start typing from the conversation/);
  assert.match(nav, /aria-label="Keyboard shortcuts"/);
  assert.match(actions, /aria-keyshortcuts="Shift\+T"/);
});

test('rich files survive the Convex write/read seam and dead legacy cards stay honest', () => {
  const data = read('src/dashboard/cv6next/data/useRoomThread.js');
  const lifecycle = read('src/dashboard/cv6next/ChatLifecycle.jsx');
  const row = read('ios-native/Corner/Models/MessageRow.swift');
  const nativeThread = read('ios-native/Corner/Views/ChatViewModel.swift');

  assert.match(data, /Array\.isArray\(m\.attachments\)[\s\S]{0,100}attachments: m\.attachments/,
    'Convex direct attachments must re-enter the shared message projection');
  assert.match(data, /messages:send'[\s\S]{0,360}metadata: mergedMeta/,
    'web sends must not drop their structured metadata at the Convex mutation');
  assert.match(nativeThread, /sendMessage\(roomId: String, text: String, attachments: \[Attachment\]/);
  assert.match(nativeThread, /metadata\["attachments"\] = attachments\.map/);
  assert.match(row, /case convexAttachments = "attachments"/);
  assert.match(row, /merged\["attachments"\] = \.array\(convexAttachments\)/);
  assert.match(lifecycle, /Original preview unavailable/);
  assert.match(lifecycle, /onReview\(usableFiles\)/,
    'Review must receive only files the viewer can actually open');
});

test('message actions overlay without reflow and reactions use the active data plane', () => {
  const actions = read('src/dashboard/cv6next/MessageReactions.jsx');
  const thread = read('src/dashboard/cv6next/MessageThread.jsx');
  const data = read('src/dashboard/cv6next/data/useRoomThread.js');
  const css = read('src/dashboard/cv6next/cv6-chat.css');

  assert.match(actions, /role="toolbar" aria-label="Message actions"/);
  for (const label of ['Add reaction', 'Copy message', 'More message actions']) {
    assert.match(actions, new RegExp(`aria-label="${label}"`));
  }
  assert.match(actions, /convexMutation\('messages:toggleReaction'/,
    'the default Convex product must not send reactions to the legacy endpoint');
  assert.match(thread, /MessageReactions[\s\S]{0,120}onReply=\{onReply\}/,
    'reply must live in the same action shelf as every other message action');
  assert.match(data, /Array\.isArray\(m\.reactions\)[\s\S]{0,100}reactions: m\.reactions/);
  assert.match(data, /reactions: Array\.isArray\(m\.metadata\?\.reactions\)/);
  assert.match(css, /\.cv6-message-actions\{position:absolute/,
    'desktop actions must overlay instead of adding message height');
  assert.match(css, /\.cv6-message-turn-shell:hover \.cv6-message-actions/);
});

test('desktop threads stay beside the room and expose their real reply context', () => {
  const lifecycle = read('src/dashboard/cv6next/ChatLifecycle.jsx');
  const thread = read('src/dashboard/cv6next/MessageThread.jsx');
  const css = read('src/dashboard/cv6next/cv6-chat.css');

  assert.match(lifecycle, /const threadIndex = useMemo/);
  assert.match(lifecycle, /message\?\.replyTo \|\| message\?\.replyPreview\?\.message_id/);
  assert.match(lifecycle, /<aside className="cv6-thread-panel" role="complementary"/);
  assert.match(lifecycle, /Cv6MessageThread messages=\{\[threadParentMessage\]\}/,
    'the parent must remain pinned as a real message, not a detached text quote');
  assert.match(lifecycle, /event\.key !== 'Escape'[\s\S]{0,100}closeThread\(\)/);
  assert.match(thread, /className="cv6-thread-summary"/);
  assert.match(thread, /participants\.slice\(0, 3\)/);
  assert.match(thread, /Last reply \$\{latest\.time\}/);
  assert.match(thread, /repliesByParentOverride \|\| localRepliesByParent/,
    'day boundaries must not hide a reply from its parent summary');
  assert.match(css, /\.cv6-thread-panel\{position:absolute/);
  assert.match(css, /\.cv6-thread-parent\{position:sticky/);
  assert.match(css, /\[data-thread-open="1"\]>.scrbody\{margin-right:/,
    'opening a thread must keep the room transcript visible beside it');
});
