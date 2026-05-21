import React, { useEffect } from 'react';

/**
 * HigherOrbitsPitchAZCT — AZCT three-act proposal structure for Michelle Lucas.
 *
 * Act 1 — Sell the Vision (sections 1-7)
 * Act 2 — Prove the Work (sections 8-10) — three load-bearing specificity tables
 * Coda  — Reinforce + Close (sections 11-16)
 *
 * Route: /higherorbits
 * Robots: noindex,nofollow
 * Design: white light sections, pure black dark slides, AZCT-faithful table styling
 */

function useSEO() {
  useEffect(() => {
    document.title = 'Higher Orbits — A Campaign for the 100th Go For Launch!';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('robots', 'noindex, nofollow');
    setMeta('description', 'A documentary campaign proposal for Higher Orbits — the 100th Go For Launch! and the decade that made it possible.');
    setMeta('og:title', 'Higher Orbits Campaign Proposal', true);
    setMeta('og:description', 'Ten years. One hundred events. Three thousand students. Twenty-four experiments in orbit.', true);
  }, []);
}

/* ─── Shared design tokens ─────────────────────────────────────────── */
const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
  .ho-display { font-family: 'Instrument Serif', Georgia, serif; }
  .ho-body    { font-family: 'Hanken Grotesk', system-ui, sans-serif; }
  .ho-mono    { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; }

  @media (max-width: 768px) {
    /* Tables collapse to stacked cards on mobile */
    .ho-table { font-size: 14px; }
    .ho-table thead { display: none; }
    .ho-table tbody { display: block; }
    .ho-table tr {
      display: block;
      background: #f9f5ef !important;
      border: 1px solid #ddd3c4;
      border-radius: 4px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .ho-table tr.ho-row-highlight { background: #111 !important; border-color: #111; }
    .ho-table tr.ho-row-highlight td { color: #fff !important; }
    .ho-table tr.ho-row-highlight td::before { color: rgba(255,255,255,0.55) !important; }
    .ho-table td {
      display: block;
      width: 100% !important;
      text-align: left !important;
      padding: 12px 16px !important;
      border-right: none !important;
      border-bottom: 1px solid #e5e2de !important;
      white-space: normal !important;
      box-sizing: border-box;
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
      color: #888;
      margin-bottom: 4px;
    }
    .ho-table td.ho-empty-cell { display: none; }

    /* Why Does This Matter — single column on mobile */
    .ho-why-grid { display: block !important; }
    .ho-why-grid > div { margin-bottom: 24px; }
    .ho-why-grid > div:last-child { margin-bottom: 0; }
    .ho-why-grid h2 { font-size: 32px !important; }
    .ho-why-grid p { font-size: 17px !important; }

    /* Dark section padding tightens on mobile */
    .ho-dark-section { padding: 56px 0 !important; }
    .ho-dark-section .ho-inner,
    .ho-light-section .ho-inner { padding: 0 24px !important; }
    .ho-light-section { padding: 56px 0 !important; }

    /* Visual Inspiration — 2x2 on mobile */
    .ho-inspo-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
    .ho-inspo-header { flex-direction: column !important; }
    .ho-inspo-header > div:last-child { max-width: none !important; }
    .ho-inspo-header p { text-align: left !important; }

    /* Cover hero tightens on mobile */
    .ho-cover { min-height: 70vh !important; }
    .ho-cover-inner { padding: 0 24px 40px !important; }

    /* Image+text rows: image gets full width on mobile */
    .ho-img-text-row { gap: 28px !important; }
    .ho-img-text-row > div:first-child { flex: 1 1 100% !important; }
    .ho-img-text-row > div:last-child  { flex: 1 1 100% !important; }

    /* Core elements grid: single column on mobile */
    .ho-core-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
    .ho-core-bucket { gap: 20px !important; }
    .ho-core-bucket > div:first-child { flex: 1 1 100% !important; min-width: 0 !important; }
    .ho-core-bucket > div:last-child { flex: 1 1 100% !important; }

    /* CTA section steps wrap better */
    .ho-cta-steps { flex-direction: column !important; gap: 14px !important; }
  }
`;

/* ─── Decision Placeholder ──────────────────────────────────────────── */
function DecisionBox({ label, children }) {
  return (
    <div style={{
      border: '2px dashed #E85D26',
      borderRadius: 4,
      padding: '16px 20px',
      background: 'rgba(232,93,38,0.04)',
      marginBottom: 12
    }}>
      <div style={{
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: '#E85D26',
        marginBottom: 8,
        fontWeight: 700
      }}>
        {label}
      </div>
      <div className="ho-body" style={{ fontSize: 16, color: '#111', lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );
}

function DecisionWrapper({ title, options }) {
  return (
    <div style={{
      border: '1.5px dashed rgba(232,93,38,0.6)',
      borderRadius: 6,
      padding: '20px 24px',
      background: 'rgba(232,93,38,0.03)',
      margin: '24px 0'
    }}>
      <div style={{
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: '#E85D26',
        marginBottom: 16,
        fontWeight: 700
      }}>
        ⚑ Decision for Patrik — pick one before sharing with Michelle
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map((opt, i) => (
          <DecisionBox key={i} label={`Draft Option ${String.fromCharCode(65 + i)}`}>{opt}</DecisionBox>
        ))}
      </div>
    </div>
  );
}

/* ─── Real Image ────────────────────────────────────────────────────── */
function ImgReal({ src, alt, aspect = '66%' }) {
  return (
    <div style={{
      position: 'relative',
      paddingTop: aspect,
      borderRadius: 2,
      overflow: 'hidden'
    }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
}

/* ─── Image Placeholder ─────────────────────────────────────────────── */
function ImgPlaceholder({ aspect = '56.25%', label = 'Photo placeholder', dark = false }) {
  return (
    <div style={{
      position: 'relative',
      paddingTop: aspect,
      background: dark
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)'
        : 'linear-gradient(135deg, #e8e0d8 0%, #d4ccc4 40%, #c0b8b0 100%)',
      borderRadius: 2,
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, textAlign: 'center'
      }}>
        <span style={{
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'
        }}>{label}</span>
      </div>
    </div>
  );
}

/* ─── Section header (bold, AZCT style) ────────────────────────────── */
function SectionTitle({ children, size = 'lg' }) {
  const isDisplay = size === 'xl';
  const sizes = {
    sm: { fontSize: 18, fontWeight: 700 },
    md: { fontSize: 22, fontWeight: 700 },
    lg: { fontSize: 28, fontWeight: 700 },
    xl: { fontSize: 44, fontStyle: 'italic', fontWeight: 400 },
  };
  return (
    <h2 className={isDisplay ? 'ho-display' : 'ho-body'} style={{
      ...sizes[size],
      color: '#111',
      lineHeight: 1.1,
      letterSpacing: '-0.01em',
      marginBottom: 24
    }}>
      {children}
    </h2>
  );
}

/* ─── AZCT-style table ──────────────────────────────────────────────── */
function AZCTTable({ headers, rows, lastRowBold = false, highlightLast = false }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="ho-table" style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'Hanken Grotesk, system-ui, sans-serif',
        fontSize: 15
      }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                background: '#111',
                color: '#fff',
                fontWeight: 700,
                padding: '14px 18px',
                textAlign: i === 0 ? 'left' : 'center',
                fontSize: 14,
                letterSpacing: '0.01em',
                whiteSpace: 'nowrap',
                borderRight: i < headers.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none'
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
                background: isHighlighted ? '#111' : ri % 2 === 0 ? '#f9f5ef' : '#f1ece3',
              }}>
                {row.map((cell, ci) => {
                  const cellIsEmpty = cell === '' || cell == null;
                  return (
                    <td
                      key={ci}
                      data-label={headers[ci] || ''}
                      className={cellIsEmpty && !isHighlighted ? 'ho-empty-cell' : ''}
                      style={{
                        padding: '14px 18px',
                        borderBottom: `1px solid ${isHighlighted ? 'rgba(255,255,255,0.1)' : '#d8cfc4'}`,
                        borderRight: ci < row.length - 1 ? `1px solid ${isHighlighted ? 'rgba(255,255,255,0.1)' : '#d8cfc4'}` : 'none',
                        color: isHighlighted ? '#fff' : '#111',
                        fontWeight: isHighlighted || (lastRowBold && isLast) ? 700 : 400,
                        fontSize: isHighlighted ? 16 : 15,
                        textAlign: ci === 0 ? 'left' : ci === row.length - 1 ? 'right' : 'center',
                        verticalAlign: 'top',
                        lineHeight: 1.5
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

/* ─── Structure table (Opening / Middle / End rows) ─────────────────── */
function StructureTable({ rows }) {
  return (
    <div style={{ margin: '20px 0' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'Hanken Grotesk, system-ui, sans-serif',
        fontSize: 15
      }}>
        <tbody>
          {rows.map(([label, text], i) => (
            <tr key={i} style={{ borderBottom: '1px solid #d8cfc4' }}>
              <td style={{
                width: 110,
                padding: '16px 18px',
                fontWeight: 700,
                color: '#111',
                verticalAlign: 'top',
                whiteSpace: 'nowrap',
                borderRight: '1px solid #d8cfc4'
              }}>{label}</td>
              <td style={{
                padding: '16px 18px',
                color: '#444',
                lineHeight: 1.6,
                fontStyle: 'italic'
              }}>{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Content table (Specifics / Focus / Visuals rows) ──────────────── */
function ContentTable({ rows }) {
  return <StructureTable rows={rows} />;
}

/* ─── Postable content row ──────────────────────────────────────────── */
function PostableRow({ label, text }) {
  return (
    <div style={{
      display: 'flex',
      gap: 0,
      borderBottom: '1px solid #d8cfc4',
      padding: '16px 0'
    }}>
      <div className="ho-body" style={{
        width: 160,
        minWidth: 160,
        fontWeight: 700,
        color: '#111',
        fontSize: 14,
        paddingRight: 20,
        paddingTop: 2
      }}>{label}</div>
      <div className="ho-body" style={{ flex: 1, color: '#444', fontSize: 15, lineHeight: 1.6 }}>
        {text}
      </div>
    </div>
  );
}

/* ─── Subsection label ───────────────────────────────────────────────── */
function SubLabel({ children }) {
  return (
    <div className="ho-body" style={{
      fontWeight: 700,
      fontSize: 16,
      color: '#111',
      marginBottom: 10,
      marginTop: 28
    }}>{children}</div>
  );
}

/* ─── Body paragraph ─────────────────────────────────────────────────── */
function BodyP({ children, style = {} }) {
  return (
    <p className="ho-body" style={{
      fontSize: 16,
      color: '#333',
      lineHeight: 1.7,
      marginBottom: 16,
      ...style
    }}>{children}</p>
  );
}

/* ─── Distribution Strategy block ───────────────────────────────────── */
function Distribution({ children }) {
  return (
    <div style={{ marginTop: 28 }}>
      <SubLabel>Distribution Strategy</SubLabel>
      <BodyP>{children}</BodyP>
    </div>
  );
}

/* ─── Light Section wrapper ──────────────────────────────────────────── */
function LightSection({ children, id, noBorderTop = false }) {
  return (
    <section
      id={id}
      className="ho-light-section"
      style={{
        background: '#f4ede2',
        borderTop: noBorderTop ? 'none' : '1px solid #ddd3c4',
        padding: '80px 0'
      }}
    >
      <div className="ho-inner" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }}>
        {children}
      </div>
    </section>
  );
}

/* ─── Dark Section wrapper ───────────────────────────────────────────── */
function DarkSection({ children, id }) {
  return (
    <section
      id={id}
      className="ho-dark-section"
      style={{
        background: '#000',
        padding: '100px 0'
      }}
    >
      <div className="ho-inner" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }}>
        {children}
      </div>
    </section>
  );
}

/* ─── Image + Text 2-col row ─────────────────────────────────────────── */
function ImgTextRow({ imgSrc, imgLabel, title, children, imgWidth = '42%', reverse = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      gap: 56,
      alignItems: 'flex-start',
      flexWrap: 'wrap'
    }}>
      <div style={{ flex: `0 0 ${imgWidth}`, minWidth: 260 }}>
        <ImgPlaceholder aspect="66%" label={imgLabel || 'Photo placeholder'} />
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        {title && (
          <div className="ho-body" style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#111',
            marginBottom: 14,
            lineHeight: 1.2
          }}>{title}</div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ─── Benefit block ──────────────────────────────────────────────────── */
function BenefitBlock({ number, title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div className="ho-body" style={{
        fontSize: 18,
        fontWeight: 700,
        color: '#111',
        marginBottom: 10
      }}>
        {number}. {title}
      </div>
      <div className="ho-body" style={{ fontSize: 15, color: '#333', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */
export default function HigherOrbitsPitchAZCT() {
  useSEO();

  return (
    <div className="ho-body" style={{ background: '#f4ede2', color: '#111', minHeight: '100vh' }}>
      <style>{FONTS}</style>

      {/* ═══════════════════════════════════════════════════
          ACT 1 — SELL THE VISION
      ═══════════════════════════════════════════════════ */}

      {/* ── S1: COVER ─────────────────────────────────── */}
      <section id="cover" className="ho-cover" style={{ background: '#000', position: 'relative', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {/* Hero photo — Gemini cohesive set: silhouette + twilight sky */}
        <div style={{
          position: 'absolute', inset: 0,
          overflow: 'hidden'
        }}>
          <img
            src="/images/higherorbits/gemini/cover-hero.jpg"
            alt="Teenage girl silhouette on a high-desert ridge looking up at the twilight sky"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
          {/* Dark gradient overlay for text legibility */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.15) 100%)'
          }} />
        </div>

        {/* Cover content */}
        <div className="ho-cover-inner" style={{
          position: 'relative',
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 40px',
          paddingBottom: 64,
          width: '100%'
        }}>
          {/* Title */}
          <h1 className="ho-body" style={{
            fontSize: 'clamp(56px, 10vw, 104px)',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            marginBottom: 32,
            textTransform: 'uppercase'
          }}>
            HIGHER ORBITS
          </h1>

          {/* Tagline — locked to "Ten Years to the Stars" */}
          <div style={{ marginBottom: 40 }}>
            <p className="ho-display" style={{
              fontSize: 'clamp(28px, 4.5vw, 52px)',
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.95)',
              lineHeight: 1.15,
              fontWeight: 400,
              margin: 0
            }}>
              Ten Years to the Stars
            </p>
          </div>

          {/* Subline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p className="ho-body" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, fontStyle: 'italic' }}>
              Inspiring the Next Generation of Scientists
            </p>
            <p className="ho-body" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              Crafted by Ahead of Market
            </p>
          </div>
        </div>
      </section>

      {/* ── S2: OUR INTENT ────────────────────────────── */}
      <LightSection id="our-intent" noBorderTop>
        <div className="ho-img-text-row" style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Image for tone — Gemini documentary interview portrait */}
          <div style={{ flex: '0 0 340px', minWidth: 260 }}>
            <ImgReal
              src="/images/higherorbits/gemini/inspo-2-interview-setup.jpg"
              alt="Documentary interview subject lit warmly with bokeh background"
              aspect="75%"
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <SectionTitle size="md">Our Intent</SectionTitle>

            <BodyP style={{ fontSize: 18, color: '#111', fontWeight: 500 }}>
              We want Higher Orbits to walk into the next ten years with the visibility the last ten have earned.
            </BodyP>

            <BodyP>
              For a decade, Michelle Lucas has built a program where students design real science experiments that fly to the International Space Station. The work is undeniable. The story is undertold. This film exists to change that — to put Higher Orbits in front of the donors, sponsors, press, and policymakers who should already know the name.
            </BodyP>

            <BodyP>
              We bring AOM's documentary craft to a story that doesn't need embellishment. It needs to be told well, told once, and used for years.
            </BodyP>
          </div>
        </div>
      </LightSection>

      {/* ── S3: CORE ELEMENTS ─────────────────────────── */}
      <LightSection id="core-elements">
        <div className="ho-core-grid" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '48px 40px', alignItems: 'start' }}>
          {/* Left: "Core Elements" label */}
          <div>
            <SectionTitle size="lg">Core Elements</SectionTitle>
          </div>

          {/* Right: three image + text bucket rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
            {/* The Hero Piece */}
            <div className="ho-core-bucket" style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 280px', minWidth: 240 }}>
                <ImgReal
                  src="/images/higherorbits/gemini/core-bucket-hero-piece.jpg"
                  alt="Young man on wood floor in front of tall window at dusk, watching stars emerge"
                  aspect="75%"
                />
              </div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="ho-body" style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 12 }}>The Hero Piece</div>
                <BodyP>
                  The centerpiece. A TV-quality documentary built around the 100th Go For Launch! event — the same Deerfield, Illinois high school where the first event happened in 2016, with the same astronaut who was there on day one. Michelle's origin story, the students who made it real, the full-circle moment that ten years of work was always building toward. This film lives in donor meetings, grant proposals, board presentations, and school assemblies for years after June.
                </BodyP>
              </div>
            </div>

            {/* The Campaign Pack — image RIGHT for layout rhythm */}
            <div className="ho-core-bucket" style={{ display: 'flex', flexDirection: 'row-reverse', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 280px', minWidth: 240 }}>
                <ImgReal
                  src="/images/higherorbits/gemini/core-bucket-campaign-pack.jpg"
                  alt="Hands holding a smartphone playing a vertical event video, warm side-light"
                  aspect="75%"
                />
              </div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="ho-body" style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 12 }}>The Campaign Pack</div>
                <BodyP>
                  Everything that lives around the hero piece and keeps the story moving. A 30-second pre-event teaser before Chicago. A 60–75 second recap ready within 48 hours of the event closing — while it's still news. Eight to ten short social cuts that let Higher Orbits' alumni, sponsors, and audience share the story on every channel they use. <em>We work together to select what goes out and when — nothing posts without Michelle's sign-off.</em> The campaign pack is what turns a June event into a months-long content engine.
                </BodyP>
              </div>
            </div>

            {/* The Living Archive */}
            <div className="ho-core-bucket" style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 280px', minWidth: 240 }}>
                <ImgReal
                  src="/images/higherorbits/gemini/core-bucket-living-archive.jpg"
                  alt="Wooden desk with contact sheet and prints under a warm brass desk lamp"
                  aspect="75%"
                />
              </div>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="ho-body" style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 12 }}>The Living Archive</div>
                <BodyP>
                  One hundred edited stills from the event and production. Eight to twelve terabytes of organized raw footage. A sponsor recognition package — credits, branded social templates, a thank-you clip — that Michelle can put in front of Chevron, BRPH, and board-level sponsors immediately after Chicago. The archive is Higher Orbits' permanent visual record of its most important milestone.
                </BodyP>
              </div>
            </div>
          </div>
        </div>
      </LightSection>

      {/* ── S4: THE HERO PIECE ─────────────────────────── */}
      <LightSection id="hero-piece">
        <div className="ho-img-text-row" style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Content column — FIRST so it appears LEFT on desktop */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <SectionTitle size="xl">The Hero Film</SectionTitle>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginTop: 12,
              marginBottom: 24,
              paddingBottom: 18,
              borderBottom: '1px solid rgba(0,0,0,0.08)'
            }}>
              <div style={{
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#555',
                fontWeight: 700
              }}>
                <span style={{ color: '#111' }}>Style</span>&nbsp;&nbsp;Documentary-style
              </div>
              <div style={{
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#555',
                fontWeight: 700
              }}>
                <span style={{ color: '#111' }}>Audience</span>&nbsp;&nbsp;Media / Press &nbsp;&middot;&nbsp; Sponsors / Funders
              </div>
            </div>

            <SubLabel>Objective</SubLabel>
            <BodyP>
              A documentary built in three acts. Michelle Lucas is the spine. The 100th Go For Launch! event in Deerfield is the present-tense centerpiece. The film is purpose-built for the rooms that grow Higher Orbits next: the press desks that decide what story to tell, and the sponsors and funders who decide what to invest in.
            </BodyP>

            <SubLabel>Structure</SubLabel>
            <BodyP style={{ marginBottom: 4, fontStyle: 'italic', color: '#555' }}>
              The Root, The Moment, The Ripple. Michelle's story bookends. The event is the meat.
            </BodyP>
            <StructureTable rows={[
              ['Act 1 — The Root (Past)', (
                <span style={{ fontStyle: 'normal' }}>
                  Open on Michelle Lucas — but frame her for someone who may be meeting her for the first time. Establish her credibility and humanity in the same breath: who she was before Higher Orbits, the defining moments that drove her to build something, and the mission she's been quietly executing for a decade. A simple day in her life grounds the viewer before the scale of the story lands. Weave in one alumni, staff member, or student whose background adds texture — a real face that shows funders and press who this program actually reaches.
                </span>
              )],
              ['Act 2 — The Moment (Present)', (
                <span style={{ fontStyle: 'normal' }}>
                  Place the viewer inside the 10th Anniversary and 100th Go For Launch! session. For press, this is the news hook — a milestone worth covering. For sponsors, this is proof of concept — a decade of execution in one room. Highlight Alexis's story or a standout project or upcoming event to show the program has velocity, not just history.
                </span>
              )],
              ['Act 3 — The Ripple (Future)', (
                <span style={{ fontStyle: 'normal' }}>
                  Make the case for why this matters beyond the milestone. For funders, this is the investment thesis — Michelle's influence on students is compounding. For media, this is the larger cultural story — what happens when someone builds something that genuinely works? Close with forward momentum and a clear sense that the next 10 years are just beginning.
                </span>
              )]
            ]} />

            <Distribution>
              Premier at the Deerfield event itself — the room where it all started. Post to YouTube for search visibility and permanent reach. Share on LinkedIn, where donors, sponsors, and aerospace professionals actually watch. Distribute in every Higher Orbits grant proposal, donor meeting, and board presentation going forward. The hero piece doesn't expire — it earns its keep for years.
            </Distribution>
          </div>

          {/* Image column — SECOND so it appears RIGHT on desktop */}
          <div style={{ flex: '0 0 340px', minWidth: 260 }}>
            <ImgReal
              src="/images/higherorbits/gemini/hero-film-section.jpg"
              alt="Young woman scientist at lab workbench under warm desk lamp, holding small breadboard experiment hardware"
              aspect="66%"
            />
          </div>
        </div>
      </LightSection>

      {/* ── S5: MEET THE ALUMNI ────────────────────────── */}
      <LightSection id="alumni">
        <div className="ho-img-text-row" style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Content — FIRST so it appears LEFT on desktop */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <SectionTitle size="xl">Meet the Alumni</SectionTitle>

            <SubLabel>Objective</SubLabel>
            <BodyP>
              Put real student and alumni voices at the center of the story. Higher Orbits' difference isn't the curriculum — it's the result: experiments that actually flew, students who actually built them, STEM careers and paths that actually changed. The alumni are the proof. This section of the film is the through-line Michelle explicitly asked for.
            </BodyP>

            <SubLabel>Content</SubLabel>
            <ContentTable rows={[
              ['Specifics', 'Student and alumni interview segments woven throughout the hero piece and available as standalone cuts for grant and donor use.'],
              ['Focus', 'The journey — from a Go For Launch! workshop to a STEM career, a university engineering program, ongoing involvement in spaceflight, or simply the confidence that comes from having built something real and watched it leave the atmosphere.'],
              ['Visuals', 'Alumni in their environments today: labs, research settings, workplaces. Students mid-build and mid-presentation. Archival moments from past events cut against present-day Chicago coverage. The astronaut mentor layer: professionals who give their time because the mission genuinely matters, captured in a way that shows it.']
            ]} />

            <Distribution>
              Alumni and mentors sharing their own cuts through their own networks — the reach multiplier that no amount of Higher Orbits' own posting could replicate. Recruitment content for future Go For Launch! participants: a student watching another student's story is the most powerful pitch for the program that exists. Sponsor and grant presentations showing real outcomes, not projected ones.
            </Distribution>
          </div>

          {/* Image — SECOND so it appears RIGHT on desktop */}
          <div style={{ flex: '0 0 340px', minWidth: 260 }}>
            <ImgReal
              src="/images/higherorbits/gemini/alumni-section.jpg"
              alt="Young Black woman STEM professional in white lab coat at research bench"
              aspect="66%"
            />
          </div>
        </div>
      </LightSection>

      {/* ── S7: SPONSORSHIP ───────────────────────────── */}
      <LightSection id="sponsorship">
        <div>
          {/* Content */}
          <div style={{ maxWidth: 800 }}>
            <SectionTitle size="xl">Empowering Impact Through Partnership</SectionTitle>

            <BodyP>
              Higher Orbits' existing sponsor relationships are one of the strongest assets it has. Chevron, BRPH, and board-level donors are already part of this story. The campaign gives Michelle a vehicle to deepen those relationships and open the door to new ones — because sponsors gain something real: recognition inside a film that will be watched for years, not a logo on a banner that disappears after the event.
            </BodyP>

            <BodyP>
              Higher Orbits invites corporate sponsors to join the story being told at its most powerful moment. For sponsors in the STEM education and aerospace space, being named inside a film about the 100th Go For Launch! event is not just a marketing placement — it is a credible, mission-driven alignment that corporate social responsibility programs are actively looking for.
            </BodyP>

            <SubLabel>Sponsorship Benefits</SubLabel>

            <BenefitBlock number="1" title="Recognition in the Film">
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li style={{ marginBottom: 6 }}>Prominent logo placement in the film credits and opening sequence.</li>
                <li style={{ marginBottom: 6 }}>Named mention in promotional materials, donor email communications, and press outreach.</li>
                <li>Every time the hero piece is screened — at a board meeting, a school assembly, a grant panel — the sponsor's name is in the room.</li>
              </ul>
            </BenefitBlock>

            <BenefitBlock number="2" title="Custom Tailored Storytelling Video">
              <p style={{ marginBottom: 12 }}>A professionally produced 2–3 minute branded video that tells the sponsor's story alongside Higher Orbits — their commitment to STEM education, their partnership with a program that has actually sent student experiments to the International Space Station.</p>
              <p style={{ marginBottom: 16, fontStyle: 'italic', color: '#555' }}>Perfect for the sponsor's own website, board presentations, and corporate social platforms.</p>

              {/* Option A — included for top-tier sponsors (locked) */}
              <div style={{
                background: 'rgba(0,0,0,0.05)',
                borderLeft: '3px solid rgba(0,0,0,0.2)',
                borderRadius: '0 3px 3px 0',
                padding: '18px 20px',
                marginTop: 16
              }}>
                <p className="ho-body" style={{ fontSize: 15, color: '#1a1a1a', lineHeight: 1.65, margin: 0 }}>
                  <strong>Included for top-tier sponsors (Chevron-level).</strong> The branded video is built from the same Chicago shoot and delivered alongside the hero piece — no additional charge. Michelle can use this directly in sponsor conversations: <em>"Come in at the top-tier level and we'll produce your company's story from the same shoot."</em>
                </p>
                <p className="ho-body" style={{ fontSize: 13, color: '#777', marginTop: 10, marginBottom: 0, fontStyle: 'italic' }}>
                  Custom branded videos for non-Chevron-tier sponsors available as an add-on ($5–8K per sponsor).
                </p>
              </div>
            </BenefitBlock>

            <BenefitBlock number="3" title="Visibility Across Campaign Assets">
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li style={{ marginBottom: 6 }}>Featured in social media posts, event-day social graphics, and campaign email content throughout the run-up and post-event window.</li>
                <li style={{ marginBottom: 6 }}>Co-branded recognition at the Deerfield event and across the online presence.</li>
                <li>Inclusion in the sponsor recognition package AOM builds from the Chicago footage — credits integration, branded social post templates, and a 60–90 second thank-you highlight clip for donor email campaigns.</li>
              </ul>
            </BenefitBlock>
          </div>
        </div>
      </LightSection>

      {/* ═══════════════════════════════════════════════════
          ACT 2 — PROVE THE WORK
      ═══════════════════════════════════════════════════ */}

      {/* ── S8: PROJECT DELIVERABLES ──────────────────── */}
      <LightSection id="deliverables">
        <SectionTitle size="xl">Project Deliverables</SectionTitle>

        <AZCTTable
          headers={['Project Deliverable', 'Amount', 'Timeline']}
          rows={[
            ['Hero Documentary', '1', 'End of July 2026 — 3–5 min final cut. Opening (Michelle\'s NASA origin + 2016 Deerfield gym) → Middle (alumni voices + 24 ISS experiments) → End (100th event, full circle).'],
            ['Pre-Event Teaser', '1', '7 days before the June event — 30 sec, built from pre-production material and early Chicago footage.'],
            ['48-Hour Recap', '1', 'Within 48 hours of event close — 60–75 sec, share-ready for social, email, and press while the moment is still news.'],
            ['Social Cuts Pack', '8–10 short verticals', 'End of July 2026 — 4 alumni/student voice reels (15–30 sec), 2 Michelle highlights (30–45 sec), 2 event-day energy cuts (15–20 sec), 1–2 Dorothy/astronaut moments (20–30 sec).'],
            ['Hero Photo Set', '100 edited stills', 'End of July 2026 — 50 event-day (ceremony, presentations, crowd), 25 interview/portrait (Michelle, Dorothy, student subjects), 25 B-roll and production documentation.'],
            ['Raw Footage Archive', '8–12 TB', 'At final delivery — all raw Chicago footage organized by shoot day and subject, delivered on a portable hard drive. Higher Orbits owns this archive permanently.'],
            ['Sponsor Recognition Package', 'Included', 'Logo in film credits and opening sequence. One branded social post template for Chevron, BRPH, and board sponsors. One 60–90 sec thank-you highlight clip for donor communications.'],
          ]}
        />
      </LightSection>

      {/* ── S9: PROJECT TIMELINE ──────────────────────── */}
      <LightSection id="timeline">
        <SectionTitle size="xl">Project Timeline</SectionTitle>

        <AZCTTable
          headers={['Phase', 'Duration', 'Team', 'Details']}
          rows={[
            ['Pre-Production', '10–12 planning days', '3', 'Alignment sessions with Michelle; subject selection and interview outlines; shot list; alumni intro calls; access and logistics coordination with Higher Orbits; travel booking; teaser material prep.'],
            ['Chicago — Travel', '2 days', '3', 'PHX → Chicago (day in), Chicago → PHX (day out).'],
            ['Chicago — Production', '4 days on-ground', '3', 'Two cameras running simultaneously throughout. Full event-day coverage. Michelle documentary interview. Dorothy Metcalf-Lindenburger interview. Student team interviews and B-roll. Stills throughout every day.'],
            ['Post — 48-Hour Recap', '1.5–2 days', '1–2', 'Urgency-mode edit from event footage. Hard 48-hour delivery window from event close.'],
            ['Post — Hero Piece', '6–8 days', '1–2', 'Rough assembly → assembly cut → fine cut (Michelle review round) → revisions → final master. One revision round included.'],
            ['Post — Social Cuts', '3–4 days', '1', '8–10 verticals, batched from hero footage selects.'],
            ['Post — Photos + Sponsor Package', '3 days', '1', 'Photo culling (400–600 raws → 100 finals) + grading; credits integration, social template, thank-you clip.'],
            ['Collaborative Review', '2 sessions', '2–3', 'Rough cut review with Michelle (session 1). Final approval before delivery (session 2). One revision round included.'],
            ['Total', '~10 weeks (May–July 2026)', '', 'Full delivery by end of July 2026.'],
          ]}
          lastRowBold
          highlightLast
        />
      </LightSection>

      {/* ── S10: PROJECT BUDGET SUMMARY ───────────────── */}
      <LightSection id="budget">
        <SectionTitle size="xl">Project Budget Summary</SectionTitle>

        <AZCTTable
          headers={['Budget Items', 'Information', 'Team Involved', 'Cost']}
          rows={[
            ['Shooting Labor', '4 production days in Chicago × 3 people', '3', '$5,600'],
            ['Travel Labor', '2 travel days × 3 people (full working rate)', '3', '$2,800'],
            ['Post Production Labor', '13.5 days — hero piece, recap, teaser, social cuts, photo edit, sponsor package', '1–2', '$7,250'],
            ['Pre-Production & Wrap', 'Planning, logistics, shot list, interview prep', '3', '$1,400'],
            ['Travel + Accommodations', 'PHX ↔ Chicago RT × 3 + Deerfield hotel 4.5 nights × 3 rooms + rideshares', '3', '$4,110'],
            ['Per Diems', '$75/day × 3 people × 5 days', '3', '$1,125'],
            ['Music & Rights', 'Sync licensing — hero, recap, teaser, and social cuts', '—', '$700'],
            ['Storage, Archive & Gear', '12TB archive drive + cloud backup + production insurance + overhead', '—', '$1,950'],
            ['Contingency', '', '', '$3,065'],
            ['', '', '', '$28,000'],
          ]}
          highlightLast
        />

        <p className="ho-body" style={{
          fontSize: 14,
          color: '#666',
          marginTop: 20,
          fontStyle: 'italic'
        }}>
          Payment: one-third to confirm and book travel, one-third at end of the Chicago shoot, final third at delivery.
        </p>
      </LightSection>

      {/* ═══════════════════════════════════════════════════
          CODA — REINFORCE + CLOSE
      ═══════════════════════════════════════════════════ */}

      {/* ── S11: WHY DOES THIS MATTER ─────────────────── */}
      <DarkSection id="why-it-matters">
        <div className="ho-why-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <h2 className="ho-body" style={{
              fontSize: 40,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.1,
              letterSpacing: '-0.01em'
            }}>
              Why Does This Matter?
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <p className="ho-body" style={{ fontSize: 20, color: '#fff', lineHeight: 1.5, fontWeight: 500 }}>
              Reach the donors, sponsors, and institutions who should be funding Higher Orbits — but haven't found it yet. The 100th event is the moment this story earns its largest possible audience.
            </p>
            <p className="ho-body" style={{ fontSize: 20, color: '#fff', lineHeight: 1.5, fontWeight: 500 }}>
              Establish Higher Orbits as the most visible student spaceflight program in the country, at the moment it has earned that position. Twenty-four experiments flown. Three thousand alumni. A hundred events. The credibility is already there. The story just needs to be told at scale.
            </p>
            <p className="ho-body" style={{ fontSize: 20, color: '#fff', lineHeight: 1.5, fontWeight: 500 }}>
              Reinforce that this is a launch point, not a finish line. Higher Orbits is thriving and just getting started. The 100th milestone is a beginning.
            </p>
            <p className="ho-body" style={{ fontSize: 20, color: '#fff', lineHeight: 1.5, fontWeight: 500 }}>
              Build a permanent media archive — social proof and evergreen content that travels into every grant proposal, donor meeting, school assembly, and sponsor deck for years. The archive outlasts the anniversary cycle.
            </p>
            <p className="ho-body" style={{ fontSize: 20, color: '#fff', lineHeight: 1.5, fontWeight: 500 }}>
              Honor the decade of work: Michelle's origin, the alumni who built their futures at a Go For Launch! workshop, the astronauts who showed up year after year because the mission genuinely matters.
            </p>
          </div>
        </div>
      </DarkSection>

      {/* ── S13: VISUAL INSPIRATION ───────────────────── */}
      <DarkSection id="visual-inspiration">
        <div className="ho-inspo-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
          <div>
            <h2 className="ho-body" style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Visual Inspiration</h2>
            <p className="ho-body" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
              "The Story of Higher Orbits Is Ready to Be Told."
            </p>
          </div>
          <div style={{ maxWidth: 300 }}>
            <p className="ho-body" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'right', lineHeight: 1.5 }}>
              Reference frames for the visual aesthetic we bring to Chicago.
            </p>
          </div>
        </div>

        {/* 4×1 desktop / 2×2 mobile — cohesive documentary stills */}
        <div className="ho-inspo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { src: '/images/higherorbits/gemini/inspo-1-student-presenting.jpg', alt: 'High school student holding clear experiment housing, mid-sentence to classmates' },
            { src: '/images/higherorbits/gemini/inspo-2-interview-setup.jpg', alt: 'Documentary interview subject lit warmly with bokeh background' },
            { src: '/images/higherorbits/gemini/hero-film-section.jpg', alt: 'Young woman scientist at lab workbench, contemplative' },
            { src: '/images/higherorbits/gemini/alumni-section.jpg', alt: 'Young Black woman STEM professional in lab coat at research bench' },
          ].map((img, i) => (
            <div key={i} style={{ aspectRatio: '16/10', borderRadius: 2, overflow: 'hidden' }}>
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))}
        </div>
      </DarkSection>

      {/* ── S15: LET'S BRING THIS VISION TO LIFE ─────── */}
      <DarkSection id="cta">
        <div style={{ maxWidth: 900 }}>
          <h2 className="ho-body" style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            marginBottom: 40
          }}>
            Let's Bring This Vision To Life
          </h2>

          <div style={{ marginBottom: 48 }}>
            <p className="ho-body" style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontFamily: 'JetBrains Mono, monospace',
              marginBottom: 20
            }}>
              Next Steps
            </p>
            <div className="ho-cta-steps" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {[
                'Confirm the June event date',
                'Begin pre-production immediately',
                'Collaborate closely to ensure alignment every step of the way'
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span className="ho-body" style={{
                    fontSize: 17,
                    color: '#fff',
                    fontWeight: 600,
                    lineHeight: 1.4
                  }}>
                    {step}
                  </span>
                  {i < 2 && (
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 22, margin: '0 4px', alignSelf: 'center' }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ textAlign: 'right' }}>
              <p className="ho-body" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginBottom: 6 }}>Questions?</p>
              <p className="ho-body" style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>
                Call or Text Patrik{' '}
                <a href="tel:+16023732164" style={{ color: '#fff', textDecoration: 'none' }}>602.373.2164</a>
              </p>
            </div>
          </div>
        </div>
      </DarkSection>

      {/* ── S16: THANK YOU ────────────────────────────── */}
      <section style={{
        background: '#000',
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ textAlign: 'center' }}>
          {/* AOM Logo — text-based since we don't have the SVG path here */}
          <div style={{
            width: 120, height: 120,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <span className="ho-body" style={{
              fontWeight: 800,
              fontSize: 15,
              color: '#fff',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>AOM</span>
          </div>
          <p className="ho-body" style={{
            color: '#fff',
            fontSize: 22,
            fontWeight: 500
          }}>Thank you!</p>
          <p className="ho-body" style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 13,
            marginTop: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: 'JetBrains Mono, monospace'
          }}>Ahead of Market</p>
        </div>
      </section>
    </div>
  );
}
