import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

// ─── RNG (same mulberry32 pattern as WelcomeScreen) ──────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── StarCanvas ──────────────────────────────────────────────────────────────
function StarCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rand = mulberry32(0xc0ffee42);

    const LAYERS = [
      { count: 180, minR: 0.4, maxR: 1.1, minA: 0.25, maxA: 0.65, spd: 0.012 },
      { count: 70,  minR: 0.9, maxR: 2.0, minA: 0.50, maxA: 1.00, spd: 0.022 },
    ];
    let W = 0, H = 0, raf;
    let stars = [];

    function buildStars(w, h) {
      stars = [];
      for (const L of LAYERS) {
        for (let i = 0; i < L.count; i++) {
          stars.push({
            x:   rand() * w,
            y:   rand() * h,
            r:   L.minR + rand() * (L.maxR - L.minR),
            a:   L.minA + rand() * (L.maxA - L.minA),
            spd: L.spd * (0.7 + rand() * 0.6),
            dx:  (rand() - 0.5) * 0.006,
          });
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.y -= s.spd;
        s.x += s.dx;
        if (s.y < -2) s.y = H + 2;
        if (s.x < -2) s.x = W + 2;
        if (s.x > W + 2) s.x = -2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      canvas.width = width;
      canvas.height = height;
      W = width; H = height;
      buildStars(W, H);
    });
    ro.observe(canvas);
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
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
      {/* Placeholder colour — can't do ::placeholder in inline styles */}
      <style>{`
        .ne-input::placeholder          { color: rgba(232,240,248,0.30); }
        .ne-input::-webkit-input-placeholder { color: rgba(232,240,248,0.30); }
        .ne-input:-ms-input-placeholder { color: rgba(232,240,248,0.30); }
      `}</style>

      {/* Space background */}
      <div style={S.bg}>
        <StarCanvas />
      </div>

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
              <p  style={S.subtext}>EPIC. BADGE DAY.</p>
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

          {/* Blippy companion */}
          <div style={{
            ...S.blippyRow,
            opacity:    blippyReady ? 1 : 0,
            transform:  blippyReady ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
            transition: 'opacity 300ms ease-out, transform 300ms ease-out',
          }}>
            <div style={S.blippyCircle}>
              <img
                src="/mission-water/welcome/blippy_welcome_pose.png"
                alt="Blippy"
                style={S.blippyImg}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div style={{
              ...S.bubble,
              opacity:    bubbleReady ? 1 : 0,
              transform:  bubbleReady ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 250ms ease, transform 250ms ease',
            }}>Ready to meet you, Cadet!</div>
          </div>

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

  panelOuter: {
    width: '100%',
    maxWidth: 'min(640px, 90vw)',
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

  kicker: {
    fontFamily: '"Rajdhani", sans-serif',
    fontWeight: 600,
    fontSize: 'clamp(10px,1.5vw,12px)',
    letterSpacing: '0.35em',
    color: TEXT_OFF,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  // DESIGN.md: Orbitron 700, clamp(20px,4vw,36px), #00E5CC, 0.2em
  headline: {
    fontFamily: '"Orbitron", sans-serif',
    fontWeight: 700,
    fontSize: 'clamp(20px,4vw,36px)',
    letterSpacing: '0.2em',
    color: CYAN,
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

  // Blippy row (below panel)
  blippyRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 14,
    paddingLeft: 8,
  },
  blippyCircle: {
    flexShrink: 0,
    width: 100,
    height: 100,
    borderRadius: '50%',
    border: `2px solid ${CYAN}`,
    overflow: 'hidden',
    background: 'rgba(0,229,204,0.06)',
    boxShadow: '0 0 12px rgba(0,229,204,0.20)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blippyImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  // DESIGN.md: Blippy speech bubble
  bubble: {
    background: 'rgba(7,11,20,0.92)',
    border: `1px solid ${CYAN}`,
    borderRadius: '8px 8px 8px 0',
    padding: '10px 14px',
    fontFamily: '"Rajdhani", sans-serif',
    fontWeight: 600,
    fontSize: 14,
    color: '#E8F0F8',
    lineHeight: 1.4,
    maxWidth: 220,
  },
};
