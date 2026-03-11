import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, CheckSquare, Users, Target, AlertTriangle, Clock, Rocket, Zap } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'AI Advisory Sprint Plan | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Full build sprint: sellable AI advisory product by Friday March 14. Seven agents, daily milestones, every deliverable assigned.');
    setMeta('og:title', 'AI Advisory Sprint: Build It By Friday', true);
    setMeta('og:description', 'Council brief with Steve, Alex, Jacob, Elon, Bobby, Steffen, and Mom. Daily milestones, dependencies, and what could go wrong.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/sprint-plan', true);
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

const agents = [
  { name: 'Steve', role: 'AI Advisory Lead', color: '#E85D26' },
  { name: 'Alex', role: 'Deal Architect', color: '#60a5fa' },
  { name: 'Jacob', role: 'Outreach', color: '#22c55e' },
  { name: 'Elon', role: 'System/Infrastructure', color: '#22d3ee' },
  { name: 'Bobby', role: 'Web Dev', color: '#f97316' },
  { name: 'Steffen', role: 'Brand', color: '#a78bfa' },
  { name: 'Mom', role: 'Operations', color: '#ec4899' },
];

const context = [
  { number: '$11.4B', label: 'AI consulting market' },
  { number: '37.5%', label: 'CAGR growth' },
  { number: '5 days', label: 'AOM built 12-agent system' },
  { number: '$5k/mo', label: 'Social + AI ops bundle per client' },
];

const steveSays = [
  'Audit questionnaire: polished 30 questions, section by section. This IS the first 30 minutes of the audit.',
  'AI Opportunity Roadmap template: branded report scoring 6 areas, top 5-7 opportunities, hours saved, implementation timeline.',
  'AOM case study one-pager: "12 agents, 5 days, 280 commits." Real numbers, real proof.',
  'Pricing sheet: one page, three tiers. $2,500 audit, $5-8k build, $1.5-3k/month retainer.',
  'Proposal template: two pages max. Fill-in-the-blanks, ready in 5 minutes for any prospect.',
];

const alexSays = [
  'CPAs sit in the middle of every small business\'s operations. When a CPA says "talk to these guys," the client takes the meeting.',
  'Two email angles: "Your clients need this" (referral play) and "Your own practice" (direct sell).',
  'The two-paths positioning works: creative + AI systems. One vendor for multiple needs. The portfolio proves AOM isn\'t another chatbot agency.',
  'Bundle pricing: social ($3k) + AI ops ($2k) = $5k/client/month. 10 clients = $600k/year.',
];

const jacobSays = [
  '40-50 CPA/financial service contacts from Apollo. Phoenix metro.',
  '8-10 emails/day. Same discipline as construction outreach.',
  'CPAs are analytical. Lead with specific operational pain points, not hype.',
  'Three-email sequence: intro > value add (5 days) > soft ask (7 days).',
  'Will NOT work: generic "AI can help" emails. CPAs delete 50 of those a week.',
];

const dailySchedule = [
  {
    day: 'TUESDAY',
    date: 'Mar 11',
    tasks: [
      { agent: 'Steve', color: '#E85D26', task: 'Audit questionnaire (final) + AOM case study draft' },
      { agent: 'Alex', color: '#60a5fa', task: 'CPA positioning brief + email angles for Jacob' },
      { agent: 'Jacob', color: '#22c55e', task: 'Pull 40-50 CPA/financial contacts from Apollo' },
      { agent: 'Elon', color: '#22d3ee', task: 'Client template repo structure + onboarding questionnaire format' },
      { agent: 'Bobby', color: '#f97316', task: 'Finish /system page' },
      { agent: 'Steffen', color: '#a78bfa', task: 'Pricing card spec + "Two Paths" visual spec' },
    ],
  },
  {
    day: 'WEDNESDAY',
    date: 'Mar 12',
    tasks: [
      { agent: 'Steve', color: '#E85D26', task: 'AI Opportunity Roadmap template + pricing sheet' },
      { agent: 'Alex', color: '#60a5fa', task: 'Bundle pricing doc + competitive one-pager' },
      { agent: 'Jacob', color: '#22c55e', task: 'Draft first 10 AI advisory pitch emails' },
      { agent: 'Elon', color: '#22d3ee', task: 'System architecture doc + portability matrix' },
      { agent: 'Bobby', color: '#f97316', task: '/audit landing page + pricing section on /system' },
      { agent: 'Steffen', color: '#a78bfa', task: '/audit page design spec delivered to Bobby (AM)' },
    ],
  },
  {
    day: 'THURSDAY',
    date: 'Mar 13',
    tasks: [
      { agent: 'Steve', color: '#E85D26', task: 'Proposal template + objection talk tracks' },
      { agent: 'Alex', color: '#60a5fa', task: 'Review alignment with Steve\'s materials' },
      { agent: 'Jacob', color: '#22c55e', task: 'Draft remaining emails + 3-email sequence plan' },
      { agent: 'Elon', color: '#22d3ee', task: 'Screenshot library + audit scoring template finalized' },
      { agent: 'Bobby', color: '#f97316', task: '"Two Paths" section + polish + Elmo QA' },
      { agent: 'Steffen', color: '#a78bfa', task: 'Case study layout spec + review Bobby\'s builds' },
    ],
  },
  {
    day: 'FRIDAY',
    date: 'Mar 14',
    tasks: [
      { agent: 'Steve', color: '#E85D26', task: 'Final review. Everything polished and meeting-ready.' },
      { agent: 'Alex', color: '#60a5fa', task: 'Final review of all go-to-market materials' },
      { agent: 'Jacob', color: '#22c55e', task: 'Submit CPA email batch for Patrik approval. Send Monday.' },
      { agent: 'Elon', color: '#22d3ee', task: 'Everything tested, reviewed, packaged' },
      { agent: 'Bobby', color: '#f97316', task: 'Bug fixes, OG images, final deploy' },
      { agent: 'Steffen', color: '#a78bfa', task: 'Final visual review against specs' },
      { agent: 'Mom', color: '#ec4899', task: 'Verify all deliverables. Clear the sprint board.' },
    ],
  },
];

const deliverableCategories = [
  {
    category: 'Sales Materials',
    owner: 'Steve',
    color: '#E85D26',
    items: [
      'Audit questionnaire (30 questions, section-by-section)',
      'AI Opportunity Roadmap template (branded deliverable)',
      'AOM case study one-pager (12 agents, 5 days, real metrics)',
      'Pricing sheet (3 tiers + bundle)',
      'Proposal template (2-page, fill-in-the-blank)',
      'Objection talk tracks',
    ],
  },
  {
    category: 'Go-to-Market',
    owner: 'Alex',
    color: '#60a5fa',
    items: [
      'CPA positioning brief (email angles + talk tracks)',
      'AI advisory outreach template (professional services)',
      'Bundle pricing strategy (social + AI ops, margin analysis)',
      'Competitive one-pager (AOM vs alternatives)',
    ],
  },
  {
    category: 'Outreach',
    owner: 'Jacob',
    color: '#22c55e',
    items: [
      '40-50 CPA/financial service contacts (Apollo, Phoenix)',
      '15-20 personalized AI advisory pitch emails',
      '3-email sequence plan (intro > value > soft ask)',
      'Adapted voice template for professional services',
    ],
  },
  {
    category: 'Infrastructure',
    owner: 'Elon',
    color: '#22d3ee',
    items: [
      'Client template repo (folder structure + doc templates)',
      'AOM system architecture doc (prospect-facing visual)',
      'Portability matrix (reusable vs custom vs internal-only)',
      'Screenshot library (10-15 real system screenshots)',
    ],
  },
  {
    category: 'Website',
    owner: 'Bobby + Steffen',
    color: '#f97316',
    items: [
      '/system page complete',
      '/audit landing page live (headline, bullets, price, CTA)',
      'Pricing section on /system (3 tiers, visual push to bundle)',
      '"Two Paths" section (creative + AI side by side)',
      'OG/meta tags on all new pages',
    ],
  },
];

const dependencies = [
  { item: 'Steffen\'s /audit page spec MUST land Wed AM', blocks: 'Bobby can\'t build Wed afternoon' },
  { item: 'Steve\'s case study data', blocks: 'Bobby\'s content for /system and /audit pages' },
  { item: 'Alex\'s email template MUST land Tue', blocks: 'Jacob can\'t draft Wed' },
  { item: 'Elon\'s screenshot library', blocks: 'Steve\'s case study and Bobby\'s pages' },
];

const risks = [
  'Bobby is juggling /system + /audit + Ambition site. Recommendation: defer Ambition to next week.',
  'Jacob needs Patrik\'s explicit approval to target CPAs (new vertical). Get that tonight.',
  'Steve\'s audit questionnaire is the single most important deliverable. If it\'s not done Tue, everything slips.',
];

const decisionsNeeded = [
  'Approve CPA/financial services as first AI advisory test audience?',
  'Defer Ambition website launch to next week?',
  'Subject line for CPA emails: keep current style or adapt for professional services?',
  'Who runs the actual audit? Patrik solo, Patrik + Ash, or eventually Steve can guide?',
];

const consensus = [
  'AI advisory stays AOM-branded. No sub-brand.',
  'The audit ($2,500) is the entry product. It\'s what we sell first.',
  'CPAs/financial services are the right first test audience.',
  '"Two paths" (creative + AI systems) side by side is the killer positioning.',
  'The AOM case study is the proof. Without it, we\'re just another agency claiming AI expertise.',
  'Defer Ambition launch. Focus all build capacity on AI advisory.',
  'The audit questionnaire is the most important single deliverable.',
];

export default function BriefSprintPlan() {
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
            <SectionKicker>SPRINT PLAN / MARCH 10, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            AI ADVISORY PRODUCT: BUILD IT BY FRIDAY
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.2)}
          >
            Seven agents, four days, one goal: a real, sellable AI advisory product by end of day Friday, March 14. Council brief with daily milestones and every deliverable assigned.
          </motion.p>

          <motion.div className="flex flex-wrap gap-2" {...fadeUp(0.25)}>
            {agents.map(a => (
              <span key={a.name} className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {a.name}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Context Numbers */}
      <section className="bg-aom-night-card border-y border-white/10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-0">
          {context.map((stat, i) => (
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

      {/* Agent Perspectives */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>AGENT PERSPECTIVES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT EACH AGENT BRINGS TO THE TABLE
          </motion.h2>

          {/* Steve */}
          <motion.div className="p-6 md:p-8 border border-white/10 bg-white/[0.02] mb-6" {...fadeUp()}>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-3 h-3 rounded-full bg-[#E85D26]" />
              <h3 className="font-headline text-xl font-bold text-aom-text-light">Steve says: "Here's what must be TRUE by Friday"</h3>
            </div>
            <ul className="space-y-3">
              {steveSays.map((point, j) => (
                <li key={j} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mt-2 flex-shrink-0" />
                  <span className="font-body text-base text-white/70 leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Alex */}
          <motion.div className="p-6 md:p-8 border border-white/10 bg-white/[0.02] mb-6" {...fadeUp(0.1)}>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-3 h-3 rounded-full bg-[#60a5fa]" />
              <h3 className="font-headline text-xl font-bold text-aom-text-light">Alex says: "Go-to-market, rubber meets road"</h3>
            </div>
            <ul className="space-y-3">
              {alexSays.map((point, j) => (
                <li key={j} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] mt-2 flex-shrink-0" />
                  <span className="font-body text-base text-white/70 leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Jacob */}
          <motion.div className="p-6 md:p-8 border border-white/10 bg-white/[0.02]" {...fadeUp(0.2)}>
            <div className="flex items-center gap-3 mb-5">
              <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
              <h3 className="font-headline text-xl font-bold text-aom-text-light">Jacob says: "Here's the outreach play"</h3>
            </div>
            <ul className="space-y-3">
              {jacobSays.map((point, j) => (
                <li key={j} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] mt-2 flex-shrink-0" />
                  <span className="font-body text-base text-white/70 leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Daily Schedule */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>DAILY MILESTONES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            THE SPRINT CALENDAR
          </motion.h2>

          <div className="space-y-8">
            {dailySchedule.map((day, i) => (
              <motion.div key={day.day} {...fadeUp(i * 0.1)}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-headline text-2xl font-bold text-aom-orange">{day.day}</span>
                  <span className="font-body text-sm text-aom-text-muted">{day.date}</span>
                </div>
                <div className="space-y-2">
                  {day.tasks.map((task, j) => (
                    <div
                      key={j}
                      className="flex items-start gap-3 p-4 border border-white/10 bg-white/[0.02]"
                    >
                      <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: task.color }} />
                      <span className="font-headline text-sm font-bold text-aom-text-muted w-16 flex-shrink-0">{task.agent}</span>
                      <span className="font-body text-base text-white/60">{task.task}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>FRIDAY DELIVERABLES</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            THE CHECKLIST
          </motion.h2>

          <div className="space-y-6">
            {deliverableCategories.map((cat, i) => (
              <motion.div
                key={cat.category}
                className="p-6 md:p-8 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.08)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="font-headline text-lg font-bold text-aom-text-light">{cat.category}</h3>
                  <span className="font-body text-sm text-aom-text-muted ml-auto">{cat.owner}</span>
                </div>
                <ul className="space-y-2">
                  {cat.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <div className="w-4 h-4 border border-white/20 mt-0.5 flex-shrink-0" />
                      <span className="font-body text-base text-white/60">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Dependencies + Risks */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>DEPENDENCIES + RISKS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT COULD GO WRONG
          </motion.h2>

          <div className="space-y-4 mb-10">
            {dependencies.map((dep, i) => (
              <motion.div
                key={i}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border border-yellow-500/20 bg-yellow-500/[0.03]"
                {...fadeUp(i * 0.08)}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span className="font-body text-base text-white/70">{dep.item}</span>
                </div>
                <div>
                  <span className="font-body text-sm text-yellow-400/70">Blocks: {dep.blocks}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-3">
            {risks.map((risk, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3 p-4 border border-red-500/20 bg-red-500/[0.03]"
                {...fadeUp(i * 0.08)}
              >
                <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <span className="font-body text-base text-white/70">{risk}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Consensus */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>FULL CONSENSUS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHERE EVERY AGENT AGREES
          </motion.h2>

          <div className="space-y-4">
            {consensus.map((point, i) => (
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
        </div>
      </section>

      {/* Decisions */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
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
            {decisionsNeeded.map((d, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-4 p-5 border border-white/10"
                {...fadeUp(i * 0.08)}
              >
                <span className="font-headline text-lg font-bold text-aom-orange flex-shrink-0">{i + 1}.</span>
                <p className="font-body text-base text-white/70 leading-relaxed">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Line */}
      <section className="bg-aom-night border-t border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            className="font-headline text-xl md:text-2xl font-bold text-aom-text-light leading-snug max-w-[55ch] mx-auto mb-4"
            {...fadeUp()}
          >
            Tuesday deliverables land Tuesday. Wednesday deliverables land Wednesday. No slippage. Mom is watching.
          </motion.p>
          <motion.p className="font-body text-base text-white/50 max-w-[50ch] mx-auto" {...fadeUp(0.1)}>
            All of this is achievable by Friday. But only if every agent hits their marks. Friday, we have a product.
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
          Sprint plan from Council brief. Steve, Alex, Jacob, Elon, Bobby, Steffen, Mom. March 10, 2026.
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
