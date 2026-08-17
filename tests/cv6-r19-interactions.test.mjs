import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  fallbackRoomColor,
  isActiveRoomStatus,
  normalizeRoomInitials,
  resolveRoomIdentity,
  roomIdentityKey,
} from '../src/dashboard/cv6next/data/roomIdentity.js';
import { gestureStartsOnInteractiveControl } from '../src/dashboard/cv6next/useChatSwipe.js';

const avatar = readFileSync(new URL('../src/dashboard/cv6next/RoomAvatar.jsx', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../src/dashboard/cv6next/AvatarIdentityDialog.jsx', import.meta.url), 'utf8');
const checklist = readFileSync(new URL('../src/dashboard/cv6next/RoomChecklistPanel.jsx', import.meta.url), 'utf8');
const stickToBottom = readFileSync(new URL('../src/dashboard/cv6next/useStickToBottom.js', import.meta.url), 'utf8');
const css = [
  'cv6-base.css', 'cv6-nav.css', 'cv6-home.css', 'cv6-chat.css',
  'cv6-files.css', 'cv6-room-settings.css', 'cv6-screens.css',
].map((file) => readFileSync(new URL(`../src/dashboard/cv6next/${file}`, import.meta.url), 'utf8')).join('\n');

test('room identities stay scoped, colorful, and accept two custom initials', () => {
  const room = { id: 'design', name: 'Design Room', initials: 'DR' };
  assert.equal(roomIdentityKey(room), 'agent:design');
  assert.match(fallbackRoomColor(room), /^#[0-9A-F]{6}$/);
  assert.equal(normalizeRoomInitials(' d!x '), 'DX');
  assert.deepEqual(resolveRoomIdentity(room, {
    'agent:design': { initials: 'UI', color: '#BE185D', image: 'data:image/jpeg;base64,abc' },
  }), { initials: 'UI', color: '#BE185D', image: 'data:image/jpeg;base64,abc' });
});

test('presence appears only for genuinely active room states', () => {
  const now = new Date().toISOString();
  for (const status of ['active', 'online', 'live', 'working', 'running', 'building']) assert.equal(isActiveRoomStatus(status, now), true);
  for (const status of ['', 'ready', 'idle', 'done', 'blocked']) assert.equal(isActiveRoomStatus(status), false);
  assert.equal(isActiveRoomStatus('working'), false, 'status without a freshness timestamp is stale by construction');
  assert.match(avatar, /active \? <i className="cv6-room-presence"/);
  assert.match(css, /\.sdot\.is-ready,[\s\S]*?\.sdot\.is-idle \{ display:none; \}/);
});

test('avatar editing persists color, initials, and a prepared picture', () => {
  assert.match(editor, /accept="image\/\*"/);
  assert.match(editor, /canvas\.toDataURL\('image\/jpeg', 0\.82\)/);
  assert.match(editor, /onSave\?\.\(draft\)/);
  assert.match(editor, /Saved on this device\. Workspace sync is unavailable\./);
});

test('chat swipe yields to checklist, avatar, keyboard, and touch controls', () => {
  const target = { nodeType: 1, closest: (selector) => selector.includes('button') ? {} : null };
  assert.equal(gestureStartsOnInteractiveControl(target), true);
  assert.match(checklist, /data-cv6-gesture-lock=""/);
  assert.match(checklist, /aria-keyshortcuts="Enter Control\+Enter Meta\+Enter Escape"/);
  assert.match(checklist, /role="progressbar"/);
});

test('compact desktop controls retain hit slop while mobile controls own a real 44px box', () => {
  assert.match(css, /\.cv6-chat-header-button \{ width:34px; min-width:34px; height:34px;/);
  assert.match(css, /cv6-composer-primary[\s\S]*?height:38px !important/);
  assert.match(css, /cv6-composer-attach\)::before[\s\S]*?inset:-5px -4px/);
  assert.match(css, /@media \(max-width:899px\)[\s\S]*?button\.cv6-composer-util \{ height:44px !important;[\s\S]*?button\.cv6-composer-primary \{ width:48px !important; height:48px !important;[\s\S]*?button\.cv6-composer-attach \{ width:44px !important; height:44px !important;/);
  assert.match(css, /@media \(max-width:640px\)[\s\S]*?\.cv6-room-avatar-button \{ width:44px !important; height:44px !important;/);
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*?transition-duration:\.001ms !important/);
});

test('mobile room scroll continuity captures the live node before route teardown', () => {
  assert.match(stickToBottom, /useLayoutEffect\(\(\) => \{/);
  assert.match(stickToBottom, /const roomScroller = scrollRef\.current/);
  assert.match(stickToBottom, /if \(!restorePendingRef\.current\) writeRoomScrollPosition\(roomKey, roomScroller\)/);
  assert.match(stickToBottom, /if \(!el \|\| restorePendingRef\.current\) return/);
  assert.match(stickToBottom, /restorePendingRef\.current = false/);
  assert.doesNotMatch(stickToBottom, /useEffect\(\(\) => \(\) => writeRoomScrollPosition\(roomKey, scrollRef\.current\)/);
});
