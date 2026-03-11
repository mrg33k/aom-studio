import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Minus, Shield, Cpu, FileText, Workflow, Server, Wrench } from 'lucide-react';

function useSEO() {
  useEffect(() => {
    document.title = 'Masterplan System Audit | AOM Brief';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Full system audit of AOM-EA. 13 agents, 29 skills, every context file, infrastructure, and pipeline assessed. No sugar-coating.');
    setMeta('og:title', 'Masterplan Audit: Full System Assessment', true);
    setMeta('og:description', 'Everything read, everything assessed. System scorecard: 5.5/10. Here\'s what\'s working and what\'s broken.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/masterplan', true);
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

const statusColors = {
  STRONG: '#22c55e',
  GOOD: '#60a5fa',
  STALE: '#eab308',
  BLOCKED: '#ef4444',
  IDLE: '#8A847C',
};

const agents = [
  { name: 'Bobby', role: 'Web Dev', status: 'STRONG', summary: 'Well-written AGENT.md. Pipeline position clear. Design standard baked in.' },
  { name: 'Mom', role: 'Chief of Staff', status: 'STRONG', summary: 'Best-written agent file in the system. Clear authority model. Not actually auto-running (major gap).' },
  { name: 'Jacob', role: 'Outreach', status: 'GOOD', summary: 'Well-defined. Lives in outreach/ instead of projects/. Structural fix needed.' },
  { name: 'Steffen', role: 'Brand', status: 'IDLE', summary: 'Dark Frame shipped. Loader spec written. Needs a new mission or gets stale.' },
  { name: 'Alex', role: 'Deal Architect', status: 'STALE', summary: 'Hasn\'t run since Mar 7. "3 Piece Special" killed but AGENT.md doesn\'t reflect it.' },
  { name: 'Cleo', role: 'Content', status: 'BLOCKED', summary: 'Primrose v3 rejected. New role: strategist, not editor. AGENT.md still describes old workflow.' },
  { name: 'Tony', role: 'Social Media', status: 'STALE', summary: 'Postiz running, zero accounts connected. 2 session log entries. Plan, not results.' },
  { name: 'Paige', role: 'Client Success', status: 'GOOD', summary: 'Clean. Run twice. Should be on weekly auto-run.' },
  { name: 'Colton', role: 'Bobby\'s Backup', status: 'GOOD', summary: 'Relief pitcher. Rarely needed. CTA intake flow spec ready for building.' },
  { name: 'Elon', role: 'System', status: 'STRONG', summary: 'Heavy activity Mar 9-10. DMARC, email freshness, relay fixes. Good output.' },
  { name: 'Elmo', role: 'QA', status: 'STRONG', summary: 'R1-R5 QA rounds complete. Both sites PASS. Comprehensive 8-layer inspection.' },
];

const scorecard = [
  { category: 'Agent Definitions', score: 7, notes: 'Most agents well-defined. Cleo needs update. Alex stale.' },
  { category: 'Context Files', score: 6, notes: 'Functional but contradictions exist. work.md and team.md stale.' },
  { category: 'Skills', score: 7, notes: 'Good coverage. Overlaps in social media. Some unused.' },
  { category: 'Pipeline', score: 5, notes: 'Well-designed on paper. Not automated. Mom doesn\'t auto-run.' },
  { category: 'Security', score: 2, notes: 'Credentials in committed files. Flagged before, still unfixed.' },
  { category: 'Repo Health', score: 4, notes: '779MB for a markdown repo. Screenshots and media piling up.' },
  { category: 'Relay System', score: 8, notes: '3-layer resilience. Working well. Good design.' },
  { category: 'Documentation', score: 8, notes: 'Thorough. Sometimes duplicated content.' },
  { category: 'Automation', score: 3, notes: 'Almost everything manual. Infinity Rings are aspirational.' },
];

const overallScore = 5.5;

const p0Items = [
  'Rotate exposed credentials (GitHub PAT, Apify, Apollo, LinkedIn). Anyone with repo access has these tokens.',
];

const p1Items = [
  'Set up Mom on launchd. Daily 8am scan. This single change makes the pipeline self-driving.',
  'Move Jacob to projects/. Update all references.',
  'Clean up Elmo screenshots (149MB of accumulated QA images).',
  'Update Cleo\'s AGENT.md for new strategist role.',
  'Fix goals.md (remove James, update Ambition date, add Included Health).',
];

const p2Items = [
  'Consolidate social media skills (3 overlapping skills).',
  'Resolve Mom AGENT.md vs mom-scan SKILL.md duplication.',
  'Fix work.md contradictions.',
  'Fix team.md (remove/update James).',
  'Delete projects/alex/ duplicate folder.',
  'Archive more aggressively (weekly, not monthly).',
  'Build client onboarding skill.',
];

const bottlenecks = [
  {
    title: 'Editing Capacity',
    severity: 'critical',
    desc: 'Patrik and Ash are the only editors. No AI agent can replace DaVinci Resolve editing. Blocks: KOHRS (10 videos), Skylar, ISA, Ambition social.',
  },
  {
    title: 'Patrik as Approval Bottleneck',
    severity: 'high',
    desc: 'Jacob waits for email approval. Content waits for Resolve. Ambition waits for client contact. Bobby waits for image decisions. Too many TYPE B items.',
  },
  {
    title: 'No Scheduled Agent Runs',
    severity: 'high',
    desc: 'Every agent runs on manual trigger. Infinity Rings describe continuous loops, but none actually loop. Mom was supposed to solve this but has no automation.',
  },
];

const topFive = [
  'Mom running daily at 8am. Wake up to a push list. Agents already working.',
  'Cleo as a real strategist. "I have 2 hours to edit." Cleo responds with which clips, what order, what story.',
  'Credential rotation done. One less thing to worry about.',
  'Automatic punch list cleanup. Completed items auto-archive weekly.',
  'ISA production plan. 48 days to deadline. Cleo writes the plan now before it becomes a fire.',
];

function ScoreBar({ score, max = 10 }) {
  const pct = (score / max) * 100;
  let color = '#ef4444';
  if (score >= 7) color = '#22c55e';
  else if (score >= 5) color = '#eab308';
  else if (score >= 3) color = '#E85D26';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/10 rounded-sm overflow-hidden">
        <div className="h-full rounded-sm transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="font-headline text-lg font-bold" style={{ color }}>{score}/{max}</span>
    </div>
  );
}

export default function BriefMasterplan() {
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
            <SectionKicker>SYSTEM AUDIT / MARCH 10, 2026</SectionKicker>
          </motion.div>

          <motion.div {...fadeUp(0.1)}>
            <OrangeBar />
          </motion.div>

          <motion.h1
            className="font-headline text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-6"
            {...fadeUp(0.15)}
          >
            MASTERPLAN AUDIT: FULL SYSTEM ASSESSMENT
          </motion.h1>

          <motion.p
            className="font-body text-lg md:text-xl text-aom-text-muted leading-relaxed max-w-[55ch] mb-6"
            {...fadeUp(0.2)}
          >
            Everything read, everything assessed. No sugar-coating. 13 agents, 29 skills, every context file, and the full infrastructure stack.
          </motion.p>

          <motion.div className="flex items-center gap-3" {...fadeUp(0.25)}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 text-sm font-body text-aom-text-muted">
              <span className="w-2 h-2 rounded-full bg-[#22d3ee]" />
              Elon (System/Infrastructure)
            </span>
          </motion.div>
        </div>
      </section>

      {/* Overall Score */}
      <section className="bg-aom-night-card border-y border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-5xl mx-auto text-center">
          <motion.p className="font-body text-sm uppercase tracking-[0.2em] text-aom-text-muted mb-4" {...fadeUp()}>
            OVERALL SYSTEM SCORE
          </motion.p>
          <motion.p className="font-headline text-7xl md:text-8xl font-bold text-aom-orange mb-2" {...fadeUp(0.1)}>
            {overallScore}
          </motion.p>
          <motion.p className="font-body text-lg text-aom-text-muted" {...fadeUp(0.15)}>
            out of 10
          </motion.p>
          <motion.p className="font-body text-base text-white/50 mt-4 max-w-[50ch] mx-auto" {...fadeUp(0.2)}>
            Strong foundation, weak execution on automation and hygiene. Running at maybe 40% of potential.
          </motion.p>
        </div>
      </section>

      {/* Agent Health */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>AGENT HEALTH</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            11 AGENTS ASSESSED
          </motion.h2>

          <div className="space-y-3">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.name}
                className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 p-4 md:p-5 border border-white/10 bg-white/[0.02]"
                {...fadeUp(i * 0.05)}
              >
                <div className="flex items-center gap-3 md:w-48 flex-shrink-0">
                  <span
                    className="inline-block px-2 py-0.5 text-xs font-body font-medium uppercase tracking-wider rounded-sm"
                    style={{ backgroundColor: `${statusColors[agent.status]}20`, color: statusColors[agent.status] }}
                  >
                    {agent.status}
                  </span>
                  <span className="font-headline text-base font-bold text-aom-text-light">{agent.name}</span>
                </div>
                <span className="font-body text-sm text-aom-text-muted md:w-32 flex-shrink-0">{agent.role}</span>
                <span className="font-body text-sm text-white/50 flex-1">{agent.summary}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scorecard */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>SYSTEM SCORECARD</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            CATEGORY BREAKDOWN
          </motion.h2>

          <div className="space-y-5">
            {scorecard.map((item, i) => (
              <motion.div key={item.category} {...fadeUp(i * 0.06)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-headline text-base font-bold text-aom-text-light">{item.category}</span>
                </div>
                <ScoreBar score={item.score} />
                <p className="font-body text-sm text-white/40 mt-1">{item.notes}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottlenecks */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>PIPELINE BOTTLENECKS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT'S SLOWING EVERYTHING DOWN
          </motion.h2>

          <div className="space-y-6">
            {bottlenecks.map((b, i) => (
              <motion.div
                key={b.title}
                className={`p-6 md:p-8 border ${b.severity === 'critical' ? 'border-red-500/30 bg-red-500/[0.05]' : 'border-yellow-500/30 bg-yellow-500/[0.05]'}`}
                {...fadeUp(i * 0.1)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle size={18} className={b.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'} />
                  <span className={`text-xs font-body font-medium uppercase tracking-wider ${b.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {b.severity}
                  </span>
                </div>
                <h3 className="font-headline text-xl font-bold text-aom-text-light mb-2">{b.title}</h3>
                <p className="font-body text-base text-white/60 leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Optimization Recommendations */}
      <section className="bg-aom-night-card py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>OPTIMIZATION RECOMMENDATIONS</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            PRIORITY ORDER
          </motion.h2>

          {/* P0 */}
          <motion.div className="mb-8" {...fadeUp()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 text-xs font-body font-bold uppercase tracking-wider bg-red-500/20 text-red-400 rounded-sm">P0 CRITICAL</span>
              <span className="text-sm font-body text-aom-text-muted">Do today</span>
            </div>
            {p0Items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 border border-red-500/20 bg-red-500/[0.03] mb-2">
                <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <span className="font-body text-base text-white/70">{item}</span>
              </div>
            ))}
          </motion.div>

          {/* P1 */}
          <motion.div className="mb-8" {...fadeUp(0.1)}>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 text-xs font-body font-bold uppercase tracking-wider bg-aom-orange/20 text-aom-orange rounded-sm">P1 HIGH</span>
              <span className="text-sm font-body text-aom-text-muted">This week</span>
            </div>
            <div className="space-y-2">
              {p1Items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 border border-white/10 bg-white/[0.02]">
                  <span className="w-1.5 h-1.5 rounded-full bg-aom-orange mt-2 flex-shrink-0" />
                  <span className="font-body text-base text-white/70">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* P2 */}
          <motion.div {...fadeUp(0.2)}>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 text-xs font-body font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 rounded-sm">P2 MEDIUM</span>
              <span className="text-sm font-body text-aom-text-muted">Next 2 weeks</span>
            </div>
            <div className="space-y-2">
              {p2Items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 border border-white/10 bg-white/[0.02]">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <span className="font-body text-base text-white/60">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* What Would Make Patrik's Life Easier */}
      <section className="bg-aom-night py-12 px-6 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp()}>
            <SectionKicker>THE REAL TALK</SectionKicker>
            <OrangeBar />
          </motion.div>

          <motion.h2
            className="font-headline text-2xl md:text-4xl font-bold uppercase tracking-[-0.02em] text-aom-text-light leading-[0.95] mb-10"
            {...fadeUp(0.1)}
          >
            WHAT WOULD ACTUALLY HELP
          </motion.h2>

          <div>
            {topFive.map((item, i) => (
              <motion.div
                key={i}
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 py-8 ${i < topFive.length - 1 ? 'border-b border-white/10' : ''}`}
                {...fadeUp(i * 0.1)}
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

      {/* Closing */}
      <section className="bg-aom-night-card border-t border-white/10 py-12 px-6 md:py-16 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            className="font-headline text-xl md:text-2xl font-bold text-aom-text-light leading-snug max-w-[55ch] mx-auto"
            {...fadeUp()}
          >
            The system is impressive in design. It's running at 40% of potential because nothing is automated and security is a ticking clock. Fix Mom's launchd and rotate credentials. The whole system wakes up.
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
          System audit by Elon (System/Infrastructure). March 10, 2026.
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
