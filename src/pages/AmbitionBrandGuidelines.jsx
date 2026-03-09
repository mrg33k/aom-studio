import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Copy, Check, ChevronRight } from 'lucide-react'

/* ================================================================== */
/*  GOOGLE FONT LOADER                                                 */
/* ================================================================== */

const fontLink = document.createElement('link')
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap'
fontLink.rel = 'stylesheet'
if (!document.querySelector('link[href*="Inter"]')) {
  document.head.appendChild(fontLink)
}

/* ================================================================== */
/*  DESIGN SYSTEM DATA — extracted from the live Ambition website      */
/* ================================================================== */

const colorPalette = {
  backgrounds: [
    { name: 'Near Black', hex: '#0a0a0a', token: 'dark-950', role: 'Page Background', usage: 'Primary page background. The darkest surface. Used on body, hero overlays, footer.' },
    { name: 'Charcoal', hex: '#111111', token: 'dark-900', role: 'Card Surface', usage: 'Cards, panels, elevated sections, StatBar background, contact drawer.' },
    { name: 'Dark Gray', hex: '#1a1a1a', token: 'dark-800', role: 'Elevated Surface', usage: 'Inputs, hover states, autofill backgrounds, elevated panels.' },
  ],
  brand: [
    { name: 'Sky Blue', hex: '#0ea5e9', token: 'secondary-500', role: 'Primary Brand', usage: 'The dominant brand color on screen. Links, chips, kickers, stat values, logo wordmark accent.' },
    { name: 'Sky Blue Light', hex: '#38bdf8', token: 'secondary-400', role: 'Hover / Highlight', usage: 'Hover states, active nav glow, accent text, stat bar numbers, logo "Mechanical" type.' },
    { name: 'Sky Blue Dark', hex: '#0284c7', token: 'secondary-600', role: 'Button / Interactive', usage: 'Primary CTA button background (btn-shift), interactive element base, card CTA.' },
    { name: 'Sky Blue Deep', hex: '#0369a1', token: 'secondary-700', role: 'Pressed State', usage: 'Pressed button states, deep interactive accents.' },
  ],
  accent: [
    { name: 'Red Light', hex: '#ef4444', token: 'accent-400', role: 'Hover Accent', usage: 'Hover transitions on buttons (btn-shift hover), gradient endpoints.' },
    { name: 'Red', hex: '#dc2626', token: 'accent-500', role: 'Primary Accent / CTA', usage: 'CTA buttons (btn-primary, btn-outline-red), rough underline, section dividers, active nav.' },
    { name: 'Red Dark', hex: '#b91c1c', token: 'accent-600', role: 'Button Background', usage: 'Primary CTA background, header CTA when scrolled past hero.' },
    { name: 'Red Deepest', hex: '#991b1b', token: 'accent-700', role: 'Pressed', usage: 'Deep pressed states on red CTAs.' },
  ],
  text: [
    { name: 'White', hex: '#ffffff', role: 'Headlines / Primary', usage: 'All headlines, logo text, high-contrast elements, button text.' },
    { name: 'Gray 100', hex: '#f3f4f6', role: 'Input Text', usage: 'Form input text, autofill text color.' },
    { name: 'Gray 300', hex: '#d1d5db', role: 'Body Text', usage: 'Primary readable body text on dark backgrounds. Hero subheadings.' },
    { name: 'Gray 400', hex: '#9ca3af', role: 'Secondary Text', usage: 'Descriptions, muted info, footer nav, utility bar links.' },
    { name: 'Gray 500', hex: '#6b7280', role: 'Kickers / Captions', usage: 'Section kickers, card kicker text, timestamps, social icons default.' },
    { name: 'Gray 600', hex: '#4b5563', role: 'Disabled / Legal', usage: 'Copyright text, disabled social icons.' },
  ],
  cssVars: [
    { name: '--brand-primary', value: '#0ea5e9', usage: 'CSS custom property. Sky blue. Used for branded elements.' },
    { name: '--brand-secondary', value: '#0284c7', usage: 'CSS custom property. Darker sky blue. Supporting brand.' },
    { name: '--brand-accent', value: '#ef4444', usage: 'CSS custom property. Red. CTAs and energy.' },
    { name: '--brand-neutral', value: '#111827', usage: 'CSS custom property. Near-black neutral tone.' },
  ],
}

const typeScale = [
  { role: 'Hero Headlines', font: 'Inter', weight: '900 (Black)', size: '3.75rem / 4.5rem / 4.5rem / 6rem', tracking: 'tighter (-0.05em)', leading: '0.92 mobile / 1.05 desktop', notes: 'Maximum impact. font-black. Tight leading that lets type breathe on large screens. Used with rotating word animation on homepage.' },
  { role: 'Section Headlines', font: 'Inter', weight: '800 (Extrabold)', size: '3rem / 3.75rem', tracking: 'tight (-0.025em)', leading: '1.1', notes: 'heading-lg class. Used for major section headers across all pages.' },
  { role: 'Sub-headlines', font: 'Inter', weight: '700 (Bold)', size: '1.875rem / 2.25rem', tracking: 'tight (-0.025em)', leading: '1.25', notes: 'heading-md class. Section subtitles, card group headers.' },
  { role: 'Card Titles', font: 'Inter', weight: '600 (Semibold)', size: '1.25rem / 1.5rem', tracking: 'tight (-0.025em)', leading: '1.375', notes: 'heading-sm class. Service cards, content cards, FAQ items.' },
  { role: 'Body', font: 'Inter', weight: '300-400 (Light/Regular)', size: '1rem - 1.125rem', tracking: 'normal', leading: '1.6 (relaxed)', notes: 'Light weight for hero subheadings. Regular for standard body. Max width ~42rem for readability.' },
  { role: 'Small Body', font: 'Inter', weight: '400 (Regular)', size: '0.875rem', tracking: 'normal', leading: '1.6 (relaxed)', notes: 'Card descriptions, form labels, secondary text throughout.' },
  { role: 'Kickers / Labels', font: 'Inter', weight: '600 (Semibold)', size: '0.6875rem (11px)', tracking: '0.18em (widest)', leading: '1.2', notes: 'UPPERCASE always. Section kickers, card category labels, stat labels, utility bar metadata.' },
  { role: 'Captions / Legal', font: 'Inter', weight: '500 (Medium)', size: '0.625rem (10px)', tracking: '0.15em - 0.2em', leading: '1.4', notes: 'UPPERCASE. Footer legal, admin badges, credential badges, cookie bar.' },
  { role: 'Navigation', font: 'Inter', weight: '500 (Medium)', size: '0.875rem', tracking: 'tight (-0.025em)', leading: '1.4', notes: 'Nav pill items. Rounded-full pill shape.' },
  { role: 'Buttons / CTAs', font: 'Inter', weight: '600-700 (Semibold/Bold)', size: '0.875rem - 1rem', tracking: 'tight to normal', leading: '1.4', notes: 'Pill-shaped (rounded-full). Uppercase on some variants (card CTA). See button system.' },
]

const voiceAttributes = [
  { attr: 'Confident', yes: 'We handle commercial HVAC systems across every phase.', no: 'We think we can probably help with your HVAC needs.' },
  { attr: 'Direct', yes: '24/7 emergency dispatch. Call (480) 600-2942.', no: "Don't hesitate to reach out if you ever need anything!" },
  { attr: 'Knowledgeable', yes: 'VRV systems, chillers, rooftop units. All makes, all models.', no: 'We fix air conditioners and stuff.' },
  { attr: 'Grounded', yes: 'Built on precision, driven by integrity.', no: "We're the BEST HVAC company in Arizona!!!" },
  { attr: 'Human', yes: 'Our crew shows up. Every time.', no: 'Our team of dedicated professionals strives for excellence in every engagement.' },
]

const toneShifts = [
  { context: 'Website copy', tone: 'Confident, professional, concise', example: 'We prioritize quality over quantity.' },
  { context: 'Social captions', tone: 'Slightly warmer, more casual, still competent', example: 'This Din Tai Fung kitchen buildout is coming together. Week 3 update.' },
  { context: 'Emergency / urgent', tone: 'Direct, no filler, no fluff', example: '3AM call at Abraza. We were on-site in under an hour.' },
  { context: 'Recruitment', tone: 'Proud, inviting, personal', example: "We're hiring techs who take the work personally." },
  { context: 'Client comms', tone: 'Clear, respectful, zero corporate fluff', example: "Here's where we're at on the project. Next steps below." },
]

const componentPatterns = [
  {
    name: 'Scroll Reveal',
    description: 'Every section fades in with a upward slide + slight scale + blur. Uses IntersectionObserver. Staggered delays (45ms increments, max 280ms).',
    css: 'opacity: 0 -> 1, translateY(28px) -> 0, scale(0.985) -> 1, blur(3px) -> 0',
    timing: '520ms opacity, 600ms transform. Easing: cubic-bezier(0.2, 0.65, 0.2, 1)',
  },
  {
    name: 'Pill Navigation',
    description: 'Floating nav pill with frosted glass. Nested pill items with rounded-full shape. Active state uses accent-500/18 bg with accent-300 text and a red glow shadow.',
    css: 'rounded-[2rem], border-white/15, bg-dark-950/75, backdrop-blur-2xl',
    timing: 'Scrolls to compact state at 24px. transition-all duration-500.',
  },
  {
    name: 'Content Cards',
    description: 'Glassmorphism cards. 16:10 media aspect ratio. Image hover zoom. Gradient overlay from bottom. Chip badges for categories.',
    css: 'rounded-2xl, border-white/10, bg-dark-900/70, backdrop-blur-sm, shadow-[0_14px_38px]',
    timing: 'Hover: -translate-y-1, border-secondary-400/45, shadow with secondary glow. Image scale(1.05) over 700ms.',
  },
  {
    name: 'Rough Underline',
    description: 'SVG hand-drawn underline effect on hero "We Build" text. Two wavy paths drawn via pathLength animation. Uses accent-500 (red) color.',
    css: 'Positioned absolute, bottom -4px, rotated -1deg. Two strokes at 3.9px and 3px width.',
    timing: 'pathLength 0->1 over 600ms easeOut. Second stroke delayed 60ms with 0.78 opacity.',
  },
  {
    name: 'Diagonal CTA',
    description: 'Full-width split section. Left: copy + CTA button. Right: diagonal clip-path image with teal-to-red gradient overlay. Credential badge floats bottom-right.',
    css: 'clip-path: polygon(8% 0%, 100% 0%, 100% 100%, 0% 100%). Teal ambient glow blur-3xl on left.',
    timing: 'Static layout. No entrance animation beyond scroll reveal.',
  },
  {
    name: 'Stat Bar',
    description: 'Horizontal row of stats with ambient glow orbs behind. Values in secondary-400 with text-shadow glow. Labels in uppercase 11px tracking-widest.',
    css: 'bg-dark-900, border-y border-gray-800. Values: text-secondary-400 drop-shadow-[0_0_18px_rgba(56,189,248,0.35)]',
    timing: 'Static. No individual animation.',
  },
  {
    name: 'Contact Drawer',
    description: 'Slide-in panel from right (desktop) or bottom (mobile). 3-step form with progress bar. Frosted glass inputs. Gradient-border submit button.',
    css: 'bg-dark-950/95, backdrop-blur-3xl. Ambient glow orbs (accent + secondary). Progress bar: gradient from-accent-500 via-secondary-500 to-accent-500.',
    timing: 'Slide in 360ms with spring easing [0.16, 1, 0.3, 1]. Form fields stagger in at 80ms intervals.',
  },
]

const buttonSystem = [
  {
    name: 'btn-primary',
    description: 'Primary CTA. Solid red, pill shape, hover lift, red glow shadow.',
    classes: 'px-8 py-3.5 bg-accent-600 text-white font-medium rounded-full',
    shadow: 'shadow-[0_4px_20px_rgba(220,38,38,0.25)] -> hover: shadow-[0_4px_25px_rgba(220,38,38,0.4)]',
    hover: '-translate-y-0.5',
  },
  {
    name: 'btn-secondary',
    description: 'Frosted glass pill. White-tinted background with backdrop blur.',
    classes: 'px-8 py-3.5 bg-white/5 text-white font-medium rounded-full backdrop-blur-md border border-white/10',
    shadow: 'None',
    hover: 'bg-white/10, -translate-y-0.5',
  },
  {
    name: 'btn-outline-red',
    description: 'Outlined red pill with solid fill. Warm glow shadow.',
    classes: 'px-6 py-3 bg-accent-600 text-white font-semibold rounded-full border border-accent-500',
    shadow: 'shadow-[0_6px_22px_rgba(220,38,38,0.28)]',
    hover: 'bg-accent-500, border-accent-400',
  },
  {
    name: 'btn-shift',
    description: 'Blue-to-red shift button. Starts secondary-600, hovers to accent-600. Used for content card CTAs.',
    classes: 'px-6 py-3 bg-secondary-600 text-white font-semibold rounded-full border border-secondary-500/50',
    shadow: 'shadow-[0_7px_22px_rgba(14,165,233,0.25)] -> hover: shadow-[0_8px_26px_rgba(220,38,38,0.28)]',
    hover: 'bg-accent-600, border-accent-500/70, -translate-y-0.5',
  },
  {
    name: 'btn-ghost',
    description: 'Text-only ghost link. No background, no border.',
    classes: 'text-gray-300 hover:text-white transition-colors duration-300',
    shadow: 'None',
    hover: 'text-white',
  },
]

const spacingSystem = [
  { token: 'section-container', value: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', usage: 'Every content section uses this wrapper. 1280px max width.' },
  { token: 'Section vertical', value: 'py-16 md:py-24', usage: 'Standard section padding.' },
  { token: 'Hero padding', value: 'pt-32 pb-16 md:pt-40 md:pb-20', usage: 'Extra top padding to clear fixed header.' },
  { token: 'Card padding', value: 'p-5 sm:p-6 (content area), p-8 (service cards)', usage: 'Internal card spacing.' },
  { token: 'Card border radius', value: 'rounded-2xl (16px)', usage: 'All cards, panels, modals.' },
  { token: 'Button border radius', value: 'rounded-full (9999px)', usage: 'All buttons are pill-shaped.' },
  { token: 'Input border radius', value: 'rounded-xl (12px)', usage: 'Form inputs, textareas, selects.' },
  { token: 'Nav pill radius', value: 'rounded-[2rem] (32px)', usage: 'The floating header nav shell.' },
  { token: 'Gap / Grid', value: 'gap-4 to gap-8 (component), gap-12 to gap-16 (section)', usage: 'Grid and flex gap values.' },
]

const glassPatterns = [
  { name: 'Nav Shell', value: 'bg-dark-950/75 backdrop-blur-2xl border border-white/15 shadow-[0_18px_55px_rgba(0,0,0,0.45)]' },
  { name: 'Dashboard Panel', value: 'bg-dark-900/70 backdrop-blur-xl border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.35)]' },
  { name: 'Content Card', value: 'bg-dark-900/70 backdrop-blur-sm border border-white/10 shadow-[0_14px_38px_rgba(0,0,0,0.34)]' },
  { name: 'Contact Drawer', value: 'bg-dark-950/95 backdrop-blur-3xl shadow-[0_30px_80px_rgba(0,0,0,0.5)]' },
  { name: 'Dropdown Menu', value: 'bg-dark-950/90 backdrop-blur-xl border border-white/10 shadow-2xl' },
  { name: 'Credential Badge', value: 'bg-dark-950/85 backdrop-blur-md border border-secondary-400/40 shadow-[0_8px_30px_rgba(14,165,233,0.18)]' },
]

/* ================================================================== */
/*  HELPER COMPONENTS                                                  */
/* ================================================================== */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="ml-2 inline-flex items-center text-gray-500 hover:text-gray-300 transition-colors" title="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

function SectionNumber({ number }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 text-[#38bdf8] text-xs font-bold tabular-nums">
      {number}
    </span>
  )
}

function SectionHeader({ number, kicker, title, description }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <SectionNumber number={number} />
        <div className="w-8 h-[2px] bg-gradient-to-r from-[#dc2626] to-transparent rounded-full" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{kicker}</span>
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">{title}</h2>
      {description && (
        <p className="mt-3 text-gray-400 text-[15px] leading-relaxed max-w-2xl">{description}</p>
      )}
    </div>
  )
}

function ColorSwatch({ color, large }) {
  const lightHexes = ['#ffffff', '#f3f4f6', '#d1d5db', '#9ca3af', '#ef4444', '#38bdf8', '#0ea5e9']
  const isLight = lightHexes.includes(color.hex)
  return (
    <div className="group">
      <div
        className={`${large ? 'h-24 md:h-32' : 'h-16 md:h-20'} rounded-xl border border-white/10 relative overflow-hidden transition-all duration-300 group-hover:border-white/25 group-hover:scale-[1.02]`}
        style={{ backgroundColor: color.hex }}
      >
        <span className={`absolute bottom-2 left-3 font-mono text-[10px] font-bold ${isLight ? 'text-[#0a0a0a]' : 'text-gray-300'} opacity-80`}>
          {color.hex}
        </span>
      </div>
      <div className="mt-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-200 text-sm font-semibold">{color.name}</span>
          <CopyButton text={color.hex} />
        </div>
        {color.token && <span className="font-mono text-[10px] text-[#0ea5e9] tracking-[0.08em] block mt-0.5">{color.token}</span>}
        <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] block">{color.role}</span>
        {color.usage && <p className="text-gray-500 text-xs mt-1 leading-relaxed">{color.usage}</p>}
      </div>
    </div>
  )
}

function CodeBlock({ code, label }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111111] overflow-hidden">
      {label && (
        <div className="px-4 py-2 border-b border-white/10 bg-white/[0.02]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</span>
        </div>
      )}
      <div className="p-4 overflow-x-auto">
        <pre className="font-mono text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{code}</pre>
      </div>
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
    { id: 'voice', label: 'Voice & Tone' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a', fontFamily: "'Inter', system-ui, sans-serif", color: '#d1d5db' }}>

      {/* Subtle noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.02] mix-blend-overlay">
        <svg width="100%" height="100%">
          <filter id="am-noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#am-noise)" />
        </svg>
      </div>

      {/* ================================================================== */}
      {/*  HEADER                                                             */}
      {/* ================================================================== */}
      <header className="sticky top-0 z-40 border-b border-white/10" style={{ backgroundColor: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/brands" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Brands</span>
            </Link>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#dc2626] to-[#0ea5e9]" style={{ boxShadow: '0 0 10px rgba(14,165,233,0.6)' }} />
              <span className="text-sm font-semibold tracking-[0.12em] uppercase text-white">
                Ambition <span className="text-[#38bdf8]">Mechanical</span>
              </span>
            </div>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-600">Brand System v2</span>
        </div>
      </header>

      {/* ================================================================== */}
      {/*  TAB NAV                                                            */}
      {/* ================================================================== */}
      <nav className="sticky top-16 z-30 border-b border-white/10" style={{ backgroundColor: 'rgba(10, 10, 10, 0.9)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 py-2 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium tracking-tight transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-[#dc2626]/15 text-[#ef4444] shadow-[0_0_14px_rgba(220,38,38,0.2)]'
                    : 'text-gray-400 hover:bg-[#0ea5e9]/10 hover:text-[#38bdf8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ================================================================== */}
      {/*  CONTENT                                                            */}
      {/* ================================================================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">

        {/* ================================================================ */}
        {/*  OVERVIEW TAB                                                     */}
        {/* ================================================================ */}
        {activeTab === 'overview' && (
          <div>
            {/* Hero */}
            <section className="py-16 md:py-24">
              <div className="flex flex-col lg:flex-row items-start gap-12">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-[2px] bg-gradient-to-r from-[#dc2626] to-transparent rounded-full" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Website Brand System</span>
                  </div>
                  <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tighter leading-[1.05]">
                    Ambition<br />
                    <span className="bg-gradient-to-r from-[#dc2626] to-[#0ea5e9] text-transparent bg-clip-text">Mechanical</span>
                  </h1>
                  <p className="mt-6 text-lg text-gray-300 leading-relaxed max-w-xl font-light">
                    The definitive design reference for Ambition Mechanical's digital presence. Every value on this page is extracted directly from the live website codebase.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <span className="inline-flex items-center rounded-full border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#38bdf8]">
                      Inter Typeface
                    </span>
                    <span className="inline-flex items-center rounded-full border border-[#dc2626]/30 bg-[#dc2626]/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#ef4444]">
                      Dark-first
                    </span>
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-300">
                      Glassmorphism
                    </span>
                    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-gray-300">
                      Tailwind CSS
                    </span>
                  </div>
                </div>

                {/* Quick-reference card */}
                <div className="w-full lg:w-96 shrink-0 rounded-2xl border border-white/10 bg-[#111111]/70 p-6" style={{ backdropFilter: 'blur(8px)', boxShadow: '0 14px 38px rgba(0,0,0,0.34)' }}>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 block mb-4">Quick Reference</span>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Font</span>
                      <p className="text-white font-semibold mt-0.5">Inter</p>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Primary Brand</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-5 h-5 rounded bg-[#0ea5e9]" />
                        <span className="font-mono text-sm text-white">#0ea5e9</span>
                        <span className="text-xs text-gray-500">Sky Blue</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Primary Accent</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-5 h-5 rounded bg-[#dc2626]" />
                        <span className="font-mono text-sm text-white">#dc2626</span>
                        <span className="text-xs text-gray-500">Red</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Page Background</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-5 h-5 rounded bg-[#0a0a0a] border border-white/20" />
                        <span className="font-mono text-sm text-white">#0a0a0a</span>
                        <span className="text-xs text-gray-500">Near Black</span>
                      </div>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Key Patterns</span>
                      <p className="text-sm text-gray-300 mt-0.5">Pill buttons, frosted glass, scroll reveal, ambient glows, diagonal clip-paths</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Border Radius</span>
                      <p className="text-sm text-gray-300 mt-0.5">Cards: 2xl (16px). Buttons: full (pill). Inputs: xl (12px).</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Design DNA */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="00"
                kicker="Design DNA"
                title="What Makes This Site Feel Like This Site"
                description="These are the core principles baked into every component. If you're building anything for Ambition, these should be second nature."
              />

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: 'Dark-First', text: 'The entire site lives on near-black (#0a0a0a). No light mode. No white backgrounds. Every surface is a shade of dark, differentiated by opacity and blur.' },
                  { title: 'Frosted Glass Everywhere', text: 'Cards, nav, drawers, badges all use backdrop-blur + semi-transparent backgrounds + subtle white borders. This creates depth without heavy shadows.' },
                  { title: 'Pill-Shaped Actions', text: 'Every button and CTA is rounded-full. No sharp corners on interactive elements. This creates a modern, approachable feel against the industrial subject matter.' },
                  { title: 'Two-Color Energy', text: 'Sky blue (#0ea5e9) is the brand. Red (#dc2626) is the action. Blue informs and builds trust. Red drives urgency and CTAs. They meet in gradients.' },
                  { title: 'Motion With Purpose', text: 'Scroll reveals on every section. Hover lifts on cards. Rotating hero words. Drawn underline SVG. But never gratuitous. Every animation supports readability.' },
                  { title: 'Tight Headlines, Relaxed Body', text: 'Headlines use tracking-tight or tracking-tighter with compressed leading. Body text breathes with leading-relaxed (1.6). This contrast creates visual rhythm.' },
                ].map((item, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-[#111111]/50 p-6 transition-all duration-300 hover:border-white/20 hover:bg-[#111111]/70">
                    <h3 className="text-lg font-semibold text-white tracking-tight mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Logo Lockup */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="01"
                kicker="Logo / Wordmark"
                title="The Ambition Wordmark"
                description="On the website, the logo appears as a text wordmark with a gradient dot. The original badge/seal logo is used when a logoUrl is configured in the CMS."
              />

              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-[#111111] p-8 flex flex-col items-center justify-center min-h-[200px]">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 mb-6">Dark Background (Primary)</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#dc2626] to-[#0ea5e9]" style={{ boxShadow: '0 0 10px rgba(14,165,233,0.6)' }} />
                    <span className="text-[0.9rem] font-semibold tracking-[0.12em] uppercase text-white">
                      Ambition <span className="ml-2 text-[#38bdf8]">Mechanical</span>
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-gray-500 text-center max-w-xs">Gradient dot (accent-500 to secondary-500) with glow. "Ambition" in white. "Mechanical" in secondary-400.</p>
                </div>

                <div className="rounded-2xl border border-white/10 p-8 flex flex-col items-center justify-center min-h-[200px]" style={{ backgroundColor: '#ffffff' }}>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 mb-6">White Background (Avoid)</span>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#dc2626] to-[#0ea5e9]" />
                    <span className="text-[0.9rem] font-semibold tracking-[0.12em] uppercase text-[#0a0a0a]">
                      Ambition <span className="ml-2 text-[#0284c7]">Mechanical</span>
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-gray-400 text-center max-w-xs">The website never uses white backgrounds, but if forced: swap white text to near-black, secondary-400 to secondary-600.</p>
                </div>
              </div>

              <CodeBlock
                label="Wordmark JSX"
                code={`<span className="flex items-center gap-2">
  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r
    from-accent-500 to-secondary-500
    shadow-[0_0_10px_rgba(14,165,233,0.6)]" />
  <span className="text-[0.9rem] font-semibold tracking-[0.12em]
    uppercase text-white">
    Ambition
    <span className="ml-2 text-secondary-400">Mechanical</span>
  </span>
</span>`}
              />
            </section>
          </div>
        )}

        {/* ================================================================ */}
        {/*  COLOR TAB                                                        */}
        {/* ================================================================ */}
        {activeTab === 'color' && (
          <div>
            {/* Brand Colors */}
            <section className="py-16">
              <SectionHeader
                number="02"
                kicker="Color System"
                title="Brand Colors"
                description="Sky blue is the primary brand color. Red is the accent/CTA color. These two colors carry all the brand energy."
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {colorPalette.brand.map((c, i) => <ColorSwatch key={i} color={c} large />)}
              </div>
            </section>

            {/* Accent Colors */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="03"
                kicker="Accent / CTA"
                title="Red Accent Scale"
                description="Red drives action. CTA buttons, hover transitions, urgency indicators, the rough underline on hero headlines."
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {colorPalette.accent.map((c, i) => <ColorSwatch key={i} color={c} large />)}
              </div>
            </section>

            {/* Background Colors */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="04"
                kicker="Backgrounds"
                title="Dark Surface Scale"
                description="Three levels of dark. The background, the card, the input. Differentiated by subtle brightness steps."
              />
              <div className="grid grid-cols-3 gap-4 md:gap-6">
                {colorPalette.backgrounds.map((c, i) => <ColorSwatch key={i} color={c} large />)}
              </div>
            </section>

            {/* Text Colors */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="05"
                kicker="Text Colors"
                title="Text Hierarchy"
                description="White headlines, gray-300 body, gray-400 secondary, gray-500 kickers. Each level has a clear purpose."
              />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                {colorPalette.text.map((c, i) => <ColorSwatch key={i} color={c} />)}
              </div>
            </section>

            {/* CSS Custom Properties */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="06"
                kicker="CSS Variables"
                title="Custom Properties"
                description="Defined in :root in index.css. Used for btn-primary and btn-outline-red background overrides."
              />
              <div className="space-y-3">
                {colorPalette.cssVars.map((v, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#111111] px-4 py-3">
                    <div className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: v.value }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-white">{v.name}</span>
                        <span className="font-mono text-xs text-gray-500">{v.value}</span>
                        <CopyButton text={`var(${v.name})`} />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{v.usage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Color Usage */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="07"
                kicker="Ambient Effects"
                title="Glow & Gradient Patterns"
                description="Ambient glow orbs, gradient borders, and text shadows give surfaces depth and warmth."
              />
              <div className="space-y-4">
                {[
                  { label: 'Secondary glow (trust/info)', code: 'bg-secondary-500 opacity-10 blur-3xl', example: 'StatBar ambient orb, DiagonalCTA left glow' },
                  { label: 'Accent glow (energy/CTA)', code: 'bg-accent-500 opacity-10 blur-3xl', example: 'StatBar bottom orb, contact drawer corner glow' },
                  { label: 'Stat value glow', code: 'text-secondary-400 drop-shadow-[0_0_18px_rgba(56,189,248,0.35)]', example: 'StatBar numbers' },
                  { label: 'CTA button glow', code: 'shadow-[0_4px_20px_rgba(220,38,38,0.25)]', example: 'btn-primary resting state' },
                  { label: 'Logo dot glow', code: 'shadow-[0_0_10px_rgba(14,165,233,0.6)]', example: 'Header + footer wordmark dot' },
                  { label: 'Red/blue gradient border', code: 'bg-[linear-gradient(120deg,#dc2626_0%,#0ea5e9_45%,#dc2626_100%)] p-[1.5px]', example: 'Contact drawer submit button' },
                  { label: 'Section divider', code: 'bg-gradient-to-r from-accent-500 to-transparent', example: 'section-divider utility class' },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-[#111111] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-sm font-semibold text-white">{item.label}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{item.example}</p>
                      </div>
                    </div>
                    <code className="block mt-2 font-mono text-xs text-[#38bdf8] bg-white/[0.03] rounded-lg px-3 py-2">{item.code}</code>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ================================================================ */}
        {/*  TYPOGRAPHY TAB                                                   */}
        {/* ================================================================ */}
        {activeTab === 'typography' && (
          <div>
            <section className="py-16">
              <SectionHeader
                number="08"
                kicker="Typeface"
                title="Inter. Only Inter."
                description="The entire website uses a single font family: Inter. Hierarchy is created through weight (300-900), size, and tracking. No secondary typeface."
              />

              {/* Live type specimens */}
              <div className="space-y-8 mb-16">
                <div className="rounded-2xl border border-white/10 bg-[#111111] p-8 overflow-hidden">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 block mb-4">Hero / Display</span>
                  <p className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter leading-[1.05]">
                    We Build the Systems<br />That Keep Business
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>Inter Black (900)</span>
                    <span>3.75rem - 4.5rem</span>
                    <span>tracking-tighter</span>
                    <span>leading-[0.92] - leading-[1.05]</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111111] p-8">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 block mb-4">Section Headlines</span>
                  <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
                    Commercial HVAC Solutions
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>Inter Extrabold (800)</span>
                    <span>heading-lg: 3rem / 3.75rem / 4.5rem</span>
                    <span>tracking-tight</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-white/10 bg-[#111111] p-8">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 block mb-4">Sub-headlines</span>
                    <p className="text-3xl font-bold text-white tracking-tight leading-tight">
                      Trusted by Industry Leaders
                    </p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Inter Bold (700)</span>
                      <span>heading-md: 1.875rem / 2.25rem</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#111111] p-8">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 block mb-4">Card Titles</span>
                    <p className="text-xl font-semibold text-white tracking-tight leading-snug">
                      New Construction HVAC Systems
                    </p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Inter Semibold (600)</span>
                      <span>heading-sm: 1.25rem / 1.5rem</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-white/10 bg-[#111111] p-8">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 block mb-4">Body Text</span>
                    <p className="text-base text-gray-300 leading-relaxed font-light">
                      Commercial and industrial facilities across Arizona trust Ambition Mechanical to deliver clean, reliable HVAC on schedule and without the runaround.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Inter Light-Regular (300-400)</span>
                      <span>1rem - 1.125rem</span>
                      <span>leading-relaxed (1.6)</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#111111] p-8">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 block mb-4">Kickers / Labels</span>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 mb-2">Section Kicker Example</p>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">Caption / Legal Example</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Inter Semibold (600) / Medium (500)</span>
                      <span>11px / 10px</span>
                      <span>tracking-[0.18em] / [0.2em]</span>
                      <span>UPPERCASE always</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full type scale table */}
              <h3 className="text-xl font-semibold text-white tracking-tight mb-6">Full Type Scale Reference</h3>
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#111111] border-b border-white/10">
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Role</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Weight</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Size</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Tracking</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Leading</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 hidden lg:table-cell">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typeScale.map((row, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-white font-medium">{row.role}</td>
                          <td className="px-4 py-3 font-mono text-xs text-[#38bdf8]">{row.weight}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-300">{row.size}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-300">{row.tracking}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-300">{row.leading}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Tailwind utility classes */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="09"
                kicker="Utility Classes"
                title="Heading Utility Classes"
                description="Pre-built Tailwind @apply classes defined in index.css. Use these for consistent heading styles."
              />
              <div className="space-y-4">
                {[
                  { cls: '.heading-lg', def: 'text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.1] tracking-tight' },
                  { cls: '.heading-md', def: 'text-3xl sm:text-4xl font-bold leading-tight tracking-tight' },
                  { cls: '.heading-sm', def: 'text-xl sm:text-2xl font-semibold leading-snug tracking-tight' },
                  { cls: '.text-muted', def: 'text-gray-400' },
                  { cls: '.section-kicker', def: 'text-xs text-gray-500 uppercase tracking-widest mb-3' },
                  { cls: '.section-divider', def: 'w-24 h-1 bg-gradient-to-r from-accent-500 to-transparent rounded-full' },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-[#111111] px-4 py-3 flex items-start gap-4">
                    <span className="font-mono text-sm text-[#dc2626] shrink-0 w-32">{item.cls}</span>
                    <code className="font-mono text-xs text-gray-400 leading-relaxed">{item.def}</code>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ================================================================ */}
        {/*  COMPONENTS TAB                                                   */}
        {/* ================================================================ */}
        {activeTab === 'components' && (
          <div>
            {/* Button System */}
            <section className="py-16">
              <SectionHeader
                number="10"
                kicker="Buttons"
                title="Button System"
                description="Five button variants. All pill-shaped (rounded-full). All with transition-all duration-300."
              />

              <div className="space-y-6">
                {buttonSystem.map((btn, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Live preview */}
                      <div className="flex-1">
                        <span className="font-mono text-sm text-[#dc2626] font-bold">{btn.name}</span>
                        <p className="text-sm text-gray-400 mt-1">{btn.description}</p>
                        <div className="mt-4">
                          {btn.name === 'btn-primary' && (
                            <button className="px-8 py-3.5 font-medium rounded-full text-white text-sm" style={{ backgroundColor: '#b91c1c', boxShadow: '0 4px 20px rgba(220,38,38,0.25)' }}>
                              Get a Quote
                            </button>
                          )}
                          {btn.name === 'btn-secondary' && (
                            <button className="px-8 py-3.5 font-medium rounded-full text-white text-sm border" style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
                              See Our Projects
                            </button>
                          )}
                          {btn.name === 'btn-outline-red' && (
                            <button className="px-6 py-3 font-semibold rounded-full text-white text-sm" style={{ backgroundColor: '#b91c1c', border: '1px solid #dc2626', boxShadow: '0 6px 22px rgba(220,38,38,0.28)' }}>
                              Learn More
                            </button>
                          )}
                          {btn.name === 'btn-shift' && (
                            <button className="px-6 py-3 font-semibold rounded-full text-white text-sm" style={{ backgroundColor: '#0284c7', border: '1px solid rgba(14,165,233,0.5)', boxShadow: '0 7px 22px rgba(14,165,233,0.25)' }}>
                              View Project <ChevronRight size={14} className="inline ml-1" />
                            </button>
                          )}
                          {btn.name === 'btn-ghost' && (
                            <button className="text-gray-300 text-sm hover:text-white transition-colors">
                              Ghost Link
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Specs */}
                      <div className="lg:w-80 shrink-0 space-y-2 text-xs">
                        <div><span className="text-gray-500">Classes:</span> <code className="text-gray-300 font-mono">{btn.classes}</code></div>
                        <div><span className="text-gray-500">Shadow:</span> <code className="text-gray-300 font-mono">{btn.shadow}</code></div>
                        <div><span className="text-gray-500">Hover:</span> <code className="text-gray-300 font-mono">{btn.hover}</code></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Glass / Surface Patterns */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="11"
                kicker="Surfaces"
                title="Glassmorphism Patterns"
                description="Every elevated surface uses a combination of semi-transparent background, backdrop blur, white/10 borders, and deep shadows."
              />

              <div className="grid md:grid-cols-2 gap-6">
                {glassPatterns.map((pattern, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                    <span className="text-sm font-semibold text-white">{pattern.name}</span>
                    <code className="block mt-3 font-mono text-[11px] text-[#38bdf8] bg-white/[0.03] rounded-lg px-3 py-2.5 leading-relaxed break-all">
                      {pattern.value}
                    </code>
                  </div>
                ))}
              </div>
            </section>

            {/* Component Patterns */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="12"
                kicker="Patterns"
                title="Component Architecture"
                description="Key interactive patterns used across the site. These define the motion and interaction language."
              />

              <div className="space-y-6">
                {componentPatterns.map((pattern, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                    <h3 className="text-lg font-semibold text-white tracking-tight">{pattern.name}</h3>
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">{pattern.description}</p>
                    <div className="mt-4 grid md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 block mb-1">CSS / Classes</span>
                        <code className="font-mono text-[11px] text-[#38bdf8] leading-relaxed">{pattern.css}</code>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 block mb-1">Timing</span>
                        <code className="font-mono text-[11px] text-gray-400 leading-relaxed">{pattern.timing}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Spacing System */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="13"
                kicker="Spacing"
                title="Spacing & Layout"
                description="Consistent spacing tokens used across the entire site."
              />

              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#111111] border-b border-white/10">
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Token / Context</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Value</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spacingSystem.map((row, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 text-white font-medium font-mono text-xs">{row.token}</td>
                          <td className="px-4 py-3 font-mono text-xs text-[#38bdf8]">{row.value}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{row.usage}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Tailwind Config */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="14"
                kicker="Config"
                title="Tailwind Configuration"
                description="The exact tailwind.config.js extended values. This is the source of truth for all design tokens."
              />
              <CodeBlock
                label="tailwind.config.js (extended theme)"
                code={`colors: {
  dark: {
    50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb',
    800: '#1a1a1a', 900: '#111111', 950: '#0a0a0a',
  },
  accent: {
    400: '#ef4444', 500: '#dc2626',
    600: '#b91c1c', 700: '#991b1b',
  },
  secondary: {
    400: '#38bdf8', 500: '#0ea5e9',
    600: '#0284c7', 700: '#0369a1',
  },
},
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
},
fontSize: {
  '5xl': ['3rem', { lineHeight: '1.1' }],
  '6xl': ['3.75rem', { lineHeight: '1.1' }],
}`}
              />
            </section>

            {/* Framer Motion Patterns */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="15"
                kicker="Motion"
                title="Framer Motion Patterns"
                description="The site uses framer-motion (aliased as Motion) for entrance animations, hover effects, and layout transitions."
              />
              <div className="space-y-4">
                {[
                  {
                    name: 'Header entrance',
                    code: 'initial={{ opacity: 0, y: -20 }}\nanimate={{ opacity: 1, y: 0 }}\ntransition={{ duration: 0.45 }}',
                  },
                  {
                    name: 'Dropdown menu',
                    code: 'hidden: { opacity: 0, scale: 0.95, y: -8 }\nvisible: { opacity: 1, scale: 1, y: 0, staggerChildren: 0.06 }\nexit: { opacity: 0, scale: 0.96, y: -8 }\nEasing: [0.16, 1, 0.3, 1] (spring-like)',
                  },
                  {
                    name: 'Service card hover',
                    code: 'whileHover={{ y: -8 }}\ntransition={{ duration: 0.3, ease: "easeOut" }}',
                  },
                  {
                    name: 'Contact drawer slide',
                    code: 'Desktop: initial={{ x: "100%" }} animate={{ x: 0 }}\nMobile: initial={{ y: "100%" }} animate={{ y: 0 }}\ntransition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}',
                  },
                  {
                    name: 'Form stagger',
                    code: 'Parent: staggerChildren: 0.08, delayChildren: 0.08\nChild: hidden {{ opacity: 0, y: 18 }} visible {{ opacity: 1, y: 0 }}\ntransition: {{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}',
                  },
                  {
                    name: 'Rotating hero word',
                    code: 'initial={{ y: 20, opacity: 0 }}\nanimate={{ y: 0, opacity: 1 }}\nexit={{ y: -20, opacity: 0 }}\ntransition={{ duration: 0.6, ease: "easeOut" }}\nCycle interval: 2500ms',
                  },
                  {
                    name: 'Button micro-interactions',
                    code: 'whileHover={{ scale: 1.02 }} or {{ scale: 1.05 }}\nwhileTap={{ scale: 0.95 }} or {{ scale: 0.98 }}',
                  },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-[#111111] p-4">
                    <span className="text-sm font-semibold text-white">{item.name}</span>
                    <code className="block mt-2 font-mono text-[11px] text-[#38bdf8] bg-white/[0.03] rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">{item.code}</code>
                  </div>
                ))}
              </div>
            </section>

            {/* Scroll Reveal Code */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="16"
                kicker="Animation"
                title="Scroll Reveal System"
                description="The entrance animation applied to every section. Defined in CSS, triggered by IntersectionObserver."
              />
              <CodeBlock
                label="scroll-reveal CSS (index.css)"
                code={`.scroll-reveal {
  --reveal-delay: 0ms;
  opacity: 0;
  transform: translate3d(0, 28px, 0) scale(0.985);
  filter: blur(3px);
  transition:
    opacity 520ms cubic-bezier(0.2, 0.65, 0.2, 1),
    transform 600ms cubic-bezier(0.2, 0.65, 0.2, 1),
    filter 520ms cubic-bezier(0.2, 0.65, 0.2, 1);
  transition-delay: var(--reveal-delay);
  will-change: opacity, transform, filter;
}

.scroll-reveal.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  filter: blur(0);
}`}
              />

              <div className="mt-6">
                <CodeBlock
                  label="Stagger delay logic (ScrollReveal.jsx)"
                  code={`// Each element gets a staggered delay: index * 45ms, max 280ms
element.style.setProperty('--reveal-delay', \`\${Math.min(revealIndex * 45, 280)}ms\`)

// IntersectionObserver config
{ threshold: 0.2, rootMargin: '0px 0px -10% 0px' }`}
                />
              </div>
            </section>
          </div>
        )}

        {/* ================================================================ */}
        {/*  VOICE & TONE TAB                                                 */}
        {/* ================================================================ */}
        {activeTab === 'voice' && (
          <div>
            <section className="py-16">
              <SectionHeader
                number="17"
                kicker="Brand Voice"
                title="How Ambition Sounds"
                description="Confident, direct, knowledgeable, grounded, human. Never corporate, never arrogant, never filler."
              />

              <div className="rounded-2xl border border-white/10 overflow-hidden mb-12">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#111111] border-b border-white/10">
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 w-28">Attribute</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#38bdf8]">This</th>
                        <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ef4444]">Not This</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voiceAttributes.map((row, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="px-4 py-4 text-white font-semibold">{row.attr}</td>
                          <td className="px-4 py-4 text-gray-300">{row.yes}</td>
                          <td className="px-4 py-4 text-gray-500 italic">{row.no}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Tone Shifts */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="18"
                kicker="Tone Shifts"
                title="Context-Dependent Tone"
                description="The voice stays the same. The tone shifts depending on where the words appear."
              />

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {toneShifts.map((shift, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-[#111111]/50 p-6">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0ea5e9]">{shift.context}</span>
                    <p className="text-sm text-white font-medium mt-2">{shift.tone}</p>
                    <p className="text-sm text-gray-400 mt-3 italic leading-relaxed">"{shift.example}"</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Content Rules */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="19"
                kicker="Content Rules"
                title="Hard Rules for Writing"
                description="Non-negotiable guidelines for anyone creating content for Ambition Mechanical."
              />

              <div className="space-y-4">
                {[
                  { rule: 'Never use exclamation marks in headlines.', reason: 'Confidence doesn\'t need volume.' },
                  { rule: 'Never use "solutions" without specifying what.', reason: '"HVAC solutions" is meaningless. "Rooftop unit replacement" is specific.' },
                  { rule: 'No corporate filler phrases.', reason: '"Committed to excellence," "second to none," "best in class" are banned. Say what you actually do.' },
                  { rule: 'Credentials are facts, not boasts.', reason: 'State them plainly: "Licensed ROC #320923. Established 2002. 500+ projects completed."' },
                  { rule: 'Short paragraphs. Short sentences.', reason: 'This audience scans. If it takes more than 3 lines to make a point, you lost them.' },
                  { rule: 'CTAs are direct.', reason: '"Get a Quote" not "Explore Your Options." "Call Dispatch" not "Reach Out Today."' },
                  { rule: 'Emergency copy has zero warmth.', reason: 'When a chiller goes down at 3AM, nobody wants personality. They want "On our way."' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 rounded-xl border border-white/10 bg-[#111111] p-4">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-[#dc2626]/15 flex items-center justify-center mt-0.5">
                      <span className="text-[#ef4444] text-xs font-bold">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{item.rule}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Social Media Content Guide */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="20"
                kicker="Social Media"
                title="Content Creation Guide"
                description="For agents (like Cleo) creating social content for Ambition Mechanical. These rules ensure brand consistency across platforms."
              />

              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                  <h3 className="text-base font-semibold text-white mb-4">Visual Rules for Social Posts</h3>
                  <div className="space-y-3 text-sm text-gray-400">
                    <p>Background: always dark (#0a0a0a or #111111). Never white, never light gray.</p>
                    <p>Text overlays: white (#ffffff) for primary, gray-300 (#d1d5db) for secondary. Sky blue (#38bdf8) for accent/highlight words.</p>
                    <p>CTAs / call-to-action text: red (#dc2626) or white on red background.</p>
                    <p>Typography: Inter only. Headlines bold/extrabold, body regular/light. Tracking-tight on headlines.</p>
                    <p>If using photos: darken overlay (60-80% opacity dark) so text reads cleanly over imagery.</p>
                    <p>Credential watermark: "ROC #320923" in small caps, gray-500, bottom corner. Optional but adds trust.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                  <h3 className="text-base font-semibold text-white mb-4">Caption Style</h3>
                  <div className="space-y-3 text-sm text-gray-400">
                    <p>First line = hook. Short. Punchy. No hashtags in first line.</p>
                    <p>Body: 2-4 short sentences max. Break into lines for readability.</p>
                    <p>Tone: warm side of professional. Like a skilled tradesman who's proud of the work but doesn't brag.</p>
                    <p>Hashtags: 3-5 max at the end. Mix brand (#AmbitionMechanical) with vertical (#CommercialHVAC #PhoenixContractor).</p>
                    <p>Never use: "exciting," "amazing," "world-class," or exclamation marks.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                  <h3 className="text-base font-semibold text-white mb-4">Content Categories</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { cat: 'Project Updates', desc: 'Job site progress, before/after, install shots. "Week 3 on the Din Tai Fung buildout."' },
                      { cat: 'Team / Culture', desc: 'Crew on site, new hires, behind-the-scenes. Humanize the brand.' },
                      { cat: 'Technical / Educational', desc: 'HVAC tips, system types, maintenance advice. Position as experts.' },
                      { cat: 'Emergency Response', desc: 'After-hours calls, rapid response stories. Direct, no-nonsense.' },
                      { cat: 'Industry / Market', desc: 'Facility types served, market insights. Show breadth.' },
                      { cat: 'Recruitment', desc: 'Open positions, what it is like to work here. Proud and inviting.' },
                    ].map((item, i) => (
                      <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <span className="text-xs font-semibold text-[#0ea5e9]">{item.cat}</span>
                        <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Key Copy Patterns */}
            <section className="py-16 border-t border-white/10">
              <SectionHeader
                number="21"
                kicker="Copy Patterns"
                title="Recurring Copy Structures"
                description="Patterns that appear throughout the website and should be maintained in all new content."
              />

              <div className="space-y-6">
                {[
                  {
                    pattern: 'Hero rotating words',
                    description: 'The homepage hero headline ends with a rotating word that cycles every 2.5s: "moving." (white), "cool." (secondary-400 with blue glow), "warm." (accent-500 with red glow), "just right." (gradient from accent to secondary).',
                    code: '"We Build the Systems That Keep Business {moving. | cool. | warm. | just right.}"',
                  },
                  {
                    pattern: 'Kicker + Headline + Body',
                    description: 'Most sections follow this three-tier pattern. Kicker is 11px uppercase tracked-wide gray-500. Headline is bold/extrabold white. Body is regular gray-300/400.',
                    code: '<p class="section-kicker">Get Started</p>\n<h2 class="heading-md text-white mb-4">Ready to solve your next HVAC challenge?</h2>\n<p class="text-gray-400 leading-relaxed">...</p>',
                  },
                  {
                    pattern: 'Stat format',
                    description: 'Stats use clamp() sizing with secondary-400 color and text glow. Labels are 11px uppercase.',
                    code: 'Value: "23+" | "9" | "24/7" | "2025" | "ROC #320923"\nLabel: "Years in Commercial HVAC" | "Markets Served" | etc.',
                  },
                  {
                    pattern: 'Credential badge',
                    description: 'Small floating badge with license number. Appears in DiagonalCTA and could be used anywhere trust needs reinforcement.',
                    code: 'Licensed | ROC #320923',
                  },
                ].map((item, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-[#111111] p-6">
                    <h3 className="text-base font-semibold text-white">{item.pattern}</h3>
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed">{item.description}</p>
                    <code className="block mt-3 font-mono text-[11px] text-[#38bdf8] bg-white/[0.03] rounded-lg px-3 py-2.5 leading-relaxed whitespace-pre-wrap">{item.code}</code>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <span className="text-xs text-gray-600">Ambition Mechanical Brand System v2 / AOM</span>
          <span className="text-xs text-gray-600">Source of truth: github.com/mrg33k/AMBITION</span>
        </div>
      </footer>
    </div>
  )
}
