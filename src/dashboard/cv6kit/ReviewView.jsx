import React, { useState } from 'react';

/**
 * CV6 kit Review — queue → document → decision flow. Kit-faithful to
 * ui_kits/tools/review.html (desktop 3-col + mobile simplified): queue list
 * on left, document viewer in center (with comment pins), actions panel on right
 * (metadata + approve/reject + comments list). Mobile collapses to document +
 * inline action buttons.
 *
 * Props contract (props-only, no fetching):
 *   queueItems[] = { id, title, source, timestamp, status: 'ready'|'pending' }
 *   selectedItem  = { id, title, source, location, from, status, content: { title, body, sections: [...] } }
 *   comments[]    = { id, position, author, initials, avatar, text, target }
 *   metadata      = { from: { name, initials, avatar }, location, status }
 *   onSelectItem(item), onApprove(), onReject(), onComment(), onSendNotes()
 */

const VIEWPORT = typeof window !== 'undefined' ? window.innerWidth : 1440;
const isMobile = VIEWPORT < 640;

function QueueItem({ item, selected, onClick }) {
  const isReady = (item.status || '').toLowerCase() === 'ready';
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '13px 12px',
        borderRadius: 10,
        background: selected ? 'var(--accent-weak)' : 'transparent',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isReady ? 'var(--success)' : 'var(--faint)',
          flex: 'none',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{item.title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
          {item.source} · {item.timestamp}
        </div>
      </div>
    </div>
  );
}

function CommentPin({ comment }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: comment.position?.top || 150,
        right: 16,
        width: 26,
        height: 26,
        borderRadius: '50% 50% 50% 3px',
        background: 'var(--accent)',
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 5px 14px -3px rgba(0,0,0,.45)',
      }}
    >
      {comment.id}
    </div>
  );
}

function CommentPopover({ comment }) {
  if (!comment.active) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: (comment.position?.top || 150) - 20,
        right: 54,
        width: 236,
        background: '#fff',
        borderRadius: 13,
        boxShadow: '0 16px 38px -10px rgba(0,0,0,.35)',
        border: '1px solid #e7e5e2',
        padding: '13px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          {comment.initials}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>You</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#aaa', marginLeft: 'auto' }}>now</span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: '#333', marginBottom: 10 }}>{comment.text}</div>
      <div style={{ display: 'flex', gap: 7 }}>
        <button
          style={{
            flex: 1,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Inter',
          }}
        >
          Comment
        </button>
        <button
          style={{
            height: 32,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid #e2e0dd',
            background: '#fff',
            color: '#666',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Inter',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function MetadataRow({ label, value, children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        height: 44,
        borderBottom: '1px solid var(--divider)',
        fontSize: 13.5,
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{children || value}</span>
    </div>
  );
}

function CommentCard({ comment }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '11px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--hair)',
        borderRadius: 11,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50% 50% 50% 3px',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        {comment.id}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--fg)' }}>{comment.text}</div>
        <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}>on "{comment.target}"</div>
      </div>
    </div>
  );
}

export function ReviewView({
  queueItems = [],
  selectedItem = null,
  comments = [],
  metadata = {},
  queueSummary = {},
  onSelectItem,
  onApprove,
  onReject,
  onComment,
  onSendNotes,
  onBack,
}) {
  const [activeCommentId, setActiveCommentId] = useState(null);
  const openCommentCount = comments.filter((c) => !c.resolved).length;

  // Desktop 3-column layout
  if (!isMobile) {
    return (
      <div
        data-cv6kit
        data-theme="glass"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--ground)',
          color: 'var(--fg)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* topbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            padding: '14px 24px',
            borderBottom: '1px solid var(--divider)',
            flex: 'none',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)' }}>Review</div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 7 }}>
            {[
              { icon: '⌂', label: 'Home' },
              { icon: '💬', label: 'Chat' },
              { icon: '📦', label: 'Organize' },
              { icon: '👁', label: 'Review', active: true },
              { icon: '⚙', label: 'Support' },
              { icon: '⚡', label: 'Tracker' },
              { icon: '🎯', label: 'Command' },
              { icon: '🎙', label: 'Scribe' },
            ].map((nav, i) => (
              <div
                key={i}
                style={{
                  width: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 0 6px',
                  borderRadius: 'var(--radius-control)',
                  background: nav.active ? 'var(--accent)' : 'var(--surface)',
                  border: nav.active ? '1px solid transparent' : '1px solid var(--hair)',
                  color: nav.active ? '#fff' : 'var(--muted)',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 18 }}>{nav.icon}</span>
                <span>{nav.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: 'var(--surface-2)',
                border: '1px solid var(--hair)',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              🔍
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'var(--avatar)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              P
            </div>
          </div>
        </div>

        {/* body: 3-column */}
        <div style={{ display: 'flex', height: 778, flex: 1 }}>
          {/* queue */}
          <div style={{ width: 330, flex: 'none', borderRight: '1px solid var(--divider)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 12px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>Queue</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                {queueSummary.readyCount || queueItems.length} ready · {queueSummary.pipelineCount || 0} in pipeline
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7, padding: '0 20px 14px' }}>
              <button
                style={{
                  height: 30,
                  padding: '0 13px',
                  borderRadius: 15,
                  border: 'none',
                  background: 'var(--accent-weak)',
                  color: 'var(--accent)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: 'Inter',
                }}
              >
                Ready {queueSummary.readyCount || queueItems.length}
              </button>
              <button
                style={{
                  height: 30,
                  padding: '0 13px',
                  borderRadius: 15,
                  border: '1px solid var(--hair)',
                  background: 'transparent',
                  color: 'var(--muted)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: 'Inter',
                }}
              >
                Pipeline
              </button>
            </div>
            <div style={{ padding: '0 12px', overflowY: 'auto', maxHeight: 'calc(100% - 100px)' }}>
              {queueItems.map((item) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  selected={selectedItem?.id === item.id}
                  onClick={() => onSelectItem && onSelectItem(item)}
                />
              ))}
            </div>
          </div>

          {/* document */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              background: '#0d0d0f',
              padding: '30px 0',
              display: 'flex',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {selectedItem && (
              <div
                className="glassy"
                style={{
                  width: 600,
                  padding: '50px 54px',
                  position: 'relative',
                  background: '#fbfbfa',
                  borderRadius: 6,
                  boxShadow: '0 12px 40px rgba(0,0,0,.4)',
                  color: '#1a1a1a',
                  overflowY: 'auto',
                  maxHeight: '100%',
                }}
              >
                {/* comment indicator */}
                <div
                  style={{
                    position: 'absolute',
                    top: 18,
                    right: 18,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#eceae7',
                    borderRadius: 16,
                    padding: '5px 11px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#666',
                  }}
                >
                  💬 Click anywhere to comment
                </div>

                {/* metadata */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#999', marginBottom: 20 }}>
                  {selectedItem.id} · {selectedItem.source || 'document.md'}
                </div>

                {/* content */}
                <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', margin: '0 0 16px' }}>
                  {selectedItem.title}
                </h1>
                {selectedItem.content?.body && (
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: '#333', margin: '0 0 14px' }}>
                    {selectedItem.content.body}
                  </p>
                )}
                {selectedItem.content?.sections?.map((sec, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, margin: '24px 0 10px' }}>{sec.title}</h2>
                    <p style={{ fontSize: 15, lineHeight: 1.65, color: '#333', margin: '0 0 14px' }}>{sec.body}</p>
                  </div>
                ))}

                {/* comment pins */}
                {comments.map((c) => (
                  <CommentPin key={c.id} comment={c} />
                ))}

                {/* active comment popover */}
                {comments.map((c) => (
                  <CommentPopover key={`pop-${c.id}`} comment={{ ...c, active: activeCommentId === c.id }} />
                ))}
              </div>
            )}
          </div>

          {/* actions */}
          <div style={{ width: 320, flex: 'none', borderLeft: '1px solid var(--divider)', padding: 22, overflowY: 'auto' }}>
            {/* metadata card */}
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12 }}>
              This document
            </div>
            <div
              className="glassy"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--hair)',
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: 18,
              }}
            >
              {metadata.from && (
                <MetadataRow label="From">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'var(--success-weak)',
                        color: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      {metadata.from.initials}
                    </span>
                    {metadata.from.name}
                  </span>
                </MetadataRow>
              )}
              {metadata.location && <MetadataRow label="Location" value={metadata.location} />}
              {metadata.status && (
                <MetadataRow label="Status">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} />
                    {metadata.status}
                  </span>
                </MetadataRow>
              )}
            </div>

            {/* action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 18 }}>
              <button
                onClick={onApprove}
                style={{
                  height: 46,
                  borderRadius: 11,
                  border: 'none',
                  background: 'var(--success)',
                  color: '#06281c',
                  fontSize: 14.5,
                  fontWeight: 600,
                  fontFamily: 'Inter',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                ✓ Approve
              </button>
              <button
                onClick={onReject}
                style={{
                  height: 46,
                  borderRadius: 11,
                  border: '1px solid var(--hair)',
                  background: 'transparent',
                  color: 'var(--fg)',
                  fontSize: 14.5,
                  fontWeight: 600,
                  fontFamily: 'Inter',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                ≡ Request changes
              </button>
            </div>

            {/* comments section */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 11,
              }}
            >
              Comments · {openCommentCount} open
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
              {comments.map((c) => (
                <CommentCard key={c.id} comment={c} />
              ))}
            </div>

            {/* send notes button */}
            <button
              onClick={onSendNotes}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 11,
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 13.5,
                fontWeight: 600,
                fontFamily: 'Inter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              ✓ Send {openCommentCount} notes as a checklist → Elon
            </button>
            <div style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--faint)', textAlign: 'center', marginTop: 10 }}>
              Comments become a fix-list the agent works through, then re-submits for review.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile simplified layout
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
      {/* top bar — safe-area top, queue position only (no fake device clock;
          the real phone draws its own status bar) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 16px 6px',
          color: 'var(--fg)',
        }}
      >
        {onBack ? (
          <button onClick={onBack} aria-label="Back" style={{ width: 34, height: 34, marginLeft: -8, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        ) : <span />}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
          {selectedItem ? '1' : '0'} / {queueItems.length} ready
        </span>
      </div>

      {/* item header */}
      {selectedItem && (
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--success)',
                flex: 'none',
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>
                {selectedItem.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {metadata.from?.name || 'Agent'} · {metadata.location || 'location'}
              </div>
            </div>
          </div>

          {/* document preview */}
          <div
            className="glassy"
            style={{
              padding: '24px 22px',
              height: 520,
              overflowY: 'auto',
              background: '#fbfbfa',
              borderRadius: 6,
              boxShadow: '0 12px 40px rgba(0,0,0,.4)',
              color: '#1a1a1a',
              marginBottom: 14,
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#999', marginBottom: 14 }}>
              {selectedItem.source || 'document.md'}
            </div>
            <h1 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.02em', margin: '0 0 12px' }}>
              {selectedItem.title}
            </h1>
            {selectedItem.content?.body && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#333', margin: '0 0 12px' }}>
                {selectedItem.content.body}
              </p>
            )}
            {selectedItem.content?.sections?.map((sec, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: '18px 0 8px' }}>{sec.title}</h2>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: '#333', margin: 0 }}>{sec.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* action buttons — safe-area bottom */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '14px 16px',
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid var(--divider)',
          background: 'var(--ground)',
          display: 'flex',
          gap: 10,
        }}
      >
        <button
          onClick={onApprove}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 13,
            border: 'none',
            background: 'var(--success)',
            color: '#06281c',
            fontSize: 14.5,
            fontWeight: 600,
            fontFamily: 'Inter',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          ✓ Approve
        </button>
        <button
          onClick={onReject}
          style={{
            width: 120,
            height: 48,
            borderRadius: 13,
            border: '1px solid var(--hair)',
            background: 'var(--surface-2)',
            color: 'var(--fg)',
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: 'Inter',
            cursor: 'pointer',
          }}
        >
          Changes
        </button>
      </div>
    </div>
  );
}
