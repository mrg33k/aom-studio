// GET /api/dashboard/project-file?path=<relative-path>
//
// R79-f1: Returns the raw markdown content + metadata for one canonical file.
// `path` is relative to the AOM_EA root, e.g.:
//   corner/users/aom/projects/ambition-mechanical/VISION.md
//   corner/users/aom/projects/ambition-mechanical/research/2026-05-17-ui-section-audit.md
//   corner/users/aom/projects/ambition-mechanical/missions/website/VISION.md
//
// Tenant-gated: the world is extracted from the path, the project slug is
// looked up in Supabase to confirm the world matches, then verifyTenant
// validates the JWT. Asking for a hidden file (PHONEBOOK.md, history.md,
// rules.md, decisions.md, archive/*, vision-qa/*) returns 404 — no leakage
// of the filename.
//
// Response:
// {
//   path:          "corner/users/aom/projects/ambition-mechanical/VISION.md",
//   content:       "<raw markdown string>",
//   last_modified: "2026-05-19T12:34:56.000Z",
//   mime:          "text/markdown"
// }

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

// ── AOM-EA root resolution ────────────────────────────────────────────────────
const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Hidden names (never surfaced) ─────────────────────────────────────────────
// Any path segment matching these or any path containing these directories
// returns a 404.  Never a 403 — we do not acknowledge that the file exists.
const HIDDEN_SEGMENTS = new Set([
  'PHONEBOOK.md', 'history.md', 'rules.md', 'decisions.md',
  'lessons.md', 'manifest.yaml', 'archive', 'vision-qa', 'assets',
]);

function containsHiddenSegment(segments) {
  return segments.some(s => HIDDEN_SEGMENTS.has(s));
}

// ── Project world lookup ──────────────────────────────────────────────────────
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
    return rows[0].client_id || null;
  } catch {
    return null;
  }
}

// ── MIME helpers ──────────────────────────────────────────────────────────────
const _BINARY_EXT_MIME = {
  // Images
  'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
  'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
  'bmp': 'image/bmp', 'heic': 'image/heic', 'ico': 'image/x-icon',
  // PDFs / docs
  'pdf':  'application/pdf',
  'doc':  'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'ppt':  'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'xls':  'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // A/V
  'mp4': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm',
  'mkv': 'video/x-matroska', 'avi': 'video/x-msvideo',
  'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'm4a': 'audio/mp4',
  'flac': 'audio/flac', 'ogg': 'audio/ogg', 'aac': 'audio/aac',
  // Archives
  'zip': 'application/zip', 'tar': 'application/x-tar',
  'gz':  'application/gzip',
};

function mimeFor(filename) {
  if (filename.endsWith('.md'))   return 'text/markdown';
  if (filename.endsWith('.txt'))  return 'text/plain';
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'application/yaml';
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.csv'))  return 'text/csv';
  if (filename.endsWith('.html') || filename.endsWith('.htm')) return 'text/html';
  if (filename.endsWith('.xml'))  return 'application/xml';
  if (filename.endsWith('.js') || filename.endsWith('.jsx') ||
      filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'text/javascript';
  const ext = filename.split('.').pop().toLowerCase();
  if (_BINARY_EXT_MIME[ext]) return _BINARY_EXT_MIME[ext];
  return 'text/plain';
}

function isBinaryMime(mime) {
  return !!mime && !mime.startsWith('text/') &&
         mime !== 'application/json' && mime !== 'application/yaml' &&
         mime !== 'application/xml';
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { path: filePath } = req.query;

  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'path required' });
  }

  // ── Sanitize: no traversal, no absolute ─────────────────────────────────────
  // Normalise separators to forward slashes.
  const normPath = filePath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');
  if (normPath.includes('..') || path.isAbsolute(filePath)) {
    return res.status(400).json({ error: 'invalid path' });
  }

  const segments = normPath.split('/');

  // ── Path must start with corner/users/<world>/projects/<slug> ───────────────
  // Expected structure: corner / users / <world> / projects / <slug> / <rest...>
  if (
    segments.length < 6 ||
    segments[0] !== 'corner' ||
    segments[1] !== 'users' ||
    segments[3] !== 'projects'
  ) {
    return res.status(404).json({ error: 'Not found' });
  }

  const world = segments[2];
  const slug  = segments[4];

  // Validate world + slug format.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(world) || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return res.status(404).json({ error: 'Not found' });
  }

  // The rest of the path (after the project slug).
  const rest = segments.slice(5);
  if (rest.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  // ── Hidden-file check ─────────────────────────────────────────────────────
  // Block any segment in the path that is in the hidden list.
  if (containsHiddenSegment(rest)) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Missions segment is allowed; anything after it follows the same rules.
  // The hidden-segment check above covers segments like 'archive' etc. inside missions.

  // ── Verify project exists in DB and tenant matches ────────────────────────
  const dbWorld = await resolveProjectWorld(slug);
  if (!dbWorld) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Confirm the world in the path matches the DB record.
  if (dbWorld !== world) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Tenant gate.
  try {
    await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status || 403).json({ error: err.message });
    }
    throw err;
  }

  // ── Resolve absolute path and read ────────────────────────────────────────
  const absPath = path.join(AOM_EA_ROOT, normPath);

  // Final containment check — the resolved path must still live under AOM_EA_ROOT.
  if (!absPath.startsWith(AOM_EA_ROOT)) {
    return res.status(400).json({ error: 'invalid path' });
  }

  // ── Raw binary mode (R79-f15): serve the file bytes directly so the dashboard
  //    file viewer can render images / pdfs / pptx etc. with <img>, <iframe>,
  //    <video>, or a download link. Triggered with ?raw=1.
  const rawMode = String(req.query.raw || '') === '1';
  const leafName = rest[rest.length - 1];
  const mime = mimeFor(leafName);

  let st;
  try {
    st = fs.statSync(absPath);
    if (st.isDirectory()) {
      return res.status(404).json({ error: 'Not found' });
    }
  } catch {
    return res.status(404).json({ error: 'Not found' });
  }
  const mtime = st.mtime.toISOString();

  if (rawMode) {
    let buf;
    try {
      buf = fs.readFileSync(absPath);
    } catch {
      return res.status(404).json({ error: 'Not found' });
    }
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Last-Modified', new Date(mtime).toUTCString());
    res.setHeader('Cache-Control', 'private, max-age=30');
    // Hint to browsers to render inline when possible; fallback download
    // gets a sensible filename.
    res.setHeader('Content-Disposition', `inline; filename="${leafName.replace(/[\"]/g, '')}"`);
    return res.status(200).send(buf);
  }

  // ── Text mode (default) ─────────────────────────────────────────────────────
  // Refuse binaries in text mode — clients should ask for ?raw=1 for those.
  if (isBinaryMime(mime)) {
    return res.status(415).json({ error: 'binary file; use ?raw=1' });
  }
  let content;
  try {
    content = fs.readFileSync(absPath, 'utf-8');
  } catch {
    return res.status(404).json({ error: 'Not found' });
  }

  return res.status(200).json({
    path:          normPath,
    content,
    last_modified: mtime,
    mime,
  });
}
