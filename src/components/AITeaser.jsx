import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Loader2 } from 'lucide-react'

const processSteps = [
  { label: 'input', value: '1 filming day' },
  { label: 'system', value: 'content.pipeline.run()' },
  { label: 'output', value: '30 days of social content' },
]

export default function AITeaser() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return

    setStatus('loading')

    // Simulate submission. Replace with real endpoint later.
    setTimeout(() => {
      setStatus('success')
      setEmail('')
    }, 1200)
  }

  return (
    <section className="py-16 md:py-24 bg-aom-surface relative overflow-hidden">
      {/* Subtle sage gradient wash */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-sage mb-4">
            The Engine
          </p>
          <div className="w-12 h-[2px] bg-aom-sage mb-4" />
          <h2 className="font-headline text-3xl md:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter text-aom-warm-white max-w-[45ch]">
            THE SYSTEM BEHIND THE BRAND
          </h2>
          <p className="text-aom-stone text-base md:text-lg mt-4 max-w-2xl leading-relaxed">
            We built an AI system that runs our own business. Now we're building them for clients.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Left: Process visualization */}
          <div>
            {/* Input/Output card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="p-6 md:p-8 rounded-sm border border-aom-sage-muted/30 bg-emerald-950/10 shadow-xl mb-6"
            >
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-aom-sage mb-6">
                How It Works
              </p>

              <div className="space-y-4">
                {processSteps.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-4">
                    {/* Status dot */}
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      step.label === 'system' ? 'bg-aom-sage animate-pulse' : 'bg-aom-sage'
                    }`} />

                    {/* Label */}
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-aom-dim w-16 shrink-0">
                      {step.label}
                    </span>

                    {/* Connector */}
                    <div className="flex-1 border-t border-dashed border-aom-sage-muted/20" />

                    {/* Value */}
                    <span className={`font-mono text-sm ${
                      step.label === 'system' ? 'text-aom-sage' : 'text-aom-warm-white'
                    }`}>
                      {step.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Capabilities list */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
              className="p-6 md:p-8 rounded-sm border border-aom-border bg-aom-charcoal"
            >
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-4">
                What the system handles
              </p>
              <ul className="space-y-3">
                {[
                  'Content scheduling and pipeline management',
                  'Client reporting and performance dashboards',
                  'Automated workflows that replace manual busywork',
                  'Internal tools built around how you actually work',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-aom-sage shrink-0" />
                    <span className="text-aom-stone text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Right: Waitlist */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="flex flex-col"
          >
            <div className="p-6 md:p-8 rounded-sm border border-aom-sage-muted/30 bg-emerald-950/10 shadow-2xl flex-1 flex flex-col">
              {/* Status badge */}
              <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-aom-sage-muted/30 bg-aom-charcoal font-mono text-[10px] text-aom-sage uppercase tracking-[0.2em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-aom-sage animate-pulse" />
                  Early Access
                </span>
              </div>

              <h3 className="font-headline text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-aom-warm-white mb-4">
                WE BUILT THIS FOR OURSELVES FIRST
              </h3>

              <p className="text-aom-stone text-sm leading-relaxed mb-2">
                The same system that runs AOM's content pipeline, client reporting, and internal operations. We're opening it up to a small group of businesses who want the same infrastructure without building it from scratch.
              </p>

              <p className="font-mono text-sm text-aom-sage mb-8">
                No pricing on the site. No chatbot demos. Just real systems that replace real work.
              </p>

              {/* Waitlist form */}
              <div className="mt-auto">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-4">
                  Join the Waitlist
                </p>

                {status === 'success' ? (
                  <div className="flex items-center gap-3 p-4 rounded-sm border border-green-500/30 bg-green-950/10">
                    <Check size={18} className="text-green-500 shrink-0" />
                    <p className="font-mono text-sm text-green-500">
                      You're on the list. We'll reach out when it's your turn.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="flex-1 px-4 py-3 rounded-sm border border-aom-border bg-aom-surface text-aom-warm-white font-mono text-sm placeholder:text-aom-dim focus:outline-none focus:border-aom-sage transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="bg-aom-sage text-white font-headline font-black uppercase tracking-tight px-6 py-3 hover:bg-aom-sage-light transition-colors shadow-lg shadow-aom-sage/20 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {status === 'loading' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          Get Access <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
