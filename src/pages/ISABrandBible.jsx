import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, Mic, Camera, Clock, User, Zap, Battery, Wifi, Box,
  Home, Building, Server, ChevronDown, ChevronUp, Play, Volume2,
  ExternalLink,
} from 'lucide-react';
import SiteNav from '../components/SiteNav.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// STORY ARC DATA
// ─────────────────────────────────────────────────────────────────────────────

const STORY_SECTIONS = [
  {
    id: 'mission',
    num: 1,
    title: 'The Mission',
    time: '0:00–0:10',
    speaker: 'Hunter',
    quote: 'Our mission is to solve the world\'s energy problem. This is a really difficult problem to solve. When we founded ISA in 2016, we began our journey with a fundamental look at what is the problem of energy.',
    visual: 'Cinematic lab wide shot, founders',
    stockLinks: [
      { label: 'Envato Elements', url: 'https://elements.envato.com/stock-video?q=cinematic+laboratory+scientists+wide+shot' },
      { label: 'Adobe Stock', url: 'https://stock.adobe.com/search?k=cinematic+lab+wide+shot+founders&filters%5Bcontent_type%3Avideo%5D=1' },
    ],
    icon: Zap,
  },
  {
    id: 'question',
    num: 2,
    title: 'The Question',
    time: '0:10–0:30',
    speaker: 'Hunter + Skylar',
    quote: 'The majority of the world agrees we should build a sustainable future. However, we\'ve had renewables for over 100 years. When we installed the first electrical grids in New York City, photovoltaics had already been invented. So why haven\'t we already built a sustainable world?',
    visual: 'Historical energy footage, cost comparison graphic',
    stockLinks: [
      { label: 'Envato Elements', url: 'https://elements.envato.com/stock-video?q=historical+energy+fossil+fuel+infrastructure' },
      { label: 'Adobe Stock', url: 'https://stock.adobe.com/search?k=renewable+energy+history+cost+comparison&filters%5Bcontent_type%3Avideo%5D=1' },
    ],
    icon: Battery,
  },
  {
    id: 'ideal-source',
    num: 3,
    title: 'The Ideal Source',
    time: '0:30–0:50',
    speaker: 'Hunter',
    quote: 'In order to accomplish this, it became very clear to us that we would need a source of energy that possessed a handful of key attributes.',
    attributes: [
      { name: 'Always On', desc: '24/7, unlike renewables' },
      { name: 'Decentralized', desc: 'Power at source of consumption' },
      { name: 'Scalable', desc: 'Mass-manufacturable, no rare materials' },
      { name: 'Sustainable', desc: 'Inherent built-in benefit' },
    ],
 visual: 'Motion graphics, four attributes',
    stockLinks: [
      { label: 'Envato Elements', url: 'https://elements.envato.com/stock-video?q=energy+motion+graphics+infographic+attributes' },
      { label: 'Adobe Stock', url: 'https://stock.adobe.com/search?k=clean+energy+motion+graphics+infographic&filters%5Bcontent_type%3Avideo%5D=1' },
    ],
    icon: Wifi,
  },
  {
    id: 'discovery',
    num: 4,
    title: 'The Discovery',
    time: '0:50–1:10',
    speaker: 'Hunter + Skylar',
    quote: 'With those attributes in mind, we began a search. We looked at everything from fusion to hydrogen and new types of battery chemistry. And along our journey, we kept running into scientists who were proposing this idea that empty space around us isn\'t actually empty at all. It\'s full of energy.',
    visual: 'Research montage, equations',
    stockLinks: [
      { label: 'Envato Elements', url: 'https://elements.envato.com/stock-video?q=scientists+working+in+lab+research+equations' },
      { label: 'Adobe Stock', url: 'https://stock.adobe.com/search?k=physics+research+equations+laboratory&filters%5Bcontent_type%3Avideo%5D=1' },
    ],
    icon: Box,
  },
  {
    id: 'journey-proof',
    num: 5,
    title: 'The Journey + Proof',
    time: '1:10–1:40',
    speaker: 'Hunter',
    quote: 'At that point in time, we didn\'t know if it would be possible, but we knew if we could figure it out, it would be the most ideal source of energy for the future. So, after nearly a decade of research, thousands of experiments, trial and error, we\'ve proven that you can actually harvest energy at the quantum level from space around us and use it to generate electrical power.',
    visual: 'Lab b-roll, prototypes, then device footage',
    stockLinks: [
      { label: 'Envato Elements', url: 'https://elements.envato.com/stock-video?q=laboratory+testing+prototype+technology+device' },
      { label: 'Adobe Stock', url: 'https://stock.adobe.com/search?k=lab+prototype+testing+device+footage&filters%5Bcontent_type%3Avideo%5D=1' },
    ],
    icon: Zap,
  },
  {
    id: 'product',
    num: 6,
    title: 'The Product',
    time: '1:40–2:10',
    speaker: 'Hunter',
    quote: 'Today, we\'re building a quantum energy generator. One that is designed to provide energy freedom and independence to homeowners, communities, and data centers, giving the world an affordable, decentralized, clean energy solution.',
    applications: [
      { name: 'Homes', icon: Home },
      { name: 'Communities', icon: Building },
      { name: 'Data Centers', icon: Server },
    ],
    visual: 'Application visualizations',
    stockLinks: [
      { label: 'Envato Elements', url: 'https://elements.envato.com/stock-video?q=clean+energy+home+community+data+center' },
      { label: 'Adobe Stock', url: 'https://stock.adobe.com/search?k=energy+electricity+clean+renewable+home+data+center&filters%5Bcontent_type%3Avideo%5D=1' },
    ],
    icon: Zap,
  },
  {
    id: 'close',
    num: 7,
    title: 'The Close',
    time: '2:10–2:25',
    speaker: 'Hunter + Skylar',
    quote: 'We are ISA. This is power reimagined.',
    visual: 'End card, logo',
    stockLinks: [
      { label: 'Envato Elements', url: 'https://elements.envato.com/stock-video?q=minimal+corporate+logo+reveal+energy' },
      { label: 'Adobe Stock', url: 'https://stock.adobe.com/search?k=corporate+logo+reveal+clean+energy&filters%5Bcontent_type%3Avideo%5D=1' },
    ],
    icon: Zap,
  },
];

const HUNTER_SELECTS = [
  {
    id: 'hunter-1',
    source: 'DJI_12',
    quote: 'Our mission is to solve the world\'s energy problem. This is a really difficult problem to solve. When we founded ISA in 2016, we began our journey with a fundamental look at what is the problem of energy.',
  },
  {
    id: 'hunter-2',
    source: 'DJI_13',
    quote: 'The reason for this is the simple fact that renewables are more expensive and less profitable than fossil fuels. If we\'re going to build a sustainable future, what we need is a source of energy that inverts that equation, making clean energy more cost-effective than oil and gas.',
  },
  {
    id: 'hunter-3',
    source: 'DJI_13',
    quote: 'In order to accomplish this, it became very clear to us that we would need a source of energy that possessed a handful of key attributes: always on, decentralized, scalable, and sustainable.',
  },
  {
    id: 'hunter-4',
    source: 'DJI_13',
    quote: 'With those attributes in mind, we began a search. And along our journey, we kept running into scientists who were proposing this idea that empty space around us isn\'t actually empty at all. It\'s full of energy.',
  },
  {
    id: 'hunter-5',
    source: 'DJI_14',
    quote: 'At that point in time, we didn\'t know if it would be possible, but we knew if we could figure it out, it would be the most ideal source of energy for the future. So, after nearly a decade of research, thousands of experiments, trial and error, we\'ve proven that you can actually harvest energy at the quantum level from space around us and use it to generate electrical power.',
  },
  {
    id: 'hunter-6',
    source: 'DJI_14',
    quote: 'Today, we\'re building a quantum energy generator. One that is designed to provide energy freedom and independence to homeowners, communities, and data centers, giving the world an affordable, decentralized, clean energy solution.',
  },
];

const SKYLAR_SELECTS = [
  {
    id: 'skylar-1',
    source: 'DJI_16',
    quote: 'When we began looking at what really is the energy problem, we began to consider since we\'ve had renewables for so long, why are we not already sustainable? What we found was shocking. Fossil fuels are simply more profitable and less expensive than clean energy.',
  },
  {
    id: 'skylar-2',
    source: 'DJI_16',
    quote: 'Along the way, we looked at new forms of fusion, hydrogen, and battery technologies. Simultaneously, through our research of mathematics and physics, we kept coming across this idea that the space around us may not be empty at all. It\'s full of energy.',
  },
];

const BROLL_NEEDED = [
  { section: 'Lab/Device', items: ['V3 box closeups', 'Coils', 'Oscilloscope', 'Signal generator'] },
  { section: 'Team at Work', items: ['Prototypes', 'Testing', 'Calibrating', 'Lab operations'] },
  { section: 'Sedona Exteriors', items: ['Lab exterior', 'Red rocks', 'Golden hour', 'Landscape'] },
  { section: 'Historical/Stock', items: ['NYC grid', 'Early renewables', 'Fossil fuel infrastructure', 'Energy data'] },
  { section: 'Applications', items: ['Modern home', 'Sustainable community', 'Data center rack', 'Installation'] },
  { section: 'Drone Aerials', items: ['Lab overhead', 'Sedona landscape', 'Desert context', 'Site establishing'] },
];

const FOOTAGE_INVENTORY = [
  {
    date: 'Apr 2, 2026',
    items: [
      { name: 'Ronin 4D Clips', count: 69, spec: '4K ProRes, 204GB' },
      { name: 'S5iiX Clips', count: 10, spec: '6K HEVC, 154GB' },
      { name: 'DJI MIC Audio', count: 9, spec: 'Clean two-channel' },
    ],
  },
  {
    date: 'Previous Shoots',
    items: [
      { name: 'Jul 2025', count: null, spec: 'Prototype testing' },
      { name: 'Sep 2025', count: null, spec: 'Lab operations' },
      { name: 'ISA Demo Shoot', count: null, spec: 'Drone aerials' },
      { name: 'Clean Tech Events', count: null, spec: 'Keynotes & panels' },
      { name: 'DOE Interviews', count: null, spec: 'Third-party validation' },
    ],
  },
  {
    date: 'Music Library',
    items: [
      { name: 'Adobe Stock Tracks', count: 6, spec: 'Curated selections' },
    ],
  },
];

const EDIT_NOTES = [
  'Dual VO spine: Hunter 65%, Skylar 35%',
  'Hunter = scientist (mission, proof, product)',
  'Skylar = strategist (economics, discovery)',
  'Pacing: tight, every second earns its place',
  'Tone: confident founders, not corporate',
  'Target: 2:25 runtime',
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StoryCard({ section, index }) {
  const Icon = section.icon;
  const isExpanded = false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      viewport={{ once: true, margin: '-100px' }}
      className="group"
    >
      <div className="relative bg-gradient-to-br from-white/5 to-white/2 border border-white/10 hover:border-[#E85D26]/40 p-8 transition-all duration-300 hover:shadow-lg hover:shadow-[#E85D26]/10">
        {/* Corner accent */}
        <div className="absolute top-0 left-0 w-1 h-6 bg-[#E85D26]" />

        {/* Icon and time */}
        <div className="flex items-start justify-between mb-6">
          <div className="w-12 h-12 rounded-lg bg-[#E85D26]/10 flex items-center justify-center">
            <Icon size={24} color="#E85D26" />
          </div>
          <span className="text-xs font-mono text-[#8A847C] bg-white/5 px-3 py-1 rounded">
            {section.time}
          </span>
        </div>

        {/* Section number and title */}
        <div className="mb-6">
          <div className="text-xs font-mono uppercase tracking-widest text-[#E85D26] mb-2">
            Section {section.num}
          </div>
          <h3 className="text-2xl font-headline font-extrabold text-white mb-4">
            {section.title}
          </h3>
          <p className="text-sm font-body text-[#8A847C] mb-1">
            Speaker: <span className="text-[#E85D26]">{section.speaker}</span>
          </p>
        </div>

        {/* Quote */}
        <blockquote className="border-l-2 border-[#E85D26]/40 pl-4 mb-6">
          <p className="text-base font-body leading-relaxed text-white">
            "{section.quote}"
          </p>
        </blockquote>

        {/* Attributes (for Section 3) */}
        {section.attributes && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {section.attributes.map((attr, i) => (
              <div key={i} className="bg-white/2 p-3 rounded border border-white/5">
                <div className="text-sm font-headline font-bold text-[#E85D26] mb-1">
                  {attr.name}
                </div>
                <p className="text-xs text-[#8A847C]">{attr.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Applications (for Section 6) */}
        {section.applications && (
          <div className="flex gap-4 mb-6">
            {section.applications.map((app, i) => {
              const AppIcon = app.icon;
              return (
                <div key={i} className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-lg bg-[#E85D26]/10 flex items-center justify-center mx-auto mb-2">
                    <AppIcon size={20} color="#E85D26" />
                  </div>
                  <p className="text-xs font-body font-bold text-white">{app.name}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Visual note */}
        <div className="flex items-center gap-2 text-xs text-[#8A847C] bg-white/2 px-3 py-2 rounded">
          <Film size={14} />
          <span>{section.visual}</span>
        </div>

        {/* Stock footage links */}
        {section.stockLinks && (
          <div className="flex gap-3 mt-3">
            {section.stockLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#E85D26]/70 hover:text-[#E85D26] transition-colors duration-200"
              >
                <ExternalLink size={12} />
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BestTakeCard({ take, speaker }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true, margin: '-100px' }}
      className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 p-6 rounded-lg hover:border-[#E85D26]/40 transition-all duration-300"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-8 h-8 rounded-full bg-[#E85D26]/10 flex items-center justify-center flex-shrink-0">
          <Mic size={16} color="#E85D26" />
        </div>
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[#E85D26] mb-1">
            {take.source}
          </div>
          <p className="text-xs text-[#8A847C]">
            <span className="text-white font-bold">{speaker}</span> speaks
          </p>
        </div>
      </div>
      <blockquote className="border-l-2 border-[#E85D26]/40 pl-4">
        <p className="text-sm leading-relaxed text-white">
          "{take.quote}"
        </p>
      </blockquote>
    </motion.div>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-8 py-6 bg-gradient-to-r from-white/5 to-white/2 hover:from-white/10 hover:to-white/5 flex items-center justify-between transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          {Icon && <Icon size={24} color="#E85D26" />}
          <h3 className="text-xl font-headline font-bold text-white">
            {title}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp size={24} color="#E85D26" />
        ) : (
          <ChevronDown size={24} color="#8A847C" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-white/10"
          >
            <div className="px-8 py-6 bg-black/20">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ISABrandBible() {
  return (
    <div style={{ backgroundColor: '#0A0A08', color: '#F0ECE6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <SiteNav transparent={true} />

      {/* HERO SECTION */}
      <section style={{ paddingTop: '120px', paddingBottom: '80px', background: 'linear-gradient(135deg, rgba(232, 93, 38, 0.1) 0%, transparent 100%)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-0.03em' }}>
              ISA Energy
              <br />
              <span style={{ color: '#E85D26' }}>Brand Video Bible</span>
            </h1>
            <p style={{ fontSize: '1.125rem', color: '#8A847C', marginBottom: '16px', maxWidth: '700px', margin: '0 auto 16px' }}>
              Two co-founders, one story. Reshaped from Apr 2, 2026 interview transcripts.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#8A847C' }}>
              <Clock size={18} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Runtime target: ~2:25</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 1: STORY ARC */}
      <section style={{ paddingTop: '80px', paddingBottom: '80px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Film size={32} color="#E85D26" />
              The Story Arc
            </h2>
            <p style={{ fontSize: '1rem', color: '#8A847C', maxWidth: '600px' }}>
              Seven sections forming the narrative spine. Each beat builds on the last.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {STORY_SECTIONS.map((section, index) => (
              <StoryCard key={section.id} section={section} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: BEST TAKES */}
      <section style={{ paddingTop: '80px', paddingBottom: '80px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'linear-gradient(180deg, rgba(232, 93, 38, 0.05) 0%, transparent 100%)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Volume2 size={32} color="#E85D26" />
              Best Take Selects
            </h2>
            <p style={{ fontSize: '1rem', color: '#8A847C', maxWidth: '600px' }}>
              Recommended soundbites organized by speaker. Source notation references original interview files.
            </p>
          </motion.div>

          {/* Hunter's Selects */}
          <div style={{ marginBottom: '60px' }}>
            <h3 style={{ fontWeight: 900, marginBottom: '20px', color: '#E85D26', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.875rem' }}>
              Hunter's Selects
            </h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              {HUNTER_SELECTS.map((take) => (
                <BestTakeCard key={take.id} take={take} speaker="Hunter" />
              ))}
            </div>
          </div>

          {/* Skylar's Selects */}
          <div>
            <h3 style={{ fontWeight: 900, marginBottom: '20px', color: '#E85D26', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.875rem' }}>
              Skylar's Selects
            </h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              {SKYLAR_SELECTS.map((take) => (
                <BestTakeCard key={take.id} take={take} speaker="Skylar" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: B-ROLL NEEDED */}
      <section style={{ paddingTop: '80px', paddingBottom: '80px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Camera size={32} color="#E85D26" />
              B-Roll Needed
            </h2>
            <p style={{ fontSize: '1rem', color: '#8A847C', maxWidth: '600px' }}>
              Comprehensive checklist of footage required for each section of the video.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {BROLL_NEEDED.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                viewport={{ once: true, margin: '-100px' }}
                style={{
                  background: 'linear-gradient(to br, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '24px',
                  borderRadius: '8px',
                }}
              >
                <h3 style={{ fontSize: '1.125rem', fontWeight: 900, marginBottom: '16px', color: '#E85D26' }}>
                  {category.section}
                </h3>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {category.items.map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: '#F0ECE6' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#E85D26', marginRight: '4px' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: FOOTAGE INVENTORY */}
      <section style={{ paddingTop: '80px', paddingBottom: '80px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'linear-gradient(180deg, rgba(232, 93, 38, 0.05) 0%, transparent 100%)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Box size={32} color="#E85D26" />
              Footage Inventory
            </h2>
            <p style={{ fontSize: '1rem', color: '#8A847C', maxWidth: '600px' }}>
              What's available across all drives and libraries.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gap: '24px' }}>
            {FOOTAGE_INVENTORY.map((group, index) => (
              <CollapsibleSection
                key={index}
                title={group.date}
                defaultOpen={index === 0}
              >
                <div style={{ display: 'grid', gap: '16px' }}>
                  {group.items.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '16px', alignItems: 'center', paddingBottom: '12px', borderBottom: index === group.items.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F0ECE6', marginBottom: '4px' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#8A847C' }}>
                          {item.spec}
                        </div>
                      </div>
                      {item.count !== null && (
                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#E85D26' }}>
                            {item.count}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#8A847C', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {item.count === 1 ? 'File' : 'Files'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: EDIT NOTES */}
      <section style={{ paddingTop: '80px', paddingBottom: '80px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mic size={32} color="#E85D26" />
              Edit Notes & Pacing
            </h2>
            <p style={{ fontSize: '1rem', color: '#8A847C', maxWidth: '600px' }}>
              Production guidelines for the edit. Keep these principles top of mind during post.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            style={{
              background: 'linear-gradient(to br, rgba(232, 93, 38, 0.1), rgba(232, 93, 38, 0.05))',
              border: '1px solid rgba(232, 93, 38, 0.3)',
              padding: '40px',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'grid', gap: '20px' }}>
              {EDIT_NOTES.map((note, index) => (
                <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E85D26', marginTop: '8px', flexShrink: 0 }} />
                  <p style={{ fontSize: '1rem', color: '#F0ECE6', lineHeight: 1.6 }}>
                    {note}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER SECTION */}
      <section style={{ paddingTop: '80px', paddingBottom: '80px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'linear-gradient(180deg, rgba(232, 93, 38, 0.08) 0%, transparent 100%)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h3 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#E85D26' }}>
              We are ISA.
            </h3>
            <p style={{ fontSize: '1.25rem', color: '#F0ECE6', marginBottom: '8px' }}>
              This is power reimagined.
            </p>
            <p style={{ fontSize: '0.95rem', color: '#8A847C', marginTop: '24px' }}>
              Brand Bible created April 9, 2026
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}