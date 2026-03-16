import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Zap, Terminal } from 'lucide-react'

// ============================================================
// TERMINAL FEED - Skills "executing" in real time
// ============================================================

const FEED_LINES = [
  { skill: 'plan-my-day', result: '6 priorities ranked, 3 conflicts resolved' },
  { skill: 'email-drafter', result: '4 emails drafted, 2 follow-ups queued' },
  { skill: 'footage-review', result: '847 files cataloged, 12 hero shots flagged' },
  { skill: 'brand-agent', result: 'Full brand system generated from 5 images' },
  { skill: 'double-check', result: 'QA pass complete. 0 defects. Ship it.' },
  { skill: 'calendar', result: '3 events created, 1 conflict resolved' },
  { skill: 'audio-align', result: 'Lav sync complete. 0.2ms drift corrected.' },
  { skill: 'outreach', result: '12 prospects researched, 8 emails queued' },
  { skill: 'web-dev-agent', result: 'Component built, tested, deployed to Vercel' },
  { skill: 'gemini-vision', result: 'Crown v9 scored 9/10. Ready for delivery.' },
  { skill: 'auto-timeline', result: 'Rough cut assembled from 23 scored clips' },
  { skill: 'council', result: '4 agents deliberated. Consensus reached.' },
  { skill: 'run-the-numbers', result: '$45k/mo at 15 retainers. Break-even: month 4.' },
  { skill: 'social-agent', result: '3 LinkedIn posts scheduled, 2 IG reels queued' },
  { skill: 'punch-list', result: '4 tasks completed, 2 new items added' },
  { skill: 'masterplan', result: 'Q2 priorities ranked. 3 gaps identified.' },
  { skill: 'butter-method', result: 'Edit formula applied. Audio sculpted.' },
  { skill: 'supersaiyan', result: 'All agents engaged. Peak velocity.' },
]

// Skill names for the grid reveal
const SKILL_NAMES = [
  'plan-my-day', 'calendar', 'email-drafter', 'footage-review',
  'brand-agent', 'double-check', 'audio-align', 'outreach',
  'web-dev-agent', 'gemini-vision', 'auto-timeline', 'council',
  'social-agent', 'punch-list', 'masterplan', 'auto-color',
  'client-onboarding', 'session-start', 'butter-method', 'coding-qa',
  'skill-gap-scan', 'visual-search', 'suno-music', 'elevenlabs-voice',
  'doc-social-edit', 'phone-home', 'rally', 'blockers',
  'mobile-rundown', 'run-the-numbers', 'calendar-hygiene', 'wash-your-face',
  'internal-update', 'text-overlay', 'video-overlay', 'lip-sync',
  'ai-video-gen', 'footage-reorganize', 'audio-library', 'brand-refresh',
  'social-media-research', 'outreach-numbers', 'rag', 'merge-branches',
  'big-3', 'look', 'status', 'ask-elon',
  'check-with-elon', 'supersaiyan', '1on1',
]

// ============================================================
// COUNT UP ANIMATION
// ============================================================

function CountUp({ to, duration = 1800, className = '' }) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const scrollRoot = el.closest('main')

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setStarted(true); obs.disconnect() }
      },
      {
        root: scrollRoot || null,
        threshold: 0.1,
        rootMargin: '200px 0px 200px 0px',
      }
    )
    obs.observe(el)

    // Safety net
    const fallback = setTimeout(() => {
      if (!started && el) {
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setStarted(true)
          obs.disconnect()
        }
      }
    }, 3000)

    return () => { obs.disconnect(); clearTimeout(fallback) }
  }, [])

  useEffect(() => {
    if (!started) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(to * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, to, duration])

  return <span ref={ref} className={className}>{val}</span>
}

// ============================================================
// TERMINAL LINE COMPONENT
// ============================================================

function TerminalLine({ line }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex items-start gap-2 sm:gap-3 py-1 font-mono text-sm md:text-base"
    >
      <span className="text-white/20 shrink-0">[{line.time}]</span>
      <span className="text-aom-orange font-bold shrink-0">{line.skill}</span>
      <span className="text-white/15 shrink-0">&rarr;</span>
      <span className="text-aom-text-light/60 truncate">{line.result}</span>
    </motion.div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SkillsShowcase() {
  const [feedLines, setFeedLines] = useState([])
  const indexRef = useRef(0)
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  // Start feed animation when section is visible
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const scrollRoot = el.closest('main')

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { root: scrollRoot || null, threshold: 0.1, rootMargin: '100px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Terminal feed ticker
  useEffect(() => {
    if (!isVisible) return

    // Seed with initial lines
    const initial = FEED_LINES.slice(0, 5).map((line, i) => ({
      ...line,
      id: i,
      time: `${String(9 + Math.floor(i / 6)).padStart(2, '0')}:${String(14 + i).padStart(2, '0')}`,
    }))
    setFeedLines(initial)
    indexRef.current = 5

    const interval = setInterval(() => {
      const idx = indexRef.current % FEED_LINES.length
      const newLine = {
        ...FEED_LINES[idx],
        id: indexRef.current,
        time: `${String(9 + Math.floor(indexRef.current / 8)).padStart(2, '0')}:${String(indexRef.current % 60).padStart(2, '0')}`,
      }
      setFeedLines(prev => [...prev.slice(-6), newLine])
      indexRef.current++
    }, 3000)

    return () => clearInterval(interval)
  }, [isVisible])

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-36 bg-aom-night overflow-hidden"
      aria-label="Skills showcase"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(232,93,38,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(232,93,38,0.4) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-aom-orange/[0.03] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-screen-2xl mx-auto px-6 md:px-12 relative z-10">

        {/* === TOP: Counter + Headline === */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="mb-16 md:mb-20"
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-16">
            {/* Big counter */}
            <div>
              <span className="text-aom-orange text-[11px] font-mono font-bold uppercase tracking-[0.3em] mb-6 block">
                The Arsenal
              </span>
              <div className="flex items-baseline gap-4 md:gap-6">
                <span className="text-[7rem] md:text-[10rem] lg:text-[12rem] font-headline font-extrabold tracking-[-0.04em] leading-[0.75] text-aom-text-light">
                  <CountUp to={51} />
                </span>
                <div className="pb-2 md:pb-4">
                  <p className="font-headline text-xl md:text-3xl font-extrabold uppercase tracking-[-0.01em] text-aom-text-light leading-tight">
                    Skills Built.
                  </p>
                  <p className="font-headline text-xl md:text-3xl font-extrabold uppercase tracking-[-0.01em] text-aom-text-muted leading-tight">
                    Running. Tested Daily.
                  </p>
                </div>
              </div>
            </div>

            {/* Context card */}
            <div className="lg:max-w-md p-7 border border-white/10 bg-white/[0.03] shrink-0">
              <Zap className="text-aom-orange mb-5" size={22} />
              <p className="text-aom-text-muted text-base leading-relaxed font-body">
                Not plugins. Not templates. Every skill was built by running a real business, solving real problems, and testing daily. What took 3 hours now takes 2 minutes.
              </p>
            </div>
          </div>
        </motion.div>

        {/* === MIDDLE: Terminal Feed === */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="mb-16 md:mb-20"
        >
          <div className="p-5 md:p-8 border border-white/[0.08] bg-aom-night-card/80 backdrop-blur-sm overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/[0.06]">
              <Terminal size={14} className="text-aom-orange" />
              <span className="w-2 h-2 rounded-full bg-aom-orange animate-pulse" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-aom-text-muted">
                Live System Feed
              </span>
              <span className="text-[11px] font-mono text-white/15 ml-auto hidden sm:block">
                aom-ea@main ~/skills
              </span>
            </div>

            {/* Feed lines */}
            <div className="space-y-0.5 min-h-[180px]">
              <AnimatePresence mode="popLayout">
                {feedLines.map((line) => (
                  <TerminalLine key={line.id} line={line} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* === BOTTOM: Grid Reveal + CTA === */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Skill grid - dense, overwhelming, the point is the COUNT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="lg:col-span-8"
          >
            <div className="flex flex-wrap gap-2">
              {SKILL_NAMES.map((name, i) => (
                <motion.span
                  key={name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.3, delay: i * 0.02 }}
                  className="px-3 py-2 font-mono text-xs md:text-sm border border-white/[0.06] bg-white/[0.02] text-aom-text-muted hover:text-aom-text-light hover:border-aom-orange/30 hover:bg-aom-orange/5 transition-all duration-200 cursor-default select-none"
                >
                  {name}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* CTA column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="lg:col-span-4"
          >
            <div className="p-6 md:p-8 border-2 border-white/[0.08] bg-white/[0.02] sticky top-32">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-aom-orange mb-4">
                Your AI team, fully loaded
              </p>
              <h3 className="font-headline text-xl md:text-2xl font-extrabold uppercase tracking-[-0.01em] text-aom-text-light mb-4 leading-tight">
                This is what's running behind the scenes. Every day.
              </h3>
              <p className="text-aom-text-muted text-base leading-relaxed mb-6 font-body">
                7 free skills to start with. 51 total. Copy them, run them, see the difference.
              </p>
              <a
                href="/skills"
                className="w-full px-8 py-4 bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/20 flex items-center justify-center gap-2 text-base"
              >
                Explore All Skills <ArrowRight size={16} />
              </a>
              <a
                href="/book"
                className="w-full mt-3 px-8 py-4 border border-white/10 bg-white/[0.03] text-aom-text-muted font-headline font-extrabold uppercase tracking-tight hover:text-aom-text-light hover:border-white/20 transition-all flex items-center justify-center gap-2 text-base"
              >
                Book a Setup
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
