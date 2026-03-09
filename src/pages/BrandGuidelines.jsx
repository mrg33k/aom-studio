import React, { useEffect, useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  AOM Brand Guidelines -- Final                                      */
/*  Direction C: Bold Graphic                                          */
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

/* ================================================================== */
/*  SHARED UTILITIES                                                    */
/* ================================================================== */

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

function SectionNumber({ num, color = COLORS.orange }) {
  return (
    <span style={{
      fontFamily: '"Syne", sans-serif',
      fontSize: 64,
      fontWeight: 800,
      lineHeight: 1,
      color: color,
      opacity: 0.12,
      position: 'absolute',
      top: -20,
      left: 0,
      userSelect: 'none',
    }}>{String(num).padStart(2, '0')}</span>
  )
}

/* ================================================================== */
/*  LOGO SYSTEM -- Refined from v1 concepts                            */
/*  Wordmark: Syne ExtraBold <text> with refined kerning + orange dot  */
/*  Geometric mark: Circle + "A" polygon, orange crossbar, gold accent */
/*  Badge: Double-ring seal with circular text                         */
/*  Stacked lockup: "AHEAD OF" / "MARKET" with tagline                */
/* ================================================================== */

function LogoWordmark({ color = COLORS.black, size = 72 }) {
  // Syne ExtraBold "AOM" with tighter kerning and refined orange dot
  // The dot sits precisely after the M, sized at 10% of cap height
  // Positioned optically (not mathematically) for visual balance
  const scale = size / 72
  const w = 240 * scale
  return (
    <svg viewBox="0 0 240 80" width={w} height={size} aria-label="AOM Wordmark" role="img">
      <text
        x="0" y="64"
        fontFamily="Syne, sans-serif"
        fontSize="72"
        fontWeight="800"
        fill={color}
        letterSpacing="-3"
      >
        AOM
      </text>
      {/* Orange dot: 7px radius, optically placed after M */}
      <circle cx="212" cy="57" r="7" fill={COLORS.orange} />
    </svg>
  )
}

function LogoMark({ color = COLORS.black, accent = COLORS.orange, size = 80 }) {
  // Abstract "A" inside a circle
  // Circle: 2px stroke, clean and simple
  // "A": refined polygon with slightly wider base for stability
  // Crossbar: orange, optically centered (slightly above mathematical center)
  // Gold accent dot at apex: smaller, more intentional
  // All proportions checked against 80x80 viewBox
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label="AOM Geometric Mark" role="img">
      {/* Outer circle */}
      <circle cx="40" cy="40" r="37" fill="none" stroke={color} strokeWidth="2.5" />
      {/* "A" shape: wider legs, cleaner angles */}
      <polygon
        points="40,16 19,61 27,61 40,32 53,61 61,61"
        fill={color}
      />
      {/* Orange crossbar: optically centered at ~44 (above math center 40) */}
      <rect x="27" y="44" width="26" height="3.5" rx="1.75" fill={accent} />
      {/* Gold apex accent: smaller, more precise */}
      <circle cx="40" cy="16" r="2.5" fill={COLORS.gold} />
    </svg>
  )
}

function LogoBadge({ color = COLORS.black, accent = COLORS.orange, size = 120 }) {
  // Double-ring seal with circular text
  // Outer ring: 2px, solid
  // Inner ring: 1.5px, tighter gap (4px between rings)
  // Circular text: "AHEAD OF MARKET" top, "PHOENIX AZ . EST 2020" bottom
  // Dot separators at cardinal points: orange top/bottom, gold left/right
  // Center: "AOM" in Syne ExtraBold, dominant
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-label="AOM Badge" role="img">
      {/* Outer ring */}
      <circle cx="80" cy="80" r="76" fill="none" stroke={color} strokeWidth="2" />
      {/* Inner ring: tight gap, crisp definition */}
      <circle cx="80" cy="80" r="70" fill="none" stroke={color} strokeWidth="1" />

      {/* Center text: "AOM" large and bold */}
      <text
        x="80" y="88"
        fontFamily="Syne, sans-serif"
        fontSize="42"
        fontWeight="800"
        fill={color}
        textAnchor="middle"
        letterSpacing="-1"
      >
        AOM
      </text>

      {/* Circular text paths: radius 58 for text between inner ring and outer ring */}
      <defs>
        <path id="topArc" d="M 22,80 a 58,58 0 0,1 116,0" fill="none" />
        <path id="bottomArc" d="M 138,80 a 58,58 0 0,1 -116,0" fill="none" />
      </defs>

      {/* Top arc: "AHEAD OF MARKET" */}
      <text
        fontFamily="Space Grotesk, sans-serif"
        fontSize="7.5"
        fontWeight="700"
        fill={color}
        letterSpacing="4"
        textAnchor="middle"
      >
        <textPath href="#topArc" startOffset="50%">AHEAD OF MARKET</textPath>
      </text>

      {/* Bottom arc: "PHOENIX AZ . EST 2020" */}
      <text
        fontFamily="Space Grotesk, sans-serif"
        fontSize="6.5"
        fontWeight="500"
        fill={COLORS.warmGray}
        letterSpacing="3"
        textAnchor="middle"
      >
        <textPath href="#bottomArc" startOffset="50%">PHOENIX AZ &#8226; EST 2020</textPath>
      </text>

      {/* Cardinal dot separators */}
      <circle cx="80" cy="8" r="2.5" fill={accent} />
      <circle cx="80" cy="152" r="2.5" fill={accent} />
      <circle cx="8" cy="80" r="2" fill={COLORS.gold} />
      <circle cx="152" cy="80" r="2" fill={COLORS.gold} />
    </svg>
  )
}

function LogoStacked({ color = COLORS.black, size = 80 }) {
  // Stacked lockup: "AHEAD OF" small tracked caps, "MARKET" large bold
  // Rule line separating tagline
  // Tagline: "CREATIVE PRODUCTION + AI SYSTEMS"
  // Tighter vertical spacing for better cohesion
  return (
    <svg viewBox="0 0 220 110" width={size * (220/110)} height={size} aria-label="AOM Stacked Lockup" role="img">
      {/* "AHEAD OF" in orange tracked caps */}
      <text
        x="2" y="18"
        fontFamily="Syne, sans-serif"
        fontSize="13"
        fontWeight="800"
        fill={COLORS.orange}
        letterSpacing="8"
      >
        AHEAD OF
      </text>

      {/* "MARKET" large bold */}
      <text
        x="0" y="62"
        fontFamily="Syne, sans-serif"
        fontSize="46"
        fontWeight="800"
        fill={color}
        letterSpacing="-1"
      >
        MARKET
      </text>

      {/* Orange dot after MARKET */}
      <circle cx="204" cy="55" r="4.5" fill={COLORS.orange} />

      {/* Rule line */}
      <rect x="0" y="72" width="212" height="2.5" fill={color} />

      {/* Tagline */}
      <text
        x="0" y="88"
        fontFamily="Space Grotesk, sans-serif"
        fontSize="7.5"
        fontWeight="500"
        fill={COLORS.warmGray}
        letterSpacing="2.5"
      >
        CREATIVE PRODUCTION + AI SYSTEMS
      </text>

      {/* Thin gold accent */}
      <rect x="0" y="96" width="50" height="1.5" fill={COLORS.gold} opacity="0.5" />
    </svg>
  )
}

/* Full horizontal lockup: Mark + Wordmark */
function LogoLockup({ color = COLORS.black, accent = COLORS.orange, size = 48 }) {
  return (
    <svg viewBox="0 0 340 80" width={size * (340/80)} height={size} fill="none" role="img" aria-label="AOM Full Lockup">
      {/* Mark (scaled down) */}
      <g transform="translate(0, 0)">
        <circle cx="40" cy="40" r="37" fill="none" stroke={color} strokeWidth="2.5" />
        <polygon points="40,16 19,61 27,61 40,32 53,61 61,61" fill={color} />
        <rect x="27" y="44" width="26" height="3.5" rx="1.75" fill={accent} />
        <circle cx="40" cy="16" r="2.5" fill={COLORS.gold} />
      </g>

      {/* Divider line */}
      <line x1="96" y1="12" x2="96" y2="68" stroke={accent} strokeWidth="1.5" />

      {/* Wordmark */}
      <text
        x="114" y="56"
        fontFamily="Syne, sans-serif"
        fontSize="52"
        fontWeight="800"
        fill={color}
        letterSpacing="-2"
      >
        AOM
      </text>
      <circle cx="290" cy="50" r="5" fill={accent} />
    </svg>
  )
}

/* ================================================================== */
/*  BRAND PATTERNS                                                      */
/* ================================================================== */

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

function DottedTexture({ width = 120, height = 80, color = COLORS.black, opacity = 0.12, style = {} }) {
  const dots = []
  for (let x = 0; x < width; x += 14) {
    for (let y = 0; y < height; y += 14) {
      dots.push(<circle key={`${x}-${y}`} cx={x + 7} cy={y + 7} r={1.5} fill={color} opacity={opacity} />)
    }
  }
  return (
    <svg width={width} height={height} style={style}>
      {dots}
    </svg>
  )
}

function RadialDots({ size = 100, style = {} }) {
  const cx = size / 2, cy = size / 2
  const rings = [
    { r: size * 0.42, count: 24, dotR: 1.5, color: COLORS.black, opacity: 0.1 },
    { r: size * 0.28, count: 12, dotR: 2, color: COLORS.orange, opacity: 0.15 },
  ]
  return (
    <svg width={size} height={size} style={style}>
      {rings.map((ring, ri) =>
        Array.from({ length: ring.count }).map((_, i) => {
          const angle = (i * 360 / ring.count) * Math.PI / 180
          return (
            <circle key={`${ri}-${i}`}
              cx={cx + ring.r * Math.cos(angle)}
              cy={cy + ring.r * Math.sin(angle)}
              r={ring.dotR} fill={ring.color} opacity={ring.opacity} />
          )
        })
      )}
    </svg>
  )
}

/* ================================================================== */
/*  COLOR SWATCH                                                        */
/* ================================================================== */

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

/* ================================================================== */
/*  MAIN COMPONENT                                                      */
/* ================================================================== */

export default function BrandGuidelines() {
  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  const section = {
    padding: '100px 60px',
    position: 'relative',
    overflow: 'hidden',
  }

  const inner = { maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }

  const label = {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: COLORS.warmGray,
    marginBottom: 12,
  }

  const headline = {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 42,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    lineHeight: 1.1,
    color: COLORS.black,
    marginBottom: 32,
  }

  const body = {
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.7,
    color: COLORS.warmGray,
    maxWidth: 640,
  }

  const thickRule = { width: '100%', height: 3, background: COLORS.black, border: 'none', margin: 0 }
  const thinRule = { width: '100%', height: 1, background: COLORS.lightBorder, border: 'none', margin: 0 }

  const logoCard = (bg, borderColor) => ({
    border: `1px solid ${borderColor || COLORS.lightBorder}`,
    borderRadius: 4,
    padding: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    background: bg || COLORS.cream,
  })

  return (
    <div style={{ background: COLORS.cream, minHeight: '100vh', color: COLORS.black }}>

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <section style={{
        ...section,
        padding: '80px 60px 100px',
        background: COLORS.cream,
      }}>
        <div style={{ position: 'absolute', top: 40, right: 60, zIndex: 2 }}>
          <Starburst size={48} color={COLORS.orange} />
        </div>
        <div style={{ position: 'absolute', bottom: 80, right: 140, zIndex: 0 }}>
          <RadialDots size={160} />
        </div>
        <div style={inner}>
          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 500,
            color: COLORS.warmGray, textDecoration: 'none', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 80,
          }}>
            <ArrowLeft size={14} /> BACK
          </a>

          <div style={{ marginBottom: 48 }}>
            <LogoMark size={72} color={COLORS.black} accent={COLORS.orange} />
          </div>

          <h1 style={{ margin: 0, padding: 0 }}>
            <span style={{
              fontFamily: '"Syne", sans-serif', fontSize: 96, fontWeight: 800,
              lineHeight: 0.9, letterSpacing: '-0.03em', display: 'block',
              color: COLORS.black,
            }}>BRAND</span>
            <span style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 96, fontWeight: 300,
              lineHeight: 0.9, letterSpacing: '-0.03em', display: 'block',
              color: COLORS.warmGray,
            }}>guide</span>
            <span style={{
              fontFamily: '"Syne", sans-serif', fontSize: 96, fontWeight: 800,
              lineHeight: 0.9, letterSpacing: '-0.03em', display: 'block',
              color: COLORS.orange,
            }}>LINES</span>
          </h1>

          <div style={{ display: 'flex', gap: 10, marginTop: 40, flexWrap: 'wrap' }}>
            <Badge>VIDEO</Badge>
            <Badge>WEB</Badge>
            <Badge>BRAND</Badge>
            <Badge>AI</Badge>
          </div>

          <div style={{
            display: 'flex', gap: 24, marginTop: 24, alignItems: 'center',
            fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 400,
            color: COLORS.warmGray, letterSpacing: '0.05em',
          }}>
            <span>Phoenix, AZ</span>
            <span style={{ color: COLORS.orange }}>&#8226;</span>
            <span>Est. 2020</span>
            <span style={{ color: COLORS.orange }}>&#8226;</span>
            <span>Direction C: Bold Graphic</span>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* ============================================================ */}
      {/*  01 LOGO SYSTEM                                               */}
      {/* ============================================================ */}
      <section style={{ ...section, background: COLORS.cream }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={1} />
            <div style={{ ...label, paddingTop: 48 }}>LOGO SYSTEM</div>
            <h2 style={headline}>Primary Marks</h2>
            <p style={body}>
              Four marks built to work together or independently. The wordmark uses Syne ExtraBold
              with a signature orange dot. The geometric mark abstracts the "A" inside a circle with
              an orange crossbar and gold apex accent. Clean, confident, recognizable at any size.
            </p>
          </div>

          {/* Logo grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24, marginTop: 56,
          }}>
            {/* Wordmark */}
            <div style={logoCard(COLORS.cream)}>
              <LogoWordmark color={COLORS.black} size={56} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>WORDMARK</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>Syne ExtraBold + orange dot</span>
            </div>

            {/* Geometric mark */}
            <div style={logoCard(COLORS.cream)}>
              <LogoMark color={COLORS.black} size={80} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>GEOMETRIC MARK</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>Abstract "A" with crossbar accent</span>
            </div>

            {/* Badge */}
            <div style={logoCard(COLORS.cream)}>
              <LogoBadge color={COLORS.black} size={120} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>BADGE / SEAL</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>Double-ring with circular text</span>
            </div>

            {/* Stacked lockup */}
            <div style={logoCard(COLORS.cream)}>
              <LogoStacked color={COLORS.black} size={80} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>STACKED LOCKUP</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>"Ahead of Market" with tagline</span>
            </div>

            {/* Full horizontal lockup */}
            <div style={{ ...logoCard(COLORS.cream), gridColumn: 'span 2' }}>
              <LogoLockup color={COLORS.black} accent={COLORS.orange} size={56} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>HORIZONTAL LOCKUP</span>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa', marginTop: 2 }}>Mark + wordmark with divider</span>
            </div>

            {/* On dark */}
            <div style={logoCard(COLORS.black, COLORS.black)}>
              <LogoMark size={80} color={COLORS.cream} accent={COLORS.orange} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9, color: COLORS.warmGray }}>ON DARK</span>
            </div>

            {/* Wordmark on dark */}
            <div style={logoCard(COLORS.black, COLORS.black)}>
              <LogoWordmark size={48} color={COLORS.cream} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9, color: COLORS.warmGray }}>WORDMARK ON DARK</span>
            </div>

            {/* Mono */}
            <div style={logoCard('#fff', COLORS.lightBorder)}>
              <LogoMark size={80} color={COLORS.black} accent={COLORS.black} />
              <span style={{ ...label, marginTop: 20, marginBottom: 0, fontSize: 9 }}>MONO / SINGLE COLOR</span>
            </div>
          </div>

          {/* Size test */}
          <div style={{ marginTop: 56 }}>
            <div style={{ ...label }}>SIZE TEST</div>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end', marginTop: 16 }}>
              {[16, 24, 32, 48, 64, 96, 128].map(s => (
                <div key={s} style={{ textAlign: 'center' }}>
                  <LogoMark size={s} color={COLORS.black} accent={COLORS.orange} />
                  <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: COLORS.warmGray, marginTop: 8 }}>{s}px</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* ============================================================ */}
      {/*  02 COLOR PALETTE                                             */}
      {/* ============================================================ */}
      <section style={{ ...section, background: COLORS.black }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={2} />
            <div style={{ ...label, paddingTop: 48, color: COLORS.warmGray }}>COLOR SYSTEM</div>
            <h2 style={{ ...headline, color: COLORS.cream }}>Palette</h2>
            <p style={{ ...body, color: COLORS.warmGray }}>
              Four colors. No gradients in production. The cream grounds, the black anchors,
              the orange activates, and the gold elevates.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 56, flexWrap: 'wrap' }}>
            <ColorSwatch color={COLORS.cream} name="Cream" hex="#FDF6EC" />
            <ColorSwatch color={COLORS.black} name="Black" hex="#0A0A0A" dark />
            <ColorSwatch color={COLORS.orange} name="Orange" hex="#E85D26" dark />
            <ColorSwatch color={COLORS.gold} name="Gold" hex="#C9A84C" dark />
          </div>

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
      {/*  03 TYPOGRAPHY                                                */}
      {/* ============================================================ */}
      <section style={{ ...section, background: COLORS.cream }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={3} />
            <div style={{ ...label, paddingTop: 48 }}>TYPE SYSTEM</div>
            <h2 style={headline}>Typography</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            <div>
              <div style={{ ...label, marginBottom: 16, color: COLORS.orange }}>DISPLAY FONT</div>
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

            <div>
              <div style={{ ...label, marginBottom: 16, color: COLORS.gold }}>HEADLINE + BODY</div>
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
                    Space Grotesk {w} - We make things
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Type scale */}
          <div style={{ marginTop: 80 }}>
            <div style={thinRule} />
            <div style={{ ...label, marginTop: 32, marginBottom: 32 }}>TYPE SCALE</div>
            {[
              { label: 'HERO DISPLAY', family: '"Syne", sans-serif', size: 80, weight: 800, tracking: '-0.03em', sample: 'AOM', lh: 0.9 },
              { label: 'SECTION HEADLINE', family: '"Space Grotesk", sans-serif', size: 42, weight: 700, tracking: '-0.01em', sample: 'We make things that bring opportunity', lh: 1.1 },
              { label: 'BODY', family: '"Space Grotesk", sans-serif', size: 16, weight: 400, tracking: '0', sample: 'AOM is a creative production and AI systems company based in Phoenix, AZ.', lh: 1.7 },
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
                  }}>{item.size}px / {item.weight}</div>
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
            <div style={{ ...label, marginBottom: 24 }}>MIXED-WEIGHT HEADLINES</div>
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
      {/*  04 PATTERNS & ELEMENTS                                       */}
      {/* ============================================================ */}
      <section style={{ ...section, background: COLORS.cream }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={4} />
            <div style={{ ...label, paddingTop: 48 }}>BRAND ELEMENTS</div>
            <h2 style={headline}>Patterns & Elements</h2>
            <p style={body}>
              Supporting visual elements that add texture and personality. Starbursts for energy,
              dot textures for structure, pill badges for categorization. Simple, reusable, consistent.
            </p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24, marginTop: 56,
          }}>
            {/* Starburst */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9, alignSelf: 'flex-start' }}>STARBURST</div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <Starburst size={56} color={COLORS.orange} />
                <Starburst size={40} color={COLORS.orange} />
                <Starburst size={28} color={COLORS.gold} />
              </div>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa' }}>Orange primary, gold accent</span>
            </div>

            {/* Dotted texture */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9, alignSelf: 'flex-start' }}>DOT TEXTURE</div>
              <DottedTexture width={180} height={80} />
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa' }}>Background texture, 12% opacity</span>
            </div>

            {/* Radial dots */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9, alignSelf: 'flex-start' }}>RADIAL DOTS</div>
              <RadialDots size={120} />
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa' }}>Decorative accent element</span>
            </div>

            {/* Pill Badges */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9 }}>PILL BADGES</div>
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

            {/* Orange dot punctuation */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9 }}>SIGNATURE DOT</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 24, height: 24, borderRadius: 12, background: COLORS.orange }} />
                <div style={{ width: 16, height: 16, borderRadius: 8, background: COLORS.orange }} />
                <div style={{ width: 10, height: 10, borderRadius: 5, background: COLORS.orange }} />
                <div style={{ width: 6, height: 6, borderRadius: 3, background: COLORS.orange }} />
              </div>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa' }}>Brand punctuation, always orange</span>
            </div>

            {/* Divider lines */}
            <div style={{
              border: `1px solid ${COLORS.lightBorder}`, borderRadius: 4, padding: 32,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{ ...label, marginBottom: 0, fontSize: 9 }}>RULE LINES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
                <div style={{ height: 3, background: COLORS.black, width: '100%' }} />
                <div style={{ height: 2, background: COLORS.orange, width: '100%' }} />
                <div style={{ height: 1, background: COLORS.lightBorder, width: '100%' }} />
                <div style={{ height: 1.5, background: COLORS.gold, width: '60%', opacity: 0.5 }} />
              </div>
              <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 9, color: '#aaa' }}>Thick black, orange, thin gray, gold accent</span>
            </div>
          </div>

          {/* Data grid / boarding pass */}
          <div style={{ marginTop: 56 }}>
            <div style={{ ...label, marginBottom: 16 }}>DATA GRID (BOARDING PASS AESTHETIC)</div>
            <div style={{
              border: `2px solid ${COLORS.black}`, borderRadius: 4, overflow: 'hidden',
            }}>
              <div style={{
                background: COLORS.black, padding: '16px 24px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <LogoWordmark color={COLORS.cream} size={24} />
                <Starburst size={20} color={COLORS.orange} />
              </div>
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
      {/*  05 PHOTOGRAPHY                                               */}
      {/* ============================================================ */}
      <section style={{ ...section, background: COLORS.black }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={5} />
            <div style={{ ...label, paddingTop: 48, color: COLORS.warmGray }}>IMAGERY</div>
            <h2 style={{ ...headline, color: COLORS.cream }}>Photography Direction</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            <div>
              <div style={{ ...label, color: COLORS.orange, marginBottom: 16 }}>WHAT WE SHOOT</div>
              <ul style={{ ...body, color: '#999', padding: 0, listStyle: 'none', margin: 0 }}>
                {[
                  'Active jobsite footage. Workers building, welding, framing.',
                  'Tight action shots with shallow depth of field.',
                  'Architectural details: scaffolding geometry, rebar patterns.',
                  'Real people doing real work. Never stock, never posed.',
                  'Golden hour and dramatic natural lighting.',
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
              <div style={{ ...label, color: COLORS.gold, marginBottom: 16 }}>TREATMENT</div>
              <ul style={{ ...body, color: '#999', padding: 0, listStyle: 'none', margin: 0 }}>
                {[
                  'Full color, slightly warm (+5-10% warmth in post).',
                  'Photos in defined containers with visible 1px black borders.',
                  'No full-bleed images. Always contained, always structured.',
                  'Duotone option: orange + black for select hero images.',
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
        </div>
      </section>

      <div style={thickRule} />

      {/* ============================================================ */}
      {/*  06 VOICE & TONE                                              */}
      {/* ============================================================ */}
      <section style={{ ...section, background: COLORS.cream }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={6} />
            <div style={{ ...label, paddingTop: 48 }}>BRAND VOICE</div>
            <h2 style={headline}>Voice & Tone</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            <div>
              {[
                { title: 'Confident', desc: 'We know what we do and we do it well. No hedging.' },
                { title: 'Human', desc: 'Anti-BS. Real personality, real warmth.' },
                { title: 'Direct', desc: 'Say it, don\'t decorate it.' },
                { title: 'Knowledgeable', desc: '"We get it." Industry insider.' },
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
                  <div style={{ ...body, paddingLeft: 48 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ ...label, color: COLORS.orange, marginBottom: 24 }}>TONE SPECTRUM</div>
              {[
                { left: 'Casual', right: 'Formal', pos: 30 },
                { left: 'Playful', right: 'Serious', pos: 55 },
                { left: 'Enthusiastic', right: 'Reserved', pos: 35 },
                { left: 'Irreverent', right: 'Respectful', pos: 45 },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 500, color: COLORS.black }}>{item.left}</span>
                    <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 12, fontWeight: 500, color: COLORS.warmGray }}>{item.right}</span>
                  </div>
                  <div style={{ height: 4, background: COLORS.lightBorder, borderRadius: 2, position: 'relative' }}>
                    <div style={{
                      position: 'absolute', top: -4, left: `${item.pos}%`,
                      width: 12, height: 12, borderRadius: 6,
                      background: COLORS.orange, transform: 'translateX(-50%)',
                    }} />
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 40, padding: 24, background: COLORS.darkCream, borderRadius: 4 }}>
                <div style={{ ...label, fontSize: 9, marginBottom: 12 }}>EXAMPLE COPY</div>
                <div style={{
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 600,
                  color: COLORS.black, lineHeight: 1.4, marginBottom: 8,
                }}>"We make things that impact."</div>
                <div style={{ ...body, fontSize: 14 }}>
                  Not "We leverage synergies to drive impactful outcomes."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={thickRule} />

      {/* ============================================================ */}
      {/*  07 DO'S AND DON'TS                                           */}
      {/* ============================================================ */}
      <section style={{ ...section, background: COLORS.cream, paddingBottom: 48 }}>
        <div style={inner}>
          <div style={{ position: 'relative' }}>
            <SectionNumber num={7} />
            <div style={{ ...label, paddingTop: 48 }}>USAGE</div>
            <h2 style={headline}>Do's and Don'ts</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginTop: 48 }}>
            <div>
              <div style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800, color: COLORS.orange, marginBottom: 24 }}>DO</div>
              {[
                'Use mixed-weight headlines for typographic rhythm.',
                'Keep cream/black contrast strong.',
                'Use pill badges for categorization.',
                'Let photos live inside bordered containers.',
                'Use Syne for hero moments only.',
                'Keep orange as activation. Gold as elevation.',
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
            <div>
              <div style={{ fontFamily: '"Syne", sans-serif', fontSize: 24, fontWeight: 800, color: '#C44', marginBottom: 24 }}>DON'T</div>
              {[
                'Use gradients in production. The palette is flat.',
                'Add drop shadows. Use borders instead.',
                'Use Syne for body text.',
                'Use stock photography.',
                'Write corporate speak.',
                'Make the logo smaller than 32px.',
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
            <div style={{ ...label, marginTop: 32, marginBottom: 24 }}>LOGO CLEAR SPACE</div>
            <p style={body}>
              Maintain clear space equal to the height of the "O" counter in the AOM wordmark on all sides.
            </p>
            <div style={{
              marginTop: 24, display: 'inline-flex', padding: 48,
              border: `1px dashed ${COLORS.lightBorder}`, borderRadius: 4,
              position: 'relative',
            }}>
              <LogoWordmark color={COLORS.black} size={48} />
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                border: `1px dashed ${COLORS.orange}`, borderRadius: 4, opacity: 0.4,
              }} />
            </div>
          </div>

          {/* Minimum sizes */}
          <div style={{ marginTop: 48 }}>
            <div style={{ ...label, marginBottom: 24 }}>MINIMUM SIZES</div>
            <div style={{ display: 'flex', gap: 48, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center' }}>
                <LogoWordmark color={COLORS.black} size={48} />
                <div style={{ ...label, marginTop: 8, marginBottom: 0, fontSize: 9 }}>DIGITAL (48PX)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <LogoMark color={COLORS.black} accent={COLORS.orange} size={32} />
                <div style={{ ...label, marginTop: 8, marginBottom: 0, fontSize: 9 }}>MARK MIN (32PX)</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <LogoBadge color={COLORS.black} size={48} />
                <div style={{ ...label, marginTop: 8, marginBottom: 0, fontSize: 9 }}>BADGE MIN (48PX)</div>
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
        <div style={{ ...inner, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          <div>
            <div style={{ marginBottom: 24 }}>
              <LogoWordmark color={COLORS.cream} size={48} />
            </div>
            <div style={{
              fontFamily: '"Space Grotesk", sans-serif', fontSize: 14, fontWeight: 400,
              color: COLORS.warmGray, lineHeight: 1.7, maxWidth: 320,
            }}>
              Creative production and AI systems for companies that build. Phoenix, AZ.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <Badge color={COLORS.warmGray}>VIDEO</Badge>
              <Badge color={COLORS.warmGray}>WEB</Badge>
              <Badge color={COLORS.warmGray}>BRAND</Badge>
              <Badge color={COLORS.warmGray}>AI</Badge>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            {[
              { label: 'DIRECTION', value: 'C: Bold Graphic' },
              { label: 'FONTS', value: 'Syne + Space Grotesk' },
              { label: 'VERSION', value: 'Final' },
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
