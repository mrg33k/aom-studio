import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Calendar, Workflow, ShieldCheck, Smartphone, Brain,
  Phone, X, ChevronRight, Target, Landmark, Menu
} from 'lucide-react'

// ─── BRAND CONSTANTS ────────────────────────────────────────────────────────
const ORANGE = '#E85D26'
const SAGE = '#7C9A72'
const BG = '#0C0C0C'
const CARD_BG = '#151515'
const TEXT = '#F0ECE6'
const MUTED = '#8A847C'
const BORDER = 'rgba(255,255,255,0.10)'
const MAIN_PHONE = '6023732164'
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xbdalqvg'

// ─── INTERSECTION OBSERVER HOOK ─────────────────────────────────────────────
function useIntersect(options = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15, ...options }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

// ─── RESPONSIVE HOOK ────────────────────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < bp)
  useEffect(() => {
    const c = () => setM(window.innerWidth < bp)
    window.addEventListener('resize', c)
    return () => window.removeEventListener('resize', c)
  }, [bp])
  return m
}

// ─── COUNTUP HOOK ───────────────────────────────────────────────────────────
function useCountUp(end, duration = 1500, trigger = false) {
  const [val, setVal] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (!trigger || started.current) return
    started.current = true
    const num = parseInt(end, 10)
    if (isNaN(num)) return
    const start = performance.now()
    const step = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(eased * num))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [trigger, end, duration])
  return val
}

// ─── TYPEWRITER HOOK ────────────────────────────────────────────────────────
function useTypewriter(text, trigger = false, speed = 120) {
  const [display, setDisplay] = useState('')
  const started = useRef(false)
  useEffect(() => {
    if (!trigger || started.current) return
    started.current = true
    let i = 0
    const iv = setInterval(() => {
      i++
      setDisplay(text.slice(0, i))
      if (i >= text.length) clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [trigger, text, speed])
  return display
}

// ─── PATTERN STRIP DIVIDER ──────────────────────────────────────────────────
function PatternStrip() {
  return (
    <div className="w-full" style={{ height: 6 }}>
      <div className="w-full h-full" style={{
        background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)'
      }} />
    </div>
  )
}

// ─── FILM GRAIN OVERLAY ─────────────────────────────────────────────────────
function GrainOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[1]" style={{ opacity: 0.03, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%">
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  )
}

// ─── PHONE MODAL (Talk to Us) ───────────────────────────────────────────────
function PhoneModal({ isOpen, onClose, leadSource = 'system-page' }) {
  const [view, setView] = useState('list')
  const [selectedDept, setSelectedDept] = useState(null)

  useEffect(() => {
    if (!isOpen) setTimeout(() => { setView('list'); setSelectedDept(null) }, 300)
  }, [isOpen])

  if (!isOpen) return null

  const handleRoute = (number) => { window.location.href = `tel:${number}` }
  const departments = [
    { label: 'Scheduling', icon: Calendar, sub: 'Inquiries & Logistics', number: MAIN_PHONE },
    { label: 'Creative', icon: Target, sub: 'Vision & Strategy', number: MAIN_PHONE },
    { label: 'Support', icon: ShieldCheck, sub: 'Operations & Billing', number: MAIN_PHONE },
    { label: 'Accounting', icon: Landmark, sub: 'Invoicing & Vendors', number: MAIN_PHONE, hasEmail: true },
  ]

  return (
    <motion.div
      key="phone-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg p-10 border border-white/10 relative shadow-2xl overflow-hidden" style={{ background: BG }}>
        <button onClick={onClose} className="absolute top-6 right-6 z-20" style={{ color: MUTED }}><X size={20} /></button>
        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div key="list" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ background: `${ORANGE}0d`, border: `1px solid ${ORANGE}33` }}>
                  <Phone size={24} style={{ color: ORANGE }} />
                </div>
                <h2 className="text-3xl font-headline font-extrabold uppercase tracking-tighter" style={{ color: TEXT }}>Connect<span style={{ color: ORANGE }}>.</span></h2>
                <p className="text-xs font-body font-bold uppercase mt-3" style={{ color: MUTED, letterSpacing: '0.3em' }}>Select Department</p>
              </div>
              <div className="space-y-2">
                {departments.map(item => (
                  <button
                    key={item.label}
                    onClick={() => { setSelectedDept(item); setView('dept') }}
                    className="w-full p-4 border border-white/10 hover:border-[rgba(232,93,38,0.3)] transition-all group flex items-center justify-between text-left"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div className="flex items-center gap-4">
                      <item.icon size={16} style={{ color: MUTED }} />
                      <div>
                        <p className="font-headline font-extrabold uppercase tracking-widest text-xs" style={{ color: TEXT }}>{item.label}</p>
                        <p className="text-xs font-body mt-0.5" style={{ color: MUTED }}>{item.sub}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: MUTED }} />
                  </button>
                ))}
              </div>
              {/* Hidden field to tag lead source */}
              <input type="hidden" name="_source" value={leadSource} />
            </motion.div>
          ) : view === 'dept' && selectedDept ? (
            <motion.div key="dept" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ background: `${ORANGE}0d`, border: `1px solid ${ORANGE}33` }}>
                  <selectedDept.icon size={24} style={{ color: ORANGE }} />
                </div>
                <h2 className="text-2xl font-headline font-extrabold uppercase tracking-tighter" style={{ color: TEXT }}>{selectedDept.label}</h2>
                <p className="text-xs font-body font-bold uppercase mt-2" style={{ color: MUTED, letterSpacing: '0.3em' }}>{selectedDept.sub}</p>
              </div>
              <div className="space-y-4">
                {selectedDept.hasEmail && (
                  <div className="p-4 text-center" style={{ border: `1px solid ${ORANGE}1a`, background: `${ORANGE}0d` }}>
                    <p className="text-xs leading-relaxed" style={{ color: MUTED }}>Please send an email to <span style={{ color: ORANGE, fontWeight: 700 }}>hello@aom-inhouse.com</span> to accompany your call.</p>
                  </div>
                )}
                <button
                  onClick={() => handleRoute(selectedDept.number)}
                  className="w-full py-4 font-headline font-extrabold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-xl"
                  style={{ background: ORANGE, color: '#fff' }}
                >
                  <Phone size={14} className="fill-white" /> Call {selectedDept.label}
                </button>
                <a
                  href="mailto:hello@aom-inhouse.com"
                  className="w-full py-4 border border-white/10 font-headline font-extrabold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.03)', color: MUTED }}
                >
                  <Mail size={14} /> Email Instead
                </a>
              </div>
              <button onClick={() => { setView('list'); setSelectedDept(null) }} className="w-full mt-6 text-xs font-body uppercase transition-colors" style={{ color: MUTED, letterSpacing: '0.15em' }}>Back</button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── MICRO LABEL ────────────────────────────────────────────────────────────
function MicroLabel({ children, color = SAGE }) {
  return (
    <div className="font-body font-bold uppercase mb-4" style={{
      fontSize: 11,
      letterSpacing: '0.15em',
      color,
    }}>
      {children}
    </div>
  )
}

// ─── SECTION HEADLINE ───────────────────────────────────────────────────────
function SectionHeadline({ children, className = '' }) {
  const isMobile = useIsMobile()
  return (
    <h2 className={`font-headline font-extrabold uppercase ${className}`} style={{
      fontSize: isMobile ? 28 : 40,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
      color: TEXT,
    }}>
      {children}
    </h2>
  )
}

// ─── FADE UP WRAPPER ────────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }) {
  const [ref, visible] = useIntersect()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: HERO
// ═══════════════════════════════════════════════════════════════════════════
function HeroSection({ onTalkToUs }) {
  const isMobile = useIsMobile()
  return (
    <section className="relative overflow-hidden flex items-center justify-center" style={{ minHeight: '100vh', background: BG }}>
      {/* Orange gradient wash */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at 50% 30%, ${ORANGE}05 0%, transparent 70%)`
      }} />

      <div className="relative z-10 text-center w-full" style={{ padding: isMobile ? '80px 20px' : '120px 40px' }}>
        {/* Micro label - no animation */}
        <MicroLabel>THE SYSTEM</MicroLabel>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="font-headline font-extrabold uppercase mx-auto"
          style={{
            fontSize: isMobile ? 36 : 56,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: TEXT,
            maxWidth: 896,
          }}
        >
          WE BUILT AN AI SYSTEM THAT RUNS OUR BUSINESS. NOW WE BUILD YOURS.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className="font-body mx-auto"
          style={{
            fontSize: isMobile ? 16 : 18,
            color: MUTED,
            maxWidth: 672,
            lineHeight: 1.6,
            marginTop: 24,
          }}
        >
          Not a chatbot. Not a course. A working operations system that handles email, scheduling, client tracking, outreach, and quality control while you focus on the work that actually makes you money.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
          style={{ marginTop: 48 }}
        >
          <button
            onClick={onTalkToUs}
            className="font-headline font-extrabold uppercase tracking-wider text-white transition-all"
            style={{
              background: ORANGE,
              padding: isMobile ? '16px 40px' : '18px 48px',
              fontSize: 15,
              minHeight: 48,
              boxShadow: `0 8px 30px ${ORANGE}40`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#D14E1C'; e.currentTarget.style.boxShadow = `0 8px 40px ${ORANGE}50` }}
            onMouseLeave={e => { e.currentTarget.style.background = ORANGE; e.currentTarget.style.boxShadow = `0 8px 30px ${ORANGE}40` }}
          >
            TALK TO US
          </button>
        </motion.div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: THE PROBLEM
// ═══════════════════════════════════════════════════════════════════════════
function ProblemSection() {
  const isMobile = useIsMobile()
  const painPoints = [
    'Following up on emails you meant to send three days ago',
    'Scheduling and rescheduling the same meeting four times',
    'Trying to remember which client needs what by when',
    'Posting on social media because you know you should, then going silent for two weeks',
    'Losing track of proposals you sent out and never hearing back',
  ]

  return (
    <section style={{ padding: isMobile ? '64px 20px' : '96px 40px' }}>
      <div className="mx-auto" style={{ maxWidth: 1152 }}>
        <div className={isMobile ? '' : 'grid grid-cols-2 gap-16'}>
          {/* Left column - headline area */}
          <div className={isMobile ? 'mb-10' : 'sticky top-24 self-start'}>
            <FadeUp>
              <MicroLabel>THE PROBLEM</MicroLabel>
              <SectionHeadline>YOU'RE DOING $20/HOUR WORK ON A $200/HOUR SCHEDULE</SectionHeadline>
            </FadeUp>
          </div>

          {/* Right column - content */}
          <div>
            <FadeUp>
              <p className="font-body" style={{ fontSize: 18, color: MUTED, lineHeight: 1.6, marginBottom: 32 }}>
                You run a real business. You're good at what you do. But half your week disappears into admin work that doesn't grow anything.
              </p>
            </FadeUp>

            {/* Pain points */}
            <div style={{ marginBottom: 32 }}>
              {painPoints.map((point, i) => (
                <FadeUp key={i} delay={i * 100}>
                  <div className="flex items-start gap-4" style={{ marginBottom: 16 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: ORANGE, flexShrink: 0, marginTop: 9,
                    }} />
                    <p className="font-body" style={{ fontSize: 16, color: TEXT, lineHeight: 1.6 }}>{point}</p>
                  </div>
                </FadeUp>
              ))}
            </div>

            <FadeUp delay={500}>
              <p className="font-body" style={{ fontSize: 18, color: MUTED, lineHeight: 1.6, marginBottom: 16 }}>
                You didn't start your business to manage inboxes. But here you are, buried in operations, doing the work of three people because hiring help isn't in the budget yet.
              </p>
              <p className="font-body" style={{ fontSize: 18, color: MUTED, lineHeight: 1.6 }}>
                Sound familiar? We know. Because that was us six months ago.
              </p>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: WHAT WE BUILT
// ═══════════════════════════════════════════════════════════════════════════
function WhatWeBuiltSection() {
  const isMobile = useIsMobile()
  const capabilities = [
    { icon: Mail, title: 'EMAIL OUTREACH', desc: 'Our outreach agent writes personalized cold emails based on each prospect\'s actual business, sends them on schedule, and tracks responses.' },
    { icon: Calendar, title: 'CALENDAR MANAGEMENT', desc: '"Block two hours Thursday afternoon for editing." Done. No clicking through menus. Just say what you need.' },
    { icon: ShieldCheck, title: 'QUALITY CONTROL', desc: 'Every deliverable runs through a quality gate. Broken links, slow load times, design issues, copy errors. Caught and fixed automatically.' },
    { icon: Smartphone, title: 'MOBILE COMMAND CENTER', desc: 'Run the entire system from your phone via Telegram. On set? In a meeting? Full visibility and control from anywhere.' },
    { icon: Brain, title: 'INSTITUTIONAL MEMORY', desc: 'Every decision gets logged. Priorities update automatically. The system remembers what happened last Tuesday so you don\'t have to.' },
  ]

  const pipelineNodes = [
    { name: 'ELON', role: 'System Scanner' },
    { name: 'MOM', role: 'Orchestrator' },
    { name: 'ALEX', role: 'Strategist' },
    { name: 'STEFFEN', role: 'Brand + Design' },
    { name: 'BOBBY', role: 'Builder' },
    { name: 'ELMO', role: 'Quality Gate' },
  ]

  return (
    <section style={{ padding: isMobile ? '64px 20px' : '96px 40px' }}>
      <div className="mx-auto" style={{ maxWidth: 1152 }}>
        <FadeUp>
          <MicroLabel>WHAT WE BUILT</MicroLabel>
          <SectionHeadline>WE FIXED IT FOR OURSELVES FIRST</SectionHeadline>
          <p className="font-body" style={{ fontSize: 18, color: MUTED, lineHeight: 1.6, marginTop: 20, maxWidth: 720 }}>
            AOM is a creative production company. We make videos, websites, and brand content for clients. We were drowning in the same operational chaos as every other small business. So we built a system. Not in theory. For real. It runs every day.
          </p>
        </FadeUp>

        {/* Capability cards - 2 col grid */}
        <div className="mt-12" style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: isMobile ? 16 : 24,
        }}>
          {capabilities.map((cap, i) => (
            <FadeUp key={cap.title} delay={i * 80}>
              <div
                className="transition-all duration-300 hover:border-[rgba(232,93,38,0.3)]"
                style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  padding: isMobile ? 24 : 32,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{
                  width: 48, height: 48,
                  border: `1px solid ${BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <cap.icon size={20} style={{ color: SAGE }} strokeWidth={2} />
                </div>
                <h3 className="font-body font-bold uppercase" style={{
                  fontSize: 18, color: TEXT, letterSpacing: '0.05em', marginBottom: 8,
                }}>{cap.title}</h3>
                <p className="font-body" style={{ fontSize: 16, color: MUTED, lineHeight: 1.6 }}>{cap.desc}</p>
              </div>
            </FadeUp>
          ))}

          {/* Multi-Agent Pipeline card - full width */}
          <FadeUp delay={capabilities.length * 80} className={isMobile ? '' : 'col-span-2'}>
            <div
              className="transition-all duration-300"
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                padding: isMobile ? 24 : 32,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              }}
            >
              <div style={{
                width: 48, height: 48,
                border: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                <Workflow size={20} style={{ color: SAGE }} strokeWidth={2} />
              </div>
              <h3 className="font-body font-bold uppercase" style={{
                fontSize: 18, color: TEXT, letterSpacing: '0.05em', marginBottom: 8,
              }}>MULTI-AGENT PIPELINE</h3>
              <p className="font-body" style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, marginBottom: 32 }}>
                Instead of one AI doing everything badly, we have specialists. Each one does its job. They hand work to each other automatically. The founder only steps in to approve or redirect.
              </p>

              {/* Pipeline Diagram */}
              <PipelineDiagram nodes={pipelineNodes} isMobile={isMobile} />
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

// ─── PIPELINE DIAGRAM ───────────────────────────────────────────────────────
function PipelineDiagram({ nodes, isMobile }) {
  const [ref, visible] = useIntersect()

  return (
    <div ref={ref}>
      {/* Agent nodes */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? 0 : 0,
      }}>
        {nodes.map((node, i) => (
          <div key={node.name} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center' }}>
            {/* Node */}
            <div style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'scale(1)' : 'scale(0.8)',
              transition: `all 0.5s ease ${i * 150}ms`,
              padding: isMobile ? '8px 0' : '0 6px',
            }}>
              <div style={{
                width: isMobile ? '100%' : 80,
                minWidth: isMobile ? 160 : 80,
                background: CARD_BG,
                border: `1px solid rgba(92,122,84,0.4)`,
                padding: isMobile ? '12px 20px' : '12px 8px',
                textAlign: 'center',
                position: 'relative',
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                alignItems: 'center',
                gap: isMobile ? 12 : 4,
              }}>
                {/* Status dot */}
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: SAGE,
                  position: isMobile ? 'static' : 'absolute',
                  top: 6, left: 6,
                  flexShrink: 0,
                }} />
                <div>
                  <div className="font-body font-bold uppercase" style={{
                    fontSize: 13, letterSpacing: '0.1em', color: TEXT,
                  }}>{node.name}</div>
                  <div className="font-body" style={{
                    fontSize: 12, color: MUTED,
                  }}>{node.role}</div>
                </div>
              </div>
            </div>

            {/* Arrow/line between nodes */}
            {i < nodes.length - 1 && (
              <div style={{
                opacity: visible ? 1 : 0,
                transition: `opacity 0.4s ease ${(i + 1) * 150}ms`,
                color: `rgba(124,154,114,0.4)`,
                fontSize: isMobile ? 16 : 18,
                padding: isMobile ? '2px 0' : '0 2px',
                transform: isMobile ? 'rotate(90deg)' : 'none',
              }}>
                &#x203A;
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Patrik loop-back */}
      <div style={{
        opacity: visible ? 1 : 0,
        transition: `all 0.5s ease ${nodes.length * 150 + 200}ms`,
        display: 'flex',
        justifyContent: 'center',
        marginTop: isMobile ? 8 : 16,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 1,
            height: 24,
            background: `${ORANGE}40`,
            borderLeft: `1px dashed ${ORANGE}66`,
          }} />
          <div style={{
            background: CARD_BG,
            border: `1px solid ${ORANGE}40`,
            padding: '10px 20px',
            textAlign: 'center',
          }}>
            <div className="font-body font-bold uppercase" style={{
              fontSize: 13, letterSpacing: '0.1em', color: ORANGE,
            }}>PATRIK</div>
            <div className="font-body" style={{
              fontSize: 12, color: MUTED,
            }}>Approve / Redirect</div>
          </div>
          <div style={{
            fontSize: 12, color: `${ORANGE}66`,
            fontStyle: 'italic',
          }}>&#x21BB; loop</div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: REAL RESULTS
// ═══════════════════════════════════════════════════════════════════════════
function ResultsSection() {
  const isMobile = useIsMobile()
  const [ref, visible] = useIntersect()

  const results = [
    { stat: '12', label: 'OUTREACH EMAILS SENT', detail: 'While the founder was on a film set. Each one referenced the prospect\'s actual business. Real personalization.' },
    { stat: '2', label: 'WEBSITES BUILT + QA\'D', detail: 'Without writing a single line of code. The web agent built them, the QA agent tested them, issues caught and fixed.' },
    { stat: '0', label: 'DROPPED BALLS', detail: 'On a 6-client workload. The operations agent scans every active project daily and flags anything falling behind.' },
    { stat: '100', label: 'CALENDAR BY VOICE', suffix: '%', detail: 'Editing blocks, client calls, production days, team schedules. All handled through natural language.' },
    { stat: 'AUTO', label: 'BRAND CONSISTENCY', detail: 'Every visual checked against standards. Font sizes, contrast ratios, spacing, color accuracy. Pickier than any human reviewer.' },
  ]

  return (
    <section ref={ref} style={{ padding: isMobile ? '64px 20px' : '96px 40px' }}>
      <div className="mx-auto" style={{ maxWidth: 1152 }}>
        <FadeUp>
          <MicroLabel>PROOF</MicroLabel>
          <SectionHeadline>THIS IS WHAT HAPPENED LAST WEEK</SectionHeadline>
        </FadeUp>

        <div className="mt-12" style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: isMobile ? 16 : 24,
        }}>
          {results.map((r, i) => (
            <FadeUp key={r.label} delay={i * 150} className={!isMobile && i === results.length - 1 ? 'col-span-2' : ''}>
              <ResultCard result={r} visible={visible} isMobile={isMobile} />
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

function ResultCard({ result, visible, isMobile }) {
  const isNumeric = !isNaN(parseInt(result.stat, 10))
  const countVal = useCountUp(result.stat, 1500, visible && isNumeric)
  const typeVal = useTypewriter(result.stat, visible && !isNumeric)

  return (
    <div style={{
      background: CARD_BG,
      borderLeft: `3px solid ${ORANGE}`,
      padding: isMobile ? 24 : 32,
    }}>
      <div className="font-headline font-extrabold" style={{
        fontSize: 48, color: ORANGE, lineHeight: 1, marginBottom: 8,
      }}>
        {isNumeric ? countVal : typeVal}{result.suffix || ''}
      </div>
      <div className="font-body font-bold uppercase" style={{
        fontSize: 14, color: TEXT, letterSpacing: '0.05em', marginBottom: 8,
      }}>{result.label}</div>
      <p className="font-body" style={{ fontSize: 16, color: MUTED, lineHeight: 1.6 }}>{result.detail}</p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: THE GAP (Comparison Table)
// ═══════════════════════════════════════════════════════════════════════════
function GapSection() {
  const isMobile = useIsMobile()
  const [expandedCol, setExpandedCol] = useState(null)

  const rows = [
    { label: 'COST', enterprise: '$50K-$500K+', diy: '$0-$500', aom: '$2,500-$8,000' },
    { label: 'WHAT YOU GET', enterprise: 'Custom system, dedicated team', diy: 'Videos, templates, figure it out', aom: 'Working system, built for your business' },
    { label: 'WHO IT\'S FOR', enterprise: 'Fortune 500', diy: 'Hobbyists, solopreneurs', aom: 'Real businesses, 5-50 employees' },
    { label: 'TIMELINE', enterprise: '6-12 months', diy: 'Self-paced (forever)', aom: '2-4 weeks' },
  ]

  const columns = [
    { key: 'enterprise', header: 'Enterprise', featured: false },
    { key: 'diy', header: 'DIY / Courses', featured: false },
    { key: 'aom', header: 'AOM', featured: true },
  ]

  return (
    <section style={{ padding: isMobile ? '64px 20px' : '96px 40px' }}>
      <div className="mx-auto" style={{ maxWidth: 1152 }}>
        <FadeUp>
          <MicroLabel>THE GAP</MicroLabel>
          <SectionHeadline>ENTERPRISE GETS THIS. YOU DON'T. UNTIL NOW.</SectionHeadline>
          <p className="font-body" style={{ fontSize: 18, color: MUTED, lineHeight: 1.6, marginTop: 20, maxWidth: 720 }}>
            Big companies spend $200,000+ on AI consultants from McKinsey or Deloitte. Small business owners get YouTube tutorials and $500 online courses. Nobody's actually building working systems for businesses your size.
          </p>
        </FadeUp>

        {/* Comparison cards */}
        <div className="mt-12">
          {isMobile ? (
            // Mobile: AOM on top, others accordion
            <div className="space-y-4">
              {/* AOM first */}
              <FadeUp delay={200}>
                <ComparisonCard column={columns[2]} rows={rows} featured />
              </FadeUp>
              {/* Enterprise + DIY accordion */}
              {[columns[0], columns[1]].map((col) => (
                <FadeUp key={col.key}>
                  <button
                    onClick={() => setExpandedCol(expandedCol === col.key ? null : col.key)}
                    className="w-full text-left font-body font-bold uppercase text-sm flex justify-between items-center"
                    style={{
                      background: CARD_BG, border: `1px solid ${BORDER}`,
                      padding: '16px 20px', color: MUTED, letterSpacing: '0.1em',
                      minHeight: 48,
                    }}
                  >
                    {col.header}
                    <ChevronRight size={16} style={{
                      transform: expandedCol === col.key ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                    }} />
                  </button>
                  {expandedCol === col.key && (
                    <ComparisonCard column={col} rows={rows} />
                  )}
                </FadeUp>
              ))}
            </div>
          ) : (
            // Desktop: 3 columns side by side
            <div className="grid grid-cols-3 gap-6">
              {columns.map((col, i) => (
                <FadeUp key={col.key} delay={col.featured ? 200 : 0}>
                  <ComparisonCard column={col} rows={rows} featured={col.featured} />
                </FadeUp>
              ))}
            </div>
          )}
        </div>

        {/* Closing line */}
        <FadeUp>
          <p className="font-body text-center" style={{
            fontSize: 20, fontWeight: 500, color: TEXT, marginTop: 48,
          }}>
            That gap in the middle? That's where 99% of businesses live. That's where we operate.
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

function ComparisonCard({ column, rows, featured = false }) {
  return (
    <div style={{
      background: CARD_BG,
      border: featured ? `1px solid rgba(232,93,38,0.4)` : `1px solid ${BORDER}`,
      boxShadow: featured ? `0 0 60px rgba(232,93,38,0.08)` : 'none',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
        {featured && (
          <div className="font-body font-bold uppercase inline-block mb-2" style={{
            fontSize: 10, letterSpacing: '0.15em',
            background: ORANGE, color: '#fff',
            padding: '4px 10px',
          }}>
            RECOMMENDED
          </div>
        )}
        <h3 className={featured ? 'font-headline' : 'font-body'} style={{
          fontSize: featured ? 18 : 16,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: featured ? ORANGE : MUTED,
        }}>
          {column.header}
        </h3>
      </div>

      {/* Rows */}
      {rows.map((row, i) => (
        <div key={row.label} style={{
          padding: 20,
          borderBottom: i < rows.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none',
        }}>
          <div className="font-body font-semibold uppercase" style={{
            fontSize: 12, letterSpacing: '0.1em', color: MUTED, marginBottom: 6,
          }}>{row.label}</div>
          <div className="font-body" style={{
            fontSize: 16, color: featured ? TEXT : MUTED,
          }}>{row[column.key]}</div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: WHO THIS IS FOR
// ═══════════════════════════════════════════════════════════════════════════
function WhoSection() {
  const isMobile = useIsMobile()
  const tags = ['Contractors', 'HVAC', 'Law Firms', 'Dental Practices', 'Real Estate', 'Nonprofits', 'Creative Agencies']

  return (
    <section style={{ padding: isMobile ? '64px 20px' : '96px 40px' }}>
      <div className="mx-auto" style={{ maxWidth: 1152 }}>
        <FadeUp>
          <MicroLabel>WHO IT'S FOR</MicroLabel>
          <SectionHeadline>BUILT FOR BUSINESSES LIKE YOURS</SectionHeadline>
        </FadeUp>

        <FadeUp delay={100}>
          <div className="font-body" style={{ fontSize: 18, color: MUTED, lineHeight: 1.6, marginTop: 20, maxWidth: 768 }}>
            <p style={{ marginBottom: 16 }}>
              This is for small service businesses doing $500K to $5M in revenue who are running on grit and spreadsheets. You have revenue. You have clients. You don't have a back-office team.
            </p>
            <p>
              You're the owner, the salesperson, the project manager, the bookkeeper, and the social media manager. All at once. And something is always falling through the cracks.
            </p>
          </div>
        </FadeUp>

        {/* Industry tags */}
        <FadeUp delay={200}>
          <div className="flex flex-wrap gap-3 mt-10">
            {tags.map(tag => (
              <div
                key={tag}
                className="font-body font-semibold uppercase transition-all duration-300 hover:border-[rgba(232,93,38,0.3)]"
                style={{
                  fontSize: 12, letterSpacing: '0.1em', color: MUTED,
                  border: `1px solid ${BORDER}`,
                  padding: '8px 16px',
                  minHeight: 48,
                  display: 'flex', alignItems: 'center',
                  cursor: 'default',
                }}
                onMouseEnter={e => e.currentTarget.style.color = TEXT}
                onMouseLeave={e => e.currentTarget.style.color = MUTED}
              >
                {tag}
              </div>
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={300}>
          <p className="font-body" style={{
            fontSize: 20, fontWeight: 500, color: TEXT, marginTop: 32,
          }}>
            We know because we are you.
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: THE OFFER
// ═══════════════════════════════════════════════════════════════════════════
function OfferSection({ onTalkToUs }) {
  const isMobile = useIsMobile()

  const included = [
    { num: '1', title: 'Discovery session (2-3 hours)', desc: 'We walk through your daily operations. Where do you spend time? What falls through the cracks? What do you wish someone else handled?' },
    { num: '2', title: 'Operations mapping', desc: 'We document your workflows: how leads come in, how clients get managed, how work gets delivered, how follow-ups happen (or don\'t).' },
    { num: '3', title: 'AI opportunity analysis', desc: 'We identify every place where an AI system can take work off your plate. Specific, practical recommendations based on your actual business.' },
    { num: '4', title: 'Written report with prioritized recommendations', desc: 'What to automate first. Expected time savings. What it would take to build. Clear, plain English. No jargon.' },
    { num: '5', title: 'Walkthrough call', desc: 'We present the findings, answer your questions, and help you decide what to do next.' },
  ]

  return (
    <section style={{ padding: isMobile ? '64px 20px' : '96px 40px' }}>
      <div className="mx-auto" style={{ maxWidth: 768 }}>
        <FadeUp>
          <div style={{
            background: CARD_BG,
            border: `1px solid rgba(232,93,38,0.25)`,
            boxShadow: `0 25px 80px rgba(232,93,38,0.06)`,
            padding: isMobile ? 32 : 48,
          }}>
            {/* Micro label */}
            <MicroLabel color={ORANGE}>THE OFFER</MicroLabel>

            {/* Headline */}
            <h2 className="font-headline font-extrabold uppercase" style={{
              fontSize: isMobile ? 32 : 40, color: TEXT, lineHeight: 1.1, letterSpacing: '-0.03em',
            }}>
              AI OPERATIONS AUDIT
            </h2>

            {/* Price */}
            <div className="font-headline font-extrabold" style={{
              fontSize: isMobile ? 44 : 56, color: ORANGE, marginTop: 16, lineHeight: 1,
            }}>
              $2,500 FLAT
            </div>

            {/* Description */}
            <p className="font-body" style={{
              fontSize: 18, color: MUTED, lineHeight: 1.6, marginTop: 24,
            }}>
              We spend two weeks understanding how your business actually runs. Not how you wish it ran. How it runs today. Then we hand you a written report that shows you exactly where AI saves you real time.
            </p>

            {/* What's included */}
            <div style={{ marginTop: 32 }}>
              {included.map((item, i) => (
                <div key={item.num} style={{
                  padding: '24px 0',
                  borderBottom: i < included.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none',
                  display: 'flex',
                  gap: isMobile ? 16 : 20,
                  alignItems: 'flex-start',
                }}>
                  <div className="font-headline font-extrabold" style={{
                    fontSize: 32, color: ORANGE, lineHeight: 1, flexShrink: 0, width: 36,
                  }}>{item.num}</div>
                  <div>
                    <h4 className="font-body font-bold" style={{ fontSize: 18, color: TEXT, marginBottom: 4 }}>{item.title}</h4>
                    <p className="font-body" style={{ fontSize: 16, color: MUTED, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* The Math callout */}
            <div style={{
              background: `rgba(232,93,38,0.05)`,
              border: `1px solid rgba(232,93,38,0.15)`,
              padding: isMobile ? 20 : 24,
              marginTop: 32,
            }}>
              <p className="font-body" style={{ fontSize: 16, fontWeight: 500, color: TEXT, lineHeight: 1.7 }}>
                <strong>The math is simple.</strong> If you're worth <span style={{ color: ORANGE, fontWeight: 700 }}>$100/hour</span> to your business and we find <span style={{ color: ORANGE, fontWeight: 700 }}>10 hours</span> a week of automatable work, you recoup your <span style={{ color: ORANGE, fontWeight: 700 }}>$2,500</span> investment in less than <span style={{ color: ORANGE, fontWeight: 700 }}>three weeks</span>. Everything after that is time and money back in your pocket.
              </p>
            </div>

            {/* CTA */}
            <div className="text-center" style={{ marginTop: 32 }}>
              <button
                onClick={onTalkToUs}
                className="font-headline font-extrabold uppercase tracking-wider text-white transition-all"
                style={{
                  background: ORANGE,
                  padding: isMobile ? '16px 40px' : '18px 48px',
                  fontSize: 15,
                  minHeight: 48,
                  width: isMobile ? '100%' : 'auto',
                  boxShadow: `0 8px 30px ${ORANGE}40`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#D14E1C' }}
                onMouseLeave={e => { e.currentTarget.style.background = ORANGE }}
              >
                TALK TO US
              </button>
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: WHY AOM
// ═══════════════════════════════════════════════════════════════════════════
function WhyAomSection() {
  const isMobile = useIsMobile()

  return (
    <section style={{ padding: isMobile ? '64px 20px' : '96px 40px' }}>
      <div className="mx-auto" style={{ maxWidth: 1152 }}>
        <div className={isMobile ? '' : 'grid grid-cols-2 gap-16 items-start'}>
          {/* Left - content */}
          <FadeUp>
            <div>
              <MicroLabel>WHY US</MicroLabel>
              <SectionHeadline>WE'RE NOT CONSULTANTS. WE'RE OPERATORS.</SectionHeadline>
              <div className="font-body" style={{ fontSize: 18, color: MUTED, lineHeight: 1.6, marginTop: 20 }}>
                <p style={{ marginBottom: 16 }}>
                  Most AI consultants have never run a business. They studied AI. We run a company with it.
                </p>
                <p style={{ marginBottom: 16 }}>
                  AOM is a working creative production company. We serve real clients. We hit real deadlines. The AI system we're offering to build for you? We use it ourselves, every single day. When we say "this saves you 10 hours a week," it's because it saved us 10 hours a week first.
                </p>
                <p>
                  Patrik Matheson, AOM's founder, built this system for himself. Not because he's a technologist. Because he was drowning in admin work and needed a way out. He found it. Now he helps other business owners find theirs.
                </p>
              </div>
            </div>
          </FadeUp>

          {/* Right - pull quote */}
          <FadeUp delay={200}>
            <div style={{
              background: CARD_BG,
              borderLeft: `3px solid ${ORANGE}`,
              padding: 32,
              marginTop: isMobile ? 32 : 0,
            }}>
              <h3 className="font-headline font-bold" style={{
                fontSize: 28, color: TEXT, lineHeight: 1.2, marginBottom: 16,
              }}>
                "WE'RE THE PROOF OF CONCEPT."
              </h3>
              <p className="font-body" style={{ fontSize: 14, color: MUTED }}>
                Patrik Matheson, Founder
              </p>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: FINAL CTA
// ═══════════════════════════════════════════════════════════════════════════
function FinalCTASection({ onTalkToUs }) {
  const isMobile = useIsMobile()
  const [ref, visible] = useIntersect()
  const [pulsed, setPulsed] = useState(false)

  useEffect(() => {
    if (visible && !pulsed) {
      setPulsed(true)
    }
  }, [visible])

  return (
    <section ref={ref} className="text-center" style={{
      padding: isMobile ? '80px 20px' : '128px 40px',
    }}>
      <FadeUp>
        <h2 className="font-headline font-extrabold uppercase mx-auto" style={{
          fontSize: isMobile ? 36 : 56,
          color: TEXT,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
        }}>
          LET'S FIND YOUR 10 HOURS
        </h2>
      </FadeUp>

      <FadeUp delay={100}>
        <p className="font-body mx-auto" style={{
          fontSize: 20, color: MUTED, lineHeight: 1.6,
          maxWidth: 672, marginTop: 24,
        }}>
          Book a free 15-minute call. We'll talk about what's eating your time and whether an AI operations audit makes sense for your business. No pitch. No pressure. Just a real conversation with someone who gets it.
        </p>
      </FadeUp>

      <FadeUp delay={200}>
        <div style={{ marginTop: 40 }}>
          <button
            onClick={onTalkToUs}
            className="font-headline font-extrabold uppercase tracking-wider text-white transition-all"
            style={{
              background: ORANGE,
              padding: isMobile ? '20px 48px' : '20px 48px',
              fontSize: 18,
              minHeight: 48,
              width: isMobile ? '100%' : 'auto',
              boxShadow: `0 12px 40px ${ORANGE}40`,
              animation: pulsed ? 'ctaPulse 600ms ease-in-out' : 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#D14E1C'; e.currentTarget.style.boxShadow = `0 12px 50px ${ORANGE}59` }}
            onMouseLeave={e => { e.currentTarget.style.background = ORANGE; e.currentTarget.style.boxShadow = `0 12px 40px ${ORANGE}40` }}
          >
            TALK TO US
          </button>
          <p className="font-body" style={{
            fontSize: 14, color: MUTED, marginTop: 16,
          }}>
            Free 15-minute call. No pitch. No pressure.
          </p>
        </div>
      </FadeUp>

      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes ctaPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: SOCIAL PROOF (hidden for now, structure in place)
// ═══════════════════════════════════════════════════════════════════════════
// Component exists in code, ready to enable when testimonials/content arrive.
// eslint-disable-next-line no-unused-vars
function SocialProofSection() {
  const isMobile = useIsMobile()
  return (
    <section style={{ padding: isMobile ? '64px 20px' : '96px 40px' }}>
      <div className="mx-auto" style={{ maxWidth: 1152 }}>
        <MicroLabel>PROOF</MicroLabel>
        <SectionHeadline>WHAT CLIENTS SAY</SectionHeadline>
        {/* Testimonial cards placeholder */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {testimonials.map(t => (
            <div key={t.name} style={{ background: CARD_BG, borderLeft: `3px solid ${ORANGE}`, padding: 32 }}>
              <p className="font-body" style={{ fontSize: 18, fontWeight: 500, color: TEXT, lineHeight: 1.6, marginBottom: 16 }}>{t.quote}</p>
              <p className="font-body" style={{ fontSize: 14, color: MUTED }}>{t.name}, {t.company}</p>
            </div>
          ))}
        </div> */}
        {/* Video embed placeholder */}
        {/* <div className="mt-12 mx-auto" style={{ maxWidth: 896, aspectRatio: '16/9', border: `1px solid ${BORDER}` }}></div> */}
        {/* Live counter placeholder */}
        {/* <div className="mt-8 text-center font-body font-semibold" style={{ fontSize: 14, color: SAGE }}>
          This week: X emails sent, X tasks completed, X deliverables QA'd
        </div> */}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SYSTEM PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function SystemPage() {
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()
  const openTalkToUs = useCallback(() => setPhoneOpen(true), [])

  return (
    <div className="min-h-screen font-body antialiased relative" style={{ background: BG, color: TEXT }}>
      <GrainOverlay />

      {/* Phone modal */}
      <AnimatePresence>
        {phoneOpen && <PhoneModal isOpen={phoneOpen} onClose={() => setPhoneOpen(false)} leadSource="system-page" />}
      </AnimatePresence>

      {/* ─── NAV ─── */}
      <header className="fixed top-0 left-0 w-full z-[200] flex justify-between items-center transition-all duration-300"
        style={{
          padding: isMobile ? '16px 20px' : '20px 40px',
          background: 'rgba(12,12,12,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <a href="/" className="text-2xl md:text-3xl font-headline font-extrabold tracking-[-0.03em]" style={{ color: TEXT }}>
          AOM<span style={{ color: ORANGE }}>.</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-4 items-center">
          <a href="/" className="text-xs font-body font-bold uppercase px-3 py-2 transition-colors" style={{ color: MUTED, letterSpacing: '0.15em' }}>Home</a>
          <a href="/#work" className="text-xs font-body font-bold uppercase px-3 py-2 transition-colors" style={{ color: MUTED, letterSpacing: '0.15em' }}>Work</a>
          <span className="text-xs font-body font-bold uppercase px-3 py-2" style={{ color: TEXT, letterSpacing: '0.15em' }}>The System</span>
          <button onClick={openTalkToUs} className="font-headline font-extrabold uppercase text-xs tracking-wider transition-all" style={{
            background: ORANGE, color: '#fff',
            padding: '12px 24px', minHeight: 44,
            boxShadow: `0 4px 20px ${ORANGE}30`,
          }}>
            Talk to Us
          </button>
        </nav>

        {/* Mobile nav */}
        <div className="flex md:hidden gap-3 items-center">
          <button onClick={openTalkToUs} className="font-headline font-extrabold uppercase text-xs tracking-wider" style={{
            background: ORANGE, color: '#fff',
            padding: '10px 20px', minHeight: 44,
          }}>
            Talk to Us
          </button>
          <button onClick={() => setMobileMenuOpen(true)} className="w-11 h-11 flex items-center justify-center border border-white/10" style={{ background: 'rgba(255,255,255,0.05)', color: TEXT }} aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex flex-col"
            style={{ background: 'rgba(12,12,12,0.98)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex justify-between items-center px-6 py-4">
              <span className="text-2xl font-headline font-extrabold tracking-[-0.03em]" style={{ color: TEXT }}>AOM<span style={{ color: ORANGE }}>.</span></span>
              <button onClick={() => setMobileMenuOpen(false)} className="w-11 h-11 flex items-center justify-center" style={{ color: TEXT }}><X size={24} /></button>
            </div>
            <nav className="flex-1 flex flex-col items-center justify-center gap-8">
              {[
                { label: 'Home', href: '/' },
                { label: 'Work', href: '/#work' },
                { label: 'The System', href: '/system' },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-lg font-headline font-bold uppercase tracking-widest transition-colors"
                  style={{ color: item.href === '/system' ? TEXT : MUTED }}
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={() => { setMobileMenuOpen(false); openTalkToUs() }}
                className="text-lg font-headline font-bold uppercase tracking-widest transition-colors"
                style={{ color: MUTED }}
              >
                Talk to Us
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PAGE CONTENT ─── */}
      <main>
        <HeroSection onTalkToUs={openTalkToUs} />
        <PatternStrip />
        <ProblemSection />
        <PatternStrip />
        <WhatWeBuiltSection />
        <PatternStrip />
        <ResultsSection />
        <PatternStrip />
        <GapSection />
        <PatternStrip />
        <WhoSection />
        <PatternStrip />
        <OfferSection onTalkToUs={openTalkToUs} />
        <PatternStrip />
        <WhyAomSection />
        <PatternStrip />
        <FinalCTASection onTalkToUs={openTalkToUs} />
        {/* Section 10 (SocialProofSection) intentionally omitted from DOM until content is ready */}
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="text-center" style={{
        padding: '32px 20px',
        borderTop: `1px solid ${BORDER}`,
      }}>
        <div className="font-body" style={{ fontSize: 13, color: `${MUTED}cc` }}>
          AOM (Ahead of Market) &middot; Phoenix, AZ
        </div>
      </footer>
    </div>
  )
}
