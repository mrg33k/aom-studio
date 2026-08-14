// cv6next — real Home data, shaped to wired/desktop/home.json + mobile/home.json.
// This is WIRING pulled from the existing dashboard plumbing (useDataPipe), NOT design.
// Returns { state, data } for the Home fill-in templates.
//
// Real sources today: agents + projects + the needs-you inbox (catchUp) all come
// from useDataPipe — the exact pipe the current dashboard already runs on. The
// conversation column's GOAL has no honest source yet (agent run goal/step/checklist
// is not exposed), so we bind it to honest empties (no fabricated steps/bullets)
// instead of leaving the design's sample text on screen. No fake data.

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';
import { useTenantContext } from '../../lib/tenantContext.jsx';
import { useDataContext } from '../providers/DataContext.jsx';
import { curateTitledAgents, titleForAgent } from './agentTitles.js';
import { normalizePreview } from './previewText.js';
import { missionRecencyKey } from './roomKeys.js';
import { isRoomActivityNoise, isMachinePreview } from './presentationClean.js';
import { fetchRoomActivity } from './roomActivity.js';

const TINTS = ['violet', 'accent', 'pink', 'teal', 'lime', 'amber'];

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// agent status (online|working|running|blocked|needs_you|away|idle) -> contract enum
// FIX D-sharp: three-state vocabulary — active (green), blocked (amber), idle (gray).
// Collapses the old live/working split into a single green "active" state with no animation.
function agentStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'online' || v === 'live' || v === 'working' || v === 'running' || v === 'active') return 'active';
  if (v === 'blocked' || v === 'needs_you' || v === 'needs you') return 'blocked';
  return 'idle';
}
function statusText(status) {
  if (status === 'active') return 'working';
  if (status === 'blocked') return 'blocked';
  return 'idle';
}
// project color (hex or css var) -> one of the 6 design tints, stable per name
function tintFor(seed) {
  let h = 0;
  for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
function cap(s) { const v = String(s || ''); return v ? v[0].toUpperCase() + v.slice(1) : ''; }
function firstLine(s) { return String(s || '').split('\n')[0].slice(0, 160); }
// Mission display name from a slug like "space-rising:deal-bank" or "deal-bank":
// drop a leading "<project>:" prefix, humanize the dashes, title-case.
function missionLabel(missionSlug) {
  const s = String(missionSlug || ''); if (!s) return '';
  const seg = s.includes(':') ? s.split(':').pop() : s;
  return seg.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
// Detect an attachment-delivery message (point is a file, not a text blurb). Conservative:
// only the explicit "Attached file:/Attachment:" signal, so a passing filename mention does
// not flip a normal message into a file card. Returns { id, name } or null.
function detectAttachment(text) {
  const m = String(text || '').match(/(?:attached file|attachment)\s*[:\-]?\s*([^\s|,]+\.[a-z0-9]{2,5})/i);
  return m ? { id: m[1], name: m[1], size: '' } : null;
}
// FIX F + qa-sweep 2026-07-17: preview derivation lives in previewText.js (pure,
// unit-tested) — "Attached file: …" → "Shared a file: name.md", raw URLs → human
// file names / hostnames.
function relTime(ts) {
  if (!ts) return '';
  const ms = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function shapeHome({ agents = [], projectRooms = [], inboxItems = [], missionRooms = [], agentThreadRooms = [], roomActivity = null, unreadRooms = [], worldId = '' } = {}) {
  // Agents render as TITLES (curated set), never names. id stays the agent slug so the chat
  // opens the right thread. (Agents-as-titles + Agents accordion, decided 2026-06-23.)
  // Non-AOM worlds see ONLY their own agent_status rows (no hard-coded roster).
  const isAom = worldId === 'aom';
  const agentRooms = curateTitledAgents(agents, { isAom }).map((a) => {
    const status = agentStatus(a.status);
    return {
      id: a.slug, name: a.title,
      specialistTitle: a.specialistTitle, hasCustomTitle: a.hasCustomTitle,
      status, statusText: statusText(status), initials: initials(a.title),
    };
  });
  const isInfra = (slug) => {
    if (!slug) return false;
    const s = String(slug).toLowerCase();
    return s === 'bridge-smoke' || s.startsWith('lab-') || s.startsWith('qa-') || s.startsWith('smoke-') || s.startsWith('proj-tool-') || s.startsWith('loop-test-');
  };
  const filteredRooms = (projectRooms || []).filter((p) => !isInfra(p.slug) && p.slug !== 'daily-research');
  const projects = [...filteredRooms].sort((a, b) => {
    const ta = !isRoomActivityNoise({ text: a.last_message_text }) && a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const tb = !isRoomActivityNoise({ text: b.last_message_text }) && b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return tb - ta;
  }).map((p) => ({
    id: p.id || p.slug, databaseId: p.id || '', slug: p.slug, name: p.name || p.slug || 'Project',
    // no real item-count source on this list (tasks not loaded here) -> blank, not a fake 0.
    tint: tintFor(p.name || p.id), count: (p.tasks?.length || p.taskCount || '') || '',
    // Recency + last line ride along. They are not rendered here — the front-door router
    // (assembleCandidates -> /api/dashboard/intake-route) ranks and disambiguates rooms with
    // them. Dropping them in this .map is what silently broke composer routing: every
    // candidate reached the router with last_message_at 0, so its "most recent 18 projects"
    // sort was a no-op and the cut fell alphabetically — every project from CSC to Wolfpack
    // was invisible to the router and could never be matched, only proposed as new.
    last_message_at: p.last_message_at || 0,
    last_message_text: p.last_message_text || '',
  }));

  // inboxItems shape (from useDataPipe): { agent, project, missionSlug, roomKey, text, timestamp, id }.
  // Each is an unread agent message in a room — the "needs you" feed. The agent who
  // pinged is the sender; the room (project/mission/agent thread) is the subject.
  const projectNameBySlug = {};
  for (const p of filteredRooms || []) { if (p.slug) projectNameBySlug[p.slug] = p.name || p.slug; }
  const agentNameBySlug = Object.fromEntries(agentRooms.map((a) => [a.id, a.name]));
  const isMachinery = (t) => {
    const s = String(t || '').toLowerCase();
    return s.includes('probe-') || s.includes('test-ledger') || s.includes('claude-reply') || s.includes('standing by') || s.includes("i've loaded the room");
  };
  const cards = (inboxItems || []).filter((it) => {
    if (isInfra(it.project) || it.project === 'daily-research') return false;
    if (it.missionSlug && isInfra(it.missionSlug.split(':').pop())) return false;
    if (isMachinery(it.text)) return false;
    return true;
  }).map((it) => {
    // No structured action-item feed exists yet (H3): the card carries an empty list and
    // actionState='none', which hides the "Action items" header instead of showing a naked
    // section over dead space. Flips to 'has' automatically once a real feed populates this.
    const actionItems = [];
    // Title (Patrik, 2026-06-25): project name leads, mission name underneath. Agent name
    // leads ONLY on a direct agent-thread card (no project room behind it).
    const isAgentThread = !it.project;
    const projName = it.project ? (projectNameBySlug[it.project] || cap(it.project)) : '';
    const missionName = missionLabel(it.missionSlug);
    const from = isAgentThread ? (it.agent ? (agentNameBySlug[it.agent] || titleForAgent(it.agent)) : 'Your agent') : projName;
    const subject = isAgentThread
      ? (it.agent ? `${agentNameBySlug[it.agent] || titleForAgent(it.agent)} thread` : '')
      : (missionName || 'General');
    // Attachment-delivery messages swap the text summary for a file chip + Review.
    const att = detectAttachment(it.text);
    const attachments = att ? [att] : [];
    return {
      id: it.id,
      // The sender is always an agent (the glyph reads "message from an agent"); the title
      // text below is what carries project vs agent-thread. Keep kind for the styled glyph.
      kind: 'agent', kindLabel: 'AGENT',
      from, subject,
      summary: firstLine(it.text),
      time: relTime(it.timestamp),
      // carry the source room so an action (e.g. Add to Tracker) can attach to the mission.
      project: it.project || '', missionSlug: it.missionSlug || '', agent: it.agent || '',
      actionItems, attachments,
      actionState: actionItems.length ? 'has' : 'none',
      // contentState drives the middle of the card: 'file' => attachment chip + Review,
      // 'text' => centered room summary. (Patrik catch-up card spec, 2026-06-25.)
      contentState: attachments.length ? 'file' : 'text',
    };
  });

  const catchUp = {
    count: cards.length,
    position: cards.length ? 1 : 0,
    current: cards[0] || { id: '', kind: 'agent', kindLabel: 'AGENT', from: '', subject: '', summary: '', actionItems: [], attachments: [], actionState: 'none' },
    rest: cards.slice(1),
    all: cards, // full deck, for the Catch Up full-deck screen
  };

  // agents/projects are bound BOTH as lists (data-each) and as `.count` /
  // `.moreCount` (data-bind), so the arrays carry those props (arrays are objects).
  agentRooms.count = agentRooms.length;
  projects.count = projects.length;
  projects.moreCount = 0;

  // Recently active (Patrik 2026-06-25): rooms mixed — missions + project chats + agent
  // threads — newest activity first, above Projects. The arrow nav starts here. Mission-level
  // recency comes from the inbox feed (it carries missionSlug + timestamp); project-level
  // recency comes from projectRooms.last_message_at (read or unread). Merge by room key, keep
  // the freshest per room, sort desc, top 30. Real data only — no fabricated rows.
  // Room-row contract §3: a preview line is conversation, never transport. The
  // upstream pipe already blanks machine text on the recency scan; this is the second
  // gate, at the shaping layer, so any caller of shapeHome() gets the same guarantee.
  // Returns '' for machine text — the row survives, the line collapses (.rprev:empty).
  const rowPreview = (text, message) => (isMachinePreview(text, message) ? '' : normalizePreview(text));

  const recentMap = {};
  // A fresher timestamp-only bump (projectRooms/missionRooms carry no text) must not erase
  // a preview a message-carrying bump already provided (Steffen R4 send-back: the digest
  // earns its width with the last-message line).
  // `unread` is sticky the same way `preview` is: a later timestamp-only bump (which
  // carries no unread signal) must not silently clear the green dot an inbox ping set.
  // It clears on its own — recentMap is rebuilt each poll, and a read room stops
  // appearing in inboxItems (Patrik 2026-08-06).
  const bump = (key, entry) => {
    const prev = recentMap[key];
    if (!prev || entry.ts > prev.ts) {
      recentMap[key] = {
        ...entry,
        preview: entry.preview || (prev && prev.preview) || '',
        unread: !!(entry.unread || (prev && prev.unread)),
      };
    } else if (entry.unread && prev) {
      prev.unread = true;
    }
  };
  // A mission whose "parent project" label merely echoes the room's own name (a slug that
  // resolves to no real project, e.g. outreach -> "Outreach | Outreach") tells the user
  // nothing — fall back to the honest generic label instead.
  const missionSub = (pn, nm) => (pn && pn.trim().toLowerCase() !== String(nm || '').trim().toLowerCase()) ? pn : 'Mission';
  for (const it of inboxItems || []) {
    if (isRoomActivityNoise(it)) continue;
    if (isInfra(it.project) || it.project === 'daily-research') continue;
    if (it.missionSlug && isInfra(String(it.missionSlug).split(':').pop())) continue;
    if (isMachinery(it.text)) continue;
    const ts = it.timestamp ? new Date(it.timestamp).getTime() : 0;
    const preview = rowPreview(it.text, it);
    if (!preview && isMachinery(it.text)) continue;
    if (it.missionSlug) {
      const pn = it.project ? (projectNameBySlug[it.project] || cap(it.project)) : '';
      const nm = missionLabel(it.missionSlug) || it.missionSlug;
      bump('m:' + missionRecencyKey(it.missionSlug), { key: 'm:' + missionRecencyKey(it.missionSlug), id: it.missionSlug, kind: 'mission', missionSlug: it.missionSlug, project: it.project || '', name: nm, sub: missionSub(pn, nm), ts, preview });
    } else if (it.project) {
      bump('p:' + it.project, { key: 'p:' + it.project, id: it.project, kind: 'project', project: it.project, name: projectNameBySlug[it.project] || cap(it.project), sub: 'Project chat', ts, preview });
    } else if (it.agent) {
      bump('a:' + it.agent, { key: 'a:' + it.agent, id: it.agent, kind: 'agent', agent: it.agent, name: agentNameBySlug[it.agent] || titleForAgent(it.agent), sub: 'Direct chat', ts, preview });
    }
  }
  for (const p of filteredRooms || []) {
    if (!p.last_message_at || !p.slug) continue;
    if (isRoomActivityNoise({ text: p.last_message_text })) continue;
    bump('p:' + p.slug, { key: 'p:' + p.slug, id: p.slug, kind: 'project', project: p.slug, name: p.name || cap(p.slug), sub: 'Project chat', ts: p.last_message_at, preview: rowPreview(p.last_message_text, p) });
  }
  // Activity-based mission recency: any mission with recent messages surfaces in
  // Recently Active even if it hasn't sent an inbox ping. Same bump path as projects;
  // a later inbox bump would overwrite with a fresher timestamp if applicable.
  for (const mr of missionRooms || []) {
    if (!mr.last_message_at || !mr.slug) continue;
    if (isRoomActivityNoise({ text: mr.last_message_text })) continue;
    if (isInfra(mr.slug) || mr.slug === 'daily-research') continue;
    if (mr.project && (isInfra(mr.project) || mr.project === 'daily-research')) continue;
    const pn = mr.project ? (projectNameBySlug[mr.project] || cap(mr.project)) : '';
    const nm = missionLabel(mr.slug) || mr.slug;
    bump('m:' + missionRecencyKey(mr.slug), { key: 'm:' + missionRecencyKey(mr.slug), id: mr.slug, kind: 'mission', missionSlug: mr.slug, project: mr.project || '', name: nm, sub: missionSub(pn, nm), ts: mr.last_message_at, preview: rowPreview(mr.last_message_text, mr) });
  }
  // Activity-based recency for direct 1:1 agent threads — parallel to projects/
  // missions above so an agent you actually talked to surfaces in Recently Active
  // even after you've read it (the inbox-ping path only catches unread pings).
  // kind:'agent' throughout keeps it a direct chat that opens the agent's room; it
  // never enters or becomes a project. Same bump key as the inbox path (a:<agent>),
  // so a fresher timestamp just wins — no double row.
  for (const ar of agentThreadRooms || []) {
    if (!ar.last_message_at || !ar.agent) continue;
    if (isRoomActivityNoise({ text: ar.last_message_text })) continue;
    bump('a:' + ar.agent, { key: 'a:' + ar.agent, id: ar.agent, kind: 'agent', agent: ar.agent, name: agentNameBySlug[ar.agent] || titleForAgent(ar.agent), sub: 'Direct chat', ts: ar.last_message_at, preview: rowPreview(ar.last_message_text, ar) });
  }
  // Wide-window recency (Patrik 2026-08-06, "show the last 30 chats"). Everything
  // above derives recency from the dashboard's 100-message poll, and 100 rows is
  // roughly a DOZEN rooms on a live client — so a 30-row list built from it would
  // quietly render 12 and look broken. /api/dashboard/room-activity already walks a
  // 6000-row window (~11 days) for the front-door router and is already fetched on
  // this screen, so the rooms exist; they just never reached this list.
  //
  // Recency only. `last_message_text` there is a multi-line DIGEST built to teach the
  // router what a room is ABOUT — good for matching, wrong as a "here's where you left
  // off" line. bump() already keeps any preview a message-carrying source supplied, so
  // passing no preview here means rooms inside the 100-window keep their real last
  // line and rooms beyond it show none rather than a stitched-together one.
  const activityProjects = roomActivity?.projects || {};
  for (const [slug, entry] of Object.entries(activityProjects)) {
    const ts = entry?.last_message_at ? new Date(entry.last_message_at).getTime() : 0;
    if (!slug || !ts) continue;
    if (isInfra(slug) || slug === 'daily-research') continue;
    bump('p:' + slug, { key: 'p:' + slug, id: slug, kind: 'project', project: slug, name: projectNameBySlug[slug] || cap(slug), sub: 'Project chat', ts, preview: '' });
  }
  const activityMissions = roomActivity?.missions || {};
  for (const [key, entry] of Object.entries(activityMissions)) {
    const ts = entry?.last_message_at ? new Date(entry.last_message_at).getTime() : 0;
    if (!key || !ts) continue;
    // room-activity keys missions "<project>:<missionSlug>" — the same shape the
    // mission bumps above use before missionRecencyKey normalizes them.
    const project = key.includes(':') ? key.slice(0, key.indexOf(':')) : '';
    const slug = key.includes(':') ? key.slice(key.indexOf(':') + 1) : key;
    if (!slug) continue;
    if (isInfra(slug) || slug === 'daily-research') continue;
    if (isInfra(project) || project === 'daily-research') continue;
    const pn = project ? (projectNameBySlug[project] || cap(project)) : '';
    const nm = missionLabel(slug) || slug;
    bump('m:' + missionRecencyKey(slug), { key: 'm:' + missionRecencyKey(slug), id: slug, kind: 'mission', missionSlug: slug, project, name: nm, sub: missionSub(pn, nm), ts, preview: '' });
  }

  // Green dot: mark rooms with a new agent message from the broad unread feed. Keys are
  // built exactly the way bump() built them above, or the dot lands on nothing.
  // Sourced from unreadRooms, NOT inboxItems — inboxItems is the narrow "an agent is
  // blocked on you" feed and never contains a plain status update, which is precisely
  // the case Patrik reported as missing (2026-08-06).
  const unreadKeys = new Set();
  for (const u of unreadRooms || []) {
    if (u.missionSlug) unreadKeys.add('m:' + missionRecencyKey(u.missionSlug));
    else if (u.project) unreadKeys.add('p:' + u.project);
    else if (u.agent) unreadKeys.add('a:' + u.agent);
  }
  for (const key of Object.keys(recentMap)) {
    if (unreadKeys.has(key)) recentMap[key].unread = true;
  }

  const recent = Object.values(recentMap)
    // Drop rows with no real name (a nameless room/mission leaks in as "Undefined" — ugly).
    .filter((r) => { const n = String(r.name || '').trim().toLowerCase(); return n && n !== 'undefined' && n !== 'null'; })
    .sort((a, b) => b.ts - a.ts)
    // 30, raised from 6 (Patrik 2026-08-06). This is the SOURCE for three surfaces
    // and each caps its own display: the desktop rail shows all 30, mobile's list
    // shows 20 (CSS nth-child), the desktop resting digest shows 6 (CSS nth-child).
    // How many actually exist is bounded by the recency window — see the comment
    // on the recency scan in useDataPipe.
    .slice(0, 30)
    .map((r) => ({ ...r, initials: initials(r.name), tint: tintFor(r.name), age: relTime(r.ts), status: (Date.now() - r.ts) < 3600000 ? 'live' : 'ready' }));
  recent.count = recent.length;

  // honest convo column: real header off the first agent room, empty goal body.
  const lead = agentRooms[0] || { name: '', initials: '' };
  // Mission recency, keyed "project:missionSlug", for the front-door router only.
  // `recent` holds just the top 6 rooms, and the mission tree the composer walks
  // (useProjectMissions) is folders on disk with no message data — so without this map
  // every mission candidate reached the router at timestamp 0 with no preview, leaving it
  // to match on mission NAMES alone. That is how "the text is too big on the reel" landed
  // in AZ Tech Council's "Summit Highlight Reel" at 0.95 confidence: a shared word.
  const missionActivity = {};
  for (const mr of missionRooms || []) {
    if (!mr.slug) continue;
    const bare = String(mr.slug).includes(':') ? String(mr.slug).split(':').pop() : String(mr.slug);
    const key = `${mr.project || ''}:${bare}`;
    const ts = mr.last_message_at ? new Date(mr.last_message_at).getTime() : 0;
    const prev = missionActivity[key];
    if (prev && prev.ts >= ts) continue;
    // Same field names as /api/dashboard/room-activity so the two merge without a shim.
    missionActivity[key] = { ts, last_message_at: mr.last_message_at || 0, last_message_text: normalizePreview(mr.last_message_text) || '' };
  }

  const data = {
    rooms: { total: agentRooms.length + projects.length },
    agents: agentRooms,
    recent,
    missionActivity,
    projects,
    catchUp,
    room: { name: lead.name || 'Your rooms', initials: lead.initials || '·', count: '', statusText: '', project: '', mission: '' },
    // No real goal source exists yet (agents don't emit/store a structured goal thread).
    // goal.has drives the convo column: 'none' => show the honest "No active goal" rest
    // state; flip to 'active' only when a real goal is bound. Never fabricate a goal here.
    goal: { has: 'none', title: 'Pick a room to see its goal', step: '', total: '', pct: 0, summary: [], checklist: [] },
  };

  let state = 'ready';
  if (!agentRooms.length && !projects.length && !cards.length) state = 'empty';
  return { state, data };
}

// The Home hook: resolve the viewer (auth -> worldId -> slug), feed the existing
// data pipe, and shape it. Mirrors how CornerVG seeds worldId so we ride the same
// auth-derived world (Patrik -> aom).
export function useHome() {
  const { status, worldId } = useTenantContext();
  const { agents, projectRooms, inboxItems, missionRooms, agentThreadRooms, unreadRooms } = useDataContext();
  // The wide activity window that lets the recent list reach 30 real rooms instead of
  // the ~12 the 100-message poll can see. Shares useIntakeRoute's module cache, so the
  // front door and this list cost ONE request between them. A failure returns null and
  // the list degrades to the old 100-message recency — never to an empty screen.
  const [roomActivity, setRoomActivity] = useState(null);
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    const load = () => { fetchRoomActivity(worldId).then((value) => { if (alive && value) setRoomActivity(value); }); };
    load();
    // Matches the endpoint's own 180s edge cache — polling faster just re-reads it.
    const timer = setInterval(load, 180000);
    return () => { alive = false; clearInterval(timer); };
  }, [worldId]);

  // Memoize the shaped data so its identity is stable between renders (it only changes
  // when the underlying pipe arrays change). Without this, `data` was a new object every
  // render, so TemplateScreen reset the whole DOM on each data tick — rebuilding the room
  // list under the user's finger and making taps miss (the "can't open a chat" bug).
  const shaped = useMemo(() => shapeHome({ agents, projectRooms, inboxItems, missionRooms, agentThreadRooms, roomActivity, unreadRooms, worldId }), [agents, projectRooms, inboxItems, missionRooms, agentThreadRooms, roomActivity, unreadRooms, worldId]);
  // DEF-2: !agents is false when agents=[] (empty array is truthy), causing the loading
  // guard to exit too early and render an empty screen. Use null-check instead: useDataPipe
  // returns null until the first fetch resolves, then [] or a real array.
  const loading = (supabase && status === 'loading') || (supabase && !worldId) || (agents == null && projectRooms == null && inboxItems == null);
  return { state: loading ? 'loading' : shaped.state, data: shaped.data, worldId };
}

// ── Chat list (mobile conversations): the rooms list that Chat opens to ──
const CHAT_STATUS = { online: 'live', live: 'live', working: 'live', running: 'live', blocked: 'blocked', needs_you: 'blocked', 'needs you': 'blocked', done: 'done', complete: 'done' };
function chatStatus(s) { return CHAT_STATUS[String(s || '').toLowerCase()] || 'ready'; }
const CHAT_STATUS_LABEL = { live: 'LIVE', blocked: 'NEEDS YOU', ready: 'READY', done: 'DONE' };

export function shapeChatList({ agents = [], projectRooms = [], inboxItems = [], worldId = '' } = {}) {
  // last needs-you message + count per agent (the only per-room snippet we have without a
  // separate fetch); rooms with no unread show no snippet rather than a fabricated one.
  const isAom = worldId === 'aom';
  const byAgent = {};
  for (const it of inboxItems || []) {
    const k = String(it.agent || '').toLowerCase(); if (!k) continue;
    if (!byAgent[k]) byAgent[k] = { count: 0, text: '', time: '' };
    byAgent[k].count += 1;
    if (!byAgent[k].text) { byAgent[k].text = firstLine(it.text); byAgent[k].time = relTime(it.timestamp); }
  }
  const agentRows = curateTitledAgents(agents, { isAom }).map((a) => {
    const status = chatStatus(a.status);
    const inb = byAgent[String(a.slug || a.name || '').toLowerCase()] || null;
    return {
      id: a.slug, name: a.title, initials: initials(a.title),
      specialistTitle: a.specialistTitle, hasCustomTitle: a.hasCustomTitle,
      tint: tintFor(a.title || a.slug), status, statusLabel: CHAT_STATUS_LABEL[status] || 'READY',
      snippet: inb?.text || '', time: inb?.time || '', needsCount: a.unread || inb?.count || 0,
    };
  });
  const isChatInfra = (slug) => {
    if (!slug) return false;
    const s = String(slug).toLowerCase();
    return s === 'bridge-smoke' || s.startsWith('lab-') || s.startsWith('qa-') || s.startsWith('smoke-') || s.startsWith('proj-tool-') || s.startsWith('loop-test-') || s === 'daily-research';
  };
  const projectRows = (projectRooms || []).filter((p) => !isChatInfra(p.slug)).map((p) => ({
    // Key the room by SLUG, not the UUID: the messages table tags rows by project slug, so a
    // UUID id makes the thread query (project=<id>) return nothing -> an empty chat. (Corner bug.)
    id: p.slug || p.id, slug: p.slug, databaseId: p.id || '', name: p.name || p.slug || 'Project', snippet: '',
    tint: tintFor(p.name || p.id), status: 'ready',
  }));
  agentRows.count = agentRows.length;
  projectRows.count = projectRows.length;
  const live = agentRows.filter((a) => a.status === 'live').length;
  const needsYou = agentRows.filter((a) => a.status === 'blocked').length || (inboxItems || []).length;
  const data = { counts: { live, needsYou }, agents: agentRows, projects: projectRows };
  const state = (agentRows.length || projectRows.length) ? 'ready' : 'empty';
  return { state, data };
}

export function useChatList() {
  const { status, worldId } = useTenantContext();
  const { agents, projectRooms, inboxItems } = useDataContext();
  const shaped = useMemo(() => shapeChatList({ agents, projectRooms, inboxItems, worldId }), [agents, projectRooms, inboxItems, worldId]);
  // Same DEF-2 null-check fix applied to the chat-list hook. Both supabase-only
  // clauses stay gated behind `supabase &&` so local no-Supabase mode never blocks
  // on an auth-derived worldId (the branch's local-mode contract holds).
  const loading = (supabase && status === 'loading') || (supabase && !worldId) || (agents == null && projectRooms == null && inboxItems == null);
  return { state: loading ? 'loading' : shaped.state, data: shaped.data, worldId };
}

// ── Project-opened state (mobile Home state B): real missions for one project ──
const MISSION_STATUS = {
  running: 'live', building: 'live', active: 'live',
  queued: 'ready', planning: 'ready', classifying: 'ready', 'in-progress': 'ready', idle: 'ready',
  done: 'done', complete: 'done', completed: 'done',
};
function missionStatus(s) { return MISSION_STATUS[String(s || '').toLowerCase()] || 'ready'; }

export function shapeProjectState(project, missions) {
  const ms = (missions || []).map((m) => {
    const status = missionStatus(m.status);
    return {
      id: m.slug ? `/${m.slug}` : '', title: m.name || m.slug || 'Mission',
      agent: m.agent || '', status, statusLabel: status.toUpperCase(),
    };
  });
  return {
    project: { id: project?.id, name: project?.name || 'Project', missionCount: ms.length, tint: project?.tint || 'violet' },
    missions: ms,
  };
}

// Create a mission inside a project, for real, via the self-serve drawer endpoint. The
// endpoint only takes a name, so the typed goal + chosen agent are captured as the opening
// note in the new mission room (so nothing the user typed is lost). No fake.
function slugify(s) {
  let v = String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!/^[a-z]/.test(v)) v = 'm-' + v;       // slug must start with a letter
  return v.slice(0, 48);
}
export async function createMissionInProject({ worldId, projectSlug, title, goal, agentName, priority, when }) {
  const mission_slug = slugify(title);
  if (!worldId || !projectSlug || !mission_slug) return null;
  try {
    const r = await authFetch('/api/dashboard/create-mission-from-drawer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_slug: projectSlug, mission_slug, name: title, client_id: worldId }),
    });
    const d = r && r.ok ? await r.json() : null;
    if (d?.ok && (goal || agentName || priority || when)) {
      // Fold everything the user gave the composer (goal, assignee, priority, when) into the
      // opening note so nothing typed/picked is lost — the endpoint itself only takes a name.
      const note = [
        goal ? `Goal: ${goal}` : '',
        agentName ? `Assigned: ${agentName}` : '',
        priority ? `Priority: ${priority}` : '',
        when ? `When: ${when}` : '',
      ].filter(Boolean).join(' · ');
      await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: worldId, agent: 'corner', project: projectSlug, text: note, role: 'user', source: 'corner-dashboard', metadata: { mission_slug } }),
      }).catch(() => {});
    }
    return d;
  } catch { return null; }
}

// Create a project for real from the Home composer, via the same endpoint the 1:1 chat's
// novel-topic flow uses. It takes a slug + name and scaffolds the room (VISION/CONTEXT/BUILD
// + a kickoff greeting). If the user described it ("What's it about?"), that text is posted
// into the new room as their first message so the room can self-build around it.
export async function createProjectFromHome({ worldId, name, about, agentName }) {
  const slug = slugify(name);
  if (!worldId || !slug) return null;
  try {
    const r = await authFetch('/api/dashboard/create-project-from-chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, name: name || slug, client_id: worldId, agent_slug: 'ea' }),
    });
    const d = r && r.ok ? await r.json() : null;
    if (d?.ok && about && about.trim()) {
      await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: worldId, agent: 'corner', project: slug, text: about.trim(), role: 'user', source: 'corner-dashboard' }),
      }).catch(() => {});
    }
    return d;
  } catch { return null; }
}

// Fetch missions per project from the existing missions-tree endpoint (the same one
// the CV4 home uses). Returns a { [projectSlug]: missions[] } map.
export function useProjectMissions(worldId, reloadKey = 0) {
  const [byProject, setByProject] = useState({});
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    // reloadKey > 0 means a post-mutation refetch (rename/move from the context
    // menu) — bust the missions-tree lambda's 30s registry cache so it shows now.
    authFetch('/api/dashboard/missions-tree?client=' + encodeURIComponent(worldId) + (reloadKey > 0 ? '&bust=1' : ''), { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j || !Array.isArray(j.projects)) return;
        const next = {};
        for (const proj of j.projects) { if (proj?.slug) next[proj.slug] = proj.tree || proj.missions || []; }
        setByProject(next);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [worldId, reloadKey]);
  return byProject;
}
