// DELETE /api/dashboard/project-file-delete?slug=<project>&path=<rel-path>
//
// Deletes a file from a project's file tree.
// Query params:
//   slug — project slug
//   path — file path relative to project root (e.g. "deliverables/deck.pptx")
//
// Path-traversal safe: resolved absolute must remain inside the project dir.
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
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'DELETE only' });

  const { slug, path: relPath } = req.query || {};
  if (!slug || typeof slug !== 'string') return res.status(400).json({ error: 'slug required' });
  if (!relPath || typeof relPath !== 'string') return res.status(400).json({ error: 'path required' });
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || slug.length > 80) return res.status(400).json({ error: 'invalid slug' });
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

  let absPath;
  try {
    absPath = safeResolve(projectDir, relPath);
  } catch {
    return res.status(400).json({ error: 'Invalid path' });
  }

  if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'File not found' });

  // Refuse to delete directories (use a dedicated rmdir endpoint if needed later).
  const stat = fs.statSync(absPath);
  if (stat.isDirectory()) return res.status(400).json({ error: 'Use rmdir for directories' });

  try {
    fs.unlinkSync(absPath);
    return res.status(200).json({ ok: true, path: relPath });
  } catch (err) {
    console.error('[project-file-delete] fs error', err);
    return res.status(500).json({ error: 'Could not delete file' });
  }
}
