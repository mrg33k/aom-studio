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
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA';
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { action, callId, lineMatch, room, answer, world, proposalId } = req.body || {};

  // ── Verify tenant ──────────────────────────────────────────────────────────
  // The master-loop deliverables live in the 'aom' world; the caller passes its
  // world and verifyTenant(world, req) checks the JWT can reach it (Patrik is a
  // super-admin so any valid world passes). Earlier this called verifyTenant(req)
  // with no world, which always 400'd "tenant required" — the reason no action
  // ever worked.
  let tenantId = null;
  try {
    tenantId = await verifyTenant((world || 'aom').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  // The frontend sends `lineMatch` (a substring of the hard call); older callers
  // used `callId`. Accept either.
  const callKey = callId || lineMatch;

  // ── Validate action ────────────────────────────────────────────────────────
  if (!action || !['mark_call_done', 'answer_question', 'keeper_decision'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    if (action === 'mark_call_done') {
      // `answer` (optional) is the decision Patrik tapped; recorded inline so the
      // loop acts on it. Absent = a plain "handled" with no decision text.
      return await markCallDone(callKey, answer, res);
    } else if (action === 'answer_question') {
      return await answerQuestion(room, answer, res);
    } else if (action === 'keeper_decision') {
      return await keeperDecision(proposalId, answer, res);
    }
  } catch (err) {
    console.error('[command-deck-action] Error:', err);
    return res.status(500).json({ error: 'Failed to process action' });
  }
}

// ── Action handlers ────────────────────────────────────────────────────────────

async function markCallDone(callId, answer, res) {
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
          lines[i] += `  → Patrik: ${answer.trim()}`;
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

async function answerQuestion(room, answer, res) {
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
      source: 'patrik',
      status: 'active',
      confidence: 'clear',
      open_question: null,
      last_answer: answer,
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
async function keeperDecision(proposalId, answer, res) {
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
    decisions[proposalId] = { answer: answer.trim(), ts: new Date().toISOString() };
    const ok = await writeDeliverable('keeper-decisions.json', JSON.stringify(decisions, null, 2) + '\n');
    if (!ok) return res.status(500).json({ error: 'Failed to write keeper-decisions.json' });
    return res.status(200).json({ success: true, action: 'keeper_decision', proposalId });
  } catch (err) {
    console.error('[keeperDecision] Error:', err);
    throw err;
  }
}
