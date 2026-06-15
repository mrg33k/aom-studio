// AomHomeCage.jsx — Cage match A: AOM homepage redesign (EXPERIENCE-LED method).
// Preview-only route /cage/aom. Signature interaction: "resolve from noise" — a field
// of market-noise glyphs that sharpen and turn orange around the cursor while the
// headline resolves from blur to crisp. The literal "impossible to ignore" idea.
// Framework borrowed: Shader (interaction IS the hero, full-bleed canvas), Superhuman
// (each section its own hero, single accent, wordmark footer), Pentagram (restraint).
// Original to AOM: the noise-to-focus metaphor tied to our positioning, orange-on-ink,
// retro-terminal glyphs (a nod to the logo without a literal CRT). Standard:
// corner/missions/brand/cage-match/aom-frontpage-DESIGN.md
import React, { useEffect, useRef, useState } from 'react';

const ORANGE = '#FF9500';
const BLACK = '#000000';
const CHARCOAL = '#0F1B2E';
const CHARCOAL_LIGHT = '#1A2A3A';
const OFFWHITE = '#F8F7F5';
const TEXT_LIGHT = '#E8EBEF';
const TEXT_MUTE = '#9CA3AF';
const INK = '#1A1A1A';

const DISPLAY = "'Syne', system-ui, sans-serif";
const BODY = "'Outfit', 'Space Grotesk', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const GLYPHS = ['@', '#', '$', '%', '&', '*', '/', '+', '=', ':', '<', '>'];

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}

// ---- The signature interaction: noise-to-focus glyph field --------------------
function NoiseField() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0, cells = [], dpr = Math.min(window.devicePixelRatio || 1, 2);
    const CELL = 46, R = 170;
    const reduced = prefersReducedMotion();

    function build() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cells = [];
      const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cells.push({
            x: c * CELL + CELL / 2,
            y: r * CELL + CELL / 2,
            ch: GLYPHS[(r * 7 + c * 3) % GLYPHS.length],
            ph: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    let t = 0;
    function draw() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.font = `600 16px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      t += 0.016;
      const mx = mouse.current.x, my = mouse.current.y;
      for (let i = 0; i < cells.length; i++) {
        const g = cells[i];
        const dx = g.x - mx, dy = g.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const near = mouse.current.active ? Math.max(0, 1 - dist / R) : 0;
        // ambient flicker keeps the field alive at low energy
        const amb = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(t * 1.3 + g.ph));
        const energy = Math.max(amb, near);
        if (near > 0.04) {
          // sharpen + warm toward orange near the cursor
          const r = Math.round(80 + 175 * near);
          const grn = Math.round(80 + 69 * near);
          const b = Math.round(90 - 90 * near);
          ctx.fillStyle = `rgba(${r},${grn},${Math.max(0, b)},${0.25 + 0.75 * near})`;
        } else {
          ctx.fillStyle = `rgba(150,160,175,${energy})`;
        }
        ctx.fillText(g.ch, g.x, g.y);
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    }
    function onLeave() { mouse.current.active = false; }
    function onResize() { build(); if (reduced) draw(); }

    build();
    draw();
    window.addEventListener('resize', onResize);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />;
}

// ---- Scroll-reveal wrapper -----------------------------------------------------
function Reveal({ children, delay = 0, style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    // Fallback: never let content stay invisible if the observer is slow or never
    // fires (off-screen capture, JS hiccup). Content always appears within 1.2s.
    const fallback = setTimeout(() => setShown(true), 1200);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.985)',
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      ...style,
    }}>{children}</div>
  );
}

const STEPS = [
  ['01', 'You define the work', 'Tell your assistant the goal in plain words.'],
  ['02', 'Agents research and plan', 'They scope it, gather the truth, and lay out the move.'],
  ['03', 'Execution runs', 'The work happens across research, tasks, comms, and files.'],
  ['04', 'Review and approve', 'You see it, judge it, and ship. One dashboard.'],
];

export default function AomHomeCage() {
  const [resolved, setResolved] = useState(false);
  useEffect(() => { const id = setTimeout(() => setResolved(true), 220); return () => clearTimeout(id); }, []);

  const btn = (bg, fg, border) => ({
    fontFamily: BODY, fontWeight: 600, fontSize: 15, letterSpacing: '0.01em',
    padding: '15px 26px', background: bg, color: fg, border: border || 'none',
    borderRadius: 2, cursor: 'pointer', textDecoration: 'none', display: 'inline-block',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  });

  return (
    <div style={{ fontFamily: BODY, background: BLACK, color: TEXT_LIGHT, overflowX: 'hidden' }}>
      {/* top bar */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px',
        mixBlendMode: 'difference' }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, letterSpacing: '0.34em', fontSize: 13, color: '#fff' }}>AOM</span>
        <a href="#start" style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff', textDecoration: 'none' }}>Start free →</a>
      </header>

      {/* 1. HERO — the signature interaction */}
      <section style={{ position: 'relative', height: '100vh', minHeight: 620, background: BLACK, overflow: 'hidden' }}>
        <NoiseField />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 60%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.82) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '0 7vw', pointerEvents: 'none' }}>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase',
            color: ORANGE, marginBottom: 22, opacity: resolved ? 1 : 0, transition: 'opacity 0.8s ease 0.2s' }}>
            Managed AI agents
          </div>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, color: '#fff', margin: 0,
            fontSize: 'clamp(40px, 7.4vw, 116px)', lineHeight: 0.95, letterSpacing: '-0.03em', maxWidth: 1100,
            filter: resolved ? 'blur(0px)' : 'blur(14px)', opacity: resolved ? 1 : 0,
            transform: resolved ? 'translateY(0)' : 'translateY(10px)',
            transition: 'filter 1.1s cubic-bezier(0.16,1,0.3,1), opacity 1.1s ease, transform 1.1s ease' }}>
            We make companies<br /><span style={{ color: ORANGE }}>impossible to ignore.</span>
          </h1>
          <p style={{ fontFamily: BODY, fontSize: 'clamp(16px, 1.5vw, 20px)', color: TEXT_MUTE, marginTop: 26, maxWidth: 540,
            opacity: resolved ? 1 : 0, transition: 'opacity 0.9s ease 0.5s' }}>
            Managed agents that run the research, the work, and the positioning. One system. One dashboard.
          </p>
          <div style={{ marginTop: 38, display: 'flex', gap: 14, flexWrap: 'wrap', pointerEvents: 'auto',
            opacity: resolved ? 1 : 0, transition: 'opacity 0.9s ease 0.7s' }}>
            <a href="#start" style={btn(ORANGE, '#0A0A0A')} onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(255,149,0,0.35)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>See the system</a>
            <a href="#how" style={btn('transparent', '#fff', '1px solid rgba(255,255,255,0.28)')}>How it works</a>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', fontFamily: MONO,
          fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>
          move your cursor · scroll
        </div>
      </section>

      {/* 2. PROMISE — light, breathing */}
      <section style={{ background: OFFWHITE, color: INK, padding: 'clamp(90px, 14vw, 190px) 7vw' }}>
        <Reveal style={{ maxWidth: 820 }}>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(34px, 4.6vw, 60px)', lineHeight: 1.02, letterSpacing: '-0.02em', margin: 0 }}>
            One place. Everything in it.
          </h2>
          <p style={{ fontFamily: BODY, fontSize: 'clamp(17px, 1.7vw, 23px)', color: '#5b6470', marginTop: 26, maxWidth: 640, lineHeight: 1.5 }}>
            Research, tasks, communication, files. All synced, all organized, all moving. One AI-powered system that works the way a great operator would, without you having to ask twice.
          </p>
        </Reveal>
      </section>

      {/* 3. PROOF — dark, one stat */}
      <section style={{ background: CHARCOAL, color: TEXT_LIGHT, padding: 'clamp(90px, 13vw, 170px) 7vw', textAlign: 'center' }}>
        <Reveal style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(72px, 13vw, 150px)', color: ORANGE, lineHeight: 0.9, letterSpacing: '-0.04em' }}>
            3×
          </div>
          <p style={{ fontFamily: BODY, fontSize: 'clamp(18px, 2vw, 26px)', color: TEXT_LIGHT, marginTop: 18 }}>
            the velocity for the companies running on AOM.
          </p>
          <p style={{ fontFamily: BODY, fontSize: 15, color: TEXT_MUTE, marginTop: 12 }}>
            Agents take the research and the busywork. Your team takes the wins.
          </p>
          <a href="#start" style={{ ...btn(ORANGE, '#0A0A0A'), marginTop: 36 }}>Get early access</a>
        </Reveal>
      </section>

      {/* 4. NARRATIVE — light, how it works */}
      <section id="how" style={{ background: OFFWHITE, color: INK, padding: 'clamp(90px, 13vw, 170px) 7vw' }}>
        <Reveal style={{ maxWidth: 980, margin: '0 auto' }}>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(30px, 4vw, 50px)', letterSpacing: '-0.02em', margin: 0 }}>
            Here is how it works.
          </h2>
          <p style={{ fontFamily: BODY, fontSize: 18, color: '#5b6470', marginTop: 12, marginBottom: 56 }}>Four steps. One system.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 30 }}>
            {STEPS.map(([n, title, desc], i) => (
              <Reveal key={n} delay={i * 0.08}>
                <div style={{ borderTop: `2px solid ${ORANGE}`, paddingTop: 18 }}>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: ORANGE, letterSpacing: '0.2em' }}>{n}</div>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 21, marginTop: 12, color: INK }}>{title}</div>
                  <div style={{ fontFamily: BODY, fontSize: 15, color: '#5b6470', marginTop: 8, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 5. FINAL CTA — dark */}
      <section id="start" style={{ background: CHARCOAL, color: TEXT_LIGHT, padding: 'clamp(90px, 13vw, 160px) 7vw', textAlign: 'center' }}>
        <Reveal style={{ maxWidth: 560, margin: '0 auto', background: CHARCOAL_LIGHT, border: '1px solid #2A3A4A', borderRadius: 4, padding: 'clamp(32px, 5vw, 56px)' }}>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(28px, 3.6vw, 44px)', letterSpacing: '-0.02em', margin: 0 }}>
            Ready to build the impossible?
          </h2>
          <p style={{ fontFamily: BODY, fontSize: 17, color: TEXT_MUTE, marginTop: 16 }}>
            Join the early group of companies shipping faster.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
            <a href="mailto:hello@aheadofmarket.com" style={btn(ORANGE, '#0A0A0A')}>Start free</a>
            <a href="mailto:hello@aheadofmarket.com" style={btn('transparent', '#fff', '1px solid #9CA3AF')}>Book a demo</a>
          </div>
        </Reveal>
      </section>

      {/* footer wordmark watermark (structural idea from Superhuman) */}
      <footer style={{ background: BLACK, padding: '60px 7vw 30px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: TEXT_MUTE, letterSpacing: '0.2em' }}>© AOM · Ahead of Market</span>
          <a href="#start" style={{ fontFamily: MONO, fontSize: 12, color: ORANGE, letterSpacing: '0.2em', textDecoration: 'none' }}>Start free →</a>
        </div>
        <div aria-hidden style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(60px, 20vw, 280px)', lineHeight: 0.8,
          color: 'rgba(255,255,255,0.045)', letterSpacing: '-0.04em', marginTop: 20, whiteSpace: 'nowrap' }}>
          AHEAD OF MARKET
        </div>
      </footer>
    </div>
  );
}
