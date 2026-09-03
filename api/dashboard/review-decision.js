// POST /api/dashboard/review-decision
//
// Handles review workflow decisions: approve, request-changes, dismiss, send-checklist.
// Each decision creates a structured message in the deliverable's room, notifying the
// agent and the room that the deliverable has moved in the review flow.
//
// Actions:
//   - approve: mark deliverable as approved, emit notification to room
//   - request-changes: mark as needs-changes + notes, notify room, AND queue a real
//     task (status 'queued') so the feedback becomes dispatched work. The review loop
//     closes instead of the note dying in chat. If the task insert fails the whole
//     request 500s (the UI must see the failure).
//   - dismiss: drop the item from the queue without approval (not review-worthy)
//   - send-checklist: send compiled checklist to deliverable's room for agent
//   - undo: take back a dismiss so the item re-enters the queue
//
// The decision row carries the item's identity fields (source_path, sha256,
// mission, title) so review-queue.js can suppress the decided item both by exact
// id and by content identity (a re-share of the same unchanged bytes stays
// decided; a fixed file with a new digest re-enters the queue).
//
// corner:retire-supabase (2026-09-03). Persistence is Convex: messages:send +
// messages:patchMetadata for the decision row (source 'review-decision' in the
// project or mission room), tasks:queue for the request-changes work item,
// projects:lookupBySlug for the repo path. Was Supabase messages, tasks and
// projects through the old client library. Two shape changes worth knowing:
//   - the decision row is an assistant-role row spoken by 'corner' (was
//     role 'system'), because Convex dispatches any row without an agentSlug
//     to the AI round table and a decision must never be answered by an agent;
//   - undo cannot delete (no client-side row delete on Convex), so it stamps
//     metadata.undone on the dismiss row; review-history and review-queue skip
//     rows carrying it.

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { convexQuery, convexMutation } from '../_lib/verifyTenant.js';
import { canonicalizeMissionSlug, buildSlugLookup } from '../../src/dashboard/data/canonicalize-mission-slug.js';
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' };

const MISSION_SLUG_LOOKUP = buildSlugLookup(missionsRegistry);

const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

// The reviewer, resolved SERVER-SIDE from the JWT. The AOM world has three
// people in it (Patrik, Ash, Courtney) and projects are shared across worlds,
// so "who requested changes" is a variable, never a constant. It used to be
// hardcoded to Patrik, which meant Courtney's review reached the agent carrying
// the founder's authority (identity-attribution audit, 2026-07-27).
// `verified` is verifyTenant's result, which already carries the identity it
// resolved from the JWT. callerIdentity is the fallback for a result shape
// without identity; both use the same derivation so one human reads the same
// on either path.
async function resolveReviewer(req, verified) {
  const ident = (verified && 'userName' in verified)
    ? verified
    : await callerIdentity(req).catch(() => null);
  const name = clean(ident?.userName || ident?.email || '', 80) || null;
  return {
    userId: ident?.userId || null,
    email: ident?.email || null,
    name,
    // Displayed in the room echo. "Someone" is the honest rendering of an
    // unresolvable author, never a substituted person.
    label: name || 'Someone',
    identified: Boolean(name),
  };
}

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

// The project's repo path from the Convex registry (mirrors
// queue-task.py::resolve_project). Returns '' when the slug is unknown.
async function resolveProjectPath(slug) {
  if (!slug) return '';
  const row = await convexQuery('projects:lookupBySlug', { slug }).catch(() => null);
  return row?.repoPath || '';
}

// --- PROJECT SCOPE (r7) -----------------------------------------------------
// verifyTenant proves the caller may act inside `world`. It proves nothing
// about the project slug, which arrives either straight off the body or
// scraped out of the deliverable path, and on the request-changes branch
// becomes tasks.project, metadata.repo AND project_path, i.e. a checkout a
// worker runs in. So the slug is checked against the registry:
//   registered   -> the world must hold it or hold a sharing grant
//   unregistered -> the world must already have a room for it (participation),
//                   because trust-on-first-use never authorizes a checkout
async function authorizeProject({ world, projectSlug }) {
  const slug = String(projectSlug || '').trim().toLowerCase();
  if (!slug) return { ok: true, via: 'no-scope' };
  const held = await convexQuery('projects:lookupBySlug', { slug }).catch(() => null);
  if (held) {
    if (held.ownerWorld && String(held.ownerWorld).toLowerCase() === world) return { ok: true, via: 'holder-world' };
    const access = await convexQuery('projects:hasAccess', { slug, worldId: world }).catch(() => null);
    if (access && access.ok) return { ok: true, via: 'project-access-grant' };
    return { ok: false, reason: `project "${slug}" is held by "${held.ownerWorld}" and not shared with "${world}"` };
  }
  const rooms = await convexQuery('rooms:listRooms', { worldId: world, filter: 'all' }).catch(() => []);
  const present = (Array.isArray(rooms) ? rooms : []).some((r) => String(r.project || '').toLowerCase() === slug);
  if (present) return { ok: true, via: 'unregistered-project' };
  return { ok: false, reason: `project "${slug}" is not registered and world "${world}" has no room for it` };
}

// Queue the request-changes feedback as a real task (row shape copied from
// AOM-EA scripts/queue-task.py::queue_task, keep in lockstep). Returns
// { id } on success or { error } on failure.
async function createReviewTask({
  world, project, mission, title, deliverableId, sourcePath, sha256, notes, reviewer,
}) {
  const fileName = title || String(deliverableId).split('/').pop() || 'deliverable';
  const taskTitle = cleanTitle(`Review feedback: ${fileName} (${project || 'unknown project'})`);
  const projectPath = await resolveProjectPath(project);

  // The worker acts on this text. It must name the REAL reviewer, and when we
  // can't name them it must say so out loud. A worker that reads "Patrik" takes
  // actions it takes for nobody else, so an unverifiable request has to arrive
  // visibly unverified rather than wearing the founder's name.
  const openingLine = reviewer?.identified
    ? `${reviewer.name} reviewed a deliverable and requested changes.`
    : `A signed-in reviewer requested changes on a deliverable. Corner could NOT resolve who they are — treat this request as UNATTRIBUTED and do not assume it came from Patrik.`;

  const bodyLines = [
    openingLine,
    ``,
    `Deliverable: ${deliverableId}`,
    sourcePath ? `Source file on disk: ${sourcePath}` : null,
    ``,
    `Requested changes:`,
    notes || '(no written notes — check the pin-comments below)',
    ``,
    `Pin-comments (position-anchored notes on the file) live in the Convex state table:`,
    `kind='dash_review_comments', world='${world}', value.items['${deliverableId}']`,
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
    project_path: projectPath || null,
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
      // Machine-readable trail of who asked. Absent name => unattributed flag,
      // never a stand-in.
      ...(reviewer?.userId ? { requested_by_user_id: reviewer.userId } : {}),
      ...(reviewer?.name ? { requested_by: reviewer.name } : { requester_unattributed: true }),
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

  try {
    const inserted = await convexMutation('tasks:queue', { row });
    const id = inserted && inserted.id ? inserted.id : null;
    return id ? { id } : { error: 'task insert returned no id' };
  } catch (err) {
    return { error: err.message || 'task insert failed' };
  }
}

// The room a decision is spoken in: the mission room when the item names a
// mission, else the project room, else Corner's own room.
function decisionRoomId(world, projectSlug, missionSlug) {
  if (missionSlug) {
    const canonical = canonicalizeMissionSlug(missionSlug, MISSION_SLUG_LOOKUP, projectSlug);
    const project = projectSlug || canonical.split(':')[0];
    const leaf = canonical.includes(':') ? canonical.slice(canonical.indexOf(':') + 1) : canonical;
    return `${world}:mission:${project}:${leaf}`;
  }
  if (projectSlug) return `${world}:project:${projectSlug}`;
  return `${world}:agent:corner`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { action, world, deliverable, notes, checklist } = req.body || {};

  let verified;
  try {
    verified = await verifyTenant((world || '').toString(), req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  const act = String(action || '').toLowerCase().trim();
  if (!['approve', 'request-changes', 'dismiss', 'send-checklist', 'undo'].includes(act)) {
    return res.status(400).json({ error: 'action must be approve, request-changes, dismiss, send-checklist, or undo' });
  }

  // Stamp the VERIFIED tenant, not the raw body string. verifyTenant already
  // lowercased and validated it, and the task/message rows below both key off it.
  const worldId = String(verified?.tenant || clean(world || '', 60) || '');

  // undo (review-loop design gate): take back a DISMISS decision by id so the
  // item re-enters the queue on the next fetch. Strictly scoped: the row must
  // be a review-decision message AND its action must be 'dismiss' (approve /
  // request-changes stay permanent; a task may already be chasing the latter).
  if (act === 'undo') {
    const decisionId = clean(req.body.decision_id, 80);
    if (!decisionId) return res.status(400).json({ error: 'decision_id required' });
    try {
      const rows = await convexQuery('messages:findBySource', { worldId, source: 'review-decision', limit: 500 });
      const row = (Array.isArray(rows) ? rows : []).find((r) => String(r._id) === decisionId);
      if (!row) return res.status(404).json({ error: 'Decision not found' });
      if ((row.metadata || {}).action !== 'dismiss') {
        return res.status(400).json({ error: 'Only dismiss decisions can be undone' });
      }
      await convexMutation('messages:patchMetadata', {
        messageId: decisionId,
        patch: { undone: true, undone_at: new Date().toISOString(), undone_by: verified.userId || null },
      });
      return res.status(200).json({ ok: true, action: 'undo', undone: decisionId });
    } catch (e) {
      console.error('[review-decision] undo exception:', e);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  const did = clean(deliverable, 400);
  if (!did) return res.status(400).json({ error: 'deliverable required' });

  // Who is deciding, from the session verifyTenant already validated.
  const reviewer = await resolveReviewer(req, verified);

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

  // The room-facing echo speaks the FILE'S NAME, never the raw store URL. A URL
  // with spaces (every multi-word filename) broke the chat's link-card lift into
  // a dead Open card and read as plumbing (adv2 finding 1).
  const displayName = (clean(req.body.title, 200) || decodeURIComponent(String(did).split('/').pop() || '').trim() || 'the file');
  // The room echo names the decider. Three people share the AOM world and
  // shared projects put two worlds' people in one thread, so an unsigned
  // "Approved X." leaves the room guessing (and the agent assuming Patrik).
  const who = reviewer.label;
  if (act === 'approve') {
    messageType = 'review_approved';
    message = `${who} approved "${displayName}".`;
  } else if (act === 'request-changes') {
    const notesText = clean(notes, 1000);
    messageType = 'review_request_changes';
    message = notesText
      ? `${who} requested changes on "${displayName}": ${notesText}`
      : `${who} requested changes on "${displayName}".`;
  } else if (act === 'dismiss') {
    messageType = 'review_dismissed';
    message = `${who} dismissed "${displayName}" from review.`;
  } else if (act === 'send-checklist') {
    messageType = 'review_checklist_sent';
    message = checklist ? clean(checklist, 2000) : `${who} sent a checklist for "${displayName}".`;
  }

  try {
    // The project slug is derived from the deliverable path (…/projects/<slug>/…)
    // when the caller doesn't pass one explicitly.
    const pathMatch = did.match(/projects\/([a-z0-9][a-z0-9-_.]*)\//i);
    let projectSlug = clean(req.body.project, 80) || (pathMatch ? pathMatch[1] : null);

    // ONE verdict, and each surface keeps the failure mode it already had:
    //   request-changes -> REFUSE (403). It creates a task; a task that runs in
    //                      the wrong checkout is the vulnerability, and this
    //                      branch already 500s when the task can't be queued, so
    //                      the UI is built to surface the failure and keep the item.
    //   everything else -> DROP the tag. Those branches only record a message
    //                      row, and a review decision must never vanish.
    if (projectSlug) {
      const verdict = await authorizeProject({ world: worldId, projectSlug });
      if (!verdict.ok) {
        console.warn(
          `[review-decision] project scope DENIED: world "${worldId}" slug "${projectSlug}": ${verdict.reason}`,
        );
        if (act === 'request-changes') {
          return res.status(403).json({
            error: `This world cannot queue work in project "${projectSlug}": ${verdict.reason}`,
            code: 'PROJECT_SCOPE_DENIED',
          });
        }
        projectSlug = null;
      }
    }

    // request-changes: create the work item FIRST. If it can't be queued, the
    // decision must NOT be recorded (else the item vanishes from the queue with
    // no task chasing the fix). The UI sees the 500 and keeps the item.
    let taskId = null;
    if (act === 'request-changes') {
      const t = await createReviewTask({
        world: worldId,
        project: projectSlug,
        mission,
        title,
        deliverableId: did,
        sourcePath,
        sha256,
        notes: clean(notes, 1000) || null,
        reviewer,
      });
      if (t.error) {
        console.error('[review-decision] task insert failed:', t.error);
        return res.status(500).json({ error: `Failed to queue the fix task: ${t.error}` });
      }
      taskId = t.id;
    }

    // Emit the decision as a message so it appears in chat/notifications, and so
    // review-queue.js can suppress the decided item. Spoken by Corner (assistant
    // role) so the round table does not try to answer it.
    const decidedAt = new Date().toISOString();
    const metadata = {
      message_type: messageType,
      deliverable_id: did,
      action: act,
      decided_by: reviewer.name,
      decided_by_user_id: reviewer.userId,
      ...(reviewer.identified ? {} : { unattributed: true }),
      notes: act === 'request-changes' ? clean(notes, 1000) : null,
      checklist: act === 'send-checklist' ? clean(checklist, 2000) : null,
      decided_at: decidedAt,
      // Content identity of the decided item. review-queue.js keys its
      // decidedContent suppression on source_path + sha256 together.
      source_path: sourcePath,
      sha256,
      mission,
      project: projectSlug,
      // mission_slug routes this decision card into the MISSION room's thread.
      // one-write-path R8: canonical composite, never a raw passthrough.
      ...(mission ? { mission_slug: canonicalizeMissionSlug(mission, MISSION_SLUG_LOOKUP, projectSlug) } : {}),
      title,
      ...(taskId ? { task_id: taskId } : {}),
    };

    let decisionId;
    try {
      decisionId = await convexMutation('messages:send', {
        roomId: decisionRoomId(worldId, projectSlug, mission),
        clientId: worldId,
        text: message,
        role: 'assistant',
        agentSlug: clean(req.body.agent, 80) || 'corner',
        source: 'review-decision',
        // Verified identity, not body-supplied. Both stay empty when the JWT
        // can't be resolved to a person; an unattributed decision reads as one.
        userId: reviewer.userId || undefined,
        userEmail: reviewer.email || undefined,
        userName: reviewer.name || undefined,
      });
      await convexMutation('messages:patchMetadata', { messageId: decisionId, patch: metadata });
    } catch (error) {
      console.error('[review-decision] Convex insert error:', error);
      return res.status(500).json({ error: 'Failed to record decision' });
    }

    return res.status(200).json({
      ok: true,
      action: act,
      deliverable: did,
      message,
      // The decision row's id. The client's "Undo" for a dismiss targets this.
      decision_id: decisionId,
      ...(taskId ? { task_id: taskId } : {}),
    });
  } catch (e) {
    console.error('[review-decision] Exception:', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
