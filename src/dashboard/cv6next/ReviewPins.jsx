// cv6next — Review pin-comment interaction, shared by Review (mobile) and ReviewDesktop.
//
// WHY THIS EXISTS: TemplateScreen wipes and rebuilds its whole DOM (innerHTML) every time
// the bound data's content changes — the file body landing, a pin saving, a queue tick.
// The old approach bound a click listener directly to the [data-state="ready"] node, so
// the listener died on the first rebuild (~1s after opening a file) and pin-comments went
// dead. This hook DELEGATES from the stable React wrapper div instead (the wrapper is
// React-owned and never rebuilt), so clicks keep working across every rebuild.
//
// It also replaces window.prompt with the design system's comment popover
// (ui_kits/tools/review.html popover): click a spot → an inline composer at that spot;
// click a pin (or its comment row) → the comment with a delete action. The popover is
// React-rendered OUTSIDE the template DOM, so a mid-compose data tick can't wipe it.
// Styles are inline because the popover sits outside the [data-cv6] scope; values are
// verbatim from the design popover (white card, 13px radius, #0066FF accent).

import React, { useState, useRef, useEffect, useCallback } from 'react';

const ACCENT = '#0066FF'; // design accent (outside [data-cv6] scope, so no var(--accent))
const POP_W = 230;        // design popover width

// Clamp the popover inside the wrapper so a right-edge pin doesn't push it off-screen.
function clampPos(px, py, wrap) {
  const w = wrap?.clientWidth || 0;
  const h = wrap?.clientHeight || 0;
  return {
    left: Math.max(8, Math.min(px, (w || POP_W + 16) - POP_W - 8)),
    top: Math.max(8, Math.min(py, (h || 300) - 40)),
  };
}

export function useReviewPinUI({ wrapRef, pins, addPin, deletePin, enabled = true }) {
  // null | { mode:'compose', xFrac, yFrac, t, left, top } | { mode:'view', pinId, left, top }
  const [ui, setUi] = useState(null);

  // The delegated listener stays bound once; everything it needs rides refs so a
  // pins/addPin identity change never forces an unbind (which is what killed the old one).
  const stateRef = useRef({ pins, addPin, enabled, ui });
  stateRef.current = { pins, addPin, enabled, ui };

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const onClick = (e) => {
      const { enabled: on, ui: open } = stateRef.current;
      if (!on) return;
      // Clicks inside an open popover belong to the popover.
      if (e.target.closest('[data-review-popover]')) return;
      // The template engine handles pin clicks itself (data-action="openPin" stops
      // propagation), so a click landing here is never on a pin marker.
      const docElem = e.target.closest('.doc');
      if (!docElem || !wrap.contains(docElem)) {
        if (open) setUi(null); // click-away closes whatever is open
        return;
      }
      const rect = docElem.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (x < 0 || y < 0 || x > 1 || y > 1) return;
      // On a video frame, anchor the comment to the playback time — but let clicks on
      // the native control strip (bottom of the element) drive the player, not a pin.
      const video = docElem.querySelector('video');
      if (video) {
        const vr = video.getBoundingClientRect();
        if (e.clientY > vr.bottom - 44 && e.clientY <= vr.bottom && e.clientX >= vr.left && e.clientX <= vr.right) return;
      }
      const t = (video && Number.isFinite(video.currentTime)) ? video.currentTime : null;
      const wrapRect = wrap.getBoundingClientRect();
      const pos = clampPos(e.clientX - wrapRect.left + 10, e.clientY - wrapRect.top + 10, wrap);
      setUi({ mode: 'compose', xFrac: x, yFrac: y, t, ...pos });
    };

    wrap.addEventListener('click', onClick);
    return () => wrap.removeEventListener('click', onClick);
  }, [wrapRef]);

  // Open an existing pin's comment (from the marker via data-action="openPin", or from
  // its row in the comments panel). Position over the marker when the doc is on screen,
  // else centered-ish in the wrapper.
  const openPinById = useCallback((pinId) => {
    const wrap = wrapRef.current;
    const pin = (stateRef.current.pins || []).find((p) => p.id === pinId);
    if (!wrap || !pin) return;
    const docElem = wrap.querySelector('.doc');
    const wrapRect = wrap.getBoundingClientRect();
    let left = 24; let top = 24;
    if (docElem) {
      const r = docElem.getBoundingClientRect();
      left = (r.left - wrapRect.left) + (r.width * (Number(pin.x) || 0) / 100) + 10;
      top = (r.top - wrapRect.top) + (r.height * (Number(pin.y) || 0) / 100) + 10;
    }
    setUi({ mode: 'view', pinId, ...clampPos(left, top, wrap) });
  }, [wrapRef]);

  const close = useCallback(() => setUi(null), []);

  const overlay = ui ? (
    <PinPopover
      ui={ui}
      pins={pins}
      onSubmit={async (text) => {
        const t = ui.t;
        setUi(null);
        await addPin?.(ui.xFrac, ui.yFrac, text, t);
      }}
      onDelete={async (pinId) => {
        setUi(null);
        await deletePin?.(pinId);
      }}
      onClose={close}
    />
  ) : null;

  return { overlay, openPinById, closePinUI: close };
}

function PinPopover({ ui, pins, onSubmit, onDelete, onClose }) {
  const [text, setText] = useState('');
  const taRef = useRef(null);
  useEffect(() => { if (ui.mode === 'compose') taRef.current?.focus(); }, [ui.mode]);

  const card = {
    position: 'absolute', left: ui.left, top: ui.top, width: POP_W, zIndex: 30,
    background: '#fff', borderRadius: 13, boxShadow: '0 16px 40px -10px rgba(0,0,0,.45)',
    border: '1px solid #e7e5e2', padding: '13px 14px', boxSizing: 'border-box',
    fontFamily: 'var(--font-sans, system-ui)', cursor: 'default',
  };
  const btn = (primary) => ({
    height: 32, borderRadius: 8, border: primary ? 'none' : '1px solid #e2e0dd',
    background: primary ? ACCENT : '#fff', color: primary ? '#fff' : '#666',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    padding: '0 12px', flex: primary ? 1 : 'none',
  });
  const head = (who) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>P</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>{who}</span>
      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10, color: '#aaa', marginLeft: 'auto' }}>now</span>
    </div>
  );

  if (ui.mode === 'view') {
    const pin = (pins || []).find((p) => p.id === ui.pinId);
    if (!pin) return null;
    return (
      <div style={card} data-review-popover="">
        {head('You')}
        <div style={{ fontSize: 13, lineHeight: 1.5, color: '#333', marginBottom: 4 }}>{pin.text}</div>
        {pin.anchor ? <div style={{ fontSize: 10.5, color: '#999', marginBottom: 8 }}>{pin.anchor}</div> : <div style={{ height: 6 }} />}
        <div style={{ display: 'flex', gap: 7 }}>
          <button style={btn(false)} onClick={() => onDelete(pin.id)}>Delete</button>
          <button style={{ ...btn(false), marginLeft: 'auto' }} onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const submit = () => { const v = text.trim(); if (v) onSubmit(v); };
  return (
    <div style={card} data-review-popover="">
      {head('You')}
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } if (e.key === 'Escape') onClose(); }}
        placeholder={ui.t != null ? 'Comment on this frame…' : 'Comment on this spot…'}
        rows={3}
        style={{ width: '100%', boxSizing: 'border-box', resize: 'none', border: '1px solid #e7e5e2', borderRadius: 8, padding: '8px 10px', fontSize: 13, lineHeight: 1.5, color: '#333', fontFamily: 'inherit', outline: 'none', marginBottom: 10 }}
      />
      <div style={{ display: 'flex', gap: 7 }}>
        <button style={btn(true)} onClick={submit}>Comment</button>
        <button style={btn(false)} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
