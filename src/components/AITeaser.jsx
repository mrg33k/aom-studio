import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Loader2 } from 'lucide-react'

const processSteps = [
  { label: 'input', value: 'filming days / month' },
  { label: 'system', value: 'content.pipeline.run()' },
  { label: 'output', value: '30 days of social content' },
]

export default function AITeaser() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return

    setStatus('loading')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <section id="digital" className="py-16 md:py-24 bg-aom-mid-dark relative overflow-hidden" aria-label="Digital systems and AI">
      {/* Cross hatch pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
        background: `repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 8px)`
      }} />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10">
        {/* Section header */}
        <div className="mb-12">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-aom-sage mb-4">
            The Engine
          </p>
          <div className="w-12 h-[2px] bg-aom-sage mb-4" />
          <h2 className="font-headline text-3xl md:text-5xl lg:text-5xl font-extrabold uppercase tracking-[-0.02em] text-aom-text-light max-w-[45ch] leading-[0.95]">
            THE ENGINE BEHIND THE BRAND
          </h2>
          <p className="text-aom-text-muted text-lg md:text-xl mt-4 max-w-2xl leading-relaxed font-body">
            We built the system that runs our own content pipeline, client ops, and reporting. Now we're building them for a small group of businesses.
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
              className="p-6 md:p-8 border border-aom-sage/20 bg-white/[0.03] shadow-sm mb-6"
            >
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-aom-sage mb-6">
                How It Works
              </p>

              <div className="space-y-4">
                {processSteps.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-4">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      step.label === 'system' ? 'bg-aom-sage animate-pulse' : 'bg-aom-sage'
                    }`} />
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-aom-text-muted w-16 shrink-0">
                      {step.label}
                    </span>
                    <div className="flex-1 border-t border-dashed border-aom-sage/20" />
                    <span className={`font-body text-base ${
                      step.label === 'system' ? 'text-aom-sage font-medium' : 'text-aom-text-light'
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
              className="p-6 md:p-8 border border-white/10 bg-white/[0.03]"
            >
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-aom-text-muted mb-4">
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
                    <span className="text-aom-text-muted text-base leading-relaxed font-body">{item}</span>
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
            <div className="p-6 md:p-8 border-2 border-white/10 bg-aom-night-card shadow-xl flex-1 flex flex-col">
              {/* Status badge */}
              <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-aom-sage/30 bg-aom-sage/10 font-mono text-[11px] text-aom-sage uppercase tracking-[0.3em] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-aom-sage animate-pulse" />
                  Early Access
                </span>
              </div>

              <h3 className="font-headline text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-aom-text-light mb-4">
                WE BUILT THIS FOR OURSELVES FIRST
              </h3>

              <p className="text-aom-text-muted text-base leading-relaxed mb-2 font-body">
                The same system that runs AOM's content pipeline, client reporting, and internal operations. We're opening it up to a small group of businesses who want the same infrastructure without building it from scratch.
              </p>

              <p className="font-body text-base text-aom-sage font-medium mb-8">
                No pricing on the site. No chatbot demos. Just real systems that replace real work.
              </p>

              {/* Waitlist form */}
              <div className="mt-auto">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-aom-text-muted mb-4">
                  Join the Waitlist
                </p>

                {status === 'success' ? (
                  <div className="flex items-center gap-3 p-4 border border-aom-sage/30 bg-aom-sage/10">
                    <Check size={18} className="text-aom-sage shrink-0" />
                    <p className="font-body text-base text-aom-sage">
                      You're on the list. We'll reach out when it's your turn.
                    </p>
                  </div>
                ) : status === 'error' ? (
                  <div className="flex items-center gap-3 p-4 border border-red-600/30 bg-red-600/10">
                    <p className="font-body text-base text-red-400">
                      Something went wrong. Try again in a moment.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                    <label htmlFor="waitlist-email" className="sr-only">Email address</label>
                    <input
                      id="waitlist-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      aria-label="Email address for waitlist"
                      className="flex-1 px-4 py-3 border border-white/10 bg-white/5 text-aom-text-light font-body text-base placeholder:text-white/20 focus:outline-none focus:border-aom-sage transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={status === 'loading'}
                      className="bg-aom-sage text-white font-headline font-extrabold uppercase tracking-tight px-6 py-3 hover:bg-aom-sage-light transition-colors shadow-lg shadow-aom-sage/20 flex items-center justify-center gap-2 disabled:opacity-60"
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
