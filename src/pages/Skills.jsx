import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  Terminal, Zap, Search, ArrowRight, ChevronDown,
  Workflow, Film, Briefcase, Users, Code2, Server
} from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

/* -- SEO ----------------------------------------------------------------- */
function useSEO() {
  useEffect(() => {
    document.title = '89 Skills. One System. | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', '89 Claude Code skills built by running a real business. Workflow, content, client, agent, dev, and system skills. Free and premium.');
    setMeta('og:title', '89 Skills. One System. | AOM', true);
    setMeta('og:description', '89 Claude Code skills built by running a real business.', true);
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

/* -- Skills data ---------------------------------------------------------- */
const CATEGORIES = [
  {
    id: 'workflow',
    label: 'Workflow & Orchestration',
    icon: Workflow,
    color: '#E85D26',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-500/10 border-orange-500/20',
    description: 'The engine room. Skills that orchestrate, iterate, and drive work forward.',
    skills: [
      { name: 'little-engine', trigger: '/little-engine', desc: 'Run 3 parallel Bobby agents on the top tasks from the queue. Auto-refill when one finishes.' },
      { name: 'ship-it', trigger: '/ship-it', desc: 'Push, deploy, verify, and send the link. One command ship cycle.' },
      { name: 'quick-fix', trigger: '/quick-fix', desc: 'Describe a bug, Bobby fixes it, push and deploy. End-to-end bug fix.' },
      { name: 'wd40', trigger: '/wd40', desc: 'Test, research, fix, repeat. The relentless quality loop that does not stop until it\'s right.' },
      { name: 'wd40-page', trigger: '/wd40-page', desc: 'Iterate on a page until approved. Screenshot, fix, deploy, repeat.' },
      { name: 'wrestlemania', trigger: '/wrestlemania', desc: 'Full-stack problem solving: go back in time, research, cage match it, ship the winner. For hard problems where the answer isn\'t obvious.' },
      { name: 'cage-match', trigger: '/cage-match', desc: 'Two options enter. One leaves. Build both, test both, keep winner, delete loser. Stop debating. Start shipping.' },
      { name: 'supersaiyan', trigger: '/supersaiyan', desc: 'The agent screenshots its own work, gets brutally self-critical, then rebuilds it better. Repeat until the output is actually good.' },
      { name: 'rally', trigger: '/rally', desc: 'Morning huddle. Sync all agents, assign missions, enforce clean scope, launch everyone. Collect results and report back.' },
      { name: 'nuke', trigger: '/nuke', desc: 'Kill all running agents, reset all tasks, clean slate. Emergency reset.' },
      { name: 'status-check', trigger: '/status-check', desc: 'Full system snapshot: deployed, building, queued, deploy limit, agents.' },
      { name: 'blockers', trigger: '/blockers', desc: 'Scan all active agents and context for open blockers. Print the list, then work through them one by one.' },
      { name: 'masterplan', trigger: '/masterplan', desc: 'Full system audit. Agents, skills, context files, memory, repo health. Finds every gap, fixes what it can, reports the rest.' },
    ],
  },
  {
    id: 'content',
    label: 'Content & Media',
    icon: Film,
    color: '#a855f7',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10 border-purple-500/20',
    description: 'From raw footage to finished content. Video, audio, graphics, and AI generation.',
    skills: [
      { name: 'b-roll-story-cut', trigger: '/b-roll-story-cut', desc: 'Cleo\'s autonomous b-roll editing workflow. Eyes and ears on every clip, story brief, suggested trims, LUT, export.' },
      { name: 'fast-recut', trigger: '/fast-recut', desc: 'Take already-trimmed clips and extract the single best 2.5-second moment from each one.' },
      { name: 'caption-writer', trigger: '/caption-writer', desc: 'Write platform-specific captions from a video transcript.' },
      { name: 'content-calendar', trigger: '/content-calendar', desc: 'Generate a 30-day posting schedule for a client.' },
      { name: 'thumbnail', trigger: '/thumbnail', desc: 'Steffen generates social thumbnails from a topic via Gemini.' },
      { name: 'mood-board', trigger: '/mood-board', desc: 'Steffen generates a mood board from keywords via Gemini.' },
      { name: 'storyboard', trigger: '/storyboard', desc: 'Generate visual storyboard frames from a script.' },
      { name: 'voice-clone', trigger: '/voice-clone', desc: 'Generate audio from text using ElevenLabs voice API.' },
      { name: 'elevenlabs-voice', trigger: '/elevenlabs-voice', desc: 'Generate voiceover audio via ElevenLabs. Conservative by default. Only when a clip genuinely benefits from VO.' },
      { name: 'suno-music', trigger: '/suno-music', desc: 'Generates custom AI music tracks for video edits and social content using the Suno API.' },
      { name: 'eyes-and-ears', trigger: '/eyes-and-ears', desc: 'Every agent sees and hears. Any media file gets processed through Gemini AND built-in tools. No exceptions.' },
      { name: 'gemini-vision', trigger: '/gemini-vision', desc: 'Uses Gemini Vision API to analyze video frames: composition, lighting, shot quality scoring, b-roll categorization.' },
      { name: 'visual-search', trigger: '/visual-search', desc: 'Search all AOM footage by describing what you\'re looking for. "Drone shot at sunset." Found.' },
      { name: 'footage-review', trigger: '/footage-review', desc: 'Catalogs an entire shoot folder: frame grids, audio analysis, shot types, highlight moments. 500 files in minutes.' },
      { name: 'footage-reorganize', trigger: '/footage-reorganize', desc: 'Analyzes every clip with ffprobe + Gemini, categorizes, physically moves files into organized subfolders.' },
      { name: 'audio-align', trigger: '/audio-align', desc: 'Syncs separately recorded lav mic audio to camera video. Frame-accurate. No manual scrubbing.' },
      { name: 'audio-library', trigger: '/audio-library', desc: 'Manages Cleo\'s local audio library. Selects tracks from licensed catalog and mixes with ffmpeg.' },
      { name: 'auto-color', trigger: '/auto-color', desc: 'Detects camera model and lighting, selects the right LUT, applies it. Color grading on autopilot.' },
      { name: 'auto-timeline', trigger: '/auto-timeline', desc: 'Exports EDL and FCPXML from AI edit guides. Drop into DaVinci Resolve. No re-editing.' },
      { name: 'text-overlay', trigger: '/text-overlay', desc: 'Bakes in clean, bold text graphics with fade animations. Designed for IG Reels and TikTok style vertical content.' },
      { name: 'video-overlay', trigger: '/video-overlay', desc: 'Render animated text overlays for social reels using Remotion. Lower thirds, labels, CTAs, hooks.' },
      { name: 'lip-sync', trigger: '/lip-sync', desc: 'Sync separately recorded lav mic audio to camera video with frame-accurate precision.' },
      { name: 'doc-social-edit', trigger: '/doc-social-edit', desc: 'Full process for turning raw footage + lav audio into a documentary-style social edit. The subject tells the story.' },
      { name: 'ai-video-gen', trigger: '/ai-video-gen', desc: 'Generates AI videos, animations, and images using fal.ai\'s multi-model API. B-roll, concept videos, thumbnails.' },
    ],
  },
  {
    id: 'client',
    label: 'Client & Business',
    icon: Briefcase,
    color: '#22c55e',
    colorClass: 'text-green-400',
    bgClass: 'bg-green-500/10 border-green-500/20',
    description: 'Onboarding, health checks, invoices, outreach, and brand systems.',
    skills: [
      { name: 'client-setup', trigger: '/client-setup', desc: 'Set up a new test client: workspace, conversations, Supabase, token tracking.' },
      { name: 'client-onboarding', trigger: '/client-onboarding', desc: 'Collect client info, generate creative brief, auto-build proposal with pricing. Works for any project type.' },
      { name: 'health-check', trigger: '/health-check', desc: 'Scan a client\'s system for issues, stale data, and broken links.' },
      { name: 'weekly-report', trigger: '/weekly-report', desc: 'Auto-generate weekly client report from their activity data.' },
      { name: 'invoice', trigger: '/invoice', desc: 'Generate an invoice page from project data.' },
      { name: 'roi-calc', trigger: '/roi-calc', desc: 'Custom ROI calculator for any client based on their industry.' },
      { name: 'pitch-deck', trigger: '/pitch-deck', desc: 'Generate a pitch deck page from product data for investors and clients.' },
      { name: 'competitor-scan', trigger: '/competitor-scan', desc: 'Research a competitor\'s web and social presence. Report gaps and opportunities.' },
      { name: 'outreach', trigger: '/outreach', desc: 'Finds Phoenix-area leads via Apollo, researches them, writes personalized cold emails, creates Gmail drafts for review.' },
      { name: 'outreach-numbers', trigger: '/outreach-numbers', desc: 'Live count on the outreach pipeline. Contacts emailed, pace, when new contacts are needed.' },
      { name: 'email-drafter', trigger: '/email-drafter', desc: 'Writes clean, ready-to-send emails in AOM\'s voice. No back and forth, no unnecessary questions.' },
      { name: 'social-agent', trigger: '/social-agent', desc: 'Multi-platform posting: Instagram, LinkedIn, TikTok. Schedules, formats, captions. One command.' },
      { name: 'social-media-research', trigger: '/social-media-research', desc: 'Research what\'s actually working on social for a specific niche. Real patterns from top-performing accounts.' },
      { name: 'brand-page', trigger: '/brand-page', desc: 'Generate a branded page using Steffen\'s design system from data.' },
      { name: 'brand-refresh', trigger: '/brand-refresh', desc: 'Full sync of a brand system: guidelines page, social templates, video overlays, downloadable assets.' },
      { name: 'brand-agent', trigger: '/brand-agent', desc: 'Give it 5 reference images. Get back a complete brand system: colors, typography, photography direction, social templates.' },
    ],
  },
  {
    id: 'agent',
    label: 'Agent & Communication',
    icon: Users,
    color: '#38bdf8',
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-500/10 border-sky-500/20',
    description: 'How agents talk, switch, remember, and hand off work to each other.',
    skills: [
      { name: '1on1', trigger: '/1on1', desc: 'Switch the main session to speak as a specific agent. Patrik talks directly to them in real time.' },
      { name: 'ask-elon', trigger: '/ask-elon', desc: 'Agents report task completions, ask questions, and flag blockers through Elon. Elon notifies Patrik instantly.' },
      { name: 'check-with-elon', trigger: '/check-with-elon', desc: 'Read an agent\'s last-conversation.md to pick up updates from Elon. The handoff transparency system.' },
      { name: 'council', trigger: '/council', desc: 'Multiple agents debate a decision from different angles. Strategy, design, technical, financial. You get the synthesis.' },
      { name: 'create-team-conversation', trigger: '/create-team-conversation', desc: 'Reads all conversation sources and classifies each message into the correct project thread. One by one. Chronological.' },
      { name: 'hold-that-thought', trigger: '/htt', desc: 'Teddy\'s pouch. Permanent memory capture. Freeze a moment from the live conversation into storage with enough DNA to reconstruct it later.' },
      { name: 'reprompt', trigger: '/reprompt', desc: 'Take a rough prompt, understand the intent, and rewrite it to be maximally effective. No questions. Just do it.' },
      { name: 'do-research', trigger: '/do-research', desc: 'Comprehensive research on any topic across 4 layers: public skills, GitHub, web search, internal history.' },
      { name: 'session-start', trigger: '/session-start', desc: 'Every conversation starts with full context. What\'s active, what\'s blocked, what needs attention. No cold starts.' },
      { name: 'session-handoff', trigger: '/session-handoff', desc: 'Write the tape, open a fresh session, close the old one. Clean slate with full memory.' },
      { name: 'go-back-in-time', trigger: '/gbit', desc: 'Full contextual search through all past work, conversations, iterations, and deliverables. Retrieves the past.' },
    ],
  },
  {
    id: 'dev',
    label: 'Development',
    icon: Code2,
    color: '#f59e0b',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    description: 'Web dev, QA, bug killing, and building the Corner product.',
    skills: [
      { name: 'web-dev-agent', trigger: '/web-dev-agent', desc: 'Launches a subagent that works autonomously without flooding the main chat. Bobby\'s mode for big builds.' },
      { name: 'build-corner', trigger: '/build-corner', desc: 'Launch the full Corner product WD-40 pipeline. Three teams, 8 agents, autonomous loop.' },
      { name: 'make-corner-room', trigger: '/make-corner-room', desc: 'Generate a new isometric hex room for the Corner dashboard using Gemini image gen.' },
      { name: 'coding-qa', trigger: '/coding-qa', desc: 'Reviews code for quality, security, performance. Catches bugs before they ship. Reads like a senior engineer.' },
      { name: 'double-check', trigger: '/double-check', desc: 'QA gate. Screenshots the work, checks every pixel, catches what was missed. Nothing ships without Elmo.' },
      { name: 'kill-the-bugs', trigger: '/kill-the-bugs', desc: 'System health audit and cleanup. Find and kill everything that shouldn\'t be running.' },
      { name: 'frontend-design', trigger: '/frontend-design', desc: 'Steffen specs the design, Bobby builds it, Elmo QAs it. The pipeline for any visual or UI task.' },
      { name: 'merge-branches', trigger: '/merge-branches', desc: 'Merges all claude/* work branches into master, pushes master, and cleans up merged branches.' },
    ],
  },
  {
    id: 'system',
    label: 'System & Infrastructure',
    icon: Server,
    color: '#ec4899',
    colorClass: 'text-pink-400',
    bgClass: 'bg-pink-500/10 border-pink-500/20',
    description: 'Memory, snapshots, scheduling, phone home, and keeping the system healthy.',
    skills: [
      { name: 'snapshot', trigger: '/snapshot', desc: 'Save full system state to a single file for disaster recovery.' },
      { name: 'migrate', trigger: '/migrate', desc: 'Move a client from one setup to another.' },
      { name: 'phone-home', trigger: '/phone-home', desc: 'Mac-side bridge. Polls context/home-queue.md for commands from the phone. Executes with full Mac power.' },
      { name: 'skill-gap-scan', trigger: '/skill-gap-scan', desc: 'Scans the entire system for recurring workflows that don\'t have a skill. If it happens 3 times, build the skill.' },
      { name: 'calendar', trigger: '/calendar', desc: 'Create events, check availability, manage two calendars. Create, update, remove. Voice-command energy.' },
      { name: 'calendar-hygiene', trigger: '/calendar-hygiene', desc: 'Keeps both calendars clean: no duplicates, no orphaned events, no back-to-back meetings without buffer.' },
      { name: 'plan-my-day', trigger: '/plan-my-day', desc: 'Reads calendar, tasks, and priorities. Gives a ranked action plan in 30 seconds.' },
      { name: 'punch-list', trigger: '/punch-list', desc: 'The master task list. One source of truth. Agents read it, update it, check things off.' },
      { name: 'run-the-numbers', trigger: '/run-the-numbers', desc: 'Builds a 30-day revenue forecast by scanning every source of payment intel in the system.' },
      { name: 'big-3', trigger: '/big-3', desc: 'Launches Steffen, Bobby, and Elmo as a coordinated chain for anything visual, web, or brand-related.' },
      { name: 'internal-update', trigger: '/internal-update', desc: 'Captures what happened, updates context files, logs decisions, archives session, commits, and pushes.' },
      { name: 'wash-your-face', trigger: '/wash-your-face', desc: 'Re-reads all context files and recent decisions. Gets sharp again mid-session when context feels stale.' },
      { name: 'rag', trigger: '/rag', desc: 'Semantic search across the entire AOM-EA knowledge base. Find decisions, context, and history.' },
      { name: 'instant-watch', trigger: '/instant-watch', desc: 'Watch any YouTube video and get a full breakdown in seconds. Title, chapters, key moments, what\'s worth implementing.' },
      { name: 'look', trigger: '/look', desc: 'Captures what\'s visible on Patrik\'s screen, reads it, and responds intelligently.' },
      { name: 'mobile-rundown', trigger: '/rundown', desc: 'Tight bullet-point status of everything happening right now. Designed for Telegram when away from desk.' },
      { name: 'butter-method', trigger: '/butter-method', desc: 'AI assistant editor: analyzes footage, picks the best clips, outputs an FCPXML timeline for DaVinci Resolve.' },
      { name: 'status', trigger: '/status', desc: 'One command, full picture. Reads every agent\'s last-conversation.md and delivers a unified view.' },
    ],
  },
];

/* -- Category colors for card accents ------------------------------------ */
const CAT_COLOR_MAP = {
  workflow: '#E85D26',
  content: '#a855f7',
  client: '#22c55e',
  agent: '#38bdf8',
  dev: '#f59e0b',
  system: '#ec4899',
};

/* -- Skill card ----------------------------------------------------------- */
function SkillCard({ skill, catId, index }) {
  const accentColor = CAT_COLOR_MAP[catId] || '#E85D26';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.03, 0.3) }}
      className="group relative h-full"
    >
      <div
        className="absolute -inset-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(to bottom, ${accentColor}30, transparent)` }}
      />
      <div className="relative h-full bg-[#111110] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-3 transition-all duration-300 group-hover:border-transparent group-hover:bg-[#141413]">
        {/* Name + trigger */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-headline text-sm font-extrabold text-[#F0ECE6] tracking-tight leading-snug">
            {skill.name}
          </h3>
          <span
            className="shrink-0 font-mono text-xs px-2 py-0.5 rounded border"
            style={{ color: accentColor, borderColor: accentColor + '40', backgroundColor: accentColor + '10' }}
          >
            {skill.trigger}
          </span>
        </div>
        {/* Description */}
        <p className="font-body text-xs text-[#8A847C] leading-relaxed flex-grow">
          {skill.desc}
        </p>
      </div>
    </motion.div>
  );
}

/* -- Category section ----------------------------------------------------- */
function CategorySection({ cat, searchQuery }) {
  const [collapsed, setCollapsed] = useState(false);
  const Icon = cat.icon;

  const filtered = searchQuery
    ? cat.skills.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.trigger.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : cat.skills;

  if (searchQuery && filtered.length === 0) return null;

  return (
    <div className="mb-12">
      {/* Category header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-3 mb-6 group text-left"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
          style={{ backgroundColor: cat.color + '15', borderColor: cat.color + '30' }}
        >
          <Icon size={16} style={{ color: cat.color }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="font-headline text-xl font-extrabold text-[#F0ECE6] tracking-tight">
              {cat.label}
            </h2>
            <span
              className="font-mono text-xs px-2 py-0.5 rounded-full border"
              style={{ color: cat.color, borderColor: cat.color + '40', backgroundColor: cat.color + '10' }}
            >
              {filtered.length} skills
            </span>
          </div>
          <p className="font-body text-sm text-[#8A847C] mt-0.5">{cat.description}</p>
        </div>
        <ChevronDown
          size={18}
          className="text-[#8A847C] group-hover:text-[#F0ECE6] transition-all duration-200 shrink-0"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Cards grid */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((skill, i) => (
                <SkillCard key={skill.name} skill={skill} catId={cat.id} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -- Stat block ----------------------------------------------------------- */
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
      <div className="font-headline text-4xl md:text-5xl font-extrabold text-[#E85D26] tracking-tight">{number}</div>
      <div className="font-body text-sm text-[#8A847C] mt-1 uppercase tracking-widest">{label}</div>
    </motion.div>
  );
}

/* == MAIN PAGE ============================================================ */
export default function Skills() {
  useSEO();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const totalSkills = CATEGORIES.reduce((acc, c) => acc + c.skills.length, 0);

  const filteredCategories = activeFilter === 'all'
    ? CATEGORIES
    : CATEGORIES.filter(c => c.id === activeFilter);

  const hasResults = filteredCategories.some(cat => {
    if (!searchQuery) return true;
    return cat.skills.some(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.trigger.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <main className="bg-[#0A0A08] text-[#F0ECE6] font-body antialiased min-h-screen overflow-x-hidden">
      <SiteNav transparent />

      {/* -- HERO ---------------------------------------------------------- */}
      <section className="relative min-h-[60vh] flex items-center pt-24 pb-16 px-6 overflow-hidden">
        <NoiseOverlay />
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
              {totalSkills} Skills.{' '}
              <span className="text-[#8A847C]">One System.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="font-body text-lg md:text-xl text-[#8A847C] max-w-2xl mt-8 leading-relaxed">
              Built by running a real business. Tested every day. Each skill solves one specific problem and plugs into Claude Code the moment you drop it in.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="flex flex-wrap gap-4 mt-10">
              <a
                href="#skills"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#E85D26] text-white font-headline font-extrabold text-base uppercase tracking-widest rounded-lg hover:bg-[#D14E1C] transition-all shadow-lg shadow-[#E85D26]/20"
              >
                Browse All Skills
                <ArrowRight size={18} />
              </a>
              <a
                href="/corner"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 text-[#F0ECE6] font-headline font-bold text-base uppercase tracking-widest rounded-lg hover:bg-white/10 border border-white/[0.08] transition-all"
              >
                Get Corner
              </a>
            </div>
          </Reveal>

          {/* Stats bar */}
          <Reveal delay={0.4}>
            <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg">
              <StatBlock number={totalSkills} label="Skills" delay={0} />
              <StatBlock number="6" label="Categories" delay={0.1} />
              <StatBlock number="12" label="Agents" delay={0.2} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* -- SKILLS SECTION ------------------------------------------------ */}
      <section id="skills" className="relative px-6 py-16 scroll-mt-20">
        <NoiseOverlay opacity={0.02} />
        <div className="max-w-6xl mx-auto relative z-10">

          {/* Search + filter bar */}
          <div className="mb-10 flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A847C]" />
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#111110] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 font-mono text-sm text-[#F0ECE6] placeholder-[#8A847C]/50 focus:outline-none focus:border-[#E85D26]/40 focus:bg-[#141413] transition-all"
              />
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-2 min-h-[44px] rounded-lg font-mono text-xs uppercase tracking-widest border transition-all ${
                  activeFilter === 'all'
                    ? 'bg-[#E85D26]/15 border-[#E85D26]/40 text-[#E85D26]'
                    : 'bg-white/[0.03] border-white/[0.06] text-[#8A847C] hover:text-[#F0ECE6] hover:border-white/20'
                }`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id === activeFilter ? 'all' : cat.id)}
                  className={`px-3 py-2 min-h-[44px] rounded-lg font-mono text-xs uppercase tracking-widest border transition-all ${
                    activeFilter === cat.id
                      ? 'border-opacity-40 opacity-100'
                      : 'bg-white/[0.03] border-white/[0.06] text-[#8A847C] hover:text-[#F0ECE6] hover:border-white/20'
                  }`}
                  style={
                    activeFilter === cat.id
                      ? { backgroundColor: cat.color + '15', borderColor: cat.color + '40', color: cat.color }
                      : {}
                  }
                >
                  {cat.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* No results */}
          {!hasResults && (
            <div className="text-center py-20">
              <p className="font-mono text-sm text-[#8A847C]">No skills match "{searchQuery}"</p>
            </div>
          )}

          {/* Categories */}
          {filteredCategories.map(cat => (
            <CategorySection
              key={cat.id}
              cat={cat}
              searchQuery={searchQuery}
            />
          ))}
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
                  <Zap size={22} className="text-[#E85D26]" />
                </div>
                <h3 className="font-headline text-lg font-extrabold mb-2">1. Drop it in</h3>
                <p className="font-body text-sm text-[#8A847C] leading-relaxed">
                  Save the SKILL.md file to <code className="font-mono text-xs text-zinc-400">.claude/skills/skill-name/SKILL.md</code>. That's the entire setup.
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
                  Type the trigger command in your Claude Code conversation. Claude reads the instructions and executes.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-[#E85D26]/10 border border-[#E85D26]/20 flex items-center justify-center mx-auto mb-4">
                  <ArrowRight size={22} className="text-[#E85D26]" />
                </div>
                <h3 className="font-headline text-lg font-extrabold mb-2">3. Done</h3>
                <p className="font-body text-sm text-[#8A847C] leading-relaxed">
                  The skill handles the rest. No configuration, no API keys, no learning curve.
                </p>
              </div>
            </Reveal>
          </div>

          {/* CTA */}
          <Reveal delay={0.3}>
            <div className="mt-16 text-center">
              <div className="inline-flex flex-col items-center gap-6 p-8 md:p-12 bg-[#0E0E0D] border border-white/[0.06] rounded-2xl max-w-2xl w-full">
                <div className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-center">
                  {totalSkills} skills. 12 agents.{' '}
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

      <SiteFooter />
    </main>
  );
}
