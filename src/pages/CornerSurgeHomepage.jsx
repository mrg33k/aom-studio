import React, { useRef, useState, useEffect, lazy, Suspense } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { Check, ChevronRight, ArrowUpRight } from 'lucide-react'

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

// --- SECTION WRAPPER ---
function Section({ children, id, className = '', bgColor = SURGE.charcoal }) {
  const ref = useRef(null)

  return (
    <section
      ref={ref}
      id={id}
      className={className}
      style={{ backgroundColor: bgColor, display: 'block', width: '100%' }}
    >
      <div style={{ width: '100%', display: 'block' }}>
        {children}
      </div>
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

// --- PROBLEM SECTION ---
function ProblemSection() {
  const problems = [
    {
      title: "You're drowning in everything except the actual work.",
      body: 'Scheduling. Follow-ups. Research. Admin. Email. You spend 15–20 hours a week on busywork. Leads fall through. Clients get impatient. This isn\'t scaling—it\'s surviving.',
      icon: '⏰',
      accentColor: '#ff6b35',
    },
    {
      title: 'Tools don\'t solve it. They multiply the problem.',
      body: 'Zapier. ChatGPT. Slack. Airtable. Each tool solves one tiny piece and creates three new ones. More screens to check. More contexts to switch. More things to manage.',
      icon: '⚙️',
      accentColor: '#f7931e',
    },
    {
      title: 'Hiring is a trap you\'re not ready for.',
      body: 'A part-time office manager is $30–40k a year. You\'re not ready to add a salary, benefits, and management overhead. But you need help now. You\'re stuck.',
      icon: '💸',
      accentColor: '#ffb81c',
    },
  ]

  return (
    <Section id="problem" bgColor={SURGE.charcoal} className="py-16 sm:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          style={{ color: SURGE.white }}
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
              className="relative p-0.5 rounded-2xl overflow-hidden group hover:shadow-2xl transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(6, 182, 212, 0.1) 100%)`,
              }}
            >
              {/* Inner card */}
              <div
                className="p-8 sm:p-10 rounded-2xl relative z-10"
                style={{
                  backgroundColor: '#1a1a1a',
                  borderLeft: `4px solid ${SURGE.purple}`,
                }}
              >
                <div className="text-4xl mb-4">{problem.icon}</div>
                <h3
                  className="text-xl sm:text-2xl font-bold mb-4 leading-tight"
                  style={{ color: SURGE.white }}
                >
                  {problem.title}
                </h3>
                <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#a8a8a8' }}>{problem.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// --- PROMISE SECTION ---
function PromiseSection() {
  const featureIcons = {
    'Research': '🔍',
    'Follow-ups': '📧',
    'Projects': '📋',
    'Busywork': '✅',
    'Quality': '⭐',
    'You stay in control': '🎯',
  }

  const features = [
    {
      name: 'Research',
      desc: 'Agents dig into your industry, competitors, and market trends without being asked.',
    },
    {
      name: 'Follow-ups',
      desc: 'No more missed leads. Agents track conversations and send timely, personalized follow-ups.',
    },
    {
      name: 'Projects',
      desc: 'Every task has a home. Agents organize work into projects you can see at a glance.',
    },
    {
      name: 'Busywork',
      desc: 'Scheduling, note-taking, data entry. Handled. While you sleep.',
    },
    {
      name: 'Quality',
      desc: "One agent checks everyone else's work. No bad work ships under your name.",
    },
    {
      name: 'You stay in control',
      desc: 'You direct. Agents execute. One organized system. No learning curves, no context switching.',
    },
  ]

  return (
    <Section id="promise" bgColor={SURGE.white} className="py-16 sm:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          style={{ color: SURGE.charcoal }}
        >
          One person. The output of ten.
        </h2>

        <p
          className="text-lg md:text-xl leading-relaxed mb-16"
          style={{ color: '#666', maxWidth: '600px' }}
        >
          Managed agents run your entire business from one system. You open your inbox in the morning. The work is already moving.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="relative group cursor-pointer transition-all duration-300"
            >
              {/* Gradient border effect on hover */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${SURGE.purple}, ${SURGE.cyan})`,
                  padding: '2px',
                  borderRadius: '16px',
                }}
              />

              {/* Card content */}
              <div
                className="relative p-8 sm:p-10 rounded-2xl transition-all duration-300 group-hover:shadow-2xl"
                style={{
                  backgroundColor: '#f5f5f5',
                  border: '2px solid #e5e5e5',
                }}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {featureIcons[feature.name]}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: SURGE.charcoal }}>
                  {feature.name}
                </h3>
                <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#555' }}>{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// --- PRODUCT SHOWCASE SECTION ---
function ProductShowcaseSection() {
  return (
    <Section bgColor={SURGE.charcoal} className="py-16 sm:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-center"
          style={{ color: SURGE.white }}
        >
          Built for operators who move fast.
        </h2>

        <p
          className="text-lg md:text-xl leading-relaxed mb-16 text-center"
          style={{ color: '#b0b0b0', maxWidth: '600px', margin: '0 auto 3rem' }}
        >
          One unified system. Clean dashboard. Everything you need. Nothing you don't.
        </p>

        {/* Mockup card with browser chrome */}
        <div className="relative mx-auto max-w-4xl">
          {/* Subtle glow behind mockup */}
          <div
            className="absolute inset-0 rounded-3xl blur-3xl opacity-30"
            style={{
              background: `linear-gradient(135deg, ${SURGE.purple}, ${SURGE.cyan})`,
              transform: 'translateY(20px)',
            }}
          />

          {/* Browser frame */}
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-700"
            style={{ backgroundColor: '#000' }}
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
              <div className="text-xs" style={{ color: '#888' }}>aheadofmarket.com/dashboard</div>
              <div className="w-8" />
            </div>

            {/* Mockup content - Dashboard view */}
            <div
              className="p-8 sm:p-12"
              style={{ backgroundColor: '#0f0f0f', minHeight: '450px' }}
            >
              {/* Header */}
              <div className="mb-10">
                <div className="mb-2" style={{ color: '#888', fontSize: '12px' }}>GOOD MORNING</div>
                <div className="text-2xl sm:text-3xl font-bold" style={{ color: SURGE.white }}>
                  You've got work waiting
                </div>
              </div>

              {/* Two-column layout mockup */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Agents column */}
                <div>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '1rem', fontWeight: 600, letterSpacing: '0.1em' }}>
                    AGENTS
                  </div>
                  {['Your EA', 'Elon', 'Studio'].map((agent, i) => (
                    <div
                      key={i}
                      className="mb-3 p-3 rounded-lg transition-colors duration-200 hover:bg-zinc-900"
                      style={{
                        backgroundColor: i === 0 ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                        borderLeft: i === 0 ? `3px solid ${SURGE.purple}` : 'none',
                      }}
                    >
                      <div style={{ color: SURGE.white, fontSize: '14px', fontWeight: 500 }}>
                        {agent}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>active now</div>
                    </div>
                  ))}
                </div>

                {/* Middle: Tasks column */}
                <div>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '1rem', fontWeight: 600, letterSpacing: '0.1em' }}>
                    ACTIVE TASKS
                  </div>
                  {[
                    { title: 'Research competitors', agent: 'Elon' },
                    { title: 'Follow up on leads', agent: 'Your EA' },
                    { title: 'Draft proposal', agent: 'Studio' },
                  ].map((task, i) => (
                    <div
                      key={i}
                      className="mb-3 p-3 rounded-lg bg-zinc-900"
                      style={{ borderLeft: `3px solid ${SURGE.cyan}` }}
                    >
                      <div style={{ color: SURGE.white, fontSize: '14px', fontWeight: 500 }}>
                        {task.title}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px' }}>{task.agent}</div>
                    </div>
                  ))}
                </div>

                {/* Right: Summary */}
                <div className="flex flex-col justify-between">
                  <div>
                    <div style={{ color: '#888', fontSize: '11px', marginBottom: '1rem', fontWeight: 600, letterSpacing: '0.1em' }}>
                      TODAY'S SNAPSHOT
                    </div>
                    <div
                      className="p-4 rounded-lg mb-4"
                      style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)', borderLeft: `3px solid ${SURGE.purple}` }}
                    >
                      <div style={{ color: '#888', fontSize: '12px' }}>Tasks Completed</div>
                      <div className="text-2xl font-bold" style={{ color: SURGE.purple }}>8</div>
                    </div>
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', borderLeft: `3px solid ${SURGE.cyan}` }}
                    >
                      <div style={{ color: '#888', fontSize: '12px' }}>Time Saved</div>
                      <div className="text-2xl font-bold" style={{ color: SURGE.cyan }}>4.5h</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Callout text */}
        <div className="mt-12 text-center">
          <p style={{ color: '#888', fontSize: '14px' }}>
            Dashboard shows real-time agent status, active work, and progress. One place. Complete visibility.
          </p>
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
      icon: '📞',
    },
    {
      num: '02',
      title: 'We Launch Your Team',
      body: 'Your agents go live in the Corner system. They learn your business, your voice, your standards.',
      icon: '🚀',
    },
    {
      num: '03',
      title: 'You Direct. They Execute.',
      body: 'Open your inbox. Assign work. Watch it get done. Agents coordinate, hand off, check each other.',
      icon: '⚡',
    },
  ]

  return (
    <Section bgColor={SURGE.charcoal} className="py-16 sm:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h2
          className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-16"
          style={{ color: SURGE.white }}
        >
          Three steps to your upgraded business.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative group"
            >
              {/* Gradient card border */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${SURGE.purple}, ${SURGE.cyan})`,
                  padding: '1px',
                }}
              />

              {/* Card content */}
              <div
                className="relative p-8 sm:p-10 rounded-2xl transition-all duration-300 group-hover:shadow-2xl"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '2px solid #333',
                }}
              >
                {/* Number + Icon */}
                <div className="flex items-start justify-between mb-6">
                  <div
                    className="text-5xl sm:text-6xl font-bold"
                    style={{ color: `rgba(${SURGE.purple === '#7c3aed' ? '124, 58, 237' : '0,0,0'}, 0.2)` }}
                  >
                    {step.num}
                  </div>
                  <div className="text-3xl">{step.icon}</div>
                </div>

                <h3
                  className="text-xl sm:text-2xl font-bold mb-3"
                  style={{ color: SURGE.white }}
                >
                  {step.title}
                </h3>
                <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#c0c0c0' }}>{step.body}</p>

                {/* Connecting line indicator */}
                {i < steps.length - 1 && (
                  <div
                    className="absolute right-0 top-1/2 hidden md:block"
                    style={{
                      background: SURGE.gradient,
                      width: '2px',
                      height: '60%',
                      transform: 'translateX(50%)',
                      opacity: 0.6,
                    }}
                  />
                )}
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
    <Section id="cta" bgColor={SURGE.charcoal} className="py-20 sm:py-32 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2
          className="text-3xl sm:text-4xl md:text-6xl font-bold leading-tight mb-6"
          style={{ color: SURGE.white }}
        >
          Ready to operate like a team of ten?
        </h2>

        <p
          className="text-base sm:text-lg md:text-xl leading-relaxed mb-8 sm:mb-12"
          style={{ color: '#b0b0b0' }}
        >
          Book a 30-minute discovery call. We'll map your operations, show you exactly how much time you'll save, and get your agents live.
        </p>

        <a
          href="/corner/book"
          className="inline-flex items-center gap-2 px-6 sm:px-10 py-3 sm:py-5 font-bold text-base sm:text-lg rounded-lg transition-all duration-200 text-white hover:shadow-2xl"
          style={{
            background: SURGE.gradient,
          }}
        >
          Book your intro call
          <ArrowUpRight size={20} />
        </a>

        <p
          className="text-xs sm:text-sm mt-6 sm:mt-8"
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
      <ProductShowcaseSection />
      <HowItWorksSection />
      <FinalCtaSection />
      <CornerFooter />
    </div>
  )
}
