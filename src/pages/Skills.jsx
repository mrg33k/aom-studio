import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, Download, Lock, Zap, Calendar, Mail, ClipboardList, Rocket,
  Video, Palette, Search, BarChart3, Shield, Users, Music, Eye, Film,
  Code, Share2, Terminal, ChevronDown, ArrowRight, Sparkles, Sun
} from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

/* -- SEO ----------------------------------------------------------------- */
function useSEO() {
  useEffect(() => {
    document.title = '51 Skills. One System. | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', '51 Claude Code skills built by running a real business. Free starter skills you can copy today. Premium skills included with Corner.');
    setMeta('og:title', '51 Skills. One System. | AOM', true);
    setMeta('og:description', '51 Claude Code skills built by running a real business. Free starter skills you can copy today. Premium skills included with Corner.', true);
    setMeta('og:type', 'website', true);
    setMeta('og:url', 'https://aheadofmarket.com/skills', true);
    setMeta('twitter:card', 'summary_large_image');
  }, []);
}

/* -- Noise overlay -------------------------------------------------------- */
function NoiseOverlay({ opacity = 0.03 }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-[1]" style={{ opacity, mixBlendMode: 'overlay' }}>
      <svg className="w-full h-full">
        <filter id="skills-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#skills-noise)" />
      </svg>
    </div>
  );
}

/* -- Reveal animation wrapper --------------------------------------------- */
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* -- Skill content for copy/download -------------------------------------- */
const SKILL_CONTENT = {
  'plan-my-day': `# Plan My Day

Read my calendar, tasks, priorities, and context files. Give me a ranked action plan for today.

## What to check:
1. Calendar events for today (both calendars)
2. Punch list / task list
3. Current priorities
4. Any pending messages or follow-ups
5. Deadlines approaching this week

## Output format:
- Ranked list of what to do, in order
- Time estimates for each
- Flag anything overdue or time-sensitive at the top
- Keep it scannable. Bullets, not paragraphs.
`,
  'calendar': `# Calendar

Manage Google Calendar. Create events, check availability, find conflicts.

## Capabilities:
- Create events on either calendar (personal or work)
- Check what's on the schedule for any date range
- Find open slots for meetings
- Move or reschedule events
- Always include timezone (Arizona, no DST)

## Rules:
- Always confirm event details before creating
- Include all relevant attendees
- Default to 30-minute meetings unless specified
- Add a brief agenda/description to every event
`,
  'calendar-hygiene': `# Calendar Hygiene

Audit the calendar for conflicts, dead time, and scheduling debt.

## Process:
1. Pull the next 7 days of events
2. Flag any overlapping events
3. Identify back-to-back meetings with no buffer
4. Find empty blocks that should be protected (deep work, lunch)
5. Flag meetings with no agenda or description
6. Suggest optimizations

## Output:
- Conflicts found (with fix suggestions)
- Schedule health score (1-10)
- Recommended changes
`,
  'email-drafter': `# Email Drafter

Draft emails that sound like they came from you. Not AI. Not corporate. You.

## How it works:
1. Understand the context (who, what, why)
2. Check previous emails to this person if available
3. Match tone to relationship (client = professional-warm, team = casual-direct)
4. Draft the email
5. Wait for approval before sending

## Rules:
- Never send without explicit approval
- Keep it concise. Respect people's inboxes.
- Open with their first name. Always.
- No fluff. Get to the point, then be human about it.
`,
  'client-onboarding': `# Client Onboarding

Collect client info, generate a creative brief, and auto-build a proposal with pricing.

## Flow:
1. Gather: Company name, contact, project type, timeline, budget range
2. Research: Quick look at their online presence, competitors, industry
3. Brief: Generate a creative brief with goals, deliverables, timeline
4. Proposal: Auto-generate a proposal with pricing tiers
5. Review: Present for approval before sending

## Works for any project type:
- Video production
- Website builds
- Social media management
- AI advisory / audit
- Brand packages
`,
  'punch-list': `# Punch List

The master task list. One source of truth for everything that needs doing.

## How it works:
- Agents read it to know what's next
- Agents update it when they complete tasks
- New tasks get added with priority and owner
- Overdue items get flagged automatically

## Format:
Each item has: task description, owner, priority (P1/P2/P3), due date, status

## Rules:
- Never delete items. Check them off or move to archive.
- P1 items get surfaced in every morning plan
- If something's been sitting for 3+ days, escalate it
`,
  'session-start': `# Session Start

Every conversation starts with full context. No cold starts. No "where were we?"

## On every session:
1. Read current priorities
2. Read active missions (running agents)
3. Check for pending messages
4. Check recent session log
5. Surface anything time-sensitive

## Output:
- What's actively in progress
- What's blocked and why
- What needs attention today
- Any messages waiting for response

## Why this matters:
Context switching kills momentum. This skill eliminates the 5-10 minutes of "catching up" at the start of every session.
`,
};

/* -- Skill data ----------------------------------------------------------- */
const FREE_SKILLS = [
  {
    id: 'plan-my-day',
    name: 'Plan My Day',
    icon: Sun,
    description: 'Reads your calendar, tasks, and priorities. Gives you a ranked action plan in 30 seconds.',
    replaces: 'Staring at your calendar for 20 minutes trying to figure out what matters today.',
    category: 'Productivity',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: Calendar,
    description: 'Create events, check availability, manage two calendars. Voice-command energy.',
    replaces: 'Switching between tabs, copying event details, forgetting to invite people.',
    category: 'Productivity',
  },
  {
    id: 'calendar-hygiene',
    name: 'Calendar Hygiene',
    icon: ClipboardList,
    description: 'Finds conflicts, dead time, and scheduling debt. Cleans your week.',
    replaces: 'That feeling on Monday morning when you realize Friday is already packed.',
    category: 'Productivity',
  },
  {
    id: 'email-drafter',
    name: 'Email Drafter',
    icon: Mail,
    description: 'Drafts emails in your voice. Knows your contacts, your tone, your context.',
    replaces: 'Writing the same "just following up" email for the 400th time.',
    category: 'Communication',
  },
  {
    id: 'client-onboarding',
    name: 'Client Onboarding',
    icon: Users,
    description: 'Collects client info, generates creative brief, auto-builds proposal with pricing. Works for any project type.',
    replaces: 'The 3-hour process of gathering info, writing a brief, and building a proposal from scratch.',
    category: 'Business',
  },
  {
    id: 'punch-list',
    name: 'Punch List',
    icon: ClipboardList,
    description: 'Your master task list. Agents read it, update it, check things off. One source of truth.',
    replaces: 'Scattered to-do lists in 4 different apps that nobody actually checks.',
    category: 'Operations',
  },
  {
    id: 'session-start',
    name: 'Session Start',
    icon: Rocket,
    description: 'Every conversation starts with full context. What\'s active, what\'s blocked, what needs attention.',
    replaces: 'The first 10 minutes of every session spent remembering where you left off.',
    category: 'System',
  },
];

const PREMIUM_SKILLS = [
  {
    name: 'Doc Social Edit',
    icon: Video,
    description: 'Turns raw footage into platform-ready social reels. Shot selection, pacing, graphics, captions.',
    impact: 'What used to take a full day of editing now ships in one session.',
    category: 'Content',
  },
  {
    name: 'Brand Agent',
    icon: Palette,
    description: 'Give it 5 reference images. Get back a complete brand system: colors, typography, photography direction, social templates.',
    impact: 'A brand identity package in one session instead of two weeks.',
    category: 'Design',
  },
  {
    name: 'Masterplan',
    icon: BarChart3,
    description: 'Full system audit. Agents, skills, context files, memory, repo health. Finds every gap, fixes what it can, reports the rest.',
    impact: 'Your entire operation scanned and optimized in minutes.',
    category: 'System',
  },
  {
    name: 'Council',
    icon: Users,
    description: 'Multiple agents debate a decision from different angles. Strategy, design, technical, financial. You get the synthesis.',
    impact: 'Board-level decision support without the board.',
    category: 'Strategy',
  },
  {
    name: 'Gemini Vision',
    icon: Eye,
    description: 'AI-powered footage analysis. Shot quality scoring, face detection, composition analysis. Sees what you\'d miss at 2am.',
    impact: 'Review 500 clips in the time it takes to drink a coffee.',
    category: 'Content',
  },
  {
    name: 'Auto-Color',
    icon: Sparkles,
    description: 'Detects your camera, analyzes the lighting, selects the right LUT. Color grading on autopilot.',
    impact: '30 minutes of color correction reduced to 30 seconds.',
    category: 'Content',
  },
  {
    name: 'Auto-Timeline',
    icon: Film,
    description: 'Exports EDL and FCPXML from your AI edit. Drop it into Premiere or Resolve. No re-editing.',
    impact: 'AI edits go straight into your professional NLE.',
    category: 'Content',
  },
  {
    name: 'ElevenLabs Voice',
    icon: Music,
    description: 'Generate voiceover in your brand\'s voice. Script it, generate it, mix it into the edit. 30 seconds.',
    impact: 'Professional voiceover without booking a session.',
    category: 'Content',
  },
  {
    name: 'Double Check (Elmo)',
    icon: Shield,
    description: 'QA gate. Screenshots your work, checks every pixel, catches what you missed. Nothing ships without Elmo.',
    impact: 'Zero broken links, zero typos, zero embarrassing deploys.',
    category: 'Quality',
  },
  {
    name: 'Outreach Pipeline',
    icon: Mail,
    description: 'Cold email at scale. Domain rotation, personalization, follow-up sequences. 50+ emails, zero templates.',
    impact: 'A full sales development operation from one command.',
    category: 'Business',
  },
  {
    name: 'Visual Search',
    icon: Search,
    description: 'Search your footage library by describing what you\'re looking for. "Drone shot of a rooftop at sunset." Found.',
    impact: 'Hours of scrubbing through hard drives, gone.',
    category: 'Content',
  },
  {
    name: 'Footage Review',
    icon: Film,
    description: 'Catalogs an entire shoot folder. Frame grids, audio analysis, shot types, highlight moments. 500 files in minutes.',
    impact: 'A full shoot logged and organized before you finish lunch.',
    category: 'Content',
  },
  {
    name: 'Coding QA',
    icon: Code,
    description: 'Reviews code for quality, security, performance. Catches bugs before they ship. Reads like a senior engineer.',
    impact: 'Code review without waiting for the pull request.',
    category: 'Engineering',
  },
  {
    name: 'Social Agent',
    icon: Share2,
    description: 'Multi-platform posting. Instagram, LinkedIn, TikTok. Schedules, formats, captions. One command.',
    impact: 'All platforms updated in the time it takes to post to one.',
    category: 'Marketing',
  },
  {
    name: 'Suno Music',
    icon: Music,
    description: 'AI-generated music beds for your content. Describe the vibe, get the track. Royalty-free, on-brand.',
    impact: 'Custom music for every piece of content. No licensing headaches.',
    category: 'Content',
  },
];

const CATEGORY_COLORS = {
  Productivity: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
  Communication: 'from-green-500/20 to-green-600/5 border-green-500/20',
  Business: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
  Operations: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/20',
  System: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20',
  Content: 'from-rose-500/20 to-rose-600/5 border-rose-500/20',
  Design: 'from-pink-500/20 to-pink-600/5 border-pink-500/20',
  Strategy: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/20',
  Quality: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
  Engineering: 'from-orange-500/20 to-orange-600/5 border-orange-500/20',
  Marketing: 'from-teal-500/20 to-teal-600/5 border-teal-500/20',
};

const CATEGORY_TEXT = {
  Productivity: 'text-blue-400',
  Communication: 'text-green-400',
  Business: 'text-purple-400',
  Operations: 'text-yellow-400',
  System: 'text-cyan-400',
  Content: 'text-rose-400',
  Design: 'text-pink-400',
  Strategy: 'text-indigo-400',
  Quality: 'text-emerald-400',
  Engineering: 'text-orange-400',
  Marketing: 'text-teal-400',
};

/* -- Free skill card ------------------------------------------------------ */
function FreeSkillCard({ skill, index }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const Icon = skill.icon;

  const handleCopy = async () => {
    const content = SKILL_CONTENT[skill.id];
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const content = SKILL_CONTENT[skill.id];
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${skill.id}-SKILL.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Reveal delay={index * 0.08}>
      <div className="group relative h-full">
        {/* Gradient border effect */}
        <div className="absolute -inset-[1px] bg-gradient-to-b from-[#E85D26]/30 via-white/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative h-full bg-[#111110] border border-white/[0.06] rounded-xl p-6 flex flex-col transition-all duration-300 group-hover:border-transparent group-hover:bg-[#141413]">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E85D26]/10 border border-[#E85D26]/20 flex items-center justify-center">
                <Icon size={18} className="text-[#E85D26]" />
              </div>
              <div>
                <h3 className="font-headline text-lg font-extrabold text-[#F0ECE6] tracking-tight">{skill.name}</h3>
                <span className={`text-xs font-mono uppercase tracking-widest ${CATEGORY_TEXT[skill.category] || 'text-zinc-500'}`}>
                  {skill.category}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              Free
            </span>
          </div>

          {/* Description */}
          <p className="font-body text-base text-[#8A847C] leading-relaxed mb-4 flex-grow">
            {skill.description}
          </p>

          {/* What it replaces */}
          <div className="mb-5 p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-1">Replaces</p>
            <p className="font-body text-sm text-zinc-400 italic leading-relaxed">"{skill.replaces}"</p>
          </div>

          {/* Preview toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#8A847C] hover:text-[#F0ECE6] transition-colors mb-4"
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Hide preview' : 'Preview skill'}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mb-4"
              >
                <pre className="bg-[#0A0A08] border border-white/[0.04] rounded-lg p-4 text-xs font-mono text-zinc-500 overflow-x-auto max-h-[200px] overflow-y-auto leading-relaxed">
                  {SKILL_CONTENT[skill.id]}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-2 mt-auto">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#E85D26] text-white font-headline font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-[#D14E1C] transition-all shadow-lg shadow-[#E85D26]/10"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy Skill'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 text-[#8A847C] font-headline font-bold text-sm uppercase tracking-wider rounded-lg hover:bg-white/10 hover:text-[#F0ECE6] border border-white/[0.06] transition-all"
              title="Download SKILL.md"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* -- Premium skill card --------------------------------------------------- */
function PremiumSkillCard({ skill, index }) {
  const Icon = skill.icon;

  return (
    <Reveal delay={index * 0.06}>
      <div className="group relative h-full">
        {/* Gradient border effect - premium uses a different glow */}
        <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 via-white/[0.03] to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative h-full bg-[#0E0E0D] border border-white/[0.04] rounded-xl p-5 flex flex-col transition-all duration-300 group-hover:border-transparent group-hover:bg-[#121211]">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <Icon size={16} className="text-[#8A847C]" />
              </div>
              <div>
                <h3 className="font-headline text-base font-extrabold text-[#F0ECE6] tracking-tight">{skill.name}</h3>
                <span className={`text-[10px] font-mono uppercase tracking-widest ${CATEGORY_TEXT[skill.category] || 'text-zinc-600'}`}>
                  {skill.category}
                </span>
              </div>
            </div>
            <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-[#8A847C] bg-white/[0.03] border border-white/[0.06] rounded-full">
              <Lock size={10} />
              Corner
            </span>
          </div>

          {/* Description */}
          <p className="font-body text-sm text-[#8A847C] leading-relaxed mb-3 flex-grow">
            {skill.description}
          </p>

          {/* Impact */}
          <div className="p-3 bg-gradient-to-r from-[#E85D26]/5 to-transparent border-l-2 border-[#E85D26]/30 rounded-r-lg">
            <p className="font-body text-sm text-[#E85D26]/80 leading-relaxed">
              {skill.impact}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* -- Stat counter --------------------------------------------------------- */
function StatBlock({ number, label, delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="text-center"
    >
      <div className="font-headline text-4xl md:text-5xl font-extrabold text-[#E85D26] tracking-tight">
        {number}
      </div>
      <div className="font-body text-sm text-[#8A847C] mt-1 uppercase tracking-widest">
        {label}
      </div>
    </motion.div>
  );
}

/* == MAIN PAGE ============================================================ */
export default function Skills() {
  useSEO();

  return (
    <main className="bg-[#0A0A08] text-[#F0ECE6] font-body antialiased min-h-screen overflow-x-hidden">
      <SiteNav transparent />

      {/* -- HERO ---------------------------------------------------------- */}
      <section className="relative min-h-[80vh] flex items-center pt-24 pb-16 px-6 overflow-hidden">
        <NoiseOverlay />

        {/* Radial gradient bg */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#E85D26]/[0.04] rounded-full blur-[120px]" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#E85D26]/[0.02] rounded-full blur-[80px]" />
        </div>

        <div className="max-w-6xl mx-auto w-full relative z-10">
          <Reveal>
            <div className="flex items-center gap-3 mb-6">
              <Terminal size={18} className="text-[#E85D26]" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#E85D26]">Claude Code Skills</span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="font-headline text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold leading-[0.95] tracking-[-0.02em] max-w-4xl">
              51 Skills.{' '}
              <span className="text-[#8A847C]">One System.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="font-body text-lg md:text-xl text-[#8A847C] max-w-2xl mt-8 leading-relaxed">
              Built by running a real business. Tested every day. Each skill solves one specific problem, plugs into Claude Code, and works the moment you drop it in.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex flex-wrap gap-4 mt-10">
              <a
                href="#free-skills"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#E85D26] text-white font-headline font-extrabold text-base uppercase tracking-widest rounded-lg hover:bg-[#D14E1C] transition-all shadow-lg shadow-[#E85D26]/20"
              >
                Get Free Skills
                <ArrowRight size={18} />
              </a>
              <a
                href="#premium-skills"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 text-[#F0ECE6] font-headline font-bold text-base uppercase tracking-widest rounded-lg hover:bg-white/10 border border-white/[0.08] transition-all"
              >
                See the Full Arsenal
              </a>
            </div>
          </Reveal>

          {/* Stats bar */}
          <Reveal delay={0.4}>
            <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg">
              <StatBlock number="51" label="Skills" delay={0} />
              <StatBlock number="7" label="Free" delay={0.1} />
              <StatBlock number="12" label="Agents" delay={0.2} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* -- FREE SKILLS --------------------------------------------------- */}
      <section id="free-skills" className="relative px-6 py-24 scroll-mt-20">
        <NoiseOverlay opacity={0.02} />
        <div className="max-w-6xl mx-auto relative z-10">
          <Reveal>
            <div className="flex items-center gap-3 mb-4">
              <Zap size={18} className="text-emerald-400" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">Open Source</span>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
              Start Here.
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="font-body text-lg text-[#8A847C] max-w-2xl mb-4 leading-relaxed">
              Copy any of these into your Claude Code project. They work out of the box. No setup, no paywall, no catch.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="font-body text-sm text-zinc-600 mb-12">
              Drop the file into <code className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded text-zinc-400 font-mono text-xs">.claude/skills/skill-name/SKILL.md</code> and it just works.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FREE_SKILLS.map((skill, i) => (
              <FreeSkillCard key={skill.id} skill={skill} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* -- DIVIDER ------------------------------------------------------- */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="border-t border-white/[0.04]" />
      </div>

      {/* -- PREMIUM SKILLS ------------------------------------------------ */}
      <section id="premium-skills" className="relative px-6 py-24 scroll-mt-20">
        <NoiseOverlay opacity={0.02} />

        {/* Subtle gradient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#E85D26]/[0.03] rounded-full blur-[100px]" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <Reveal>
            <div className="flex items-center gap-3 mb-4">
              <Lock size={16} className="text-[#8A847C]" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#8A847C]">Included with Corner</span>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h2 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight mb-3">
              The Full Arsenal.
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="font-body text-lg text-[#8A847C] max-w-2xl mb-12 leading-relaxed">
              These are the skills that run AOM every day. Video editing, brand systems, QA gates, outreach pipelines, and 12 AI agents working in concert. When you get Corner, you get all of this.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PREMIUM_SKILLS.map((skill, i) => (
              <PremiumSkillCard key={skill.name} skill={skill} index={i} />
            ))}
          </div>

          {/* CTA */}
          <Reveal delay={0.2}>
            <div className="mt-16 text-center">
              <div className="inline-flex flex-col items-center gap-6 p-8 md:p-12 bg-[#0E0E0D] border border-white/[0.06] rounded-2xl max-w-2xl w-full">
                <div className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-center">
                  51 skills. 12 agents.{' '}
                  <span className="text-[#E85D26]">Your business, on autopilot.</span>
                </div>
                <p className="font-body text-base text-[#8A847C] text-center leading-relaxed max-w-lg">
                  Corner is AOM's AI operating system for small businesses. Every skill on this page, pre-configured and running on day one.
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <a
                    href="/corner"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#E85D26] text-white font-headline font-extrabold text-base uppercase tracking-widest rounded-lg hover:bg-[#D14E1C] transition-all shadow-lg shadow-[#E85D26]/20"
                  >
                    Explore Corner
                    <ArrowRight size={18} />
                  </a>
                  <a
                    href="/book"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 text-[#F0ECE6] font-headline font-bold text-base uppercase tracking-widest rounded-lg hover:bg-white/10 border border-white/[0.08] transition-all"
                  >
                    Book a Setup
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* -- HOW SKILLS WORK ----------------------------------------------- */}
      <section className="relative px-6 py-24 bg-[#0C0C0B] border-t border-white/[0.04]">
        <NoiseOverlay opacity={0.02} />
        <div className="max-w-6xl mx-auto relative z-10">
          <Reveal>
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight mb-12 text-center">
              How Skills Work
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Reveal delay={0}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-[#E85D26]/10 border border-[#E85D26]/20 flex items-center justify-center mx-auto mb-4">
                  <Download size={22} className="text-[#E85D26]" />
                </div>
                <h3 className="font-headline text-lg font-extrabold mb-2">1. Drop it in</h3>
                <p className="font-body text-sm text-[#8A847C] leading-relaxed">
                  Save the SKILL.md file to your Claude Code project's skills folder. That's the entire setup.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-[#E85D26]/10 border border-[#E85D26]/20 flex items-center justify-center mx-auto mb-4">
                  <Terminal size={22} className="text-[#E85D26]" />
                </div>
                <h3 className="font-headline text-lg font-extrabold mb-2">2. Call it</h3>
                <p className="font-body text-sm text-[#8A847C] leading-relaxed">
                  Type the skill name in your conversation. Claude reads the instructions and executes.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-[#E85D26]/10 border border-[#E85D26]/20 flex items-center justify-center mx-auto mb-4">
                  <Zap size={22} className="text-[#E85D26]" />
                </div>
                <h3 className="font-headline text-lg font-extrabold mb-2">3. Done</h3>
                <p className="font-body text-sm text-[#8A847C] leading-relaxed">
                  The skill handles the rest. No configuration, no API keys, no learning curve.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
