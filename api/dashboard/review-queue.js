// GET /api/dashboard/review-queue?world=<world-id>[&limit=40&offset=0]
//
// Aggregates deliverables from the world's rooms into a review queue: the most
// recent real deliverable files (newest first), with NO age window — older work
// stays reachable (Review R2). Excludes canon (VISION/CONTEXT/BUILD/RESEARCH) and
// the tape. The full set is capped at HARD_CAP; the UI pages through it via
// limit/offset ("Load older items"), default 40 per page.
//
// IMPORTANT: Vercel functions have NO disk access to the AOM-EA checkout, so the
// canonical source is the RAG tunnel's /project-files-walk (same pattern as
// project-files.js). We list the world's projects from Supabase, walk each via
// the tunnel, and aggregate. Local fs is only a dev fallback.
//
// Response: { items: [ { name, path, project, mission, kind, type:{key,label,color}, last_modified } ],
//             total, offset, hasMore, source }

import fs from 'fs';
import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const AOM_EA_ENV = process.env.AOM_EA_ROOT;
const AOM_EA_HARDCODED = '/Users/aom-inhouse/aom-studio-transfer/AOM-EA';
const AOM_EA_SIBLING = path.resolve(process.cwd(), '..', 'AOM-EA');
const AOM_EA_ROOT = AOM_EA_ENV || (fs.existsSync(AOM_EA_HARDCODED) ? AOM_EA_HARDCODED : AOM_EA_SIBLING);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';

const DEFAULT_LIMIT = 40;     // one page of the queue (first load = same cost as before)
const HARD_CAP = 5000;        // ceiling on the total set served — raised (R5) so deep queues are reachable

// ── Chat-boundary source (files-in-app: Review = what crossed the chat) ─────────
// Review no longer walks disk (that was the ~10.9k auto_share flood by design).
// It shows ONLY files that crossed the chat boundary as a deliberate hand-off:
//   • an agent hand-off  → role=assistant, metadata.handoff=true (share-file.py),
//     from HANDOFF_CUTOFF forward (older agent posts are the watcher's auto-dumps),
//   • the user's own uploads → role=user with metadata.attachment (clean, ~88, all-time).
// Each row also carries source_kind ('handoff' | 'upload') so the UI can split the
// Review and Uploads filters. Forward-only cutoff = the day the clean signal began.
const HANDOFF_CUTOFF = '2026-07-12';
const MSG_FETCH_CAP = 2000;   // rows pulled per side before merge/sort (well past the real volume)

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
// Process / canon / handoff docs are NOT deliverables a person reviews — they are
// internal plumbing (mission canon, agent handoffs, support-ask notes). They were
// leaking into the queue as "copy" because they are .md. Skip them by name so the
// queue only shows real finished work. Real copy deliverables (an article, a
// script) still pass.
const PROCESS_DOC_NAMES = new Set([
  'context.md', 'vision.md', 'build.md', 'research.md', 'last-conversation.md',
  'readme.md', 'plan.md', 'index.md', 'punchlist.md', 'incoming-tasks.md',
  'claude.md', 'agent.md', 'notes.md', 'todo.md',
  'open-questions.md', 'open_questions.md', 'questions.md',
  'phonebook.md',
  // agent tooling / internal session artifacts (Review R4, 2026-07-06)
  'tuning.md', 'wizard-progress.md', 'slop_candidates.txt', 'aud_list.txt',
]);
function isProcessDoc(filename) {
  const base = (filename || '').toLowerCase().trim();
  if (PROCESS_DOC_NAMES.has(base)) return true;
  // agent handoffs (corner-<mission>-<date>-<time>.md), *-handoff.md, *.handoff.md
  if (/(^|[-.])handoff\.md$/.test(base) || /-handoff\.md$/.test(base)) return true;
  if (/^corner-.*-\d{4}-?\d{2}-?\d{2}/.test(base)) return true;
  // support-ask / triage notes
  if (/^support-ask-/.test(base) || /^triage-/.test(base)) return true;
  // Working notes (plans/steps/status/queues/logs) are internal even when agents drop
  // them into deliverables/ — Patrik's CV6 bug: the queue must show finished work only.
  // Mirrored in AOM-EA scripts/build-review-queue.py (is_process_doc).
  if (/(^|-)(loop|queue|plan|plans|steps|status|state|log|checklist|backlog|roadmap|todo|todos|punch-?list)\.(md|txt)$/.test(base)) return true;
  // Build internals that read as "code"/"copy" deliverables but are mission tooling:
  // ffmpeg concat lists / filelists, and build/generate scripts. Nobody "reviews" a
  // concat list. (API-side first; data-side builder should mirror.)
  if (/^(filelist|file-list)\.txt$/.test(base) || /(^|[-_])concat\.txt$/.test(base)) return true;
  if (/^(build|make|gen|generate)-.*\.(py|js|mjs|cjs|ts|sh)$/.test(base)) return true;
  // Review R4 (2026-07-06): additional internal-doc patterns from queue audit.
  // live-note-snapshot-* — temp session snapshots
  if (/^live-note-snapshot[-_]/.test(base)) return true;
  // *.skill.md — agent tooling definitions
  if (/\.skill\.md$/.test(base)) return true;
  // *-control-guide.md — system control guides (WIZARD-CONTROL-GUIDE.md)
  if (/-control-guide\.(md|txt)$/.test(base)) return true;
  // enable-*.md — ops instruction files (ENABLE-DAILY-ROLL.md)
  if (/^enable-/.test(base)) return true;
  // *-outline.md / *_outline.txt — outline working drafts
  if (/(^|[-_])outline\.(md|txt)$/.test(base)) return true;
  // design-notes.md, *-notes.md — internal design/session notes
  if (/(^|[-_])notes\.(md|txt)$/.test(base)) return true;
  // tracker-*.md — internal round/agent trackers
  if (/^tracker[-_]/.test(base)) return true;
  // critique-*.md — internal design critique docs
  if (/^critique[-_]/.test(base)) return true;
  // replace/analyze/move/etc. helper scripts — not client deliverables
  if (/(^|[-_])(replace|analyze|analyse|move|rebucket|transcribe|identify|classify|equalize)[-.].*\.(py|js|mjs|cjs|ts|sh)$/.test(base)) return true;
  return false;
}

// ── Review R3 exclusions (mirrors AOM-EA scripts/build-review-queue.py) ─────
// Agent QA artifacts + app runtime data are NOT deliverables. The cron builder
// now excludes them at the source; these mirrors keep the FALLBACK paths (tunnel
// walk, disk walk) — and even a stale or polluted cache — from re-polluting the
// UI. (2026-07-06 incident: r17-*.jpeg loop screenshots served as
// "aheadofmarket.com deliverables" and filled the whole first page.)
const QA_DIR_NAMES = ['screenshots', 'screenshot', 'shots', 'qa', 'qa-shots', 'verify', 'verification', 'probes'];
const APP_INTERNAL_DIR_NAMES = [
  'app', 'thumbs', 'proxies', 'cache', 'tmp', 'temp',
  'footage-reorg', // analysis/helper scripts — not deliverables (Review R4)
  'critiques',     // internal design critique docs (Review R4)
  'qa-frames',    // QA frame captures — never real deliverables (Review R5)
];
const EXCLUDED_DIR_NAMES = new Set([...QA_DIR_NAMES, ...APP_INTERNAL_DIR_NAMES]);
const QA_FILE_RES = [
  /^r\d+[-_].*\.(png|jpe?g|webp|gif|avif)$/i,  // loop-round screenshots: r17-local-case2.jpeg
  /(^|[-_])shot[-_.]/i,                        // shot-*, *-shot-*, hero-shot.png
  /(^|[-_])verify[-_.]/i,                      // verify-*, *-verify.*
  /^agent-shot/i,                              // explicit agent-shot outputs
  /(^|[-_])probe[-_.]/i,                       // probe artifacts
  /^\d+_snapshot\.(png|jpe?g|webp)$/i,         // NNN_snapshot.png meeting-frame captures (Review R4)
];
function isQaArtifact(name) {
  const b = String(name || '').toLowerCase().trim();
  return QA_FILE_RES.some((rx) => rx.test(b));
}
// True when any DIRECTORY segment of the item's corner-relative path is a QA /
// app-internal staging dir (case-insensitive, any depth — Screenshots/2026-07-06/…).
// Also catches dir-name prefixes: 'ab-test-*', 'ab_test-*' (A/B test dirs, Review R4).
function inExcludedDir(relPath) {
  const segs = String(relPath || '').split('/');
  segs.pop(); // the filename itself is judged by isQaArtifact/isProcessDoc
  return segs.some((s) => {
    const sl = s.toLowerCase();
    return EXCLUDED_DIR_NAMES.has(sl) || sl.startsWith('ab-test') || sl.startsWith('ab_test');
  });
}
// One gate for every serve path: cache rows, tunnel-walk rows, disk-walk rows.
function isReviewable(name, relPath) {
  return !isQaArtifact(name) && !isProcessDoc(name) && !inExcludedDir(relPath);
}
// Returns the type for a reviewable artifact, or null for data/log/system files
// (.json, .jsonl, .log, .lock, etc.) and process/canon docs which a person does
// not "review" — those must never clutter the queue.
function detectType(filename) {
  if (isProcessDoc(filename)) return null;
  const ext = path.extname(filename || '').toLowerCase();
  for (const [key, exts] of Object.entries(EXTENSIONS)) {
    if (exts.includes(ext)) return TYPE_MAP[key];
  }
  return null;
}

// List the project slugs whose deliverables this world may review.
//
// AOM is the super-admin world and sees every room (mirrors missions-tree.js,
// which leaves allowedProjectSlugs=null for aom). The narrow client_id=eq.aom
// query misses every project that lives under its own client_id, so the review
// queue came back empty even with hundreds of recent deliverables across rooms.
// For aom: list ALL project slugs. Every other world stays scoped to its own
// client_id so tenant isolation is preserved.
async function listProjectSlugs(world) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const url = world === 'aom'
      ? `${SUPABASE_URL}/rest/v1/projects?select=slug`
      : `${SUPABASE_URL}/rest/v1/projects?client_id=eq.${encodeURIComponent(world)}&select=slug`;
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!r.ok) return [];
    const rows = await r.json();
    if (!Array.isArray(rows)) return [];
    const slugs = rows.map((x) => x.slug).filter((s) => typeof s === 'string' && /^[a-z0-9][a-z0-9.-]*$/.test(s));
    return [...new Set(slugs)];
  } catch {
    return [];
  }
}

// Pre-built queue cache. The full walk (55 projects, ~10s each via the tunnel) is
// far too slow to sit on the request path, so a local cron (scripts/build-review-
// queue.py) walks disk directly and writes this file; we serve it instantly via the
// same tunnel read review-comments uses. Returns the items array, or null if absent.
async function readQueueCache(world) {
  const rel = `corner/users/${world}/missions/master-loop/deliverables/review-queue.json`;
  let raw = null;
  try {
    const r = await fetchWithTimeout(`${RAG_TUNNEL_URL}/project-file-raw?path=${encodeURIComponent(rel)}`, 5000, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
    if (r && r.ok) raw = await r.text();
  } catch (_) { /* fall through to disk */ }
  if (raw == null) {
    try {
      const p = path.join(AOM_EA_ROOT, rel);
      if (fs.existsSync(p)) raw = fs.readFileSync(p, 'utf8');
    } catch (_) { /* ignore */ }
  }
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    return Array.isArray(d.items) ? d.items : null;
  } catch (_) { return null; }
}

// fetch with a hard timeout so one slow tunnel call can never hang the function.
async function fetchWithTimeout(url, ms, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

// Run async tasks with a bounded concurrency and an overall wall-clock deadline.
// Past the deadline, remaining tasks resolve to [] rather than being started, so the
// endpoint always returns promptly with whatever it managed to gather.
async function runBounded(inputs, fn, { concurrency = 8, deadlineMs = 20000 } = {}) {
  const started = Date.now();
  const results = new Array(inputs.length);
  let cursor = 0;
  async function worker() {
    while (cursor < inputs.length) {
      const i = cursor++;
      if (Date.now() - started > deadlineMs) { results[i] = []; continue; }
      try { results[i] = await fn(inputs[i]); } catch (_) { results[i] = []; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, inputs.length || 1) }, worker));
  return results;
}

// Walk one project through the tunnel; return its review-eligible files (newest first).
async function walkProjectViaTunnel(slug) {
  try {
    const url = `${RAG_TUNNEL_URL}/project-files-walk?slug=${encodeURIComponent(slug)}`;
    const r = await fetchWithTimeout(url, 7000, { headers: { 'User-Agent': 'aom-vercel-proxy' } });
    if (!r.ok) return [];
    const body = await r.json();
    const out = [];
    const pushFrom = (files, mission) => {
      for (const f of files || []) {
        if (!f || EXCLUDE_KINDS.has(f.kind)) continue;
        if (!isReviewable(f.name, f.path)) continue; // QA artifacts / staging dirs are not deliverables
        const type = detectType(f.name);
        if (!type) continue;        // skip data/log/system files (.json, .jsonl, .log…)
        const ts = f.last_modified ? new Date(f.last_modified).getTime() : 0;
        if (!ts) continue;          // no timestamp = cannot order it; skip (no age window — R2)
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
function collectViaDisk(world) {
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
      // Never descend into QA staging / app-internal dirs (Screenshots/, qa/,
      // thumbs/, cache/…) — their contents are not deliverables.
      // Also skip ab-test* dirs (Review R4).
      const entLower = ent.name.toLowerCase();
      if (ent.isDirectory() && (EXCLUDED_DIR_NAMES.has(entLower) || entLower.startsWith('ab-test') || entLower.startsWith('ab_test'))) continue;
      const abs = path.join(dirAbs, ent.name);
      if (ent.isDirectory()) { acc.push(...walk(abs, depth + 1)); continue; }
      if (!ent.isFile()) continue;
      if (isQaArtifact(ent.name)) continue; // stray verification shots outside the dirs above
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
      // 'screenshots' removed: it was ALL agent verification shots (Review R3) —
      // walking it re-polluted the queue whenever the cache missed.
      for (const sub of ['deliverables', 'visuals', 'exports']) {
        const d = path.join(delivAbs, missionSlug, sub);
        if (!fs.existsSync(d)) continue;
        for (const f of walk(d)) {
          const type = detectType(f.name);
          if (!type) continue;       // no age window (R2): newest-first + HARD_CAP bound the set
          items.push({ name: f.name, path: f.path, project: projSlug, mission: missionSlug, kind: 'deliverable', type, last_modified: f.mtime.toISOString() });
        }
      }
    }
  }
  return items;
}

// Type a chat-boundary file permissively: it already crossed the boundary as a
// deliberate hand-off, so NEVER drop it for an unknown extension — default to 'doc'
// (a live link with no file extension reviews as a doc/site). Extension first, then
// mime, so a .tiff/.heic upload still resolves to an image instead of vanishing.
function typeForChatFile(name, mime, url = '') {
  const ext = path.extname(name || '').toLowerCase();
  for (const [key, exts] of Object.entries(EXTENSIONS)) {
    if (exts.includes(ext)) return TYPE_MAP[key];
  }
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image/')) return TYPE_MAP.image;
  if (m.startsWith('video/')) return TYPE_MAP.video;
  if (m === 'application/pdf') return TYPE_MAP.doc;
  // A bare http(s) address with no known file extension is a live-site link — still
  // reviewable; the viewer renders it in the sitelive frame. Fall back to doc.
  return TYPE_MAP.doc;
}

// PostgREST GET against the messages table with the service key. Returns [] on any
// failure so one bad side can never take down the queue.
async function fetchMessages(query) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const r = await fetchWithTimeout(
      `${SUPABASE_URL}/rest/v1/messages?${query}`,
      8000,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

// Shape one message row (carrying metadata.attachment) into a queue item, or null.
function rowFromMessage(msg, sourceKind) {
  const meta = msg?.metadata || {};
  const att = meta.attachment || {};
  const rawUrl = String(att.url || meta.source_path || '');
  if (!rawUrl) return null;
  const name = att.name || rawUrl.split('/').pop() || 'File';
  const type = typeForChatFile(name, att.mime, rawUrl);
  const ts = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
  if (!ts) return null;
  return {
    name,
    path: rawUrl,                     // the viewer loads this as item.id (abs URL or corner path)
    project: msg.project || '',
    mission: meta.mission_slug || null,
    kind: 'deliverable',
    type,
    source_kind: sourceKind,          // 'handoff' | 'upload' — feeds the Review / Uploads filters
    last_modified: new Date(ts).toISOString(),
  };
}

// The chat-boundary queue: deliberate agent hand-offs (forward-only from the cutoff)
// + the user's own uploads (all-time). AOM is super-admin and sees every room; other
// worlds are scoped to their own world_id (tenant isolation preserved).
async function collectFromMessages(world) {
  const isAom = world === 'aom';
  const worldFilter = isAom ? '' : `&world_id=eq.${encodeURIComponent(world)}`;
  const common = `select=timestamp,project,role,source,metadata&order=timestamp.desc&limit=${MSG_FETCH_CAP}`;
  // Deliberate hand-offs: role=assistant with metadata.handoff=true OR the share-file
  // source (pre-stamp rows still count — they were always deliberate CLI shares), from
  // the cutoff forward so the watcher's older auto_share dumps never leak in.
  const handoffQ = `${common}&role=eq.assistant&timestamp=gte.${HANDOFF_CUTOFF}`
    + `&or=(metadata->>handoff.eq.true,source.eq.share-file)${worldFilter}`;
  // Uploads: any message the user attached a file to (all-time — a clean ~88).
  const uploadQ = `${common}&role=eq.user&metadata->attachment=not.is.null${worldFilter}`;
  const [handoffs, uploads] = await Promise.all([fetchMessages(handoffQ), fetchMessages(uploadQ)]);
  const items = [];
  for (const m of handoffs) { const it = rowFromMessage(m, 'handoff'); if (it) items.push(it); }
  for (const m of uploads) { const it = rowFromMessage(m, 'upload'); if (it) items.push(it); }
  // Dedupe by file path (an agent may re-share the same deliverable across versions —
  // keep the newest row for each unique path), then newest-first.
  const byPath = new Map();
  for (const it of items) {
    const prev = byPath.get(it.path);
    if (!prev || new Date(it.last_modified) > new Date(prev.last_modified)) byPath.set(it.path, it);
  }
  return [...byPath.values()].sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());
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

  // Pagination (Review R2/R5): the UI pages through the full set via limit/offset so any
  // item ever sent is reachable, while the first load stays a single 40-item page.
  // R5: total is the real cache length (not capped at 500) so the client knows how deep
  // the queue is and can show an honest "X of Y" count in the header.
  const limit = clampInt(req.query.limit, DEFAULT_LIMIT, 1, HARD_CAP);
  const offset = clampInt(req.query.offset, 0, 0, HARD_CAP);
  const page = (all, source) => {
    const total = all.length;
    const items = all.slice(offset, offset + limit);
    return res.status(200).json({ items, total, offset, hasMore: offset + items.length < total, source });
  };

  // SOURCE: the chat boundary, not the disk. Review shows only files a person
  // deliberately handed over in chat (agent hand-offs since the cutoff + the user's
  // own uploads) — never the ~10.9k watcher auto-dumps that the old disk-walk served
  // and then fought with a giant blocklist. One clean Supabase query, already
  // newest-first and deduped.
  const items = await collectFromMessages(world);
  return page(items, 'chat');
}

// Parse a query-string integer, clamped to [min, max], falling back to def.
function clampInt(v, def, min, max) {
  const n = parseInt(Array.isArray(v) ? v[0] : v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}
