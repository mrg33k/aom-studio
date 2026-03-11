import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, Clapperboard, Cpu } from 'lucide-react'

// Video background config -- Gumlet embed IDs from the portfolio
const GUMLET_IDS = [
  '698a6296fc23d3d76fa8d992', // Journey To Gary Vee
  '698a5b86fc23d3d76fa82ece', // Noble Real Estate
  '698a6106aec3d4e420c2fd85', // Rainbow Rider
  '698a5d24aec3d4e420c2a0a0', // Pretty Penny
  '698a5ef5fc23d3d76fa87ef4', // Virtu Hospitality
  '698a64e5873071aec5ca99ac', // AZ Arts Foundation
  '698a63e5aec3d4e420c34783', // Cynshine Pilates
  '698a6127873071aec5ca3b36', // ASU:Peoria Forward
  '698a6177873071aec5ca4374', // Keep it Cut
  '698a5fcdfc23d3d76fa893b8', // United Food Bank
  '698a58c0aec3d4e420c21b78', // Aiper Pool Party
  '698a53a4aec3d4e420c17ee0', // Ducor Event Recap
  '698a53a9873071aec5c8b9d7', // Cook & Craft
  '698a5ebcaec3d4e420c2c573', // Ulisgold Pilates
]
const VIDEO_HOLD_SECONDS = 10

function shufflePick(arr, n) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

const pathways = [
  {
    icon: Clapperboard,
    title: 'Brands + Corporate',
    hook: 'Video and content that tells your story and closes deals.',
    cta: 'See the production work',
    accent: 'orange',
    href: '#brands',
  },
  {
    icon: Building2,
    title: 'Construction Companies',
    hook: 'Social content from the work you actually do.',
    cta: 'See the construction work',
    accent: 'orange',
    href: '#construction',
  },
  {
    icon: Cpu,
    title: 'Digital + Systems',
    hook: 'Websites, workflows, and the systems that make it all run.',
    cta: 'See how we build',
    accent: 'sage',
    href: '#digital',
  },
]

export default function HeroSection({ openBrief, scrollToSection }) {
  const [playlist] = useState(() => shufflePick(GUMLET_IDS, 5))
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    if (playlist.length <= 1) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setActiveIdx((prev) => (prev + 1) % playlist.length)
        setVisible(true)
      }, 1500)
    }, VIDEO_HOLD_SECONDS * 1000)
    return () => clearInterval(interval)
  }, [playlist])

  // Parallax on scroll
  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    const handleScroll = () => setScrollY(main.scrollTop)
    main.addEventListener('scroll', handleScroll, { passive: true })
    return () => main.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center bg-aom-night overflow-hidden" aria-label="Hero">

      {/* Video background layer */}
      <div className="hero-video-bg absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <iframe
          key={playlist[activeIdx]}
          src={`https://play.gumlet.io/embed/${playlist[activeIdx]}?autoplay=true&muted=true&loop=true&preload=true&controls=false`}
          className="absolute inset-0 w-full h-full border-none transition-opacity duration-[1500ms] ease-in-out"
          loading="eager"
          style={{
            opacity: visible ? 0.7 : 0,
            filter: 'grayscale(0.15) contrast(1.15)',
            transform: `scale(${1.15 + scrollY * 0.0001})`,
            transformOrigin: 'center center',
          }}
          allow="autoplay"
          tabIndex={-1}
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-aom-night/[0.45]" />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #0C0C0C 100%)' }} />
        {/* Bottom gradient fade into next section */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-aom-night to-transparent" />
      </div>

      {/* Film grain overlay */}
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04] mix-blend-overlay">
        <svg width="100%" height="100%">
          <filter id="hero-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-grain)" />
        </svg>
      </div>

      {/* Mobile: show first video only (no rotation), reduced quality for performance */}
      <style>{`
        @media (max-width: 639px) {
          .hero-video-bg iframe { pointer-events: none; }
        }
      `}</style>

      <div
        className="max-w-6xl mx-auto px-6 md:px-12 py-24 sm:py-32 md:py-40 relative z-10 w-full"
        style={{ transform: `translateY(${scrollY * 0.15}px)` }}
      >
        {/* Micro-label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          className="text-xs font-body font-medium uppercase tracking-[0.2em] text-aom-text-muted mb-6"
        >
          Creative Production + AI Systems
        </motion.p>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
        >
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold uppercase tracking-[-0.03em] text-aom-text-light leading-[0.92] max-w-[45ch]">
            WE MAKE COMPANIES
            <br />
            <span className="text-aom-orange">IMPOSSIBLE TO IGNORE</span>
            <span className="text-aom-orange">.</span>
          </h1>
        </motion.div>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8, ease: 'easeOut' }}
          className="text-aom-text-muted text-lg md:text-xl mt-8 max-w-xl leading-relaxed font-body"
        >
          Video, web, and brand systems for companies, founders, and organizations ready to stand out.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0, ease: 'easeOut' }}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-start gap-4 p-6 bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-sm"
        >
          <button
            onClick={() => openBrief()}
            className="bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight px-8 py-4 hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/30 flex items-center gap-2 text-sm md:text-base"
          >
            Let's Talk <ArrowRight size={16} />
          </button>
          <button
            onClick={() => scrollToSection('work')}
            className="border-2 border-white/20 text-white font-headline font-bold uppercase tracking-tight px-8 py-4 hover:bg-white hover:text-aom-black transition-all text-sm md:text-base"
          >
            See the Work
          </button>
        </motion.div>

        {/* Bottom status bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4, ease: 'easeOut' }}
          className="mt-10 sm:mt-16 md:mt-24 flex flex-wrap items-center gap-6 text-aom-text-muted"
        >
          <span className="inline-flex items-center gap-2 font-body text-xs font-medium uppercase tracking-[0.15em]">
            <span className="w-1.5 h-1.5 rounded-full bg-aom-orange" />
            Phoenix, AZ
          </span>
          <span className="hidden sm:block w-px h-3 bg-white/10" />
          <span className="font-body text-xs font-medium uppercase tracking-[0.15em]">
            Video / Web / Social / Systems
          </span>
          <span className="hidden sm:block w-px h-3 bg-white/10" />
          <span className="font-body text-xs font-medium uppercase tracking-[0.15em]">
            Est. 2020
          </span>
        </motion.div>

        {/* Pathway Gate -- frosted glass on dark */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6, ease: 'easeOut' }}
          className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {pathways.map((p) => {
            const Icon = p.icon
            const borderColor = p.accent === 'sage' ? 'border-t-aom-sage' : 'border-t-aom-orange'
            return (
              <button
                key={p.title}
                onClick={() => scrollToSection(p.href.replace('#', ''))}
                className={`p-4 md:p-6 border border-white/10 bg-white/[0.06] backdrop-blur-md hover:border-aom-orange/40 hover:bg-white/[0.1] transition-all duration-300 border-t-2 ${borderColor} text-left`}
              >
                <Icon size={24} className={p.accent === 'sage' ? 'text-aom-sage mb-3' : 'text-aom-orange mb-3'} />
                <p className="font-headline text-base font-bold text-aom-text-light mb-1">{p.title}</p>
                <p className="text-aom-text-muted text-base leading-relaxed mb-3 font-body">{p.hook}</p>
                <span className={`text-base font-bold flex items-center gap-1 font-body ${p.accent === 'sage' ? 'text-aom-sage' : 'text-aom-orange'}`}>
                  {p.cta} <ArrowRight size={14} />
                </span>
              </button>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
