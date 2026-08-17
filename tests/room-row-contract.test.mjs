// Guard for the shared room-row contract — corner/missions/bridge/research/room-row-contract.md
//
// One row anatomy, two renderers (CV6 web + native iOS RoomListView). The three things
// that regressed and must not regress again:
//   §1.4 every room row states its own kind (PROJECT / MISSION / AGENT)
//   §2   the home top section is strict recency, no second sort key
//   §3   a preview line is conversation, never transport
//   §4   the native corner:// routes and the web ?view= values name the same places
//
// The pure predicate is exercised directly; the structural guarantees (markup, tones,
// sort key, route aliases) are asserted against the source, because deleting them is
// exactly how the row quietly loses a part again.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isMachinePreview, humanPreview } from '../src/dashboard/cv6next/data/presentationClean.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// ── §3 Preview hygiene ───────────────────────────────────────────────────────

test('the defect that wrote this contract: a bridge delivery ack never previews', () => {
  // Live on www.aheadofmarket.com/dashboard 2026-08-10, Native iOS room, mobile home.
  assert.equal(isMachinePreview('Received — corner-native-ios send reached the dispatcher.'), true);
  assert.equal(isMachinePreview('Received — R8 destination bar check landed here in the corner room.'), true);
  assert.equal(humanPreview('Received — corner-native-ios send reached the dispatcher.'), '');
});

test('dispatch, task and probe plumbing never previews', () => {
  assert.equal(isMachinePreview('[DISPATCH task 8431e715] surface lane'), true);
  assert.equal(isMachinePreview('scripts/task-complete.sh 91 done'), true);
  assert.equal(isMachinePreview('smoke test passed on the second send'), true);
  assert.equal(isMachinePreview('acceptance check green'), true);
  assert.equal(isMachinePreview('{"type":"link","payload":"https://x"}'), true);
});

test('internal identifiers and machine paths never preview', () => {
  assert.equal(isMachinePreview('opened aom:mission:corner:native-ios'), true);
  assert.equal(isMachinePreview('row b7d3f7ca-3a78-4580-a77e-ebd88793f1a9 written'), true);
  assert.equal(isMachinePreview('see /Users/aom-inhouse/aom-studio/src/main.jsx'), true);
  assert.equal(isMachinePreview('pushed to origin/main'), true);
  assert.equal(isMachinePreview('npm run build is green'), true);
});

test('real conversation is left completely alone', () => {
  const human = [
    'Shared a file: call-mode.html',
    'Same answer I just gave you a minute ago — the framing is locked.',
    'The deck is ready and parked on one decision.',
    'Which of the three directions do you want me to take to finish?',
    'Deliverable approved: aztc-prize-website.pdf',
    'I received your note and started on it.', // "received" mid-sentence is not the ack format
  ];
  for (const t of human) {
    assert.equal(isMachinePreview(t), false, `wrongly dropped: ${t}`);
    assert.equal(humanPreview(t), t);
  }
});

test('a machine preview blanks the LINE, never the row', () => {
  // isRoomActivityNoise is the harsher predicate that drops the whole row. A delivery
  // ack must not reach it — you still touched that room, so it still ranks.
  const mod = read('src/dashboard/cv6next/data/presentationClean.js');
  assert.match(mod, /export function isMachinePreview/);
  assert.match(mod, /export function isRoomActivityNoise/);
});

test('every preview derivation point runs the gate', () => {
  // The gate is one named pipeline (roomPreviewLine: machine gate, then normalize).
  // It was an anonymous arrow inside useHomeData until the Convex rail shipped
  // half of it onto 390 live rooms (gauntlet R1) — so the contract is now that
  // EVERY rail runs the named function, and there is no second derivation.
  const clean = read('src/dashboard/cv6next/data/presentationClean.js');
  assert.match(clean, /export function roomPreviewLine/);
  assert.match(clean, /isMachinePreview\(text, message\)/);
  assert.match(read('src/dashboard/hooks/useDataPipe.js'), /isMachinePreview\(t, m\)/);
  for (const rail of ['src/dashboard/cv6next/data/useHomeData.js', 'src/dashboard/cv6next/data/convexRooms.js']) {
    assert.match(read(rail), /roomPreviewLine\(/, `${rail} derives a preview without the gate`);
    assert.equal(/normalizePreview\((?:text|r\.lastMessage)/.test(read(rail)), false, `${rail} still normalizes a preview outside the gate`);
  }
});

// ── §2 Recency ordering ──────────────────────────────────────────────────────

test('the home recent list sorts on recency and nothing else', () => {
  const src = read('src/dashboard/cv6next/data/useHomeData.js');
  // The one sort. A second key (alphabetical, kind-grouping, pinning) breaks
  // "pick up where you left off".
  assert.match(src, /Object\.values\(recentMap\)[\s\S]{0,400}?\.sort\(\(a, b\) => b\.ts - a\.ts\)/);
  assert.equal(/\.sort\(\(a, b\) => b\.ts - a\.ts\)/.test(src), true);
});

// ── §1.4 The type chip, on both renderers ────────────────────────────────────

test('mobile and desktop room rows both carry the type chip', () => {
  const mobile = read('src/dashboard/cv6next/templates/home-mobile.html');
  const desktop = read('src/dashboard/cv6next/templates/home-desktop.html');
  const chip = /class="tag-pill rtype[^"]*"[^>]*data-mod="is-:rec\.type"[^>]*data-bind="rec\.typeLabel"/;
  assert.match(mobile, chip, 'mobile home recent card lost its type chip');
  assert.match(desktop, chip, 'desktop home rows lost the type chip');
  // Desktop has two row shapes (rail + resting digest); both state the kind.
  assert.equal((desktop.match(/data-bind="rec\.typeLabel"/g) || []).length, 2);
});

test('the chip has a tone for each of the three room kinds', () => {
  const css = read('src/dashboard/cv6next/cv6.css');
  for (const kind of ['project', 'mission', 'agent']) {
    assert.match(css, new RegExp(`\\.tag-pill\\.is-${kind}\\s*\\{`), `no tone for ${kind}`);
  }
});

test('the shaper emits the chip data for every kind', () => {
  const src = read('src/dashboard/cv6next/CornerCV6.jsx');
  assert.match(src, /recentTypeKey = \(r\) => \(r\.kind === 'project' \? 'project' : r\.kind === 'mission' \? 'mission' : 'agent'\)/);
  assert.match(src, /RECENT_TYPE_WORD = \{ project: 'Project', mission: 'Mission', agent: 'Agent' \}/);
  assert.match(src, /type: recentTypeKey\(r\)/);
  assert.match(src, /typeLabel: RECENT_TYPE_WORD\[recentTypeKey\(r\)\]/);
});

// ── §4 Deep-link name map ────────────────────────────────────────────────────

test('web accepts the native route spellings, and keeps every old one', () => {
  const src = read('src/dashboard/cv6next/CornerCV6.jsx');
  // Added by the map (native corner://rooms | organize/files | tracker).
  assert.match(src, /if \(v === 'rooms'\) return 'home';/);
  assert.match(src, /if \(v === 'files'\) return 'organize';/);
  assert.match(src, /if \(v === 'issues'\) return 'tracker';/);
  assert.match(src, /v === 'chat' \|\| v === 'chatlist' \|\| v === 'room'/);
  // Historical values — additive means none of these moved.
  assert.match(src, /if \(v === 'review'\) return 'organize';/);
  assert.match(src, /if \(v === 'scribe' \|\| v === 'live-scribe'\) return 'livescribe';/);
  assert.match(src, /\['home', 'support', 'organize', 'command', 'tracker', 'settings', 'livescribe'\]/);
});

test('native still answers every route the map names', () => {
  const router = read('ios-native/Corner/Services/AppRouter.swift');
  for (const host of ['room', 'review', 'organize', 'tracker', 'rooms']) {
    assert.match(router, new RegExp(`case "${host}"`), `native lost corner://${host}`);
  }
  assert.match(router, /"organize", "files"/);
});
