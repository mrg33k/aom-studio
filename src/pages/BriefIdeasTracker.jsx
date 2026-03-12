import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Brain, Circle, Zap, GitBranch, Filter, PanelRight,
  Pencil, Plus, MousePointer, Smartphone, Monitor, Eye,
  Sparkles, Timer, GripVertical, X
} from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Ideas Tracker (Brain Map) | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Neural network brain map design spec for AOM\'s ideas tracker. Glowing nodes, connection lines, filter system, and detail panels on a dark canvas.');
    setMeta('og:title', 'Ideas Tracker: Brain Map Design Spec', true);
    setMeta('og:description', 'A city at night from above. Warm clusters of light connected by thin glowing lines against deep darkness.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/ideas-tracker', true);
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

const categories = [
  { name: 'Product', fill: '#2D1509', glow: '#E85D26', hex: '#E85D26', label: 'Orange' },
  { name: 'Revenue', fill: '#2D2209', glow: '#D4A843', hex: '#D4A843', label: 'Gold' },
  { name: 'System', fill: '#1A2617', glow: '#7C9A72', hex: '#7C9A72', label: 'Sage' },
  { name: 'Content', fill: '#1F1D1A', glow: '#F5F0EB', hex: '#F5F0EB', label: 'Warm White' },
  { name: 'Side-project', fill: '#1A1918', glow: '#78716C', hex: '#78716C', label: 'Muted Stone' },
];

const statuses = [
  { name: 'Seed', hex: '#78716C', intensity: '20%', opacity: '0.70', animation: 'Slow pulse: 4000ms ease-in-out', desc: 'Low-energy, quiet ideas' },
  { name: 'Growing', hex: '#7C9A72', intensity: '40%', opacity: '0.85', animation: 'Medium pulse: 3000ms ease-in-out', desc: 'Building momentum' },
  { name: 'Active', hex: '#E85D26', intensity: '80%', opacity: '1.00', animation: '"Firing" burst + subtle 2500ms pulse', desc: 'Hot, firing, alive' },
  { name: 'Shipped', hex: '#D4A843', intensity: '60%', opacity: '1.00', animation: 'No pulse. Stable glow. 2px gold ring.', desc: 'Complete, stable' },
  { name: 'Parked', hex: '#44403C', intensity: '10%', opacity: '0.50', animation: 'No animation', desc: 'Intentionally dormant' },
];

const connectionTypes = [
  { type: 'feeds', style: 'Solid', thickness: '1.5px', dash: 'None', arrow: 'Yes, 8px triangle', animation: 'Particle flow: 2px dots travel along line, 3000ms per traverse' },
  { type: 'related', style: 'Solid', thickness: '1px', dash: 'None', arrow: 'No', animation: 'Static. No animation.' },
  { type: 'depends', style: 'Dashed', thickness: '1.5px', dash: '4px dash, 4px gap', arrow: 'Yes, 8px triangle', animation: 'Scrolling dashes: stroke-dashoffset shifts, 4000ms per cycle' },
  { type: 'competes', style: 'Dotted', thickness: '1px', dash: '2px dot, 3px gap', arrow: 'No', animation: 'Static. Dotted pattern + red tint is enough.' },
];

const hoverBehavior = [
  { step: '1', label: 'Hovered node', action: 'Full brightness, no change' },
  { step: '2', label: 'Connected nodes', action: 'Brighten to 90% opacity' },
  { step: '3', label: 'Connection lines', action: 'Glow to category color of hovered node, 300ms ease' },
  { step: '4', label: 'Everything else', action: 'Dim to 30% opacity, 300ms ease' },
  { step: '5', label: 'On mouse leave', action: 'Everything returns to default, 400ms ease' },
];

const panelSections = [
  { name: 'Header', details: 'Status badge (top-left), category label, title (Syne 700, 28px), description (Space Grotesk 400, 15px, max 3 lines with "show more")' },
  { name: 'Progress Bar', details: '6px height, 3px radius, track #1A1A17, fill = category glow color, percentage label right-aligned, 400ms ease-out fill transition' },
  { name: 'Milestones', details: '18px circle checkboxes. Pending: 2px solid #292524 hollow. Done: filled category color with checkmark. Line-through on completed text.' },
  { name: 'Connections', details: '8px dot in connected node\'s category color + idea name (clickable, pans to that node) + connection type label right-aligned' },
  { name: 'Meta', details: '2-column grid: Owner/Agent, Created date, Last Activity (relative). JetBrains Mono labels, 9px uppercase.' },
  { name: 'Notes', details: 'Full-width text area, bg #1A1A17, border #292524, focus #44403C. Placeholder: "Add notes..." Min-height 80px, auto-grow.' },
];

const responsiveBreakpoints = [
  { breakpoint: '>= 1024px (Desktop)', canvas: 'Full viewport', panel: 'Right sidebar, 400px, push', filter: 'Horizontal chips', labels: 'Active + shipped visible' },
  { breakpoint: '768-1023px (Tablet)', canvas: 'Full viewport', panel: 'Bottom sheet, 50vh', filter: 'Horizontal scroll', labels: 'Active only' },
  { breakpoint: '< 768px (Mobile)', canvas: 'Full viewport', panel: 'Full-screen takeover', filter: 'Collapsed to button', labels: 'Hidden (tap to show)' },
];

export default function BriefIdeasTracker() {
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
            IDEAS TRACKER
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-4"
            {...fadeUp(0.2)}
          >
            Neural network brain map. Glowing nodes on a dark canvas connected by animated lines. A data visualization that happens to be beautiful.
          </motion.p>

          <motion.p
            className="font-body text-base text-white/40 leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.22)}
          >
            A city at night from above. Warm clusters of light connected by thin glowing lines against deep darkness. Not a project management tool with circles on it. Not a screensaver with no utility.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
              Steffen (Creative Director)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Canvas Background */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>CANVAS ENVIRONMENT</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            THE DARK CANVAS
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { layer: '1. Solid fill', detail: '#0C0C0C (Night). The entire page is dark. No light sections. No cream.' },
              { layer: '2. Dot grid', detail: 'Radial gradient dots, rgba(255,255,255,0.03), 1px radius, 40px x 40px spacing. pointer-events: none.' },
              { layer: '3. Noise overlay', detail: 'SVG feTurbulence fractalNoise, opacity 0.03, mix-blend-mode: overlay. pointer-events: none.' },
              { layer: '4. Connection lines', detail: 'SVG or Canvas layer. All connection types rendered here.' },
              { layer: '5. Nodes', detail: 'Circles with CSS box-shadow glow. GPU-accelerated transforms.' },
              { layer: '6. Labels', detail: 'Node titles and status badges. Lazy-rendered for viewport + 20% buffer only.' },
            ].map((l, i) => (
              <motion.div key={l.layer} className="p-5 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.06)}>
                <p className="font-headline text-sm font-bold text-aom-orange mb-2">{l.layer}</p>
                <p className="font-body text-sm text-white/60">{l.detail}</p>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-8 p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.3)}>
            <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Performance Rules</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                <span className="font-body text-sm text-white/60">All animations use transform and opacity only. No layout thrashing.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                <span className="font-body text-sm text-white/60">CSS box-shadow for glow (GPU-composited). No filter: blur() on many elements.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                <span className="font-body text-sm text-white/60">Canvas preferred for 50+ nodes. SVG acceptable for &lt; 30 nodes.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                <span className="font-body text-sm text-white/60">Target: 60fps on 2020 MacBook Air with 100 nodes and 200 connections.</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Category Colors */}
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
            FIVE CATEGORIES, FIVE GLOW COLORS
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                className="p-5 border border-white/10 bg-white/[0.02] text-center"
                {...fadeUp(i * 0.08)}
              >
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4"
                  style={{
                    backgroundColor: cat.fill,
                    boxShadow: `0 0 12px ${cat.glow}40, 0 0 32px ${cat.glow}20, 0 0 48px ${cat.glow}0a`,
                  }}
                />
                <p className="font-headline text-sm font-bold text-aom-text-light mb-1">{cat.name}</p>
                <p className="font-body text-xs text-white/40">{cat.label}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.fill }} />
                  <span className="font-body text-xs text-white/30">Fill: {cat.fill}</span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.hex }} />
                  <span className="font-body text-xs text-white/30">Glow: {cat.hex}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Status System */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>STATUS VISUAL EFFECTS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            FIVE STATES, DISTINCT BEHAVIORS
          </motion.h2>

          <div className="space-y-4">
            {statuses.map((s, i) => (
              <motion.div
                key={s.name}
                className="p-5 md:p-6 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: `${s.hex}30`,
                      boxShadow: `0 0 8px ${s.hex}40`,
                    }}
                  />
                  <div>
                    <h3 className="font-headline text-base font-bold" style={{ color: s.hex }}>{s.name.toUpperCase()}</h3>
                    <p className="font-body text-sm text-white/40">{s.desc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Glow Intensity</p>
                    <p className="font-body text-sm text-white/60">{s.intensity}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Opacity</p>
                    <p className="font-body text-sm text-white/60">{s.opacity}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Animation</p>
                    <p className="font-body text-sm text-white/60">{s.animation}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Firing Animation Detail */}
          <motion.div className="mt-8 p-6 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp()}>
            <h3 className="font-headline text-base font-bold text-aom-orange mb-3">
              <Zap size={16} className="inline mr-2" />
              "FIRING" ANIMATION (ACTIVE NODES ONLY)
            </h3>
            <ul className="space-y-2">
              <li className="font-body text-sm text-white/60">Radial burst expands outward like a ripple in water</li>
              <li className="font-body text-sm text-white/60">Trigger: every 5000-10000ms (randomized per node, stagger via Math.random() * 5000)</li>
              <li className="font-body text-sm text-white/60">Pseudo-element starts at node size, opacity 0.4, scales to 2.5x, fades to opacity 0</li>
              <li className="font-body text-sm text-white/60">Duration: 800ms, ease-out. CSS @keyframes with transform: scale() and opacity only.</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Node Design */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>NODE DESIGN</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            SHAPE, SIZE, GLOW, LABELS
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <Circle size={16} className="inline mr-2 text-aom-orange" />
                Shape + Size
              </h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Shape: Circle. No border. Glow does the visual work.</li>
                <li className="font-body text-sm text-white/60">Base diameter: 48px</li>
                <li className="font-body text-sm text-white/60">Size scales with progress: 36px (0%) to 64px (100%)</li>
                <li className="font-body text-sm text-aom-orange">Formula: 36 + (progress * 0.28) rounded to nearest px</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <Sparkles size={16} className="inline mr-2 text-aom-orange" />
                Glow Effect
              </h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">CSS box-shadow with multiple layers for soft radial glow</li>
                <li className="font-body text-sm text-white/60">3 layers: inner (8px), mid (24px), outer (48px) at 80% intensity</li>
                <li className="font-body text-sm text-white/60">Intensity multiplied by status (seed 20%, active 80%, etc.)</li>
                <li className="font-body text-sm text-white/60">Shipped nodes: extra 2px solid #D4A843 ring, 4px offset</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.15)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <Eye size={16} className="inline mr-2 text-aom-orange" />
                Labels + Badges
              </h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Title: Syne 700, 13px, centered below node, 8px gap, max-width 100px</li>
                <li className="font-body text-sm text-white/60">Badge: JetBrains Mono 700, 8px, uppercase, centered above node, 6px gap</li>
                <li className="font-body text-sm text-white/60">Desktop: always visible for active + shipped, hover for others</li>
                <li className="font-body text-sm text-white/60">Mobile: hidden by default, shown on tap</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.2)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <Timer size={16} className="inline mr-2 text-aom-orange" />
                Stagnation Modifier
              </h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Ideas with lastActivity &gt; 7 days (not parked/shipped): desaturate</li>
                <li className="font-body text-sm text-white/60">Glow saturation: reduce by 40% (filter: saturate(0.6))</li>
                <li className="font-body text-sm text-white/60">Pulse speed: slow to 6000ms. Node opacity: reduce to 0.65</li>
                <li className="font-body text-sm text-white/60">Transition in: 2000ms ease. Snap back on new activity: 800ms ease.</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Connection Lines */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>CONNECTION LINES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            FOUR LINE TYPES
          </motion.h2>

          <div className="space-y-4">
            {connectionTypes.map((c, i) => (
              <motion.div
                key={c.type}
                className="p-5 md:p-6 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <GitBranch size={18} className="text-aom-orange" />
                  <h3 className="font-headline text-base font-bold text-aom-text-light uppercase">{c.type}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Style</p>
                    <p className="font-body text-sm text-white/60">{c.style}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Thickness</p>
                    <p className="font-body text-sm text-white/60">{c.thickness}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Dash</p>
                    <p className="font-body text-sm text-white/60">{c.dash}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Arrow</p>
                    <p className="font-body text-sm text-white/60">{c.arrow}</p>
                  </div>
                  <div>
                    <p className="font-body text-xs text-white/30 uppercase tracking-wider mb-1">Animation</p>
                    <p className="font-body text-sm text-white/60">{c.animation}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Hover behavior */}
          <motion.div className="mt-10" {...fadeUp()}>
            <h3 className="font-headline text-lg font-bold text-aom-text-light mb-6">
              <MousePointer size={18} className="inline mr-2 text-aom-orange" />
              HOVER BEHAVIOR (CRITICAL INTERACTION)
            </h3>
            <div className="space-y-2">
              {hoverBehavior.map((h, i) => (
                <motion.div
                  key={h.step}
                  className="flex items-start gap-4 p-4 border border-white/10 bg-white/[0.02]"
                  {...fadeUp(i * 0.06)}
                >
                  <span className="font-headline text-lg font-bold text-aom-orange flex-shrink-0">{h.step}.</span>
                  <div>
                    <span className="font-body text-sm font-semibold text-aom-text-light">{h.label}: </span>
                    <span className="font-body text-sm text-white/60">{h.action}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Detail Panel */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>DETAIL PANEL</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            NODE DETAIL VIEW
          </motion.h2>

          <motion.p className="font-body text-base text-white/50 mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            Desktop: right sidebar (400px, pushes canvas). Tablet: bottom sheet (50vh). Mobile: full-screen takeover.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Panel Shell</h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Background: #141412 (Charcoal)</li>
                <li className="font-body text-sm text-white/60">Border-left (desktop): 1px solid #292524</li>
                <li className="font-body text-sm text-white/60">Glow bleed: 4px gradient strip of category color at 30% opacity</li>
                <li className="font-body text-sm text-white/60">Custom scrollbar: track #141412, thumb #292524, width 4px</li>
                <li className="font-body text-sm text-white/60">Open animation: 250ms ease-out translateX</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Close Behavior</h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Click outside panel</li>
                <li className="font-body text-sm text-white/60">Press Escape</li>
                <li className="font-body text-sm text-white/60">Click close button (X icon, 24px, #78716C, hover #F5F0EB)</li>
                <li className="font-body text-sm text-white/60">Mobile: back button or swipe right</li>
              </ul>
            </motion.div>
          </div>

          <motion.h3 className="font-headline text-lg font-bold text-aom-text-light mb-6" {...fadeUp()}>
            PANEL SECTIONS (TOP TO BOTTOM)
          </motion.h3>

          <div className="space-y-3">
            {panelSections.map((s, i) => (
              <motion.div
                key={s.name}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <div className="md:col-span-3">
                  <span className="font-headline text-sm font-bold text-aom-orange">{i + 1}. {s.name}</span>
                </div>
                <div className="md:col-span-9">
                  <span className="font-body text-sm text-white/60">{s.details}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>FILTER BAR</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            FILTER, DON'T REMOVE
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <Filter size={16} className="inline mr-2 text-aom-orange" />
                Position + Layout
              </h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Fixed at top of canvas, z-index 50</li>
                <li className="font-body text-sm text-white/60">Height: 56px desktop, 48px mobile</li>
                <li className="font-body text-sm text-white/60">Background: transparent + backdrop-filter: blur(12px)</li>
                <li className="font-body text-sm text-white/60">Desktop: status chips, vertical divider, category chips</li>
                <li className="font-body text-sm text-white/60">Mobile: single "FILTER" button opens bottom sheet</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <Zap size={16} className="inline mr-2 text-aom-orange" />
                Filter Behavior
              </h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Filtering DIMS, never removes. Non-matching go to 15% opacity.</li>
                <li className="font-body text-sm text-white/60">AND within a group, OR between groups.</li>
                <li className="font-body text-sm text-white/60">Transition: 400ms ease. Smooth, not jarring.</li>
                <li className="font-body text-sm text-white/60">Clear all: small "CLEAR" link, right end of filter bar.</li>
              </ul>
            </motion.div>
          </div>

          {/* Chip styling */}
          <motion.div className="mt-6 p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.2)}>
            <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Chip Styling</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Inactive (Ghost)</p>
                <p className="font-body text-sm text-white/50">Border: 1px solid #292524, text #78716C, JetBrains Mono 700 9px, padding 6px 14px, radius 2px</p>
              </div>
              <div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Active (Filled)</p>
                <p className="font-body text-sm text-white/50">Border: chip color, bg: chip color at 20%, text: full brightness chip color</p>
              </div>
              <div>
                <p className="font-body text-xs text-aom-orange uppercase tracking-wider mb-2">Hover</p>
                <p className="font-body text-sm text-white/50">Border: 1px solid #44403C, text #A8A29E, transition 150ms ease</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Add/Edit UI */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>ADD / EDIT UI</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            CREATE AND MANAGE IDEAS
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <Plus size={16} className="inline mr-2 text-aom-orange" />
                Add Button
              </h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Top-right of canvas, inside filter bar area</li>
                <li className="font-body text-sm text-white/60">Ghost button: border #292524, text #78716C, Plus icon 14px</li>
                <li className="font-body text-sm text-white/60">Hover: border #E85D26, text #E85D26, bg rgba(232,93,38,0.08)</li>
                <li className="font-body text-sm text-white/60">Mobile: icon-only 36px circle</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <Pencil size={16} className="inline mr-2 text-aom-orange" />
                Edit Mode
              </h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/60">Double-click node or tap "EDIT" in panel header</li>
                <li className="font-body text-sm text-white/60">Panel transforms into form, pre-filled with current values</li>
                <li className="font-body text-sm text-white/60">Milestones get X button to delete + "ADD MILESTONE" button</li>
                <li className="font-body text-sm text-white/60">Delete button: ghost style, hover turns red (#EF4444)</li>
              </ul>
            </motion.div>
          </div>

          <motion.div className="mt-6 p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.2)}>
            <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Form Fields</h3>
            <div className="space-y-2">
              {[
                'Title: Full-width text input, bg #1A1A17, border #292524, focus #E85D26',
                'Description: Text area, min-height 80px, auto-grow to 160px',
                'Status: 5 pill selector (same chip styling as filter bar)',
                'Category: 5 pill selector (category glow colors)',
                'Owner: Text input, placeholder "Agent or person name"',
                'Notes: Text area, placeholder "Add notes..."',
              ].map((field, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                  <span className="font-body text-sm text-white/60">{field}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-white/[0.03] border border-white/5">
              <p className="font-body text-sm text-white/50">
                <span className="text-aom-orange font-medium">Save button: </span>
                Full-width, bg #E85D26, text #FDF6EC, Space Grotesk 700, 14px uppercase. Disabled state: bg #292524, text #44403C.
              </p>
            </div>
          </motion.div>

          {/* Quick Connect */}
          <motion.div className="mt-6 p-6 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp(0.3)}>
            <h3 className="font-headline text-base font-bold text-aom-orange mb-3">
              <GitBranch size={16} className="inline mr-2" />
              QUICK-CONNECT (DRAG TO LINK)
            </h3>
            <ul className="space-y-2">
              <li className="font-body text-sm text-white/60">Shift + click-drag from a node. Line extends: 2px dashed #E85D26.</li>
              <li className="font-body text-sm text-white/60">Valid target: node brightens and grows glow 1.2x. Line snaps to center.</li>
              <li className="font-body text-sm text-white/60">Release: dropdown at midpoint with 4 options (FEEDS, RELATED, DEPENDS, COMPETES).</li>
              <li className="font-body text-sm text-white/60">Mobile: no drag. Use "+ CONNECT" button in detail panel instead.</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Responsive + Canvas Interaction */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>RESPONSIVE + INTERACTION</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            EVERY DEVICE, EVERY INPUT
          </motion.h2>

          <div className="space-y-3 mb-10">
            {responsiveBreakpoints.map((bp, i) => (
              <motion.div
                key={bp.breakpoint}
                className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <div className="col-span-2 md:col-span-1">
                  <span className="font-headline text-sm font-bold text-aom-orange">{bp.breakpoint}</span>
                </div>
                <div><span className="font-body text-sm text-white/60">{bp.canvas}</span></div>
                <div><span className="font-body text-sm text-white/60">{bp.panel}</span></div>
                <div><span className="font-body text-sm text-white/60">{bp.filter}</span></div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <Monitor size={16} className="inline mr-2 text-aom-orange" />
                Desktop
              </h3>
              <ul className="space-y-1">
                <li className="font-body text-sm text-white/50">Pan: click and drag (cursor: grab/grabbing)</li>
                <li className="font-body text-sm text-white/50">Zoom: scroll wheel (0.3x to 3x)</li>
                <li className="font-body text-sm text-white/50">Click: opens detail panel</li>
                <li className="font-body text-sm text-white/50">Double-click empty: reset to fit all</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Tablet</h3>
              <ul className="space-y-1">
                <li className="font-body text-sm text-white/50">Pan: single-finger drag</li>
                <li className="font-body text-sm text-white/50">Zoom: pinch gesture</li>
                <li className="font-body text-sm text-white/50">Tap: opens bottom sheet panel</li>
                <li className="font-body text-sm text-white/50">Long-press: shows label + badge for 2s</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.2)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">
                <Smartphone size={16} className="inline mr-2 text-aom-orange" />
                Mobile
              </h3>
              <ul className="space-y-1">
                <li className="font-body text-sm text-white/50">Pan: single-finger drag</li>
                <li className="font-body text-sm text-white/50">Zoom: pinch (same limits)</li>
                <li className="font-body text-sm text-white/50">First tap: show label. Second tap: open detail</li>
                <li className="font-body text-sm text-white/50">Touch target: min 44x44px per node</li>
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
              { num: '1', title: 'THE GLOW', desc: 'Each node is a warm light source. Category color + status intensity + firing animation for active. Get the glow layering right and everything else follows.' },
              { num: '2', title: 'THE HOVER', desc: 'When you hover a node, its connections light up and everything else dims. 300ms in, 400ms out. This is how Patrik reads the relationship web.' },
              { num: '3', title: 'THE FIRING BURSTS', desc: 'Randomized radial ripples on active nodes. Staggered so they don\'t sync. This is the heartbeat of the canvas.' },
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
            One dark page, one living canvas. Glowing nodes on #0C0C0C. Five category colors. Five status states. Every value specified. Build pixel-perfect.
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
