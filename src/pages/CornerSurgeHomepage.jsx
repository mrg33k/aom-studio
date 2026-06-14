import React, { useRef, useState, useEffect, lazy, Suspense } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { Check, ChevronRight, ArrowUpRight } from 'lucide-react'

const CornerAsciiHeroPoc = lazy(() => import('./CornerAsciiHeroPoc'))

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
        {/* Readability scrim */}
        <div
          className="absolute inset-0 bg-black/40"
          style={{ zIndex: 5 }}
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
            style={{ color: '#b0b0b0' }}
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
            style={{ color: '#808080' }}
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
    },
    {
      title: 'Tools don\'t solve it. They multiply the problem.',
      body: 'Zapier. ChatGPT. Slack. Airtable. Each tool solves one tiny piece and creates three new ones. More screens to check. More contexts to switch. More things to manage.',
    },
    {
      title: 'Hiring is a trap you\'re not ready for.',
      body: 'A part-time office manager is $30–40k a year. You\'re not ready to add a salary, benefits, and management overhead. But you need help now. You\'re stuck.',
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
              className="p-8 sm:p-10 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl"
              style={{
                backgroundColor: '#252525',
                borderColor: '#555',
              }}
            >
              <h3
                className="text-xl sm:text-2xl font-bold mb-4 leading-tight"
                style={{ color: SURGE.white }}
              >
                {problem.title}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#a8a8a8' }}>{problem.body}</p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// --- PROMISE SECTION ---
function PromiseSection() {
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="p-8 sm:p-10 rounded-2xl transition-all duration-300 hover:shadow-lg"
              style={{
                backgroundColor: '#f5f5f5',
                border: '2px solid #e5e5e5',
              }}
            >
              <h3 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: SURGE.charcoal }}>
                {feature.name}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#555' }}>{feature.desc}</p>
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
    },
    {
      num: '02',
      title: 'We Launch Your Team',
      body: 'Your agents go live in the Corner system. They learn your business, your voice, your standards.',
    },
    {
      num: '03',
      title: 'You Direct. They Execute.',
      body: 'Open your inbox. Assign work. Watch it get done. Agents coordinate, hand off, check each other.',
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
              className="relative"
            >
              <div
                className="text-5xl sm:text-6xl font-bold mb-4 opacity-20"
                style={{ color: SURGE.purple }}
              >
                {step.num}
              </div>
              <h3
                className="text-xl sm:text-2xl font-bold mb-3"
                style={{ color: SURGE.white }}
              >
                {step.title}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#c0c0c0' }}>{step.body}</p>
              {i < steps.length - 1 && (
                <div
                  className="absolute right-0 top-1/2 hidden md:block"
                  style={{
                    background: SURGE.gradient,
                    width: '2px',
                    height: '60%',
                    transform: 'translateX(50%)',
                  }}
                />
              )}
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
