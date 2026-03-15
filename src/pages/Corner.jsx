import React, { useState, useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, MessageSquare, BarChart3, Gamepad2, Zap, Users, Shield, ChevronRight, Sparkles, Monitor, Phone } from 'lucide-react';

// --- CONSTANTS ---
const ROOMS = [
  { name: 'Bobby', role: 'Web Developer', img: '/corner/bobby-room.png', status: 'Working' },
  { name: 'Steffen', role: 'Creative Director', img: '/corner/steffen-room.png', status: 'Working' },
  { name: 'Cleo', role: 'Content Creator', img: '/corner/cleo-room.png', status: 'Done' },
  { name: 'Elon', role: 'Systems Engineer', img: '/corner/elon-room.png', status: 'Idle' },
  { name: 'Steve', role: 'AI Advisory Lead', img: '/corner/steve-room.png', status: 'Working' },
];

const TIERS = [
  {
    name: 'Audit',
    agents: 0,
    monthly: null,
    setup: '$2,500',
    description: 'AI Operations Audit. Discovery session + roadmap. See where AI fits your business.',
    features: ['90-minute discovery session', 'Full operations audit', 'Custom AI roadmap', 'Implementation priorities'],
    highlight: false,
  },
  {
    name: 'Starter',
    agents: 3,
    monthly: '$1,500',
    setup: '$5,000',
    description: '3 AI agents in your command center. Dashboard, chat, and isometric view included.',
    features: ['3 AI agents', 'Isometric command center', '1:1 agent chat', 'Dashboard analytics', 'Email + calendar integration'],
    highlight: true,
  },
  {
    name: 'Growth',
    agents: 6,
    monthly: '$2,500',
    setup: '$6,500',
    description: '6 agents + team collaboration rooms. Built for businesses ready to scale.',
    features: ['6 AI agents', 'Everything in Starter', 'Team collaboration rooms', 'Advanced integrations', 'Priority support'],
    highlight: false,
  },
  {
    name: 'Enterprise',
    agents: '10+',
    monthly: '$3,000+',
    setup: '$8,000',
    description: 'Custom agent count. Custom integrations. Dedicated support channel.',
    features: ['10+ AI agents', 'Everything in Growth', 'Custom integrations', 'Dedicated Slack channel', 'White-glove onboarding'],
    highlight: false,
  },
];

// --- ANIMATION VARIANTS ---
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// --- REUSABLE COMPONENTS ---
function Section({ children, className = '', dark = false, id }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      className={`relative ${dark ? 'bg-[#1A1A17] text-[#F5F0EB]' : 'bg-[#FAFAF8] text-[#1A1A17]'} ${className}`}
    >
      {children}
    </motion.section>
  );
}

function SectionLabel({ children, dark = false }) {
  return (
    <motion.p
      variants={fadeUp}
      className={`text-[11px] font-mono font-bold tracking-[0.3em] uppercase mb-6 ${dark ? 'text-[#FF4F00]' : 'text-[#FF4F00]'}`}
    >
      {children}
    </motion.p>
  );
}

function SectionHeadline({ children, dark = false, className = '' }) {
  return (
    <motion.h2
      variants={fadeUp}
      className={`font-headline font-black text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05] ${dark ? 'text-[#F5F0EB]' : 'text-[#1A1A17]'} ${className}`}
    >
      {children}
    </motion.h2>
  );
}

function SectionBody({ children, dark = false, className = '' }) {
  return (
    <motion.p
      variants={fadeUp}
      className={`text-lg md:text-xl leading-relaxed max-w-[600px] ${dark ? 'text-[#A8A29E]' : 'text-[#6B6560]'} ${className}`}
    >
      {children}
    </motion.p>
  );
}

// --- HERO SECTION ---
function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#FAFAF8]">
      {/* Subtle gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F5F0EB] via-[#FAFAF8] to-[#FAFAF8]" />

      {/* Floating room images */}
      <motion.div style={{ opacity }} className="absolute inset-0 pointer-events-none">
        <motion.img
          src="/corner/bobby-room.png"
          alt=""
          style={{ y: y1 }}
          className="absolute top-[12%] left-[5%] w-[180px] md:w-[260px] rounded-2xl shadow-2xl shadow-black/10 opacity-60 rotate-[-3deg]"
          loading="lazy"
        />
        <motion.img
          src="/corner/steffen-room.png"
          alt=""
          style={{ y: y2 }}
          className="absolute top-[8%] right-[5%] w-[160px] md:w-[240px] rounded-2xl shadow-2xl shadow-black/10 opacity-50 rotate-[4deg]"
          loading="lazy"
        />
        <motion.img
          src="/corner/cleo-room.png"
          alt=""
          style={{ y: y3 }}
          className="absolute bottom-[15%] right-[10%] w-[140px] md:w-[200px] rounded-2xl shadow-2xl shadow-black/10 opacity-40 rotate-[-2deg]"
          loading="lazy"
        />
        <motion.img
          src="/corner/elon-room.png"
          alt=""
          style={{ y: y1 }}
          className="absolute bottom-[20%] left-[8%] w-[130px] md:w-[190px] rounded-2xl shadow-2xl shadow-black/10 opacity-35 rotate-[3deg]"
          loading="lazy"
        />
      </motion.div>

      {/* Hero content */}
      <div className="relative z-10 max-w-[900px] mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-[11px] font-mono font-bold tracking-[0.3em] uppercase text-[#FF4F00] mb-8"
        >
          Introducing Corner
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-headline font-black text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.95] text-[#1A1A17] mb-8"
        >
          Your AI team,<br />
          <span className="text-[#FF4F00]">visible and alive.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-xl md:text-2xl text-[#6B6560] leading-relaxed max-w-[540px] mx-auto mb-12"
        >
          See your agents work. Talk to them directly. Watch your business run from above.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="/book"
            className="inline-flex items-center gap-3 bg-[#FF4F00] text-white font-headline font-black uppercase text-sm tracking-wider px-8 py-4 hover:bg-[#FF6B2B] transition-colors duration-300"
          >
            Get Started <ArrowRight size={18} />
          </a>
          <a
            href="#layers"
            className="inline-flex items-center gap-2 text-[#6B6560] hover:text-[#1A1A17] font-medium text-sm transition-colors duration-300"
          >
            See how it works <ChevronRight size={16} />
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 rounded-full border-2 border-[#D4CFC8] flex items-start justify-center pt-2"
        >
          <div className="w-1 h-2 bg-[#A8A29E] rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// --- PROBLEM SECTION ---
function ProblemSection() {
  return (
    <Section className="py-24 md:py-32">
      <div className="max-w-[900px] mx-auto px-6 text-center">
        <SectionLabel>The Problem</SectionLabel>
        <SectionHeadline>
          Every AI dashboard<br />looks the same.
        </SectionHeadline>
        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
          {['Tables', 'Status badges', 'Colored dots', 'Sidebar menus', 'Loading spinners'].map((item) => (
            <span
              key={item}
              className="px-4 py-2 bg-[#F0EDE8] text-[#8A847C] font-mono text-sm rounded-sm line-through decoration-[#C4BFBA]"
            >
              {item}
            </span>
          ))}
        </motion.div>
        <SectionBody className="mx-auto mt-10 text-center">
          Your AI agents are team members, not line items. They deserve a world, not a spreadsheet.
        </SectionBody>
      </div>
    </Section>
  );
}

// --- THREE LAYERS OVERVIEW ---
function LayersOverview() {
  const layers = [
    {
      icon: Gamepad2,
      label: 'Layer 1',
      title: 'Isometric Command Center',
      subtitle: 'The fun layer',
      description: 'See your entire AI team in their rooms. Like The Sims, but for your business.',
      color: '#FF4F00',
    },
    {
      icon: BarChart3,
      label: 'Layer 2',
      title: 'Dashboard',
      subtitle: 'The serious layer',
      description: 'Clean metrics and data. The view for client meetings and quick status checks.',
      color: '#22C55E',
    },
    {
      icon: MessageSquare,
      label: 'Layer 3',
      title: '1:1 Agent Chat',
      subtitle: 'The power layer',
      description: 'Talk directly to any agent. Give instructions. Get answers. Watch them work.',
      color: '#3B82F6',
    },
  ];

  return (
    <Section id="layers" className="py-24 md:py-32 bg-[#F5F0EB]">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center mb-16">
          <SectionLabel>One Platform, Three Layers</SectionLabel>
          <SectionHeadline>
            Three ways to see<br />your team.
          </SectionHeadline>
        </div>

        <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6">
          {layers.map((layer) => (
            <motion.div
              key={layer.title}
              variants={fadeUp}
              className="bg-white/80 backdrop-blur-sm border border-[#E8E3DC] p-8 md:p-10 rounded-sm group hover:border-[#FF4F00]/30 transition-all duration-300 hover:shadow-lg hover:shadow-black/5"
            >
              <div
                className="w-12 h-12 rounded-sm flex items-center justify-center mb-6"
                style={{ backgroundColor: `${layer.color}10` }}
              >
                <layer.icon size={24} style={{ color: layer.color }} />
              </div>
              <p className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-[#A8A29E] mb-2">
                {layer.label}
              </p>
              <h3 className="font-headline font-black text-xl mb-1 text-[#1A1A17]">
                {layer.title}
              </h3>
              <p className="text-sm text-[#FF4F00] font-medium mb-4">{layer.subtitle}</p>
              <p className="text-[#6B6560] leading-relaxed">{layer.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

// --- ISOMETRIC SHOWCASE ---
function IsometricShowcase() {
  return (
    <Section className="py-24 md:py-40 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            <SectionLabel>Layer 1</SectionLabel>
            <SectionHeadline>
              Your command center.<br />
              <span className="text-[#FF4F00]">Alive.</span>
            </SectionHeadline>
            <SectionBody className="mt-6">
              Each agent has their own room. Room style reflects their function. Monitor glow shows status at a glance. Click any room to start talking.
            </SectionBody>

            <motion.div variants={stagger} className="mt-10 space-y-4">
              {[
                { label: 'Working', color: '#22C55E', desc: 'Agent is typing, monitor glows green' },
                { label: 'Idle', color: '#78716C', desc: 'Monitor dimmed, lights slightly lower' },
                { label: 'Blocked', color: '#EF4444', desc: 'Red flash on monitor, room pulses' },
                { label: 'Done', color: '#3B82F6', desc: 'Agent stretches, green checkmark floats up' },
              ].map((status) => (
                <motion.div key={status.label} variants={fadeUp} className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                  <div>
                    <span className="font-semibold text-sm text-[#1A1A17]">{status.label}</span>
                    <span className="text-sm text-[#8A847C] ml-2">{status.desc}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Room images grid */}
          <motion.div variants={stagger} className="relative">
            <div className="grid grid-cols-2 gap-4">
              {ROOMS.slice(0, 4).map((room, i) => (
                <motion.div
                  key={room.name}
                  variants={scaleIn}
                  className="relative group"
                  style={{ marginTop: i % 2 === 1 ? '24px' : '0' }}
                >
                  <div className="relative overflow-hidden rounded-xl shadow-xl shadow-black/10 bg-[#1A1A17]">
                    <img
                      src={room.img}
                      alt={`${room.name}'s room`}
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {/* Status glow overlay */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      room.status === 'Working' ? 'bg-green-500/10' :
                      room.status === 'Done' ? 'bg-blue-500/10' : 'bg-gray-500/5'
                    }`} />
                  </div>
                  {/* Label */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                      <p className="font-headline font-bold text-sm text-[#1A1A17]">{room.name}</p>
                      <p className="text-[11px] text-[#8A847C]">{room.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Fifth room offset */}
            <motion.div variants={scaleIn} className="mt-4 w-[48%] mx-auto group">
              <div className="relative overflow-hidden rounded-xl shadow-xl shadow-black/10 bg-[#1A1A17]">
                <img
                  src={ROOMS[4].img}
                  alt={`${ROOMS[4].name}'s room`}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                  <p className="font-headline font-bold text-sm text-[#1A1A17]">{ROOMS[4].name}</p>
                  <p className="text-[11px] text-[#8A847C]">{ROOMS[4].role}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

// --- DASHBOARD SHOWCASE (Dark section) ---
function DashboardShowcase() {
  return (
    <Section dark className="py-24 md:py-40">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center mb-16">
          <SectionLabel dark>Layer 2</SectionLabel>
          <SectionHeadline dark>
            Clean data.<br />
            <span className="text-[#22C55E]">Zero noise.</span>
          </SectionHeadline>
          <SectionBody dark className="mx-auto mt-6 text-center">
            Throughput metrics, agent statuses, pipeline activity, and blockers. All real-time. The view for quick checks and client meetings.
          </SectionBody>
        </div>

        {/* Dashboard mockup */}
        <motion.div variants={fadeUp} className="relative">
          <div className="bg-[#0C0C0C] border border-[#292524] rounded-sm p-6 md:p-10 shadow-2xl">
            {/* Throughput bar */}
            <div className="flex flex-wrap gap-6 mb-8 pb-6 border-b border-[#292524]">
              {[
                { label: 'Working', value: '4', color: '#22C55E' },
                { label: 'Idle', value: '2', color: '#78716C' },
                { label: 'Blocked', value: '1', color: '#EF4444' },
                { label: 'Done Today', value: '7', color: '#3B82F6' },
                { label: 'Commits', value: '12', color: '#EAB308' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                  <div>
                    <p className="font-mono text-2xl font-black text-[#F5F0EB]" style={{ fontStyle: 'italic' }}>
                      {stat.value}
                    </p>
                    <p className="text-[10px] font-mono tracking-wider uppercase text-[#78716C]">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Agent grid mockup */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ROOMS.map((room) => (
                <div
                  key={room.name}
                  className="bg-[#141412] border border-[#292524] rounded-sm p-4 hover:border-[#FF4F00]/30 transition-colors duration-300"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-2 h-2 rounded-full ${
                      room.status === 'Working' ? 'bg-green-500' :
                      room.status === 'Done' ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    <p className="font-headline font-bold text-[#F5F0EB] text-sm">{room.name}</p>
                  </div>
                  <p className="text-[11px] text-[#78716C] font-mono">{room.role}</p>
                  <p className="text-xs text-[#A8A29E] mt-2">
                    {room.status === 'Working' ? 'Building product page...' :
                     room.status === 'Done' ? 'Completed: brand research' : 'Awaiting next task'}
                  </p>
                </div>
              ))}
              {/* Extra card */}
              <div className="bg-[#141412] border border-dashed border-[#292524] rounded-sm p-4 flex items-center justify-center">
                <p className="text-xs text-[#44403C] font-mono">+ Add Agent</p>
              </div>
            </div>
          </div>

          {/* Glow effect behind */}
          <div className="absolute -inset-4 bg-gradient-to-b from-[#FF4F00]/5 via-transparent to-transparent rounded-lg -z-10 blur-xl" />
        </motion.div>
      </div>
    </Section>
  );
}

// --- CHAT SHOWCASE ---
function ChatShowcase() {
  const messages = [
    { from: 'user', text: "What's the status on the website?" },
    { from: 'agent', text: "The Ambition site is live. Client approved yesterday. 9 commits shipped in the last session: mosaic gallery, Gumlet video integration, mobile stats fix. Social content is drafted (3 LinkedIn posts), waiting on your review." },
    { from: 'user', text: 'Schedule a review session for Thursday.' },
    { from: 'agent', text: "Done. Added 'Ambition Review' to your calendar, Thursday 2:00 PM AZ time. I'll prep the social drafts and site changelog before then.", action: true },
  ];

  return (
    <Section className="py-24 md:py-40 bg-[#F5F0EB]">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Chat mockup */}
          <motion.div variants={fadeUp} className="order-2 lg:order-1">
            <div className="bg-white border border-[#E8E3DC] rounded-xl shadow-xl shadow-black/5 overflow-hidden max-w-[440px] mx-auto">
              {/* Chat header */}
              <div className="bg-[#FAFAF8] border-b border-[#E8E3DC] px-5 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FF4F00]/10 flex items-center justify-center">
                  <Monitor size={18} className="text-[#FF4F00]" />
                </div>
                <div>
                  <p className="font-headline font-bold text-sm text-[#1A1A17]">Bobby</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <p className="text-[10px] text-[#8A847C] font-mono">Working</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-3 max-h-[400px]">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                      msg.from === 'user'
                        ? 'bg-[#FF4F00] text-white rounded-br-sm'
                        : 'bg-[#F5F0EB] text-[#1A1A17] rounded-bl-sm'
                    }`}>
                      {msg.text}
                      {msg.action && (
                        <div className="mt-2 pt-2 border-t border-[#E8E3DC] flex items-center gap-2">
                          <Sparkles size={12} className="text-[#FF4F00]" />
                          <span className="text-[11px] text-[#8A847C] font-mono">Calendar event created</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-[#E8E3DC] px-4 py-3 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Message Bobby..."
                  className="flex-1 bg-transparent text-sm text-[#1A1A17] placeholder-[#C4BFBA] outline-none"
                  readOnly
                />
                <button className="w-8 h-8 bg-[#FF4F00] rounded-lg flex items-center justify-center">
                  <ArrowRight size={14} className="text-white" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Text */}
          <div className="order-1 lg:order-2">
            <SectionLabel>Layer 3</SectionLabel>
            <SectionHeadline>
              Talk to your agents.<br />
              <span className="text-[#3B82F6]">They talk back.</span>
            </SectionHeadline>
            <SectionBody className="mt-6">
              Every agent understands your business. They know your clients, your calendar, your goals. Ask anything. Give instructions. They execute.
            </SectionBody>

            <motion.div variants={stagger} className="mt-10 space-y-5">
              {[
                { icon: MessageSquare, text: 'Natural language. No commands to memorize.' },
                { icon: Zap, text: 'Agents take real actions. Calendar, email, tasks.' },
                { icon: Shield, text: 'Full conversation history. Nothing gets lost.' },
              ].map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon size={18} className="text-[#3B82F6]" />
                  </div>
                  <p className="text-[#6B6560] leading-relaxed pt-2">{item.text}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// --- ONBOARDING / "DESIGN YOUR OFFICE" ---
function OnboardingSection() {
  const steps = [
    { step: '01', title: 'Tell us about you', desc: 'Name, role, business. One question at a time. Feels like texting.' },
    { step: '02', title: 'Describe your work', desc: 'Services, clients, team, tools. We build your context.' },
    { step: '03', title: 'Set your goals', desc: 'What should your AI team tackle first? What does success look like?' },
    { step: '04', title: 'Design your office', desc: 'Describe your dream workspace. We generate your world.' },
    { step: '05', title: 'Meet your team', desc: 'Your command center appears. Rooms populate. Agents introduce themselves.' },
  ];

  return (
    <Section className="py-24 md:py-40">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center mb-20">
          <SectionLabel>Onboarding</SectionLabel>
          <SectionHeadline>
            Describe your dream office.<br />
            <span className="text-[#FF4F00]">We build your world.</span>
          </SectionHeadline>
          <SectionBody className="mx-auto mt-6 text-center">
            Every client's command center looks different. Modern tech startup with glass walls? Classic wood-paneled law office? Industrial shop? Your agents live in your world.
          </SectionBody>
        </div>

        {/* Steps */}
        <motion.div variants={stagger} className="relative">
          {/* Connection line */}
          <div className="hidden md:block absolute left-[28px] top-0 bottom-0 w-px bg-gradient-to-b from-[#FF4F00]/20 via-[#FF4F00]/10 to-transparent" />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                variants={fadeUp}
                className="flex items-start gap-6 md:gap-8"
              >
                <div className="flex-shrink-0 w-14 h-14 bg-[#FF4F00]/5 border border-[#FF4F00]/20 rounded-lg flex items-center justify-center relative z-10">
                  <span className="font-mono font-bold text-sm text-[#FF4F00]">{step.step}</span>
                </div>
                <div className="pt-2">
                  <h3 className="font-headline font-bold text-lg text-[#1A1A17] mb-1">{step.title}</h3>
                  <p className="text-[#6B6560] leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.p
          variants={fadeUp}
          className="text-center mt-16 text-[#A8A29E] font-mono text-sm tracking-wider"
        >
          "A million worlds, one platform."
        </motion.p>
      </div>
    </Section>
  );
}

// --- PRICING ---
function PricingSection() {
  return (
    <Section dark className="py-24 md:py-40">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-16">
          <SectionLabel dark>Pricing</SectionLabel>
          <SectionHeadline dark>
            Hire your AI team.
          </SectionHeadline>
          <SectionBody dark className="mx-auto mt-4 text-center">
            More agents means more rooms. You're building a team, not buying features.
          </SectionBody>
        </div>

        <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((tier) => (
            <motion.div
              key={tier.name}
              variants={fadeUp}
              className={`relative p-6 md:p-8 rounded-sm border transition-all duration-300 ${
                tier.highlight
                  ? 'bg-[#FF4F00]/10 border-[#FF4F00]/40 shadow-lg shadow-[#FF4F00]/5'
                  : 'bg-[#141412] border-[#292524] hover:border-[#44403C]'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-6 px-3 py-1 bg-[#FF4F00] text-white text-[10px] font-mono font-bold tracking-wider uppercase">
                  Most Popular
                </div>
              )}

              <h3 className="font-headline font-black text-xl text-[#F5F0EB] mb-1">{tier.name}</h3>

              {tier.agents > 0 && (
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-headline font-black text-3xl text-[#F5F0EB]" style={{ fontStyle: 'italic' }}>
                    {tier.agents}
                  </span>
                  <span className="text-sm text-[#78716C]">agents</span>
                </div>
              )}

              <div className="mb-4">
                {tier.monthly ? (
                  <div>
                    <span className="font-headline font-bold text-lg text-[#F5F0EB]">{tier.monthly}</span>
                    <span className="text-sm text-[#78716C]">/month</span>
                    <p className="text-xs text-[#78716C] mt-0.5">{tier.setup} setup</p>
                  </div>
                ) : (
                  <div>
                    <span className="font-headline font-bold text-lg text-[#F5F0EB]">{tier.setup}</span>
                    <span className="text-sm text-[#78716C]"> one-time</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-[#A8A29E] leading-relaxed mb-6">{tier.description}</p>

              <ul className="space-y-2 mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#A8A29E]">
                    <div className="w-1 h-1 rounded-full bg-[#FF4F00] mt-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="/book"
                className={`block text-center py-3 text-sm font-headline font-bold uppercase tracking-wider transition-colors duration-300 ${
                  tier.highlight
                    ? 'bg-[#FF4F00] text-white hover:bg-[#FF6B2B]'
                    : 'border border-[#44403C] text-[#A8A29E] hover:border-[#FF4F00]/40 hover:text-[#F5F0EB]'
                }`}
              >
                {tier.agents === 0 ? 'Book Audit' : 'Get Started'}
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

// --- FINAL CTA ---
function FinalCTA() {
  return (
    <Section className="py-24 md:py-40">
      <div className="max-w-[800px] mx-auto px-6 text-center">
        <motion.div variants={fadeUp} className="mb-12">
          {/* Room images in a row */}
          <div className="flex justify-center gap-3 mb-12">
            {ROOMS.slice(0, 5).map((room, i) => (
              <motion.img
                key={room.name}
                src={room.img}
                alt={room.name}
                variants={scaleIn}
                className="w-16 h-16 md:w-20 md:h-20 rounded-xl shadow-lg shadow-black/10 object-cover"
                style={{ transform: `rotate(${(i - 2) * 3}deg)` }}
                loading="lazy"
              />
            ))}
          </div>
        </motion.div>

        <SectionHeadline>
          A million worlds.<br />
          <span className="text-[#FF4F00]">One Corner.</span>
        </SectionHeadline>
        <SectionBody className="mx-auto mt-6 text-center">
          Your AI team is ready to move in. Start with an audit. See where AI fits your business. Then watch your command center come alive.
        </SectionBody>

        <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/book"
            className="inline-flex items-center gap-3 bg-[#FF4F00] text-white font-headline font-black uppercase text-sm tracking-wider px-10 py-5 hover:bg-[#FF6B2B] transition-colors duration-300"
          >
            Book Your Audit <ArrowRight size={18} />
          </a>
        </motion.div>

        <motion.p variants={fadeIn} className="mt-16 text-[#C4BFBA] text-sm">
          Built by{' '}
          <a href="/" className="text-[#8A847C] hover:text-[#1A1A17] transition-colors">
            AOM
          </a>
        </motion.p>
      </div>
    </Section>
  );
}

// --- MAIN PAGE ---
export default function Corner() {
  return (
    <div className="bg-[#FAFAF8] min-h-screen">
      {/* Minimal nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF8]/80 backdrop-blur-md border-b border-[#E8E3DC]/50">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/corner" className="font-headline font-black text-lg text-[#1A1A17] tracking-tight">
            Corner
          </a>
          <div className="flex items-center gap-6">
            <a href="#layers" className="text-sm text-[#6B6560] hover:text-[#1A1A17] transition-colors hidden sm:block">
              Features
            </a>
            <a href="/book" className="text-sm bg-[#FF4F00] text-white font-headline font-bold uppercase tracking-wider px-5 py-2 hover:bg-[#FF6B2B] transition-colors">
              Book Audit
            </a>
          </div>
        </div>
      </nav>

      <Hero />
      <ProblemSection />
      <LayersOverview />
      <IsometricShowcase />
      <DashboardShowcase />
      <ChatShowcase />
      <OnboardingSection />
      <PricingSection />
      <FinalCTA />
    </div>
  );
}
