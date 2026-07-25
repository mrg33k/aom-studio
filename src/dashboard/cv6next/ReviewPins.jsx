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

export function useReviewPinUI({ wrapRef, pins, addPin, deletePin, enabled = true, isMobile = false }) {
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
      // The Pin-mode toggle rides inside iframe-based viewers (PDF / live site), whose
      // content swallows clicks. It flips its sibling .pinshield — a transparent layer
      // that hands clicks back to this listener — on and off. Pure DOM state: the body
      // markup only rewrites when the file changes (data-html guard), so it holds.
      const toggle = e.target.closest('.pinmode-toggle');
      if (toggle && wrap.contains(toggle)) {
        const shield = toggle.parentElement?.querySelector('.pinshield');
        if (shield) {
          const turnOn = shield.style.display === 'none';
          shield.style.display = turnOn ? 'block' : 'none';
          toggle.textContent = turnOn ? 'Pin mode: on' : 'Pin mode: off';
          toggle.style.background = turnOn ? '#0066FF' : 'rgba(0,0,0,.55)';
        }
        return;
      }
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
      // Clicks on the scrub bar belong to the player, never to a pin.
      if (e.target.closest('[data-vscrub]')) return;
      // DS7 video behavior ("Paused · drop a pin on this frame"): clicking a PLAYING
      // video pauses it; a pin only drops on a paused frame, anchored to that time.
      const video = docElem.querySelector('video');
      if (video && !video.paused) { video.pause(); return; }
      const t = (video && Number.isFinite(video.currentTime)) ? video.currentTime : null;
      const wrapRect = wrap.getBoundingClientRect();
      const pos = clampPos(e.clientX - wrapRect.left + 10, e.clientY - wrapRect.top + 10, wrap);
      setUi({ mode: 'compose', xFrac: x, yFrac: y, t, ...pos });
    };

    wrap.addEventListener('click', onClick);
    return () => wrap.removeEventListener('click', onClick);
    // `enabled` in deps is load-bearing for MOBILE: Review.jsx mounts on the pick
    // list, where the read-view wrapper (wrapRef.current) doesn't exist yet — with
    // [wrapRef] alone this effect ran once against null and never re-attached, so
    // the mobile read view had NO pin listener. enabled flips with the screen,
    // re-running the effect once the wrapper is real. Desktop passes a constant.
  }, [wrapRef, enabled]);

  // Open an existing pin's comment (from the marker via data-action="openPin", or from
  // its row in the comments panel). Position over the marker when the doc is on screen,
  // else centered-ish in the wrapper.
  const openPinById = useCallback((pinId) => {
    const wrap = wrapRef.current;
    const pin = (stateRef.current.pins || []).find((p) => p.id === pinId);
    if (!wrap || !pin) return;
    const docElem = wrap.querySelector('.doc');
    // A video-frame pin carries its playback time — opening it jumps the video back
    // to that exact frame, so "at 0:34" comments land on what they're about.
    if (pin.t != null && Number.isFinite(Number(pin.t))) {
      const video = docElem?.querySelector('video');
      if (video) { try { video.pause(); video.currentTime = Number(pin.t); } catch { /* not seekable yet */ } }
    }
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

  // ── DS7 video player chrome (design-system (7) ui_kits/tools/review.html) ──
  // Builds the scrub bar under the video (play button · mono current time · 6px track
  // with accent progress + numbered teardrop markers · duration) and scopes on-frame
  // pins to their moment: a video pin only shows within ±PIN_WINDOW s of its saved
  // time (or while its comment popover is open) — never across the whole playback.
  // Imperative on purpose: TemplateScreen rebuilds its DOM on data ticks, but the
  // video lives inside the data-cv6-keep body node, so chrome attached next to it
  // survives; pins are rebuilt each tick, so visibility is re-applied via observer.
  const openPinRef = useRef(null);
  openPinRef.current = openPinById;
  const applyVisRef = useRef(() => {});

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    let disposed = false;
    let video = null;

    const PIN_WINDOW = 1.25;
    const MONO = 'var(--font-mono, ui-monospace, Menlo, monospace)';
    const fmt = (sec) => {
      const s = Math.max(0, Math.floor(Number(sec) || 0));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    const glyph = (playing) => (playing
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="m8 5 11 7-11 7Z"/></svg>');

    const applyPinVisibility = () => {
      const doc = wrap.querySelector('.doc');
      if (!doc) return;
      const { pins: livePins, ui: openUi } = stateRef.current;
      for (const node of doc.querySelectorAll('.pin')) {
        if (getComputedStyle(node).position !== 'absolute') continue; // comment-row pins stay
        const pin = (livePins || []).find((p) => p.n === parseInt(node.textContent, 10));
        if (!pin || pin.t == null || !video) { node.style.display = ''; continue; }
        const openForThis = openUi && openUi.mode === 'view' && openUi.pinId === pin.id;
        const near = Math.abs(video.currentTime - Number(pin.t)) <= PIN_WINDOW;
        node.style.display = (near || openForThis) ? '' : 'none';
      }
    };
    applyVisRef.current = applyPinVisibility;

    const renderMarkers = (marksEl) => {
      const withT = (stateRef.current.pins || []).filter((p) => p.t != null);
      const sig = `${video?.duration || 0}|${withT.map((p) => `${p.id}:${p.t}`).join(',')}`;
      if (marksEl.dataset.sig === sig) return;
      marksEl.dataset.sig = sig;
      marksEl.textContent = '';
      const dur = video?.duration;
      if (!dur || !Number.isFinite(dur)) return;
      for (const p of withT) {
        const m = document.createElement('div');
        m.textContent = String(p.n);
        m.style.cssText = `position:absolute;top:-5px;left:${Math.min(100, (Number(p.t) / dur) * 100)}%;width:16px;height:16px;border-radius:50% 50% 50% 3px;background:#fff;color:#16161a;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;transform:translateX(-50%);box-shadow:0 2px 6px rgba(0,0,0,.4);cursor:pointer;`;
        m.addEventListener('click', (e) => { e.stopPropagation(); openPinRef.current?.(p.id); });
        marksEl.appendChild(m);
      }
    };

    const enhance = (v) => {
      const host = v.parentElement;
      if (!host || host.querySelector('[data-vscrub]')) return;
      // MOBILE: keep the native `controls` shipped in the markup — the DS7 scrub bar
      // (a 46px sibling below the video) gets pushed below the fold on a tall 9:16
      // video with no way to scroll to it, leaving no reachable play button. Native
      // controls put a play button on the frame itself (Patrik 2026-07-25). Pin
      // visibility/markers below still run; only the custom player chrome is skipped.
      if (isMobile) return;
      v.removeAttribute('controls');
      v.style.borderRadius = '10px 10px 0 0';
      const bar = document.createElement('div');
      bar.setAttribute('data-vscrub', '1');
      bar.style.cssText = 'display:flex;align-items:center;gap:12px;height:46px;padding:0 16px;background:#16161a;border-radius:0 0 10px 10px;';
      bar.innerHTML =
        `<button data-vplay type="button" style="width:26px;height:26px;flex:none;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">${glyph(false)}</button>`
        + `<span data-vcur style="color:#fff;font-family:${MONO};font-size:11px;font-weight:600;">0:00</span>`
        + '<div data-vtrack style="flex:1;height:6px;border-radius:3px;background:#33333b;position:relative;cursor:pointer;">'
        + '<div data-vplayed style="position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:#0066FF;width:0%;"></div>'
        + '<div data-vmarks></div>'
        + '<div data-vknob style="position:absolute;left:0%;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.5);pointer-events:none;"></div>'
        + '</div>'
        + `<span data-vdur style="color:#9a9aa2;font-family:${MONO};font-size:11px;">0:00</span>`;
      v.insertAdjacentElement('afterend', bar);

      const playBtn = bar.querySelector('[data-vplay]');
      const track = bar.querySelector('[data-vtrack]');
      const played = bar.querySelector('[data-vplayed]');
      const knob = bar.querySelector('[data-vknob]');
      const cur = bar.querySelector('[data-vcur]');
      const durEl = bar.querySelector('[data-vdur]');

      const update = () => {
        const dur = v.duration;
        const pct = (dur && Number.isFinite(dur)) ? Math.min(100, (v.currentTime / dur) * 100) : 0;
        played.style.width = `${pct}%`;
        knob.style.left = `${pct}%`;
        cur.textContent = fmt(v.currentTime);
        if (dur && Number.isFinite(dur)) durEl.textContent = fmt(dur);
        playBtn.innerHTML = glyph(!v.paused);
        applyPinVisibility();
      };
      playBtn.addEventListener('click', (e) => { e.stopPropagation(); if (v.paused) v.play(); else v.pause(); });
      track.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = track.getBoundingClientRect();
        const dur = v.duration;
        if (dur && Number.isFinite(dur) && r.width) v.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur;
      });
      for (const ev of ['timeupdate', 'seeked', 'loadedmetadata', 'durationchange', 'play', 'pause']) v.addEventListener(ev, update);
      v.addEventListener('loadedmetadata', () => renderMarkers(bar.querySelector('[data-vmarks]')));
      update();
    };

    const tick = () => {
      if (disposed) return;
      const v = wrap.querySelector('.doc video');
      if (v && v !== video) { video = v; enhance(v); }
      if (video && !wrap.contains(video)) video = null;
      const marksEl = wrap.querySelector('[data-vmarks]');
      if (video && marksEl) renderMarkers(marksEl);
      applyPinVisibility();
    };
    const iv = setInterval(tick, 600);
    const mo = new MutationObserver(tick);
    mo.observe(wrap, { childList: true, subtree: true });
    tick();
    return () => { disposed = true; clearInterval(iv); mo.disconnect(); };
    // Same mobile re-attach as the click effect above: without `enabled` this ran
    // once against a null wrapper on the pick list and the scrub bar (the ONLY
    // play control — videos have no native controls) never built on mobile.
  }, [wrapRef, enabled, isMobile]);

  // Popover open/close changes which pin is force-shown — re-apply immediately.
  useEffect(() => { applyVisRef.current(); }, [ui]);

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
