// GET /api/dashboard/review-queue?world=<world-id>
//
// Aggregates deliverables from the world's rooms into a review queue: the 40
// most recent real deliverable files (newest first) updated within the last
// 3 days. Excludes canon (VISION/CONTEXT/BUILD/RESEARCH) and the tape.
//
// IMPORTANT: Vercel functions have NO disk access to the AOM-EA checkout, so the
// canonical source is the RAG tunnel's /project-files-walk (same pattern as
// project-files.js). We list the world's projects from Supabase, walk each via
// the tunnel, and aggregate. Local fs is only a dev fallback.
//
// Response: { items: [ { name, path, project, mission, kind, type:{key,label,color}, last_modified } ] }

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 40;

// Kinds that are NOT review material (the canon docs + the agent's own tape).
const EXCLUDE_KINDS = new Set(['canon', 'tape']);

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
// Returns the type for a reviewable artifact, or null for data/log/system files
// (.json, .jsonl, .log, .lock, etc.) which a person does not "review" — those
// must never clutter the queue.
function detectType(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  for (const [key, exts] of Object.entries(EXTENSIONS)) {
    if (exts.includes(ext)) return TYPE_MAP[key];
  }
  return null;
}

// List the project slugs that belong to this world.
async function listProjectSlugs(world) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const url = `${SUPABASE_URL}/rest/v1/projects?client_id=eq.${encodeURIComponent(world)}&select=slug`;
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!r.ok) return [];
    const rows = await r.json();
    if (!Array.isArray(rows)) return [];
    return rows.map((x) => x.slug).filter((s) => typeof s === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(s));
  } catch {
    return [];
  }
}

// Walk one project through the tunnel; return its review-eligible files (recent).
async function walkProjectViaTunnel(slug, now) {
  try {
    const url = `${RAG_TUNNEL_URL}/project-files-walk?slug=${encodeURIComponent(slug)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
    if (!r.ok) return [];
    const body = await r.json();
    const out = [];
    const pushFrom = (files, mission) => {
      for (const f of files || []) {
        if (!f || EXCLUDE_KINDS.has(f.kind)) continue;
        const type = detectType(f.name);
        if (!type) continue;        // skip data/log/system files (.json, .jsonl, .log…)
        const ts = f.last_modified ? new Date(f.last_modified).getTime() : 0;
        if (!ts || now - ts > THREE_DAYS_MS) continue;
        out.push({
          name: f.name,
          path: f.path,           // kept server-side only; UI shows name + room
          project: slug,
          mission: mission || null,
          kind: f.kind || 'deliverable',
          type,
          last_modified: new Date(ts).toISOString(),
        });
      }
    };
    pushFrom(body.files, null);
    for (const m of body.missions || []) pushFrom(m.files, m.slug);
    return out;
  } catch {
    return [];
  }
}

// Local-disk fallback (vercel dev only): reuse a shallow walk.
function collectViaDisk(world, now) {
  const items = [];
  const projectsDir = path.join(AOM_EA_ROOT, 'corner', 'users', world, 'projects');
  if (!fs.existsSync(projectsDir)) return items;
  let projects;
  try { projects = fs.readdirSync(projectsDir); } catch { return items; }
  const walk = (dirAbs, depth = 0) => {
    const acc = [];
    if (depth > 3) return acc;
    let entries;
    try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); } catch { return acc; }
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue;
      const abs = path.join(dirAbs, ent.name);
      if (ent.isDirectory()) { acc.push(...walk(abs, depth + 1)); continue; }
      if (!ent.isFile()) continue;
      try { const st = fs.statSync(abs); acc.push({ name: ent.name, path: abs, mtime: st.mtime }); } catch { /* ignore */ }
    }
    return acc;
  };
  for (const projSlug of projects) {
    if (projSlug.startsWith('.')) continue;
    const projAbs = path.join(projectsDir, projSlug);
    const delivAbs = path.join(projAbs, 'missions');
    if (!fs.existsSync(delivAbs)) continue;
    let missions; try { missions = fs.readdirSync(delivAbs); } catch { missions = []; }
    for (const missionSlug of missions) {
      if (missionSlug.startsWith('.')) continue;
      for (const sub of ['deliverables', 'screenshots', 'visuals', 'exports']) {
        const d = path.join(delivAbs, missionSlug, sub);
        if (!fs.existsSync(d)) continue;
        for (const f of walk(d)) {
          const type = detectType(f.name);
          if (!type) continue;
          if (now - f.mtime.getTime() > THREE_DAYS_MS) continue;
          items.push({ name: f.name, path: f.path, project: projSlug, mission: missionSlug, kind: 'deliverable', type, last_modified: f.mtime.toISOString() });
        }
      }
    }
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const { world } = req.query;
  if (!world || typeof world !== 'string') return res.status(400).json({ error: 'world required' });

  try {
    await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status || 403).json({ error: err.message });
    throw err;
  }

  const now = Date.now();
  let items = [];

  // Canonical path: aggregate through the RAG tunnel (works on Vercel).
  const slugs = await listProjectSlugs(world);
  if (slugs.length) {
    const perProject = await Promise.all(slugs.map((s) => walkProjectViaTunnel(s, now)));
    items = perProject.flat();
  }

  // Local-dev fallback only when the tunnel path yielded nothing.
  if (!items.length) items = collectViaDisk(world, now);

  items.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());
  return res.status(200).json({ items: items.slice(0, MAX_ITEMS) });
}
