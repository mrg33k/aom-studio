import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Calculator, Layout, Type, Palette, Sliders, BarChart3,
  Smartphone, Zap, Clock, DollarSign, TrendingUp, Calendar, Check,
  Users, Info, ShieldCheck, Eye
} from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'ROI Calculator Design Spec | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', '13-section implementation-ready design spec for the AOM ROI Calculator. Every hex value, every class, every animation timing defined.');
    setMeta('og:title', 'ROI Calculator: Implementation-Ready Design Spec', true);
    setMeta('og:description', 'Six inputs. Thirty seconds. A clear picture of what AI saves your business. Full design spec by Steffen.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/roi-calculator', true);
  }, []);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
});

function SectionKicker({ children }) {
  return <p className="text-xs font-body font-medium uppercase tracking-[0.2em] text-aom-text-muted mb-4">{children}</p>;
}

function OrangeBar() {
  return <div className="w-12 h-[2px] bg-aom-orange mb-4" />;
}

const zones = [
  { name: 'Zone 1: Input Section', bg: 'bg-aom-night (#0C0C0C)', maxW: 'max-w-4xl (896px)', padding: 'pt-32 pb-24 desktop, pt-24 pb-16 mobile', desc: 'Full viewport width, vertically centered on load' },
  { name: 'Zone 2: Results Section', bg: 'bg-aom-charcoal (#141412)', maxW: 'max-w-6xl cards, max-w-4xl tables', padding: 'py-24 desktop, py-16 mobile', desc: 'Hidden until calculate. Reveals with animation.' },
  { name: 'Zone 3: CTA Section', bg: 'bg-aom-night (#0C0C0C)', maxW: 'max-w-3xl (768px)', padding: 'py-24 desktop, py-16 mobile', desc: 'Primary + secondary CTA. Email capture.' },
];

const inputFields = [
  { num: '1', name: 'Industry', type: 'Dropdown', details: 'Custom select with ChevronDown icon. Options panel: bg #141412, selected option orange tint.' },
  { num: '2', name: 'Team Size', type: 'Slider', details: 'Slider with number display. Thumb: 20px circle, #E85D26, orange glow shadow. Value: Syne 800 Italic 24px.' },
  { num: '3', name: 'Admin Hours/Week', type: 'Slider', details: 'Same slider pattern. Number + "hrs" suffix in stone color. Range labels in mono 10px.' },
  { num: '4', name: 'Average Hourly Rate', type: '$ Input', details: 'Dollar prefix absolute-left. Number input with comma formatting on blur.' },
  { num: '5', name: 'Monthly Software Cost', type: '$ Input', details: 'Same pattern. Placeholder in #57534E.' },
  { num: '6', name: 'Monthly Revenue', type: '$ Input', details: 'Same pattern. Used for revenue uplift calculation.' },
];

const resultCards = [
  { name: 'Hours Recovered/Week', icon: 'Clock', accent: '#7C9A72', suffix: 'hrs', label: 'Hours your team gets back every week', sub: '[X] hours per year' },
  { name: 'Monthly Value Saved', icon: 'DollarSign', accent: '#E85D26', suffix: '$', label: 'Monthly value of recovered time', sub: 'Based on your $XX/hour effective rate' },
  { name: 'Total Monthly Impact', icon: 'TrendingUp', accent: '#E85D26', suffix: '$', label: 'Total monthly impact', sub: 'Time savings + estimated revenue uplift + software savings' },
  { name: 'Break-Even Timeline', icon: 'Calendar', accent: 'Dynamic', suffix: 'months', label: 'Months to break even', sub: 'Including full setup cost of $9,000' },
];

const breakEvenColors = [
  { range: '< 4 months', color: '#7C9A72', label: 'Sage (great)' },
  { range: '4-8 months', color: '#E85D26', label: 'Orange (good)' },
  { range: '8-12 months', color: '#CC3F00', label: 'Burnt orange (cautious)' },
  { range: '> 12 months', color: '#78716C', label: 'Muted stone (honest flag)' },
];

const animationSteps = [
  { step: '1', label: 'Button state change', timing: '400ms', detail: 'Text changes to "CALCULATING..." with subtle opacity pulse between 1 and 0.7' },
  { step: '2', label: 'Smooth scroll to results', timing: '600ms', detail: 'Smooth ease-out scroll to top of Zone 2 with 80px offset' },
  { step: '3', label: 'Results zone fades in', timing: '700ms', detail: 'Opacity 0 to 1, translateY 40px to 0px. 200ms delay after scroll begins.' },
  { step: '4', label: 'Cards stagger in', timing: '500ms/card', detail: '120ms stagger between cards. Opacity 0 to 1, translateY 30px to 0px.' },
  { step: '5', label: 'Numbers count up', timing: '1200ms', detail: 'Each number animates from 0 to final value. Commas update in real-time. Dollar signs static.' },
  { step: '6', label: 'Breakdown sections', timing: '700ms', detail: 'Standard scroll reveal. Trigger at viewport intersection threshold 0.1.' },
  { step: '7', label: 'CTA section', timing: '700ms', detail: 'Same scroll reveal. Primary button gets subtle orange glow pulse (2000ms infinite).' },
];

const colorMapping = [
  { meaning: 'Time savings', color: '#7C9A72', label: 'Sage', usage: 'Hours card accent, check icons, positive time metrics' },
  { meaning: 'Dollar savings', color: '#E85D26', label: 'Orange', usage: 'Money cards accent, total impact, ROI percentage' },
  { meaning: 'Revenue uplift', color: '#9BB593', label: 'Sage Light', usage: 'Revenue row highlight, uplift indicator' },
  { meaning: 'Cost / investment', color: '#A8A29E', label: 'Stone', usage: 'System cost rows, neutral data' },
  { meaning: 'Warning / caution', color: '#CC3F00', label: 'Burnt Orange', usage: 'Break-even > 8 months accent' },
  { meaning: 'Success / great', color: '#7C9A72', label: 'Sage', usage: 'Break-even < 4 months' },
];

const typographyRef = [
  { element: 'Page headline', font: 'Syne 800 Italic', desktop: '60px', mobile: '30px', color: '#F0ECE6' },
  { element: 'Section headings', font: 'Syne 800 Italic', desktop: '30px', mobile: '24px', color: '#F0ECE6' },
  { element: 'Result big numbers', font: 'Syne 800 Italic', desktop: '60px', mobile: '36px', color: '#F0ECE6' },
  { element: 'Number suffixes', font: 'Syne 700', desktop: '20px', mobile: '16px', color: '#7A7267' },
  { element: 'Card labels', font: 'Space Grotesk 400', desktop: '14px', mobile: '14px', color: '#7A7267' },
  { element: 'Table headers', font: 'JetBrains Mono 700', desktop: '10px', mobile: '10px', color: '#8A847C' },
  { element: 'Button text', font: 'Syne 800', desktop: '18px', mobile: '16px', color: '#FFFFFF' },
  { element: 'Disclaimer', font: 'Space Grotesk 400', desktop: '12px', mobile: '12px', color: '#8A847C' },
];

const breakpoints = [
  { bp: 'Default (mobile)', width: '< 768px', layout: 'Single column everything' },
  { bp: 'md', width: '>= 768px', layout: 'Input grid 2-col, result cards 2x2' },
  { bp: 'lg', width: '>= 1024px', layout: 'Result cards 4-col, wider max-w' },
  { bp: 'xl', width: '>= 1280px', layout: 'No change from lg, more breathing room' },
];

const accessibilityChecks = [
  { check: '#F5F0EB on #0C0C0C', ratio: '17.8:1', level: 'AAA' },
  { check: '#A8A29E on #0C0C0C', ratio: '6.9:1', level: 'AA' },
  { check: '#78716C on #0C0C0C', ratio: '4.5:1', level: 'AA' },
  { check: '#E85D26 on #0C0C0C', ratio: '5.0:1', level: 'AA' },
  { check: 'White on #E85D26', ratio: '3.9:1', level: 'AA Large' },
];

export default function BriefROICalculator() {
  useSEO();

  return (
    <div className="bg-aom-night min-h-screen">
      {/* Hero */}
      <section className="bg-aom-night py-20 md:py-32 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.a
            href="/briefs"
            className="font-body text-sm text-aom-text-muted hover:text-aom-orange transition-colors inline-flex items-center gap-2 mb-12"
            {...fadeUp()}
          >
            <ArrowLeft size={14} /> All Briefs
          </motion.a>

          <motion.div {...fadeUp(0.05)}>
            <SectionKicker>DESIGN SPEC / MARCH 12, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            ROI CALCULATOR
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-4"
            {...fadeUp(0.2)}
          >
            Six inputs. Thirty seconds. A clear picture of what AI would save your business. Implementation-ready spec with every hex value, class, and animation timing defined.
          </motion.p>

          <motion.p
            className="font-body text-base text-white/40 leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.22)}
          >
            13 sections covering page structure, input fields, result cards, breakdown tables, CTA design, animation sequences, responsive behavior, color semantics, typography, and accessibility.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
              Steffen (Creative Director)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Page Structure */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>PAGE STRUCTURE</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            THREE ZONES, ONE SCROLL
          </motion.h2>

          <div className="space-y-4">
            {zones.map((z, i) => (
              <motion.div
                key={z.name}
                className="p-5 md:p-6 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Layout size={18} className="text-aom-orange" />
                  <h3 className="font-headline text-base font-bold text-aom-text-light">{z.name}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Background</p>
                    <p className="font-body text-sm text-white/60">{z.bg}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Max Width</p>
                    <p className="font-body text-sm text-white/60">{z.maxW}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Padding</p>
                    <p className="font-body text-sm text-white/60">{z.padding}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Behavior</p>
                    <p className="font-body text-sm text-white/60">{z.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Page Header Spec */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>PAGE HEADER</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            STANDARD AOM HEADER PATTERN
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Micro-label', spec: '"AI OPERATIONS" in 10px mono, bold, uppercase, tracking 0.3em, #78716C' },
              { label: 'Accent line', spec: '48px wide, 2px tall, #E85D26. Classes: w-12 h-[2px] bg-aom-orange mb-6' },
              { label: 'Headline', spec: '"WHAT WOULD AI SAVE YOUR BUSINESS?" Syne 800 Italic, text-4xl to text-6xl, #F5F0EB, max-w-3xl' },
              { label: 'Subhead', spec: '"Six inputs. Thirty seconds. A clear picture of what\'s possible." Space Grotesk 400, text-lg, #A8A29E, max-w-xl' },
            ].map((item, i) => (
              <motion.div key={item.label} className="p-5 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.06)}>
                <p className="font-headline text-sm font-bold text-aom-orange mb-2">{item.label}</p>
                <p className="font-body text-sm text-white/60">{item.spec}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Input Fields */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>INPUT FIELDS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            SIX INPUTS, TWO TYPES
          </motion.h2>

          <motion.p className="font-body text-base text-white/50 mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            Desktop: 2-column grid, 3 rows. Mobile: single column stack. Each field in bg #1A1A17 card with border #292524.
          </motion.p>

          <div className="space-y-3">
            {inputFields.map((f, i) => (
              <motion.div
                key={f.name}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <div className="md:col-span-1">
                  <span className="font-headline text-lg font-bold text-aom-orange">{f.num}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="font-headline text-sm font-bold text-aom-text-light">{f.name}</span>
                  <span className="font-mono text-xs text-[#7C9A72] ml-2">{f.type}</span>
                </div>
                <div className="md:col-span-8">
                  <span className="font-body text-sm text-white/60">{f.details}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Slider Detail */}
          <motion.div className="mt-8 p-6 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp()}>
            <h3 className="font-headline text-base font-bold text-aom-orange mb-3">
              <Sliders size={16} className="inline mr-2" />
              SLIDER THUMB SPEC
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Size + Shape</p>
                <p className="font-body text-sm text-white/50">20px circle (24px on mobile). #E85D26. 2px solid #0C0C0C border.</p>
              </div>
              <div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Shadow</p>
                <p className="font-body text-sm text-white/50">0 0 12px rgba(255, 79, 0, 0.3). Intensifies to 0.5 on hover.</p>
              </div>
              <div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Track</p>
                <p className="font-body text-sm text-white/50">6px height. Empty: #292524. Filled: #E85D26. Rounded-full.</p>
              </div>
            </div>
          </motion.div>

          {/* Calculate Button */}
          <motion.div className="mt-6 p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
            <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
              <Calculator size={16} className="inline mr-2 text-aom-orange" />
              CALCULATE BUTTON
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-2">Default</p>
                <p className="font-body text-sm text-white/60">Full-width. bg #E85D26. White text. Syne 800 uppercase 18px. py-5 px-8. Square corners. Shadow: 0 4px 24px rgba(255, 79, 0, 0.2)</p>
              </div>
              <div>
                <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-2">Disabled</p>
                <p className="font-body text-sm text-white/60">opacity-50 cursor-not-allowed. Appears before industry is selected. No hover effect.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Result Cards */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>RESULT CARDS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            FOUR CARDS, ONE ROW
          </motion.h2>

          <motion.p className="font-body text-base text-white/50 mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            Desktop: 4-col grid. Tablet: 2x2. Mobile: single column. Each card: bg #1A1A17, border #292524, 2px accent line at top.
          </motion.p>

          <div className="space-y-4">
            {resultCards.map((card, i) => (
              <motion.div
                key={card.name}
                className="p-5 md:p-6 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className="w-10 h-10 border border-white/10 bg-black/40 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: card.accent === 'Dynamic' ? '#E85D26' : `${card.accent}40` }}
                  >
                    {card.icon === 'Clock' && <Clock size={20} style={{ color: card.accent === 'Dynamic' ? '#E85D26' : card.accent }} />}
                    {card.icon === 'DollarSign' && <DollarSign size={20} style={{ color: card.accent }} />}
                    {card.icon === 'TrendingUp' && <TrendingUp size={20} style={{ color: card.accent }} />}
                    {card.icon === 'Calendar' && <Calendar size={20} style={{ color: card.accent === 'Dynamic' ? '#E85D26' : card.accent }} />}
                  </div>
                  <div>
                    <h3 className="font-headline text-base font-bold text-aom-text-light">{card.name}</h3>
                    <p className="font-body text-xs text-white/40">Accent: {card.accent}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Big Number</p>
                    <p className="font-body text-sm text-white/60">Syne 800 Italic, text-5xl to text-6xl, #F5F0EB, tabular-nums</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Label</p>
                    <p className="font-body text-sm text-white/60">{card.label}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Subtext</p>
                    <p className="font-body text-sm text-white/60">{card.sub}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Break-Even Color Logic */}
          <motion.div className="mt-8 p-6 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp()}>
            <h3 className="font-headline text-base font-bold text-aom-orange mb-4">
              BREAK-EVEN CARD: DYNAMIC COLOR
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {breakEvenColors.map((be, i) => (
                <div key={be.range}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: be.color }} />
                    <span className="font-body text-xs text-white/40">{be.range}</span>
                  </div>
                  <p className="font-body text-sm text-white/60">{be.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Breakdown Tables */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>DETAILED BREAKDOWN</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            THREE DATA SECTIONS
          </motion.h2>

          <div className="space-y-6">
            {[
              {
                title: 'Where the Value Comes From',
                desc: 'Breakdown table with category rows. Header: bg #0C0C0C, mono 10px uppercase. Body rows: font-body 14px. Total row: border-t-2 border-aom-orange/30, font-bold. "% of Total" column has mini orange background bars at 15% opacity.',
              },
              {
                title: 'Investment vs. Return (3-Year View)',
                desc: 'Year 1/2/3 columns. "Total value" in #F5F0EB. "System cost" in #A8A29E. "Net benefit" in sage (#7C9A72) when positive, red (#EF4444) when negative. "Cumulative ROI" in orange, Syne 800 Italic text-lg.',
              },
              {
                title: 'What AI Automates',
                desc: 'Checklist grid. 2 columns on desktop, single column mobile. Each item: sage check icon (16px) in circular bg container + description text in #A8A29E, 14px. Dynamic based on selected industry.',
              },
            ].map((section, i) => (
              <motion.div key={section.title} className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.1)}>
                <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                  <BarChart3 size={16} className="inline mr-2 text-aom-orange" />
                  {section.title}
                </h3>
                <p className="font-body text-sm text-white/60">{section.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Table Design Spec */}
          <motion.div className="mt-8 p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
            <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">TABLE DESIGN PATTERN</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Container</p>
                <p className="font-body text-sm text-white/50">bg #1A1A17, border #292524, rounded-sm, overflow-hidden. Full width.</p>
              </div>
              <div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Header Row</p>
                <p className="font-body text-sm text-white/50">bg #0C0C0C. Mono 10px bold uppercase, tracking 0.3em, #78716C. px-6 py-4.</p>
              </div>
              <div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Body Rows</p>
                <p className="font-body text-sm text-white/50">font-body 14px #F5F0EB. px-6 py-4. hover: bg-aom-night/50. border-b #292524.</p>
              </div>
              <div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Total Row</p>
                <p className="font-body text-sm text-white/50">bg #0C0C0C. font-headline font-bold text-base. border-t-2 border-aom-orange/30.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>CTA SECTION</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            TWO-TIER CONVERSION
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
              <h3 className="font-headline text-base font-bold text-aom-orange mb-3">PRIMARY CTA</h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Headline: "THESE ARE ESTIMATES. GET YOUR EXACT NUMBERS."</li>
                <li className="font-body text-sm text-white/60">Body: "The $2,500 AI Operations Audit uses your actual workflows, not industry averages."</li>
                <li className="font-body text-sm text-white/60">Button: "BOOK YOUR AUDIT" links to /audit/test</li>
                <li className="font-body text-sm text-white/60">Orange glow pulse animation: box-shadow oscillates 2000ms infinite</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">SECONDARY CTA</h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Headline: "Send me this report"</li>
                <li className="font-body text-sm text-white/60">Email input (w-72) + "SEND" button inline</li>
                <li className="font-body text-sm text-white/60">Button: ghost style, border #F5F0EB, hover inverts to white bg</li>
                <li className="font-body text-sm text-white/60">Mobile: stack vertically, both full width</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Animation Sequence */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>ANIMATION SEQUENCE</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            RESULTS REVEAL CHOREOGRAPHY
          </motion.h2>

          <div className="space-y-2">
            {animationSteps.map((step, i) => (
              <motion.div
                key={step.step}
                className="flex items-start gap-4 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <span className="font-headline text-lg font-bold text-aom-orange flex-shrink-0 w-6">{step.step}.</span>
                <div className="flex-1">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="font-body text-sm font-semibold text-aom-text-light">{step.label}</span>
                    <span className="font-mono text-xs text-[#7C9A72]">{step.timing}</span>
                  </div>
                  <span className="font-body text-sm text-white/50">{step.detail}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Recalculate Behavior */}
          <motion.div className="mt-6 p-6 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp()}>
            <h3 className="font-headline text-base font-bold text-aom-orange mb-3">
              <Zap size={16} className="inline mr-2" />
              RECALCULATE BEHAVIOR
            </h3>
            <p className="font-body text-sm text-white/60">
              When inputs change and calculate is clicked again: numbers animate from old value to new value (not from zero). 800ms ease-out. No page scroll. Cards do NOT re-animate their entrance. Only the numbers update.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Color System */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>COLOR SEMANTICS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            EVERY COLOR HAS A MEANING
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {colorMapping.map((c, i) => (
              <motion.div key={c.meaning + i} className="p-5 border border-white/10 bg-white/[0.02] flex items-start gap-4" {...fadeUp(i * 0.06)}>
                <div className="w-8 h-8 rounded flex-shrink-0 mt-0.5" style={{ backgroundColor: c.color }} />
                <div>
                  <p className="font-headline text-sm font-bold text-aom-text-light">{c.meaning}</p>
                  <p className="font-mono text-xs text-white/40 mb-1">{c.color} ({c.label})</p>
                  <p className="font-body text-sm text-white/50">{c.usage}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-6 p-5 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
            <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">COLOR RULES</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                <span className="font-body text-sm text-white/60">Never use green (#22C55E) for savings. Use sage (#7C9A72). Sage = AI systems working.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                <span className="font-body text-sm text-white/60">Orange is the attention color. Use for the biggest, most impressive number.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                <span className="font-body text-sm text-white/60">No gradients in data visualization. Flat colors only. Opacity variations are fine.</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Typography Reference */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>TYPOGRAPHY</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            TYPE SCALE FOR THIS PAGE
          </motion.h2>

          <div className="space-y-2">
            {typographyRef.map((t, i) => (
              <motion.div
                key={t.element}
                className="grid grid-cols-2 md:grid-cols-5 gap-2 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.05)}
              >
                <div>
                  <span className="font-body text-sm text-aom-text-light">{t.element}</span>
                </div>
                <div>
                  <span className="font-body text-sm text-white/50">{t.font}</span>
                </div>
                <div>
                  <span className="font-mono text-xs text-[#7C9A72]">{t.desktop}</span>
                </div>
                <div>
                  <span className="font-mono text-xs text-white/40">{t.mobile}</span>
                </div>
                <div>
                  <div className="w-4 h-4 rounded inline-block" style={{ backgroundColor: t.color }} />
                  <span className="font-mono text-xs text-white/40 ml-2">{t.color}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Responsive + Accessibility */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>RESPONSIVE + ACCESSIBILITY</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            EVERY DEVICE, EVERY USER
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-4">
                <Smartphone size={16} className="inline mr-2 text-aom-orange" />
                BREAKPOINTS
              </h3>
              <div className="space-y-2">
                {breakpoints.map((bp, i) => (
                  <motion.div key={bp.bp} className="p-4 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.06)}>
                    <div className="flex items-baseline gap-3">
                      <span className="font-headline text-sm font-bold text-aom-orange">{bp.bp}</span>
                      <span className="font-mono text-xs text-white/40">{bp.width}</span>
                    </div>
                    <p className="font-body text-sm text-white/50 mt-1">{bp.layout}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-4">
                <ShieldCheck size={16} className="inline mr-2 text-aom-orange" />
                CONTRAST RATIOS
              </h3>
              <div className="space-y-2">
                {accessibilityChecks.map((ac, i) => (
                  <motion.div key={ac.check} className="p-4 border border-white/10 bg-white/[0.02] flex items-center justify-between" {...fadeUp(i * 0.06)}>
                    <span className="font-body text-sm text-white/60">{ac.check}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-aom-text-light">{ac.ratio}</span>
                      <span className="font-mono text-xs text-[#7C9A72]">{ac.level}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* A11y Requirements */}
          <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
            <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">ACCESSIBILITY REQUIREMENTS</h3>
            <ul className="space-y-2">
              {[
                'All form inputs have associated <label> elements',
                'Slider values: aria-valuenow, aria-valuemin, aria-valuemax',
                'Focus rings visible on all interactive elements',
                'Tab order: inputs top-to-bottom, left-to-right, then calculate, then CTA',
                'Results section: aria-live="polite" for screen reader announcements',
                'Animations respect prefers-reduced-motion: skip count-up, instant reveal',
              ].map((req, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check size={14} className="text-[#7C9A72] mt-1 flex-shrink-0" />
                  <span className="font-body text-sm text-white/60">{req}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Honesty Indicators */}
      <section className="bg-aom-night-card border-y border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>HONESTY INDICATORS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            TRUST THROUGH TRANSPARENCY
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Info size={18} />, title: 'DEFAULTS NUDGE', desc: 'If user hasn\'t changed inputs: subtle banner with Info icon + "Adjust the inputs to match your business for a more accurate estimate." Sage border.' },
              { icon: <Eye size={18} />, title: '"EST." BADGE', desc: 'Revenue uplift row gets inline "est." badge. Mono 9px uppercase, bg #0C0C0C, px-2 py-0.5. Keeps the numbers honest.' },
              { icon: <Users size={18} />, title: 'LARGE TEAM NOTE', desc: 'Teams > 30: card below results with Users icon. "For larger teams, we recommend a custom scoping call." Ghost CTA: "Schedule a call" in orange.' },
            ].map((indicator, i) => (
              <motion.div
                key={indicator.title}
                className="p-6 md:p-8 border border-aom-orange/20 bg-aom-orange/[0.04]"
                {...fadeUp(i * 0.12)}
              >
                <div className="text-aom-orange mb-3">{indicator.icon}</div>
                <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">{indicator.title}</h3>
                <p className="font-body text-sm text-white/60 leading-relaxed">{indicator.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Line */}
      <section className="bg-aom-night-card border-t border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            className="font-headline text-xl md:text-2xl font-bold text-aom-text-light leading-snug max-w-[55ch] mx-auto mb-6"
            {...fadeUp()}
          >
            Every hex value, every class, every animation timing is defined. Bobby builds from this without interpretation. Steffen reviews the build against this spec before Elmo QA.
          </motion.p>
          <motion.p className="font-body text-base text-white/50 max-w-[50ch] mx-auto" {...fadeUp(0.1)}>
            Design standard: old people can read em, young people love em.
          </motion.p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-aom-night py-8 px-6 text-center">
        <a
          href="https://aheadofmarket.com"
          className="font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-3"
        >
          AOM
        </a>
        <p className="font-body text-xs text-aom-text-muted">
          Design spec by Steffen (Creative Director). March 12, 2026.
        </p>
        <a
          href="/briefs"
          className="font-body text-xs text-aom-text-muted hover:text-aom-orange transition-colors mt-1 inline-block"
        >
          View all briefs
        </a>
      </footer>
    </div>
  );
}
