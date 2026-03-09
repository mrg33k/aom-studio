import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, Clapperboard, Cpu } from 'lucide-react'

// ── Video background config ──────────────────────────────────────────
// Gumlet embed IDs from the portfolio. Shuffled randomly on each load.
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
const VIDEO_HOLD_SECONDS = 10 // time each embed shows before crossfade

// Fisher-Yates shuffle, pick first N
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
    icon: Building2,
    title: 'Construction Companies',
    hook: 'Social content from your actual job sites.',
    cta: 'See what we build for contractors',
    accent: 'orange',
    href: '#construction',
  },
  {
    icon: Clapperboard,
    title: 'Brands + Corporate',
    hook: 'Video and content that tells your story and closes deals.',
    cta: 'See the production work',
    accent: 'orange',
    href: '#brands',
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

export default function HeroSection({ openBrief }) {
  // ── Video rotation: pick 5 random videos, cycle through them ──────
  const [playlist] = useState(() => shufflePick(GUMLET_IDS, 5))
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (playlist.length <= 1) return
    const interval = setInterval(() => {
      setVisible(false) // fade out
      setTimeout(() => {
        setActiveIdx((prev) => (prev + 1) % playlist.length)
        setVisible(true) // fade in next
      }, 1500) // wait for fade-out to finish
    }, VIDEO_HOLD_SECONDS * 1000)
    return () => clearInterval(interval)
  }, [playlist])

  return (
    <section className="relative min-h-[85vh] flex items-center bg-aom-cream overflow-hidden">

      {/* ── Video background layer (Gumlet embed reel) ────────────── */}
      <div className="hero-video-bg absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <iframe
          key={playlist[activeIdx]}
          src={`https://play.gumlet.io/embed/${playlist[activeIdx]}?autoplay=true&muted=true&loop=true&preload=true&controls=false`}
          className="absolute inset-0 w-full h-full border-none transition-opacity duration-[1500ms] ease-in-out"
          style={{
            opacity: visible ? 0.18 : 0,
            filter: 'grayscale(0.3) contrast(1.1)',
            transform: 'scale(1.15)', // crop out player chrome
            transformOrigin: 'center center',
          }}
          allow="autoplay"
          tabIndex={-1}
        />
        {/* Cream overlay for readability */}
        <div className="absolute inset-0 bg-aom-cream/[0.88]" />
        {/* Bottom gradient fade into content */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-aom-cream to-transparent" />
      </div>

      {/* Mobile: hide iframe entirely for performance */}
      <style>{`
        @media (max-width: 639px) {
          .hero-video-bg iframe { display: none; }
        }
      `}</style>

      {/* Subtle geometric accent */}
      <div className="absolute top-12 right-12 w-16 h-16 pointer-events-none opacity-10 z-[1]">
        <svg viewBox="0 0 40 40" width="64" height="64">
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360 / 16) * Math.PI / 180
            const r = i % 2 === 0 ? 20 : 8
            return null
          })}
          <polygon
            points={Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * 360 / 16) * Math.PI / 180
              const r = i % 2 === 0 ? 20 : 8
              return `${20 + r * Math.cos(angle)},${20 + r * Math.sin(angle)}`
            }).join(' ')}
            fill="#E85D26"
          />
        </svg>
      </div>

      {/* Dotted texture background */}
      <div className="absolute bottom-16 right-24 pointer-events-none opacity-[0.06] z-[1]">
        <svg width="120" height="80">
          {Array.from({ length: 9 }).map((_, x) =>
            Array.from({ length: 6 }).map((_, y) => (
              <circle key={`${x}-${y}`} cx={x * 14 + 7} cy={y * 14 + 7} r={1.5} fill="#0A0A0A" />
            ))
          )}
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 sm:py-24 md:py-32 relative z-10 w-full">
        {/* Micro-label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          className="text-[11px] font-body font-medium uppercase tracking-[0.2em] text-aom-warm-gray mb-6"
        >
          Creative Production + AI Systems
        </motion.p>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
        >
          <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-7xl font-extrabold uppercase tracking-[-0.01em] text-aom-black leading-[0.95] max-w-[45ch]">
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
          className="text-aom-warm-gray text-lg md:text-xl mt-8 max-w-xl leading-relaxed font-body"
        >
          Content, websites, and systems for companies that build, grow, and ship.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0, ease: 'easeOut' }}
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-start gap-4"
        >
          <button
            onClick={() => openBrief()}
            className="bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight px-8 py-4 hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/20 flex items-center gap-2 text-sm md:text-base"
          >
            See What We'd Build For You <ArrowRight size={16} />
          </button>
          <a
            href="#work"
            className="border-2 border-aom-black text-aom-black font-headline font-bold uppercase tracking-tight px-8 py-4 hover:bg-aom-black hover:text-aom-cream transition-all text-sm md:text-base"
          >
            See the Work
          </a>
        </motion.div>

        {/* Bottom status bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4, ease: 'easeOut' }}
          className="mt-10 sm:mt-16 md:mt-24 flex flex-wrap items-center gap-6 text-aom-warm-gray"
        >
          <span className="inline-flex items-center gap-2 font-body text-[11px] font-medium uppercase tracking-[0.15em]">
            <span className="w-1.5 h-1.5 rounded-full bg-aom-orange" />
            Phoenix, AZ
          </span>
          <span className="hidden sm:block w-px h-3 bg-aom-light-border" />
          <span className="font-body text-[11px] font-medium uppercase tracking-[0.15em]">
            Video / Web / Social / Systems
          </span>
          <span className="hidden sm:block w-px h-3 bg-aom-light-border" />
          <span className="font-body text-[11px] font-medium uppercase tracking-[0.15em]">
            Est. 2020
          </span>
        </motion.div>

        {/* Pathway Gate */}
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
              <a
                key={p.title}
                href={p.href}
                className={`p-4 md:p-6 border border-aom-light-border bg-white/60 backdrop-blur-sm hover:border-aom-orange/40 transition-all duration-300 border-t-2 ${borderColor}`}
              >
                <Icon size={24} className={p.accent === 'sage' ? 'text-aom-sage mb-3' : 'text-aom-orange mb-3'} />
                <p className="font-headline text-sm font-bold text-aom-black mb-1">{p.title}</p>
                <p className="text-aom-warm-gray text-xs leading-relaxed mb-3 font-body">{p.hook}</p>
                <span className={`text-xs font-bold flex items-center gap-1 font-body ${p.accent === 'sage' ? 'text-aom-sage' : 'text-aom-orange'}`}>
                  {p.cta} <ArrowRight size={12} />
                </span>
              </a>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
