// POST /api/dashboard/project-file-move
//
// Moves a file within a project's file tree.
// Body: { slug: string, from: string, to: string }
//   slug — project slug
//   from — source path relative to project root (e.g. "CONTEXT.md")
//   to   — destination path relative to project root (e.g. "archive/CONTEXT.md")
//
// If the destination parent directory does not exist it is created.
// Both paths must remain inside the project root (path-traversal safe).
// Tenant-gated.
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

function safeResolve(projectDir, relPath) {
  const abs = path.resolve(projectDir, relPath);
  const base = projectDir.endsWith(path.sep) ? projectDir : projectDir + path.sep;
  if (!abs.startsWith(base) && abs !== projectDir) throw new Error('Path traversal rejected');
  return abs;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { slug, from: fromRel, to: toRel } = req.body || {};
  if (!slug || typeof slug !== 'string') return res.status(400).json({ error: 'slug required' });
  if (!fromRel || typeof fromRel !== 'string') return res.status(400).json({ error: 'from required' });
  if (!toRel || typeof toRel !== 'string') return res.status(400).json({ error: 'to required' });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || slug.length > 80) return res.status(400).json({ error: 'invalid slug' });
  if (fromRel.includes('..') || fromRel.startsWith('/')) return res.status(400).json({ error: 'invalid from path' });
  if (toRel.includes('..') || toRel.startsWith('/')) return res.status(400).json({ error: 'invalid to path' });

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

  let absFrom, absTo;
  try {
    absFrom = safeResolve(projectDir, fromRel);
    absTo   = safeResolve(projectDir, toRel);
  } catch {
    return res.status(400).json({ error: 'Invalid path' });
  }

  if (!fs.existsSync(absFrom)) return res.status(404).json({ error: 'Source file not found' });
  if (fs.existsSync(absTo)) return res.status(409).json({ error: 'Destination already exists' });

  // Create parent directory if needed.
  const absToDir = path.dirname(absTo);
  if (!fs.existsSync(absToDir)) {
    try { fs.mkdirSync(absToDir, { recursive: true }); } catch (err) {
      return res.status(500).json({ error: 'Could not create destination directory' });
    }
  }

  try {
    fs.renameSync(absFrom, absTo);
    return res.status(200).json({ ok: true, from: fromRel, to: toRel });
  } catch (err) {
    console.error('[project-file-move] fs error', err);
    return res.status(500).json({ error: 'Could not move file' });
  }
}
