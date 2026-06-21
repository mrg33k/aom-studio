import React, { useState } from 'react';

/**
 * CV6 kit Support — inbox + ask detail with Agent-assist talking points and suggested replies
 * Kit-faithful to ui_kits/tools/support.html (desktop/mobile two-pane and single-pane layouts).
 *
 * Real data shapes:
 *   wish = { id, name, email, subject, message, status, created_at, access_code, latest_response, ... }
 *   inboxItem = { id, from, email, subject, snippet, threadId, lastInbound, lastReply, date, ... }
 *   counts = { openWishes, waitingWishes, openEmails, respondedEmails }
 *   talkingPoints[] = { text, tone: 'neutral'|'warn' }
 *   suggestedReplies[] = { text, label }
 *
 * Props:
 *   wishes[] — array of support requests (wishes)
 *   inbox[] — array of email threads
 *   counts — { openWishes, waitingWishes, ... }
 *   selectedId — currently expanded item id
 *   onSelectItem(item) — callback when user taps a card
 *   onBack() — callback to close detail/go back
 *   onDraftReply() — callback to open draft reply UI
 *   onMarkResolved(id) — callback to resolve item
 */

function SupportView({
  wishes = [],
  inbox = [],
  counts = {},
  selectedId = null,
  selectedItem = null,
  onSelectItem,
  onBack,
  onDraftReply,
  onMarkResolved,
  isDesktop = false,
}) {
  const [filterTab, setFilterTab] = useState('open'); // 'open' | 'waiting'

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  function timeAgo(iso) {
    if (!iso) return '';
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  }

  function getInitials(name) {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  }

  function getAvatarColor(initials) {
    const colors = [
      'rgba(244,114,182,.18)',
      'rgba(59,130,246,.18)',
      'rgba(168,85,247,.18)',
    ];
    const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length;
    return colors[idx];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Card (collapsed list view)
  // ─────────────────────────────────────────────────────────────────────────────

  function AskCard({ item, isSelected, onClick }) {
    const isWish = !!item.access_code;
    const source = isWish ? item.source || 'web' : 'Email';
    const status = item.status || 'open';
    const statusLabel = status === 'needs_you' ? 'Needs you' : status === 'waiting' ? 'Waiting' : 'New';
    const statusColor = status === 'needs_you' ? 'var(--accent)' : 'var(--warn)';
    const statusBg = status === 'needs_you' ? 'var(--accent-weak)' : 'var(--warn-weak, rgba(251,191,36,.16))';

    const initials = getInitials(item.name || item.from || 'User');
    const avatarBg = getAvatarColor(initials);
    const pill_color = source === 'Email' ? 'color: var(--pink-400); background: rgba(244,114,182,.16)' : 'color: var(--accent); background: var(--accent-weak)';

    return (
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '13px',
          padding: '13px 14px',
          borderRadius: '10px',
          background: isSelected ? 'var(--accent-weak)' : 'transparent',
          cursor: 'pointer',
          borderBottom: '1px solid var(--hair)',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: avatarBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '700',
            flex: 'none',
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14.5px', fontWeight: '600', color: 'var(--fg)' }}>
            {item.name || item.from}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
            {item.email || item.from} · {source} · {timeAgo(item.created_at || item.date)}
          </div>
        </div>
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: '600',
            padding: '3px 8px',
            borderRadius: '5px',
            flex: 'none',
            [pill_color.split(';')[0].split(':')[0]]: pill_color.split(';')[0].split(':')[1],
            background: pill_color.includes('background:') ? pill_color.split('background:')[1] : 'var(--accent-weak)',
          }}
          style={{
            fontSize: '10.5px',
            fontWeight: '600',
            padding: '3px 8px',
            borderRadius: '5px',
            flex: 'none',
            color: source === 'Email' ? 'var(--pink-400)' : 'var(--accent)',
            background: source === 'Email' ? 'rgba(244,114,182,.16)' : 'var(--accent-weak)',
          }}
        >
          {source}
        </span>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Detail pane
  // ─────────────────────────────────────────────────────────────────────────────

  function DetailPane({ item }) {
    if (!item) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--muted)',
            fontSize: '13px',
          }}
        >
          Select an item
        </div>
      );
    }

    const initials = getInitials(item.name || item.from || 'User');
    const isWish = !!item.access_code;

    // Mock talking points and suggested replies — in real implementation,
    // these come from the server (agent recommendation).
    const talkingPoints = [
      { text: 'Three teams, ~40 seats total', tone: 'neutral' },
      { text: 'Wants the pilot discount to carry over', tone: 'neutral' },
      { text: 'Open risk: rollout timeline vs. their Q3 start', tone: 'warn' },
    ];

    const suggestedReplies = [
      'Draft reply',
      'Add to Tracker',
      'Schedule call',
      'Loop in Elon',
    ];

    return (
      <div
        style={{
          width: isDesktop ? '500px' : '100%',
          flex: isDesktop ? 'none' : 1,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: isDesktop ? '1px solid var(--divider)' : 'none',
          borderTop: !isDesktop ? '1px solid var(--divider)' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '18px 22px',
            borderBottom: '1px solid var(--divider)',
            flex: 'none',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--fg)' }}>
              {item.subject || item.subject || (isWish ? 'Support request' : 'Email thread')}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {item.email} · {item.name || item.from} · {isWish ? 'web' : 'Gmail'} ·{' '}
              {isWish ? '3 messages' : '3 messages'}
            </div>
          </div>
          <button
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '10px',
              border: '1px solid var(--hair)',
              background: 'transparent',
              color: 'var(--fg)',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'Inter',
              cursor: 'pointer',
            }}
          >
            Assign
          </button>
          <button
            onClick={() => onMarkResolved && onMarkResolved(item.id)}
            style={{
              height: '36px',
              padding: '0 15px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--success-weak)',
              color: 'var(--success)',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'Inter',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 13 4 4L19 7" />
            </svg>
            Resolve
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Summary box */}
          <div
            style={{
              display: 'flex',
              gap: '9px',
              alignItems: 'flex-start',
              background: 'var(--surface-2)',
              borderRadius: '11px',
              padding: '11px 13px',
              marginBottom: '16px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--accent)" style={{ flex: 'none', marginTop: '1px' }}>
              <path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" />
            </svg>
            <div style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--fg)' }}>
              <span style={{ fontWeight: '600' }}>Your summary —</span> {isWish ? 'Dana wants to expand the pilot to three teams' : 'Customer needs revised pricing'} and needs{' '}
              {isWish ? 'revised pricing by Friday' : 'a timely response'}. Warm tone; one open risk on the rollout timeline.
            </div>
          </div>

          {/* Thread label */}
          <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
            Thread · 3 messages
          </div>

          {/* Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {/* Message 1 */}
            <div style={{ border: '1px solid var(--hair)', borderRadius: '12px', background: 'var(--surface)', padding: '11px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'rgba(244,114,182,.18)',
                    color: '#F8A8D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '700',
                  }}
                >
                  {initials}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--fg)' }}>
                  {item.name || item.from}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--faint)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                  2d
                </span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
              <div style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'var(--muted)', marginTop: '7px' }}>
                Opened the pilot-expansion ask — happy with results so far.
              </div>
            </div>

            {/* Message 2 */}
            <div style={{ border: '1px solid var(--hair)', borderRadius: '12px', background: 'var(--surface)', padding: '11px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--avatar)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '700',
                  }}
                >
                  P
                </span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--fg)' }}>You</span>
                <span style={{ fontSize: '10.5px', color: 'var(--faint)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                  1d
                </span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
              <div style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'var(--muted)', marginTop: '7px' }}>
                Sent current pricing, asked which teams are in scope.
              </div>
            </div>

            {/* Message 3 (latest, expanded) */}
            <div style={{ border: '1px solid var(--accent-weak)', borderRadius: '12px', background: 'var(--surface)', padding: '12px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'rgba(244,114,182,.18)',
                    color: '#F8A8D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '700',
                  }}
                >
                  {initials}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--fg)' }}>
                  {item.name || item.from}
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--faint)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                  22m
                </span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 15 6-6 6 6" />
                </svg>
              </div>
              <div style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'var(--fg)', marginTop: '7px' }}>
                Confirmed three teams; needs revised pricing before Friday.
              </div>

              {/* Talking points */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '8px' }}>
                  Talking points
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {talkingPoints.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12.5px', color: 'var(--fg)', lineHeight: 1.4 }}>
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: pt.tone === 'warn' ? 'var(--warn)' : 'var(--accent)',
                          flex: 'none',
                          marginTop: '6px',
                        }}
                      />
                      {pt.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Suggested actions */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--accent-weak)',
              borderRadius: '14px',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" style={{ flex: 'none' }}>
                <path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" />
              </svg>
              <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                Suggested actions
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {suggestedReplies.map((label, i) => (
                <button
                  key={i}
                  onClick={() => onDraftReply && onDraftReply(item)}
                  style={{
                    height: '40px',
                    borderRadius: '10px',
                    border: i === 0 ? 'none' : '1px solid var(--hair)',
                    background: i === 0 ? 'var(--accent)' : 'var(--surface-2)',
                    color: i === 0 ? '#fff' : 'var(--fg)',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    fontFamily: 'Inter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {i === 0 && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  )}
                  {i === 1 && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                  )}
                  {i === 2 && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  )}
                  {i === 3 && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reply input */}
        <div
          style={{
            borderTop: '1px solid var(--divider)',
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: 'none',
          }}
        >
          <div
            style={{
              flex: 1,
              height: '42px',
              borderRadius: '11px',
              border: '1px solid var(--hair)',
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              fontSize: '14px',
              color: 'var(--faint)',
            }}
          >
            Write a reply…
          </div>
          <button
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '11px',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────────

  const allItems = [...wishes, ...inbox];
  const openItems = allItems.filter((it) => {
    const s = it.status || 'open';
    return s !== 'resolved';
  });
  const waitingItems = allItems.filter((it) => it.status === 'needs_you');

  const itemsToShow = filterTab === 'waiting' ? waitingItems : openItems;

  if (!isDesktop) {
    // Mobile: single-pane drill-down
    if (selectedId) {
      return (
        <div
          data-cv6kit
          data-theme="glass"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            height: '100dvh',
            overflow: 'hidden',
            background: 'var(--ground)',
            fontFamily: 'var(--font-sans)',
            color: 'var(--fg)',
          }}
        >
          {/* Back button + header */}
          <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 12px', flex: 'none' }}>
            <button
              onClick={onBack}
              style={{
                marginBottom: '12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                padding: 0,
              }}
            >
              ← Back
            </button>
          </div>

          <DetailPane item={selectedItem} />

          {/* Safe-area bottom padding */}
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)', flex: 'none' }} />
        </div>
      );
    }

    // Mobile: list view
    return (
      <div
        data-cv6kit
        data-theme="glass"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          overflow: 'hidden',
          background: 'var(--ground)',
          fontFamily: 'var(--font-sans)',
          color: 'var(--fg)',
        }}
      >
        {/* Header */}
        <div style={{ padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 14px', flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)' }}>Support</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {openItems.length} open · {waitingItems.length} waiting on you
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 7, padding: '0 16px 12px', flex: 'none', borderBottom: '1px solid var(--divider)' }}>
          <button
            onClick={() => setFilterTab('open')}
            style={{
              height: '32px',
              padding: '0 13px',
              borderRadius: '16px',
              border: filterTab === 'open' ? 'none' : '1px solid var(--hair)',
              background: filterTab === 'open' ? 'var(--accent-weak)' : 'transparent',
              color: filterTab === 'open' ? 'var(--accent)' : 'var(--muted)',
              fontSize: '12.5px',
              fontWeight: '600',
              fontFamily: 'Inter',
              cursor: 'pointer',
            }}
          >
            Open
          </button>
          <button
            onClick={() => setFilterTab('waiting')}
            style={{
              height: '32px',
              padding: '0 13px',
              borderRadius: '16px',
              border: filterTab === 'waiting' ? 'none' : '1px solid var(--hair)',
              background: filterTab === 'waiting' ? 'var(--accent-weak)' : 'transparent',
              color: filterTab === 'waiting' ? 'var(--accent)' : 'var(--muted)',
              fontSize: '12.5px',
              fontWeight: '600',
              fontFamily: 'Inter',
              cursor: 'pointer',
            }}
          >
            Waiting
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 16px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
          {itemsToShow.map((item, i) => (
            <AskCard key={item.id || i} item={item} isSelected={selectedId === item.id} onClick={() => onSelectItem?.(item)} />
          ))}
        </div>
      </div>
    );
  }

  // Desktop: two-pane layout
  return (
    <div
      data-cv6kit
      data-theme="glass"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--ground)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--fg)',
      }}
    >
      {/* Top bar (title + nav tabs) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '22px',
          padding: '14px 24px',
          borderBottom: '1px solid var(--divider)',
          flex: 'none',
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-.02em', color: 'var(--fg)', whiteSpace: 'nowrap' }}>
          Support
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '7px' }}>
          {/* Tool nav (placeholder) */}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'var(--surface)', border: '1px solid var(--hair)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: '600' }}>
            P
          </div>
        </div>
      </div>

      {/* Body: inbox + detail */}
      <div style={{ display: 'flex', height: '100%', flex: 1, minHeight: 0 }}>
        {/* Inbox list */}
        <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--divider)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Inbox header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', flex: 'none' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-.01em', color: 'var(--fg)' }}>Support</div>
              <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '3px' }}>
                {openItems.length} open · {waitingItems.length} waiting on you
              </div>
            </div>
            <div style={{ display: 'flex', gap: '7px' }}>
              <button
                onClick={() => setFilterTab('open')}
                style={{
                  height: '32px',
                  padding: '0 13px',
                  borderRadius: '16px',
                  border: filterTab === 'open' ? 'none' : '1px solid var(--hair)',
                  background: filterTab === 'open' ? 'var(--accent-weak)' : 'transparent',
                  color: filterTab === 'open' ? 'var(--accent)' : 'var(--muted)',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  fontFamily: 'Inter',
                  cursor: 'pointer',
                }}
              >
                Open
              </button>
              <button
                onClick={() => setFilterTab('waiting')}
                style={{
                  height: '32px',
                  padding: '0 13px',
                  borderRadius: '16px',
                  border: filterTab === 'waiting' ? 'none' : '1px solid var(--hair)',
                  background: filterTab === 'waiting' ? 'var(--accent-weak)' : 'transparent',
                  color: filterTab === 'waiting' ? 'var(--accent)' : 'var(--muted)',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  fontFamily: 'Inter',
                  cursor: 'pointer',
                }}
              >
                Waiting
              </button>
            </div>
          </div>

          {/* Banner */}
          <div style={{ padding: '0 16px 16px', flex: 'none' }}>
            <div style={{ background: 'var(--accent-weak)', borderRadius: '11px', padding: '12px 13px' }}>
              <div style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'var(--fg)' }}>
                Elon answered a billing question on the <strong>Acme</strong> thread and flagged a scope/cost item for your follow-up.
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>Corner · 22m ago</div>
            </div>
          </div>

          {/* Items */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 16px 8px', marginLeft: 0 }}>Open asks</div>
            <div style={{ paddingRight: '16px' }}>
              {itemsToShow.map((item, i) => (
                <AskCard key={item.id || i} item={item} isSelected={selectedId === item.id} onClick={() => onSelectItem?.(item)} />
              ))}
            </div>
          </div>
        </div>

        {/* Detail pane */}
        <DetailPane item={selectedItem} />
      </div>
    </div>
  );
}

export { SupportView };
