import React, { useRef, useState, useEffect, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronRight, ArrowUpRight, Zap, Users, FileText, AlertCircle, Database, Settings, BarChart3, Shield, Lightbulb, Clock, Target, Briefcase } from 'lucide-react'

const CornerAsciiHeroPoc = lazy(() => import('./CornerAsciiHeroPoc'))

// --- FAVICON & META SWAP ON MOUNT ---
const useCornerPageMeta = () => {
  useEffect(() => {
    // Save original favicon and metas
    const originalFavicon = document.querySelector('link[rel="icon"]')?.href || ''
    const originalTitle = document.title
    const originalOgTitle = document.querySelector('meta[property="og:title"]')?.content || ''
    const originalOgDesc = document.querySelector('meta[property="og:description"]')?.content || ''

    // Swap to Corner branding
    const faviconLink = document.querySelector('link[rel="icon"]')
    if (faviconLink) {
      faviconLink.href = '/brand/corner-c-mark.svg'
    }
 document.title = 'corner, your business just got an upgrade'

    const ogTitle = document.querySelector('meta[property="og:title"]')
 if (ogTitle) ogTitle.content = 'corner, your business just got an upgrade'

    const ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc) ogDesc.content = 'Managed AI agents that run your business in one organized system.'

    // Restore on unmount
    return () => {
      if (faviconLink) faviconLink.href = originalFavicon
      document.title = originalTitle
      if (ogTitle) ogTitle.content = originalOgTitle
      if (ogDesc) ogDesc.content = originalOgDesc
    }
  }, [])
}


/**
 * Corner SURGE Homepage — Full Customer-First Brand Experience
 *
 * BRAND SPECS (SURGE):
 * - Font: Outfit Bold (headlines + body)
 * - Colors: Charcoal #2d2d2d, Purple #7c3aed, Cyan #06b6d4, Off-white #fafafa
 * - Gradient: linear-gradient(135deg, #7c3aed, #06b6d4)
 * - Type: lowercase "corner" wordmark, rounded, motion-forward
 * - Mood: Bold & empowering, energetic, velocity-forward
 *
 * NARRATIVE STRUCTURE:
 * 1. Hero (ASCII-motion powered)
 * 2. The Problem (their world)
 * 3. The Promise (managed agents in one system)
 * 4. What You Get (concrete deliverables)
 * 5. How It Works (simple flow)
 * 6. Final CTA → book the intro call
 *
 * ANIMATION:
 * - Scroll-driven section reveals (fade + stagger)
 * - ASCII motion is the signature (in hero)
 * - Subtle scroll parallax on accent elements
 * - CTAs have gradient glow on hover
 */

const SURGE = {
  purple: '#7c3aed',
  cyan: '#06b6d4',
  charcoal: '#2d2d2d',
  white: '#fafafa',
  gradient: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
}

// --- ANIMATION VARIANTS ---
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: custom * 0.1,
      duration: 0.6,
      ease: 'easeOut',
    },
  }),
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
}

// --- SECTION WRAPPER (no animation gates — all content visible immediately) ---
function Section({ children, id, className = '', bgColor = SURGE.charcoal }) {
  return (
    <section
      id={id}
      className={className}
      style={{ backgroundColor: bgColor, display: 'block', width: '100%' }}
    >
      {children}
    </section>
  )
}

// --- NAV ---
function CornerSurgeNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 100)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-sm border-b border-white/10'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Wordmark */}
        <a
          href="/corner"
          className="font-bold text-xl tracking-tight"
          style={{ color: SURGE.white }}
        >
          <span style={{ background: SURGE.gradient, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            corner
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-12">
          <a href="#problem" className="text-sm font-medium transition-colors hover:text-white" style={{ color: '#b0b0b0' }}>
            The Problem
          </a>
          <a href="#promise" className="text-sm font-medium transition-colors hover:text-white" style={{ color: '#b0b0b0' }}>
            How It Works
          </a>
          <a href="#cta" className="text-sm font-medium transition-colors hover:text-white" style={{ color: '#b0b0b0' }}>
            Get Started
          </a>
        </div>

        {/* CTA */}
        <a
          href="/corner/book"
          className="px-6 py-2.5 font-bold text-sm rounded-lg transition-all duration-200 text-white hover:shadow-lg"
          style={{
            background: SURGE.gradient,
          }}
        >
          Book a call
        </a>
      </div>
    </nav>
  )
}

// --- HERO SECTION (with ASCII component) ---
function HeroSection() {
  return (
    <div className="relative overflow-hidden" style={{ height: '120vh', backgroundColor: SURGE.charcoal }}>
      {/* ASCII Backdrop */}
      <Suspense fallback={<div className="w-full h-full" />}>
        <div className="absolute inset-0 z-0">
          <CornerAsciiHeroPoc />
        </div>
      </Suspense>

      {/* Content — centered flex layout */}
      <div
        className="relative z-10 w-full h-full flex flex-col items-center justify-center px-6"
      >
        {/* Readability scrim — radial: darker behind the text block, fades out so the ASCII field stays vivid at the edges */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 5,
            background:
              'radial-gradient(ellipse 62% 52% at 50% 50%, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,0.12) 100%)',
          }}
        />

        <div
          className="text-center max-w-3xl relative z-20"
        >
          <h1
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 sm:mb-6"
            style={{ color: SURGE.white }}
          >
            Your business just got an upgrade.
          </h1>

          <p
            className="text-base sm:text-lg md:text-xl leading-relaxed mb-8 sm:mb-10"
            style={{ color: '#e4e4e7' }}
          >
            Managed AI agents that run your business in one organized system.
            You direct. They execute. While you sleep.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <a
              href="/corner/book"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 font-bold text-base sm:text-lg rounded-lg transition-all duration-200 text-white hover:shadow-2xl flex items-center justify-center gap-2"
              style={{
                background: SURGE.gradient,
              }}
            >
              Book your intro call
              <ArrowUpRight size={18} />
            </a>
            <a
              href="#problem"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 font-bold text-base sm:text-lg rounded-lg transition-all duration-200"
              style={{
                color: SURGE.white,
                borderColor: '#444',
                border: '2px solid',
              }}
            >
              Learn more
            </a>
          </div>

          <p
            className="text-xs sm:text-sm mt-4 sm:mt-6"
            style={{ color: '#a1a1aa' }}
          >
            30-minute discovery call. No commitment.
          </p>
        </div>
      </div>
    </div>
  )
}

// --- FRAGMENTATION DIAGRAM (scattered icons showing tool overload) ---
function FragmentationDiagram() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const icons = [
    { Icon: Users, delay: 0 },
    { Icon: FileText, delay: 0.1 },
    { Icon: AlertCircle, delay: 0.2 },
    { Icon: Settings, delay: 0.3 },
    { Icon: Database, delay: 0.4 },
    { Icon: Clock, delay: 0.5 },
  ]

  return (
    <div className="relative w-full h-64 sm:h-80 md:h-96">
      {/* Scattered icon positions — asymmetric arrangement */}
      {icons.map((item, i) => {
        const delay = item.delay
        const isVisible = mounted

        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${(i % 2) * 60 + 10}%`,
              top: `${Math.floor(i / 2) * 30 + 10}%`,
              opacity: isVisible ? 0.5 : 0,
              transition: `opacity 0.6s ease-out ${delay}s`,
            }}
          >
            <item.Icon size={40} style={{ color: SURGE.charcoal, opacity: 0.5 }} strokeWidth={1.5} />
          </div>
        )
      })}

      {/* Subtle connecting lines to show chaos */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.15 }}>
        <line x1="20%" y1="20%" x2="80%" y2="50%" stroke={SURGE.charcoal} strokeWidth="1" />
        <line x1="30%" y1="60%" x2="70%" y2="30%" stroke={SURGE.charcoal} strokeWidth="1" />
        <line x1="50%" y1="10%" x2="60%" y2="80%" stroke={SURGE.charcoal} strokeWidth="1" />
      </svg>
    </div>
  )
}

// --- PROBLEM SECTION (OFF-WHITE BACKGROUND) ---
function ProblemSection() {
  return (
    <Section id="problem" bgColor={SURGE.white} className="py-16 sm:py-32 px-6 relative overflow-hidden">
      {/* Subtle background divider line */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: '#e8e8e8' }} />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* LEFT: Headline + Copy */}
          <div>
            <h2
              className="text-4xl md:text-5xl lg:text-5xl font-bold leading-tight mb-6"
              style={{ color: SURGE.charcoal }}
            >
              You're capable. You're drowning.
            </h2>

            <p
              className="text-lg md:text-xl leading-relaxed mb-8"
              style={{ color: '#555', maxWidth: '50ch' }}
            >
              The best operators lose 15–20 hours every week to busywork. Scheduling. Follow-ups. Email. Tools promised to solve it. Instead, they multiplied the problem.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <h3 className="font-bold text-lg" style={{ color: SURGE.purple }}>Tools don't solve it</h3>
                <p style={{ color: '#666', fontSize: '15px', marginTop: '4px' }}>
                  Zapier. ChatGPT. Slack. Airtable. More screens. More context. More chaos.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: SURGE.cyan }}>Hiring isn't ready</h3>
                <p style={{ color: '#666', fontSize: '15px', marginTop: '4px' }}>
                  $30–40k/year for an office manager. Salary. Benefits. You're not ready. But you need help now.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Fragmentation Diagram */}
          <div>
            <FragmentationDiagram />
          </div>
        </div>
      </div>
    </Section>
  )
}

// --- PRODUCT MOCKUP COMPONENT (Reusable) ---
function ProductMockup() {
  return (
    <div className="relative mx-auto max-w-5xl mb-20">
      {/* Glow backdrop — maximum prominence */}
      <div
        className="absolute inset-0 rounded-3xl blur-3xl opacity-80"
        style={{
          background: `linear-gradient(135deg, ${SURGE.purple}, ${SURGE.cyan})`,
          transform: 'translateY(30px)',
        }}
      />

      {/* Browser frame — stronger border and shadow */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl border-2"
        style={{ backgroundColor: '#000', borderColor: SURGE.purple }}
      >
        {/* Browser chrome */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: '#111', borderBottom: '1px solid #333' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SURGE.purple }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SURGE.cyan }} />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#555' }} />
          </div>
          <div className="text-xs font-mono" style={{ color: '#888' }}>aheadofmarket.com/dashboard</div>
          <div className="w-8" />
        </div>

        {/* Dashboard content */}
        <div
          className="p-10 sm:p-16"
          style={{ backgroundColor: '#0a0a0a', minHeight: '700px' }}
        >
          {/* Header */}
          <div className="mb-12">
            <div className="text-sm font-mono uppercase tracking-widest" style={{ color: '#666', marginBottom: '0.5rem' }}>
              GOOD MORNING
            </div>
            <div className="text-3xl sm:text-4xl font-bold" style={{ color: SURGE.white }}>
              You've got work waiting
            </div>
          </div>

          {/* Three-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Agents panel */}
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: '#666' }}>
                ACTIVE AGENTS
              </div>
              {['Your EA', 'Elon', 'Studio'].map((name, i) => (
                <div
                  key={i}
                  className="mb-3 p-3 rounded-lg transition-colors"
                  style={{
                    backgroundColor: i === 0 ? 'rgba(124, 58, 237, 0.15)' : '#1a1a1a',
                    borderLeft: i === 0 ? `3px solid ${SURGE.purple}` : '3px solid transparent',
                  }}
                >
                  <div className="font-medium" style={{ color: SURGE.white, fontSize: '14px' }}>
                    {name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#666' }}>
                    {i === 0 ? 'researching' : 'processing'}
                  </div>
                </div>
              ))}
            </div>

            {/* Middle: Active tasks */}
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: '#666' }}>
                ACTIVE TASKS
              </div>
              {[
                'Researching competitor pricing',
                'Drafting 3 follow-up emails',
                'Organizing Q2 project files',
              ].map((task, i) => (
                <div
                  key={i}
                  className="mb-3 p-3 rounded-lg"
                  style={{
                    backgroundColor: '#1a1a1a',
                    borderLeft: `3px solid ${SURGE.cyan}`,
                  }}
                >
                  <div className="font-medium" style={{ color: SURGE.white, fontSize: '13px' }}>
                    {task}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#666' }}>
                    in progress
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Stats snapshot */}
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest mb-4" style={{ color: '#666' }}>
                TODAY'S SNAPSHOT
              </div>
              <div
                className="p-4 rounded-lg mb-4"
                style={{
                  backgroundColor: 'rgba(124, 58, 237, 0.15)',
                  borderLeft: `3px solid ${SURGE.purple}`,
                }}
              >
                <div className="text-xs" style={{ color: '#888' }}>Tasks Completed</div>
                <div className="text-2xl font-bold mt-1" style={{ color: SURGE.purple }}>
                  12
                </div>
              </div>
              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  borderLeft: `3px solid ${SURGE.cyan}`,
                }}
              >
                <div className="text-xs" style={{ color: '#888' }}>Time Saved Today</div>
                <div className="text-2xl font-bold mt-1" style={{ color: SURGE.cyan }}>
                  6.5h
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Callout with stronger emphasis */}
      <div className="mt-10 text-center">
        <p style={{ color: '#aaa', fontSize: '15px', fontWeight: '500' }}>
          Real-time agent status, active work, and progress tracking. One place. Complete visibility.
        </p>
      </div>
    </div>
  )
}

// --- PROMISE SECTION (with gradient overlay + enlarged mockup) ---
function PromiseSection() {
  const features = [
    {
      name: 'Research',
      desc: 'Agents dig into your industry, competitors, and market trends without being asked.',
      Icon: Database,
    },
    {
      name: 'Follow-ups',
      desc: 'No more missed leads. Agents track conversations and send timely, personalized follow-ups.',
      Icon: Target,
    },
    {
      name: 'Projects',
      desc: 'Every task has a home. Agents organize work into projects you can see at a glance.',
      Icon: FileText,
    },
    {
      name: 'Busywork',
      desc: 'Scheduling, note-taking, data entry. Handled. While you sleep.',
      Icon: Check,
    },
    {
      name: 'Quality',
      desc: "One agent checks everyone else's work. No bad work ships under your name.",
      Icon: Shield,
    },
    {
      name: 'You stay in control',
      desc: 'You direct. Agents execute. One organized system. No learning curves, no context switching.',
      Icon: Lightbulb,
    },
  ]

  return (
    <Section id="promise" bgColor={SURGE.charcoal} className="py-16 sm:py-32 px-6 relative overflow-hidden">
      {/* Gradient overlay: purple-to-cyan blend at top, fades to charcoal bottom */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `linear-gradient(180deg, rgba(124, 58, 237, 0.15) 0%, rgba(6, 182, 212, 0.1) 30%, rgba(45, 45, 45, 0) 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Headline + Intro Copy (LEFT SIDE, SMALL CONTAINER) */}
        <div className="mb-12 max-w-2xl">
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            style={{
              background: `linear-gradient(135deg, ${SURGE.white}, ${SURGE.cyan})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            One person. The output of ten.
          </h2>

          <p
            className="text-lg md:text-xl leading-relaxed"
            style={{ color: '#c0c0c0', maxWidth: '45ch' }}
          >
            Managed agents run your entire business from one system. You open your inbox in the morning. The work is already moving.
          </p>
        </div>

        {/* PRODUCT MOCKUP — ENLARGED TO DOMINATE 60-75% OF SECTION */}
        <ProductMockup />

        {/* CAPABILITIES GRID (BELOW MOCKUP) */}
        <div className="mt-24">
          <h3
            className="text-2xl md:text-3xl font-bold mb-12"
            style={{ color: SURGE.white, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '18px', fontWeight: '700' }}
          >
            What they handle for you
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="relative group"
              >
                {/* Gradient border effect on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${SURGE.purple}, ${SURGE.cyan})`,
                    padding: '1px',
                  }}
                />

                {/* Card content */}
                <div
                  className="relative p-8 sm:p-10 rounded-2xl transition-all duration-300 group-hover:shadow-2xl h-full"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #444',
                  }}
                >
                  <div className="mb-6 p-4 inline-flex rounded-lg" style={{ backgroundColor: 'rgba(124, 58, 237, 0.2)' }}>
                    <feature.Icon size={28} style={{ color: SURGE.purple }} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: SURGE.white }}>
                    {feature.name}
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#a8a8a8' }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}


// --- HOW IT WORKS SECTION (VERTICAL TIMELINE) ---
function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Discovery Call',
      body: '30 minutes. We map your operations, find where time is lost, and identify which agents save you the most.',
      Icon: Users,
    },
    {
      num: '02',
      title: 'We Launch Your Team',
      body: 'Your agents go live in the Corner system. They learn your business, your voice, your standards.',
      Icon: Zap,
    },
    {
      num: '03',
      title: 'You Direct. They Execute.',
      body: 'Open your inbox. Assign work. Watch it get done. Agents coordinate, hand off, check each other.',
      Icon: BarChart3,
    },
  ]

  return (
    <Section bgColor={SURGE.white} className="py-16 sm:py-32 px-6 relative overflow-hidden">
      {/* Off-white background — contrast from Promise section dark */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: '#e8e8e8' }} />

      <div className="max-w-4xl mx-auto relative z-10">
        <h2
          className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-center"
          style={{
            color: SURGE.charcoal,
          }}
        >
          How it works.
        </h2>

        <p
          className="text-lg md:text-xl leading-relaxed mb-16 text-center"
          style={{ color: '#666', maxWidth: '60ch' }}
        >
          Three simple steps. From discovery to your agents live and working.
        </p>

        {/* DARK CARD CONTAINER FOR TIMELINE — centered on light ground */}
        <div
          className="max-w-2xl mx-auto rounded-2xl p-12 sm:p-16"
          style={{
            backgroundColor: SURGE.charcoal,
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}
        >
          {/* VERTICAL TIMELINE — CENTERED INSIDE DARK CARD */}
          <div className="relative">
            {/* Center connecting line (desktop only) */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-1 hidden md:block"
              style={{
                background: `linear-gradient(180deg, ${SURGE.purple}66 0%, ${SURGE.cyan}66 50%, ${SURGE.purple}66 100%)`,
                transform: 'translateX(-50%)',
              }}
            />

            {/* Timeline steps — CENTERED LAYOUT (not left-right alternating) */}
            <div className="space-y-12 md:space-y-20">
              {steps.map((step, i) => (
                <div key={i} className="relative">
                  {/* Centered layout on all breakpoints */}
                  <div className="flex flex-col items-center gap-4 md:gap-8">
                    {/* Center-aligned: number + icon */}
                    <div className="flex flex-col items-center gap-4">
                      {/* Step circle with gradient */}
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl shadow-xl flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${SURGE.purple}, ${SURGE.cyan})`,
                          color: SURGE.white,
                          boxShadow: `0 0 40px rgba(124, 58, 237, 0.5)`,
                        }}
                      >
                        {step.num}
                      </div>

                      {/* Icon below circle */}
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(124, 58, 237, 0.15)' }}>
                        <step.Icon size={32} style={{ color: SURGE.cyan }} strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Text content — centered below */}
                    <div className="text-center">
                      <h3
                        className="text-2xl md:text-3xl font-bold mb-3"
                        style={{ color: SURGE.white }}
                      >
                        {step.title}
                      </h3>
                      <p className="text-base md:text-lg leading-relaxed" style={{ color: '#a8a8a8', maxWidth: '45ch' }}>
                        {step.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

// --- FINAL CTA SECTION (DARK CHARCOAL) ---
function FinalCtaSection() {
  return (
    <Section id="cta" bgColor={SURGE.charcoal} className="py-24 sm:py-40 px-6 relative overflow-hidden">
      {/* Subtle background accent on dark ground */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `radial-gradient(ellipse 120% 100% at 50% 100%, ${SURGE.cyan}08 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* CENTERED CTA CONTAINER ON DARK BACKGROUND */}
        <div
          className="text-center"
        >
        {/* Bold Stat in Purple */}
        <div className="mb-8">
          <div
            className="text-5xl md:text-6xl font-bold"
            style={{ color: SURGE.purple }}
          >
            3x faster
          </div>
          <p style={{ color: '#b8b8b8', fontSize: '16px', marginTop: '4px' }}>
            Get more done in less time
          </p>
        </div>

        {/* Headline */}
        <h2
          className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6"
          style={{ color: SURGE.white }}
        >
          Ready to operate like a team of ten?
        </h2>

        {/* Supporting Copy */}
        <p
          className="text-base sm:text-lg md:text-xl leading-relaxed mb-12"
          style={{ color: '#a8a8a8', maxWidth: '55ch', margin: '0 auto 48px' }}
        >
          Book a 30-minute discovery call. We'll map your operations, show you exactly how much time you'll save, and get your agents live.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <a
            href="/corner/book"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-4 sm:py-5 font-bold text-lg rounded-lg transition-all duration-200 text-white hover:shadow-2xl hover:-translate-y-1"
            style={{
              background: SURGE.gradient,
            }}
          >
            Book your intro call
            <ArrowUpRight size={20} />
          </a>
          <a
            href="#promise"
            className="w-full sm:w-auto px-8 py-4 font-bold text-lg rounded-lg transition-all duration-200"
            style={{
              color: SURGE.white,
              borderColor: '#555',
              border: '2px solid',
            }}
          >
            Learn more
          </a>
        </div>

        {/* Trust Copy */}
        <p
          className="text-xs sm:text-sm"
          style={{ color: '#888' }}
        >
          No credit card. No commitment. Book now.
        </p>
      </div>
      </div>
    </Section>
  )
}

// --- FOOTER ---
function CornerFooter() {
  return (
    <footer className="py-8 sm:py-12 px-6 border-t-2" style={{ backgroundColor: SURGE.charcoal, borderColor: '#333' }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div style={{ color: '#b0b0b0' }} className="text-sm md:text-base text-center md:text-left">
          <span style={{ background: SURGE.gradient, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="font-bold">
            corner
          </span>
 {'·'}AI agents for ambitious operators
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <a href="#" style={{ color: '#b0b0b0' }} className="text-sm md:text-base hover:text-white transition-colors">
            Privacy
          </a>
          <a href="#" style={{ color: '#b0b0b0' }} className="text-sm md:text-base hover:text-white transition-colors">
            Terms
          </a>
          <a href="#" style={{ color: '#b0b0b0' }} className="text-sm md:text-base hover:text-white transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}

// --- MAIN COMPONENT ---
export default function CornerSurgeHomepage() {
  useCornerPageMeta()

  return (
    <div style={{ backgroundColor: SURGE.charcoal, color: SURGE.white }}>
      <CornerSurgeNav />
      <HeroSection />
      <ProblemSection />
      <PromiseSection />
      <HowItWorksSection />
      <FinalCtaSection />
      <CornerFooter />
    </div>
  )
}