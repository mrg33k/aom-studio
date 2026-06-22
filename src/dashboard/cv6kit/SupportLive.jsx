import { useState, useEffect, useCallback } from 'react';
import { SupportView } from './SupportView';
import { authFetch } from '../lib/authFetch';

/**
 * SupportLive — wired wrapper that renders the Claude-design Support view (SupportView)
 * with REAL data from the live support API, with safety-critical reply delegation.
 *
 * Fetches:
 *  - wishes: GET /api/support/wishes
 *  - mailboxes: POST /api/support/inbox (for AOM world only)
 * Polls every 30s to stay fresh.
 *
 * Maps wishes + mailbox emails to SupportView props format.
 * Filters out non-support (automated/marketing) senders.
 * Delegates onDraftReply + onDiscuss to parent (never sends directly).
 * onMarkResolved is a no-op (wired but unused for now).
 */

// ──────────────────────────────────────────────────────────────────────────────
// Filters: keep only real support traffic
// ──────────────────────────────────────────────────────────────────────────────

function isNonSupportEmail(it) {
  const from = String(it.email || it.from || '').toLowerCase();
  const subj = String(it.subject || '').toLowerCase();
  const body = String((it.lastInbound && it.lastInbound.snippet) || it.snippet || '').toLowerCase();
  // Automated / no-reply senders: never a reply-able support thread.
  if (/(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce[@+]|notifications?@|newsletter@|marketing@|mailchimp|sendgrid|salesforce|hubspot)/.test(from)) return true;
  // Obvious bulk marketing: unsubscribe footer AND a promo subject.
  if (/unsubscribe|update your preferences|view (this|in) (your )?browser/.test(body) &&
      /(% off|\bsale\b|webinar|newsletter|deal|limited time|promo|discount|save \$|free trial)/.test(subj + ' ' + body)) return true;
  return false;
}

function isNonSupportWish(w) {
  if (!w || w.status === 'resolved' || w.latest_response) return false;
  if (w.status === 'spam') return true;
  const from = String(w.email || '').toLowerCase();
  const body = String(w.message || '').toLowerCase();
  if (/(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce[@+]|notifications?@|newsletter@|marketing@|mailchimp|sendgrid|klaviyo|kmail-lists|salesforce|hubspot)/.test(from)) return true;
  if (/unsubscribe|update your preferences|manage your preferences|view (this|in) (your )?browser/.test(body) &&
      /(% off|\bsale\b|webinar|newsletter|deal|limited time|promo|discount|save \$|save up to|free trial|purchase online)/.test(body)) return true;
  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// Data mapping: wishes + emails → SupportView props format
// ──────────────────────────────────────────────────────────────────────────────

function mapWishToWish(w) {
  return {
    id: w.id,
    name: w.name || w.email || 'Someone',
    email: w.email,
    subject: w.message ? w.message.split('\n')[0] : null,
    message: w.message,
    status: w.status || 'open',
    created_at: w.created_at,
    updated_at: w.updated_at,
    access_code: w.access_code,
    source: w.source || 'web',
    latest_response: w.latest_response,
  };
}

function mapEmailToInbox(it) {
  return {
    id: `email-${it.threadId || it.email}`,
    from: it.from,
    email: it.email,
    subject: it.subject,
    snippet: it.lastInbound?.snippet || it.snippet,
    threadId: it.threadId,
    lastInbound: it.lastInbound,
    lastReply: it.lastReply,
    date: it.lastReply?.date || it.lastInbound?.date || it.date,
    status: it.lastReply ? 'responded' : 'needs_you',
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook: fetch + poll wishes and mailboxes
// ──────────────────────────────────────────────────────────────────────────────

function useSupportLiveData(worldId) {
  const isAom = worldId === 'aom';
  const [wishes, setWishes] = useState(null);
  const [mailboxes, setMailboxes] = useState(null);
  const [status, setStatus] = useState('loading');

  const load = useCallback(async () => {
    let wishesOk = false;
    let mailboxesOk = false;

    // Fetch wishes
    try {
      const r = await fetch('/api/support/wishes');
      const d = await r.json();
      if (d.ok) { setWishes(d.wishes || []); wishesOk = true; }
    } catch {
      /* keep last */
    }

    // Fetch mailboxes (AOM world only)
    if (isAom) {
      try {
        const r2 = await authFetch('/api/support/inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: 'patrikmatheson@gmail.com', days: 7 }),
        });
        const d2 = await r2.json();
        if (d2.ok) { setMailboxes(d2.mailboxes || []); mailboxesOk = true; }
      } catch {
        /* keep last */
      }
    } else {
      setMailboxes([]);
      mailboxesOk = true;
    }

    // Status: loaded if either succeeded, error only if both failed with nothing loaded
    if (wishesOk || mailboxesOk) {
      setStatus('loaded');
    } else if (!wishes && !mailboxes) {
      setStatus('error');
    }
  }, [isAom, wishes, mailboxes]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  return { wishes, mailboxes, status };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export function SupportLive({ worldId = 'aom', isDesktop = false, onClose, onDiscuss, activeTool = 'support', onNav, onMenu, user = {} }) {
  const { wishes, mailboxes, status } = useSupportLiveData(worldId);
  const [selectedId, setSelectedId] = useState(null);

  // Build wishes array (filter out non-support)
  const wishesList = (wishes || []).filter((w) => !isNonSupportWish(w)).map(mapWishToWish);

  // Build inbox array (flatten mailboxes, filter out non-support)
  const inboxList = [];
  for (const box of mailboxes || []) {
    for (const it of box.needs || []) {
      if (!isNonSupportEmail(it)) inboxList.push(mapEmailToInbox(it));
    }
    for (const it of box.replied || []) {
      if (!isNonSupportEmail(it)) inboxList.push(mapEmailToInbox(it));
    }
  }

  // Compute counts
  const openWishes = wishesList.filter((w) => w.status !== 'resolved').length;
  const waitingWishes = wishesList.filter((w) => w.status === 'needs_you' || w.status === 'needs_team').length;
  const openEmails = inboxList.filter((it) => it.status === 'needs_you').length;
  const respondedEmails = inboxList.filter((it) => it.status === 'responded').length;

  const counts = {
    openWishes,
    waitingWishes,
    openEmails,
    respondedEmails,
  };

  // Find selected item (search by ID in wishes or inbox), tagged with its type so the
  // thread detail renders the right header and body.
  const selectedItem = selectedId
    ? (() => {
        const w = wishesList.find((x) => x.id === selectedId);
        if (w) return { ...w, type: 'wish' };
        const e = inboxList.find((x) => x.id === selectedId);
        if (e) return { ...e, type: 'email' };
        return null;
      })()
    : null;

  // The parent's onDiscuss(text) opens a chat with the EA and posts that text as a user
  // message — so it must be a STRING (an object would post "[object Object]") and only
  // fire on a deliberate tap. Tapping a support item hands it to the EA with full
  // context (the real, existing support flow). Nothing is ever sent to the customer here.
  const discussItem = (item) => {
    if (!onDiscuss || !item) return;
    const who = item.name || item.from || 'a customer';
    const addr = item.email ? ` (${item.email})` : '';
    const subj = item.subject ? `, subject "${item.subject}"` : '';
    const body = String(item.message || item.snippet || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    onDiscuss(`Help me handle this support message from ${who}${addr}${subj}. They wrote: "${body}". Draft the reply you'd send and check it with me before anything goes out.`);
  };

  // Tapping a row opens that item's thread detail in place (real sender + body).
  // "Reply via your assistant" (onDraftReply) hands the item to the EA to draft the
  // reply and check it with Patrik — nothing is ever sent to the customer from here.
  const handleSelectItem = (item) => { if (item && item.id) setSelectedId(item.id); };
  const handleDraftReply = (item) => discussItem(item);
  const handleMarkResolved = () => { /* held: resolve runs from the full Support screen until wired + verified */ };
  const handleRetry = () => {
    // Reset to loading and clear data to force reload
    setWishes(null);
    setMailboxes(null);
  };

  return (
    <SupportView
      wishes={wishesList}
      inbox={inboxList}
      counts={counts}
      selectedItem={selectedItem}
      onSelectItem={handleSelectItem}
      onBack={() => setSelectedId(null)}
      onClose={onClose}
      onDraftReply={handleDraftReply}
      onMarkResolved={handleMarkResolved}
      isDesktop={isDesktop}
      activeTool={activeTool}
      onNav={onNav}
      onMenu={onMenu}
      user={user}
      status={status}
      onRetry={handleRetry}
    />
  );
}
