import React, { useState } from 'react';

// R78-p9 corner:new-projects — the "name it" popup for self-serve creation.
// Stupid simple: one field, Enter to create. On submit the caller creates the
// room and drops the user into it, where the agent's kickoff greeting waits.
//
// cv6 design (Patrik 2026-06-21): no mockup exists for this screen, so it is
// composed from the cv6 glass design language used across the mobile app —
// frosted scrim, translucent surface card, token colours, the kind's glyph in
// a chip, and the accent Create button. Scoped data-cv6kit so tokens resolve.
export function NewRoomModal({ kind = 'project', busy = false, error = null, onSubmit, onClose }) {
  const [name, setName] = useState('');
  const label = kind === 'mission' ? 'mission' : 'project';
  const canSubmit = !!name.trim() && !busy;
  return (
    <div
      data-cv6kit data-theme="glass"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'max(20px, env(safe-area-inset-top, 0px)) 20px max(20px, env(safe-area-inset-bottom, 0px))',
        fontFamily: 'var(--font-sans)',
        animation: 'cv4DrawerFade 0.15s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 92vw)',
          background: 'var(--surface)',
          backdropFilter: 'blur(28px) saturate(1.4)', WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
          border: '1px solid var(--hair)',
          borderRadius: 20,
          padding: '22px 22px 18px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
        }}
      >
        {/* Kind glyph: folder for a project, target for a mission */}
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          {kind === 'mission' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.6" fill="var(--accent)" stroke="none" /></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--violet-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>
          )}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15, color: 'var(--fg)', marginBottom: 6, letterSpacing: '-0.02em' }}>
          New {label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.45 }}>
          Name it. You'll land in the {label} room and your EA sets it up from there.
        </div>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) onSubmit(name);
            if (e.key === 'Escape') onClose();
          }}
          placeholder={kind === 'mission' ? 'e.g. Hero section' : 'e.g. Phoenix Bakery'}
          style={{
            width: '100%', boxSizing: 'border-box', height: 46,
            background: 'var(--surface-2)', border: '1px solid var(--hair)',
            borderRadius: 12, padding: '0 14px',
            color: 'var(--fg)', fontFamily: 'var(--font-sans)',
            fontSize: 15, outline: 'none', marginBottom: error ? 8 : 18,
          }}
        />
        {error && (
          <div style={{ color: 'var(--warn)', fontSize: 12.5, marginBottom: 14, wordBreak: 'break-word' }}>{error}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: 'var(--muted)',
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              padding: '10px 14px', fontFamily: 'var(--font-sans)', borderRadius: 10,
            }}
          >Cancel</button>
          <button
            onClick={() => canSubmit && onSubmit(name)}
            disabled={!canSubmit}
            style={{
              background: canSubmit ? 'var(--accent)' : 'var(--chip)',
              color: canSubmit ? '#fff' : 'var(--faint)',
              border: 'none', borderRadius: 11, padding: '10px 18px',
              fontSize: 13.5, fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'default',
              fontFamily: 'var(--font-sans)',
            }}
          >{busy ? 'Creating…' : `Create ${label}`}</button>
        </div>
      </div>
    </div>
  );
}

export default NewRoomModal;
