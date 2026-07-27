// POST /api/dashboard/command-deck-action
//
// Safely handles CommandDeck actions on master-loop deliverables:
// - mark_call_done: flip checkbox in needs-patrik.md from [ ] to [x], move to Cleared
// - answer_question: update open-questions.md and room-goals.json with answer
//
// HARD GUARDS:
// - Only writes to corner/users/aom/missions/master-loop/deliverables/
// - Validates action type and target before writing
// - Read-modify-write file fresh to avoid clobbering with background loop
// - No auto-answers to hard calls (only marks as read if user provides answer)
//
// Request body:
// {
//   action: "mark_call_done" | "answer_question",
//   callId?: string,  // for mark_call_done: line match
//   room?: string,    // for answer_question: room slug
//   answer?: string   // for answer_question: user's response
// }
//
// Response:
// {
//   success: true,
//   action: "...",
//   updatedFiles: ["needs-patrik.md"] | ["open-questions.md", "room-goals.json"]
// }

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const DELIVERABLES_DIR = path.join(
  AOM_EA_ROOT,
  'corner/users/aom/missions/master-loop/deliverables'
);

const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';
// AOM-EA-relative path used by the tunnel's /project-file-raw + /command-deck-write.
const DELIVERABLES_REL = 'corner/users/aom/missions/master-loop/deliverables';

// ── Tunnel-first read/write (Vercel prod has no AOM-EA disk) ────────────────────
// The master-loop deliverable files live on the studio machine. Reads come back
// through the existing /project-file-raw route; writes go through the scoped
// /command-deck-write route (only the three whitelisted files are writable).
// Local fs is the dev fallback (vercel dev on the studio box).

async function readDeliverable(name) {
  try {
    const url = `${RAG_TUNNEL_URL}/project-file-raw?path=${encodeURIComponent(`${DELIVERABLES_REL}/${name}`)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
    if (r.ok) return await r.text();
    if (r.status === 404) return null;
  } catch (err) {
    // fall through to local
  }
  try {
    const p = path.join(DELIVERABLES_DIR, name);
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

async function writeDeliverable(name, content) {
  try {
    const r = await fetch(`${RAG_TUNNEL_URL}/command-deck-write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'aom-vercel-proxy' },
      body: JSON.stringify({ name, content }),
    });
    if (r.ok) return true;
  } catch (err) {
    // fall through to local
  }
  try {
    fs.writeFileSync(path.join(DELIVERABLES_DIR, name), content, 'utf8');
    return true;
  } catch {
    return false;
  }
}

// ── Who tapped the button ──────────────────────────────────────────────────────
// Resolved SERVER-SIDE from the JWT. The deck's answers get written into
// needs-patrik.md and room-goals.json, which the master loop reads back and acts
// on, so an answer credited to the wrong person is an instruction credited to the
// wrong authority (identity-attribution audit, 2026-07-27).
//
// NOTE on the `source: 'patrik'` value further down: that string is a MACHINE
// SENTINEL, not an identity claim. scripts/goal-notetaker.py keys its
// never-overwrite guard on `source == 'patrik'` / `goal_source == 'patrik'`
// (lines 270, 278, 958) — it means "a human set this, don't clobber it". It is
// deliberately left alone; the real human is recorded alongside it in the new
// `answered_by` / `edited_by` fields.
//
// `verified` is verifyTenant's result, which already carries the identity it
// resolved from the JWT — no second /auth/v1/user round trip on the common path.
async function resolveActor(req, verified) {
  const ident = (verified && 'userName' in verified)
    ? verified
    : await callerIdentity(req).catch(() => null);
  const raw = ident?.userName || ident?.email || '';
  const name = String(raw).replace(/\s+/g, ' ').trim().slice(0, 80) || null;
  return {
    userId: ident?.userId || null,
    name,
    // Written into the deliverable next to the answer. "Unattributed" is the
    // honest rendering — the loop must not read an unknown answer as the
    // founder's decision.
    label: name || 'Unattributed',
    identified: Boolean(name),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { action, callId, lineMatch, room, answer, world, proposalId, kind, status, goal } = req.body || {};

  // ── Verify tenant ──────────────────────────────────────────────────────────
  // The master-loop deliverables live in the 'aom' world; the caller passes its
  // world and verifyTenant(world, req) checks the JWT can reach it (Patrik is a
  // super-admin so any valid world passes). Earlier this called verifyTenant(req)
  // with no world, which always 400'd "tenant required" — the reason no action
  // ever worked.
  let verified = null;
  try {
    verified = await verifyTenant((world || 'aom').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  // The frontend sends `lineMatch` (a substring of the hard call); older callers
  // used `callId`. Accept either.
  const callKey = callId || lineMatch;

  // The verified human behind this tap. Never body-supplied, never defaulted.
  const actor = await resolveActor(req, verified);

  // ── Validate action ────────────────────────────────────────────────────────
  if (!action || !['mark_call_done', 'answer_question', 'clear_question', 'keeper_decision', 'set_room_status', 'dismiss', 'edit_goal', 'touch_room'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    if (action === 'mark_call_done') {
      // `answer` (optional) is the decision the caller tapped; recorded inline
      // with their name so the loop acts on it. Absent = a plain "handled" with
      // no decision text.
      return await markCallDone(callKey, answer, actor, res);
    } else if (action === 'answer_question') {
      return await answerQuestion(room, answer, actor, res);
    } else if (action === 'clear_question') {
      // The goal-ledger answer card (wd40 R2): Patrik answered the room's open
      // question IN the room (via the chat send path), so clear the question and
      // record the answer WITHOUT touching the goal — unlike answer_question,
      // whose CommandDeck-era semantics overwrite the goal with the answer.
      return await clearQuestion(room, answer, actor, res);
    } else if (action === 'keeper_decision') {
      return await keeperDecision(proposalId, answer, actor, res);
    } else if (action === 'set_room_status') {
      // Room-status cards now carry decide chips ("Looks good" / "Pause it").
      // This flips a room's status + bumps last_reviewed so the loop sees the
      // steer next tick. `answer` (optional) records a short note inline.
      return await setRoomStatus(room, status, answer, actor, res);
    } else if (action === 'edit_goal') {
      // The caller edits the room's one-line goal directly in the Command Center.
      return await editGoal(room, goal, actor, res);
    } else if (action === 'touch_room') {
      // A quick reply in the Command Center counts as just-touched: bump the
      // room's timer so its check-in countdown restarts and it sorts to the top.
      return await touchRoom(room, res);
    } else if (action === 'dismiss') {
      // Generalized "clear it from the deck" across card types. Where a real
      // server-side state exists (hard call, question, keeper) we persist it so
      // it never resurfaces; client-only kinds (room/stuck/activity) just hide.
      return await dismissItem(kind, { callKey, room, proposalId, actor }, res);
    }
  } catch (err) {
    console.error('[command-deck-action] Error:', err);
    return res.status(500).json({ error: 'Failed to process action' });
  }
}

// ── Action handlers ────────────────────────────────────────────────────────────

async function markCallDone(callId, answer, actor, res) {
  if (!callId || typeof callId !== 'string') {
    return res.status(400).json({ error: 'callId required' });
  }

  try {
    // Read fresh through the tunnel (or local dev fallback).
    let content = await readDeliverable('needs-patrik.md');
    if (content == null) {
      return res.status(404).json({ error: 'needs-patrik.md not found' });
    }

    // Line-based so we can flip the checkbox AND append the decision at the end
    // of the same line. callId is the line's leading text (first ~40 chars).
    const lines = content.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (!found && /^- \[ \] /.test(lines[i]) && lines[i].includes(callId)) {
        lines[i] = lines[i].replace('[ ]', '[x]');
        if (answer && typeof answer === 'string' && answer.trim()) {
          // Name the actual answerer. The master loop reads this line back and
          // acts on it, so "→ Patrik:" on someone else's answer handed a
          // teammate's words the founder's authority.
          lines[i] += `  → ${actor?.label || 'Unattributed'}: ${answer.trim()}`;
        }
        found = true;
      }
    }
    if (!found) {
      return res.status(404).json({ error: 'Hard call not found' });
    }

    const ok = await writeDeliverable('needs-patrik.md', lines.join('\n'));
    if (!ok) return res.status(500).json({ error: 'Failed to write needs-patrik.md' });

    return res.status(200).json({
      success: true,
      action: 'mark_call_done',
      updatedFiles: ['needs-patrik.md'],
    });
  } catch (err) {
    console.error('[markCallDone] Error:', err);
    throw err;
  }
}

async function answerQuestion(room, answer, actor, res) {
  if (!room || typeof room !== 'string') {
    return res.status(400).json({ error: 'room required' });
  }
  if (!answer || typeof answer !== 'string') {
    return res.status(400).json({ error: 'answer required' });
  }

  try {
    // ── Update open-questions.md ───────────────────────────────────────────
    let openQContent = await readDeliverable('open-questions.md');
    if (openQContent == null) {
      return res.status(404).json({ error: 'open-questions.md not found' });
    }

    // Find the line matching the room and flip its checkbox
    const roomPattern = new RegExp(`^- \\[ \\] ${room.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} —`, 'm');
    if (!roomPattern.test(openQContent)) {
      return res.status(404).json({ error: `Question for room "${room}" not found` });
    }

    openQContent = openQContent.replace(roomPattern, (match) => match.replace('[ ]', '[x]'));

    // ── Update room-goals.json ─────────────────────────────────────────────
    let goalsContent = await readDeliverable('room-goals.json');
    if (goalsContent == null) {
      return res.status(404).json({ error: 'room-goals.json not found' });
    }
    const goals = JSON.parse(goalsContent);

    if (!goals.rooms) goals.rooms = {};
    if (!goals.rooms[room]) goals.rooms[room] = {};

    // Update the room goal with the answer
    goals.rooms[room] = {
      ...goals.rooms[room],
      goal: answer,
      // 'patrik' here is goal-notetaker.py's "a human set this, never clobber
      // it" sentinel, NOT a claim about who answered. The real answerer is
      // recorded in answered_by / answered_by_user_id below.
      source: 'patrik',
      status: 'active',
      confidence: 'clear',
      open_question: null,
      last_answer: answer,
      answered_by: actor?.name || null,
      answered_by_user_id: actor?.userId || null,
      ...(actor?.identified ? {} : { answered_by_unattributed: true }),
      last_reviewed: new Date().toISOString(),
    };

    // Write back both files (tunnel, or local dev fallback)
    const okQ = await writeDeliverable('open-questions.md', openQContent);
    const okG = await writeDeliverable('room-goals.json', JSON.stringify(goals, null, 2) + '\n');
    if (!okQ || !okG) {
      return res.status(500).json({ error: 'Failed to write deliverables' });
    }

    return res.status(200).json({
      success: true,
      action: 'answer_question',
      updatedFiles: ['open-questions.md', 'room-goals.json'],
    });
  } catch (err) {
    console.error('[answerQuestion] Error:', err);
    throw err;
  }
}

// Records a Keeper proposal decision into keeper-decisions.json. The Keeper skips
// any proposal id present here, so a resolved tidy-up never resurfaces. We record
// the choice; acting on it (archive / merge) is a separate, careful step.
async function keeperDecision(proposalId, answer, actor, res) {
  if (!proposalId || typeof proposalId !== 'string') {
    return res.status(400).json({ error: 'proposalId required' });
  }
  if (!answer || typeof answer !== 'string') {
    return res.status(400).json({ error: 'answer required' });
  }
  try {
    let decisions = {};
    const raw = await readDeliverable('keeper-decisions.json');
    if (raw) {
      try { decisions = JSON.parse(raw) || {}; } catch { decisions = {}; }
    }
    decisions[proposalId] = {
      answer: answer.trim(),
      ts: new Date().toISOString(),
      decided_by: actor?.name || null,
      decided_by_user_id: actor?.userId || null,
      ...(actor?.identified ? {} : { unattributed: true }),
    };
    const ok = await writeDeliverable('keeper-decisions.json', JSON.stringify(decisions, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'Failed to write keeper-decisions.json' });
    return res.status(200).json({ success: true, action: 'keeper_decision', proposalId });
  } catch (err) {
    console.error('[keeperDecision] Error:', err);
    throw err;
  }
}

// Flips a room's status (and bumps last_reviewed) so the loop reads the steer on
// its next tick. Used by the room-status card's decide chips. An optional `note`
// is recorded as last_answer so the loop has the plain-words reason.
// Clear a room's open question after the answer was delivered into the room
// (goal-ledger answer card). Non-destructive: goal / status / source stay intact;
// only open_question clears, with the answer recorded for the loop's next tick.
async function clearQuestion(room, answer, actor, res) {
  if (!room || typeof room !== 'string') {
    return res.status(400).json({ error: 'room required' });
  }
  try {
    let goalsContent = await readDeliverable('room-goals.json');
    if (goalsContent == null) {
      return res.status(404).json({ error: 'room-goals.json not found' });
    }
    const goals = JSON.parse(goalsContent);
    if (!goals.rooms || !goals.rooms[room]) {
      return res.status(404).json({ error: `Room "${room}" not found in room-goals.json` });
    }
    goals.rooms[room] = {
      ...goals.rooms[room],
      open_question: null,
      last_reviewed: new Date().toISOString(),
      ...(answer && typeof answer === 'string' && answer.trim()
        ? {
            last_answer: answer.trim(),
            answered_by: actor?.name || null,
            answered_by_user_id: actor?.userId || null,
            ...(actor?.identified ? {} : { answered_by_unattributed: true }),
          }
        : {}),
    };
    const ok = await writeDeliverable('room-goals.json', JSON.stringify(goals, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'Failed to write room-goals.json' });
    return res.status(200).json({ success: true, action: 'clear_question', room });
  } catch (err) {
    console.error('[clearQuestion] Error:', err);
    throw err;
  }
}

async function setRoomStatus(room, status, note, actor, res) {
  if (!room || typeof room !== 'string') {
    return res.status(400).json({ error: 'room required' });
  }
  const allowed = ['active', 'parked', 'done'];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
  }
  try {
    let goalsContent = await readDeliverable('room-goals.json');
    if (goalsContent == null) {
      return res.status(404).json({ error: 'room-goals.json not found' });
    }
    const goals = JSON.parse(goalsContent);
    if (!goals.rooms) goals.rooms = {};
    if (!goals.rooms[room]) goals.rooms[room] = {};
    goals.rooms[room] = {
      ...goals.rooms[room],
      status,
      // Sentinel, not an identity — see the note on resolveActor.
      source: 'patrik',
      status_set_by: actor?.name || null,
      status_set_by_user_id: actor?.userId || null,
      ...(actor?.identified ? {} : { status_set_by_unattributed: true }),
      last_reviewed: new Date().toISOString(),
      ...(note && typeof note === 'string' && note.trim() ? { last_answer: note.trim() } : {}),
    };
    const ok = await writeDeliverable('room-goals.json', JSON.stringify(goals, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'Failed to write room-goals.json' });
    return res.status(200).json({ success: true, action: 'set_room_status', room, status });
  } catch (err) {
    console.error('[setRoomStatus] Error:', err);
    throw err;
  }
}

// A human edits a room's one-line goal directly from the Command Center
// spreadsheet. Read-modify-write room-goals.json so the loop sees the new goal
// next tick, with the editor's real name attached.
async function editGoal(room, goal, actor, res) {
  if (!room || typeof room !== 'string') {
    return res.status(400).json({ error: 'room required' });
  }
  if (typeof goal !== 'string') {
    return res.status(400).json({ error: 'goal required' });
  }
  const clean = goal.replace(/\s+/g, ' ').trim().slice(0, 280);
  try {
    let goalsContent = await readDeliverable('room-goals.json');
    if (goalsContent == null) {
      return res.status(404).json({ error: 'room-goals.json not found' });
    }
    const goals = JSON.parse(goalsContent);
    if (!goals.rooms) goals.rooms = {};
    if (!goals.rooms[room]) goals.rooms[room] = {};
    const now = new Date().toISOString();
    goals.rooms[room] = {
      ...goals.rooms[room],
      goal: clean,
      // BOTH spellings: goal_source is the CommandDeck-era field, but the
      // goal-notetaker's never-overwrite guard reads `source` — without it the
      // next 20-min sweep clobbered the stated goal (fixed 2026-07-06,
      // wd40-ledger R5, alongside the daemon-side guard now reading both).
      // The literal 'patrik' is that guard's sentinel for "human-set"; the human
      // who actually typed it is recorded in goal_edited_by.
      source: 'patrik',
      goal_source: 'patrik',
      goal_edited_by: actor?.name || null,
      goal_edited_by_user_id: actor?.userId || null,
      ...(actor?.identified ? {} : { goal_edited_by_unattributed: true }),
      goal_edited_at: now,
      last_reviewed: now,
      last_touched: now, // editing the goal counts as activity so the row re-sorts
    };
    const ok = await writeDeliverable('room-goals.json', JSON.stringify(goals, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'Failed to write room-goals.json' });
    return res.status(200).json({ success: true, action: 'edit_goal', room, goal: clean });
  } catch (err) {
    console.error('[editGoal] Error:', err);
    throw err;
  }
}

// A quick reply in the Command Center restarts the room's check-in timer: bump
// last_touched + last_reviewed so the loop's countdown resets and the row sorts
// to the top of its status tier on the next poll.
async function touchRoom(room, res) {
  if (!room || typeof room !== 'string') {
    return res.status(400).json({ error: 'room required' });
  }
  try {
    let goalsContent = await readDeliverable('room-goals.json');
    if (goalsContent == null) {
      return res.status(404).json({ error: 'room-goals.json not found' });
    }
    const goals = JSON.parse(goalsContent);
    if (!goals.rooms) goals.rooms = {};
    if (!goals.rooms[room]) goals.rooms[room] = {};
    const now = new Date().toISOString();
    goals.rooms[room] = { ...goals.rooms[room], last_touched: now, last_reviewed: now };
    const ok = await writeDeliverable('room-goals.json', JSON.stringify(goals, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'Failed to write room-goals.json' });
    return res.status(200).json({ success: true, action: 'touch_room', room });
  } catch (err) {
    console.error('[touchRoom] Error:', err);
    throw err;
  }
}

// Generalized "clear it from the deck". For server-backed items we persist the
// dismissal so the loop doesn't resurface it; for client-only kinds we return
// success and the deck hides the card locally.
async function dismissItem(kind, { callKey, room, proposalId, actor }, res) {
  try {
    if (kind === 'hard_call') {
      // Flip the checkbox to handled (no decision text) — same path as Mark done.
      return await markCallDone(callKey, null, actor, res);
    }
    if (kind === 'question') {
      // Flip the open-questions.md checkbox without writing a goal answer.
      if (!room || typeof room !== 'string') {
        return res.status(400).json({ error: 'room required' });
      }
      let openQContent = await readDeliverable('open-questions.md');
      if (openQContent == null) {
        return res.status(404).json({ error: 'open-questions.md not found' });
      }
      const roomPattern = new RegExp(`^- \\[ \\] ${room.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} —`, 'm');
      if (!roomPattern.test(openQContent)) {
        return res.status(404).json({ error: `Question for room "${room}" not found` });
      }
      openQContent = openQContent.replace(roomPattern, (m) => m.replace('[ ]', '[x]'));
      const ok = await writeDeliverable('open-questions.md', openQContent);
      if (!ok) return res.status(500).json({ error: 'Failed to write open-questions.md' });
      return res.status(200).json({ success: true, action: 'dismiss', kind, room });
    }
    if (kind === 'keeper') {
      // Record a skip so the Keeper never re-proposes it.
      return await keeperDecision(proposalId, 'dismissed', actor, res);
    }
    // Client-only kinds (room, stuck, activity): nothing to persist server-side.
    return res.status(200).json({ success: true, action: 'dismiss', kind: kind || 'local', clientOnly: true });
  } catch (err) {
    console.error('[dismissItem] Error:', err);
    throw err;
  }
}
