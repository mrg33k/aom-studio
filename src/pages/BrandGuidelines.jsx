import React, { useEffect, useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  AOM Brand Guidelines -- Direction C: Bold Graphic (LOCKED)         */
/*  Fonts: Syne (display) + Space Grotesk (headlines + body)           */
/*  Colors: Cream #FDF6EC, Black #0A0A0A, Orange #E85D26, Gold #C9A84C */
/* ------------------------------------------------------------------ */

const COLORS = {
  cream: '#FDF6EC',
  black: '#0A0A0A',
  orange: '#E85D26',
  gold: '#C9A84C',
  warmGray: '#7A7267',
  lightBorder: '#D9D3CB',
  darkCream: '#EDE7DF',
}

/* ------------------------------------------------------------------ */
/*  Color swatch copy helper                                            */
/* ------------------------------------------------------------------ */
function ColorSwatch({ color, name, hex, dark }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(hex)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={{ flex: '1 1 200px', minWidth: 180 }}>
      <div
        onClick={handleCopy}
        style={{
          background: color,
          width: '100%',
          height: 120,
          borderRadius: 4,
          border: `1px solid ${dark ? 'transparent' : COLORS.lightBorder}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: 12,
          position: 'relative',
          transition: 'transform 0.2s',
        }}
      >
        {copied && (
          <span style={{
            position: 'absolute', top: 8, right: 8,
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 10,
            fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: dark ? COLORS.cream : COLORS.black, opacity: 0.8,
          }}>COPIED</span>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 700,
          letterSpacing: '0.05em', textTransform: 'uppercase', color: COLORS.black,
        }}>{name}</div>
        <div style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 400,
          color: COLORS.warmGray, marginTop: 2,
        }}>{hex}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Pill Badge component                                                */
/* ------------------------------------------------------------------ */
function Badge({ children, color = COLORS.black, bg = 'transparent', style = {} }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: '"Space Grotesk", sans-serif',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: color,
      border: `1px solid ${color}`,
      borderRadius: 100,
      padding: '4px 14px',
      background: bg,
      lineHeight: 1.4,
      ...style,
    }}>{children}</span>
  )
}

/* ------------------------------------------------------------------ */
/*  Section Number                                                      */
/* ------------------------------------------------------------------ */
function SectionNumber({ num }) {
  return (
    <span style={{
      fontFamily: '"Syne", sans-serif',
      fontSize: 64,
      fontWeight: 800,
      lineHeight: 1,
      color: COLORS.orange,
      opacity: 0.15,
      position: 'absolute',
      top: -20,
      left: 0,
      userSelect: 'none',
    }}>{String(num).padStart(2, '0')}</span>
  )
}

/* ------------------------------------------------------------------ */
/*  SVG Logo Concepts                                                   */
/* ------------------------------------------------------------------ */

// 1. Primary Wordmark - Syne ExtraBold with mixed weights
function LogoWordmark({ color = COLORS.black, size = 72 }) {
  return (
    <svg viewBox="0 0 300 80" width={size * (300/80)} height={size} aria-label="AOM Wordmark">
      <text x="0" y="65" fontFamily="Syne, sans-serif" fontSize="72" fontWeight="800" fill={color} letterSpacing="-2">
        AOM
      </text>
      <rect x="210" y="52" width="8" height="8" rx="4" fill={COLORS.orange} />
    </svg>
  )
}

// 2. Extended wordmark with tagline
function LogoWordmarkExtended({ color = COLORS.black, size = 60 }) {
  return (
    <svg viewBox="0 0 420 90" width={size * (420/90)} height={size} aria-label="AOM Extended Wordmark">
      <text x="0" y="58" fontFamily="Syne, sans-serif" fontSize="64" fontWeight="800" fill={color} letterSpacing="-2">
        AOM
      </text>
      {/* Vertical divider */}
      <line x1="185" y1="12" x2="185" y2="62" stroke={COLORS.orange} strokeWidth="2" />
      {/* Tagline */}
      <text x="200" y="32" fontFamily="Space Grotesk, sans-serif" fontSize="11" fontWeight="500" fill={COLORS.warmGray} letterSpacing="3" textAnchor="start">
        AHEAD OF
      </text>
      <text x="200" y="54" fontFamily="Space Grotesk, sans-serif" fontSize="11" fontWeight="700" fill={color} letterSpacing="3" textAnchor="start">
        MARKET
      </text>
    </svg>
  )
}

// 3. Geometric mark / icon - abstract "A" formed from triangular shapes
function LogoMark({ color = COLORS.black, accent = COLORS.orange, size = 80 }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label="AOM Mark">
      {/* Outer circle */}
      <circle cx="40" cy="40" r="38" fill="none" stroke={color} strokeWidth="2" />
      {/* Abstract A shape */}
      <polygon points="40,14 18,62 28,62 40,34 52,62 62,62" fill={color} />
      {/* Orange crossbar */}
      <rect x="25" y="46" width="30" height="4" rx="2" fill={accent} />
      {/* Gold dot */}
      <circle cx="40" cy="26" r="3" fill={COLORS.gold} />
    </svg>
  )
}

// 4. Badge / Stamp variation
function LogoBadge({ color = COLORS.black, size = 120 }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-label="AOM Badge">
      {/* Outer ring */}
      <circle cx="80" cy="80" r="76" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="80" cy="80" r="70" fill="none" stroke={color} strokeWidth="1" />
      {/* Center text */}
      <text x="80" y="90" fontFamily="Syne, sans-serif" fontSize="48" fontWeight="800" fill={color} textAnchor="middle" letterSpacing="-1">
        AOM
      </text>
      {/* Circular text - top */}
      <defs>
        <path id="topArc" d="M 25,80 a 55,55 0 0,1 110,0" fill="none" />
        <path id="bottomArc" d="M 135,80 a 55,55 0 0,1 -110,0" fill="none" />
      </defs>
      <text fontFamily="Space Grotesk, sans-serif" fontSize="8" fontWeight="700" fill={color} letterSpacing="4" textAnchor="middle">
        <textPath href="#topArc" startOffset="50%">AHEAD OF MARKET</textPath>
      </text>
      <text fontFamily="Space Grotesk, sans-serif" fontSize="7" fontWeight="500" fill={COLORS.warmGray} letterSpacing="3" textAnchor="middle">
        <textPath href="#bottomArc" startOffset="50%">PHOENIX AZ &#8226; EST 2020</textPath>
      </text>
      {/* Decorative dots at cardinal points */}
      <circle cx="80" cy="10" r="2.5" fill={COLORS.orange} />
      <circle cx="80" cy="150" r="2.5" fill={COLORS.orange} />
      <circle cx="10" cy="80" r="2.5" fill={COLORS.gold} />
      <circle cx="150" cy="80" r="2.5" fill={COLORS.gold} />
    </svg>
  )
}

// 5. Minimal stacked wordmark
function LogoStacked({ color = COLORS.black, size = 80 }) {
  return (
    <svg viewBox="0 0 180 120" width={size * (180/120)} height={size} aria-label="AOM Stacked">
      <text x="0" y="42" fontFamily="Syne, sans-serif" fontSize="18" fontWeight="800" fill={COLORS.orange} letterSpacing="8">
        AHEAD OF
      </text>
      <text x="0" y="90" fontFamily="Syne, sans-serif" fontSize="52" fontWeight="800" fill={color} letterSpacing="-1">
        MARKET
      </text>
      <rect x="0" y="100" width="178" height="3" fill={color} />
      <text x="0" y="114" fontFamily="Space Grotesk, sans-serif" fontSize="8" fontWeight="500" fill={COLORS.warmGray} letterSpacing="3">
        CREATIVE PRODUCTION + AI SYSTEMS
      </text>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Decorative SVG Elements                                             */
/* ------------------------------------------------------------------ */

// Grid pattern background
function GridPattern({ width = 400, height = 200, color = COLORS.black, opacity = 0.04 }) {
  return (
    <svg width={width} height={height} style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'none' }}>
      {Array.from({ length: Math.ceil(width / 40) + 1 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={height} stroke={color} strokeWidth="0.5" opacity={opacity} />
      ))}
      {Array.from({ length: Math.ceil(height / 40) + 1 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 40} x2={width} y2={i * 40} stroke={color} strokeWidth="0.5" opacity={opacity} />
      ))}
    </svg>
  )
}

// Starburst mark
function Starburst({ size = 40, color = COLORS.orange, style = {} }) {
  const points = Array.from({ length: 16 }).map((_, i) => {
    const angle = (i * 360 / 16) * Math.PI / 180
    const r = i % 2 === 0 ? size / 2 : size / 5
    return `${size / 2 + r * Math.cos(angle)},${size / 2 + r * Math.sin(angle)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style}>
      <polygon points={points} fill={color} />
    </svg>
  )
}

// Dotted texture block
function DottedTexture({ width = 120, height = 80, color = COLORS.black, opacity = 0.08, style = {} }) {
  const dots = []
  for (let x = 0; x < width; x += 12) {
    for (let y = 0; y < height; y += 12) {
      dots.push(<circle key={`${x}-${y}`} cx={x + 6} cy={y + 6} r={1.5} fill={color} opacity={opacity} />)
    }
  }
  return (
    <svg width={width} height={height} style={style}>
      {dots}
    </svg>
  )
}

// Diagonal lines pattern
function DiagonalLines({ width = 200, height = 100, color = COLORS.orange, opacity = 0.06, style = {} }) {
  const lines = []
  for (let x = -height; x < width + height; x += 16) {
    lines.push(<line key={x} x1={x} y1={0} x2={x + height} y2={height} stroke={color} strokeWidth="1" opacity={opacity} />)
  }
  return (
    <svg width={width} height={height} style={{ overflow: 'hidden', ...style }}>
      {lines}
    </svg>
  )
}

// Concentric circles decoration
function ConcentricCircles({ size = 120, color = COLORS.gold, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={style}>
      <circle cx="60" cy="60" r="56" fill="none" stroke={color} strokeWidth="0.5" opacity="0.2" />
      <circle cx="60" cy="60" r="44" fill="none" stroke={color} strokeWidth="0.5" opacity="0.3" />
      <circle cx="60" cy="60" r="32" fill="none" stroke={color} strokeWidth="0.5" opacity="0.4" />
      <circle cx="60" cy="60" r="20" fill="none" stroke={color} strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="60" r="4" fill={color} opacity="0.6" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Main BrandGuidelines Component                                      */
/* ------------------------------------------------------------------ */

export default function BrandGuidelines() {
  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  const sectionStyle = {
    padding: '100px 60px',
    position: 'relative',
    overflow: 'hidden',
  }

  const maxWidth = { maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }

  const sectionLabel = {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: COLORS.warmGray,
    marginBottom: 12,
  }

  const sectionHeadline = {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 42,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    lineHeight: 1.1,
    color: COLORS.black,
    marginBottom: 32,
  }

  const bodyText = {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.7,
    color: COLORS.warmGray,
    maxWidth: 640,
  }

  const thickRule = {
    width: '100%',
    height: 3,
    background: COLORS.black,
    border: 'none',
    margin: 0,
  }

  const thinRule = {
    width: '100%',
    height: 1,
    background: COLORS.lightBorder,
    border: 'none',
    margin: 0,
  }

  return (
    <div style={{ background: COLORS.cream, minHeight: '100vh', color: COLORS.black }}>

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <section style={{
        ...sectionStyle,
        padding: '80px 60px 100px',
        background: COLORS.cream,
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <GridPattern width={600} height={600} />
        <div style={{ position: 'absolute', top: 40, right: 60, zIndex: 2 }}>
          <Starburst size={48} color={COLORS.orange} />
        </div>
        <div style={{ position: 'absolute', bottom: 80, right: 120, zIndex: 0 }}>
          <ConcentricCircles size={200} color={COLORS.gold} />
        </div>
        <div style={maxWidth}>
          {/* Back link */}
          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 500,
            color: COLORS.warmGray, textDecoration: 'none', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 80,
          }}>
            <ArrowLeft size={14} /> BACK
          </a>

          {/* Logo mark */}
          <div style={{ marginBottom: 48 }}>
            <LogoMark size={64} color={COLORS.black} accent={COLORS.orange} />
          </div>

          {/* Hero headline - mixed weight treatment */}
          <h1 style={{ margin: 0, padding: 0 }}>
            <span style={{
              fontFamily: '"Syne", sans-serif', fontSize: 96, fontWeight: 800,
              lineHeight: 0.9, letterSpacing: '-0.03em', display: 'block',
              color: COLORS.black,
            }}>
              BRAND
            </span>
            <span style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 96, fontWeight: 300,
              lineHeight: 0.9, letterSpacing: '-0.03em', display: 'block',
              color: COLORS.warmGray,
            }}>
              guide
            </span>
            <span style={{
              fontFamily: '"Syne", sans-serif', fontSize: 96, fontWeight: 800,
              lineHeight: 0.9, letterSpacing: '-0.03em', display: 'block',
              color: COLORS.orange,
            }}>
              LINES
            </span>
          </h1>

          {/* Badges row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 40, flexWrap: 'wrap' }}>
            <Badge>VIDEO</Badge>
            <Badge>WEB</Badge>
            <Badge>BRAND</Badge>
            <Badge>AI</Badge>
            <Badge color={COLORS.orange}>DIRECTION C</Badge>
          </div>

          {/* Meta info */}
          <div style={{
            display: 'flex', gap: 24, marginTop: 24, alignItems: 'center',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 400,
            color: COLORS.warmGray, letterSpacing: '0.05em',
          }}>
            <span>Phoenix, AZ</span>
            <span style={{ color: COLORS.orange }}>&#8226;</span>
            <span>Est. 2020</span>
            <span style={{ color: COLORS.orange }}>&#8226;</span>
            <span>Bold Graphic</span>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* ============================================================ */}
      {/*  01 - LOGO VARIATIONS                                         */}
      {/* ============================================================ */}
      <section style={{ ...sectionStyle, background: COLORS.cream }}>
        <DottedTexture width={160} height={160} style={{ position: 'absolute', top: 20, right: 40, opacity: 0.5 }} />
        <div style={maxWidth}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={1} />
            <div style={{ ...sectionLabel, paddingTop: 48 }}>LOGO SYSTEM</div>
            <h2 style={sectionHeadline}>Logo Variations</h2>
            <p style={bodyText}>
              The AOM mark system is built for range. Each variation serves a different context while
              maintaining the same confident, structured personality. The wordmark leads. The mark
              stands alone. The badge stamps.
            </p>
          </div>

          {/* Logo grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24, marginTop: 56,
          }}>
            {/* Primary Wordmark */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 40,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 200, background: COLORS.cream,
            }}>
              <LogoWordmark color={COLORS.black} size={64} />
              <span style={{ ...sectionLabel, marginTop: 20, marginBottom: 0, fontSize: 9 }}>PRIMARY WORDMARK</span>
            </div>

            {/* Extended Wordmark */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 40,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 200, background: COLORS.cream,
            }}>
              <LogoWordmarkExtended color={COLORS.black} size={50} />
              <span style={{ ...sectionLabel, marginTop: 20, marginBottom: 0, fontSize: 9 }}>EXTENDED WORDMARK</span>
            </div>

            {/* Geometric Mark */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 40,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 200, background: COLORS.cream,
            }}>
              <LogoMark color={COLORS.black} size={80} />
              <span style={{ ...sectionLabel, marginTop: 20, marginBottom: 0, fontSize: 9 }}>GEOMETRIC MARK</span>
            </div>

            {/* Badge */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 40,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 200, background: COLORS.cream,
            }}>
              <LogoBadge color={COLORS.black} size={120} />
              <span style={{ ...sectionLabel, marginTop: 20, marginBottom: 0, fontSize: 9 }}>BADGE / STAMP</span>
            </div>

            {/* Stacked */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 40,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 200, background: COLORS.cream,
            }}>
              <LogoStacked color={COLORS.black} size={80} />
              <span style={{ ...sectionLabel, marginTop: 20, marginBottom: 0, fontSize: 9 }}>STACKED LOCKUP</span>
            </div>

            {/* Dark background variation */}
            <div style={{
              border: `1px solid ${COLORS.black}`, borderRadius: 4, padding: 40,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 200, background: COLORS.black,
            }}>
              <LogoWordmark color={COLORS.cream} size={64} />
              <span style={{ ...sectionLabel, marginTop: 20, marginBottom: 0, fontSize: 9, color: COLORS.warmGray }}>ON DARK</span>
            </div>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* ============================================================ */}
      {/*  02 - COLOR PALETTE                                           */}
      {/* ============================================================ */}
      <section style={{ ...sectionStyle, background: COLORS.black }}>
        <DiagonalLines width={300} height={200} color={COLORS.orange} opacity={0.08} style={{ position: 'absolute', bottom: 0, left: 0 }} />
        <div style={maxWidth}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={2} />
            <div style={{ ...sectionLabel, paddingTop: 48, color: COLORS.warmGray }}>COLOR SYSTEM</div>
            <h2 style={{ ...sectionHeadline, color: COLORS.cream }}>Palette</h2>
            <p style={{ ...bodyText, color: COLORS.warmGray }}>
              Four colors. No gradients. The cream grounds, the black anchors, the orange activates,
              and the gold elevates. Every combination has been tested for contrast and legibility.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 56, flexWrap: 'wrap' }}>
            <ColorSwatch color={COLORS.cream} name="Cream" hex="#FDF6EC" />
            <ColorSwatch color={COLORS.black} name="Black" hex="#0A0A0A" dark />
            <ColorSwatch color={COLORS.orange} name="Orange" hex="#E85D26" dark />
            <ColorSwatch color={COLORS.gold} name="Gold" hex="#C9A84C" dark />
          </div>

          {/* Color roles */}
          <div style={{ marginTop: 56 }}>
            <div style={{ height: 1, background: '#333', marginBottom: 24 }} />
            {[
              { role: 'Background (primary)', color: 'Cream', hex: '#FDF6EC' },
              { role: 'Background (alternate)', color: 'Black', hex: '#0A0A0A' },
              { role: 'Text on light', color: 'Black', hex: '#0A0A0A' },
              { role: 'Text on dark', color: 'Cream', hex: '#FDF6EC' },
              { role: 'Accent (primary)', color: 'Orange', hex: '#E85D26' },
              { role: 'Accent (secondary)', color: 'Gold', hex: '#C9A84C' },
              { role: 'Secondary text', color: 'Warm Gray', hex: '#7A7267' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid #222',
              }}>
                <span style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 400,
                  color: COLORS.cream,
                }}>{item.role}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, background: item.hex, border: '1px solid #333' }} />
                  <span style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 400,
                    color: COLORS.warmGray,
                  }}>{item.hex}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ ...thickRule, background: COLORS.orange }} />

      {/* ============================================================ */}
      {/*  03 - TYPOGRAPHY                                              */}
      {/* ============================================================ */}
      <section style={{ ...sectionStyle, background: COLORS.cream }}>
        <GridPattern width={400} height={300} color={COLORS.black} opacity={0.03} />
        <div style={maxWidth}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={3} />
            <div style={{ ...sectionLabel, paddingTop: 48 }}>TYPE SYSTEM</div>
            <h2 style={sectionHeadline}>Typography</h2>
          </div>

          {/* Font families */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            {/* Syne */}
            <div>
              <div style={{ ...sectionLabel, marginBottom: 16, color: COLORS.orange }}>DISPLAY FONT</div>
              <div style={{
                fontFamily: '"Syne", sans-serif', fontSize: 56, fontWeight: 800,
                lineHeight: 1, color: COLORS.black, marginBottom: 8,
              }}>Syne</div>
              <div style={{
                fontFamily: '"Syne", sans-serif', fontSize: 16, fontWeight: 400,
                color: COLORS.warmGray, lineHeight: 1.6,
              }}>
                Bold, wide, expressive. Used for hero moments, display numbers, and
                anywhere the brand needs to be loud.
              </div>
              <div style={{ marginTop: 24 }}>
                {[400, 500, 600, 700, 800].map(w => (
                  <div key={w} style={{
                    fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: w,
                    lineHeight: 1.6, color: COLORS.black,
                  }}>
                    Syne {w} - Ahead of Market
                  </div>
                ))}
              </div>
            </div>

            {/* Space Grotesk */}
            <div>
              <div style={{ ...sectionLabel, marginBottom: 16, color: COLORS.gold }}>HEADLINE + BODY FONT</div>
              <div style={{
                fontFamily: '"Space Grotesk", sans-serif', fontSize: 56, fontWeight: 700,
                lineHeight: 1, color: COLORS.black, marginBottom: 8,
              }}>Space Grotesk</div>
              <div style={{
                fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, fontWeight: 400,
                color: COLORS.warmGray, lineHeight: 1.6,
              }}>
                Geometric sans with character. Carries the brand from section headlines
                down to body copy and micro-labels.
              </div>
              <div style={{ marginTop: 24 }}>
                {[300, 400, 500, 600, 700].map(w => (
                  <div key={w} style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: w,
                    lineHeight: 1.6, color: COLORS.black,
                  }}>
                    Space Grotesk {w} - We make things that bring opportunity
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Type scale */}
          <div style={{ marginTop: 80 }}>
            <div style={thinRule} />
            <div style={{ ...sectionLabel, marginTop: 32, marginBottom: 32 }}>TYPE SCALE</div>

            {[
              { label: 'HERO DISPLAY', family: '"Syne", sans-serif', size: 80, weight: 800, tracking: '-0.03em', sample: 'AOM', lh: 0.9 },
              { label: 'SECTION HEADLINE', family: '"Space Grotesk", sans-serif', size: 42, weight: 700, tracking: '-0.01em', sample: 'We make things that bring opportunity', lh: 1.1 },
              { label: 'SUBSECTION', family: '"Space Grotesk", sans-serif', size: 28, weight: 600, tracking: '0', sample: 'Creative production and AI systems', lh: 1.2 },
              { label: 'BODY', family: '"Space Grotesk", sans-serif', size: 16, weight: 400, tracking: '0', sample: 'AOM is a creative production and AI systems company based in Phoenix, AZ. We make things that impact for companies that build.', lh: 1.7 },
              { label: 'SECTION LABEL', family: '"Space Grotesk", sans-serif', size: 11, weight: 500, tracking: '0.2em', sample: 'ABOUT US', lh: 1.4, upper: true },
              { label: 'MICRO / BADGE', family: '"Space Grotesk", sans-serif', size: 10, weight: 700, tracking: '0.15em', sample: 'VIDEO  WEB  BRAND  AI', lh: 1.4, upper: true },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '180px 1fr',
                gap: 24, alignItems: 'baseline', padding: '24px 0',
                borderBottom: `1px solid ${COLORS.lightBorder}`,
              }}>
                <div>
                  <div style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.15em', textTransform: 'uppercase', color: COLORS.orange,
                    marginBottom: 4,
                  }}>{item.label}</div>
                  <div style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontSize: 11, fontWeight: 400,
                    color: COLORS.warmGray,
                  }}>{item.size}px / {item.weight} / {item.tracking}</div>
                </div>
                <div style={{
                  fontFamily: item.family,
                  fontSize: item.size,
                  fontWeight: item.weight,
                  letterSpacing: item.tracking,
                  lineHeight: item.lh,
                  textTransform: item.upper ? 'uppercase' : 'none',
                  color: COLORS.black,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>{item.sample}</div>
              </div>
            ))}
          </div>

          {/* Mixed weight demo */}
          <div style={{ marginTop: 80, padding: '56px 0' }}>
            <div style={{ ...sectionLabel, marginBottom: 24 }}>MIXED-WEIGHT HEADLINES</div>
            <p style={{ ...bodyText, marginBottom: 32 }}>
              Within a single headline, alternate between bold and regular weights. This creates
              typographic rhythm and is the signature of the Bold Graphic direction.
            </p>
            <div style={{ lineHeight: 1, marginBottom: 32 }}>
              <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 64, fontWeight: 800, color: COLORS.black }}>WE </span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 64, fontWeight: 300, color: COLORS.warmGray }}>make </span>
              <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 64, fontWeight: 800, color: COLORS.black }}>THINGS</span>
            </div>
            <div style={{ lineHeight: 1, marginBottom: 32 }}>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 64, fontWeight: 300, color: COLORS.warmGray }}>that </span>
              <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 64, fontWeight: 800, color: COLORS.orange }}>BRING</span>
            </div>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 64, fontWeight: 300, color: COLORS.warmGray }}>opportunity</span>
              <span style={{ fontFamily: '"Syne", sans-serif', fontSize: 64, fontWeight: 800, color: COLORS.gold }}>.</span>
            </div>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* ============================================================ */}
      {/*  04 - BRAND PATTERNS & ELEMENTS                               */}
      {/* ============================================================ */}
      <section style={{ ...sectionStyle, background: COLORS.cream }}>
        <div style={maxWidth}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={4} />
            <div style={{ ...sectionLabel, paddingTop: 48 }}>BRAND ELEMENTS</div>
            <h2 style={sectionHeadline}>Patterns & Elements</h2>
            <p style={bodyText}>
              These aren't decorations. They're the visual language. Pill badges, numbered sections,
              grid textures, starburst marks. They show up across everything AOM produces
              and reinforce the structured personality of the brand.
            </p>
          </div>

          {/* Elements gallery */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24, marginTop: 56,
          }}>
            {/* Pill Badges */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ ...sectionLabel, marginBottom: 0, fontSize: 9 }}>PILL BADGES</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge>VIDEO</Badge>
                <Badge>WEB</Badge>
                <Badge>BRAND</Badge>
                <Badge>AI</Badge>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge color={COLORS.orange}>FEATURED</Badge>
                <Badge color={COLORS.gold}>PREMIUM</Badge>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge color={COLORS.cream} bg={COLORS.black}>INVERTED</Badge>
                <Badge color={COLORS.cream} bg={COLORS.orange}>FILLED</Badge>
              </div>
            </div>

            {/* Numbered sections */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', gap: 20,
            }}>
              <div style={{ ...sectionLabel, marginBottom: 0, fontSize: 9 }}>NUMBERED SECTIONS</div>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                  <span style={{
                    fontFamily: '"Syne", sans-serif', fontSize: 36, fontWeight: 800,
                    color: COLORS.orange, lineHeight: 1, minWidth: 48,
                  }}>{String(n).padStart(2, '0')}</span>
                  <span style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 400,
                    color: COLORS.warmGray,
                  }}>Section label goes here</span>
                </div>
              ))}
            </div>

            {/* Grid pattern */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              position: 'relative', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ ...sectionLabel, marginBottom: 0, fontSize: 9, zIndex: 1 }}>GRID TEXTURE</div>
              <div style={{ position: 'relative', height: 120 }}>
                <GridPattern width={300} height={120} color={COLORS.black} opacity={0.1} />
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800, color: COLORS.black,
                }}>AOM</div>
              </div>
            </div>

            {/* Starburst */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{ ...sectionLabel, marginBottom: 0, fontSize: 9, alignSelf: 'flex-start' }}>STARBURST MARK</div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <Starburst size={48} color={COLORS.orange} />
                <Starburst size={36} color={COLORS.gold} />
                <Starburst size={24} color={COLORS.black} />
              </div>
            </div>

            {/* Dotted texture */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ ...sectionLabel, marginBottom: 0, fontSize: 9 }}>DOTTED TEXTURE</div>
              <DottedTexture width={220} height={80} color={COLORS.black} opacity={0.15} />
            </div>

            {/* Diagonal lines */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden',
            }}>
              <div style={{ ...sectionLabel, marginBottom: 0, fontSize: 9 }}>DIAGONAL PATTERN</div>
              <DiagonalLines width={220} height={80} color={COLORS.orange} opacity={0.2} />
            </div>
          </div>

          {/* Data grid / boarding pass aesthetic */}
          <div style={{ marginTop: 56 }}>
            <div style={{ ...sectionLabel, marginBottom: 16 }}>DATA GRID (BOARDING PASS AESTHETIC)</div>
            <div style={{
              border: `2px solid ${COLORS.black}`, borderRadius: 4, overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                background: COLORS.black, padding: '16px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: '"Syne", sans-serif', fontSize: 20, fontWeight: 800,
                  color: COLORS.cream, letterSpacing: '0.05em',
                }}>AOM</span>
                <Starburst size={20} color={COLORS.orange} />
              </div>
              {/* Data rows */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                  { label: 'CLIENT', value: 'AMBITION MECH.' },
                  { label: 'PROJECT', value: 'SOCIAL + WEB' },
                  { label: 'STATUS', value: 'IN PROGRESS' },
                  { label: 'DATE', value: 'MAR 2026' },
                  { label: 'DELIVERABLES', value: '18 BRIEFS' },
                  { label: 'PLATFORM', value: 'IG + FB' },
                  { label: 'RATE', value: '$3.5K/MO' },
                  { label: 'VERTICAL', value: 'CONSTRUCTION' },
                ].map((item, i) => (
                  <div key={i} style={{
                    padding: '16px 24px',
                    borderRight: (i + 1) % 4 !== 0 ? `1px solid ${COLORS.lightBorder}` : 'none',
                    borderBottom: i < 4 ? `1px solid ${COLORS.lightBorder}` : 'none',
                  }}>
                    <div style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, fontWeight: 500,
                      letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.warmGray,
                      marginBottom: 4,
                    }}>{item.label}</div>
                    <div style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 700,
                      color: COLORS.black,
                    }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ ...thickRule, background: COLORS.gold }} />

      {/* ============================================================ */}
      {/*  05 - PHOTOGRAPHY & IMAGERY                                   */}
      {/* ============================================================ */}
      <section style={{ ...sectionStyle, background: COLORS.black }}>
        <div style={maxWidth}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={5} />
            <div style={{ ...sectionLabel, paddingTop: 48, color: COLORS.warmGray }}>IMAGERY</div>
            <h2 style={{ ...sectionHeadline, color: COLORS.cream }}>Photography Direction</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            <div>
              <div style={{ ...sectionLabel, color: COLORS.orange, marginBottom: 16 }}>WHAT WE SHOOT</div>
              <ul style={{ ...bodyText, color: '#999', padding: 0, listStyle: 'none', margin: 0 }}>
                {[
                  'Active jobsite footage. Workers building, welding, framing.',
                  'Tight action shots with shallow depth of field.',
                  'Before/after transformation shots.',
                  'Architectural details: scaffolding geometry, rebar patterns, concrete textures.',
                  'Real people doing real work. Never stock, never posed.',
                  'Golden hour and dramatic natural lighting.',
                  'Close-ups of hands, tools, materials.',
                ].map((item, i) => (
                  <li key={i} style={{
                    padding: '8px 0', borderBottom: '1px solid #222',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <span style={{ color: COLORS.orange, fontWeight: 700, fontSize: 14 }}>+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ ...sectionLabel, color: COLORS.gold, marginBottom: 16 }}>TREATMENT</div>
              <ul style={{ ...bodyText, color: '#999', padding: 0, listStyle: 'none', margin: 0 }}>
                {[
                  'Full color, slightly warm (+5-10% warmth in post).',
                  'Photos in defined containers with visible 1px black borders.',
                  'No full-bleed images. Always contained, always structured.',
                  'Duotone option: orange + black overlay for select hero images.',
                  'Mix of action shots and detail shots for rhythm.',
                  'Content-dense but organized. Photography does the heavy lifting.',
                ].map((item, i) => (
                  <li key={i} style={{
                    padding: '8px 0', borderBottom: '1px solid #222',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}>
                    <span style={{ color: COLORS.gold, fontWeight: 700, fontSize: 14 }}>+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Photo container demo */}
          <div style={{ marginTop: 56 }}>
            <div style={{ ...sectionLabel, color: COLORS.warmGray, marginBottom: 16 }}>PHOTO CONTAINER TREATMENT</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
              {[
                { h: 240, label: 'HERO / 2:1' },
                { h: 240, label: 'SQUARE' },
                { h: 240, label: 'PORTRAIT' },
              ].map((item, i) => (
                <div key={i} style={{
                  height: item.h, border: `1px solid #333`, borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#111',
                }}>
                  <span style={{
                    fontFamily: '"Space Grotesk", sans-serif', fontSize: 10, fontWeight: 500,
                    letterSpacing: '0.15em', color: '#444',
                  }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* ============================================================ */}
      {/*  06 - VOICE & TONE                                            */}
      {/* ============================================================ */}
      <section style={{ ...sectionStyle, background: COLORS.cream }}>
        <ConcentricCircles size={160} color={COLORS.gold} style={{ position: 'absolute', top: 20, right: 60, opacity: 0.4 }} />
        <div style={maxWidth}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={6} />
            <div style={{ ...sectionLabel, paddingTop: 48 }}>BRAND VOICE</div>
            <h2 style={sectionHeadline}>Voice & Tone</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            {/* Voice attributes */}
            <div>
              {[
                { title: 'Confident', desc: 'We know what we do and we do it well. No hedging, no "maybe."' },
                { title: 'Human', desc: 'Anti-BS. Real personality, real warmth. Not corporate speak.' },
                { title: 'Direct', desc: 'Say it, don\'t decorate it. Bullet points over paragraphs.' },
                { title: 'Knowledgeable', desc: '"We get it." Industry insider, not outsider looking in.' },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '24px 0',
                  borderBottom: `1px solid ${COLORS.lightBorder}`,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8,
                  }}>
                    <span style={{
                      fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800,
                      color: COLORS.orange, lineHeight: 1,
                    }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 700,
                      color: COLORS.black,
                    }}>{item.title}</span>
                  </div>
                  <div style={{ ...bodyText, paddingLeft: 48 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            {/* Tone spectrum */}
            <div>
              <div style={{ ...sectionLabel, color: COLORS.orange, marginBottom: 24 }}>TONE SPECTRUM</div>
              {[
                { left: 'Casual', right: 'Formal', pos: 30 },
                { left: 'Playful', right: 'Serious', pos: 55 },
                { left: 'Enthusiastic', right: 'Reserved', pos: 35 },
                { left: 'Irreverent', right: 'Respectful', pos: 45 },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: 24 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', marginBottom: 8,
                  }}>
                    <span style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 500,
                      color: COLORS.black,
                    }}>{item.left}</span>
                    <span style={{
                      fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 500,
                      color: COLORS.warmGray,
                    }}>{item.right}</span>
                  </div>
                  <div style={{
                    height: 4, background: COLORS.lightBorder, borderRadius: 2, position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', top: -4, left: `${item.pos}%`,
                      width: 12, height: 12, borderRadius: 6,
                      background: COLORS.orange, transform: 'translateX(-50%)',
                    }} />
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 40, padding: 24, background: COLORS.darkCream, borderRadius: 4 }}>
                <div style={{ ...sectionLabel, fontSize: 9, marginBottom: 12 }}>EXAMPLE COPY</div>
                <div style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 600,
                  color: COLORS.black, lineHeight: 1.4, marginBottom: 8,
                }}>"We make things that impact."</div>
                <div style={{ ...bodyText, fontSize: 14 }}>
                  Not "We leverage synergies to drive impactful outcomes." People are tired
                  of that. Write like someone who truly understands what it takes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* ============================================================ */}
      {/*  07 - USAGE GUIDELINES                                        */}
      {/* ============================================================ */}
      <section style={{ ...sectionStyle, background: COLORS.cream, paddingBottom: 48 }}>
        <div style={maxWidth}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={7} />
            <div style={{ ...sectionLabel, paddingTop: 48 }}>USAGE</div>
            <h2 style={sectionHeadline}>Do's and Don'ts</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            {/* Do's */}
            <div>
              <div style={{
                fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800,
                color: COLORS.orange, marginBottom: 24,
              }}>DO</div>
              {[
                'Use mixed-weight headlines to create typographic rhythm.',
                'Keep the cream/black contrast strong. No muddy mid-tones as backgrounds.',
                'Use pill badges for categorization. They\'re scannable and structured.',
                'Let photos live inside bordered containers. Structure is the aesthetic.',
                'Use Syne for hero moments only. Space Grotesk carries everything else.',
                'Keep orange as activation. Gold as elevation. Both used intentionally.',
                'Write direct, human copy. Bullet points over paragraphs.',
                'Use numbered sections (01, 02, 03) for sequential content.',
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '12px 0', borderBottom: `1px solid ${COLORS.lightBorder}`,
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 400,
                  color: COLORS.black, lineHeight: 1.6,
                }}>
                  <span style={{ color: COLORS.orange, fontWeight: 700, flexShrink: 0 }}>+</span>
                  {item}
                </div>
              ))}
            </div>

            {/* Don'ts */}
            <div>
              <div style={{
                fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800,
                color: '#C44',
                marginBottom: 24,
              }}>DON'T</div>
              {[
                'Use gradients. Ever. The palette is flat and intentional.',
                'Add drop shadows to cards or containers. Use borders instead.',
                'Use Syne for body text. It\'s a display font, not a workhorse.',
                'Use stock photography. Every image should be real, ours, on-site.',
                'Write corporate speak. "Leverage synergies" is the enemy.',
                'Make the logo smaller than 32px in any context.',
                'Use colors outside the four-color system without approval.',
                'Center-align body text. Left-aligned or structured grid only.',
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '12px 0', borderBottom: `1px solid ${COLORS.lightBorder}`,
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 400,
                  color: COLORS.black, lineHeight: 1.6,
                }}>
                  <span style={{ color: '#C44', fontWeight: 700, flexShrink: 0 }}>&#x2212;</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Logo clear space */}
          <div style={{ marginTop: 56 }}>
            <div style={thinRule} />
            <div style={{ ...sectionLabel, marginTop: 32, marginBottom: 24 }}>LOGO CLEAR SPACE</div>
            <p style={bodyText}>
              Maintain clear space equal to the height of the "O" in the AOM wordmark on all sides.
              The mark should never feel crowded. When in doubt, give it more room.
            </p>
            <div style={{
              marginTop: 24, display: 'inline-flex', padding: 48,
              border: `1px dashed ${COLORS.lightBorder}`, borderRadius: 4,
              position: 'relative',
            }}>
              <LogoWordmark color={COLORS.black} size={48} />
              {/* Clear space indicators */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                border: `1px dashed ${COLORS.orange}`, borderRadius: 4, opacity: 0.4,
              }} />
            </div>
          </div>

          {/* Minimum sizes */}
          <div style={{ marginTop: 48 }}>
            <div style={{ ...sectionLabel, marginBottom: 24 }}>MINIMUM SIZES</div>
            <div style={{ display: 'flex', gap: 48, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center' }}>
                <LogoWordmark color={COLORS.black} size={48} />
                <div style={{ ...sectionLabel, marginTop: 8, marginBottom: 0, fontSize: 9 }}>DIGITAL (48PX)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <LogoMark color={COLORS.black} size={32} />
                <div style={{ ...sectionLabel, marginTop: 8, marginBottom: 0, fontSize: 9 }}>MARK MIN (32PX)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <LogoBadge color={COLORS.black} size={48} />
                <div style={{ ...sectionLabel, marginTop: 8, marginBottom: 0, fontSize: 9 }}>BADGE MIN (48PX)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer style={{
        background: COLORS.black, padding: '80px 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        <DottedTexture width={200} height={200} color={COLORS.cream} opacity={0.03} style={{ position: 'absolute', bottom: 0, right: 0 }} />
        <div style={{ ...maxWidth, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          {/* Left: large stacked type */}
          <div>
            <div style={{
              fontFamily: '"Syne", sans-serif', fontSize: 64, fontWeight: 800,
              lineHeight: 0.9, color: COLORS.cream, marginBottom: 24,
            }}>
              AOM
            </div>
            <div style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 400,
              color: COLORS.warmGray, lineHeight: 1.7, maxWidth: 320,
            }}>
              Creative production and AI systems for companies that build.
              Phoenix, AZ.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <Badge color={COLORS.warmGray}>VIDEO</Badge>
              <Badge color={COLORS.warmGray}>WEB</Badge>
              <Badge color={COLORS.warmGray}>BRAND</Badge>
              <Badge color={COLORS.warmGray}>AI</Badge>
            </div>
          </div>

          {/* Right: meta */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {[
              { label: 'DIRECTION', value: 'C: Bold Graphic' },
              { label: 'FONTS', value: 'Syne + Space Grotesk' },
              { label: 'GENERATED', value: 'March 2026' },
              { label: 'AGENT', value: 'Steffen' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '10px 0',
                borderBottom: '1px solid #222',
              }}>
                <span style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.2em', color: COLORS.warmGray,
                }}>{item.label}</span>
                <span style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 13, fontWeight: 400,
                  color: COLORS.cream,
                }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
