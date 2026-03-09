import React, { useState, useEffect } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Theme definitions from Steffen's 3 brand directions                */
/* ------------------------------------------------------------------ */

const themes = {
  A: {
    id: 'A',
    label: 'A: INDUSTRIAL',
    vibe: 'Type is the architecture. Everything else is restraint.',
    headlineFont: '"Bebas Neue", sans-serif',
    bodyFont: '"IBM Plex Mono", monospace',
    displayFont: '"Bebas Neue", sans-serif',
    colors: {
      bgPrimary: '#0A0A0A',
      bgAlt: '#111111',
      textPrimary: '#F5F5F5',
      textSecondary: '#8A8A8A',
      accent: '#FF4D00',
      accentSecondary: '#FF4D00',
      border: '#222222',
      borderHover: '#333333',
    },
    hero: {
      fontSize: '120px',
      mobileFontSize: '64px',
      lineHeight: '0.95',
      tracking: '0.05em',
      weight: '400',
    },
    section: {
      labelSize: '11px',
      labelWeight: '500',
      labelTracking: '0.2em',
      bodySize: '15px',
      bodyLineHeight: '1.7',
      bodyTracking: '0.01em',
      spacing: '160px',
      mobileSpacing: '80px',
    },
    unique: 'noise', // noise texture + orange bar
  },
  B: {
    id: 'B',
    label: 'B: EDITORIAL',
    vibe: 'The quiet confidence of a studio that doesn\'t need to shout.',
    headlineFont: '"Playfair Display", serif',
    bodyFont: '"Inter", sans-serif',
    displayFont: '"Playfair Display", serif',
    colors: {
      bgPrimary: '#F7F5F2',
      bgAlt: '#1A1A1A',
      textPrimary: '#1A1A1A',
      textSecondary: '#6B6B6B',
      accent: '#E85D26',
      accentSecondary: '#E85D26',
      border: '#E0DCD7',
      borderHover: '#CCC8C2',
    },
    hero: {
      fontSize: '64px',
      mobileFontSize: '40px',
      lineHeight: '1.05',
      tracking: '-0.02em',
      weight: '700',
    },
    section: {
      labelSize: '11px',
      labelWeight: '600',
      labelTracking: '0.15em',
      bodySize: '16px',
      bodyLineHeight: '1.75',
      bodyTracking: '0',
      spacing: '120px',
      mobileSpacing: '64px',
    },
    unique: 'circle', // orange circle motif
  },
  C: {
    id: 'C',
    label: 'C: BOLD GRAPHIC',
    vibe: 'Structured personality. The brand has a voice you can hear through the typography.',
    headlineFont: '"Space Grotesk", sans-serif',
    bodyFont: '"Space Grotesk", sans-serif',
    displayFont: '"Syne", sans-serif',
    displayWeight: '800',
    colors: {
      bgPrimary: '#F2EDE8',
      bgAlt: '#0A0A0A',
      textPrimary: '#0A0A0A',
      textSecondary: '#7A7267',
      accent: '#FF5C1A',
      accentSecondary: '#D4A843',
      border: '#0A0A0A',
      borderHover: '#333333',
    },
    hero: {
      fontSize: '96px',
      mobileFontSize: '48px',
      lineHeight: '0.9',
      tracking: '-0.03em',
      weight: '800',
    },
    section: {
      labelSize: '11px',
      labelWeight: '500',
      labelTracking: '0.2em',
      bodySize: '16px',
      bodyLineHeight: '1.7',
      bodyTracking: '0',
      spacing: '100px',
      mobileSpacing: '56px',
    },
    unique: 'badges', // badge system + mixed weight
  },
}

/* ------------------------------------------------------------------ */
/*  Color palettes per direction                                       */
/* ------------------------------------------------------------------ */

const colorSets = {
  A: [
    { name: 'True Black', hex: '#0A0A0A', role: 'Background (primary)' },
    { name: 'Off-black', hex: '#111111', role: 'Background (alternate)' },
    { name: 'White', hex: '#F5F5F5', role: 'Text (primary)' },
    { name: 'Warm Gray', hex: '#8A8A8A', role: 'Text (secondary)' },
    { name: 'Safety Orange', hex: '#FF4D00', role: 'Accent (primary)' },
  ],
  B: [
    { name: 'Warm White', hex: '#F7F5F2', role: 'Background (primary)' },
    { name: 'Deep Charcoal', hex: '#1A1A1A', role: 'Background (alternate)' },
    { name: 'Near-black', hex: '#1A1A1A', role: 'Text (on light)' },
    { name: 'Warm White', hex: '#F7F5F2', role: 'Text (on dark)' },
    { name: 'Mid Gray', hex: '#6B6B6B', role: 'Text (secondary)' },
    { name: 'Burnt Orange', hex: '#E85D26', role: 'Accent (primary)' },
  ],
  C: [
    { name: 'Cream', hex: '#F2EDE8', role: 'Background (primary)' },
    { name: 'True Black', hex: '#0A0A0A', role: 'Background (alternate)' },
    { name: 'Black', hex: '#0A0A0A', role: 'Text (on light)' },
    { name: 'Cream', hex: '#F2EDE8', role: 'Text (on dark)' },
    { name: 'Warm Mid-gray', hex: '#7A7267', role: 'Text (secondary)' },
    { name: 'Vivid Orange', hex: '#FF5C1A', role: 'Accent (primary)' },
    { name: 'Warm Gold', hex: '#D4A843', role: 'Accent (secondary)' },
  ],
}

/* ------------------------------------------------------------------ */
/*  Typography specs per direction                                     */
/* ------------------------------------------------------------------ */

const typeSpecs = {
  A: [
    { role: 'Headlines', font: 'Bebas Neue', weight: '400', size: '72-120px', lh: '0.95', tracking: '+0.05em' },
    { role: 'Section Labels', font: 'IBM Plex Mono', weight: '500', size: '11px', lh: '1.4', tracking: '+0.2em' },
    { role: 'Body', font: 'IBM Plex Mono', weight: '400', size: '15px', lh: '1.7', tracking: '+0.01em' },
    { role: 'Micro-labels', font: 'IBM Plex Mono', weight: '600', size: '10px', lh: '1.2', tracking: '+0.25em' },
    { role: 'Stat Numbers', font: 'Bebas Neue', weight: '400', size: '96-144px', lh: '1.0', tracking: '0' },
  ],
  B: [
    { role: 'Headlines', font: 'Playfair Display', weight: '700', size: '56-80px', lh: '1.05', tracking: '-0.02em' },
    { role: 'Subheadlines', font: 'Inter', weight: '500', size: '20px', lh: '1.4', tracking: '+0.02em' },
    { role: 'Section Labels', font: 'Inter', weight: '600', size: '11px', lh: '1.4', tracking: '+0.15em' },
    { role: 'Body', font: 'Inter', weight: '400', size: '16px', lh: '1.75', tracking: '0' },
    { role: 'Pull Quotes', font: 'Playfair Display Italic', weight: '400', size: '28px', lh: '1.3', tracking: '0' },
  ],
  C: [
    { role: 'Hero Display', font: 'Syne', weight: '800', size: '80-120px', lh: '0.9', tracking: '-0.03em' },
    { role: 'Section Headlines', font: 'Space Grotesk', weight: '700', size: '36-48px', lh: '1.1', tracking: '-0.01em' },
    { role: 'Section Labels', font: 'Space Grotesk', weight: '500', size: '11px', lh: '1.4', tracking: '+0.2em' },
    { role: 'Body', font: 'Space Grotesk', weight: '400', size: '16px', lh: '1.7', tracking: '0' },
    { role: 'Badges', font: 'Space Grotesk', weight: '700', size: '10px', lh: '1.2', tracking: '+0.15em' },
  ],
}

/* ------------------------------------------------------------------ */
/*  Voice content per direction                                        */
/* ------------------------------------------------------------------ */

const voiceContent = {
  A: {
    tone: 'Direct. Minimal. Let the work speak.',
    principles: [
      'Type does the talking. Less color, more structure.',
      'Every pixel earns its place. No decoration.',
      'The constraint IS the system.',
      'Monospace = the machine layer. Headlines = the human statement.',
    ],
    sample: '"We build systems. The content runs itself."',
  },
  B: {
    tone: 'Confident and warm. Editorial authority without pretension.',
    principles: [
      'Write like someone who truly understands.',
      'Serif headlines carry weight. Sans body keeps it readable.',
      'Warmth through restraint, not through excess.',
      'The orange circle is punctuation. It appears, it means something.',
    ],
    sample: '"We make things that impact."',
  },
  C: {
    tone: 'Energetic and structured. Personality with a system behind it.',
    principles: [
      'Mixed weight headlines create visual rhythm.',
      'Badges make capabilities scannable.',
      'Bold and regular alternate within a single line.',
      'Two accent colors give range without chaos.',
    ],
    sample: '"WE make THINGS that BRING opportunity."',
  },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function CopyButton({ text, theme }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      style={{ color: theme.colors.textSecondary, marginLeft: '8px', display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
      title="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

/* ------------------------------------------------------------------ */
/*  Direction A: INDUSTRIAL                                            */
/* ------------------------------------------------------------------ */

function IndustrialPage({ theme, scrollTo }) {
  const t = theme
  const c = t.colors
  const mobile = isMobile()
  const sectionSpacing = mobile ? t.section.mobileSpacing : t.section.spacing

  return (
    <div style={{ background: c.bgPrimary, color: c.textPrimary, minHeight: '100vh', position: 'relative' }}>
      {/* Noise overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, opacity: 0.04, mixBlendMode: 'overlay' }}>
        <svg width="100%" height="100%">
          <filter id="noise-a"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#noise-a)" />
        </svg>
      </div>

      {/* Hero */}
      <section style={{ padding: mobile ? '80px 24px' : '160px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ fontFamily: t.headlineFont, fontSize: mobile ? t.hero.mobileFontSize : t.hero.fontSize, fontWeight: t.hero.weight, letterSpacing: t.hero.tracking, lineHeight: t.hero.lineHeight, color: c.textPrimary, textTransform: 'uppercase' }}>
          AHEAD<br />OF<br />MARKET
        </div>
        {/* Orange bar */}
        <div style={{ width: '40vw', height: '8px', background: c.accent, margin: '32px 0 24px' }} />
        <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.25em', color: c.textSecondary, lineHeight: 1.4 }}>
          CREATIVE PRODUCTION + AI SYSTEMS
        </p>
      </section>

      {/* Section 01: Colors */}
      <section style={{ padding: `${sectionSpacing} 0`, maxWidth: '1100px', margin: '0 auto', paddingLeft: mobile ? '24px' : '48px', paddingRight: mobile ? '24px' : '48px' }}>
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: '48px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '48px' }}>
            <span style={{ fontFamily: t.headlineFont, fontSize: '48px', color: c.textSecondary, lineHeight: 1, opacity: 0.3 }}>01</span>
            <div>
              <p style={{ fontFamily: t.bodyFont, fontSize: t.section.labelSize, fontWeight: t.section.labelWeight, textTransform: 'uppercase', letterSpacing: t.section.labelTracking, color: c.textSecondary, marginBottom: '8px' }}>COLOR SYSTEM</p>
              <h2 style={{ fontFamily: t.headlineFont, fontSize: mobile ? '40px' : '72px', fontWeight: 400, letterSpacing: '0.05em', lineHeight: 0.95, textTransform: 'uppercase' }}>PALETTE</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: '16px' }}>
            {colorSets.A.map(col => (
              <div key={col.hex + col.role}>
                <div style={{ height: mobile ? '80px' : '120px', background: col.hex, border: `1px solid ${c.border}`, position: 'relative' }}>
                  <span style={{ position: 'absolute', bottom: '8px', left: '12px', fontFamily: t.bodyFont, fontSize: '10px', fontWeight: 600, color: col.hex === '#0A0A0A' || col.hex === '#111111' ? '#F5F5F5' : '#0A0A0A' }}>{col.hex}</span>
                </div>
                <p style={{ fontFamily: t.bodyFont, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.25em', color: c.textSecondary, marginTop: '8px' }}>{col.name}</p>
                <p style={{ fontFamily: t.bodyFont, fontSize: '10px', color: c.textSecondary, opacity: 0.6 }}>{col.role}</p>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: t.bodyFont, fontSize: t.section.bodySize, color: c.textSecondary, lineHeight: t.section.bodyLineHeight, marginTop: '32px', maxWidth: '560px' }}>
            No gradients. No additional colors. The constraint IS the system.
          </p>
        </div>
      </section>

      {/* Section 02: Typography */}
      <section style={{ padding: `${sectionSpacing} 0`, maxWidth: '1100px', margin: '0 auto', paddingLeft: mobile ? '24px' : '48px', paddingRight: mobile ? '24px' : '48px' }}>
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: '48px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '48px' }}>
            <span style={{ fontFamily: t.headlineFont, fontSize: '48px', color: c.textSecondary, lineHeight: 1, opacity: 0.3 }}>02</span>
            <div>
              <p style={{ fontFamily: t.bodyFont, fontSize: t.section.labelSize, fontWeight: t.section.labelWeight, textTransform: 'uppercase', letterSpacing: t.section.labelTracking, color: c.textSecondary, marginBottom: '8px' }}>TYPOGRAPHY</p>
              <h2 style={{ fontFamily: t.headlineFont, fontSize: mobile ? '40px' : '72px', fontWeight: 400, letterSpacing: '0.05em', lineHeight: 0.95, textTransform: 'uppercase' }}>TYPE SYSTEM</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {typeSpecs.A.map(spec => (
              <div key={spec.role} style={{ borderBottom: `1px solid ${c.border}`, paddingBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontFamily: t.bodyFont, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.25em', color: c.accent }}>{spec.role}</span>
                  <span style={{ fontFamily: t.bodyFont, fontSize: '10px', color: c.textSecondary }}>{spec.font} / {spec.weight} / {spec.size}</span>
                </div>
                <div style={{ fontFamily: spec.font === 'Bebas Neue' ? t.headlineFont : t.bodyFont, fontSize: spec.role === 'Stat Numbers' ? (mobile ? '64px' : '96px') : spec.role === 'Headlines' ? (mobile ? '40px' : '72px') : spec.size.split('-').pop() || spec.size, fontWeight: spec.weight, letterSpacing: spec.tracking, lineHeight: spec.lh, textTransform: spec.role === 'Headlines' || spec.role === 'Section Labels' || spec.role === 'Micro-labels' || spec.role === 'Stat Numbers' ? 'uppercase' : 'none' }}>
                  {spec.role === 'Headlines' && 'BRAND INFRASTRUCTURE'}
                  {spec.role === 'Section Labels' && 'OUR SERVICES'}
                  {spec.role === 'Body' && 'AOM builds the content, websites, and systems that make companies impossible to ignore.'}
                  {spec.role === 'Micro-labels' && 'PHOENIX, AZ / EST. 2020'}
                  {spec.role === 'Stat Numbers' && '30+'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 03: Layout */}
      <section style={{ padding: `${sectionSpacing} 0`, maxWidth: '1100px', margin: '0 auto', paddingLeft: mobile ? '24px' : '48px', paddingRight: mobile ? '24px' : '48px' }}>
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: '48px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '48px' }}>
            <span style={{ fontFamily: t.headlineFont, fontSize: '48px', color: c.textSecondary, lineHeight: 1, opacity: 0.3 }}>03</span>
            <div>
              <p style={{ fontFamily: t.bodyFont, fontSize: t.section.labelSize, fontWeight: t.section.labelWeight, textTransform: 'uppercase', letterSpacing: t.section.labelTracking, color: c.textSecondary, marginBottom: '8px' }}>LAYOUT</p>
              <h2 style={{ fontFamily: t.headlineFont, fontSize: mobile ? '40px' : '72px', fontWeight: 400, letterSpacing: '0.05em', lineHeight: 0.95, textTransform: 'uppercase' }}>VISUAL RULES</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '32px' }}>
            {[
              { label: 'GRID', value: '12-column, content in 8-10 columns, left-aligned' },
              { label: 'SECTION SPACING', value: '160px desktop / 80px mobile' },
              { label: 'DIVIDERS', value: '1px horizontal rules in #222222, full-width' },
              { label: 'BODY MAX-WIDTH', value: '560px' },
              { label: 'IMAGERY', value: 'Desaturated or B&W, high contrast, film grain 4-6%' },
              { label: 'CORNERS', value: 'Sharp edges only. No rounded corners.' },
            ].map(item => (
              <div key={item.label} style={{ borderBottom: `1px solid ${c.border}`, paddingBottom: '16px' }}>
                <p style={{ fontFamily: t.bodyFont, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.25em', color: c.textSecondary, marginBottom: '6px' }}>{item.label}</p>
                <p style={{ fontFamily: t.bodyFont, fontSize: t.section.bodySize, color: c.textPrimary, lineHeight: t.section.bodyLineHeight }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 04: Voice */}
      <section style={{ padding: `${sectionSpacing} 0`, maxWidth: '1100px', margin: '0 auto', paddingLeft: mobile ? '24px' : '48px', paddingRight: mobile ? '24px' : '48px' }}>
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: '48px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '48px' }}>
            <span style={{ fontFamily: t.headlineFont, fontSize: '48px', color: c.textSecondary, lineHeight: 1, opacity: 0.3 }}>04</span>
            <div>
              <p style={{ fontFamily: t.bodyFont, fontSize: t.section.labelSize, fontWeight: t.section.labelWeight, textTransform: 'uppercase', letterSpacing: t.section.labelTracking, color: c.textSecondary, marginBottom: '8px' }}>VOICE</p>
              <h2 style={{ fontFamily: t.headlineFont, fontSize: mobile ? '40px' : '72px', fontWeight: 400, letterSpacing: '0.05em', lineHeight: 0.95, textTransform: 'uppercase' }}>HOW WE TALK</h2>
            </div>
          </div>
          <p style={{ fontFamily: t.bodyFont, fontSize: t.section.bodySize, color: c.textSecondary, lineHeight: t.section.bodyLineHeight, marginBottom: '32px', maxWidth: '560px' }}>
            {voiceContent.A.tone}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 48px' }}>
            {voiceContent.A.principles.map((p, i) => (
              <li key={i} style={{ fontFamily: t.bodyFont, fontSize: t.section.bodySize, color: c.textPrimary, lineHeight: t.section.bodyLineHeight, padding: '12px 0', borderBottom: `1px solid ${c.border}`, display: 'flex', gap: '16px', alignItems: 'baseline' }}>
                <span style={{ color: c.accent, fontFamily: t.headlineFont, fontSize: '20px' }}>{String(i + 1).padStart(2, '0')}</span>
                {p}
              </li>
            ))}
          </ul>
          <div style={{ fontFamily: t.headlineFont, fontSize: mobile ? '32px' : '48px', color: c.textPrimary, letterSpacing: '0.05em', lineHeight: 0.95, textTransform: 'uppercase' }}>
            {voiceContent.A.sample}
          </div>
        </div>
      </section>

      {/* Unique element callout */}
      <section style={{ padding: `${sectionSpacing} 0`, maxWidth: '1100px', margin: '0 auto', paddingLeft: mobile ? '24px' : '48px', paddingRight: mobile ? '24px' : '48px', paddingBottom: '80px' }}>
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: '48px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '32px' }}>
            <span style={{ fontFamily: t.headlineFont, fontSize: '48px', color: c.textSecondary, lineHeight: 1, opacity: 0.3 }}>05</span>
            <div>
              <p style={{ fontFamily: t.bodyFont, fontSize: t.section.labelSize, fontWeight: t.section.labelWeight, textTransform: 'uppercase', letterSpacing: t.section.labelTracking, color: c.textSecondary, marginBottom: '8px' }}>SIGNATURE ELEMENT</p>
              <h2 style={{ fontFamily: t.headlineFont, fontSize: mobile ? '40px' : '72px', fontWeight: 400, letterSpacing: '0.05em', lineHeight: 0.95, textTransform: 'uppercase' }}>NOISE + BAR</h2>
            </div>
          </div>
          <p style={{ fontFamily: t.bodyFont, fontSize: t.section.bodySize, color: c.textSecondary, lineHeight: t.section.bodyLineHeight, maxWidth: '560px', marginBottom: '32px' }}>
            Subtle film grain (SVG noise filter) at 3-5% opacity layered over all backgrounds. A single horizontal orange bar (8px tall, full-width) between the hero and content. This bar is the brand mark. It appears once, prominently.
          </p>
          <div style={{ width: '100%', height: '8px', background: c.accent }} />
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${c.border}`, padding: '48px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
          <p style={{ fontFamily: t.bodyFont, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.25em', color: c.textSecondary }}>AOM Brand Direction A</p>
          <p style={{ fontFamily: t.bodyFont, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.25em', color: c.textSecondary }}>Industrial</p>
          <p style={{ fontFamily: t.bodyFont, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.25em', color: c.textSecondary }}>Phoenix, AZ</p>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Direction B: EDITORIAL                                             */
/* ------------------------------------------------------------------ */

function EditorialPage({ theme }) {
  const t = theme
  const c = t.colors
  const mobile = isMobile()
  const sectionSpacing = mobile ? t.section.mobileSpacing : t.section.spacing

  const lightSection = { background: c.bgPrimary, color: '#1A1A1A' }
  const darkSection = { background: c.bgAlt, color: '#F7F5F2' }

  return (
    <div style={{ background: c.bgPrimary, color: c.textPrimary, minHeight: '100vh' }}>
      {/* Hero - light */}
      <section style={{ ...lightSection, padding: mobile ? '80px 24px' : '120px 120px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: c.textSecondary, marginBottom: '40px' }}>AOM Brand Direction</p>
          <h1 style={{ fontFamily: t.headlineFont, fontSize: mobile ? t.hero.mobileFontSize : t.hero.fontSize, fontWeight: t.hero.weight, letterSpacing: t.hero.tracking, lineHeight: t.hero.lineHeight }}>
            We make things<br />that <em>impact</em><span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', background: c.accent, verticalAlign: 'baseline', marginLeft: '4px', position: 'relative', top: '-2px' }} />
          </h1>
          <p style={{ fontFamily: t.bodyFont, fontSize: '16px', color: c.textSecondary, marginTop: '24px', lineHeight: 1.75, maxWidth: '640px', margin: '24px auto 0' }}>
            Creative production and AI systems for companies that build.
          </p>
        </div>
      </section>

      {/* Colors - dark section */}
      <section style={{ ...darkSection, padding: mobile ? `${sectionSpacing} 24px` : `${sectionSpacing} 120px` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6B6B6B', marginBottom: '16px' }}>Color System</p>
          <h2 style={{ fontFamily: t.headlineFont, fontSize: mobile ? '32px' : '56px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05, color: '#F7F5F2', marginBottom: '48px' }}>
            Warm, <em>not cold</em>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '24px' }}>
            {colorSets.B.map(col => (
              <div key={col.hex + col.role}>
                <div style={{ height: '100px', background: col.hex, border: col.hex === '#F7F5F2' ? '1px solid #333' : 'none', position: 'relative' }}>
                  <span style={{ position: 'absolute', bottom: '8px', left: '12px', fontFamily: t.bodyFont, fontSize: '11px', color: col.hex === '#1A1A1A' || col.hex === '#6B6B6B' ? '#F7F5F2' : '#1A1A1A' }}>{col.hex}</span>
                </div>
                <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6B6B6B', marginTop: '12px' }}>{col.name}</p>
                <p style={{ fontFamily: t.bodyFont, fontSize: '14px', color: '#F7F5F2', marginTop: '4px' }}>{col.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Typography - light section */}
      <section style={{ ...lightSection, padding: mobile ? `${sectionSpacing} 24px` : `${sectionSpacing} 120px` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: c.textSecondary, marginBottom: '16px' }}>Typography</p>
          <h2 style={{ fontFamily: t.headlineFont, fontSize: mobile ? '32px' : '56px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: '48px' }}>
            Serif meets <em>sans</em>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {typeSpecs.B.map(spec => (
              <div key={spec.role} style={{ paddingBottom: '32px', borderBottom: '1px solid #E0DCD7' }}>
                <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: c.accent, marginBottom: '8px' }}>{spec.role}</p>
                <p style={{ fontFamily: t.bodyFont, fontSize: '14px', color: c.textSecondary, marginBottom: '16px' }}>
                  {spec.font} / Weight {spec.weight} / {spec.size}
                </p>
                <div style={{ fontFamily: spec.font.includes('Playfair') ? t.headlineFont : t.bodyFont, fontSize: spec.role === 'Headlines' ? (mobile ? '32px' : '56px') : spec.role === 'Pull Quotes' ? '28px' : spec.role === 'Subheadlines' ? '20px' : spec.size, fontWeight: spec.weight, letterSpacing: spec.tracking, lineHeight: spec.lh, fontStyle: spec.font.includes('Italic') || spec.role === 'Pull Quotes' ? 'italic' : 'normal', textTransform: spec.role === 'Section Labels' ? 'uppercase' : 'none', maxWidth: '640px' }}>
                  {spec.role === 'Headlines' && 'Brand Infrastructure'}
                  {spec.role === 'Subheadlines' && 'The system behind the brand'}
                  {spec.role === 'Section Labels' && 'Our Services'}
                  {spec.role === 'Body' && 'AOM builds the content, websites, and systems that make companies impossible to ignore.'}
                  {spec.role === 'Pull Quotes' && '"We built this for ourselves first. Now we\'re opening it up."'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Layout - dark section */}
      <section style={{ ...darkSection, padding: mobile ? `${sectionSpacing} 24px` : `${sectionSpacing} 120px` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6B6B6B', marginBottom: '16px' }}>Layout & Visual Language</p>
          <h2 style={{ fontFamily: t.headlineFont, fontSize: mobile ? '32px' : '56px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05, color: '#F7F5F2', marginBottom: '48px' }}>
            Let things <em>breathe</em>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {[
              { label: 'Grid', desc: '12-column, generous margins (120px desktop sides)' },
              { label: 'Section Rhythm', desc: 'Alternating light and dark sections. Every other major section flips. Magazine-spread rhythm.' },
              { label: 'Spacing', desc: '120px between sections desktop, 64px mobile. Minimum 40px between any two elements.' },
              { label: 'Dividers', desc: 'None. The light/dark alternation IS the divider.' },
              { label: 'Images', desc: '80% viewport width, centered. Small caption below in 11px uppercase.' },
              { label: 'CTAs', desc: 'Single orange circle (64px) with white text, or orange text link with arrow. Never full-width.' },
            ].map(item => (
              <div key={item.label} style={{ paddingBottom: '24px', borderBottom: '1px solid #333' }}>
                <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6B6B6B', marginBottom: '8px' }}>{item.label}</p>
                <p style={{ fontFamily: t.bodyFont, fontSize: '16px', color: '#F7F5F2', lineHeight: 1.75 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voice - light section */}
      <section style={{ ...lightSection, padding: mobile ? `${sectionSpacing} 24px` : `${sectionSpacing} 120px` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: c.textSecondary, marginBottom: '16px' }}>Voice & Tone</p>
          <h2 style={{ fontFamily: t.headlineFont, fontSize: mobile ? '32px' : '56px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: '48px' }}>
            How we <em>talk</em>
          </h2>
          <p style={{ fontFamily: t.bodyFont, fontSize: '16px', color: c.textSecondary, lineHeight: 1.75, marginBottom: '40px', maxWidth: '640px' }}>
            {voiceContent.B.tone}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 48px' }}>
            {voiceContent.B.principles.map((p, i) => (
              <li key={i} style={{ fontFamily: t.bodyFont, fontSize: '16px', color: '#1A1A1A', lineHeight: 1.75, padding: '16px 0', borderBottom: '1px solid #E0DCD7' }}>
                {p}
              </li>
            ))}
          </ul>
          {/* Pull quote with orange circle */}
          <div style={{ fontFamily: t.headlineFont, fontSize: mobile ? '24px' : '28px', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.3, color: '#1A1A1A' }}>
            {voiceContent.B.sample}
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: c.accent, marginLeft: '6px', verticalAlign: 'baseline' }} />
          </div>
        </div>
      </section>

      {/* Unique element - dark section */}
      <section style={{ ...darkSection, padding: mobile ? `${sectionSpacing} 24px` : `${sectionSpacing} 120px` }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#6B6B6B', marginBottom: '16px' }}>Signature Element</p>
          <h2 style={{ fontFamily: t.headlineFont, fontSize: mobile ? '32px' : '56px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05, color: '#F7F5F2', marginBottom: '48px' }}>
            The orange <em>circle</em>
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: c.accent }} />
          </div>
          <p style={{ fontFamily: t.bodyFont, fontSize: '16px', color: '#6B6B6B', lineHeight: 1.75, maxWidth: '640px', margin: '0 auto' }}>
            A single filled circle in {c.accent} used as a recurring brand element. It appears as the CTA button shape, a dot on the navigation indicator, a period at the end of the main headline, and as an overlay accent on B&W photography. It's always the same size relative to context. It's the punctuation mark of the brand.
          </p>
        </div>
      </section>

      {/* Footer - light */}
      <footer style={{ ...lightSection, padding: '48px 120px', textAlign: 'center' }}>
        <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: c.textSecondary }}>
          AOM Brand Direction B / Editorial
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.accent }} />
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Direction C: BOLD GRAPHIC                                          */
/* ------------------------------------------------------------------ */

function BoldGraphicPage({ theme }) {
  const t = theme
  const c = t.colors
  const mobile = isMobile()
  const sectionSpacing = mobile ? t.section.mobileSpacing : t.section.spacing

  const Badge = ({ children, color }) => (
    <span style={{ fontFamily: t.bodyFont, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', border: `1px solid ${color || c.textPrimary}`, padding: '2px 10px', display: 'inline-block', color: color || c.textPrimary }}>
      {children}
    </span>
  )

  return (
    <div style={{ background: c.bgPrimary, color: c.textPrimary, minHeight: '100vh' }}>
      {/* Hero - cream */}
      <section style={{ background: c.bgPrimary, padding: mobile ? '80px 24px' : '120px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <div>
          <h1 style={{ lineHeight: t.hero.lineHeight, letterSpacing: t.hero.tracking, marginBottom: '32px' }}>
            <span style={{ fontFamily: t.displayFont, fontSize: mobile ? t.hero.mobileFontSize : t.hero.fontSize, fontWeight: 800 }}>WE </span>
            <span style={{ fontFamily: t.bodyFont, fontSize: mobile ? t.hero.mobileFontSize : t.hero.fontSize, fontWeight: 400 }}>make </span>
            <span style={{ fontFamily: t.displayFont, fontSize: mobile ? t.hero.mobileFontSize : t.hero.fontSize, fontWeight: 800 }}>THINGS</span>
            <br />
            <span style={{ fontFamily: t.bodyFont, fontSize: mobile ? t.hero.mobileFontSize : t.hero.fontSize, fontWeight: 400 }}>that </span>
            <span style={{ fontFamily: t.displayFont, fontSize: mobile ? t.hero.mobileFontSize : t.hero.fontSize, fontWeight: 800 }}>BRING</span>
            <br />
            <span style={{ fontFamily: t.bodyFont, fontSize: mobile ? t.hero.mobileFontSize : t.hero.fontSize, fontWeight: 400 }}>opportunity.</span>
          </h1>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <Badge>VIDEO</Badge>
            <Badge>WEB</Badge>
            <Badge>AI</Badge>
          </div>
          <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', color: c.textSecondary }}>
            Phoenix, AZ &bull; Est. 2020
          </p>
        </div>
      </section>

      {/* Thick divider */}
      <div style={{ height: '3px', background: c.textPrimary, margin: '0 48px' }} />

      {/* Colors - black section */}
      <section style={{ background: c.bgAlt, color: c.bgPrimary, padding: mobile ? `${sectionSpacing} 24px` : `${sectionSpacing} 48px` }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'baseline', marginBottom: '48px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: t.displayFont, fontSize: '64px', fontWeight: 800, color: c.accent, lineHeight: 1 }}>01</span>
            <div>
              <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', color: c.textSecondary, marginBottom: '8px' }}>COLOR SYSTEM</p>
              <h2 style={{ fontFamily: t.bodyFont, fontSize: mobile ? '32px' : '48px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1, color: '#F2EDE8' }}>Palette</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
            {colorSets.C.map(col => (
              <div key={col.hex + col.role} style={{ border: `1px solid ${col.hex === '#0A0A0A' ? '#333' : c.textPrimary}`, padding: '0' }}>
                <div style={{ height: '80px', background: col.hex }} />
                <div style={{ padding: '12px', background: c.bgAlt, borderTop: `1px solid ${col.hex === '#0A0A0A' ? '#333' : '#333'}` }}>
                  <p style={{ fontFamily: t.bodyFont, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#F2EDE8' }}>{col.name}</p>
                  <p style={{ fontFamily: t.bodyFont, fontSize: '10px', color: c.textSecondary, marginTop: '2px' }}>{col.hex}</p>
                  <p style={{ fontFamily: t.bodyFont, fontSize: '10px', color: c.textSecondary, marginTop: '2px' }}>{col.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Thick divider */}
      <div style={{ height: '3px', background: c.textPrimary }} />

      {/* Typography - cream section */}
      <section style={{ background: c.bgPrimary, padding: mobile ? `${sectionSpacing} 24px` : `${sectionSpacing} 48px` }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'baseline', marginBottom: '48px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: t.displayFont, fontSize: '64px', fontWeight: 800, color: c.accent, lineHeight: 1 }}>02</span>
            <div>
              <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', color: c.textSecondary, marginBottom: '8px' }}>TYPOGRAPHY</p>
              <h2 style={{ fontFamily: t.bodyFont, fontSize: mobile ? '32px' : '48px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Type System</h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {typeSpecs.C.map((spec, i) => (
              <div key={spec.role} style={{ padding: '24px 0', borderBottom: `1px solid ${c.textPrimary}` }}>
                <div style={{ display: mobile ? 'block' : 'flex', justifyContent: 'space-between', gap: '24px' }}>
                  <div style={{ minWidth: mobile ? 'auto' : '200px', marginBottom: mobile ? '12px' : 0 }}>
                    <Badge color={c.accent}>{spec.role}</Badge>
                    <p style={{ fontFamily: t.bodyFont, fontSize: '14px', color: c.textSecondary, marginTop: '8px' }}>
                      {spec.font} / {spec.weight} / {spec.size}
                    </p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: spec.font === 'Syne' ? t.displayFont : t.bodyFont, fontSize: spec.role === 'Hero Display' ? (mobile ? '48px' : '80px') : spec.role === 'Section Headlines' ? (mobile ? '28px' : '40px') : spec.size.split('-').pop() || spec.size, fontWeight: spec.weight, letterSpacing: spec.tracking, lineHeight: spec.lh, textTransform: spec.role === 'Section Labels' || spec.role === 'Badges' ? 'uppercase' : 'none' }}>
                      {spec.role === 'Hero Display' && (
                        <>
                          <span style={{ fontWeight: 800 }}>MAKING </span>
                          <span style={{ fontWeight: 400, fontFamily: t.bodyFont }}>visual </span>
                          <span style={{ fontWeight: 800 }}>IDENTITY</span>
                        </>
                      )}
                      {spec.role === 'Section Headlines' && 'Brand Infrastructure'}
                      {spec.role === 'Section Labels' && 'Our Services'}
                      {spec.role === 'Body' && 'AOM builds the content, websites, and systems that make companies impossible to ignore.'}
                      {spec.role === 'Badges' && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <Badge>PRODUCTION</Badge>
                          <Badge>SOCIAL</Badge>
                          <Badge>SYSTEMS</Badge>
                          <Badge color={c.accentSecondary}>GOLD</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Thick divider */}
      <div style={{ height: '3px', background: c.textPrimary }} />

      {/* Layout - black section */}
      <section style={{ background: c.bgAlt, color: '#F2EDE8', padding: mobile ? `${sectionSpacing} 24px` : `${sectionSpacing} 48px` }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'baseline', marginBottom: '48px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: t.displayFont, fontSize: '64px', fontWeight: 800, color: c.accentSecondary, lineHeight: 1 }}>03</span>
            <div>
              <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', color: c.textSecondary, marginBottom: '8px' }}>LAYOUT & VISUAL</p>
              <h2 style={{ fontFamily: t.bodyFont, fontSize: mobile ? '32px' : '48px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1, color: '#F2EDE8' }}>Visual Rules</h2>
            </div>
          </div>
          {/* Card grid */}
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Grid', value: '12-column, intentional breaks. Asymmetric splits (5/7, 4/8).' },
              { label: 'Dividers', value: 'Thick black rules (3px) between sections. Thin (1px) within.' },
              { label: 'Badges', value: 'Key descriptors in bordered pills: VIDEO, WEB, BRAND, AI.' },
              { label: 'Cards', value: 'Visible 1px border, 24px padding, stacked with 8px gaps.' },
              { label: 'Imagery', value: 'Full color, warm. In bordered containers. Duotone option for hero.' },
              { label: 'Numbers', value: 'Syne 64px for numbers + Space Grotesk 400 for labels.' },
            ].map(item => (
              <div key={item.label} style={{ border: '1px solid #333', padding: '24px', background: c.bgAlt }}>
                <Badge color="#F2EDE8">{item.label}</Badge>
                <p style={{ fontFamily: t.bodyFont, fontSize: '16px', color: '#F2EDE8', lineHeight: 1.7, marginTop: '12px' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Thick divider */}
      <div style={{ height: '3px', background: c.textPrimary }} />

      {/* Voice - cream section */}
      <section style={{ background: c.bgPrimary, padding: mobile ? `${sectionSpacing} 24px` : `${sectionSpacing} 48px` }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'baseline', marginBottom: '48px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: t.displayFont, fontSize: '64px', fontWeight: 800, color: c.accent, lineHeight: 1 }}>04</span>
            <div>
              <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', color: c.textSecondary, marginBottom: '8px' }}>VOICE</p>
              <h2 style={{ fontFamily: t.bodyFont, fontSize: mobile ? '32px' : '48px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1 }}>How We Talk</h2>
            </div>
          </div>
          <p style={{ fontFamily: t.bodyFont, fontSize: '16px', color: c.textSecondary, lineHeight: 1.7, marginBottom: '32px' }}>
            {voiceContent.C.tone}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {voiceContent.C.principles.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: '24px', alignItems: 'baseline', padding: '16px 0', borderBottom: `1px solid ${c.textPrimary}` }}>
                <span style={{ fontFamily: t.displayFont, fontSize: '32px', fontWeight: 800, color: c.accent, minWidth: '48px' }}>{String(i + 1).padStart(2, '0')}</span>
                <p style={{ fontFamily: t.bodyFont, fontSize: '16px', color: c.textPrimary, lineHeight: 1.7 }}>{p}</p>
              </div>
            ))}
          </div>
          {/* Mixed-weight sample headline */}
          <div style={{ marginTop: '64px', lineHeight: 0.9, letterSpacing: '-0.03em' }}>
            <span style={{ fontFamily: t.displayFont, fontSize: mobile ? '40px' : '64px', fontWeight: 800 }}>WE </span>
            <span style={{ fontFamily: t.bodyFont, fontSize: mobile ? '40px' : '64px', fontWeight: 400 }}>make </span>
            <span style={{ fontFamily: t.displayFont, fontSize: mobile ? '40px' : '64px', fontWeight: 800 }}>THINGS </span>
            <span style={{ fontFamily: t.bodyFont, fontSize: mobile ? '40px' : '64px', fontWeight: 400 }}>that </span>
            <span style={{ fontFamily: t.displayFont, fontSize: mobile ? '40px' : '64px', fontWeight: 800, color: c.accent }}>BRING </span>
            <span style={{ fontFamily: t.bodyFont, fontSize: mobile ? '40px' : '64px', fontWeight: 400 }}>opportunity.</span>
          </div>
        </div>
      </section>

      {/* Thick divider */}
      <div style={{ height: '3px', background: c.textPrimary }} />

      {/* Signature - black section */}
      <section style={{ background: c.bgAlt, color: '#F2EDE8', padding: mobile ? `${sectionSpacing} 24px` : `${sectionSpacing} 48px` }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'baseline', marginBottom: '48px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: t.displayFont, fontSize: '64px', fontWeight: 800, color: c.accentSecondary, lineHeight: 1 }}>05</span>
            <div>
              <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', color: c.textSecondary, marginBottom: '8px' }}>SIGNATURE ELEMENT</p>
              <h2 style={{ fontFamily: t.bodyFont, fontSize: mobile ? '32px' : '48px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1, color: '#F2EDE8' }}>Badges + Mixed Weight</h2>
            </div>
          </div>
          <p style={{ fontFamily: t.bodyFont, fontSize: '16px', color: c.textSecondary, lineHeight: 1.7, marginBottom: '32px' }}>
            Every service, project, and capability gets a bordered pill badge. These badges are scannable, sortable, and give the page a data-rich, designed-information feeling. Combined with mixed-weight headline treatment, this creates a brand voice that feels structured but not stiff.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {['VIDEO', 'WEB', 'BRAND', 'AI', 'SOCIAL', 'SYSTEMS', 'PRODUCTION', 'STRATEGY'].map(badge => (
              <Badge key={badge} color="#F2EDE8">{badge}</Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - cream */}
      <footer style={{ background: c.bgPrimary, padding: '48px', borderTop: `3px solid ${c.textPrimary}` }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: mobile ? 'block' : 'flex', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: t.displayFont, fontSize: '32px', fontWeight: 800, lineHeight: 1 }}>AOM</p>
            <p style={{ fontFamily: t.bodyFont, fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.2em', color: c.textSecondary, marginTop: '4px' }}>Brand Direction C / Bold Graphic</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: mobile ? '16px' : 0 }}>
            <Badge>PHOENIX</Badge>
            <Badge color={c.accentSecondary}>2020</Badge>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Load Google Fonts                                                  */
/* ------------------------------------------------------------------ */

function useGoogleFonts() {
  useEffect(() => {
    const fonts = [
      'Bebas+Neue',
      'IBM+Plex+Mono:wght@400;500;600;700',
      'Playfair+Display:ital,wght@0,400;0,700;1,400;1,700',
      'Inter:wght@400;500;600;700',
      'Syne:wght@400;700;800',
      'Space+Grotesk:wght@400;500;700',
    ]
    const id = 'brand-directions-fonts'
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f}`).join('&')}&display=swap`
      document.head.appendChild(link)
    }
  }, [])
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function BrandGuidelines() {
  const [activeDirection, setActiveDirection] = useState('A')
  const [transitioning, setTransitioning] = useState(false)

  useGoogleFonts()

  const theme = themes[activeDirection]

  const switchDirection = (dir) => {
    if (dir === activeDirection) return
    setTransitioning(true)
    setTimeout(() => {
      setActiveDirection(dir)
      window.scrollTo({ top: 0, behavior: 'instant' })
      setTimeout(() => setTransitioning(false), 50)
    }, 300)
  }

  const switcherBg = activeDirection === 'A' ? '#0A0A0A' : activeDirection === 'B' ? '#F7F5F2' : '#F2EDE8'
  const switcherText = activeDirection === 'A' ? '#F5F5F5' : '#1A1A1A'
  const switcherBorder = activeDirection === 'A' ? '#222222' : activeDirection === 'B' ? '#E0DCD7' : '#0A0A0A'

  return (
    <div style={{ position: 'relative' }}>
      {/* Direction switcher - floating at top */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: switcherBg,
        borderBottom: `1px solid ${switcherBorder}`,
        backdropFilter: 'blur(12px)',
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.colors.textSecondary, textDecoration: 'none', transition: 'color 0.3s' }}>
            <ArrowLeft size={14} />
            <span style={{ fontFamily: theme.bodyFont, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Back</span>
          </a>

          <div style={{ display: 'flex', gap: '4px' }}>
            {Object.entries(themes).map(([key, t]) => {
              const isActive = key === activeDirection
              return (
                <button
                  key={key}
                  onClick={() => switchDirection(key)}
                  style={{
                    fontFamily: '"Space Grotesk", "Inter", system-ui, sans-serif',
                    fontSize: '11px',
                    fontWeight: isActive ? 700 : 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    padding: '8px 16px',
                    border: isActive ? `1px solid ${theme.colors.accent}` : `1px solid transparent`,
                    background: isActive ? (activeDirection === 'A' ? 'rgba(255,77,0,0.1)' : 'rgba(0,0,0,0.05)') : 'transparent',
                    color: isActive ? theme.colors.accent : theme.colors.textSecondary,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <span style={{ fontFamily: theme.bodyFont, fontSize: '10px', color: theme.colors.textSecondary, letterSpacing: '0.15em', textTransform: 'uppercase', transition: 'color 0.3s' }}>
            v2.0
          </span>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div style={{ height: '56px' }} />

      {/* Page content with transition */}
      <div style={{
        opacity: transitioning ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}>
        {activeDirection === 'A' && <IndustrialPage theme={theme} />}
        {activeDirection === 'B' && <EditorialPage theme={theme} />}
        {activeDirection === 'C' && <BoldGraphicPage theme={theme} />}
      </div>
    </div>
  )
}
