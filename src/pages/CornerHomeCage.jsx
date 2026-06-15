// CornerHomeCage.jsx — Cage match B: Corner homepage redesign (STORY-LED method).
// Preview-only route /cage/corner. The page tells one story down the scroll:
// scattered -> one place -> how it works -> proof -> start. Signature move (story, not
// decoration): the hero's scattered communication chips drift in noise, then the
// Solution section gathers them into one clean surface — fragmentation resolving into
// Corner. Framework borrowed: Superhuman (each section its own hero, single accent),
// Linear (calm dark product feel). Original to Corner: the scattered->one-place arc and
// the purple/amber SURGE identity. Standard: corner/missions/brand/cage-match/corner-homepage-DESIGN.md
import React, { useEffect, useRef, useState } from 'react';

const INK = '#08141C';        // hero deep cool-ink
const CHARCOAL = '#0F1B2E';   // how-it-works + final cta
const CHARCOAL_CARD = '#1A2A3A';
const CREAM = '#F8F7F5';      // solution + proof
const PURPLE = '#7C3AED';     // SURGE primary accent
const AMBER = '#F59E0B';      // secondary accent
const LIGHT = '#E8EBEF';
const MUTE = '#9CA3AF';
const DARKTEXT = '#1A1A1A';

const DISPLAY = "'Hanken Grotesk', system-ui, sans-serif";
const BODY = "'Outfit', 'Space Grotesk', system-ui, sans-serif";

// kept in the right half of the hero so they never collide with the left text column
const CHIPS = [
  { label: 'Slack', x: '58%', y: '18%', r: -8, d: 0 },
  { label: 'Gmail', x: '82%', y: '26%', r: 6, d: 0.6 },
  { label: 'Notion', x: '64%', y: '72%', r: 4, d: 1.1 },
  { label: 'Figma', x: '88%', y: '54%', r: -6, d: 0.3 },
  { label: 'Linear', x: '72%', y: '40%', r: 3, d: 0.9 },
  { label: 'Calendar', x: '60%', y: '86%', r: -4, d: 1.4 },
  { label: 'Drive', x: '90%', y: '13%', r: 7, d: 0.5 },
];

function Reveal({ children, delay = 0, style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    const fb = setTimeout(() => setShown(true), 1200); // never stay invisible
    return () => { io.disconnect(); clearTimeout(fb); };
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
  ['01', 'You say what you need', 'Plain words. No setup, no forms, no tool-hopping.'],
  ['02', 'Your assistant scopes it', 'It gathers the truth, plans the work, and shows you the move.'],
  ['03', 'The work runs in one place', 'Research, tasks, messages, files. All in the room, all synced.'],
  ['04', 'You review and ship', 'See it, judge it, approve. One person, the output of ten.'],
];

export default function CornerHomeCage() {
  const btn = (bg, fg, border) => ({
    fontFamily: BODY, fontWeight: 600, fontSize: 15, padding: '15px 26px', background: bg,
    color: fg, border: border || 'none', borderRadius: 8, cursor: 'pointer', textDecoration: 'none',
    display: 'inline-block', transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  });

  return (
    <div style={{ fontFamily: BODY, background: INK, color: LIGHT, overflowX: 'hidden' }}>
      <style>{`@keyframes cornerDrift{0%{transform:translateY(0) rotate(var(--r))}50%{transform:translateY(-14px) rotate(var(--r))}100%{transform:translateY(0) rotate(var(--r))}}`}</style>

      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px' }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, letterSpacing: '-0.02em', fontSize: 20, color: LIGHT }}>corner</span>
        <a href="#start" style={{ ...btn(PURPLE, '#fff'), padding: '10px 18px', fontSize: 13 }}>Start free</a>
      </header>

      {/* 1. HERO — the problem hook: scattered */}
      <section style={{ position: 'relative', minHeight: '100vh', background: INK, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 50% at 18% 92%, rgba(124,58,237,0.18), transparent 70%)', pointerEvents: 'none' }} />
        {/* scattered communication chips drifting in the noise */}
        {CHIPS.map((c) => (
          <div key={c.label} style={{
            position: 'absolute', left: c.x, top: c.y, '--r': `${c.r}deg`,
            transform: `rotate(${c.r}deg)`, animation: `cornerDrift ${6 + c.d * 2}s ease-in-out ${c.d}s infinite`,
            fontFamily: BODY, fontSize: 14, fontWeight: 500, color: '#7d8794',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '10px 16px', backdropFilter: 'blur(2px)', pointerEvents: 'none',
          }}>{c.label}</div>
        ))}
        <div style={{ position: 'relative', padding: '0 7vw', maxWidth: 1100, zIndex: 2 }}>
          <div style={{ fontFamily: BODY, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: AMBER, marginBottom: 20 }}>The problem</div>
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 800, color: LIGHT, margin: 0,
            fontSize: 'clamp(40px, 7vw, 104px)', lineHeight: 0.98, letterSpacing: '-0.03em' }}>
            Your team is<br /><span style={{ color: '#5b6470' }}>scattered.</span>
          </h1>
          <p style={{ fontFamily: BODY, fontSize: 'clamp(17px, 1.6vw, 21px)', color: MUTE, marginTop: 26, maxWidth: 560, lineHeight: 1.5 }}>
            Email. Slack. Documents. Spreadsheets. Calendar. Five tools, and one person trying to hold it all together.
          </p>
          <div style={{ marginTop: 34, fontFamily: BODY, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>scroll ↓</div>
        </div>
      </section>

      {/* 2. THE SOLUTION — one place (chips gathered into one surface) */}
      <section style={{ background: CREAM, color: DARKTEXT, padding: 'clamp(90px, 13vw, 170px) 7vw' }}>
        <Reveal style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ fontFamily: BODY, fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: PURPLE, marginBottom: 18 }}>The solution</div>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(34px, 4.8vw, 62px)', lineHeight: 1.0, letterSpacing: '-0.02em', margin: 0, maxWidth: 760 }}>
            One place. Everything in it.
          </h2>
          <p style={{ fontFamily: BODY, fontSize: 'clamp(17px, 1.6vw, 21px)', color: '#5b6470', marginTop: 22, maxWidth: 620, lineHeight: 1.5 }}>
            Research, tasks, communication, files. All organized on one surface. One person, the output of ten.
          </p>
          {/* the "one place" surface — the scattered tools, now gathered */}
          <div style={{ marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16,
            background: '#fff', border: '1px solid #ece9e4', borderRadius: 16, padding: 18, boxShadow: '0 30px 60px -30px rgba(8,20,28,0.25)' }}>
            <div style={{ borderRight: '1px solid #f0ede8', paddingRight: 14 }}>
              <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9aa0a8', marginBottom: 12 }}>Tasks</div>
              {['Draft Q3 positioning', 'Review agent research', 'Ship landing page'].map((t, i) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', fontSize: 14, color: DARKTEXT }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${i === 0 ? PURPLE : '#cfd3d8'}`, background: i === 0 ? PURPLE : 'transparent', display: 'inline-block' }} />
                  {t}
                </div>
              ))}
            </div>
            <div style={{ borderRight: '1px solid #f0ede8', paddingRight: 14 }}>
              <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9aa0a8', marginBottom: 12 }}>Room</div>
              {[['You', 'Pull the latest competitor pricing'], ['Assistant', 'On it. Drafting the summary now.']].map(([who, msg], i) => (
                <div key={who} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#9aa0a8', marginBottom: 3 }}>{who}</div>
                  <div style={{ fontSize: 14, color: DARKTEXT, background: i === 1 ? 'rgba(245,158,11,0.14)' : '#f6f4f0', borderRadius: 8, padding: '8px 10px', display: 'inline-block' }}>{msg}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: BODY, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9aa0a8', marginBottom: 12 }}>Activity</div>
              {['Research compiled', 'Draft ready for review', 'Files synced'].map((a) => (
                <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', fontSize: 13, color: '#5b6470' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: PURPLE, display: 'inline-block' }} />{a}
                </div>
              ))}
            </div>
          </div>
          <a href="#how" style={{ ...btn(PURPLE, '#fff'), marginTop: 32 }}>Explore the system</a>
        </Reveal>
      </section>

      {/* 3. HOW IT WORKS — the mechanism */}
      <section id="how" style={{ background: CHARCOAL, color: LIGHT, padding: 'clamp(90px, 13vw, 170px) 7vw' }}>
        <Reveal style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(32px, 4.4vw, 56px)', letterSpacing: '-0.02em', margin: 0 }}>How it works.</h2>
          <p style={{ fontFamily: BODY, fontSize: 18, color: MUTE, marginTop: 12, marginBottom: 48 }}>Four steps. One system.</p>
          <div style={{ position: 'relative' }}>
            {STEPS.map(([n, title, desc], i) => (
              <Reveal key={n} delay={i * 0.08}>
                <div style={{ display: 'flex', gap: 22, paddingBottom: i < STEPS.length - 1 ? 34 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${PURPLE}`, color: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 15, flexShrink: 0, background: 'rgba(124,58,237,0.08)' }}>{n}</div>
                    {i < STEPS.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 28, background: 'rgba(124,58,237,0.35)', marginTop: 6 }} />}
                  </div>
                  <div style={{ paddingTop: 6 }}>
                    <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 21, color: LIGHT }}>{title}</div>
                    <div style={{ fontFamily: BODY, fontSize: 15, color: MUTE, marginTop: 6, lineHeight: 1.5, maxWidth: 460 }}>{desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 4. PROOF — real results */}
      <section style={{ background: CREAM, color: DARKTEXT, padding: 'clamp(90px, 13vw, 170px) 7vw', textAlign: 'center' }}>
        <Reveal style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(30px, 4vw, 50px)', letterSpacing: '-0.02em', margin: 0 }}>Real people. Real results.</h2>
          <p style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(26px, 3.4vw, 40px)', color: PURPLE, marginTop: 22, lineHeight: 1.2 }}>
            "I shipped three weeks faster. One assistant, one place."
          </p>
          <p style={{ fontFamily: BODY, fontSize: 14, color: '#6b7280', marginTop: 14 }}>Alex, founder · early Corner user</p>
        </Reveal>
      </section>

      {/* 5. FINAL CTA — ready to start */}
      <section id="start" style={{ position: 'relative', background: CHARCOAL, color: LIGHT, padding: 'clamp(90px, 13vw, 160px) 7vw', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(50% 50% at 82% 8%, rgba(124,58,237,0.18), transparent 70%)', pointerEvents: 'none' }} />
        <Reveal style={{ position: 'relative', maxWidth: 560, margin: '0 auto', background: CHARCOAL_CARD, border: '1px solid #2A3A4A', borderRadius: 16, padding: 'clamp(32px, 5vw, 56px)' }}>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(28px, 3.6vw, 44px)', letterSpacing: '-0.02em', margin: 0 }}>Ready to upgrade?</h2>
          <p style={{ fontFamily: BODY, fontSize: 17, color: MUTE, marginTop: 16 }}>Join the founders already shipping faster.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
            <a href="mailto:hello@aheadofmarket.com" style={btn(PURPLE, '#fff')} onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 22px rgba(124,58,237,0.45)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}>Start free trial</a>
            <a href="mailto:hello@aheadofmarket.com" style={btn('transparent', '#fff', `1px solid ${PURPLE}`)}>Book a demo</a>
          </div>
        </Reveal>
      </section>

      <footer style={{ background: INK, padding: '48px 7vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, color: LIGHT }}>corner</span>
        <span style={{ fontFamily: BODY, fontSize: 13, color: MUTE }}>© AOM · your business just got an upgrade</span>
      </footer>
    </div>
  );
}
