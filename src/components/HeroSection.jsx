import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, Clapperboard, Cpu } from 'lucide-react'

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

export default function HeroSection() {

  return (
    <section className="relative min-h-[85vh] flex items-center bg-aom-night overflow-hidden">
      {/* Noise overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.03] mix-blend-overlay">
        <svg width="100%" height="100%">
          <filter id="hero-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#hero-noise)" />
        </svg>
      </div>

      {/* Subtle orange gradient wash */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-gradient-to-b from-transparent via-orange-500/5 to-transparent" />

      {/* Ambient glow behind CTA area */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-[0.06] bg-aom-orange rounded-full blur-[120px]" />

      <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 sm:py-24 md:py-32 relative z-10 w-full">
        {/* Micro-label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-6"
        >
          Creative Production + Systems
        </motion.p>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
        >
          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black italic uppercase tracking-[-0.025em] text-aom-warm-white leading-[0.85] max-w-[45ch]">
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
          className="text-aom-stone text-lg md:text-xl mt-8 max-w-xl leading-relaxed"
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
          <a
            href="#brief"
            className="bg-aom-orange text-white font-headline font-black uppercase tracking-tight px-8 py-4 hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/20 flex items-center gap-2 text-sm md:text-base"
          >
            See What We'd Build For You <ArrowRight size={16} />
          </a>
          <a
            href="#work"
            className="border border-aom-warm-white text-aom-warm-white font-headline font-bold uppercase tracking-tight px-8 py-4 hover:bg-aom-warm-white hover:text-aom-night transition-all text-sm md:text-base"
          >
            See the Work
          </a>
        </motion.div>

        {/* Bottom status bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4, ease: 'easeOut' }}
          className="mt-10 sm:mt-16 md:mt-24 flex flex-wrap items-center gap-6 text-aom-dim"
        >
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-aom-sage" />
            Phoenix, AZ
          </span>
          <span className="hidden sm:block w-px h-3 bg-aom-border" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
            Video / Web / Social / Systems
          </span>
          <span className="hidden sm:block w-px h-3 bg-aom-border" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
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
                className={`p-4 md:p-6 rounded-sm border border-aom-border/50 bg-aom-charcoal/60 backdrop-blur-sm hover:border-aom-orange/30 transition-all duration-300 border-t-2 ${borderColor}`}
              >
                <Icon size={24} className={p.accent === 'sage' ? 'text-aom-sage mb-3' : 'text-aom-orange mb-3'} />
                <p className="font-headline text-sm font-bold text-aom-warm-white mb-1">{p.title}</p>
                <p className="text-aom-stone text-xs leading-relaxed mb-3">{p.hook}</p>
                <span className={`text-xs font-bold flex items-center gap-1 ${p.accent === 'sage' ? 'text-aom-sage' : 'text-aom-orange'}`}>
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
