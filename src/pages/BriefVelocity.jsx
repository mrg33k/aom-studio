import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, Clock, GitCommit, Layers, TrendingUp, Activity, Users, Code } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Build Velocity Audit | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'How fast does AOM\'s agent system actually ship? 461 commits, 12 agents, 10+ pages. Manual vs agent velocity comparison with real git data.');
    setMeta('og:title', 'Build Velocity Audit: How Fast Does This System Ship?', true);
    setMeta('og:description', '280 commits in AOM-EA, 181 in aom-studio. 12 agents in 114 hours. Every number backed by git log.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/velocity', true);
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

const heroStats = [
  { number: '461', label: 'Total Commits' },
  { number: '5', label: 'Days to Full System' },
  { number: '12', label: 'Agents Created' },
  { number: '153', label: 'Peak Day Commits' },
];

const agentTimeline = [
  { name: 'Jacob', role: 'Outreach', hours: 26 },
  { name: 'Alex', role: 'Biz Dev', hours: 26.5 },
  { name: 'Cleo', role: 'Content', hours: 34 },
  { name: 'Mom', role: 'Orchestrator', hours: 43 },
  { name: 'Paige', role: 'Client Success', hours: 59 },
  { name: 'Tony', role: 'Social Media', hours: 59 },
  { name: 'Elon', role: 'System', hours: 61 },
  { name: 'Steffen', role: 'Brand', hours: 63 },
  { name: 'Bobby', role: 'Web Dev', hours: 68 },
  { name: 'Colton', role: 'Backup Builder', hours: 68 },
  { name: 'Elmo', role: 'QA', hours: 73 },
  { name: 'Steve', role: 'AI Advisory', hours: 114 },
];

const capabilityTimeline = [
  { capability: 'Repo initialized', time: '0 hours', hours: 0 },
  { capability: 'First skills (social research, account creation)', time: '~13 hours', hours: 13 },
  { capability: 'Web dev agent + AGENT.md template', time: '~15 hours', hours: 15 },
  { capability: 'Calendar skill + Google Calendar MCP', time: '~23 hours', hours: 23 },
  { capability: 'Punch list + Outreach + CRM', time: '~25 hours', hours: 25 },
  { capability: 'Email drafting (19 Tier 1 emails)', time: '~34 hours', hours: 34 },
  { capability: 'Telegram bot', time: '~36 hours', hours: 36 },
  { capability: 'Mom orchestrator + Council skill', time: '~43 hours', hours: 43 },
  { capability: 'Double-check / Elmo QA system', time: '~73 hours', hours: 73 },
  { capability: 'Full relay system (v5-v7)', time: '~80 hours', hours: 80 },
  { capability: 'Production pipeline wired end-to-end', time: '~90 hours', hours: 90 },
  { capability: 'Steve agent (AI advisory)', time: '~114 hours', hours: 114 },
];

const websitePhases = {
  manual: {
    label: 'Phase 1: Manual (Feb 5-22)',
    days: 17,
    commits: 73,
    perDay: 10.4,
    pages: 1,
    note: 'Patrik building solo in GitHub web editor. Sporadic after Feb 11.',
  },
  agent: {
    label: 'Phase 2: Agent-Driven (Mar 7-10)',
    days: 4,
    commits: 108,
    perDay: 27,
    pages: '10+',
    note: 'Bobby driving. Full pages shipping in single commits by Mar 10.',
  },
};

const buildTimes = [
  { page: '/outreach-plan', time: '15 minutes', commits: 2 },
  { page: '/growth-plan', time: 'Single commit', commits: 1 },
  { page: '/social', time: 'Single commit', commits: 1 },
  { page: '/system (v2 sales page)', time: '~3 hours', commits: 2 },
  { page: '/research/hvac-ads-arizona', time: 'Single commit', commits: 1 },
  { page: '/briefs (hub + 3 sub-pages)', time: 'Single commit', commits: 1 },
  { page: '/dashboard (full ops)', time: '~34 hours', commits: '30+' },
  { page: '/brand (v1 through v4)', time: '~20 hours', commits: '20+' },
];

const starterKit = [
  { deliverable: 'Context file architecture', actual: '~13 hours', estimate: '1 day', verdict: 'Conservative. 4-6 hours with templates.' },
  { deliverable: 'CLAUDE.md entry point', actual: 'Hour 0', estimate: '2 hours', verdict: 'Accurate.' },
  { deliverable: 'Email outreach pipeline', actual: '~9 hours', estimate: '2-3 days', verdict: 'Conservative. Gmail OAuth is the bottleneck.' },
  { deliverable: 'Calendar integration', actual: '~1 hour', estimate: '30 min/client', verdict: 'Accurate.' },
  { deliverable: 'Telegram relay (v1)', actual: '~1 day', estimate: '1-2 days', verdict: 'Slightly conservative.' },
];

const timeframes = [
  {
    time: '48 hours',
    label: 'AGGRESSIVE',
    items: ['Working executive assistant with context files', 'Calendar management', 'Decision logging', 'Basic email drafts', '"Talk to your assistant" guide'],
  },
  {
    time: '1 week',
    label: 'REALISTIC',
    items: ['Everything above', 'Email outreach pipeline (auto-send capable)', 'Telegram relay (mobile command center)', '2-3 custom skills', 'Onboarding call + support'],
  },
  {
    time: '2 weeks',
    label: 'PREMIUM',
    items: ['Everything above', 'Custom dashboard', 'QA agent for deliverables', 'Content/social media pipeline', 'Multi-agent orchestration', 'Full training session'],
  },
];

export default function BriefVelocity() {
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
            <SectionKicker>BUILD VELOCITY AUDIT / MARCH 10, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            HOW FAST DOES THIS SYSTEM ACTUALLY SHIP?
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.2)}
          >
            Every number backed by git log. 461 commits across two repos. 12 agents in 114 hours. Manual vs agent velocity compared head-to-head.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#22d3ee]" />
              Elon (System/Infrastructure)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Hero Stats */}
      <section className="bg-aom-night-card border-y border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0">
          {heroStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className={`p-4 md:p-8 text-center ${i < 3 ? 'border-r border-white/10' : ''} ${i < 2 ? 'border-b md:border-b-0 border-white/10' : ''}`}
              {...fadeUp(i * 0.12)}
            >
              <p className="font-headline text-3xl md:text-5xl font-bold text-aom-orange">{stat.number}</p>
              <p className="font-body text-xs text-aom-text-muted uppercase tracking-[0.15em] mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Agent Timeline */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>AGENT CREATION TIMELINE</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            12 AGENTS IN 114 HOURS
          </motion.h2>

          <div className="space-y-3">
            {agentTimeline.map((agent, i) => {
              const pct = Math.min((agent.hours / 114) * 100, 100);
              return (
                <motion.div key={agent.name} {...fadeUp(i * 0.04)}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-headline text-sm font-bold text-aom-text-light w-20">{agent.name}</span>
                    <span className="font-body text-xs text-aom-text-muted w-28">{agent.role}</span>
                    <span className="font-body text-xs text-aom-orange ml-auto">{agent.hours}h</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-aom-orange rounded-sm transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Capability Timeline */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>CAPABILITY TIMELINE</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT CAME ONLINE AND WHEN
          </motion.h2>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 md:left-6 top-0 bottom-0 w-px bg-white/10" />

            <div className="space-y-4">
              {capabilityTimeline.map((cap, i) => (
                <motion.div
                  key={cap.capability}
                  className="flex items-start gap-4 md:gap-6 pl-2"
                  {...fadeUp(i * 0.05)}
                >
                  <div className="w-5 h-5 rounded-full bg-aom-orange/20 border-2 border-aom-orange flex-shrink-0 mt-1 relative z-10" />
                  <div className="flex-1 pb-2">
                    <p className="font-body text-base text-white/70">{cap.capability}</p>
                    <p className="font-body text-sm text-aom-orange">{cap.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Manual vs Agent */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>VELOCITY COMPARISON</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            MANUAL VS AGENT
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.values(websitePhases).map((phase, i) => (
              <motion.div
                key={phase.label}
                className={`p-6 md:p-8 border ${i === 1 ? 'border-aom-orange/40 bg-aom-orange/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}
                {...fadeUp(i * 0.12)}
              >
                <h3 className="font-headline text-lg font-bold text-aom-text-light mb-4">{phase.label}</h3>
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="font-body text-sm text-aom-text-muted">Days</span>
                    <span className="font-headline text-lg font-bold text-aom-text-light">{phase.days}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-sm text-aom-text-muted">Total Commits</span>
                    <span className="font-headline text-lg font-bold text-aom-text-light">{phase.commits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-sm text-aom-text-muted">Commits/Day</span>
                    <span className="font-headline text-lg font-bold text-aom-orange">{phase.perDay}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-sm text-aom-text-muted">Pages Shipped</span>
                    <span className="font-headline text-lg font-bold text-aom-text-light">{phase.pages}</span>
                  </div>
                </div>
                <p className="font-body text-sm text-white/40">{phase.note}</p>
              </motion.div>
            ))}
          </div>

          <motion.div className="mt-8 p-6 border border-aom-orange/20 bg-aom-orange/[0.05] text-center" {...fadeUp()}>
            <p className="font-headline text-xl md:text-2xl font-bold text-aom-text-light">
              Agent-driven development: <span className="text-aom-orange">2.6x faster by commits/day</span>
            </p>
            <p className="font-body text-base text-white/50 mt-2">
              Phase 1 produced 1 incomplete page in 17 days. Phase 2 produced 10+ pages in 4 days.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Page Build Times */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>PAGE BUILD TIMES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            HOW FAST BOBBY SHIPS NOW
          </motion.h2>

          <div className="space-y-2">
            {buildTimes.map((page, i) => (
              <motion.div
                key={page.page}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.05)}
              >
                <div className="md:col-span-5">
                  <span className="font-body text-base text-aom-orange font-mono">{page.page}</span>
                </div>
                <div className="md:col-span-4">
                  <span className="font-body text-sm text-white/60">{page.time}</span>
                </div>
                <div className="md:col-span-3">
                  <span className="font-body text-sm text-aom-text-muted">{page.commits} commit{page.commits !== 1 ? 's' : ''}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.p className="font-body text-sm text-white/40 mt-6" {...fadeUp()}>
            By Mar 10, Bobby was shipping entire pages in single commits. Early pages (dashboard, brand) required many iterations. Late pages ship as one-shots.
          </motion.p>
        </div>
      </section>

      {/* Starter Kit Validation */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>ESTIMATE VALIDATION</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            IS "7 DAYS FOR STARTER KIT" REALISTIC?
          </motion.h2>

          <div className="space-y-3 mb-10">
            {starterKit.map((item, i) => (
              <motion.div
                key={item.deliverable}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 p-4 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <div className="md:col-span-4">
                  <span className="font-body text-base text-white/70">{item.deliverable}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-body text-sm text-aom-orange">{item.actual}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-body text-sm text-aom-text-muted">{item.estimate}</span>
                </div>
                <div className="md:col-span-4">
                  <span className="font-body text-sm text-white/40">{item.verdict}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {timeframes.map((tf, i) => (
              <motion.div
                key={tf.time}
                className={`p-6 md:p-8 border ${i === 1 ? 'border-aom-orange/40 bg-aom-orange/[0.05]' : 'border-white/10 bg-white/[0.02]'} flex flex-col`}
                {...fadeUp(i * 0.12)}
              >
                <span className={`text-xs font-body font-medium uppercase tracking-[0.15em] ${i === 1 ? 'text-aom-orange' : 'text-aom-text-muted'} mb-2`}>
                  {tf.label}
                </span>
                <p className="font-headline text-3xl font-bold text-aom-orange mb-4">{tf.time}</p>
                <ul className="space-y-2 mt-auto">
                  {tf.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="w-1 h-1 rounded-full bg-aom-orange mt-2.5 flex-shrink-0" />
                      <span className="font-body text-sm text-white/50">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Line */}
      <section className="bg-aom-night-card border-t border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            className="font-headline text-xl md:text-2xl font-bold text-aom-text-light leading-snug max-w-[55ch] mx-auto mb-4"
            {...fadeUp()}
          >
            The system went from nothing to a 12-agent AI operations platform with email, calendar, Telegram, QA, orchestration, and a 10+ page website in 5 days. That's not an estimate. That's what the git log says.
          </motion.p>
          <motion.p className="font-body text-base text-white/50 max-w-[50ch] mx-auto" {...fadeUp(0.1)}>
            Quoting 7 days for a client starter kit is conservative and appropriate. The honest number for a basic setup is closer to 3-4 days.
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
          Build velocity audit by Elon (System/Infrastructure). March 10, 2026.
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
