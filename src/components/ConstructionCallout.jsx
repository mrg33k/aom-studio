import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, HardHat, Users, Trophy, Building2 } from 'lucide-react'

const proofPoints = [
  {
    icon: Users,
    stat: 'Recruiting',
    description: 'Your best crews aren\'t on Indeed. They\'re on Instagram watching your competitor\'s content. Show them why your company is the one to work for.',
  },
  {
    icon: Trophy,
    stat: 'Winning Bids',
    description: 'General contractors check your online presence before they return your call. Professional content is the difference between shortlist and no-list.',
  },
  {
    icon: Building2,
    stat: 'Looking Legitimate',
    description: 'Stand out from the sea of blue-and-orange logos. When your digital presence matches your work quality, the right contracts find you.',
  },
]

export default function ConstructionCallout({ openBrief }) {
  return (
    <section id="construction" className="py-16 md:py-24 bg-aom-night relative overflow-hidden">
      {/* Subtle warm accent */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-gradient-to-b from-transparent via-orange-500/5 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-4">
            Construction Companies
          </p>
          <div className="w-12 h-[2px] bg-aom-orange mb-4" />
          <h2 className="font-headline text-3xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-[-0.025em] text-aom-warm-white max-w-[45ch] leading-[0.9]">
            YOUR COMPETITOR'S INSTAGRAM IS THEIR BEST RECRUITER. IS YOURS?
          </h2>
        </div>

        <div className="grid md:grid-cols-12 gap-8 md:gap-12">
          {/* Left column: proof points */}
          <div className="md:col-span-7 space-y-6">
            {proofPoints.map((point, i) => {
              const Icon = point.icon
              return (
                <motion.div
                  key={point.stat}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.7, delay: i * 0.12, ease: 'easeOut' }}
                  className="p-6 md:p-8 rounded-sm border border-aom-border bg-aom-charcoal shadow-xl hover:border-aom-orange/30 transition-colors duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 border border-aom-border bg-black/40 flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-aom-orange" />
                    </div>
                    <div>
                      <p className="font-headline text-lg font-bold text-aom-warm-white mb-1">
                        {point.stat}
                      </p>
                      <p className="text-aom-stone text-sm leading-relaxed">
                        {point.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Right column: Ambition proof + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="md:col-span-5 flex flex-col"
          >
            {/* Proof card */}
            <div className="p-6 md:p-8 rounded-sm border border-aom-orange/40 bg-orange-950/10 shadow-2xl flex-1 flex flex-col">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-aom-orange mb-4">
                Proof Point
              </p>

              <h3 className="font-headline text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-aom-warm-white mb-4">
                AMBITION MECHANICAL
              </h3>

              <p className="text-aom-stone text-sm leading-relaxed mb-2">
                One HVAC company that decided their brand should match the quality of their work. Website, social media, and a content engine that runs every month.
              </p>

              <p className="text-aom-stone text-sm leading-relaxed mb-6">
                The result: a digital presence that recruits talent, wins contracts, and makes general contractors take notice.
              </p>

              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-sm border border-aom-border bg-aom-charcoal">
                  <p className="font-headline text-2xl font-black italic text-aom-orange">30+</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-aom-stone-muted mt-1">Posts / Month</p>
                </div>
                <div className="p-4 rounded-sm border border-aom-border bg-aom-charcoal">
                  <p className="font-headline text-2xl font-bold italic text-aom-orange">Monthly</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-aom-stone-muted mt-1">Filming + Posting</p>
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <a
                  href="https://ambitionac.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-aom-orange text-sm font-bold hover:text-aom-orange-hover transition-colors flex items-center gap-1"
                >
                  See Ambition Mechanical <ArrowRight size={14} />
                </a>

                <button
                  onClick={() => openBrief()}
                  className="block w-full bg-aom-orange text-white font-headline font-black uppercase tracking-tight px-8 py-4 hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/20 text-center text-sm"
                >
                  See What We'd Build For You
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stat bar */}
        <p className="mt-8 font-headline text-lg font-bold text-aom-warm-white">
          Consistent filming. Consistent posting. That's the whole system.
        </p>
      </div>
    </section>
  )
}
