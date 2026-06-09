import React, { useEffect, useRef, useState } from 'react';

/**
 * WelcomeScreen — Grand Opening title screen for Space Mission: Water.
 *
 * Renders before the game engine starts (gated by hasStarted in MissionWaterGame.jsx).
 * Contains:
 *   - Animated two-layer parallax star background (procedural canvas)
 *   - Background image (welcome_bg_grand_opening.jpg) once loaded
 *   - Parallax PNG layers (space_layer_1, _2, _3) with slow drift
 *   - Game title: SPACE MISSION / WATER
 *   - Blippy companion — floats OUTSIDE the instrument panel to the left
 *   - Mission selector cards (Water = active + BEGIN MISSION, 2 future = locked)
 *
 * Props:
 *   onStart — called when player clicks BEGIN MISSION on the active card
 *
 * Mission: conrad-foundation:interactive-game
 * Round: R12 — one-column layout, Blippy floats left of panel, redesigned mission cards
 */

// ─── prefers-reduced-motion ───────────────────────────────────────────────────
const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Colour palette ───────────────────────────────────────────────────────────
const SPACE_DARK  = '#070B14';
const CYAN        = '#00E5CC';
const TEXT_SOFT   = '#C8D8F0';

// ─── Star canvas background (two layers, slow procedural drift) ───────────────
function StarCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef({ raf: 0 });

  useEffect(() => {
    const cnv = canvasRef.current;
    const container = containerRef.current;
    if (!cnv || !container) return;

    const STAR_COUNTS = [120, 60];
    const SPEEDS = [0.012, 0.024];
    const SIZES = [1.5, 2.5];

    function starPositions(count, seed) {
      const rng = mulberry32(seed);
      return Array.from({ length: count }, () => ({
        x: rng(),
        y: rng() * 0.85,
        alpha: 0.4 + rng() * 0.6,
      }));
    }
    const layers = [
      starPositions(STAR_COUNTS[0], 0xA1B2C3),
      starPositions(STAR_COUNTS[1], 0xD4E5F6),
    ];

    let W = 0, H = 0;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      W = Math.max(320, Math.floor(rect.width));
      H = Math.max(240, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;
      cnv.width = Math.floor(W * dpr);
      cnv.height = Math.floor(H * dpr);
      cnv.style.width = `${W}px`;
      cnv.style.height = `${H}px`;
      const ctx = cnv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const ctx = cnv.getContext('2d');
    let offsets = [0, 0];

    const tick = () => {
      if (!W || !H) { animRef.current.raf = requestAnimationFrame(tick); return; }
      ctx.clearRect(0, 0, W, H);
      layers.forEach((stars, li) => {
        offsets[li] = (offsets[li] + SPEEDS[li]) % W;
        const sz = SIZES[li];
        stars.forEach((s) => {
          const x = ((s.x * W) + offsets[li]) % W;
          const y = s.y * H;
          ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
          ctx.fillRect(Math.round(x), Math.round(y), sz, sz);
        });
      });
      animRef.current.raf = requestAnimationFrame(tick);
    };

    animRef.current.raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animRef.current.raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}

// ─── Parallax PNG layers (space layer 1/2/3 from Cleo) ───────────────────────
function ParallaxLayer({ src, speed, style }) {
  const ref = useRef(null);
  const animRef = useRef({ raf: 0 });

  useEffect(() => {
    let x = 0;
    const tick = () => {
      x += speed;
      if (x > 0) x = -window.innerWidth;
      if (ref.current) {
        ref.current.style.transform = `translateX(${x % window.innerWidth}px)`;
      }
      animRef.current.raf = requestAnimationFrame(tick);
    };
    animRef.current.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current.raf);
  }, [speed]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'repeat-x',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        willChange: 'transform',
        ...style,
      }}
    />
  );
}

// ─── Entry animations ─────────────────────────────────────────────────────────
function useEntryAnim() {
  const [overlayFaded, setOverlayFaded] = useState(REDUCED);
  const [starsReady,   setStarsReady]   = useState(REDUCED);
  const [panelReady,   setPanelReady]   = useState(REDUCED);
  const [blippyReady,  setBlippyReady]  = useState(REDUCED);
  const [bubbleReady,  setBubbleReady]  = useState(REDUCED);
  const [card0Ready,   setCard0Ready]   = useState(REDUCED);
  const [card1Ready,   setCard1Ready]   = useState(REDUCED);
  const [card2Ready,   setCard2Ready]   = useState(REDUCED);

  useEffect(() => {
    if (REDUCED) return;
    const t0 = setTimeout(() => setOverlayFaded(true), 0);
    const t1 = setTimeout(() => setStarsReady(true),   200);
    const t2 = setTimeout(() => setPanelReady(true),   400);
    const t3 = setTimeout(() => setBlippyReady(true),  500);
    const t4 = setTimeout(() => setCard0Ready(true),   600);
    const t5 = setTimeout(() => setCard1Ready(true),   750);
    const t6 = setTimeout(() => setBubbleReady(true),  800);
    const t7 = setTimeout(() => setCard2Ready(true),   900);
    return () => {
      clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); clearTimeout(t7);
    };
  }, []);

  return { overlayFaded, starsReady, panelReady, blippyReady, bubbleReady, card0Ready, card1Ready, card2Ready };
}

// ─── Mission card (R12 redesign: horizontal layout + left accent border) ─────
function MissionCard({ active, locked, title, icon, subtitle, missionNum, visible, onStart }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={active && !locked && visible ? 'wg-active-card' : ''}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 13,
        padding: '11px 14px',
        // Left accent border is the hero design element
        borderLeft: locked
          ? '2px solid rgba(200,216,240,0.15)'
          : `3px solid ${CYAN}`,
        borderTop: locked
          ? '1px solid rgba(200,216,240,0.08)'
          : '1px solid rgba(0,229,204,0.2)',
        borderRight: locked
          ? '1px solid rgba(200,216,240,0.08)'
          : '1px solid rgba(0,229,204,0.18)',
        borderBottom: locked
          ? '1px solid rgba(200,216,240,0.08)'
          : '1px solid rgba(0,229,204,0.18)',
        borderRadius: 4,
        background: locked ? 'rgba(7,11,20,0.6)' : 'rgba(0,18,36,0.92)',
        opacity: visible ? (locked ? 0.6 : 1) : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: 'opacity 350ms ease, transform 350ms ease',
        cursor: 'default',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
      }}
      onMouseEnter={() => active && !locked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Mission icon — square frame, no circle */}
      <div style={{
        width: 42,
        height: 42,
        flexShrink: 0,
        border: locked
          ? '1px solid rgba(200,216,240,0.1)'
          : '1px solid rgba(0,229,204,0.2)',
        background: locked
          ? 'rgba(200,216,240,0.04)'
          : 'rgba(0,229,204,0.08)',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        marginTop: 3,
      }}>
        {icon}
      </div>

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top row: mission number + status badge */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 5,
        }}>
          <div style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.2em',
            color: locked ? 'rgba(200,216,240,0.3)' : 'rgba(0,229,204,0.65)',
            textTransform: 'uppercase',
          }}>
            MISSION #{missionNum}
          </div>
          <div style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: locked ? 'rgba(200,216,240,0.3)' : CYAN,
          }}>
            {locked ? '◉ COMING SOON' : '● ACTIVE'}
          </div>
        </div>

        {/* Thin divider */}
        <div style={{
          height: 1,
          background: locked
            ? 'rgba(200,216,240,0.05)'
            : 'rgba(0,229,204,0.12)',
          marginBottom: 8,
        }} />

        {/* Mission title */}
        <div style={{
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(17px, 2.8vw, 22px)',
          color: locked ? 'rgba(200,216,240,0.3)' : '#FFFFFF',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.1,
          marginBottom: 6,
        }}>
          {title}
        </div>

        {/* Description — active card only; locked cards stay compact "coming soon" bars */}
        {!locked && (
          <div style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 13,
            lineHeight: 1.4,
            color: TEXT_SOFT,
          }}>
            {subtitle}
          </div>
        )}

        {/* BEGIN MISSION — right-aligned, transparent CTA per DESIGN.md */}
        {active && !locked && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              onClick={onStart}
              style={{
                background: hovered ? 'rgba(0,229,204,0.12)' : 'transparent',
                color: CYAN,
                fontFamily: 'Rajdhani, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                border: `2px solid ${CYAN}`,
                borderRadius: 4,
                padding: '10px 20px',
                cursor: 'pointer',
                transition: 'background 120ms ease, box-shadow 120ms ease',
                boxShadow: hovered
                  ? '0 0 18px rgba(0,229,204,0.5)'
                  : '0 0 8px rgba(0,229,204,0.2)',
              }}
            >
              BEGIN MISSION ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WelcomeScreen main ───────────────────────────────────────────────────────
export default function WelcomeScreen({ onStart }) {
  const {
    overlayFaded, starsReady, panelReady,
    blippyReady, bubbleReady,
    card0Ready, card1Ready, card2Ready,
  } = useEntryAnim();
  const [bgLoaded, setBgLoaded] = useState(false);

  return (
    <div
      className="wg-root"
      style={{
        position: 'fixed',
        inset: 0,
        background: SPACE_DARK,
        overflow: 'hidden',
        fontFamily: 'Rajdhani, sans-serif',
        color: '#FFFFFF',
        zIndex: 10,
      }}
    >
      {/* ─ Global keyframes + layout overrides ─────────────────────────── */}
      <style>{`
        @keyframes wg-card-pulse {
          0%   { box-shadow: 0 0 18px rgba(0,229,204,0.55), 0 0 40px rgba(0,229,204,0.22); }
          50%  { box-shadow: 0 0 28px rgba(0,229,204,0.85), 0 0 60px rgba(0,229,204,0.38); }
          100% { box-shadow: 0 0 18px rgba(0,229,204,0.55), 0 0 40px rgba(0,229,204,0.22); }
        }
        @keyframes wg-chevron-bob {
          0%   { transform: translateY(0); }
          50%  { transform: translateY(6px); }
          100% { transform: translateY(0); }
        }
        .wg-active-card {
          animation: wg-card-pulse 2s ease-in-out infinite;
        }

        /* Single centered main column — the panel is the only column */
        .wg-outer-wrapper {
          display: flex;
          justify-content: center;
          width: 100%;
          max-width: 660px;
          padding: 0 16px;
          box-sizing: border-box;
        }
        .wg-panel-outer {
          width: 100%;
          max-width: 660px;
          min-width: 0;
          z-index: 1;
        }
        .wg-panel-inner {
          background: rgba(7,11,20,0.88);
          border: 1px solid rgba(0,229,204,0.25);
          border-radius: 4px;
          box-shadow: 0 0 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(0,229,204,0.08);
          padding: 26px 32px;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Blippy — absolute companion, lower-left of viewport (matches Role Select).
           Pulled OUT of the layout flow so the panel stays dead-centered. */
        .wg-blippy-anchor {
          position: absolute;
          left: 28px;
          bottom: 24px;
          z-index: 6;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          pointer-events: none;
        }
        .wg-blippy-img {
          height: 200px;
          width: auto;
          display: block;
          filter: drop-shadow(0 0 16px rgba(0,229,204,0.35));
        }

        /* Mid widths: shrink Blippy so it never crowds the centered panel */
        @media (max-width: 980px) {
          .wg-blippy-img { height: 150px; }
          .wg-speech-bubble { max-width: 140px !important; }
        }

        /* Mobile: tuck Blippy small in the corner, drop the bubble, tighten panel */
        @media (max-width: 600px) {
          .wg-blippy-anchor { left: 14px; bottom: 14px; }
          .wg-blippy-img { height: 104px; }
          .wg-speech-bubble { display: none; }
          .wg-outer-wrapper { max-width: 100%; padding: 0 12px; }
          .wg-panel-inner { padding: 22px 18px; gap: 16px; }
        }
      `}</style>

      {/* ─ Fade-from-black entrance ────────────────────────────────────── */}
      <div style={{
        position: 'fixed', inset: 0,
        background: '#000',
        opacity: overlayFaded ? 0 : 1,
        transition: 'opacity 600ms ease',
        pointerEvents: 'none',
        zIndex: 100,
      }} />

      {/* ─ Procedural star canvas ──────────────────────────────────────── */}
      <StarCanvas />

      {/* ─ Background photo ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: bgLoaded
            ? 'url(/mission-water/welcome/welcome_bg_grand_opening.jpg)'
            : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          opacity: bgLoaded ? 0.55 : 0,
          transition: 'opacity 600ms ease',
          pointerEvents: 'none',
        }}
      />
      <img
        src="/mission-water/welcome/welcome_bg_grand_opening.jpg"
        alt=""
        style={{ display: 'none' }}
        onLoad={() => setBgLoaded(true)}
      />

      {/* ─ Parallax PNG layers ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none',
        opacity: starsReady ? 0.3 : 0,
        transition: 'opacity 400ms ease',
      }}>
        <ParallaxLayer src="/mission-water/welcome/welcome_space_layer_1.png" speed={0.008} />
        <ParallaxLayer src="/mission-water/welcome/welcome_space_layer_2.png" speed={0.014} style={{ opacity: 0.7 }} />
        <ParallaxLayer src="/mission-water/welcome/welcome_space_layer_3.png" speed={0.02}  style={{ opacity: 0.5 }} />
      </div>

      {/* ─ Vignettes for depth ────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(to top, rgba(7,11,20,0.88) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '15%',
        background: 'linear-gradient(to bottom, rgba(7,11,20,0.6) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ─ Blippy companion — absolute, lower-left; does NOT offset the centered panel ─ */}
      <div
        className="wg-blippy-anchor"
        style={{
          opacity: blippyReady ? 1 : 0,
          transform: blippyReady ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 350ms ease-out, transform 350ms ease-out',
        }}
      >
        {/* Speech bubble — sits above Blippy */}
        <div
          className="wg-speech-bubble"
          style={{
            background: 'rgba(10,22,40,0.90)',
            border: '1px solid rgba(0,229,204,0.35)',
            borderRadius: '8px 8px 8px 2px',
            padding: '9px 13px',
            maxWidth: 160,
            position: 'relative',
            opacity: bubbleReady ? 1 : 0,
            transform: bubbleReady ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 250ms ease, transform 250ms ease',
          }}
        >
          <div style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            color: TEXT_SOFT,
            lineHeight: 1.4,
            textAlign: 'center',
          }}>
            Ready for your mission, Cadet?
          </div>
          {/* Tail pointing down toward Blippy */}
          <div style={{
            position: 'absolute',
            bottom: -7,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '7px solid rgba(0,229,204,0.35)',
          }} />
        </div>

        {/* Blippy image — full character, NO circle clip */}
        <img
          className="wg-blippy-img"
          src="/mission-water/welcome/blippy_v2_welcome_pose.png"
          alt="Blippy, your mission companion"
          onError={(e) => {
            e.target.src = '/mission-water/welcome/blippy_welcome_pose.png';
          }}
        />
      </div>

      {/* ─ Scrollable content ─────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 2,
      }}>
        {/* Top flex spacer — centers content on desktop, collapses on scroll */}
        <div style={{ flex: '1 0 0' }} />

        {/* ── Centered single column: the instrument panel ────────────── */}
        <div className="wg-outer-wrapper">

          {/* ── Instrument panel: single column ─────────────────────────── */}
          <div
            className="wg-panel-outer"
            style={{
              opacity: panelReady ? 1 : 0,
              transform: panelReady ? 'translateY(0)' : 'translateY(30px)',
              transition: 'opacity 400ms ease, transform 400ms ease',
            }}
          >
            <div className="wg-panel-inner">

              {/* Title block: SPACE MISSION: WATER */}
              <div style={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}>
                <div style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  fontWeight: 600,
                  fontSize: 'clamp(11px, 1.8vw, 15px)',
                  letterSpacing: '0.4em',
                  color: CYAN,
                  textTransform: 'uppercase',
                  opacity: 0.85,
                }}>
                  Space Mission:
                </div>
                <div style={{
                  fontFamily: 'Orbitron, sans-serif',
                  fontWeight: 900,
                  fontSize: 'clamp(40px, 6vw, 60px)',
                  letterSpacing: '0.06em',
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  textShadow: '0 0 40px rgba(0,229,204,0.75), 0 0 90px rgba(0,229,204,0.35)',
                  lineHeight: 1,
                }}>
                  Water
                </div>
                <div style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  fontWeight: 400,
                  fontSize: 'clamp(10px, 1.4vw, 13px)',
                  letterSpacing: '0.25em',
                  color: 'rgba(232,240,248,0.45)',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}>
                  Conrad Foundation
                </div>
              </div>

              {/* SELECT YOUR MISSION headline */}
              <div style={{
                fontFamily: 'Orbitron, sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(12px, 1.9vw, 15px)',
                letterSpacing: '0.3em',
                color: CYAN,
                textTransform: 'uppercase',
              }}>
                SELECT YOUR MISSION
              </div>

              {/* Mission cards — stacked single column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <MissionCard
                  active
                  locked={false}
                  title="WATER"
                  subtitle="Earth is running out of fresh water. Investigate the crisis — then take the mission to the Moon."
                  icon="💧"
                  missionNum="01"
                  visible={card0Ready}
                  onStart={onStart}
                />
                <MissionCard
                  active={false}
                  locked
                  title="OXYGEN"
                  subtitle="Sustain life in deep space. Master the systems that keep a crew alive between worlds."
                  icon="⚗️"
                  missionNum="02"
                  visible={card1Ready}
                />
                <MissionCard
                  active={false}
                  locked
                  title="ENERGY"
                  subtitle="Power a lunar settlement from scratch. Design the systems that will light civilization's next chapter."
                  icon="⚡"
                  missionNum="03"
                  visible={card2Ready}
                />
              </div>

              {/* Footer attribution */}
              <div style={{
                opacity: card0Ready ? 0.75 : 0,
                transition: 'opacity 400ms ease 600ms',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid rgba(0,229,204,0.1)',
                paddingTop: 12,
              }}>
                <div style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 8,
                  letterSpacing: '0.18em',
                  color: 'rgba(200,216,240,0.4)',
                  textTransform: 'uppercase',
                }}>
                  Conrad Foundation × Ahead of Market
                </div>
                <div style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 8,
                  letterSpacing: '0.12em',
                  color: 'rgba(200,216,240,0.25)',
                  textTransform: 'uppercase',
                }}>
                  EDUCATIONAL MISSION PLATFORM
                </div>
              </div>

            </div>{/* /wg-panel-inner */}
          </div>{/* /wg-panel-outer */}

        </div>{/* /wg-outer-wrapper */}

        {/* Bottom flex spacer — mirrors top spacer for centering */}
        <div style={{ flex: '1 0 0' }} />
      </div>{/* /scrollable content */}
    </div>
  );
}

// ─── Tiny RNG (deterministic star seeding) ───────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
