// cv6next — real Support data, shaped to the wired/ template contract.
// This is WIRING (pulled from the existing support flow), not design. It returns
// { state, data } ready for the support-inbox fill-in template. No fake data:
// when nothing has loaded we report loading/empty/error honestly.

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '../../lib/authFetch';
import { hasSession } from '../../lib/convex.js';
import { mailListSnippet } from './presentationClean.js';

const NOREPLY = /(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce[@+]|notifications?@|newsletter@|marketing@|mailchimp|sendgrid|klaviyo|hubspot|salesforce)/i;
const TINTS = ['is-pink', 'is-violet', 'is-green', 'is-neutral'];

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
function tintFor(seed) {
  let h = 0; for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length].replace('is-', '');
}
function relTime(d) {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
function firstLine(s) { return String(s || '').split('\n')[0].slice(0, 140); }

// "Replied in 32s" truth (M27): humanize the ask → first-reply gap.
// Sub-5s gaps are clock artifacts (a reply cannot beat the 60s pipeline), never a
// real reply — return null so a nonsense "Replied in 1s" can never render (M27b,
// Steffen's implausible-latency floor).
export function latencyLabel(seconds) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 5) return null;
  if (seconds < 90) return `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  if (m < 90) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

// A transparent 1-10 triage score: unresolved age + an approaching auto-send
// raise urgency; resolved mail stays quiet. It is deterministic client-side and
// never presented as model certainty.
export function urgencyScore(item, now = Date.now()) {
  if (!item) return 1;
  if (item.status === 'resolved') return 2;
  let score = item.kind === 'email' ? 5 : 4;
  const created = item.createdAt ? new Date(item.createdAt).getTime() : 0;
  const ageHours = created && Number.isFinite(created) ? Math.max(0, (now - created) / 3600000) : 0;
  if (ageHours >= 1) score += 1;
  if (ageHours >= 4) score += 1;
  if (ageHours >= 24) score += 2;
  if (item.hasStaged) score += 1;
  const autoSend = item.autoSendAt ? new Date(item.autoSendAt).getTime() : 0;
  if (autoSend && autoSend > now && autoSend - now <= 30 * 60000) score += 1;
  return Math.max(1, Math.min(10, score));
}

// wish.message = subject line + • summary bullets + "--- ORIGINAL MESSAGE ---" +
// original text + optional [staged_draft:ID|conn:ID] tag (support-email-watch.py).
// Split it here so the pane renders summary and original as separate cards.
const ORIGINAL_DELIM = '--- ORIGINAL MESSAGE ---';
const STAGED_TAG = /\[staged_draft:([^|\]]+)\|conn:([^\]]+)\]/;
function parseWishMessage(message) {
  const raw = String(message || '');
  const tag = raw.match(STAGED_TAG);
  const cleaned = raw.replace(STAGED_TAG, '').trim();
  const [head, ...rest] = cleaned.split(ORIGINAL_DELIM);
  const lines = head.split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[•·]/.test(l)).map((l) => l.replace(/^[•·]\s*/, ''));
  return {
    subjectLine: lines[0] || '',
    summary: bullets.slice(0, 5),
    original: rest.join(ORIGINAL_DELIM).trim(),
    hasStaged: Boolean(tag),
  };
}

// worldId comes from useWorldId() and is null until auth resolves — nothing is
// fetched until then, so another tenant's world can never flash AOM's inbox
// (corner:support R3; same guard pattern as useCampaign).
export function useSupportInbox(worldId) {
  const [wishes, setWishes] = useState(null);
  const [mailboxes, setMailboxes] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | loaded | error

  // `load` must be STABLE. It used to depend on `wishes`/`mailboxes` (to decide the
  // error state), so every successful fetch produced new arrays -> recreated `load` ->
  // re-ran the polling effect -> fetched again, an endless refetch loop. That loop is
  // what made the header counts twitch and rebuilt list DOM under the user constantly.
  // Track "have we ever loaded" in a ref instead, poll every 30s, and never let a
  // failed poll wipe data we already have (keep last data until fresh data arrives).
  const hasDataRef = useRef(false);
  const load = useCallback(async () => {
    if (!worldId) return;
    // No Convex session (render-only page): nothing to read, report an honest empty.
    if (!hasSession()) {
      setWishes([]);
      setMailboxes([]);
      setStatus('loaded');
      hasDataRef.current = true;
      return;
    }
    let ok = false;
    try {
      const r = await authFetch(`/api/support/wishes?world=${encodeURIComponent(worldId)}`, { credentials: 'include' });
      const d = await r.json();
      if (d.ok) { setWishes(d.wishes || []); ok = true; }
    } catch { /* keep last */ }
    if (worldId) {
      try {
        const r2 = await authFetch('/api/support/inbox', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ email: 'patrikmatheson@gmail.com', days: 7 }),
        });
        const d2 = await r2.json();
        if (d2.ok) { setMailboxes(d2.mailboxes || []); ok = true; }
      } catch { /* keep last */ }
    } else { setMailboxes([]); ok = true; }
    if (ok) hasDataRef.current = true;
    setStatus((prev) => (ok || hasDataRef.current ? 'loaded' : (prev === 'loading' ? 'error' : prev)));
  }, [worldId]);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  // ── shape to the template contract ──
  const needsYou = [];
  const watching = [];

  for (const w of wishes || []) {
    const from = (w.email || w.name || '').toLowerCase();
    if (NOREPLY.test(from)) continue;
    if (w.status === 'dismissed' || w.status === 'spam') continue; // server filters too; belt and braces
    const parsed = parseWishMessage(w.message);
    const item = {
      id: w.id, wishId: w.id, kind: 'wish', accessCode: w.access_code,
      initials: initials(w.name || w.email), avatarTint: tintFor(w.email || w.name),
      subject: parsed.subjectLine || firstLine(w.message) || 'New request',
      time: relTime(w.updated_at || w.created_at),
      snippet: mailListSnippet(
        w.name || w.email || 'Someone',
        parsed.subjectLine || firstLine(w.message),
        firstLine(w.latest_response?.body || w.latest_response || parsed.original || w.message),
      ),
      sender: w.name || w.email || 'Someone', senderSub: `to you · ${w.email || 'Support'}`,
      address: w.email || '',
      body: parsed.original || String(w.message || '').trim(),
      summary: parsed.summary,
      // A resolved wish's draft already fired (or is moot) — no "Draft ready" lie.
      hasStaged: parsed.hasStaged && w.status !== 'resolved',
      recommendation: Array.isArray(w.recommendation) ? w.recommendation : [],
      replyOptions: Array.isArray(w.reply_options) ? w.reply_options : [],
      status: w.status,
      threadCount: 1,
      tags: [],
      createdAt: w.created_at || null,
      firstResponseAt: w.first_response_at || null,
      latencySeconds: Number.isFinite(w.latency_seconds) ? w.latency_seconds : null,
      agentRead: (w.agent_read && typeof w.agent_read === 'object') ? w.agent_read : null,
      autoSendAt: w.auto_send_at || null,
    };
    item.urgency = urgencyScore(item);
    if (w.status === 'resolved') watching.push(item);
    else needsYou.push(item);
  }
  const seenIds = new Set();
  for (const box of mailboxes || []) {
    const rows = [...(box.needs || []).map((it) => ['need', it]), ...(box.replied || []).map((it) => ['done', it])];
    for (const [kind, it] of rows) {
      const from = (it.email || it.from || '').toLowerCase();
      if (NOREPLY.test(from)) continue;
      // Stable AND unique: two mailboxes (or a missing threadId) must never yield the
      // same row id — duplicate ids made several rows match the selected id at once
      // (every one rendered highlighted) and gave React duplicate keys.
      let id = `email-${box.email || 'box'}-${it.threadId || it.email || 'row'}`;
      while (seenIds.has(id)) id += '+';
      seenIds.add(id);
      const subject = it.subject || '(no subject)';
      const snippet = mailListSnippet(it.from || it.email || 'Sender', subject, firstLine(it.lastInbound?.snippet || it.snippet));
      const time = relTime(it.lastReply?.date || it.lastInbound?.date || it.date);
      const sender = it.from || it.email || 'Sender';
      const senderSub = `to you · ${it.email || 'mail'}`;
      const body = String(it.lastInbound?.body || it.lastInbound?.snippet || it.snippet || '').trim();
      const threadCount = it.messageCount || (Array.isArray(it.messages) ? it.messages.length : 1) || 1;
      // threadId + the mailbox it lives in let the pane fetch the REAL chain for
      // scan rows too (M27b — these rows used to render a single message only).
      const threadRef = { threadId: it.threadId || null, boxEmail: box.email || null };
      const createdAt = it.lastInbound?.date || it.date || null;
      if (kind === 'need') {
        const item = { id, kind: 'email', initials: initials(it.from || it.email), avatarTint: tintFor(it.email || it.from), subject, time, snippet, sender, senderSub, address: it.email || '', body, threadCount, tags: [], createdAt, ...threadRef };
        item.urgency = urgencyScore(item);
        needsYou.push(item);
      } else {
        const item = { id, kind: 'email', subject, time, snippet, sender, senderSub, address: it.email || '', body, threadCount, status: 'resolved', createdAt, ...threadRef };
        item.urgency = urgencyScore(item);
        watching.push(item);
      }
    }
  }

  const data = {
    counts: { needYou: needsYou.length, watching: watching.length },
    needsYou, watching,
    empty: { title: "You're all caught up", body: 'Nothing needs you right now. New asks the agent flags as real will land here.', actionLabel: watching.length ? `Browse watching (${watching.length})` : 'All clear' },
    loading: { label: 'Preparing your inbox' },
    error: { title: "We couldn't reach your inbox", body: 'Your connection dropped. Nothing was lost. Your last view is saved.', code: 'support · retrying' },
  };

  let state = 'ready';
  if (status === 'loading' && !wishes && !mailboxes) state = 'loading';
  else if (status === 'error') state = 'error';
  else if (!needsYou.length && !watching.length) state = 'empty';

  return { state, data, reload: load };
}
