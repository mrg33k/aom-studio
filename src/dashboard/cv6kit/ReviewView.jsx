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
 *   selectedItem  = { id, title, source, location, from, status, content: { title, body, sections: [...], type: 'video'|'photo'|... } }
 *   comments[]    = { id, position, author, initials, avatar, text, target }
 *   metadata      = { from: { name, initials, avatar }, location, status }
 *   onSelectItem(item), onApprove(), onReject(), onComment(), onSendNotes()
 */

const VIEWPORT = typeof window !== 'undefined' ? window.innerWidth : 1440;
const isMobile = VIEWPORT < 640;

// A translucent tile background from the item's real per-type colour (the
// review-queue endpoint returns a hex per type: doc/copy/code/image/video).
function tintBg(tone) {
  if (typeof tone === 'string' && tone[0] === '#') return tone + '22';
  return 'var(--accent-weak)';
}

// The type glyph for a review-queue item, tinted by its real type colour.
// Faithful to review-list.html (doc / image / video / live-site glyphs).
function reviewGlyph(typeKey, tone) {
  const stroke = tone || 'var(--accent)';
  const c = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (typeKey === 'image') return (<svg {...c}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" /></svg>);
  if (typeKey === 'video') return (<svg {...c}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3Z" /></svg>);
  if (typeKey === 'live') return (<svg {...c}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>);
  if (typeKey === 'code') return (<svg {...c}><path d="m8 9-3 3 3 3M16 9l3 3-3 3" /></svg>);
  return (<svg {...c}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M9 13h6M9 17h4" /></svg>);
}

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
  onMenu,
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

  // Mobile simplified layout — pixel-faithful to review.html mobile frame
  const [selectedType, setSelectedType] = useState('video');
  const [videoPlayTime, setVideoPlayTime] = useState(0);
  // R18 — the pick-what-to-review list (review-list.html): Ready / Pipeline
  // segments + a search filter over the real queue.
  const [seg, setSeg] = useState('ready');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const typeChips = [
    { key: 'photo', label: 'Photo' },
    { key: 'video', label: 'Video' },
    { key: 'screenshot', label: 'Screenshot' },
    { key: 'live', label: 'Live site' },
  ];

  const allItems = Array.isArray(queueItems) ? queueItems : [];
  const queueCount = allItems.length;
  const readyCount = queueSummary.readyCount ?? queueCount;
  const pipelineCount = queueSummary.pipelineCount || 0;
  const subtitle = pipelineCount > 0 ? `${readyCount} ready · ${pipelineCount} in pipeline` : `${readyCount} ready to review`;
  // Pipeline = items an agent is still building; ReviewLive surfaces only finished
  // (ready) work today, so the pipeline tab is honestly empty until that feed exists.
  const isPipeline = (it) => it.status === 'pipeline' || it.status === 'building';
  const segItems = seg === 'pipeline' ? allItems.filter(isPipeline) : allItems.filter((it) => !isPipeline(it));
  const q = query.trim().toLowerCase();
  const visibleItems = q ? segItems.filter((it) => `${it.title || ''} ${it.source || ''} ${it.typeLabel || ''}`.toLowerCase().includes(q)) : segItems;

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
      {/* Status bar (safe-area top + time/progress) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `calc(env(safe-area-inset-top, 0px) + 8px) 16px 8px`,
          background: 'var(--ground)',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>9:41</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
          {queueCount} ready
        </span>
      </div>

      {/* Mobile header (.mhdr) — a tool home shows the menu (opens the nav drawer);
          the drilled-in document shows the back chevron (up one level). Title + the
          real subtitle, with search filtering the queue. */}
      <div className="mhdr" style={{ background: 'var(--ground)' }}>
        {selectedItem ? (
          <button className="mback" onClick={onBack} aria-label="Back">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        ) : (
          <button className="ib" onClick={onMenu} aria-label="Menu" style={{ width: 36, height: 36, borderRadius: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
        )}
        <div className="mhtitle">
          <div className="mttl">{selectedItem ? (selectedItem.title || 'Review') : 'Review'}</div>
          <div className="msub">{selectedItem ? (metadata.location || selectedItem.source || 'Reading') : subtitle}</div>
        </div>
        {!selectedItem && (
          <div className="mhactions">
            <button className="ib" onClick={() => setSearchOpen((v) => !v)} aria-label="Search" style={{ width: 36, height: 36, borderRadius: 10, color: searchOpen ? 'var(--accent)' : undefined }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Content: the real queue list when nothing is picked, the real document when one is */}
      {!selectedItem ? (
        <>
          {/* Ready / Pipeline segmented control (real counts) */}
          <div style={{ display: 'flex', gap: 7, padding: '10px 16px 12px', flex: 'none' }}>
            {[{ k: 'ready', label: 'Ready', n: readyCount }, { k: 'pipeline', label: 'Pipeline', n: pipelineCount }].map((s) => (
              <button
                key={s.k}
                onClick={() => setSeg(s.k)}
                style={{ height: 30, padding: '0 14px', borderRadius: 15, fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', border: seg === s.k ? 'none' : '1px solid var(--hair)', background: seg === s.k ? 'var(--accent)' : 'transparent', color: seg === s.k ? '#fff' : 'var(--muted)' }}
              >
                {s.label} {s.n}
              </button>
            ))}
          </div>

          {/* search filter (revealed by the header search icon — real filter) */}
          {searchOpen && (
            <div style={{ flex: 'none', padding: '0 16px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 40, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--hair)', padding: '0 13px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the queue…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--fg)', fontFamily: 'var(--font-sans)', fontSize: 14 }} />
              </div>
            </div>
          )}

          {/* the real queue — rich rows faithful to review-list.html */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
            {visibleItems.length === 0 ? (
              <div className="empty" style={{ height: '100%' }}>
                <div className="e-ico">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <div className="e-t">{seg === 'pipeline' ? 'Nothing in the pipeline' : (q ? 'No matches' : 'You are all caught up')}</div>
                <div className="e-s">{seg === 'pipeline' ? 'Work an agent is still building will show up here.' : (q ? 'Try a different search.' : 'Finished work waiting on you will show up here to read and decide on.')}</div>
              </div>
            ) : (
              visibleItems.map((it) => {
                const tone = it.tone || 'var(--accent)';
                return (
                  <div key={it.id} onClick={() => onSelectItem && onSelectItem(it)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid var(--divider)', cursor: 'pointer' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', background: tintBg(tone) }}>
                      {reviewGlyph(it.typeKey, tone)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[it.typeLabel, it.source].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: 'none' }}>
                      <span className="astat is-live"><span className="sd" />READY</span>
                      {it.timestamp && <span className="mono" style={{ fontSize: 10, color: 'var(--faint)' }}>{it.timestamp}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'var(--ground)', padding: '14px 14px calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <div style={{ background: '#fbfbfa', color: '#1a1a1a', borderRadius: 14, padding: '20px 18px', boxShadow: '0 10px 30px rgba(0,0,0,.25)' }}>
            {(selectedItem.title || (selectedItem.content && selectedItem.content.title)) && (
              <div style={{ fontSize: 19, fontWeight: 700, color: '#15161a', letterSpacing: '-.01em', marginBottom: 12, lineHeight: 1.25 }}>{selectedItem.title || selectedItem.content.title}</div>
            )}
            {selectedItem.content && selectedItem.content.body && (
              <div style={{ fontSize: 14, lineHeight: 1.62, color: '#33343a', whiteSpace: 'pre-wrap' }}>{selectedItem.content.body}</div>
            )}
            {selectedItem.content && Array.isArray(selectedItem.content.sections) && selectedItem.content.sections.map((s, i) => (
              <div key={i} style={{ marginTop: 18 }}>
                {s.title && <div style={{ fontSize: 15, fontWeight: 700, color: '#15161a', marginBottom: 6 }}>{s.title}</div>}
                {s.body && <div style={{ fontSize: 14, lineHeight: 1.62, color: '#33343a', whiteSpace: 'pre-wrap' }}>{s.body}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Legacy sample media viewer — kept out of render (false guard) pending removal. */}
      {false && (
        <>
          {/* Type selector tabs — Photo, Video, Screenshot, Live site */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '12px 14px 0',
              overflow: 'auto',
              flex: 'none',
              background: 'var(--ground)',
            }}
          >
            {typeChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => setSelectedType(chip.key)}
                style={{
                  height: 30,
                  padding: '0 11px',
                  borderRadius: 15,
                  border: selectedType === chip.key ? 'none' : '1px solid var(--hair)',
                  background: selectedType === chip.key ? 'var(--accent)' : 'var(--surface-2)',
                  color: selectedType === chip.key ? '#fff' : 'var(--muted)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  flex: 'none',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {chip.key === 'photo' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>}
                {chip.key === 'video' && <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                {chip.key === 'screenshot' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
                {chip.key === 'live' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/></svg>}
                {chip.label}
              </button>
            ))}
          </div>

          {/* Viewer — adapts per type */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              background: '#0d0d0f',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {selectedType === 'video' && (
              <div
                style={{
                  width: '100%',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 12px 36px rgba(0,0,0,.4)',
                }}
              >
                {/* Video player */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16/9',
                    background: 'linear-gradient(135deg,#10202e,#241a33)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Play button */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>

                  {/* Paused badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(0,0,0,.55)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: 16,
                      padding: '6px 12px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: '#fff',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16"/>
                      <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                    Paused . 0:19
                  </div>

                  {/* Still-frame pin */}
                  <span
                    style={{
                      position: 'absolute',
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
                      boxShadow: '0 5px 14px -3px rgba(0,0,0,.5)',
                      left: '40%',
                      top: '58%',
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    2
                  </span>
                </div>

                {/* Timeline scrubber */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    height: 46,
                    padding: '0 14px',
                    background: '#16161a',
                    borderTop: '1px solid var(--divider)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', flex: 'none' }}>0:19</span>
                  {/* Track bar */}
                  <div
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      background: '#33333b',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '46%',
                        background: 'var(--accent)',
                        borderRadius: 3,
                      }}
                    />
                    {/* Markers */}
                    {[
                      { pos: '16%', label: '1' },
                      { pos: '46%', label: '2' },
                      { pos: '78%', label: '3' },
                    ].map((m, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: m.pos,
                          top: -5,
                          transform: 'translateX(-50%)',
                          width: 16,
                          height: 16,
                          borderRadius: '50% 50% 50% 3px',
                          background: '#fff',
                          color: '#16161a',
                          fontSize: 9,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,.4)',
                          cursor: 'pointer',
                        }}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', flex: 'none' }}>0:42</span>
                </div>
              </div>
            )}
            {selectedType === 'photo' && (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg,#1d3a53,#3a2440 55%,#5a2e3a)',
                  boxShadow: '0 12px 36px rgba(0,0,0,.4)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 70% 20%,rgba(255,255,255,.18),transparent)' }} />
                <div style={{ position: 'relative', color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', textShadow: '0 2px 18px rgba(0,0,0,.4)', padding: '18px 18px 30px' }}>
                  Brand hero . launch
                </div>
                <span style={{ position: 'absolute', width: 26, height: 26, borderRadius: '50% 50% 50% 3px', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 14px -3px rgba(0,0,0,.5)', left: '26%', top: '38%', transform: 'translate(-50%, -100%)' }}>1</span>
                <span style={{ position: 'absolute', width: 26, height: 26, borderRadius: '50% 50% 50% 3px', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 14px -3px rgba(0,0,0,.5)', left: '70%', top: '66%', transform: 'translate(-50%, -100%)' }}>2</span>
              </div>
            )}
            {selectedType === 'screenshot' && (
              <div
                style={{
                  width: '100%',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 12px 36px rgba(0,0,0,.4)',
                }}
              >
                {/* Browser chrome */}
                <div style={{ background: '#e9e7e4', height: 34, display: 'flex', alignItems: 'center', gap: 9, padding: '0 14px', borderBottom: '1px solid #d9d6d2' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f87171' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fbbf24' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#34d399' }} />
                  <div style={{ flex: 1, height: 20, borderRadius: 7, background: '#fff', border: '1px solid #d9d6d2', display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px', fontSize: 10, color: '#888', fontFamily: 'var(--font-mono)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
                    corner.so/pricing
                  </div>
                </div>
                {/* Page mockup */}
                <div style={{ background: '#fff', color: '#16181d', padding: '38px 22px 30px', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 10, color: '#1a1a1d' }}>Pricing plans</div>
                  <div style={{ fontSize: 12, color: '#666', maxWidth: 300, margin: '0 auto 18px', lineHeight: 1.5 }}>Choose the plan that works for your team.</div>
                </div>
              </div>
            )}
            {selectedType === 'live' && (
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--accent-weak)', border: '1px solid var(--accent-weak)', borderRadius: 11, padding: '10px 13px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/></svg>
                  <span style={{ flex: 1, fontSize: 12.5, color: 'var(--fg)' }}>Delivered as a live link. Open it, or leave feedback on the captured snapshot.</span>
                  <a href="https://cv6.corner.so" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', height: 32, padding: '0 13px', borderRadius: 9, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    Open live
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M9 7h8v8"/></svg>
                  </a>
                </div>
                {/* Browser chrome + mock page */}
                <div
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 12px 36px rgba(0,0,0,.4)',
                  }}
                >
                  <div style={{ background: '#e9e7e4', height: 34, display: 'flex', alignItems: 'center', gap: 9, padding: '0 14px', borderBottom: '1px solid #d9d6d2' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f87171' }} />
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fbbf24' }} />
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#34d399' }} />
                    <div style={{ flex: 1, height: 20, borderRadius: 7, background: '#fff', border: '1px solid #d9d6d2', display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px', fontSize: 10, color: '#888', fontFamily: 'var(--font-mono)' }}>
                      cv6.corner.so
                    </div>
                  </div>
                  <div style={{ background: '#fff', color: '#16181d', padding: '38px 22px 30px', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 10, color: '#1a1a1d' }}>Agents that do the work</div>
                    <div style={{ fontSize: 12, color: '#666', maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>A workspace where named AI agents run your projects.</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pin comments indicator — bottom bar above action buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 14px',
              borderTop: '1px solid var(--divider)',
              background: 'var(--ground)',
              flex: 'none',
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
              3
            </span>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12.5,
                color: 'var(--muted)',
                lineHeight: 1.3,
              }}
            >
              3 pin-comments queued for {metadata.from?.name || 'Gary'}
            </div>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--accent)',
                cursor: 'pointer',
                flex: 'none',
              }}
            >
              View
            </span>
          </div>
        </>
      )}

      {/* Action buttons — only when an item is open AND a decision is actually wired */}
      {selectedItem && (onApprove || onReject) && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            padding: '14px 14px',
            paddingBottom: `calc(14px + env(safe-area-inset-bottom, 0px))`,
            borderTop: '1px solid var(--divider)',
            background: 'var(--ground)',
            flex: 'none',
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
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 13 4 4L19 7"/>
            </svg>
            Approve
          </button>
          <button
            onClick={onReject}
            style={{
              flex: 1,
              height: 48,
              borderRadius: 13,
              border: '1px solid var(--hair)',
              background: 'var(--surface-2)',
              color: 'var(--fg)',
              fontSize: 13.5,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h18M3 6h18M3 18h12"/>
            </svg>
            Changes
          </button>
        </div>
      )}
    </div>
  );
}
