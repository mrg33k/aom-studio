// cv6next — the "Changes" overlay for the Review tool (R-ASSIGN part D, 2026-07-06).
//
// Opens from the Request changes / Changes button when the deliverable has real
// pin/timeline comments (the review-comments store usePins reads): a bullet list of
// EVERY comment with its timecode anchor, plus "Send back to agent" which routes
// through the (now real) assign path with the full list attached — so the agent gets
// the exact notes, not a bare filename.
//
// WD40-R3 (2026-07-06): the overlay now ALWAYS opens on "Request changes" — the
// browser prompt() fallback is gone. A free-text textarea lets Patrik type notes
// without needing to pin first. "Send back to agent" activates when either pins OR
// typed notes exist. compileChanges accepts optional extra text so both paths merge
// into one clean message.
//
// CV6 visual language only: same tokens (--ground/--surface/--hair/--fg/--muted/
// --accent) and the same desktop-popover / mobile-bottom-sheet split as the
// AssignButton overlay. No new dependencies.

import React, { useState } from 'react';

// The plain-text list carried into the dispatch (and recorded as the
// request-changes decision): one bullet per pin comment (with timecode when
// anchored to a video frame), plus optional typed notes appended after a blank line.
export function compileChanges(pins = [], extra = '') {
  const pinLines = (pins || [])
    .map((p) => `- ${p.anchor ? `[${String(p.anchor).replace(/^at\s+/, '')}] ` : ''}${p.text}`)
    .join('\n');
  const extraTrimmed = (extra || '').trim();
  const parts = [pinLines, extraTrimmed].filter(Boolean);
  return parts.join('\n\n');
}

export function ReviewChangesOverlay({ pins = [], title = '', onSendBack = () => {}, onClose = () => {} }) {
  const VIEWPORT = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const isMobile = VIEWPORT < 640;

  // WD40-R3: typed notes alongside pin comments — no prompt() needed.
  const [notes, setNotes] = useState('');
  const [checks, setChecks] = useState([
    { id: 'request', label: 'Matches the original request', checked: false },
    { id: 'accuracy', label: 'Details and claims are accurate', checked: false },
    { id: 'finish', label: 'Ready for the next pass', checked: false },
  ]);
  const checklistNotes = checks.filter((item) => item.checked).map((item) => `- [x] ${item.label}`).join('\n');
  const canSend = pins.length > 0 || notes.trim().length > 0 || checklistNotes.length > 0;
  const pinCount = pins.length;
  const hasTyped = notes.trim().length > 0;

  const list = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: isMobile ? '36vh' : '40vh', overflowY: 'auto' }}>
      {pins.map((p) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 11 }}>
          <span style={{ flex: 'none', width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{p.n}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {p.anchor ? (
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono, monospace)', marginBottom: 2 }}>{String(p.anchor).replace(/^at\s+/, '')}</div>
            ) : null}
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)' }}>{p.text}</div>
          </div>
        </div>
      ))}
      {!pinCount && (
        <div style={{ padding: '8px 0 4px', color: 'var(--muted)', fontSize: 12.5 }}>No pinned comments yet — type your notes below or pin directly on the deliverable.</div>
      )}
    </div>
  );

  // WD40-R3: free-text notes textarea — always visible so Patrik can write feedback
  // without first adding a pin. The textarea activates "Send back" on its own.
  const notesInput = (
    <div style={{ marginTop: pinCount > 0 ? 10 : 6 }}>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Type additional notes for the agent…"
        rows={isMobile ? 4 : 3}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 12px', background: 'var(--surface)',
          border: '1px solid var(--hair)', borderRadius: 11,
          color: 'var(--fg)', fontSize: 13.5, lineHeight: 1.5,
          fontFamily: 'var(--font-sans)', resize: 'none',
          outline: 'none', transition: 'border-color 0.15s',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--hair)'; }}
      />
    </div>
  );

  const checklist = (
    <div style={{ marginTop: 12 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Optional checklist</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {checks.map((item) => <button type="button" key={item.id} className={`review-default-check${item.checked ? ' is-on' : ''}`} onClick={() => setChecks((current) => current.map((row) => row.id === item.id ? { ...row, checked: !row.checked } : row))}><span>{item.checked ? '✓' : ''}</span>{item.label}</button>)}
      </div>
    </div>
  );

  const header = (
    <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? 16 : 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
          {pinCount > 0
            ? `Changes · ${pinCount} ${pinCount === 1 ? 'pin' : 'pins'}${hasTyped ? ' + note' : ''}`
            : hasTyped ? 'Changes · note added' : 'Request changes'}
        </div>
        <div style={{ fontSize: isMobile ? 13 : 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      </div>
      <button onClick={onClose} aria-label="Close" style={{ flex: 'none', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );

  const footer = (
    <div style={{ display: 'flex', gap: 10, marginTop: 16, flexDirection: isMobile ? 'column' : 'row' }}>
      <button
        onClick={() => { onSendBack([checklistNotes ? `Checklist:\n${checklistNotes}` : '', notes.trim()].filter(Boolean).join('\n\n')); }}
        disabled={!canSend}
        style={{ flex: 1, padding: isMobile ? '12px 14px' : '10px 14px', background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#fff', fontSize: isMobile ? 14 : 13, fontWeight: 600, cursor: canSend ? 'pointer' : 'not-allowed', opacity: canSend ? 1 : 0.5, fontFamily: 'var(--font-sans)' }}
      >
        Send Back To Agent
      </button>
      <button
        onClick={onClose}
        style={{ flex: isMobile ? 1 : 'none', padding: isMobile ? '12px 14px' : '10px 14px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 10, color: 'var(--fg)', fontSize: isMobile ? 14 : 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
      >
        Close
      </button>
    </div>
  );

  if (!isMobile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
        <aside aria-label="Review checklist and comments" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(440px, 92vw)', boxSizing: 'border-box', overflowY: 'auto', background: 'var(--ground)', borderLeft: '1px solid var(--hair)', padding: 22, zIndex: 41, boxShadow: '-24px 0 48px -20px rgba(0,0,0,0.55)' }}>
          {header}
          {list}
          {checklist}
          {notesInput}
          {footer}
        </aside>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,6,9,0.55)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 41, background: 'var(--ground)', borderRadius: '20px 20px 0 0', border: '1px solid var(--hair)', borderBottom: 'none', padding: '16px 16px calc(16px + env(safe-area-inset-bottom))', maxHeight: '82vh', overflowY: 'auto', boxShadow: '0 -12px 30px rgba(0,0,0,0.4)' }}>
        {header}
        {list}
        {checklist}
        {notesInput}
        {footer}
      </div>
    </div>
  );
}
