// POST /api/dashboard/project-file-mkdir
//
// Creates a new folder inside a project's file tree.
// Body: { slug: string, path: string }
//   slug — project slug (must exist in the Convex project registry)
//   path — folder path relative to the project root
//          e.g. "my-new-folder" or "missions/website/my-new-folder"
//
// Creates the directory + a .gitkeep so git tracks it.
// Path-traversal safe: resolved absolute must remain inside the project dir.
// Tenant-gated: JWT must prove access to the project's world.
//
// Mission: corner:right-menu (R12, 2026-05-28)

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { convexQuery } from '../_lib/reportsStore.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

// The world that holds this project, from the Convex project registry
// (corner:retire-supabase, 2026-09-03; was the Supabase projects table).
async function resolveProjectWorld(slug) {
  try {
    const row = await convexQuery('projects:lookupBySlug', { slug });
    return row?.ownerWorld ? String(row.ownerWorld).toLowerCase() : null;
  } catch { return null; }
}

// Resolve and validate absolute path — must stay inside projectDir.
function safeResolve(projectDir, relPath) {
  const abs = path.resolve(projectDir, relPath);
  const base = projectDir.endsWith(path.sep) ? projectDir : projectDir + path.sep;
  if (!abs.startsWith(base) && abs !== projectDir) {
    throw new Error('Path traversal rejected');
  }
  return abs;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { slug, path: relPath } = req.body || {};
  if (!slug || typeof slug !== 'string') return res.status(400).json({ error: 'slug required' });
  if (!relPath || typeof relPath !== 'string') return res.status(400).json({ error: 'path required' });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || slug.length > 80) return res.status(400).json({ error: 'invalid slug' });
  // Reject paths that look like traversal attempts before resolving.
  if (relPath.includes('..') || relPath.startsWith('/')) return res.status(400).json({ error: 'invalid path' });

  const world = await resolveProjectWorld(slug);
  if (!world) return res.status(404).json({ error: 'Project not found' });

  try {
    await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status || 403).json({ error: err.message });
    throw err;
  }

  const projectDir = path.join(AOM_EA_ROOT, 'corner', 'users', world, 'projects', slug);
  if (!fs.existsSync(projectDir)) return res.status(404).json({ error: 'Project directory not found' });

  let absDir;
  try {
    absDir = safeResolve(projectDir, relPath);
  } catch {
    return res.status(400).json({ error: 'Invalid path' });
  }

  if (fs.existsSync(absDir)) return res.status(409).json({ error: 'Folder already exists' });

  try {
    fs.mkdirSync(absDir, { recursive: true });
    // .gitkeep so git tracks the empty folder
    fs.writeFileSync(path.join(absDir, '.gitkeep'), '');
    return res.status(200).json({ ok: true, path: relPath });
  } catch (err) {
    console.error('[project-file-mkdir] fs error', err);
    return res.status(500).json({ error: 'Could not create folder' });
  }
}
