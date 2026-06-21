import React, { useState, useMemo } from 'react';

/**
 * CV6 kit Support — MOBILE inbox of wishes + emails, then a thread detail.
 * Kit-faithful to ui_kits/tools/support.html (the desktop inbox left pane, brought
 * to the phone as the opening screen the design intends).
 *
 * OPENING SCREEN (selectedItem null): the real inbox — your open asks (wishes from
 *   the site + support emails), each a tappable row with sender, subject, age and a
 *   type pill. Filter All / Wishes / Emails. This is the landing (was a hardcoded
 *   fake agent conversation before).
 * THREAD DETAIL (selectedItem set): the real sender, subject and message body, with
 *   "Reply via Elon" — which hands the item to your EA to draft the reply and check
 *   it with you before anything goes out. Nothing is ever sent to the customer here.
 *
 * Real data shapes (from SupportLive):
 *   wishes: [{ id, name, email, subject, message, status, created_at, source }]
 *   inbox:  [{ id, from, email, subject, snippet, threadId, date, status }]
 *   counts: { openWishes, waitingWishes, openEmails, respondedEmails }
 *
 * Props:
 *   wishes, inbox, counts — real data
 *   selectedItem — the item whose thread to show (null = inbox opening screen)
 *   onSelectItem(item) — open a row's thread detail
 *   onBack() — thread detail: return to the inbox
 *   onClose() — inbox: close the tool
 *   onDraftReply(item) — hand the item to the EA to draft a reply (safe, never sends)
 *   onMarkResolved() — held until wired
 *   isDesktop — reserved (desktop two-pane is a separate map item)
 */

function getInitials(name) {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/);
  return parts.map((p) => p[0] || '').join('').toUpperCase().slice(0, 2) || 'U';
}

function getAvatarColor(name) {
  const initials = getInitials(name);
  const colors = {
    A: { bg: 'rgba(59,130,246,.18)', fg: '#7FB2FF' },
    B: { bg: 'rgba(244,114,182,.18)', fg: '#F8A8D0' },
    C: { bg: 'rgba(168,85,247,.18)', fg: '#C792FF' },
    D: { bg: 'rgba(244,114,182,.18)', fg: '#F8A8D0' },
    E: { bg: 'rgba(52,211,153,.18)', fg: '#38E0B5' },
    G: { bg: 'rgba(251,191,36,.18)', fg: '#FBD855' },
    M: { bg: 'rgba(59,130,246,.18)', fg: '#7FB2FF' },
    P: { bg: 'rgba(168,85,247,.18)', fg: '#C792FF' },
    R: { bg: 'rgba(34,197,94,.18)', fg: '#63E384' },
    S: { bg: 'rgba(239,68,68,.18)', fg: '#F87171' },
    W: { bg: 'rgba(59,130,246,.18)', fg: '#7FB2FF' },
  };
  return colors[initials[0]] || { bg: 'rgba(107,114,128,.18)', fg: '#D1D5DB' };
}

function timeAgo(ts) {
  if (!ts) return '';
  const then = new Date(ts).getTime();
  if (!then || isNaN(then)) return '';
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  try { return new Date(ts).toLocaleDateString(); } catch { return ''; }
}

// Is this item still waiting on the user (needs a reply)?
function needsYou(it) {
  const s = String(it.status || '').toLowerCase();
  if (it.type === 'email') return s === 'needs_you' || s === '';
  return s === 'needs_you' || s === 'needs_team' || s === 'open' || s === '';
}

// One row in the inbox list (a wish or an email).
function pillFor(it) {
  if (it.type === 'email') {
    return it.status === 'responded'
      ? { label: 'Replied', bg: 'var(--surface-2)', fg: 'var(--muted)' }
      : { label: 'Email', bg: 'rgba(244,114,182,.16)', fg: '#F8A8D0' };
  }
  return needsYou(it)
    ? { label: 'Wish', bg: 'var(--accent-weak)', fg: 'var(--accent)' }
    : { label: 'Done', bg: 'var(--surface-2)', fg: 'var(--muted)' };
}

function titleFor(it) {
  if (it.subject) return it.subject;
  const body = String(it.message || it.snippet || '').replace(/\s+/g, ' ').trim();
  if (body) return body.length > 64 ? body.slice(0, 64) + '…' : body;
  return '(No subject)';
}

function SupportView({
  wishes = [],
  inbox = [],
  counts = { openWishes: 0, waitingWishes: 0, openEmails: 0, respondedEmails: 0 },
  selectedItem = null,
  onSelectItem = () => {},
  onBack = () => {},
  onClose = () => {},
  onDraftReply = () => {},
  onMarkResolved = () => {},
  isDesktop = false,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'wishes' | 'emails'

  // All inbox items, merged + newest-first. Computed before any early return so the
  // hook order is stable whether or not a thread is open (Rules of Hooks).
  const items = useMemo(() => {
    const all = [
      ...(wishes || []).map((w) => ({ ...w, type: 'wish' })),
      ...(inbox || []).map((it) => ({ ...it, type: 'email' })),
    ];
    return all.sort((a, b) => {
      const at = new Date(a.created_at || a.date || 0).getTime() || 0;
      const bt = new Date(b.created_at || b.date || 0).getTime() || 0;
      return bt - at;
    });
  }, [wishes, inbox]);

  // ─── Thread detail (an item is selected) ──────────────────────────────────────
  if (selectedItem) {
    const who = selectedItem.from || selectedItem.name || 'Unknown';
    const initials = getInitials(who);
    const avatarColor = getAvatarColor(who);
    const isEmail = selectedItem.type === 'email' || !!selectedItem.threadId || !!selectedItem.from;
    const body = String(selectedItem.message || selectedItem.snippet || '').trim();
    const when = timeAgo(selectedItem.created_at || selectedItem.date);

    return (
      <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
        {/* Status bar */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 16px 6px', fontSize: 15, fontWeight: 600 }}>
          <span>9:41</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{isEmail ? 'Email' : 'Wish'}</span>
        </div>

        {/* Header */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px 12px', borderBottom: '1px solid var(--divider)' }}>
          <button onClick={onBack} aria-label="Back to inbox" style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, marginLeft: -2 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.015em', color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleFor({ ...selectedItem, type: isEmail ? 'email' : 'wish' })}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}{selectedItem.email ? ` · ${selectedItem.email}` : ''}</div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px calc(96px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: 13 }}>
          {/* Message card — real sender, real body */}
          <div style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: 15, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>to you{selectedItem.email ? ` · ${selectedItem.email}` : ''}</div>
              </div>
              {when && <span style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'var(--font-mono)', flex: 'none' }}>{when}</span>}
            </div>
            <div style={{ padding: '15px 16px', fontSize: 13.5, lineHeight: 1.7, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {body || 'No message body was included.'}
            </div>
          </div>

          {isEmail && (
            <div style={{ fontSize: 11.5, color: 'var(--faint)', textAlign: 'center', padding: '0 8px' }}>
              The full email thread opens when you reply through your assistant.
            </div>
          )}
        </div>

        {/* Reply bar — hands the item to the EA (never sends directly) */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderTop: '1px solid var(--divider)', background: 'var(--ground)', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={() => onDraftReply(selectedItem)} style={{ flex: 1, height: 46, borderRadius: 13, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" /></svg>
            Reply via your assistant
          </button>
        </div>
      </div>
    );
  }

  // ─── Inbox opening screen (nothing selected) ──────────────────────────────────
  const wishCount = (wishes || []).length;
  const emailCount = (inbox || []).length;
  const waiting = items.filter(needsYou).length;
  const shown = filter === 'wishes' ? items.filter((i) => i.type === 'wish') : filter === 'emails' ? items.filter((i) => i.type === 'email') : items;

  const chips = [
    { key: 'all', label: 'All', n: items.length },
    { key: 'wishes', label: 'Wishes', n: wishCount },
    { key: 'emails', label: 'Emails', n: emailCount },
  ];

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      {/* Status bar */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 16px 10px', fontSize: 15, fontWeight: 600 }}>
        <span>9:41</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{waiting ? `${waiting} need you` : 'Support'}</span>
      </div>

      {/* Header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px 12px' }}>
        <button onClick={onClose} aria-label="Back" style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, marginLeft: -2 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)' }}>Support</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>
            {items.length} open{waiting ? ` · ${waiting} waiting on you` : ''}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ flex: 'none', display: 'flex', gap: 8, padding: '0 16px 12px' }}>
        {chips.map((c) => {
          const on = filter === c.key;
          return (
            <button key={c.key} onClick={() => setFilter(c.key)} style={{ height: 32, padding: '0 13px', borderRadius: 16, border: on ? 'none' : '1px solid var(--hair)', background: on ? 'var(--accent-weak)' : 'transparent', color: on ? 'var(--accent)' : 'var(--muted)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {c.label}<span style={{ opacity: 0.7 }}>{c.n}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 16px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        {shown.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>
            {items.length === 0 ? 'No open support items right now.' : 'Nothing in this filter.'}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--faint)', margin: '4px 2px 8px' }}>Open asks</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, overflow: 'hidden' }}>
              {shown.map((it, i) => {
                const who = it.from || it.name || 'Someone';
                const ac = getAvatarColor(who);
                const pill = pillFor(it);
                const when = timeAgo(it.created_at || it.date);
                return (
                  <button key={(it.type === 'email' ? 'e' : 'w') + (it.id || i)} onClick={() => onSelectItem(it)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: 'none', borderTop: i === 0 ? 'none' : '1px solid var(--divider)', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                    <span style={{ width: 38, height: 38, borderRadius: '50%', background: ac.bg, color: ac.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{getInitials(who)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleFor(it)}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}{when ? ` · ${when}` : ''}</div>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: pill.bg, color: pill.fg, flex: 'none' }}>{pill.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export { SupportView };
export default SupportView;
