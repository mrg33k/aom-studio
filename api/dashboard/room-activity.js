// GET /api/dashboard/room-activity?client=<world>[&recency_only=1]
//
// Last-activity + last-line for every room in the world, keyed by project slug,
// by "<project>:<missionSlug>" and by agent slug. One consumer: the front-door
// composer's router (useIntakeRoute -> /api/dashboard/intake-route), which
// ranks and disambiguates candidate rooms with exactly these two fields, plus
// the Home screen's recently-active list (recency_only=1).
//
// Backend: Convex rooms:listRooms (corner:retire-supabase R2, 2026-09-03).
// Every room row already carries lastMessageText / lastMessageAt, maintained
// transactionally on each write, so this is one read instead of a 6000-row
// page walk. The hint is distilled from the room's last line with the same
// digest rules as before (file names kept, acknowledgements dropped).

import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';

const HINT_CHARS = 200;
const HINT_PART_CHARS = 80;

// A hint has to describe what the room is about. File names are among the most
// discriminative things a room ever says about itself, so they are kept;
// acknowledgements ("Picking this up", "Logged.") say nothing and are dropped.
const DROP_RE = /^(<<|\[|picking this up|logged\.?$|got it\b|on it\b|standing by)/i;
const FILE_RE = /^(?:attached (?:file|\d+ files)|shared a file)\s*:?\s*(.+)$/i;

export function digestOf(texts) {
  const parts = [];
  const seen = new Set();
  let total = 0;
  for (const raw of texts) {
    let t = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!t || t.startsWith('{')) continue;      // structured payloads describe plumbing
    const f = FILE_RE.exec(t);
    if (f) t = f[1].trim();                     // keep the filename, drop the wrapper
    else if (DROP_RE.test(t)) continue;
    if (!t) continue;
    t = t.slice(0, HINT_PART_CHARS);
    const key = t.toLowerCase().slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    if (total + t.length > HINT_CHARS) continue;
    parts.push(t);
    total += t.length + 3;
  }
  return parts.join(' · ').slice(0, HINT_CHARS);
}

// Pending-route quarantine: a message the front door routed on its own shapes
// nothing until the user accepts it. Kept for callers that pass a row list.
const isPendingRoute = (m) => {
  const r = m?.metadata?.routed;
  return !!(r && r.auto === true && r.accepted !== true);
};

// rows: newest-first. Returns surviving texts, newest-first.
export function acceptedTexts(rows) {
  const keep = [];
  let quarantined = false;
  for (const m of rows.slice().reverse()) {
    if (m.role === 'user') quarantined = isPendingRoute(m);
    if (quarantined) continue;
    keep.push(m.text);
  }
  return keep.reverse();
}

const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);

// The world this request is scoped to. An explicit value wins; otherwise the
// world is resolved from the verified JWT, never a hardcoded default.
async function scopeWorld(explicit, req) {
  const given = explicit == null ? '' : String(explicit).trim();
  if (given) return given.toLowerCase();
  const who = await callerIdentity(req);
  if (!who) throw new TenantAuthError('jwt required', 401);
  if (!who.world) throw new TenantAuthError('this account is not in a world; send an explicit world', 400);
  return who.world;
}

// Which bucket and key a room row lands in. mission > project > agent.
function keyFor(room) {
  const parts = String(room.legacyRoomId || '').split(':');
  if (room.kind === 'mission') {
    const project = room.project || (parts[1] === 'mission' && parts.length >= 4 ? parts[2] : '');
    const leaf = parts[1] === 'mission' ? (parts.length >= 4 ? parts.slice(3).join(':') : parts.slice(2).join(':')) : '';
    const mission = leaf || slugify(room.title);
    return mission ? { bucket: 'missions', key: `${project}:${mission}` } : null;
  }
  if (room.kind === 'project') {
    const project = room.project || (parts[1] === 'project' ? parts.slice(2).join(':') : slugify(room.title));
    return project ? { bucket: 'projects', key: project } : null;
  }
  const agent = room.specialist || (parts[1] === 'agent' ? parts.slice(2).join(':') : '');
  return agent ? { bucket: 'agents', key: agent } : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // Whether the world was named in the URL decides whether this response may
  // be edge cached at all; see the Cache-Control note at the bottom.
  const fromUrl = (req.query.client || req.query.client_id || '').toString().trim();
  const recencyOnly = req.query.recency_only === '1';
  let clientId;
  try {
    const requested = await scopeWorld(fromUrl, req);
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  const projects = {};
  const missions = {};
  const agents   = {};
  try {
    const rooms = await convexQuery('rooms:listRooms', { worldId: clientId, filter: 'all' });
    for (const room of Array.isArray(rooms) ? rooms : []) {
      const last = room.lastMessage;
      if (!last || !Number.isFinite(last.createdAt)) continue;
      const where = keyFor(room);
      if (!where) continue;
      const bucket = where.bucket === 'missions' ? missions : where.bucket === 'projects' ? projects : agents;
      const prev = bucket[where.key];
      if (prev && Date.parse(prev.last_message_at) >= last.createdAt) continue;
      bucket[where.key] = {
        last_message_at: iso(last.createdAt),
        last_message_text: recencyOnly ? '' : digestOf([last.text]),
      };
    }
  } catch (err) {
    // Never fail the caller: the composer must still be able to send.
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ projects: {}, missions: {}, agents: {}, degraded: true, error: String(err?.message || err).slice(0, 160) });
  }

  // Edge-cached only when the world was named in the URL: the shared edge cache
  // is keyed by URL and does not include the Authorization header.
  res.setHeader('Cache-Control', fromUrl
    ? 's-maxage=180, stale-while-revalidate=600'
    : 'private, no-store');
  return res.status(200).json({
    projects,
    missions,
    agents,
    counts: { projects: Object.keys(projects).length, missions: Object.keys(missions).length, agents: Object.keys(agents).length },
  });
}
