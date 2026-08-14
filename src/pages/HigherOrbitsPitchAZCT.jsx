import React, { useEffect } from 'react';

/**
 * HigherOrbitsPitchAZCT — full-bleed hero-moment restructure (R2, 2026-05-21).
 *
 * Each major section is its own ~100vh hero with a Gemini image as a CSS
 * background-image. Content overlays the image with a dark gradient for
 * legibility. Overlay alignment varies section-to-section to pace the
 * story. The three Act 2 data tables (Deliverables / Timeline / Budget)
 * sit on a solid deep-navy backdrop — no image behind data.
 *
 * Route: /higherorbits
 * Robots: noindex,nofollow
 */

function useSEO() {
  useEffect(() => {
 document.title = 'Higher Orbits, A Campaign for the 100th Go For Launch!';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('robots', 'noindex, nofollow');
 setMeta('description', 'A documentary campaign proposal for Higher Orbits, the 100th Go For Launch! and the decade that made it possible.');
    setMeta('og:title', 'Higher Orbits Campaign Proposal', true);
    setMeta('og:description', 'Ten years. One hundred events. Three thousand students. Twenty-four experiments in orbit.', true);
  }, []);
}

/* ─── Shared design tokens ─────────────────────────────────────────── */
const NAVY = '#0F1419';
const NAVY_ROW_A = '#161D24';
const NAVY_ROW_B = '#1C242D';
const AMBER = '#E8A653';
const CREAM = '#F4EDE2';
const CREAM_DIM = 'rgba(244,237,226,0.72)';

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
  .ho-display { font-family: 'Instrument Serif', Georgia, serif; }
  .ho-body    { font-family: 'Hanken Grotesk', system-ui, sans-serif; }
  .ho-mono    { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; }

  /* ── Hero section base ──────────────────────────────────────────── */
  .ho-hero {
    position: relative;
    min-height: 100vh;
    display: flex;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    overflow: hidden;
  }
  .ho-hero-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .ho-hero-content {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    padding: 80px 56px;
    display: flex;
    flex-direction: column;
    color: #fff;
  }
  .ho-hero h2 { color: #fff; }

  /* Section eyebrow (small-caps mono label above titles) */
  .ho-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.65);
    font-weight: 700;
    margin-bottom: 18px;
  }

  /* Scrim panel — contained dark surface behind paragraph text on full-bleed sections */
  .ho-hero-scrim {
    box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  }

  /* ── Mobile ─────────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    .ho-hero {
      min-height: 90vh;
    }
    .ho-hero-content {
      padding: 56px 24px;
    }
    .ho-hero-scrim {
      padding: 22px 20px !important;
      max-width: 100% !important;
    }
    .ho-hero h1.ho-cover-title {
      font-size: 14vw !important;
    }
    .ho-hero h2.ho-section-title {
      font-size: 34px !important;
      line-height: 1.05 !important;
    }
    .ho-hero p.ho-lead {
      font-size: 17px !important;
    }
    .ho-hero p.ho-body-p {
      font-size: 15.5px !important;
    }

    /* Tables collapse to stacked cards on mobile (dark variant) */
    .ho-table { font-size: 14px; }
    .ho-table thead { display: none; }
    .ho-table tbody { display: block; }
    .ho-table tr {
      display: block;
      background: ${NAVY_ROW_A} !important;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .ho-table tr.ho-row-highlight {
      background: ${AMBER} !important;
      border-color: ${AMBER};
    }
    .ho-table tr.ho-row-highlight td {
      color: #1a0e00 !important;
    }
    .ho-table tr.ho-row-highlight td::before {
      color: rgba(26,14,0,0.55) !important;
    }
    .ho-table td {
      display: block;
      width: 100% !important;
      text-align: left !important;
      padding: 12px 16px !important;
      border-right: none !important;
      border-bottom: 1px solid rgba(255,255,255,0.06) !important;
      white-space: normal !important;
      box-sizing: border-box;
      color: ${CREAM} !important;
    }
    .ho-table td:last-child { border-bottom: none !important; }
    .ho-table td::before {
      content: attr(data-label);
      display: block;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: rgba(244,237,226,0.5);
      margin-bottom: 4px;
    }
    .ho-table td.ho-empty-cell { display: none; }

    /* Structure table (Acts / Content rows) — stacked */
    .ho-struct-table tr { display: block; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .ho-struct-table td { display: block; width: 100% !important; padding: 4px 0 !important; border: none !important; }
    .ho-struct-table td.ho-struct-label { font-size: 13px !important; }
    .ho-struct-table td.ho-struct-text { font-size: 15px !important; }

    /* Why Does This Matter — single column */
    .ho-why-grid { display: block !important; }
    .ho-why-grid > div { margin-bottom: 24px; }
    .ho-why-grid > div:last-child { margin-bottom: 0; }
    .ho-why-grid h2 { font-size: 32px !important; }
    .ho-why-grid p { font-size: 17px !important; }

    /* Dark section padding tightens on mobile */
    .ho-dark-section { padding: 64px 0 !important; }
    .ho-dark-section .ho-inner { padding: 0 24px !important; }

    /* Visual Inspiration — 2x2 on mobile */
    .ho-inspo-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
    .ho-inspo-header { flex-direction: column !important; }
    .ho-inspo-header > div:last-child { max-width: none !important; }
    .ho-inspo-header p { text-align: left !important; }

    /* CTA steps wrap */
    .ho-cta-steps { flex-direction: column !important; gap: 14px !important; }
    .ho-cta-steps span.ho-cta-arrow { display: none !important; }
  }
`;

/* ─── Hero section wrapper ─────────────────────────────────────────── */
function HeroSection({
  id,
  bgImage,
  bgPosition = 'center',
  bgPositionMobile,
  align = 'bottom-left', // bottom-left | bottom-right | bottom-center | top-left | top-center | center
  gradient,
  minHeight = '100vh',
  scrim = true, // wrap content in a contained dark panel for paragraph readability
  children
}) {
  const defaultGradient = {
    'bottom-left': 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.75) 100%)',
    'bottom-right': 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.75) 100%)',
    'bottom-center': 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.78) 100%)',
    'top-left': 'linear-gradient(0deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.75) 100%)',
    'top-center': 'linear-gradient(0deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.78) 100%)',
    'center': 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)',
  };

  // alignment → justifyContent on flex column
  const justify = {
    'bottom-left': 'flex-end',
    'bottom-right': 'flex-end',
    'bottom-center': 'flex-end',
    'top-left': 'flex-start',
    'top-center': 'flex-start',
    'center': 'center',
  }[align];

  const itemsAlign = {
    'bottom-left': 'flex-start',
    'bottom-right': 'flex-end',
    'bottom-center': 'center',
    'top-left': 'flex-start',
    'top-center': 'center',
    'center': 'center',
  }[align];

  const textAlign = (align.endsWith('center') || align === 'center') ? 'center' : (align.endsWith('right') ? 'right' : 'left');

  return (
    <section
      id={id}
      className="ho-hero"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundPosition: bgPosition,
        minHeight,
      }}
      data-bg-mobile={bgPositionMobile || ''}
    >
      <div
        className="ho-hero-overlay"
        style={{
          background: gradient || defaultGradient[align],
        }}
      />
      <div
        className="ho-hero-content"
        style={{
          justifyContent: justify,
          alignItems: itemsAlign,
          textAlign,
        }}
      >
        <div
          className={scrim ? 'ho-hero-scrim' : ''}
          style={scrim ? {
            maxWidth: 720,
            width: '100%',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            padding: '32px 36px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.06)',
          } : { maxWidth: 760, width: '100%' }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

/* ─── Dark "data" section (Act 2 tables) ──────────────────────────── */
function DataSection({ id, children, accent = NAVY }) {
  return (
    <section
      id={id}
      className="ho-dark-section"
      style={{
        background: accent,
        padding: '110px 0',
        color: CREAM,
      }}
    >
      <div className="ho-inner" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 56px' }}>
        {children}
      </div>
    </section>
  );
}

/* ─── Data section title (for dark tables) ───────────────────────── */
function DataTitle({ children, eyebrow }) {
  return (
    <div style={{ marginBottom: 36 }}>
      {eyebrow && (
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: AMBER,
          fontWeight: 700,
          marginBottom: 14,
        }}>{eyebrow}</div>
      )}
      <h2 className="ho-display" style={{
        fontSize: 'clamp(36px, 5vw, 56px)',
        color: CREAM,
        lineHeight: 1.05,
        letterSpacing: '-0.01em',
        margin: 0,
        fontStyle: 'italic',
        fontWeight: 400,
      }}>
        {children}
      </h2>
    </div>
  );
}

/* ─── AZCT-style table (DARK variant for Act 2) ──────────────────── */
function DataTable({ headers, rows, highlightLast = false, lastRowBold = false }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6 }}>
      <table className="ho-table" style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'Hanken Grotesk, system-ui, sans-serif',
        fontSize: 15,
        background: NAVY,
      }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                background: '#0A0E12',
                color: CREAM,
                fontWeight: 700,
                padding: '15px 18px',
                textAlign: i === 0 ? 'left' : (i === headers.length - 1 ? 'right' : 'center'),
                fontSize: 13,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                borderRight: i < headers.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const isLast = ri === rows.length - 1;
            const isHighlighted = highlightLast && isLast;
            return (
              <tr key={ri} className={isHighlighted ? 'ho-row-highlight' : ''} style={{
                background: isHighlighted ? AMBER : (ri % 2 === 0 ? NAVY_ROW_A : NAVY_ROW_B),
              }}>
                {row.map((cell, ci) => {
                  const cellIsEmpty = cell === '' || cell == null;
                  return (
                    <td
                      key={ci}
                      data-label={headers[ci] || ''}
                      className={cellIsEmpty && !isHighlighted ? 'ho-empty-cell' : ''}
                      style={{
                        padding: '15px 18px',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderRight: ci < row.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        color: isHighlighted ? '#1a0e00' : CREAM,
                        fontWeight: isHighlighted || (lastRowBold && isLast) ? 700 : 400,
                        fontSize: isHighlighted ? 16 : 15,
                        textAlign: ci === 0 ? 'left' : (ci === row.length - 1 ? 'right' : 'center'),
                        verticalAlign: 'top',
                        lineHeight: 1.55,
                      }}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Structure table (Acts / Content rows) — DARK variant ──────── */
function StructureTable({ rows }) {
  return (
    <div style={{ margin: '20px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      <table className="ho-struct-table" style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'Hanken Grotesk, system-ui, sans-serif',
        fontSize: 15,
      }}>
        <tbody>
          {rows.map(([label, text], i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <td className="ho-struct-label" style={{
                width: 200,
                padding: '20px 22px 20px 0',
                fontWeight: 700,
                color: AMBER,
                verticalAlign: 'top',
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>{label}</td>
              <td className="ho-struct-text" style={{
                padding: '20px 0',
                color: CREAM_DIM,
                lineHeight: 1.7,
                fontSize: 15.5,
              }}>{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Section title (used inside hero overlays) ──────────────────── */
function HeroTitle({ children, italic = true, size = 'lg' }) {
  const sizes = {
    md: { fontSize: 'clamp(36px, 5vw, 52px)' },
    lg: { fontSize: 'clamp(44px, 6.5vw, 72px)' },
  };
  return (
    <h2 className={italic ? 'ho-display ho-section-title' : 'ho-body ho-section-title'} style={{
      ...sizes[size],
      color: '#fff',
      lineHeight: 1.0,
      letterSpacing: '-0.01em',
      margin: 0,
      marginBottom: 26,
      fontStyle: italic ? 'italic' : 'normal',
      fontWeight: italic ? 400 : 700,
    }}>
      {children}
    </h2>
  );
}

function HeroBucketTitle({ children }) {
  return (
    <h3 className="ho-display" style={{
      fontSize: 'clamp(34px, 4.5vw, 54px)',
      color: '#fff',
      lineHeight: 1.0,
      letterSpacing: '-0.01em',
      margin: 0,
      marginBottom: 20,
      fontStyle: 'italic',
      fontWeight: 400,
    }}>
      {children}
    </h3>
  );
}

function HeroLead({ children }) {
  return (
    <p className="ho-body ho-lead" style={{
      fontSize: 19,
      color: '#fff',
      lineHeight: 1.5,
      fontWeight: 500,
      marginBottom: 18,
    }}>{children}</p>
  );
}

function HeroBodyP({ children, style = {} }) {
  return (
    <p className="ho-body ho-body-p" style={{
      fontSize: 17,
      color: 'rgba(255,255,255,0.92)',
      lineHeight: 1.65,
      marginBottom: 14,
      ...style,
    }}>{children}</p>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */
export default function HigherOrbitsPitchAZCT() {
  useSEO();

  return (
    <div className="ho-body" style={{ background: '#000', color: '#fff', minHeight: '100vh' }}>
      <style>{FONTS}</style>

      {/* ═══════════════════════════════════════════════════
          ACT 1 — SELL THE VISION
      ═══════════════════════════════════════════════════ */}

      {/* ── S1: COVER ─────────────────────────────────── */}
      <section
        id="cover"
        className="ho-hero"
        style={{
          backgroundImage: 'url(/images/higherorbits/gemini/cover-hero.jpg)',
          backgroundPosition: 'center',
          minHeight: '100vh',
        }}
      >
        <div
          className="ho-hero-overlay"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 100%)',
          }}
        />
        <div className="ho-hero-content" style={{ justifyContent: 'flex-end', alignItems: 'flex-start', padding: '80px 56px 72px' }}>
          <div style={{ width: '100%', maxWidth: 1180 }}>
            <h1 className="ho-body ho-cover-title" style={{
              fontSize: 'clamp(56px, 10vw, 116px)',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              marginBottom: 28,
              textTransform: 'uppercase',
              margin: 0,
            }}>
              HIGHER ORBITS
            </h1>
            <p className="ho-display" style={{
              fontSize: 'clamp(28px, 4.5vw, 56px)',
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.95)',
              lineHeight: 1.1,
              fontWeight: 400,
              margin: '24px 0 36px',
            }}>
              Ten Years to the Stars
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p className="ho-body" style={{ color: 'rgba(255,255,255,0.72)', fontSize: 16, fontStyle: 'italic', margin: 0 }}>
                Inspiring the Next Generation of Scientists
              </p>
              <p className="ho-body" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', marginTop: 8 }}>
                Crafted by Ahead of Market
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── S2: OUR INTENT ──────────────────────────────
            Background: silhouette at window (core-bucket-hero-piece)
            Overlay: bottom-left, dark gradient from bottom up
      */}
      <HeroSection
        id="our-intent"
        bgImage="/images/higherorbits/gemini/our-intent-students-iss-hardware.jpg"
        bgPosition="center 30%"
        align="bottom-left"
        gradient="linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,0.82) 100%)"
      >
        <div className="ho-eyebrow">Our Intent</div>
        <HeroTitle italic>Tell the story the last ten years have earned.</HeroTitle>
        <HeroLead>
          We want Higher Orbits to walk into the next ten years with the visibility the last ten have earned.
        </HeroLead>
        <HeroBodyP>
          For a decade, Michelle Lucas has built a program where students design real science experiments that fly to the International Space Station. The work is undeniable. The story is undertold. This film exists to change that — to put Higher Orbits in front of the donors, sponsors, press, and policymakers who should already know the name.
        </HeroBodyP>
        <HeroBodyP>
          We bring AOM's documentary craft to a story that doesn't need embellishment. It needs to be told well, told once, and used for years.
        </HeroBodyP>
      </HeroSection>

      {/* ── S3: CORE ELEMENTS — Hero Piece ──────────────
            Background: same silhouette frame, re-anchored
            Overlay: bottom-LEFT
      */}
      <HeroSection
        id="core-hero-piece"
        bgImage="/images/higherorbits/gemini/hero-piece-documentary-in-room.jpg"
        bgPosition="center 60%"
        align="bottom-left"
        gradient="linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.85) 100%)"
      >
        <div className="ho-eyebrow">Core Elements · One of Three</div>
        <HeroBucketTitle>The Hero Piece</HeroBucketTitle>
        <HeroBodyP>
 The centerpiece. A TV-quality documentary built around the 100th Go For Launch! event, the same Deerfield, Illinois high school where the first event happened in 2016, with the same astronaut who was there on day one. Michelle's origin story, the students who made it real, the full-circle moment that ten years of work was always building toward. This film lives in donor meetings, grant proposals, board presentations, and school assemblies for years after June.
        </HeroBodyP>
      </HeroSection>

      {/* ── S4: CORE ELEMENTS — Campaign Pack ──────────
            Background: hands holding phone
            Overlay: bottom-RIGHT (alternate for rhythm)
      */}
      <HeroSection
        id="core-campaign-pack"
        bgImage="/images/higherorbits/gemini/core-bucket-campaign-pack.jpg"
        bgPosition="center"
        align="bottom-right"
        gradient="linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,0.85) 100%)"
      >
        <div className="ho-eyebrow">Core Elements · Two of Three</div>
        <HeroBucketTitle>The Campaign Pack</HeroBucketTitle>
        <HeroBodyP>
 Everything that lives around the hero piece and keeps the story moving. A 30-second pre-event teaser before Chicago. A 60–75 second recap ready within 48 hours of the event closing, while it's still news. Eight to ten short social cuts that let Higher Orbits' alumni, sponsors, and audience share the story on every channel they use. <em>We work together to select what goes out and when, nothing posts without Michelle's sign-off.</em> The campaign pack is what turns a June event into a months-long content engine.
        </HeroBodyP>
      </HeroSection>

      {/* ── S5: CORE ELEMENTS — Living Archive ─────────
            Background: contact sheet on desk (darker frame)
            Overlay: TOP-CENTER, heavier dark gradient
      */}
      <HeroSection
        id="core-living-archive"
        bgImage="/images/higherorbits/gemini/core-bucket-living-archive.jpg"
        bgPosition="center"
        align="top-center"
        gradient="linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.25) 100%)"
      >
        <div className="ho-eyebrow" style={{ marginBottom: 18 }}>Core Elements · Three of Three</div>
        <HeroBucketTitle>The Living Archive</HeroBucketTitle>
        <HeroBodyP>
 One hundred edited stills from the event and production. Eight to twelve terabytes of organized raw footage. A sponsor recognition package, credits, branded social templates, a thank-you clip, that Michelle can put in front of Chevron, BRPH, and board-level sponsors immediately after Chicago. The archive is Higher Orbits' permanent visual record of its most important milestone.
        </HeroBodyP>
      </HeroSection>

      {/* ── S6a: HERO FILM OPENER (full-bleed image moment) ──── */}
      <HeroSection
        id="hero-film"
        bgImage="/images/higherorbits/gemini/hero-film-michelle-archetype.jpg"
        bgPosition="center 30%"
        align="bottom-left"
        gradient="linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.85) 100%)"
      >
        <div className="ho-eyebrow">The Centerpiece</div>
        <HeroTitle italic size="lg">The Hero Film</HeroTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>
          <div className="ho-mono" style={{ color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ color: AMBER }}>Style</span>&nbsp;&nbsp;Documentary-style
          </div>
          <div className="ho-mono" style={{ color: 'rgba(255,255,255,0.85)' }}>
            <span style={{ color: AMBER }}>Audience</span>&nbsp;&nbsp;Media / Press &nbsp;&middot;&nbsp; Sponsors / Funders
          </div>
        </div>
        <HeroBodyP>
          A documentary built in three acts. Michelle Lucas is the spine. The 100th Go For Launch! event in Deerfield is the present-tense centerpiece. The film is purpose-built for the rooms that grow Higher Orbits next: the press desks that decide what story to tell, and the sponsors and funders who decide what to invest in.
        </HeroBodyP>
      </HeroSection>

      {/* ── S6b: HERO FILM STRUCTURE TABLE (solid dark) ───── */}
      <DataSection id="hero-film-structure">
        <DataTitle eyebrow="The Root · The Moment · The Ripple">
          Structure
        </DataTitle>
        <p className="ho-body" style={{ fontSize: 17, color: CREAM_DIM, lineHeight: 1.6, fontStyle: 'italic', maxWidth: 760, marginBottom: 28 }}>
          Michelle's story bookends. The event is the meat.
        </p>
        <StructureTable rows={[
 ['Act 1, The Root (Past)',
 "Open on Michelle Lucas, but frame her for someone who may be meeting her for the first time. Establish her credibility and humanity in the same breath: who she was before Higher Orbits, the defining moments that drove her to build something, and the mission she's been quietly executing for a decade. A simple day in her life grounds the viewer before the scale of the story lands. Weave in one alumni, staff member, or student whose background adds texture, a real face that shows funders and press who this program actually reaches."
          ],
 ['Act 2, The Moment (Present)',
 "Place the viewer inside the 10th Anniversary and 100th Go For Launch! session. For press, this is the news hook, a milestone worth covering. For sponsors, this is proof of concept, a decade of execution in one room. Highlight Alexis's story or a standout project or upcoming event to show the program has velocity, not just history."
          ],
 ['Act 3, The Ripple (Future)',
 "Make the case for why this matters beyond the milestone. For funders, this is the investment thesis, Michelle's influence on students is compounding. For media, this is the larger cultural story, what happens when someone builds something that genuinely works? Close with forward momentum and a clear sense that the next 10 years are just beginning."
          ],
        ]} />
        <div style={{ marginTop: 36, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.1)', maxWidth: 860 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: AMBER,
            fontWeight: 700,
            marginBottom: 12,
          }}>Distribution Strategy</div>
          <p className="ho-body" style={{ fontSize: 16.5, color: CREAM_DIM, lineHeight: 1.7, margin: 0 }}>
 Premier at the Deerfield event itself, the room where it all started. Post to YouTube for search visibility and permanent reach. Share on LinkedIn, where donors, sponsors, and aerospace professionals actually watch. Distribute in every Higher Orbits grant proposal, donor meeting, and board presentation going forward. The hero piece doesn't expire, it earns its keep for years.
          </p>
        </div>
      </DataSection>

      {/* ── S7a: MEET THE ALUMNI OPENER ─────────────── */}
      <HeroSection
        id="alumni"
        bgImage="/images/higherorbits/gemini/alumni-aerospace-engineer.jpg"
        bgPosition="center 30%"
        align="bottom-right"
        gradient="linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,0.85) 100%)"
      >
        <div className="ho-eyebrow">The Through-Line</div>
        <HeroTitle italic size="lg">Meet the Alumni</HeroTitle>
        <HeroBodyP>
 Put real student and alumni voices at the center of the story. Higher Orbits' difference isn't the curriculum, it's the result: experiments that actually flew, students who actually built them, STEM careers and paths that actually changed. The alumni are the proof. This section of the film is the through-line Michelle explicitly asked for.
        </HeroBodyP>
      </HeroSection>

      {/* ── S7b: ALUMNI CONTENT TABLE (solid dark) ───── */}
      <DataSection id="alumni-content">
        <DataTitle eyebrow="The Specifics">
          Content
        </DataTitle>
        <StructureTable rows={[
          ['Specifics', 'Student and alumni interview segments woven throughout the hero piece and available as standalone cuts for grant and donor use.'],
 ['Focus', 'The journey, from a Go For Launch! workshop to a STEM career, a university engineering program, ongoing involvement in spaceflight, or simply the confidence that comes from having built something real and watched it leave the atmosphere.'],
          ['Visuals', 'Alumni in their environments today: labs, research settings, workplaces. Students mid-build and mid-presentation. Archival moments from past events cut against present-day Chicago coverage. The astronaut mentor layer: professionals who give their time because the mission genuinely matters, captured in a way that shows it.'],
        ]} />
        <div style={{ marginTop: 36, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.1)', maxWidth: 860 }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: AMBER,
            fontWeight: 700,
            marginBottom: 12,
          }}>Distribution Strategy</div>
          <p className="ho-body" style={{ fontSize: 16.5, color: CREAM_DIM, lineHeight: 1.7, margin: 0 }}>
 Alumni and mentors sharing their own cuts through their own networks, the reach multiplier that no amount of Higher Orbits' own posting could replicate. Recruitment content for future Go For Launch! participants: a student watching another student's story is the most powerful pitch for the program that exists. Sponsor and grant presentations showing real outcomes, not projected ones.
          </p>
        </div>
      </DataSection>

      {/* ── S8a: EMPOWERING IMPACT OPENER ──────────── */}
      <HeroSection
        id="sponsorship"
        bgImage="/images/higherorbits/gemini/sponsorship-board-screening.jpg"
        bgPosition="center"
        align="bottom-left"
        gradient="linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.2) 35%, rgba(0,0,0,0.85) 100%)"
      >
        <div className="ho-eyebrow">Partnership</div>
        <HeroTitle italic size="lg">Empowering Impact Through Partnership</HeroTitle>
        <HeroBodyP>
 Higher Orbits' existing sponsor relationships are one of the strongest assets it has. Chevron, BRPH, and board-level donors are already part of this story. The campaign gives Michelle a vehicle to deepen those relationships and open the door to new ones, because sponsors gain something real: recognition inside a film that will be watched for years, not a logo on a banner that disappears after the event.
        </HeroBodyP>
        <HeroBodyP>
          Higher Orbits invites corporate sponsors to join the story being told at its most powerful moment. For sponsors in the STEM education and aerospace space, being named inside a film about the 100th Go For Launch! event is not just a marketing placement — it is a credible, mission-driven alignment that corporate social responsibility programs are actively looking for.
        </HeroBodyP>
      </HeroSection>

      {/* ── S8b: SPONSORSHIP BENEFITS (solid dark) ──── */}
      <DataSection id="sponsorship-benefits">
        <DataTitle eyebrow="What sponsors actually get">
          Sponsorship Benefits
        </DataTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, marginTop: 12 }}>
          {/* Benefit 1 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
              <span className="ho-display" style={{ fontSize: 38, color: AMBER, fontStyle: 'italic', lineHeight: 1, fontWeight: 400 }}>01</span>
              <h3 className="ho-body" style={{ fontSize: 22, fontWeight: 700, color: CREAM, margin: 0, lineHeight: 1.2 }}>
                Recognition in the Film
              </h3>
            </div>
            <ul className="ho-body" style={{ paddingLeft: 22, margin: 0, color: CREAM_DIM, fontSize: 16, lineHeight: 1.7, listStyleType: 'disc' }}>
              <li style={{ marginBottom: 8 }}>Prominent logo placement in the film credits and opening sequence.</li>
              <li style={{ marginBottom: 8 }}>Named mention in promotional materials, donor email communications, and press outreach.</li>
 <li>Every time the hero piece is screened, at a board meeting, a school assembly, a grant panel, the sponsor's name is in the room.</li>
            </ul>
          </div>

          {/* Benefit 2 — Custom Branded Sponsor Video (locked, single benefit) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
              <span className="ho-display" style={{ fontSize: 38, color: AMBER, fontStyle: 'italic', lineHeight: 1, fontWeight: 400 }}>02</span>
              <h3 className="ho-body" style={{ fontSize: 22, fontWeight: 700, color: CREAM, margin: 0, lineHeight: 1.2 }}>
                Custom Branded Sponsor Video
              </h3>
            </div>
            <p className="ho-body" style={{ color: CREAM_DIM, fontSize: 16.5, lineHeight: 1.7, margin: '0 0 14px' }}>
 If any sponsor wants their own version of the film, AOM produces a branded cut for them, their logo, their angle, their voice woven in. If a sponsor's representatives are at the Deerfield event, we coordinate on-site interviews so the branded version includes their team directly. Easy logistical lift on our end; meaningful asset on theirs.
            </p>
            <p className="ho-body" style={{ color: 'rgba(244,237,226,0.55)', fontSize: 14.5, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
              Perfect for the sponsor's own website, board presentations, donor outreach, and corporate social platforms.
            </p>
          </div>

          {/* Benefit 3 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16 }}>
              <span className="ho-display" style={{ fontSize: 38, color: AMBER, fontStyle: 'italic', lineHeight: 1, fontWeight: 400 }}>03</span>
              <h3 className="ho-body" style={{ fontSize: 22, fontWeight: 700, color: CREAM, margin: 0, lineHeight: 1.2 }}>
                Visibility Across Campaign Assets
              </h3>
            </div>
            <ul className="ho-body" style={{ paddingLeft: 22, margin: 0, color: CREAM_DIM, fontSize: 16, lineHeight: 1.7, listStyleType: 'disc' }}>
              <li style={{ marginBottom: 8 }}>Featured in social media posts, event-day social graphics, and campaign email content throughout the run-up and post-event window.</li>
              <li style={{ marginBottom: 8 }}>Co-branded recognition at the Deerfield event and across the online presence.</li>
 <li>Inclusion in the sponsor recognition package AOM builds from the Chicago footage, credits integration, branded social post templates, and a 60–90 second thank-you highlight clip for donor email campaigns.</li>
            </ul>
          </div>
        </div>
      </DataSection>

      {/* ═══════════════════════════════════════════════════
          ACT 2 — PROVE THE WORK  (all solid dark, no image)
      ═══════════════════════════════════════════════════ */}

      {/* ── S9: DELIVERABLES ──────────────────── */}
      <DataSection id="deliverables">
        <DataTitle eyebrow="What you get">
          Project Deliverables
        </DataTitle>
        <DataTable
          headers={['Project Deliverable', 'Amount', 'Timeline']}
          rows={[
 ['Hero Documentary', '1', "End of July 2026, 3–5 min final cut. Opening (Michelle's NASA origin + 2016 Deerfield gym) → Middle (alumni voices + 24 ISS experiments) → End (100th event, full circle)."],
 ['Pre-Event Teaser', '1', '7 days before the June event, 30 sec, built from pre-production material and early Chicago footage.'],
 ['48-Hour Recap', '1', 'Within 48 hours of event close, 60–75 sec, share-ready for social, email, and press while the moment is still news.'],
 ['Social Cuts Pack', '8–10 short verticals', 'End of July 2026, 4 alumni/student voice reels (15–30 sec), 2 Michelle highlights (30–45 sec), 2 event-day energy cuts (15–20 sec), 1–2 Dorothy/astronaut moments (20–30 sec).'],
 ['Hero Photo Set', '100 edited stills', 'End of July 2026, 50 event-day (ceremony, presentations, crowd), 25 interview/portrait (Michelle, Dorothy, student subjects), 25 B-roll and production documentation.'],
 ['Raw Footage Archive', '8–12 TB', 'At final delivery, all raw Chicago footage organized by shoot day and subject, delivered on a portable hard drive. Higher Orbits owns this archive permanently.'],
            ['Sponsor Recognition Package', 'Included', 'Logo in film credits and opening sequence. One branded social post template for Chevron, BRPH, and board sponsors. One 60–90 sec thank-you highlight clip for donor communications.'],
          ]}
        />
      </DataSection>

      {/* ── S10: TIMELINE ──────────────────── */}
      <DataSection id="timeline">
        <DataTitle eyebrow="The plan">
          Project Timeline
        </DataTitle>
        <DataTable
          headers={['Phase', 'Duration', 'Team', 'Details']}
          rows={[
            ['Pre-Production', '10–12 planning days', '3', 'Alignment sessions with Michelle; subject selection and interview outlines; shot list; alumni intro calls; access and logistics coordination with Higher Orbits; travel booking; teaser material prep.'],
 ['Chicago, Travel', '2 days', '3', 'PHX → Chicago (day in), Chicago → PHX (day out).'],
 ['Chicago, Production', '4 days on-ground', '3', 'Two cameras running simultaneously throughout. Full event-day coverage. Michelle documentary interview. Dorothy Metcalf-Lindenburger interview. Student team interviews and B-roll. Stills throughout every day.'],
 ['Post, 48-Hour Recap', '1.5–2 days', '1–2', 'Urgency-mode edit from event footage. Hard 48-hour delivery window from event close.'],
 ['Post, Hero Piece', '6–8 days', '1–2', 'Rough assembly → assembly cut → fine cut (Michelle review round) → revisions → final master. One revision round included.'],
 ['Post, Social Cuts', '3–4 days', '1', '8–10 verticals, batched from hero footage selects.'],
 ['Post, Photos + Sponsor Package', '3 days', '1', 'Photo culling (400–600 raws → 100 finals) + grading; credits integration, social template, thank-you clip.'],
            ['Collaborative Review', '2 sessions', '2–3', 'Rough cut review with Michelle (session 1). Final approval before delivery (session 2). One revision round included.'],
            ['Total', '~10 weeks (May–July 2026)', '', 'Full delivery by end of July 2026.'],
          ]}
          lastRowBold
          highlightLast
        />
      </DataSection>

      {/* ── S11: BUDGET ──────────────────── */}
      <DataSection id="budget">
        <DataTitle eyebrow="The investment">
          Project Budget Summary
        </DataTitle>
        <DataTable
          headers={['Budget Items', 'Information', 'Team', 'Cost']}
          rows={[
            ['Shooting Labor', '4 production days in Chicago × 3 people', '3', '$5,600'],
            ['Travel Labor', '2 travel days × 3 people (full working rate)', '3', '$2,800'],
 ['Post Production Labor', '13.5 days, hero piece, recap, teaser, social cuts, photo edit, sponsor package', '1–2', '$7,250'],
            ['Pre-Production & Wrap', 'Planning, logistics, shot list, interview prep', '3', '$1,400'],
            ['Travel + Accommodations', 'PHX ↔ Chicago RT × 3 + Deerfield hotel 4.5 nights × 3 rooms + rideshares', '3', '$4,110'],
            ['Per Diems', '$75/day × 3 people × 5 days', '3', '$1,125'],
 ['Music & Rights', 'Sync licensing, hero, recap, teaser, and social cuts', '', '$700'],
 ['Storage, Archive & Gear', '12TB archive drive + cloud backup + production insurance + overhead', '', '$1,950'],
            ['Contingency', '', '', '$3,065'],
            ['Total', '', '', '$28,000'],
          ]}
          highlightLast
          lastRowBold
        />
        <p className="ho-body" style={{
          fontSize: 14,
          color: CREAM_DIM,
          marginTop: 24,
          fontStyle: 'italic',
        }}>
          Payment: one-third to confirm and book travel, one-third at end of the Chicago shoot, final third at delivery.
        </p>
      </DataSection>

      {/* ═══════════════════════════════════════════════════
          CODA — REINFORCE + CLOSE
      ═══════════════════════════════════════════════════ */}

      {/* ── S12: WHY DOES THIS MATTER ─────────
            Atmospheric backdrop: inspo-1 at low opacity behind navy
      */}
      <section
        id="why-it-matters"
        className="ho-dark-section"
        style={{
          background: NAVY,
          padding: '120px 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Atmospheric image at low opacity */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/images/higherorbits/gemini/inspo-1-student-presenting.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.18,
          filter: 'saturate(0.7)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${NAVY} 0%, rgba(15,20,25,0.78) 50%, ${NAVY} 100%)`,
        }} />
        <div className="ho-inner" style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '0 56px' }}>
          <div className="ho-why-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 80, alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: AMBER,
                fontWeight: 700,
                marginBottom: 20,
              }}>Coda</div>
              <h2 className="ho-display" style={{
                fontSize: 'clamp(40px, 5.5vw, 64px)',
                color: CREAM,
                lineHeight: 1.0,
                letterSpacing: '-0.01em',
                fontStyle: 'italic',
                fontWeight: 400,
                margin: 0,
              }}>
                Why Does This Matter?
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              <p className="ho-body" style={{ fontSize: 19, color: CREAM, lineHeight: 1.55, fontWeight: 500, margin: 0 }}>
 Reach the donors, sponsors, and institutions who should be funding Higher Orbits, but haven't found it yet. The 100th event is the moment this story earns its largest possible audience.
              </p>
              <p className="ho-body" style={{ fontSize: 19, color: CREAM, lineHeight: 1.55, fontWeight: 500, margin: 0 }}>
                Establish Higher Orbits as the most visible student spaceflight program in the country, at the moment it has earned that position. Twenty-four experiments flown. Three thousand alumni. A hundred events. The credibility is already there. The story just needs to be told at scale.
              </p>
              <p className="ho-body" style={{ fontSize: 19, color: CREAM, lineHeight: 1.55, fontWeight: 500, margin: 0 }}>
                Reinforce that this is a launch point, not a finish line. Higher Orbits is thriving and just getting started. The 100th milestone is a beginning.
              </p>
              <p className="ho-body" style={{ fontSize: 19, color: CREAM, lineHeight: 1.55, fontWeight: 500, margin: 0 }}>
                Build a permanent media archive — social proof and evergreen content that travels into every grant proposal, donor meeting, school assembly, and sponsor deck for years. The archive outlasts the anniversary cycle.
              </p>
              <p className="ho-body" style={{ fontSize: 19, color: CREAM, lineHeight: 1.55, fontWeight: 500, margin: 0 }}>
                Honor the decade of work: Michelle's origin, the alumni who built their futures at a Go For Launch! workshop, the astronauts who showed up year after year because the mission genuinely matters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── S13: VISUAL INSPIRATION ─────────── */}
      <DataSection id="visual-inspiration" accent="#000">
        <div className="ho-inspo-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 36 }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: AMBER,
              fontWeight: 700,
              marginBottom: 14,
            }}>References</div>
            <h2 className="ho-display" style={{ fontSize: 'clamp(36px, 4.5vw, 52px)', fontStyle: 'italic', fontWeight: 400, color: CREAM, marginBottom: 10, margin: 0, lineHeight: 1.05 }}>Visual Inspiration</h2>
            <p className="ho-body" style={{ fontSize: 17, color: CREAM_DIM, fontStyle: 'italic', marginTop: 12 }}>
              "The Story of Higher Orbits Is Ready to Be Told."
            </p>
          </div>
          <div style={{ maxWidth: 320 }}>
            <p className="ho-body" style={{ fontSize: 13, color: 'rgba(244,237,226,0.5)', textAlign: 'right', lineHeight: 1.6 }}>
              Reference frames for the visual aesthetic we bring to Chicago.
            </p>
          </div>
        </div>
        <div className="ho-inspo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { src: '/images/higherorbits/gemini/inspo-1-student-presenting.jpg', alt: 'High school student holding clear experiment housing, mid-sentence to classmates' },
            { src: '/images/higherorbits/gemini/inspo-2-interview-setup.jpg', alt: 'Documentary interview subject lit warmly with bokeh background' },
            { src: '/images/higherorbits/gemini/hero-film-section.jpg', alt: 'Young woman scientist at lab workbench, contemplative' },
            { src: '/images/higherorbits/gemini/alumni-section.jpg', alt: 'Young Black woman STEM professional in lab coat at research bench' },
          ].map((img, i) => (
            <div key={i} style={{ aspectRatio: '16/10', borderRadius: 2, overflow: 'hidden' }}>
              <img src={img.src} alt={img.alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
        </div>
      </DataSection>

 {/* ── S14: CTA, Let's Bring This Vision To Life ─────
            Solid black with cover-hero as callback at low opacity
      */}
      <section
        id="cta"
        className="ho-dark-section"
        style={{
          background: '#000',
          padding: '120px 0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/images/higherorbits/gemini/cover-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.22,
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.85) 100%)',
        }} />
        <div className="ho-inner" style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '0 56px' }}>
          <div style={{ maxWidth: 920 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: AMBER,
              fontWeight: 700,
              marginBottom: 18,
            }}>The Close</div>
            <h2 className="ho-display" style={{
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontStyle: 'italic',
              fontWeight: 400,
              color: '#fff',
              lineHeight: 1.0,
              letterSpacing: '-0.02em',
              marginBottom: 48,
              margin: 0,
            }}>
              Let's Bring This Vision To Life
            </h2>
            <div style={{ marginTop: 40, marginBottom: 56 }}>
              <p className="ho-body" style={{
                fontSize: 14,
                color: AMBER,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                fontFamily: 'JetBrains Mono, monospace',
                marginBottom: 22,
                fontWeight: 700,
              }}>
                Next Steps
              </p>
              <div className="ho-cta-steps" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {[
                  'Confirm the June event date',
                  'Begin pre-production immediately',
                  'Collaborate closely to ensure alignment every step of the way',
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <span className="ho-body" style={{
                      fontSize: 18,
                      color: '#fff',
                      fontWeight: 600,
                      lineHeight: 1.4,
                    }}>
                      {step}
                    </span>
                    {i < 2 && (
                      <span className="ho-cta-arrow" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 22, margin: '0 6px', alignSelf: 'center' }}>→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'right' }}>
                <p className="ho-body" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 8 }}>Questions?</p>
                <p className="ho-body" style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>
                  Call or Text Patrik{' '}
                  <a href="tel:+16023732164" style={{ color: AMBER, textDecoration: 'none' }}>602.373.2164</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── S15: THANK YOU ─────────── */}
      <section style={{
        background: '#000',
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 120, height: 120,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 26px',
          }}>
            <span className="ho-body" style={{
              fontWeight: 800, fontSize: 15, color: '#fff',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>AOM</span>
          </div>
          <p className="ho-display" style={{
            color: '#fff', fontSize: 28, fontStyle: 'italic', fontWeight: 400, margin: 0,
          }}>Thank you.</p>
          <p className="ho-body" style={{
            color: 'rgba(255,255,255,0.5)', fontSize: 12,
            marginTop: 16, letterSpacing: '0.22em', textTransform: 'uppercase',
            fontFamily: 'JetBrains Mono, monospace',
          }}>Ahead of Market</p>
        </div>
      </section>
    </div>
  );
}