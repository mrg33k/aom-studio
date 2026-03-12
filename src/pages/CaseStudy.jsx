import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChevronDown, ChevronRight, Calculator, ClipboardCheck, MessageCircle, Check } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

/* ── SEO ────────────────────────────────────────────────────────── */
function useSEO() {
  useEffect(() => {
    document.title = 'How AOM Runs on AI | Case Study';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', '12 AI agents. 280+ commits. 2 weeks. $0 new hires. See how a creative agency built the AI system it now sells.');
    setMeta('og:title', 'How AOM Runs on AI | Case Study', true);
    setMeta('og:description', '12 AI agents. 280+ commits. 2 weeks. $0 new hires. See how a creative agency built the AI system it now sells.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/case-study', true);
    setMeta('twitter:card', 'summary_large_image', false);
  }, []);
}

/* ── Noise overlay (shared across sections) ─────────────────────── */
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

/* ── Micro-label + orange bar reusable ──────────────────────────── */
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

/* ── Count-up hook ──────────────────────────────────────────────── */
function useCountUp(end, duration = 1400, inView = false) {
  const [value, setValue] = useState(0);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced) { setValue(end); return; }
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, inView, prefersReduced]);

  return value;
}

/* ════════════════════════════════════════════════════════════════
   SECTION 0: HERO
   ════════════════════════════════════════════════════════════════ */
function HeroSection() {
  const scrollToNext = () => {
    const el = document.getElementById('section-problem');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0C0C0C]">
      <NoiseOverlay />
      {/* Subtle warm radial glow */}
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(232, 93, 38, 0.04), transparent)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-4">
            CASE STUDY
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="w-12 h-[2px] bg-[#E85D26] mx-auto mb-8" />
        </Reveal>

        <Reveal delay={0.2}>
          <h1 className="font-headline text-5xl md:text-6xl lg:text-7xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB] leading-[0.95]">
            WE BUILT THE SYSTEM WE SELL.
          </h1>
        </Reveal>

        <Reveal delay={0.35}>
          <p className="text-[#A8A29E] text-lg md:text-xl text-center mt-8 max-w-2xl mx-auto leading-relaxed font-body">
            12 AI agents. 280+ commits. 2 weeks. $0 new hires. Here's what happened when a creative agency stopped talking about AI and started running on it.
          </p>
        </Reveal>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={scrollToNext}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity z-10 cursor-pointer"
      >
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C]">
          READ THE STORY
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
   SECTION 1: THE PROBLEM
   ════════════════════════════════════════════════════════════════ */
const painPoints = [
  { num: '01', title: 'OUTREACH WAS MANUAL', detail: 'Every prospecting email was written from scratch. No templates, no tracking, no follow-up system. Leads went cold because nobody was watching the inbox at scale.' },
  { num: '02', title: "CLIENT TRACKING LIVED IN PATRIK'S HEAD", detail: "Which client was waiting on a deliverable? Who needed a follow-up? What was overdue? The answers existed in one place: Patrik's memory. If he forgot, it fell through." },
  { num: '03', title: 'QUALITY CONTROL WAS REACTIVE', detail: 'Bugs got caught when a client mentioned them. Pages went live without being checked at every breakpoint. Accessibility issues only surfaced after launch, never before.' },
  { num: '04', title: 'BRAND CONSISTENCY WAS LUCK', detail: 'Fonts drifted. Colors shifted. Spacing varied between pages. Without a system enforcing standards, every deliverable was a coin flip on whether it matched the brand.' },
  { num: '05', title: 'OPERATIONS RAN ON MEMORY', detail: "What needs to happen next? Who's working on what? What's blocked? There was no dashboard, no task router, no system that surfaced priorities. Just a mental checklist that reset every morning." },
  { num: '06', title: '24/7 AVAILABILITY WAS IMPOSSIBLE', detail: "Client messages at 11 PM sat until morning. Weekend requests waited until Monday. Urgent fixes waited for Patrik to wake up, check his phone, and context-switch from whatever he was doing." },
];

function ProblemSection() {
  return (
    <section id="section-problem" className="relative bg-[#0C0C0C] py-16 md:py-24 lg:py-32">
      <NoiseOverlay />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="BEFORE" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            ONE PERSON. EVERY ROLE.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="text-[#A8A29E] text-base md:text-lg leading-relaxed max-w-3xl mt-8 font-body space-y-6">
            <p>
              AOM is a creative production company in Phoenix. Video, web, brand, social. Two people, a dozen clients, and a pipeline held together by memory and momentum. Patrik Matheson ran operations, strategy, client relationships, outreach, quality control, and creative production. All of it. Every day.
            </p>
            <p>
              The bottleneck was never talent. It was time. One person physically cannot produce the work, find the next client, follow up on invoices, check every deliverable at every screen size, and keep the brand consistent across every touchpoint. Something always slipped. And when you're the only one who knows everything, you can't take a day off without the whole system pausing.
            </p>
          </div>
        </Reveal>

        {/* Pain Points Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-16">
          {painPoints.map((p, i) => (
            <Reveal key={p.num} delay={i * 0.12} className="relative">
              <div className="bg-[#1A1A17] border border-[#292524] p-6 relative overflow-hidden hover:border-[#44403C] transition-colors duration-300">
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#78716C]" />
                <p className="text-[10px] font-mono font-bold text-[#78716C] mb-3">{p.num}</p>
                <h3 className="font-headline text-base font-extrabold italic uppercase tracking-tight text-[#F5F0EB] mb-2">
                  {p.title}
                </h3>
                <p className="text-[#A8A29E] text-sm leading-relaxed font-body">{p.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 2: THE DECISION
   ════════════════════════════════════════════════════════════════ */
function DecisionSection() {
  return (
    <section className="relative bg-[#141412] py-16 md:py-24 lg:py-32 overflow-hidden">
      <NoiseOverlay />
      {/* Orange gradient wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <SectionLabel label="THE TURN" centered />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            WHAT IF THE AGENCY RAN ITSELF?
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="text-[#A8A29E] text-base md:text-lg leading-relaxed max-w-3xl mx-auto mt-8 text-center font-body space-y-6">
            <p>
              The conventional answer is hiring. An outreach coordinator. A project manager. A QA tester. A brand manager. That's $200,000 to $280,000 a year in salary alone, before benefits, before office space, before the months of training, before you realize two of the four aren't the right fit and start the process again.
            </p>
            <p>
              Patrik chose a different path. Using Claude Code as the foundation, he built specialized AI agents, each one owning a defined part of the business. Not a chatbot that answers questions. Not a plugin that automates one workflow. A full operations layer. Twelve agents working in a coordinated pipeline, handing work to each other, enforcing standards, and running 24 hours a day without supervision.
            </p>
          </div>
        </Reveal>

        {/* Pull Quote */}
        <Reveal delay={0.35}>
          <div className="mt-16 mb-8 max-w-3xl mx-auto relative text-left">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E85D26]" />
            <p className="font-headline text-xl md:text-2xl lg:text-3xl font-extrabold italic text-[#E85D26] leading-snug pl-8">
              "Isn't it smart for me as a small business owner to help build tailored solutions for people since I've been able to do it for myself?"
            </p>
            <p className="text-[#A8A29E] text-sm font-body mt-6 pl-8">
              Patrik Matheson, AOM
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 3: THE SYSTEM
   ════════════════════════════════════════════════════════════════ */
const pipelineNodes = [
  { letter: 'E', name: 'Elon', role: 'System', color: '#A8A29E' },
  { letter: 'M', name: 'Mom', role: 'Operations', color: '#7C9A72' },
  { letter: 'A', name: 'Alex', role: 'Strategy', color: '#C9A84C' },
  { letter: 'S', name: 'Steffen', role: 'Brand', color: '#E85D26' },
  { letter: 'B', name: 'Bobby', role: 'Build', color: '#E85D26' },
  { letter: 'Q', name: 'Elmo', role: 'QA', color: '#7C9A72' },
  { letter: 'P', name: 'Patrik', role: 'Approve', color: '#F5F0EB' },
];

const agentCards = [
  { name: 'Jacob', title: 'OUTREACH ENGINE', desc: 'Researches prospects, writes personalized emails, tracks responses across every campaign.', replaced: 'Manual copy-paste emails with no tracking', color: '#E85D26' },
  { name: 'Mom', title: 'CHIEF OF STAFF', desc: 'Scans priorities, routes work to the right agent, closes loops across every open thread.', replaced: 'Patrik mentally juggling every open task', color: '#7C9A72' },
  { name: 'Paige', title: 'CLIENT HEALTH', desc: 'Monitors client satisfaction, flags risks before they escalate, tracks every deliverable status.', replaced: "Client relationships tracked in Patrik's head", color: '#C9A84C' },
  { name: 'Elmo', title: 'QUALITY GATE', desc: 'Screenshots every page at 5 breakpoints, checks accessibility, catches regressions before anything goes live.', replaced: 'Bugs only caught on manual review', color: '#7C9A72' },
  { name: 'Bobby', title: 'WEB BUILDER', desc: 'Builds pages from design specs and deploys to production. Hours, not weeks.', replaced: 'Weeks of development time per page', color: '#E85D26' },
  { name: 'Steffen', title: 'BRAND DIRECTOR', desc: 'Enforces visual identity across every deliverable. Every font, color, and spacing decision runs through brand standards.', replaced: 'Inconsistent visuals across deliverables', color: '#E85D26' },
  { name: 'Cleo', title: 'CONTENT PRODUCER', desc: 'Video editing workflows, audio generation, and content production pipelines from raw footage to final cut.', replaced: 'Manual video editing and content creation', color: '#C9A84C' },
  { name: 'Tony', title: 'SOCIAL MEDIA', desc: 'Multi-platform posting, scheduling, and content distribution across LinkedIn, Instagram, and TikTok.', replaced: 'Manual posting with no scheduling', color: '#C9A84C' },
  { name: 'Elon', title: 'SYSTEM ADMIN', desc: 'Infrastructure monitoring, credential rotation, health checks, and security across the entire stack.', replaced: 'No monitoring, no credential management', color: '#A8A29E' },
  { name: 'Alex', title: 'DEAL ARCHITECT', desc: 'Offer strategy, pricing models, competitive analysis, and proposal frameworks that feed the sales pipeline.', replaced: 'Ad-hoc strategy, never documented', color: '#C9A84C' },
  { name: 'Steve', title: 'AI ADVISORY LEAD', desc: 'Product packaging, ROI modeling, and audit frameworks for the AI advisory service line.', replaced: 'No product structure or pricing', color: '#C9A84C' },
  { name: 'Relay', title: '24/7 BRIDGE', desc: 'Telegram relay with sub-2-second response time and a watchdog that ensures nothing sits unread.', replaced: 'Messages sitting unread until morning', color: '#A8A29E' },
];

function PipelineViz() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <div ref={ref}>
      {/* Desktop: Horizontal */}
      <div className="hidden md:block bg-[#1A1A17] border border-[#292524] p-8 md:p-12 relative overflow-hidden">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-8">
          PRODUCTION PIPELINE
        </p>
        <div className="flex items-center justify-between" role="img" aria-label="Production pipeline: Elon finds gaps, Mom orchestrates, Alex strategizes, Steffen designs, Bobby builds, Elmo QAs, Patrik approves">
          {pipelineNodes.map((node, i) => (
            <React.Fragment key={node.name}>
              <motion.div
                className="flex flex-col items-center text-center relative z-10 shrink-0"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: i * 0.15 }}
              >
                <div
                  className="w-11 h-11 lg:w-14 lg:h-14 rounded-full border-2 flex items-center justify-center mb-3 bg-[#0C0C0C]"
                  style={{ borderColor: node.color }}
                >
                  <span className="font-headline text-xs lg:text-sm font-extrabold uppercase" style={{ color: node.color }}>
                    {node.letter}
                  </span>
                </div>
                <span className="font-headline text-xs font-extrabold uppercase tracking-tight text-[#F5F0EB]">
                  {node.name}
                </span>
                <span className="text-[10px] font-mono text-[#78716C] mt-1">
                  {node.role}
                </span>
              </motion.div>

              {i < pipelineNodes.length - 1 && (
                <div className="flex-1 flex items-center justify-center relative mx-1">
                  <div className="w-full h-[2px] bg-[#292524]" />
                  <ChevronRight size={14} className="text-[#E85D26] absolute right-0 shrink-0" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile: Vertical */}
      <div className="md:hidden bg-[#1A1A17] border border-[#292524] p-6 relative overflow-hidden">
        <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">
          PRODUCTION PIPELINE
        </p>
        <div className="flex flex-col items-center gap-0" role="img" aria-label="Production pipeline: Elon, Mom, Alex, Steffen, Bobby, Elmo, Patrik">
          {pipelineNodes.map((node, i) => (
            <React.Fragment key={node.name}>
              <motion.div
                className="flex flex-col items-center text-center relative z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.12 }}
              >
                <div
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 bg-[#0C0C0C]"
                  style={{ borderColor: node.color }}
                >
                  <span className="font-headline text-sm font-extrabold uppercase" style={{ color: node.color }}>
                    {node.letter}
                  </span>
                </div>
                <span className="font-headline text-xs font-extrabold uppercase tracking-tight text-[#F5F0EB]">
                  {node.name}
                </span>
                <span className="text-[10px] font-mono text-[#78716C] mt-0.5">
                  {node.role}
                </span>
              </motion.div>

              {i < pipelineNodes.length - 1 && (
                <div className="flex flex-col items-center h-8">
                  <div className="w-[2px] flex-1 bg-[#292524]" />
                  <ChevronDown size={14} className="text-[#E85D26] -mt-1" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <p className="text-[#A8A29E] text-sm text-center mt-8 max-w-xl mx-auto italic font-body">
        Every deliverable flows through this chain automatically. Patrik only touches the final approval.
      </p>
    </div>
  );
}

function SystemSection() {
  return (
    <section className="relative bg-[#0C0C0C] py-16 md:py-24 lg:py-32">
      <NoiseOverlay />
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="AFTER" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            12 AGENTS. ONE SYSTEM. ZERO NEW HIRES.
          </h2>
        </Reveal>

        {/* Pipeline Visualization */}
        <Reveal delay={0.2} className="mt-16 mb-20">
          <PipelineViz />
        </Reveal>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6 mt-16">
          {agentCards.map((agent, i) => (
            <Reveal key={agent.name} delay={i * 0.08}>
              <div className="bg-[#1A1A17] border border-[#292524] p-6 relative overflow-hidden group hover:border-opacity-40 transition-all duration-300"
                style={{ '--agent-color': agent.color }}
              >
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: agent.color }} />

                {/* Status indicator */}
                <div className="absolute top-6 right-6" aria-hidden="true">
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: '#7C9A72' }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2.5, ease: 'easeInOut', repeat: Infinity, delay: i * 0.2 }}
                  />
                </div>

                <h3 className="font-headline text-lg font-extrabold italic uppercase tracking-tight text-[#F5F0EB] mb-1">
                  {agent.name}
                </h3>
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] mb-4" style={{ color: agent.color }}>
                  {agent.title}
                </p>
                <p className="text-[#A8A29E] text-sm leading-relaxed font-body">
                  {agent.desc}
                </p>

                {/* "What It Replaced" */}
                <div className="mt-4 pt-4 border-t border-[#292524]">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C]">REPLACED: </span>
                  <span className="text-[#A8A29E] text-xs font-body">{agent.replaced}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 4: THE NUMBERS (LIGHT)
   ════════════════════════════════════════════════════════════════ */
const metrics = [
  { number: 12, suffix: '+', label: 'Specialized AI Agents', context: 'Running 24/7', type: 'count' },
  { number: 280, suffix: '+', label: 'Commits Shipped', context: 'In the first two weeks', type: 'count' },
  { number: 2, suffix: 'hrs', label: 'Time to Build a Page', context: 'From spec to live on site', type: 'approx', prefix: '~' },
  { number: 51, suffix: '+', label: 'Outreach Emails Sent', context: 'Personalized and tracked', type: 'count' },
  { number: 0, suffix: '', label: 'Additional Headcount', context: 'Zero new hires', type: 'dollar', prefix: '$' },
  { number: null, display: '24/7', label: 'Operational Uptime', context: 'Relay + watchdog + agents', type: 'static' },
];

const comparisonRows = [
  { role: 'Outreach coordinator', salary: '$45-65k/year', agent: 'Jacob agent', cost: '$0' },
  { role: 'QA tester', salary: '$50-70k/year', agent: 'Elmo agent', cost: '$0' },
  { role: 'Project manager', salary: '$55-75k/year', agent: 'Mom agent', cost: '$0' },
  { role: 'Brand manager', salary: '$50-70k/year', agent: 'Steffen agent', cost: '$0' },
  { role: 'After-hours coverage', salary: 'Overtime or missed messages', agent: '24/7 relay + watchdog', cost: '$0' },
];

function MetricCard({ metric, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const countValue = useCountUp(metric.number || 0, metric.type === 'approx' ? 800 : 1400, isInView && metric.type !== 'static' && metric.type !== 'dollar');

  let display;
  if (metric.type === 'static') {
    display = metric.display;
  } else if (metric.type === 'dollar') {
    display = '$0';
  } else if (metric.type === 'approx') {
    display = isInView ? `~${countValue}` : '~0';
  } else {
    display = isInView ? countValue : 0;
  }

  return (
    <Reveal delay={index * 0.12}>
      <div ref={ref} className="text-center p-8 md:p-10 relative border-b-2 border-[#E85D26]">
        <div className="font-headline text-6xl md:text-7xl lg:text-8xl font-extrabold italic leading-none tabular-nums text-[#0C0C0C]">
          {metric.type === 'static' ? (
            <motion.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6 }}
            >
              {display}
            </motion.span>
          ) : (
            <>
              {display}
              {metric.suffix && (
                <span className="text-3xl md:text-4xl font-extrabold not-italic text-[#A8A29E]">
                  {metric.suffix}
                </span>
              )}
            </>
          )}
        </div>
        <p className="font-headline text-base font-bold uppercase tracking-tight mt-4 text-[#0C0C0C]">
          {metric.label}
        </p>
        <p className="text-sm font-body mt-2 text-[#78716C]">
          {metric.context}
        </p>
      </div>
    </Reveal>
  );
}

function NumbersSection() {
  return (
    <section className="relative bg-[#F5F0EB] py-16 md:py-24 lg:py-32">
      <NoiseOverlay opacity={0.02} blend="soft-light" />
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="RESULTS" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#0C0C0C]">
            THE NUMBERS DON'T LIE.
          </h2>
        </Reveal>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 mt-16">
          {metrics.map((m, i) => (
            <MetricCard key={m.label} metric={m} index={i} />
          ))}
        </div>

        {/* Cost Comparison Table */}
        <Reveal delay={0.3} className="mt-20 max-w-4xl mx-auto">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#A8A29E] mb-4">
            COST COMPARISON
          </p>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden border border-[#A8A29E]/20 rounded-sm">
            <table className="w-full bg-white">
              <thead>
                <tr>
                  <th className="bg-[#0C0C0C] text-[#F5F0EB] text-[10px] font-mono font-bold uppercase tracking-[0.3em] px-6 py-4 text-left">
                    Traditional Approach
                  </th>
                  <th className="bg-[#E85D26] text-white text-[10px] font-mono font-bold uppercase tracking-[0.3em] px-6 py-4 text-left">
                    AOM's AI System
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.role} className={i % 2 === 1 ? 'bg-[#F9F7F4]' : 'bg-white'}>
                    <td className="px-6 py-4 border-b border-[#A8A29E]/10">
                      <span className="font-body text-sm font-semibold text-[#0C0C0C]">{row.role}</span>
                      <br />
                      <span className="font-mono text-sm text-[#57534E]">{row.salary}</span>
                    </td>
                    <td className="px-6 py-4 border-b border-[#A8A29E]/10">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-[#7C9A72] shrink-0" />
                        <span className="font-body text-sm font-semibold text-[#0C0C0C]">{row.agent} {row.cost}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-[#0C0C0C]">
                  <td className="px-6 py-5">
                    <span className="font-headline text-xl font-extrabold italic text-[#F5F0EB]">$200-280k/year</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-headline text-xl font-extrabold italic text-[#E85D26]">Fraction of one hire</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-3">
            {comparisonRows.map((row) => (
              <div key={row.role} className="bg-white p-5 border border-[#A8A29E]/10">
                <p className="font-headline text-sm font-bold uppercase text-[#0C0C0C] mb-3">{row.role}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C] mb-1">Traditional</p>
                    <p className="font-mono text-sm text-[#57534E]">{row.salary}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#E85D26] mb-1">AOM System</p>
                    <div className="flex items-center gap-1">
                      <Check size={12} className="text-[#7C9A72]" />
                      <span className="font-body text-sm text-[#0C0C0C]">{row.agent} {row.cost}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {/* Total */}
            <div className="bg-[#0C0C0C] p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C] mb-1">Traditional</p>
                  <p className="font-headline text-lg font-extrabold italic text-[#F5F0EB]">$200-280k/yr</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#E85D26] mb-1">AOM System</p>
                  <p className="font-headline text-lg font-extrabold italic text-[#E85D26]">Fraction of one hire</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm font-body mt-12 max-w-2xl mx-auto italic text-[#78716C]">
            AOM's system isn't replacing creative work. It's replacing the operational overhead that keeps creative people from doing creative work.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 5: DAY IN THE LIFE
   ════════════════════════════════════════════════════════════════ */
const timelineEntries = [
  { time: '7:00 AM', title: 'MESSAGE RECEIVED', desc: 'Patrik sends a Telegram message: "Check Ambition site, footer looks off on mobile."', agent: 'RELAY', color: '#A8A29E' },
  { time: '7:01 AM', title: 'RELAY INJECTION', desc: 'Message picked up via hook. No polling, no delay. Injected into the active session in under 2 seconds.', agent: 'RELAY', color: '#A8A29E' },
  { time: '7:02 AM', title: 'BOBBY LAUNCHES', desc: 'Reads the request, pulls the repo, identifies the CSS issue in the footer component.', agent: 'BOBBY', color: '#E85D26' },
  { time: '7:08 AM', title: 'FIX COMMITTED', desc: 'Code pushed to production. Mom auto-launches to scan the pipeline for downstream effects.', agent: 'BOBBY', color: '#E85D26' },
  { time: '7:09 AM', title: 'QA RUNS', desc: 'Elmo screenshots the page at 5 breakpoints. Desktop, laptop, tablet portrait, tablet landscape, mobile. Checks for regressions.', agent: 'ELMO', color: '#7C9A72' },
  { time: '7:12 AM', title: 'CONFIRMED LIVE', desc: 'Patrik gets confirmation: "Footer fixed. Elmo QA passed at all 5 breakpoints. Live on site."', agent: 'MOM', color: '#7C9A72' },
  { time: 'On a shoot...', title: 'BACKGROUND AGENTS', desc: 'Jacob sends 15 outreach emails. Paige scans client health. Steffen catches a font-weight deviation and routes it to Bobby.', agent: 'SYSTEM', color: '#A8A29E' },
  { time: '11:00 PM', title: 'AFTER HOURS', desc: "Patrik's asleep. A message comes in. The watchdog catches it, sends a notice, and defers for morning. Nothing sits unread.", agent: 'RELAY', color: '#A8A29E' },
];

function TimelineSection() {
  return (
    <section className="relative bg-[#0C0C0C] py-16 md:py-24 lg:py-32">
      <NoiseOverlay />
      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="A DAY IN THE LIFE" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            WHAT 24 HOURS LOOKS LIKE.
          </h2>
        </Reveal>

        <div className="mt-16 relative">
          {/* Vertical line */}
          <div className="absolute left-[20px] md:left-[120px] top-0 bottom-0 w-[2px] bg-[#292524] z-0" />

          <ol className="space-y-8">
            {timelineEntries.map((entry, i) => (
              <Reveal key={i} delay={i * 0.1} direction="x">
                <li className="relative flex flex-col md:flex-row gap-3 md:gap-8">
                  {/* Timestamp */}
                  <div className="md:w-[100px] md:text-right font-mono text-sm font-bold tabular-nums shrink-0" style={{ color: entry.color }}>
                    {entry.time}
                  </div>

                  {/* Dot */}
                  <div
                    className="absolute left-[20px] md:left-[120px] top-[6px] md:top-[4px] w-3 h-3 rounded-full border-2 z-[2] -translate-x-1/2 bg-[#0C0C0C]"
                    style={{ borderColor: entry.color }}
                  />

                  {/* Content card */}
                  <div className="ml-10 md:ml-0 flex-grow bg-[#1A1A17] border border-[#292524] p-5 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: entry.color }} />
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-headline text-sm font-extrabold italic uppercase tracking-tight text-[#F5F0EB]">
                        {entry.title}
                      </h3>
                      <span
                        className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] px-2 py-0.5 border"
                        style={{ borderColor: entry.color, color: entry.color }}
                      >
                        {entry.agent}
                      </span>
                    </div>
                    <p className="text-[#A8A29E] text-sm leading-relaxed font-body">
                      {entry.desc}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* "12 Minutes" callout */}
        <Reveal delay={0.2} className="mt-12 text-center">
          <p className="font-headline text-4xl md:text-5xl font-extrabold italic text-[#E85D26]">
            12 MINUTES
          </p>
          <p className="text-[#A8A29E] text-base mt-3 font-body">
            From request to live fix, with QA. While Patrik was still pouring coffee.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 6: THE BRIDGE + CTA
   ════════════════════════════════════════════════════════════════ */
function BridgeSection() {
  return (
    <section className="relative bg-[#141412] py-16 md:py-24 lg:py-32 overflow-hidden">
      <NoiseOverlay />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <Reveal>
          <SectionLabel label="YOUR BUSINESS" centered />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            WE BUILT IT FOR US. NOW WE BUILD IT FOR YOU.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="text-[#A8A29E] text-base md:text-lg leading-relaxed max-w-3xl mx-auto mt-8 text-center font-body space-y-6">
            <p>
              Everything on this page is real. The system is running right now, as you read this. The agents that built this website are the same agents that sent the email or LinkedIn post that brought you here. This is not a concept. It is not a roadmap. It is a production system handling real operations for a real business.
            </p>
            <p>
              The question is not whether AI can run a small business's back office. We proved it can. The question is what it would look like for yours. Your workflows are different. Your bottlenecks are different. Your team is different. But the pattern is the same: find what eats your time, automate it, and give you back the hours to do the work that actually grows your business.
            </p>
          </div>
        </Reveal>

        {/* Three CTA Pathway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 lg:gap-6 mt-16">
          {/* Card 1: See Your Numbers */}
          <Reveal delay={0.3}>
            <a href="/roi-calculator" className="block bg-[#1A1A17] border border-[#292524] p-8 text-center group hover:border-[#E85D26]/40 transition-all duration-300 cursor-pointer">
              <div className="w-12 h-12 border border-[#E85D26]/30 bg-[#E85D26]/5 flex items-center justify-center mx-auto mb-6">
                <Calculator size={24} className="text-[#E85D26]" />
              </div>
              <h3 className="font-headline text-lg font-extrabold italic uppercase tracking-tight text-[#F5F0EB] mb-3">
                See Your Numbers
              </h3>
              <p className="text-[#A8A29E] text-sm leading-relaxed font-body mb-6">
                6 inputs. 30 seconds. See what AI operations could save your business.
              </p>
              <span className="inline-block font-headline text-sm font-extrabold uppercase tracking-tight px-6 py-3 bg-transparent border border-[#E85D26] text-[#E85D26] hover:bg-[#E85D26] hover:text-white transition-all duration-300">
                CALCULATE MY ROI
              </span>
            </a>
          </Reveal>

          {/* Card 2: Get the Full Picture (PRIMARY) */}
          <Reveal delay={0.4}>
            <a href="/book" className="block bg-[#1A1A17] border border-[#292524] p-8 text-center group hover:border-[#7C9A72]/40 transition-all duration-300 cursor-pointer">
              <div className="w-12 h-12 border border-[#7C9A72]/30 bg-[#7C9A72]/5 flex items-center justify-center mx-auto mb-6">
                <ClipboardCheck size={24} className="text-[#7C9A72]" />
              </div>
              <h3 className="font-headline text-lg font-extrabold italic uppercase tracking-tight text-[#F5F0EB] mb-3">
                Get the Full Picture
              </h3>
              <p className="text-[#A8A29E] text-sm leading-relaxed font-body mb-6">
                The $2,500 AI Operations Audit maps your exact workflows, not industry averages. You walk away with a blueprint whether you hire us or not.
              </p>
              <span className="inline-block font-headline text-sm font-extrabold uppercase tracking-tight px-6 py-3 bg-[#E85D26] text-white shadow-lg shadow-[#E85D26]/20 hover:bg-[#D14E1C] transition-all duration-300">
                BOOK YOUR AUDIT
              </span>
            </a>
          </Reveal>

          {/* Card 3: Talk to Us */}
          <Reveal delay={0.5}>
            <a href="/book" className="block bg-[#1A1A17] border border-[#292524] p-8 text-center group hover:border-[#C9A84C]/40 transition-all duration-300 cursor-pointer">
              <div className="w-12 h-12 border border-[#C9A84C]/30 bg-[#C9A84C]/5 flex items-center justify-center mx-auto mb-6">
                <MessageCircle size={24} className="text-[#C9A84C]" />
              </div>
              <h3 className="font-headline text-lg font-extrabold italic uppercase tracking-tight text-[#F5F0EB] mb-3">
                Talk to Us
              </h3>
              <p className="text-[#A8A29E] text-sm leading-relaxed font-body mb-6">
                15 minutes. No cost. No pitch. Just a straight conversation about what's possible for your business.
              </p>
              <span className="inline-block font-headline text-sm font-extrabold uppercase tracking-tight px-6 py-3 bg-transparent border border-[#F5F0EB] text-[#F5F0EB] hover:bg-[#F5F0EB] hover:text-[#0C0C0C] transition-all duration-300">
                SCHEDULE A CALL
              </span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SECTION 7: FOOTER CTA
   ════════════════════════════════════════════════════════════════ */
function FooterCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section ref={ref} className="relative bg-[#0C0C0C] py-24 md:py-32">
      <NoiseOverlay />
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <Reveal>
          <h2 className="font-headline text-2xl md:text-3xl lg:text-4xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            STOP DOING EVERYTHING YOURSELF.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-[#A8A29E] text-lg mt-6 max-w-xl mx-auto font-body">
            Your business deserves the same system we built for ours.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <a
            href="/book"
            className="inline-block bg-[#E85D26] text-white font-headline font-extrabold uppercase tracking-tight text-lg px-12 py-5 mt-10 shadow-lg shadow-[#E85D26]/20 hover:bg-[#D14E1C] transition-colors duration-300"
            style={isInView ? {
              animation: 'ctaGlow 3s ease-in-out infinite',
            } : {}}
          >
            BOOK YOUR AUDIT
          </a>
        </Reveal>

        <Reveal delay={0.3}>
          <a
            href="/roi-calculator"
            className="block mt-6 text-[#E85D26] text-sm font-body hover:underline transition-all duration-200"
          >
            Or start with the ROI calculator
          </a>
        </Reveal>
      </div>

      {/* Inline keyframes for subtle CTA glow */}
      <style>{`
        @keyframes ctaGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(232, 93, 38, 0.1); }
          50% { box-shadow: 0 0 50px rgba(232, 93, 38, 0.2); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes ctaGlow {
            0%, 100% { box-shadow: 0 0 30px rgba(232, 93, 38, 0.1); }
          }
        }
      `}</style>
    </section>
  );
}

/* ── Site Footer: using shared component ────────────────────────── */

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE EXPORT
   ════════════════════════════════════════════════════════════════ */
export default function CaseStudy() {
  useSEO();

  return (
    <div className="bg-[#0C0C0C] min-h-screen">
      <SiteNav transparent />
      <HeroSection />
      <ProblemSection />
      <DecisionSection />
      <SystemSection />
      <NumbersSection />
      <TimelineSection />
      <BridgeSection />
      <FooterCTA />
      <SiteFooter />
    </div>
  );
}
