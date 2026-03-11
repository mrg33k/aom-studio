import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, Cpu, Handshake, Wrench, BarChart3, Search, TrendingUp } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Briefs | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Strategy briefs, research, and plans from AOM\'s agent system. AI advisory, partnerships, system audits, and more.');
    setMeta('og:title', 'AOM Briefs', true);
    setMeta('og:description', 'Strategy briefs, research, and plans from AOM\'s agent system.', true);
    setMeta('og:type', 'website', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs', true);
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

const briefs = [
  {
    title: 'AI Advisory Services Strategy',
    path: '/briefs/ai-advisory',
    agent: 'Steve',
    agentRole: 'AI Advisory Lead',
    agentColor: '#E85D26',
    date: 'March 10, 2026',
    type: 'COUNCIL BRIEF',
    icon: Cpu,
    summary: 'How AOM turns its internal AI system into a sellable product. Pricing, delivery process, and 5 recommended next moves.',
  },
  {
    title: 'Partnership Strategy',
    path: '/briefs/partnerships',
    agent: 'Alex',
    agentRole: 'Deal Architect',
    agentColor: '#60a5fa',
    date: 'March 10, 2026',
    type: 'STRATEGY BRIEF',
    icon: Handshake,
    summary: 'Why partnerships beat cold email. 30+ specific targets across CPAs, bonding agents, supply houses, and trade associations.',
  },
  {
    title: 'Masterplan System Audit',
    path: '/briefs/masterplan',
    agent: 'Elon',
    agentRole: 'System/Infrastructure',
    agentColor: '#22d3ee',
    date: 'March 10, 2026',
    type: 'SYSTEM AUDIT',
    icon: Wrench,
    summary: 'Full system audit. 13 agents, 29 skills, every context file assessed. Overall score: 5.5/10. Strong foundation, weak automation.',
  },
];

const existingPages = [
  {
    title: 'Growth Plan',
    path: '/growth-plan',
    agent: 'Alex',
    agentRole: 'Deal Architect',
    agentColor: '#60a5fa',
    date: 'March 2026',
    type: 'GROWTH PLAN',
    icon: TrendingUp,
    summary: 'Revenue targets, client pipeline, and the path to $540k/year through construction retainers.',
  },
  {
    title: 'Outreach Plan',
    path: '/outreach-plan',
    agent: 'Jacob',
    agentRole: 'Outreach',
    agentColor: '#22c55e',
    date: 'March 2026',
    type: 'OUTREACH PLAN',
    icon: BarChart3,
    summary: 'Cold email strategy, target lists, and the outreach pipeline for landing construction retainer clients.',
  },
  {
    title: 'HVAC Ads Research',
    path: '/research/hvac-ads-arizona',
    agent: 'Alex',
    agentRole: 'Deal Architect',
    agentColor: '#60a5fa',
    date: 'March 2026',
    type: 'MARKET RESEARCH',
    icon: Search,
    summary: 'Live data from Meta\'s Ad Library. 7 out of 10 major Arizona HVAC companies run paid ads. Who\'s advertising and what\'s working.',
  },
];

function BriefCard({ brief, index }) {
  const Icon = brief.icon;
  return (
    <motion.a
      href={brief.path}
      className="block p-6 md:p-8 border border-white/10 bg-white/[0.02] hover:border-aom-orange/30 hover:-translate-y-1 transition-all duration-300 group"
      {...fadeUp(index * 0.08)}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-body font-medium uppercase tracking-[0.15em] text-aom-text-muted">
          {brief.type}
        </span>
        <div className="w-10 h-10 flex items-center justify-center border border-white/10 text-aom-text-muted group-hover:text-aom-orange group-hover:border-aom-orange/30 transition-colors">
          <Icon size={20} />
        </div>
      </div>

      <h3 className="font-headline text-xl font-bold text-aom-text-light mb-3 group-hover:text-aom-orange transition-colors">
        {brief.title}
      </h3>

      <p className="font-body text-base text-white/50 leading-relaxed mb-5">
        {brief.summary}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: brief.agentColor }} />
          <span className="font-body text-sm text-aom-text-muted">{brief.agent}</span>
          <span className="font-body text-sm text-white/30">|</span>
          <span className="font-body text-sm text-white/30">{brief.date}</span>
        </div>
        <ArrowRight size={16} className="text-aom-text-muted group-hover:text-aom-orange transition-colors" />
      </div>
    </motion.a>
  );
}

export default function BriefsHub() {
  useSEO();

  return (
    <div className="bg-aom-night min-h-screen">
      {/* Hero */}
      <section className="bg-aom-night py-20 md:py-32 px-6 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.a
            href="https://aheadofmarket.com"
            className="font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-12"
            {...fadeUp()}
          >
            AOM
          </motion.a>

          <motion.div {...fadeUp(0.05)}>
            <SectionKicker>STRATEGY + RESEARCH</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            BRIEFS
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch]"
            {...fadeUp(0.2)}
          >
            Strategy briefs, market research, and system audits from AOM's agent system. Each deliverable is produced by a specialized agent, reviewed, and published.
          </motion.p>
        </div>
      </section>

      {/* New Briefs */}
      <section className="bg-aom-night pb-12 px-6 md:pb-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>LATEST</SectionKicker>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {briefs.map((brief, i) => (
              <BriefCard key={brief.path} brief={brief} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Existing Pages */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>ALSO AVAILABLE</SectionKicker>
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-3xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-8"
            {...fadeUp(0.1)}
          >
            PLANS + RESEARCH
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {existingPages.map((page, i) => (
              <BriefCard key={page.path} brief={page} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-aom-night py-8 px-6 text-center border-t border-white/10">
        <a
          href="https://aheadofmarket.com"
          className="font-headline text-sm font-bold uppercase tracking-[0.15em] text-aom-text-muted hover:text-aom-text-light transition-colors inline-block mb-3"
        >
          AOM
        </a>
        <p className="font-body text-xs text-aom-text-muted">
          aheadofmarket.com
        </p>
      </footer>
    </div>
  );
}
