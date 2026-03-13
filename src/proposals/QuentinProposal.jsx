import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronDown, Camera, Video, Home, Phone, Mail,
  CheckCircle2, ArrowRight, Calendar, Image, Sun,
  Globe, ShoppingCart, Users, Clock, DollarSign,
  Smartphone, TrendingUp, MapPin
} from 'lucide-react'

// ─── BRAND CONSTANTS ────────────────────────────────────────────────────────
const ORANGE = '#E85D26'
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

// ─── NAV BAR ────────────────────────────────────────────────────────────────
function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-6 md:px-12"
      style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <a href="https://aheadofmarket.com" className="flex items-center gap-2">
        <span className="font-headline font-extrabold text-xl tracking-tight" style={{ color: CREAM }}>AOM</span>
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #151510 50%, #0A0A0A 100%)' }}>
      <FilmGrain />

      {/* Subtle background pattern */}
      <div className="absolute inset-0 z-[1] opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 text-center px-6 max-w-[900px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
        >
          <span className="inline-block font-mono text-sm font-bold uppercase tracking-[0.2em] mb-4"
            style={{ color: ORANGE }}>
            Prepared for Quentin
          </span>
        </motion.div>

        <motion.h1
          className="font-headline font-extrabold uppercase leading-[0.92] tracking-tight mb-6"
          style={{ color: CREAM, fontSize: 'clamp(36px, 7vw, 72px)', letterSpacing: '-0.03em' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Property<br />Promotion Plan
        </motion.h1>

        <motion.p
          className="font-body text-lg md:text-xl max-w-[600px] mx-auto mb-2"
          style={{ color: MUTED, lineHeight: 1.5 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          Professional media package, platform playbooks, and a clear plan to get your property seen on Zillow, Airbnb, and Facebook.
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

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        onClick={() => document.getElementById('the-deal')?.scrollIntoView({ behavior: 'smooth' })}
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

// ─── THE DEAL SECTION ───────────────────────────────────────────────────────
function TheDealSection() {
  const stats = [
    { value: '25-30', label: 'Edited Photos' },
    { value: '3', label: 'Video Pieces' },
    { value: '3', label: 'Platforms' },
    { value: 'FREE', label: 'Media Package' },
  ]

  return (
    <section id="the-deal" className="relative py-24 md:py-32" style={{ background: CARD_BG }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <FadeIn>
              <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
                The Deal
              </span>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4"
                style={{ color: CREAM, letterSpacing: '-0.03em' }}>
                Media On Us.<br />You Own It.
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="font-body text-base md:text-lg mt-6 max-w-[50ch]" style={{ color: MUTED, lineHeight: 1.6 }}>
                We're shooting your property photos and video. The media is on us. You get professional-grade content you can use however you want across Zillow, Airbnb, Facebook, or anywhere else.
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <p className="font-body text-base md:text-lg mt-4 max-w-[50ch]" style={{ color: MUTED, lineHeight: 1.6 }}>
                Below is the full shot plan, a guide on how to use the media on each platform, and an optional add-on if you'd rather have us handle the promotion side too.
              </p>
            </FadeIn>
          </div>

          <div className="grid grid-cols-2 gap-6 md:gap-8">
            {stats.map((stat, i) => (
              <FadeIn key={stat.label} delay={0.3 + i * 0.1}>
                <div className="pl-5" style={{ borderLeft: `2px solid ${ORANGE}33` }}>
                  <div className="font-headline font-extrabold text-3xl md:text-4xl" style={{ color: ORANGE, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
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

// ─── MEDIA PACKAGE SECTION ──────────────────────────────────────────────────
function MediaPackageSection() {
  const categories = [
    {
      icon: Sun,
      title: 'Exterior',
      count: '8-10 shots',
      items: [
        'Front of property, straight-on and angled (2 shots)',
        'Backyard / outdoor living space (2 shots)',
        'Driveway / parking / street view (1-2 shots)',
        'Standout features: pool, patio, landscaping, fire pit (2-3 shots)',
        'Golden hour hero shot (the one that makes people stop scrolling)',
      ],
    },
    {
      icon: Home,
      title: 'Interior',
      count: '10-14 shots',
      items: [
        'Living room / great room (2 shots, different angles)',
        'Kitchen (2-3 shots: wide, countertops, appliances)',
        'Primary bedroom (2 shots)',
        'Primary bathroom (1-2 shots)',
        'Additional bedrooms and bathrooms (1 shot each)',
        'Dining area (1 shot)',
      ],
    },
    {
      icon: Image,
      title: 'Details & Lifestyle',
      count: '4-6 shots',
      items: [
        'Natural light moments (windows, sun coming in)',
        'Unique features: built-ins, fixtures, upgraded finishes',
        'Storage / closet space (if notable)',
        'Bonus rooms: office, gym, den, garage',
      ],
    },
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: BG }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] block text-center" style={{ color: ORANGE }}>
            Media Package
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4 text-center"
            style={{ color: CREAM, letterSpacing: '-0.03em' }}>
            Photography Shot List
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-base text-center mt-4 max-w-[50ch] mx-auto" style={{ color: MUTED }}>
            25-30 edited photos. All color corrected, exposure balanced, and cropped for platform use. Full-resolution files plus web-optimized versions.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 md:mt-16">
          {categories.map((cat, i) => {
            const Icon = cat.icon
            return (
              <FadeIn key={cat.title} delay={0.2 + i * 0.12}>
                <div
                  className="p-8 md:p-10 h-full transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,93,38,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={28} strokeWidth={2} style={{ color: ORANGE }} />
                    <span className="font-mono text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>{cat.count}</span>
                  </div>
                  <h3 className="font-body font-semibold text-xl mt-6" style={{ color: TEXT }}>
                    {cat.title}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {cat.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: ORANGE, opacity: 0.5 }} />
                        <span className="font-body text-base" style={{ color: MUTED, lineHeight: 1.5 }}>{item}</span>
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

// ─── VIDEO CONTENT SECTION ──────────────────────────────────────────────────
function VideoContentSection() {
  const videos = [
    {
      icon: Video,
      number: '01',
      title: 'Property Walkthrough',
      desc: '60-90 seconds. Smooth, steady walk through the home hitting every major room. Works for Zillow video, Airbnb intro, and Facebook posts.',
    },
    {
      icon: Globe,
      number: '02',
      title: 'Drone Footage',
      desc: 'Aerial establishing shots of the property and neighborhood. Great for a cover clip or to open the walkthrough.',
    },
    {
      icon: Smartphone,
      number: '03',
      title: 'Short-Form Clip',
      desc: '15-30 seconds. Quick highlight reel cut for Facebook and Instagram. Grabs attention fast.',
    },
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: WARM_BG }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] block text-center" style={{ color: ORANGE }}>
            Video Content
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4 text-center"
            style={{ color: CREAM, letterSpacing: '-0.03em' }}>
            Three Video Pieces
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-base text-center mt-4 max-w-[50ch] mx-auto" style={{ color: MUTED }}>
            All video delivered in 1080p (4K available on request), color graded, with light background music.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 md:mt-16">
          {videos.map((v, i) => {
            const Icon = v.icon
            return (
              <FadeIn key={v.title} delay={0.2 + i * 0.1}>
                <div className="p-8 flex flex-col gap-4 h-full transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,93,38,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center gap-4">
                    <Icon size={28} strokeWidth={2} style={{ color: ORANGE }} />
                    <span className="font-mono text-xs font-bold" style={{ color: `${ORANGE}66` }}>{v.number}</span>
                  </div>
                  <h3 className="font-body font-semibold text-xl" style={{ color: TEXT }}>{v.title}</h3>
                  <p className="font-body text-base" style={{ color: MUTED, lineHeight: 1.6 }}>{v.desc}</p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── PLATFORM PLAYBOOK SECTION ──────────────────────────────────────────────
function PlatformPlaybookSection() {
  const [active, setActive] = useState(0)

  const platforms = [
    {
      name: 'Zillow',
      icon: Home,
      tips: [
        { title: 'Lead with the best exterior shot', desc: 'Buyers scroll fast. The first photo is everything.' },
        { title: 'Photo order matters', desc: 'Exterior > kitchen > living room > primary bedroom > bath > additional rooms > backyard > details.' },
        { title: 'Use 20+ photos', desc: 'Zillow recommends 20+ for maximum engagement. You\'ll have 25-30.' },
        { title: 'Landscape orientation only', desc: 'Zillow crops vertical photos awkwardly. Stick with horizontal.' },
        { title: 'Add the video walkthrough', desc: 'Listings with video get significantly more views.' },
        { title: 'Write descriptions like a human', desc: 'Tell a friend about the place. Mention neighborhood, nearby spots, commute times.' },
      ],
    },
    {
      name: 'Airbnb',
      icon: Globe,
      tips: [
        { title: 'Cover photo is everything', desc: 'Use the golden hour exterior or most inviting interior wide shot.' },
        { title: 'Aim for 20+ photos', desc: 'More photos = more bookings. First 5 photos appear in a grid, pick your best.' },
        { title: 'Short, specific titles', desc: '"Modern Phoenix Home with Pool" beats "Beautiful Property in Great Location."' },
        { title: 'Stage it for the shoot', desc: 'Beds made, towels folded, coffee on the counter. We\'ll capture it.' },
        { title: 'Respond fast in the first 30 days', desc: 'Airbnb\'s algorithm heavily rewards quick response times early on.' },
        { title: 'Create a local guidebook', desc: 'Restaurant and activity recommendations. Guests love it and it boosts search ranking.' },
      ],
    },
    {
      name: 'Facebook',
      icon: Users,
      tips: [
        { title: 'Post on Marketplace', desc: 'Under "Property Rentals" or "Housing." Lead with the strongest exterior photo.' },
        { title: 'Repost every 5-7 days', desc: 'Marketplace buries older posts. Refreshing keeps you visible.' },
        { title: 'Join local groups', desc: 'Phoenix housing, rental, and community groups. Post with 4-6 photos and a friendly description.' },
        { title: 'Price clearly', desc: 'Vague pricing kills engagement. Be upfront.' },
        { title: 'Boost for $20-50', desc: 'Target Phoenix metro, ages 25-55, interests: travel, Airbnb, real estate. $5/day goes far.' },
        { title: 'Post the walkthrough video', desc: 'Video posts get more engagement than photos. Share as a standalone post on Day 5.' },
      ],
    },
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: BG }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] block text-center" style={{ color: ORANGE }}>
            Platform Playbook
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4 text-center"
            style={{ color: CREAM, letterSpacing: '-0.03em' }}>
            How to Use the Media
          </h2>
        </FadeIn>

        {/* Tab switcher */}
        <FadeIn delay={0.2}>
          <div className="flex justify-center gap-2 mt-10">
            {platforms.map((p, i) => {
              const Icon = p.icon
              return (
                <button
                  key={p.name}
                  onClick={() => setActive(i)}
                  className="flex items-center gap-2 px-5 py-3 text-sm font-body font-semibold uppercase tracking-wider transition-all duration-200"
                  style={{
                    background: active === i ? ORANGE : 'rgba(255,255,255,0.05)',
                    color: active === i ? CREAM : MUTED,
                    border: `1px solid ${active === i ? ORANGE : BORDER}`,
                  }}
                >
                  <Icon size={16} />
                  {p.name}
                </button>
              )
            })}
          </div>
        </FadeIn>

        {/* Active platform tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
          {platforms[active].tips.map((tip, i) => (
            <FadeIn key={`${active}-${i}`} delay={0.05 * i}>
              <div className="p-6 transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,93,38,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} style={{ color: ORANGE, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <h4 className="font-body font-semibold text-base" style={{ color: TEXT }}>{tip.title}</h4>
                    <p className="font-body text-sm mt-1" style={{ color: MUTED, lineHeight: 1.5 }}>{tip.desc}</p>
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

// ─── POSTING SCHEDULE ───────────────────────────────────────────────────────
function ScheduleSection() {
  const schedule = [
    { day: 'Day 1', platform: 'All', action: 'Upload photos and create listings on Zillow, Airbnb, Facebook Marketplace' },
    { day: 'Day 1-2', platform: 'Facebook', action: 'Post in 3-5 local groups (spread them out, don\'t spam)' },
    { day: 'Day 3', platform: 'Airbnb', action: 'Add guidebook, verify all amenity tags, finalize pricing' },
    { day: 'Day 5', platform: 'Facebook', action: 'Share the walkthrough video as a standalone post' },
    { day: 'Day 7', platform: 'Facebook', action: 'Repost on Marketplace, post in 2-3 new groups' },
    { day: 'Day 10', platform: 'All', action: 'Check analytics. See what\'s getting views. Double down on what works.' },
    { day: 'Day 14+', platform: 'Facebook', action: 'Refresh Marketplace every 5-7 days. Post video clips in groups.' },
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: CARD_BG }}>
      <div className="max-w-[900px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] block text-center" style={{ color: ORANGE }}>
            14-Day Launch
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4 text-center"
            style={{ color: CREAM, letterSpacing: '-0.03em' }}>
            Posting Schedule
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="font-body text-sm text-center mt-4" style={{ color: MUTED }}>
            Best times to post on Facebook: Tuesday-Thursday, 10am-12pm or 7-9pm. Weekends work for Marketplace.
          </p>
        </FadeIn>

        <div className="mt-10 space-y-3">
          {schedule.map((row, i) => (
            <FadeIn key={i} delay={0.1 + i * 0.06}>
              <div className="flex items-start gap-4 p-5 transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,93,38,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}
              >
                <div className="flex-shrink-0 w-20">
                  <span className="font-mono text-sm font-bold" style={{ color: ORANGE }}>{row.day}</span>
                </div>
                <div className="flex-shrink-0 w-24">
                  <span className="font-body text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded"
                    style={{ background: 'rgba(232,93,38,0.1)', color: ORANGE }}>
                    {row.platform}
                  </span>
                </div>
                <p className="font-body text-base flex-1" style={{ color: MUTED, lineHeight: 1.5 }}>{row.action}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── MANAGED OPTION SECTION ─────────────────────────────────────────────────
function ManagedOptionSection() {
  const included = [
    'Listing creation on Zillow, Airbnb, and Facebook Marketplace from scratch',
    'Photos uploaded in optimal order, descriptions written, amenities tagged',
    'Facebook group outreach: 10+ relevant local groups with tailored copy',
    'Video formatted specifically for each platform\'s specs',
    'Titles, descriptions, and photo captions optimized for each platform',
    'One round of revisions after everything is live',
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: BG }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div>
            <FadeIn>
              <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]" style={{ color: ORANGE }}>
                Optional Add-On
              </span>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4"
                style={{ color: CREAM, letterSpacing: '-0.03em' }}>
                We Handle<br />Everything
              </h2>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="font-body text-base md:text-lg mt-6 max-w-[50ch]" style={{ color: MUTED, lineHeight: 1.6 }}>
                If you'd rather hand off the promotion work and just focus on the property itself, we can handle it. No contracts, no surprises.
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="mt-8 flex flex-col sm:flex-row gap-6">
                <div className="p-6" style={{ background: 'rgba(232,93,38,0.08)', border: `1px solid ${ORANGE}33` }}>
                  <div className="font-headline font-extrabold text-4xl" style={{ color: ORANGE }}>$500</div>
                  <div className="font-body text-sm mt-1" style={{ color: MUTED }}>All 3 platforms</div>
                </div>
                <div className="p-6" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <div className="font-headline font-extrabold text-4xl" style={{ color: TEXT }}>$250</div>
                  <div className="font-body text-sm mt-1" style={{ color: MUTED }}>Single platform</div>
                </div>
              </div>
            </FadeIn>
          </div>

          <div>
            <FadeIn delay={0.2}>
              <h3 className="font-body font-semibold text-lg mb-6" style={{ color: TEXT }}>What's Included</h3>
            </FadeIn>
            <div className="space-y-4">
              {included.map((item, i) => (
                <FadeIn key={i} delay={0.25 + i * 0.06}>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} style={{ color: ORANGE, marginTop: 3, flexShrink: 0 }} />
                    <span className="font-body text-base" style={{ color: MUTED, lineHeight: 1.5 }}>{item}</span>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn delay={0.6}>
              <p className="font-body text-sm mt-8" style={{ color: MUTED, opacity: 0.7, lineHeight: 1.5 }}>
                Not included: ongoing Airbnb guest management, paid ad management beyond basic boost setup, monthly content refresh. If any of those become relevant, we'll figure out a fair rate.
              </p>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── NEXT STEPS SECTION ─────────────────────────────────────────────────────
function NextStepsSection() {
  const steps = [
    { icon: Calendar, number: '01', title: 'Schedule the Shoot', desc: 'Pick a day that works. We need about 2 hours at the property. Morning light (8-10am) or golden hour (5-7pm) is ideal.' },
    { icon: Home, number: '02', title: 'Prep the Space', desc: 'Clean, declutter, stage it like someone\'s about to walk in. Fresh towels, made beds, clear countertops. The photos will look 10x better.' },
    { icon: Camera, number: '03', title: 'Send Must-Have Shots', desc: 'If there\'s a specific feature or angle you want captured, let us know ahead of time.' },
    { icon: Clock, number: '04', title: 'Turnaround: 3-5 Days', desc: 'Edited photos and video delivered within 3-5 days after the shoot. Ready to upload.' },
  ]

  return (
    <section className="relative py-24 md:py-32" style={{ background: WARM_BG }}>
      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        <FadeIn>
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em] block text-center" style={{ color: ORANGE }}>
            Let's Go
          </span>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 className="font-headline font-extrabold uppercase text-3xl md:text-[42px] leading-[1.05] tracking-tight mt-4 text-center"
            style={{ color: CREAM, letterSpacing: '-0.03em' }}>
            Next Steps
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <FadeIn key={step.title} delay={0.2 + i * 0.1}>
                <div className="p-8 h-full text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                  <span className="font-mono text-xs font-bold" style={{ color: `${ORANGE}66` }}>{step.number}</span>
                  <div className="flex justify-center mt-4">
                    <Icon size={32} strokeWidth={1.5} style={{ color: ORANGE }} />
                  </div>
                  <h3 className="font-body font-semibold text-lg mt-4" style={{ color: TEXT }}>{step.title}</h3>
                  <p className="font-body text-sm mt-3" style={{ color: MUTED, lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── FOOTER / CTA ───────────────────────────────────────────────────────────
function FooterCTA() {
  return (
    <section className="relative py-20 text-center" style={{ background: BG }}>
      <div className="max-w-[600px] mx-auto px-6">
        <FadeIn>
          <h2 className="font-headline font-extrabold uppercase text-2xl md:text-3xl tracking-tight"
            style={{ color: CREAM, letterSpacing: '-0.02em' }}>
            Simple, clean, effective.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="font-body text-lg mt-4" style={{ color: MUTED }}>
            Let's get this property looking right.
          </p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <a href={PHONE_HREF}
              className="flex items-center gap-2 px-6 py-3 font-body font-semibold uppercase tracking-wider text-sm transition-all"
              style={{ background: ORANGE, color: CREAM }}>
              <Phone size={16} />
              {PHONE_NUM}
            </a>
            <a href={`mailto:${EMAIL_ADDR}`}
              className="flex items-center gap-2 px-6 py-3 font-body font-semibold uppercase tracking-wider text-sm transition-all"
              style={{ background: 'transparent', color: MUTED, border: `1px solid ${BORDER}` }}>
              <Mail size={16} />
              Email Us
            </a>
          </div>
        </FadeIn>
        <FadeIn delay={0.3}>
          <p className="font-body text-xs mt-12" style={{ color: MUTED, opacity: 0.4 }}>
            &copy; {new Date().getFullYear()} AOM (Ahead of Market). Prepared for Quentin Thanh.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function QuentinProposal() {
  return (
    <div className="min-h-screen no-scrollbar" style={{ background: BG }}>
      <NavBar />
      <HeroSection />
      <TheDealSection />
      <MediaPackageSection />
      <VideoContentSection />
      <PlatformPlaybookSection />
      <ScheduleSection />
      <ManagedOptionSection />
      <NextStepsSection />
      <FooterCTA />
    </div>
  )
}
