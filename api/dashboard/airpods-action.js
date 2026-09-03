// POST /api/dashboard/airpods-action
// Authenticated, tenant-scoped action broker for the global CV6 voice runtime.
// The model may request only allowlisted operations; this endpoint owns authority,
// idempotency, speaker attribution, project scope, and the durable audit record.
//
// corner:retire-supabase (2026-09-03): every read and write is a Convex call.
//   tasks            -> tasks:find / tasks:get / tasks:queue / tasks:update
//   roster           -> agents:listStatus
//   rooms            -> rooms:listRooms, projects:list
//   room activity    -> messages:listSince, messages:getThread
//   start work       -> messages:send
//   audit record     -> airpods:recordAction / airpods:setActionResult
//   attention        -> state (kind airpods_attention) + airpods:handleAttention
// Project scope is projects:hasAccess (holder world or a grant). A task never
// gets a project that is not registered and reachable, because the project
// steers which checkout the runner uses.

import crypto from 'crypto';
import { verifyTenant, verifyProjectAccess, TenantAuthError } from '../_lib/verifyTenant.js';
import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' };
import {
  AIRPODS_ALLOWED_ACTIONS,
  authorityForAction,
  cleanArguments,
  idempotencyKey,
  resolveRoomCandidate,
  signConfirmation,
  verifyConfirmation,
} from '../_lib/airpods.js';
import { convexQuery, convexMutation } from '../_lib/reportsStore.js';
import { ATTENTION_STATE_KIND, readAttentionState } from './airpods-attention.js';

const CONFIRM_SECRET = process.env.AIRPODS_CONFIRMATION_SECRET || process.env.CORNER_INGEST_SECRET || '';

const ACTIVE_TASK = new Set(['queued', 'running', 'building']);
const BLOCKED_TASK = new Set(['blocked', 'failed', 'needs_input']);

function uiTool(tool) {
  const map = {
    rooms: 'chat', email: 'support', files: 'organize', scribe: 'livescribe',
    'background work': 'workers', background: 'workers',
  };
  return map[String(tool || '').trim().toLowerCase()] || String(tool || 'home').trim().toLowerCase();
}

function iso(ms) {
  return typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

// Every task in a world, newest first. The queue is small enough to read whole
// and filter here; it keeps one round trip per status question.
async function allTasks(tenant) {
  const rows = await convexQuery('tasks:find', { client_id: tenant, order: 'created_at.desc', limit: 300 });
  return Array.isArray(rows) ? rows : [];
}

async function findTask(tenant, taskId) {
  const task = await convexQuery('tasks:get', { id: taskId });
  if (!task || task.client_id !== tenant) return null;
  return task;
}

// Is this world allowed to reach this project? Holder world or a grant.
async function projectVerdict(project, tenant) {
  try {
    const verdict = await convexQuery('projects:hasAccess', { slug: project, worldId: tenant });
    return verdict && verdict.ok ? { ok: true, via: verdict.role || 'access' } : { ok: false, reason: 'not reachable from this world' };
  } catch (error) {
    return { ok: false, reason: String(error?.message || error) };
  }
}

function taskScopeDenialMessage({ clientId, projectSlug, reason }) {
  return (
    `forbidden: world "${clientId}" may not queue work under project "${projectSlug}": ${reason}. ` +
    `A queued task runs a brief inside that project's checkout, so the project must be one this world already reaches.`
  );
}

async function workspaceStatus(tenant) {
  const [tasks, roster] = await Promise.all([allTasks(tenant), convexQuery('agents:listStatus', { worldId: tenant })]);
  const open = tasks.filter((task) => task.status !== 'done').slice(0, 20);
  const active = open.filter((task) => ACTIVE_TASK.has(task.status));
  const allBlockers = open.filter((task) => BLOCKED_TASK.has(task.status));
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60_000;
  const blockers = allBlockers.filter((task) => new Date(task.created_at || 0).getTime() >= recentCutoff).slice(0, 6);
  const seenPriorityTitles = new Set();
  const priorities = [...active, ...blockers]
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .filter((task) => {
      const key = String(task.title || task.id).trim().toLowerCase();
      if (seenPriorityTitles.has(key)) return false;
      seenPriorityTitles.add(key);
      return true;
    })
    .slice(0, 3)
    .map((task) => ({
      task_id: task.id,
      title: task.title,
      status: task.status,
      agent: task.agent || null,
      recorded_error: task.error || null,
      created_at: task.created_at,
      next_read: { action: 'read_task_status', arguments: { task_id: task.id } },
    }));
  const completed = tasks.filter((task) => task.status === 'done' && task.completed_at)
    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))
    .slice(0, 5)
    .map((task) => ({ id: task.id, title: task.title, agent: task.agent, completed_at: task.completed_at }));
  const agents = (Array.isArray(roster) ? roster : [])
    .filter((agent) => agent.status && agent.status !== 'idle')
    .map((agent) => ({ slug: agent.slug, status: agent.status, current_task: agent.currentTask, updated_at: iso(agent.updatedAt) }));
  return {
    active,
    blockers,
    priorities,
    older_attention_count: Math.max(0, allBlockers.length - blockers.length),
    completed,
    agents,
    checked_at: new Date().toISOString(),
  };
}

// The latest priority from the last workspace read of this session. Convex
// keeps action rows by session but has no query over them, so the answer is
// recomputed live from the queue instead of read back from the audit log.
async function recoverLatestPriorityTaskId(tenant) {
  const status = await workspaceStatus(tenant);
  return status.priorities[0]?.task_id || null;
}

async function readTaskStatus(args, tenant) {
  const suppliedTaskId = String(args.task_id || '').trim();
  let taskId = /^[0-9a-f-]{36}$/i.test(suppliedTaskId) ? suppliedTaskId : await recoverLatestPriorityTaskId(tenant);
  if (!taskId) throw new Error('A valid task_id is required');
  let task = await findTask(tenant, taskId);
  if (!task) {
    const recoveredTaskId = await recoverLatestPriorityTaskId(tenant);
    if (recoveredTaskId && recoveredTaskId !== taskId) {
      taskId = recoveredTaskId;
      task = await findTask(tenant, taskId);
    }
  }
  if (!task) throw new Error('Task not found in this workspace');
  const reason = String(task.error || '').trim();
  // A zombie repo LOCK is repairable by exactly the same requeue as a missing
  // repo path. The words below are what the runner writes for either.
  const repairableScope = task.status === 'failed' && /metadata\.repo|repositor|repo lock|project_path|working path|never (?:got )?claimed|not been claimed|without being claimed|runner (?:dead|died)/i.test(reason);
  // The raw `error` column stays in recorded_error for the audit rules that
  // quote it exactly; the SPOKEN layer describes it instead of reading a
  // database column aloud.
  return {
    ok: true,
    spoken_summary: reason
      ? `${task.title || 'That task'} ${task.status === 'failed' ? 'failed' : `is ${task.status}`}${task.agent ? `, and it is ${task.agent}'s` : ''}. What the system recorded: ${reason}.`
      : `${task.title || 'The task'} is ${task.status}, and nothing was recorded about why.`,
    recorded_error: reason || null,
    resolved_from: taskId === suppliedTaskId ? 'task_id' : 'latest_workspace_priority',
    response_contract: repairableScope
      ? `Explain in your own words what went wrong and what it means, keeping the recorded cause accurate, then ask once whether to repair and retry it. Do not read the raw error string aloud as if it were a sentence. Never hedge the diagnosis: no "it looks like", "seems like", or "well". You inspected the record, so state what it says.`
      : 'Explain the cause in your own natural words, keeping every recorded fact accurate. Do not read the raw error string verbatim, and do not add a question.',
    next_action: repairableScope ? {
      action: 'retry_task',
      title: `Repair and retry ${task.title || 'task'}`,
      summary: 'Set the authorized repository path and requeue this existing task.',
      arguments: { task_id: task.id },
      requires_user_approval: true,
    } : null,
    task,
    entities: [{ type: 'task', id: task.id, title: task.title || null, status: task.status, agent: task.agent || null }],
  };
}

function activityTerms(value) {
  return String(value || '').toLowerCase().match(/[a-z0-9]+/g)?.filter((term) => term.length > 1).slice(0, 12) || [];
}

// A Convex message row (from messages:listSince) in the shape the activity
// scorer reads: agent, project, mission slug, source, timestamp.
function shapeActivityMessage(row) {
  const parts = String(row.legacyRoomId || '').split(':');
  const kind = parts[1] || row.roomKind || '';
  let mission = String(row.metadata?.mission_slug || '').trim();
  if (!mission && kind === 'mission' && parts.length >= 4) mission = `${parts[2]}:${parts.slice(3).join(':')}`;
  return {
    id: row._id,
    agent: row.agentSlug || null,
    project: row.project || (kind === 'project' ? parts.slice(2).join(':') : null),
    role: row.role,
    text: row.text,
    timestamp: iso(row.createdAt),
    source: row.source,
    metadata: { ...(row.metadata || {}), ...(mission ? { mission_slug: mission } : {}) },
    user_name: row.userName || null,
    room_agent: kind === 'agent' ? parts.slice(2).join(':') : null,
  };
}

function roomLabel(message) {
  const mission = String(message?.metadata?.mission_slug || '').trim();
  if (mission) return { room_key: `mission:${mission}`, room_name: mission };
  if (message?.project) return { room_key: `project:${message.project}`, room_name: String(message.project) };
  const agent = message?.room_agent || message?.agent || 'corner';
  return { room_key: `agent:${agent}`, room_name: String(agent) };
}

// A proposal card is only useful if the task it would create is well-formed.
// create_task REQUIRES project + mission_slug, so the scope has to be carried
// out of the record the evidence came from instead of being invented later.
function roomTaskScope(message) {
  const mission = String(message?.metadata?.mission_slug || '').trim();
  const project = String(message?.project || '').trim();
  if (mission.includes(':')) {
    const [scopeProject, ...rest] = mission.split(':');
    return { project: scopeProject, mission_slug: rest.join(':') };
  }
  if (project && mission) return { project, mission_slug: mission };
  if (project) return { project, mission_slug: null };
  return { project: null, mission_slug: null };
}

function activityScore(message, terms, phrase = '') {
  if (!terms.length) return 1;
  const haystack = [message?.text, message?.agent, message?.project, message?.source, message?.metadata?.mission_slug]
    .filter(Boolean).join(' ').toLowerCase();
  const termScore = terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
  // A record that contains the caller's actual PHRASE is about their subject;
  // a record that merely scatters the same words usually is not.
  const phraseBonus = phrase && phrase.length > 3 && haystack.includes(phrase) ? 3 : 0;
  return termScore + phraseBonus;
}

function activityMatches(score, terms) {
  if (!terms.length) return true;
  return score >= Math.max(1, Math.ceil(terms.length / 2));
}

async function recentWorkspaceActivity(tenant, query) {
  const since = Date.now() - 30 * 24 * 60 * 60_000;
  const rows = await convexQuery('messages:listSince', { worldSlug: tenant, since, limit: 300 });
  const terms = activityTerms(query);
  const phrase = String(query || '').trim().toLowerCase();
  return (Array.isArray(rows) ? rows : [])
    .map(shapeActivityMessage)
    .filter((message) => !['voice-handoff', 'airpods-mode', 'task-ack', 'clear_context'].includes(message?.source))
    .filter((message) => !(message?.role === 'assistant' && ['room-bridge', 'share-file'].includes(message?.source)))
    .map((message) => ({ message, score: activityScore(message, terms, phrase) }))
    .filter(({ score }) => activityMatches(score, terms))
    .sort((a, b) => b.score - a.score || String(b.message.timestamp || '').localeCompare(String(a.message.timestamp || '')))
    .slice(0, 12)
    .map(({ message, score }) => {
      const room = roomLabel(message);
      return {
        source_type: 'corner_room', source_label: `${room.room_name} room`,
        room_key: room.room_key, room_name: room.room_name, timestamp: message.timestamp || null,
        author: message.role === 'user' ? (message.user_name || 'Workspace member') : (message.agent || 'Corner agent'),
        excerpt: String(message.text || '').replace(/\s+/g, ' ').trim().slice(0, 360),
        match_score: score, task_scope: roomTaskScope(message),
      };
    });
}

async function recentGithubActivity(tenant, query) {
  // Repository access is AOM-internal: never expose it to another tenant or a
  // shared room. Report availability explicitly so voice cannot bluff a check.
  if (tenant !== 'aom') return { availability: 'not_available_for_this_workspace', items: [] };
  const token = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
  const owner = process.env.VERCEL_GIT_REPO_OWNER || 'mrg33k';
  const repo = process.env.VERCEL_GIT_REPO_SLUG || 'aom-studio';
  if (!owner || !repo) return { availability: 'not_configured', items: [] };
  try {
    const githubUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=30`;
    const requestHeaders = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    let response = await fetch(githubUrl, { headers: requestHeaders, signal: AbortSignal.timeout(5000) });
    // The repository is public, while the legacy VITE_GITHUB_TOKEN may expire.
    // Retry anonymously instead of letting a stale optional token disable a
    // source that requires no credential.
    if ((response.status === 401 || response.status === 403) && token) {
      response = await fetch(githubUrl, {
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(5000),
      });
    }
    if (!response.ok) return { availability: `unavailable_${response.status}`, items: [] };
    const terms = activityTerms(query);
    const phrase = String(query || '').trim().toLowerCase();
    const commits = await response.json();
    const items = (Array.isArray(commits) ? commits : [])
      // Our own machinery is never evidence about the outside world.
      .filter((commit) => !/corner:airpods-mode|corner:voice-chat/i.test(String(commit?.commit?.message || '')))
      .map((commit) => ({ commit, score: activityScore({ text: commit?.commit?.message }, terms, phrase) }))
      .filter(({ score }) => activityMatches(score, terms))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ commit, score }) => ({
        source_type: 'github_commit', source_label: `GitHub ${owner}/${repo}`,
        timestamp: commit?.commit?.author?.date || null,
        author: commit?.commit?.author?.name || commit?.author?.login || 'Unknown',
        excerpt: String(commit?.commit?.message || '').replace(/\s+/g, ' ').trim().slice(0, 360),
        reference: commit?.html_url || null, sha: String(commit?.sha || '').slice(0, 7),
        match_score: score,
      }));
    return { availability: 'available', items };
  } catch {
    return { availability: 'unavailable', items: [] };
  }
}

async function readRecentActivity(tenant, args) {
  const query = String(args.query || '').trim().slice(0, 240);
  const [roomItems, github] = await Promise.all([
    recentWorkspaceActivity(tenant, query),
    args.include_github === false ? Promise.resolve({ availability: 'not_requested', items: [] }) : recentGithubActivity(tenant, query),
  ]);
  // Relevance first, recency as the tie-break, so the record the answer uses
  // and the record provenance names are the same record.
  const items = [...roomItems, ...github.items]
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0)
      || String(b.timestamp || '').localeCompare(String(a.timestamp || '')))
    .slice(0, 16);
  const primary = items[0] || null;
  // The caller's clock (Phoenix) is the one being quoted back to them.
  const primaryDate = primary?.timestamp
    ? new Date(primary.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Phoenix' })
    : null;
  const appStoreQuery = /app\s*store|testflight|submit/i.test(query);
  const recordedWaitingReview = appStoreQuery && /waiting for review/i.test(primary?.excerpt || '');
  const spokenSummary = recordedWaitingReview
    ? `As of ${primaryDate || 'an unknown date'}, Corner records show Corner was submitted and recorded as Waiting for Review; live App Store status is unverified.`
    : primary
      ? `The most recent matching record in ${primary.source_label} is dated ${primaryDate || 'an unknown date'}. Describe what it says in your own words: ${primary.excerpt.slice(0, 200)}`
      : 'I did not find a matching recent record. That is not proof the event did not happen.';
  const alsoSearched = [
    primary?.source_type === 'corner_room'
      ? `GitHub ${github.availability === 'available' ? `(${github.items.length} matching commit${github.items.length === 1 ? '' : 's'}, not quoted)` : `(${github.availability.replace(/_/g, ' ')})`}`
      : `Corner room records (${roomItems.length} matching, not quoted)`,
  ].join('; ');
  const provenanceSummary = primary
    ? `The answer above comes from one record: ${primary.source_label}, dated ${primaryDate}. Also searched: ${alsoSearched}.`
    : `Checked Corner room records and GitHub; neither returned a matching record.`;
  const externalSystem = /app\s*store|testflight/i.test(query) ? 'App Store Connect'
    : /vercel|deploy(ment)?\b/i.test(query) ? 'the Vercel deployment'
    : /gmail|email|inbox/i.test(query) ? 'the mailbox'
    : null;
  const proposalScope = items.find((item) => item.task_scope?.project && item.task_scope?.mission_slug)?.task_scope || null;
  const externalVerification = externalSystem && proposalScope ? {
    action: 'create_task',
    title: `Verify live ${externalSystem} status`,
    summary: `Queue a task that checks ${externalSystem} directly and reports the current status back.`,
    arguments: {
      title: `Verify live ${externalSystem} status for: ${query}`,
      description: `Check ${externalSystem} directly and report the current status. Corner records only show what was written down on ${primaryDate || 'an earlier date'}, which is not proof of the live state.`,
      project: proposalScope.project,
      mission_slug: proposalScope.mission_slug,
    },
    requires_user_approval: true,
  } : null;
  return {
    ok: true, query, checked_at: new Date().toISOString(),
    sources: { corner_rooms: 'available', github: github.availability }, items,
    primary_record: primary ? { ...primary, calendar_date: primaryDate } : null,
    provenance_summary: provenanceSummary,
    evidence_used: primary ? { source_label: primary.source_label, calendar_date: primaryDate, room_key: primary.room_key || null, reference: primary.reference || null } : null,
    next_action: externalVerification,
    spoken_summary: spokenSummary,
    response_contract: primary
      ? `Answer from primary_record in your own natural spoken words, at whatever length the question deserves. You MUST say the phrase "Corner records" (or name the source label), MUST say the explicit calendar_date, and MUST say that the live external status is unverified whenever the question is about an external system such as the App Store. Cite ONLY the source named in evidence_used: never name a source you did not quote. Never read the raw excerpt aloud, never use a relative date, and never claim live external state. End on a period. Do not ask a follow-up question, do not offer to "look into" anything, and do not append an invitation such as "anything specific" or "anything else".${externalVerification ? ' If the caller asks what you can do next, you MUST call offer_next_action with the exact action and arguments from next_action IN THE SAME TURN. Speaking the offer without that call puts no approval card on their screen, so nothing can happen: it is a failed turn, not a polite one.' : ''}`
      : 'State that no matching record was found and that this does not prove the event did not happen. End on a period. Do not ask a follow-up question and do not append an invitation.',
  };
}

function roomCandidate({ key, name, type, slug, project, room, aliases = [] }) {
  return { room_key: key, room_name: name, room_type: type, slug, project: project || null, room, aliases };
}

async function roomDirectory(tenant) {
  const [projects, roster, rooms] = await Promise.all([
    convexQuery('projects:list', { worldSlug: tenant, activeOnly: true }).catch(() => []),
    convexQuery('agents:listStatus', { worldId: tenant }).catch(() => []),
    convexQuery('rooms:listRooms', { worldId: tenant, filter: 'all' }).catch(() => []),
  ]);
  const directory = new Map();
  const add = (candidate) => { if (candidate?.room_key) directory.set(candidate.room_key, candidate); };

  for (const project of Array.isArray(projects) ? projects : []) {
    if (!project?.slug) continue;
    const name = project.name || project.slug;
    add(roomCandidate({
      key: `project:${project.slug}`, name, type: 'project', slug: project.slug,
      room: { id: project.slug, name, isProject: true }, aliases: [project.slug],
    }));
  }
  for (const agent of Array.isArray(roster) ? roster : []) {
    if (!agent?.slug) continue;
    const name = agent.title || agent.slug;
    add(roomCandidate({
      key: `agent:${agent.slug}`, name, type: 'agent', slug: agent.slug,
      room: { id: agent.slug, name }, aliases: [agent.slug],
    }));
  }
  for (const room of Array.isArray(rooms) ? rooms : []) {
    const parts = String(room.legacyRoomId || '').split(':');
    if (room.kind === 'project' && room.project && !directory.has(`project:${room.project}`)) {
      add(roomCandidate({
        key: `project:${room.project}`, name: room.title || room.project, type: 'project', slug: room.project,
        room: { id: room.project, name: room.title || room.project, isProject: true }, aliases: [room.project],
      }));
    } else if (room.kind === 'mission') {
      const project = room.project || (parts.length >= 4 ? parts[2] : '');
      const bare = parts.length >= 4 ? parts.slice(3).join(':') : (parts[2] || '');
      if (!project || !bare) continue;
      const fullSlug = `${project}:${bare}`;
      const name = room.title || bare;
      add(roomCandidate({
        key: `mission:${fullSlug}`, name, type: 'mission', slug: fullSlug, project,
        room: { id: bare, name, isMission: true, missionSlug: fullSlug, projectSlug: project },
        aliases: [bare, fullSlug, `${project} ${name}`],
      }));
    } else if (room.kind === 'agent' && room.specialist && !directory.has(`agent:${room.specialist}`)) {
      add(roomCandidate({
        key: `agent:${room.specialist}`, name: room.title || room.specialist, type: 'agent', slug: room.specialist,
        room: { id: room.specialist, name: room.title || room.specialist }, aliases: [room.specialist],
      }));
    }
  }
  if (tenant === 'aom') {
    for (const mission of missionsRegistry?.missions || []) {
      if (!mission?.slug || mission.is_done || mission.status === 'archived') continue;
      const project = mission.project_slug || String(mission.slug).split(':')[0];
      const fullSlug = String(mission.slug).includes(':') ? String(mission.slug) : `${project}:${mission.slug}`;
      const bare = fullSlug.slice(fullSlug.indexOf(':') + 1);
      const name = mission.name || mission.raw_slug || bare;
      if (directory.has(`mission:${fullSlug}`)) continue;
      add(roomCandidate({
        key: `mission:${fullSlug}`, name, type: 'mission', slug: fullSlug, project,
        room: { id: bare, name, isMission: true, missionSlug: fullSlug, projectSlug: project, path: mission.path || null },
        aliases: [bare, fullSlug, `${project} ${name}`],
      }));
    }
  }
  return [...directory.values()];
}

async function resolveRoom(args, tenant) {
  const resolution = resolveRoomCandidate(await roomDirectory(tenant), args);
  if (resolution.resolved) return { ok: true, room: resolution.resolved };
  const count = resolution.candidates.length;
  return {
    ok: true,
    resolved: false,
    needs_clarification: true,
    reason: resolution.reason,
    candidates: resolution.candidates,
    spoken_summary: count
      ? `I found ${count} possible rooms. Which one do you mean?`
      : 'I could not find that room. Try its project, mission, or agent name.',
  };
}

// The Convex room key for a directory match.
function convexRoomKey(tenant, match) {
  if (match.room_type === 'mission') {
    const [project, ...rest] = String(match.slug).split(':');
    return `${tenant}:mission:${project}:${rest.join(':')}`;
  }
  if (match.room_type === 'project') return `${tenant}:project:${match.slug}`;
  return `${tenant}:agent:${match.slug}`;
}

async function readRoomStatus(args, tenant) {
  const resolution = await resolveRoom(args, tenant);
  if (!resolution.room) return resolution;
  const match = resolution.room;
  const [tasks, thread] = await Promise.all([
    allTasks(tenant),
    convexQuery('messages:getThread', { roomId: convexRoomKey(tenant, match), limit: 20 }).catch(() => []),
  ]);
  let open = tasks.filter((task) => task.status !== 'done');
  if (match.room_type === 'agent') {
    open = open.filter((task) => task.agent === match.slug).slice(0, 12);
  } else {
    const project = match.project || match.slug;
    open = open.filter((task) => task.project === project).slice(0, 30);
    if (match.room_type === 'mission') {
      const bare = match.slug.split(':').pop();
      open = open.filter((task) => [match.slug, bare].includes(String(task.metadata?.mission_slug || '')));
    }
  }
  const recent = (Array.isArray(thread) ? thread : []).slice(-6).reverse().map((message) => ({
    role: message.role || (message.agentSlug ? 'assistant' : 'user'),
    author: message.userName || message.agentSlug || null,
    text: String(message.text || '').slice(0, 500),
    at: iso(message.createdAt),
  }));
  return {
    ok: true, resolved: true, room_key: match.room_key,
    spoken_summary: `${match.room_name} has ${open.length} active item${open.length === 1 ? '' : 's'}${recent.length ? ` and ${recent.length} recent update${recent.length === 1 ? '' : 's'}` : ''}.`,
    room: { room_key: match.room_key, room_name: match.room_name, room_type: match.room_type, project: match.project },
    active_tasks: open.slice(0, 12), recent_updates: recent,
  };
}

async function createTask(args, identity) {
  const project = String(args.project || '').trim();
  const missionSlug = String(args.mission_slug || '').trim();
  const title = String(args.title || '').trim().slice(0, 240);
  if (!project || !missionSlug || !title) throw new Error('title, project, and mission_slug are required');
  const verdict = await projectVerdict(project, identity.tenant);
  if (!verdict.ok) throw new Error(taskScopeDenialMessage({ clientId: identity.tenant, projectSlug: project, reason: verdict.reason }));
  const projectRow = await convexQuery('projects:lookupBySlug', { slug: project, worldId: identity.tenant });
  if (!projectRow) throw new Error('Authorized project record not found');
  const task = await convexMutation('tasks:queue', {
    row: {
      title,
      text: String(args.description || title).trim(),
      description: String(args.description || title).trim(),
      status: 'queued',
      source: 'airpods-mode',
      client_id: identity.tenant,
      created_by: identity.userId || undefined,
      project,
      project_path: projectRow.repoPath || '',
      ...(args.agent ? { agent: String(args.agent).trim() } : {}),
      metadata: {
        mission_slug: missionSlug,
        repo: projectRow.slug,
        created_via: 'airpods-mode',
        requested_by_name: identity.userName || null,
        requested_by_email: identity.email || null,
      },
    },
  });
  return {
    ok: true,
    spoken_summary: `Queued ${title}.`,
    entities: [{ type: 'task', id: task?.id, title, project, mission_slug: missionSlug }],
    ui_effect: { type: 'open_room', room: { id: missionSlug, name: title, isMission: true, missionSlug, projectSlug: project } },
  };
}

async function startWork(args, req, tenant, identity, sessionId) {
  const instruction = String(args.instruction || '').trim();
  if (!instruction) throw new Error('instruction is required');
  let project = String(args.project || '').trim() || null;
  if (project) await verifyProjectAccess(project, req);
  const agent = String(args.agent || 'corner').trim() || 'corner';
  const mission = String(args.mission_slug || '').trim() || null;
  // A project this world cannot reach drops its scope and the message still
  // lands in the agent room. A denied scope must not steer a room.
  if (project && !(await projectVerdict(project, tenant)).ok) project = null;
  const roomId = mission && project
    ? `${tenant}:mission:${project}:${mission.includes(':') ? mission.slice(mission.indexOf(':') + 1) : mission}`
    : project ? `${tenant}:project:${project}` : `${tenant}:agent:${agent}`;
  const messageId = await convexMutation('messages:send', {
    roomId,
    text: instruction,
    role: 'user',
    source: 'airpods-mode',
    clientId: tenant,
    userId: identity.userId || undefined,
    userEmail: identity.email || undefined,
    userName: identity.userName || undefined,
    metadata: { airpods_session_id: sessionId, interaction_mode: 'work', ...(mission && project ? { mission_slug: mission } : {}) },
  });
  return {
    ok: true,
    spoken_summary: 'I sent that to the room and work is starting.',
    entities: [{ type: 'message', id: messageId }],
    ui_effect: project
      ? { type: 'open_room', room: mission
        ? { id: mission, name: mission, isMission: true, missionSlug: mission, projectSlug: project }
        : { id: project, name: project, isProject: true } }
      : { type: 'open_room', room: { id: agent, name: agent } },
  };
}

async function manageAttention(args, tenant) {
  const ids = Array.isArray(args.item_ids) ? args.item_ids.filter(Boolean).map(String).slice(0, 50) : [];
  if (!ids.length) throw new Error('item_ids required');
  const operation = args.operation === 'snooze' ? 'snooze' : 'acknowledge';
  const now = new Date().toISOString();
  const marks = await readAttentionState(tenant);
  for (const id of ids) {
    marks[id] = operation === 'snooze'
      ? { status: 'snoozed', snoozed_until: new Date(Date.now() + Math.max(1, Number(args.minutes) || 15) * 60_000).toISOString(), at: now }
      : { status: 'acknowledged', at: now };
    // A durable Convex attention row is also marked handled on the row itself.
    if (operation === 'acknowledge') {
      try { await convexMutation('airpods:handleAttention', { id }); } catch { /* task-derived id, not a row */ }
    }
  }
  // Keep the map from growing forever: drop marks older than seven days.
  const cutoff = Date.now() - 7 * 24 * 60 * 60_000;
  for (const [id, mark] of Object.entries(marks)) {
    const at = Date.parse(mark?.at || '');
    if (Number.isFinite(at) && at < cutoff) delete marks[id];
  }
  await convexMutation('state:put', { kind: ATTENTION_STATE_KIND, scopeId: '', worldId: tenant, value: marks, updatedBy: 'airpods-action' });
  return { ok: true, spoken_summary: operation === 'snooze' ? 'I will bring those back later.' : 'Got it. Those are cleared.' };
}

async function reassignTask(args, tenant) {
  const taskId = String(args.task_id || '').trim();
  const agent = String(args.agent || '').trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(taskId) || !agent) throw new Error('task_id and agent are required');
  const [task, roster] = await Promise.all([findTask(tenant, taskId), convexQuery('agents:listStatus', { worldId: tenant })]);
  if (!task) throw new Error('Task not found in this workspace');
  const target = (Array.isArray(roster) ? roster : []).find((row) => row.slug === agent);
  if (!target) throw new Error('Agent not found in this workspace');
  const rows = await convexMutation('tasks:update', { id: taskId, patch: { agent } });
  const updated = Array.isArray(rows) ? rows[0] : rows;
  return {
    ok: true,
    spoken_summary: `Reassigned ${task.title || task.text || 'the task'} to ${target.title || agent}.`,
    entities: [{ type: 'task', id: taskId, title: task.title || task.text || null, agent }],
    task: updated || { ...task, agent },
  };
}

async function retryTask(args, tenant) {
  const taskId = String(args.task_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) throw new Error('A valid task_id is required');
  const task = await findTask(tenant, taskId);
  if (!task) throw new Error('Task not found in this workspace');
  if (!task.project) throw new Error('Task has no project, so Corner cannot choose an execution repository safely');
  const verdict = await projectVerdict(task.project, tenant);
  if (!verdict.ok) throw new Error(taskScopeDenialMessage({ clientId: tenant, projectSlug: task.project, reason: verdict.reason }));
  const project = await convexQuery('projects:lookupBySlug', { slug: task.project, worldId: tenant });
  if (!project) throw new Error('Authorized project record not found');
  const rows = await convexMutation('tasks:update', {
    id: taskId,
    patch: { status: 'queued', error: null, completed_at: null, project_path: project.repoPath || '', metadata: { repo: project.slug, retried_via: 'airpods-mode' } },
  });
  return {
    ok: true,
    spoken_summary: `Repaired the execution scope and requeued ${task.title || 'the task'} for ${task.agent || 'its assigned agent'}.`,
    task: Array.isArray(rows) ? rows[0] : rows,
    entities: [{ type: 'task', id: taskId, title: task.title || null, status: 'queued', agent: task.agent || null }],
  };
}

async function execute(action, args, req, tenant, identity, sessionId) {
  if (action === 'read_workspace_status') {
    // The row data goes back untouched under `status`. The summary is a
    // sentence a person would say, and the contract constrains the FACTS
    // rather than the WORDS.
    const status = await workspaceStatus(tenant);
    const spokenPriorities = status.priorities.slice(0, 2);
    const humanAge = (isoValue) => {
      const ms = Date.now() - new Date(isoValue || 0).getTime();
      if (!isoValue || Number.isNaN(ms)) return null;
      const hours = ms / 3_600_000;
      if (hours < 1) return 'in the last hour';
      if (hours < 24) return `${Math.round(hours)} hours ago`;
      const days = Math.round(hours / 24);
      return days === 1 ? 'yesterday' : `${days} days ago`;
    };
    const STATUS_WORDS = {
      failed: 'failed', blocked: 'is blocked', needs_input: 'is waiting on you',
      queued: 'is still queued', running: 'is running', building: 'is building',
    };
    // Cut a dumped title at the first structural separator a human would
    // never say out loud, and cap the tail.
    const spokenTitle = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return 'an untitled task';
      const head = raw.split(/\s+[:—–-]\s+|:\s+/)[0].trim();
      const base = head.split(/\s+/).length >= 2 ? head : raw;
      const words = base.split(/\s+/).slice(0, 9).join(' ');
      return words.replace(/[\s—–:,;-]+$/, '');
    };
    const describe = (task) => {
      const who = task.agent ? `${task.agent}'s ` : '';
      const what = STATUS_WORDS[task.status] || `is ${task.status}`;
      const when = humanAge(task.created_at);
      return `${who}${spokenTitle(task.title)} ${what}${when ? `, started ${when}` : ''}`;
    };
    const prioritySummary = spokenPriorities.length
      ? `${spokenPriorities.length === 1 ? 'One thing needs you' : `${spokenPriorities.length} things need you`}: ${spokenPriorities.map(describe).join(', and ')}`
      : 'Nothing is waiting on you right now';
    return {
      ok: true,
      spoken_summary: `${prioritySummary}.`,
      checked_at: status.checked_at,
      response_contract: 'Say these priorities in your own natural spoken sentence. Keep every fact, the names, who owns them, and how long they have been sitting, but do not read the summary back word for word, do not read totals or older backlog, and do not ask a follow-up question. Never hedge: no "it looks like", "seems like", "well", or "my bad". State it.',
      status: {
        priorities: status.priorities,
        older_attention_count: status.older_attention_count,
        checked_at: status.checked_at,
      },
    };
  }
  if (action === 'read_recent_activity') return readRecentActivity(tenant, args);
  if (action === 'read_task_status') return readTaskStatus(args, tenant);
  if (action === 'list_rooms') {
    const rooms = (await roomDirectory(tenant)).slice(0, 240).map((room) => ({ room_key: room.room_key, room_name: room.room_name, room_type: room.room_type, project: room.project }));
    return { ok: true, spoken_summary: `I found ${rooms.length} rooms in this workspace.`, rooms };
  }
  if (action === 'open_tool' || action === 'navigate') {
    const target = uiTool(args.tool || args.target);
    const allowed = new Set(['home', 'chat', 'support', 'organize', 'command', 'tracker', 'livescribe', 'settings', 'workers']);
    if (!allowed.has(target)) throw new Error('That CV6 tool is not available');
    return { ok: true, spoken_summary: `Opening ${args.tool || args.target}.`, ui_effect: { type: 'navigate', target, request_id: crypto.randomUUID() } };
  }
  if (action === 'close_room') {
    let room = null;
    if (args.room_key || args.query || args.room_query) {
      const resolution = await resolveRoom(args, tenant);
      if (!resolution.room) return resolution;
      room = resolution.room.room;
    }
    return {
      ok: true,
      spoken_summary: room ? `Closing ${room.name || 'that room'}.` : 'Closing the current room.',
      ui_effect: { type: 'close_room', room, request_id: crypto.randomUUID() },
    };
  }
  if (action === 'find_rooms') {
    const resolution = await resolveRoom(args, tenant);
    if (resolution.room) {
      return { ok: true, resolved: true, candidates: [{ room_key: resolution.room.room_key, room_name: resolution.room.room_name, room_type: resolution.room.room_type, project: resolution.room.project }], spoken_summary: `I found ${resolution.room.room_name}.` };
    }
    return resolution;
  }
  if (action === 'read_room_status') return readRoomStatus(args, tenant);
  if (action === 'open_room') {
    const resolution = await resolveRoom(args, tenant);
    if (!resolution.room) return resolution;
    const match = resolution.room;
    if (match.room_type === 'project') await verifyProjectAccess(match.slug, req);
    if (match.room_type === 'mission') await verifyProjectAccess(match.project, req);
    return {
      ok: true, resolved: true, room_key: match.room_key,
      spoken_summary: `Opening ${match.room_name}.`,
      ui_effect: { type: 'open_room', room: match.room, request_id: crypto.randomUUID() },
    };
  }
  if (action === 'create_task') return createTask(args, identity);
  if (action === 'reassign_task') return reassignTask(args, tenant);
  if (action === 'retry_task') return retryTask(args, tenant);
  if (action === 'start_work') return startWork(args, req, tenant, identity, sessionId);
  if (action === 'manage_attention') return manageAttention(args, tenant);
  if (action === 'end_voice_session') return { ok: true, closing: true, spoken_summary: 'Ending the voice session now.' };
  throw new Error('Action is allowlisted but has no executor');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body || {};
  const action = String(body.action || '').trim();
  const args = cleanArguments(body.arguments);
  const requestedTenant = String(body.client_id || '').trim().toLowerCase();
  if (!requestedTenant || !action) return res.status(400).json({ error: 'client_id and action required' });

  let identity;
  try { identity = await verifyTenant(requestedTenant, req); }
  catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message });
    throw error;
  }
  // Rooms, tasks and rosters live in a world; a shared room resolves to the
  // caller's own world on Convex.
  if (String(identity.tenant).startsWith('shared:') && identity.world) identity = { ...identity, tenant: identity.world };

  if (action === 'confirm_consequential_action') {
    const payload = verifyConfirmation(args.confirmation_token, CONFIRM_SECRET);
    if (!payload || payload.worldId !== identity.tenant || payload.userId !== identity.userId) return res.status(400).json({ error: 'Confirmation expired or invalid' });
    if (args.confirmed !== true) return res.status(200).json({ ok: true, refused: true, spoken_summary: 'Okay, I did not do that.' });
    return res.status(501).json({ error: 'That consequential executor is not enabled in AirPods mode yet; nothing changed.' });
  }

  if (!AIRPODS_ALLOWED_ACTIONS.has(action)) return res.status(400).json({ error: `Action not allowed: ${action}` });
  const sessionId = String(body.session_id || '').trim() || null;
  const authority = authorityForAction(action);
  // Fresh reads get a unique audit entry rather than a replayed answer. That
  // preserves current state and keeps the conversation/action join complete.
  const freshReads = new Set(['read_workspace_status', 'read_recent_activity', 'read_task_status', 'list_rooms', 'find_rooms', 'read_room_status']);
  const callerKey = freshReads.has(action)
    ? `fresh:${action}:${crypto.randomUUID()}`
    : idempotencyKey({ supplied: body.idempotency_key, sessionId, action, args });
  // Namespace even caller-supplied keys. Replay visibility must never cross a
  // world or user boundary.
  const key = crypto.createHash('sha256')
    .update(`${identity.tenant}:${identity.userId}:${callerKey}`)
    .digest('hex');

  const audit = { session_id: sessionId, user_id: identity.userId, speaker_name: identity.userName, action, authority, arguments: args };

  try {
    if (authority === 'confirm') {
      const token = signConfirmation({ action, args, worldId: identity.tenant, userId: identity.userId, exp: Date.now() + 5 * 60_000 }, CONFIRM_SECRET);
      await convexMutation('airpods:recordAction', {
        idempotencyKey: key, worldId: identity.tenant, sessionId: sessionId || '', op: action,
        payload: { ...audit, confirmation_state: 'pending' }, result: { status: 'started' },
      });
      return res.status(200).json({ ok: false, requires_confirmation: true, confirmation_token: token, spoken_summary: `Please confirm that you want me to ${action.replaceAll('_', ' ')}.` });
    }

    // One row per key. A replay of a finished action returns its stored
    // result; a fresh key records 'started' before anything runs.
    const record = await convexMutation('airpods:recordAction', {
      idempotencyKey: key, worldId: identity.tenant, sessionId: sessionId || '', op: action,
      payload: { ...audit, confirmation_state: 'not_required' }, result: { status: 'started' },
    });
    if (record?.existing && record.result?.status === 'succeeded') {
      return res.status(200).json({ ...(record.result.result || {}), replayed: true });
    }

    const result = await execute(action, args, req, identity.tenant, identity, sessionId);

    // Confirmations are the turns where the model has nothing left to say and
    // reaches for a check-in to fill the gap. The ban belongs on the tool
    // result, next to the confirmation itself.
    const CONFIRMING = new Set([
      'create_task', 'start_work', 'reassign_task', 'retry_task',
      'open_room', 'close_room', 'open_tool', 'manage_attention',
    ]);
    if (result && result.ok !== false && CONFIRMING.has(action) && !result.response_contract) {
      result.response_contract =
        'Confirm what you just did in one short sentence and stop. Do not ask "anything else", "what next", "what are you thinking", or any other check-in. The caller will say what they want next.';
    }
    await convexMutation('airpods:setActionResult', { idempotencyKey: key, result: { status: 'succeeded', result, completed_at: new Date().toISOString() } });
    return res.status(200).json(result);
  } catch (error) {
    try { await convexMutation('airpods:setActionResult', { idempotencyKey: key, result: { status: 'failed', error: String(error?.message || error), completed_at: new Date().toISOString() } }); } catch { /* audit row itself may have failed */ }
    return res.status(500).json({ error: error?.message || 'Action failed' });
  }
}
