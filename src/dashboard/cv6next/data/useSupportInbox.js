// cv6next — real Support data, shaped to the wired/ template contract.
// This is WIRING (pulled from the existing support flow), not design. It returns
// { state, data } ready for the support-inbox fill-in template. No fake data:
// when nothing has loaded we report loading/empty/error honestly.

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../lib/authFetch';

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

export function useSupportInbox(worldId = 'aom') {
  const isAom = worldId === 'aom';
  const [wishes, setWishes] = useState(null);
  const [mailboxes, setMailboxes] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | loaded | error

  const load = useCallback(async () => {
    let ok = false;
    try {
      const r = await fetch('/api/support/wishes');
      const d = await r.json();
      if (d.ok) { setWishes(d.wishes || []); ok = true; }
    } catch { /* keep last */ }
    if (isAom) {
      try {
        const r2 = await authFetch('/api/support/inbox', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ email: 'patrikmatheson@gmail.com', days: 7 }),
        });
        const d2 = await r2.json();
        if (d2.ok) { setMailboxes(d2.mailboxes || []); ok = true; }
      } catch { /* keep last */ }
    } else { setMailboxes([]); ok = true; }
    setStatus((prev) => (ok ? 'loaded' : (wishes || mailboxes ? prev : 'error')));
  }, [isAom, wishes, mailboxes]);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  // ── shape to the template contract ──
  const needsYou = [];
  const watching = [];

  for (const w of wishes || []) {
    const from = (w.email || w.name || '').toLowerCase();
    if (NOREPLY.test(from)) continue;
    const item = {
      id: w.id, initials: initials(w.name || w.email), avatarTint: tintFor(w.email || w.name),
      subject: firstLine(w.message) || 'New request', time: relTime(w.updated_at || w.created_at),
      snippet: `${w.name || w.email || 'Someone'} · ${firstLine(w.latest_response || w.message)}`,
      // thread-view fields (P9): real sender + full original message; no fabricated thread history
      sender: w.name || w.email || 'Someone', senderSub: `to you · ${w.email ? 'Support' : 'Support'}`,
      body: String(w.message || '').trim(), threadCount: 1,
      tags: [],
    };
    if (w.status === 'resolved') watching.push({ id: w.id, subject: item.subject, time: item.time, snippet: item.snippet, sender: item.sender, senderSub: item.senderSub, body: item.body, threadCount: 1 });
    else needsYou.push(item);
  }
  for (const box of mailboxes || []) {
    const rows = [...(box.needs || []).map((it) => ['need', it]), ...(box.replied || []).map((it) => ['done', it])];
    for (const [kind, it] of rows) {
      const from = (it.email || it.from || '').toLowerCase();
      if (NOREPLY.test(from)) continue;
      const id = `email-${it.threadId || it.email}`;
      const subject = it.subject || '(no subject)';
      const snippet = `${it.from || it.email || ''} · ${firstLine(it.lastInbound?.snippet || it.snippet)}`;
      const time = relTime(it.lastReply?.date || it.lastInbound?.date || it.date);
      const sender = it.from || it.email || 'Sender';
      const senderSub = `to you · ${it.email || 'mail'}`;
      const body = String(it.lastInbound?.body || it.lastInbound?.snippet || it.snippet || '').trim();
      const threadCount = it.messageCount || (Array.isArray(it.messages) ? it.messages.length : 1) || 1;
      if (kind === 'need') {
        needsYou.push({ id, initials: initials(it.from || it.email), avatarTint: tintFor(it.email || it.from), subject, time, snippet, sender, senderSub, body, threadCount, tags: [] });
      } else {
        watching.push({ id, subject, time, snippet, sender, senderSub, body, threadCount });
      }
    }
  }

  const data = {
    counts: { needYou: needsYou.length, watching: watching.length },
    needsYou, watching,
    empty: { title: "You're all caught up", body: 'Nothing needs you right now. New asks the agent flags as real land here.', actionLabel: watching.length ? `Browse watching (${watching.length})` : 'All clear' },
    loading: { label: 'Gathering your inbox…' },
    error: { title: "We couldn't reach your inbox", body: 'Your connection dropped. Nothing was lost. Your last view is saved.', code: 'support · retrying' },
  };

  let state = 'ready';
  if (status === 'loading' && !wishes && !mailboxes) state = 'loading';
  else if (status === 'error') state = 'error';
  else if (!needsYou.length && !watching.length) state = 'empty';

  return { state, data, reload: load };
}
