import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const cycleWords = ['BUILD', 'GROW', 'SHIP', 'SCALE']

function useWordCycle(words, intervalMs = 2800) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [words.length, intervalMs])

  return words[index]
}

export default function HeroSection() {
  const currentWord = useWordCycle(cycleWords)

  return (
    <section className="relative min-h-[70vh] sm:min-h-[90vh] flex items-center bg-aom-night overflow-hidden">
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
          <h1 className="font-headline text-[2.25rem] sm:text-6xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tighter text-aom-warm-white leading-[0.85] max-w-[45ch]">
            BRAND
            <br className="sm:hidden" />
            INFRASTRUCTURE
            <br />
            <span className="text-aom-stone">FOR COMPANIES</span>
            <br />
            <span className="text-aom-stone">THAT </span>
            <span className="text-aom-orange inline-block min-w-[3ch]">
              {currentWord}
            </span>
            <span className="text-aom-orange">.</span>
          </h1>
        </motion.div>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8, ease: 'easeOut' }}
          className="text-aom-stone text-base md:text-lg mt-8 max-w-xl leading-relaxed"
        >
          Video, websites, social content, and AI systems. We build the engine that makes your brand impossible to ignore.
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
      </div>
    </section>
  )
}
