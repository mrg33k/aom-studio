// routedHere — the handoff between "the front door chose a room for you" and the room
// itself, so the room can say so and offer to move the message.
//
// corner:front-door R8 (2026-07-25). The router auto-opens a room whenever it claims
// confidence >= 0.85. On a 74-message replay of Patrik's own history it reports ~0.9 almost
// regardless of how thin its reasoning is, so that bar gates very little: roughly one in five
// sends still lands somewhere he did not mean, and lands there SILENTLY. Tightening the
// number was tried and barely moved it — a model's self-reported confidence is not a
// measurement. So the fix is not a better guess, it is telling the user what was guessed.
//
// Deliberately NOT React state: the composer writes this on the Home screen and the room
// reads it after navigating, which unmounts everything between them. localStorage survives
// that (and a reload, which is when someone comes back and asks "wait, where did that go").
//
// Only ever written for an AUTOMATIC route. A room the user picked themselves needs no
// second-guessing, and a bar that appears when you already chose reads as noise.

import { authFetch } from '../../lib/authFetch';

const KEY = 'cv6.routedHere';
// A correction is something you make right after sending. Past this the room has moved on
// and retracting the message would be more surprising than leaving it.
export const ROUTED_HERE_TTL_MS = 15 * 60 * 1000;

const bare = (s) => (String(s || '').includes(':') ? String(s).split(':').pop() : String(s || ''));

// Stable identity for a room across the composer's target shape and the chat's own room
// object. Mission first, then project, then a 1:1 agent thread — the same precedence
// deriveRoomId uses server-side, so the two can never disagree about which room this is.
export function roomKeyOf(room) {
  if (!room) return '';
  if (room.isMission) return `m:${room.projectSlug || ''}:${bare(room.missionSlug || room.id)}`;
  if (room.isProject) return `p:${room.id || room.projectSlug || ''}`;
  return `a:${room.id || room.agent || ''}`;
}

// The room opens BEFORE the message is posted (that is what makes the send feel instant),
// so the record cannot exist yet when the room first mounts and reads it. Without a signal
// the bar reads null, has no reason to look again, and never appears at all. Verified live:
// the record was written correctly and the bar stayed out of the DOM.
export const ROUTED_HERE_EVENT = 'cv6:routed-here';

export function recordRoutedHere({ room, messageId, text, worldId, confidence, reasoning, interactionMode }) {
  if (!room || !messageId) return;   // without the row id the move has nothing to retract
  try {
    localStorage.setItem(KEY, JSON.stringify({
      roomKey: roomKeyOf(room),
      roomName: room.name || '',
      worldId: worldId || '',
      messageId,
      text: String(text || '').slice(0, 2000),
      confidence: Number(confidence) || 0,
      reasoning: String(reasoning || '').slice(0, 240),
      interactionMode: interactionMode === 'plan' ? 'plan' : 'work',
      at: Date.now(),
    }));
    try { window.dispatchEvent(new CustomEvent(ROUTED_HERE_EVENT)); } catch { /* no window */ }
 } catch { /* private mode, the bar just won't show */ }
}

// Returns the record only if it is for THIS room, this world, and still fresh. Anything
// else is stale and is cleared on read so it can never surface in an unrelated room later.
export function readRoutedHere(room, worldId) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec?.roomKey || !rec?.messageId) return null;
    if (Date.now() - (rec.at || 0) > ROUTED_HERE_TTL_MS) { clearRoutedHere(); return null; }
    if (worldId && rec.worldId && rec.worldId !== worldId) return null;
    if (rec.roomKey !== roomKeyOf(room)) return null;
    return rec;
  } catch { return null; }
}

export function clearRoutedHere() {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
}

// Accept the route DURABLY, then forget the local record.
//
// corner:front-door R11. Until now "Got it" was clearRoutedHere() alone — the acceptance
// existed for as long as the tab did and never reached the row. That mattered because an
// auto-routed message is otherwise indistinguishable from one typed in the room, so
// room-activity digested every guess straight into the room's description and taught the
// router to make the same guess again (R10's "the rule protects a room exactly once").
// Accepting has to land on the row itself, because the row is what the digest reads.
//
// Order is deliberate: clear locally FIRST so the strip disappears on the tap rather than on
// the round-trip, then write. If the write fails the row simply stays pending — it keeps
// shaping nothing, which is the safe direction to fail in. The alternative (assume accepted
// on error) would restore the exact loop this exists to break.
export async function acceptRoutedHere({ worldId, messageId }) {
  clearRoutedHere();
  if (!messageId) return false;
  try {
    const res = await authFetch('/api/dashboard/route-accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: worldId, message_id: messageId }),
    });
    return !!(res && res.ok);
  } catch { return false; }
}