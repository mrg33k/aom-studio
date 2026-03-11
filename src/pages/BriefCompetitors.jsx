import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Target, AlertTriangle, TrendingUp, Users, Globe, Zap, Shield, Layers, ExternalLink } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Competitive Deep Dive | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Deep market intelligence on AI advisory competitors. Who is building, what they charge, where AOM wins, and the gaps nobody is filling.');
    setMeta('og:title', 'AI Advisory Competitive Deep Dive', true);
    setMeta('og:description', 'Who is selling AI systems to small businesses right now. Tiers, pricing, tech stacks, and where AOM\'s moat is widest.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/competitors', true);
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

const tierA = [
  {
    name: 'LeftClick AI',
    founder: 'Nick Saraev',
    location: 'Canada',
    revenue: '$72K/month',
    stack: 'n8n, Make.com, GPT-4, custom builds',
    threat: 'medium',
    note: 'Closest model to AOM. Solo operator, content-driven lead gen. But Canadian, not construction-focused, audience is other agency owners.',
  },
  {
    name: 'Morningside AI',
    founder: 'Liam Ottley',
    location: 'Global',
    revenue: '$7M+',
    stack: 'Custom builds, enterprise',
    threat: 'low',
    note: 'Coined "AI Automation Agency" in 2023. 700K+ YouTube. Moved upmarket to enterprise, but his students flood the SMB space.',
  },
  {
    name: 'HummingAgent',
    founder: 'Team',
    location: 'Denver, CO',
    revenue: 'Unknown',
    stack: 'Custom AI, GPT, SOC 2 infra',
    threat: 'medium',
    note: 'Real agency doing real builds. Closest geographic competitor (western US). Claims 66% operational savings. No construction focus.',
  },
  {
    name: 'Authority AI',
    founder: 'Team',
    location: 'Fort Lauderdale, FL',
    revenue: 'Unknown',
    stack: 'Custom CRM bots, knowledge bases',
    threat: 'high',
    note: 'Explicitly targets trade businesses. Overlaps with AOM\'s construction vertical. Florida-based, same client type.',
  },
  {
    name: 'Estes Media',
    founder: 'Team',
    location: 'Unknown',
    revenue: 'Unknown',
    stack: 'Off-shelf AI + marketing',
    threat: 'highest',
    note: 'HIGHEST THREAT. Already selling AI consulting to contractors. Same vertical. Same dual-service model (AI + digital marketing).',
  },
];

const tierB = [
  { name: 'FS Agency', location: 'Denver, CO', price: '$5-15K/mo', focus: 'Law firms, accounting, marketing agencies' },
  { name: 'PrimeAI Solutions', location: 'Unknown', price: 'Custom', focus: 'Digital transformation + strategic consulting' },
  { name: 'GAI Insights', location: 'Unknown', price: '$2-8K/mo', focus: 'Fractional CAIO services' },
  { name: 'Head of AI', location: 'Unknown', price: '$2.5-30K/mo', focus: 'Marketplace of fractional CAIOs' },
];

const pricingData = [
  { service: 'AI Readiness Audit', low: '$2,000', mid: '$5,000', high: '$15,000' },
  { service: 'Chatbot Build', low: '$5,000', mid: '$25,000', high: '$85,000+' },
  { service: 'Workflow Automation', low: '$5,000', mid: '$15,000', high: '$50,000' },
  { service: 'Custom AI Agent', low: '$25,000', mid: '$75,000', high: '$300,000+' },
  { service: 'Monthly Retainer', low: '$2,000/mo', mid: '$5,000/mo', high: '$15,000/mo' },
  { service: 'Fractional CAIO', low: '$2,500/mo', mid: '$5,000/mo', high: '$30,000/mo' },
];

const gaps = [
  {
    title: 'Chatbot Theater',
    icon: Layers,
    desc: 'The VAST majority of "AI agencies" resell white-label chatbots and call it "AI transformation." Clients are catching on.',
    advantage: 'AOM builds real systems that automate real workflows, not just chat interfaces.',
  },
  {
    title: 'No Creative Production',
    icon: Zap,
    desc: 'Every AI consulting agency is purely technical. NONE of them also produce video, design brands, build websites, or manage social media.',
    advantage: 'One vendor for creative + AI. "Here\'s your new website AND here\'s the AI system." Genuinely unique.',
  },
  {
    title: 'No Proof of Internal Use',
    icon: Shield,
    desc: 'Most AI agencies sell AI but don\'t visibly run on it. Their own operations are manual.',
    advantage: 'The EA repo IS the proof. Bobby builds sites. Elmo QAs. Mom orchestrates. A running, documented, production system.',
  },
  {
    title: 'Construction Vertical Unowned',
    icon: Target,
    desc: 'Estes Media is the only agency targeting contractors with AI, and they\'re marketing-focused, not operations-focused.',
    advantage: 'Already in the vertical. Already has construction clients. Already understands the pain points.',
  },
  {
    title: 'No Multi-Agent Architecture',
    icon: Users,
    desc: 'Enterprise has CrewAI and AutoGen frameworks, but nobody is packaging multi-agent orchestration for SMBs.',
    advantage: 'AOM\'s pipeline (Elon > Mom > Alex > Steffen > Bobby > Elmo) is exactly what could be productized for construction companies.',
  },
  {
    title: 'Course Sellers vs. Practitioners',
    icon: Globe,
    desc: 'Course sellers outnumber actual practitioners maybe 10:1. Most "AI agencies" are people selling courses about starting AI agencies.',
    advantage: 'AOM does the work. Not teaching about doing the work.',
  },
  {
    title: 'No Ongoing Relationship',
    icon: TrendingUp,
    desc: 'Most competitors sell a project and walk away. Gap between "$5K one-time build" and "$5K/month fractional executive."',
    advantage: 'AOM\'s $1,500-$3,000/month retainer fills that gap perfectly.',
  },
];

const moats = [
  { moat: 'Multi-agent system as proof', strength: 'Very Strong', defensibility: 'High', pct: 90 },
  { moat: 'Creative + AI hybrid', strength: 'Strong', defensibility: 'Medium', pct: 75 },
  { moat: 'Retainer relationships', strength: 'Strong', defensibility: 'High', pct: 75 },
  { moat: 'Phoenix local presence', strength: 'Medium', defensibility: 'Medium', pct: 60 },
  { moat: 'Construction vertical', strength: 'Medium', defensibility: 'Low', pct: 50 },
];

const catchUp = [
  { area: 'Content / Thought Leadership', desc: 'Nick Saraev, Liam Ottley built audiences that generate leads on autopilot. AOM has zero presence in AI consulting content. Patrik\'s LinkedIn is the fastest fix.' },
  { area: 'Case Study Documentation', desc: 'Every competitor has documented ROI. AOM needs to document internal metrics (hours saved, agents deployed) and then its first client case study.' },
  { area: 'Productized Offering', desc: 'Audit framework, pricing tiers, proposal template. These need to exist before the first sale.' },
  { area: 'Website Presence', desc: 'AI advisory services need to be on aheadofmarket.com. Even a single page with clear positioning.' },
];

const takeaways = [
  'The market is real and growing fast. $11B+ AI consulting market, 26-37% CAGR.',
  'Most competitors are shallow. White-label chatbot resellers calling themselves "AI agencies."',
  'Nobody owns construction + AI. Estes Media is closest but marketing-focused, not ops.',
  'Content is the lead gen engine. Every successful player built an audience first.',
  'The multi-agent angle is uncharted for SMBs. AOM could be the first to productize this.',
  'Pricing is validated. $2,500 audit, $5-8K build, $1.5-3K/month retainer is the sweet spot.',
  'Move now. The window is narrowing. First mover advantage matters for local verticals.',
];

function ThreatBadge({ level }) {
  const colors = {
    highest: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-body font-bold uppercase tracking-wider rounded-sm ${colors[level]}`}>
      {level} threat
    </span>
  );
}

export default function BriefCompetitors() {
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
            <SectionKicker>COMPETITIVE INTELLIGENCE / MARCH 10, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            AI ADVISORY: WHO IS DOING THIS RIGHT NOW
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.2)}
          >
            Deep market intelligence on every competitor building and selling AI systems for small businesses. What they charge, what they ship, and where AOM's moat is widest.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#22d3ee]" />
              Elon (System/Infrastructure)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Market Stats */}
      <section className="bg-aom-night-card border-y border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0">
          {[
            { number: '$11.4B', label: 'Market Size' },
            { number: '37.5%', label: 'CAGR Growth' },
            { number: '0', label: 'Competitors in Construction + AI Ops' },
            { number: 'Wide Open', label: 'Phoenix Market' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className={`p-4 md:p-8 text-center ${i < 3 ? 'border-r border-white/10' : ''} ${i < 2 ? 'border-b md:border-b-0 border-white/10' : ''}`}
              {...fadeUp(i * 0.12)}
            >
              <p className="font-headline text-2xl md:text-3xl font-bold text-aom-orange">{stat.number}</p>
              <p className="font-body text-xs text-aom-text-muted uppercase tracking-[0.15em] mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tier A */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>TIER A: DIRECT COMPETITORS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            AGENCIES SELLING AI SYSTEMS TO SMBS
          </motion.h2>

          <div className="space-y-4">
            {tierA.map((comp, i) => (
              <motion.div
                key={comp.name}
                className={`p-6 md:p-8 border ${comp.threat === 'highest' ? 'border-red-500/30 bg-red-500/[0.05]' : 'border-white/10 bg-white/[0.02]'} hover:border-white/20 transition-colors`}
                {...fadeUp(i * 0.08)}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-headline text-xl font-bold text-aom-text-light">{comp.name}</h3>
                    <ThreatBadge level={comp.threat} />
                  </div>
                  <div className="flex items-center gap-4 text-sm font-body text-aom-text-muted">
                    <span>{comp.location}</span>
                    {comp.revenue !== 'Unknown' && (
                      <>
                        <span className="text-white/20">|</span>
                        <span className="text-aom-orange">{comp.revenue}</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="font-body text-sm text-white/40 mb-2">Stack: {comp.stack}</p>
                <p className="font-body text-base text-white/60 leading-relaxed">{comp.note}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier B */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>TIER B: FRACTIONAL AI OFFICERS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tierB.map((comp, i) => (
              <motion.div
                key={comp.name}
                className="p-6 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <h3 className="font-headline text-lg font-bold text-aom-text-light mb-2">{comp.name}</h3>
                <p className="font-body text-sm text-aom-orange mb-1">{comp.price}</p>
                <p className="font-body text-sm text-white/50">{comp.focus}</p>
              </motion.div>
            ))}
          </div>

          <motion.p className="font-body text-sm text-white/40 mt-6" {...fadeUp()}>
            Tier C (white-label platforms like Stammer AI, Trillet, BizSage) and Tier D (Claude Code consultants like KIBO Studios, Kaizen AI) also mapped. Nobody in Phoenix is doing creative + AI ops for construction.
          </motion.p>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>MARKET PRICING</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT THEY CHARGE
          </motion.h2>

          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-4 gap-2 p-4 border-b border-white/10 mb-2">
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase">Service</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase text-center">Low</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase text-center">Mid</span>
                <span className="font-headline text-sm font-bold text-aom-text-muted uppercase text-center">High</span>
              </div>
              {pricingData.map((row, i) => (
                <motion.div
                  key={row.service}
                  className="grid grid-cols-4 gap-2 p-4 border border-white/10 bg-white/[0.02] mb-1"
                  {...fadeUp(i * 0.06)}
                >
                  <span className="font-body text-sm text-white/70">{row.service}</span>
                  <span className="font-body text-sm text-white/40 text-center">{row.low}</span>
                  <span className="font-body text-sm text-aom-orange text-center font-medium">{row.mid}</span>
                  <span className="font-body text-sm text-white/40 text-center">{row.high}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gaps */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>MARKET GAPS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT THEY'RE DOING POORLY
          </motion.h2>

          <div className="space-y-6">
            {gaps.map((gap, i) => {
              const Icon = gap.icon;
              return (
                <motion.div
                  key={gap.title}
                  className="p-6 md:p-8 border border-white/10 bg-white/[0.02]"
                  {...fadeUp(i * 0.08)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 flex items-center justify-center text-aom-orange">
                      <Icon size={18} />
                    </div>
                    <h3 className="font-headline text-lg font-bold text-aom-text-light">{gap.title}</h3>
                  </div>
                  <p className="font-body text-base text-white/50 leading-relaxed mb-3">{gap.desc}</p>
                  <div className="p-3 bg-aom-orange/[0.05] border border-aom-orange/20">
                    <p className="font-body text-sm text-aom-orange">
                      <span className="font-bold">AOM's advantage:</span> {gap.advantage}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Moat Ranking */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>COMPETITIVE MOAT</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            AOM'S DEFENSIBILITY
          </motion.h2>

          <div className="space-y-5">
            {moats.map((m, i) => (
              <motion.div key={m.moat} {...fadeUp(i * 0.08)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-headline text-base font-bold text-aom-text-light">{m.moat}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-xs text-aom-text-muted uppercase">{m.strength}</span>
                    <span className="font-body text-xs text-white/30">|</span>
                    <span className="font-body text-xs text-aom-text-muted uppercase">{m.defensibility} defensibility</span>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-aom-orange rounded-sm transition-all duration-700"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Where to Catch Up */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>HONEST ASSESSMENT</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHERE AOM NEEDS TO CATCH UP
          </motion.h2>

          <div className="space-y-4">
            {catchUp.map((item, i) => (
              <motion.div
                key={item.area}
                className="p-6 border border-yellow-500/20 bg-yellow-500/[0.03]"
                {...fadeUp(i * 0.08)}
              >
                <h3 className="font-headline text-lg font-bold text-aom-text-light mb-2">{item.area}</h3>
                <p className="font-body text-base text-white/60 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Takeaways */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>KEY TAKEAWAYS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            BOTTOM LINE
          </motion.h2>

          <div>
            {takeaways.map((item, i) => (
              <motion.div
                key={i}
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 py-8 ${i < takeaways.length - 1 ? 'border-b border-white/10' : ''}`}
                {...fadeUp(i * 0.08)}
              >
                <div className="md:col-span-2">
                  <span className="font-headline text-3xl md:text-5xl font-bold text-aom-orange/30">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="md:col-span-10">
                  <p className="font-body text-lg text-white/70 leading-relaxed">{item}</p>
                </div>
              </motion.div>
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
          Competitive deep dive by Elon (System/Infrastructure). March 10, 2026.
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
