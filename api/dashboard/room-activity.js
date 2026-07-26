// GET /api/dashboard/room-activity?client=<world>
//
// Last-activity + last-line for EVERY room that has seen traffic recently, keyed by
// project slug and by "<project>:<missionSlug>". One consumer: the front-door composer's
// router (useIntakeRoute -> /api/dashboard/intake-route), which ranks and disambiguates
// candidate rooms with exactly these two fields.
//
// WHY this exists (2026-07-25). The router already ranked candidates by `last_message_at`
// and read a `hint` per room — but both arrived empty on every request, so neither did
// anything:
//
//   * Recency came from supabase-status's `messages` query, which is `limit=100`. Measured
//     against the live table, those 100 rows covered ONE project and 3 missions. Every
//     other candidate reached the router at timestamp 0, so its "18 most recent projects"
//     sort was a no-op and the cut fell ALPHABETICALLY — every project from CSC to Wolfpack
//     was invisible and could never be matched, only proposed as a brand-new room. On a
//     74-message replay of Patrik's real history the correct room was missing from the
//     prompt 31% of the time.
//   * With no hint either, the router saw nothing but room NAMES and matched lexically:
//     "the text is too big on the reel" landed in AZ Tech Council's "Summit Highlight
//     Reel" at 0.95 confidence and opened it automatically. A shared word, nothing more.
//
// Feeding real values in took the right-room rate from 25% to 49% on that replay.
//
// The window is deliberately wide (6000 rows ≈ 11 days on this client: 17 projects, 44
// missions) and deliberately NOT part of the dashboard's hot poll — it is its own endpoint
// so the frequent supabase-status path stays cheap, and it is edge-cached because "which
// rooms were active lately" does not need to be second-fresh. Rooms with no traffic in the
// window are simply absent; the caller leaves them at 0, which is the correct ranking for
// a dormant room rather than a lie about it.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const DEFAULT_CLIENT_ID = 'aom';
const WINDOW_ROWS = 6000;
const PAGE = 1000;
const HINT_CHARS = 200;
// How many recent messages a room's hint may be distilled from. One is a lottery (see below);
// a handful is a description. 14 rather than 6 because a busy room's newest half-dozen lines
// are usually acknowledgements ("Picking this up", "Logged.") that the filter drops — at 6 the
// live digest for aom:socials came back as a single line and never reached the "reel.mp4" /
// "reel.qa.json" file names that identify it.
const HINT_SOURCES = 14;
const HINT_PART_CHARS = 80;

async function supabaseGet(params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?${params}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
}

// A hint has to describe what the room is ABOUT, and ONE message is a lottery ticket for that.
// Measured against the live table: aom:socials — where the Day 3 reel actually lives —
// advertised itself as "Nudge sent — told it to save the v4 edits first, then run the
// readability gate", which never says "reel", while the very next message down reads "Day 3
// profile-audit reel v4 is mid-build". So "tighten the timing on the day 3 reel" had nothing
// to match on there, and the only line in the entire candidate block containing the word
// "reel" was AZ Tech Council's "Summit Highlight Reel" — a room name. The router picked it at
// 0.9 and opened it. That was not the model being careless; given what it was shown, it was
// the only defensible answer.
//
// So the hint is a DIGEST of several recent lines, and file names are kept rather than
// discarded — "reel.mp4", "reel.qa.json", "story-cut-brief.md" are among the most
// discriminative things a media room ever says about itself. The old filter threw them away
// as noise, which is how the room lost the one word that identified it.
const DROP_RE = /^(<<|\[|picking this up|logged\.?$|got it\b|on it\b|standing by)/i;
const FILE_RE = /^(?:attached (?:file|\d+ files)|shared a file)\s*:?\s*(.+)$/i;

function digestOf(texts) {
  const parts = [];
  const seen = new Set();
  let total = 0;
  for (const raw of texts) {
    let t = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!t || t.startsWith('{')) continue;      // structured payloads describe plumbing
    const f = FILE_RE.exec(t);
    if (f) t = f[1].trim();                     // keep the FILENAME, drop the wrapper
    else if (DROP_RE.test(t)) continue;         // acknowledgements say nothing about the work
    if (!t) continue;
    t = t.slice(0, HINT_PART_CHARS);
    const key = t.toLowerCase().slice(0, 40);
    if (seen.has(key)) continue;                // rooms repeat themselves; the hint should not
    seen.add(key);
    // continue, NOT break: one long line must not end the digest. That bug is why the live
    // digest for aom:socials stayed a single sentence — the next candidate overflowed the
    // budget, the loop exited, and the short high-signal items further down ("reel.mp4",
    // "reel.qa.json") never got a chance. Skip what does not fit and keep looking.
    if (total + t.length > HINT_CHARS) continue;
    parts.push(t);
    total += t.length + 3;
  }
  return parts.join(' · ').slice(0, HINT_CHARS);
}

const bareSlug = (s) => (String(s || '').includes(':') ? String(s).split(':').pop() : String(s || ''));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const requested = (req.query.client || req.query.client_id || DEFAULT_CLIENT_ID).toString().trim().toLowerCase();
  let clientId;
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  const projects = {};
  const missions = {};
  try {
    for (let offset = 0; offset < WINDOW_ROWS; offset += PAGE) {
      // eslint-disable-next-line no-await-in-loop -- pages must be sequential; PostgREST has no cursor here.
      const rows = await supabaseGet(
        `client_id=eq.${encodeURIComponent(clientId)}&select=project,metadata,text,timestamp`
        + `&order=timestamp.desc&limit=${PAGE}&offset=${offset}`
      );
      if (!Array.isArray(rows) || !rows.length) break;
      for (const m of rows) {
        const ts = m?.timestamp;
        if (!ts) continue;
        const missionSlug = m?.metadata?.mission_slug || '';
        const project = m?.project || '';
        // One message belongs to exactly ONE room, in deriveRoomId's precedence
        // (mission > project). A mission reply must not also restamp its parent project,
        // or the parent inherits recency it never earned and outranks rooms the user
        // actually opened.
        const key = missionSlug ? `${project}:${bareSlug(missionSlug)}` : project;
        if (!key) continue;
        const bucket = missionSlug ? missions : projects;
        // Rows arrive newest-first, so the first sighting of a room is its last activity;
        // the next few supply the material the hint is distilled from.
        const prev = bucket[key] || (bucket[key] = { last_message_at: ts, texts: [] });
        if (prev.texts.length < HINT_SOURCES) prev.texts.push(m.text);
      }
      if (rows.length < PAGE) break;
    }
    for (const bucket of [projects, missions]) {
      for (const key of Object.keys(bucket)) {
        const b = bucket[key];
        bucket[key] = { last_message_at: b.last_message_at, last_message_text: digestOf(b.texts) };
      }
    }
  } catch (err) {
    // Never fail the caller: the composer must still be able to send. An empty map means
    // the router ranks as it did before, which is degraded but not broken.
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ projects: {}, missions: {}, degraded: true, error: String(err?.message || err).slice(0, 160) });
  }

  // Edge-cached: "which rooms were active lately" tolerates minutes of staleness, and this
  // is read on the send path where latency is felt.
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');
  return res.status(200).json({
    projects,
    missions,
    counts: { projects: Object.keys(projects).length, missions: Object.keys(missions).length },
  });
}
