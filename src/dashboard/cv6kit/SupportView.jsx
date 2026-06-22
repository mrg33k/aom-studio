import React, { useState, useMemo } from 'react';

/**
 * CV6 kit Support — MOBILE inbox of wishes + emails, then a thread detail.
 * Built from the design system: ui_kits/mobile/support-inbox.html (the opening
 * inbox) + the support thread reader.
 *
 * OPENING SCREEN (selectedItem null): the real inbox, grouped exactly as the design
 *   draws it — a "Needs you" group (the .needs triage badge) for asks that still
 *   need action, then a "Watching" group for handled/responded items. Each row is an
 *   avatar + subject + time + a sender/preview line. Responded items carry a REPLIED
 *   chip. The header is the one Corner mobile header (.mhdr); search filters the list.
 *   No fabricated state chips — the grouping and the REPLIED chip come from the real
 *   item status (needs_you / responded / resolved).
 * THREAD DETAIL (selectedItem set): the real sender, subject and message body, with
 *   "Reply via your assistant" — which hands the item to your EA to draft the reply
 *   and check it with you before anything goes out. Nothing is ever sent here.
 *
 * Real data shapes (from SupportLive):
 *   wishes: [{ id, name, email, subject, message, status, created_at, source }]
 *   inbox:  [{ id, from, email, subject, snippet, threadId, date, status }]
 *   counts: { openWishes, waitingWishes, openEmails, respondedEmails }
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

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
        <div className="mstatus" style={{ height: 'auto', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>9:41</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{isEmail ? 'Email' : 'Wish'}</span>
        </div>

        <div className="mhdr">
          <button className="mback" onClick={onBack} aria-label="Back to inbox">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="mhtitle">
            <div className="mttl">{titleFor({ ...selectedItem, type: isEmail ? 'email' : 'wish' })}</div>
            <div className="msub">{who}{selectedItem.email ? ` · ${selectedItem.email}` : ''}</div>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px calc(96px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: 15, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid var(--divider)' }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{initials}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>to you{selectedItem.email ? ` · ${selectedItem.email}` : ''}</div>
              </div>
              {when && <span className="mono" style={{ fontSize: 10, color: 'var(--faint)', flex: 'none' }}>{when}</span>}
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
        <div className="mcomposer" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <button className="assign" onClick={() => onDraftReply(selectedItem)} style={{ flex: 1, justifyContent: 'center', height: 46, borderRadius: 13, fontSize: 14 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" /></svg>
            Reply via your assistant
          </button>
        </div>
      </div>
    );
  }

  // ─── Inbox opening screen (nothing selected) ──────────────────────────────────
  const q = query.trim().toLowerCase();
  const match = (it) => !q || `${it.subject || ''} ${it.from || it.name || ''} ${it.message || it.snippet || ''}`.toLowerCase().includes(q);
  const needsList = items.filter((it) => needsYou(it) && match(it));
  const watchList = items.filter((it) => !needsYou(it) && match(it));
  const needCount = items.filter(needsYou).length;
  const watchCount = items.length - needCount;

  const renderAvatar = (who, mail) => mail ? (
    <span style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', background: 'var(--chip)', color: 'var(--muted)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
    </span>
  ) : (
    (() => { const ac = getAvatarColor(who); return (
      <span style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', fontSize: 13, fontWeight: 600, background: ac.bg, color: ac.fg }}>{getInitials(who)}</span>
    ); })()
  );

  const renderRow = (it, watching, key) => {
    const who = it.from || it.name || 'Someone';
    const when = timeAgo(it.created_at || it.date);
    const replied = it.status === 'responded' || !!it.latest_response;
    const preview = String(it.message || it.snippet || '').replace(/\s+/g, ' ').trim();
    return (
      <button key={key} onClick={() => onSelectItem(it)} style={{ width: '100%', display: 'flex', gap: 12, padding: '12px 16px', border: 'none', borderBottom: '1px solid var(--divider)', background: 'transparent', textAlign: 'left', cursor: 'pointer', opacity: watching ? 0.72 : 1 }}>
        {renderAvatar(who, watching && it.type === 'email')}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleFor(it)}</span>
            {when && <span className="mono" style={{ fontSize: 10, color: 'var(--faint)', flex: 'none' }}>{when}</span>}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45, marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {who}{preview ? `. ${preview}` : ''}
          </div>
          {replied && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <span className="astat is-done"><span className="sd" />REPLIED</span>
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      <div className="mstatus" style={{ height: 'auto', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>9:41</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>Inbox</span>
      </div>

      <div className="mhdr">
        <button className="ib" onClick={onClose} aria-label="Menu" style={{ width: 36, height: 36, borderRadius: 10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <div className="mhtitle">
          <div className="mttl">Support</div>
          <div className="msub">{needCount} need you · {watchCount} watching</div>
        </div>
        <button className="ib" onClick={() => setSearchOpen((v) => !v)} aria-label="Search" style={{ width: 36, height: 36, borderRadius: 10, color: searchOpen ? 'var(--accent)' : undefined }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        </button>
      </div>

      {searchOpen && (
        <div style={{ flex: 'none', padding: '10px 16px', borderBottom: '1px solid var(--divider)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 40, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--hair)', padding: '0 13px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search support…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontFamily: 'var(--font-sans)', fontSize: 14 }} />
          </div>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
        {items.length === 0 ? (
          <div className="empty" style={{ paddingTop: 64 }}>
            <div className="e-ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
            <div className="e-t">You're all caught up</div>
            <div className="e-s">Nothing needs you right now. New asks your agent flags as real will land here.</div>
          </div>
        ) : (
          <>
            {needsList.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 8px' }}>
                  <span className="needs"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>Needs you</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{needsList.length}</span>
                </div>
                {needsList.map((it, i) => renderRow(it, false, 'n' + (it.id || i)))}
              </>
            )}
            {watchList.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 8px' }}>
                  <span className="eyebrow">Watching</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{watchList.length}</span>
                </div>
                {watchList.map((it, i) => renderRow(it, true, 'w' + (it.id || i)))}
              </>
            )}
            {needsList.length === 0 && watchList.length === 0 && (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>Nothing matches your search.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { SupportView };
export default SupportView;
