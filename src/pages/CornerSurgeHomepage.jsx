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
    document.title = 'corner — your business just got an upgrade'

    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.content = 'corner — your business just got an upgrade'

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

// --- SECTION WRAPPER with scroll animation ---
function Section({ children, id, className = '', bgColor = SURGE.charcoal }) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      style={{ backgroundColor: bgColor, display: 'block', width: '100%' }}
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div style={{ width: '100%', display: 'block' }}>
        {children}
      </div>
    </motion.section>
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

// --- PROBLEM SECTION ---
function ProblemSection() {
  const problems = [
    {
      title: "You're drowning in everything except the actual work.",
      body: 'Scheduling. Follow-ups. Research. Admin. Email. You spend 15–20 hours a week on busywork. Leads fall through. Clients get impatient. This isn\'t scaling—it\'s surviving.',
      Icon: Clock,
      accentColor: SURGE.purple,
    },
    {
      title: 'Tools don\'t solve it. They multiply the problem.',
      body: 'Zapier. ChatGPT. Slack. Airtable. Each tool solves one tiny piece and creates three new ones. More screens to check. More contexts to switch. More things to manage.',
      Icon: AlertCircle,
      accentColor: SURGE.cyan,
    },
    {
      title: 'Hiring is a trap you\'re not ready for.',
      body: 'A part-time office manager is $30–40k a year. You\'re not ready to add a salary, benefits, and management overhead. But you need help now. You\'re stuck.',
      Icon: Briefcase,
      accentColor: '#a78bfa',
    },
  ]

  return (
    <Section id="problem" bgColor={SURGE.charcoal} className="py-16 sm:py-24 px-6 relative overflow-hidden">
      {/* Atmospheric background — stronger visibility */}
      <div className="absolute inset-0 z-0" style={{ opacity: 0.12 }}>
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 20% 50%, ${SURGE.purple}, transparent 70%), radial-gradient(circle at 80% 80%, ${SURGE.cyan}, transparent 60%)`,
          }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <h2
          className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          style={{
            background: `linear-gradient(135deg, ${SURGE.white}, ${SURGE.cyan})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          You're capable. You're just drowning.
        </h2>

        <p
          className="text-lg md:text-xl leading-relaxed mb-16"
          style={{ color: '#b0b0b0', maxWidth: '600px' }}
        >
          Corner exists because the best operators in the world are being limited by the time they spend on everything except their actual work.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((problem, i) => (
            <div
              key={i}
              className="relative group"
            >
              {/* Gradient background glow on hover */}
              <div
                className="absolute inset-0 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(135deg, ${problem.accentColor}, transparent)`,
                }}
              />

              {/* Card with depth */}
              <div
                className="relative p-8 sm:p-10 rounded-2xl overflow-hidden transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-1"
                style={{
                  backgroundColor: '#0f0f0f',
                  borderTop: `2px solid ${problem.accentColor}`,
                  boxShadow: `0 4px 20px rgba(0, 0, 0, 0.4)`,
                }}
              >
                {/* Gradient accent corner */}
                <div
                  className="absolute top-0 right-0 w-20 h-20 opacity-10"
                  style={{
                    background: `linear-gradient(135deg, ${problem.accentColor}, transparent)`,
                  }}
                />

                <div className="relative z-10">
                  <div className="mb-4 p-4 inline-flex rounded-lg" style={{ backgroundColor: `${problem.accentColor}44` }}>
                    <problem.Icon size={28} style={{ color: problem.accentColor }} strokeWidth={1.5} />
                  </div>
                  <h3
                    className="text-xl sm:text-2xl font-bold mb-4 leading-tight"
                    style={{ color: SURGE.white }}
                  >
                    {problem.title}
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#a8a8a8' }}>{problem.body}</p>
                </div>
              </div>
            </div>
          ))}
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

// --- PROMISE SECTION ---
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
    <Section id="promise" bgColor={SURGE.charcoal} className="py-16 sm:py-32 px-6">
      <div className="max-w-6xl mx-auto">
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
          className="text-lg md:text-xl leading-relaxed mb-20"
          style={{ color: '#c0c0c0', maxWidth: '600px' }}
        >
          Managed agents run your entire business from one system. You open your inbox in the morning. The work is already moving.
        </p>

        {/* PRODUCT MOCKUP — THE HERO OF THIS SECTION */}
        <ProductMockup />

        {/* CAPABILITIES GRID */}
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
    </Section>
  )
}


// --- HOW IT WORKS SECTION ---
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
    <Section bgColor={SURGE.charcoal} className="py-16 sm:py-32 px-6 relative overflow-hidden">
      {/* Atmospheric glow — stronger visibility */}
      <div className="absolute inset-0 z-0" style={{ opacity: 0.1 }}>
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${SURGE.purple}, transparent 70%)`,
          }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <h2
          className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          style={{
            background: `linear-gradient(135deg, ${SURGE.white}, ${SURGE.purple})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Three steps to your upgraded business.
        </h2>

        <p
          className="text-lg md:text-xl leading-relaxed mb-16"
          style={{ color: '#b0b0b0', maxWidth: '600px' }}
        >
          Get started in three simple steps. From discovery to execution in days, not months.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection line behind cards (desktop only) — stronger visibility */}
          <div
            className="absolute top-24 left-0 right-0 h-1 hidden md:block"
            style={{
              background: `linear-gradient(90deg, ${SURGE.purple}88 0%, ${SURGE.cyan}88 50%, ${SURGE.purple}88 100%)`,
            }}
          />

          {steps.map((step, i) => (
            <div
              key={i}
              className="relative group"
            >
              {/* Gradient card border on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${SURGE.purple}, ${SURGE.cyan})`,
                  padding: '1px',
                }}
              />

              {/* Card content */}
              <div
                className="relative p-8 sm:p-10 rounded-2xl transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-1 h-full"
                style={{
                  backgroundColor: '#0f0f0f',
                  border: '1px solid #333',
                }}
              >
                {/* Step number circle — larger and more prominent */}
                <div className="mb-6">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${SURGE.purple}, ${SURGE.cyan})`,
                      color: SURGE.white,
                      boxShadow: `0 0 30px rgba(124, 58, 237, 0.4)`,
                    }}
                  >
                    {step.num}
                  </div>
                </div>

                {/* Icon — larger and more prominent */}
                <div className="mb-6 p-4 inline-flex rounded-lg" style={{ backgroundColor: 'rgba(124, 58, 237, 0.2)' }}>
                  <step.Icon size={28} style={{ color: SURGE.purple }} strokeWidth={1.5} />
                </div>

                <h3
                  className="text-xl sm:text-2xl font-bold mb-3"
                  style={{ color: SURGE.white }}
                >
                  {step.title}
                </h3>
                <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#a8a8a8' }}>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// --- FINAL CTA SECTION ---
function FinalCtaSection() {
  return (
    <Section id="cta" bgColor={SURGE.charcoal} className="py-24 sm:py-40 px-6 relative overflow-hidden">
      {/* Full-bleed gradient glow */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `radial-gradient(ellipse 120% 100% at 50% 100%, ${SURGE.purple}15 0%, transparent 70%)`,
        }}
      />

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', border: `1px solid ${SURGE.purple}33` }}>
          <span className="text-sm font-medium" style={{ color: SURGE.cyan }}>Limited availability</span>
        </div>

        <h2
          className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6"
          style={{
            background: `linear-gradient(135deg, ${SURGE.purple}, ${SURGE.cyan})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Ready to operate like a team of ten?
        </h2>

        <p
          className="text-lg sm:text-xl md:text-2xl leading-relaxed mb-10"
          style={{ color: '#b0b0b0' }}
        >
          Book a 30-minute discovery call. We'll map your operations, show you exactly how much time you'll save, and get your agents live.
        </p>

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
              border: `2px solid #444`,
            }}
          >
            Learn more
          </a>
        </div>

        <p
          className="text-xs sm:text-sm mt-8"
          style={{ color: '#808080' }}
        >
          No credit card. No commitment. Book now.
        </p>
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
          {' — '}AI agents for ambitious operators
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
