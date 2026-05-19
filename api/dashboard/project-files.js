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
// Hidden files (never returned, never acknowledged to exist):
//   PHONEBOOK.md, history.md, rules.md, decisions.md, archive/*, vision-qa/*
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
const AOM_EA_HARDCODED = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Hidden-file list (Pillar 1 from files-in-app VISION) ─────────────────────
const HIDDEN_NAMES = new Set([
  'PHONEBOOK.md', 'history.md', 'rules.md', 'decisions.md',
  'lessons.md', 'manifest.yaml', 'assets',
]);
const HIDDEN_DIRS = new Set(['archive', 'vision-qa', 'assets']);

function isHidden(name) {
  if (HIDDEN_NAMES.has(name)) return true;
  if (HIDDEN_DIRS.has(name)) return true;
  return false;
}

// ── Canon file definitions (in display order) ─────────────────────────────────
const CANON_FILES = [
  { name: 'VISION.md',            kind: 'canon' },
  { name: 'CONTEXT.md',           kind: 'canon' },
  { name: 'BUILD.md',             kind: 'canon' },
  { name: 'RESEARCH.md',          kind: 'canon' },
  { name: 'last-conversation.md', kind: 'tape'  },
];

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

// Collect files from a single directory (project or mission root).
function collectFiles(dirAbsPath) {
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

  return files;
}

// Collect missions for a project directory.
function collectMissions(projectAbsPath) {
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
    const files = collectFiles(abs);
    missions.push({ slug: name, files });
  }
  missions.sort((a, b) => a.slug.localeCompare(b.slug));
  return missions;
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

  // Validate slug format: lowercase alphanumeric + hyphens only.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || slug.length > 80) {
    return res.status(400).json({ error: 'invalid slug' });
  }

  // Resolve world from DB.
  const world = await resolveProjectWorld(slug);
  if (!world) {
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

  // Locate the project directory on disk.
  const projectDir = path.join(AOM_EA_ROOT, 'corner', 'users', world, 'projects', slug);
  if (!fs.existsSync(projectDir)) {
    // Project row exists in DB but files not on disk (cloud deploy, or stale row).
    // Return empty structure rather than a 404 — the DB is authoritative.
    return res.status(200).json({ project: slug, world, files: [], missions: [] });
  }

  const files    = collectFiles(projectDir);
  const missions = collectMissions(projectDir);

  return res.status(200).json({ project: slug, world, files, missions });
}
