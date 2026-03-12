import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, MessageCircle, X, ArrowRight, ArrowUpRight,
  Building2, Film, Code2, Phone, Mail, Menu, HardHat
} from 'lucide-react'

// ============================================================
// CONSTANTS
// ============================================================

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xbdalqvg'
const PHONE = '(602) 373-2164'
const PHONE_HREF = 'tel:6023732164'
const EMAIL = 'hello@aom-inhouse.com'

const SLIDES = [
  { id: 'hero', label: 'HERO', bg: '#0C0C0C' },
  { id: 'hook', label: 'THE HOOK', bg: '#151515' },
  { id: 'work', label: 'THE WORK', bg: '#0C0C0C' },
  { id: 'services', label: 'SERVICES', bg: '#1A1A17' },
  { id: 'construction', label: 'CONSTRUCTION', bg: '#0C0C0C' },
  { id: 'ai', label: 'AI ADVISORY', bg: '#151515' },
  { id: 'proof', label: 'PROOF', bg: '#1A1A17' },
  { id: 'contact', label: 'CONTACT', bg: '#0C0C0C' },
]

const GUMLET_IDS = [
  '698a6296fc23d3d76fa8d992',
  '698a5b86fc23d3d76fa82ece',
  '698a6106aec3d4e420c2fd85',
  '698a5d24aec3d4e420c2a0a0',
  '698a5ef5fc23d3d76fa87ef4',
]

const PORTFOLIO_PIECES = [
  { id: '698a6296fc23d3d76fa8d992', name: 'Journey To Gary Vee', industry: 'Narrative' },
  { id: '698a5b86fc23d3d76fa82ece', name: 'Noble Real Estate', industry: 'Real Estate' },
  { id: '698a5ef5fc23d3d76fa87ef4', name: 'Virtu Hospitality', industry: 'Hospitality' },
  { id: '698a64e5873071aec5ca99ac', name: 'AZ Arts Foundation', industry: 'Non-Profit' },
]

const TESTIMONIALS = [
  {
    quote: 'The video was a huge tool in recruiting our first 3 cohorts and showing people what we\'re about.',
    metric: '3 Cohorts',
    metricLabel: 'Recruited via content',
    name: 'Brandon Clarke',
    company: 'Startup AZ Foundation',
    industry: 'Tech / Investments',
  },
  {
    quote: 'Before AOM, we were posting randomly. Now we have a repeatable system that fills our pipeline.',
    metric: '150%',
    metricLabel: 'Pipeline growth',
    name: 'Sumit Seth',
    company: 'Naamly',
    industry: 'SaaS',
  },
  {
    quote: 'They didn\'t just shoot beautiful footage. They showed people the place I created had legacy.',
    metric: '3 Venues',
    metricLabel: 'Launches captured',
    name: 'Gio Osso',
    company: 'Virtu Hospitality Group',
    industry: 'Hospitality',
  },
]

const SERVICE_NEEDS = ['Video', 'Website', 'Social Media', 'AI Advisory', 'Other']
const BUDGET_OPTIONS = ['$2k - $5k', '$5k - $10k', '$10k - $25k', '$25k+']
const TIMING_OPTIONS = ['ASAP', 'This month', 'Next 30-60 days', 'Ongoing']

const EXPLORE_CARDS = [
  { label: 'AI OPERATIONS', title: 'The System', desc: 'See how AOM builds AI-powered operations for small businesses.', href: '/system', color: 'sage' },
  { label: 'STRATEGY', title: 'Briefs Hub', desc: 'Market research, competitive analysis, and sprint plans.', href: '/briefs', color: 'orange' },
  { label: 'PRODUCT', title: 'AI Advisory Sprint Plan', desc: 'The roadmap for AOM\'s AI advisory product launch.', href: '/briefs/sprint-plan', color: 'sage' },
  { label: 'INSIGHTS', title: 'Competitor Deep Dive', desc: 'How AOM stacks up against 20+ agencies and AI consultancies.', href: '/briefs/competitors', color: 'orange' },
]

// ============================================================
// TRANSITION CONFIG (Steffen's spec)
// ============================================================

// Exit easing: accelerate out [0.4, 0, 1, 1]
// Enter easing: decelerate in [0, 0, 0.2, 1]
const EXIT_EASE = [0.4, 0, 1, 1]
const ENTER_EASE = [0, 0, 0.2, 1]

// Slide-level AnimatePresence variants
const slideVariants = {
  enter: (direction) => ({
    y: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    y: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
}

// Per-element stagger helper
const stagger = (index, baseDelay = 0, interval = 0.08) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.4,
    delay: baseDelay + index * interval,
    ease: ENTER_EASE,
  },
})

// Fade-only stagger (no translate)
const fadeStagger = (index, baseDelay = 0, interval = 0.08) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    duration: 0.4,
    delay: baseDelay + index * interval,
    ease: ENTER_EASE,
  },
})

// ============================================================
// FILM GRAIN
// ============================================================

const FilmGrain = () => (
  <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-overlay">
    <svg width="100%" height="100%">
      <filter id="v2-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#v2-grain)" />
    </svg>
  </div>
)

// ============================================================
// PATTERN STRIP
// ============================================================

const PatternStrip = ({ height = 6 }) => (
  <div
    className="w-full pointer-events-none"
    style={{
      height: `${height}px`,
      background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)',
    }}
  />
)

// ============================================================
// PILL SELECTOR
// ============================================================

const PillSelector = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-[10px]">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={`px-5 py-[10px] text-base font-body transition-all duration-200 ${
          value === opt
            ? 'bg-[#E85D26] border border-[#E85D26] text-[#FDF6EC]'
            : 'border border-white/[0.15] text-[#8A847C] hover:border-white/30'
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
)

// ============================================================
// CONTACT FORM
// ============================================================

const ContactForm = ({ compact = false }) => {
  const [form, setForm] = useState({ name: '', email: '', need: '', budget: '', timing: '' })
  const [status, setStatus] = useState('idle')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          service_needed: form.need,
          budget: form.budget,
          timeline: form.timing,
          source: 'v2-site',
        }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="font-headline text-2xl font-bold text-[#FDF6EC] mb-3">WE GOT IT.</p>
        <p className="font-body text-base text-[#8A847C]">We'll be in touch within 24 hours.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <label className="block font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#8A847C] mb-2">Name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your name"
          className="w-full bg-transparent border-b-2 border-white/[0.15] focus:border-[#E85D26] outline-none h-12 font-body text-lg text-[#FDF6EC] placeholder:text-white/25 transition-colors"
        />
      </div>
      <div>
        <label className="block font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#8A847C] mb-2">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@company.com"
          className="w-full bg-transparent border-b-2 border-white/[0.15] focus:border-[#E85D26] outline-none h-12 font-body text-lg text-[#FDF6EC] placeholder:text-white/25 transition-colors"
        />
      </div>
      <div>
        <label className="block font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#8A847C] mb-3">What do you need?</label>
        <PillSelector options={SERVICE_NEEDS} value={form.need} onChange={(v) => setForm({ ...form, need: v })} />
      </div>
      <div>
        <label className="block font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#8A847C] mb-3">Budget range</label>
        <PillSelector options={BUDGET_OPTIONS} value={form.budget} onChange={(v) => setForm({ ...form, budget: v })} />
      </div>
      <div>
        <label className="block font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#8A847C] mb-3">Timeline</label>
        <PillSelector options={TIMING_OPTIONS} value={form.timing} onChange={(v) => setForm({ ...form, timing: v })} />
      </div>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full md:w-auto bg-[#E85D26] hover:bg-[#D14E1C] text-[#FDF6EC] font-headline font-extrabold text-base uppercase tracking-[0.06em] px-12 py-4 transition-all hover:shadow-[0_0_20px_rgba(232,93,38,0.15)] disabled:opacity-50 mt-4"
      >
        {status === 'sending' ? 'SENDING...' : 'START BRIEF'}
      </button>
      {status === 'error' && (
        <p className="text-red-400 text-base font-body mt-2">Something went wrong. Try again or email us directly.</p>
      )}
    </form>
  )
}

// ============================================================
// TOP PROGRESS BAR (Steffen spec: replaces side dots)
// Hidden on Slide 1. Visible Slides 2-8.
// ============================================================

const ProgressBar = ({ activeSlide, totalSlides, goToSlide }) => {
  if (activeSlide === 0) return null

  const progress = (activeSlide / (totalSlides - 1)) * 100
  const currentSlide = SLIDES[activeSlide]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: ENTER_EASE }}
      className="fixed top-0 left-0 right-0 z-[46]"
      style={{ background: 'rgba(12,12,12,0.90)', backdropFilter: 'blur(12px)' }}
    >
      {/* Label row */}
      <div className="h-[36px] flex items-center justify-between px-6 md:px-12 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <a href="/v2#hero" onClick={(e) => { e.preventDefault(); goToSlide(0) }} className="font-headline text-base font-extrabold text-[#F0ECE6] tracking-[-0.03em] hover:text-[#E85D26] transition-colors">
            AOM<span className="text-[#E85D26]">.</span>
          </a>
          <span className="w-px h-3 bg-white/10" />
          <motion.span
            key={currentSlide?.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-[#8A847C]"
          >
            {currentSlide?.label}
          </motion.span>
        </div>
        <span className="font-mono text-[11px] text-[#5A5550]">
          {activeSlide + 1} / {totalSlides}
        </span>
      </div>

      {/* Progress fill bar */}
      <div className="h-[3px] bg-[#1A1A1A] relative">
        <motion.div
          className="h-full bg-[#E85D26]"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ boxShadow: '0 0 8px rgba(232,93,38,0.3)' }}
        />
        {/* Invisible click zones for slide navigation */}
        <div className="absolute inset-0 flex cursor-pointer">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="flex-1 hover:bg-white/5 transition-colors"
              onClick={() => goToSlide(i)}
              title={SLIDES[i].label}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// NAV BAR (only visible on Slide 1, hero)
// ============================================================

const NavBar = ({ activeSlide, goToSlide, openDrawer }) => {
  const [menuOpen, setMenuOpen] = useState(false)

  // Only show on hero slide
  if (activeSlide !== 0) return null

  const navLinks = [
    { label: 'Work', target: 2 },
    { label: 'Services', target: 3 },
    { label: 'AI Advisory', href: '/system' },
    { label: 'Contact', action: () => openDrawer() },
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[45] h-16 flex items-center px-6 md:px-12 bg-[#0C0C0C]/40 backdrop-blur-[12px]">
        <div>
          <a href="/v2#hero" onClick={(e) => { e.preventDefault(); goToSlide(0) }} className="flex-shrink-0">
            <img src="/brand/aom-horizontal-white.svg" alt="AOM" className="h-7" />
          </a>
        </div>

        <div className="hidden md:flex items-center gap-8 ml-auto">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => {
                if (link.href) { window.location.href = link.href; return }
                if (link.action) { link.action(); return }
                goToSlide(link.target)
              }}
              className="font-body text-base font-medium uppercase tracking-[0.06em] text-[#8A847C] hover:text-[#F0ECE6] transition-colors duration-150"
            >
              {link.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden ml-auto text-[#8A847C] hover:text-[#F0ECE6] transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-[#0C0C0C] flex flex-col items-center justify-center gap-8"
          >
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-4 text-[#8A847C] hover:text-[#F0ECE6] p-2"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  setMenuOpen(false)
                  if (link.href) { window.location.href = link.href; return }
                  if (link.action) { link.action(); return }
                  goToSlide(link.target)
                }}
                className="font-headline text-[28px] font-bold text-[#F0ECE6] hover:text-[#E85D26] transition-colors"
              >
                {link.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ============================================================
// FLOATING CONTACT BUTTON
// ============================================================

const FloatingContact = ({ activeSlide, onClick }) => {
  const [showLabel, setShowLabel] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 2000)
    const t2 = setTimeout(() => setShowLabel(false), 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (activeSlide >= 7 || !visible) return null

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={onClick}
      className={`fixed z-[50] bottom-20 right-6 bg-[#E85D26] text-white shadow-[0_4px_16px_rgba(232,93,38,0.3)] hover:shadow-[0_6px_24px_rgba(232,93,38,0.5)] hover:scale-[1.08] transition-all duration-200 flex items-center gap-0 ${
        showLabel ? 'rounded-full px-5 py-3' : 'rounded-full w-14 h-14 justify-center'
      }`}
      style={{ minWidth: showLabel ? undefined : 48 }}
    >
      <MessageCircle size={22} strokeWidth={2} />
      {showLabel && (
        <motion.span
          initial={{ opacity: 1, width: 'auto' }}
          animate={{ opacity: showLabel ? 1 : 0, width: showLabel ? 'auto' : 0 }}
          className="ml-2.5 font-body text-base font-semibold whitespace-nowrap overflow-hidden"
        >
          Let's Talk
        </motion.span>
      )}
    </motion.button>
  )
}

// ============================================================
// CONTACT DRAWER
// ============================================================

const ContactDrawer = ({ open, onClose }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[59] bg-black/60"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="hidden md:block fixed top-0 right-0 bottom-0 z-[60] w-[420px] bg-[#0C0C0C] overflow-y-auto"
        >
          <PatternStrip height={4} />
          <div className="p-12 pt-12">
            <button onClick={onClose} className="absolute top-6 right-6 text-[#8A847C] hover:text-[#F0ECE6] transition-colors">
              <X size={24} />
            </button>
            <h2 className="font-headline text-3xl font-extrabold uppercase text-[#FDF6EC] mb-8">LET'S TALK</h2>
            <ContactForm compact />
            <div className="mt-10 pt-8 border-t border-white/[0.08]">
              <div className="flex items-center gap-3 mb-3">
                <Phone size={16} className="text-[#E85D26]" />
                <a href={PHONE_HREF} className="font-body text-lg font-semibold text-[#F0ECE6] hover:text-[#E85D26] transition-colors">{PHONE}</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-[#E85D26]" />
                <a href={`mailto:${EMAIL}`} className="font-body text-lg font-semibold text-[#F0ECE6] hover:text-[#E85D26] transition-colors">{EMAIL}</a>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="md:hidden fixed inset-0 z-[60] bg-[#0C0C0C] overflow-y-auto"
        >
          <PatternStrip height={4} />
          <div className="p-6 pt-16">
            <button onClick={onClose} className="absolute top-4 right-4 text-[#8A847C] hover:text-[#F0ECE6] transition-colors">
              <X size={24} />
            </button>
            <h2 className="font-headline text-2xl font-extrabold uppercase text-[#FDF6EC] mb-6">LET'S TALK</h2>
            <ContactForm compact />
            <div className="mt-8 pt-6 border-t border-white/[0.08]">
              <div className="flex items-center gap-3 mb-3">
                <Phone size={16} className="text-[#E85D26]" />
                <a href={PHONE_HREF} className="font-body text-base font-semibold text-[#F0ECE6]">{PHONE}</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={16} className="text-[#E85D26]" />
                <a href={`mailto:${EMAIL}`} className="font-body text-base font-semibold text-[#F0ECE6]">{EMAIL}</a>
              </div>
            </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
)

// ============================================================
// SLIDE 1: HERO
// Specific stagger per Steffen: micro-label 0s, headline 0.15s,
// subhead 0.3s, status bar 0.6s (fade only), arrow 0.8s (fade only)
// ============================================================

const SlideHero = ({ goToSlide }) => {
  const [playlist] = useState(() => {
    const shuffled = [...GUMLET_IDS]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled.slice(0, 3)
  })
  const [activeIdx, setActiveIdx] = useState(0)
  const [videoLoaded, setVideoLoaded] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setVideoLoaded(true), 600)
    return () => clearTimeout(fadeTimer)
  }, [])

  useEffect(() => {
    if (playlist.length <= 1) return
    const interval = setInterval(() => {
      setVideoLoaded(false)
      setTimeout(() => {
        setActiveIdx((prev) => (prev + 1) % playlist.length)
        setTimeout(() => setVideoLoaded(true), 100)
      }, 600)
    }, 10000)
    return () => clearInterval(interval)
  }, [playlist])

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden" style={{ backgroundColor: '#0C0C0C' }}>
      {/* Video background */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <iframe
          key={playlist[activeIdx]}
          src={`https://play.gumlet.io/embed/${playlist[activeIdx]}?autoplay=true&muted=true&loop=true&preload=metadata&controls=false`}
          className="absolute inset-0 w-full h-full border-none"
          loading="eager"
          style={{
            opacity: videoLoaded ? 0.7 : 0,
            transition: 'opacity 600ms ease',
            filter: 'grayscale(0.15) contrast(1.15)',
            transform: 'scale(1.15)',
            transformOrigin: 'center center',
          }}
          allow="autoplay"
          tabIndex={-1}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(12,12,12,0.50)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #0C0C0C 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: 'linear-gradient(to bottom, transparent 85%, #0C0C0C 100%)' }} />
      </div>

      <FilmGrain />

      {/* Content: centered with breathing room */}
      <div className="relative z-10 flex flex-col items-center text-center px-8 md:px-24 max-w-[1200px] mx-auto w-full">
        {/* Micro-label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0, ease: ENTER_EASE }}
          className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A847C] mb-4"
        >
          CREATIVE PRODUCTION + AI SYSTEMS
        </motion.p>

        {/* Headline: 36px mobile (safe for 390px), 80px desktop */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: ENTER_EASE }}
          className="font-headline text-[clamp(32px,8vw,80px)] font-black uppercase leading-[0.92] tracking-[-0.03em] text-[#FDF6EC] max-w-[900px]"
        >
          WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: ENTER_EASE }}
          className="font-body text-base md:text-xl text-[#8A847C] mt-6 max-w-[600px] leading-relaxed"
        >
          Video, web, and brand systems for companies ready to stand out.
        </motion.p>

        {/* Down arrow cue (ONLY on hero per Steffen) */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8, ease: ENTER_EASE }}
          onClick={() => goToSlide(1)}
          className="mt-16 text-[#8A847C] hover:text-[#E85D26] transition-colors cursor-pointer flex flex-col items-center"
        >
          <span className="block font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-[#8A847C] mb-2">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
          >
            <ChevronDown size={24} />
          </motion.div>
        </motion.button>
      </div>

      {/* Status bar: fade only, delay 0.6s */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 0.4, delay: 0.6, ease: ENTER_EASE }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4"
      >
        {['PHOENIX, AZ', 'VIDEO', 'WEB', 'SOCIAL', 'SYSTEMS', 'EST. 2020'].map((item, i) => (
          <React.Fragment key={item}>
            {i > 0 && <span className="w-px h-3 bg-[#292524]" />}
            <span className="hidden md:inline font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-[#8A847C]">
              {item}
            </span>
          </React.Fragment>
        ))}
        <span className="md:hidden font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-[#8A847C]">
          PHOENIX, AZ / EST. 2020
        </span>
      </motion.div>
    </div>
  )
}

// ============================================================
// SLIDE 2: HOOK
// Stats use clamp sizing. Short stat values to prevent overflow.
// Content vertically centered via parent flex.
// ============================================================

const SlideHook = () => {
  const stats = [
    { value: '24-72HR', label: 'Fast Turnarounds' },
    { value: 'CINEMA', label: 'Production Quality' },
    { value: 'ON TIME', label: 'Delivery Timeline' },
    { value: 'EVERY TIME', label: 'Brand Consistency' },
  ]

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#151515' }}>
      <div className="relative z-10 px-8 md:px-24 max-w-[1200px] mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          {/* Left: 55% */}
          <div className="w-full md:w-[55%]">
            <motion.p
              {...stagger(0)}
              className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A847C] mb-4"
            >
              WHY AOM
            </motion.p>
            <motion.h2
              {...stagger(1)}
              className="font-headline text-[clamp(28px,5vw,52px)] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-[#FDF6EC]"
            >
              SMALL TEAM. CINEMA-GRADE. NO BS.
            </motion.h2>
            <motion.p
              {...stagger(2)}
              className="font-body text-base md:text-lg text-[#8A847C] mt-6 max-w-[45ch] leading-relaxed"
            >
              No layers of account managers. No scope creep. You talk to the people doing the work.
            </motion.p>
          </div>

          {/* Right: 45% - stat grid with clamped sizes */}
          <div className="w-full md:w-[45%] grid grid-cols-2 gap-6 md:gap-8">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} {...stagger(i, 0.3, 0.1)}>
                <div className="border-l-2 border-[#E85D26]/20 pl-5">
                  <p
                    className="font-headline font-black text-[#E85D26] leading-[0.95] tracking-[-0.02em]"
                    style={{ fontSize: 'clamp(24px, 3vw, 48px)' }}
                  >
                    {stat.value}
                  </p>
                  <p className="font-body text-[13px] font-semibold uppercase tracking-[0.1em] text-[#8A847C] mt-2">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SLIDE 3: PORTFOLIO / THE WORK
// ============================================================

const SlideWork = () => {
  const [activeProject, setActiveProject] = useState(0)

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#0C0C0C' }}>
      {/* Full-bleed video reel */}
      <div className="absolute inset-0 z-0">
        <iframe
          key={PORTFOLIO_PIECES[activeProject].id}
          src={`https://play.gumlet.io/embed/${PORTFOLIO_PIECES[activeProject].id}?autoplay=true&muted=true&loop=true&preload=metadata&controls=false`}
          className="absolute inset-0 w-full h-full border-none"
          loading="lazy"
          style={{ opacity: 0.85, transition: 'opacity 500ms ease' }}
          allow="autoplay"
          tabIndex={-1}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(12,12,12,0.35)' }} />
      </div>

      {/* Top-left label */}
      <motion.p
        {...fadeStagger(0)}
        className="absolute top-20 left-8 md:left-12 z-10 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A847C]"
      >
        THE WORK
      </motion.p>

      {/* Client name overlay */}
      <motion.div
        {...stagger(1, 0.3)}
        className="absolute bottom-24 md:bottom-24 left-8 md:left-12 z-10"
      >
        <p className="font-body text-lg font-semibold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
          {PORTFOLIO_PIECES[activeProject].name}
        </p>
        <p className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#8A847C] mt-1">
          {PORTFOLIO_PIECES[activeProject].industry}
        </p>
      </motion.div>

      {/* Thumbnail selectors */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
        {PORTFOLIO_PIECES.map((piece, i) => (
          <motion.button
            key={piece.id}
            {...stagger(i, 0.4, 0.08)}
            onClick={() => setActiveProject(i)}
            className={`w-[56px] h-[40px] md:w-[80px] md:h-[56px] overflow-hidden transition-all duration-200 ${
              i === activeProject
                ? 'border-2 border-[#E85D26]'
                : 'border-2 border-white/10 hover:border-white/25'
            }`}
            aria-label={`View ${piece.name}`}
          >
            <div className="w-full h-full bg-[#1A1A17] flex items-center justify-center">
              <span className="font-mono text-[10px] text-[#8A847C] uppercase tracking-wider text-center px-1 leading-tight">
                {piece.name.split(' ').slice(0, 2).join(' ')}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// SLIDE 4: SERVICES
// ============================================================

const SlideServices = () => {
  const cards = [
    {
      icon: HardHat,
      title: 'Construction Companies',
      body: 'Social content from the work you actually do. Monthly filming, editing, and posting that fills your pipeline.',
      cta: 'See Construction Work',
    },
    {
      icon: Film,
      title: 'Brands + Corporate',
      body: 'Video and content that tells your story and closes deals. Launch films, event recaps, recruiting assets.',
      cta: 'See the Work',
    },
    {
      icon: Code2,
      title: 'Digital + Systems',
      body: 'Websites, workflows, and the AI systems that make it all run. Built fast, built right.',
      cta: 'Learn More',
    },
  ]

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#1A1A17' }}>
      <div className="relative z-10 px-8 md:px-24 max-w-[1200px] mx-auto w-full">
        <motion.div {...stagger(0)} className="text-center">
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A847C] mb-4">
            WHAT WE DO
          </p>
        </motion.div>
        <motion.div {...stagger(1)} className="text-center mb-12">
          <h2 className="font-headline text-[clamp(28px,5vw,52px)] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-[#FDF6EC]">
            PICK YOUR LANE.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div key={card.title} {...stagger(i, 0.25, 0.12)}>
                <div className="bg-white/[0.03] border border-white/[0.08] hover:border-[#E85D26]/30 hover:bg-white/[0.05] transition-all duration-200 p-8 md:p-10 h-full flex flex-col group">
                  <Icon size={32} strokeWidth={2} className="text-[#E85D26] mb-6" />
                  <h3 className="font-body text-xl font-semibold text-[#F0ECE6] mb-3">{card.title}</h3>
                  <p className="font-body text-base text-[#8A847C] leading-relaxed mb-6 flex-1">{card.body}</p>
                  <span className="font-body text-base font-semibold uppercase tracking-[0.05em] text-[#E85D26] flex items-center gap-2 group-hover:gap-3 transition-all">
                    {card.cta} <ArrowRight size={16} />
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SLIDE 5: CONSTRUCTION
// Video iframe with Gumlet embed confirmed present.
// ============================================================

const SlideConstruction = ({ openDrawer }) => {
  const proofPoints = [
    'Monthly content that shows your crews in action',
    'Pipeline growth through consistent social presence',
    'Recruiting content that attracts top trades talent',
  ]

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#0C0C0C' }}>
      <div className="relative z-10 px-8 md:px-24 max-w-[1200px] mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Left: content */}
          <div className="w-full md:w-1/2">
            <motion.p
              {...stagger(0)}
              className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#E85D26] mb-4"
            >
              CONSTRUCTION
            </motion.p>
            <motion.h2
              {...stagger(1)}
              className="font-headline text-[clamp(26px,4.5vw,48px)] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-[#FDF6EC]"
            >
              YOUR CREWS BUILD IT. WE MAKE SURE PEOPLE SEE IT.
            </motion.h2>
            <motion.p
              {...stagger(2)}
              className="font-body text-base md:text-lg text-[#8A847C] mt-6 max-w-[40ch] leading-relaxed"
            >
              Construction companies are sitting on the best content in business. We turn jobsite footage into a social media engine.
            </motion.p>

            <div className="mt-8 space-y-4">
              {proofPoints.map((point, i) => (
                <motion.div key={i} {...stagger(i, 0.3)}>
                  <div className="flex items-start gap-3">
                    <div className="w-[6px] h-[6px] rounded-full bg-[#E85D26] mt-2 flex-shrink-0" />
                    <p className="font-body text-base text-[#8A847C]">{point}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div {...stagger(6, 0.3)}>
              <button
                onClick={openDrawer}
                className="mt-10 bg-[#E85D26] hover:bg-[#D14E1C] text-[#FDF6EC] font-headline font-extrabold text-base uppercase tracking-[0.06em] px-8 py-4 transition-all hover:shadow-[0_0_20px_rgba(232,93,38,0.15)]"
              >
                START A PROJECT
              </button>
            </motion.div>
          </div>

          {/* Right: 4:5 portrait video */}
          <div className="w-full md:w-1/2 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, ease: ENTER_EASE }}
            >
              <div className="relative w-full max-w-[400px] aspect-[4/5] border-2 border-[#292524] hover:border-[#E85D26]/30 transition-colors overflow-hidden bg-[#1A1A17]">
                <iframe
                  src="https://play.gumlet.io/embed/698a68b7fc23d3d76fa970ef?autoplay=true&muted=true&loop=true&preload=metadata&controls=false"
                  className="absolute inset-0 w-full h-full border-none"
                  loading="lazy"
                  allow="autoplay"
                  tabIndex={-1}
                  style={{ transform: 'scale(1.3)', transformOrigin: 'center center' }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SLIDE 6: AI ADVISORY
// ============================================================

const SlideAI = () => {
  const steps = [
    { num: '1', title: 'AUDIT', body: 'We map your workflows, find the gaps, build the blueprint.' },
    { num: '2', title: 'SETUP', body: 'Custom AI agents, dashboards, and automations. Built for your business.' },
    { num: '3', title: 'PLATFORM', body: 'Ongoing access. Updates pushed automatically. You just run your business.' },
  ]

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#151515' }}>
      <div className="relative z-10 px-8 md:px-24 max-w-[1200px] mx-auto w-full">
        <div className="flex flex-col md:flex-row items-start gap-10 md:gap-16">
          {/* Left: 40% */}
          <div className="w-full md:w-[40%]">
            <motion.p
              {...stagger(0)}
              className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#7C9A72] mb-4"
            >
              AI OPERATIONS
            </motion.p>
            <motion.h2
              {...stagger(1)}
              className="font-headline text-[clamp(28px,5vw,52px)] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-[#FDF6EC]"
            >
              THE NEXT GEEK SQUAD FOR AI.
            </motion.h2>
            <motion.p
              {...stagger(2)}
              className="font-body text-base md:text-lg text-[#8A847C] mt-6 max-w-[35ch] leading-relaxed"
            >
              Most small businesses know AI matters. They just don't know where to start. We do.
            </motion.p>
            <motion.p
              {...stagger(3)}
              className="font-headline text-[22px] md:text-[28px] font-extrabold text-[#7C9A72] mt-8 tracking-[-0.01em]"
            >
              Starting at $2,500
            </motion.p>
            <motion.a
              {...stagger(4)}
              href="/system"
              className="inline-flex items-center gap-2 mt-6 font-body text-base font-semibold uppercase tracking-[0.05em] text-[#7C9A72] hover:text-[#9BB593] transition-colors"
            >
              EXPLORE THE SYSTEM <ArrowRight size={16} />
            </motion.a>
          </div>

          {/* Right: 60% - step cards */}
          <div className="w-full md:w-[60%] flex flex-col gap-5">
            {steps.map((step, i) => (
              <motion.div key={step.num} {...stagger(i, 0.3, 0.12)}>
                <div className="bg-[#7C9A72]/5 border border-[#7C9A72]/[0.12] hover:border-[#7C9A72]/25 hover:bg-[#7C9A72]/[0.08] transition-all duration-200 px-8 py-7 flex items-start gap-6">
                  <span className="font-headline text-[32px] md:text-[40px] font-extrabold text-[#7C9A72] leading-none flex-shrink-0">
                    {step.num}
                  </span>
                  <div>
                    <h3 className="font-body text-lg md:text-xl font-semibold text-[#F0ECE6]">{step.title}</h3>
                    <p className="font-body text-base text-[#8A847C] mt-2 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SLIDE 7: SOCIAL PROOF
// ============================================================

const SlideProof = () => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#1A1A17' }}>
    <div className="relative z-10 px-8 md:px-24 max-w-[1200px] mx-auto w-full">
      <motion.div {...stagger(0)} className="text-center">
        <p className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A847C] mb-4">
          WHAT THEY SAY
        </p>
      </motion.div>
      <motion.div {...stagger(1)} className="text-center mb-12">
        <h2 className="font-headline text-[clamp(28px,5vw,52px)] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-[#FDF6EC]">
          DON'T TAKE OUR WORD FOR IT.
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {TESTIMONIALS.map((t, i) => (
          <motion.div key={t.name} {...stagger(i, 0.25, 0.15)}>
            <div className="bg-white/[0.03] border border-white/[0.08] hover:border-[#E85D26]/20 transition-all duration-200 p-8 md:p-10 h-full flex flex-col">
              <span className="font-headline text-5xl font-extrabold text-[#E85D26] opacity-40 leading-none mb-4">&ldquo;</span>
              <p className="font-body text-base md:text-lg text-[#F0ECE6] italic leading-relaxed mb-6 flex-1">
                {t.quote}
              </p>
              <p className="font-headline text-[28px] md:text-[32px] font-extrabold text-[#E85D26] leading-tight">{t.metric}</p>
              <p className="font-body text-[13px] font-medium uppercase tracking-[0.1em] text-[#8A847C] mt-1 mb-5">{t.metricLabel}</p>
              <div className="w-full h-px bg-white/[0.06] mb-5" />
              <p className="font-body text-base font-semibold text-[#F0ECE6]">{t.name}</p>
              <p className="font-body text-base text-[#8A847C] mt-1">{t.company} / {t.industry}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
)

// ============================================================
// SLIDE 8: CONTACT
// ============================================================

const SlideContact = () => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#0C0C0C' }}>
    <FilmGrain />
    <div className="relative z-10 px-8 md:px-24 max-w-[1200px] mx-auto w-full">
      <div className="flex flex-col md:flex-row items-start gap-10 md:gap-16">
        {/* Left: 45% */}
        <div className="w-full md:w-[45%]">
          <motion.h2
            {...stagger(0)}
            className="font-headline text-[clamp(32px,6vw,64px)] font-black uppercase leading-[0.95] tracking-[-0.03em] text-[#FDF6EC] max-w-[500px]"
          >
            LET'S BUILD SOMETHING.
          </motion.h2>
          <motion.p
            {...stagger(1)}
            className="font-body text-base md:text-lg text-[#8A847C] mt-6 max-w-[35ch] leading-relaxed"
          >
            Tell us what you need. We'll tell you exactly how we'd do it.
          </motion.p>
          <motion.div {...stagger(2)}>
            <div className="mt-8">
              <div className="w-20 h-px bg-white/[0.08] mb-8" />
              <div className="flex items-center gap-3 mb-3">
                <Phone size={16} className="text-[#E85D26]" />
                <a href={PHONE_HREF} className="font-body text-lg font-semibold text-[#F0ECE6] hover:text-[#E85D26] transition-colors">{PHONE}</a>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Mail size={16} className="text-[#E85D26]" />
                <a href={`mailto:${EMAIL}`} className="font-body text-lg font-semibold text-[#F0ECE6] hover:text-[#E85D26] transition-colors">{EMAIL}</a>
              </div>
              <p className="font-body text-base text-[#8A847C] mt-3">Phoenix, AZ</p>
            </div>
          </motion.div>
        </div>

        {/* Right: 55% - form */}
        <div className="w-full md:w-[55%] max-w-[480px]">
          <motion.div {...stagger(3, 0.2)}>
            <ContactForm />
          </motion.div>
        </div>
      </div>
    </div>
  </div>
)

// ============================================================
// KEEP EXPLORING SECTION (scrollable, below slides)
// ============================================================

const KeepExploring = () => {
  const sectionRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={sectionRef} className="bg-[#141412]">
      <PatternStrip height={6} />
      <div className="max-w-[960px] mx-auto px-6 md:px-12 pt-20 pb-16">
        <h2 className="font-headline text-[32px] font-bold text-[#8A847C] text-center mb-12">
          KEEP EXPLORING
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {EXPLORE_CARDS.map((card, i) => (
            <motion.a
              key={card.title}
              href={card.href}
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
              className="relative block bg-white/[0.03] border border-white/[0.06] hover:border-[#E85D26]/20 hover:bg-white/[0.05] transition-all duration-200 p-8 group"
            >
              <p
                className={`font-mono text-[11px] font-bold uppercase tracking-[0.15em] mb-2 ${
                  card.color === 'sage' ? 'text-[#7C9A72]' : 'text-[#E85D26]'
                }`}
              >
                {card.label}
              </p>
              <h3 className="font-body text-xl font-semibold text-[#F0ECE6] mb-2">{card.title}</h3>
              <p className="font-body text-base text-[#8A847C] leading-relaxed">{card.desc}</p>
              <ArrowUpRight
                size={16}
                className="absolute top-8 right-8 text-[#8A847C] group-hover:text-[#E85D26] transition-colors"
              />
            </motion.a>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-12 border-t border-white/[0.06] text-center">
          <img src="/brand/aom-horizontal-white.svg" alt="AOM" className="h-6 mx-auto mb-4 opacity-60" />
          <p className="font-mono text-xs text-[#8A847C]/60 uppercase tracking-[0.15em]">
            &copy; {new Date().getFullYear()} AOM (Ahead of Market). Phoenix, AZ.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SLIDE COMPONENTS ARRAY
// ============================================================

const SLIDE_COMPONENTS = [
  SlideHero,
  SlideHook,
  SlideWork,
  SlideServices,
  SlideConstruction,
  SlideAI,
  SlideProof,
  SlideContact,
]

// ============================================================
// MAIN V2 HOME
// ============================================================

export default function V2Home() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [direction, setDirection] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isExploring, setIsExploring] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const lastWheelTime = useRef(0)
  const touchStartY = useRef(0)

  const totalSlides = SLIDES.length

  const goToSlide = useCallback((index) => {
    if (index < 0 || index > totalSlides) return
    if (isTransitioning) return

    // If going past the last slide, show keep exploring
    if (index >= totalSlides) {
      setIsExploring(true)
      return
    }

    // If coming back from keep exploring
    if (isExploring && index < totalSlides) {
      setIsExploring(false)
    }

    setIsTransitioning(true)
    setDirection(index > activeSlide ? 1 : -1)
    setActiveSlide(index)

    // Update hash
    const hash = SLIDES[index]?.id
    if (hash) history.replaceState(null, '', `/v2#${hash}`)

    // Transition lock: 0.6s total (0.25 exit + 0.35 enter)
    setTimeout(() => setIsTransitioning(false), 700)
  }, [activeSlide, totalSlides, isTransitioning, isExploring])

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Wheel navigation (debounced, one slide at a time)
  useEffect(() => {
    if (isExploring || drawerOpen) return

    const handleWheel = (e) => {
      const now = Date.now()
      if (now - lastWheelTime.current < 800) return
      if (Math.abs(e.deltaY) < 30) return

      lastWheelTime.current = now

      if (e.deltaY > 0) {
        if (activeSlide < totalSlides - 1) {
          goToSlide(activeSlide + 1)
        } else {
          setIsExploring(true)
        }
      } else {
        goToSlide(activeSlide - 1)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [activeSlide, totalSlides, goToSlide, isExploring, drawerOpen])

  // Touch navigation (swipe must travel >50px)
  useEffect(() => {
    if (isExploring || drawerOpen) return

    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchEnd = (e) => {
      const delta = touchStartY.current - e.changedTouches[0].clientY
      if (Math.abs(delta) < 50) return

      if (delta > 0) {
        if (activeSlide < totalSlides - 1) {
          goToSlide(activeSlide + 1)
        } else {
          setIsExploring(true)
        }
      } else {
        goToSlide(activeSlide - 1)
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [activeSlide, totalSlides, goToSlide, isExploring, drawerOpen])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (drawerOpen) {
        if (e.key === 'Escape') closeDrawer()
        return
      }

      if (isExploring) {
        if (e.key === 'Escape') {
          setIsExploring(false)
          setActiveSlide(totalSlides - 1)
        }
        return
      }

      // Don't hijack keyboard in input/textarea/select
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return

      switch (e.key) {
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault()
          if (activeSlide < totalSlides - 1) {
            goToSlide(activeSlide + 1)
          } else {
            setIsExploring(true)
          }
          break
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          goToSlide(activeSlide - 1)
          break
        case 'Home':
          e.preventDefault()
          goToSlide(0)
          break
        case 'End':
          e.preventDefault()
          goToSlide(totalSlides - 1)
          break
        case 'Escape':
          closeDrawer()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeSlide, drawerOpen, goToSlide, closeDrawer, isExploring, totalSlides])

  // On load: scroll to hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      const idx = SLIDES.findIndex((s) => s.id === hash)
      if (idx >= 0) {
        setActiveSlide(idx)
        setDirection(1)
      }
    }
  }, [])

  // Handle scroll from keep exploring back to slides
  useEffect(() => {
    if (!isExploring) return

    const handleScroll = () => {
      if (window.scrollY <= 0) {
        setIsExploring(false)
        setActiveSlide(totalSlides - 1)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isExploring, totalSlides])

  // When entering exploring mode, scroll to top
  useEffect(() => {
    if (isExploring) {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [isExploring])

  // Manage body overflow
  useEffect(() => {
    document.body.style.overflow = isExploring ? 'auto' : 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isExploring])

  const ActiveSlideComponent = SLIDE_COMPONENTS[activeSlide]

  return (
    <div className="w-full">
      {/* Skip link */}
      <a
        href="#hook"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-[#E85D26] focus:text-white focus:px-4 focus:py-2 focus:outline-2 focus:outline-[#E85D26] focus:outline-offset-2 font-body text-base"
      >
        Skip to content
      </a>

      {!isExploring && (
        <>
          <NavBar activeSlide={activeSlide} goToSlide={goToSlide} openDrawer={openDrawer} />
          <ProgressBar activeSlide={activeSlide} totalSlides={totalSlides} goToSlide={goToSlide} />
          <FloatingContact activeSlide={activeSlide} onClick={openDrawer} />
        </>
      )}

      <ContactDrawer open={drawerOpen} onClose={closeDrawer} />

      {!isExploring ? (
        /* Slide container: full viewport, Framer Motion AnimatePresence mode="wait" */
        <main className="fixed inset-0 w-full h-[100dvh]" style={{ backgroundColor: SLIDES[activeSlide]?.bg || '#0C0C0C' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                enter: { duration: 0.35, ease: ENTER_EASE },
                exit: { duration: 0.25, ease: EXIT_EASE },
                duration: 0.35,
                ease: ENTER_EASE,
              }}
              className="absolute inset-0 w-full h-full"
            >
              <ActiveSlideComponent
                goToSlide={goToSlide}
                openDrawer={openDrawer}
              />
            </motion.div>
          </AnimatePresence>
        </main>
      ) : (
        /* Keep exploring: traditional scrollable section */
        <div id="keep-exploring">
          <div className="bg-[#0C0C0C] py-4 px-6 flex items-center justify-center">
            <button
              onClick={() => {
                setIsExploring(false)
                setActiveSlide(totalSlides - 1)
              }}
              className="font-body text-base text-[#8A847C] hover:text-[#F0ECE6] transition-colors flex items-center gap-2"
            >
              Back to slides
            </button>
          </div>
          <KeepExploring />
        </div>
      )}

      {/* Global styles */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        :focus-visible {
          outline: 2px solid #E85D26;
          outline-offset: 2px;
        }

        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>
    </div>
  )
}
