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
 *   - Blippy companion character (welcome pose PNG)
 *   - Mission selector cards (Water = active + BEGIN MISSION, 2 future = locked)
 *
 * Props:
 *   onStart — called when player clicks BEGIN MISSION on the active card
 *
 * Mission: conrad-foundation:interactive-game
 * Round: R7b-welcome-engine
 */

// ─── Star canvas background (two layers, slow procedural drift) ───────────────

function StarCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef({ raf: 0, offsetX: 0 });

  useEffect(() => {
    const cnv = canvasRef.current;
    const container = containerRef.current;
    if (!cnv || !container) return;

    // Stars: two layers. Layer A: slow, small. Layer B: faster, slightly larger.
    const STAR_COUNTS = [120, 60];
    const SPEEDS = [0.012, 0.024]; // px/frame
    const SIZES = [1.5, 2.5];

    // Deterministic star positions keyed per layer.
    function starPositions(count, seed) {
      const rng = mulberry32(seed);
      return Array.from({ length: count }, () => ({
        x: rng(),  // 0–1 fraction of W
        y: rng() * 0.85, // 0–0.85 fraction of H (top sky area)
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

      // Paint each star layer, offset by its drift.
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
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}

// ─── Parallax PNG layers (space layer 1/2/3 from Cleo) ───────────────────────

function ParallaxLayer({ src, speed, style }) {
  const ref = useRef(null);
  const animRef = useRef({ raf: 0, x: 0 });

  useEffect(() => {
    let x = 0;
    const tick = () => {
      x += speed;
      if (x > 0) x = -window.innerWidth;
      if (ref.current) {
        ref.current.style.transform = `translateX(${x % (window.innerWidth)}px)`;
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
  const [phase, setPhase] = useState(0); // 0=hidden, 1=title, 2=blippy, 3=cards

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 80);   // title fades in
    const t2 = setTimeout(() => setPhase(2), 500);  // blippy slides up
    const t3 = setTimeout(() => setPhase(3), 820);  // cards appear
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return phase;
}

// ─── Mission cards ────────────────────────────────────────────────────────────

function MissionCard({ active, locked, title, subtitle, icon, index, visible, onStart }) {
  const [hovered, setHovered] = useState(false);

  const cardStyle = {
    background: locked ? 'rgba(7,11,20,0.65)' : 'rgba(10,22,40,0.82)',
    border: locked
      ? '1px solid rgba(200,216,240,0.12)'
      : active
        ? `2px solid ${hovered ? CYAN_BRIGHT : CYAN}`
        : '1px solid rgba(0,229,204,0.22)',
    borderRadius: 6,
    padding: '20px 18px',
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    opacity: visible ? (locked ? 0.45 : 1) : 0,
    transform: visible ? 'translateY(0)' : 'translateY(32px)',
    transition: `opacity 350ms ease ${index * 120}ms, transform 350ms ease ${index * 120}ms, border-color 120ms ease, box-shadow 120ms ease`,
    cursor: active && !locked ? (hovered ? 'pointer' : 'default') : 'default',
    boxShadow: active && hovered ? `0 0 18px rgba(0,229,204,0.22)` : 'none',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => active && !locked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon area */}
      <div style={{
        width: 52,
        height: 52,
        borderRadius: 6,
        background: locked ? 'rgba(200,216,240,0.06)' : 'rgba(0,229,204,0.1)',
        border: locked ? '1px solid rgba(200,216,240,0.1)' : `1px solid rgba(0,229,204,0.3)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Mission name */}
      <div>
        <div style={{
          fontFamily: '"Orbitron", monospace',
          fontSize: 9,
          letterSpacing: '0.28em',
          color: locked ? 'rgba(200,216,240,0.3)' : AMBER,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          {locked ? 'COMING SOON' : 'MISSION'}
        </div>
        <div style={{
          fontFamily: '"Orbitron", monospace',
          fontSize: 15,
          fontWeight: 700,
          color: locked ? 'rgba(200,216,240,0.35)' : '#FFFFFF',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.2,
        }}>
          {title}
        </div>
      </div>

      {/* Subtitle */}
      <div style={{
        fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
        fontSize: 13,
        lineHeight: 1.45,
        color: locked ? 'rgba(200,216,240,0.25)' : TEXT_SOFT,
        flexGrow: 1,
      }}>
        {subtitle}
      </div>

      {/* CTA */}
      {active && !locked && (
        <button
          onClick={onStart}
          style={{
            background: hovered ? CYAN_BRIGHT : CYAN,
            color: SPACE_DARK,
            fontFamily: '"Orbitron", monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            border: 'none',
            borderRadius: 4,
            padding: '10px 14px',
            cursor: 'pointer',
            transition: 'background 120ms ease, transform 80ms ease',
            transform: hovered ? 'scale(1.02)' : 'scale(1)',
            marginTop: 4,
          }}
        >
          BEGIN MISSION ▶
        </button>
      )}

      {locked && (
        <div style={{
          fontFamily: '"Orbitron", monospace',
          fontSize: 9,
          letterSpacing: '0.2em',
          color: 'rgba(200,216,240,0.2)',
          textTransform: 'uppercase',
          marginTop: 4,
          paddingTop: 8,
          borderTop: '1px solid rgba(200,216,240,0.08)',
        }}>
          ⊘ CLASSIFIED
        </div>
      )}
    </div>
  );
}

// ─── WelcomeScreen main ───────────────────────────────────────────────────────

export default function WelcomeScreen({ onStart }) {
  const animPhase = useEntryAnim();
  const [bgLoaded, setBgLoaded] = useState(false);

  return (
    <div style={styles.root} className="wg-root">
      {/* Responsive overrides — handles mobile layout for Bug 1 (background/scroll) */}
      <style>{`
        @media (max-width: 600px) {
          .wg-root { overflow-y: auto !important; align-items: flex-start !important; }
          .wg-content { padding: 20px 14px !important; gap: 20px !important; }
          .wg-bg-img { background-position: center center !important; }
          .wg-main-row {
            flex-direction: column !important;
            align-items: center !important;
            gap: 16px !important;
            max-width: 100% !important;
          }
          .wg-blippy { flex-direction: row !important; align-items: center !important; gap: 12px !important; padding-bottom: 0 !important; }
          .wg-blippy-circle { width: 64px !important; height: 64px !important; }
          .wg-card { width: 100% !important; box-sizing: border-box !important; }
        }
      `}</style>
      {/* Procedural star canvas — always visible as immediate background */}
      <StarCanvas />

      {/* Background image (grand opening) — fades in once loaded */}
      <div
        className="wg-bg-img"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: bgLoaded ? `url(/mission-water/welcome/welcome_bg_grand_opening.jpg)` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          opacity: bgLoaded ? 0.55 : 0,
          transition: 'opacity 600ms ease',
          pointerEvents: 'none',
        }}
      />
      {/* Preload trigger */}
      <img
        src="/mission-water/welcome/welcome_bg_grand_opening.jpg"
        alt=""
        style={{ display: 'none' }}
        onLoad={() => setBgLoaded(true)}
      />

      {/* Parallax PNG layers from Cleo — very slow drift */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.3 }}>
        <ParallaxLayer src="/mission-water/welcome/welcome_space_layer_1.png" speed={0.008} />
        <ParallaxLayer src="/mission-water/welcome/welcome_space_layer_2.png" speed={0.014} style={{ opacity: 0.7 }} />
        <ParallaxLayer src="/mission-water/welcome/welcome_space_layer_3.png" speed={0.02} style={{ opacity: 0.5 }} />
      </div>

      {/* Bottom vignette for depth */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        background: 'linear-gradient(to top, rgba(7,11,20,0.88) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Top vignette */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '15%',
        background: 'linear-gradient(to bottom, rgba(7,11,20,0.6) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Main content area ─────────────────────────────────────────── */}
      <div style={styles.content} className="wg-content">

        {/* Title block */}
        <div style={{
          textAlign: 'center',
          opacity: animPhase >= 1 ? 1 : 0,
          transform: animPhase >= 1 ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity 400ms ease, transform 400ms ease',
        }}>
          {/* Kicker */}
          <div style={{
            fontFamily: '"Orbitron", monospace',
            fontSize: 11,
            letterSpacing: '0.42em',
            color: CYAN,
            textTransform: 'uppercase',
            marginBottom: 10,
            textShadow: `0 0 12px rgba(0,229,204,0.5)`,
          }}>
            CONRAD FOUNDATION
          </div>

          {/* SPACE MISSION */}
          <div style={{
            fontFamily: '"Orbitron", monospace',
            fontSize: 'clamp(24px, 3.5vw, 42px)',
            fontWeight: 700,
            letterSpacing: '0.28em',
            color: TEXT_SOFT,
            textTransform: 'uppercase',
            lineHeight: 1,
            marginBottom: 4,
          }}>
            SPACE MISSION
          </div>

          {/* WATER — hero title */}
          <div style={{
            fontFamily: '"Orbitron", monospace',
            fontSize: 'clamp(52px, 9vw, 112px)',
            fontWeight: 900,
            letterSpacing: '0.06em',
            color: CYAN_BRIGHT,
            textTransform: 'uppercase',
            lineHeight: 0.9,
            textShadow: `
              0 0 40px rgba(0,229,204,0.5),
              0 0 80px rgba(0,229,204,0.25),
              0 2px 0 rgba(0,0,0,0.6)
            `,
          }}>
            WATER
          </div>

          {/* Accent line */}
          <div style={{
            width: 80,
            height: 2,
            background: `linear-gradient(to right, transparent, ${CYAN}, transparent)`,
            margin: '16px auto 0',
          }} />
        </div>

        {/* Blippy + mission selector row */}
        <div className="wg-main-row" style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 32,
          width: '100%',
          maxWidth: 860,
        }}>

          {/* Blippy companion */}
          <div className="wg-blippy" style={{
            flexShrink: 0,
            opacity: animPhase >= 2 ? 1 : 0,
            transform: animPhase >= 2 ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 300ms ease, transform 300ms ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            position: 'relative',
            paddingBottom: 4,
          }}>
            {/* Speech bubble */}
            <div style={{
              background: 'rgba(10,22,40,0.88)',
              border: `1px solid rgba(0,229,204,0.3)`,
              borderRadius: 8,
              padding: '8px 14px',
              maxWidth: 160,
              position: 'relative',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}>
              <div style={{
                fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                color: TEXT_SOFT,
                lineHeight: 1.4,
                textAlign: 'center',
              }}>
                Ready for your mission, Cadet?
              </div>
              {/* Bubble tail */}
              <div style={{
                position: 'absolute',
                bottom: -7,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '7px solid rgba(0,229,204,0.3)',
              }} />
            </div>

            {/* Blippy image */}
            <div className="wg-blippy-circle" style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: `2px solid rgba(0,229,204,0.25)`,
              overflow: 'hidden',
              background: 'rgba(10,22,40,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src="/mission-water/welcome/blippy_welcome_pose.png"
                alt="Blippy, your mission companion"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
                onError={(e) => {
                  // Fallback: silver placeholder circle if PNG fails to load
                  e.target.style.display = 'none';
                  e.target.parentElement.style.background = '#C0C0C0';
                  e.target.parentElement.innerHTML = '<div style="color:#333;font-size:32px;font-weight:700;line-height:1">B</div>';
                }}
              />
            </div>
          </div>

          {/* Mission selector */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            opacity: animPhase >= 2 ? 1 : 0,
            transition: 'opacity 300ms ease 100ms',
          }}>
            <div style={{
              fontFamily: '"Orbitron", monospace',
              fontSize: 9,
              letterSpacing: '0.35em',
              color: 'rgba(200,216,240,0.5)',
              textTransform: 'uppercase',
            }}>
              SELECT YOUR MISSION
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <MissionCard
                active
                locked={false}
                title="WATER"
                subtitle="Earth is running out of fresh water. Investigate the crisis — then take the mission to the Moon."
                icon="💧"
                index={0}
                visible={animPhase >= 3}
                onStart={onStart}
              />
              <MissionCard
                active={false}
                locked
                title="OXYGEN"
                subtitle="Sustain life in deep space. Master the systems that keep a crew alive between worlds."
                icon="⚗️"
                index={1}
                visible={animPhase >= 3}
              />
              <MissionCard
                active={false}
                locked
                title="ENERGY"
                subtitle="Power a lunar settlement from scratch. Design the systems that will light civilization's next chapter."
                icon="⚡"
                index={2}
                visible={animPhase >= 3}
              />
            </div>
          </div>
        </div>

        {/* Footer badge */}
        <div style={{
          opacity: animPhase >= 3 ? 0.5 : 0,
          transition: 'opacity 400ms ease 600ms',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderTop: '1px solid rgba(0,229,204,0.1)',
          paddingTop: 14,
          width: '100%',
          maxWidth: 860,
        }}>
          <div style={{
            fontFamily: '"Orbitron", monospace',
            fontSize: 8,
            letterSpacing: '0.18em',
            color: 'rgba(200,216,240,0.4)',
            textTransform: 'uppercase',
          }}>
            Conrad Foundation × Ahead of Market
          </div>
          <div style={{
            fontFamily: '"Orbitron", monospace',
            fontSize: 8,
            letterSpacing: '0.12em',
            color: 'rgba(200,216,240,0.25)',
            textTransform: 'uppercase',
            marginLeft: 'auto',
          }}>
            EDUCATIONAL MISSION PLATFORM
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Colour palette (matches game engine) ────────────────────────────────────
const SPACE_DARK   = '#070B14';
const CYAN         = '#00E5CC';
const CYAN_BRIGHT  = '#33F5DE';
const AMBER        = '#FFB703';
const TEXT_SOFT    = '#C8D8F0';

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    background: SPACE_DARK,
    overflow: 'hidden',
    fontFamily: '"Rajdhani", "Chakra Petch", system-ui, sans-serif',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 36,
    padding: '32px 24px',
    width: '100%',
    maxWidth: 960,
  },
};

// ─── Tiny RNG (matches Canvas.jsx) ───────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
