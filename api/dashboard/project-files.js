// GET /api/dashboard/project-files?slug=<project-slug>
//
// R79-f1: Lists canonical files for a project + its missions.
// Returns structured JSON for the R79-f2 reader UI to consume.
//
// Tenant-gated: JWT must prove the caller can access the project's world.
// The world is derived server-side from the Supabase projects table (client_id
// column = world slug, e.g. "aom" or "ben"). The caller never supplies the
// world — it is looked up and verified, not trusted.
//
// Hidden files: the ONE shared hide-list (api/_lib/hideList.js — Python twin
// AOM-EA/scripts/lib/files_hide_list.py). System junk only; nothing
// content-shaped hides (corner:one-corner M7 trust contract).
//
// Response shape:
// {
//   project: "ambition-mechanical",
//   world:   "aom",
//   files: [
//     { kind: "canon",         name: "VISION.md",            path: "corner/users/aom/projects/ambition-mechanical/VISION.md",            last_modified: "2026-05-19T..." },
//     { kind: "canon",         name: "CONTEXT.md",           path: "...",  last_modified: "..." },
//     { kind: "canon",         name: "BUILD.md",             path: "...",  last_modified: "..." },
//     { kind: "canon",         name: "RESEARCH.md",          path: "...",  last_modified: "..." },
//     { kind: "tape",          name: "last-conversation.md", path: "...",  last_modified: "..." },
//     { kind: "research-drop", name: "2026-05-17-foo.md",    path: "...",  last_modified: "..." }
//   ],
//   missions: [
//     { slug: "website",    files: [ ... same shape ... ] },
//     { slug: "google-ads", files: [ ... ] }
//   ]
// }

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

// ── AOM-EA root resolution (matches api/local/file.js pattern) ────────────────
const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

// ── Hidden-file list: the ONE shared module (api/_lib/hideList.js) ───────────
// corner:one-corner M7 replaced the old content-shaped list (PHONEBOOK.md /
// manifest.yaml / assets / archive / vision-qa all hid) with junk-only hiding —
// Files must never lie by omission. Name-only check used for dirs AND files.
import { isHiddenDir, isHiddenFile } from '../_lib/hideList.js';

function isHidden(name) {
  return isHiddenDir(name) || isHiddenFile(name);
}

// ── Canon file definitions (in display order) ─────────────────────────────────
const CANON_FILES = [
  { name: 'VISION.md',            kind: 'canon' },
  { name: 'CONTEXT.md',           kind: 'canon' },
  { name: 'BUILD.md',             kind: 'canon' },
  { name: 'RESEARCH.md',          kind: 'canon' },
  { name: 'last-conversation.md', kind: 'tape'  },
];
const CANON_NAME_SET = new Set(CANON_FILES.map(c => c.name));

// ── Deliverable subfolders (R79-f15, 2026-05-25) ──────────────────────────────
// Inside a project or mission home, these subfolders get walked recursively so
// that any file an agent creates there appears in the Files browser
// automatically. Per the doctrine in
//   .claude/rules/save-deliverables-in-mission-folder.md
// agents save things they build (decks, renders, exports, screenshots,
// visuals) into the mission's deliverables/ folder; the other names below are
// common conventional locations we also surface.
const DELIVERABLE_DIRS = new Set([
  'deliverables', 'screenshots', 'visuals', 'exports',
  'renders', 'decks', 'docs', 'briefs', 'output', 'build',
]);

const MAX_WALK_DEPTH = 3;       // bound recursion inside deliverable folders
const MAX_FILES_PER_DIR = 500;  // default per-dir cap (overridable via ?dir_limit=)
const MAX_DIR_LIMIT = 10000;    // hard ceiling for ?dir_limit=

// ── Helpers ───────────────────────────────────────────────────────────────────

function statFile(absPath) {
  try {
    const st = fs.statSync(absPath);
    return st.mtime.toISOString();
  } catch {
    return null;
  }
}

// Build a path string relative to AOM_EA_ROOT (no leading slash).
function relPath(absPath) {
  const rel = path.relative(AOM_EA_ROOT, absPath);
  // Normalise to forward slashes on Windows (harmless on POSIX).
  return rel.replace(/\\/g, '/');
}

// Walk a deliverable subfolder recursively up to MAX_WALK_DEPTH and push every
// non-hidden file we find. Used for deliverables/, screenshots/, etc.
// WD40 FILE-CON R3 (2026-07-07): hidden entries are filtered BEFORE the per-dir
// cap, and hitting the cap is never silent — a {dir, shown, total} entry lands
// in `stats` so the response can carry truncated/truncated_dirs. `dirLimit`
// (from ?dir_limit=, clamped) raises the cap on demand so callers can reach
// the rest. Mirrors scripts/rag-server.py _r79f15_walk_subdir (the prod path).
function walkDeliverableDir(rootAbs, dirAbs, depth, dirRelInsideHome, files, stats, dirLimit) {
  if (depth > MAX_WALK_DEPTH) return;
  let entries;
  try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); } catch { return; }
  entries = entries.filter((e) => !isHidden(e.name)).sort((a, b) => a.name.localeCompare(b.name));
  const limit = dirLimit || MAX_FILES_PER_DIR;
  if (entries.length > limit) {
    if (stats) stats.push({ dir: dirRelInsideHome || '.', shown: limit, total: entries.length });
    entries = entries.slice(0, limit);
  }
  for (const ent of entries) {
    const abs = path.join(dirAbs, ent.name);
    const subRel = dirRelInsideHome ? `${dirRelInsideHome}/${ent.name}` : ent.name;
    if (ent.isDirectory()) {
      walkDeliverableDir(rootAbs, abs, depth + 1, subRel, files, stats, dirLimit);
      continue;
    }
    if (!ent.isFile()) continue;
    const mtime = statFile(abs);
    if (!mtime) continue;
    files.push({
      kind:           'deliverable',
      name:           ent.name,
      path:           relPath(abs),
      relative_path:  subRel,
      last_modified:  mtime,
    });
  }
}

// Collect files from a single directory (project or mission root).
// stats/dirLimit: see walkDeliverableDir (WD40 FILE-CON R3).
function collectFiles(dirAbsPath, stats, dirLimit) {
  const files = [];

  // 1. Canon + tape entries (in order; skip if the file does not exist).
  for (const entry of CANON_FILES) {
    const abs = path.join(dirAbsPath, entry.name);
    const mtime = statFile(abs);
    if (mtime) {
      files.push({ kind: entry.kind, name: entry.name, path: relPath(abs), last_modified: mtime });
    }
  }

  // 2. Research drops: files inside research/ matching YYYY-MM-DD-*.md.
  const researchDir = path.join(dirAbsPath, 'research');
  if (fs.existsSync(researchDir)) {
    let drops;
    try { drops = fs.readdirSync(researchDir); } catch { drops = []; }
    for (const name of drops) {
      if (!/^\d{4}-\d{2}-\d{2}-/.test(name) || !name.endsWith('.md')) continue;
      const abs = path.join(researchDir, name);
      const mtime = statFile(abs);
      if (mtime) {
        files.push({ kind: 'research-drop', name, path: relPath(abs), last_modified: mtime });
      }
    }
    // Sort research drops newest-first.
    const drops2 = files.filter(f => f.kind === 'research-drop');
    drops2.sort((a, b) => b.name.localeCompare(a.name));
    // Rebuild: canon/tape first (already in order), then sorted drops.
    const nonDrops = files.filter(f => f.kind !== 'research-drop');
    files.length = 0;
    files.push(...nonDrops, ...drops2);
  }

  // 3. Agent-created files at the top level of the home (R79-f15, 2026-05-25).
  //    Anything that isn't already canon/tape and isn't in HIDDEN_NAMES. This
  //    is the line that closes the gap where an agent runs `Write` on something
  //    like module-3-permission.pptx in the mission folder and the user can't
  //    see it from the Files browser.
  let topEntries;
  try { topEntries = fs.readdirSync(dirAbsPath, { withFileTypes: true }); } catch { topEntries = []; }
  for (const ent of topEntries) {
    if (!ent.isFile()) continue;
    if (isHidden(ent.name)) continue;
    if (CANON_NAME_SET.has(ent.name)) continue;   // already added in step 1
    const abs = path.join(dirAbsPath, ent.name);
    const mtime = statFile(abs);
    if (!mtime) continue;
    files.push({
      kind:           'deliverable',
      name:           ent.name,
      path:           relPath(abs),
      relative_path:  ent.name,
      last_modified:  mtime,
    });
  }

  // 4. Walk every non-hidden subfolder so any file an agent dropped under the
  //    mission home (whether into deliverables/, screenshots/, or a custom
  //    folder like module-3-permission-ladder/) surfaces in the browser.
  //    Excluded: hidden dirs (archive/, vision-qa/, node_modules/, .git/),
  //    research/ (handled in step 2), missions/ (handled by collectMissions
  //    when this is called for a project root; harmless to skip when called
  //    for a mission root since missions don't nest inside missions/).
  for (const ent of topEntries) {
    if (!ent.isDirectory()) continue;
    if (isHidden(ent.name)) continue;
    if (ent.name === 'research') continue;
    if (ent.name === 'missions') continue;
    const subAbs = path.join(dirAbsPath, ent.name);
    walkDeliverableDir(dirAbsPath, subAbs, 1, ent.name, files, stats, dirLimit);
  }

  return files;
}

// Collect missions for a project directory.
function collectMissions(projectAbsPath, stats, dirLimit) {
  const missionsDir = path.join(projectAbsPath, 'missions');
  if (!fs.existsSync(missionsDir)) return [];
  let entries;
  try { entries = fs.readdirSync(missionsDir); } catch { return []; }
  const missions = [];
  for (const name of entries) {
    if (isHidden(name)) continue;
    const abs = path.join(missionsDir, name);
    try {
      if (!fs.statSync(abs).isDirectory()) continue;
    } catch { continue; }
    const mStats = [];
    const files = collectFiles(abs, mStats, dirLimit);
    if (stats) for (const s of mStats) stats.push({ ...s, dir: `missions/${name}/${s.dir}` });
    missions.push({ slug: name, files });
  }
  missions.sort((a, b) => a.slug.localeCompare(b.slug));
  return missions;
}

// Top-level mission rooms (corner/users/<world>/missions/<slug>) have NO
// projects row, so resolveProjectWorld can't place them — and before 2026-07-18
// this endpoint 404'd them ("Project not found"). That killed the room's ONLY
// durable Files source: the outreach room's PDFs lived on disk in the mission's
// deliverables/ but the panel could show them only while their share rows sat
// inside the last-40 message window — 20 harness rows later they "vanished"
// (Patrik, 2026-07-18). This resolver is the local-disk arm of the fix: find
// which world's missions/ tree owns the slug. Prod uses the rag-server walk
// (which reports `world` for mission homes) — see the fallback in the handler.
function resolveLocalMissionDir(slug) {
  const usersRoot = path.join(AOM_EA_ROOT, 'corner', 'users');
  let entries = [];
  try { entries = fs.readdirSync(usersRoot, { withFileTypes: true }); } catch { return null; }
  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
    const cand = path.join(usersRoot, ent.name, 'missions', slug);
    try { if (fs.statSync(cand).isDirectory()) return { world: ent.name, dir: cand }; } catch { /* keep scanning */ }
  }
  return null;
}

// Look up the world (client_id) for a project slug from Supabase.
// Returns null if not found or DB is unavailable.
async function resolveProjectWorld(slug) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&select=slug,client_id&limit=1`;
    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows[0]) return null;
    return rows[0].client_id || null; // client_id = world slug
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'slug required' });
  }

  // Validate slug format: lowercase alphanumeric + hyphens + single dots.
  // Dots are legal in real project slugs (aheadofmarket.com — its room Files
  // panel 400'd forever until qa-watch tick 33 caught it). Path traversal
  // stays blocked: no "..", no leading/trailing dot.
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(slug) || slug.includes('..') || slug.endsWith('.') || slug.length > 80) {
    return res.status(400).json({ error: 'invalid slug' });
  }

  // WD40 FILE-CON R3: optional per-dir cap override so callers can reach files
  // past the default 500/dir cap. Clamped to a hard ceiling; invalid = ignored.
  let dirLimit = null;
  const rawLimit = String(req.query.dir_limit || '').trim();
  if (rawLimit && /^\d+$/.test(rawLimit)) {
    dirLimit = Math.max(1, Math.min(parseInt(rawLimit, 10), MAX_DIR_LIMIT));
  }

  // Resolve world from DB.
  const world = await resolveProjectWorld(slug);
  if (!world) {
    // No projects row — the slug may be a TOP-LEVEL MISSION room
    // (corner/users/<world>/missions/<slug>): outreach-class rooms. Without
    // this arm the room's Files panel has no durable source at all and files
    // "disappear" as chat scrolls past the message window (2026-07-18).
    // Prod path: the rag-server walk reports `world` when it resolved a
    // mission home; we tenant-gate on that world BEFORE returning any data.
    try {
      const ragUrl = `${RAG_TUNNEL_URL}/project-files-walk?slug=${encodeURIComponent(slug)}`
        + (dirLimit ? `&dir_limit=${dirLimit}` : '');
      const ragRes = await fetch(ragUrl, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
      if (ragRes.ok) {
        const body = await ragRes.json();
        if (body && body.world && typeof body.world === 'string') {
          try {
            await verifyTenant(body.world, req);
          } catch (err) {
            if (err instanceof TenantAuthError) return res.status(err.status || 403).json({ error: err.message });
            throw err;
          }
          return res.status(200).json(body);
        }
      }
      // rag reachable but didn't resolve a mission home -> try local disk.
    } catch {
      // tunnel unreachable -> try local disk.
    }
    // Local-disk arm (vercel dev / on-box runtime).
    const local = resolveLocalMissionDir(slug);
    if (local) {
      try {
        await verifyTenant(local.world, req);
      } catch (err) {
        if (err instanceof TenantAuthError) return res.status(err.status || 403).json({ error: err.message });
        throw err;
      }
      const missionTrunc = [];
      const mFiles    = collectFiles(local.dir, missionTrunc, dirLimit);
      const mMissions = collectMissions(local.dir, missionTrunc, dirLimit);
      return res.status(200).json({
        project: slug, world: local.world, room_kind: 'mission',
        files: mFiles, missions: mMissions,
        truncated: missionTrunc.length > 0, truncated_dirs: missionTrunc,
      });
    }
    return res.status(404).json({ error: 'Project not found' });
  }

  // Tenant gate: JWT must be able to access this world.
  try {
    await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status || 403).json({ error: err.message });
    }
    throw err;
  }

  // R79-f15 (2026-05-25): Vercel serverless functions can't read Patrik's
  // local AOM-EA filesystem. Proxy to the studio-side rag-server, which
  // does have disk access via the cloudflare tunnel.
  //
  // The fs.existsSync()/collectFiles()/collectMissions() helpers above are
  // kept for local dev (vercel dev with AOM_EA_ROOT pointing at the real
  // checkout) — they fire when RAG_TUNNEL_URL is unset OR the tunnel call
  // errors out. In prod the tunnel call is the canonical path.
  // (RAG_TUNNEL_URL is module-scope now — the mission-room fallback above
  // needs it before this point.)

  try {
    const ragUrl = `${RAG_TUNNEL_URL}/project-files-walk?slug=${encodeURIComponent(slug)}`
      + (dirLimit ? `&dir_limit=${dirLimit}` : '');
    const ragRes = await fetch(ragUrl, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
    if (ragRes.ok) {
      const body = await ragRes.json();
      // The rag-server payload doesn't include `world` (it's derived from the
      // tenant gate above). Stitch it in so consumers don't have to look it up.
      // The rag-server also carries truncated/truncated_dirs (FILE-CON R3);
      // the spread forwards them untouched.
      return res.status(200).json({ ...body, world });
    }
    // Fall through to local-disk fallback when tunnel is unreachable.
  } catch (err) {
    // network error -> fall through
  }

  // Local-disk fallback (vercel dev, or rag tunnel down).
  const projectDir = path.join(AOM_EA_ROOT, 'corner', 'users', world, 'projects', slug);
  if (!fs.existsSync(projectDir)) {
    return res.status(200).json({ project: slug, world, files: [], missions: [], truncated: false, truncated_dirs: [] });
  }
  const truncatedDirs = [];
  const files    = collectFiles(projectDir, truncatedDirs, dirLimit);
  const missions = collectMissions(projectDir, truncatedDirs, dirLimit);
  return res.status(200).json({
    project: slug, world, files, missions,
    truncated: truncatedDirs.length > 0, truncated_dirs: truncatedDirs,
  });
}
