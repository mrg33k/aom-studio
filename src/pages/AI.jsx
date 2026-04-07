import React, { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChevronDown, Zap, Users, Brain, Mic2, Rocket, ArrowRight } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

/* ── SEO ────────────────────────────────────────────────────────── */
function useSEO() {
  useEffect(() => {
    document.title = 'AI Built for Real Work | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Multi-agent AI that actually builds things. 97 skills. Real output. Voice-first. Always on.');
    setMeta('og:title', 'AI Built for Real Work | AOM', true);
    setMeta('og:description', 'Multi-agent AI that actually builds things. 97 skills. Real output. Voice-first. Always on.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/ai', true);
    setMeta('twitter:card', 'summary_large_image', false);
  }, []);
}

/* ── Noise overlay ──────────────────────────────────────────────── */
function NoiseOverlay({ opacity = 0.03, blend = 'overlay' }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{
        opacity,
        mixBlendMode: blend,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '256px 256px',
      }}
    />
  );
}

/* ── Scroll reveal wrapper ──────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '', direction = 'y' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const initial = prefersReduced
    ? { opacity: 1 }
    : { opacity: 0, ...(direction === 'y' ? { y: 30 } : { x: -20 }) };
  const animate = isInView
    ? { opacity: 1, y: 0, x: 0 }
    : initial;

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
      transition={{ duration: prefersReduced ? 0 : 0.7, delay: prefersReduced ? 0 : delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Section Label ──────────────────────────────────────────────── */
function SectionLabel({ label, centered = false }) {
  return (
    <div className={centered ? 'text-center' : ''}>
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-4">
        {label}
      </p>
      <div className={`w-12 h-[2px] bg-[#E85D26] mb-8 ${centered ? 'mx-auto' : ''}`} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 0: HERO
   ════════════════════════════════════════════════════════════════ */
function HeroSection() {
  const scrollToNext = () => {
    const el = document.getElementById('section-agents');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0C0C0C]">
      <SiteNav />
      <NoiseOverlay />
      {/* Subtle warm radial glow */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(232, 93, 38, 0.04), transparent)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-20">
        <Reveal delay={0.1}>
          <h1 className="font-headline text-6xl md:text-7xl lg:text-8xl font-extrabold uppercase tracking-tighter text-[#F5F0EB] leading-[0.95] mb-8">
            It's not coming.
            <br />
            It's here.
          </h1>
        </Reveal>

        <Reveal delay={0.25}>
          <p className="text-[#A8A29E] text-lg md:text-xl text-center max-w-2xl mx-auto leading-relaxed font-body">
            Multi-agent AI that actually builds. Websites shipped. Brands built. Content produced. Strategies delivered. No promises. All real.
          </p>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/book"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#E85D26] text-white font-headline font-extrabold text-base uppercase tracking-[0.06em] hover:bg-[#D14E1C] transition-all hover:shadow-[0_0_20px_rgba(232,93,38,0.15)]"
            >
              Book a Call <ArrowRight size={16} />
            </a>
            <a
              href="#section-agents"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/10 text-[#F5F0EB] font-headline font-bold text-base uppercase tracking-[0.06em] hover:border-white/20 transition-colors"
            >
              Explore
            </a>
          </div>
        </Reveal>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToNext}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity z-10 cursor-pointer"
      >
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C]">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
        >
          <ChevronDown size={16} className="text-[#78716C]" />
        </motion.div>
      </button>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 1: AGENTS
   ════════════════════════════════════════════════════════════════ */
function AgentsSection() {
  const agents = [
    { name: 'Builders', desc: 'Code, websites, technical infrastructure. Ships fast, catches bugs, deploys clean.' },
    { name: 'Strategists', desc: 'Market research, competitive analysis, ROI modeling. Turns hunches into plans.' },
    { name: 'Creatives', desc: 'Video, audio, design, brand consistency. Produces at scale without losing quality.' },
    { name: 'QA', desc: 'Tests every deliverable at every breakpoint. Catches what humans miss. Always.' },
    { name: 'Orchestrators', desc: 'Coordinates all agents. Routes work. Keeps things from jamming. Persistent memory.' },
    { name: 'Advisors', desc: 'Reviews work. Grades builds. Coaches decisions. Operates like a partner, not a tool.' },
  ];

  return (
    <section id="section-agents" className="relative bg-[#0C0C0C] py-16 md:py-24 lg:py-32">
      <NoiseOverlay />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="THE TEAM" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tighter text-[#F5F0EB]">
            97 Skills. Infinite Collaboration.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="text-[#A8A29E] text-lg leading-relaxed max-w-3xl mt-8 font-body">
            Not a chatbot. Not a single prompt. Specialized agents working together. They build. They review. They learn from each other's feedback. The system catches mistakes before you do.
          </p>
        </Reveal>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          {agents.map((agent, i) => (
            <Reveal key={agent.name} delay={i * 0.1} className="relative">
              <div className="bg-[#1A1A17] border border-[#292524] p-8 relative overflow-hidden hover:border-[#44403C] transition-colors duration-300 h-full">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E85D26]" />
                <h3 className="font-headline text-xl font-extrabold uppercase tracking-tight text-[#F5F0EB] mb-3">
                  {agent.name}
                </h3>
                <p className="text-[#A8A29E] text-base leading-relaxed font-body">{agent.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 2: ORCHESTRATION
   ════════════════════════════════════════════════════════════════ */
function OrchestrationSection() {
  const features = [
    { icon: Brain, title: 'Persistent Memory', desc: 'Agents remember context. Every decision is informed. No starting over.' },
    { icon: Zap, title: 'Task Queuing', desc: 'Work flows automatically. Prioritized. Executed. Tracked. No manual routing.' },
    { icon: Users, title: 'Review Loops', desc: 'One agent reviews another\'s work. Bugs caught internally. Quality enforced.' },
    { icon: Mic2, title: 'Voice-First', desc: 'Talk to your team like you would in person. No typing at a dashboard.' },
  ];

  return (
    <section className="relative bg-[#141412] py-16 md:py-24 lg:py-32 overflow-hidden">
      <NoiseOverlay />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="HOW IT WORKS" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tighter text-[#F5F0EB]">
            Always On. Always Learning.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="text-[#A8A29E] text-lg leading-relaxed max-w-3xl mt-8 font-body">
            The system runs 24/7. Agents respond to work instantly. They collaborate. They catch mistakes. They keep going while you sleep.
          </p>
        </Reveal>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={i * 0.1}>
                <div className="bg-[#0C0C0C] border border-[#292524] p-8 hover:border-[#44403C] transition-colors duration-300">
                  <Icon className="w-8 h-8 text-[#E85D26] mb-4" />
                  <h3 className="font-headline text-lg font-extrabold uppercase tracking-tight text-[#F5F0EB] mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[#A8A29E] text-base leading-relaxed font-body">{feature.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 3: REAL OUTPUT
   ════════════════════════════════════════════════════════════════ */
function OutputSection() {
  const outputs = [
    { name: 'Websites', detail: 'Shipped, tested, deployed, live.' },
    { name: 'Brands', detail: 'Guidelines, systems, applied across all assets.' },
    { name: 'Video', detail: 'Shot, edited, optimized for every platform.' },
    { name: 'Strategy', detail: 'Research, competitive analysis, actionable plans.' },
    { name: 'Operations', detail: 'Audits, dashboards, automation roadmaps.' },
    { name: 'Content', detail: 'Social, blogs, case studies, all produced in-house.' },
  ];

  return (
    <section className="relative bg-[#0C0C0C] py-16 md:py-24 lg:py-32">
      <NoiseOverlay />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="REAL WORK" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tighter text-[#F5F0EB]">
            Not Promises. Outcomes.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="text-[#A8A29E] text-lg leading-relaxed max-w-3xl mt-8 font-body">
            Every day, the system produces work that clients use. Websites that convert. Brands that scale. Content that lands. This is not theoretical. This is happening right now.
          </p>
        </Reveal>

        {/* Output Grid - 3 cols */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {outputs.map((output, i) => (
            <Reveal key={output.name} delay={i * 0.08}>
              <div className="bg-[#1A1A17] border border-[#292524] p-6 hover:border-[#E85D26]/30 transition-colors duration-300">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#E85D26] mb-3">
                  {output.name}
                </p>
                <p className="text-[#A8A29E] text-base leading-relaxed font-body">{output.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 4: CTA
   ════════════════════════════════════════════════════════════════ */
function CTASection() {
  return (
    <section className="relative bg-[#141412] py-16 md:py-24 lg:py-32 overflow-hidden">
      <NoiseOverlay />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <h2 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tighter text-[#F5F0EB] mb-8">
            Ready to see it in action?
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="text-[#A8A29E] text-lg leading-relaxed max-w-2xl mx-auto mb-12 font-body">
            Book a call. We'll show you how the system works and where it could fit into your business. No pitch. Just straight talk.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/book"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#E85D26] text-white font-headline font-extrabold text-base uppercase tracking-[0.06em] hover:bg-[#D14E1C] transition-all hover:shadow-[0_0_20px_rgba(232,93,38,0.15)]"
            >
              Book a Call <ArrowRight size={16} />
            </a>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/10 text-[#F5F0EB] font-headline font-bold text-base uppercase tracking-[0.06em] hover:border-white/20 transition-colors"
            >
              Back to Home
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ════════════════════════════════════════════════════════════════ */
export default function AI() {
  useSEO();

  return (
    <div className="w-full bg-[#0C0C0C] text-[#F5F0EB] overflow-hidden">
      <HeroSection />
      <AgentsSection />
      <OrchestrationSection />
      <OutputSection />
      <CTASection />
      <SiteFooter />
    </div>
  );
}
