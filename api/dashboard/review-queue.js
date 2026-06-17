// GET /api/dashboard/review-queue?world=<world-id>
//
// Aggregates deliverables from recently-active rooms into a review queue.
// Returns the 40 most recent files (newest first) from deliverable-type kinds
// (deliverable, research-drop, visuals, screenshots) updated within the last 3 days.
//
// Response shape:
// {
//   items: [
//     {
//       name: "hero-banner-v2.png",
//       path: "corner/users/aom/projects/ambition-mechanical/missions/website/deliverables/hero-banner-v2.png",
//       project: "ambition-mechanical",
//       mission: "website",
//       kind: "deliverable",
//       type: { key: "image", label: "Image", color: "#8B5CF6" },
//       last_modified: "2026-06-15T14:32:00Z",
//       notes: "SVG conversion of original design"
//     },
//     ...
//   ]
// }

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

// File type detection by extension
const TYPE_MAP = {
  image: { key: 'image', label: 'Image', color: '#8B5CF6' },
  video: { key: 'video', label: 'Video', color: '#EC4899' },
  doc: { key: 'doc', label: 'Document', color: '#0066FF' },
  copy: { key: 'copy', label: 'Copy', color: '#F59E0B' },
  code: { key: 'code', label: 'Code', color: '#10B981' },
};

const EXTENSIONS = {
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'],
  video: ['.mp4', '.mov', '.webm', '.mkv'],
  doc: ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx'],
  copy: ['.md', '.txt'],
  code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java'],
};

function detectType(filename) {
  const ext = path.extname(filename).toLowerCase();
  for (const [key, exts] of Object.entries(EXTENSIONS)) {
    if (exts.includes(ext)) return TYPE_MAP[key];
  }
  return TYPE_MAP.doc; // default
}

function isHidden(name) {
  if (name.startsWith('.')) return true;
  if (['node_modules', 'archive', 'vision-qa', 'assets'].includes(name)) return true;
  return false;
}

function walkDeliverables(dirAbs, depth = 0) {
  const files = [];
  if (depth > 3) return files;

  let entries;
  try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); } catch { return files; }

  for (const ent of entries) {
    if (isHidden(ent.name)) continue;
    const abs = path.join(dirAbs, ent.name);

    if (ent.isDirectory()) {
      files.push(...walkDeliverables(abs, depth + 1));
      continue;
    }

    if (!ent.isFile()) continue;

    try {
      const st = fs.statSync(abs);
      files.push({
        name: ent.name,
        path: abs,
        mtime: st.mtime,
      });
    } catch { }
  }

  return files;
}

function collectDeliverables(worldId) {
  const items = [];
  const projectsDir = path.join(AOM_EA_ROOT, 'corner', 'users', worldId, 'projects');

  if (!fs.existsSync(projectsDir)) return items;

  let projects;
  try { projects = fs.readdirSync(projectsDir); } catch { return items; }

  const now = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  for (const projSlug of projects) {
    if (isHidden(projSlug)) continue;

    const projAbs = path.join(projectsDir, projSlug);

    // Check project-level deliverables
    const projFiles = walkDeliverables(projAbs);
    for (const f of projFiles) {
      if (now - f.mtime.getTime() > threeDaysMs) continue;
      items.push({
        name: f.name,
        path: f.path,
        project: projSlug,
        mission: null,
        kind: 'deliverable',
        type: detectType(f.name),
        last_modified: f.mtime.toISOString(),
        notes: '',
      });
    }

    // Check missions within the project
    const missionsDir = path.join(projAbs, 'missions');
    if (fs.existsSync(missionsDir)) {
      let missions;
      try { missions = fs.readdirSync(missionsDir); } catch { missions = []; }

      for (const missionSlug of missions) {
        if (isHidden(missionSlug)) continue;

        const missionAbs = path.join(missionsDir, missionSlug);
        const missionFiles = walkDeliverables(missionAbs);
        for (const f of missionFiles) {
          if (now - f.mtime.getTime() > threeDaysMs) continue;
          items.push({
            name: f.name,
            path: f.path,
            project: projSlug,
            mission: missionSlug,
            kind: 'deliverable',
            type: detectType(f.name),
            last_modified: f.mtime.toISOString(),
            notes: '',
          });
        }
      }
    }
  }

  // Sort by mtime newest-first and return top 40
  items.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());
  return items.slice(0, 40);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { world } = req.query;
  if (!world || typeof world !== 'string') {
    return res.status(400).json({ error: 'world required' });
  }

  // Tenant gate
  try {
    await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status || 403).json({ error: err.message });
    }
    throw err;
  }

  const items = collectDeliverables(world);
  return res.status(200).json({ items });
}
