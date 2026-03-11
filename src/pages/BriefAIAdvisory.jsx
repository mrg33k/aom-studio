import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Users, Cpu, BarChart3, Shield, Clock, DollarSign } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'AI Advisory Services Strategy | AOM Council Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'How AOM turns its internal AI system into a sellable product. Council brief covering pricing, delivery, and go-to-market strategy.');
    setMeta('og:title', 'AI Advisory Services: What We Sell, How We Deliver, When We Start', true);
    setMeta('og:description', 'Council brief on packaging AOM\'s AI operations into a sellable service for small business owners.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/ai-advisory', true);
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

const agentPerspectives = [
  {
    name: 'Steve',
    role: 'AI Advisory Lead',
    color: '#E85D26',
    icon: Cpu,
    keyPoints: [
      'AI Operations Audit is packageable TODAY. 3-5 hours, written report, specific recommendations. Zero new tooling needed.',
      'Full system build (Tier 2) needs 4-6 weeks of work. Current system assumes deep technical knowledge.',
      'Simplest Tier 2: email outreach automation. One module, $5k flat, 1-2 weeks setup.',
      'First 2-3 clients: Patrik hands-on in delivery. After that, Steve + Elon handle it with Patrik doing the close only.',
    ],
  },
  {
    name: 'Alex',
    role: 'Strategy',
    color: '#60a5fa',
    icon: BarChart3,
    keyPoints: [
      'Target: small service businesses in Phoenix, 5-50 employees, no back-office team. $500k-$5M revenue.',
      'They\'re paying for time back, not "AI." Frame around hours saved, not technology deployed.',
      'Audit at $2,500 is the sweet spot. Low enough for quick yes, high enough to filter tire-kickers.',
      'Almost NOTHING exists in the $2,500-$10,000 range for small business owners. That\'s our gap.',
      'AI advisory upsells into existing retainer clients. It\'s a second front door into AOM.',
    ],
  },
  {
    name: 'Elon',
    role: 'System/Technical',
    color: '#22d3ee',
    icon: Shield,
    keyPoints: [
      '40% of the system is transferable today. The other 60% is held together by Patrik\'s intuition and Claude Code expertise.',
      'Transferable now: email outreach, calendar management, context file architecture, decision logging, relay system.',
      'NOT transferable yet: multi-agent pipeline, skills system, QA automation, full orchestration layer.',
      'Starter kit repo (template files, setup scripts, quickstart guide) turns a 12-hour custom build into 4 hours. 2-3 days to build.',
    ],
  },
  {
    name: 'Mom',
    role: 'Operations',
    color: '#a78bfa',
    icon: Clock,
    keyPoints: [
      'Sell only the audit for the first 60 days. 3-5 hours of Patrik\'s time per client. Doable even during production.',
      'Audit economics: ~8 hours total at $2,500 = $312/hour. Good.',
      'System build economics: ~20-25 hours at $5,000 = $200-250/hour. Good, but only if Elon isn\'t pulled off internal work.',
      'Revenue target: $10k/month in AI advisory by month 3 (2 audits + 1 system build per month).',
      'Risk: Patrik gets excited, goes deep on client builds, and production deadlines slip. Steve and Elon must own delivery.',
    ],
  },
];

const consensusPoints = [
  'The AI Operations Audit ($2,500) is the right first product',
  'Small service businesses (5-50 employees, no back-office team) are the target',
  'Patrik IS the proof of concept. The demo sells itself.',
  'Full system build is 4-6 weeks from being sellable',
  'Support scoping is critical. Without boundaries, post-sale support eats all margin.',
];

const topMoves = [
  { num: '01', title: 'Build the audit report template', desc: 'Steve + Alex create a standardized deliverable. One day of work. Only blocker to selling.' },
  { num: '02', title: 'First audit on a friendly client', desc: 'Ambition Mechanical\'s owner, Brandon Wiley, or someone in the network. Free or discounted. Validates the process.' },
  { num: '03', title: 'Elon builds the starter kit repo', desc: 'Template context files, setup scripts, quickstart guide. 2-3 days. Foundation for Tier 2.' },
  { num: '04', title: 'Add "AI Operations Audit" to the website', desc: 'One tile. One price. One outcome. "We audit your operations and show you where AI saves you 10+ hours a week. $2,500."' },
  { num: '05', title: 'After 3 audits, scope Tier 2 from real data', desc: 'Don\'t guess what to build. Let audit conversations reveal the highest-demand module.' },
];

const pricingTiers = [
  {
    name: 'AI Operations Audit',
    price: '$2,500',
    timeline: '2 weeks',
    description: 'Walk into a small business, spend 3-5 hours understanding workflows, map where AI saves time, deliver a written report with specific recommendations.',
    details: ['3-5 hour discovery session', 'Written report with recommendations', 'ROI projections per automation', 'No code, no system, just expertise'],
    ready: true,
  },
  {
    name: 'System Build',
    price: '$5,000-$8,000',
    timeline: '2-4 weeks',
    description: 'Pick one module (email outreach, calendar, client tracking). Set it up in their environment. Train them. Support for 30 days.',
    details: ['Scoped to 1-2 automations', 'Built in their environment', '2-page "how to talk to your assistant" guide', '30-day support included'],
    ready: false,
  },
  {
    name: 'Ongoing Support',
    price: '$500/month',
    timeline: 'Monthly',
    description: 'Post-build maintenance and support. Questions, tweaks, new automations as needs evolve.',
    details: ['System health monitoring', 'Configuration adjustments', 'New automation requests', 'Priority response'],
    ready: false,
  },
];

export default function BriefAIAdvisory() {
  useSEO();

  return (
    <div className="bg-aom-night min-h-screen">
      {/* Header */}
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
            <SectionKicker>COUNCIL BRIEF / MARCH 10, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            AI ADVISORY SERVICES: WHAT WE SELL, HOW WE DELIVER, WHEN WE START
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.2)}
          >
            How does AOM turn its internal AI system into a sellable product? Four agents weigh in.
          </motion.p>

          <motion.div className="flex flex-wrap gap-3" {...fadeUp(0.25)}>
            {agentPerspectives.map(a => (
              <span key={a.name} className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {a.name}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Agent Perspectives */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>AGENT PERSPECTIVES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            FOUR ANGLES, ONE QUESTION
          </motion.h2>

          <div className="space-y-6">
            {agentPerspectives.map((agent, i) => {
              const Icon = agent.icon;
              return (
                <motion.div
                  key={agent.name}
                  className="p-6 md:p-8 border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors"
                  {...fadeUp(i * 0.1)}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 flex items-center justify-center border border-white/10" style={{ color: agent.color }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 className="font-headline text-lg font-bold text-aom-text-light">{agent.name}</h3>
                      <p className="font-body text-sm text-aom-text-muted">{agent.role}</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {agent.keyPoints.map((point, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: agent.color }} />
                        <span className="font-body text-base text-white/70 leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Consensus */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SYNTHESIS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHERE EVERYONE AGREES
          </motion.h2>

          <div className="space-y-4">
            {consensusPoints.map((point, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-4 p-5 border border-white/10 bg-aom-orange/[0.03]"
                {...fadeUp(i * 0.08)}
              >
                <span className="font-headline text-2xl font-bold text-aom-orange/40 flex-shrink-0 w-8">{String(i + 1).padStart(2, '0')}</span>
                <p className="font-body text-base text-aom-text-light leading-relaxed">{point}</p>
              </motion.div>
            ))}
          </div>

          {/* Disagreement */}
          <motion.div className="mt-12 p-6 md:p-8 border border-aom-orange/20 bg-aom-orange/[0.05]" {...fadeUp()}>
            <h3 className="font-headline text-xl font-bold text-aom-text-light mb-4">WHERE THEY DISAGREE</h3>
            <div className="space-y-4">
              <div>
                <p className="font-body text-base text-white/70 leading-relaxed">
                  <span className="text-aom-orange font-bold">Timeline tension:</span> Steve wants a sellable Tier 2 in 30 days. Mom says 60 days minimum. The difference is whether we build the starter kit before the first client or learn-by-doing and templatize after.
                </p>
              </div>
              <div>
                <p className="font-body text-base text-white/70 leading-relaxed">
                  <span className="text-aom-orange font-bold">Pricing:</span> Steve says $5k flat for email outreach module. Alex says $5-8k based on complexity. Elon says it's technically ready but needs a starter kit first.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SERVICE TIERS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT WE SELL
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingTiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                className={`p-6 md:p-8 border ${tier.ready ? 'border-aom-orange/40 bg-aom-orange/[0.05]' : 'border-white/10 bg-white/[0.02]'} flex flex-col`}
                {...fadeUp(i * 0.12)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-body font-medium uppercase tracking-[0.15em] ${tier.ready ? 'text-aom-orange' : 'text-aom-text-muted'}`}>
                    {tier.ready ? 'READY NOW' : 'COMING SOON'}
                  </span>
                </div>
                <h3 className="font-headline text-xl font-bold text-aom-text-light mb-2">{tier.name}</h3>
                <p className="font-headline text-3xl font-bold text-aom-orange mb-1">{tier.price}</p>
                <p className="font-body text-sm text-aom-text-muted mb-4">{tier.timeline}</p>
                <p className="font-body text-base text-white/60 leading-relaxed mb-6">{tier.description}</p>
                <ul className="space-y-2 mt-auto">
                  {tier.details.map((d, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-aom-orange mt-2.5 flex-shrink-0" />
                      <span className="font-body text-sm text-white/50">{d}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top 5 Moves */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>RECOMMENDED MOVES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            TOP 5, IN ORDER
          </motion.h2>

          <div>
            {topMoves.map((move, i) => (
              <motion.div
                key={move.num}
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 py-8 ${i < topMoves.length - 1 ? 'border-b border-white/10' : ''}`}
                {...fadeUp(i * 0.1)}
              >
                <div className="md:col-span-2">
                  <span className="font-headline text-3xl md:text-5xl font-bold text-aom-orange/30">{move.num}</span>
                </div>
                <div className="md:col-span-10">
                  <h3 className="font-headline text-xl font-bold text-aom-text-light mb-2">{move.title}</h3>
                  <p className="font-body text-base text-white/60 leading-relaxed">{move.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue Math */}
      <section className="bg-aom-night-card border-y border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0">
          {[
            { number: '$312/hr', label: 'Audit Economics' },
            { number: '$10k/mo', label: 'Month 3 Target' },
            { number: '8 hrs', label: 'Per Audit Total' },
            { number: '60 days', label: 'Audits Only Phase' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className={`p-4 md:p-8 text-center ${i < 3 ? 'border-r border-white/10' : ''} ${i < 2 ? 'border-b md:border-b-0 border-white/10' : ''}`}
              {...fadeUp(i * 0.12)}
            >
              <p className="font-headline text-3xl md:text-4xl font-bold text-aom-orange">{stat.number}</p>
              <p className="font-body text-sm text-aom-text-muted uppercase tracking-[0.15em] mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Questions for Patrik */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>DECISIONS NEEDED</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            QUESTIONS FOR PATRIK
          </motion.h2>

          <div className="space-y-4">
            {[
              'Who\'s your first audit candidate? Someone in your network who\'d let you walk through their operations for 2-3 hours.',
              'Are you comfortable with Steve owning the client relationship post-sale? You close, you do discovery, then Steve runs it.',
              'Pricing gut check: $2,500 for the audit, $5-8k for a system build. Does that feel right for the people you know?',
              'Should Jacob add "small business owners" to outreach alongside construction companies?',
              'Timeline: sell audits only for 60 days before offering system builds? Or move faster with the first willing client?',
            ].map((q, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-4 p-5 border border-white/10"
                {...fadeUp(i * 0.08)}
              >
                <span className="font-headline text-lg font-bold text-aom-orange flex-shrink-0">{i + 1}.</span>
                <p className="font-body text-base text-white/70 leading-relaxed">{q}</p>
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
          Council brief organized by Steve (AI Advisory Lead). March 10, 2026.
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
