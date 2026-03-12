import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Layers, Type, Palette, ChevronDown, GripVertical,
  ArrowRight, CheckCircle, Keyboard, Smartphone, Monitor,
  Eye, Sparkles
} from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Audit Onboarding Tool | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Audit onboarding tool design spec. 27-slide premium keynote-style intake form with alternating Night/Cream rhythm, pill selectors, and architectural progress bar.');
    setMeta('og:title', 'Audit Onboarding Tool: Design Spec', true);
    setMeta('og:description', 'A premium keynote presentation, not a web form. 27 slides across 6 sections with alternating cream/night rhythm.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/audit-onboarding', true);
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

const colorSystem = {
  backgrounds: [
    { context: 'Input slides', hex: '#FDF6EC', name: 'Cream', usage: 'Clean, open, inviting. All question slides.' },
    { context: 'Interstitials + Welcome + Thank You', hex: '#0C0C0C', name: 'Night', usage: 'Dramatic, branded. Chapter cards and bookends.' },
  ],
  textOnCream: [
    { element: 'Headline', hex: '#0A0A0A', note: 'Maximum contrast on light' },
    { element: 'Body / Subtext', hex: '#7A7267', note: 'Warm gray secondary text' },
    { element: 'Input text', hex: '#0A0A0A', note: 'User-entered text' },
    { element: 'Input label', hex: '#7A7267', note: 'Above inputs' },
    { element: 'Placeholder', hex: '#D9D3CB', note: 'Ghost text in empty inputs' },
  ],
  textOnNight: [
    { element: 'Headline', hex: '#FDF6EC', note: 'Warm white on dark' },
    { element: 'Body / Subtext', hex: '#8A847C', note: 'Muted secondary text' },
  ],
  accents: [
    { name: 'Orange', hex: '#E85D26', usage: 'Progress bar, CTAs, focus borders, selected pills, section numbers' },
    { name: 'Orange Hover', hex: '#D14E1C', usage: 'CTA hover state' },
    { name: 'Orange Glow', hex: 'rgba(232,93,38,0.15)', usage: 'Button hover shadow' },
    { name: 'Gold', hex: '#C9A84C', usage: '"Saved" indicator, completion badge' },
  ],
};

const typographyScale = [
  { element: 'Section Number', font: 'Syne 800', desktop: '160px', mobile: '80px', color: '#E85D26', note: 'Leading zero format: 01, 02...' },
  { element: 'Section Title', font: 'Syne 800', desktop: '48px', mobile: '32px', color: '#FDF6EC', note: 'On Night slides only' },
  { element: 'Welcome/Thank You Headline', font: 'Syne 800', desktop: '52px', mobile: '36px', color: '#FDF6EC', note: 'Bookend slides' },
  { element: 'Slide Headline', font: 'Syne 700', desktop: '36px', mobile: '26px', color: '#0A0A0A / #FDF6EC', note: 'Per background' },
  { element: 'Body / Subtext', font: 'Space Grotesk 400', desktop: '18px', mobile: '16px', color: '#7A7267 / #8A847C', note: 'Per background' },
  { element: 'Input Text', font: 'Space Grotesk 400', desktop: '18px', mobile: '16px', color: '#0A0A0A', note: 'Always on Cream' },
  { element: 'Input Label', font: 'Space Grotesk 600', desktop: '12px', mobile: '11px', color: '#7A7267', note: 'Uppercase, 0.12em tracking' },
  { element: 'Button Text (Primary)', font: 'Space Grotesk 700', desktop: '16px', mobile: '14px', color: '#FDF6EC', note: 'Uppercase, 0.06em tracking' },
  { element: 'Pill Badge Text', font: 'Space Grotesk 500', desktop: '14px', mobile: '13px', color: '#0A0A0A / #FDF6EC', note: 'Unselected / Selected' },
];

const components = [
  {
    name: 'Text Input (Bottom-Border)',
    icon: Type,
    specs: [
      'Width: 100%, max 560px. Height: 48px.',
      'Border: bottom only, 2px solid #D9D3CB. Focus: 2px solid #E85D26.',
      'Background: transparent. No border-radius. Underline only.',
      'Padding: 0 0 12px 0. No side padding.',
      'Label above: Space Grotesk 600, 12px, uppercase, tracking 0.12em, #7A7267. Gap: 8px.',
    ],
  },
  {
    name: 'Text Area',
    icon: Layers,
    specs: [
      'Width: 100%, max 640px. Min-height: 120px.',
      'Auto-grow: yes, up to 240px then scroll.',
      'Border: 1px solid #D9D3CB. Focus: 1px solid #E85D26.',
      'Background: #FFFFFF at 50% opacity.',
      'Padding: 16px. Border-radius: 2px.',
    ],
  },
  {
    name: 'Radio Group (Pill Style)',
    icon: CheckCircle,
    specs: [
      'Flexbox, flex-wrap, gap 12px, centered.',
      'Each pill: padding 12px 24px, border-radius 9999px (fully rounded).',
      'Unselected: border 1px solid #D9D3CB, text #0A0A0A, bg transparent.',
      'Selected: bg #E85D26, text #FDF6EC, border #E85D26.',
      'Mobile: pills stack vertically, full-width, gap 8px.',
      'Entire pill is the click target. No separate radio dot.',
    ],
  },
  {
    name: 'Checkbox Group (Pill Grid)',
    icon: CheckCircle,
    specs: [
      'CSS Grid: 3 columns desktop, 2 tablet, 1 mobile. Gap: 12px.',
      'Same styling as radio pills but multi-select.',
      '"Other" pill: when selected, expands to show text input below.',
      'Expansion animated: max-height 200ms ease, opacity 200ms ease.',
    ],
  },
  {
    name: 'Custom Dropdown',
    icon: ChevronDown,
    specs: [
      'Trigger: same as text input (48px, bottom-border style).',
      'Chevron: Lucide ChevronDown, 18px, #7A7267. Rotates 180deg on open.',
      'Panel: bg #FDF6EC, border 1px solid #D9D3CB, shadow 0 8px 32px rgba(0,0,0,0.12).',
      'Each option: 44px height, hover bg #E85D26, hover text #FDF6EC.',
      'Max-height: 264px (6 visible items), overflow-y auto.',
    ],
  },
  {
    name: 'Drag-to-Rank (Slide 25)',
    icon: GripVertical,
    specs: [
      'Container: max 560px, centered. Each item: 56px height.',
      'Background: #FFFFFF at 30% opacity, border 1px solid #D9D3CB.',
      'Drag handle: GripVertical, 18px, #D9D3CB. Rank number: Syne 700, 18px, #E85D26.',
      'Dragging: shadow 0 4px 16px rgba(0,0,0,0.1), scale 1.02, border #E85D26.',
      'Mobile fallback: no drag. Tap item to cycle rank number (1-5).',
    ],
  },
];

const slideTemplates = [
  {
    name: 'Welcome / Thank You',
    bg: 'Night (#0C0C0C)',
    features: [
      'Content: vertically and horizontally centered.',
      'Headline: Syne 800, 52px/36px, #FDF6EC.',
      'Body: Space Grotesk 400, 18px/16px, #8A847C, max-width 560px.',
      'CTA: primary orange button, centered, margin-top 48px.',
      'Film grain: active, opacity 0.03.',
      'Diagonal line pattern: bottom 60px of viewport.',
      'Thank You: gold completion badge pill (#C9A84C bg, #0C0C0C text).',
    ],
  },
  {
    name: 'Section Interstitial (Chapter Card)',
    bg: 'Night (#0C0C0C)',
    features: [
      'Section number: Syne 800, 160px/80px, #E85D26. Leading zero.',
      'Title: Syne 800, 48px/32px, #FDF6EC. Below number, margin-top 16px.',
      'Description: Space Grotesk 400, 18px/16px, #8A847C. One line max.',
      'Film grain + pattern strip active.',
      'Auto-advance: after 1800ms OR click/Enter/tap to skip.',
      'No navigation buttons. It is a breathing moment.',
    ],
  },
  {
    name: 'Single Input Slide',
    bg: 'Cream (#FDF6EC)',
    features: [
      'Three vertical zones within 720px centered column.',
      'Top: headline area (Syne 700, 36px/26px, #0A0A0A). Optional subtext.',
      'Middle: single input component, centered.',
      'Bottom: navigation bar (Back ghost + Continue primary).',
      'No film grain. No pattern. Pure clean cream.',
    ],
  },
  {
    name: 'Multi-Input Slide',
    bg: 'Cream (#FDF6EC)',
    features: [
      'Headline: Syne 700, 32px/24px, #0A0A0A. Top of content area.',
      '2-4 inputs stacked, max-width 560px, centered.',
      'Gap between field groups: 40px desktop, 32px mobile.',
      'Navigation bar at bottom.',
      'No film grain. No pattern.',
    ],
  },
];

const transitions = [
  { type: 'Forward', detail: 'Current slide exits left (translateX(-100%), opacity: 0). New slide enters from right.' },
  { type: 'Backward', detail: 'Reverse. Current exits right, new enters from left.' },
  { type: 'Duration', detail: '250ms. Easing: ease-out.' },
  { type: 'Interstitials', detail: 'Crossfade only. opacity 0 to 1, 300ms ease-out. No horizontal slide. More dramatic.' },
  { type: 'Progress bar', detail: 'Width transition runs simultaneously, 300ms ease-out.' },
  { type: 'Rule', detail: 'No bounce, no spring, no scale, no blur. Clean and fast.' },
];

const breakpoints = [
  { size: '> 1024px', label: 'Desktop', changes: 'Full layout. Content max 720px. Inputs max 560px. Pill grids 3 columns. Nav side-by-side.' },
  { size: '768-1024px', label: 'Tablet', changes: 'Content max 640px. Pill grids 2 columns. Same nav layout. Section numbers 120px.' },
  { size: '< 768px', label: 'Mobile', changes: 'Full-width + 24px padding. Pills single column. Nav stacks vertically. Section numbers 80px. Progress labels hidden.' },
  { size: '< 480px', label: 'Small Mobile', changes: 'Progress labels fully hidden (bar only). Headline sizes at minimum. CTA buttons 14px. Nav 32px from bottom.' },
];

const accessibilitySpecs = [
  { label: 'Tab order', value: 'Label > Input > Continue > Back' },
  { label: 'Enter key', value: 'Advances to next slide (submits current input)' },
  { label: 'Escape key', value: 'Goes back one slide' },
  { label: 'Focus ring', value: '2px solid #E85D26, offset 2px, :focus-visible only' },
  { label: 'ARIA', value: 'Each slide role="group" with aria-label. Progress bar has role="progressbar".' },
  { label: 'Contrast (AA)', value: '#0A0A0A on #FDF6EC = 15.4:1. #7A7267 on #FDF6EC = 4.8:1. #FDF6EC on #E85D26 = 4.1:1. All pass.' },
];

export default function BriefAuditOnboarding() {
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
            <SectionKicker>DESIGN SPEC / MARCH 11, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            AUDIT ONBOARDING TOOL
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-4"
            {...fadeUp(0.2)}
          >
            27-slide premium keynote-style intake form. Alternating Night/Cream rhythm creates a cadence: dramatic chapter cards punctuated by clean, inviting input slides.
          </motion.p>

          <motion.p
            className="font-body text-base text-white/40 leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.22)}
          >
            Think Apple product reveal meets high-end consulting intake. Confident, warm, zero clutter. Fonts: Syne + Space Grotesk.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
              Steffen (Creative Director)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Global Rules */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>GLOBAL RULES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            FOUNDATIONS
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Viewport', value: 'Each slide is min-h-screen, 100dvh on mobile. No scrolling within a slide.' },
              { label: 'Max content width', value: '720px centered. Inputs max 560px. Text areas max 640px.' },
              { label: 'Film grain', value: 'SVG noise on Night slides only, opacity 0.03. Zero grain on Cream slides.' },
              { label: 'Vertical centering', value: 'All content sits in the middle vertical third. Flexbox items-center justify-center.' },
              { label: 'Horizontal centering', value: 'Everything centered within the content column.' },
              { label: 'Breathing room', value: 'Min 64px headline-to-input. Min 32px between groups. Min 48px input-to-nav.' },
            ].map((rule, i) => (
              <motion.div
                key={rule.label}
                className="flex items-center justify-between p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.05)}
              >
                <span className="font-body text-sm text-white/60">{rule.label}</span>
                <span className="font-body text-sm text-aom-orange font-medium text-right max-w-[60%]">{rule.value}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Color System */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>COLOR SYSTEM</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            NIGHT / CREAM RHYTHM
          </motion.h2>

          {/* Backgrounds */}
          <motion.h3 className="font-headline text-lg font-bold text-aom-text-light mb-4" {...fadeUp()}>
            BACKGROUNDS
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {colorSystem.backgrounds.map((bg, i) => (
              <motion.div
                key={bg.context}
                className="p-5 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 border border-white/20" style={{ backgroundColor: bg.hex }} />
                  <div>
                    <p className="font-headline text-sm font-bold text-aom-text-light">{bg.name}</p>
                    <p className="font-body text-xs text-white/40">{bg.hex}</p>
                  </div>
                </div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-1">{bg.context}</p>
                <p className="font-body text-sm text-white/50">{bg.usage}</p>
              </motion.div>
            ))}
          </div>

          {/* Text colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div>
              <motion.h3 className="font-headline text-base font-bold text-aom-text-light mb-4" {...fadeUp()}>
                TEXT ON CREAM
              </motion.h3>
              <div className="space-y-2">
                {colorSystem.textOnCream.map((t, i) => (
                  <motion.div
                    key={t.element}
                    className="flex items-center gap-3 p-3 border border-white/10 bg-white/[0.02]"
                    {...fadeUp(i * 0.05)}
                  >
                    <div className="w-6 h-6 flex-shrink-0 border border-white/20" style={{ backgroundColor: t.hex }} />
                    <div>
                      <span className="font-body text-sm text-aom-text-light">{t.element}</span>
                      <span className="font-body text-xs text-white/40 ml-2">{t.hex}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <motion.h3 className="font-headline text-base font-bold text-aom-text-light mb-4" {...fadeUp()}>
                TEXT ON NIGHT
              </motion.h3>
              <div className="space-y-2">
                {colorSystem.textOnNight.map((t, i) => (
                  <motion.div
                    key={t.element}
                    className="flex items-center gap-3 p-3 border border-white/10 bg-white/[0.02]"
                    {...fadeUp(i * 0.05)}
                  >
                    <div className="w-6 h-6 flex-shrink-0 border border-white/20" style={{ backgroundColor: t.hex }} />
                    <div>
                      <span className="font-body text-sm text-aom-text-light">{t.element}</span>
                      <span className="font-body text-xs text-white/40 ml-2">{t.hex}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.h3 className="font-headline text-base font-bold text-aom-text-light mt-6 mb-4" {...fadeUp()}>
                ACCENT COLORS
              </motion.h3>
              <div className="space-y-2">
                {colorSystem.accents.map((a, i) => (
                  <motion.div
                    key={a.name}
                    className="flex items-center gap-3 p-3 border border-white/10 bg-white/[0.02]"
                    {...fadeUp(i * 0.05)}
                  >
                    <div className="w-6 h-6 flex-shrink-0 border border-white/20" style={{ backgroundColor: a.hex.startsWith('rgba') ? a.hex : a.hex }} />
                    <div>
                      <span className="font-body text-sm text-aom-text-light">{a.name}</span>
                      <span className="font-body text-xs text-white/40 block">{a.usage}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Typography */}
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
            TYPE SCALE
          </motion.h2>

          <div className="space-y-3">
            {typographyScale.map((t, i) => (
              <motion.div
                key={t.element}
                className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 border border-white/10 bg-white/[0.02] items-center"
                {...fadeUp(i * 0.04)}
              >
                <span className="font-headline text-sm font-bold text-aom-text-light md:col-span-2">{t.element}</span>
                <span className="font-body text-sm text-white/50">{t.font}</span>
                <span className="font-body text-sm text-aom-orange">{t.desktop} / {t.mobile}</span>
                <span className="font-body text-sm text-white/40 md:col-span-2">{t.note}</span>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-6 p-4 bg-white/[0.03] border border-white/5" {...fadeUp(0.3)}>
            <p className="font-body text-sm text-white/50">
              <span className="text-aom-orange font-medium">Case rules: </span>
              Uppercase: Input Labels, Progress Labels, Button Text, Saved Indicator. Sentence case: Headlines, Body, Input Text, Pill Badge Text.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Components */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>COMPONENT SPECS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            PREMIUM INPUTS
          </motion.h2>

          <div className="space-y-6">
            {components.map((comp, i) => {
              const Icon = comp.icon;
              return (
                <motion.div
                  key={comp.name}
                  className="p-6 md:p-8 border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors"
                  {...fadeUp(i * 0.08)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center border border-white/10 text-aom-orange">
                      <Icon size={20} />
                    </div>
                    <h3 className="font-headline text-lg font-bold text-aom-text-light">{comp.name}</h3>
                  </div>
                  <ul className="space-y-2">
                    {comp.specs.map((spec, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                        <span className="font-body text-sm text-white/60">{spec}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <ArrowRight size={16} className="inline mr-2 text-aom-orange" />
                Primary CTA Button
              </h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Background: #E85D26. Text: #FDF6EC.</li>
                <li className="font-body text-sm text-white/60">Padding: 16px 48px. Min-width: 200px. Border-radius: 0.</li>
                <li className="font-body text-sm text-white/60">Hover: bg #D14E1C, shadow 0 0 20px rgba(232,93,38,0.15).</li>
                <li className="font-body text-sm text-white/60">Mobile: width 100%.</li>
                <li className="font-body text-sm text-white/60">Disabled: bg #D9D3CB, text #7A7267, cursor not-allowed.</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <ArrowLeft size={16} className="inline mr-2 text-aom-orange" />
                Ghost Button (Back)
              </h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Background: transparent. Border-radius: 0.</li>
                <li className="font-body text-sm text-white/60">On Cream: text #7A7267, border 1px solid #D9D3CB.</li>
                <li className="font-body text-sm text-white/60">On Night: text #8A847C, border 1px solid rgba(255,255,255,0.10).</li>
                <li className="font-body text-sm text-white/60">Hover: text darkens, border darkens. Mobile: width 100%.</li>
              </ul>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <motion.div className="mt-8 p-6 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp(0.2)}>
            <h3 className="font-headline text-base font-bold text-aom-orange mb-3">PROGRESS BAR</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Fixed at top of every slide. Full viewport width.</li>
                <li className="font-body text-sm text-white/60">Height: 48px desktop (with labels), 32px mobile (bar only).</li>
                <li className="font-body text-sm text-white/60">Label left: section name. Right: slide count ("3 of 27").</li>
                <li className="font-body text-sm text-white/60">Bar: 4px desktop, 3px mobile. Fill: #E85D26.</li>
              </ul>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Track (Cream): #EDE7DF. Track (Night): #1A1A17.</li>
                <li className="font-body text-sm text-white/60">Fill width: percentage of total completion.</li>
                <li className="font-body text-sm text-white/60">Transition: fill animates 300ms ease-out on slide change.</li>
                <li className="font-body text-sm text-white/60">"SAVED" indicator: gold text #C9A84C, appears for ~2.4s after auto-save.</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Slide Templates */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SLIDE TEMPLATES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            FOUR TEMPLATE TYPES
          </motion.h2>

          <motion.p className="font-body text-base text-white/50 mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            27 slides across 6 sections. The alternating Night/Cream rhythm creates the pulse.
          </motion.p>

          <div className="space-y-6">
            {slideTemplates.map((tmpl, i) => (
              <motion.div
                key={tmpl.name}
                className="p-6 md:p-8 border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors"
                {...fadeUp(i * 0.1)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline text-lg font-bold text-aom-text-light">{tmpl.name}</h3>
                  <span className="font-body text-xs text-aom-orange uppercase tracking-wider">{tmpl.bg}</span>
                </div>
                <ul className="space-y-2">
                  {tmpl.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                      <span className="font-body text-sm text-white/60">{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Transitions */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SLIDE TRANSITIONS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            CLEAN AND FAST
          </motion.h2>

          <div className="space-y-3">
            {transitions.map((t, i) => (
              <motion.div
                key={t.type}
                className="flex items-start gap-4 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <span className="font-headline text-sm font-bold text-aom-orange flex-shrink-0 w-28">{t.type}</span>
                <span className="font-body text-sm text-white/60">{t.detail}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>NAVIGATION BAR</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            BACK + CONTINUE
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Position', value: 'Fixed at bottom. 80px from viewport bottom (desktop), 40px (mobile).' },
              { label: 'Layout', value: 'Flex row, justify-content: space-between, max-width 560px, centered.' },
              { label: 'Left', value: 'Ghost button ("BACK"). Hidden on first slide.' },
              { label: 'Right', value: 'Primary CTA ("CONTINUE" or "SUBMIT" on final input slide).' },
              { label: 'Mobile', value: 'Buttons stack vertically, Primary on top, Ghost below. Gap: 12px. Full-width.' },
              { label: 'Keyboard', value: 'Enter triggers Continue. Escape triggers Back.' },
            ].map((n, i) => (
              <motion.div
                key={n.label}
                className="flex items-center justify-between p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <span className="font-body text-sm text-white/60">{n.label}</span>
                <span className="font-body text-sm text-aom-orange font-medium text-right max-w-[60%]">{n.value}</span>
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
            EVERY SCREEN, EVERY USER
          </motion.h2>

          {/* Breakpoints */}
          <div className="space-y-3 mb-10">
            {breakpoints.map((bp, i) => (
              <motion.div
                key={bp.size}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <div className="md:col-span-2">
                  <span className="font-headline text-sm font-bold text-aom-orange">{bp.size}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-body text-sm text-aom-text-light">{bp.label}</span>
                </div>
                <div className="md:col-span-8">
                  <span className="font-body text-sm text-white/50">{bp.changes}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Accessibility */}
          <motion.h3 className="font-headline text-lg font-bold text-aom-text-light mb-6" {...fadeUp()}>
            <Keyboard size={18} className="inline mr-2 text-aom-orange" />
            KEYBOARD + ACCESSIBILITY
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accessibilitySpecs.map((a, i) => (
              <motion.div key={a.label} className="p-4 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.06)}>
                <p className="font-body text-xs text-aom-orange font-medium uppercase tracking-wider mb-1">{a.label}</p>
                <p className="font-body text-sm text-white/60">{a.value}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Textures */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>TEXTURE + PATTERN</SectionKicker>
            <OrangeBar />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Film Grain</h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Night slides only.</li>
                <li className="font-body text-sm text-white/60">SVG feTurbulence fractalNoise, baseFrequency 0.65, numOctaves 3.</li>
                <li className="font-body text-sm text-white/60">Opacity 0.03, mix-blend-mode: overlay.</li>
                <li className="font-body text-sm text-white/60">pointer-events: none.</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Diagonal Pattern Strip</h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Interstitials + Welcome/Thank You only.</li>
                <li className="font-body text-sm text-white/60">Position: absolute bottom, height 60px, full width.</li>
                <li className="font-body text-sm text-white/60">45deg repeating gradient, rgba(232,93,38,0.08).</li>
                <li className="font-body text-sm text-white/60">pointer-events: none.</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.2)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Input Slides</h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-aom-orange font-medium">No textures.</li>
                <li className="font-body text-sm text-white/60">No patterns.</li>
                <li className="font-body text-sm text-white/60">No overlays.</li>
                <li className="font-body text-sm text-white/60">Pure clean cream.</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Three Things to Nail */}
      <section className="bg-aom-night border-y border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>THE THREE THINGS TO NAIL</SectionKicker>
            <OrangeBar />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '1', title: 'THE RHYTHM', desc: 'Dark chapter cards create dramatic pauses between clean input slides. The alternation is the design.' },
              { num: '2', title: 'THE INPUTS', desc: 'Bottom-border text fields, pill selectors, and custom dropdowns are the hero components. They must feel premium, not like a form library.' },
              { num: '3', title: 'THE PROGRESS BAR', desc: 'Architectural, always visible, animated. It is the thread that stitches all 27 slides together.' },
            ].map((t, i) => (
              <motion.div
                key={t.num}
                className="p-6 md:p-8 border border-aom-orange/20 bg-aom-orange/[0.04]"
                {...fadeUp(i * 0.12)}
              >
                <span className="font-headline text-3xl font-bold text-aom-orange/30">{t.num}</span>
                <h3 className="font-headline text-lg font-bold text-aom-text-light mt-2 mb-3">{t.title}</h3>
                <p className="font-body text-base text-white/60 leading-relaxed">{t.desc}</p>
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
            27 slides across 6 sections. Four templates. Alternating Night/Cream rhythm. Every value specified. No ambiguity. Build pixel-perfect.
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
          Design spec by Steffen (Creative Director). March 11, 2026.
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
