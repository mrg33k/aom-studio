// tests/apns-delivery-actions.test.mjs — corner:native-ios Stage 2
//
// The rule that decides whether a push about a delivered file gets an Approve button.
//
// This is worth its own test because the failure is INVISIBLE in both directions. Emit
// the category too widely and a lock-screen tap records a permanent verdict on
// something that was never waiting for one (approve cannot be undone —
// review-decision.js accepts its undo action for dismiss rows only). Emit it too
// narrowly and the buttons simply never appear, which looks like nothing at all.
//
// Every fixture below is a real row shape read out of Supabase on 2026-08-10.
//
// Run: node tests/apns-delivery-actions.test.mjs

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deliveryForRow, previewForRow, isPushableAssistantRow } from '../api/_lib/apns.js';

// A share-file hand-off that carries BOTH a written finding and one file.
// (message 53894d66-ed19-4b95-81fd-92213efa8c2f)
const singleHandoff = {
  role: 'assistant', agent: 'corner', source: 'auto-share',
  text: "Disk count finished — 15GB of last year's Adobe is the biggest win.",
  metadata: {
    handoff: true,
    source_path: '/Users/x/AOM-EA/corner/users/aom/agents/corner/rooms-2026-08-09.md',
    attachment: {
      url: 'https://rag.aheadofmarket.com/files/aom/rooms-2026-08-09.md',
      name: 'rooms-2026-08-09.md',
      sha256: 'd2c1c11d7a761c633463e4e1574fbad3b973cdf1390c26e35d9bea7abeac089e',
    },
  },
};

// The watcher's own announcement, with no human sentence in it.
// (message 61b37529-4a10-4250-aa04-ace01a69ac77)
const bareAnnouncement = {
  role: 'assistant', agent: 'elon', source: 'auto-share',
  text: 'Attached file: 2026-08-10.jsonl',
  metadata: { attachment: { url: 'https://rag.aheadofmarket.com/files/aom/d1-2026-08-10.jsonl', name: '2026-08-10.jsonl' } },
};

const fourFileDrop = {
  role: 'assistant', agent: 'steffen', source: 'share-file',
  text: 'Attached 4 files: a.png, b.png, c.png, d.png',
  metadata: {
    handoff: true,
    attachments: [
      { url: 'https://x/a.png', name: 'a.png' }, { url: 'https://x/b.png', name: 'b.png' },
      { url: 'https://x/c.png', name: 'c.png' }, { url: 'https://x/d.png', name: 'd.png' },
    ],
  },
};

const ordinaryReply = {
  role: 'assistant', agent: 'rex', source: 'corner-dashboard',
  text: 'Pushed to main, deploy is green.', metadata: {},
};

const usersOwnUpload = {
  role: 'user', user_name: 'Patrik', text: 'Attached file: photo.png',
  metadata: { attachment: { url: 'https://x/photo.png', name: 'photo.png' } },
};

// A hand-off flag with no file behind it. Nothing to approve.
const handoffWithoutAttachment = {
  role: 'assistant', agent: 'corner', source: 'share-file',
  text: 'Sending the summary over.', metadata: { handoff: true },
};

// ── The eligibility rule ────────────────────────────────────────────────────
{
  const d = deliveryForRow(singleHandoff);
  assert.ok(d, 'a single-file agent hand-off is actionable');
  // The deliverable id the review endpoints key on is the attachment URL
  // (api/_lib/fileRef.js: review.id = url). Anything else approves nothing.
  assert.equal(d.url, 'https://rag.aheadofmarket.com/files/aom/rooms-2026-08-09.md');
  assert.equal(d.name, 'rooms-2026-08-09.md');
  // Content identity, so a verdict from the lock screen suppresses a re-share of the
  // same bytes exactly like one taken in the app.
  assert.equal(d.sha256.length, 64);
  assert.ok(d.sourcePath.endsWith('rooms-2026-08-09.md'));
}

// THE ONE THAT MATTERS MOST. A push about a four-file drop carrying one file's id
// would approve the first, silently leave three waiting, and tell the user "Approved".
assert.equal(deliveryForRow(fourFileDrop), null, 'a multi-file delivery gets no one-button verdict');

assert.equal(deliveryForRow(ordinaryReply), null, 'an ordinary reply is not a delivery');
assert.equal(deliveryForRow(handoffWithoutAttachment), null, 'a hand-off with no file is not a delivery');
// Uploads never enter the waiting set server-side (review-queue.js, Patrik 2026-07-13:
// "things agents send me need review — my own uploads don't"), so an Approve button on
// one would record a verdict on something that was never waiting.
assert.equal(deliveryForRow(usersOwnUpload), null, "the user's own upload is never actionable");

// ── The lock-screen body ────────────────────────────────────────────────────
// "Attached file:" is our plumbing, not a sentence anyone says (rule 4).
assert.equal(previewForRow(bareAnnouncement), 'Sent you 2026-08-10.jsonl');
// But a hand-off that says something real keeps what it said.
assert.ok(previewForRow(singleHandoff).startsWith('Disk count finished'));
// And nothing about ordinary replies changed.
assert.equal(previewForRow(ordinaryReply), 'Pushed to main, deploy is green.');
assert.equal(isPushableAssistantRow(ordinaryReply), true);

// Serverless reliability contract: the write path must keep the invocation alive
// until APNs finishes, while still swallowing delivery errors after the row exists.
const writeMessageSource = readFileSync(new URL('../api/_lib/write-message.js', import.meta.url), 'utf8');
assert.match(writeMessageSource, /await notifyDevicesForMessageRow\(/);
assert.doesNotMatch(writeMessageSource, /notifyDevicesForMessageRow\([^\n]+\)\s*\n\s*\.catch/);

// Returning from iOS Settings after granting permission must register without a
// cold launch; this was the missing path behind an empty device_tokens table.
const rootViewSource = readFileSync(new URL('../ios-native/Corner/Views/RootView.swift', import.meta.url), 'utf8');
assert.match(rootViewSource, /phase == \.active[\s\S]*refreshAuthorizationAndRegisterIfAllowed\(\)/);
assert.match(rootViewSource, /phase == \.active[\s\S]*registerCurrentTokenIfAny\(\)/);

console.log('apns-delivery-actions: all assertions passed');
