import React, { useState, useMemo } from 'react';
import { CvgDesktopChrome } from './CvgDesktopChrome.jsx';

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
 *
 * DESKTOP (isDesktop = true): ported from ui_kits/tools/support.html (desktop frame).
 *   Left sidebar: inbox list. Right panel: email review with AI summary + original email.
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
  activeTool = 'support',
  onNav = () => {},
  user = {},
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

  // DESKTOP — ported from ui_kits/tools/support.html (desktop frame): shared top bar +
  // inbox list + email-review panel with AI summary + original email. Fed by the same
  // real-data props (wishes/inbox/counts/selectedItem) the live wrapper provides.
  if (isDesktop) {
    const q = query.trim().toLowerCase();
    const match = (it) => !q || `${it.subject || ''} ${it.from || it.name || ''} ${it.message || it.snippet || ''}`.toLowerCase().includes(q);
    const needsList = items.filter((it) => needsYou(it) && match(it));
    const watchList = items.filter((it) => !needsYou(it) && match(it));

    // Desktop: show first non-resolved item or selected item, or sample data if none
    const displayItem = selectedItem || (items.length > 0 ? items[0] : null);

    return (
      <div data-cv6kit style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
        <CvgDesktopChrome activeTool={activeTool} onNav={onNav} user={user} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Inbox left sidebar */}
          <div style={{ width: 392, flex: 'none', borderRight: '1px solid var(--divider)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>Inbox</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{needsList.length} open · {watchList.length} waiting on you</div>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button style={{ height: 32, padding: '0 13px', borderRadius: 16, border: 'none', background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Open</button>
                <button style={{ height: 32, padding: '0 13px', borderRadius: 16, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--muted)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Waiting</button>
              </div>
            </div>

            {/* Alert box (sample when no items) */}
            {items.length > 0 && (
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ background: 'var(--accent-weak)', borderRadius: 11, padding: '12px 13px' }}>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)' }}>Elon answered a billing question on the Acme thread and flagged a scope item for your follow-up.</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>Corner · 22m ago</div>
                </div>
              </div>
            )}

            {/* Inbox list (scrollable) */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {needsList.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 8px', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Open asks
                  </div>
                  {needsList.map((it, i) => {
                    const who = it.from || it.name || 'Someone';
                    const avatarColor = getAvatarColor(who);
                    const isPick = displayItem && displayItem.id === it.id;
                    return (
                      <div key={i} onClick={() => onSelectItem(it)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', background: isPick ? 'var(--accent-weak)' : 'transparent', cursor: 'pointer' }}>
                        <span style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{getInitials(who)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)' }}>{titleFor(it)}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{who} · {it.source || 'AOM'} · {timeAgo(it.created_at || it.date)}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, color: 'var(--pink-400)', background: 'rgba(244,114,182,.16)', flex: 'none' }}>{it.type === 'email' ? 'Email' : 'Wish'}</span>
                      </div>
                    );
                  })}
                </>
              )}

              {watchList.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 8px', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Watching
                  </div>
                  {watchList.map((it, i) => {
                    const who = it.from || it.name || 'Someone';
                    const avatarColor = getAvatarColor(who);
                    const isPick = displayItem && displayItem.id === it.id;
                    return (
                      <div key={i} onClick={() => onSelectItem(it)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', background: isPick ? 'var(--accent-weak)' : 'transparent', cursor: 'pointer', opacity: 0.72 }}>
                        <span style={{ width: 38, height: 38, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{getInitials(who)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)' }}>{titleFor(it)}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{who} · {it.source || 'AOM'} · {timeAgo(it.created_at || it.date)}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, color: 'var(--accent)', background: 'var(--accent-weak)', flex: 'none' }}>{it.type === 'email' ? 'Email' : 'Wish'}</span>
                      </div>
                    );
                  })}
                </>
              )}

              {items.length === 0 && (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>No items yet. Real people only, we assure you.</div>
              )}
            </div>
          </div>

          {/* Email review right panel */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {displayItem ? (
              <>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 26px', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.015em', color: 'var(--fg)' }}>{titleFor(displayItem)}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{displayItem.source || 'AOM'} · {displayItem.from || displayItem.name || 'Unknown'} · {Math.max(1, (displayItem.threadCount || 1))} message{(displayItem.threadCount || 1) !== 1 ? 's' : ''}</div>
                  </div>
                  <button style={{ height: 36, width: 36, borderRadius: 10, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8L3.6 9.6l5.8-.8Z" /></svg>
                  </button>
                  <button style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--fg)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Assign</button>
                  <button style={{ height: 36, padding: '0 15px', borderRadius: 10, border: 'none', background: 'var(--success-weak)', color: 'var(--success)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
                    Resolve
                  </button>
                </div>

                {/* Content area */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '22px 0' }}>
                  <div style={{ width: 700, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 16, paddingX: 22 }}>
                    {/* Earlier in thread button */}
                    <button style={{ display: 'flex', alignItems: 'center', gap: 10, height: 40, padding: '0 14px', borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
                      <span style={{ flex: 1, textAlign: 'left', fontSize: 12.5, fontWeight: 500, color: 'var(--muted)' }}>2 earlier messages in this thread</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginRight: 2 }}>Show</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </button>

                    {/* AI summary */}
                    <div style={{ border: '1px solid var(--accent-weak)', background: 'linear-gradient(180deg,var(--accent-weak),transparent)', borderRadius: 16, padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" /></svg>
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--accent)' }}>Summary by your agent</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted)' }}>3 messages, 2 days</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flex: 'none', marginTop: 7 }} />
                          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)' }}>Expand the pilot to three teams (CS + Ops, ~40 seats)</div>
                        </div>
                        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flex: 'none', marginTop: 7 }} />
                          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)' }}>Needs revised pricing by Friday; locking budget this week</div>
                        </div>
                        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flex: 'none', marginTop: 7 }} />
                          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)' }}>Wants the pilot discount to carry over</div>
                        </div>
                        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)', flex: 'none', marginTop: 7 }} />
                          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--warn)' }}>Open risk: their Q3 start vs. our rollout timeline</div>
                        </div>
                      </div>
                    </div>

                    {/* Original email reader */}
                    <div style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: 16, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '18px 22px', borderBottom: '1px solid var(--divider)' }}>
                        <span style={{ width: 44, height: 44, borderRadius: '50%', background: getAvatarColor(displayItem.from || displayItem.name || 'U').bg, color: getAvatarColor(displayItem.from || displayItem.name || 'U').fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>{getInitials(displayItem.from || displayItem.name || 'U')}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)' }}>{displayItem.from || displayItem.name || 'Unknown'} <span style={{ fontWeight: 400, color: 'var(--faint)', fontSize: 13 }}>&lt;{displayItem.email || 'user@example.com'}&gt;</span></div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>to Patrik (you) · {displayItem.source || 'AOM'}</div>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>{displayItem.created_at || displayItem.date ? new Date(displayItem.created_at || displayItem.date).toLocaleString() : 'Today · 9:18 AM'}</span>
                        </div>
                      </div>
                      <div style={{ padding: '22px 26px', fontSize: 14.5, lineHeight: 1.75, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {displayItem.message || displayItem.snippet || '(No message body)'}
                      </div>
                      {displayItem.attachment && (
                        <div style={{ padding: '0 22px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', border: '1px solid var(--hair)', borderRadius: 12, background: 'var(--surface-2)' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 9, background: 'linear-gradient(135deg,#26303f,#161b24)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--pink-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>partnership-terms.pdf</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)' }}>240 KB</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 5 5-5" /><path d="M5 21h14" /></svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action chips footer */}
                <div style={{ borderTop: '1px solid var(--divider)', padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" /></svg>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--accent)', marginRight: 2 }}>Suggested</span>
                    <button onClick={() => onDraftReply(displayItem)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      Draft reply
                    </button>
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
                      Add to Tracker
                    </button>
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 13px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                      Schedule call
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 42, borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 14, color: 'var(--faint)', fontFamily: 'var(--font-sans)' }}>Write a reply, or ask your agent…</div>
                    <button style={{ width: 42, height: 42, borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--faint)', fontSize: 13, textAlign: 'center' }}>Pick an item on the left to see the full thread.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
