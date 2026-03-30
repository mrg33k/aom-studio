import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, User, Camera, Play } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

const ACTS = [
  {
    number: 1,
    title: 'The Problem',
    duration: '~60-75 sec',
    color: '#C84B1E',
  },
  {
    number: 2,
    title: 'The Breakthrough',
    duration: '~150-180 sec',
    color: '#E85D26',
  },
  {
    number: 3,
    title: 'The Future',
    duration: '~60-75 sec',
    color: '#B8461B',
  },
];

const BEATS = [
  {
    act: 1,
    beatNum: '1.1',
    id: 'beat-1-1',
    title: 'The Invisible Dependency',
    point: 'The audience should feel how deeply electricity runs through every moment of modern life.',
    visual: 'Quick montage. City skyline at dusk lighting up. Phone charging on a nightstand. Hospital monitors running. Data center racks blinking.',
    narration: '"Everything runs on electricity. Every light, every screen, every system keeping someone alive right now. And almost nobody thinks about where it comes from."',
    subject: 'Hunter',
    question: 'When did you first realize how fragile the thing we all depend on actually is?',
    timing: '15-20 sec',
  },
  {
    act: 1,
    beatNum: '1.2',
    id: 'beat-1-2',
    title: 'The Century-Old Grid',
    point: 'The system powering the modern world was designed over 100 years ago. Centralized, inefficient, showing its age.',
    visual: 'Wide drone shot of transmission lines crossing desert. Massive electrical substation. Cooling towers of a power plant. Workers inspecting aging infrastructure.',
    narration: '"The grid that powers it all was built more than a century ago. Centralized generation. Massive infrastructure. Long-distance transmission with energy lost at every step."',
    subject: 'Skylar',
    question: 'When you talk to potential customers and partners, what do they say about the current state of energy infrastructure?',
    timing: '18-25 sec',
  },
  {
    act: 1,
    beatNum: '1.3',
    id: 'beat-1-3',
    title: "The Gap Renewables Can't Close",
    point: 'Solar and wind are helping but they are not always-on. The world needs something that works anytime, anywhere.',
    visual: 'Wind turbines at sunset, slowing. Solar panels losing light as clouds pass. A single house in a remote location, far from any power line.',
    narration: '"Renewables are part of the answer. But the sun goes down. The wind stops. And the places that need power most are often the farthest from any grid."',
    subject: null,
    question: null,
    timing: '15-20 sec',
  },
  {
    act: 2,
    beatNum: '2.1',
    id: 'beat-2-1',
    title: 'The Origin',
    point: 'Introduce ISA and the idea that started it all. A small team in Sedona asked a question nobody else was asking.',
    visual: 'Cut to Sedona lab exterior. Slow push toward the entrance. Then inside: the lab, warm and real. Equipment on benches. Whiteboards covered in notes.',
    narration: '"Nearly a decade ago, a team in Sedona started asking a different question: what if you didn\'t need the grid at all?"',
    subject: 'Hunter',
    question: 'Take me back to the beginning. What was the original insight that made you believe this was possible?',
    timing: '25-35 sec',
  },
  {
    act: 2,
    beatNum: '2.2',
    id: 'beat-2-2',
    title: 'What the Technology Actually Does',
    point: 'Ambient energy capture -- converting energy that already exists in the environment into usable power. No grid. No fuel. No intermittency.',
    visual: 'Close-up of the ISA coil device. Oscilloscope waveform readings. Harrison adjusting the transformer coil. Device powering a light bulb.',
    narration: '"ISA\'s technology captures ambient energy -- energy that already exists in the environment -- and converts it into usable power. Directly at the point of consumption. No grid connection. No fuel source."',
    subject: 'Harrison',
    question: 'In the simplest terms you can, explain what this system actually does and why it\'s different from anything else out there.',
    timing: '35-45 sec',
  },
  {
    act: 2,
    beatNum: '2.3',
    id: 'beat-2-3',
    title: 'The Proof',
    point: 'This is not theoretical. It has been tested. Independently validated. The results are real.',
    visual: 'Scientist observing equipment measurements. Validation study documentation. Close-up of oscilloscope power readings showing net energy gain. Lab notebook pages.',
    narration: '"And they proved it. Independent validation confirmed net energy gain. Not on paper. In the lab. Measured, documented, and repeatable."',
    subject: 'Harrison',
    question: 'What did the validation study actually show? Walk me through the moment you saw the results.',
    timing: '25-35 sec',
  },
  {
    act: 2,
    beatNum: '2.4',
    id: 'beat-2-4',
    title: 'Why Now',
    point: 'Energy demand is surging -- AI, EVs, global electrification. The existing grid cannot keep up. ISA arrives exactly when the world needs it.',
    visual: 'Dense city at night, every building lit up. Construction cranes. EV charging stations. Server farms. The visual message: demand is accelerating.',
    narration: '"The timing matters. Global energy demand is accelerating faster than infrastructure can grow. AI. Electric vehicles. Entire economies going digital. The grid was never built for this."',
    subject: 'Skylar',
    question: "Why does this technology matter right now, specifically? What's changed in the market that makes ISA's timing so critical?",
    timing: '25-35 sec',
  },
  {
    act: 3,
    beatNum: '3.1',
    id: 'beat-3-1',
    title: 'What This Means for the World',
    point: 'Homes that generate their own power. Businesses free from grid dependency. Remote communities with reliable electricity. A fundamental shift.',
    visual: 'Modern home lighting up at night. Office building fully powered. Remote village with lights on. Electric vehicle charging.',
    narration: '"Imagine a home that powers itself. A business that never worries about the grid going down. A community that was never connected to the grid in the first place -- finally with reliable power."',
    subject: 'Hunter',
    question: 'When this technology is fully deployed, what does the world look like? What changes for ordinary people?',
    timing: '25-35 sec',
  },
  {
    act: 3,
    beatNum: '3.2',
    id: 'beat-3-2',
    title: 'The Close',
    point: 'Confidence without arrogance. ISA is building something that works. And they are just getting started.',
    visual: 'ISA team walking through the lab together. Golden hour light through the Sedona lab windows. Final wide shot of the Sedona landscape at dusk.',
    narration: '"The future of energy is not bigger plants and longer power lines. It\'s smaller, closer, and already here."',
    subject: 'Hunter',
    question: 'What drives you to keep going? What is this really about for you?',
    timing: '20-30 sec',
  },
];

const SUBJECTS = [
  { name: 'Hunter', role: 'CEO / Founder', order: 2, beats: ['1.1', '2.1', '3.1', '3.2'] },
  { name: 'Harrison', role: 'Asst Lead Science', order: 1, beats: ['2.2', '2.3'] },
  { name: 'Skylar', role: 'Sales / Business Dev', order: 3, beats: ['1.2', '2.4'] },
  { name: 'Jared', role: 'Business / Background', order: 4, beats: [] },
];

const SCHEDULE = [
  { time: '9:00 AM', label: 'Arrive & set up' },
  { time: '10:00 AM', label: 'Harrison interview (20-30 min)' },
  { time: '10:45 AM', label: 'Hunter interview (30-40 min)' },
  { time: '11:30 AM', label: 'Lab b-roll & device close-ups' },
  { time: '12:30 PM', label: 'Lunch' },
  { time: '1:30 PM', label: 'Skylar interview (20-25 min)' },
  { time: '2:15 PM', label: 'Jared interview (15-20 min)' },
  { time: '2:35 PM', label: 'Office b-roll & team candids' },
  { time: '3:30 PM', label: 'Sedona exterior b-roll & drone' },
  { time: '5:00 PM', label: 'Golden hour exteriors -- PRIORITY' },
  { time: '6:30 PM', label: 'Wrap' },
];

function useSEO() {
  useEffect(() => {
    document.title = 'ISA Energy -- Brand Video Shoot Script | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Full shoot script for ISA Energy brand video. 3 acts, 9 beats, 4 interview subjects. Sedona Apr 3.');
    setMeta('og:title', 'ISA Energy -- Brand Video Shoot Script', true);
    setMeta('og:description', '3 acts, 9 beats, 4 interview subjects. Sedona Apr 3, 2026.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/briefs/isa-energy-shoot-script', true);
  }, []);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5, delay },
});

function BeatCard({ beat, index }) {
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const isAct2 = beat.act === 2;
  const isAct3 = beat.act === 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden"
      style={{ background: '#111110' }}
    >
      {/* Storyboard image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-[#1A1916]">
        <img
          src={`/images/isa-energy/${beat.id}.png`}
          alt={beat.title}
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03] ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111110] via-transparent to-transparent opacity-80" />
        {/* Beat number badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#E85D26] bg-[#0A0A08]/80 px-2 py-1 backdrop-blur-sm">
            BEAT {beat.beatNum}
          </span>
        </div>
        {/* Timing badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#0A0A08]/80 px-2 py-1 backdrop-blur-sm">
          <Clock size={10} className="text-[#8A847C]" />
          <span className="font-mono text-xs text-[#8A847C]">{beat.timing}</span>
        </div>
        {/* Loading skeleton */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A1916] to-[#0F0F0E] animate-pulse" />
        )}
      </div>

      {/* Beat content */}
      <div className="p-5 md:p-6">
        <h3 className="font-headline text-lg font-bold text-[#F5F0EB] mb-2 leading-snug">
          {beat.title}
        </h3>

        {/* The point */}
        <p className="font-body text-sm text-[#8A847C] leading-relaxed mb-4">
          {beat.point}
        </p>

        {/* Narration */}
        <div className="border-l-2 border-[#E85D26]/40 pl-4 mb-4">
          <p className="font-body text-sm text-[#C8C3BB] italic leading-relaxed">
            {beat.narration}
          </p>
        </div>

        {/* Expand/collapse for details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 font-mono text-xs text-[#8A847C] hover:text-[#E85D26] transition-colors"
        >
          <span className="w-3 h-[1px] bg-current" />
          {expanded ? 'Less detail' : 'Visual notes + interview'}
          <span className="w-3 h-[1px] bg-current" />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4">
                {/* Visual description */}
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E85D26] mb-2">Visual</p>
                  <p className="font-body text-xs text-[#8A847C] leading-relaxed">{beat.visual}</p>
                </div>

                {/* Interview */}
                {beat.subject && beat.question && (
                  <div className="bg-white/[0.03] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User size={11} className="text-[#7C9A72]" />
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7C9A72]">{beat.subject}</span>
                    </div>
                    <p className="font-body text-xs text-[#8A847C] leading-relaxed italic">
                      "{beat.question}"
                    </p>
                  </div>
                )}
                {!beat.subject && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A847C]/50">Narration-only beat</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function ISAShootScript() {
  useSEO();

  const beatsByAct = (actNum) => BEATS.filter(b => b.act === actNum);

  return (
    <div className="bg-[#0A0A08] min-h-screen">
      <SiteNav />

      {/* Hero */}
      <section className="pt-28 md:pt-36 pb-0 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0)}>
            <a
              href="/briefs"
              className="inline-flex items-center gap-2 font-mono text-sm text-[#8A847C] hover:text-[#F5F0EB] transition-colors mb-10"
            >
              <ArrowLeft size={14} />
              All Briefs
            </a>
          </motion.div>

          <div className="grid md:grid-cols-[1fr_auto] gap-8 items-end">
            <div>
              <motion.p
                className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#7C9A72] mb-4"
                {...fadeUp(0.05)}
              >
                Content
              </motion.p>

              <motion.div {...fadeUp(0.08)}>
                <div className="w-12 h-[2px] bg-[#E85D26] mb-6" />
              </motion.div>

              <motion.h1
                className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.03em] text-[#F5F0EB] leading-[1.05] mb-6"
                {...fadeUp(0.1)}
              >
                ISA Energy
                <br />
                <span className="text-[#8A847C]">Brand Video</span>
              </motion.h1>

              <motion.p
                className="font-body text-lg text-[#8A847C] leading-relaxed max-w-[50ch] mb-8"
                {...fadeUp(0.14)}
              >
                Full shoot script. 3 acts, 9 beats, 4 interview subjects.
                Sedona Apr 3, 2026. Delivery Apr 17.
              </motion.p>

              {/* Quick meta */}
              <motion.div
                className="flex flex-wrap gap-4"
                {...fadeUp(0.18)}
              >
                {[
                  { label: 'Runtime', value: '~5 minutes' },
                  { label: 'Style', value: 'Theater format' },
                  { label: 'Location', value: 'Sedona, AZ' },
                  { label: 'Agent', value: 'Gary' },
                ].map(item => (
                  <div key={item.label} className="bg-white/[0.04] px-3 py-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8A847C]/60 mb-0.5">{item.label}</p>
                    <p className="font-mono text-xs text-[#F5F0EB]">{item.value}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Act overview */}
            <motion.div
              className="hidden md:flex flex-col gap-3 pb-1"
              {...fadeIn(0.25)}
            >
              {ACTS.map(act => (
                <a
                  key={act.number}
                  href={`#act-${act.number}`}
                  className="group flex items-center gap-3 text-left hover:opacity-100 opacity-80 transition-opacity"
                >
                  <div
                    className="w-[3px] h-8 flex-shrink-0 transition-all group-hover:h-10"
                    style={{ background: act.color }}
                  />
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8A847C]">Act {act.number}</p>
                    <p className="font-body text-sm font-medium text-[#C8C3BB]">{act.title}</p>
                  </div>
                  <span className="font-mono text-[10px] text-[#8A847C] ml-auto pl-4">{act.duration}</span>
                </a>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline strip */}
      <motion.section
        className="mt-16 px-6 md:px-12 overflow-x-auto"
        {...fadeIn(0.3)}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-stretch gap-0 min-w-max md:min-w-0">
            {BEATS.map((beat, i) => (
              <a
                key={beat.id}
                href={`#beat-${beat.beatNum.replace('.', '-')}`}
                className="group flex-1 min-w-[80px] relative"
              >
                <div
                  className="h-1 w-full transition-all group-hover:h-2"
                  style={{
                    background: beat.act === 1
                      ? '#C84B1E'
                      : beat.act === 2
                        ? '#E85D26'
                        : '#B8461B',
                    opacity: 0.5 + (i * 0.05),
                  }}
                />
                <div className="pt-2 pb-1 px-1">
                  <p className="font-mono text-[9px] text-[#8A847C] truncate">{beat.beatNum}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Acts and beats */}
      {ACTS.map(act => (
        <section key={act.number} id={`act-${act.number}`} className="mt-20 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            {/* Act header */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-6 mb-10 pb-6 border-b border-white/[0.06]"
            >
              <div
                className="font-headline text-6xl md:text-8xl font-bold leading-none select-none"
                style={{ color: act.color, opacity: 0.15 }}
              >
                0{act.number}
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A847C] mb-1">Act {act.number}</p>
                <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#F5F0EB]">{act.title}</h2>
                <p className="font-mono text-xs text-[#8A847C] mt-1">{act.duration}</p>
              </div>
            </motion.div>

            {/* Beat grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {beatsByAct(act.number).map((beat, i) => (
                <div key={beat.id} id={`beat-${beat.beatNum.replace('.', '-')}`}>
                  <BeatCard beat={beat} index={i} />
                </div>
              ))}

              {/* End card (Act 3 only) */}
              {act.number === 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="relative overflow-hidden"
                  style={{ background: '#0F0F0E', border: '1px solid rgba(232,93,38,0.15)' }}
                >
                  <div className="aspect-[16/9] flex items-center justify-center bg-[#0A0A08]">
                    <div className="text-center">
                      <div className="w-16 h-[2px] bg-[#E85D26] mx-auto mb-4" />
                      <p className="font-headline text-2xl font-bold text-[#F5F0EB] mb-1">ISA Industries</p>
                      <p className="font-mono text-xs text-[#8A847C] tracking-[0.2em] uppercase">Energy, everywhere.</p>
                      <div className="w-16 h-[2px] bg-[#E85D26] mx-auto mt-4" />
                    </div>
                  </div>
                  <div className="p-5 md:p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-[#E85D26]">BEAT 3.3</span>
                    </div>
                    <h3 className="font-headline text-lg font-bold text-[#F5F0EB] mb-2">End Card</h3>
                    <p className="font-body text-sm text-[#8A847C] leading-relaxed">
                      Black or deep dark frame. ISA Energy logo fades in. Tagline below. Hold 3 seconds.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      ))}

      {/* Lab Team Footage */}
      <section className="mt-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A847C] mb-3">Act 2 Callout</p>
            <div className="w-12 h-[2px] bg-[#E85D26] mb-4" />
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#F5F0EB]">Lab Team Footage</h2>
            <p className="font-body text-sm text-[#8A847C] mt-2">Captured between interviews. No extra cost.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { shot: 'Harrison calibrating transformer coil', note: 'Key technical visual' },
              { shot: 'Close-up hands: soldering, adjusting oscilloscope probes, lab notebooks', note: 'Detail texture' },
              { shot: 'Whiteboard sketching / debates', note: 'Team thinking on film' },
              { shot: 'Equipment rack power-up sequence', note: 'Drama beat' },
              { shot: 'Team watching test results come in', note: 'Emotional payoff' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="bg-white/[0.03] border border-white/[0.05] p-4"
              >
                <p className="font-body text-sm text-[#C8C3BB] leading-relaxed mb-1">{item.shot}</p>
                <p className="font-mono text-[10px] text-[#8A847C]/60">{item.note}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interview subjects */}
      <section className="mt-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A847C] mb-3">Interview Subjects</p>
            <div className="w-12 h-[2px] bg-[#E85D26] mb-4" />
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#F5F0EB]">Four Voices</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SUBJECTS.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="bg-white/[0.03] p-5 border border-white/[0.05]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold"
                    style={{
                      background: s.beats.length > 0 ? 'rgba(232,93,38,0.15)' : 'rgba(255,255,255,0.04)',
                      color: s.beats.length > 0 ? '#E85D26' : '#8A847C',
                    }}
                  >
                    {s.order}
                  </div>
                  <div>
                    <p className="font-body text-sm font-semibold text-[#F5F0EB]">{s.name}</p>
                    <p className="font-mono text-[10px] text-[#8A847C]">{s.role}</p>
                  </div>
                </div>
                {s.beats.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {s.beats.map(b => (
                      <span
                        key={b}
                        className="font-mono text-[10px] text-[#E85D26] bg-[#E85D26]/10 px-2 py-0.5"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[10px] text-[#8A847C]/50">Safety net. Shoot last.</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Shoot day schedule */}
      <section className="mt-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A847C] mb-3">Apr 3, 2026</p>
            <div className="w-12 h-[2px] bg-[#E85D26] mb-4" />
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#F5F0EB]">Shoot Day Flow</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-0 max-w-2xl">
            {SCHEDULE.map((item, i) => (
              <motion.div
                key={item.time}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className={`flex items-start gap-4 py-3 px-4 border-b border-white/[0.04] ${
                  item.label.includes('PRIORITY') ? 'bg-[#E85D26]/[0.06]' : ''
                }`}
              >
                <span className="font-mono text-xs text-[#8A847C] w-20 flex-shrink-0 pt-px">{item.time}</span>
                <span className={`font-body text-sm ${item.label.includes('PRIORITY') ? 'text-[#E85D26]' : 'text-[#C8C3BB]'}`}>
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 flex items-start gap-3 bg-[#E85D26]/[0.06] border border-[#E85D26]/20 p-4 max-w-2xl"
          >
            <Camera size={14} className="text-[#E85D26] mt-0.5 flex-shrink-0" />
            <p className="font-body text-sm text-[#C8C3BB] leading-relaxed">
              <strong className="text-[#F5F0EB]">Golden hour note:</strong> 5:30-6:30 PM in early April. Do not burn this window on interviews.
              The Sedona landscape shots for Beat 3.2 will be significantly more cinematic in that light.
            </p>
          </motion.div>
        </div>
      </section>

      {/* B-Roll Location Guide */}
      <section className="mt-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A847C] mb-3">B-Roll</p>
            <div className="w-12 h-[2px] bg-[#E85D26] mb-4" />
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#F5F0EB]">Location Guide</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Shoot Day */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[3px] h-6 bg-[#C84B1E]" />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A847C]">Shoot Day</p>
                  <p className="font-body text-sm font-semibold text-[#F5F0EB]">Apr 3 -- Sedona</p>
                </div>
                <span className="font-mono text-[10px] text-[#7C9A72] ml-auto">Free</span>
              </div>
              <div className="space-y-2">
                {[
                  'Lab exterior and entrance',
                  'Lab interior -- equipment, benches, whiteboards',
                  'Sedona landscape -- drone + ground',
                  'Golden hour Sedona scenics',
                  'Team candids on property',
                ].map((loc, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-white/[0.04]">
                    <span className="font-mono text-[10px] text-[#E85D26] mt-0.5">--</span>
                    <span className="font-body text-sm text-[#C8C3BB]">{loc}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Pickup Day */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-[3px] h-6 bg-[#E85D26]" />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A847C]">Pickup Day</p>
                  <p className="font-body text-sm font-semibold text-[#F5F0EB]">Apr 7-8 -- Phoenix</p>
                </div>
                <span className="font-mono text-[10px] text-[#8A847C] ml-auto">Low cost public</span>
              </div>
              <div className="space-y-2">
                {[
                  { location: 'Tempe Town Lake', detail: 'City skyline at dusk' },
                  { location: 'US-60 / Loop 202', detail: 'Transmission lines, solar farms' },
                  { location: 'APS Substations', detail: 'Telephoto from road' },
                  { location: 'EV Charging Stations', detail: 'Electrify America / Tesla' },
                  { location: 'Downtown Phoenix', detail: 'Construction cranes' },
                  { location: 'Arcadia / Scottsdale', detail: 'Modern homes at night' },
                ].map((loc, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-white/[0.04]">
                    <span className="font-mono text-[10px] text-[#E85D26] mt-0.5">--</span>
                    <div>
                      <span className="font-body text-sm text-[#C8C3BB]">{loc.location}</span>
                      <span className="font-mono text-[10px] text-[#8A847C] ml-2">{loc.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] p-4 max-w-2xl"
          >
            <span className="font-mono text-[10px] text-[#8A847C] mt-0.5">Stock</span>
            <p className="font-body text-sm text-[#8A847C] leading-relaxed">
              Backup stock footage via <strong className="text-[#C8C3BB]">Artgrid / Storyblocks</strong> -- ~$15-30/mo if location pickups fall through.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Theater Format Notes */}
      <section className="mt-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A847C] mb-3">Production</p>
            <div className="w-12 h-[2px] bg-[#E85D26] mb-4" />
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#F5F0EB]">Theater Format Notes</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Resolution', value: '4K minimum', note: 'Big screen ready' },
              { label: 'Camera', value: 'Slow movement', note: 'Deliberate, not handheld chaos' },
              { label: 'Sound', value: 'Design emphasis', note: 'Sound carries the room' },
              { label: 'Color', value: 'Sedona warmth', note: 'The anchor. Everything grades to it.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="bg-white/[0.03] border border-white/[0.05] p-5"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8A847C] mb-2">{item.label}</p>
                <p className="font-body text-base font-semibold text-[#F5F0EB] mb-1">{item.value}</p>
                <p className="font-mono text-[10px] text-[#8A847C]/70">{item.note}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Back link */}
      <section className="mt-24 mb-16 px-6 md:px-12">
        <div className="max-w-6xl mx-auto border-t border-white/[0.06] pt-8">
          <a
            href="/briefs"
            className="inline-flex items-center gap-2 font-mono text-sm text-[#E85D26] hover:text-[#F5F0EB] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to All Briefs
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
