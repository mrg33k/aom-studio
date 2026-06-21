import React, { useState } from 'react';

/**
 * CV6 kit Support — mobile email thread reader
 * Kit-faithful to ui_kits/tools/support.html mobile design (view-the-email-thread screen).
 *
 * Real data shapes:
 *   item = { id, from, email, subject, snippet, threadId, date, messages: [...], summary: {...}, ... }
 *
 * Props:
 *   item — the expanded email thread to display
 *   onBack() — callback to close detail and return to list
 *   onReplyViaAgent() — callback to initiate reply flow
 */

function SupportView({
  item = null,
  onBack,
  onReplyViaAgent,
}) {
  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  function getInitials(name) {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────────

  if (!item) {
    return null;
  }

  const initials = getInitials(item.from || item.name || 'User');

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
      {/* Status bar + header */}
      <div style={{ flex: 'none' }}>
        {/* Status bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', fontSize: '15px', fontWeight: '600' }}>
          <span>9:41</span>
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Acme</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + env(safe-area-inset-top, 0px)) 16px 12px', borderBottom: '1px solid var(--divider)' }}>
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
              {item.subject || 'Email thread'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {item.from || 'Unknown'} · {item.email || ''} · 3 messages
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
                Needs <strong>revised pricing by Friday</strong>; locking budget this week
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
                Risk: their <strong>Q3 start</strong> vs. our rollout timeline
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
                background: 'rgba(244,114,182,.18)',
                color: '#F8A8D0',
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
                {item.from || 'Unknown'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>to you · {item.organization || 'Organization'}</div>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>9:18 AM</span>
          </div>

          {/* Email body */}
          <div style={{ padding: '14px 15px', fontSize: '13.5px', lineHeight: 1.7, color: 'var(--fg)' }}>
            <p style={{ margin: '0 0 10px' }}>Hi Patrik,</p>
            <p style={{ margin: '0 0 10px' }}>
              The team has been really happy with the pilot. We'd love to bring CS and Ops in too, so three teams total, around 40 seats.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              Could you get me revised pricing before <strong>Friday</strong>? We're locking budget this week.
            </p>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              Best,
              <br />
              {item.from || 'Dana Whitfield'}
              <br />
              <span style={{ fontSize: '12px' }}>VP Partnerships · {item.organization || 'Acme'}</span>
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
        </div>

        {/* Bottom padding for scrolling */}
        <div style={{ height: '16px' }} />
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
          onClick={onReplyViaAgent}
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

export { SupportView };
