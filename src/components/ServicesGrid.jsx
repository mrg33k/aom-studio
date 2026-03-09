import React from 'react'
import { motion } from 'framer-motion'
import { Repeat, Clapperboard, Cpu, ArrowRight } from 'lucide-react'

const services = [
  {
    icon: Repeat,
    label: 'Retainer',
    title: 'Content Engine',
    description: 'Your in-house media team without the overhead. We show up, shoot, and turn it into a month of content. Strategy, production, and posting handled.',
    accent: 'orange',
    cta: 'See how it works',
  },
  {
    icon: Clapperboard,
    label: 'Project',
    title: 'Production',
    description: 'Brand videos, documentaries, event coverage. Cinema-grade execution for the moments that define your company.',
    accent: 'orange',
    cta: 'See the work',
  },
  {
    icon: Cpu,
    label: 'System',
    title: 'Digital Infrastructure',
    description: 'Websites, AI workflows, and automation that make everything repeatable. The engine behind the brand.',
    accent: 'sage',
    cta: 'See what we\'d build',
  },
]

function ServiceCard({ service, index }) {
  const isOrange = service.accent === 'orange'
  const iconColor = isOrange ? 'text-aom-orange' : 'text-aom-sage'
  const hoverBorder = isOrange ? 'hover:border-aom-orange/30' : 'hover:border-aom-sage-muted/30'
  const ctaColor = isOrange
    ? 'text-aom-orange hover:text-aom-orange-hover'
    : 'text-aom-sage hover:text-aom-sage-light'

  const Icon = service.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: 'easeOut' }}
      className={`p-6 md:p-8 rounded-sm border border-aom-border bg-aom-charcoal shadow-xl ${hoverBorder} transition-colors duration-300 flex flex-col`}
    >
      {/* Icon container */}
      <div className="w-12 h-12 border border-aom-border bg-black/40 flex items-center justify-center mb-4">
        <Icon size={20} className={iconColor} />
      </div>

      {/* Micro-label */}
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-2">
        {service.label}
      </p>

      {/* Title */}
      <h3 className="font-headline text-lg md:text-xl font-bold text-aom-warm-white mb-3">
        {service.title}
      </h3>

      {/* Description */}
      <p className={`text-aom-stone text-sm leading-relaxed mb-6 flex-1 ${!isOrange ? 'font-mono' : ''}`}>
        {service.description}
      </p>

      {/* Ghost CTA */}
      <button className={`${ctaColor} text-sm font-bold transition-colors flex items-center gap-1 self-start`}>
        {service.cta} <ArrowRight size={14} />
      </button>
    </motion.div>
  )
}

export default function ServicesGrid() {
  return (
    <section className="py-20 md:py-32 bg-aom-surface">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-4">
            What We Build
          </p>
          <div className="w-12 h-[2px] bg-aom-orange mb-4" />
          <h2 className="font-headline text-3xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-[-0.025em] text-aom-warm-white max-w-[45ch]">
            THREE WAYS IN
          </h2>
          <p className="text-aom-stone text-lg md:text-xl mt-4 max-w-2xl leading-relaxed">
            Whether you need monthly content, a single production, or the systems to tie it all together.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <ServiceCard key={service.title} service={service} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
