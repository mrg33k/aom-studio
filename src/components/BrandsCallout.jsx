import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Clapperboard, Mic2, ScrollText } from 'lucide-react'

const proofPoints = [
  {
    icon: Clapperboard,
    stat: 'Brand Videos',
    description: 'A 90-second video that explains who you are, what you do, and why it matters. The asset that works harder than any sales call.',
  },
  {
    icon: Mic2,
    stat: 'Event Coverage',
    description: "Conferences, summits, launches. We capture the energy and turn it into assets that extend the event's shelf life by months.",
  },
  {
    icon: ScrollText,
    stat: 'Documentaries + Long-form',
    description: 'When the story needs more than 60 seconds. Fundraising films, impact stories, and brand docs that build real trust.',
  },
]

export default function BrandsCallout({ openBrief }) {
  return (
    <section id="brands" className="py-16 md:py-24 bg-aom-night relative overflow-hidden" aria-label="Brands and corporate">
      {/* Dotted texture accent */}
      <div className="absolute top-20 right-16 pointer-events-none opacity-[0.06]" aria-hidden="true">
        <svg width="100" height="100">
          {Array.from({ length: 7 }).map((_, x) =>
            Array.from({ length: 7 }).map((_, y) => (
              <circle key={`${x}-${y}`} cx={x * 14 + 7} cy={y * 14 + 7} r={1.5} fill="#E85D26" />
            ))
          )}
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-xs font-body font-medium uppercase tracking-[0.2em] text-aom-text-muted mb-4">
            Brands + Corporate
          </p>
          <div className="w-12 h-[2px] bg-aom-orange mb-4" />
          <h2 className="font-headline text-3xl md:text-5xl lg:text-5xl font-bold uppercase tracking-[-0.02em] text-aom-text-light max-w-[45ch] leading-[0.95]">
            THE STORY IS ALREADY THERE. WE JUST KNOW HOW TO TELL IT.
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
                  className="p-6 md:p-8 border border-white/10 bg-white/[0.03] shadow-sm hover:border-aom-orange/40 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                      <Icon size={20} className="text-aom-orange" />
                    </div>
                    <div>
                      <p className="font-headline text-lg font-bold text-aom-text-light mb-1">
                        {point.stat}
                      </p>
                      <p className="text-aom-text-muted text-base leading-relaxed font-body">
                        {point.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Right column: Virtu proof card + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="md:col-span-5 flex flex-col"
          >
            <div className="p-6 md:p-8 border-2 border-aom-orange/40 bg-aom-night shadow-xl flex-1 flex flex-col">
              <p className="font-body text-[11px] font-medium uppercase tracking-[0.2em] text-aom-orange mb-4">
                Proof Point
              </p>

              <h3 className="font-headline text-2xl md:text-3xl font-extrabold uppercase tracking-[-0.02em] text-aom-text-light mb-4">
                VIRTU HOSPITALITY GROUP
              </h3>

              <p className="text-white/70 text-base leading-relaxed mb-2 font-body">
                "They didn't just shoot beautiful footage. They showed people the place I created had legacy."
              </p>

              <p className="text-aom-orange text-base leading-relaxed mb-6 font-body">
                Gio Osso, Virtu Hospitality Group
              </p>

              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 border border-white/10 bg-white/5">
                  <p className="font-headline text-3xl font-extrabold text-aom-orange">3</p>
                  <p className="font-body text-xs uppercase tracking-[0.15em] text-white/60 mt-1">Venue Launches</p>
                </div>
                <div className="p-4 border border-white/10 bg-white/5">
                  <p className="font-headline text-3xl font-extrabold text-aom-orange">50+</p>
                  <p className="font-body text-xs uppercase tracking-[0.15em] text-white/60 mt-1">Projects Delivered</p>
                </div>
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => openBrief()}
                  className="block w-full bg-aom-orange text-white font-headline font-extrabold uppercase tracking-tight px-8 py-4 min-h-[44px] hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/30 text-center text-base"
                >
                  See What We'd Produce For You
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
