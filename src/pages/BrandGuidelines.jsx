import React, { useState } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Color data                                                         */
/* ------------------------------------------------------------------ */

const primaryColors = [
  { name: 'AOM Orange', hex: '#FF4F00', token: 'aom-orange', role: 'Primary Accent', usage: 'CTAs, active states, emphasis moments. Never more than 10-15% of any screen.' },
  { name: 'Sage', hex: '#7C9A72', token: 'aom-sage', role: 'AI Accent', usage: 'AI/systems section, status indicators, secondary highlights. The "growth" signal.' },
]

const bgColors = [
  { name: 'Night', hex: '#0A0A08', token: 'aom-night', role: 'Primary BG', usage: 'Main page background. Slightly warm black.' },
  { name: 'Charcoal', hex: '#141412', token: 'aom-charcoal', role: 'Card BG', usage: 'Cards, modals, elevated surfaces.' },
  { name: 'Deep Warm', hex: '#1A1A17', token: 'aom-surface', role: 'Surface BG', usage: 'Section alternation, input fields, sidebar backgrounds.' },
  { name: 'Cream', hex: '#FAF5EF', token: 'aom-cream', role: 'Light Surface', usage: 'Light-mode sections (if needed), PDF exports, print.' },
]

const textColors = [
  { name: 'Warm White', hex: '#F5F0EB', token: 'aom-warm-white', role: 'Primary Text', usage: 'Headlines, primary body text on dark backgrounds.' },
  { name: 'Stone', hex: '#A8A29E', token: 'aom-stone', role: 'Secondary Text', usage: 'Subheadings, supporting copy. Replaces zinc-400/zinc-500.' },
  { name: 'Muted Stone', hex: '#78716C', token: 'aom-stone-muted', role: 'Tertiary Text', usage: 'Captions, timestamps, micro-labels, metadata.' },
  { name: 'Dim', hex: '#57534E', token: 'aom-dim', role: 'Disabled', usage: 'Placeholder text, disabled states.' },
]

const accentColors = [
  { name: 'Bright Orange', hex: '#FF6B2B', token: 'aom-orange-hover', role: 'Orange Hover' },
  { name: 'Burnt', hex: '#CC3F00', token: 'aom-orange-muted', role: 'Orange Muted' },
  { name: 'Soft Sage', hex: '#9BB593', token: 'aom-sage-light', role: 'Sage Light' },
  { name: 'Deep Sage', hex: '#5C7A54', token: 'aom-sage-muted', role: 'Sage Muted' },
  { name: 'Warm Edge', hex: '#292524', token: 'aom-border', role: 'Border Default' },
  { name: 'Warm Edge Hover', hex: '#44403C', token: 'aom-border-hover', role: 'Border Hover' },
  { name: 'Green', hex: '#22C55E', token: 'green-500', role: 'Success' },
  { name: 'Red', hex: '#EF4444', token: 'red-500', role: 'Error' },
]

/* ------------------------------------------------------------------ */
/*  Typography data                                                    */
/* ------------------------------------------------------------------ */

const typeRows = [
  { role: 'Headlines', font: 'Inter Tight', weight: '900 (Black)', style: 'Italic', size: '36-72px', lh: '0.85-0.9', sample: 'BRAND INFRASTRUCTURE', className: 'font-headline text-4xl md:text-6xl font-black italic uppercase tracking-tighter' },
  { role: 'Subheadlines', font: 'Inter Tight', weight: '700 (Bold)', style: 'Normal', size: '18-24px', lh: '1.2', sample: 'The system behind the brand', className: 'font-headline text-xl md:text-2xl font-bold tracking-tight' },
  { role: 'Body', font: 'Inter', weight: '400 (Regular)', style: 'Normal', size: '16px', lh: '1.6', sample: 'AOM builds the content, websites, and systems that make companies impossible to ignore.', className: 'font-body text-base' },
  { role: 'Body Emphasis', font: 'Inter', weight: '600 (SemiBold)', style: 'Normal', size: '16px', lh: '1.6', sample: 'Results that speak for themselves.', className: 'font-body text-base font-semibold' },
  { role: 'Micro Labels', font: 'JetBrains Mono', weight: '700 (Bold)', style: 'Normal', size: '9-11px', lh: '1.2', sample: 'OUR SERVICES', className: 'font-mono text-[10px] font-bold uppercase tracking-[0.3em]' },
  { role: 'AI/System Text', font: 'JetBrains Mono', weight: '400 (Regular)', style: 'Normal', size: '13-14px', lh: '1.5', sample: 'pipeline.status: active', className: 'font-mono text-sm' },
  { role: 'Stat Numbers', font: 'Inter Tight', weight: '900 (Black)', style: 'Italic', size: '48-72px', lh: '0.85', sample: '30+', className: 'font-headline text-5xl md:text-7xl font-black italic' },
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
    <button onClick={handleCopy} className="ml-2 inline-flex items-center text-[#78716C] hover:text-[#F5F0EB] transition-colors" title="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

function ColorSwatch({ color, large }) {
  const isLight = ['#FAF5EF', '#F5F0EB', '#A8A29E', '#9BB593', '#FF6B2B', '#FF4F00', '#22C55E', '#EF4444'].includes(color.hex)
  return (
    <div className="group">
      <div
        className={`${large ? 'h-24 md:h-32' : 'h-16 md:h-20'} rounded-sm border border-[#292524] relative overflow-hidden transition-all duration-300 group-hover:border-[#44403C]`}
        style={{ backgroundColor: color.hex }}
      >
        <span className={`absolute bottom-2 left-3 font-mono text-[10px] font-bold ${isLight ? 'text-[#0A0A08]' : 'text-[#F5F0EB]'} opacity-80`}>
          {color.hex}
        </span>
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <span className="text-[#F5F0EB] text-sm font-semibold">{color.name}</span>
          <CopyButton text={color.hex} />
        </div>
        <span className="font-mono text-[10px] text-[#78716C] uppercase tracking-[0.2em]">{color.role}</span>
        {color.usage && <p className="text-[#A8A29E] text-xs mt-1 leading-relaxed">{color.usage}</p>}
      </div>
    </div>
  )
}

function CodeBlock({ children, label }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="relative rounded-sm border border-[#292524] bg-[#0A0A08] overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#292524] bg-[#141412]">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C]">{label}</span>
          <button onClick={handleCopy} className="text-[#78716C] hover:text-[#F5F0EB] transition-colors text-xs font-mono flex items-center gap-1">
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
      )}
      <pre className="p-4 md:p-6 overflow-x-auto text-sm leading-relaxed font-mono text-[#A8A29E]">
        <code>{children}</code>
      </pre>
    </div>
  )
}

function SectionHeader({ label, title, subtitle }) {
  return (
    <div className="mb-12">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-4">{label}</p>
      <div className="w-12 h-[2px] bg-[#FF4F00] mb-4" />
      <h2 className="font-headline text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-[#F5F0EB]">{title}</h2>
      {subtitle && <p className="text-[#A8A29E] text-base mt-4 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
  )
}

function NavDot({ label, id, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 group transition-all duration-300 ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
    >
      <span className={`block w-1.5 h-1.5 rounded-full transition-colors ${active ? 'bg-[#FF4F00]' : 'bg-[#57534E] group-hover:bg-[#78716C]'}`} />
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#A8A29E] hidden lg:block">{label}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function BrandGuidelines() {
  const [activeSection, setActiveSection] = useState('positioning')

  const sections = [
    { id: 'positioning', label: 'Positioning' },
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'visual', label: 'Visual Language' },
    { id: 'components', label: 'Components' },
    { id: 'voice', label: 'Voice' },
  ]

  const scrollTo = (id) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-[#0A0A08] text-[#F5F0EB] relative">
      {/* Noise overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] mix-blend-overlay">
        <svg width="100%" height="100%">
          <filter id="brand-noise"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#brand-noise)" />
        </svg>
      </div>

      {/* Subtle orange gradient wash */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-gradient-to-b from-transparent via-orange-500/5 to-transparent" />

      {/* Side nav */}
      <nav className="fixed left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4 hidden md:flex">
        {sections.map(s => (
          <NavDot key={s.id} {...s} active={activeSection === s.id} onClick={scrollTo} />
        ))}
      </nav>

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#0A0A08]/90 backdrop-blur-md border-b border-[#292524]">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 text-[#A8A29E] hover:text-[#F5F0EB] transition-colors">
            <ArrowLeft size={16} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]">Back to Site</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="font-headline text-sm font-bold uppercase tracking-tight text-[#F5F0EB]">AOM</span>
            <span className="text-[#292524]">/</span>
            <span className="font-mono text-[10px] text-[#78716C] uppercase tracking-[0.2em]">Brand Guidelines</span>
          </div>
          <span className="font-mono text-[10px] text-[#57534E]">v1.0</span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 md:py-40 px-6 md:px-12 max-w-6xl mx-auto">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF4F00] mb-6">Brand System</p>
        <h1 className="font-headline text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-[#F5F0EB] leading-[0.85]">
          AOM BRAND<br />GUIDELINES
        </h1>
        <p className="text-[#A8A29E] text-lg mt-8 max-w-xl leading-relaxed">
          The source of truth for AOM's visual identity. Colors, type, voice, and component patterns. Everything the team needs to ship on-brand work.
        </p>
        <div className="flex items-center gap-4 mt-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-[#292524] bg-[#141412] font-mono text-[10px] text-[#78716C] uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C9A72]" />
            Active
          </span>
          <span className="font-mono text-[10px] text-[#57534E]">Last updated: March 2026</span>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 md:px-12">

        {/* ---- 1. POSITIONING ---- */}
        <section id="positioning" className="py-16 md:py-24 border-t border-[#292524]">
          <SectionHeader label="01 / Positioning" title="WHO WE ARE" subtitle="AOM builds the content, websites, and systems that make companies impossible to ignore." />

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Tagline candidates */}
            <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Tagline Candidates</p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#FF4F00] shrink-0" />
                  <div>
                    <p className="text-[#F5F0EB] font-semibold">"Brand infrastructure for companies that build."</p>
                    <p className="text-[#78716C] text-xs mt-1">Lead candidate. Construction-forward, works for all verticals.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#7C9A72] shrink-0" />
                  <div>
                    <p className="text-[#F5F0EB] font-semibold">"The system behind the brand."</p>
                    <p className="text-[#78716C] text-xs mt-1">AI/systems angle. Works as secondary tagline.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#57534E] shrink-0" />
                  <div>
                    <p className="text-[#A8A29E] font-semibold">"We make what moves you forward."</p>
                    <p className="text-[#78716C] text-xs mt-1">Broader, warmer, good for general use.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Who AOM is NOT */}
            <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Who AOM Is Not</p>
              <ul className="space-y-3">
                {[
                  'Not a template shop',
                  'Not a freelancer collective',
                  'Not a "we do everything" agency',
                  'Not selling AI hype or chatbot demos',
                  'Not chasing trends. Building infrastructure.',
                  'Not corporate. Not scrappy either. Somewhere more intentional than both.',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-3 h-[1px] bg-[#EF4444] shrink-0" />
                    <span className="text-[#A8A29E] text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Full positioning paragraph */}
          <div className="p-8 rounded-sm border border-[#292524] bg-[#1A1A17]">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-4">One Paragraph</p>
            <p className="text-[#A8A29E] leading-relaxed max-w-3xl">
              AOM is a creative production and systems company based in Phoenix. We build the things that actually grow businesses: video that recruits and closes deals, websites that convert, social content that runs like a machine, and AI-powered workflows that make it all repeatable. We're not a video production company. We're the team that builds the engine behind your brand.
            </p>
          </div>
        </section>

        {/* ---- 2. COLORS ---- */}
        <section id="colors" className="py-16 md:py-24 border-t border-[#292524]">
          <SectionHeader
            label="02 / Color System"
            title="WARM, NOT COLD"
            subtitle="Dark foundation with warm neutrals. Orange stays, but with restraint. Sage green gives AOM a visual layer no competitor has."
          />

          {/* Primary accents */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Primary Accents</p>
            <div className="grid grid-cols-2 gap-6">
              {primaryColors.map(c => <ColorSwatch key={c.hex} color={c} large />)}
            </div>
          </div>

          {/* Backgrounds */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Backgrounds</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {bgColors.map(c => <ColorSwatch key={c.hex} color={c} />)}
            </div>
          </div>

          {/* Text colors */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Text Colors</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {textColors.map(c => <ColorSwatch key={c.hex} color={c} />)}
            </div>
          </div>

          {/* Accent / utility */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Accent & Utility</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {accentColors.map(c => <ColorSwatch key={c.hex} color={c} />)}
            </div>
          </div>

          {/* Tailwind config */}
          <CodeBlock label="tailwind.config.js">{`module.exports = {
  theme: {
    extend: {
      colors: {
        aom: {
          orange: '#FF4F00',
          'orange-hover': '#FF6B2B',
          'orange-muted': '#CC3F00',
          sage: '#7C9A72',
          'sage-light': '#9BB593',
          'sage-muted': '#5C7A54',
          night: '#0A0A08',
          charcoal: '#141412',
          surface: '#1A1A17',
          cream: '#FAF5EF',
          'warm-white': '#F5F0EB',
          stone: '#A8A29E',
          'stone-muted': '#78716C',
          dim: '#57534E',
          border: '#292524',
          'border-hover': '#44403C',
        }
      }
    }
  }
}`}</CodeBlock>
        </section>

        {/* ---- 3. TYPOGRAPHY ---- */}
        <section id="typography" className="py-16 md:py-24 border-t border-[#292524]">
          <SectionHeader
            label="03 / Typography"
            title="THREE FONTS, CLEAR ROLES"
            subtitle="Inter Tight for headlines. Inter for body. JetBrains Mono for the system layer."
          />

          {/* Live type samples */}
          <div className="space-y-8 mb-16">
            {typeRows.map(row => (
              <div key={row.role} className="p-6 md:p-8 rounded-sm border border-[#292524] bg-[#141412]">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF4F00]">{row.role}</p>
                    <p className="text-[#78716C] text-xs mt-1">{row.font} / {row.weight} / {row.style}</p>
                  </div>
                  <div className="flex gap-4">
                    <span className="font-mono text-[10px] text-[#57534E]">Size: {row.size}</span>
                    <span className="font-mono text-[10px] text-[#57534E]">LH: {row.lh}</span>
                  </div>
                </div>
                <div className={`${row.className} text-[#F5F0EB]`}>
                  {row.sample}
                </div>
              </div>
            ))}
          </div>

          {/* Typography rules */}
          <div className="p-8 rounded-sm border border-[#292524] bg-[#1A1A17] mb-12">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Rules</p>
            <ul className="space-y-3">
              {[
                'Headlines are ALWAYS uppercase, italic, black weight, tight tracking',
                'Subheadlines are sentence case, bold weight, normal style',
                'Body text minimum #A8A29E on dark backgrounds. Never darker than #78716C for readable body copy.',
                'Micro-labels: uppercase, tracking-[0.3em], mono font, #78716C or #57534E',
                'Line lengths: max 65ch for body text, max 45ch for headlines',
                'No font sizes below 9px anywhere on the site',
              ].map((rule, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#FF4F00] shrink-0" />
                  <span className="text-[#A8A29E] text-sm leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Font imports */}
          <CodeBlock label="Font Imports (CSS or HTML)">{`@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');`}</CodeBlock>

          <div className="mt-8">
            <CodeBlock label="tailwind.config.js">{`module.exports = {
  theme: {
    extend: {
      fontFamily: {
        headline: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    }
  }
}`}</CodeBlock>
          </div>
        </section>

        {/* ---- 4. VISUAL LANGUAGE ---- */}
        <section id="visual" className="py-16 md:py-24 border-t border-[#292524]">
          <SectionHeader
            label="04 / Visual Language"
            title="LOOK AND FEEL"
            subtitle="Photography, icons, borders, spacing, animation, and dark mode specifics."
          />

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Photography */}
            <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF4F00] mb-6">Photography</p>
              <ul className="space-y-3 text-[#A8A29E] text-sm leading-relaxed">
                <li>Real shots only. No stock photography. Ever.</li>
                <li>Slightly desaturated, warm midtones, deep shadows. Filmic, not Instagram.</li>
                <li>Shadows lean warm (not blue/teal).</li>
                <li>Lift blacks slightly, warm highlights, subtle grain encouraged.</li>
              </ul>
            </div>

            {/* Icons */}
            <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#7C9A72] mb-6">Icons</p>
              <ul className="space-y-3 text-[#A8A29E] text-sm leading-relaxed">
                <li>Lucide icons. 18-20px in UI.</li>
                <li>Stroke weight: default (2px). Never filled.</li>
                <li>Color: <span className="font-mono text-[#78716C]">#A8A29E</span> default, <span className="font-mono text-[#FF4F00]">#FF4F00</span> active.</li>
                <li>Containers: 40-48px square, <span className="font-mono text-xs text-[#78716C]">border border-aom-border bg-black/40</span></li>
              </ul>
            </div>

            {/* Borders */}
            <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Borders & Corners</p>
              <ul className="space-y-3 text-[#A8A29E] text-sm leading-relaxed">
                <li>Borders: 1px solid <span className="font-mono text-[#78716C]">#292524</span> (warm, not cool zinc)</li>
                <li>No rounded corners on primary containers. <span className="font-mono text-xs text-[#78716C]">rounded-sm</span> (2px) maximum.</li>
                <li>Hover: transition to <span className="font-mono text-[#78716C]">#44403C</span> or <span className="font-mono text-[#FF4F00]">orange/30</span></li>
                <li>Cards get <span className="font-mono text-xs text-[#78716C]">shadow-xl</span> or <span className="font-mono text-xs text-[#78716C]">shadow-2xl</span></li>
              </ul>
            </div>

            {/* Spacing */}
            <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Spacing</p>
              <ul className="space-y-3 text-[#A8A29E] text-sm leading-relaxed">
                <li>Vertical between sections: <span className="font-mono text-xs text-[#78716C]">py-24</span> desktop, <span className="font-mono text-xs text-[#78716C]">py-16</span> mobile</li>
                <li>Card padding: <span className="font-mono text-xs text-[#78716C]">p-8</span> desktop, <span className="font-mono text-xs text-[#78716C]">p-6</span> mobile</li>
                <li>Component gaps: <span className="font-mono text-xs text-[#78716C]">gap-6</span> cards, <span className="font-mono text-xs text-[#78716C]">gap-4</span> tighter</li>
                <li>Dark space is a premium signal. Let things breathe.</li>
              </ul>
            </div>

            {/* Animation */}
            <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Animation</p>
              <ul className="space-y-3 text-[#A8A29E] text-sm leading-relaxed">
                <li>Hovers: <span className="font-mono text-xs text-[#78716C]">duration-300</span></li>
                <li>Scroll reveals: <span className="font-mono text-xs text-[#78716C]">duration-700</span>, fade up from y:30</li>
                <li>Hero entrance: <span className="font-mono text-xs text-[#78716C]">duration-1000+</span></li>
                <li>Easing: ease-out. Never linear except infinite loops.</li>
                <li>Rule: If it doesn't serve comprehension or delight, it doesn't animate.</li>
              </ul>
            </div>

            {/* Dark Mode */}
            <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Dark Mode</p>
              <ul className="space-y-3 text-[#A8A29E] text-sm leading-relaxed">
                <li>The site IS dark mode. No light mode toggle.</li>
                <li>Cream and Light Surface exist only for exports (PDFs, proposals, print).</li>
                <li>Noise/grain overlay: <span className="font-mono text-xs text-[#78716C]">opacity-[0.03]</span>, fractalNoise, mix-blend-overlay</li>
                <li>Subtle orange gradient wash: <span className="font-mono text-xs text-[#78716C]">opacity-[0.02]</span></li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---- 5. COMPONENTS ---- */}
        <section id="components" className="py-16 md:py-24 border-t border-[#292524]">
          <SectionHeader
            label="05 / Component Patterns"
            title="BUILD WITH THESE"
            subtitle="Section headers, cards, CTAs, and service grid patterns. Guidelines, not rigid templates."
          />

          {/* Section Header pattern */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Section Header Pattern</p>
            <div className="p-8 md:p-12 rounded-sm border border-[#292524] bg-[#1A1A17] mb-4">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-4">Our Work</p>
              <div className="w-12 h-[2px] bg-[#FF4F00] mb-4" />
              <h2 className="font-headline text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-[#F5F0EB]">PORTFOLIO</h2>
              <p className="text-[#A8A29E] text-base mt-4 max-w-2xl">The work speaks. Real clients, real results.</p>
            </div>
            <CodeBlock label="Section Header Classes">{`<p class="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-4">Our Work</p>
<div class="w-12 h-[2px] bg-aom-orange mb-4"></div>
<h2 class="font-headline text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-aom-warm-white">Portfolio</h2>
<p class="text-aom-stone text-base mt-4 max-w-2xl">The work speaks. Real clients, real results.</p>`}</CodeBlock>
          </div>

          {/* Card patterns */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Card Patterns</p>
            <div className="grid md:grid-cols-3 gap-6 mb-4">
              {/* Standard */}
              <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl hover:border-[#FF4F00]/30 transition-colors duration-300">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-3">Standard Card</p>
                <p className="font-headline text-lg font-bold text-[#F5F0EB] mb-2">Default State</p>
                <p className="text-[#A8A29E] text-sm">bg-aom-charcoal, border-aom-border. Hover shifts border to orange/30.</p>
              </div>
              {/* Accent */}
              <div className="p-8 rounded-sm border border-[#FF4F00]/40 bg-orange-950/10 shadow-xl">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF4F00] mb-3">Accent Card</p>
                <p className="font-headline text-lg font-bold text-[#F5F0EB] mb-2">Featured State</p>
                <p className="text-[#A8A29E] text-sm">border-aom-orange/40, bg-orange-950/10. For selected or featured items.</p>
              </div>
              {/* AI/Systems */}
              <div className="p-8 rounded-sm border border-[#5C7A54]/30 bg-emerald-950/10 shadow-xl">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#7C9A72] mb-3">AI/Systems Card</p>
                <p className="font-headline text-lg font-bold text-[#F5F0EB] mb-2">System State</p>
                <p className="text-[#A8A29E] text-sm font-mono">border-aom-sage-muted/30, bg-emerald-950/10. Mono font for system labels.</p>
              </div>
            </div>
          </div>

          {/* CTA patterns */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">CTA Patterns</p>
            <div className="p-8 md:p-12 rounded-sm border border-[#292524] bg-[#1A1A17] flex flex-wrap items-center gap-6 mb-4">
              <button className="bg-[#FF4F00] text-white font-headline font-black uppercase tracking-tight px-8 py-4 hover:bg-[#FF6B2B] transition-colors shadow-lg shadow-[#FF4F00]/20">
                Primary CTA
              </button>
              <button className="border border-[#F5F0EB] text-[#F5F0EB] font-headline font-bold uppercase tracking-tight px-8 py-4 hover:bg-[#F5F0EB] hover:text-[#0A0A08] transition-all">
                Secondary CTA
              </button>
              <button className="text-[#FF4F00] font-bold hover:text-[#FF6B2B] transition-colors flex items-center gap-1">
                Ghost CTA &rarr;
              </button>
            </div>
            <CodeBlock label="CTA Classes">{`<!-- Primary -->
<button class="bg-aom-orange text-white font-headline font-black uppercase tracking-tight px-8 py-4 hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/20">
  See What We'd Build For You
</button>

<!-- Secondary -->
<button class="border border-aom-warm-white text-aom-warm-white font-headline font-bold uppercase tracking-tight px-8 py-4 hover:bg-aom-warm-white hover:text-aom-night transition-all">
  Start a Brief
</button>

<!-- Ghost -->
<a class="text-aom-orange font-bold hover:text-aom-orange-hover">
  Learn more <ArrowRight size={14} />
</a>`}</CodeBlock>
          </div>

          {/* Services Grid */}
          <div className="mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Services Grid (3 Lanes)</p>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Content Engine */}
              <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl hover:border-[#FF4F00]/30 transition-colors duration-300">
                <div className="w-12 h-12 border border-[#292524] bg-black/40 flex items-center justify-center mb-4">
                  <svg className="text-[#FF4F00]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2.1l4 4-4 4"/><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"/><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"/></svg>
                </div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-2">Retainer</p>
                <p className="font-headline text-lg font-bold text-[#F5F0EB] mb-2">Content Engine</p>
                <p className="text-[#A8A29E] text-sm leading-relaxed">Monthly content system. One filming day in, 30 days of content out.</p>
                <button className="text-[#FF4F00] text-sm font-bold mt-4 hover:text-[#FF6B2B] transition-colors">Learn more &rarr;</button>
              </div>
              {/* Production */}
              <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl hover:border-[#FF4F00]/30 transition-colors duration-300">
                <div className="w-12 h-12 border border-[#292524] bg-black/40 flex items-center justify-center mb-4">
                  <svg className="text-[#FF4F00]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 8V4a2 2 0 0 1 2-2h2"/><path d="M4 16v4a2 2 0 0 0 2 2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M16 20h2a2 2 0 0 0 2-2v-4"/><circle cx="12" cy="11" r="3"/><path d="m12 14 0 4"/></svg>
                </div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-2">Project</p>
                <p className="font-headline text-lg font-bold text-[#F5F0EB] mb-2">Production</p>
                <p className="text-[#A8A29E] text-sm leading-relaxed">Brand videos, documentaries, event coverage. Cinema-grade execution.</p>
                <button className="text-[#FF4F00] text-sm font-bold mt-4 hover:text-[#FF6B2B] transition-colors">Learn more &rarr;</button>
              </div>
              {/* Digital Infrastructure */}
              <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl hover:border-[#5C7A54]/30 transition-colors duration-300">
                <div className="w-12 h-12 border border-[#292524] bg-black/40 flex items-center justify-center mb-4">
                  <svg className="text-[#7C9A72]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>
                </div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-2">System</p>
                <p className="font-headline text-lg font-bold text-[#F5F0EB] mb-2">Digital Infrastructure</p>
                <p className="text-[#A8A29E] text-sm leading-relaxed font-mono">Websites, AI workflows, and systems that make everything repeatable.</p>
                <button className="text-[#7C9A72] text-sm font-bold mt-4 hover:text-[#9BB593] transition-colors">Learn more &rarr;</button>
              </div>
            </div>
          </div>
        </section>

        {/* ---- 6. VOICE ---- */}
        <section id="voice" className="py-16 md:py-24 border-t border-[#292524]">
          <SectionHeader
            label="06 / Voice"
            title="HOW WE TALK"
            subtitle="Direct. Warm. Anti-BS. We speak results, not production jargon."
          />

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Construction voice */}
            <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#FF4F00] mb-6">To Construction Companies</p>
              <ul className="space-y-3 text-[#A8A29E] text-sm leading-relaxed">
                <li>Speak results, not production jargon.</li>
                <li>"Your best crews aren't on Indeed. They're on Instagram watching your competitor's content."</li>
                <li>Reference what they care about: recruiting, winning bids, looking legitimate to GCs.</li>
                <li>Be direct. Construction people respect directness.</li>
                <li>Show the gap: their current presence vs what's possible.</li>
              </ul>
            </div>

            {/* AI voice */}
            <div className="p-8 rounded-sm border border-[#5C7A54]/30 bg-emerald-950/10 shadow-xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#7C9A72] mb-6">About AI/Systems</p>
              <ul className="space-y-3 text-[#A8A29E] text-sm leading-relaxed">
                <li>Show the system, not the technology.</li>
                <li>Lead with the outcome: "We built a system that turns one filming day into 30 days of content."</li>
                <li>Never lead with "AI-powered" or "leveraging artificial intelligence."</li>
                <li>Acceptable: "We built internal systems that..." / "The engine behind..."</li>
                <li>"We built this for ourselves first. Now we're opening it up."</li>
              </ul>
            </div>
          </div>

          {/* Words */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="p-8 rounded-sm border border-[#292524] bg-[#1A1A17]">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#22C55E] mb-6">Words We Use</p>
              <div className="flex flex-wrap gap-2">
                {['Build', 'Ship', 'System', 'Engine', 'Pipeline', 'Infrastructure', 'Real', 'Intentional', 'Repeatable', 'Consistent', 'Impact', 'Results', 'Proof', 'Output', 'Crew', 'Team'].map(w => (
                  <span key={w} className="px-3 py-1.5 rounded-sm border border-[#292524] bg-[#141412] font-mono text-xs text-[#A8A29E]">{w}</span>
                ))}
              </div>
            </div>
            <div className="p-8 rounded-sm border border-[#292524] bg-[#1A1A17]">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#EF4444] mb-6">Words We Don't Use</p>
              <div className="flex flex-wrap gap-2">
                {['Leverage', 'Utilize', 'Synergy', 'Optimize', 'Cutting-edge', 'Revolutionary', 'Disruptive', 'Content creator', 'AI-powered', 'Machine learning', 'Neural network', 'Book a call'].map(w => (
                  <span key={w} className="px-3 py-1.5 rounded-sm border border-[#EF4444]/20 bg-[#141412] font-mono text-xs text-[#78716C] line-through">{w}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Headline formula */}
          <div className="p-8 rounded-sm border border-[#292524] bg-[#141412] shadow-xl">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">Headline Formula</p>
            <p className="text-[#A8A29E] text-sm mb-6">[Bold claim or result] + [who it's for or what it replaces]</p>
            <div className="space-y-4">
              {[
                'Brand infrastructure for companies that build.',
                "Your competitor's Instagram is their best recruiter. Is yours?",
                'One filming day. 30 days of content. Zero guesswork.',
                "We don't make videos. We build systems that use video.",
              ].map((hl, i) => (
                <p key={i} className="font-headline text-xl md:text-2xl font-black italic uppercase tracking-tighter text-[#F5F0EB]">
                  "{hl}"
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 border-t border-[#292524] text-center">
          <p className="font-mono text-[10px] text-[#57534E] uppercase tracking-[0.3em]">
            AOM Brand Guidelines v1.0 / Source of truth for all AOM-facing work
          </p>
          <p className="font-mono text-[10px] text-[#57534E]/60 mt-2">
            Bobby, Cleo, Tony, and the team reference this before shipping.
          </p>
        </footer>

      </div>
    </div>
  )
}
