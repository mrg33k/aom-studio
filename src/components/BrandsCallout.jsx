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
    <section id="brands" className="py-16 md:py-24 bg-aom-surface relative overflow-hidden">
      {/* Subtle warm amber gradient wash */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-gradient-to-b from-transparent via-amber-500/5 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-4">
            Brands + Corporate
          </p>
          <div className="w-12 h-[2px] bg-aom-orange mb-4" />
          <h2 className="font-headline text-3xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-[-0.025em] text-aom-warm-white max-w-[45ch] leading-[0.9]">
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

          {/* Right column: Virtu proof card + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="md:col-span-5 flex flex-col"
          >
            <div className="p-6 md:p-8 rounded-sm border border-aom-orange/40 bg-orange-950/10 shadow-2xl flex-1 flex flex-col">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-aom-orange mb-4">
                Proof Point
              </p>

              <h3 className="font-headline text-2xl md:text-3xl font-black italic uppercase tracking-[-0.025em] text-aom-warm-white mb-4">
                VIRTU HOSPITALITY GROUP
              </h3>

              <p className="text-aom-stone text-sm leading-relaxed mb-2">
                "They didn't just shoot beautiful footage. They showed people the place I created had legacy."
              </p>

              <p className="text-aom-stone-muted text-xs leading-relaxed mb-6">
                Gio Osso, Virtu Hospitality Group
              </p>

              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-sm border border-aom-border bg-aom-charcoal">
                  <p className="font-headline text-2xl font-black italic text-aom-orange">3</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-aom-stone-muted mt-1">Venue Launches</p>
                </div>
                <div className="p-4 rounded-sm border border-aom-border bg-aom-charcoal">
                  <p className="font-headline text-2xl font-black italic text-aom-orange">$9k+</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-aom-stone-muted mt-1">Projects</p>
                </div>
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => openBrief()}
                  className="block w-full bg-aom-orange text-white font-headline font-black uppercase tracking-tight px-8 py-4 hover:bg-aom-orange-hover transition-colors shadow-lg shadow-aom-orange/20 text-center text-sm"
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
