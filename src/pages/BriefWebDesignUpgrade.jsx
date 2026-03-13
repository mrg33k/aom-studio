import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Layout, Monitor, Palette, Code, Globe,
  AlertTriangle, CheckCircle, Layers, Zap, Eye, MousePointer
} from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Web Design Upgrade Brief | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Research on Aceternity UI, Magic UI, construction site design patterns, and anti-AI-slop techniques for AOM web builds.');
    setMeta('og:title', 'Web Design Upgrade: Component Libraries, Construction Patterns, Anti-Slop', true);
    setMeta('og:description', 'Arming Bobby and Steffen to build construction sites that seriously hit. Aceternity, Magic UI, award-winning references, and explicit anti-patterns.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/web-design-upgrade', true);
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

const corePhilosophy = [
  { principle: 'Bold Typography', detail: 'Distinctive, characterful, never generic. No Inter/Roboto/Arial defaults.' },
  { principle: 'Unexpected Layouts', detail: 'Asymmetry, overlap, grid-breaking, diagonal flow. Break the rectangle.' },
  { principle: 'Purposeful Motion', detail: 'Staggered reveals, scroll-triggered, high-impact moments over scattered micro-interactions.' },
  { principle: 'Atmosphere', detail: 'Gradient meshes, noise textures, dramatic shadows, grain overlays. Depth without weight.' },
  { principle: 'Anti-AI-Slop', detail: 'No purple gradients, no cookie-cutter patterns, no "hero + 3-column cards + testimonial + footer."' },
];

const aceternityCoolComponents = [
  { name: 'Hero Parallax', use: 'Full-bleed hero with multi-speed background layers. The highest-impact first impression for construction sites.' },
  { name: 'Spotlight', use: 'Radial light following mouse position on dark backgrounds. Adds a living feel without being heavy.' },
  { name: 'Parallax Scroll Grid', use: 'Items at different scroll speeds. Perfect for portfolio sections with varied project sizes.' },
  { name: '3D Card Effect', use: 'Subtle tilt on mouse position. Upgrades any card hover from flat to tactile.' },
  { name: 'Tracing Beam', use: 'Line that traces down the page as you scroll. Creates a visual throughline for long-form content.' },
  { name: 'Background Beams', use: 'Animated light rays behind content. Best used sparingly on dark hero sections.' },
];

const magicUIComponents = [
  { name: 'Text Reveal', use: 'Word-by-word fade-in on scroll entry. Elegant for section headings without being heavy.' },
  { name: 'Scroll Based Velocity', use: 'Horizontal text strip that speeds up on faster scroll. Adds energy to section transitions.' },
  { name: 'Marquee', use: 'Infinite horizontal scroll for client logos or trust badges. Better than static logo rows.' },
  { name: 'Scroll Progress', use: 'Top-of-page progress bar tied to scroll position. Useful for long pages.' },
];

const constructionPatterns = [
  { pattern: 'Full-bleed project photography', detail: 'Not thumbnail grids. Large, immersive images of actual job sites.', source: 'Turner, Clark' },
  { pattern: 'Animated stat counters', detail: 'Trust numbers that count up on scroll. "500+ projects" hits harder when it counts.', source: 'PCL, Kiewit' },
  { pattern: 'Video backgrounds', detail: 'Active job sites in motion. Conveys scale and capability instantly.', source: 'Turner, PCL' },
  { pattern: 'Before/after sliders', detail: 'Renovation and install transformations. Visual proof of work quality.', source: 'B&G' },
  { pattern: 'Audience segmentation', detail: 'Clients, job seekers, communities. Clear paths from the first click.', source: 'Turner, Skanska' },
  { pattern: 'Dark/light alternation', detail: 'Varied section heights with background alternation. Creates visual tempo.', source: 'All top sites' },
];

const antiPatterns = [
  '3-column equal card grids (the default lazy layout)',
  'Stock photos of hard hats and handshakes',
  'Same-height sections with identical padding',
  'Predictable left-right alternation (image left / text right / image left / text right)',
  'Carousel hero sliders with dot navigation',
  'Inter/Roboto/Arial as the only font',
  'Purple gradients (the universal AI-generated tell)',
  'Cookie-cutter "hero + 3 cards + testimonial + footer" structure',
];

const componentPatternTable = [
  { component: 'Hero Parallax', library: 'Aceternity', bestFor: 'Landing pages, construction portfolio' },
  { component: 'Spotlight', library: 'Aceternity', bestFor: 'Dark hero backgrounds, tech pages' },
  { component: 'Before/After Slider', library: 'Custom', bestFor: 'Renovation projects, install reveals' },
  { component: 'Animated Counter', library: 'Custom/Framer', bestFor: 'Stats sections, trust numbers' },
  { component: 'Diagonal CTA', library: 'Custom CSS', bestFor: 'Mid-page conversion breaks' },
  { component: 'Staggered Grid', library: 'Framer Motion', bestFor: 'Services, project cards' },
  { component: 'Timeline', library: 'Custom', bestFor: 'Company history, project phases' },
  { component: 'Testimonial Carousel', library: 'Framer Motion', bestFor: 'Social proof sections' },
  { component: 'Tracing Beam', library: 'Aceternity', bestFor: 'Long-form content, process pages' },
  { component: 'Parallax Image Strip', library: 'Aceternity', bestFor: 'Full-width visual breaks' },
  { component: 'Scroll Velocity Text', library: 'Magic UI', bestFor: 'Section transitions, energy' },
  { component: '3D Tilt Card', library: 'Aceternity', bestFor: 'Portfolio cards, service cards' },
];

const referenceSites = [
  { name: 'Turner Construction', url: 'turnerconstruction.com', strength: 'HD video hero, audience segmentation, generous white space' },
  { name: 'PCL Construction', url: 'pcl.com', strength: 'Premium slide transitions, pre-loading screens, video-first marketing' },
  { name: 'Clark Construction', url: 'clarkconstruction.com', strength: 'Striking imagery balanced with smooth navigation' },
  { name: 'Kiewit', url: 'kiewit.com', strength: 'Anticipation-building transitions, industry-specific imagery per section' },
  { name: 'Skanska', url: 'skanska.com', strength: 'Confidence through simplicity. Owned "Skanska blue"' },
  { name: 'Brasfield & Gorrie', url: 'brasfieldgorrie.com', strength: 'Legacy brand (est. 1964) modernized by Matchstic. Ampersand as graphic element.' },
];

const recommendations = [
  { num: '1', rec: 'Study Aceternity Hero Parallax, Spotlight, and 3D Card components before the next Ambition build session.' },
  { num: '2', rec: 'Write section-level design specs for every page section before Bobby rebuilds them.' },
  { num: '3', rec: 'No new packages needed. Aceternity and Magic UI are copy-paste. Framer Motion is already in the stack.' },
  { num: '4', rec: 'The /v2 redesign is the perfect canvas. Build new sections right from the start, don\'t retrofit.' },
  { num: '5', rec: 'The Ambition site is the proving ground. If those sections hit, it sells every future construction client.' },
];

export default function BriefWebDesignUpgrade() {
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
            <SectionKicker>RESEARCH BRIEF / MARCH 12, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            WEB DESIGN UPGRADE
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-4"
            {...fadeUp(0.2)}
          >
            Arming Bobby and Steffen to build construction sites that seriously hit. Component libraries, design patterns, anti-slop techniques, and 6 award-winning reference sites.
          </motion.p>

          <motion.p
            className="font-body text-base text-white/40 leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.22)}
          >
            The upgrade is in technique and intention, not tooling. No new packages needed. Aceternity and Magic UI are copy-paste. Framer Motion is already in the stack.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#22d3ee]" />
              Elon (System/Infrastructure)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Core Philosophy */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>CORE PHILOSOPHY</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            FIVE PRINCIPLES FROM THE ANTHROPIC DESIGN SKILL
          </motion.h2>

          <div className="space-y-3">
            {corePhilosophy.map((p, i) => (
              <motion.div
                key={p.principle}
                className="flex items-start gap-4 p-5 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <Sparkles size={18} className="text-aom-orange flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-headline text-sm font-bold text-aom-text-light mb-1">{p.principle}</h3>
                  <p className="font-body text-sm text-white/60">{p.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Aceternity UI */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>ACETERNITY UI</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            200+ COMPONENTS, SIX KEY PICKS
          </motion.h2>

          <motion.p className="font-body text-base text-white/50 mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            React + Tailwind + Framer Motion. Copy-paste ready. Best for landing pages and marketing sites with high-impact animations.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aceternityCoolComponents.map((c, i) => (
              <motion.div key={c.name} className="p-5 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.06)}>
                <h3 className="font-headline text-sm font-bold text-aom-orange mb-2">{c.name}</h3>
                <p className="font-body text-sm text-white/60">{c.use}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Magic UI */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>MAGIC UI</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            LIGHTER-WEIGHT ACCENT ANIMATIONS
          </motion.h2>

          <motion.p className="font-body text-base text-white/50 mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            Clean and minimal. Best for text effects, scroll indicators, and accent animations that don't compete with content.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {magicUIComponents.map((c, i) => (
              <motion.div key={c.name} className="p-5 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.06)}>
                <h3 className="font-headline text-sm font-bold text-aom-orange mb-2">{c.name}</h3>
                <p className="font-body text-sm text-white/60">{c.use}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Construction Site Patterns */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>CONSTRUCTION SITE PATTERNS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT THE BEST SITES DO
          </motion.h2>

          <div className="space-y-3">
            {constructionPatterns.map((p, i) => (
              <motion.div
                key={p.pattern}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <div className="md:col-span-4">
                  <span className="font-headline text-sm font-bold text-aom-text-light">{p.pattern}</span>
                </div>
                <div className="md:col-span-6">
                  <span className="font-body text-sm text-white/60">{p.detail}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-mono text-xs text-[#7C9A72]">{p.source}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Anti-Patterns */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>ANTI-PATTERNS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT TO NEVER BUILD
          </motion.h2>

          <div className="space-y-2">
            {antiPatterns.map((ap, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.05)}
              >
                <AlertTriangle size={16} className="text-[#CC3F00] flex-shrink-0 mt-0.5" />
                <span className="font-body text-sm text-white/60">{ap}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Component Pattern Table */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>PATTERN REFERENCE TABLE</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            12 COMPONENTS BOBBY SHOULD KNOW
          </motion.h2>

          <div className="space-y-2">
            {componentPatternTable.map((c, i) => (
              <motion.div
                key={c.component}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.04)}
              >
                <div className="md:col-span-4">
                  <span className="font-body text-sm text-aom-orange">{c.component}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="font-mono text-xs text-white/40">{c.library}</span>
                </div>
                <div className="md:col-span-5">
                  <span className="font-body text-sm text-white/60">{c.bestFor}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reference Sites */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>REFERENCE SITES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            SIX SITES BOBBY SHOULD STUDY
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {referenceSites.map((site, i) => (
              <motion.div key={site.name} className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.08)}>
                <h3 className="font-headline text-base font-bold text-aom-text-light mb-1">{site.name}</h3>
                <p className="font-mono text-xs text-aom-orange mb-3">{site.url}</p>
                <p className="font-body text-sm text-white/60">{site.strength}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="bg-aom-night border-y border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>RECOMMENDATIONS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            FIVE ACTION ITEMS
          </motion.h2>

          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <motion.div
                key={r.num}
                className="flex items-start gap-4 p-5 border border-aom-orange/20 bg-aom-orange/[0.04]"
                {...fadeUp(i * 0.08)}
              >
                <span className="font-headline text-2xl font-bold text-aom-orange/40 flex-shrink-0">{r.num}</span>
                <p className="font-body text-base text-white/70 leading-relaxed">{r.rec}</p>
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
            The upgrade is in technique and intention, not tooling. No new packages. Aceternity and Magic UI are copy-paste. Framer Motion is already in the stack.
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
          Research brief by Elon (System/Infrastructure). March 12, 2026.
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
