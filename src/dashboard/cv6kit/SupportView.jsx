import React, { useState } from 'react';

/**
 * CV6 kit Support — MOBILE ONLY agent conversation + email thread reader
 * Kit-faithful to ui_kits/tools/support.html mobile design.
 *
 * MOBILE A: agent conversation with curated email cards, action chips, and agent draft-reply.
 * MOBILE B: email-thread detail with summary, readable original, and "Reply via Elon" button.
 *
 * Real data shapes (passed from SupportLive):
 *   wishes: [{ id, name, email, subject, message, status, ... }]
 *   inbox: [{ id, from, email, subject, snippet, threadId, lastInbound, ... }]
 *   counts: { openWishes, waitingWishes, openEmails, respondedEmails }
 *   selectedItem: the expanded email/wish to display (null = show list, set = show thread detail)
 *
 * Props:
 *   wishes — array of wish items
 *   inbox — array of email items
 *   counts — { openWishes, waitingWishes, openEmails, respondedEmails }
 *   selectedItem — the currently selected wish/email to display thread of (null = show list)
 *   onSelectItem(item) — callback when tapping an email to view thread
 *   onBack() — callback to close detail and return to agent conversation
 *   onDraftReply(item) — callback to draft a reply (routes to EA)
 *   onMarkResolved() — callback to resolve an item (held for now)
 *   isDesktop — if true, render desktop layout (not used in this mobile-only rebuild)
 */

function SupportView({
  wishes = [],
  inbox = [],
  counts = { openWishes: 0, waitingWishes: 0, openEmails: 0, respondedEmails: 0 },
  selectedItem = null,
  onSelectItem = () => {},
  onBack = () => {},
  onDraftReply = () => {},
  onMarkResolved = () => {},
  isDesktop = false,
}) {
  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  function getInitials(name) {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  }

  function getAvatarColor(name) {
    // Simple deterministic avatar color based on first letter
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Render Mobile B (thread detail)
  // ─────────────────────────────────────────────────────────────────────────────

  if (selectedItem) {
    const initials = getInitials(selectedItem.from || selectedItem.name || 'User');
    const avatarColor = getAvatarColor(selectedItem.from || selectedItem.name || 'User');

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
        {/* Status bar */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', fontSize: '15px', fontWeight: '600' }}>
          <span>9:41</span>
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {selectedItem.from || selectedItem.name || 'Acme'}
          </span>
        </div>

        {/* Header */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + env(safe-area-inset-top, 0px)) 16px 12px', borderBottom: '1px solid var(--divider)' }}>
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              width: 34,
              height: 34,
              flex: 'none',
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-.015em', color: 'var(--fg)' }}>
              {selectedItem.subject || 'Email thread'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {selectedItem.from || selectedItem.name || 'Unknown'} · {selectedItem.email || ''} · 3 messages
            </div>
          </div>

          <button
            aria-label="More options"
            style={{
              width: 34,
              height: 34,
              flex: 'none',
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              color: 'var(--faint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '14px 16px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '13px',
          }}
        >
          {/* "Earlier messages" button */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              height: '38px',
              padding: '0 13px',
              borderRadius: '11px',
              border: '1px solid var(--hair)',
              background: 'var(--surface)',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: '500',
              color: 'var(--muted)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5V12l3 2" />
            </svg>
            <span style={{ flex: 1, textAlign: 'left' }}>2 earlier messages</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)', marginRight: '2px' }}>Show</span>
          </button>

          {/* Summary box */}
          <div
            style={{
              border: '1px solid var(--accent-weak)',
              background: 'linear-gradient(180deg,var(--accent-weak),transparent)',
              borderRadius: '15px',
              padding: '14px 15px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '11px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)">
                <path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" />
              </svg>
              <span style={{ fontSize: '10.5px', fontWeight: '600', letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                Summary by Elon
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', flex: 'none', marginTop: '6px' }} />
                <div style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'var(--fg)' }}>
                  Expand the pilot to <strong>three teams</strong> (CS + Ops, ~40 seats)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', flex: 'none', marginTop: '6px' }} />
                <div style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'var(--fg)' }}>
                  Needs <strong>revised pricing by Friday</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent)', flex: 'none', marginTop: '6px' }} />
                <div style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'var(--fg)' }}>
                  Wants the <strong>pilot discount to carry over</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--warn)', flex: 'none', marginTop: '6px' }} />
                <div style={{ fontSize: '12.5px', lineHeight: 1.45, color: 'var(--warn)' }}>
                  Risk: their <strong>Q3 start</strong> vs. our rollout
                </div>
              </div>
            </div>
          </div>

          {/* Email message */}
          <div style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: '15px', overflow: 'hidden' }}>
            {/* Sender info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '13px 14px', borderBottom: '1px solid var(--divider)' }}>
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: avatarColor.bg,
                  color: avatarColor.fg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  flex: 'none',
                }}
              >
                {initials}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--fg)' }}>
                  {selectedItem.from || selectedItem.name || 'Unknown'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>to you · {selectedItem.email || ''}</div>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>9:18 AM</span>
            </div>

            {/* Email body */}
            <div style={{ padding: '14px 15px', fontSize: '13.5px', lineHeight: 1.7, color: 'var(--fg)' }}>
              <p style={{ margin: '0 0 10px' }}>Hi Patrik,</p>
              <p style={{ margin: '0 0 10px' }}>
                {selectedItem.snippet || 'The team has been really happy with the pilot. We\'d love to bring CS and Ops in too, so three teams total, around 40 seats.'}
              </p>
              <p style={{ margin: '0 0 10px' }}>Could you get me revised pricing before <strong>Friday</strong>? We\'re locking budget this week.</p>
              <p style={{ margin: 0, color: 'var(--muted)' }}>
                Best,
                <br />
                {selectedItem.from || 'Unknown'}
                <br />
                <span style={{ fontSize: '12px' }}>VP Partnerships · {selectedItem.email || 'Organization'}</span>
              </p>
            </div>

            {/* Attachment */}
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 11px', border: '1px solid var(--hair)', borderRadius: '11px', background: 'var(--surface-2)' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg,#26303f,#161b24)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--pink-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--fg)' }}>partnership-terms.pdf</div>
                  <div style={{ fontSize: '10px', color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>240 KB</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12M7 11l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </div>
            </div>

            {/* Bottom padding for scrolling */}
            <div style={{ height: '16px' }} />
          </div>
        </div>

        {/* Reply button bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 'calc(72px + env(safe-area-inset-bottom, 0px))',
            borderTop: '1px solid var(--divider)',
            background: 'var(--ground)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px calc(16px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <button
            onClick={() => onDraftReply(selectedItem)}
            style={{
              flex: 1,
              height: '46px',
              borderRadius: '13px',
              border: 'none',
              background: 'var(--accent-weak)',
              color: 'var(--accent)',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z" />
            </svg>
            Reply via Elon
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render Mobile A (agent conversation)
  // ─────────────────────────────────────────────────────────────────────────────

  // Agent conversation list (show all wishes + inbox items in a conversation thread)
  const allItems = [
    ...wishes.map(w => ({ ...w, type: 'wish' })),
    ...inbox.map(it => ({ ...it, type: 'email' })),
  ].sort((a, b) => {
    const aTime = a.created_at || a.date || 0;
    const bTime = b.created_at || b.date || 0;
    return new Date(bTime) - new Date(aTime);
  });

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
      {/* Status bar */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', fontSize: '15px', fontWeight: '600' }}>
        <span>9:41</span>
        <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{counts.openEmails + counts.openWishes} need you</span>
      </div>

      {/* Header with agent avatar, title, and menu */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: '10px', padding: 'calc(12px + env(safe-area-inset-top, 0px)) 14px 12px', borderBottom: '1px solid var(--divider)' }}>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 34,
            height: 34,
            flex: 'none',
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Agent avatar with online indicator */}
        <div style={{ position: 'relative', flex: 'none' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: '700',
            }}
          >
            EL
          </div>
          <span
            style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '11px',
              height: '11px',
              background: 'var(--success)',
              boxShadow: 'var(--glow-online)',
              border: '2px solid var(--ground)',
              borderRadius: '50%',
            }}
          />
        </div>

        {/* Title and subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--fg)' }}>Elon</div>
          <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '1px' }}>Support · watching Acme +7</div>
        </div>

        {/* Menu button */}
        <button
          aria-label="More options"
          style={{
            width: '34px',
            height: '34px',
            flex: 'none',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
        </button>
      </div>

      {/* Scrollable conversation thread */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '104px',
          bottom: '66px',
          overflow: 'hidden',
          padding: '14px 14px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '13px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Timestamp */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>Today · 22m ago</span>
        </div>

        {/* Agent message introducing the email */}
        <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              flex: 'none',
            }}
          >
            EL
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {/* Agent message bubble */}
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--hair)',
                borderRadius: '15px',
                borderTopLeftRadius: '5px',
                padding: '11px 13px',
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--fg)',
              }}
            >
              Dana at Acme replied. This one's <span style={{ color: 'var(--success)', fontWeight: '600' }}>real</span>. She wants the pilot expanded to{' '}
              <strong>three teams</strong>, pricing by <strong>Friday</strong>.
            </div>

            {/* Curated email card */}
            <div style={{ border: '1px solid var(--hair)', borderRadius: '14px', background: 'var(--surface)', overflow: 'hidden' }}>
              {/* Email header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '11px 12px', borderBottom: '1px solid var(--divider)' }}>
                <span
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(244,114,182,.18)',
                    color: '#F8A8D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '700',
                    flex: 'none',
                  }}
                >
                  DW
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--fg)' }}>Dana Whitfield · Acme</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Q2 partnership scope</div>
                </div>
                <span style={{ fontSize: '10.5px', fontWeight: '600', padding: '3px 8px', borderRadius: '5px', background: 'rgba(244,114,182,.16)', color: '#F8A8D0', flex: 'none' }}>Email</span>
              </div>

              {/* Email snippet */}
              <div style={{ padding: '10px 12px', fontSize: '12px', lineHeight: 1.5, color: 'var(--muted)' }}>
                "Great results so far, let's bring in CS and Ops too. Can you get me numbers before Fri?"
              </div>

              {/* Flagged reason row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 12px', borderTop: '1px solid var(--divider)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 22V4h13l-2 4 2 4H4" />
                </svg>
                <span style={{ fontSize: '10.5px', color: 'var(--faint)', flex: 1 }}>Flagged: revenue-impacting · time-sensitive</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelectItem(inbox[0])}
                >
                  View thread · 3
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Action chips */}
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              <button
                onClick={() => onDraftReply(inbox[0])}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '32px',
                  padding: '0 13px',
                  borderRadius: '16px',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '600',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                }}
              >
                Draft a reply
              </button>
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '32px',
                  padding: '0 13px',
                  borderRadius: '16px',
                  border: '1px solid var(--hair)',
                  background: 'var(--surface-2)',
                  color: 'var(--fg)',
                  fontSize: '12px',
                  fontWeight: '600',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                }}
              >
                Add to Tracker
              </button>
              <button
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '32px',
                  padding: '0 13px',
                  borderRadius: '16px',
                  border: '1px solid var(--hair)',
                  background: 'var(--surface-2)',
                  color: 'var(--fg)',
                  fontSize: '12px',
                  fontWeight: '600',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                }}
              >
                Snooze
              </button>
            </div>
          </div>
        </div>

        {/* User message */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              maxWidth: '78%',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: '15px',
              borderTopRightRadius: '5px',
              padding: '10px 13px',
              fontSize: '13px',
              lineHeight: 1.45,
            }}
          >
            Draft a warm reply, confirm Friday works.
          </div>
        </div>

        {/* Agent message with draft reply */}
        <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              flex: 'none',
            }}
          >
            EL
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--hair)',
                borderRadius: '15px',
                borderTopLeftRadius: '5px',
                padding: '11px 13px',
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--fg)',
              }}
            >
              Here's a draft. I'll send it as you once you're happy.
            </div>

            {/* Draft reply card */}
            <div style={{ border: '1px solid var(--accent-weak)', borderRadius: '14px', background: 'var(--surface)', padding: '12px 13px' }}>
              <div style={{ fontSize: '12.5px', lineHeight: 1.55, color: 'var(--muted)', marginBottom: '11px' }}>
                "Hi Dana, thrilled it's working. Three teams sounds great; I'll have revised pricing to you Thursday, ahead of Friday…"
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{
                    flex: 1,
                    height: '38px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    fontFamily: 'var(--font-sans)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22l-4-9-9-4Z" />
                  </svg>
                  Send it as me
                </button>
                <button
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--hair)',
                    background: 'var(--surface-2)',
                    color: 'var(--fg)',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                  }}
                >
                  Tweak
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Composer bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 'calc(66px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid var(--divider)',
          background: 'var(--ground)',
          display: 'flex',
          alignItems: 'center',
          padding: '12px 14px calc(12px + env(safe-area-inset-bottom, 0px))',
          gap: '8px',
        }}
      >
        <input
          type="text"
          placeholder="Message Elon…"
          style={{
            flex: 1,
            height: '42px',
            borderRadius: '12px',
            border: '1px solid var(--hair)',
            background: 'var(--surface-2)',
            color: 'var(--fg)',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            padding: '0 14px',
          }}
        />
        <button
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
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
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export { SupportView };
