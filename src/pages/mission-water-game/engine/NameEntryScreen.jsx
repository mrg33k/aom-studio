import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StarCanvas from './StarCanvas.jsx';

/**
 * NameEntryScreen — R9 Conrad Foundation Mission Water Game
 *
 * Gate: after WelcomeScreen (mission selection), before RoleSelect.
 * Design system: DESIGN.md — Orbitron + Rajdhani only, space-bg + instrument panel.
 *
 * Props:
 *   onConfirm(playerName: string) — called with trimmed name when user submits
 */

// ─── prefers-reduced-motion ───────────────────────────────────────────────────
const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Entry animation hook ─────────────────────────────────────────────────────
/**
 * Returns { panelReady, headlineReady, blippyReady, bubbleReady }
 *   panelReady    → panel scales 0.92→1 + fades in  (immediate)
 *   headlineReady → headline word "WATER" slides in from left (200ms)
 *   blippyReady   → Blippy scale+opacity+slide from bottom (500ms)
 *   bubbleReady   → speech bubble appears 300ms after Blippy (800ms total)
 */
function useEntryAnim() {
  const [panelReady,    setPanelReady]    = useState(REDUCED);
  const [headlineReady, setHeadlineReady] = useState(REDUCED);
  const [blippyReady,   setBlippyReady]   = useState(REDUCED);
  const [bubbleReady,   setBubbleReady]   = useState(REDUCED);

  useEffect(() => {
    if (REDUCED) return;
    const t0 = setTimeout(() => setPanelReady(true),    60);
    const t1 = setTimeout(() => setHeadlineReady(true), 200);
    const t2 = setTimeout(() => setBlippyReady(true),   500);
    const t3 = setTimeout(() => setBubbleReady(true),   800);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return { panelReady, headlineReady, blippyReady, bubbleReady };
}

// ─── Palette (from DESIGN.md color tokens) ────────────────────────────────────
const SPACE_BG = '#070B14';
const CYAN     = '#00E5CC';
const TEXT_DIM = 'rgba(232,240,248,0.55)';
const TEXT_OFF = 'rgba(232,240,248,0.45)';

// ─── NameEntryScreen ─────────────────────────────────────────────────────────
export default function NameEntryScreen({ onConfirm }) {
  const [name, setName]       = useState('');
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef              = useRef(null);
  const { panelReady, headlineReady, blippyReady, bubbleReady } = useEntryAnim();

  // Auto-focus input after mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(t);
  }, []);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onConfirm(name.trim());
  }, [name, canSubmit, onConfirm]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={S.root}>
 {/* Placeholder colour, can't do ::placeholder in inline styles */}
      <style>{`
        .ne-input::placeholder          { color: rgba(232,240,248,0.30); }
        .ne-input::-webkit-input-placeholder { color: rgba(232,240,248,0.30); }
        .ne-input:-ms-input-placeholder { color: rgba(232,240,248,0.30); }
      `}</style>

      {/* Space background */}
      <div style={S.bg}>
        <StarCanvas seed={0xc0ffee42} />
      </div>

      {/* Scanline overlay — same instrument texture as the rest of the game */}
      <div style={S.scanlines} />

      {/* Scrollable overlay — centers panel vertically */}
      <div style={S.overlay}>
        <div style={S.flex1} />

        <div style={S.panelOuter}>
          {/* ── Instrument panel ─────────────────────────────────────────── */}
          <div style={{
            ...S.panel,
            opacity:    panelReady ? 1 : 0,
            transform:  panelReady ? 'scale(1)' : 'scale(0.92)',
            transition: 'opacity 400ms ease, transform 400ms ease',
          }}>

            {/* Title block */}
            <div>
              <div style={S.kicker}>CADET REGISTRATION</div>
              <h1 style={{
                ...S.headline,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.25em',
                alignItems: 'baseline',
              }}>
                <span>WHAT IS YOUR NAME,</span>
                {/* "CADET" slides in from the left */}
                <span style={{
                  display:    'inline-block',
                  opacity:    headlineReady ? 1 : 0,
                  transform:  headlineReady ? 'translateX(0)' : 'translateX(-20px)',
                  transition: 'opacity 300ms ease, transform 300ms ease',
                }}>CADET?</span>
              </h1>
              <p  style={S.subtext}>EVERY MISSION BEGINS WITH A NAME.</p>
            </div>

            {/* Name input */}
            <input
              ref={inputRef}
              className="ne-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Enter your name…"
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
              style={{
                ...S.input,
                borderColor: focused ? CYAN : 'rgba(0,229,204,0.30)',
                boxShadow:   focused ? '0 0 12px rgba(0,229,204,0.25)' : 'none',
              }}
            />

            {/* Confirm button */}
            <button
              style={{
                ...S.btn,
                ...(canSubmit
                  ? (hovered ? S.btnHover : {})
                  : S.btnDisabled),
              }}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              CONFIRM IDENTITY
            </button>

          </div>
          {/* ── end instrument panel ─────────────────────────────────────── */}

        </div>

        <div style={S.flex1} />
      </div>
    </div>
  );
}

// ─── Styles (all from DESIGN.md) ─────────────────────────────────────────────
const S = {
  root: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: SPACE_BG,
    fontFamily: '"Rajdhani", sans-serif',
    color: '#E8F0F8',
  },
  bg: {
    position: 'absolute',
    inset: 0,
    background: SPACE_BG,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    zIndex: 1,
  },
  flex1: { flex: 1, minHeight: 24 },

  scanlines: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
    zIndex: 1,
  },

  panelOuter: {
    width: '100%',
    maxWidth: 'min(640px, 90vw)',
    margin: '0 auto',
  },

  // DESIGN.md: .instrument-panel
  panel: {
    background: 'rgba(7,11,20,0.88)',
    border: '1px solid rgba(0,229,204,0.25)',
    borderRadius: 4,
    boxShadow: '0 0 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(0,229,204,0.08)',
    padding: 'clamp(28px,5vw,48px) clamp(20px,5vw,40px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },

  // Canon header pattern (matches RoleSelect): cyan Orbitron kicker, white title
  kicker: {
    fontFamily: '"Orbitron", sans-serif',
    fontSize: 'clamp(9px,1.4vw,11px)',
    letterSpacing: '0.35em',
    color: CYAN,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  headline: {
    fontFamily: '"Orbitron", sans-serif',
    fontWeight: 700,
    fontSize: 'clamp(20px,4vw,32px)',
    letterSpacing: '0.1em',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    margin: 0,
    marginBottom: 8,
    lineHeight: 1.2,
  },

  // DESIGN.md: Rajdhani 600, clamp(13px,2vw,18px), rgba(232,240,248,0.55), 0.3em
  subtext: {
    fontFamily: '"Rajdhani", sans-serif',
    fontWeight: 600,
    fontSize: 'clamp(13px,2vw,18px)',
    letterSpacing: '0.3em',
    color: TEXT_DIM,
    textTransform: 'uppercase',
    margin: 0,
  },

  // Input field
  input: {
    display: 'block',
    width: '100%',
    background: 'rgba(10,22,40,0.85)',
    border: '1px solid rgba(0,229,204,0.30)',
    borderRadius: 4,
    color: '#E8F0F8',
    fontFamily: '"Rajdhani", sans-serif',
    fontWeight: 600,
    fontSize: 'clamp(16px,2.5vw,20px)',
    letterSpacing: '0.08em',
    padding: '14px 16px',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box',
  },

  // DESIGN.md: .btn-primary
  btn: {
    display: 'block',
    width: '100%',
    background: 'transparent',
    border: `2px solid ${CYAN}`,
    color: CYAN,
    fontFamily: '"Rajdhani", sans-serif',
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    padding: '12px 32px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  // DESIGN.md: .btn-primary:hover
  btnHover: {
    background: 'rgba(0,229,204,0.12)',
    boxShadow: '0 0 20px rgba(0,229,204,0.35)',
  },
  // DESIGN.md: .btn-locked
  btnDisabled: {
    borderColor: 'rgba(232,240,248,0.20)',
    color: 'rgba(232,240,248,0.30)',
    cursor: 'not-allowed',
  },

};