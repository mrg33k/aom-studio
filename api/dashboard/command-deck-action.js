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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { action, callId, lineMatch, room, answer, world } = req.body || {};

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
  if (!action || !['mark_call_done', 'answer_question'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    if (action === 'mark_call_done') {
      return await markCallDone(callKey, res);
    } else if (action === 'answer_question') {
      return await answerQuestion(room, answer, res);
    }
  } catch (err) {
    console.error('[command-deck-action] Error:', err);
    return res.status(500).json({ error: 'Failed to process action' });
  }
}

// ── Action handlers ────────────────────────────────────────────────────────────

async function markCallDone(callId, res) {
  if (!callId || typeof callId !== 'string') {
    return res.status(400).json({ error: 'callId required' });
  }

  const needsPath = path.join(DELIVERABLES_DIR, 'needs-patrik.md');

  try {
    // Read fresh
    if (!fs.existsSync(needsPath)) {
      return res.status(404).json({ error: 'needs-patrik.md not found' });
    }

    let content = fs.readFileSync(needsPath, 'utf8');
    const originalContent = content;

    // Find and flip the checkbox: "- [ ] ..." -> "- [x] ..."
    // Use callId as a line match key (e.g., a substring of the hard call)
    const pattern = new RegExp(`^- \\[ \\] (.*)${callId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm');
    if (!pattern.test(content)) {
      return res.status(404).json({ error: 'Hard call not found' });
    }

    // Replace the first match
    content = content.replace(pattern, (match) => match.replace('[ ]', '[x]'));

    if (content === originalContent) {
      return res.status(400).json({ error: 'Failed to mark call done' });
    }

    // Write back
    fs.writeFileSync(needsPath, content, 'utf8');

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

  const openQuestionsPath = path.join(DELIVERABLES_DIR, 'open-questions.md');
  const roomGoalsPath = path.join(DELIVERABLES_DIR, 'room-goals.json');

  try {
    // ── Update open-questions.md ───────────────────────────────────────────
    if (!fs.existsSync(openQuestionsPath)) {
      return res.status(404).json({ error: 'open-questions.md not found' });
    }

    let openQContent = fs.readFileSync(openQuestionsPath, 'utf8');
    const originalOpenQ = openQContent;

    // Find the line matching the room and flip its checkbox
    const roomPattern = new RegExp(`^- \\[ \\] ${room.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} —`, 'm');
    if (!roomPattern.test(openQContent)) {
      return res.status(404).json({ error: `Question for room "${room}" not found` });
    }

    openQContent = openQContent.replace(roomPattern, (match) => match.replace('[ ]', '[x]'));

    // ── Update room-goals.json ─────────────────────────────────────────────
    if (!fs.existsSync(roomGoalsPath)) {
      return res.status(404).json({ error: 'room-goals.json not found' });
    }

    let goalsContent = fs.readFileSync(roomGoalsPath, 'utf8');
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

    // Write back both files
    fs.writeFileSync(openQuestionsPath, openQContent, 'utf8');
    fs.writeFileSync(roomGoalsPath, JSON.stringify(goals, null, 2) + '\n', 'utf8');

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
