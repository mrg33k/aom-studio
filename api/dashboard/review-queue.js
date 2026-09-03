// GET /api/dashboard/review-queue?world=<world-id>[&limit=40&offset=0][&view=all]
//
// The Review queue, sourced from the chat boundary: items are Convex message
// rows that crossed the chat as a deliberate hand-off (share-file.py stamps
// metadata.handoff=true / source='share-file') plus the user's own uploads
// (attachments on a role=user row). Watcher auto-shares count from their own
// cutoff forward.
//
// Needs-review semantics (Patrik, 2026-07-13): the waiting set is agent
// deliverables only. User uploads stay in the collection so ?view=all can
// stamp a verdict on one the user chose to review by hand.
//
// Decisions: every verdict (approve / request-changes / dismiss) is a message
// row with source='review-decision'. Decided items are suppressed by exact
// deliverable_id and by content identity (source_path + sha256).
//
// Backend: Convex (corner:retire-supabase R2, 2026-09-03). messages:findBySource
// for the source-tagged rows, messages:listSince for the role-scoped scans.
//
// Response: { items: [ { name, path, project, mission, kind, type:{key,label,color},
//                        source_kind, source_path, sha256, last_modified[, verdict] } ],
//             total, offset, hasMore, source, newest_ts, counts: { waiting, decided } }

import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { attachmentsOfMessage } from '../_lib/uploadsIdentity.js';
import { fileRefFromChatAttachment, fileRefToReviewQueueItem } from '../_lib/fileRef.js';
import { buildReviewTruthSnapshot } from '../_lib/reviewTruth.js';
import { convexQuery } from '../_lib/reportsStore.js';

const DEFAULT_LIMIT = 40;     // one page of the queue
const HARD_CAP = 5000;        // ceiling on the total set served

// Forward-only cutoffs: the day the clean hand-off signal began, and the day
// watcher auto-shares became review-eligible.
const HANDOFF_CUTOFF = '2026-07-12';
const AUTOSHARE_CUTOFF = '2026-07-20';
const HANDOFF_CUTOFF_MS = Date.parse(HANDOFF_CUTOFF);
const AUTOSHARE_CUTOFF_MS = Date.parse(AUTOSHARE_CUTOFF);
const MSG_FETCH_CAP = 2000;   // rows pulled per side before merge/sort

const TYPE_MAP = {
  image: { key: 'image', label: 'Image', color: '#8B5CF6' },
  video: { key: 'video', label: 'Video', color: '#EC4899' },
  doc: { key: 'doc', label: 'Document', color: '#0066FF' },
  copy: { key: 'copy', label: 'Copy', color: '#F59E0B' },
  code: { key: 'code', label: 'Code', color: '#10B981' },
  sitefile: { key: 'sitefile', label: 'Web page', color: '#38BDF8' },
};
const EXTENSIONS = {
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'],
  video: ['.mp4', '.mov', '.webm', '.mkv'],
  doc: ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx'],
  copy: ['.md', '.txt'],
  code: ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java'],
  sitefile: ['.html', '.htm'],
};

// Type a chat-boundary file permissively: never drop it for an unknown
// extension, default to 'doc'.
function typeForChatFile(name, mime, url = '') {
  const ext = path.extname(name || '').toLowerCase();
  for (const [key, exts] of Object.entries(EXTENSIONS)) {
    if (exts.includes(ext)) return TYPE_MAP[key];
  }
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image/')) return TYPE_MAP.image;
  if (m.startsWith('video/')) return TYPE_MAP.video;
  if (m === 'application/pdf') return TYPE_MAP.doc;
  if (m === 'text/html' || m === 'application/xhtml+xml') return TYPE_MAP.sitefile;
  return TYPE_MAP.doc;
}

// Convex query that returns [] on any failure so one bad side can never take
// down the queue.
async function safeQuery(name, args) {
  try {
    const rows = await convexQuery(name, args);
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

// A Convex message row in the shape rowsFromMessage and the file identity
// helpers read: timestamp, client_id, project, role, source, metadata with
// attachment(s). Convex keeps attachments as a normalized top-level array;
// fold it back under metadata when the caller's metadata carried none.
function compatRow(r, world) {
  const meta = (r.metadata && typeof r.metadata === 'object') ? { ...r.metadata } : {};
  if (Array.isArray(r.attachments) && r.attachments.length && !meta.attachments && !meta.attachment) {
    meta.attachments = r.attachments.map((a) => ({
      url: a.url || null, name: a.name || null, mime: a.mime || null, size: a.size ?? null,
      sha256: a.sha256 || null, source_path: a.sourcePath || null,
    }));
  }
  return {
    id: String(r._id),
    client_id: world,
    timestamp: Number.isFinite(r.createdAt) ? new Date(r.createdAt).toISOString() : null,
    project: r.project ?? meta.project_slug ?? null,
    role: r.role || (r.agentSlug ? 'assistant' : 'user'),
    source: r.source || null,
    metadata: meta,
    createdAt: r.createdAt,
  };
}

const hasAttachment = (row) => attachmentsOfMessage(row.metadata).length > 0 || !!row.metadata?.source_path;

// Shape one message row into queue item(s), one per attached file.
function rowsFromMessage(msg, sourceKind) {
  const meta = msg?.metadata || {};
  const ts = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
  if (!ts) return [];
  const atts = attachmentsOfMessage(meta);
  if (!atts.length && meta.source_path) atts.push({ url: meta.source_path });
  const out = [];
  for (const att of atts) {
    const rawUrl = String(att.url || '');
    if (!rawUrl) continue;
    const fileRef = fileRefFromChatAttachment({
      attachment: att,
      message: msg,
      sourceKind,
      tenantId: msg.client_id,
    });
    out.push(fileRefToReviewQueueItem(fileRef, {
      path: rawUrl,
      last_modified: new Date(ts).toISOString(),
    }));
  }
  return out;
}

// The chat-boundary queue: deliberate agent hand-offs (forward-only from the
// cutoff) + the user's own uploads (all-time). Scoped to the world's rooms.
export async function collectFromMessages(world) {
  const [shareFile, autoShareRaw, assistantRecent, userAll] = await Promise.all([
    safeQuery('messages:findBySource', { worldId: world, source: 'share-file', limit: 1000 }),
    safeQuery('messages:findBySource', { worldId: world, source: 'auto-share', limit: 1000 }),
    safeQuery('messages:listSince', { worldSlug: world, since: HANDOFF_CUTOFF_MS, role: 'assistant', limit: MSG_FETCH_CAP }),
    safeQuery('messages:listSince', { worldSlug: world, since: 0, role: 'user', limit: MSG_FETCH_CAP }),
  ]);
  const rows = (list) => list.map((r) => compatRow(r, world));
  // Deliberate hand-offs: share-file rows, or any assistant row flagged
  // metadata.handoff=true, from the cutoff forward.
  const handoffs = [
    ...rows(shareFile).filter((r) => r.createdAt >= HANDOFF_CUTOFF_MS),
    ...rows(assistantRecent).filter((r) => r.metadata?.handoff === true || r.metadata?.handoff === 'true'),
  ];
  // Watcher auto-shares are hand-offs too, from their own cutoff, when they
  // actually carry a file.
  const autoShares = rows(autoShareRaw).filter((r) => r.createdAt >= AUTOSHARE_CUTOFF_MS && hasAttachment(r));
  // Uploads: any user row with an attachment, all-time.
  const uploads = rows(userAll).filter(hasAttachment);

  const items = [];
  for (const m of handoffs) items.push(...rowsFromMessage(m, 'handoff'));
  for (const m of autoShares) items.push(...rowsFromMessage(m, 'handoff'));
  for (const m of uploads) items.push(...rowsFromMessage(m, 'upload'));
  // Dedupe by file path (keep the newest row per path), then newest-first.
  const byPath = new Map();
  for (const it of items) {
    const prev = byPath.get(it.path);
    if (!prev || new Date(it.last_modified) > new Date(prev.last_modified)) byPath.set(it.path, it);
  }
  return [...byPath.values()].sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());
}

// Past verdicts: source='review-decision' rows carrying { action,
// deliverable_id, source_path?, sha256? } in metadata. Newest decision wins.
// Only closing actions count; send-checklist is notes in flight.
const CLOSING_ACTIONS = new Set(['approve', 'request-changes', 'dismiss']);
export async function fetchDecisions(world) {
  const raw = await safeQuery('messages:findBySource', { worldId: world, source: 'review-decision', limit: 1000 });
  const rows = raw.filter((r) => r.createdAt >= HANDOFF_CUTOFF_MS).sort((a, b) => b.createdAt - a.createdAt);
  const decidedIds = new Map();      // deliverable_id -> { action, id }
  const decidedContent = new Map();  // `${source_path} ${sha256}` -> { action, id }
  for (const row of rows) {
    const md = row?.metadata || {};
    const action = md.action || '';
    if (!CLOSING_ACTIONS.has(action)) continue;
    const id = String(row._id);
    if (md.deliverable_id && !decidedIds.has(md.deliverable_id)) {
      decidedIds.set(md.deliverable_id, { action, id });
    }
    if (md.source_path && md.sha256) {
      const key = `${md.source_path} ${md.sha256}`;
      if (!decidedContent.has(key)) decidedContent.set(key, { action, id });
    }
  }
  return { decidedIds, decidedContent };
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

  const limit = clampInt(req.query.limit, DEFAULT_LIMIT, 1, HARD_CAP);
  const offset = clampInt(req.query.offset, 0, 0, HARD_CAP);

  const [all, { decidedIds, decidedContent }] = await Promise.all([
    collectFromMessages(world),
    fetchDecisions(world),
  ]);

  return res.status(200).json(buildReviewTruthSnapshot({
    items: all,
    decisions: { decidedIds, decidedContent },
    view: req.query.view,
    limit,
    offset,
  }));
}

// Parse a query-string integer, clamped to [min, max], falling back to def.
function clampInt(v, def, min, max) {
  const n = parseInt(Array.isArray(v) ? v[0] : v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export { typeForChatFile };
