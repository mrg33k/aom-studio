import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Monitor, Layers, MousePointer, MessageCircle, Navigation,
  ChevronDown, Film, HardHat, Cpu, Quote, Mail, Phone, MapPin,
  Eye, Palette, Type, Smartphone, Accessibility, Sparkles, ArrowRight
} from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Full-Screen Site Redesign | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Full-screen site redesign spec for aheadofmarket.com. 8-slide scroll-snap pitch deck experience with CSS-native navigation and cinematic transitions.');
    setMeta('og:title', 'Full-Screen Site Redesign: AOM Design Spec', true);
    setMeta('og:description', '8 slides, one narrative arc. Scroll-snap, staggered animations, and a cinematic pitch deck experience.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/fullscreen-site', true);
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

const designDecisions = [
  { question: 'Animation on revisit', answer: 'Animate on EVERY visit to a slide, not just first view. Keep animations subtle and fast on revisit (300ms vs 400ms initial). The stagger is the magic.', reasoning: 'The scroll-snap model means users navigate back and forth. Dead slides feel broken.' },
  { question: 'Portfolio format (Slide 3)', answer: 'Full-bleed auto-playing reel with 3-4 thumbnail selectors below. Not a grid.', reasoning: 'The pitch deck format demands showstopper moments. A grid is "website energy." A full-bleed reel is "keynote energy."' },
  { question: 'All backgrounds', answer: 'All dark. No cream slide.', reasoning: '8 slides don\'t need cream/dark rhythm. Staying all-dark keeps the cinematic quality. Cream would feel jarring in a short sequence.' },
  { question: 'Mobile snap behavior', answer: 'Strict snap (scroll-snap-type: y mandatory). Each swipe = exactly one slide.', reasoning: 'Relaxed snap creates "did it land?" uncertainty. Mandatory snap is decisive. Matches pitch deck energy.' },
  { question: 'Pattern strips', answer: 'No pattern strips between slides. Save for "keep exploring" section only.', reasoning: '8 slides with no sections to divide. Pattern strips would create visual noise at full-viewport scale.' },
  { question: 'Vignette', answer: 'Hero only.', reasoning: 'Consistent vignette across all slides dulls the effect. Content slides have controlled backgrounds. Keep it special.' },
  { question: 'Contact button icon', answer: 'Chat bubble (Lucide MessageCircle). Not phone.', reasoning: 'Phone icon implies "call now" which creates friction. Chat bubble says "let\'s talk" which is warmer and lower commitment.' },
  { question: 'Contact button label', answer: 'Show "Let\'s Talk" label on first appearance, collapse to icon after 3 seconds.', reasoning: 'The label gives context on first visit. After that, the orange circle is recognizable. The collapse animation is a micro-delight.' },
  { question: 'Progress indicator', answer: 'Dots with thin connecting line. Active dot 10px, inactive 6px. Hidden on Slide 1.', reasoning: 'Size change gives clear "you are here" signal without relying on color alone (accessibility). Hiding on Slide 1 gives full immersion.' },
];

const slideBackgrounds = [
  { slide: '1. Hero', bg: 'Night', hex: '#0C0C0C', notes: 'Darkest. Video overlay on top.' },
  { slide: '2. Hook', bg: 'Night Card', hex: '#151515', notes: 'Slightly elevated from hero. Stats pop.' },
  { slide: '3. Work', bg: 'Night', hex: '#0C0C0C', notes: 'Back to darkest. Portfolio fills the frame.' },
  { slide: '4. Services', bg: 'Deep Warm', hex: '#1A1A17', notes: 'Warmest dark. Cards float above it.' },
  { slide: '5. Construction', bg: 'Night', hex: '#0C0C0C', notes: 'Dark and bold. Orange dominates.' },
  { slide: '6. AI Advisory', bg: 'Night Card', hex: '#151515', notes: 'Sage green differentiates this slide.' },
  { slide: '7. Social Proof', bg: 'Deep Warm', hex: '#1A1A17', notes: 'Warm base for trust.' },
  { slide: '8. Contact', bg: 'Night', hex: '#0C0C0C', notes: 'Return to darkest. CTA gets full contrast.' },
];

const slides = [
  {
    num: '01',
    title: 'HERO',
    emotion: 'Feel something. This isn\'t another agency.',
    icon: Film,
    details: [
      'Full-viewport video via Gumlet iframe, edge-to-edge',
      'Dark overlay: rgba(12,12,12,0.50) over video',
      'Vignette: radial-gradient(ellipse at center, transparent 30%, #0C0C0C 100%)',
      'Film grain overlay: SVG fractalNoise, opacity 0.03',
      'Micro-label: "CREATIVE PRODUCTION + AI SYSTEMS"',
      'Headline: "WE MAKE COMPANIES IMPOSSIBLE TO IGNORE."',
      'Status bar at bottom: PHOENIX, AZ / VIDEO / WEB / SOCIAL / SYSTEMS / EST. 2020',
      'Down arrow with float animation (2s ease-in-out infinite)',
      'Nav bar: semi-transparent rgba(12,12,12,0.4) with backdrop-filter: blur(12px)',
    ],
    animation: 'Micro-label: fade up 20px, 0ms. Headline: 150ms. Subhead: 300ms. Status bar: fade in 600ms. Arrow: 800ms.',
  },
  {
    num: '02',
    title: 'THE HOOK',
    emotion: 'We already know what you\'re tired of. Trust us.',
    icon: Sparkles,
    details: [
      'Split layout: 55% left, 45% right. Gap: 64px.',
      'Left: "WHY AOM" label + "SMALL TEAM. CINEMA-GRADE. NO BS." headline',
      'Body: "No layers of account managers. No scope creep. You talk to the people doing the work."',
      'Right: 4 stat blocks in 2x2 grid',
      'Stats: "24-72HR" / Fast Turnarounds, "CINEMA" / Production Quality',
      '"PREDICTABLE" / Delivery Timeline, "REPEATABLE" / Brand Consistency',
      'Stat blocks: subtle left border 2px solid rgba(232,93,38,0.2), padding-left 20px',
      'Stat numbers: Syne 900, 56px, #E85D26',
    ],
    animation: 'Label/headline/body: stagger 100ms, fade up 15px. Stats: stagger left-to-right top-to-bottom, 300ms start.',
  },
  {
    num: '03',
    title: 'THE WORK',
    emotion: 'Stop reading. Watch this.',
    icon: Eye,
    details: [
      'Video reel fills 85% of viewport height, centered',
      'Overlay: rgba(12,12,12,0.35)',
      'Top-left label: "THE WORK" in micro-label style',
      'Client name overlay: bottom-left of video area with text-shadow',
      'Industry tag below client name in micro-label style',
      '4 thumbnail selectors at bottom, centered, 80x56px (16:9)',
      'Active thumbnail: 2px solid #E85D26',
      'Inactive: 2px solid rgba(255,255,255,0.1), hover rgba(255,255,255,0.25)',
    ],
    animation: 'Label: fade in 0ms. Reel: fade in 100ms, 500ms. Client name: fade up 10px 400ms. Thumbnails: stagger 80ms.',
  },
  {
    num: '04',
    title: 'SERVICES',
    emotion: 'Here\'s what we do. Pick your lane.',
    icon: Layers,
    details: [
      '"WHAT WE DO" micro-label, centered',
      '3 pathway cards in a row, gap 24px, max 380px each',
      'Card 1: Construction (HardHat icon) - social media for builders',
      'Card 2: Brands + Corporate (Film icon) - video production',
      'Card 3: Digital + Systems (Monitor icon) - websites + AI',
      'Card: bg rgba(255,255,255,0.03), border 1px solid rgba(255,255,255,0.08)',
      'Card hover: border rgba(232,93,38,0.3), bg rgba(255,255,255,0.05)',
      'CTA arrow shifts right 4px on hover',
    ],
    animation: 'Label + headline: stagger 100ms. Cards: stagger 120ms apart, fade up 25px, 250ms start.',
  },
  {
    num: '05',
    title: 'CONSTRUCTION',
    emotion: 'We know YOUR world. Not just marketing. Your world.',
    icon: HardHat,
    details: [
      'Split layout: 50/50. Gap: 48px.',
      '"CONSTRUCTION" label in orange (not muted)',
      'Headline: "YOUR CREWS BUILD IT. WE MAKE SURE PEOPLE SEE IT."',
      '2-3 proof points with orange dots (6px circles)',
      'CTA: "START A PROJECT" primary orange button',
      'Right side: single image/video loop, 4:5 portrait ratio',
      'Image: 2px solid #292524 border, hover shifts to orange glow',
    ],
    animation: 'Left: stagger top-to-bottom 100ms. Right media: fade in + scale 0.97 to 1.0, 300ms delay.',
  },
  {
    num: '06',
    title: 'AI ADVISORY',
    emotion: 'We\'re building something new. You can be first.',
    icon: Cpu,
    details: [
      'Two sections: 40% left headline, 60% right steps. Gap: 64px.',
      '"AI OPERATIONS" label in sage green (#7C9A72)',
      'Headline: "THE NEXT GEEK SQUAD FOR AI."',
      'Price callout: "Starting at $2,500" in Syne 800, 28px, sage',
      'Deep dive link: "EXPLORE THE SYSTEM" with ArrowRight, links to /system',
      '3 step cards stacked: AUDIT / SETUP / PLATFORM',
      'Step cards: bg rgba(124,154,114,0.05), border rgba(124,154,114,0.12)',
      'Step hover: border rgba(124,154,114,0.25), bg rgba(124,154,114,0.08)',
    ],
    animation: 'Left: stagger 100ms. Step cards: stagger 120ms, 300ms start, fade up 20px.',
  },
  {
    num: '07',
    title: 'SOCIAL PROOF',
    emotion: 'Don\'t take our word for it.',
    icon: Quote,
    details: [
      '"WHAT THEY SAY" micro-label, centered',
      '2-3 testimonial cards in a row, gap 24px',
      'Card: large open-quote in Syne 800 48px, #E85D26 opacity 0.4',
      'Quote text: Space Grotesk 400, 18px, italic',
      'Metric below quote: Syne 800, 32px, #E85D26',
      'Divider, then name + company + industry',
      'Optional client logo row below: grayscale, opacity 0.5, hover: full color',
    ],
    animation: 'Label + headline: stagger 100ms. Cards: stagger 150ms, 250ms start, fade up 25px. Logos: fade in 600ms.',
  },
  {
    num: '08',
    title: 'CONTACT / CTA',
    emotion: 'You made it. Let\'s do this.',
    icon: Mail,
    details: [
      'Split layout: 45% left (headline + info), 55% right (form). Gap: 64px.',
      'Headline: "LET\'S BUILD SOMETHING." Syne 900, 64px',
      'Phone + email + location info on left',
      'Form: Name, Email, Service (pill selector), Budget (pills), Timeline (pills)',
      'All inputs: bottom-border style, 2px solid, focus orange',
      'Selected pill: bg #E85D26, text #FDF6EC',
      'Submit: "START BRIEF" full orange CTA, Syne 800, 16px uppercase',
      'Film grain active on this slide',
    ],
    animation: 'Left: stagger 100ms. Form fields: stagger 80ms, 300ms start. Submit: fade up 20px, 700ms delay.',
  },
];

const colorPalette = [
  { name: 'Orange', hex: '#E85D26', usage: 'CTAs, stats, active states, progress, contact button' },
  { name: 'Orange Hover', hex: '#D14E1C', usage: 'Button hover state' },
  { name: 'Orange Glow', hex: 'rgba(232,93,38,0.15)', usage: 'Button shadow, card glow borders' },
  { name: 'Sage', hex: '#7C9A72', usage: 'AI Advisory slide accent' },
  { name: 'Sage Glow', hex: 'rgba(124,154,114,0.15)', usage: 'AI card borders on hover' },
  { name: 'Gold', hex: '#C9A84C', usage: 'Status badges, "keep exploring" accent' },
  { name: 'Cream', hex: '#FDF6EC', usage: 'Primary headline text' },
  { name: 'Text Light', hex: '#F0ECE6', usage: 'Secondary headline text' },
  { name: 'Text Muted', hex: '#8A847C', usage: 'Body text, micro labels' },
];

const progressSpec = [
  { label: 'Desktop position', value: 'Right side, vertically centered, right: 28px, z-index: 40' },
  { label: 'Visibility', value: 'Hidden on Slide 1, visible Slides 2-8, hidden in "keep exploring"' },
  { label: 'Inactive dot', value: '6px circle, #292524, opacity 0.6' },
  { label: 'Active dot', value: '10px circle, #E85D26, box-shadow: 0 0 8px rgba(232,93,38,0.4)' },
  { label: 'Connecting line', value: '1px vertical, #292524 base, #E85D26 fill up to active dot' },
  { label: 'Hover tooltip', value: 'Slides out to LEFT, Space Grotesk 500, 12px, backdrop-filter: blur(8px)' },
  { label: 'Mobile', value: 'Horizontal dot rail at bottom, 32px pill with backdrop-blur, no tooltips' },
];

const contactButtonSpec = [
  { label: 'Size', value: '56px circle desktop, 48px mobile' },
  { label: 'Color', value: '#E85D26 bg, white MessageCircle icon' },
  { label: 'Entry', value: '2000ms delay, fade in + slide up 20px, single pulse' },
  { label: 'Label', value: '"Let\'s Talk" text collapses to icon-only after 3 seconds' },
  { label: 'Visibility', value: 'Visible Slides 1-7, hidden on Slide 8 (form is inline)' },
];

const breakpoints = [
  { size: '> 1280px', label: 'Large Desktop', changes: 'Full experience. Content max-width: 1200px. Split layouts 50/50 or 55/45.' },
  { size: '1024-1279px', label: 'Desktop', changes: 'Same layout. Content max-width: 1000px. Slight padding reduction.' },
  { size: '768-1023px', label: 'Tablet', changes: 'Splits collapse to stacked. Cards stay in row if 2, stack if 3. Dot nav right side.' },
  { size: '< 768px', label: 'Mobile', changes: 'Everything single-column. Dot nav bottom-center horizontal. Hamburger menu. 100dvh slides.' },
  { size: '< 480px', label: 'Small Mobile', changes: 'Headline sizes at minimum. Slide padding 0 20px. Status bar may wrap.' },
];

export default function BriefFullscreenSite() {
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
            FULL-SCREEN SITE REDESIGN
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-4"
            {...fadeUp(0.2)}
          >
            8-slide scroll-snap pitch deck experience. CSS-native mandatory snap, staggered content animations, and cinematic transitions. Every slide has ONE job.
          </motion.p>

          <motion.p
            className="font-body text-base text-white/40 leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.22)}
          >
            Brand system: Bold Graphic v4. Fonts: Syne + Space Grotesk + JetBrains Mono.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
              Steffen (Creative Director)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Design Decisions */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>STEFFEN'S DESIGN DECISIONS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            ALL OPEN QUESTIONS RESOLVED
          </motion.h2>

          <motion.p className="font-body text-base text-white/50 mb-10" {...fadeUp(0.15)}>
            No ambiguity. Every visual decision made before build begins.
          </motion.p>

          <div className="space-y-4">
            {designDecisions.map((d, i) => (
              <motion.div
                key={d.question}
                className="p-5 md:p-6 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <h3 className="font-headline text-base font-bold text-aom-text-light mb-2">{d.question}</h3>
                <p className="font-body text-base text-aom-orange leading-relaxed mb-2">{d.answer}</p>
                <p className="font-body text-sm text-white/40 italic">{d.reasoning}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Color Palette */}
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
            SLIDE BACKGROUNDS + ACCENTS
          </motion.h2>

          {/* Slide backgrounds */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {slideBackgrounds.map((s, i) => (
              <motion.div
                key={s.slide}
                className="p-5 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.05)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 border border-white/20" style={{ backgroundColor: s.hex }} />
                  <div>
                    <p className="font-body text-sm font-semibold text-aom-text-light">{s.slide}</p>
                    <p className="font-body text-xs text-white/40">{s.hex}</p>
                  </div>
                </div>
                <p className="font-body text-xs text-white/50">{s.notes}</p>
              </motion.div>
            ))}
          </div>

          {/* Accent colors */}
          <motion.h3 className="font-headline text-lg font-bold text-aom-text-light mb-6" {...fadeUp()}>
            ACCENT COLORS
          </motion.h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {colorPalette.map((c, i) => (
              <motion.div
                key={c.name}
                className="flex items-center gap-4 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <div
                  className="w-10 h-10 flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: c.hex.startsWith('rgba') ? c.hex : c.hex }}
                />
                <div>
                  <p className="font-body text-sm font-semibold text-aom-text-light">{c.name}</p>
                  <p className="font-body text-xs text-white/40">{c.usage}</p>
                </div>
              </motion.div>
            ))}
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
            TYPE SCALE PER SLIDE
          </motion.h2>

          <div className="space-y-4">
            {[
              { element: 'Hero Headline', font: 'Syne 900', desktop: '80px', mobile: '44px', color: '#FDF6EC', tracking: '-0.03em' },
              { element: 'Section Headline', font: 'Syne 800', desktop: '52px', mobile: '34px', color: '#FDF6EC', tracking: '-0.03em' },
              { element: 'Body Text', font: 'Space Grotesk 400', desktop: '18px', mobile: '16px', color: '#8A847C', tracking: '0' },
              { element: 'Stat Number', font: 'Syne 900', desktop: '56px', mobile: '40px', color: '#E85D26', tracking: '-0.02em' },
              { element: 'Card Title', font: 'Space Grotesk 600', desktop: '20px', mobile: '18px', color: '#F0ECE6', tracking: '0' },
              { element: 'Micro Label', font: 'JetBrains Mono 700', desktop: '12px', mobile: '11px', color: '#8A847C', tracking: '0.2em' },
              { element: 'Contact Headline', font: 'Syne 900', desktop: '64px', mobile: '40px', color: '#FDF6EC', tracking: '-0.03em' },
              { element: 'Form Input', font: 'Space Grotesk 400', desktop: '18px', mobile: '16px', color: '#FDF6EC', tracking: '0' },
            ].map((t, i) => (
              <motion.div
                key={t.element}
                className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 border border-white/10 bg-white/[0.02] items-center"
                {...fadeUp(i * 0.04)}
              >
                <span className="font-headline text-sm font-bold text-aom-text-light md:col-span-2">{t.element}</span>
                <span className="font-body text-sm text-white/50">{t.font}</span>
                <span className="font-body text-sm text-aom-orange">{t.desktop} / {t.mobile}</span>
                <span className="font-body text-sm text-white/40">tracking: {t.tracking}</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-white/20" style={{ backgroundColor: t.color }} />
                  <span className="font-body text-xs text-white/40">{t.color}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Spacing System */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SPACING SYSTEM</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            GLOBAL SPACING RULES
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Slide padding (desktop)', value: '0 96px left/right' },
              { label: 'Slide padding (tablet)', value: '0 48px' },
              { label: 'Slide padding (mobile)', value: '0 24px' },
              { label: 'Content max-width', value: '1200px centered' },
              { label: 'Text max-width', value: '65ch (body text line length cap)' },
              { label: 'Headline to body gap', value: '24px' },
              { label: 'Body to CTA gap', value: '40px' },
              { label: 'Stat block gap', value: '48px desktop, 32px mobile' },
              { label: 'Card grid gap', value: '24px desktop, 16px mobile' },
              { label: 'Card internal padding', value: '32px desktop, 24px mobile' },
              { label: 'Content vertical position', value: 'Flexbox align-items: center (middle 60%)' },
              { label: 'Top safe zone', value: 'Min 80px from viewport top' },
              { label: 'Bottom safe zone', value: 'Min 48px from viewport bottom' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                className="flex items-center justify-between p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.04)}
              >
                <span className="font-body text-sm text-white/60">{s.label}</span>
                <span className="font-body text-sm text-aom-orange font-medium">{s.value}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide-by-Slide */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SLIDE-BY-SLIDE DESIGN</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            8 SLIDES, 8 JOBS
          </motion.h2>

          <div className="space-y-6">
            {slides.map((slide, i) => {
              const Icon = slide.icon;
              return (
                <motion.div
                  key={slide.num}
                  className="p-6 md:p-8 border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors"
                  {...fadeUp(i * 0.08)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <span className="font-headline text-3xl md:text-4xl font-bold text-aom-orange/30">{slide.num}</span>
                    <div className="w-10 h-10 flex items-center justify-center border border-white/10 text-aom-orange">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-headline text-lg font-bold text-aom-text-light">{slide.title}</h3>
                      <p className="font-body text-sm text-white/40 italic">"{slide.emotion}"</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {slide.details.map((d, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                        <span className="font-body text-sm text-white/60">{d}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="p-3 bg-white/[0.03] border border-white/5">
                    <p className="font-body text-xs text-white/40">
                      <span className="text-aom-orange font-medium">Animation: </span>{slide.animation}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Keep Exploring Section */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>BELOW THE FOLD</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-4"
            {...fadeUp(0.1)}
          >
            "KEEP EXPLORING" SECTION
          </motion.h2>

          <motion.p className="font-body text-base text-white/50 mb-10 max-w-[55ch]" {...fadeUp(0.15)}>
            After Slide 8, the scroll-snap container ends. Traditional scrollable section with link cards.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Transition', detail: 'Pattern strip divider (6px, diagonal lines, rgba(232,93,38,0.08)), then background shifts to #141412 (Charcoal)' },
              { label: 'Headline', detail: '"KEEP EXPLORING" or "GO DEEPER" in Syne 700, 32px, #8A847C (muted, not grabbing attention)' },
              { label: 'Layout', detail: '2 columns desktop, 1 column mobile, gap 24px, max-width 960px centered' },
              { label: 'Cards', detail: 'bg rgba(255,255,255,0.03), border rgba(255,255,255,0.06), hover: border orange, ArrowUpRight icon' },
              { label: 'Suggested links', detail: 'Case Studies, The System (/system), Briefs Hub (/briefs), AI Advisory Sprint Plan, About AOM, FAQ' },
              { label: 'Footer', detail: 'Minimal: AOM logo (24px), copyright, social links in #8A847C, hover orange' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="p-5 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <h4 className="font-headline text-sm font-bold text-aom-orange mb-2">{item.label}</h4>
                <p className="font-body text-sm text-white/60">{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Progress Indicator + Contact Button */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>UI COMPONENTS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            PROGRESS INDICATOR + CONTACT BUTTON
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <motion.h3 className="font-headline text-lg font-bold text-aom-text-light mb-4" {...fadeUp()}>
                <Navigation size={18} className="inline mr-2 text-aom-orange" />
                Progress Dots
              </motion.h3>
              <div className="space-y-3">
                {progressSpec.map((s, i) => (
                  <motion.div key={s.label} className="p-4 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.06)}>
                    <p className="font-body text-xs text-aom-orange font-medium uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="font-body text-sm text-white/60">{s.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <motion.h3 className="font-headline text-lg font-bold text-aom-text-light mb-4" {...fadeUp()}>
                <MessageCircle size={18} className="inline mr-2 text-aom-orange" />
                Floating Contact Button
              </motion.h3>
              <div className="space-y-3">
                {contactButtonSpec.map((s, i) => (
                  <motion.div key={s.label} className="p-4 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.06)}>
                    <p className="font-body text-xs text-aom-orange font-medium uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="font-body text-sm text-white/60">{s.value}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div className="mt-6 p-5 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp(0.3)}>
                <h4 className="font-headline text-sm font-bold text-aom-orange mb-2">CONTACT DRAWER</h4>
                <ul className="space-y-1">
                  <li className="font-body text-sm text-white/50">Desktop: 420px right drawer, slides in from right, 300ms ease-out</li>
                  <li className="font-body text-sm text-white/50">Mobile: Full-screen modal, slides up from bottom</li>
                  <li className="font-body text-sm text-white/50">4px pattern strip at top, same form as Slide 8</li>
                  <li className="font-body text-sm text-white/50">Backdrop: rgba(0,0,0,0.60), z-index: 60</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>NAVIGATION</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            NAV BAR + KEYBOARD + SCROLL
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp()}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Top Nav Bar</h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/50">Fixed top, 64px desktop, 56px mobile</li>
                <li className="font-body text-sm text-white/50">Slide 1: transparent + blur. Slides 2-8: solid #0C0C0C</li>
                <li className="font-body text-sm text-white/50">Links: Work, Services, AI Advisory (/system), Contact</li>
                <li className="font-body text-sm text-white/50">Mobile: hamburger, full-screen overlay, Syne 700 28px links</li>
              </ul>
            </motion.div>

            <motion.div className="p-6 border border-white/10 bg-white/[0.02]" {...fadeUp(0.1)}>
              <h3 className="font-headline text-base font-bold text-aom-text-light mb-3">Keyboard / Scroll</h3>
              <ul className="space-y-2">
                <li className="font-body text-sm text-white/50">Mouse wheel / swipe: advance one slide (snap handles it)</li>
                <li className="font-body text-sm text-white/50">Arrow Down / Page Down: advance. Up / Page Up: go back.</li>
                <li className="font-body text-sm text-white/50">Home: Slide 1. End: Slide 8. Escape: close drawer/modal.</li>
                <li className="font-body text-sm text-white/50">URL hash updates via history.replaceState on >50% visible</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Responsive */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>RESPONSIVE BREAKPOINTS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            EVERY SCREEN SIZE COVERED
          </motion.h2>

          <div className="space-y-3">
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
              { num: '1', title: 'THE SCROLL SNAP', desc: 'CSS-native, mandatory, smooth. This is the foundation. If the snap doesn\'t feel satisfying and decisive, nothing else matters.' },
              { num: '2', title: 'THE STAGGER', desc: 'Every slide\'s content enters with staggered timing. Headline first, then supporting elements cascade in. This makes it feel like a presentation, not a page load.' },
              { num: '3', title: 'CONTACT ACCESSIBILITY', desc: 'Between the floating button, the nav link, and Slide 8, there\'s always a path to conversion within one click. The drawer must feel premium.' },
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

      {/* Accessibility */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>ACCESSIBILITY</SectionKicker>
            <OrangeBar />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Slide semantics', value: 'Each slide is a <section> with aria-label' },
              { label: 'Progress dots', value: 'aria-label="Navigate to [slide name]" on each dot' },
              { label: 'Focus ring', value: '2px solid #E85D26, offset 2px, :focus-visible only' },
              { label: 'Reduced motion', value: 'prefers-reduced-motion: disable translates, keep opacity fades (200ms)' },
              { label: 'Skip link', value: 'Hidden "Skip to content" visible on focus, jumps to Slide 2' },
              { label: 'Contrast', value: '#FDF6EC on #0C0C0C = 16.8:1. #8A847C on #0C0C0C = 4.6:1. All AA pass.' },
            ].map((a, i) => (
              <motion.div key={a.label} className="p-4 border border-white/10 bg-white/[0.02]" {...fadeUp(i * 0.06)}>
                <p className="font-body text-xs text-aom-orange font-medium uppercase tracking-wider mb-1">{a.label}</p>
                <p className="font-body text-sm text-white/60">{a.value}</p>
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
            8 slides + "keep exploring" overflow. One narrative arc. Every value specified. No ambiguity. Build pixel-perfect.
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
