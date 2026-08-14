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
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Hidden names (never surfaced) ─────────────────────────────────────────────
// The ONE shared hide-list (api/_lib/hideList.js; Python twin
// AOM-EA/scripts/lib/files_hide_list.py): system junk only. The old local list
// hid content-shaped names (PHONEBOOK.md / manifest.yaml / archive / assets) —
// files the mirror now LISTS, so reading them must work (corner:one-corner M7:
// Files must never lie by omission). Never a 403 — hidden paths 404.
import { isHiddenDir, isHiddenFile } from '../_lib/hideList.js';

function containsHiddenSegment(segments) {
  if (!segments.length) return true;
  const leaf = segments[segments.length - 1];
  return segments.slice(0, -1).some((s) => isHiddenDir(s)) || isHiddenFile(leaf);
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

  // ── Path must start with corner/users/<world>/projects/<slug>
  //    OR corner/users/<world>/missions/<slug> (user-level mission files)
  //    OR corner/missions/<slug> (Corner PLATFORM mission homes — the ea:// rows
  //       the file mirror emits since corner:one-corner M7) ────────────────────
  const isPlatformMission =
    segments.length >= 4 && segments[0] === 'corner' && segments[1] === 'missions';

  if (
    !isPlatformMission &&
    (segments.length < 6 ||
      segments[0] !== 'corner' ||
      segments[1] !== 'users' ||
      (segments[3] !== 'projects' && segments[3] !== 'missions'))
  ) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Platform missions belong to the 'corner' project — their world is whoever
  // owns that project row (no world segment exists in the path to trust).
  let world;
  if (isPlatformMission) {
    const _resolved = await resolveProjectWorld('corner');
    const _trimmed = _resolved && String(_resolved).trim();
    if (!_trimmed) return res.status(401).json({ error: 'Missing client' });
    world = _trimmed;
  } else {
    world = segments[2];
  }
  const slug        = isPlatformMission ? 'corner' : segments[4];
  const isMission   = !isPlatformMission && segments[3] === 'missions';

  // Validate world + slug format. Project slugs may contain dots (a real project
  // folder is literally named "aheadofmarket.com"), so the slug allows internal
  // dots; path traversal is already blocked by the ".." check above, so a dot here
  // is safe. The world stays hyphen-only.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(world) || !/^[a-z0-9][a-z0-9.-]*$/.test(slug)) {
    return res.status(404).json({ error: 'Not found' });
  }

  // The rest of the path (after the project slug / the platform-missions root).
  const rest = isPlatformMission ? segments.slice(2) : segments.slice(5);
  if (rest.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  }

  // ── Hidden-file check ─────────────────────────────────────────────────────
  // Dotfile segments are blocked in every mode (secrets: .env etc).
  if (rest.some((s) => s.startsWith('.'))) {
    return res.status(404).json({ error: 'Not found' });
  }
  // The hidden list is a LISTING/doc-viewer concern (keep scaffolding files out
  // of the reading surface). A raw byte fetch of one exact path is not a listing —
  // the Organize mirror lists every project file and its images/videos routinely
  // live under assets/ — so ?raw=1 skips it. Mirrors the rag-server R1 fix
  // (corner:corner-ui-cv6:organize, 2026-07-02); tenant gate still runs below.
  const rawRequested = String(req.query.raw || '') === '1';
  if (!rawRequested && containsHiddenSegment(rest)) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Missions segment is allowed; anything after it follows the same rules.
  // The hidden-segment check above covers segments like 'archive' etc. inside missions.

  // ── Verify project/world and tenant access ────────────────────────────────
  // For project paths: look up world from the DB and confirm it matches.
  // For user-level mission paths: the world is explicit in the path segment;
  //   skip the DB project lookup (there is no project row for a user-mission).
  //
  // EXCEPTION — the 'aom' super-admin world sees every room (same rule as
  // review-queue.js:91 and missions-tree.js:94, which leave aom unscoped). The
  // review queue surfaces deliverables from every project to aom, but the
  // per-project client_id check here would 404 any project whose client_id
  // isn't literally 'aom' — so the file the queue just listed "could not open."
  // For aom the path is already pinned under corner/users/aom/, the hidden-
  // segment + containment checks still apply, and verifyTenant('aom', req)
  // below still proves the caller is the operator. So skip the DB world check
  // for aom only; every real client world stays strictly gated.
  const isSuperAdminWorld = world === 'aom';
  if (!isMission && !isSuperAdminWorld) {
    const dbWorld = await resolveProjectWorld(slug);
    if (!dbWorld) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (dbWorld !== world) {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  // Tenant gate (always runs — protects both project and mission paths).
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
  //
  //    In production Vercel can't read AOM-EA disk; bytes come from the rag
  //    tunnel (studio-local). The local-disk path is the dev fallback.
  const rawMode = String(req.query.raw || '') === '1';
  const leafName = rest[rest.length - 1];
  const mime = mimeFor(leafName);
  const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

  if (rawMode) {
    // Parse Range header for HTTP 206 support (critical for mobile video playback).
    // Mobile browsers use Range requests to progressively buffer video. Without this,
    // the player downloads the entire file, causing choppy playback over slow connections.
    const rangeHeader = req.headers.range;

    try {
      const ragUrl = `${RAG_TUNNEL_URL}/project-file-raw?path=${encodeURIComponent(normPath)}`;
      const ragRes = await fetch(ragUrl, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
      if (ragRes.ok) {
        const buf = Buffer.from(await ragRes.arrayBuffer());
        const totalSize = buf.length;
        const upstreamType = ragRes.headers.get('content-type') || mime;
        const upstreamLM = ragRes.headers.get('last-modified');

        // Parse Range header (e.g., "bytes=0-1023" or "bytes=1024-")
        if (rangeHeader && rangeHeader.startsWith('bytes=')) {
          const rangeParts = rangeHeader.slice(6).split('-');
          const start = parseInt(rangeParts[0], 10) || 0;
          const end = rangeParts[1] ? parseInt(rangeParts[1], 10) : totalSize - 1;

          if (start >= 0 && end < totalSize && start <= end) {
            const chunkSize = end - start + 1;
            res.setHeader('Content-Type', upstreamType);
            res.setHeader('Content-Length', String(chunkSize));
            res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'private, max-age=30');
            res.setHeader('Content-Disposition', `inline; filename="${leafName.replace(/[\"]/g, '')}"`);
            if (upstreamLM) res.setHeader('Last-Modified', upstreamLM);
            return res.status(206).send(buf.slice(start, end + 1));
          }
        }

        // No range or invalid range: send full file with Accept-Ranges header
        res.setHeader('Content-Type', upstreamType);
        res.setHeader('Content-Length', String(totalSize));
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=30');
        res.setHeader('Content-Disposition', `inline; filename="${leafName.replace(/[\"]/g, '')}"`);
        if (upstreamLM) res.setHeader('Last-Modified', upstreamLM);
        return res.status(200).send(buf);
      }
    } catch (err) {
      // network error -> local fallback
    }
    // Local-disk fallback (vercel dev with real AOM_EA_ROOT, or tunnel down).
    let buf, st;
    try {
      st = fs.statSync(absPath);
      if (st.isDirectory()) return res.status(404).json({ error: 'Not found' });
      buf = fs.readFileSync(absPath);
    } catch {
      return res.status(404).json({ error: 'Not found' });
    }

    // Support Range requests on local disk too
    const totalSize = buf.length;
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const rangeParts = rangeHeader.slice(6).split('-');
      const start = parseInt(rangeParts[0], 10) || 0;
      const end = rangeParts[1] ? parseInt(rangeParts[1], 10) : totalSize - 1;

      if (start >= 0 && end < totalSize && start <= end) {
        const chunkSize = end - start + 1;
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Length', String(chunkSize));
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'private, max-age=30');
        res.setHeader('Content-Disposition', `inline; filename="${leafName.replace(/[\"]/g, '')}"`);
        res.setHeader('Last-Modified', new Date(st.mtime).toUTCString());
        return res.status(206).send(buf.slice(start, end + 1));
      }
    }

    // No range or invalid range: send full file with Accept-Ranges header
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(totalSize));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.setHeader('Content-Disposition', `inline; filename="${leafName.replace(/[\"]/g, '')}"`);
    res.setHeader('Last-Modified', new Date(st.mtime).toUTCString());
    return res.status(200).send(buf);
  }

  // ── Text mode (default) ─────────────────────────────────────────────────────
  // Refuse binaries in text mode — clients should ask for ?raw=1 for those.
  if (isBinaryMime(mime)) {
    return res.status(415).json({ error: 'binary file; use ?raw=1' });
  }

  // Try the rag tunnel first (Vercel prod path), then local disk fallback.
  try {
    const ragUrl = `${RAG_TUNNEL_URL}/project-file-raw?path=${encodeURIComponent(normPath)}`;
    const ragRes = await fetch(ragUrl, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
    if (ragRes.ok) {
      const content = await ragRes.text();
      const upstreamLM = ragRes.headers.get('last-modified') || new Date().toISOString();
      return res.status(200).json({
        path:          normPath,
        content,
        last_modified: upstreamLM,
        mime,
      });
    }
  } catch (err) {
    // network error -> local fallback
  }

  let content, mtime;
  try {
    const st = fs.statSync(absPath);
    if (st.isDirectory()) return res.status(404).json({ error: 'Not found' });
    mtime = st.mtime.toISOString();
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
