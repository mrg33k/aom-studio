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
      {/* Orange accent bar at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-aom-orange/40 to-transparent" />

      {/* Subtle warm accent */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-gradient-to-b from-transparent via-orange-500/10 to-transparent" />

      {/* Diagonal pattern overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
        background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)'
      }} />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-[11px] font-body font-medium uppercase tracking-[0.2em] text-aom-text-muted mb-4">
            Construction Companies
          </p>
          <div className="w-12 h-[2px] bg-aom-orange mb-4" />
          <h2 className="font-headline text-3xl md:text-5xl lg:text-5xl font-bold uppercase tracking-[-0.02em] text-aom-text-light max-w-[45ch] leading-[0.95]">
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
                  className="p-6 md:p-8 border border-white/10 bg-white/[0.03] shadow-xl hover:border-aom-orange/30 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-aom-orange" />
                    </div>
                    <div>
                      <p className="font-headline text-lg font-bold text-aom-text-light mb-1">
                        {point.stat}
                      </p>
                      <p className="text-white/50 text-base leading-relaxed font-body">
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
            <div className="p-6 md:p-8 border border-aom-orange/40 bg-aom-orange/5 shadow-2xl shadow-aom-orange/10 flex-1 flex flex-col">
              <p className="font-body text-[11px] font-medium uppercase tracking-[0.2em] text-aom-orange mb-4">
                Proof Point
              </p>

              <h3 className="font-headline text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-aom-text-light mb-4">
                AMBITION MECHANICAL
              </h3>

              <p className="text-white/50 text-base leading-relaxed mb-2 font-body">
                One HVAC company that decided their brand should match the quality of their work. Website, social media, and a content engine that runs every month.
              </p>

              <p className="text-white/50 text-base leading-relaxed mb-6 font-body">
                The result: a digital presence that recruits talent, wins contracts, and makes general contractors take notice.
              </p>

              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 border border-white/10 bg-white/5">
                  <p className="font-headline text-3xl font-extrabold text-aom-orange">30+</p>
                  <p className="font-body text-[10px] uppercase tracking-[0.15em] text-white/40 mt-1">Posts / Month</p>
                </div>
                <div className="p-4 border border-white/10 bg-white/5">
                  <p className="font-headline text-3xl font-bold text-aom-orange">Monthly</p>
                  <p className="font-body text-[10px] uppercase tracking-[0.15em] text-white/40 mt-1">Filming + Posting</p>
                </div>
              </div>

              <div className="mt-auto space-y-3">
                <a
                  href="https://ambitionac.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-aom-orange text-base font-bold hover:text-aom-orange-hover transition-colors flex items-center gap-1 font-body min-h-[44px]"
                >
                  See Ambition Mechanical <ArrowRight size={16} />
                </a>

                <button
                  onClick={() => openBrief()}
                  className="block w-full bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight px-8 py-4 min-h-[44px] hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/30 text-center text-base"
                >
                  See What We'd Build For You
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stat bar */}
        <p className="mt-8 font-headline text-lg font-bold text-aom-text-light">
          Consistent filming. Consistent posting. That's the whole system.
        </p>
      </div>
    </section>
  )
}
