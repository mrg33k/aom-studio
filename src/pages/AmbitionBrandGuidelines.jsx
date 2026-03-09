import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Copy, Check, ChevronRight, ChevronDown } from 'lucide-react'

/* ================================================================== */
/*  GOOGLE FONT LOADER                                                 */
/* ================================================================== */

const fontLink = document.createElement('link')
fontLink.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap'
fontLink.rel = 'stylesheet'
if (!document.querySelector('link[href*="Barlow+Condensed"]')) {
  document.head.appendChild(fontLink)
}

/* ================================================================== */
/*  DESIGN TOKENS                                                      */
/*  Bobby: copy these into tailwind.config.js                          */
/* ================================================================== */

const tokens = {
  colors: {
    navy: {
      950: '#070b1e',
      900: '#0a0e2a',
      800: '#111638',
      700: '#1a1f45',
      600: '#1a237e',
      500: '#283593',
      400: '#3949ab',
      300: '#5c6bc0',
    },
    red: {
      700: '#991b1b',
      600: '#b91c1c',
      500: '#dc2626',
      400: '#ef4444',
      300: '#f87171',
    },
    flame: {
      500: '#ea580c',
      400: '#f97316',
    },
    neutral: {
      950: '#0a0a0a',
      900: '#111111',
      800: '#1a1a1a',
      700: '#374151',
      600: '#4b5563',
      500: '#6b7280',
      400: '#9ca3af',
      300: '#d1d5db',
      200: '#e5e7eb',
      100: '#f3f4f6',
      50: '#f8fafc',
      white: '#ffffff',
    },
  },
  fonts: {
    display: "'Barlow Condensed', sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
}

/* ================================================================== */
/*  COLOR PALETTE DATA                                                 */
/* ================================================================== */

const colorPalette = {
  primary: [
    { name: 'Navy', hex: '#1a237e', token: 'navy-600', role: 'Primary Brand', usage: 'Logo core, hero backgrounds, nav bar, footer. The anchor of the entire brand.' },
    { name: 'Navy Dark', hex: '#0a0e2a', token: 'navy-900', role: 'Deep Background', usage: 'Dark hero sections, dark-mode panels, overlay backgrounds.' },
    { name: 'Navy Mid', hex: '#283593', token: 'navy-500', role: 'Supporting', usage: 'Secondary panels, active states, section backgrounds.' },
    { name: 'Navy Light', hex: '#3949ab', token: 'navy-400', role: 'Interactive', usage: 'Hover states, links, button hover on dark backgrounds.' },
  ],
  accent: [
    { name: 'Ambition Red', hex: '#dc2626', token: 'red-500', role: 'Primary CTA', usage: 'All CTA buttons, flame elements, urgent indicators, headline accents.' },
    { name: 'Red Light', hex: '#ef4444', token: 'red-400', role: 'Hover Red', usage: 'Button hover states, gradient endpoints.' },
    { name: 'Red Dark', hex: '#b91c1c', token: 'red-600', role: 'Pressed Red', usage: 'Pressed/active button states.' },
    { name: 'Flame Orange', hex: '#ea580c', token: 'flame-500', role: 'Warm Accent', usage: 'Gradient bridge from red to warmth. Sparingly.' },
  ],
  lightSurfaces: [
    { name: 'White', hex: '#ffffff', token: 'neutral-white', role: 'Primary Light BG', usage: 'Main content section backgrounds, cards on dark, logo text.' },
    { name: 'Off-White', hex: '#f8fafc', token: 'neutral-50', role: 'Alternating Light BG', usage: 'Alternate content sections for visual rhythm.' },
    { name: 'Light Gray', hex: '#f3f4f6', token: 'neutral-100', role: 'Card Surface', usage: 'Cards, input backgrounds, subtle surface differentiation.' },
    { name: 'Border Gray', hex: '#e5e7eb', token: 'neutral-200', role: 'Borders', usage: 'Card borders, dividers, input borders on light backgrounds.' },
  ],
  darkSurfaces: [
    { name: 'Midnight Navy', hex: '#070b1e', token: 'navy-950', role: 'Deepest Dark', usage: 'Hero sections, full-bleed dark panels.' },
    { name: 'Dark Navy', hex: '#0a0e2a', token: 'navy-900', role: 'Dark Section BG', usage: 'Dark content sections (hero, CTA, footer).' },
    { name: 'Deep Navy', hex: '#111638', token: 'navy-800', role: 'Dark Cards', usage: 'Cards and panels on dark backgrounds.' },
    { name: 'Charcoal Navy', hex: '#1a1f45', token: 'navy-700', role: 'Elevated Dark', usage: 'Inputs, elevated panels, modals on dark.' },
  ],
  text: [
    { name: 'White', hex: '#ffffff', role: 'Headlines on Dark', usage: 'All headlines and high-contrast text on dark backgrounds.' },
    { name: 'Navy', hex: '#1a237e', role: 'Headlines on Light', usage: 'All headlines on white/light backgrounds. PRIMARY heading color.' },
    { name: 'Steel', hex: '#374151', role: 'Body on Light', usage: 'Primary body text on white/light backgrounds.' },
    { name: 'Gray', hex: '#6b7280', role: 'Secondary', usage: 'Captions, kickers, muted text, timestamps.' },
    { name: 'Light Gray', hex: '#d1d5db', role: 'Body on Dark', usage: 'Primary body text on dark backgrounds.' },
    { name: 'Muted', hex: '#9ca3af', role: 'Tertiary on Dark', usage: 'Secondary info on dark backgrounds.' },
  ],
}

const typeScale = [
  { role: 'Display / Hero', font: 'Barlow Condensed', weight: '800 (ExtraBold)', size: '72-96px / clamp(3rem, 8vw, 6rem)', tracking: '0.04em', lh: '0.92', transform: 'uppercase', notes: 'Maximum impact. ALL CAPS always. Hero moments, page titles.' },
  { role: 'H1 / Section Title', font: 'Barlow Condensed', weight: '700 (Bold)', size: '48-64px / clamp(2.5rem, 5vw, 4rem)', tracking: '0.03em', lh: '1.0', transform: 'uppercase', notes: 'ALL CAPS. Primary section headers.' },
  { role: 'H2 / Sub-section', font: 'Barlow Condensed', weight: '600 (SemiBold)', size: '32-40px / clamp(1.75rem, 3.5vw, 2.5rem)', tracking: '0.02em', lh: '1.1', transform: 'uppercase', notes: 'ALL CAPS. Sub-sections and card group headers.' },
  { role: 'H3 / Card Title', font: 'Barlow Condensed', weight: '600 (SemiBold)', size: '24-28px', tracking: '0.02em', lh: '1.2', transform: 'uppercase or sentence', notes: 'Card titles, feature headers. Can be sentence case for softer moments.' },
  { role: 'Body Large', font: 'Inter', weight: '400 (Regular)', size: '18px / 1.125rem', tracking: 'normal', lh: '1.65', transform: 'sentence', notes: 'Hero subheadings, intro paragraphs. Max width 640px.' },
  { role: 'Body', font: 'Inter', weight: '400 (Regular)', size: '15-16px / 1rem', tracking: 'normal', lh: '1.65', transform: 'sentence', notes: 'Standard body text. Max width 640px for readability.' },
  { role: 'Body Small', font: 'Inter', weight: '400 (Regular)', size: '13-14px / 0.875rem', tracking: '0.01em', lh: '1.6', transform: 'sentence', notes: 'Card descriptions, secondary text.' },
  { role: 'Labels / Kickers', font: 'Barlow Condensed', weight: '600 (SemiBold)', size: '11-12px', tracking: '0.2em', lh: '1.2', transform: 'uppercase', notes: 'UPPERCASE always. Section kickers, metadata, tags.' },
  { role: 'Nav Links', font: 'Inter', weight: '500 (Medium)', size: '14-15px / 0.875rem', tracking: '0.02em', lh: '1.4', transform: 'sentence', notes: 'Main navigation items.' },
  { role: 'Buttons', font: 'Barlow Condensed', weight: '600-700', size: '14-16px', tracking: '0.08em', lh: '1.2', transform: 'uppercase', notes: 'ALL CAPS on primary CTAs. Sentence case on secondary/ghost buttons.' },
]

const voiceAttributes = [
  { attr: 'Capable', yes: 'We handle commercial HVAC across every phase. All makes, all models.', no: 'We try our best to service most kinds of air conditioning systems.' },
  { attr: 'Direct', yes: '24/7 emergency dispatch. Call (480) 600-2942.', no: "Please don't hesitate to reach out whenever is convenient!" },
  { attr: 'Credible', yes: 'Licensed ROC #320923. Established 2002. 500+ projects completed.', no: "We're one of the top HVAC companies around!" },
  { attr: 'Grounded', yes: 'Built on precision, driven by integrity.', no: "We're the BEST and most AMAZING HVAC company!!!" },
  { attr: 'Human', yes: 'Our crew shows up. Every time.', no: 'Our team of dedicated professionals strives for excellence.' },
]

const toneShifts = [
  { context: 'Website copy', tone: 'Confident, professional, concise', example: 'We prioritize quality over quantity.' },
  { context: 'Social captions', tone: 'Slightly warmer, still competent', example: 'This Din Tai Fung kitchen buildout is coming together. Week 3 update.' },
  { context: 'Emergency / urgent', tone: 'Direct, zero filler', example: '3AM call at Abraza. We were on-site in under an hour.' },
  { context: 'Recruitment', tone: 'Proud, inviting, personal', example: "We're hiring techs who take the work personally." },
  { context: 'Client comms', tone: 'Clear, respectful, no corporate fluff', example: "Here's where we're at on the project. Next steps below." },
]

/* ================================================================== */
/*  BUTTON SYSTEM                                                      */
/* ================================================================== */

const buttonSystem = [
  {
    name: 'Primary CTA',
    description: 'Solid red, uppercase Barlow Condensed. The main action driver.',
    classes: 'bg-red-500 text-white font-display font-semibold uppercase tracking-[0.08em] px-8 py-4 rounded-lg',
    hover: 'bg-red-400, shadow-[0_8px_24px_rgba(220,38,38,0.3)], -translate-y-0.5',
    active: 'bg-red-600, translate-y-0',
  },
  {
    name: 'Secondary CTA',
    description: 'Navy outline on light backgrounds. Solid navy on dark backgrounds.',
    classes: 'border-2 border-navy-600 text-navy-600 font-display font-semibold uppercase tracking-[0.08em] px-8 py-4 rounded-lg',
    hover: 'bg-navy-600, text-white',
    active: 'bg-navy-800',
  },
  {
    name: 'Ghost / Link',
    description: 'Text-only with subtle underline. Inherits surrounding text color.',
    classes: 'text-navy-600 (light) / text-neutral-300 (dark) font-medium underline-offset-4 hover:underline',
    hover: 'text-red-500',
    active: 'text-red-600',
  },
  {
    name: 'Dark CTA',
    description: 'For dark backgrounds. White text, red accent on hover.',
    classes: 'bg-white/10 backdrop-blur-sm border border-white/20 text-white font-display font-semibold uppercase tracking-[0.08em] px-8 py-4 rounded-lg',
    hover: 'bg-red-500, border-red-500, shadow-[0_8px_24px_rgba(220,38,38,0.25)]',
    active: 'bg-red-600',
  },
]

/* ================================================================== */
/*  COMPONENT SPECS                                                    */
/* ================================================================== */

const componentSpecs = [
  {
    name: 'Navigation Bar',
    description: 'Fixed top. Navy background on scroll (starts transparent over hero). Logo left, nav links center, CTA right.',
    specs: [
      'Height: 72px (desktop), 64px (mobile)',
      'Background: transparent -> navy-900/95 backdrop-blur-xl on scroll',
      'Border: none -> border-b border-white/10 on scroll',
      'Logo: Existing badge/seal mark, max-height 40px',
      'Nav links: Inter Medium 14px, tracking 0.02em, white/80, hover: white',
      'CTA: Primary button (red), smaller variant: px-6 py-2.5',
      'Mobile: hamburger menu, slide-in drawer from right, navy-900 bg',
      'Transition: all 400ms ease',
    ],
  },
  {
    name: 'Hero Section',
    description: 'Full-viewport dark section. Navy gradient background with subtle pattern overlay. Big Barlow headline, Inter body, CTA group.',
    specs: [
      'Height: 100vh (min 600px)',
      'Background: linear-gradient(160deg, navy-950 0%, navy-800 50%, navy-900 100%)',
      'Pattern overlay: snowflake geometry at 5-8% opacity, positioned top-right',
      'Headline: Barlow Condensed 800, white, clamp(3rem, 8vw, 6rem)',
      'Subheading: Inter Regular 18px, neutral-300, max-w-xl',
      'CTA group: Primary (red) + Secondary (white outline), gap-4',
      'Stats row below CTAs: flex gap-8, stat values in white font-bold, labels in neutral-400 uppercase 11px',
      'Vertical padding: pt-32 pb-20 (enough to clear fixed nav)',
    ],
  },
  {
    name: 'Content Section (Light)',
    description: 'White or off-white background. Navy headlines, steel body text. Clean breathing room.',
    specs: [
      'Background: white or neutral-50 (alternate)',
      'Container: max-w-7xl mx-auto px-6 lg:px-8',
      'Vertical padding: py-20 md:py-28',
      'Kicker: Barlow Condensed 600, 11px, tracking 0.2em, red-500, uppercase',
      'Headline: Barlow Condensed 700, navy-600, clamp(1.75rem, 5vw, 3rem), uppercase',
      'Body: Inter Regular 16px, neutral-700, leading-relaxed, max-w-prose',
      'Section divider: 2px red line, w-12, placed below kicker',
    ],
  },
  {
    name: 'Content Section (Dark)',
    description: 'Navy background for emphasis sections (CTA, stats, testimonials). Provides rhythm against light sections.',
    specs: [
      'Background: navy-900 or navy-800',
      'Same container/padding as light sections',
      'Headline: Barlow Condensed 700, white',
      'Body: Inter Regular 16px, neutral-300',
      'Accent elements: red-500 lines, dots, and CTA buttons',
      'Optional: snowflake or hex grid pattern at 3-5% opacity',
    ],
  },
  {
    name: 'Service Card',
    description: 'Clean card for listing services. Works on both light and dark backgrounds.',
    specs: [
      'Light variant: bg-white, border neutral-200, rounded-xl, shadow-sm',
      'Dark variant: bg-navy-800, border navy-600/30, rounded-xl',
      'Padding: p-8',
      'Icon area: 48x48, navy-600 bg with white icon (light) or red-500/10 bg with red icon (dark)',
      'Title: Barlow Condensed 600, 20-24px, navy-600 (light) or white (dark)',
      'Body: Inter Regular 14px, neutral-500 (light) or neutral-400 (dark)',
      'Hover: -translate-y-1, shadow-lg (light) or border-white/20 (dark)',
      'Transition: all 300ms ease',
    ],
  },
  {
    name: 'Stat Bar',
    description: 'Horizontal row of key stats. Can live on dark hero or as standalone section.',
    specs: [
      'Layout: flex justify-around, max-w-4xl, mx-auto',
      'Stat value: Barlow Condensed 700, 36-48px, white (dark) or navy-600 (light)',
      'Stat label: Inter Medium 11px, uppercase, tracking 0.15em, neutral-400 (dark) or neutral-500 (light)',
      'Dividers: 1px vertical lines, neutral-700 (dark) or neutral-200 (light)',
      'Mobile: 2-col grid, gap-6',
    ],
  },
  {
    name: 'Contact Form',
    description: 'Clean form section. Can be standalone page or embedded section.',
    specs: [
      'Background: white or neutral-50',
      'Input: h-12, rounded-lg, border neutral-200, bg-neutral-100, focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20',
      'Label: Inter Medium 13px, neutral-700',
      'Submit: Primary CTA button, full-width on mobile',
      'Helper text: Inter Regular 12px, neutral-500',
      'Error state: border-red-500, text-red-500 for message',
    ],
  },
  {
    name: 'Footer',
    description: 'Dark navy background. Logo, nav links, contact info, credential badges.',
    specs: [
      'Background: navy-950',
      'Top border: 3px gradient from-red-500 to-transparent',
      'Logo: badge/seal mark, max-h-12',
      'Nav columns: Inter Medium 14px, neutral-400, hover: white',
      'Contact: phone, email, address in neutral-300',
      'Credential: "Licensed ROC #320923" in Barlow Condensed 600, 10px, tracking 0.2em, neutral-500',
      'Copyright: Inter Regular 12px, neutral-600',
      'Padding: py-16',
    ],
  },
]

/* ================================================================== */
/*  WEBSITE LAYOUT SPEC                                                */
/* ================================================================== */

const websiteLayout = [
  {
    section: 'Navigation',
    bg: 'transparent -> navy-900/95',
    pattern: 'Fixed top, transitions on scroll',
    description: 'Transparent over hero, solidifies to navy on scroll. Logo left, links center, red CTA right.',
  },
  {
    section: 'Hero',
    bg: 'navy-950 -> navy-800 gradient',
    pattern: 'Full viewport, snowflake pattern overlay',
    description: '"We Build The Systems That Keep Business Moving." Barlow 800 headline, Inter body, red CTA + white outline CTA. Stats row at bottom.',
  },
  {
    section: 'Services',
    bg: 'WHITE',
    pattern: 'Kicker + Headline + 3-col card grid',
    description: 'Light section. Service cards with icons. Clean, lots of white space. Navy headlines, steel body text.',
  },
  {
    section: 'Stats / Social Proof',
    bg: 'navy-900',
    pattern: 'Stat bar + client logos',
    description: 'Dark band. "500+ Projects. 23+ Years. 9 Markets. 24/7 Dispatch." Client logo row below in white/40 opacity.',
  },
  {
    section: 'About / Why Ambition',
    bg: 'neutral-50 (off-white)',
    pattern: '2-col: copy left, photo right',
    description: 'Light section. Company story, values, differentiators. Photo of crew on job site. Navy headline, steel body.',
  },
  {
    section: 'Projects / Portfolio',
    bg: 'WHITE',
    pattern: 'Kicker + Headline + card grid',
    description: 'Project cards with images, category chips, brief descriptions. Cards have subtle shadow, hover lift.',
  },
  {
    section: 'CTA Band',
    bg: 'navy-800 with snowflake pattern',
    pattern: 'Centered headline + CTA',
    description: '"Ready to solve your next HVAC challenge?" Barlow headline, red CTA. Snowflake geometry at 5% behind.',
  },
  {
    section: 'Testimonials',
    bg: 'WHITE',
    pattern: 'Quote cards, 1-2 column',
    description: 'Client quotes with name, title, company. Navy quote marks. Clean cards on white.',
  },
  {
    section: 'Contact',
    bg: 'neutral-50',
    pattern: '2-col: form left, contact info right',
    description: 'Contact form with clean inputs. Right side: phone, email, address, map embed, credential badge.',
  },
  {
    section: 'Footer',
    bg: 'navy-950',
    pattern: '4-col layout',
    description: 'Logo + tagline | Quick links | Services | Contact info. Red gradient top border. Credential badges.',
  },
]

/* ================================================================== */
/*  RESPONSIVE BREAKPOINTS                                             */
/* ================================================================== */

const breakpoints = [
  { name: 'Mobile', range: '< 640px', cols: '1', notes: 'Single column. Stacked layout. Hamburger nav. Full-width CTAs. Hero headline clamps to 3rem.' },
  { name: 'Tablet', range: '640-1024px', cols: '2', notes: 'Two-column grids. Side-by-side CTAs. Nav links visible. Hero headline clamps to 4.5rem.' },
  { name: 'Desktop', range: '1024-1280px', cols: '3', notes: 'Three-column card grids. Full nav. Max-w-7xl container kicks in.' },
  { name: 'Wide', range: '> 1280px', cols: '3-4', notes: 'Content stays centered in max-w-7xl. Extra whitespace on sides. Hero can go wider.' },
]

/* ================================================================== */
/*  SVG BRAND PATTERNS                                                 */
/* ================================================================== */

function SnowflakePattern({ size = 200, color = '#1a237e', opacity = 0.15 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.4
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180)
        const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
        const branchLen = r * 0.3
        const ba1 = angle + 0.55, ba2 = angle - 0.55
        const mx1 = cx + r * 0.5 * Math.cos(angle), my1 = cy + r * 0.5 * Math.sin(angle)
        const mx2 = cx + r * 0.75 * Math.cos(angle), my2 = cy + r * 0.75 * Math.sin(angle)
        return (
          <g key={i} opacity={opacity}>
            <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <line x1={mx1} y1={my1} x2={mx1 + branchLen * 0.7 * Math.cos(ba1)} y2={my1 + branchLen * 0.7 * Math.sin(ba1)} stroke={color} strokeWidth={2} strokeLinecap="round" />
            <line x1={mx1} y1={my1} x2={mx1 + branchLen * 0.7 * Math.cos(ba2)} y2={my1 + branchLen * 0.7 * Math.sin(ba2)} stroke={color} strokeWidth={2} strokeLinecap="round" />
            <line x1={mx2} y1={my2} x2={mx2 + branchLen * Math.cos(ba1)} y2={my2 + branchLen * Math.sin(ba1)} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
            <line x1={mx2} y1={my2} x2={mx2 + branchLen * Math.cos(ba2)} y2={my2 + branchLen * Math.sin(ba2)} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
            <circle cx={x2} cy={y2} r={3.5} fill={color} />
          </g>
        )
      })}
      <polygon points={Array.from({ length: 6 }).map((_, i) => { const a = (i * 60 - 90) * (Math.PI / 180); return `${cx + r * 0.22 * Math.cos(a)},${cy + r * 0.22 * Math.sin(a)}` }).join(' ')} fill="none" stroke={color} strokeWidth={2} opacity={opacity * 1.2} />
      <circle cx={cx} cy={cy} r={4} fill={color} opacity={opacity * 0.8} />
    </svg>
  )
}

function FlameWavePattern({ width = 400, height = 80, color = '#dc2626', opacity = 0.2 }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {[0, 1, 2, 3].map(i => (
        <path key={i} d={`M 0,${height * 0.5 + i * 6} Q ${width * 0.12},${height * 0.15 - i * 3} ${width * 0.25},${height * 0.55 + i * 2} Q ${width * 0.38},${height * 0.85 - i * 2} ${width * 0.5},${height * 0.4 - i * 3} Q ${width * 0.62},${height * 0.1 + i * 4} ${width * 0.75},${height * 0.6 + i * 2} Q ${width * 0.88},${height * 0.8 - i * 3} ${width},${height * 0.35 + i * 4}`} stroke={color} strokeWidth={2.5 - i * 0.5} opacity={opacity - i * 0.04} strokeLinecap="round" />
      ))}
    </svg>
  )
}

function HexagonalGrid({ width = 600, height = 120, color = '#1a237e', opacity = 0.08 }) {
  const s = 20, w = s * 2, h = Math.sqrt(3) * s
  const cols = Math.ceil(width / (w * 0.75)) + 1, rows = Math.ceil(height / h) + 1
  const pts = (cx, cy) => Array.from({ length: 6 }).map((_, i) => { const a = (60 * i - 30) * (Math.PI / 180); return `${cx + s * Math.cos(a)},${cy + s * Math.sin(a)}` }).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: rows }).map((_, row) => Array.from({ length: cols }).map((_, col) => {
        const cx = col * w * 0.75, cy = row * h + (col % 2 === 1 ? h / 2 : 0)
        return <polygon key={`${row}-${col}`} points={pts(cx, cy)} fill="none" stroke={color} strokeWidth={0.5} opacity={opacity} />
      }))}
    </svg>
  )
}

/* ================================================================== */
/*  HELPER COMPONENTS                                                  */
/* ================================================================== */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <button onClick={handleCopy} className="ml-2 inline-flex items-center text-[#9ca3af] hover:text-[#374151] transition-colors" title="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

function SectionHeader({ number, kicker, title, description, dark }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <span style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#dc2626' }}>{number}</span>
        <div className="w-8 h-[2px] bg-[#dc2626]" />
        <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: dark ? '#9ca3af' : '#6b7280', textTransform: 'uppercase' }}>{kicker}</span>
      </div>
      <h2 style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: 'clamp(28px, 5vw, 48px)', letterSpacing: '0.03em', color: dark ? '#ffffff' : '#1a237e', textTransform: 'uppercase', lineHeight: 1.0 }}>
        {title}
      </h2>
      {description && <p style={{ color: dark ? '#9ca3af' : '#6b7280', fontSize: '15px', lineHeight: 1.65, marginTop: '12px', maxWidth: '640px', fontFamily: tokens.fonts.body }}>{description}</p>}
    </div>
  )
}

function ColorSwatch({ color, large, onLight }) {
  const darkHexes = ['#070b1e', '#0a0e2a', '#111638', '#1a1f45', '#1a237e', '#283593', '#0a0a0a', '#111111', '#1a1a1a', '#374151', '#b91c1c', '#991b1b']
  const isOnDark = darkHexes.includes(color.hex)
  return (
    <div className="group">
      <div className={`${large ? 'h-20 md:h-28' : 'h-14 md:h-18'} rounded-lg relative overflow-hidden transition-all duration-300 group-hover:scale-[1.02]`}
        style={{ backgroundColor: color.hex, border: color.hex === '#ffffff' || color.hex === '#f8fafc' || color.hex === '#f3f4f6' || color.hex === '#e5e7eb' ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.1)' }}>
        <span className={`absolute bottom-2 left-3 font-mono text-[10px] font-bold ${isOnDark ? 'text-white/70' : 'text-[#374151]/70'}`}>
          {color.hex}
        </span>
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold ${onLight ? 'text-[#1a237e]' : 'text-white'}`}>{color.name}</span>
          <CopyButton text={color.hex} />
        </div>
        {color.token && <span className="font-mono text-[10px] text-[#6b7280] tracking-wide block mt-0.5">{color.token}</span>}
        <span className="text-[10px] text-[#9ca3af] uppercase tracking-[0.12em] block">{color.role}</span>
        {color.usage && <p className="text-[#9ca3af] text-xs mt-1 leading-relaxed">{color.usage}</p>}
      </div>
    </div>
  )
}

function CodeBlock({ code, label, dark }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb' }}>
      {label && (
        <div className="px-4 py-2.5" style={{ borderBottom: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', backgroundColor: dark ? '#111638' : '#f8fafc' }}>
          <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.18em', color: '#6b7280', textTransform: 'uppercase' }}>{label}</span>
        </div>
      )}
      <div className="p-4 overflow-x-auto" style={{ backgroundColor: dark ? '#0a0e2a' : '#ffffff' }}>
        <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap" style={{ color: dark ? '#d1d5db' : '#374151' }}>{code}</pre>
      </div>
    </div>
  )
}

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#f8fafc] transition-colors">
        <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '14px', letterSpacing: '0.04em', color: '#1a237e', textTransform: 'uppercase' }}>{title}</span>
        <ChevronDown size={18} className={`text-[#9ca3af] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-6 pb-6 border-t border-[#e5e7eb]">{children}</div>}
    </div>
  )
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function AmbitionBrandGuidelines() {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'color', label: 'Color' },
    { id: 'typography', label: 'Typography' },
    { id: 'components', label: 'Components' },
    { id: 'layout', label: 'Website Layout' },
    { id: 'patterns', label: 'Patterns' },
    { id: 'voice', label: 'Voice & Tone' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: tokens.fonts.body, color: '#374151' }}>

      {/* ================================================================ */}
      {/*  HEADER                                                          */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-40" style={{ backgroundColor: '#0a0e2a', borderBottom: '2px solid #dc2626' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/brands" className="inline-flex items-center gap-2 text-[#6b7280] hover:text-white transition-colors text-sm">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Brands</span>
            </Link>
            <div className="w-px h-6 bg-white/15" />
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[#dc2626]" style={{ boxShadow: '0 0 8px rgba(220,38,38,0.5)' }} />
              <span style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '14px', letterSpacing: '0.12em', color: '#ffffff', textTransform: 'uppercase' }}>
                Ambition <span style={{ color: '#dc2626' }}>Mechanical</span>
              </span>
            </div>
          </div>
          <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Website Brand Spec v3</span>
        </div>
      </header>

      {/* ================================================================ */}
      {/*  TAB NAV                                                         */}
      {/* ================================================================ */}
      <nav className="sticky top-16 z-30 bg-white border-b border-[#e5e7eb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 py-2 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="shrink-0 rounded-lg px-4 py-2 text-sm transition-all duration-200"
                style={{
                  fontFamily: tokens.fonts.display,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontSize: '12px',
                  backgroundColor: activeTab === tab.id ? '#1a237e' : 'transparent',
                  color: activeTab === tab.id ? '#ffffff' : '#6b7280',
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ================================================================ */}
      {/*  CONTENT                                                         */}
      {/* ================================================================ */}
      <main>

        {/* ============================================================ */}
        {/*  OVERVIEW TAB                                                  */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <>
            {/* Dark Hero */}
            <section className="relative overflow-hidden" style={{ backgroundColor: '#0a0e2a' }}>
              <div className="absolute top-0 right-0 opacity-30 pointer-events-none" style={{ transform: 'translate(15%, -20%)' }}>
                <SnowflakePattern size={500} color="#283593" opacity={0.1} />
              </div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
                {/* OG Ambition Mechanical Logo */}
                <div className="mb-12 flex justify-center md:justify-start">
                  <img
                    src="/ambition-logo.png"
                    alt="Ambition Mechanical Services - Original Logo"
                    className="w-48 h-48 md:w-64 md:h-64 lg:w-80 lg:h-80 object-contain drop-shadow-[0_0_40px_rgba(220,38,38,0.15)]"
                  />
                </div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-[3px] bg-[#dc2626]" />
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>
                    Website Brand Specification
                  </span>
                </div>
                <h1 style={{ fontFamily: tokens.fonts.display, fontWeight: 800, fontSize: 'clamp(48px, 8vw, 96px)', letterSpacing: '0.04em', lineHeight: 0.92, color: '#ffffff', textTransform: 'uppercase' }}>
                  AMBITION<br />
                  <span style={{ color: '#dc2626' }}>MECHANICAL</span>
                </h1>
                <p className="mt-8 max-w-lg" style={{ color: '#9ca3af', fontSize: '17px', lineHeight: 1.65 }}>
                  The definitive design spec for rebuilding the Ambition Mechanical website. Everything Bobby needs: colors, type, components, layout, spacing, responsive rules. Based on the OG brand. Built for the web.
                </p>

                <div className="mt-10 flex flex-wrap gap-3">
                  {['Barlow Condensed', 'Navy + Red + White', 'Industrial Patterns', 'Tailwind/React', 'Mobile-First'].map(tag => (
                    <span key={tag} className="px-4 py-2 rounded-lg text-white/80" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', backgroundColor: 'rgba(26,35,126,0.5)', border: '1px solid rgba(57,73,171,0.3)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <FlameWavePattern width={800} height={50} color="#dc2626" opacity={0.12} />
            </section>

            {/* Design Philosophy (WHITE background) */}
            <section className="bg-white py-20 md:py-28">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="00" kicker="Design Philosophy" title="THE NEXT EVOLUTION" description="The OG brand direction (navy, red, Barlow Condensed, snowflakes, industrial feel) made website-ready. Dark sections for impact, white sections for breathing room. Bobby: this is your blueprint." />

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { title: 'Dark + Light Rhythm', text: 'The site alternates between navy-dark sections (hero, CTAs, stats) and white/off-white content sections. This gives the dark brand elements maximum punch while keeping the site readable and inviting.' },
                    { title: 'Barlow Condensed Headlines', text: 'Every headline uses Barlow Condensed, uppercase, tight tracking. This is the brand typeface. It matches the logo\'s condensed sans-serif and gives the site an industrial, engineered feel.' },
                    { title: 'Navy is the Anchor', text: 'Not pure black. Navy blue (#1a237e and its scale) is the primary color. It appears in headlines on light backgrounds, as the base for dark sections, and throughout the navigation and footer.' },
                    { title: 'Red Drives Action', text: 'Red (#dc2626) is reserved for CTAs, accent lines, and energy. It pops because it\'s rare. Every red element should be intentional and actionable.' },
                    { title: 'White Space is Deliberate', text: 'Content sections use generous padding (py-20 to py-28). Cards have breathing room. Copy blocks max out at 640px width. The white space is as designed as the content.' },
                    { title: 'Industrial Texture', text: 'Snowflake patterns, hex grids, and flame waves from the logo appear as subtle overlays (3-8% opacity) on dark sections. They create brand texture without competing with content.' },
                  ].map((item, i) => (
                    <div key={i} className="p-6 rounded-xl bg-[#f8fafc] border border-[#e5e7eb] hover:border-[#1a237e]/20 transition-all duration-300">
                      <h3 style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '16px', letterSpacing: '0.03em', color: '#1a237e', textTransform: 'uppercase', marginBottom: '8px' }}>{item.title}</h3>
                      <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Quick Reference (light navy tint) */}
            <section style={{ backgroundColor: '#f8fafc' }} className="py-20 md:py-28">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="01" kicker="Quick Reference" title="AT A GLANCE" description="The essential tokens Bobby needs to start building." />

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Display Font', value: 'Barlow Condensed', sub: 'google.com/fonts', detail: '400-900 weights. Headlines + buttons.' },
                    { label: 'Body Font', value: 'Inter', sub: 'google.com/fonts', detail: '300-900 weights. Body + nav + forms.' },
                    { label: 'Primary Color', value: '#1a237e', sub: 'Navy Blue', swatch: '#1a237e' },
                    { label: 'Accent Color', value: '#dc2626', sub: 'Ambition Red', swatch: '#dc2626' },
                    { label: 'Light BG', value: '#ffffff', sub: 'White', swatch: '#ffffff', border: true },
                    { label: 'Dark BG', value: '#0a0e2a', sub: 'Navy 900', swatch: '#0a0e2a' },
                    { label: 'Border Radius', value: 'rounded-xl', sub: '12px (cards), 8px (buttons, inputs)' },
                    { label: 'Max Width', value: 'max-w-7xl', sub: '1280px container' },
                  ].map((item, i) => (
                    <div key={i} className="p-5 rounded-xl bg-white border border-[#e5e7eb]">
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#9ca3af', textTransform: 'uppercase' }}>{item.label}</span>
                      <div className="flex items-center gap-3 mt-2">
                        {item.swatch && <div className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: item.swatch, border: item.border ? '1px solid #e5e7eb' : 'none' }} />}
                        <div>
                          <p style={{ fontFamily: item.swatch ? 'monospace' : tokens.fonts.display, fontWeight: 600, fontSize: item.swatch ? '13px' : '16px', color: '#1a237e', letterSpacing: item.swatch ? 0 : '0.02em' }}>{item.value}</p>
                          <p className="text-xs text-[#9ca3af] mt-0.5">{item.sub}</p>
                        </div>
                      </div>
                      {item.detail && <p className="text-xs text-[#9ca3af] mt-2">{item.detail}</p>}
                    </div>
                  ))}
                </div>

                {/* Color ratio bar */}
                <div className="mt-12 p-6 rounded-xl bg-white border border-[#e5e7eb]">
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#9ca3af', textTransform: 'uppercase' }}>Overall Color Ratio</span>
                  <div className="mt-4 flex gap-1 h-10 rounded-lg overflow-hidden">
                    <div className="flex-[35] flex items-center justify-center" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.1em', color: '#1a237e' }}>35% WHITE</span>
                    </div>
                    <div className="flex-[35] flex items-center justify-center" style={{ backgroundColor: '#1a237e' }}>
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.1em', color: '#ffffff' }}>35% NAVY</span>
                    </div>
                    <div className="flex-[15] flex items-center justify-center" style={{ backgroundColor: '#dc2626' }}>
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', color: '#ffffff' }}>15% RED</span>
                    </div>
                    <div className="flex-[15] flex items-center justify-center" style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', color: '#6b7280' }}>15% GRAY</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#9ca3af] mt-3">The site reads as roughly half light, half dark. Navy and white share equal weight. Red is the energy. Grays handle everything else.</p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/*  COLOR TAB                                                     */}
        {/* ============================================================ */}
        {activeTab === 'color' && (
          <>
            {/* Primary Navy (white bg) */}
            <section className="bg-white py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="02" kicker="Color System" title="NAVY AND RED" description="Extracted from the OG logo and expanded into a full web-ready system. Navy anchors. Red energizes. White breathes. This replaces the old sky-blue/near-black system entirely." />

                <div className="mb-14">
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#1a237e', textTransform: 'uppercase' }}>Primary / Navy Blue</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {colorPalette.primary.map(c => <ColorSwatch key={c.hex} color={c} large onLight />)}
                  </div>
                </div>

                <div className="mb-14">
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>Accent / Red and Flame</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {colorPalette.accent.map(c => <ColorSwatch key={c.hex} color={c} large onLight />)}
                  </div>
                </div>

                <div className="mb-14">
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Light Surfaces and Backgrounds</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {colorPalette.lightSurfaces.map(c => <ColorSwatch key={c.hex} color={c} large onLight />)}
                  </div>
                </div>

                <div className="mb-14">
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Dark Surfaces and Backgrounds</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {colorPalette.darkSurfaces.map(c => <ColorSwatch key={c.hex} color={c} large onLight />)}
                  </div>
                </div>

                <div>
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Text Colors</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4">
                    {colorPalette.text.map(c => <ColorSwatch key={c.hex + c.role} color={c} onLight />)}
                  </div>
                </div>
              </div>
            </section>

            {/* Color Rules (dark section) */}
            <section style={{ backgroundColor: '#0a0e2a' }} className="py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="03" kicker="Color Rules" title="HOW TO USE COLOR" description="Non-negotiable rules for color application across the site." dark />

                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    { rule: 'Navy is the primary brand color', detail: 'It appears in headlines on light backgrounds, as dark section backgrounds, in the nav bar, and footer. When in doubt, use navy.' },
                    { rule: 'Red is for action only', detail: 'CTA buttons, accent lines, section dividers, and urgent indicators. Never decorative. Every red element should signal "do something."' },
                    { rule: 'White backgrounds get navy headlines', detail: 'On any light background, headlines are navy (#1a237e), body text is steel gray (#374151). Never pure black text.' },
                    { rule: 'Dark sections get white headlines', detail: 'On navy backgrounds, headlines are white, body text is neutral-300 (#d1d5db). Red stays red on both light and dark.' },
                    { rule: 'Alternate light/dark sections', detail: 'The page rhythm should alternate: dark hero -> light services -> dark stats -> light about -> dark CTA -> light contact -> dark footer.' },
                    { rule: 'No sky blue, no pure black', detail: 'The old site used sky blue (#0ea5e9) and pure black (#0a0a0a). Both are retired. Navy replaces black. Navy replaces blue.' },
                  ].map((item, i) => (
                    <div key={i} className="p-6 rounded-xl" style={{ backgroundColor: '#111638', border: '1px solid rgba(57,73,171,0.25)' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
                        <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '14px', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase' }}>{item.rule}</span>
                      </div>
                      <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: 1.6 }}>{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Tailwind Config (white bg) */}
            <section className="bg-white py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="04" kicker="Tailwind Config" title="COPY THIS" description="Drop these values into tailwind.config.js. This is the single source of truth." />
                <CodeBlock label="tailwind.config.js extend.colors" code={`colors: {
  navy: {
    950: '${tokens.colors.navy[950]}',
    900: '${tokens.colors.navy[900]}',
    800: '${tokens.colors.navy[800]}',
    700: '${tokens.colors.navy[700]}',
    600: '${tokens.colors.navy[600]}',
    500: '${tokens.colors.navy[500]}',
    400: '${tokens.colors.navy[400]}',
    300: '${tokens.colors.navy[300]}',
  },
  red: {
    700: '${tokens.colors.red[700]}',
    600: '${tokens.colors.red[600]}',
    500: '${tokens.colors.red[500]}',
    400: '${tokens.colors.red[400]}',
    300: '${tokens.colors.red[300]}',
  },
  flame: {
    500: '${tokens.colors.flame[500]}',
    400: '${tokens.colors.flame[400]}',
  },
},
fontFamily: {
  display: ['Barlow Condensed', 'sans-serif'],
  body: ['Inter', 'system-ui', 'sans-serif'],
},`} />
              </div>
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/*  TYPOGRAPHY TAB                                                */}
        {/* ============================================================ */}
        {activeTab === 'typography' && (
          <>
            <section className="bg-white py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="05" kicker="Typography" title="BARLOW CONDENSED + INTER" description="Barlow Condensed owns all headlines and display moments. It matches the logo's condensed sans-serif. Inter handles body text, navigation, and forms. Two fonts. Clear hierarchy." />

                {/* Live specimens */}
                <div className="space-y-6 mb-16">
                  {/* Hero specimen on dark */}
                  <div className="p-8 md:p-12 rounded-xl relative overflow-hidden" style={{ backgroundColor: '#0a0e2a' }}>
                    <div className="absolute top-0 right-0 opacity-10 pointer-events-none" style={{ transform: 'translate(30%, -30%)' }}>
                      <SnowflakePattern size={300} color="#283593" opacity={0.3} />
                    </div>
                    <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>Display / Hero (on dark)</span>
                    <p className="relative z-10 mt-4" style={{ fontFamily: tokens.fonts.display, fontWeight: 800, fontSize: 'clamp(48px, 7vw, 80px)', letterSpacing: '0.04em', lineHeight: 0.92, color: '#ffffff', textTransform: 'uppercase' }}>
                      WE BUILD THE<br />SYSTEMS THAT KEEP<br /><span style={{ color: '#dc2626' }}>BUSINESS MOVING</span>
                    </p>
                    <p className="mt-4 text-xs text-[#6b7280] tracking-widest uppercase">Barlow Condensed ExtraBold 800 / clamp(3rem, 7vw, 5rem) / tracking 0.04em / uppercase</p>
                  </div>

                  {/* Section headline on light */}
                  <div className="p-8 md:p-12 rounded-xl" style={{ backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
                    <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>Section Headline (on light)</span>
                    <p className="mt-4" style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '0.03em', lineHeight: 1.0, color: '#1a237e', textTransform: 'uppercase' }}>
                      COMMERCIAL HVAC THAT DELIVERS
                    </p>
                    <p className="mt-4 text-xs text-[#9ca3af] tracking-widest uppercase">Barlow Condensed Bold 700 / navy-600 / clamp(2rem, 5vw, 3.5rem) / tracking 0.03em</p>
                  </div>

                  {/* Sub-headline + body side by side */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-8 rounded-xl bg-white border border-[#e5e7eb]">
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#9ca3af', textTransform: 'uppercase' }}>Sub-headline</span>
                      <p className="mt-4" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '32px', letterSpacing: '0.02em', lineHeight: 1.1, color: '#1a237e', textTransform: 'uppercase' }}>
                        TRUSTED BY INDUSTRY LEADERS
                      </p>
                      <p className="mt-3 text-xs text-[#9ca3af]">Barlow Condensed SemiBold 600 / 32px / navy-600</p>
                    </div>
                    <div className="p-8 rounded-xl bg-white border border-[#e5e7eb]">
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#9ca3af', textTransform: 'uppercase' }}>Body Text</span>
                      <p className="mt-4" style={{ fontFamily: tokens.fonts.body, fontWeight: 400, fontSize: '16px', lineHeight: 1.65, color: '#374151', maxWidth: '640px' }}>
                        Ambition Mechanical Services has been delivering precision HVAC solutions across Arizona since 2002. From preconstruction planning to preventive maintenance, we handle commercial and industrial mechanical systems with the integrity and reliability that our name demands.
                      </p>
                      <p className="mt-3 text-xs text-[#9ca3af]">Inter Regular 400 / 16px / line-height 1.65 / neutral-700</p>
                    </div>
                  </div>

                  {/* Kickers and labels */}
                  <div className="p-8 rounded-xl bg-white border border-[#e5e7eb]">
                    <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Kickers, Labels, Buttons</span>
                    <div className="space-y-6">
                      <div>
                        <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>OUR SERVICES</span>
                        <p className="text-xs text-[#9ca3af] mt-1">Kicker: Barlow Condensed SemiBold 600 / 11px / tracking 0.2em / red-500 / uppercase</p>
                      </div>
                      <div>
                        <button className="px-8 py-3.5 rounded-lg text-white" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', backgroundColor: '#dc2626' }}>
                          GET A QUOTE
                        </button>
                        <p className="text-xs text-[#9ca3af] mt-2">Button: Barlow Condensed SemiBold 600 / 14px / tracking 0.08em / uppercase</p>
                      </div>
                      <div>
                        <span style={{ fontFamily: tokens.fonts.body, fontWeight: 500, fontSize: '14px', letterSpacing: '0.02em', color: '#374151' }}>About Us</span>
                        <p className="text-xs text-[#9ca3af] mt-1">Nav link: Inter Medium 500 / 14px / tracking 0.02em / neutral-700</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full type scale table */}
                <h3 style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '20px', letterSpacing: '0.03em', color: '#1a237e', textTransform: 'uppercase', marginBottom: '16px' }}>Full Type Scale</h3>
                <div className="rounded-xl border border-[#e5e7eb] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          {['Role', 'Font', 'Weight', 'Size', 'Tracking', 'LH', 'Transform'].map(h => (
                            <th key={h} className="text-left px-4 py-3 border-b border-[#e5e7eb]" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.15em', color: '#9ca3af', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {typeScale.map((row, i) => (
                          <tr key={i} className="border-b border-[#f3f4f6] hover:bg-[#f8fafc] transition-colors">
                            <td className="px-4 py-3 font-medium text-[#1a237e]" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '12px', letterSpacing: '0.04em' }}>{row.role}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{row.font}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{row.weight}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[#374151]">{row.size}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{row.tracking}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{row.lh}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[#6b7280]">{row.transform}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Google Fonts import */}
                <div className="mt-8">
                  <CodeBlock label="Google Fonts import" code={`<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">

/* Or CSS import */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap');`} />
                </div>
              </div>
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/*  COMPONENTS TAB                                                */}
        {/* ============================================================ */}
        {activeTab === 'components' && (
          <>
            {/* Buttons */}
            <section className="bg-white py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="06" kicker="Components" title="BUTTON SYSTEM" description="Four button variants. All use Barlow Condensed uppercase for CTAs. Rounded-lg (8px), not pill-shaped." />

                <div className="space-y-6 mb-16">
                  {buttonSystem.map((btn, i) => (
                    <div key={i} className="rounded-xl border border-[#e5e7eb] overflow-hidden">
                      <div className="p-6 flex flex-col lg:flex-row lg:items-center gap-6">
                        <div className="flex-1">
                          <span style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#dc2626', textTransform: 'uppercase' }}>{btn.name}</span>
                          <p className="text-sm text-[#6b7280] mt-1">{btn.description}</p>
                          {/* Live preview */}
                          <div className="mt-4 flex gap-4">
                            {btn.name === 'Primary CTA' && (
                              <>
                                <button className="px-8 py-3.5 rounded-lg text-white text-sm" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', backgroundColor: '#dc2626' }}>Get a Quote</button>
                                <button className="px-8 py-3.5 rounded-lg text-white text-sm" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', backgroundColor: '#ef4444' }}>Hover State</button>
                              </>
                            )}
                            {btn.name === 'Secondary CTA' && (
                              <>
                                <button className="px-8 py-3.5 rounded-lg text-sm" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', border: '2px solid #1a237e', color: '#1a237e' }}>See Our Work</button>
                                <button className="px-8 py-3.5 rounded-lg text-white text-sm" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', backgroundColor: '#1a237e' }}>Hover State</button>
                              </>
                            )}
                            {btn.name === 'Ghost / Link' && (
                              <span className="text-[#1a237e] font-medium text-sm underline underline-offset-4">View All Projects <ChevronRight size={14} className="inline" /></span>
                            )}
                            {btn.name === 'Dark CTA' && (
                              <div className="flex gap-4 p-4 rounded-lg" style={{ backgroundColor: '#0a0e2a' }}>
                                <button className="px-8 py-3.5 rounded-lg text-white text-sm backdrop-blur-sm" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>Learn More</button>
                                <button className="px-8 py-3.5 rounded-lg text-white text-sm" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', backgroundColor: '#dc2626' }}>Hover State</button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="lg:w-72 shrink-0 space-y-1.5 text-xs">
                          <div><span className="text-[#9ca3af]">Classes: </span><code className="text-[#374151] font-mono">{btn.classes}</code></div>
                          <div><span className="text-[#9ca3af]">Hover: </span><code className="text-[#374151] font-mono">{btn.hover}</code></div>
                          <div><span className="text-[#9ca3af]">Active: </span><code className="text-[#374151] font-mono">{btn.active}</code></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Component Specs */}
                <SectionHeader number="07" kicker="Component Specs" title="EVERY PIECE" description="Detailed specs for each major UI component. Bobby: follow these exactly." />

                <div className="space-y-4">
                  {componentSpecs.map((comp, i) => (
                    <Accordion key={i} title={comp.name} defaultOpen={i === 0}>
                      <p className="text-sm text-[#6b7280] mt-4 mb-4">{comp.description}</p>
                      <ul className="space-y-2">
                        {comp.specs.map((spec, j) => (
                          <li key={j} className="flex items-start gap-3">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#1a237e] shrink-0" />
                            <code className="text-[13px] text-[#374151] font-mono leading-relaxed">{spec}</code>
                          </li>
                        ))}
                      </ul>
                    </Accordion>
                  ))}
                </div>
              </div>
            </section>

            {/* Spacing System */}
            <section style={{ backgroundColor: '#f8fafc' }} className="py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="08" kicker="Spacing" title="SPACING SYSTEM" description="Consistent spacing across the entire site." />

                <div className="rounded-xl border border-[#e5e7eb] overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          {['Context', 'Value', 'Usage'].map(h => (
                            <th key={h} className="text-left px-4 py-3 border-b border-[#e5e7eb]" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.15em', color: '#9ca3af', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { ctx: 'Container', val: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', use: '1280px max width. All content sections.' },
                          { ctx: 'Section (light)', val: 'py-20 md:py-28', use: 'Generous vertical padding on white/off-white sections.' },
                          { ctx: 'Section (dark)', val: 'py-16 md:py-24', use: 'Slightly tighter on dark sections (they feel heavier).' },
                          { ctx: 'Hero padding', val: 'pt-32 pb-20 md:pt-40 md:pb-24', use: 'Extra top to clear fixed nav.' },
                          { ctx: 'Card padding', val: 'p-6 md:p-8', use: 'Internal card content spacing.' },
                          { ctx: 'Card radius', val: 'rounded-xl (12px)', use: 'All cards and panels.' },
                          { ctx: 'Button radius', val: 'rounded-lg (8px)', use: 'All buttons and inputs.' },
                          { ctx: 'Gap (card grid)', val: 'gap-6 md:gap-8', use: 'Grid gap between cards.' },
                          { ctx: 'Gap (section content)', val: 'gap-12 md:gap-16', use: 'Between major content blocks within a section.' },
                          { ctx: 'Heading gap', val: 'mb-12', use: 'Space between section header and content.' },
                        ].map((row, i) => (
                          <tr key={i} className="border-b border-[#f3f4f6]">
                            <td className="px-4 py-3 font-medium text-[#1a237e]" style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '12px' }}>{row.ctx}</td>
                            <td className="px-4 py-3 font-mono text-xs text-[#374151]">{row.val}</td>
                            <td className="px-4 py-3 text-xs text-[#6b7280]">{row.use}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Responsive */}
                <h3 className="mt-16" style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '20px', letterSpacing: '0.03em', color: '#1a237e', textTransform: 'uppercase', marginBottom: '12px' }}>Responsive Breakpoints</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {breakpoints.map((bp, i) => (
                    <div key={i} className="p-5 rounded-xl bg-white border border-[#e5e7eb]">
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: '#1a237e', textTransform: 'uppercase' }}>{bp.name}</span>
                      <p className="font-mono text-xs text-[#dc2626] mt-1">{bp.range}</p>
                      <p className="font-mono text-xs text-[#9ca3af] mt-0.5">Grid: {bp.cols} col</p>
                      <p className="text-xs text-[#6b7280] mt-2 leading-relaxed">{bp.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/*  WEBSITE LAYOUT TAB                                            */}
        {/* ============================================================ */}
        {activeTab === 'layout' && (
          <>
            <section className="bg-white py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="09" kicker="Website Layout" title="SECTION BY SECTION" description="Bobby: build the site top to bottom following this layout. Each section specifies its background, content pattern, and visual direction." />

                {/* Visual site map */}
                <div className="space-y-3 mb-16">
                  {websiteLayout.map((section, i) => {
                    const isDark = section.bg.includes('navy')
                    return (
                      <div key={i} className="rounded-xl overflow-hidden" style={{ border: isDark ? 'none' : '1px solid #e5e7eb' }}>
                        <div className="flex items-stretch">
                          {/* BG indicator */}
                          <div className="w-2 shrink-0" style={{ backgroundColor: isDark ? '#1a237e' : section.bg.includes('neutral-50') ? '#f8fafc' : '#ffffff', borderRight: isDark ? 'none' : '1px solid #e5e7eb' }} />
                          {/* Content */}
                          <div className="flex-1 p-5 md:p-6" style={{ backgroundColor: isDark ? '#0a0e2a' : '#ffffff' }}>
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              <div className="flex items-center gap-3 md:w-40 shrink-0">
                                <span style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '12px', letterSpacing: '0.04em', color: '#dc2626' }}>{String(i + 1).padStart(2, '0')}</span>
                                <span style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '14px', letterSpacing: '0.04em', color: isDark ? '#ffffff' : '#1a237e', textTransform: 'uppercase' }}>{section.section}</span>
                              </div>
                              <div className="flex-1">
                                <p style={{ color: isDark ? '#d1d5db' : '#374151', fontSize: '14px', lineHeight: 1.6 }}>{section.description}</p>
                              </div>
                              <div className="md:w-48 shrink-0">
                                <span className="inline-block px-3 py-1 rounded text-xs font-mono" style={{ backgroundColor: isDark ? 'rgba(57,73,171,0.2)' : '#f3f4f6', color: isDark ? '#5c6bc0' : '#6b7280' }}>
                                  {section.bg}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Section pattern reference */}
                <SectionHeader number="10" kicker="Section Patterns" title="CONTENT STRUCTURES" description="The repeating patterns used across sections." />

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Kicker + Headline + Body */}
                  <div className="p-8 rounded-xl border border-[#e5e7eb]">
                    <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Pattern: Kicker + Headline + Body</span>
                    <div className="space-y-3">
                      <div>
                        <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>OUR SERVICES</span>
                        <div className="w-8 h-[2px] bg-[#dc2626] mt-2" />
                      </div>
                      <p style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '28px', letterSpacing: '0.03em', color: '#1a237e', textTransform: 'uppercase', lineHeight: 1.0 }}>COMMERCIAL HVAC SOLUTIONS</p>
                      <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.65 }}>From preconstruction to preventive maintenance, Ambition Mechanical handles every phase of your building's mechanical systems.</p>
                    </div>
                    <p className="text-xs text-[#9ca3af] mt-4">Used at the top of every content section. Kicker in red, 2px red line below kicker, navy headline, gray body text.</p>
                  </div>

                  {/* Stat format */}
                  <div className="p-8 rounded-xl" style={{ backgroundColor: '#0a0e2a' }}>
                    <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Pattern: Stats Row</span>
                    <div className="flex justify-around">
                      {[
                        { val: '500+', label: 'Projects' },
                        { val: '23', label: 'Years' },
                        { val: '24/7', label: 'Dispatch' },
                      ].map((s, j) => (
                        <div key={j} className="text-center">
                          <p style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '36px', letterSpacing: '0.03em', color: '#ffffff' }}>{s.val}</p>
                          <p style={{ fontFamily: tokens.fonts.body, fontWeight: 500, fontSize: '11px', letterSpacing: '0.15em', color: '#9ca3af', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[#6b7280] mt-6">Stat values in Barlow Condensed Bold, white. Labels in Inter Medium, uppercase, neutral-400. Works on dark backgrounds.</p>
                  </div>

                  {/* Card on light */}
                  <div className="p-8 rounded-xl border border-[#e5e7eb]">
                    <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Pattern: Service Card (light)</span>
                    <div className="p-6 rounded-xl bg-white border border-[#e5e7eb] shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-10 h-10 rounded-lg bg-[#1a237e] flex items-center justify-center mb-4">
                        <span className="text-white text-lg">*</span>
                      </div>
                      <p style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '18px', letterSpacing: '0.02em', color: '#1a237e', textTransform: 'uppercase' }}>HVAC Installation</p>
                      <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6, marginTop: '8px' }}>Commercial and industrial HVAC systems installed to spec, on schedule, without surprises.</p>
                    </div>
                  </div>

                  {/* Credential badge */}
                  <div className="p-8 rounded-xl border border-[#e5e7eb]">
                    <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>Pattern: Credential Badge</span>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f3f4f6] border border-[#e5e7eb]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#dc2626]" />
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.15em', color: '#374151', textTransform: 'uppercase' }}>Licensed ROC #320923</span>
                    </div>
                    <p className="text-xs text-[#9ca3af] mt-4">Place in footer, hero, and CTA sections. Red dot + Barlow Condensed label. Builds trust without being loud.</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/*  PATTERNS TAB                                                  */}
        {/* ============================================================ */}
        {activeTab === 'patterns' && (
          <>
            {/* Dark section for pattern previews */}
            <section style={{ backgroundColor: '#0a0e2a' }} className="py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="11" kicker="Brand Patterns" title="ELEMENTS FROM THE LOGO" description="Geometric patterns extracted from the Ambition Mechanical logo. Used as subtle background overlays on dark sections (3-8% opacity). Never use on light backgrounds." dark />

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="p-8 rounded-xl flex flex-col items-center" style={{ backgroundColor: '#111638', border: '1px solid rgba(57,73,171,0.25)' }}>
                    <SnowflakePattern size={180} color="#3949ab" opacity={0.6} />
                    <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#283593', textTransform: 'uppercase', marginTop: '16px' }}>Snowflake Geometry</span>
                    <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>Six-fold symmetry from the logo's cooling element. Hero background, CTA sections. 5-8% opacity.</p>
                  </div>
                  <div className="p-8 rounded-xl flex flex-col items-center" style={{ backgroundColor: '#111638', border: '1px solid rgba(57,73,171,0.25)' }}>
                    <div className="h-[180px] flex items-center">
                      <FlameWavePattern width={220} height={120} color="#dc2626" opacity={0.55} />
                    </div>
                    <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase', marginTop: '16px' }}>Heat Wave Motif</span>
                    <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>Radiating wave from the logo's flame elements. Section dividers, accent backgrounds. 3-5% opacity.</p>
                  </div>
                  <div className="p-8 rounded-xl flex flex-col items-center" style={{ backgroundColor: '#111638', border: '1px solid rgba(57,73,171,0.25)' }}>
                    <div className="h-[180px] flex items-center overflow-hidden rounded-lg">
                      <HexagonalGrid width={220} height={160} color="#283593" opacity={0.3} />
                    </div>
                    <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase', marginTop: '16px' }}>Hexagonal Grid</span>
                    <p style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>Based on the snowflake's hexagonal symmetry. Full-bleed background texture at 3-5% opacity.</p>
                  </div>
                </div>

                {/* Full hex grid demo */}
                <div className="p-6 rounded-xl" style={{ backgroundColor: '#111638', border: '1px solid rgba(57,73,171,0.25)' }}>
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Full-width hex grid at 5% opacity</span>
                  <div className="mt-4 rounded-lg overflow-hidden">
                    <HexagonalGrid width={1200} height={100} color="#283593" opacity={0.12} />
                  </div>
                </div>
              </div>
            </section>

            {/* Photography Direction (white bg) */}
            <section className="bg-white py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="12" kicker="Photography" title="HOW IT LOOKS ON CAMERA" description="Photography direction for the website and social content." />

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {[
                    { label: 'HVAC Equipment', desc: 'Clean shots of rooftop units, chillers, VRV systems. Slightly cool color grade, strong contrast. Equipment should look engineered, not generic industrial.' },
                    { label: 'The Crew', desc: 'Real people doing real work. Hard hats, tools in hand, focused. Shoulder-up for social. Never posed. Candid is always stronger.' },
                    { label: 'Scale and Space', desc: 'Wide shots showing commercial project scope. Intel fabs, hospital systems, restaurant kitchens. Scale tells the credibility story.' },
                    { label: 'Progress', desc: 'Before/during/after sequences. Piping going in, ductwork connected, systems online. Progress is the #1 performing social format.' },
                  ].map((item, i) => (
                    <div key={i} className="p-6 rounded-xl bg-[#f8fafc] border border-[#e5e7eb]">
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '11px', letterSpacing: '0.2em', color: i < 2 ? '#dc2626' : '#1a237e', textTransform: 'uppercase' }}>{item.label}</span>
                      <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6, marginTop: '8px' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-xl bg-[#f8fafc] border border-[#e5e7eb]">
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#9ca3af', textTransform: 'uppercase' }}>Color Grade Direction</span>
                  <div className="grid md:grid-cols-3 gap-6 mt-4">
                    {[
                      { param: 'Temperature', value: 'Neutral to slightly cool', note: 'The navy in the brand subtly informs the grade. Never warm/orange.' },
                      { param: 'Contrast', value: 'Medium-high', note: 'Clean shadows with detail. Not crushed, not flat.' },
                      { param: 'Saturation', value: 'Controlled', note: 'Pulled back 10-15% from natural. Reds stay strong for brand moments.' },
                    ].map((item, i) => (
                      <div key={i}>
                        <p style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '12px', letterSpacing: '0.1em', color: '#dc2626', textTransform: 'uppercase' }}>{item.param}</p>
                        <p style={{ fontFamily: tokens.fonts.body, fontWeight: 600, fontSize: '14px', color: '#1a237e', marginTop: '4px' }}>{item.value}</p>
                        <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Social Templates (dark) */}
            <section style={{ backgroundColor: '#0a0e2a' }} className="py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="13" kicker="Social Templates" title="SOCIAL MEDIA SPECS" description="Template specs for Tony and Cleo. All social graphics use the dark brand palette." dark />

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Instagram Post */}
                  <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '1/1' }}>
                    <div className="w-full h-full p-6 flex flex-col justify-between relative" style={{ backgroundColor: '#0a0e2a', border: '1px solid rgba(57,73,171,0.3)' }}>
                      <div className="absolute top-0 right-0 opacity-5">
                        <SnowflakePattern size={200} color="#ffffff" opacity={0.5} />
                      </div>
                      <div className="relative z-10">
                        <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '9px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>PROJECT UPDATE</span>
                        <p style={{ fontFamily: tokens.fonts.display, fontWeight: 800, fontSize: '28px', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase', lineHeight: 1.0, marginTop: '8px' }}>
                          DIN TAI FUNG<br />KITCHEN BUILDOUT
                        </p>
                      </div>
                      <div className="relative z-10">
                        <div className="w-6 h-[2px] mb-3" style={{ backgroundColor: '#dc2626' }} />
                        <span style={{ fontFamily: tokens.fonts.display, fontWeight: 500, fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>AMBITION MECHANICAL</span>
                      </div>
                    </div>
                  </div>

                  {/* Story */}
                  <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '9/16', maxHeight: '400px' }}>
                    <div className="w-full h-full p-6 flex flex-col justify-end relative" style={{ backgroundColor: '#1a237e' }}>
                      <div className="absolute inset-0 opacity-5">
                        <HexagonalGrid width={400} height={700} color="#ffffff" opacity={0.1} />
                      </div>
                      <div className="relative z-10">
                        <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '8px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>3AM EMERGENCY</span>
                        <p style={{ fontFamily: tokens.fonts.display, fontWeight: 800, fontSize: '22px', letterSpacing: '0.03em', color: '#ffffff', textTransform: 'uppercase', lineHeight: 1.0, marginTop: '4px' }}>
                          ABRAZA CHILLER<br />WENT DOWN
                        </p>
                        <p style={{ fontFamily: tokens.fonts.body, fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '8px', lineHeight: 1.5 }}>
                          On-site in under an hour. System back online by sunrise.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* LinkedIn (light variant) */}
                  <div className="rounded-xl overflow-hidden" style={{ aspectRatio: '1.91/1' }}>
                    <div className="w-full h-full p-6 flex flex-col justify-between" style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
                      <div>
                        <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '9px', letterSpacing: '0.2em', color: '#dc2626', textTransform: 'uppercase' }}>NOW HIRING</span>
                        <p style={{ fontFamily: tokens.fonts.display, fontWeight: 700, fontSize: '20px', letterSpacing: '0.03em', color: '#1a237e', textTransform: 'uppercase', lineHeight: 1.0, marginTop: '6px' }}>
                          HVAC TECHNICIANS
                        </p>
                      </div>
                      <div>
                        <div className="w-6 h-[2px]" style={{ backgroundColor: '#dc2626' }} />
                        <p style={{ fontFamily: tokens.fonts.body, fontSize: '10px', color: '#6b7280', marginTop: '6px' }}>
                          Tempe, AZ | Full-time | ROC #320923
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 rounded-xl" style={{ backgroundColor: '#111638', border: '1px solid rgba(57,73,171,0.25)' }}>
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#6b7280', textTransform: 'uppercase' }}>Social Rules</span>
                  <ul className="mt-4 space-y-2">
                    {[
                      'Social graphics use dark palette (navy-900 / navy-600). Never white backgrounds on Instagram/TikTok.',
                      'LinkedIn can use white backgrounds for professional posts (hiring, announcements).',
                      'Text overlays: Barlow Condensed for headlines, Inter for body. Always.',
                      'Red (#dc2626) for kickers and CTAs only. Navy is the dominant color.',
                      'Snowflake or hex grid pattern at 3-5% opacity for texture. Never competing with content.',
                      'Always include Ambition branding: logo or "AMBITION MECHANICAL" wordmark at bottom.',
                    ].map((rule, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#dc2626] shrink-0" />
                        <span style={{ color: '#9ca3af', fontSize: '13px', lineHeight: 1.6 }}>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Animation / Transitions (white bg) */}
            <section className="bg-white py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="14" kicker="Motion" title="ANIMATION SPECS" description="Keep motion purposeful. Industrial feel means controlled, not bouncy." />

                <div className="space-y-4">
                  {[
                    { name: 'Scroll Reveal', code: 'opacity: 0 -> 1, translateY(24px) -> 0\nDuration: 500ms\nEasing: cubic-bezier(0.2, 0.65, 0.2, 1)\nStagger: 60ms per item, max 300ms\nTrigger: IntersectionObserver at 20% threshold' },
                    { name: 'Card Hover', code: '-translate-y-1, shadow-lg\nDuration: 300ms\nEasing: ease-out\nNo scale transforms (keep it grounded)' },
                    { name: 'Button Hover', code: 'bg-color transition + shadow increase\nDuration: 200ms\nEasing: ease\nOptional: -translate-y-0.5 on primary CTA' },
                    { name: 'Nav Scroll', code: 'transparent -> navy-900/95 + backdrop-blur-xl\nDuration: 400ms\nEasing: ease\nTrigger: scroll > 24px' },
                    { name: 'Page Transitions', code: 'fade in: opacity 0->1, 300ms\nNo slide transitions between pages\nKeep it fast and clean' },
                  ].map((item, i) => (
                    <div key={i} className="rounded-xl border border-[#e5e7eb] p-5">
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '13px', letterSpacing: '0.04em', color: '#1a237e', textTransform: 'uppercase' }}>{item.name}</span>
                      <code className="block mt-2 font-mono text-[12px] text-[#374151] bg-[#f8fafc] rounded-lg px-4 py-3 leading-relaxed whitespace-pre-wrap">{item.code}</code>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/*  VOICE & TONE TAB                                              */}
        {/* ============================================================ */}
        {activeTab === 'voice' && (
          <>
            <section className="bg-white py-16 md:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <SectionHeader number="15" kicker="Brand Voice" title="HOW AMBITION TALKS" description="Like a crew lead who knows the job inside out and doesn't need to oversell it. Confident, direct, grounded. Technical when it matters. Human always." />

                {/* Voice attributes */}
                <div className="space-y-4 mb-16">
                  {voiceAttributes.map((v, i) => (
                    <div key={i} className="p-6 rounded-xl bg-[#f8fafc] border border-[#e5e7eb]">
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '12px', letterSpacing: '0.15em', color: '#dc2626', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>{v.attr}</span>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                          <span style={{ color: '#374151', fontSize: '14px' }}>"{v.yes}"</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" />
                          <span style={{ color: '#9ca3af', fontSize: '14px', textDecoration: 'line-through' }}>"{v.no}"</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tone shifts */}
                <SectionHeader number="16" kicker="Tone Shifts" title="CONTEXT CHANGES TONE" description="The voice stays consistent. The tone adapts to the context." />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                  {toneShifts.map((shift, i) => (
                    <div key={i} className="p-6 rounded-xl bg-[#f8fafc] border border-[#e5e7eb]">
                      <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#1a237e', textTransform: 'uppercase' }}>{shift.context}</span>
                      <p className="text-sm text-[#374151] font-medium mt-2">{shift.tone}</p>
                      <p className="text-sm text-[#9ca3af] mt-3 italic">"{shift.example}"</p>
                    </div>
                  ))}
                </div>

                {/* Hard rules */}
                <SectionHeader number="17" kicker="Content Rules" title="HARD RULES" description="Non-negotiable for anyone creating content for Ambition Mechanical." />
                <div className="space-y-3">
                  {[
                    { rule: 'No exclamation marks in headlines', reason: 'Confidence does not need volume.' },
                    { rule: 'Never use "solutions" without specifying what', reason: '"HVAC solutions" is meaningless. "Rooftop unit replacement" is specific.' },
                    { rule: 'No corporate filler', reason: '"Committed to excellence," "second to none," "best in class" are banned. Say what you actually do.' },
                    { rule: 'Credentials are facts, not boasts', reason: 'State plainly: "Licensed ROC #320923. Established 2002. 500+ projects completed."' },
                    { rule: 'Short paragraphs, short sentences', reason: 'This audience scans. 3+ lines to make a point = you lost them.' },
                    { rule: 'CTAs are direct', reason: '"Get a Quote" not "Explore Your Options." "Call Dispatch" not "Reach Out Today."' },
                    { rule: 'Emergency copy has zero warmth', reason: 'When a chiller goes down at 3AM, they want "On our way." Not personality.' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 rounded-xl border border-[#e5e7eb] p-4">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-[#dc2626]/10 flex items-center justify-center mt-0.5">
                        <span className="text-[#dc2626] text-xs font-bold">{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1a237e]">{item.rule}</p>
                        <p className="text-xs text-[#9ca3af] mt-1">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Personality spectrum */}
                <div className="mt-12 p-8 rounded-xl bg-[#f8fafc] border border-[#e5e7eb]">
                  <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', color: '#9ca3af', textTransform: 'uppercase' }}>Brand Personality Spectrum</span>
                  <div className="mt-6 space-y-4">
                    {[
                      { left: 'Casual', right: 'Formal', position: 35 },
                      { left: 'Playful', right: 'Serious', position: 70 },
                      { left: 'Corporate', right: 'Human', position: 75 },
                      { left: 'Quiet', right: 'Loud', position: 45 },
                      { left: 'Technical', right: 'Simple', position: 40 },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <span style={{ fontFamily: tokens.fonts.body, fontSize: '11px', color: '#9ca3af', width: '72px', textAlign: 'right' }}>{item.left}</span>
                        <div className="flex-1 h-2 rounded-full relative bg-[#e5e7eb]">
                          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{ left: `${item.position}%`, backgroundColor: '#dc2626', boxShadow: '0 0 8px rgba(220,38,38,0.3)' }} />
                        </div>
                        <span style={{ fontFamily: tokens.fonts.body, fontSize: '11px', color: '#9ca3af', width: '72px' }}>{item.right}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

      </main>

      {/* ================================================================ */}
      {/*  FOOTER                                                          */}
      {/* ================================================================ */}
      <footer style={{ backgroundColor: '#070b1e', borderTop: '3px solid #dc2626' }} className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#dc2626]" style={{ boxShadow: '0 0 8px rgba(220,38,38,0.4)' }} />
              <span style={{ fontFamily: tokens.fonts.display, fontWeight: 600, fontSize: '10px', letterSpacing: '0.25em', color: '#6b7280', textTransform: 'uppercase' }}>
                Ambition Mechanical Website Brand Spec v3
              </span>
            </div>
            <span style={{ fontFamily: tokens.fonts.body, fontSize: '10px', color: '#4b5563' }}>
              Created by Steffen for AOM / Bobby. March 2026.
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
