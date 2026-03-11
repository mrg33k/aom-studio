import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronDown, Film, Clapperboard, Palette, Volume2, Scissors,
  Phone, Mail, MapPin, Calendar, DollarSign, CheckCircle2, ArrowRight,
  Play, Sparkles, Clock, Shield, Users, Zap
} from 'lucide-react'

// ─── BRAND CONSTANTS ────────────────────────────────────────────────────────
const ORANGE = '#E85D26'
const ORANGE_HOVER = '#D14E1C'
const BG = '#0A0A0A'
const CARD_BG = '#151515'
const WARM_BG = '#1A1A17'
const CREAM = '#FDF6EC'
const TEXT = '#F0ECE6'
const MUTED = '#8A847C'
const BORDER = 'rgba(255,255,255,0.08)'
const PHONE_NUM = '(602) 373-2164'
const PHONE_HREF = 'tel:6023732164'
const EMAIL_ADDR = 'hello@aom-inhouse.com'

// Gumlet video for hero background (AZ Cleantech - tech/energy thematic match)
const HERO_VIDEO_ID = '698a57da873071aec5c93fa0'

// ─── INTERSECTION OBSERVER HOOK ─────────────────────────────────────────────
function useIntersect(options = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15, ...options }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

// ─── FADE-IN WRAPPER ────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, y = 20, className = '' }) {
  const [ref, visible] = useIntersect()
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── FILM GRAIN SVG ─────────────────────────────────────────────────────────
function FilmGrain() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]" style={{ opacity: 0.03, mixBlendMode: 'overlay' }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  )
}

// ─── NAV BAR ────────────────────────────────────────────────────────────────
function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-6 md:px-12"
      style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <a href="https://aheadofmarket.com" className="flex items-center gap-2">
        <span className="font-headline font-black text-xl tracking-tight" style={{ color: CREAM }}>AOM</span>
      </a>
      <div className="flex items-center gap-4">
        <a href={`mailto:${EMAIL_ADDR}`}
          className="hidden md:flex items-center gap-2 text-sm font-body transition-colors hover:text-white"
          style={{ color: MUTED }}>
          <Mail size={14} style={{ color: ORANGE }} />
          {EMAIL_ADDR}
        </a>
        <a href={PHONE_HREF}
          className="flex items-center gap-2 px-4 py-2 text-sm font-body font-semibold uppercase tracking-wider transition-all"
          style={{ background: ORANGE, color: CREAM }}>
          <Phone size={14} />
          <span className="hidden sm:inline">Let's Talk</span>
        </a>
      </div>
    </nav>
  )
}

// ─── HERO SECTION ───────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <iframe
          src={`https://play.gumlet.io/embed/${HERO_VIDEO_ID}?autoplay=true&muted=true&loop=true&preload=true&controls=false`}
          className="absolute inset-0 w-full h-full border-none"
          loading="eager"
          allow="autoplay"
          style={{ transform: 'scale(1.15)', objectFit: 'cover' }}
          title="AOM showreel background"
        />
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 z-[1]" style={{ background: 'rgba(10,10,10,0.65)' }} />
      <div className="absolute inset-0 z-[2]" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #0A0A0A 100%)' }} />
      <FilmGrain />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-[900px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
        >
          <span className="inline-block font-mono text-xs font-bold uppercase tracking-[0.2em] mb-4"
            style={{ color: ORANGE }}>
            Prepared for ISA Energy
          </span>
        </motion.div>

        <motion.h1
          className="font-headline font-black uppercase leading-[0.92] tracking-tight mb-6"
          style={{ color: CREAM, fontSize: 'clamp(40px, 8vw, 80px)', letterSpacing: '-0.03em' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          ISA<br />Brand Video
        </motion.h1>

        <motion.p
          className="font-body text-lg md:text-xl max-w-[600px] mx-auto mb-2"
          style={{ color: MUTED, lineHeight: 1.5 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          A cinematic brand film that introduces ISA Energy's ambient energy technology to the world.
        </motion.p>

        <motion.p
          className="font-body text-sm"
          style={{ color: MUTED, opacity: 0.6 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          March 2026
        </motion.p>
      </div>

      {/* Scroll cue */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        onClick={() => document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="font-body text-xs uppercase tracking-[0.08em]" style={{ color: MUTED }}>Explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
        >
          <ChevronDown size={24} style={{ color: MUTED }} />
        </motion.div>
      </motion.div>
    </section>
  )
}

// ─── OVERVIEW SECTION ───────────────────────────────────────────────────────
function OverviewSection() {
  const stats = [
    { value: '2-3 MIN', label: 'Final Runtime' },
    { value: 'CINEMA', label: 'Production Grade' },
    { value: '4K', label: 'Delivery Format' },
    { value: '$9,000', label: 'Total Investment' },
  ]

  return (
    <section id="overview" className="relative py-24 md:py-32" style={{ background: CARD_BG }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div>
            <FadeIn>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
                The Vision
              </span>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4"
                style={{ color: CREAM, letterSpacing: '-0.03em' }}>
                Your Story.<br />Cinematic Grade.
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="font-body text-base md:text-lg mt-6 max-w-[50ch]" style={{ color: MUTED, lineHeight: 1.6 }}>
                This is a premium narrative piece designed to build credibility, attract investors, and position ISA as a category-defining company in ambient energy.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <p className="font-body text-base md:text-lg mt-4 max-w-[50ch]" style={{ color: MUTED, lineHeight: 1.6 }}>
                Three acts. One story. The problem (outdated energy infrastructure), the breakthrough (ISA's ambient energy capture), and the future (what this means for the world).
              </p>
            </FadeIn>
          </div>

          {/* Right: Stats */}
          <div className="grid grid-cols-2 gap-6 md:gap-8">
            {stats.map((stat, i) => (
              <FadeIn key={stat.label} delay={0.3 + i * 0.1}>
                <div className="pl-5" style={{ borderLeft: `2px solid ${ORANGE}33` }}>
                  <div className="font-headline font-black text-3xl md:text-4xl" style={{ color: ORANGE, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
                    {stat.value}
                  </div>
                  <div className="font-body font-semibold text-xs uppercase tracking-[0.1em] mt-2" style={{ color: MUTED }}>
                    {stat.label}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── SCOPE SECTION ──────────────────────────────────────────────────────────
function ScopeSection() {
  const phases = [
    {
      icon: Clapperboard,
      title: 'Pre-Production',
      items: [
        'Narrative structure refinement and script lockdown',
        'Pre-visualization edit using stock footage and music',
        'Shot list development for the Sedona shoot',
        'Location scouting coordination (lab, device room, V3 box, Sedona)',
        'Music and sound design direction',
        'Storyboard and visual treatment',
      ],
    },
    {
      icon: Film,
      title: 'Production',
      items: [
        'Full production crew on location in Sedona',
        'Lab and device room footage (new expansion, V3 box, engineering team)',
        'Cinematic b-roll: desert landscapes, golden hour, tech close-ups',
        'Interviews and team shots as needed',
        'Cinema camera package, lighting, audio, drone for aerials',
      ],
    },
    {
      icon: Palette,
      title: 'Post-Production',
      items: [
        'Rough cut assembly and internal review',
        'Client review round (feedback before final)',
        'Color grading (cinematic, consistent across all footage)',
        'Motion graphics (data visualizations, energy diagrams)',
        'Sound design and music licensing/scoring',
        'Final mix and master, all required formats',
      ],
    },
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: BG }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] block text-center" style={{ color: ORANGE }}>
            Scope of Work
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4 text-center"
            style={{ color: CREAM, letterSpacing: '-0.03em' }}>
            From Script to Screen
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 md:mt-16">
          {phases.map((phase, i) => {
            const Icon = phase.icon
            return (
              <FadeIn key={phase.title} delay={0.2 + i * 0.12}>
                <div
                  className="p-8 md:p-10 h-full transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${BORDER}`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(232,93,38,0.3)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = BORDER
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  }}
                >
                  <Icon size={28} strokeWidth={2} style={{ color: ORANGE }} />
                  <h3 className="font-body font-semibold text-xl mt-6" style={{ color: TEXT }}>
                    {phase.title}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {phase.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: ORANGE, opacity: 0.5 }} />
                        <span className="font-body text-[15px]" style={{ color: MUTED, lineHeight: 1.5 }}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── DELIVERABLES SECTION ───────────────────────────────────────────────────
function DeliverablesSection() {
  const deliverables = [
    {
      icon: Play,
      number: '01',
      title: 'Brand Video (Final)',
      desc: '2-3 minute cinematic brand film. Fully color graded, mixed, and mastered. Broadcast-ready.',
    },
    {
      icon: Users,
      number: '02',
      title: 'Rough Cut Review',
      desc: 'Client reviews pacing, narrative, and structure before final production. Your feedback shapes the finish.',
    },
    {
      icon: Scissors,
      number: '03',
      title: 'Social Cuts',
      desc: '2-3 shorter edits optimized for LinkedIn, Instagram, and web. Vertical and horizontal crops.',
    },
    {
      icon: Zap,
      number: '04',
      title: 'All Project Files',
      desc: 'Final exports in multiple formats: 4K, 1080p, vertical crops. Everything you need for every platform.',
    },
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: WARM_BG }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] block text-center" style={{ color: ORANGE }}>
            Deliverables
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4 text-center"
            style={{ color: CREAM, letterSpacing: '-0.03em' }}>
            What You Get
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 md:mt-16">
          {deliverables.map((d, i) => {
            const Icon = d.icon
            return (
              <FadeIn key={d.title} delay={0.2 + i * 0.1}>
                <div
                  className="p-8 flex gap-6 transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${BORDER}`,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(232,93,38,0.3)'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = BORDER
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  }}
                >
                  <div className="flex-shrink-0">
                    <div className="font-headline font-extrabold text-3xl" style={{ color: ORANGE, opacity: 0.3 }}>
                      {d.number}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Icon size={18} strokeWidth={2} style={{ color: ORANGE }} />
                      <h3 className="font-body font-semibold text-lg" style={{ color: TEXT }}>
                        {d.title}
                      </h3>
                    </div>
                    <p className="font-body text-[15px]" style={{ color: MUTED, lineHeight: 1.5 }}>
                      {d.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── TIMELINE SECTION ───────────────────────────────────────────────────────
function TimelineSection() {
  const phases = [
    {
      dates: 'Mar 11 - Mar 24',
      title: 'Pre-Production',
      desc: 'Script lock, pre-vis edit, shot list, music direction',
      icon: Clapperboard,
    },
    {
      dates: 'Late March (TBD)',
      title: 'Production',
      desc: 'Sedona shoot + lab footage',
      icon: Film,
    },
    {
      dates: 'Shoot + 1 through Apr 7',
      title: 'Post-Production',
      desc: 'Edit, color, motion graphics, sound, mix',
      icon: Palette,
    },
    {
      dates: 'Apr 3 - 7',
      title: 'Client Review',
      desc: 'Rough cut delivered, feedback round',
      icon: Users,
    },
    {
      dates: 'April 10, 2026',
      title: 'Final Delivery',
      desc: 'Final video delivered in all formats',
      icon: CheckCircle2,
    },
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: CARD_BG }}>
      <div className="max-w-[1000px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] block text-center" style={{ color: ORANGE }}>
            Timeline
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4 text-center mb-12 md:mb-16"
            style={{ color: CREAM, letterSpacing: '-0.03em' }}>
            The Roadmap
          </h2>
        </FadeIn>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px" style={{ background: `${ORANGE}22` }} />

          <div className="space-y-8 md:space-y-10">
            {phases.map((phase, i) => {
              const Icon = phase.icon
              return (
                <FadeIn key={phase.title} delay={0.15 + i * 0.1}>
                  <div className="relative flex items-start gap-6 md:gap-8 pl-2">
                    {/* Dot */}
                    <div className="relative z-10 flex-shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center"
                      style={{ background: BG, border: `2px solid ${ORANGE}44` }}>
                      <Icon size={18} strokeWidth={2} style={{ color: ORANGE }} />
                    </div>

                    {/* Content */}
                    <div className="pt-1">
                      <div className="font-mono text-xs font-bold uppercase tracking-[0.15em]" style={{ color: ORANGE }}>
                        {phase.dates}
                      </div>
                      <h3 className="font-body font-semibold text-lg mt-1" style={{ color: TEXT }}>
                        {phase.title}
                      </h3>
                      <p className="font-body text-[15px] mt-1" style={{ color: MUTED, lineHeight: 1.5 }}>
                        {phase.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── INVESTMENT SECTION ─────────────────────────────────────────────────────
function InvestmentSection() {
  const lineItems = [
    { item: 'Pre-Production', detail: 'Script, pre-vis, shot list, planning', cost: '$1,200' },
    { item: 'Production', detail: 'Crew, equipment, Sedona shoot day', cost: '$3,500' },
    { item: 'Editing', detail: 'Full edit, color grading, motion graphics, music, sound design, final mix', cost: '$3,900' },
    { item: 'Social Cuts', detail: '2-3 shorter edits for LinkedIn, IG, web', cost: '$400' },
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[900px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] block text-center" style={{ color: ORANGE }}>
            Investment
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4 text-center mb-12 md:mb-16"
            style={{ color: CREAM, letterSpacing: '-0.03em' }}>
            Where the Budget Goes
          </h2>
        </FadeIn>

        {/* Price Table */}
        <FadeIn delay={0.2}>
          <div className="overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 md:px-8 py-4"
              style={{ background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${BORDER}` }}>
              <div className="col-span-5 md:col-span-4 font-body font-semibold text-xs uppercase tracking-[0.1em]" style={{ color: MUTED }}>
                Line Item
              </div>
              <div className="col-span-4 md:col-span-5 font-body font-semibold text-xs uppercase tracking-[0.1em] hidden md:block" style={{ color: MUTED }}>
                Details
              </div>
              <div className="col-span-7 md:col-span-3 font-body font-semibold text-xs uppercase tracking-[0.1em] text-right" style={{ color: MUTED }}>
                Cost
              </div>
            </div>

            {/* Rows */}
            {lineItems.map((row, i) => (
              <div
                key={row.item}
                className="grid grid-cols-12 gap-4 px-6 md:px-8 py-5 transition-colors duration-150"
                style={{
                  borderBottom: i < lineItems.length - 1 ? `1px solid ${BORDER}` : 'none',
                  background: 'transparent',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,93,38,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="col-span-5 md:col-span-4">
                  <div className="font-body font-semibold text-[15px]" style={{ color: TEXT }}>
                    {row.item}
                  </div>
                  <div className="font-body text-sm mt-1 md:hidden" style={{ color: MUTED }}>
                    {row.detail}
                  </div>
                </div>
                <div className="col-span-5 font-body text-[15px] hidden md:block" style={{ color: MUTED }}>
                  {row.detail}
                </div>
                <div className="col-span-7 md:col-span-3 font-body font-semibold text-[15px] text-right" style={{ color: TEXT }}>
                  {row.cost}
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="grid grid-cols-12 gap-4 px-6 md:px-8 py-6"
              style={{ background: 'rgba(232,93,38,0.06)', borderTop: `2px solid ${ORANGE}44` }}>
              <div className="col-span-5 md:col-span-9 font-headline font-extrabold text-lg uppercase tracking-tight" style={{ color: CREAM }}>
                Total
              </div>
              <div className="col-span-7 md:col-span-3 font-headline font-black text-2xl text-right" style={{ color: ORANGE }}>
                $9,000
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Payment Terms */}
        <FadeIn delay={0.3}>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center items-center">
            <div className="flex items-center gap-3 px-6 py-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <DollarSign size={20} style={{ color: ORANGE }} />
              <div>
                <div className="font-body font-semibold text-sm" style={{ color: TEXT }}>50% Upfront</div>
                <div className="font-body text-sm" style={{ color: MUTED }}>$4,500 to begin pre-production</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <CheckCircle2 size={20} style={{ color: ORANGE }} />
              <div>
                <div className="font-body font-semibold text-sm" style={{ color: TEXT }}>50% on Delivery</div>
                <div className="font-body text-sm" style={{ color: MUTED }}>$4,500 on final video delivery</div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── WHY AOM SECTION ────────────────────────────────────────────────────────
function WhyAOMSection() {
  const reasons = [
    {
      icon: Sparkles,
      title: 'Narrative-First Approach',
      desc: "We don't shoot first and figure it out later. The story is locked before the camera rolls.",
    },
    {
      icon: Shield,
      title: 'Full-Service Production',
      desc: 'One team handles everything from script to final delivery. No handoffs, no miscommunication.',
    },
    {
      icon: Clock,
      title: 'Premium Quality, Efficient Process',
      desc: 'Cinematic-grade output without the bloated timelines and budgets of larger production houses.',
    },
    {
      icon: Zap,
      title: 'We Get the Technology',
      desc: "ISA's ambient energy capture is a complex concept. We know how to make it clear, compelling, and credible on screen.",
    },
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: WARM_BG }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div>
            <FadeIn>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
                Why AOM
              </span>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4"
                style={{ color: CREAM, letterSpacing: '-0.03em' }}>
                Small Team.<br />Cinema-Grade.<br />No BS.
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="font-body text-base md:text-lg mt-6 max-w-[45ch]" style={{ color: MUTED, lineHeight: 1.6 }}>
                AOM has produced brand films, documentaries, and corporate video for companies across industries. We understand how to translate complex technology into a story that audiences connect with.
              </p>
            </FadeIn>
          </div>

          {/* Right: Reason cards */}
          <div className="space-y-4">
            {reasons.map((r, i) => {
              const Icon = r.icon
              return (
                <FadeIn key={r.title} delay={0.25 + i * 0.1}>
                  <div
                    className="p-6 flex gap-5 transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${BORDER}`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(232,93,38,0.3)'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = BORDER
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    }}
                  >
                    <Icon size={22} strokeWidth={2} className="flex-shrink-0 mt-0.5" style={{ color: ORANGE }} />
                    <div>
                      <h3 className="font-body font-semibold text-[17px]" style={{ color: TEXT }}>
                        {r.title}
                      </h3>
                      <p className="font-body text-[15px] mt-1.5" style={{ color: MUTED, lineHeight: 1.5 }}>
                        {r.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── NEXT STEPS / CTA SECTION ───────────────────────────────────────────────
function CTASection() {
  const steps = [
    'Approve this proposal',
    'Pre-vis edit begins immediately',
    'Lock the Sedona shoot date',
    'Final delivery: April 10, 2026',
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[900px] mx-auto px-6 md:px-12 text-center">
        <FadeIn>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Next Steps
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-black uppercase text-4xl md:text-[56px] leading-[0.95] tracking-tight mt-4"
            style={{ color: CREAM, letterSpacing: '-0.03em' }}>
            Let's Build<br />Something.
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 mt-10">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                <span className="font-headline font-extrabold text-lg" style={{ color: ORANGE }}>{i + 1}</span>
                <span className="font-body text-sm" style={{ color: TEXT }}>{step}</span>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Divider */}
        <FadeIn delay={0.3}>
          <div className="mx-auto my-12 w-20 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </FadeIn>

        {/* Contact Info */}
        <FadeIn delay={0.35}>
          <div className="flex flex-col items-center gap-4">
            <a
              href={`mailto:${EMAIL_ADDR}?subject=ISA%20Energy%20Proposal%20-%20Let's%20Go`}
              className="inline-flex items-center gap-3 px-10 py-4 font-headline font-extrabold text-base uppercase tracking-wider transition-all duration-200"
              style={{
                background: ORANGE,
                color: CREAM,
                boxShadow: '0 4px 16px rgba(232,93,38,0.3)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = ORANGE_HOVER
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(232,93,38,0.5)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = ORANGE
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(232,93,38,0.3)'
              }}
            >
              <Mail size={18} />
              Approve Proposal
            </a>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 mt-6">
              <a href={PHONE_HREF} className="flex items-center gap-2 font-body font-semibold text-base transition-colors hover:text-white"
                style={{ color: TEXT }}>
                <Phone size={16} style={{ color: ORANGE }} />
                {PHONE_NUM}
              </a>
              <a href={`mailto:${EMAIL_ADDR}`} className="flex items-center gap-2 font-body font-semibold text-base transition-colors hover:text-white"
                style={{ color: TEXT }}>
                <Mail size={16} style={{ color: ORANGE }} />
                {EMAIL_ADDR}
              </a>
            </div>

            <div className="flex items-center gap-2 mt-2 font-body text-sm" style={{ color: MUTED }}>
              <MapPin size={14} style={{ color: ORANGE }} />
              Phoenix, AZ
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── FOOTER ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-10 text-center" style={{ background: BG, borderTop: `1px solid ${BORDER}` }}>
      <div className="font-headline font-black text-lg tracking-tight" style={{ color: CREAM, opacity: 0.4 }}>AOM</div>
      <p className="font-body text-xs mt-3" style={{ color: MUTED }}>
        We Make Companies Impossible to Ignore.
      </p>
      <p className="font-body text-xs mt-2" style={{ color: MUTED, opacity: 0.5 }}>
        &copy; {new Date().getFullYear()} Ahead of Market. All rights reserved.
      </p>
    </footer>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function ISAProposal() {
  return (
    <div className="min-h-screen no-scrollbar" style={{ background: BG, color: TEXT }}>
      <NavBar />
      <HeroSection />
      <OverviewSection />
      <ScopeSection />
      <DeliverablesSection />
      <TimelineSection />
      <InvestmentSection />
      <WhyAOMSection />
      <CTASection />
      <Footer />
    </div>
  )
}
