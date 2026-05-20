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
  const sizes = {
    sm: { fontSize: 18, fontWeight: 700 },
    md: { fontSize: 22, fontWeight: 700 },
    lg: { fontSize: 28, fontWeight: 700 },
    xl: { fontSize: 36, fontWeight: 800 },
  };
  return (
    <h2 className="ho-body" style={{
      ...sizes[size],
      color: '#111',
      lineHeight: 1.15,
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
      <table style={{
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
              <tr key={ri} style={{
                background: isHighlighted ? '#111' : ri % 2 === 0 ? '#fff' : '#fafaf9',
              }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: '14px 18px',
                    borderBottom: `1px solid ${isHighlighted ? 'rgba(255,255,255,0.1)' : '#e5e2de'}`,
                    borderRight: ci < row.length - 1 ? `1px solid ${isHighlighted ? 'rgba(255,255,255,0.1)' : '#e5e2de'}` : 'none',
                    color: isHighlighted ? '#fff' : '#111',
                    fontWeight: isHighlighted || (lastRowBold && isLast) ? 700 : 400,
                    fontSize: isHighlighted ? 16 : 15,
                    textAlign: ci === 0 ? 'left' : ci === row.length - 1 ? 'right' : 'center',
                    verticalAlign: 'top',
                    lineHeight: 1.5
                  }}>
                    {cell}
                  </td>
                ))}
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
            <tr key={i} style={{ borderBottom: '1px solid #e5e2de' }}>
              <td style={{
                width: 110,
                padding: '16px 18px',
                fontWeight: 700,
                color: '#111',
                verticalAlign: 'top',
                whiteSpace: 'nowrap',
                borderRight: '1px solid #e5e2de'
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
      borderBottom: '1px solid #e5e2de',
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
      style={{
        background: '#fff',
        borderTop: noBorderTop ? 'none' : '1px solid #e5e2de',
        padding: '80px 0'
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }}>
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
      style={{
        background: '#000',
        padding: '100px 0'
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }}>
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
    <div className="ho-body" style={{ background: '#fff', color: '#111', minHeight: '100vh' }}>
      <style>{FONTS}</style>

      {/* ═══════════════════════════════════════════════════
          ACT 1 — SELL THE VISION
      ═══════════════════════════════════════════════════ */}

      {/* ── S1: COVER ─────────────────────────────────── */}
      <section id="cover" style={{ background: '#000', position: 'relative', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {/* Hero photo placeholder */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b2e 30%, #102038 60%, #0a1520 100%)',
          overflow: 'hidden'
        }}>
          {/* Starfield / space gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 30% 50%, rgba(30,60,100,0.4) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(60,30,80,0.3) 0%, transparent 50%)',
          }} />
          <div style={{
            position: 'absolute', top: 0, right: 0, width: '60%', height: '100%',
            background: 'linear-gradient(to bottom left, rgba(20,80,160,0.15) 0%, transparent 60%)',
          }} />
          {/* Center placeholder text */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.2)',
              textAlign: 'center'
            }}>
              Hero photo<br />Students with hardware · Astronaut with students<br />Go For Launch! event in motion
            </div>
          </div>
          {/* Dark gradient overlay for text legibility */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.2) 100%)'
          }} />
        </div>

        {/* Cover content */}
        <div style={{
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

          {/* Tagline decision */}
          <div style={{ marginBottom: 40 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 16
            }}>
              ⚑ Tagline — Patrik picks one before sharing
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {['Ten Years to the Stars', 'From Classroom to Orbit', 'The Story of Higher Orbits'].map((tag, i) => (
                <div key={i} style={{
                  border: '1.5px dashed rgba(232,93,38,0.7)',
                  borderRadius: 4,
                  padding: '10px 18px',
                  background: 'rgba(232,93,38,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    color: '#E85D26',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase'
                  }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{
                    fontFamily: 'Hanken Grotesk, system-ui, sans-serif',
                    fontSize: 17,
                    color: '#fff',
                    fontStyle: 'italic'
                  }}>
                    "{tag}"
                  </span>
                </div>
              ))}
            </div>
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

      {/* ── S2: CORE MISSION ───────────────────────────── */}
      <LightSection id="core-mission" noBorderTop>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <SectionTitle size="md">Core Mission</SectionTitle>

          {/* Michelle's pullquote */}
          <blockquote style={{
            fontFamily: 'Instrument Serif, Georgia, serif',
            fontSize: 'clamp(20px, 3vw, 28px)',
            lineHeight: 1.5,
            color: '#111',
            fontStyle: 'italic',
            margin: '0 0 40px',
            padding: 0,
            border: 'none'
          }}>
            "I would be highly honored to have you create a story around my legacy and how I created Higher Orbits."
          </blockquote>
          <p className="ho-body" style={{ fontSize: 14, color: '#666', marginBottom: 48 }}>
            — Michelle Lucas, Founder &amp; CEO, Higher Orbits
          </p>
        </div>

        {/* Formula decision */}
        <DecisionWrapper
          title="Pick one formula before sharing with Michelle"
          options={[
            <><strong>Legacy formula:</strong> Legacy = Founder + Alumni + Mission</>,
            <><strong>Proof formula:</strong> 10 Years = 24 Experiments + 3,000 Students + 100 Events</>
          ]}
        />

        {/* Visual formula - render both */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, marginTop: 48, justifyContent: 'center' }}>
          {[
            {
              label: 'DRAFT OPTION A',
              items: ['Legacy', '=', 'Founder', '+', 'Alumni', '+', 'Mission']
            },
            {
              label: 'DRAFT OPTION B',
              items: ['10 Years', '=', '24 Experiments', '+', '3,000 Students', '+', '100 Events']
            }
          ].map((formula, fi) => (
            <div key={fi} style={{
              flex: 1, minWidth: 260,
              border: fi === 0 ? '1.5px dashed rgba(232,93,38,0.6)' : '1.5px dashed rgba(232,93,38,0.4)',
              borderRadius: 6,
              padding: '24px 20px',
              background: 'rgba(232,93,38,0.02)'
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#E85D26',
                marginBottom: 16
              }}>{formula.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                {formula.items.map((item, ii) => {
                  const isOp = item === '=' || item === '+';
                  return (
                    <div key={ii} style={{ textAlign: 'center' }}>
                      {!isOp ? (
                        <div>
                          <div style={{
                            width: 72, height: 56,
                            background: '#e8e4df',
                            borderRadius: 4,
                            marginBottom: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <span style={{ fontSize: 10, color: '#888', fontFamily: 'JetBrains Mono' }}>photo</span>
                          </div>
                          <p className="ho-body" style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{item}</p>
                        </div>
                      ) : (
                        <p className="ho-body" style={{ fontSize: 22, fontWeight: 700, color: '#111', marginBottom: 24 }}>{item}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Body paragraph */}
        <div style={{ maxWidth: 780, margin: '48px auto 0' }}>
          <BodyP>
            Higher Orbits built something most nonprofit founders only dream about: a program where high school students design real scientific experiments, watch them leave the atmosphere, and see astronauts conduct them aboard the International Space Station. Ten years of doing that — 24 experiments flown, 3,000 student alumni, 100 events across 23 states — and the broader world still doesn't know the name.
          </BodyP>
          <BodyP style={{ fontWeight: 600 }}>That changes with this campaign.</BodyP>
        </div>
      </LightSection>

      {/* ── S3: CORE ELEMENTS ─────────────────────────── */}
      <LightSection id="core-elements">
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '48px 40px', alignItems: 'start' }}>
          {/* Left: "Core Elements" label */}
          <div>
            <SectionTitle size="lg">Core Elements</SectionTitle>
          </div>

          {/* Right: three stacked element rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
            {/* The Hero Piece */}
            <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 340px', minWidth: 240 }}>
                <ImgPlaceholder aspect="62%" label="Go For Launch! · 100th event · Deerfield gymnasium" />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="ho-body" style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 12 }}>The Hero Piece</div>
                <BodyP>
                  The centerpiece. A TV-quality documentary built around the 100th Go For Launch! event — the same Deerfield, Illinois high school where the first event happened in 2016, with the same astronaut who was there on day one. Michelle's origin story, the students who made it real, the full-circle moment that ten years of work was always building toward. This film lives in donor meetings, grant proposals, board presentations, and school assemblies for years after June.
                </BodyP>
              </div>
            </div>

            {/* The Campaign Pack */}
            <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 340px', minWidth: 240 }}>
                <ImgPlaceholder aspect="62%" label="Social content · Recap cuts · Event energy" />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="ho-body" style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 12 }}>The Campaign Pack</div>
                <BodyP>
                  Everything that lives around the hero piece and keeps the story moving. A 30-second pre-event teaser before Chicago. A 60–75 second recap ready within 48 hours of the event closing — while it's still news. Eight to ten short social cuts that let Higher Orbits' alumni, sponsors, and audience share the story on every channel they use. The campaign pack is what turns a June event into a months-long content engine.
                </BodyP>
              </div>
            </div>

            {/* The Living Archive */}
            <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '0 0 340px', minWidth: 240 }}>
                <ImgPlaceholder aspect="62%" label="Photo archive · Raw footage · Sponsor package" />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
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
        <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Images column */}
          <div style={{ flex: '0 0 340px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ImgPlaceholder aspect="58%" label="Documentary cinematic setup" />
            <ImgPlaceholder aspect="58%" label="Go For Launch! event — Deerfield gym" />
            <ImgPlaceholder aspect="58%" label="Production crew / filming on location" />
          </div>

          {/* Content column */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <SectionTitle size="xl">The Hero Film</SectionTitle>

            <SubLabel>Objective</SubLabel>
            <BodyP>
              A film built on a Past / Present / Future arc. Michelle's story is the spine. The 100th Go For Launch! event in Deerfield — same high school gym where it all began in 2016, with Dorothy Metcalf-Lindenburger returning — is the present-tense centerpiece. The conclusion looks forward to the next decade. A film built for every room Higher Orbits will ever need to walk into: donor meetings, grant panels, school assemblies, board presentations, and the world at large.
            </BodyP>

            <SubLabel>Structure</SubLabel>
            <BodyP style={{ marginBottom: 4, fontStyle: 'italic', color: '#555' }}>
              Past, Present, Future. Michelle's story bookends. The event is the meat.
            </BodyP>
            <StructureTable rows={[
              ['Intro — Michelle\'s Story (Past)', (
                <span style={{ fontStyle: 'normal' }}>
                  Who Michelle is and how she got here. NASA flight controller. The founding of Higher Orbits. A simple day-in-the-life — what her actual work looks like. How she's shaped alumni over ten years. <em style={{ fontStyle: 'italic' }}>Add-in:</em> a background story on one alumnus, staff member, or student whose path she changed.
                </span>
              )],
              ['Meat — The Day Of (Present)', (
                <span style={{ fontStyle: 'normal' }}>
                  The 100th Go For Launch! event in Deerfield. The ten-year anniversary moment. The room, the students, Dorothy walking in, the experiments getting handed off. This is the heart of the film — the present-tense proof that the work is alive and accelerating. <em style={{ fontStyle: 'italic' }}>Add-in:</em> an Alexis cover story, OR a highlight on a new project or upcoming Go For Launch! event in motion.
                </span>
              )],
              ['Conclusion — Why She Inspires (Future)', (
                <span style={{ fontStyle: 'normal' }}>
                  Why Michelle keeps doing this. Why the next ten years matter more than the last ten. Forward-looking voices — students just entering the program, mentors signing on for the next decade, sponsors who see the runway. The 100th event is not a finish line. It's a launch.
                </span>
              )]
            ]} />

            <Distribution>
              Premier at the Deerfield event itself — the room where it all started. Post to YouTube for search visibility and permanent reach. Share on LinkedIn, where donors, sponsors, and aerospace professionals actually watch. Distribute in every Higher Orbits grant proposal, donor meeting, and board presentation going forward. The hero piece doesn't expire — it earns its keep for years.
            </Distribution>
          </div>
        </div>
      </LightSection>

      {/* ── S5: MEET THE ALUMNI ────────────────────────── */}
      <LightSection id="alumni">
        <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Images */}
          <div style={{ flex: '0 0 340px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ImgPlaceholder aspect="65%" label="Alumni in their professional environment today" />
            <ImgPlaceholder aspect="65%" label="Student teams mid-build · workshop presentation" />
            <ImgPlaceholder aspect="65%" label="Astronaut mentor at Go For Launch! event" />
          </div>

          {/* Content */}
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
        </div>
      </LightSection>

      {/* ── S6: ENGAGE THE COMMUNITY ───────────────────── */}
      <LightSection id="community">
        <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Images */}
          <div style={{ flex: '0 0 340px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ImgPlaceholder aspect="65%" label="Team working on edit · post-production" />
            <ImgPlaceholder aspect="65%" label="Social media · phone · content in hand" />
            <ImgPlaceholder aspect="65%" label="Color grading · DaVinci Resolve" />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <SectionTitle size="xl">Engage the Community</SectionTitle>

            <SubLabel>Objective</SubLabel>
            <BodyP>
              Build a media footprint around the anniversary that lives well beyond June — content that travels further than the event itself ever could and keeps working for Higher Orbits long after Chicago.
            </BodyP>

            <SubLabel>Collaborative Approach</SubLabel>
            <BodyP>
              We work with Michelle and the Higher Orbits team to select what goes out and when. Nothing posts without sign-off. The process is collaborative, not handed over.
            </BodyP>

            <div className="ho-body" style={{ fontWeight: 700, fontSize: 18, color: '#111', marginTop: 28, marginBottom: 16 }}>
              Postable Content <em style={{ fontWeight: 400, fontSize: 16, color: '#555' }}>(Not just a bunch of stuff)</em>
            </div>

            <PostableRow label="Pre-Event Teaser" text="30 seconds. Built from pre-production material and early Chicago footage. Delivered 7 days before the Deerfield event for social and email distribution. Builds anticipation among the donor and alumni network in the week before the 100th milestone happens." />
            <PostableRow label="48-Hour Recap" text="60–75 seconds. Finished the night of the event, delivered within 48 hours of closing. The milestone while it's still news — shareable immediately for social, email, and press." />
            <PostableRow label="Social Cuts" text="8–10 short verticals from the hero footage. Four alumni and student voice reels (15–30 sec), two Michelle and founder highlight cuts (30–45 sec), two event-day energy cuts (15–20 sec), one to two Dorothy and astronaut mentor moments (20–30 sec). Instagram, TikTok, LinkedIn — the story lands where people actually scroll." />
            <PostableRow label="Photos" text="100 edited stills from the full shoot. 50 event-day (ceremony, student presentations, crowd energy), 25 interview and portrait (Michelle, Dorothy, student subjects — cinematic and lit), 25 B-roll and production documentation. Press kit, donor newsletter, grant applications, social graphics." />

            <Distribution>
              Higher Orbits' own social channels. Email to the existing donor and alumni list. Press outreach to aerospace, STEM, and education media. Website as the permanent archive — every asset lives there.
            </Distribution>
          </div>
        </div>
      </LightSection>

      {/* ── S7: SPONSORSHIP ───────────────────────────── */}
      <LightSection id="sponsorship">
        <div style={{ display: 'flex', gap: 60, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Images */}
          <div style={{ flex: '0 0 340px', minWidth: 260, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ImgPlaceholder aspect="65%" label="Event crowd · community gathering" />
            <ImgPlaceholder aspect="65%" label="Corporate partnership · professional presentation" />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 280 }}>
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

              {/* Decision: Option A vs B */}
              <DecisionWrapper
                title="Two options for the custom video — pick one before sharing with Michelle"
                options={[
                  <>
                    <strong>Option A (Included for top-tier sponsors — Recommended):</strong> The custom branded video is included as part of the campaign for Chevron-level sponsors at no additional charge. Michelle can use this to actively recruit top-tier sponsors: <em>"Come in at the top-tier level and we will produce your company's story from the same shoot."</em> This creates a real financial incentive for sponsors to enter at the highest tier and gives Michelle leverage in sponsor conversations she wouldn't otherwise have. One extra post-production day per sponsor; cost is absorbed in the campaign margin.
                  </>,
                  <>
                    <strong>Option B (Upsell at additional cost):</strong> The branded video is offered as an add-on for ~$5,000–$8,000 per sponsor, available to any sponsor who wants one. Generates incremental revenue per sponsor. Better fit if Higher Orbits has many mid-tier sponsors who would each want their own piece independently.
                  </>
                ]}
              />
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', flexWrap: 'wrap' }}>
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
              Establish Higher Orbits as the most visible student spaceflight program in the country, at the moment it has earned that position. Twenty-four experiments flown. Three thousand alumni. A hundred events.
            </p>
            <p className="ho-body" style={{ fontSize: 20, color: '#fff', lineHeight: 1.5, fontWeight: 500 }}>
              Honor the decade of work: Michelle's origin, the alumni who built their futures at a Go For Launch! workshop, the astronauts who showed up year after year because the mission genuinely matters.
            </p>
          </div>
        </div>
      </DarkSection>

      {/* ── S12: BIG PICTURE BENEFITS ─────────────────── */}
      <LightSection id="big-picture">
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <SectionTitle size="xl">Big Picture Benefits for Higher Orbits</SectionTitle>
        </div>
        <div style={{ maxWidth: 720, margin: '40px auto 0', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <BodyP style={{ fontSize: 18, fontWeight: 500, color: '#111' }}>
            Reinforce that Higher Orbits is thriving — with 24 experiments to the ISS, 3,000 alumni, and 100 events across 23 states — and is just getting started. The 100th milestone is not a conclusion. It is a launch point.
          </BodyP>
          <BodyP style={{ fontSize: 18, fontWeight: 500, color: '#111' }}>
            Create a permanent media archive of social proof and evergreen content that travels into every grant proposal, donor meeting, school assembly, and sponsor deck for years to come. The archive outlasts the anniversary cycle.
          </BodyP>
          <BodyP style={{ fontSize: 18, fontWeight: 500, color: '#111' }}>
            Expand Higher Orbits' brand presence across YouTube, LinkedIn, Instagram, and the press outlets covering STEM education and commercial spaceflight. The campaign we build from the June footage is the foundation for everything that follows.
          </BodyP>
        </div>
      </LightSection>

      {/* ── S13: VISUAL INSPIRATION ───────────────────── */}
      <DarkSection id="visual-inspiration">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
          <div>
            <h2 className="ho-body" style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Visual Inspiration</h2>
            <p className="ho-body" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
              "The Story of Higher Orbits Is Ready to Be Told."
            </p>
          </div>
          <div style={{ maxWidth: 300 }}>
            <p className="ho-body" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'right', lineHeight: 1.5 }}>
              This is inspiration only — reference frames for the visual aesthetic we bring to Chicago. We do not own these images.
            </p>
          </div>
        </div>

        {/* 4-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            'Close-up vérité interview',
            'Students mid-build with hardware',
            'Interview with depth of field — warm natural light',
            'Event energy — crowd and astronaut',
            'Classroom tools and workspaces',
            'Portrait with gravity — documentary style',
            'Alumni in professional environments',
            'Mentor and student moment',
            'Go For Launch! ceremony',
            'Equipment and lab settings',
            'Archival event footage',
            'Mission control aesthetic'
          ].map((label, i) => (
            <div key={i} style={{ aspectRatio: '16/10', background: 'rgba(255,255,255,0.08)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.4 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </DarkSection>

      {/* ── S14: VISUAL INSPIRATION (cont.) ───────────── */}
      <DarkSection id="visual-inspiration-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
          <div>
            <h2 className="ho-body" style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Visual Inspiration</h2>
            <p className="ho-body" style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
              "The Future of Higher Orbits Is Bright."
            </p>
          </div>
          <p className="ho-body" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', maxWidth: 300, textAlign: 'right', lineHeight: 1.5 }}>
            Reference images for interview and subject-focused coverage — the alumni, the mentors, the students.
          </p>
        </div>

        {/* 3-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            'Alumni in university lab today',
            'Professional environment — STEM career',
            'Researcher at work',
            'Alumni in engineering role',
            'Workspace — open office / research setting',
            'STEM professional at laptop',
            'Student presenting at Go For Launch!',
            'Astronaut mentor — giving time and mission',
            'Archival moments cut against present-day Chicago'
          ].map((label, i) => (
            <div key={i} style={{ aspectRatio: '16/10', background: 'rgba(255,255,255,0.07)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.5 }}>
                {label}
              </span>
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
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
