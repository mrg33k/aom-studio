import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  { id: 'hero', label: 'HERO' },
  { id: 'hook', label: 'HOOK' },
  { id: 'work', label: 'WORK' },
  { id: 'services', label: 'SERVICES' },
  { id: 'construction', label: 'CONSTRUCTION' },
  { id: 'ai', label: 'AI' },
  { id: 'proof', label: 'PROOF' },
  { id: 'contact', label: 'CONTACT' },
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
// HOOKS
// ============================================================

function useActiveSlide(containerRef) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const sections = container.querySelectorAll('[data-slide]')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.slide)
            setActive(idx)
            const hash = SLIDES[idx]?.id
            if (hash) {
              history.replaceState(null, '', `#${hash}`)
            }
          }
        })
      },
      { root: container, threshold: 0.5 }
    )

    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [containerRef])

  return active
}

function useSlideInView(containerRef, slideIndex) {
  const [inView, setInView] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const el = ref.current
    if (!container || !el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
        else setInView(false)
      },
      { root: container, threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [containerRef, slideIndex])

  return [ref, inView]
}

// ============================================================
// ANIMATION HELPERS
// ============================================================

const fadeUp = (delay = 0, y = 15) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' },
})

const AnimateOnView = ({ children, delay = 0, y = 15, inView, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
    transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
)

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
        className={`px-5 py-[10px] text-sm font-body transition-all duration-200 ${
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
// CONTACT FORM (shared between slide 8 and drawer)
// ============================================================

const ContactForm = ({ compact = false }) => {
  const [form, setForm] = useState({ name: '', email: '', need: '', budget: '', timing: '' })
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

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
      {/* Name */}
      <div>
        <label className="block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#8A847C] mb-2">Name</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your name"
          className="w-full bg-transparent border-b-2 border-white/[0.15] focus:border-[#E85D26] outline-none h-12 font-body text-lg text-[#FDF6EC] placeholder:text-white/25 transition-colors"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#8A847C] mb-2">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@company.com"
          className="w-full bg-transparent border-b-2 border-white/[0.15] focus:border-[#E85D26] outline-none h-12 font-body text-lg text-[#FDF6EC] placeholder:text-white/25 transition-colors"
        />
      </div>

      {/* What do you need? */}
      <div>
        <label className="block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#8A847C] mb-3">What do you need?</label>
        <PillSelector options={SERVICE_NEEDS} value={form.need} onChange={(v) => setForm({ ...form, need: v })} />
      </div>

      {/* Budget */}
      <div>
        <label className="block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#8A847C] mb-3">Budget range</label>
        <PillSelector options={BUDGET_OPTIONS} value={form.budget} onChange={(v) => setForm({ ...form, budget: v })} />
      </div>

      {/* Timeline */}
      <div>
        <label className="block font-body text-xs font-semibold uppercase tracking-[0.12em] text-[#8A847C] mb-3">Timeline</label>
        <PillSelector options={TIMING_OPTIONS} value={form.timing} onChange={(v) => setForm({ ...form, timing: v })} />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full md:w-auto bg-[#E85D26] hover:bg-[#D14E1C] text-[#FDF6EC] font-headline font-extrabold text-base uppercase tracking-[0.06em] px-12 py-4 transition-all hover:shadow-[0_0_20px_rgba(232,93,38,0.15)] disabled:opacity-50 mt-4"
      >
        {status === 'sending' ? 'SENDING...' : 'START BRIEF'}
      </button>

      {status === 'error' && (
        <p className="text-red-400 text-sm font-body mt-2">Something went wrong. Try again or email us directly.</p>
      )}
    </form>
  )
}

// ============================================================
// NAV BAR
// ============================================================

const NavBar = ({ activeSlide, scrollTo, openDrawer }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const isHero = activeSlide === 0

  const navLinks = [
    { label: 'Work', target: 2 },
    { label: 'Services', target: 3 },
    { label: 'AI Advisory', href: '/system' },
    { label: 'Contact', action: () => openDrawer() },
  ]

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[45] h-16 md:h-16 flex items-center px-6 md:px-12 transition-all duration-300 ${
          isHero
            ? 'bg-[#0C0C0C]/40 backdrop-blur-[12px]'
            : 'bg-[#0C0C0C] border-b border-white/[0.06]'
        }`}
      >
        {/* Logo */}
        <a href="/v2#hero" onClick={(e) => { e.preventDefault(); scrollTo(0) }} className="flex-shrink-0">
          <img src="/brand/aom-horizontal-white.svg" alt="AOM" className="h-7" />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 ml-auto">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => {
                if (link.href) { window.location.href = link.href; return }
                if (link.action) { link.action(); return }
                scrollTo(link.target)
              }}
              className={`font-body text-sm font-medium uppercase tracking-[0.06em] transition-colors duration-150 ${
                link.target !== undefined && activeSlide === link.target
                  ? 'text-[#E85D26]'
                  : 'text-[#8A847C] hover:text-[#F0ECE6]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden ml-auto text-[#8A847C] hover:text-[#F0ECE6] transition-colors"
        >
          <Menu size={24} />
        </button>
      </nav>

      {/* Mobile menu overlay */}
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
                  scrollTo(link.target)
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
// PROGRESS DOTS
// ============================================================

const ProgressDots = ({ active, scrollTo }) => {
  const [hoveredDot, setHoveredDot] = useState(null)

  if (active === 0) return null

  return (
    <>
      {/* Desktop: vertical right rail */}
      <div className="hidden md:flex fixed right-7 top-1/2 -translate-y-1/2 z-[40] flex-col items-center">
        {/* Connecting line background */}
        <div className="absolute top-0 bottom-0 w-px bg-[#292524]" />
        {/* Progress fill */}
        <div
          className="absolute top-0 w-px bg-[#E85D26] transition-all duration-300 ease-out"
          style={{ height: `${(active / (SLIDES.length - 1)) * 100}%` }}
        />

        <div className="relative flex flex-col gap-5">
          {SLIDES.map((slide, i) => {
            const isActive = i === active
            return (
              <div key={slide.id} className="relative flex items-center">
                {/* Tooltip */}
                <AnimatePresence>
                  {hoveredDot === i && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-6 bg-[#0C0C0C]/90 backdrop-blur-[8px] text-[#F0ECE6] font-body text-xs font-medium uppercase tracking-[0.08em] px-3 py-1.5 whitespace-nowrap"
                    >
                      {slide.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                <button
                  onClick={() => scrollTo(i)}
                  onMouseEnter={() => setHoveredDot(i)}
                  onMouseLeave={() => setHoveredDot(null)}
                  className="cursor-pointer relative z-10"
                  aria-label={`Navigate to ${slide.label}`}
                >
                  <div
                    className={`rounded-full transition-all duration-200 ${
                      isActive
                        ? 'w-[10px] h-[10px] bg-[#E85D26] shadow-[0_0_8px_rgba(232,93,38,0.4)]'
                        : 'w-[6px] h-[6px] bg-[#292524] opacity-60'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: horizontal bottom rail */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[40]">
        <div className="bg-[#0C0C0C]/70 backdrop-blur-[12px] rounded-full px-5 h-8 flex items-center gap-3">
          {SLIDES.map((slide, i) => {
            const isActive = i === active
            return (
              <button
                key={slide.id}
                onClick={() => scrollTo(i)}
                className="relative flex items-center justify-center"
                style={{ minWidth: 44, minHeight: 44 }}
                aria-label={`Navigate to ${slide.label}`}
              >
                <div
                  className={`rounded-full transition-all duration-200 ${
                    isActive
                      ? 'w-[10px] h-[10px] bg-[#E85D26] shadow-[0_0_8px_rgba(232,93,38,0.4)]'
                      : 'w-[6px] h-[6px] bg-[#292524] opacity-60'
                  }`}
                />
              </button>
            )
          })}
        </div>
      </div>
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

  // Hidden on slide 8 (contact) and in keep-exploring
  if (activeSlide >= 7 || !visible) return null

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={onClick}
      className={`fixed z-[50] bottom-6 right-6 md:bottom-6 md:right-6 bg-[#E85D26] text-white shadow-[0_4px_16px_rgba(232,93,38,0.3)] hover:shadow-[0_6px_24px_rgba(232,93,38,0.5)] hover:scale-[1.08] transition-all duration-200 flex items-center gap-0 ${
        showLabel ? 'rounded-full px-5 py-3' : 'rounded-full w-14 h-14 md:w-14 md:h-14 justify-center'
      }`}
      style={{ minWidth: showLabel ? undefined : 48 }}
    >
      <MessageCircle size={22} strokeWidth={2} />
      {showLabel && (
        <motion.span
          initial={{ opacity: 1, width: 'auto' }}
          animate={{ opacity: showLabel ? 1 : 0, width: showLabel ? 'auto' : 0 }}
          className="ml-2.5 font-body text-sm font-semibold whitespace-nowrap overflow-hidden"
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
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[59] bg-black/60"
          onClick={onClose}
        />

        {/* Desktop drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="hidden md:block fixed top-0 right-0 bottom-0 z-[60] w-[420px] bg-[#0C0C0C] overflow-y-auto"
        >
          <PatternStrip height={4} />
          <div className="p-12 pt-12">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-[#8A847C] hover:text-[#F0ECE6] transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="font-headline text-3xl font-extrabold uppercase text-[#FDF6EC] mb-8">LET'S TALK</h2>
            <ContactForm compact />
            {/* Fallback contact */}
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

        {/* Mobile full-screen modal */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="md:hidden fixed inset-0 z-[60] bg-[#0C0C0C] overflow-y-auto"
        >
          <PatternStrip height={4} />
          <div className="p-6 pt-16">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#8A847C] hover:text-[#F0ECE6] transition-colors"
            >
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
// SLIDE WRAPPER
// ============================================================

const Slide = React.forwardRef(({ children, bg, id, index, className = '' }, ref) => (
  <section
    ref={ref}
    id={id}
    data-slide={index}
    className={`relative min-h-[100dvh] w-full flex items-center justify-center snap-start overflow-hidden ${className}`}
    style={{ backgroundColor: bg }}
    aria-label={SLIDES[index]?.label}
  >
    {/* Top-edge gradient from previous slide (except hero) */}
    {index > 0 && (
      <div className="absolute top-0 left-0 right-0 h-[10px] pointer-events-none z-[2]" style={{
        background: `linear-gradient(to bottom, ${
          index === 1 ? '#0C0C0C' : index === 2 ? '#151515' : index === 3 ? '#0C0C0C' : index === 4 ? '#1A1A17' : index === 5 ? '#0C0C0C' : index === 6 ? '#151515' : '#1A1A17'
        }, transparent)`
      }} />
    )}
    {children}
  </section>
))

// ============================================================
// DOWN ARROW CUE
// ============================================================

const DownArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 text-[#8A847C] opacity-50 hover:opacity-100 hover:text-[#E85D26] transition-all cursor-pointer"
    aria-label="Next slide"
  >
    <motion.div
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
    >
      <ChevronDown size={20} />
    </motion.div>
  </button>
)

// ============================================================
// SLIDE 1: HERO
// ============================================================

const SlideHero = React.forwardRef(({ scrollTo, containerRef }, ref) => {
  const [slideRef, inView] = useSlideInView(containerRef, 0)
  const [playlist] = useState(() => {
    const shuffled = [...GUMLET_IDS]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled.slice(0, 3)
  })
  const [activeIdx, setActiveIdx] = useState(0)
  const [videoVisible, setVideoVisible] = useState(true)

  useEffect(() => {
    if (playlist.length <= 1) return
    const interval = setInterval(() => {
      setVideoVisible(false)
      setTimeout(() => {
        setActiveIdx((prev) => (prev + 1) % playlist.length)
        setVideoVisible(true)
      }, 1500)
    }, 10000)
    return () => clearInterval(interval)
  }, [playlist])

  return (
    <Slide ref={(el) => { slideRef.current = el; if (ref) ref.current = el }} bg="#0C0C0C" id="hero" index={0}>
      {/* Video background */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <iframe
          key={playlist[activeIdx]}
          src={`https://play.gumlet.io/embed/${playlist[activeIdx]}?autoplay=true&muted=true&loop=true&preload=true&controls=false`}
          className="absolute inset-0 w-full h-full border-none transition-opacity duration-[1500ms] ease-in-out"
          loading="eager"
          style={{
            opacity: videoVisible ? 0.7 : 0,
            filter: 'grayscale(0.15) contrast(1.15)',
            transform: 'scale(1.15)',
            transformOrigin: 'center center',
          }}
          allow="autoplay"
          tabIndex={-1}
        />
        {/* Overlay */}
        <div className="absolute inset-0" style={{ background: 'rgba(12,12,12,0.50)' }} />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #0C0C0C 100%)' }} />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: 'linear-gradient(to bottom, transparent 85%, #0C0C0C 100%)' }} />
      </div>

      <FilmGrain />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 md:px-24 max-w-[1200px] mx-auto w-full">
        <AnimateOnView inView={inView} delay={0} y={20}>
          <p className="font-mono text-[12px] md:text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A847C] mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            CREATIVE PRODUCTION + AI SYSTEMS
          </p>
        </AnimateOnView>

        <AnimateOnView inView={inView} delay={0.15} y={20}>
          <h1 className="font-headline text-[44px] md:text-[80px] font-black uppercase leading-[0.92] tracking-[-0.03em] text-[#FDF6EC] max-w-[900px]">
            WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.
          </h1>
        </AnimateOnView>

        <AnimateOnView inView={inView} delay={0.3} y={20}>
          <p className="font-body text-base md:text-xl text-[#8A847C] mt-6 max-w-[600px] leading-relaxed">
            Video, web, and brand systems for companies ready to stand out.
          </p>
        </AnimateOnView>

        {/* Status bar */}
        <AnimateOnView inView={inView} delay={0.6} y={0} className="mt-auto">
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-70">
            {['PHOENIX, AZ', 'VIDEO', 'WEB', 'SOCIAL', 'SYSTEMS', 'EST. 2020'].map((item, i) => (
              <React.Fragment key={item}>
                {i > 0 && <span className="w-px h-3 bg-[#292524]" />}
                <span className="font-body text-[11px] md:text-[11px] font-medium uppercase tracking-[0.15em] text-[#8A847C]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {item}
                </span>
              </React.Fragment>
            ))}
          </div>
        </AnimateOnView>

        {/* Down arrow */}
        <AnimateOnView inView={inView} delay={0.8} y={0}>
          <button
            onClick={() => scrollTo(1)}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[#8A847C] hover:text-[#E85D26] transition-colors cursor-pointer"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
            >
              <ChevronDown size={24} />
            </motion.div>
            <span className="block font-body text-[13px] font-medium uppercase tracking-[0.08em] text-[#8A847C] mt-1">Scroll</span>
          </button>
        </AnimateOnView>
      </div>
    </Slide>
  )
})

// ============================================================
// SLIDE 2: HOOK
// ============================================================

const SlideHook = React.forwardRef(({ scrollTo, containerRef }, ref) => {
  const [slideRef, inView] = useSlideInView(containerRef, 1)

  const stats = [
    { value: '24-72HR', label: 'Fast Turnarounds' },
    { value: 'CINEMA', label: 'Production Quality' },
    { value: 'PREDICTABLE', label: 'Delivery Timeline' },
    { value: 'REPEATABLE', label: 'Brand Consistency' },
  ]

  return (
    <Slide ref={(el) => { slideRef.current = el; if (ref) ref.current = el }} bg="#151515" id="hook" index={1}>
      <div className="relative z-10 px-6 md:px-24 max-w-[1200px] mx-auto w-full py-20">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          {/* Left: 55% */}
          <div className="w-full md:w-[55%]">
            <AnimateOnView inView={inView} delay={0} y={15}>
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A847C] mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                WHY AOM
              </p>
            </AnimateOnView>
            <AnimateOnView inView={inView} delay={0.1} y={15}>
              <h2 className="font-headline text-[34px] md:text-[52px] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-[#FDF6EC]">
                SMALL TEAM. CINEMA-GRADE. NO BS.
              </h2>
            </AnimateOnView>
            <AnimateOnView inView={inView} delay={0.2} y={15}>
              <p className="font-body text-base md:text-lg text-[#8A847C] mt-6 max-w-[45ch] leading-relaxed">
                No layers of account managers. No scope creep. You talk to the people doing the work.
              </p>
            </AnimateOnView>
          </div>

          {/* Right: 45% - stat grid */}
          <div className="w-full md:w-[45%] grid grid-cols-2 gap-8">
            {stats.map((stat, i) => (
              <AnimateOnView key={stat.label} inView={inView} delay={0.3 + i * 0.1} y={20}>
                <div className="border-l-2 border-[#E85D26]/20 pl-5">
                  <p className="font-headline text-[40px] md:text-[56px] font-black text-[#E85D26] leading-[0.95] tracking-[-0.02em]">
                    {stat.value}
                  </p>
                  <p className="font-body text-[12px] md:text-[13px] font-semibold uppercase tracking-[0.1em] text-[#8A847C] mt-2">
                    {stat.label}
                  </p>
                </div>
              </AnimateOnView>
            ))}
          </div>
        </div>
      </div>
      <DownArrow onClick={() => scrollTo(2)} />
    </Slide>
  )
})

// ============================================================
// SLIDE 3: PORTFOLIO / THE WORK
// ============================================================

const SlideWork = React.forwardRef(({ scrollTo, containerRef }, ref) => {
  const [slideRef, inView] = useSlideInView(containerRef, 2)
  const [activeProject, setActiveProject] = useState(0)

  return (
    <Slide ref={(el) => { slideRef.current = el; if (ref) ref.current = el }} bg="#0C0C0C" id="work" index={2}>
      {/* Full-bleed video reel */}
      <div className="absolute inset-0 z-0">
        <iframe
          key={PORTFOLIO_PIECES[activeProject].id}
          src={`https://play.gumlet.io/embed/${PORTFOLIO_PIECES[activeProject].id}?autoplay=true&muted=true&loop=true&preload=true&controls=false`}
          className="absolute inset-0 w-full h-full border-none transition-opacity duration-300"
          loading="lazy"
          style={{ opacity: 0.85 }}
          allow="autoplay"
          tabIndex={-1}
        />
        <div className="absolute inset-0" style={{ background: 'rgba(12,12,12,0.35)' }} />
      </div>

      {/* Top-left label */}
      <AnimateOnView inView={inView} delay={0} y={0} className="absolute top-20 left-6 md:left-12 z-10">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A847C]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          THE WORK
        </p>
      </AnimateOnView>

      {/* Client name overlay */}
      <AnimateOnView inView={inView} delay={0.4} y={10} className="absolute bottom-24 md:bottom-24 left-6 md:left-12 z-10">
        <p className="font-body text-lg font-semibold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
          {PORTFOLIO_PIECES[activeProject].name}
        </p>
        <p className="text-[12px] uppercase tracking-[0.1em] text-[#8A847C] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {PORTFOLIO_PIECES[activeProject].industry}
        </p>
      </AnimateOnView>

      {/* Thumbnail selectors */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
        {PORTFOLIO_PIECES.map((piece, i) => (
          <AnimateOnView key={piece.id} inView={inView} delay={0.5 + i * 0.08} y={10}>
            <button
              onClick={() => setActiveProject(i)}
              className={`w-[80px] h-[56px] md:w-[80px] md:h-[56px] overflow-hidden transition-all duration-200 ${
                i === activeProject
                  ? 'border-2 border-[#E85D26]'
                  : 'border-2 border-white/10 hover:border-white/25'
              }`}
              aria-label={`View ${piece.name}`}
            >
              <div className="w-full h-full bg-[#1A1A17] flex items-center justify-center">
                <span className="text-[10px] font-body text-[#8A847C] uppercase tracking-wider text-center px-1 leading-tight">
                  {piece.name.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
            </button>
          </AnimateOnView>
        ))}
      </div>

      <DownArrow onClick={() => scrollTo(3)} />
    </Slide>
  )
})

// ============================================================
// SLIDE 4: SERVICES
// ============================================================

const SlideServices = React.forwardRef(({ scrollTo, containerRef }, ref) => {
  const [slideRef, inView] = useSlideInView(containerRef, 3)

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
    <Slide ref={(el) => { slideRef.current = el; if (ref) ref.current = el }} bg="#1A1A17" id="services" index={3}>
      <div className="relative z-10 px-6 md:px-24 max-w-[1200px] mx-auto w-full py-20">
        <AnimateOnView inView={inView} delay={0} y={15} className="text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A847C] mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            WHAT WE DO
          </p>
        </AnimateOnView>
        <AnimateOnView inView={inView} delay={0.1} y={15} className="text-center mb-12">
          <h2 className="font-headline text-[34px] md:text-[52px] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-[#FDF6EC]">
            PICK YOUR LANE.
          </h2>
        </AnimateOnView>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6">
          {cards.map((card, i) => {
            const Icon = card.icon
            return (
              <AnimateOnView key={card.title} inView={inView} delay={0.25 + i * 0.12} y={25}>
                <div className="bg-white/[0.03] border border-white/[0.08] hover:border-[#E85D26]/30 hover:bg-white/[0.05] transition-all duration-200 p-8 md:p-10 h-full flex flex-col group">
                  <Icon size={32} strokeWidth={2} className="text-[#E85D26] mb-6" />
                  <h3 className="font-body text-xl font-semibold text-[#F0ECE6] mb-3">{card.title}</h3>
                  <p className="font-body text-base text-[#8A847C] leading-relaxed mb-6 flex-1">{card.body}</p>
                  <span className="font-body text-sm font-semibold uppercase tracking-[0.05em] text-[#E85D26] flex items-center gap-2 group-hover:gap-3 transition-all">
                    {card.cta} <ArrowRight size={16} />
                  </span>
                </div>
              </AnimateOnView>
            )
          })}
        </div>
      </div>
      <DownArrow onClick={() => scrollTo(4)} />
    </Slide>
  )
})

// ============================================================
// SLIDE 5: CONSTRUCTION
// ============================================================

const SlideConstruction = React.forwardRef(({ scrollTo, containerRef, openDrawer }, ref) => {
  const [slideRef, inView] = useSlideInView(containerRef, 4)

  const proofPoints = [
    'Monthly content that shows your crews in action',
    'Pipeline growth through consistent social presence',
    'Recruiting content that attracts top trades talent',
  ]

  return (
    <Slide ref={(el) => { slideRef.current = el; if (ref) ref.current = el }} bg="#0C0C0C" id="construction" index={4}>
      <div className="relative z-10 px-6 md:px-24 max-w-[1200px] mx-auto w-full py-20">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Left: content */}
          <div className="w-full md:w-1/2">
            <AnimateOnView inView={inView} delay={0} y={15}>
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#E85D26] mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                CONSTRUCTION
              </p>
            </AnimateOnView>
            <AnimateOnView inView={inView} delay={0.1} y={15}>
              <h2 className="font-headline text-[34px] md:text-[52px] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-[#FDF6EC]">
                YOUR CREWS BUILD IT. WE MAKE SURE PEOPLE SEE IT.
              </h2>
            </AnimateOnView>
            <AnimateOnView inView={inView} delay={0.2} y={15}>
              <p className="font-body text-base md:text-lg text-[#8A847C] mt-6 max-w-[40ch] leading-relaxed">
                Construction companies are sitting on the best content in business. We turn jobsite footage into a social media engine.
              </p>
            </AnimateOnView>

            {/* Proof points */}
            <div className="mt-8 space-y-4">
              {proofPoints.map((point, i) => (
                <AnimateOnView key={i} inView={inView} delay={0.3 + i * 0.1} y={15}>
                  <div className="flex items-start gap-3">
                    <div className="w-[6px] h-[6px] rounded-full bg-[#E85D26] mt-2 flex-shrink-0" />
                    <p className="font-body text-base text-[#8A847C]">{point}</p>
                  </div>
                </AnimateOnView>
              ))}
            </div>

            <AnimateOnView inView={inView} delay={0.6} y={15}>
              <button
                onClick={openDrawer}
                className="mt-10 bg-[#E85D26] hover:bg-[#D14E1C] text-[#FDF6EC] font-headline font-extrabold text-sm uppercase tracking-[0.06em] px-8 py-4 transition-all hover:shadow-[0_0_20px_rgba(232,93,38,0.15)]"
              >
                START A PROJECT
              </button>
            </AnimateOnView>
          </div>

          {/* Right: media placeholder (4:5 portrait) */}
          <div className="w-full md:w-1/2 flex justify-center">
            <AnimateOnView inView={inView} delay={0.3} y={0}>
              <div className="relative w-full max-w-[400px] aspect-[4/5] border-2 border-[#292524] hover:border-[#E85D26]/30 transition-colors overflow-hidden bg-[#1A1A17]">
                <iframe
                  src="https://play.gumlet.io/embed/698a68b7fc23d3d76fa970ef?autoplay=true&muted=true&loop=true&preload=true&controls=false"
                  className="absolute inset-0 w-full h-full border-none"
                  loading="lazy"
                  allow="autoplay"
                  tabIndex={-1}
                  style={{ transform: 'scale(1.3)', transformOrigin: 'center center' }}
                />
              </div>
            </AnimateOnView>
          </div>
        </div>
      </div>
      <DownArrow onClick={() => scrollTo(5)} />
    </Slide>
  )
})

// ============================================================
// SLIDE 6: AI ADVISORY
// ============================================================

const SlideAI = React.forwardRef(({ scrollTo, containerRef }, ref) => {
  const [slideRef, inView] = useSlideInView(containerRef, 5)

  const steps = [
    { num: '1', title: 'AUDIT', body: 'We map your workflows, find the gaps, build the blueprint.' },
    { num: '2', title: 'SETUP', body: 'Custom AI agents, dashboards, and automations. Built for your business.' },
    { num: '3', title: 'PLATFORM', body: 'Ongoing access. Updates pushed automatically. You just run your business.' },
  ]

  return (
    <Slide ref={(el) => { slideRef.current = el; if (ref) ref.current = el }} bg="#151515" id="ai" index={5}>
      <div className="relative z-10 px-6 md:px-24 max-w-[1200px] mx-auto w-full py-20">
        <div className="flex flex-col md:flex-row items-start gap-10 md:gap-16">
          {/* Left: 40% */}
          <div className="w-full md:w-[40%]">
            <AnimateOnView inView={inView} delay={0} y={15}>
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#7C9A72] mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                AI OPERATIONS
              </p>
            </AnimateOnView>
            <AnimateOnView inView={inView} delay={0.1} y={15}>
              <h2 className="font-headline text-[34px] md:text-[52px] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-[#FDF6EC]">
                THE NEXT GEEK SQUAD FOR AI.
              </h2>
            </AnimateOnView>
            <AnimateOnView inView={inView} delay={0.2} y={15}>
              <p className="font-body text-base md:text-lg text-[#8A847C] mt-6 max-w-[35ch] leading-relaxed">
                Most small businesses know AI matters. They just don't know where to start. We do.
              </p>
            </AnimateOnView>
            <AnimateOnView inView={inView} delay={0.3} y={15}>
              <p className="font-headline text-[22px] md:text-[28px] font-extrabold text-[#7C9A72] mt-8 tracking-[-0.01em]">
                Starting at $2,500
              </p>
            </AnimateOnView>
            <AnimateOnView inView={inView} delay={0.4} y={15}>
              <a
                href="/system"
                className="inline-flex items-center gap-2 mt-6 font-body text-sm font-semibold uppercase tracking-[0.05em] text-[#7C9A72] hover:text-[#9BB593] transition-colors"
              >
                EXPLORE THE SYSTEM <ArrowRight size={16} />
              </a>
            </AnimateOnView>
          </div>

          {/* Right: 60% - step cards */}
          <div className="w-full md:w-[60%] flex flex-col gap-5">
            {steps.map((step, i) => (
              <AnimateOnView key={step.num} inView={inView} delay={0.3 + i * 0.12} y={20}>
                <div className="bg-[#7C9A72]/5 border border-[#7C9A72]/[0.12] hover:border-[#7C9A72]/25 hover:bg-[#7C9A72]/[0.08] transition-all duration-200 px-8 py-7 flex items-start gap-6">
                  <span className="font-headline text-[32px] md:text-[40px] font-extrabold text-[#7C9A72] leading-none flex-shrink-0">
                    {step.num}
                  </span>
                  <div>
                    <h3 className="font-body text-lg md:text-xl font-semibold text-[#F0ECE6]">{step.title}</h3>
                    <p className="font-body text-[15px] text-[#8A847C] mt-2 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </AnimateOnView>
            ))}
          </div>
        </div>
      </div>
      <DownArrow onClick={() => scrollTo(6)} />
    </Slide>
  )
})

// ============================================================
// SLIDE 7: SOCIAL PROOF
// ============================================================

const SlideProof = React.forwardRef(({ scrollTo, containerRef }, ref) => {
  const [slideRef, inView] = useSlideInView(containerRef, 6)

  return (
    <Slide ref={(el) => { slideRef.current = el; if (ref) ref.current = el }} bg="#1A1A17" id="proof" index={6}>
      <div className="relative z-10 px-6 md:px-24 max-w-[1200px] mx-auto w-full py-20">
        <AnimateOnView inView={inView} delay={0} y={15} className="text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#8A847C] mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            WHAT THEY SAY
          </p>
        </AnimateOnView>
        <AnimateOnView inView={inView} delay={0.1} y={15} className="text-center mb-12">
          <h2 className="font-headline text-[34px] md:text-[52px] font-extrabold uppercase leading-[1.05] tracking-[-0.03em] text-[#FDF6EC]">
            DON'T TAKE OUR WORD FOR IT.
          </h2>
        </AnimateOnView>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <AnimateOnView key={t.name} inView={inView} delay={0.25 + i * 0.15} y={25}>
              <div className="bg-white/[0.03] border border-white/[0.08] hover:border-[#E85D26]/20 transition-all duration-200 p-8 md:p-10 h-full flex flex-col">
                {/* Quote mark */}
                <span className="font-headline text-5xl font-extrabold text-[#E85D26] opacity-40 leading-none mb-4">"</span>
                {/* Quote text */}
                <p className="font-body text-base md:text-lg text-[#F0ECE6] italic leading-relaxed mb-6 flex-1">
                  {t.quote}
                </p>
                {/* Metric */}
                <p className="font-headline text-[28px] md:text-[32px] font-extrabold text-[#E85D26] leading-tight">{t.metric}</p>
                <p className="font-body text-[13px] font-medium uppercase tracking-[0.1em] text-[#8A847C] mt-1 mb-5">{t.metricLabel}</p>
                {/* Divider */}
                <div className="w-full h-px bg-white/[0.06] mb-5" />
                {/* Attribution */}
                <p className="font-body text-base font-semibold text-[#F0ECE6]">{t.name}</p>
                <p className="font-body text-sm text-[#8A847C] mt-1">{t.company} / {t.industry}</p>
              </div>
            </AnimateOnView>
          ))}
        </div>
      </div>
      <DownArrow onClick={() => scrollTo(7)} />
    </Slide>
  )
})

// ============================================================
// SLIDE 8: CONTACT
// ============================================================

const SlideContact = React.forwardRef(({ containerRef }, ref) => {
  const [slideRef, inView] = useSlideInView(containerRef, 7)

  return (
    <Slide ref={(el) => { slideRef.current = el; if (ref) ref.current = el }} bg="#0C0C0C" id="contact" index={7}>
      <FilmGrain />
      <div className="relative z-10 px-6 md:px-24 max-w-[1200px] mx-auto w-full py-20">
        <div className="flex flex-col md:flex-row items-start gap-10 md:gap-16">
          {/* Left: 45% */}
          <div className="w-full md:w-[45%]">
            <AnimateOnView inView={inView} delay={0} y={15}>
              <h2 className="font-headline text-[40px] md:text-[64px] font-black uppercase leading-[0.95] tracking-[-0.03em] text-[#FDF6EC] max-w-[500px]">
                LET'S BUILD SOMETHING.
              </h2>
            </AnimateOnView>
            <AnimateOnView inView={inView} delay={0.1} y={15}>
              <p className="font-body text-base md:text-lg text-[#8A847C] mt-6 max-w-[35ch] leading-relaxed">
                Tell us what you need. We'll tell you exactly how we'd do it.
              </p>
            </AnimateOnView>
            <AnimateOnView inView={inView} delay={0.2} y={15}>
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
            </AnimateOnView>
          </div>

          {/* Right: 55% - form */}
          <div className="w-full md:w-[55%] max-w-[480px]">
            <AnimateOnView inView={inView} delay={0.3} y={15}>
              <ContactForm />
            </AnimateOnView>
          </div>
        </div>
      </div>
    </Slide>
  )
})

// ============================================================
// KEEP EXPLORING SECTION
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
    <div ref={sectionRef} className="bg-[#141412] snap-start">
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
                className={`text-[11px] font-bold uppercase tracking-[0.15em] mb-2 ${
                  card.color === 'sage' ? 'text-[#7C9A72]' : 'text-[#E85D26]'
                }`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {card.label}
              </p>
              <h3 className="font-body text-xl font-semibold text-[#F0ECE6] mb-2">{card.title}</h3>
              <p className="font-body text-[15px] text-[#8A847C] leading-relaxed">{card.desc}</p>
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
          <p className="font-body text-[13px] text-[#8A847C]">
            &copy; {new Date().getFullYear()} AOM (Ahead of Market). Phoenix, AZ.
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MAIN V2 HOME
// ============================================================

export default function V2Home() {
  const containerRef = useRef(null)
  const activeSlide = useActiveSlide(containerRef)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const scrollTo = useCallback((index) => {
    const container = containerRef.current
    if (!container) return
    const target = container.querySelector(`[data-slide="${index}"]`)
    if (target) target.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (drawerOpen) {
        if (e.key === 'Escape') closeDrawer()
        return
      }
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault()
          if (activeSlide < SLIDES.length - 1) scrollTo(activeSlide + 1)
          break
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          if (activeSlide > 0) scrollTo(activeSlide - 1)
          break
        case 'Home':
          e.preventDefault()
          scrollTo(0)
          break
        case 'End':
          e.preventDefault()
          scrollTo(SLIDES.length - 1)
          break
        case 'Escape':
          closeDrawer()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeSlide, drawerOpen, scrollTo, closeDrawer])

  // On load: scroll to hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      const idx = SLIDES.findIndex((s) => s.id === hash)
      if (idx >= 0) {
        setTimeout(() => scrollTo(idx), 100)
      }
    }
  }, [scrollTo])

  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      {/* Skip link */}
      <a
        href="#hook"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-[#E85D26] focus:text-white focus:px-4 focus:py-2 focus:outline-2 focus:outline-[#E85D26] focus:outline-offset-2 font-body text-sm"
      >
        Skip to content
      </a>

      <NavBar activeSlide={activeSlide} scrollTo={scrollTo} openDrawer={openDrawer} />
      <ProgressDots active={activeSlide} scrollTo={scrollTo} />
      <FloatingContact activeSlide={activeSlide} onClick={openDrawer} />
      <ContactDrawer open={drawerOpen} onClose={closeDrawer} />

      {/* Scroll snap container */}
      <main
        ref={containerRef}
        className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        <SlideHero scrollTo={scrollTo} containerRef={containerRef} />
        <SlideHook scrollTo={scrollTo} containerRef={containerRef} />
        <SlideWork scrollTo={scrollTo} containerRef={containerRef} />
        <SlideServices scrollTo={scrollTo} containerRef={containerRef} />
        <SlideConstruction scrollTo={scrollTo} containerRef={containerRef} openDrawer={openDrawer} />
        <SlideAI scrollTo={scrollTo} containerRef={containerRef} />
        <SlideProof scrollTo={scrollTo} containerRef={containerRef} />
        <SlideContact containerRef={containerRef} />
        <KeepExploring />
      </main>

      {/* Global reduced-motion styles */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Focus ring */
        :focus-visible {
          outline: 2px solid #E85D26;
          outline-offset: 2px;
        }

        /* JetBrains Mono font fallback */
        .font-mono {
          font-family: 'JetBrains Mono', 'Space Grotesk', monospace;
        }
      `}</style>
    </div>
  )
}
