#!/usr/bin/env node
// replay-intake-route — measure the front-door router against real history.
//
// corner:front-door R11. R9 and R10 both quote numbers from "a 74-message replay" but that
// harness was never committed, so every claim about this router has been unreproducible.
// This is that harness, committed, because R11 changes what the router is SHOWN (it
// quarantines un-accepted auto-routed messages out of a room's hint) and a change to the
// evidence can move accuracy in either direction. R10 measured and rejected two approaches
// on exactly this kind of number; shipping R11 unmeasured would be a lower standard than
// the round it builds on.
//
//   node scripts/replay-intake-route.mjs [options]
//
//     --limit N          messages to replay (default 74, matching R9/R10)
//     --client SLUG      tenant (default aom)
//     --pending MODE     which messages count as un-accepted auto-routes:
//                          stamped  honour metadata.routed (real behaviour; default)
//                          none     nobody is pending — the pre-R11 digest
//                          all-user WORST CASE: every user message is un-accepted
//     --hints-only       skip the LLM entirely, just report the hint impact
//     --json PATH        write the full per-message result
//
// ── Read this before quoting a number from it ─────────────────────────────────────────
//
// 1. GROUND TRUTH IS WEAK. "Right room" means the router picked the room the message
//    actually sits in today. But for a message the front door itself placed and the user
//    never corrected, that room is the router's OWN past answer — so the score partly
//    measures self-agreement, not correctness. The unambiguous ground truth is a message
//    the user re-homed (metadata.moved_from); at the time of writing this tenant has ZERO
//    of those, so that check reports n/a rather than a reassuring number.
//
// 2. `--pending stamped` ON HISTORY IS A TAUTOLOGY. Provenance did not exist before R11,
//    so every historical row is unstamped, nothing is quarantined, and before/after come
//    out byte-identical. That is not evidence the change is safe. Use `--pending all-user`
//    for the worst-case bound: if accuracy survives EVERY user message being quarantined,
//    it survives the real rate, which is a small fraction of that.
//
// 3. Hints are reconstructed POINT-IN-TIME — only messages strictly older than the one
//    being replayed. Without that a message sits in its own room's hint and scores itself.

import { rankCandidates, buildIndex, buildTarget, undescribedNameMatch, callGemini } from '../api/dashboard/intake-route.js';
import { digestOf, acceptedTexts } from '../api/dashboard/room-activity.js';
import { readFileSync, writeFileSync } from 'node:fs';

// ── env ──────────────────────────────────────────────────────────────────────────────
function loadEnv() {
  for (const p of ['../.env', '.env.local', '.env', '../../.env']) {
    try {
      for (const line of readFileSync(new URL(p, import.meta.url), 'utf8').split('\n')) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
      }
    } catch { /* not there */ }
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : def; };
const has = (name) => argv.includes(`--${name}`);

const LIMIT = Number(flag('limit', 74));
const CLIENT = String(flag('client', 'aom'));
const PENDING_MODE = String(flag('pending', 'stamped'));
const HINTS_ONLY = has('hints-only');
const JSON_OUT = flag('json', '');
const WINDOW_ROWS = 6000;
const HINT_SOURCES = 14;
const RAW_SOURCES = 40;
const MAX_HINT = 200;
const CONCURRENCY = 4;

if (!['stamped', 'none', 'all-user'].includes(PENDING_MODE)) { console.error(`--pending must be stamped|none|all-user`); process.exit(1); }

const bareSlug = (s) => (String(s || '').includes(':') ? String(s).split(':').pop() : String(s || ''));

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// ── the room universe ────────────────────────────────────────────────────────────────
async function loadRooms() {
  const [projects, agents, missionMeta] = await Promise.all([
    sb(`projects?client_id=eq.${CLIENT}&select=slug,name,is_active,archived_at`),
    sb(`agents?select=slug,display_name,is_active`),
    sb(`mission_meta?client_id=eq.${CLIENT}&select=project_slug,mission_slug,display_name,archived_at`),
  ]);
  const projectName = new Map();
  for (const p of projects) if (p.slug && !p.archived_at && p.is_active !== false) projectName.set(p.slug, p.name || p.slug);
  const missionName = new Map();
  for (const m of missionMeta) {
    if (!m.project_slug || !m.mission_slug || m.archived_at) continue;
    missionName.set(`${m.project_slug}:${bareSlug(m.mission_slug)}`, m.display_name || bareSlug(m.mission_slug));
  }
  const agentList = agents
    .filter((a) => a.slug && a.is_active !== false)
    .map((a) => ({ slug: a.slug, name: a.display_name || a.slug }));
  return { projectName, missionName, agentList };
}

// ── message window ───────────────────────────────────────────────────────────────────
async function loadWindow() {
  const out = [];
  for (let offset = 0; offset < WINDOW_ROWS; offset += 1000) {
    const rows = await sb(
      `messages?client_id=eq.${CLIENT}&select=id,project,metadata,text,timestamp,role,source`
      + `&order=timestamp.desc&limit=1000&offset=${offset}`);
    if (!rows.length) break;
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;   // newest-first
}

const roomKeyOf = (m) => {
  const ms = m?.metadata?.mission_slug || '';
  const p = m?.project || '';
  return ms ? `${p}:${bareSlug(ms)}` : p;
};

// Rewrite a row's provenance to match the requested mode, so every mode runs through
// room-activity's real acceptedTexts rather than a parallel copy of the rule.
function forceMode(m, mode) {
  const meta = m.metadata || {};
  if (mode === 'none') return { ...meta, routed: undefined };
  if (mode === 'all-user' && m.role === 'user') return { ...meta, routed: { auto: true } };
  return meta;
}

// Rebuild room-activity's maps from only what existed BEFORE `beforeTs`.
function activityAsOf(rows, beforeTs) {
  const projects = {}; const missions = {};
  for (const raw of rows) {
    if (!raw.timestamp || raw.timestamp >= beforeTs) continue;   // rows are newest-first
    const key = roomKeyOf(raw);
    if (!key) continue;
    const bucket = raw?.metadata?.mission_slug ? missions : projects;
    const prev = bucket[key] || (bucket[key] = { last_message_at: raw.timestamp, rows: [] });
    if (prev.rows.length < RAW_SOURCES) prev.rows.push({ text: raw.text, role: raw.role, metadata: forceMode(raw, PENDING_MODE) });
  }
  for (const bucket of [projects, missions]) {
    for (const k of Object.keys(bucket)) {
      const b = bucket[k];
      bucket[k] = { last_message_at: b.last_message_at, last_message_text: digestOf(acceptedTexts(b.rows).slice(0, HINT_SOURCES)) };
    }
  }
  return { projects, missions };
}

// Mirrors useIntakeRoute.assembleCandidates: every room the user can see, hinted from
// activity. Rooms with no traffic are included at 0 so the ranking can still reach them.
function assembleCandidates(rooms, activity) {
  const projects = [...rooms.projectName.entries()].map(([slug, name]) => {
    const a = activity.projects[slug];
    return { slug, name, last_message_at: a?.last_message_at || 0, hint: String(a?.last_message_text || '').slice(0, MAX_HINT) };
  });
  const seen = new Set();
  const missions = [];
  for (const [key, name] of rooms.missionName.entries()) {
    const [projectSlug, slug] = [key.split(':')[0], bareSlug(key)];
    if (!rooms.projectName.has(projectSlug)) continue;
    seen.add(key);
    const a = activity.missions[key];
    missions.push({ project_slug: projectSlug, slug, name, last_message_at: a?.last_message_at || 0, hint: String(a?.last_message_text || '').slice(0, MAX_HINT) });
  }
  // Missions that have traffic but no mission_meta row still exist as rooms.
  for (const key of Object.keys(activity.missions)) {
    if (seen.has(key)) continue;
    const projectSlug = key.split(':')[0];
    const slug = bareSlug(key);
    if (!projectSlug || !slug || !rooms.projectName.has(projectSlug)) continue;
    const a = activity.missions[key];
    missions.push({ project_slug: projectSlug, slug, name: slug, last_message_at: a.last_message_at, hint: String(a.last_message_text || '').slice(0, MAX_HINT) });
  }
  return { projects, missions, agents: rooms.agentList };
}

// ── hint impact: the deterministic half, no LLM needed ───────────────────────────────
//
// The quarantine can only affect routing by removing hints, so counting what it removes
// bounds the risk without spending a single Gemini call. `emptied` is the number to watch:
// an emptied room re-arms intake-route's undescribed-name cap, which is the intended
// safety behaviour but also the thing that costs accuracy if it fires too widely.
function hintsByRoom(rows, mode, beforeTs) {
  const projects = {}; const missions = {};
  for (const raw of rows) {
    if (!raw.timestamp || raw.timestamp >= beforeTs) continue;
    const key = roomKeyOf(raw);
    if (!key) continue;
    const bucket = raw?.metadata?.mission_slug ? missions : projects;
    const prev = bucket[key] || (bucket[key] = { rows: [] });
    if (prev.rows.length < RAW_SOURCES) prev.rows.push({ text: raw.text, role: raw.role, metadata: forceMode(raw, mode) });
  }
  const out = {};
  for (const [kind, bucket] of [['project', projects], ['mission', missions]]) {
    for (const k of Object.keys(bucket)) out[`${kind}:${k}`] = digestOf(acceptedTexts(bucket[k].rows).slice(0, HINT_SOURCES));
  }
  return out;
}

// ── scoring ──────────────────────────────────────────────────────────────────────────
const AUTO_ROUTE_CONFIDENCE = 0.85;
const UNVERIFIED_NAME_CONFIDENCE = 0.6;

function targetKey(t) {
  if (!t) return '';
  if (t.isMission) return `${t.projectSlug}:${bareSlug(t.missionSlug || t.id)}`;
  if (t.isProject) return t.id;
  return t.id;
}

async function replayOne(msg, rows, rooms) {
  const activity = activityAsOf(rows, msg.timestamp);
  const candidates = assembleCandidates(rooms, activity);
  const ranked = rankCandidates(candidates);
  const index = buildIndex(candidates);

  // LAST ROOM / RECENT ROOMS, point-in-time: the rooms this user was last in.
  const prior = rows.filter((r) => r.timestamp < msg.timestamp && r.role === 'user');
  const priorKeys = [];
  for (const r of prior) { const k = roomKeyOf(r); if (k && !priorKeys.includes(k)) priorKeys.push(k); if (priorKeys.length >= 7) break; }
  const asRoom = (key) => {
    if (key.includes(':')) {
      const [p, s] = [key.split(':')[0], bareSlug(key)];
      return { isMission: true, projectSlug: p, missionSlug: key, id: s, name: rooms.missionName.get(key) || s };
    }
    return { isProject: true, id: key, name: rooms.projectName.get(key) || key };
  };
  const lastRoom = priorKeys[0] ? asRoom(priorKeys[0]) : null;
  const recentRooms = priorKeys.slice(1, 7).map(asRoom);

  let llm;
  try {
    llm = await callGemini(msg.text, msg.metadata?.interaction_mode === 'plan' ? 'plan' : 'work', ranked, lastRoom, recentRooms);
  } catch (err) {
    return { id: msg.id, error: String(err.message || err).slice(0, 120), outcome: 'error' };
  }

  const target = buildTarget(CLIENT, llm?.match, index);
  let confidence = Number(llm?.confidence) || 0;
  const capped = target ? undescribedNameMatch(msg.text, target, candidates) : false;
  if (capped) confidence = Math.min(confidence, UNVERIFIED_NAME_CONFIDENCE);

  const truth = roomKeyOf(msg);
  const got = targetKey(target);
  const autoOpened = !!target && confidence >= AUTO_ROUTE_CONFIDENCE;
  const outcome = !target ? 'nothing-fits' : (got === truth ? 'right' : 'wrong');

  return {
    id: msg.id, text: String(msg.text || '').slice(0, 90), truth, got,
    confidence, capped, autoOpened, outcome,
    hint: (candidates.missions.find((m) => `${m.project_slug}:${m.slug}` === truth)
        || candidates.projects.find((p) => p.slug === truth))?.hint || '',
  };
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); process.stderr.write('.'); }
  }));
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────────────
const rooms = await loadRooms();
const rows = await loadWindow();
console.log(`tenant ${CLIENT} · ${rows.length} rows in window · ${rooms.projectName.size} projects · ${rooms.missionName.size} named missions · ${rooms.agentList.length} agents`);
console.log(`pending mode: ${PENDING_MODE}${PENDING_MODE === 'stamped' ? '  (on pre-R11 history this is identical to `none` — see header note 2)' : ''}`);

// Hint impact — always, no API key required. This is the number that bounds the risk:
// the quarantine can only hurt routing by removing hints, so count what it removes.
{
  const newest = new Date(new Date(rows[0]?.timestamp || Date.now()).getTime() + 1000).toISOString();
  const before = hintsByRoom(rows, 'none', newest);
  const after = hintsByRoom(rows, PENDING_MODE, newest);
  const keys = Object.keys(before);
  const changed = keys.filter((k) => before[k] !== after[k]);
  const blanked = keys.filter((k) => before[k] && !after[k]);
  const stillHinted = keys.filter((k) => after[k]).length;
  console.log(`\nHINT IMPACT (${PENDING_MODE} vs pre-R11)`);
  console.log(`  rooms with a hint:   ${keys.filter((k) => before[k]).length} -> ${stillHinted}`);
  console.log(`  hints changed:       ${changed.length} / ${keys.length}`);
  console.log(`  hints emptied:       ${blanked.length}   (these re-arm the undescribed-name cap)`);
  if (blanked.length) console.log(`  emptied rooms:       ${blanked.slice(0, 12).join(', ')}${blanked.length > 12 ? ` … +${blanked.length - 12}` : ''}`);
}

if (HINTS_ONLY) process.exit(0);
if (!process.env.GEMINI_API_KEY) {
  console.error('\nGEMINI_API_KEY not set — the LLM replay cannot run.');
  console.error('It is disabled on this machine for cost (AOM-EA/.env, 2026-06-22); the live');
  console.error('function reads it from Vercel. Export it, or run with --hints-only.');
  process.exit(2);
}

const corpus = rows
  .filter((r) => r.role === 'user' && r.source === 'corner-dashboard' && roomKeyOf(r) && String(r.text || '').trim().length > 8)
  .slice(0, LIMIT);
console.log(`\nreplaying ${corpus.length} messages (${CONCURRENCY} at a time, one Gemini call each)`);

const results = await pool(corpus, CONCURRENCY, (m) => replayOne(m, rows, rooms));
process.stderr.write('\n');

const n = results.length;
const count = (p) => results.filter(p).length;
const pct = (k) => `${Math.round((k / n) * 100)}%`;
const right = count((r) => r.outcome === 'right');
const wrong = count((r) => r.outcome === 'wrong');
const none = count((r) => r.outcome === 'nothing-fits');
const errs = count((r) => r.outcome === 'error');
const wrongAuto = count((r) => r.outcome === 'wrong' && r.autoOpened);
const rightAuto = count((r) => r.outcome === 'right' && r.autoOpened);
const cappedN = count((r) => r.capped);

console.log(`\nROUTING (n=${n}, pending=${PENDING_MODE})`);
console.log(`  right room            ${right}  ${pct(right)}`);
console.log(`  wrong room            ${wrong}  ${pct(wrong)}`);
console.log(`  nothing fits          ${none}  ${pct(none)}`);
if (errs) console.log(`  errored               ${errs}`);
console.log(`  auto-opened RIGHT     ${rightAuto}`);
console.log(`  auto-opened WRONG     ${wrongAuto}  ${pct(wrongAuto)}   <- the number that hurts`);
console.log(`  capped by name-only   ${cappedN}`);
console.log(`\nGemini calls: ${n}`);
console.log('Ground truth is where each message sits today — see header note 1 before quoting this.');

if (JSON_OUT) { writeFileSync(JSON_OUT, JSON.stringify({ mode: PENDING_MODE, n, right, wrong, none, wrongAuto, results }, null, 2)); console.log(`wrote ${JSON_OUT}`); }
