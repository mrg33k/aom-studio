import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronDown, Camera, Video, Globe, Phone, Mail,
  CheckCircle2, ArrowRight, Calendar, Image,
  Users, Clock, DollarSign, TrendingUp, MapPin,
  Play, Flame, Layers, FileText, Star, Zap,
  BarChart3, Target, Shield, Megaphone
} from 'lucide-react'

// ─── BRAND CONSTANTS (Q Proposal tokens) ────────────────────────────────────
const ORANGE = '#E85D26'
const BG = '#0A0A0A'
const CARD_BG = '#151515'
const WARM_BG = '#1A1A17'
const CREAM = '#FDF6EC'
const TEXT = '#F0ECE6'
const MUTED = '#8A847C'
const BORDER = 'rgba(255,255,255,0.08)'

// ─── GOOGLE FONTS ────────────────────────────────────────────────────────────
const fontLink = document.createElement('link')
fontLink.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap'
fontLink.rel = 'stylesheet'
if (!document.querySelector('link[href*="Syne"]')) {
  document.head.appendChild(fontLink)
}

// ─── FONT CLASSES (injected as style tag) ────────────────────────────────────
const styleTag = document.createElement('style')
styleTag.textContent = `
  .font-headline { font-family: 'Syne', sans-serif; }
  .font-body { font-family: 'Space Grotesk', system-ui, sans-serif; }
  .font-mono { font-family: 'JetBrains Mono', monospace; }
`
if (!document.querySelector('style[data-ambition-fonts]')) {
  styleTag.setAttribute('data-ambition-fonts', 'true')
  document.head.appendChild(styleTag)
}

// ─── SEO ─────────────────────────────────────────────────────────────────────
function useSEO() {
  useEffect(() => {
    document.title = 'Ambition Mechanical | Performance Report + Growth Plan'
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    setMeta('description', 'Ambition Mechanical x AOM: 11-month performance report + service call growth plan. 37 shoots. 3,138 video files. 3 TB of footage. $78k+ in delivered value.')
    setMeta('og:title', 'Ambition Mechanical | Performance Report + Growth Plan', true)
    setMeta('og:description', '37 shoots. 3,138 video files. 713 photos. 3 TB of footage. 1 custom website. Plus: the plan to get the phone ringing.', true)
    setMeta('og:type', 'article', true)
  }, [])
}

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

// ─── COUNT-UP HOOK ──────────────────────────────────────────────────────────
function useCountUp(end, duration = 1400, inView = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!inView) return
    const startTime = performance.now()
    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, inView])
  return value
}

// ─── FILM GRAIN ─────────────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA
// ═══════════════════════════════════════════════════════════════════════════════

const heroStats = [
  { number: 37, suffix: '', label: 'Professional Video Shoots', context: 'May 2025 through March 2026' },
  { number: 3138, suffix: '', label: 'Video Files Captured', context: '3 TB of raw + finished footage' },
  { number: 713, suffix: '', label: 'Professional Photos', context: 'Stills, aerials, DNG raws' },
  { number: 23, suffix: '', label: 'Finished Video Exports', context: 'Edited, color-graded, delivered' },
  { number: 25, suffix: '+', label: 'Job Sites Documented', context: 'Premium client locations across Phoenix metro' },
  { number: 1, suffix: '', label: 'Custom Website', context: 'Built and launched March 2026' },
]

const shoots = [
  { month: 'May 2025', name: 'Fashion Square, Scottsdale', details: 'Retail HVAC, drone + handheld', type: 'Commercial' },
  { month: 'May 2025', name: 'Sossaman Warehouse', details: 'Commercial, drone + handheld', type: 'Commercial' },
  { month: 'Jun 2025', name: 'Novus Place (The Melt)', details: 'Commercial restaurant, drone + cinema camera', type: 'Restaurant' },
  { month: 'Jun 2025', name: 'Laborers', details: 'Crew/people shoot, Ronin 4D cinema clips', type: 'Team' },
  { month: 'Jun 2025', name: 'Novus Place (Return)', details: 'Follow-up coverage', type: 'Restaurant' },
  { month: 'Jun 2025', name: 'Fashion Square (Return)', details: '278 files, Din Tai Fung flagship', type: 'Commercial' },
  { month: 'Jul 2025', name: 'Apple Store Chandler', details: 'Premium retail installation', type: 'Retail' },
  { month: 'Jul 2025', name: 'Apple Store Chandler', details: 'ProRes raw footage session', type: 'Retail' },
  { month: 'Aug 2025', name: 'Memorial Tower', details: 'Senior living, drone + cinema + 63 photos', type: 'Healthcare' },
  { month: 'Aug 2025', name: 'Ambition Office', details: 'Brand/team shoot, 45 clips + 182 photos', type: 'Brand' },
  { month: 'Sep 2025', name: 'Memorial Tower (Return)', details: '73 cinema + 21 drone + 169 photos', type: 'Healthcare' },
  { month: 'Sep 2025', name: 'Arrowhead', details: 'Industrial, massive drone coverage', type: 'Industrial' },
  { month: 'Sep 2025', name: 'Din Tai Fung (Day 1)', details: 'Restaurant, lav audio interviews', type: 'Restaurant' },
  { month: 'Sep 2025', name: 'Primrose', details: 'Healthcare, organized and edit-ready', type: 'Healthcare' },
  { month: 'Sep 2025', name: 'Din Tai Fung (Day 2)', details: '299 files, every camera type', type: 'Restaurant' },
  { month: 'Oct 2025', name: 'Abrazo Healthcare', details: 'Emergency response, drone + cinema', type: 'Healthcare' },
  { month: 'Oct 2025', name: 'Ritz Carlton / LifeSkills', details: 'Luxury hospitality installation', type: 'Luxury' },
  { month: 'Oct 2025', name: 'Esplanade', details: 'Luxury property, 80+ photos', type: 'Luxury' },
  { month: 'Oct 2025', name: 'Fashion Square (3rd Visit)', details: 'Aerial DNG raw files', type: 'Commercial' },
  { month: 'Oct 2025', name: 'Laborers (2nd Shoot)', details: 'Crew follow-up', type: 'Team' },
  { month: 'Nov 2025', name: 'Breakthrough', details: 'Commercial drone coverage', type: 'Commercial' },
  { month: 'Nov 2025', name: 'CEVA', details: 'Industrial/logistics', type: 'Industrial' },
  { month: 'Dec 2025', name: 'Refined Gardens', details: 'Full multi-camera + audio', type: 'Luxury' },
  { month: 'Dec 2025', name: 'INEOS Grenadier', details: 'Premium brand, full coverage', type: 'Brand' },
  { month: 'Dec 2025', name: 'Refined Gardens (Return)', details: '446 photos', type: 'Luxury' },
  { month: 'Dec 2025', name: 'Teleferic + Tiffany\'s + Loro Piano', details: '3 venues, 1 shoot', type: 'Luxury' },
  { month: 'Dec 2025', name: 'LifeSkills', details: 'Multi-camera production', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower (Return)', details: '123 cinema clips, massive session', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower', details: 'Audio interviews', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower', details: 'Heavy cinema production', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower', details: 'Long takes', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower', details: 'BlackMagic footage', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower', details: 'Quick check-in', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Gilmore', details: 'Organized b-roll + interviews', type: 'Commercial' },
  { month: 'Feb 2026', name: 'Memorial Tower Insulation', details: '87 cinema clips, 157 photos', type: 'Healthcare' },
  { month: 'Feb 2026', name: 'Roka Akor', details: 'Premium restaurant shoot', type: 'Restaurant' },
  { month: 'Mar 2026', name: 'Crown / Memorial Tower', details: 'Most recent production', type: 'Healthcare' },
]

const highProfileClients = [
  'Apple Store', 'Ritz Carlton', 'Tiffany\'s', 'INEOS Grenadier', 'Roka Akor',
  'Din Tai Fung', 'Abrazo Healthcare', 'Banner Health', 'Louis Vuitton', 'Loro Piano', 'Memorial Tower',
]

const equipment = [
  { name: 'DJI Air 3 / Air 3S', type: 'Drone', detail: '25+ aerial sessions' },
  { name: 'DJI Ronin 4D', type: 'Cinema Camera', detail: 'Feature-film grade footage' },
  { name: 'Panasonic S5IIX', type: 'Photo/Video', detail: 'Hybrid stills and motion' },
  { name: 'DJI OSMO Action 3', type: 'Action Cam', detail: 'Dynamic POV coverage' },
  { name: 'BlackMagic Camera App', type: 'Mobile Cinema', detail: 'Professional mobile capture' },
  { name: 'DJI Mic', type: 'Professional Audio', detail: 'Crystal-clear interviews' },
]

const contentArsenal = [
  { number: 23, label: 'Finished Video Exports', desc: '18 branded social + 5 Memorial Tower edits' },
  { number: 57, label: 'Instagram Posts Published', desc: 'Reels, carousels, and static posts' },
  { number: 14, label: 'Professional Voiceovers', desc: 'Custom narration recordings' },
  { number: 30, label: 'Day Content Calendar', desc: 'Planned and ready to execute' },
  { number: 3, label: 'Brand Guidelines Versions', desc: 'Visual identity documentation' },
  { number: 6, label: 'Content Pillars Defined', desc: 'Strategic framework for all platforms' },
]

const valueComparison = [
  { item: '37 Professional Shoots', rate: '$800 avg per shoot', value: '$29,600' },
  { item: '23 Finished Video Exports', rate: '$500 avg per video', value: '$11,500' },
  { item: 'Custom Website', rate: 'Design + Dev + CMS', value: '$6,000' },
  { item: 'Brand & Content Strategy', rate: 'Guidelines + Pillars + Calendar', value: '$5,000' },
  { item: 'Social Media Management', rate: '11 months across 3 platforms', value: '$11,000' },
  { item: '3,138 Raw Files + 713 Photos', rate: 'Post-production archive', value: '$15,000' },
]

const hoursBreakdown = [
  { activity: 'On-Site Production', calc: '37 shoots x 4hrs avg', hours: 148 },
  { activity: 'Travel to Sites', calc: '37 shoots x 2hrs avg', hours: 74 },
  { activity: 'Post-Production', calc: 'Editing, color, export', hours: 111 },
  { activity: 'Website Design & Dev', calc: 'React + Firebase + Tailwind', hours: 80 },
  { activity: 'Content Strategy', calc: 'Planning + guidelines', hours: 40 },
  { activity: 'Social Media Management', calc: 'Posting + scheduling', hours: 40 },
]

const brandedVideos = [
  { title: 'Rooftop Unit Signs', category: 'Education' },
  { title: 'Pressure Test', category: 'The Work' },
  { title: '25 vs 40 Ton', category: 'Education' },
  { title: 'Startup Checklist', category: 'Education' },
  { title: 'Crane Day Prep', category: 'The Work' },
  { title: 'Inspection Signoff', category: 'The Work' },
  { title: '12-Story Pipe Run', category: 'The Work' },
  { title: 'PHX HVAC Numbers', category: 'Local' },
  { title: 'HVAC Lead Times', category: 'Education' },
  { title: 'Data Centers', category: 'The Work' },
  { title: 'Refrigerant Rules', category: 'Education' },
  { title: 'GC Expo', category: 'Social Proof' },
  { title: 'ABA Mixer', category: 'Social Proof' },
  { title: 'ACCA Conference', category: 'Social Proof' },
  { title: 'Crew / 500 Projects', category: 'Team' },
  { title: 'Day on Roof', category: 'The Work' },
  { title: 'The Shop', category: 'Team' },
  { title: 'Year in Review', category: 'Brand' },
]

const memorialTowerEdits = [
  { title: 'Memorial Tower v1', category: 'Project Showcase' },
  { title: 'Memorial Tower v2', category: 'Project Showcase' },
  { title: 'Memorial Tower v3', category: 'Project Showcase' },
  { title: 'Memorial Tower v4', category: 'Project Showcase' },
  { title: 'AE-13 The Drop', category: 'Social Edit' },
]

const contentPillars = [
  { name: 'The Work', desc: 'Jobs completed, equipment installed, rooftop units, pipe runs', icon: Flame },
  { name: 'Before / After', desc: 'Project transformations that show the impact of the work', icon: Layers },
  { name: 'Education / Tips', desc: 'Seasonal HVAC knowledge, maintenance tips, industry insights', icon: FileText },
  { name: 'Team / Trust', desc: 'Crew introductions, behind-the-scenes, company culture', icon: Users },
  { name: 'Local / Phoenix', desc: 'Desert context, Phoenix market, community presence', icon: MapPin },
  { name: 'Social Proof', desc: 'Reviews, testimonials, industry events, client wins', icon: Star },
]

const typeColors = {
  Commercial: ORANGE,
  Restaurant: '#F59E0B',
  Team: '#60A5FA',
  Retail: '#F87171',
  Healthcare: '#60A5FA',
  Brand: ORANGE,
  Industrial: MUTED,
  Luxury: '#F59E0B',
}

const videoCategoryColors = {
  'Education': '#60A5FA',
  'The Work': ORANGE,
  'Local': '#F59E0B',
  'Social Proof': MUTED,
  'Team': '#60A5FA',
  'Brand': ORANGE,
  'Project Showcase': '#60A5FA',
  'Social Edit': '#F59E0B',
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. NAV
// ═══════════════════════════════════════════════════════════════════════════════
function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-6 md:px-12"
      style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3">
        <span className="font-headline font-extrabold text-xl tracking-tight uppercase" style={{ color: CREAM }}>
          Ambition Mechanical
        </span>
      </div>
      <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5"
        style={{ color: ORANGE, border: `1px solid ${ORANGE}`, borderRadius: 100 }}>
        Performance Report
      </span>
    </nav>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. HERO
// ═══════════════════════════════════════════════════════════════════════════════
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #151510 50%, #0A0A0A 100%)' }}>
      <FilmGrain />

      {/* Dot pattern */}
      <div className="absolute inset-0 z-[1] opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 text-center px-6 max-w-[900px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-block font-mono text-sm font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ORANGE }}>
            Client Performance Report
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.15em]" style={{ color: MUTED }}>
            April 2025 - March 2026
          </span>
        </motion.div>

        <motion.h1
          className="font-headline font-extrabold uppercase leading-[0.92] tracking-tight mt-6 mb-6"
          style={{ color: CREAM, fontSize: 'clamp(40px, 8vw, 84px)', letterSpacing: '-0.03em' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Ambition<br />Mechanical<br />Services
        </motion.h1>

        <motion.p
          className="font-body text-lg md:text-xl max-w-[640px] mx-auto mb-4"
          style={{ color: MUTED, lineHeight: 1.6 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          11 months of creative production partnership. 37 shoots. 3,138 video files. 3 TB of footage. 713 photos. 1 custom website. Here is everything we have built together.
        </motion.p>

        <motion.div
          className="flex items-center justify-center gap-3 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em]" style={{ color: MUTED }}>Produced by</span>
          <span className="font-headline font-extrabold text-sm uppercase tracking-wide" style={{ color: ORANGE }}>AOM</span>
          <span style={{ color: MUTED, fontSize: 11 }}>|</span>
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em]" style={{ color: MUTED }}>Phoenix, AZ</span>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        onClick={() => document.getElementById('section-stats')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="font-body text-xs uppercase tracking-[0.08em]" style={{ color: MUTED }}>See the results</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}>
          <ChevronDown size={24} style={{ color: MUTED }} />
        </motion.div>
      </motion.div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. BY THE NUMBERS
// ═══════════════════════════════════════════════════════════════════════════════
function StatCard({ number, suffix = '', label, context, index }) {
  const [ref, visible] = useIntersect()
  const countValue = useCountUp(number, 1400, visible)

  return (
    <FadeIn delay={index * 0.1}>
      <div ref={ref} className="text-center p-8 relative overflow-hidden transition-all duration-200"
        style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = `${ORANGE}44` }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: ORANGE }} />
        <div className="font-headline font-extrabold" style={{ fontSize: 'clamp(36px, 5vw, 64px)', color: CREAM, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {visible ? countValue.toLocaleString() : 0}{suffix}
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mt-4" style={{ color: ORANGE }}>
          {label}
        </p>
        {context && (
          <p className="font-body text-base mt-2" style={{ color: MUTED, lineHeight: 1.5 }}>
            {context}
          </p>
        )}
      </div>
    </FadeIn>
  )
}

function StatsSection() {
  return (
    <section id="section-stats" className="relative py-24 md:py-32" style={{ background: BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            By the Numbers
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-12"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            11 Months of Output.
          </h2>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {heroStats.map((stat, i) => (
            <StatCard key={stat.label} {...stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  4. SOCIAL MEDIA PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════
function SocialSection() {
  const [ref, visible] = useIntersect()
  const postCount = useCountUp(57, 1400, visible)
  const followerCount = useCountUp(1646, 1400, visible)
  const followingCount = useCountUp(1181, 1400, visible)

  return (
    <section ref={ref} className="relative py-24 md:py-32 overflow-hidden" style={{ background: CARD_BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Social Media Performance
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-4"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Building the Brand Online.
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-lg mb-8 max-w-[700px]" style={{ color: MUTED, lineHeight: 1.6 }}>
            Every post is free advertising. You're paying for video production, but every view, like, and share is an eyeball on Ambition's brand at zero additional cost.
          </p>
        </FadeIn>

        {/* Impressions Banner */}
        <FadeIn delay={0.2}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="p-6 text-center" style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}33` }}>
              <p className="font-headline font-extrabold text-3xl md:text-4xl" style={{ color: ORANGE }}>~600K+</p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] mt-2" style={{ color: MUTED }}>Est. Total Views</p>
            </div>
            <div className="p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <p className="font-headline font-extrabold text-3xl md:text-4xl" style={{ color: CREAM }}>21.6K</p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] mt-2" style={{ color: MUTED }}>TikTok Likes</p>
            </div>
            <div className="p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <p className="font-headline font-extrabold text-3xl md:text-4xl" style={{ color: CREAM }}>4,912</p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] mt-2" style={{ color: MUTED }}>Total Followers</p>
            </div>
            <div className="p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <p className="font-headline font-extrabold text-3xl md:text-4xl" style={{ color: CREAM }}>$0</p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] mt-2" style={{ color: MUTED }}>Ad Spend</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.25}>
          <div className="p-5 mb-12" style={{ background: `${ORANGE}08`, borderLeft: `3px solid ${ORANGE}` }}>
            <p className="font-body text-base" style={{ color: TEXT, lineHeight: 1.6 }}>
              <strong style={{ color: CREAM }}>The eyeball math:</strong> TikTok's 21.6K likes at a ~4% engagement rate = roughly 540,000 video views. Add Instagram reach across 57 posts to 1,646 followers, plus LinkedIn impressions. All organic. All free. Every view is a potential service call that cost Ambition nothing beyond the retainer.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Instagram */}
          <FadeIn delay={0.2}>
            <div className="p-8 relative overflow-hidden h-full" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: ORANGE }} />
              <div className="flex items-center gap-3 mb-2">
                <Globe size={22} style={{ color: ORANGE }} />
                <span className="font-headline font-extrabold text-lg uppercase" style={{ color: CREAM }}>Instagram</span>
              </div>
              <p className="font-mono text-xs mb-6" style={{ color: MUTED }}>@ambition_air_conditioning</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="font-headline font-extrabold" style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: CREAM, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {visible ? postCount : 0}
                  </div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mt-2" style={{ color: MUTED }}>Posts</p>
                </div>
                <div>
                  <div className="font-headline font-extrabold" style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: CREAM, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {visible ? followerCount.toLocaleString() : 0}
                  </div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mt-2" style={{ color: MUTED }}>Followers</p>
                </div>
                <div>
                  <div className="font-headline font-extrabold" style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: CREAM, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {visible ? followingCount.toLocaleString() : 0}
                  </div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mt-2" style={{ color: MUTED }}>Following</p>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: ORANGE }}>Content Mix</p>
                <div className="flex flex-wrap gap-2">
                  {['Project Showcases', 'Before/After', 'Equipment', 'Team', 'Drone Aerials', 'Job Sites'].map(tag => (
                    <span key={tag} className="font-body text-xs font-medium px-3 py-1"
                      style={{ color: TEXT, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>{tag}</span>
                  ))}
                </div>
              </div>
              <p className="font-body text-sm mt-4" style={{ color: MUTED }}>100% organic growth. Zero paid promotion.</p>
            </div>
          </FadeIn>

          {/* TikTok */}
          <FadeIn delay={0.3}>
            <div className="p-8 relative overflow-hidden h-full" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: '#F59E0B' }} />
              <div className="flex items-center gap-3 mb-2">
                <Video size={22} style={{ color: '#F59E0B' }} />
                <span className="font-headline font-extrabold text-lg uppercase" style={{ color: CREAM }}>TikTok</span>
              </div>
              <p className="font-mono text-xs mb-6" style={{ color: MUTED }}>@ambitionmech</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="font-headline font-extrabold text-2xl md:text-3xl" style={{ color: CREAM }}>3,119</p>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] mt-1" style={{ color: MUTED }}>Followers</p>
                </div>
                <div>
                  <p className="font-headline font-extrabold text-2xl md:text-3xl" style={{ color: CREAM }}>21.6K</p>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] mt-1" style={{ color: MUTED }}>Likes</p>
                </div>
                <div>
                  <p className="font-headline font-extrabold text-2xl md:text-3xl" style={{ color: CREAM }}>317</p>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] mt-1" style={{ color: MUTED }}>Following</p>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: '#F59E0B' }}>Content Types</p>
                <div className="flex flex-wrap gap-2">
                  {['HVAC Repairs', 'Project Showcases', 'Behind-the-Scenes', 'Equipment Installs'].map(tag => (
                    <span key={tag} className="font-body text-xs font-medium px-3 py-1"
                      style={{ color: TEXT, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* LinkedIn */}
          <FadeIn delay={0.4}>
            <div className="p-8 relative overflow-hidden h-full" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: '#60A5FA' }} />
              <div className="flex items-center gap-3 mb-2">
                <Users size={22} style={{ color: '#60A5FA' }} />
                <span className="font-headline font-extrabold text-lg uppercase" style={{ color: CREAM }}>LinkedIn</span>
              </div>
              <p className="font-mono text-xs mb-6" style={{ color: MUTED }}>Ambition Mechanical Services</p>

              <div className="mb-6">
                <p className="font-headline font-extrabold text-2xl md:text-3xl" style={{ color: CREAM }}>147</p>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] mt-1" style={{ color: MUTED }}>Followers</p>
              </div>

              <p className="font-body text-sm mb-6" style={{ color: TEXT, lineHeight: 1.6 }}>
                Company page established. Authority post strategy positions Mo as the go-to commercial HVAC expert in Phoenix. 11-50 employees. Tempe, AZ.
              </p>

              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: '#60A5FA' }}>Strategy</p>
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Frequency', value: '2 posts/week' },
                    { label: 'Focus', value: 'HVAC business insights' },
                    { label: 'Positioning', value: 'Phoenix market authority' },
                    { label: 'Content', value: 'Industry expertise + project wins' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="font-body text-sm" style={{ color: MUTED }}>{item.label}</span>
                      <span className="font-body text-sm font-semibold" style={{ color: TEXT }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 4 }}>
                <p className="font-body text-sm" style={{ color: TEXT, lineHeight: 1.5 }}>
                  Content calendar built. Authority post drafts written and ready for publishing cycle.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  5. BRANDED VIDEO LIBRARY
// ═══════════════════════════════════════════════════════════════════════════════
const sitesVisited = [
  { name: 'Apple Store Chandler', type: 'Retail', visits: 2 },
  { name: 'Ritz Carlton', type: 'Luxury Hospitality', visits: 1 },
  { name: 'Tiffany\'s', type: 'Luxury Retail', visits: 1 },
  { name: 'Din Tai Fung, Scottsdale', type: 'Restaurant', visits: 3 },
  { name: 'Roka Akor', type: 'Restaurant', visits: 1 },
  { name: 'INEOS Grenadier', type: 'Industrial', visits: 1 },
  { name: 'Louis Vuitton, Fashion Square', type: 'Luxury Retail', visits: 3 },
  { name: 'Loro Piano', type: 'Luxury Retail', visits: 1 },
  { name: 'Teleferic Barcelona', type: 'Restaurant', visits: 1 },
  { name: 'Memorial Tower Senior Apts', type: 'Healthcare', visits: 9 },
  { name: 'Abrazo Healthcare', type: 'Healthcare', visits: 1 },
  { name: 'Banner Health', type: 'Healthcare', visits: 1 },
  { name: 'Primrose', type: 'Healthcare', visits: 1 },
  { name: 'Esplanade', type: 'Luxury Property', visits: 1 },
  { name: 'Novus Place / The Melt', type: 'Restaurant', visits: 2 },
  { name: 'Sossaman Warehouse', type: 'Commercial', visits: 1 },
  { name: 'Arrowhead', type: 'Industrial', visits: 1 },
  { name: 'Breakthrough', type: 'Commercial', visits: 1 },
  { name: 'CEVA', type: 'Industrial', visits: 1 },
  { name: 'Refined Gardens', type: 'Luxury Residential', visits: 2 },
  { name: 'LifeSkills', type: 'Commercial', visits: 2 },
  { name: 'Gilmore', type: 'Commercial', visits: 1 },
  { name: 'O\'Reilly Auto Parts', type: 'Retail', visits: 1 },
  { name: 'Crown', type: 'Mixed Use', visits: 1 },
  { name: 'Ambition Office', type: 'Brand / Team', visits: 1 },
]

function SitesVisitedSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Sites Visited
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-4"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            25+ Locations. 37 Shoots.
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-lg mb-12 max-w-[700px]" style={{ color: MUTED, lineHeight: 1.6 }}>
            Every one of these locations has been professionally documented with cinema cameras, drone aerials, and professional audio. This is Ambition's portfolio brought to life.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sitesVisited.map((site, i) => (
            <FadeIn key={site.name} delay={Math.min(i * 0.03, 0.5)}>
              <div className="flex items-start gap-3 p-5 transition-all duration-200"
                style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${ORANGE}44` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
              >
                <MapPin size={16} style={{ color: ORANGE, flexShrink: 0, marginTop: 3 }} />
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold text-base" style={{ color: CREAM }}>{site.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-xs uppercase tracking-[0.1em]" style={{ color: MUTED }}>{site.type}</span>
                    {site.visits > 1 && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5" style={{ color: ORANGE, background: `${ORANGE}15`, borderRadius: 3 }}>
                        {site.visits} visits
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  6. CONTENT STRATEGY (6 Pillars)
// ═══════════════════════════════════════════════════════════════════════════════
function ContentStrategySection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: WARM_BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Content Strategy
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-4"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            6 Pillars. Infinite Content.
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-lg mb-12 max-w-[700px]" style={{ color: MUTED, lineHeight: 1.6 }}>
            Every piece of content maps to one of six strategic pillars. This framework ensures Ambition Mechanical's social presence is balanced, intentional, and always on-brand.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {contentPillars.map((pillar, i) => {
            const Icon = pillar.icon
            return (
              <FadeIn key={pillar.name} delay={i * 0.08}>
                <div className="p-8 relative overflow-hidden h-full transition-all duration-200"
                  style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${ORANGE}44` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: ORANGE }} />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${ORANGE}15` }}>
                      <Icon size={20} style={{ color: ORANGE }} />
                    </div>
                    <h3 className="font-headline font-extrabold text-lg uppercase" style={{ color: CREAM }}>{pillar.name}</h3>
                  </div>
                  <p className="font-body text-base" style={{ color: MUTED, lineHeight: 1.6 }}>{pillar.desc}</p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  7. HIGH-PROFILE CLIENTS
// ═══════════════════════════════════════════════════════════════════════════════
function ClientsSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1000px] mx-auto px-6 md:px-12 text-center">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Where We Have Shot
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-4"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Names That Speak for Themselves.
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-lg mb-10 max-w-[700px] mx-auto" style={{ color: MUTED, lineHeight: 1.6 }}>
            Ambition Mechanical's client roster includes some of the most recognized brands in hospitality, retail, healthcare, and luxury. AOM has documented work at all of them.
          </p>
        </FadeIn>

        <div className="flex flex-wrap justify-center gap-3">
          {highProfileClients.map((client, i) => (
            <FadeIn key={client} delay={i * 0.06}>
              <div className="px-6 py-3 font-headline font-extrabold text-base uppercase tracking-wide transition-all duration-200"
                style={{ background: CARD_BG, border: `1px solid ${BORDER}`, color: CREAM }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${ORANGE}44` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
              >
                {client}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  8. 37 SHOOTS TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════
function ShootsSection() {
  const [expanded, setExpanded] = useState(false)
  const visibleShoots = expanded ? shoots : shoots.slice(0, 12)

  return (
    <section className="relative py-24 md:py-32" style={{ background: CARD_BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Production Log
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-4"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            37 Shoots. 11 Months. Zero Missed.
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-lg mb-12 max-w-[700px]" style={{ color: MUTED, lineHeight: 1.6 }}>
            Every shoot logged, organized, and delivered. From the first day at Fashion Square to the latest Memorial Tower session.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleShoots.map((shoot, i) => (
            <FadeIn key={`${shoot.name}-${i}`} delay={Math.min(i * 0.04, 0.5)}>
              <div className="p-5 relative overflow-hidden transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${ORANGE}44` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
              >
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: typeColors[shoot.type] || ORANGE }} />
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.15em]" style={{ color: MUTED }}>{shoot.month}</span>
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] px-2 py-0.5"
                    style={{ color: typeColors[shoot.type] || ORANGE, border: `1px solid ${typeColors[shoot.type] || ORANGE}` }}>
                    {shoot.type}
                  </span>
                </div>
                <h3 className="font-headline font-extrabold text-base uppercase tracking-wide mb-1" style={{ color: CREAM }}>{shoot.name}</h3>
                <p className="font-body text-sm" style={{ color: MUTED, lineHeight: 1.5 }}>{shoot.details}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        {!expanded && (
          <FadeIn delay={0.3}>
            <div className="text-center mt-8">
              <button onClick={() => setExpanded(true)}
                className="font-headline font-extrabold text-sm uppercase tracking-wide inline-flex items-center gap-2 px-8 py-4 transition-all duration-200 cursor-pointer"
                style={{ color: ORANGE, background: 'none', border: `2px solid ${ORANGE}` }}
                onMouseEnter={e => { e.currentTarget.style.background = ORANGE; e.currentTarget.style.color = CREAM }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = ORANGE }}
              >
                View All 37 Shoots
                <ChevronDown size={18} />
              </button>
            </div>
          </FadeIn>
        )}

        {expanded && (
          <div className="text-center mt-6">
            <button onClick={() => setExpanded(false)}
              className="font-body text-sm uppercase tracking-wide cursor-pointer"
              style={{ color: MUTED, background: 'none', border: 'none' }}>
              Collapse
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  9. CONTENT ARSENAL
// ═══════════════════════════════════════════════════════════════════════════════
function ContentArsenalSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Content Arsenal
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-4"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Ready to Deploy.
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-lg mb-12 max-w-[700px]" style={{ color: MUTED, lineHeight: 1.6 }}>
            Beyond shoots and edits, AOM has built a complete content system for Ambition Mechanical. Templates, strategies, calendars, and voice recordings, all designed to scale.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contentArsenal.map((item, i) => (
            <FadeIn key={item.label} delay={i * 0.08}>
              <div className="p-8 relative overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: ORANGE }} />
                <div className="font-headline font-extrabold" style={{ fontSize: 48, color: CREAM, lineHeight: 1 }}>
                  {item.number}
                </div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mt-3" style={{ color: ORANGE }}>{item.label}</p>
                <p className="font-body text-base mt-2" style={{ color: MUTED }}>{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.4}>
          <div className="mt-10 p-8 max-w-[600px]" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-4" style={{ color: MUTED }}>Also Delivered</p>
            <div className="flex flex-col gap-3">
              {['Brand guidelines documentation (3 versions)', 'LinkedIn authority post drafts', 'Content strategy blueprint', '30-day content calendar with 28 planned pieces'].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <ArrowRight size={16} style={{ color: ORANGE, flexShrink: 0, marginTop: 2 }} />
                  <span className="font-body text-base" style={{ color: TEXT, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  10. THE WEBSITE
// ═══════════════════════════════════════════════════════════════════════════════
function WebsiteSection() {
  return (
    <section className="relative py-24 md:py-32" style={{ background: WARM_BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1000px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Web Development
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-12"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            A Website Built From Scratch.
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="p-10 relative overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: ORANGE }} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-4" style={{ color: MUTED }}>Custom-Built for Ambition</p>
                <h3 className="font-headline font-extrabold text-3xl uppercase mb-4" style={{ color: CREAM }}>ambitionac.com</h3>
                <p className="font-body text-lg mb-6" style={{ color: MUTED, lineHeight: 1.6 }}>
                  A modern, mobile-first website showcasing Ambition Mechanical's services, projects, and team. Built with enterprise-grade technology and launched in March 2026.
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    'React + Firebase + Tailwind CSS',
                    'CMS admin panel for content updates',
                    'Mobile responsive across all devices',
                    'SEO optimized for local search',
                    'Contact form with lead capture',
                    'Projects showcase with photo galleries',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 flex-shrink-0" style={{ background: ORANGE }} />
                      <span className="font-body text-base" style={{ color: TEXT }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-center items-center text-center">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-2" style={{ color: MUTED }}>Launched</p>
                <p className="font-headline font-extrabold text-2xl uppercase" style={{ color: CREAM }}>March 6, 2026</p>
                <div className="w-12 h-0.5 my-4" style={{ background: ORANGE }} />
                <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-2" style={{ color: MUTED }}>Market Value</p>
                <p className="font-headline font-extrabold text-4xl" style={{ color: ORANGE }}>$4,000 - $8,000</p>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  11. EQUIPMENT
// ═══════════════════════════════════════════════════════════════════════════════
function EquipmentSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1000px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Production Gear
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-12"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Professional-Grade Tools.
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item, i) => (
            <FadeIn key={item.name} delay={i * 0.08}>
              <div className="p-6 transition-all duration-200"
                style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${ORANGE}44` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Camera size={20} style={{ color: ORANGE }} />
                  <div>
                    <h3 className="font-headline font-extrabold text-base uppercase" style={{ color: CREAM }}>{item.name}</h3>
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.15em]" style={{ color: ORANGE }}>{item.type}</p>
                  </div>
                </div>
                <p className="font-body text-base" style={{ color: MUTED }}>{item.detail}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  12. MARKET VALUE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════
function ValueSection() {
  const [ref, visible] = useIntersect()
  const marketValue = useCountUp(78100, 2000, visible)
  const amountPaid = useCountUp(25000, 1800, visible)

  return (
    <section ref={ref} className="relative py-24 md:py-32" style={{ background: CARD_BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Value Analysis
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-4"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            What This is Worth.
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-lg mb-12 max-w-[700px]" style={{ color: MUTED, lineHeight: 1.6 }}>
            At standard Phoenix market rates, here is the value AOM has delivered in 11 months.
          </p>
        </FadeIn>

        {/* Table */}
        <FadeIn delay={0.2}>
          <div className="overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-left p-5" style={{ background: BG, color: MUTED }}>Deliverable</th>
                  <th className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-left p-5" style={{ background: BG, color: MUTED }}>Market Rate</th>
                  <th className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-right p-5" style={{ background: ORANGE, color: CREAM }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {valueComparison.map((row, i) => (
                  <tr key={row.item} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : BG }}>
                    <td className="p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <span className="font-body text-base font-semibold" style={{ color: TEXT }}>{row.item}</span>
                    </td>
                    <td className="p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <span className="font-body text-sm" style={{ color: MUTED }}>{row.rate}</span>
                    </td>
                    <td className="p-4 text-right" style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <span className="font-headline font-extrabold text-lg" style={{ color: CREAM }}>{row.value}</span>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: BG }}>
                  <td colSpan={2} className="p-5">
                    <span className="font-headline font-extrabold text-xl uppercase" style={{ color: CREAM }}>Estimated Market Value</span>
                  </td>
                  <td className="p-5 text-right">
                    <span className="font-headline font-extrabold text-2xl" style={{ color: ORANGE }}>$78,100+</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </FadeIn>

        {/* Big Comparison */}
        <FadeIn delay={0.3}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mt-16">
            <div className="text-center p-8" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: MUTED }}>Market Value</p>
              <p className="font-headline font-extrabold" style={{ fontSize: 'clamp(36px, 5vw, 56px)', color: CREAM }}>
                ${visible ? marketValue.toLocaleString() : '0'}+
              </p>
            </div>
            <div className="text-center">
              <p className="font-headline font-extrabold text-2xl" style={{ color: MUTED }}>vs</p>
            </div>
            <div className="text-center p-8" style={{ background: 'rgba(255,255,255,0.03)', border: `2px solid ${ORANGE}` }}>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: MUTED }}>Amount Paid</p>
              <p className="font-headline font-extrabold" style={{ fontSize: 'clamp(36px, 5vw, 56px)', color: ORANGE }}>
                ${visible ? amountPaid.toLocaleString() : '0'}
              </p>
              <p className="font-body text-sm mt-2" style={{ color: MUTED }}>11 months x $2,000/month</p>
            </div>
          </div>
        </FadeIn>

        {/* ROI */}
        <FadeIn delay={0.4}>
          <div className="text-center mt-12">
            <div className="inline-block p-6 px-12" style={{ background: BG, border: `2px solid ${ORANGE}` }}>
              <p className="font-headline font-extrabold" style={{ fontSize: 'clamp(48px, 6vw, 72px)', color: ORANGE }}>3x</p>
              <p className="font-headline font-extrabold text-base uppercase tracking-wide mt-2" style={{ color: CREAM }}>Return on Investment</p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  13. HOURS INVESTED
// ═══════════════════════════════════════════════════════════════════════════════
function HoursSection() {
  const [ref, visible] = useIntersect()
  const totalHours = useCountUp(493, 1800, visible)

  return (
    <section ref={ref} className="relative py-24 md:py-32" style={{ background: BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1000px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Time Invested
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-12"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Nearly 500 Hours of Work.
          </h2>
        </FadeIn>

        <div className="flex flex-col gap-3">
          {hoursBreakdown.map((item, i) => (
            <FadeIn key={item.activity} delay={i * 0.08}>
              <div className="p-5 flex items-center justify-between flex-wrap gap-3"
                style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
                <div>
                  <h3 className="font-headline font-extrabold text-base uppercase" style={{ color: CREAM }}>{item.activity}</h3>
                  <p className="font-body text-sm mt-1" style={{ color: MUTED }}>{item.calc}</p>
                </div>
                <div className="font-headline font-extrabold text-3xl" style={{ color: ORANGE, fontVariantNumeric: 'tabular-nums' }}>
                  {item.hours}<span className="text-base ml-1" style={{ color: MUTED }}>hrs</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.5}>
          <div className="mt-6 p-8 flex items-center justify-between flex-wrap gap-4"
            style={{ background: CARD_BG, border: `2px solid ${ORANGE}` }}>
            <div>
              <p className="font-headline font-extrabold text-xl uppercase" style={{ color: CREAM }}>Total Estimated Hours</p>
              <p className="font-body text-base mt-1" style={{ color: MUTED }}>Effective rate: ~$50.71/hour (market rate: $100-200/hr)</p>
            </div>
            <div className="font-headline font-extrabold" style={{ fontSize: 'clamp(48px, 6vw, 64px)', color: ORANGE, fontVariantNumeric: 'tabular-nums' }}>
              ~{visible ? totalHours : 0}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  14. GETTING THE PHONE TO RING (SERVICE CALL PLAN)
// ═══════════════════════════════════════════════════════════════════════════════
function ServiceCallPlanSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden" style={{ background: WARM_BG }}>
      <FilmGrain />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">

        {/* Header */}
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
            Getting the Phone to Ring
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase tracking-tight mt-4 mb-4"
            style={{ color: CREAM, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            A Content-First Approach to Service Calls.
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-lg mb-16 max-w-[700px]" style={{ color: MUTED, lineHeight: 1.6 }}>
            Ambition wants the phone ringing for service calls, especially from kitchens, restaurants, and commercial facilities before summer. Here is the plan to make that happen.
          </p>
        </FadeIn>

        {/* The Competitive Edge Card */}
        <FadeIn delay={0.2}>
          <div className="p-8 md:p-10 mb-12 relative overflow-hidden" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: ORANGE }} />
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: ORANGE }}>
              The Competitive Edge
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-headline font-extrabold text-2xl uppercase mb-6" style={{ color: CREAM }}>
                  Your Competitors Are Already Running Ads. You Have Better Ammunition.
                </h3>
                <p className="font-body text-base mb-6" style={{ color: MUTED, lineHeight: 1.6 }}>
                  We scraped the Meta Ad Library on March 10, 2026. Here is what we found across the top 10 Arizona HVAC companies.
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    '7 out of 10 major AZ HVAC companies are running Meta ads right now',
                    'Ambition is NOT running any. Wide open lane.',
                    'Most competitors use stock photos and generic copy',
                    'Ambition has 3,138 real video files from 37 actual job sites',
                    'Authentic footage converts 2-3x better than stock',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 size={18} style={{ color: ORANGE, flexShrink: 0, marginTop: 2 }} />
                      <span className="font-body text-base" style={{ color: TEXT, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {/* Cost comparison cards */}
                <div className="p-6" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: '#60A5FA' }}>Facebook Ads</p>
                  <div className="font-headline font-extrabold text-4xl mb-1" style={{ color: CREAM }}>$0.69</div>
                  <p className="font-body text-base" style={{ color: MUTED }}>Average cost per click</p>
                  <p className="font-body text-base mt-2" style={{ color: TEXT }}>$18-45 cost per lead</p>
                </div>
                <div className="p-6" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-3" style={{ color: '#F87171' }}>Google Ads</p>
                  <div className="font-headline font-extrabold text-4xl mb-1" style={{ color: CREAM }}>$29-33</div>
                  <p className="font-body text-base" style={{ color: MUTED }}>Average cost per click (42x more expensive)</p>
                  <p className="font-body text-base mt-2" style={{ color: TEXT }}>$100-250 cost per lead</p>
                </div>
                <div className="p-4 text-center" style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}33` }}>
                  <p className="font-headline font-extrabold text-lg uppercase" style={{ color: ORANGE }}>
                    Facebook is 42x cheaper per click than Google
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Three Phases */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12">
          {/* Phase 1 */}
          <FadeIn delay={0.3}>
            <div className="p-8 relative overflow-hidden h-full" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: ORANGE }} />
              <div className="flex items-center gap-3 mb-2">
                <Megaphone size={22} style={{ color: ORANGE }} />
                <span className="font-mono text-xs font-bold uppercase tracking-[0.15em]" style={{ color: ORANGE }}>Phase 1</span>
              </div>
              <h3 className="font-headline font-extrabold text-xl uppercase mb-2" style={{ color: CREAM }}>Content-First</h3>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-4" style={{ color: MUTED }}>Weeks 1-4 | $0 Additional Cost</p>
              <div className="flex flex-col gap-3">
                {[
                  'Deploy the 18 branded videos to Instagram + TikTok (5/week)',
                  'Launch LinkedIn authority posting (2/week)',
                  'Optimize Google Business Profile with project photos + videos',
                  'SEO-driven content targeting "commercial HVAC repair Phoenix," "restaurant refrigeration Phoenix"',
                  'Leverage the 3,138 clips and 713 photos already captured',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: ORANGE }} />
                    <span className="font-body text-sm" style={{ color: TEXT, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Phase 2 */}
          <FadeIn delay={0.4}>
            <div className="p-8 relative overflow-hidden h-full" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: '#F59E0B' }} />
              <div className="flex items-center gap-3 mb-2">
                <Target size={22} style={{ color: '#F59E0B' }} />
                <span className="font-mono text-xs font-bold uppercase tracking-[0.15em]" style={{ color: '#F59E0B' }}>Phase 2</span>
              </div>
              <h3 className="font-headline font-extrabold text-xl uppercase mb-2" style={{ color: CREAM }}>Targeted Ads</h3>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-4" style={{ color: MUTED }}>Weeks 4-8 | $500-1,500/mo Ad Spend</p>
              <div className="flex flex-col gap-3">
                {[
                  'Facebook/Instagram ads using existing professional footage',
                  'Video ads using real job site footage (not stock photos)',
                  'Target: Restaurant owners, facility managers, property managers within 30 miles',
                  'Most HVAC companies use stock photos. Ambition has 37 real shoots.',
                  'Ad formats: video ads, carousel, lead forms',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#F59E0B' }} />
                    <span className="font-body text-sm" style={{ color: TEXT, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Phase 3 */}
          <FadeIn delay={0.5}>
            <div className="p-8 relative overflow-hidden h-full" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: '#60A5FA' }} />
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp size={22} style={{ color: '#60A5FA' }} />
                <span className="font-mono text-xs font-bold uppercase tracking-[0.15em]" style={{ color: '#60A5FA' }}>Phase 3</span>
              </div>
              <h3 className="font-headline font-extrabold text-xl uppercase mb-2" style={{ color: CREAM }}>Scale</h3>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] mb-4" style={{ color: MUTED }}>Month 3+ | Based on Results</p>
              <div className="flex flex-col gap-3">
                {[
                  'Retarget website visitors',
                  'Lookalike audiences from service call leads',
                  'Seasonal push for summer cooling season',
                  'Landing pages for each service vertical (restaurants, kitchens, cold storage)',
                  'Scale what is working, cut what is not',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#60A5FA' }} />
                    <span className="font-body text-sm" style={{ color: TEXT, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Recommended Budget + ROI Projection */}
        <FadeIn delay={0.55}>
          <div className="p-8 md:p-10 relative overflow-hidden" style={{ background: CARD_BG, border: `2px solid ${ORANGE}` }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ORANGE }}>
                  Recommended Monthly Ad Budget
                </p>
                <div className="font-headline font-extrabold mb-4" style={{ fontSize: 'clamp(36px, 5vw, 56px)', color: CREAM }}>
                  $500 - $1,500
                </div>
                <p className="font-body text-base" style={{ color: MUTED, lineHeight: 1.6 }}>per month in ad spend</p>

                <div className="mt-6 flex flex-col gap-3">
                  <div className="flex justify-between items-center p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                    <span className="font-body text-base" style={{ color: MUTED }}>At $0.69 CPC</span>
                    <span className="font-headline font-extrabold text-lg" style={{ color: CREAM }}>725-2,174 clicks/mo</span>
                  </div>
                  <div className="flex justify-between items-center p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                    <span className="font-body text-base" style={{ color: MUTED }}>At $18-45 CPL</span>
                    <span className="font-headline font-extrabold text-lg" style={{ color: CREAM }}>11-83 leads/mo</span>
                  </div>
                  <div className="flex justify-between items-center p-4" style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}33` }}>
                    <span className="font-body text-base" style={{ color: TEXT }}>5 converted calls at $500-2,000 avg</span>
                    <span className="font-headline font-extrabold text-lg" style={{ color: ORANGE }}>$2,500-10,000/mo</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <div className="p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: ORANGE }}>
                    The Bottom Line
                  </p>
                  <p className="font-body text-lg mb-6" style={{ color: TEXT, lineHeight: 1.6 }}>
                    You already have the ammunition. The 37 shoots and 3,138 video files ARE the ad library.
                  </p>
                  <div className="p-4" style={{ background: `${ORANGE}10`, border: `1px solid ${ORANGE}33` }}>
                    <p className="font-body text-base font-semibold" style={{ color: CREAM, lineHeight: 1.5 }}>
                      Most companies spend $5,000-15,000 just getting the footage you already have. That investment is done. Now it is time to put it to work.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Who is advertising */}
        <FadeIn delay={0.6}>
          <div className="mt-10 p-8" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ color: ORANGE }}>
              Live Data: Arizona HVAC Companies Running Meta Ads (March 2026)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'George Brazil', ads: '4 active campaigns', status: 'running' },
                { name: 'Chas Roberts', ads: '2 active campaigns', status: 'running' },
                { name: 'American Home Water & Air', ads: '4 active campaigns', status: 'running' },
                { name: "Brewer's AC & Heating", ads: '5 active campaigns', status: 'running' },
                { name: 'Ideal Air Conditioning', ads: '6 active (18+ months)', status: 'running' },
                { name: 'Ambient Edge HVAC', ads: '4 active campaigns', status: 'running' },
                { name: "Francisco's Cooling", ads: '1 active campaign', status: 'running' },
                { name: 'Pueblo Mechanical', ads: 'Just launched', status: 'running' },
                { name: 'Parker & Sons ($210M+)', ads: 'No active ads', status: 'none' },
                { name: 'Ambition Mechanical', ads: 'Not running any', status: 'opportunity' },
              ].map((company, i) => (
                <div key={i} className="flex items-center justify-between p-4"
                  style={{
                    background: company.status === 'opportunity' ? `${ORANGE}10` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${company.status === 'opportunity' ? ORANGE + '44' : BORDER}`,
                  }}>
                  <div>
                    <span className="font-body text-sm font-semibold" style={{ color: company.status === 'opportunity' ? ORANGE : TEXT }}>{company.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.1em]"
                    style={{ color: company.status === 'opportunity' ? ORANGE : company.status === 'none' ? MUTED : '#60A5FA' }}>
                    {company.ads}
                  </span>
                </div>
              ))}
            </div>
            <p className="font-body text-sm mt-4" style={{ color: MUTED }}>
              Source: Meta Ad Library, live data pulled March 10, 2026
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  15. FOOTER
// ═══════════════════════════════════════════════════════════════════════════════
function FooterSection() {
  return (
    <footer className="relative py-16 text-center" style={{ background: BG, borderTop: `1px solid ${BORDER}` }}>
      <div className="max-w-[600px] mx-auto px-6">
        <FadeIn>
          <div className="w-12 h-0.5 mx-auto mb-6" style={{ background: ORANGE }} />
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase text-2xl md:text-3xl tracking-tight"
            style={{ color: CREAM, letterSpacing: '-0.02em' }}>
            Built by AOM. Built to Last.
          </h2>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="font-body text-lg mt-4 max-w-[540px] mx-auto" style={{ color: MUTED, lineHeight: 1.6 }}>
            This is what 11 months of dedicated creative production looks like. One team. One vision. Hundreds of hours of work invested in making Ambition Mechanical look as good as the work they do.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a
              href="https://www.instagram.com/ambition_air_conditioning/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-headline font-extrabold text-sm uppercase tracking-wide px-7 py-3.5 transition-all duration-200"
              style={{ color: CREAM, border: `2px solid ${CREAM}`, textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.background = CREAM; e.currentTarget.style.color = BG }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = CREAM }}
            >
              Instagram
            </a>
            <a
              href="https://ambitionac.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-headline font-extrabold text-sm uppercase tracking-wide px-7 py-3.5 transition-all duration-200"
              style={{ color: BG, background: ORANGE, border: `2px solid ${ORANGE}`, textDecoration: 'none' }}
            >
              ambitionac.com
            </a>
          </div>
        </FadeIn>
        <FadeIn delay={0.4}>
          <p className="font-body text-xs mt-12" style={{ color: MUTED, opacity: 0.4 }}>
            &copy; {new Date().getFullYear()} AOM (Ahead of Market). Prepared for Ambition Mechanical Services.
          </p>
        </FadeIn>
      </div>
    </footer>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function AmbitionPerformance() {
  useSEO()

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <NavBar />
      <HeroSection />
      <StatsSection />
      <SocialSection />
      <SitesVisitedSection />
      <ContentStrategySection />
      <ClientsSection />
      <ShootsSection />
      <ContentArsenalSection />
      <WebsiteSection />
      <EquipmentSection />
      <ValueSection />
      <HoursSection />
      <ServiceCallPlanSection />
      <FooterSection />
    </div>
  )
}
