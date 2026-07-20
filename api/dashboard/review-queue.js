// GET /api/dashboard/review-queue?world=<world-id>[&limit=40&offset=0][&view=all]
//
// The Review queue, sourced from the CHAT BOUNDARY: items are Supabase `messages`
// rows that crossed the chat as a deliberate hand-off (share-file.py stamps
// metadata.handoff=true / source='share-file') plus the user's own uploads
// (metadata.attachment / metadata.attachments). The watcher's auto-dumps
// (source='auto-share', no handoff flag) never qualify.
//
// NEEDS-REVIEW SEMANTICS (Patrik, 2026-07-13): the WAITING set is AGENT
// deliverables only. "Things agents send me need review — my own uploads don't."
// User uploads NEVER enter the waiting set, the badge count, or the default
// (needs-review) response. They stay in the collection so ?view=all can still
// stamp a verdict on an upload the user chose to review manually (review is a
// manual action available on ANY file — that path is client-side openFileItem).
//
// Review-loop (2026-07-12): the queue now CONSULTS DECISION ROWS. Every verdict
// (approve / request-changes / dismiss / send-checklist) is a messages row with
// source='review-decision' (review-decision.js). Decided items are suppressed
// from the default response by BOTH identities:
//   • deliverable_id  — the exact item id (store URL / path) the UI decided on,
//   • source_path + sha256 — the content identity share-file.py stamps, so a
//     re-share of the SAME unchanged file stays suppressed while a fixed file
//     (new digest) re-enters the queue as new work.
// ?view=all returns everything with a `verdict` field from the matching decision.
//
// Response: { items: [ { name, path, project, mission, kind, type:{key,label,color},
//                        source_kind, source_path, sha256, last_modified[, verdict] } ],
//             total, offset, hasMore, source, newest_ts, counts: { waiting, decided } }

import path from 'path';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { UPLOADS_ROLE_FILTER, UPLOADS_PRESENCE_FILTERS, attachmentsOfMessage } from '../_lib/uploadsIdentity.js';
import { fileRefFromChatAttachment, fileRefToReviewQueueItem } from '../_lib/fileRef.js';
import { buildReviewTruthSnapshot } from '../_lib/reviewTruth.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_LIMIT = 40;     // one page of the queue (first load = same cost as before)
const HARD_CAP = 5000;        // ceiling on the total set served

// ── Chat-boundary source (files-in-app: Review = what crossed the chat) ─────────
// Review shows ONLY files that crossed the chat boundary as a deliberate hand-off:
//   • an agent hand-off  → role=assistant, metadata.handoff=true (share-file.py),
//     from HANDOFF_CUTOFF forward (older agent posts are the watcher's auto-dumps),
//   • the user's own uploads → role=user with metadata.attachment (clean, all-time).
// Each row also carries source_kind ('handoff' | 'upload') so the UI can split the
// Review and Uploads filters. Forward-only cutoff = the day the clean signal began.
const HANDOFF_CUTOFF = '2026-07-12';
// Watcher auto-shares became review-eligible with the One Page build (Patrik's
// file rule: any file the agent sent across the chat is reviewable). Forward-only
// from its own cutoff so historical auto-dump spam never floods the waiting set.
const AUTOSHARE_CUTOFF = '2026-07-20';
const MSG_FETCH_CAP = 2000;   // rows pulled per side before merge/sort (well past the real volume)

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
  if (m === 'text/html' || m === 'application/xhtml+xml') return TYPE_MAP.sitefile;
  // A bare http(s) address with no known file extension is a live-site link — still
  // reviewable; the viewer renders it in the sitelive frame. Fall back to doc.
  return TYPE_MAP.doc;
}

// fetch with a hard timeout so one slow call can never hang the function.
async function fetchWithTimeout(url, ms, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
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

// Shape one message row into queue item(s). A message can carry EITHER a single
// attachment (metadata.attachment = {url,mime,name,size,sha256}) OR a batch the user
// dropped at once (metadata.attachments = [ {…}, … ]) — the same two shapes the
// Files panel reads (files.js). We emit one item per file so a 4-photo or 19-photo
// drop shows every file, not just the first. Returns an array (possibly empty).
function rowsFromMessage(msg, sourceKind) {
  const meta = msg?.metadata || {};
  const ts = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
  if (!ts) return [];
  // Collect every attachment shape via the SHARED uploads identity (one definition
  // with files.js type=uploads — see api/_lib/uploadsIdentity.js), plus a bare
  // source_path fallback (agent hand-offs stamp that with no attachment obj).
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
      // Preserve the historical viewer id: an absolute store URL or a corner path.
      path: rawUrl,
      last_modified: new Date(ts).toISOString(),
    }));
  }
  return out;
}

// The chat-boundary queue: deliberate agent hand-offs (forward-only from the cutoff)
// + the user's own uploads (all-time). AOM is super-admin and sees every room; other
// worlds are scoped to their own world_id (tenant isolation preserved).
export async function collectFromMessages(world) {
  const isAom = world === 'aom';
  // Tenancy column is client_id, NOT world_id — verified against live data
  // 2026-07-13: every messages row carries world_id='aom' (mis-stamped default)
  // while client_id is truthful, so a world_id filter matched ZERO rows for real
  // tenants and their queues sat silently empty. Same column fetchDecisions and
  // files.js type=uploads already use.
  const worldFilter = isAom ? '' : `&client_id=eq.${encodeURIComponent(world)}`;
  const common = `select=id,client_id,timestamp,project,role,source,metadata&order=timestamp.desc&limit=${MSG_FETCH_CAP}`;
  // Deliberate hand-offs: role=assistant with metadata.handoff=true OR the share-file
  // source (pre-stamp rows still count — they were always deliberate CLI shares), from
  // the cutoff forward so the watcher's older auto_share dumps never leak in.
  const handoffQ = `${common}&role=eq.assistant&timestamp=gte.${HANDOFF_CUTOFF}`
    + `&or=(metadata->>handoff.eq.true,source.eq.share-file)${worldFilter}`;
  // Uploads: any message the user attached a file to — ALL-TIME, deliberately NOT
  // subject to HANDOFF_CUTOFF (the cutoff exists to exclude the watcher's historical
  // role=assistant auto-dump spam; a user upload is always a deliberate act). The
  // identity (role + the two metadata shapes) is the SHARED definition in
  // api/_lib/uploadsIdentity.js — two queries because PostgREST can't OR across two
  // jsonb path filters cleanly; else every multi-file upload is invisible.
  const [singleF, multiF] = UPLOADS_PRESENCE_FILTERS;
  const uploadQ = `${common}&${UPLOADS_ROLE_FILTER}&${singleF}${worldFilter}`;
  const uploadMultiQ = `${common}&${UPLOADS_ROLE_FILTER}&${multiF}${worldFilter}`;
  // Watcher auto-shares ARE agent hand-offs (corner:one-corner drop 2): any file
  // the agent sent across the chat is reviewable, forward-only from AUTOSHARE_CUTOFF.
  const autoShareQ = `${common}&role=eq.assistant&timestamp=gte.${AUTOSHARE_CUTOFF}`
    + `&source=eq.auto-share&metadata->attachment.not.is.null${worldFilter}`;
  const [handoffs, uploads, uploadsMulti, autoShares] = await Promise.all([
    fetchMessages(handoffQ), fetchMessages(uploadQ), fetchMessages(uploadMultiQ), fetchMessages(autoShareQ),
  ]);
  const items = [];
  for (const m of handoffs) items.push(...rowsFromMessage(m, 'handoff'));
  for (const m of autoShares) items.push(...rowsFromMessage(m, 'handoff'));
  for (const m of uploads) items.push(...rowsFromMessage(m, 'upload'));
  for (const m of uploadsMulti) items.push(...rowsFromMessage(m, 'upload'));
  // Dedupe by file path (an agent may re-share the same deliverable across versions —
  // keep the newest row for each unique path), then newest-first.
  const byPath = new Map();
  for (const it of items) {
    const prev = byPath.get(it.path);
    if (!prev || new Date(it.last_modified) > new Date(prev.last_modified)) byPath.set(it.path, it);
  }
  return [...byPath.values()].sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());
}

// Past verdicts: every review decision is a messages row with source='review-decision'
// (review-decision.js), carrying { action, deliverable_id, source_path?, sha256? } in
// metadata. Two lookup maps so the queue can suppress decided items by exact id AND
// by content identity. Rows come newest-first, so the FIRST verdict seen per key wins
// (i.e. the newest decision is authoritative). Only CLOSING actions count —
// send-checklist is notes-in-flight, the item stays under review.
const CLOSING_ACTIONS = new Set(['approve', 'request-changes', 'dismiss']);
export async function fetchDecisions(world) {
  const isAom = world === 'aom';
  const worldFilter = isAom ? '' : `&client_id=eq.${encodeURIComponent(world)}`;
  // `id` rides along so ?view=all can hand the client the decision ROW id — the
  // Files tool's "Restore to review" targets it with the existing undo action
  // (review-decision.js action:'undo', dismiss rows only).
  const q = `select=id,timestamp,metadata&source=eq.review-decision&timestamp=gte.${HANDOFF_CUTOFF}`
    + `&order=timestamp.desc&limit=${MSG_FETCH_CAP}${worldFilter}`;
  const rows = await fetchMessages(q);
  const decidedIds = new Map();      // deliverable_id -> { action, id }
  const decidedContent = new Map();  // `${source_path} ${sha256}` -> { action, id }
  for (const row of rows) {
    const md = row?.metadata || {};
    const action = md.action || '';
    if (!CLOSING_ACTIONS.has(action)) continue;
    if (md.deliverable_id && !decidedIds.has(md.deliverable_id)) {
      decidedIds.set(md.deliverable_id, { action, id: row.id || null });
    }
    // Content key only when BOTH parts are present — a partial key would collide.
    if (md.source_path && md.sha256) {
      const key = `${md.source_path} ${md.sha256}`;
      if (!decidedContent.has(key)) decidedContent.set(key, { action, id: row.id || null });
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

  // Pagination: the UI pages through the full set via limit/offset so any item ever
  // sent is reachable, while the first load stays a single 40-item page.
  const limit = clampInt(req.query.limit, DEFAULT_LIMIT, 1, HARD_CAP);
  const offset = clampInt(req.query.offset, 0, 0, HARD_CAP);

  // SOURCE: the chat boundary + the decision log, both from Supabase, in parallel.
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
