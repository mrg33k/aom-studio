import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Layout, Play, BarChart3, Wrench, Building2, Image,
  ArrowUpRight, MessageSquareQuote, Phone, Users, HelpCircle, Footprints,
  Smartphone, Zap, Palette, Type, Move
} from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Ambition Section Specs | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', '11 section-level design specs for Ambition Mechanical. Layout composition, motion behavior, visual hierarchy, wow moments, and responsive behavior for every section.');
    setMeta('og:title', 'Ambition Mechanical: 11 Section-Level Design Specs', true);
    setMeta('og:description', 'Build-ready specs. No guessing. Navy/red/white palette. Staggered cards, diagonal CTAs, parallax heroes, depth-stacked testimonials.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/ambition-sections', true);
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

const brandTokens = [
  { name: 'Navy-950', hex: '#070b1e' },
  { name: 'Navy-900', hex: '#0a0e2a' },
  { name: 'Navy-800', hex: '#111638' },
  { name: 'Navy-700', hex: '#1a1f45' },
  { name: 'Red-500', hex: '#dc2626' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Neutral-50', hex: '#f8fafc' },
  { name: 'Neutral-400', hex: '#9ca3af' },
];

const sectionFlow = [
  { num: '1', name: 'Hero', bg: 'Navy-950 + video', height: '100vh (tall)', icon: <Play size={16} />, wow: 'Stats row floating as a bridge that overlaps hero and next section. Numbers count up as you scroll.', motion: 'Headline fade-up on mount. Video parallax at 0.6x speed. Stats counter with 1200ms easeOut.' },
  { num: '2', name: 'Stats Bar', bg: 'Navy-900', height: 'Short/punchy', icon: <BarChart3 size={16} />, wow: 'Stat numbers counting up in sequence, each triggering the next divider to grow. Cascading reveal.', motion: 'Counter animation 1500ms. Dividers scale from 0 to 1. Logo row fades in last.' },
  { num: '3', name: 'Services', bg: 'White', height: 'Medium', icon: <Wrench size={16} />, wow: 'Staggered card heights. First card is 120% height. Cards 2 and 3 offset vertically. Breaks the grid monotony.', motion: 'Staggered reveal: each card fades up 40px with 150ms delay between cards.' },
  { num: '4', name: 'Industries', bg: 'Neutral-50', height: 'Medium', icon: <Building2 size={16} />, wow: 'Horizontal scrolling strip replaces vertical card grid. Full-bleed photography panels. Different interaction entirely.', motion: 'Snap scrolling with parallax inside each panel. Content fades in when panel is centered.' },
  { num: '5', name: 'Featured Projects', bg: 'White', height: 'Tall', icon: <Image size={16} />, wow: 'Magazine layout. Featured card at full-width like an editorial spread. Asymmetric 2-column grid below.', motion: 'Featured card first, grid cards stagger after. Image scale 1.03 on hover.' },
  { num: '6', name: 'Diagonal CTA', bg: 'Navy-800 + red', height: 'Short/punchy', icon: <ArrowUpRight size={16} />, wow: 'Red diagonal element cuts across 35% of section at 15 degrees. The most visually aggressive element on the page.', motion: 'Diagonal slides in via animated clip-path over 800ms. Headline fades from left.' },
  { num: '7', name: 'Testimonials', bg: 'White', height: 'Medium', icon: <MessageSquareQuote size={16} />, wow: 'Depth-stacked cards. 2-3 testimonials visible at once with perspective offset. Pull quote headline above.', motion: 'Front card slides left and fades. Back card scales up from 90% to 100%. Auto-advance every 8s.' },
  { num: '8', name: 'Quality Contact', bg: 'Neutral-50', height: 'Medium', icon: <Phone size={16} />, wow: 'Staggered proof point reveal. Each point appears in sequence like a checklist built in real-time.', motion: 'Left column fade-up. Right card slides from right. Proof points stagger 100ms each.' },
  { num: '9', name: 'Careers', bg: 'Navy-900', height: 'Medium-tall', icon: <Users size={16} />, wow: 'Oversized role count number at text-8xl in red-500. Says "we\'re growing" louder than any paragraph.', motion: 'Counter animation from 0. Cards stagger in 150ms. Featured card appears first.' },
  { num: '10', name: 'FAQ', bg: 'Neutral-50 + image', height: 'Medium', icon: <HelpCircle size={16} />, wow: 'Split layout with job-site photo. Transforms a dry text-only section into a branded content moment.', motion: 'Image parallax at 0.85x. Accordion items stagger in on scroll. Smooth height animation on open/close.' },
  { num: '11', name: 'Footer', bg: 'Navy-950', height: 'Standard', icon: <Footprints size={16} />, wow: 'No wow moment. Intentional. The footer is the resolution, not the climax. Stable and trustworthy.', motion: 'None. Static. Social icon color transition on hover only.' },
];

const crossSectionRules = [
  { rule: 'Color Ratio', detail: '35% white / 35% navy / 15% red / 15% gray. Red is ALWAYS an accent. Never a full section background. One red element per section max.' },
  { rule: 'Section Rhythm', detail: 'No two sections of same height feel sit next to each other. Tall/short/medium/short creates visual tempo.' },
  { rule: 'Motion Budget', detail: '5 motion types total: fade-up, counter, stagger, parallax, clip-path/slide. Consistency over variety.' },
  { rule: 'Performance', detail: 'All animations use transform + opacity only. will-change applied then removed. Images lazy-loaded. once: true on all whileInView.' },
  { rule: 'Min Text Size', detail: '16px body minimum. Only exceptions: kickers (11px), footer copyright (12px), chip/badge text (12-13px).' },
];

const buildPriority = [
  { num: '1', section: 'Diagonal CTA', hours: '4-6h', reason: 'Highest visual impact, replaces weakest section' },
  { num: '2', section: 'FAQ Split Layout', hours: '3-4h', reason: 'Transforms the driest section' },
  { num: '3', section: 'Stats Bar + Counters', hours: '3-4h', reason: 'Logo migration from hero + animated counters' },
  { num: '4', section: 'Services Staggered', hours: '3-4h', reason: 'Staggered heights + animation' },
  { num: '5', section: 'Industries Scroll', hours: '4-5h', reason: 'New horizontal interaction pattern' },
  { num: '6', section: 'Hero Refinements', hours: '2-3h', reason: 'Floating stats + credential badge' },
  { num: '7', section: 'Featured Projects', hours: '4-5h', reason: 'Magazine layout restructure' },
  { num: '8', section: 'Testimonials Stack', hours: '3-4h', reason: 'Card stacking + pull quote' },
  { num: '9', section: 'Quality Contact', hours: '2h', reason: 'Minor enhancement' },
  { num: '10', section: 'Careers Counter', hours: '2h', reason: 'Layout tweak + counter' },
  { num: '11', section: 'Footer Polish', hours: '1h', reason: 'Minor adjustments' },
];

export default function BriefAmbitionSections() {
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
            AMBITION SECTION SPECS
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-4"
            {...fadeUp(0.2)}
          >
            11 section-level design specs for Ambition Mechanical. Layout composition, motion behavior, visual hierarchy, wow moments, and responsive behavior for every section on the site.
          </motion.p>

          <motion.p
            className="font-body text-base text-white/40 leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.22)}
          >
            Build-ready. No guessing. The brand is locked: navy/red/white palette, Barlow Condensed display, Inter body, ROC #320923. We are upgrading execution, not identity.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
              Steffen (Creative Director)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Brand Tokens */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>BRAND TOKENS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            THE PALETTE IS LOCKED
          </motion.h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {brandTokens.map((token, i) => (
              <motion.div key={token.name} className="p-4 border border-white/10 bg-white/[0.02] text-center" {...fadeUp(i * 0.05)}>
                <div className="w-12 h-12 rounded mx-auto mb-3" style={{ backgroundColor: token.hex, border: token.hex === '#ffffff' ? '1px solid rgba(255,255,255,0.2)' : 'none' }} />
                <p className="font-headline text-sm font-bold text-aom-text-light">{token.name}</p>
                <p className="font-mono text-xs text-white/40">{token.hex}</p>
              </motion.div>
            ))}
          </div>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" {...fadeUp()}>
            <div className="p-5 border border-white/10 bg-white/[0.02]">
              <p className="font-headline text-sm font-bold text-aom-orange mb-2">Display Font</p>
              <p className="font-body text-sm text-white/60">Barlow Condensed, weight 800, uppercase</p>
            </div>
            <div className="p-5 border border-white/10 bg-white/[0.02]">
              <p className="font-headline text-sm font-bold text-aom-orange mb-2">Body Font</p>
              <p className="font-body text-sm text-white/60">Inter, weight 400/500/600. Container: max-w-7xl, px-4 sm:px-6 lg:px-8</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section Flow Overview */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SECTION FLOW</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            11 SECTIONS, TOP TO BOTTOM
          </motion.h2>

          <div className="space-y-4">
            {sectionFlow.map((s, i) => (
              <motion.div
                key={s.num}
                className="p-5 md:p-6 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.04)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-headline text-xl font-bold text-aom-orange">{s.num}</span>
                  <div className="text-aom-orange">{s.icon}</div>
                  <h3 className="font-headline text-base font-bold text-aom-text-light">{s.name}</h3>
                  <span className="font-mono text-xs text-white/30 ml-auto hidden md:block">{s.bg}</span>
                  <span className="font-mono text-xs text-[#7C9A72] hidden md:block">{s.height}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Wow Moment</p>
                    <p className="font-body text-sm text-white/60">{s.wow}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-[#7C9A72] uppercase tracking-wider mb-2">Motion</p>
                    <p className="font-body text-sm text-white/50">{s.motion}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Section Rules */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>CROSS-SECTION RULES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            FIVE RULES FOR THE WHOLE PAGE
          </motion.h2>

          <div className="space-y-3">
            {crossSectionRules.map((r, i) => (
              <motion.div
                key={r.rule}
                className="flex items-start gap-4 p-5 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <Palette size={18} className="text-aom-orange flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-headline text-sm font-bold text-aom-text-light mb-1">{r.rule}</h3>
                  <p className="font-body text-sm text-white/60">{r.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Build Priority */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>BUILD PRIORITY ORDER</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            32-40 HOURS OF BUILD TIME
          </motion.h2>

          <motion.p className="font-body text-base text-white/50 mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            Ordered by visual impact. Diagonal CTA first (replaces the weakest section), footer last (minor adjustments).
          </motion.p>

          <div className="space-y-2">
            {buildPriority.map((bp, i) => (
              <motion.div
                key={bp.num}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.04)}
              >
                <div className="md:col-span-1">
                  <span className="font-headline text-lg font-bold text-aom-orange">{bp.num}</span>
                </div>
                <div className="md:col-span-4">
                  <span className="font-headline text-sm font-bold text-aom-text-light">{bp.section}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-mono text-sm text-[#7C9A72]">{bp.hours}</span>
                </div>
                <div className="md:col-span-5">
                  <span className="font-body text-sm text-white/50">{bp.reason}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-8 p-6 border border-aom-orange/20 bg-aom-orange/[0.05] text-center" {...fadeUp()}>
            <p className="font-headline text-xl md:text-2xl font-bold text-aom-text-light">
              Total estimated: <span className="text-aom-orange">32-40 hours</span> of Bobby build time
            </p>
          </motion.div>
        </div>
      </section>

      {/* Bottom Line */}
      <section className="bg-aom-night-card border-t border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            className="font-headline text-xl md:text-2xl font-bold text-aom-text-light leading-snug max-w-[55ch] mx-auto mb-6"
            {...fadeUp()}
          >
            11 sections. Every layout, motion, hierarchy, and wow moment defined. The brand is locked. We are upgrading execution, not identity.
          </motion.p>
          <motion.p className="font-body text-base text-white/50 max-w-[50ch] mx-auto" {...fadeUp(0.1)}>
            If Ambition's sections hit, that portfolio piece sells every future construction client at $3k/month.
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
