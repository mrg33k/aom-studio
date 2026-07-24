// POST /api/dashboard/review-decision
//
// Handles review workflow decisions: approve, request-changes, dismiss, send-checklist.
// Each decision creates a structured message in the deliverable's room via Supabase,
// notifying the agent and the room that the deliverable has moved in the review flow.
//
// Actions:
//   - approve: mark deliverable as approved, emit notification to room
//   - request-changes: mark as needs-changes + notes, notify room, AND insert a real
//     `tasks` row (status 'queued') so the feedback becomes dispatched work — the
//     review loop closes instead of the note dying in chat. If the task insert
//     fails the whole request 500s (the UI must see the failure).
//   - dismiss: drop the item from the queue without approval (not review-worthy)
//   - send-checklist: send compiled checklist to deliverable's room for agent
//
// The decision row carries the item's identity fields (source_path, sha256,
// mission, title) so review-queue.js can suppress the decided item both by exact
// id and by content identity (a re-share of the same unchanged bytes stays
// decided; a fixed file with a new digest re-enters the queue).
//
// Persistence is Supabase: messages table for the decision event, tasks table for
// the request-changes work item.

import { createClient } from '@supabase/supabase-js';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js';
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' };

const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

// ── LOCKSTEP with AOM-EA scripts/queue-task.py ──────────────────────────────
// LINEAR_FLOW_TAIL below is copied verbatim from queue-task.py (R5a) so tasks
// created here finalize exactly like every other dispatched task. If the tail
// changes there, change it HERE too (and in scripts/foreman-orchestrate.py).
const LINEAR_FLOW_TAIL = `

DOCTRINE: Research before build (see .claude/playbooks/research-before-build.md).
For anything non-trivial, start with a research pass — read VISION / RESEARCH /
PHONEBOOK for the relevant project/mission, grep past rounds, WebSearch if an
external pattern is in play. Land findings in the mission's research/<date>-<slug>.md
and append one line to the mission's RESEARCH.md index. Skip only for trivial
one-line fixes or re-runs of a proven recipe. Research is cheap; wrong builds are expensive.

EXECUTE IN ORDER:
0. Research pass (skip only for trivial fixes).
1. Implement.
2. Run any build/tests the change warrants.
3. git add -A && git commit -m '<msg referencing task id>'
4. git push origin master
5. (FINAL STEP, do this LAST AND ONLY ONCE):
   scripts/task-complete.sh <task_id> done '{"type":"text","payload":"<commit-hash>","summary":"<one line>"}'

Do NOT call task-complete.sh more than once. Do NOT call it before step 4 finishes.
If blocked, finalize with failed:
   scripts/task-complete.sh <task_id> failed '' '<reason>'
`;

// Mirrors queue-task.py::clean_title.
function cleanTitle(raw) {
  const s = String(raw || '').split(/\s+/).filter(Boolean).join(' ');
  if (!s) return 'Untitled task';
  return s.length <= 140 ? s : `${s.slice(0, 137)}…`;
}

// Look up the project's repo_path from the projects table (mirrors
// queue-task.py::resolve_project). Returns '' when the slug is unknown.
async function resolveProjectPath(supabase, slug) {
  if (!slug) return '';
  const { data, error } = await supabase
    .from('projects')
    .select('repo_path')
    .eq('slug', slug)
    .limit(1);
  if (error || !Array.isArray(data) || !data.length) return '';
  return data[0].repo_path || '';
}

// Insert the request-changes feedback as a real queued task (row shape copied
// from AOM-EA scripts/queue-task.py::queue_task — keep in lockstep). Returns
// { id } on success or { error } on failure.
async function createReviewTask(supabase, {
  world, project, mission, title, deliverableId, sourcePath, sha256, notes,
}) {
  const fileName = title || String(deliverableId).split('/').pop() || 'deliverable';
  const taskTitle = cleanTitle(`Review feedback: ${fileName} (${project || 'unknown project'})`);
  const projectPath = await resolveProjectPath(supabase, project);

  const bodyLines = [
    `Patrik reviewed a deliverable and requested changes.`,
    ``,
    `Deliverable: ${deliverableId}`,
    sourcePath ? `Source file on disk: ${sourcePath}` : null,
    ``,
    `Requested changes:`,
    notes || '(no written notes — check the pin-comments below)',
    ``,
    `Pin-comments (position-anchored notes on the file) live in Supabase cm_state:`,
    `kind='dash_review_comments', client_id='${world}', payload.items['${deliverableId}']`,
    `(or via the dashboard API: GET /api/dashboard/review-comments?world=${world}&deliverable=<id>).`,
    ``,
    `IMPORTANT — after fixing, re-share the corrected file so it re-enters the Review queue:`,
    `  python3 scripts/share-file.py --file <fixed file> --project ${project || '<project>'}${mission ? ` --mission ${mission}` : ''}`,
    `A re-share of UNCHANGED bytes stays suppressed (same sha256); the fixed file re-presents as new.`,
  ].filter((l) => l !== null).join('\n');

  const row = {
    title: taskTitle,
    text: bodyLines + LINEAR_FLOW_TAIL,
    description: bodyLines + LINEAR_FLOW_TAIL,
    status: 'queued',
    source: 'review-decision',
    client_id: world,
    project: project || null,
    project_path: projectPath,
    priority: 1,
    created_at: new Date().toISOString(),
    metadata: {
      // Fall back to 'AOM-EA' when the deliverable has no /projects/<slug>/ path
      // (ad-hoc shared files served from rag.aheadofmarket.com/files/<world>/<id>).
      // task-runner.sh immediately hard-fails any task with an empty repo; 'AOM-EA'
      // resolves via resolve_repo_path() to the AOM-EA root so the task dispatches.
      repo: project || 'AOM-EA',
      created_via: 'review-decision.js',
      model: 'opus',
      // one-write-path R8: canonicalize instead of blind `${project}:${mission}`
      // (that template double-prefixed when mission was already composite).
      ...(mission ? { mission_slug: canonicalizeMissionSlug(mission, MISSION_SLUG_LOOKUP, project) } : {}),
      review: {
        deliverable_id: deliverableId,
        source_path: sourcePath || null,
        sha256: sha256 || null,
        notes: notes || null,
      },
    },
  };

  const { data, error } = await supabase.from('tasks').insert(row).select('id');
  if (error) return { error: error.message || 'task insert failed' };
  const id = Array.isArray(data) && data.length ? data[0].id : null;
  return id ? { id } : { error: 'task insert returned no id' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { action, world, deliverable, notes, checklist } = req.body || {};

  try {
    await verifyTenant((world || 'aom').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const act = String(action || '').toLowerCase().trim();
  if (!['approve', 'request-changes', 'dismiss', 'send-checklist', 'undo'].includes(act)) {
    return res.status(400).json({ error: 'action must be approve, request-changes, dismiss, send-checklist, or undo' });
  }

  // Initialize Supabase
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // undo (review-loop design gate): delete a DISMISS decision row by id so the
  // item re-enters the queue on the next fetch. Strictly scoped — the row must
  // be a review-decision message AND its action must be 'dismiss' (approve /
  // request-changes stay permanent; a task may already be chasing the latter).
  if (act === 'undo') {
    const decisionId = clean(req.body.decision_id, 80);
    if (!decisionId) return res.status(400).json({ error: 'decision_id required' });
    try {
      const { data: rows, error: selErr } = await supabase
        .from('messages')
        .select('id, metadata')
        .eq('id', decisionId)
        .eq('source', 'review-decision')
        .limit(1);
      if (selErr) return res.status(500).json({ error: 'Failed to look up decision' });
      if (!rows || !rows.length) return res.status(404).json({ error: 'Decision not found' });
      if ((rows[0].metadata || {}).action !== 'dismiss') {
        return res.status(400).json({ error: 'Only dismiss decisions can be undone' });
      }
      const { error: delErr } = await supabase
        .from('messages')
        .delete()
        .eq('id', decisionId)
        .eq('source', 'review-decision');
      if (delErr) return res.status(500).json({ error: 'Failed to undo decision' });
      return res.status(200).json({ ok: true, action: 'undo', undone: decisionId });
    } catch (e) {
      console.error('[review-decision] undo exception:', e);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  const did = clean(deliverable, 400);
  if (!did) return res.status(400).json({ error: 'deliverable required' });

  // Identity passthrough fields (the queue item carries these; the decision row
  // stores them so review-queue.js can suppress by content identity too).
  const sourcePath = clean(req.body.source_path, 500) || null;
  const sha256 = /^[a-f0-9]{64}$/i.test(String(req.body.sha256 || '')) ? String(req.body.sha256).toLowerCase() : null;
  const mission = clean(req.body.mission, 120) || null;
  const title = clean(req.body.title, 200) || null;

  // Construct the message to emit to the deliverable's room.
  // The message type tells the room what happened; the content carries the detail.
  let message = '';
  let messageType = 'review_decision';

  // The room-facing echo speaks the FILE'S NAME, never the raw store URL —
  // a URL with spaces (every multi-word filename) broke the chat's link-card
  // lift into a dead Open card and read as plumbing (adv2 finding 1).
  const displayName = (clean(req.body.title, 200) || decodeURIComponent(String(did).split('/').pop() || '').trim() || 'the file');
  if (act === 'approve') {
    messageType = 'review_approved';
    message = `Approved "${displayName}".`;
  } else if (act === 'request-changes') {
    const notesText = clean(notes, 1000);
    messageType = 'review_request_changes';
    message = notesText ? `Changes requested on "${displayName}": ${notesText}` : `Changes requested on "${displayName}".`;
  } else if (act === 'dismiss') {
    messageType = 'review_dismissed';
    message = `Dismissed "${displayName}" from review.`;
  } else if (act === 'send-checklist') {
    messageType = 'review_checklist_sent';
    message = checklist ? clean(checklist, 2000) : `Checklist sent for "${displayName}".`;
  }

  try {
    // The project slug is derived from the deliverable path (…/projects/<slug>/…)
    // when the caller doesn't pass one explicitly.
    const pathMatch = did.match(/projects\/([a-z0-9][a-z0-9-_.]*)\//i);
    const projectSlug = clean(req.body.project, 80) || (pathMatch ? pathMatch[1] : null);
    const worldId = clean(world || 'aom', 60) || 'aom';

    // request-changes: create the work item FIRST — if it can't be queued, the
    // decision must NOT be recorded (else the item vanishes from the queue with
    // no task chasing the fix). The UI sees the 500 and keeps the item.
    let taskId = null;
    if (act === 'request-changes') {
      const t = await createReviewTask(supabase, {
        world: worldId,
        project: projectSlug,
        mission,
        title,
        deliverableId: did,
        sourcePath,
        sha256,
        notes: clean(notes, 1000) || null,
      });
      if (t.error) {
        console.error('[review-decision] task insert failed:', t.error);
        return res.status(500).json({ error: `Failed to queue the fix task: ${t.error}` });
      }
      taskId = t.id;
    }

    // Emit the decision as a message so it appears in chat/notifications, and so
    // review-queue.js can suppress the decided item.
    // FIXED 2026-07-06 (R-ASSIGN): the original insert used `type`/`content` columns
    // that do not exist in the messages table, so EVERY decision 500'd and nothing was
    // recorded. Insert the real schema (the columns the chat composer writes).
    // FIXED 2026-07-12 (review-loop): messages.id has NO default — the R-ASSIGN fix
    // still 500'd on the NOT NULL (zero decision rows had EVER persisted). Stamp
    // id + timestamp explicitly, exactly like share-file.py does.
    const decisionId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const { error } = await supabase.from('messages').insert({
      id: decisionId,
      timestamp: new Date().toISOString(),
      client_id: worldId,
      agent: clean(req.body.agent, 80) || 'corner',
      project: projectSlug,
      text: message,
      role: 'system',
      source: 'review-decision',
      metadata: {
        message_type: messageType,
        deliverable_id: did,
        action: act,
        notes: act === 'request-changes' ? clean(notes, 1000) : null,
        checklist: act === 'send-checklist' ? clean(checklist, 2000) : null,
        decided_at: new Date().toISOString(),
        // Content identity of the decided item — review-queue.js keys its
        // decidedContent suppression on source_path + sha256 together.
        source_path: sourcePath,
        sha256,
        mission,
        // mission_slug routes this decision card into the MISSION room's thread
        // (the thread's mission arms match metadata->>mission_slug; without it the
        // card lands only in the project room while the user sits in the mission
        // room watching nothing happen — corner:one-corner drop 2).
        // one-write-path R8: canonical composite, never a raw passthrough.
        ...(mission ? { mission_slug: canonicalizeMissionSlug(mission, MISSION_SLUG_LOOKUP, project) } : {}),
        title,
        ...(taskId ? { task_id: taskId } : {}),
      },
    });

    if (error) {
      console.error('[review-decision] Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to record decision' });
    }

    return res.status(200).json({
      ok: true,
      action: act,
      deliverable: did,
      message,
      // The decision row's id — the client's "Undo" for a dismiss targets this.
      decision_id: decisionId,
      ...(taskId ? { task_id: taskId } : {}),
    });
  } catch (e) {
    console.error('[review-decision] Exception:', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
