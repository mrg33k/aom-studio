import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Copy, Check } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Color data                                                         */
/* ------------------------------------------------------------------ */

const primaryColors = [
  { name: 'Sky Blue', hex: '#0ea5e9', token: 'secondary-500', role: 'Primary Brand', usage: 'Links, highlights, chips, kickers. The dominant brand color.' },
  { name: 'Sky Blue Light', hex: '#38bdf8', token: 'secondary-400', role: 'Hover / Accent', usage: 'Hover states, accent text, logo "Mechanical" wordmark.' },
  { name: 'Sky Blue Dark', hex: '#0284c7', token: 'secondary-600', role: 'Interactive', usage: 'Buttons, interactive elements, CTAs.' },
  { name: 'Sky Blue Deepest', hex: '#0369a1', token: 'secondary-700', role: 'Pressed', usage: 'Pressed states, deep accents.' },
]

const accentColors = [
  { name: 'Red', hex: '#dc2626', token: 'accent-500', role: 'Primary CTA', usage: 'CTA buttons, urgent elements, headline underlines.' },
  { name: 'Red Light', hex: '#ef4444', token: 'accent-400', role: 'Hover Accent', usage: 'Hover accents, gradients.' },
  { name: 'Red Dark', hex: '#b91c1c', token: 'accent-600', role: 'Button BG', usage: 'Button backgrounds.' },
  { name: 'Red Deepest', hex: '#991b1b', token: 'accent-700', role: 'Pressed', usage: 'Pressed states.' },
]

const bgColors = [
  { name: 'Near-black', hex: '#0a0a0a', token: 'dark-950', role: 'Page BG', usage: 'Page background, hero overlays.' },
  { name: 'Charcoal', hex: '#111111', token: 'dark-900', role: 'Card Surface', usage: 'Cards, panels, sections.' },
  { name: 'Dark Gray', hex: '#1a1a1a', token: 'dark-800', role: 'Elevated', usage: 'Inputs, elevated panels, hover states.' },
]

const textColors = [
  { name: 'Body Text', hex: '#d1d5db', role: 'Primary Text', usage: 'Primary readable text on dark backgrounds.' },
  { name: 'Muted Text', hex: '#9ca3af', role: 'Secondary', usage: 'Secondary info, descriptions.' },
  { name: 'Subtle Text', hex: '#6b7280', role: 'Tertiary', usage: 'Kickers, captions, timestamps.' },
]

/* ------------------------------------------------------------------ */
/*  Typography data                                                    */
/* ------------------------------------------------------------------ */

const typeRows = [
  { role: 'Hero Headlines', font: 'Inter', weight: 'Black (900)', size: '7xl-8xl', tracking: 'Tighter', lh: '0.92-1.05', notes: 'Maximum impact. Tight leading.' },
  { role: 'Section Headlines', font: 'Inter', weight: 'Extrabold (800)', size: '5xl-6xl', tracking: 'Tight', lh: '1.1', notes: '' },
  { role: 'Sub-headlines', font: 'Inter', weight: 'Bold (700)', size: '3xl-4xl', tracking: 'Tight', lh: '1.2', notes: '' },
  { role: 'Card Titles', font: 'Inter', weight: 'Semibold (600)', size: 'xl', tracking: 'Tight', lh: '1.3', notes: '' },
  { role: 'Body Text', font: 'Inter', weight: 'Light-Regular (300-400)', size: 'base-lg', tracking: 'Normal', lh: '1.6', notes: 'Light weight on hero subheadings.' },
  { role: 'Kickers/Labels', font: 'Inter', weight: 'Semibold (600)', size: 'xs', tracking: '0.18em', lh: '1.2', notes: 'UPPERCASE always.' },
  { role: 'Navigation', font: 'Inter', weight: 'Medium (500)', size: 'sm', tracking: 'Tight', lh: '1.4', notes: '' },
  { role: 'CTAs/Buttons', font: 'Inter', weight: 'Semibold-Bold (600-700)', size: 'sm-base', tracking: 'Normal to tight', lh: '1.4', notes: '' },
]

/* ------------------------------------------------------------------ */
/*  Voice data                                                         */
/* ------------------------------------------------------------------ */

const voiceAttributes = [
  { attr: 'Confident', yes: 'We handle commercial HVAC systems across every phase.', no: 'We think we can probably help with your HVAC needs.' },
  { attr: 'Direct', yes: '24/7 emergency dispatch. Call (480) 600-2942.', no: "Don't hesitate to reach out if you ever need anything!" },
  { attr: 'Knowledgeable', yes: 'VRV systems, chillers, rooftop units. All makes, all models.', no: 'We fix air conditioners and stuff.' },
  { attr: 'Grounded', yes: 'Built on precision, driven by integrity.', no: "We're the BEST HVAC company in Arizona!!!" },
  { attr: 'Human', yes: 'Our crew shows up. Every time.', no: 'Corporate-speak with no personality' },
]

const toneShifts = [
  { context: 'Website copy', tone: 'Confident, professional, concise', example: 'We prioritize quality over quantity.' },
  { context: 'Social captions', tone: 'Slightly warmer, more casual, still competent', example: 'This Din Tai Fung kitchen buildout is coming together. Week 3 update.' },
  { context: 'Emergency/urgent', tone: 'Direct, no filler', example: '3AM call at Abraza. We were on-site in under an hour.' },
  { context: 'Recruitment', tone: 'Proud, inviting', example: "We're hiring techs who take the work personally." },
  { context: 'Client comms', tone: 'Clear, respectful, zero corporate fluff', example: "Here's where we're at on the project. Next steps below." },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="ml-2 inline-flex items-center text-[#6b7280] hover:text-[#d1d5db] transition-colors" title="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

function ColorSwatch({ color, large }) {
  const lightHexes = ['#d1d5db', '#9ca3af', '#ef4444', '#dc2626', '#38bdf8', '#0ea5e9']
  const isLight = lightHexes.includes(color.hex)
  return (
    <div className="group">
      <div
        className={`${large ? 'h-24 md:h-32' : 'h-16 md:h-20'} rounded-2xl border border-white/10 relative overflow-hidden transition-all duration-300 group-hover:border-white/20`}
        style={{ backgroundColor: color.hex }}
      >
        <span className={`absolute bottom-2 left-3 font-mono text-[10px] font-bold ${isLight ? 'text-[#0a0a0a]' : 'text-[#d1d5db]'} opacity-80`}>
          {color.hex}
        </span>
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <span className="text-[#d1d5db] text-sm font-semibold">{color.name}</span>
          <CopyButton text={color.hex} />
        </div>
        {color.token && <span className="font-mono text-[10px] text-[#6b7280] uppercase tracking-[0.2em]">{color.token}</span>}
        <span className="font-mono text-[10px] text-[#6b7280] uppercase tracking-[0.2em] block">{color.role}</span>
        {color.usage && <p className="text-[#9ca3af] text-xs mt-1 leading-relaxed">{color.usage}</p>}
      </div>
    </div>
  )
}

function SectionHeader({ label, title, subtitle }) {
  return (
    <div className="mb-12">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-4">{label}</p>
      <div className="w-12 h-[2px] bg-gradient-to-r from-[#dc2626] to-[#0ea5e9] mb-4" />
      <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-white">{title}</h2>
      {subtitle && <p className="text-gray-400 text-base mt-4 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
  )
}

function NavDot({ label, id, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 group transition-all duration-300 ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
    >
      <span className={`block w-1.5 h-1.5 rounded-full transition-colors ${active ? 'bg-[#0ea5e9]' : 'bg-[#6b7280] group-hover:bg-[#9ca3af]'}`} />
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#9ca3af] hidden lg:block">{label}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function AmbitionBrandGuidelines() {
  const [activeSection, setActiveSection] = useState('essence')

  const sections = [
    { id: 'essence', label: 'Brand Essence' },
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'visual', label: 'Visual / Video' },
    { id: 'voice', label: 'Voice & Tone' },
    { id: 'social', label: 'Social Media' },
    { id: 'dos-donts', label: "Do's & Don'ts" },
  ]

  const scrollTo = (id) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d1d5db] relative">
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay">
        <svg width="100%" height="100%">
          <filter id="ambition-noise"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#ambition-noise)" />
        </svg>
      </div>

      {/* Subtle blue gradient wash */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04] bg-gradient-to-b from-[#0ea5e9]/10 via-transparent to-[#0ea5e9]/5" />

      {/* Side nav */}
      <nav className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4 hidden md:flex">
        {sections.map(s => (
          <NavDot key={s.id} {...s} active={activeSection === s.id} onClick={scrollTo} />
        ))}
      </nav>

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/75 backdrop-blur-2xl border-b border-white/8">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link to="/brands" className="flex items-center gap-3 text-gray-400 hover:text-[#0ea5e9] transition-colors">
            <ArrowLeft size={16} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]">All Brands</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#dc2626] to-[#0ea5e9] shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
              <span className="text-sm font-semibold uppercase tracking-[0.12em] text-white">Ambition</span>
              <span className="text-[#38bdf8] text-sm font-semibold uppercase tracking-[0.12em]">Mechanical</span>
            </span>
            <span className="text-white/15">/</span>
            <span className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em]">Brand Guidelines</span>
          </div>
          <span className="font-mono text-[10px] text-gray-500">v1.0</span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 md:py-40 px-6 md:px-12 max-w-6xl mx-auto">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-6">Brand System</p>
        <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white leading-[0.92]">
          AMBITION<br />
          <span className="text-[#38bdf8]">MECHANICAL</span>
        </h1>
        <p className="text-gray-400 text-lg mt-8 max-w-xl leading-relaxed">
          Brand guidelines for Ambition Mechanical Services. Colors, typography, voice, video style, and social media standards.
        </p>
        <div className="flex items-center gap-4 mt-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-[#0a0a0a]/75 backdrop-blur-xl font-mono text-[10px] text-gray-400 uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] shadow-[0_0_6px_rgba(14,165,233,0.6)]" />
            Draft
          </span>
          <span className="font-mono text-[10px] text-gray-500">Last updated: March 2026</span>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 md:px-12">

        {/* ---- 1. BRAND ESSENCE ---- */}
        <section id="essence" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader
            label="01 / Brand Essence"
            title="WHO THEY ARE"
            subtitle="A commercial and industrial mechanical contractor based in Tempe, AZ. Established 2002. Licensed ROC #320923."
          />

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-6">What They Stand For</p>
              <p className="text-[#9ca3af] text-sm leading-relaxed mb-4">
                The name says it. Ambition was born from "a strong passion and desire to excel in the HVAC/R industry."
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {['Honesty', 'Integrity', 'Reliability'].map(v => (
                  <span key={v} className="px-3 py-1.5 rounded-full border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 font-mono text-xs text-[#0ea5e9]">{v}</span>
                ))}
              </div>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">The Feeling</p>
              <p className="text-[#9ca3af] text-sm leading-relaxed mb-4">
                Competence you can feel. Not flashy, not corporate-cold. Confident and grounded. When Ambition shows up on a job site, you know the work is going to be done right. They're the contractor other contractors respect.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Positioning</p>
              <p className="text-[#9ca3af] text-sm leading-relaxed">
                Premium commercial/industrial mechanical. Not competing on price. Competing on precision, responsiveness, and breadth of capability (preconstruction through maintenance).
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Key Clients</p>
              <div className="flex flex-wrap gap-2">
                {['Intel', 'Banner Health', 'Amazon', 'Honeywell', 'Chase', 'Louis Vuitton', 'Tiffanys', 'Ritz Carlton', 'Apple Store'].map(c => (
                  <span key={c} className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] font-mono text-xs text-gray-400">{c}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 rounded-2xl border border-white/10 bg-[#1a1a1a]/70 backdrop-blur-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-4">Services</p>
            <div className="flex flex-wrap gap-2">
              {['HVAC/R Installation', 'Service & Repair', 'Refrigeration', 'Energy Management Systems', 'New Construction Mechanical', 'Preconstruction', 'Preventive Maintenance'].map(s => (
                <span key={s} className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-[#d1d5db]">{s}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ---- 2. COLORS ---- */}
        <section id="colors" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader
            label="02 / Color System"
            title="COOL, NOT WARM"
            subtitle="Dark foundation with sky blue as the dominant brand color. Red is for action and emphasis only. Blue always leads."
          />

          {/* Primary */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Primary Palette (Sky Blue)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {primaryColors.map(c => <ColorSwatch key={c.hex} color={c} large />)}
            </div>
          </div>

          {/* Accent */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Accent Palette (Red)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {accentColors.map(c => <ColorSwatch key={c.hex} color={c} large />)}
            </div>
          </div>

          {/* Backgrounds */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Dark Palette (Backgrounds)</p>
            <div className="grid grid-cols-3 gap-6">
              {bgColors.map(c => <ColorSwatch key={c.hex} color={c} />)}
            </div>
          </div>

          {/* Text */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Text & Neutrals</p>
            <div className="grid grid-cols-3 gap-6">
              {textColors.map(c => <ColorSwatch key={c.hex} color={c} />)}
            </div>
          </div>

          {/* Color rules */}
          <div className="p-8 rounded-2xl border border-white/10 bg-[#1a1a1a]/70 backdrop-blur-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Color Rules</p>
            <ul className="space-y-3">
              {[
                'Background is always dark. The brand lives on dark surfaces. Never white backgrounds.',
                'Sky blue is the dominant brand color. It shows up more than red. Red is for action and emphasis only.',
                'Blue-to-red gradient (from-accent-500 to-secondary-500) is used sparingly for special moments: logo dot, hero rotating text, CTA transitions.',
                'Social media graphics: dark background (#0a0a0a or #111111) with sky blue text/accents. Red only for CTAs or urgency.',
                'Never use both blue and red at equal weight. One leads, the other supports. In most contexts, blue leads.',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0ea5e9] shrink-0" />
                  <span className="text-[#9ca3af] text-sm leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- 3. TYPOGRAPHY ---- */}
        <section id="typography" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader
            label="03 / Typography"
            title="ONE FONT, CLEAR HIERARCHY"
            subtitle="Inter handles everything. No secondary typeface. Clean, geometric, highly readable on screens."
          />

          <div className="space-y-4 mb-16">
            {typeRows.map(row => (
              <div key={row.role} className="p-6 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9]">{row.role}</p>
                  <p className="text-[#6b7280] text-xs mt-1">{row.font} / {row.weight}</p>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <span className="font-mono text-[10px] text-[#6b7280]">Size: {row.size}</span>
                  <span className="font-mono text-[10px] text-[#6b7280]">Tracking: {row.tracking}</span>
                  <span className="font-mono text-[10px] text-[#6b7280]">LH: {row.lh}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 rounded-2xl border border-white/10 bg-[#1a1a1a]/70 backdrop-blur-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Type Rules</p>
            <ul className="space-y-3">
              {[
                'Headlines: sentence case, never all-caps (except kickers)',
                'Kickers (category labels above headlines): always uppercase, widest tracking, text-gray-500',
                'Logo text: uppercase, tracking 0.12em. "Ambition" in white, "Mechanical" in secondary-400 (sky blue)',
                'Never use decorative fonts. Inter handles everything.',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0ea5e9] shrink-0" />
                  <span className="text-[#9ca3af] text-sm leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- 4. VISUAL / VIDEO ---- */}
        <section id="visual" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader
            label="04 / Visual & Video Style"
            title="HOW IT LOOKS AND MOVES"
            subtitle="24fps cinematic. DaVinci Resolve pipeline. Cool-neutral grade, medium-high contrast, controlled saturation."
          />

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-6">The DNA</p>
              <ul className="space-y-3 text-[#9ca3af] text-sm leading-relaxed">
                <li>24fps across all footage. Slightly cinematic, deliberate feel.</li>
                <li>DaVinci Resolve pipeline (Studio and non-Studio).</li>
                <li>H.264 at 10-13 Mbps. Clean, high-bitrate output.</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Logo Treatment</p>
              <ul className="space-y-3 text-[#9ca3af] text-sm leading-relaxed">
                <li>Small gradient dot (accent-500 to secondary-500) with glow effect.</li>
                <li>"AMBITION" in white, uppercase, semibold, tracking 0.12em.</li>
                <li>"MECHANICAL" in secondary-400 (sky blue), same treatment.</li>
                <li>Always uppercase. Minimum clear space: height of the "A" on all sides.</li>
              </ul>
            </div>
          </div>

          {/* Visual direction table */}
          <div className="mb-12">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Visual Direction</p>
            <div className="space-y-3">
              {[
                { element: 'Color Temperature', direction: 'Cool-neutral. The blue in the brand should subtly inform the grade. Avoid warm/orange tones.' },
                { element: 'Contrast', direction: 'Medium-high. Not blown out, not crushed. Clean shadows with detail.' },
                { element: 'Saturation', direction: 'Slightly pulled back from reality. Not desaturated, but controlled.' },
                { element: 'Lighting', direction: 'Prioritize well-lit spaces. Let practical lights and work lights add texture.' },
                { element: 'Composition', direction: 'Wide shots show scale. Medium shots show work. Close-ups show precision.' },
                { element: 'Movement', direction: 'Slow, intentional. No shaky handheld. Slider/gimbal or locked-off tripod.' },
              ].map(row => (
                <div key={row.element} className="p-4 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm flex flex-col md:flex-row gap-4">
                  <span className="font-mono text-xs text-[#0ea5e9] font-bold uppercase tracking-wide md:w-48 shrink-0">{row.element}</span>
                  <span className="text-[#9ca3af] text-sm leading-relaxed">{row.direction}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What makes Ambition footage feel like Ambition */}
          <div className="p-8 rounded-2xl border border-white/10 bg-[#1a1a1a]/70 backdrop-blur-sm mb-12">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">What Makes It Feel Like Ambition</p>
            <ul className="space-y-3">
              {[
                'Industrial environments with human scale. Big commercial spaces, but the crew is in the frame doing the work.',
                'Progress updates as a content pillar. Projects like Din Tai Fung, Primrose, Memorial Tower all have update-style edits.',
                'High-end client projects visible: Louis Vuitton, Tiffanys, Ritz Carlton, Apple Store. These signal credibility.',
                'Emergency response footage (Abraza) is the most compelling narrative content in the library.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#0ea5e9] shrink-0" />
                  <span className="text-[#9ca3af] text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Shot list priorities */}
          <div className="p-8 rounded-2xl border border-[#0ea5e9]/20 bg-[#0ea5e9]/5 backdrop-blur-sm shadow-xl">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-6">Shot List Priorities (Future Shoots)</p>
            <div className="space-y-4">
              {[
                { num: '01', text: 'Vertical (9:16) first. Social needs vertical.' },
                { num: '02', text: 'Crew faces and hands. People content builds trust.' },
                { num: '03', text: 'Equipment close-ups. HVAC equipment has visual appeal when shot with intention.' },
                { num: '04', text: 'Before/during/after sequences. Progress is the story.' },
              ].map(item => (
                <div key={item.num} className="flex items-start gap-4">
                  <span className="font-mono text-xs text-[#0ea5e9] font-bold">{item.num}</span>
                  <span className="text-[#9ca3af] text-sm leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- 5. VOICE & TONE ---- */}
        <section id="voice" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader
            label="05 / Voice & Tone"
            title="HOW AMBITION TALKS"
            subtitle="Like a crew lead who knows exactly what they're doing and doesn't need to prove it. Confident without being arrogant. Technical when it matters. Human always."
          />

          {/* Voice attributes */}
          <div className="mb-12">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Voice Attributes</p>
            <div className="space-y-3">
              {voiceAttributes.map(v => (
                <div key={v.attr} className="p-6 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm">
                  <p className="font-mono text-xs text-[#0ea5e9] font-bold uppercase tracking-wide mb-3">{v.attr}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                      <span className="text-[#d1d5db] text-sm">"{v.yes}"</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" />
                      <span className="text-[#6b7280] text-sm line-through">"{v.no}"</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tone shifts */}
          <div className="mb-12">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Tone Shifts by Context</p>
            <div className="space-y-3">
              {toneShifts.map(t => (
                <div key={t.context} className="p-4 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm flex flex-col md:flex-row gap-4">
                  <span className="font-mono text-xs text-[#0ea5e9] font-bold uppercase tracking-wide md:w-40 shrink-0">{t.context}</span>
                  <span className="text-[#6b7280] text-sm md:w-56 shrink-0">{t.tone}</span>
                  <span className="text-[#9ca3af] text-sm italic">"{t.example}"</span>
                </div>
              ))}
            </div>
          </div>

          {/* Words */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="p-8 rounded-2xl border border-white/10 bg-[#1a1a1a]/70 backdrop-blur-sm">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#22c55e] mb-6">On-Brand Phrases</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Precision', 'Integrity', 'Reliability', 'We handle it',
                  'All makes, all models', 'Licensed since day one',
                  'From preconstruction to preventive maintenance',
                ].map(w => (
                  <span key={w} className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] font-mono text-xs text-gray-400">{w}</span>
                ))}
              </div>
            </div>
            <div className="p-8 rounded-2xl border border-white/10 bg-[#1a1a1a]/70 backdrop-blur-sm">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#ef4444] mb-6">Words to Avoid</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Best in class', 'World-class', 'Cutting-edge', 'Solutions provider',
                  'Don\'t hesitate to...', 'We\'re passionate about HVAC', 'Em dashes',
                ].map(w => (
                  <span key={w} className="px-3 py-1.5 rounded-full border border-[#ef4444]/20 bg-[#111111]/80 font-mono text-xs text-[#6b7280] line-through">{w}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---- 6. SOCIAL MEDIA ---- */}
        <section id="social" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader
            label="06 / Social Media"
            title="PLATFORM PLAYBOOK"
            subtitle="Dark-themed posts. Sky blue accents. Red for CTAs only. Consistent cadence beats perfection."
          />

          {/* Accounts */}
          <div className="mb-12">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Active Accounts</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { platform: 'Instagram', handle: '@ambition_air_conditioning', note: '~1,542 followers, 55 posts' },
                { platform: 'TikTok', handle: '@ambitionmech', note: 'Technical repair demos, job site content' },
                { platform: 'LinkedIn', handle: 'Ambition Mechanical Services', note: 'Professional audience' },
                { platform: 'Facebook', handle: '@ambitionac', note: 'Lower priority' },
              ].map(a => (
                <div key={a.platform} className="p-4 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm flex items-center gap-4">
                  <span className="font-mono text-xs text-[#0ea5e9] font-bold uppercase tracking-wide w-24 shrink-0">{a.platform}</span>
                  <div>
                    <span className="text-[#d1d5db] text-sm font-semibold">{a.handle}</span>
                    <p className="text-[#6b7280] text-xs mt-0.5">{a.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform specifics */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-4">Instagram</p>
              <p className="font-mono text-[10px] text-[#6b7280] mb-4">3-4x/week</p>
              <ul className="space-y-2 text-[#9ca3af] text-xs leading-relaxed">
                <li>Dark-themed posts. #0a0a0a or #111111 background.</li>
                <li>Text overlays in Inter. Sky blue accents.</li>
                <li>Photo posts: slightly cool-graded, medium-high contrast.</li>
                <li>8-12 hashtags per post, placed in a comment.</li>
                <li>First line is the hook. 2-4 sentences max.</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-4">TikTok</p>
              <p className="font-mono text-[10px] text-[#6b7280] mb-4">3-5x/week</p>
              <ul className="space-y-2 text-[#9ca3af] text-xs leading-relaxed">
                <li>Raw, technical, real. Authenticity over polish.</li>
                <li>15-30 second sweet spot. Hook in first 1-2 seconds.</li>
                <li>Text overlays required (85% watch without sound).</li>
                <li>Diagnose/repair demos, scale reveals, emergency stories.</li>
                <li>Equipment sounds and on-site audio can work well.</li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#0ea5e9] mb-4">LinkedIn</p>
              <p className="font-mono text-[10px] text-[#6b7280] mb-4">2-3x/week</p>
              <ul className="space-y-2 text-[#9ca3af] text-xs leading-relaxed">
                <li>Most polished version of the voice. Still human.</li>
                <li>Vertical video feed gets 3-4x watch time vs landscape.</li>
                <li>Project completions, safety milestones, hiring posts.</li>
                <li>Tag clients when appropriate.</li>
                <li>Industry perspective posts (original thought).</li>
              </ul>
            </div>
          </div>

          {/* Hashtag strategy */}
          <div className="p-8 rounded-2xl border border-white/10 bg-[#1a1a1a]/70 backdrop-blur-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-6">Core Hashtags (Every Post)</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {['#AmbitionMechanical', '#CommercialHVAC', '#PhoenixAZ', '#MechanicalContractor'].map(h => (
                <span key={h} className="px-3 py-1.5 rounded-full border border-[#0ea5e9]/30 bg-[#0ea5e9]/10 font-mono text-xs text-[#0ea5e9]">{h}</span>
              ))}
            </div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#6b7280] mb-4">Rotating</p>
            <div className="flex flex-wrap gap-2">
              {['#HVACLife', '#HVACR', '#PipeFitter', '#BlueCollar', '#ConstructionLife', '#CommercialConstruction', '#HVACTech', '#RefrigerationRepair', '#BuiltToLast', '#PhoenixConstruction', '#ArizonaContractor'].map(h => (
                <span key={h} className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] font-mono text-xs text-gray-500">{h}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ---- 7. DO'S & DON'TS ---- */}
        <section id="dos-donts" className="py-16 md:py-24 border-t border-white/8">
          <SectionHeader
            label="07 / Content Guidelines"
            title="DO'S AND DON'TS"
            subtitle="Quick reference for anyone creating content for Ambition Mechanical."
          />

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#22c55e] mb-6">Do</p>
              <ul className="space-y-3">
                {[
                  'Show the scale. Wide shots that reveal the size and complexity.',
                  'Show the crew. People content builds trust.',
                  'Tell the project story. Challenge, solution, result.',
                  'Use the emergency response angle. "3AM call" stories land.',
                  'Shoot vertical for social from the start.',
                  'Keep video under 30 seconds for Reels/TikTok.',
                  'Add captions/text overlays to every video.',
                  'Reference high-profile client list for credibility.',
                  'Use progress update format as a content pillar.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                    <span className="text-[#9ca3af] text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-sm shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#ef4444] mb-6">Don't</p>
              <ul className="space-y-3">
                {[
                  'Don\'t use warm/orange color grading. The brand is cool-toned.',
                  'Don\'t post landscape-only video on Instagram or TikTok.',
                  'Don\'t mix stock photography with real footage.',
                  'Don\'t use generic contractor caption voice.',
                  'Don\'t over-design graphics. Dark background, one or two lines, sky blue accent.',
                  'Don\'t post without a hook frame.',
                  'Don\'t use the blue+orange construction cliche.',
                  'Don\'t post inconsistently. Consistency beats perfection.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-2.5 w-3 h-[1px] bg-[#ef4444] shrink-0" />
                    <span className="text-[#9ca3af] text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 border-t border-white/8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#dc2626] to-[#0ea5e9] shadow-[0_0_8px_rgba(14,165,233,0.4)]" />
            <span className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.3em]">
              Ambition Mechanical Brand Guidelines v1.0
            </span>
          </div>
          <p className="font-mono text-[10px] text-gray-600">
            Created by Steffen for AOM agents. Status: Draft.
          </p>
        </footer>

      </div>
    </div>
  )
}
