import React, { useState, useEffect } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/* ------------------------------------------------------------------ */
/*  Included Health Brand Kit — BOLD REWRITE                           */
/*  Font: Figtree only. Colors: real IH brand. Editorial energy.       */
/* ------------------------------------------------------------------ */

const C = {
  electricBlue:  '#0012E7',
  navy:          '#001048',
  lightBlueWash: '#E6EFFE',
  nearWhiteBlue: '#F6FAFE',
  white:         '#ffffff',
  darkText:      '#101015',
  secondary:     '#95999F',
  coral:         '#FF5E4D',
  green:         '#008961',
  cardBlue:      '#CADCFF',
  border:        'rgba(0,18,231,0.12)',
}

const FF = 'Figtree, sans-serif'

const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
}

/* ================================================================== */
/*  UTILITIES                                                          */
/* ================================================================== */

function CopyHex({ hex, dark = false }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(hex)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: FF,
        fontSize: 14,
        fontWeight: 600,
        color: dark ? 'rgba(255,255,255,0.6)' : C.secondary,
        letterSpacing: '0.04em',
      }}
      title="Copy hex"
    >
      {hex}
      {copied
        ? <Check size={13} color={dark ? '#fff' : C.electricBlue} />
        : <Copy size={13} style={{ opacity: 0.45 }} />}
    </button>
  )
}

/* ================================================================== */
/*  STICKY DOT NAV                                                     */
/* ================================================================== */

const NAV_IDS = [
  'section-hero', 'section-overview', 'section-colors',
  'section-type', 'section-voice', 'section-messaging',
  'section-templates', 'section-production',
]

function StickyNav() {
  const [active, setActive] = useState(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) })
      },
      { threshold: 0.35 }
    )
    NAV_IDS.forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  return (
    <nav
      style={{
        position: 'fixed',
        top: '50%',
        right: 24,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        zIndex: 200,
      }}
    >
      {NAV_IDS.map((id) => (
        <button
          key={id}
          onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          style={{
            width: active === id ? 24 : 7,
            height: 7,
            borderRadius: 4,
            background: active === id ? C.electricBlue : 'rgba(0,18,231,0.22)',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.25s ease',
          }}
        />
      ))}
    </nav>
  )
}

/* ================================================================== */
/*  MAIN EXPORT                                                        */
/* ================================================================== */

export default function IncludedHealthBrand() {
  const navigate = useNavigate()

  useEffect(() => {
    const id = 'figtree-font'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap'
    document.head.appendChild(link)
  }, [])

  return (
    <div style={{ fontFamily: FF, background: C.white, minHeight: '100vh' }}>
      <StickyNav />

      {/* ============================================================ */}
      {/* 1. HERO — navy, massive type                                  */}
      {/* ============================================================ */}
      <section
        id="section-hero"
        style={{
          background: C.navy,
          padding: '0',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 55% at 65% 45%, rgba(0,18,231,0.28) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 48px', position: 'relative', width: '100%' }}>

          {/* Back */}
          <button
            onClick={() => navigate('/brands')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              marginBottom: 56, fontFamily: FF, fontSize: 14, fontWeight: 600,
              color: 'rgba(202,220,255,0.65)', letterSpacing: '0.03em',
            }}
          >
            <ArrowLeft size={16} /> All Brand Kits
          </button>

          <motion.div initial="hidden" animate="visible" variants={stagger}>

            {/* Eyebrow pill */}
            <motion.div variants={fadeUp} style={{ marginBottom: 36 }}>
              <span style={{
                display: 'inline-block', fontFamily: FF, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: C.cardBlue,
                background: 'rgba(0,18,231,0.3)', padding: '6px 16px', borderRadius: 100,
                border: '1px solid rgba(202,220,255,0.18)',
              }}>
                Client Brand Kit
              </span>
            </motion.div>

            {/* MEGA HEADLINE */}
            <motion.h1
              variants={fadeUp}
              style={{
                fontFamily: FF, fontWeight: 800,
                fontSize: 'clamp(72px, 11vw, 128px)',
                lineHeight: 0.92, letterSpacing: '-0.04em',
                color: '#ffffff', margin: '0 0 40px',
              }}
            >
              Included<br />Health
            </motion.h1>

            {/* Tagline */}
            <motion.div variants={fadeUp} style={{ marginBottom: 72 }}>
              <p style={{
                fontFamily: FF, fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 500,
                color: 'rgba(202,220,255,0.75)', margin: 0, letterSpacing: '-0.01em',
                fontStyle: 'italic',
              }}>
                Designed to treat you better.™
              </p>
            </motion.div>

            {/* Metadata bar */}
            <motion.div
              variants={fadeUp}
              style={{
                display: 'flex', flexWrap: 'wrap', gap: 0,
                borderTop: '1px solid rgba(202,220,255,0.14)',
                paddingTop: 36,
              }}
            >
              {[
                ['Client', 'Included Health'],
                ['Industry', 'Healthcare Technology'],
                ['HQ', 'San Francisco, CA'],
                ['Founded', '2021 (merger)'],
                ['Deliverable', 'Client Summit 2026'],
              ].map(([label, val], i, arr) => (
                <div
                  key={label}
                  style={{
                    paddingRight: 44, marginRight: 44,
                    borderRight: i < arr.length - 1 ? '1px solid rgba(202,220,255,0.1)' : 'none',
                  }}
                >
                  <div style={{
                    fontFamily: FF, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: 'rgba(202,220,255,0.45)', marginBottom: 6,
                  }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>
                    {val}
                  </div>
                </div>
              ))}
            </motion.div>

          </motion.div>
        </div>

        {/* Bottom bleed into next section */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 80,
          background: 'linear-gradient(to bottom, transparent, rgba(0,16,72,0.4))',
          pointerEvents: 'none',
        }} />
      </section>

      {/* ============================================================ */}
      {/* 2. BRAND OVERVIEW — white                                     */}
      {/* ============================================================ */}
      <section id="section-overview" style={{ background: C.white, padding: '104px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 48px' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <span style={{
                fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: C.electricBlue,
              }}>
                01 — Brand Overview
              </span>
              <div style={{ width: 36, height: 2, background: C.electricBlue, borderRadius: 1, marginTop: 8, opacity: 0.4 }} />
            </motion.div>

            <motion.h2 variants={fadeUp} style={{
              fontFamily: FF, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 800,
              color: C.darkText, lineHeight: 1.05, letterSpacing: '-0.03em',
              margin: '24px 0 20px',
            }}>
              Healthcare built for<br />every person.
            </motion.h2>

            <motion.p variants={fadeUp} style={{
              fontFamily: FF, fontSize: 18, fontWeight: 400, color: C.secondary,
              lineHeight: 1.7, maxWidth: 640, margin: '0 0 64px',
            }}>
              Included Health was formed in 2021 through the merger of Grand Rounds and Doctor On Demand —
              combining specialist referral network expertise with virtual primary and urgent care at scale.
              They serve millions of members through employer health plans nationwide.
            </motion.p>

            {/* Bold stat cards */}
            <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {[
                { num: '2021', label: 'Year Founded', sub: 'Grand Rounds + Doctor On Demand merger' },
                { num: '10M+', label: 'Members Served', sub: 'Through employer health plans' },
                { num: '50+', label: 'Specialties', sub: 'Primary care to complex conditions' },
              ].map(({ num, label, sub }) => (
                <motion.div
                  key={label}
                  variants={fadeUp}
                  style={{
                    background: C.nearWhiteBlue,
                    border: `1px solid ${C.border}`,
                    borderRadius: 16,
                    padding: '36px 32px',
                  }}
                >
                  <div style={{
                    fontFamily: FF, fontSize: 'clamp(48px, 5vw, 72px)', fontWeight: 800,
                    color: C.electricBlue, lineHeight: 1, letterSpacing: '-0.03em', marginBottom: 8,
                  }}>
                    {num}
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 16, fontWeight: 700, color: C.darkText, marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 14, fontWeight: 400, color: C.secondary }}>
                    {sub}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. COLOR PALETTE — blue wash                                  */}
      {/* ============================================================ */}
      <section id="section-colors" style={{ background: C.lightBlueWash, padding: '104px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 48px' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <span style={{
                fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: C.electricBlue,
              }}>
                02 — Color System
              </span>
              <div style={{ width: 36, height: 2, background: C.electricBlue, borderRadius: 1, marginTop: 8, opacity: 0.4 }} />
            </motion.div>

            <motion.h2 variants={fadeUp} style={{
              fontFamily: FF, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 800,
              color: C.darkText, lineHeight: 1.05, letterSpacing: '-0.03em',
              margin: '24px 0 16px',
            }}>
              Three-tier blue system.
            </motion.h2>

            <motion.p variants={fadeUp} style={{
              fontFamily: FF, fontSize: 17, color: C.secondary, lineHeight: 1.7, maxWidth: 520, margin: '0 0 56px',
            }}>
              Electric blue drives urgency. Navy anchors authority. Light wash creates breathing room.
              Together they form a hierarchy you can feel.
            </motion.p>

            {/* PRIMARY SWATCHES */}
            <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
              {[
                { hex: C.electricBlue, name: 'Electric Blue',   role: 'CTAs · Lower thirds · Accents', dark: true },
                { hex: C.navy,         name: 'Deep Navy',       role: 'Hero sections · Foundations', dark: true },
                { hex: C.lightBlueWash,name: 'Light Blue Wash', role: 'Section backgrounds', dark: false },
              ].map(({ hex, name, role, dark }) => (
                <motion.div
                  key={name}
                  variants={fadeUp}
                  style={{
                    borderRadius: 16, overflow: 'hidden',
                    boxShadow: '0 6px 28px rgba(0,18,231,0.11)',
                    background: C.white,
                  }}
                >
                  <div style={{
                    height: 200, background: hex,
                    display: 'flex', alignItems: 'flex-end', padding: '0 0 18px 22px',
                  }}>
                    <span style={{
                      fontFamily: FF, fontSize: 36, fontWeight: 800,
                      color: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,18,231,0.2)',
                      lineHeight: 1,
                    }}>
                      Aa
                    </span>
                  </div>
                  <div style={{ padding: '18px 22px' }}>
                    <div style={{ fontFamily: FF, fontSize: 17, fontWeight: 700, color: C.darkText, marginBottom: 3 }}>
                      {name}
                    </div>
                    <div style={{ fontFamily: FF, fontSize: 13, color: C.secondary, marginBottom: 10 }}>
                      {role}
                    </div>
                    <CopyHex hex={hex} />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* SECONDARY SWATCHES */}
            <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { hex: C.nearWhiteBlue, name: 'Near-White Blue', role: 'Cards · Insets' },
                { hex: C.white,         name: 'White',            role: 'Primary background' },
                { hex: C.coral,         name: 'Coral',            role: 'Accent (sparingly)' },
                { hex: C.green,         name: 'Green',            role: 'Positive states' },
              ].map(({ hex, name, role }) => (
                <motion.div
                  key={name}
                  variants={fadeUp}
                  style={{
                    borderRadius: 14, overflow: 'hidden',
                    boxShadow: '0 4px 18px rgba(0,18,231,0.08)',
                    border: `1px solid rgba(0,18,231,0.09)`,
                    background: C.white,
                  }}
                >
                  <div style={{ height: 120, background: hex }} />
                  <div style={{ padding: '14px 18px' }}>
                    <div style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: C.darkText, marginBottom: 2 }}>
                      {name}
                    </div>
                    <div style={{ fontFamily: FF, fontSize: 12, color: C.secondary, marginBottom: 8 }}>
                      {role}
                    </div>
                    <CopyHex hex={hex} />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. TYPOGRAPHY — white                                         */}
      {/* ============================================================ */}
      <section id="section-type" style={{ background: C.white, padding: '104px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 48px' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <span style={{
                fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: C.electricBlue,
              }}>
                03 — Typography
              </span>
              <div style={{ width: 36, height: 2, background: C.electricBlue, borderRadius: 1, marginTop: 8, opacity: 0.4 }} />
            </motion.div>

            <motion.h2 variants={fadeUp} style={{
              fontFamily: FF, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 800,
              color: C.darkText, lineHeight: 1.05, letterSpacing: '-0.03em',
              margin: '24px 0 16px',
            }}>
              Figtree. One typeface,<br />infinite range.
            </motion.h2>

            <motion.p variants={fadeUp} style={{
              fontFamily: FF, fontSize: 17, color: C.secondary, lineHeight: 1.7, maxWidth: 520, margin: '0 0 56px',
            }}>
              Figtree is the only font used across all Included Health video production. Every weight,
              every context. Consistency is the point.
            </motion.p>

            {/* MASSIVE display specimens */}
            {[
              { weight: 800, label: 'ExtraBold 800', size: 96, note: 'Hero titles · Stat callouts · Section headers' },
              { weight: 700, label: 'Bold 700',      size: 72, note: 'Speaker names · Subsection titles' },
              { weight: 600, label: 'SemiBold 600',  size: 56, note: 'UI labels · Navigation · Captions' },
              { weight: 500, label: 'Medium 500',    size: 40, note: 'Body display · Subtitles' },
              { weight: 400, label: 'Regular 400',   size: 28, note: 'Body copy · Descriptions' },
            ].map(({ weight, label, size, note }, i) => (
              <motion.div
                key={weight}
                variants={fadeUp}
                style={{
                  borderBottom: i < 4 ? `1px solid rgba(0,18,231,0.08)` : 'none',
                  paddingBottom: 36,
                  marginBottom: 36,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 32,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{
                    fontFamily: FF,
                    fontSize: `clamp(${Math.round(size * 0.6)}px, ${size * 0.075}vw, ${size}px)`,
                    fontWeight: weight,
                    color: C.darkText,
                    lineHeight: 1,
                    letterSpacing: weight >= 700 ? '-0.03em' : '-0.01em',
                  }}>
                    Healthcare
                  </div>
                </div>
                <div style={{ minWidth: 180, paddingBottom: 6 }}>
                  <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.electricBlue, marginBottom: 4 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 12, color: C.secondary }}>
                    {note}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Min size callout */}
            <motion.div
              variants={fadeUp}
              style={{
                background: C.nearWhiteBlue,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: '28px 32px',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
              }}
            >
              <div style={{ fontFamily: FF, fontSize: 48, fontWeight: 800, color: C.electricBlue, lineHeight: 1 }}>
                16px
              </div>
              <div>
                <div style={{ fontFamily: FF, fontSize: 15, fontWeight: 700, color: C.darkText, marginBottom: 4 }}>
                  Minimum body size
                </div>
                <div style={{ fontFamily: FF, fontSize: 14, color: C.secondary }}>
                  Never go below 16px for any body copy in video production.
                  Lower thirds min: 16px. Never sacrifice legibility.
                </div>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. VOICE & TONE — electric blue full bleed                    */}
      {/* ============================================================ */}
      <section
        id="section-voice"
        style={{ background: C.electricBlue, padding: '104px 0' }}
      >
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 48px' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <span style={{
                fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
              }}>
                04 — Voice & Tone
              </span>
              <div style={{ width: 36, height: 2, background: 'rgba(255,255,255,0.35)', borderRadius: 1, marginTop: 8 }} />
            </motion.div>

            <motion.h2 variants={fadeUp} style={{
              fontFamily: FF, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 800,
              color: '#ffffff', lineHeight: 1.05, letterSpacing: '-0.03em',
              margin: '24px 0 16px',
            }}>
              Clear. Human. Direct.
            </motion.h2>

            <motion.p variants={fadeUp} style={{
              fontFamily: FF, fontSize: 17, fontWeight: 400,
              color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, maxWidth: 580, margin: '0 0 64px',
            }}>
              Included Health talks to real people dealing with real health decisions. The tone is
              warm authority — knowledgeable but never clinical. Confident but never cold.
            </motion.p>

            {/* Pillars */}
            <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 56 }}>
              {[
                { pillar: 'Clarity first', desc: 'Healthcare is confusing. We cut through it. Plain language always wins over medical jargon.' },
                { pillar: 'Human warmth', desc: 'Every interaction acknowledges that health is deeply personal. We speak to the person, not the condition.' },
                { pillar: 'Earned confidence', desc: 'We\'ve helped millions. We can say that without boasting. Facts do the work.' },
              ].map(({ pillar, desc }) => (
                <motion.div
                  key={pillar}
                  variants={fadeUp}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 16,
                    padding: '32px 28px',
                  }}
                >
                  <div style={{ fontFamily: FF, fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 12 }}>
                    {pillar}
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65 }}>
                    {desc}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Say / Don't Say */}
            <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <motion.div variants={fadeUp} style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 16, padding: '32px 28px',
              }}>
                <div style={{
                  fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 20,
                }}>
                  Say this
                </div>
                {[
                  '"Get care that fits your life."',
                  '"Real doctors. Real answers."',
                  '"Your health. Our priority."',
                  '"We\'ve got you covered."',
                ].map((s) => (
                  <div key={s} style={{ fontFamily: FF, fontSize: 16, fontWeight: 500, color: '#ffffff', marginBottom: 12, paddingLeft: 16, borderLeft: '2px solid rgba(255,255,255,0.35)' }}>
                    {s}
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} style={{
                background: 'rgba(0,0,0,0.12)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, padding: '32px 28px',
              }}>
                <div style={{
                  fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20,
                }}>
                  Not this
                </div>
                {[
                  '"Utilize our telehealth solutions."',
                  '"Leveraging digital-first care modalities."',
                  '"Optimal health outcomes achieved."',
                  '"Synergistic care coordination."',
                ].map((s) => (
                  <div key={s} style={{ fontFamily: FF, fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginBottom: 12, paddingLeft: 16, borderLeft: '2px solid rgba(255,255,255,0.12)', textDecoration: 'line-through' }}>
                    {s}
                  </div>
                ))}
              </motion.div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. KEY MESSAGING — navy                                       */}
      {/* ============================================================ */}
      <section id="section-messaging" style={{ background: C.navy, padding: '104px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 48px' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <span style={{
                fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'rgba(202,220,255,0.55)',
              }}>
                05 — Key Messaging
              </span>
              <div style={{ width: 36, height: 2, background: 'rgba(202,220,255,0.25)', borderRadius: 1, marginTop: 8 }} />
            </motion.div>

            {/* HUGE tagline */}
            <motion.div variants={fadeUp} style={{ margin: '48px 0 64px' }}>
              <div style={{
                fontFamily: FF, fontSize: 'clamp(48px, 7vw, 96px)', fontWeight: 800,
                color: '#ffffff', lineHeight: 0.95, letterSpacing: '-0.04em',
              }}>
                Designed to treat<br />
                <span style={{ color: C.cardBlue }}>you better.™</span>
              </div>
            </motion.div>

            {/* Mission */}
            <motion.div variants={fadeUp} style={{
              borderLeft: `4px solid ${C.electricBlue}`,
              paddingLeft: 28, marginBottom: 64,
            }}>
              <div style={{ fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(202,220,255,0.45)', marginBottom: 10 }}>
                Mission
              </div>
              <p style={{ fontFamily: FF, fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0 }}>
                To raise the standard of healthcare by making it more accessible, equitable,
                and effective for every person — regardless of where they are or who they are.
              </p>
            </motion.div>

            {/* Proof points */}
            <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {[
                { stat: '>4%', point: 'Reduction in total healthcare costs for members' },
                { stat: '95%', point: 'Member satisfaction score across all care interactions' },
                { stat: '24/7', point: 'Access to board-certified physicians and specialists' },
                { stat: '1,500+', point: 'Specialists across 50+ medical disciplines available' },
              ].map(({ stat, point }) => (
                <motion.div
                  key={stat}
                  variants={fadeUp}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(202,220,255,0.1)',
                    borderRadius: 14, padding: '28px 28px',
                    display: 'flex', gap: 20, alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    fontFamily: FF, fontSize: 40, fontWeight: 800, color: C.electricBlue,
                    lineHeight: 1, letterSpacing: '-0.03em', flexShrink: 0,
                  }}>
                    {stat}
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, paddingTop: 4 }}>
                    {point}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. TITLE TEMPLATES — white                                    */}
      {/* ============================================================ */}
      <section id="section-templates" style={{ background: C.white, padding: '104px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 48px' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.08 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <span style={{
                fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: C.electricBlue,
              }}>
                06 — Title Templates
              </span>
              <div style={{ width: 36, height: 2, background: C.electricBlue, borderRadius: 1, marginTop: 8, opacity: 0.4 }} />
            </motion.div>

            <motion.h2 variants={fadeUp} style={{
              fontFamily: FF, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 800,
              color: C.darkText, lineHeight: 1.05, letterSpacing: '-0.03em',
              margin: '24px 0 16px',
            }}>
              Production-ready.<br />Copy the specs exactly.
            </motion.h2>

            <motion.p variants={fadeUp} style={{
              fontFamily: FF, fontSize: 17, color: C.secondary, lineHeight: 1.7, maxWidth: 540, margin: '0 0 64px',
            }}>
              Six title card templates built from the actual Client Summit 2026 footage. Every
              measurement, font size, and color is locked. No guessing.
            </motion.p>

            {/* ======================================================= */}
            {/* TEMPLATE A — Hero Title Card                             */}
            {/* ======================================================= */}
            <motion.div variants={fadeUp} style={{ marginBottom: 56 }}>
              <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                A — Hero Title Card
              </div>
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                background: C.navy,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 16px 60px rgba(0,16,72,0.25)',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 0,
                }}>
                  {/* Subtle grid texture */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(0,18,231,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,18,231,0.06) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                  }} />
                  <div style={{ position: 'relative', textAlign: 'center' }}>
                    <div style={{
                      fontFamily: FF, fontSize: 'clamp(32px, 5.5vw, 80px)', fontWeight: 800,
                      color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1,
                    }}>
                      INCLUDED HEALTH
                    </div>
                    <div style={{
                      width: '60%', height: 2,
                      background: `linear-gradient(to right, transparent, ${C.electricBlue}, transparent)`,
                      margin: '16px auto',
                    }} />
                    <div style={{
                      fontFamily: FF, fontSize: 'clamp(12px, 1.6vw, 20px)', fontWeight: 500,
                      color: C.cardBlue, letterSpacing: '0.18em', textTransform: 'uppercase',
                    }}>
                      CLIENT SUMMIT 2026
                    </div>
                  </div>
                </div>
              </div>
              <SpecsBox specs={[
                { label: 'Font', value: 'Figtree 800' },
                { label: 'Headline', value: '80px white #ffffff' },
 { label: 'Sub', value: '20px Figtree 500 #CADCFF, tracked 0.18em' },
 { label: 'Rule', value: '2px #0012E7, 60% width center' },
                { label: 'BG', value: '#001048' },
              ]} />
            </motion.div>

            {/* ======================================================= */}
            {/* TEMPLATE B — Speaker Lower Third (FROM ACTUAL VIDEO)     */}
            {/* ======================================================= */}
            <motion.div variants={fadeUp} style={{ marginBottom: 56 }}>
              <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                B — Speaker Lower Third
              </div>
              {/* Video frame sim */}
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #1a2540 0%, #2a3a5c 50%, #162030 100%)',
                boxShadow: '0 16px 60px rgba(0,16,72,0.2)',
              }}>
                <div style={{ position: 'absolute', inset: 0 }}>
                  {/* Fake subject silhouette area */}
                  <div style={{
                    position: 'absolute', left: '8%', top: '10%', width: '45%', height: '80%',
                    background: 'radial-gradient(ellipse at 50% 40%, rgba(40,60,100,0.8), rgba(15,25,50,0.95))',
                    borderRadius: '50% 50% 45% 45%',
                  }} />

                  {/* LOWER THIRD — blue text direct on frame, right-aligned, NO bar */}
                  <div style={{
                    position: 'absolute',
                    bottom: '14%',
                    right: '8%',
                    textAlign: 'right',
                  }}>
                    <div style={{
                      fontFamily: FF, fontSize: 'clamp(14px, 1.8vw, 22px)', fontWeight: 700,
                      color: C.electricBlue, lineHeight: 1.2, letterSpacing: '-0.01em',
                    }}>
                      Jeff Birkeland
                    </div>
                    <div style={{
                      fontFamily: FF, fontSize: 'clamp(11px, 1.3vw, 16px)', fontWeight: 400,
                      color: C.navy, lineHeight: 1.4,
                    }}>
                      SVP Product
                    </div>
                    <div style={{
                      fontFamily: FF, fontSize: 'clamp(11px, 1.3vw, 16px)', fontWeight: 400,
                      color: C.navy, lineHeight: 1.4,
                    }}>
                      Included Health
                    </div>
                  </div>
                </div>
              </div>
              <SpecsBox specs={[
 { label: 'Method', value: 'Blue text DIRECTLY on frame, NO semi-transparent bar' },
                { label: 'Name', value: 'Figtree 700 · 22px · #0012E7 (electric blue)' },
                { label: 'Title/Company', value: 'Figtree 400 · 16px · #001048 (navy)' },
                { label: 'Alignment', value: 'Right-aligned · Bottom-right quadrant' },
                { label: 'Position', value: '8% from right · 14% from bottom' },
              ]} />
            </motion.div>

            {/* ======================================================= */}
            {/* TEMPLATE C — Section Header                              */}
            {/* ======================================================= */}
            <motion.div variants={fadeUp} style={{ marginBottom: 56 }}>
              <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                C — Section Header
              </div>
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                borderRadius: 12,
                overflow: 'hidden',
                background: C.white,
                boxShadow: '0 8px 40px rgba(0,18,231,0.1)',
                border: `1px solid rgba(0,18,231,0.08)`,
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center',
                  padding: '0 8%',
                }}>
                  {/* Left accent bar */}
                  <div style={{ width: 6, height: 'clamp(48px, 8vw, 100px)', background: C.electricBlue, borderRadius: 3, marginRight: '4%', flexShrink: 0 }} />
                  <div>
                    <div style={{
                      fontFamily: FF, fontWeight: 800,
                      fontSize: 'clamp(24px, 4.5vw, 56px)',
                      color: C.navy, lineHeight: 1.05, letterSpacing: '-0.03em',
                      marginBottom: '2%',
                    }}>
                      The Future of Virtual Care
                    </div>
                    <div style={{
                      fontFamily: FF, fontWeight: 400,
                      fontSize: 'clamp(12px, 1.6vw, 20px)',
                      color: C.secondary,
                    }}>
                      Keynote — Client Summit 2026
                    </div>
                  </div>
                </div>
              </div>
              <SpecsBox specs={[
                { label: 'BG', value: 'White #ffffff' },
 { label: 'Accent bar', value: '6px wide #0012E7, full left edge' },
                { label: 'Title', value: 'Figtree 800 · 48px · #001048 navy' },
                { label: 'Subtitle', value: 'Figtree 400 · 20px · #95999F gray' },
                { label: 'Left padding', value: '8% from edge' },
              ]} />
            </motion.div>

            {/* ======================================================= */}
            {/* TEMPLATE D — Stat Callout                                */}
            {/* ======================================================= */}
            <motion.div variants={fadeUp} style={{ marginBottom: 56 }}>
              <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                D — Stat Callout
              </div>
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                borderRadius: 12,
                overflow: 'hidden',
                background: C.electricBlue,
                boxShadow: '0 16px 60px rgba(0,18,231,0.3)',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 0,
                }}>
                  <div style={{
                    fontFamily: FF, fontSize: 'clamp(48px, 10vw, 120px)', fontWeight: 800,
                    color: '#ffffff', lineHeight: 1, letterSpacing: '-0.04em',
                  }}>
                    &gt;4%
                  </div>
                  <div style={{
                    fontFamily: FF, fontSize: 'clamp(13px, 1.8vw, 22px)', fontWeight: 500,
                    color: 'rgba(255,255,255,0.75)', letterSpacing: '0.06em',
                    textTransform: 'uppercase', marginTop: '2%',
                  }}>
                    reduction in healthcare costs
                  </div>
                </div>
              </div>
              <SpecsBox specs={[
 { label: 'BG', value: '#0012E7 electric blue, full bleed' },
                { label: 'Number', value: 'Figtree 800 · 96px · white #ffffff' },
                { label: 'Label', value: 'Figtree 500 · 20px · rgba(255,255,255,0.75) · tracked 0.06em' },
                { label: 'Alignment', value: 'Centered both axes' },
              ]} />
            </motion.div>

            {/* ======================================================= */}
            {/* TEMPLATE E — Quote Card                                  */}
            {/* ======================================================= */}
            <motion.div variants={fadeUp} style={{ marginBottom: 56 }}>
              <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                E — Quote Card
              </div>
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                borderRadius: 12,
                overflow: 'hidden',
                background: C.lightBlueWash,
                boxShadow: '0 8px 40px rgba(0,18,231,0.1)',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '0 12%',
                  textAlign: 'center',
                }}>
                  {/* Large decorative quote mark */}
                  <div style={{
                    fontFamily: FF, fontSize: 'clamp(72px, 14vw, 180px)', fontWeight: 800,
                    color: C.electricBlue, opacity: 0.15,
                    lineHeight: 0.8, marginBottom: '-4%',
                    userSelect: 'none',
                  }}>
                    "
                  </div>
                  <div style={{
                    fontFamily: FF, fontSize: 'clamp(14px, 2.5vw, 28px)', fontWeight: 500,
                    color: C.darkText, lineHeight: 1.5, letterSpacing: '-0.01em',
                  }}>
                    "Healthcare that works for every person, not just the ones who know how to navigate the system."
                  </div>
                  <div style={{
                    fontFamily: FF, fontSize: 'clamp(11px, 1.3vw, 16px)', fontWeight: 600,
                    color: C.electricBlue, marginTop: '3%', letterSpacing: '0.05em',
                  }}>
                    — Jeff Birkeland, SVP Product
                  </div>
                </div>
              </div>
              <SpecsBox specs={[
                { label: 'BG', value: '#E6EFFE light blue wash' },
                { label: 'Quote mark', value: 'Figtree 800 · 180px · #0012E7 · 0.15 opacity' },
                { label: 'Quote text', value: 'Figtree 500 · 28px · #101015 dark' },
                { label: 'Attribution', value: 'Figtree 600 · 16px · #0012E7 electric blue' },
                { label: 'Alignment', value: 'Centered · 12% side padding' },
              ]} />
            </motion.div>

            {/* ======================================================= */}
            {/* TEMPLATE F — End Screen                                  */}
            {/* ======================================================= */}
            <motion.div variants={fadeUp} style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                F — End Screen
              </div>
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                borderRadius: 12,
                overflow: 'hidden',
                background: C.navy,
                boxShadow: '0 16px 60px rgba(0,16,72,0.25)',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 0,
                }}>
                  <div style={{
                    fontFamily: FF, fontSize: 'clamp(20px, 3.5vw, 44px)', fontWeight: 700,
                    color: '#ffffff', letterSpacing: '0.02em', lineHeight: 1,
                    textTransform: 'uppercase',
                  }}>
                    INCLUDED HEALTH
                  </div>
                  <div style={{
                    fontFamily: FF, fontSize: 'clamp(11px, 1.4vw, 18px)', fontWeight: 400,
                    color: C.cardBlue, marginTop: '2.5%', fontStyle: 'italic',
                    letterSpacing: '0.01em',
                  }}>
                    Designed to treat you better.™
                  </div>
                  <div style={{
                    fontFamily: FF, fontSize: 'clamp(10px, 1.2vw, 15px)', fontWeight: 600,
                    color: C.electricBlue, marginTop: '4%',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                    includedhealth.com
                  </div>
                </div>
              </div>
              <SpecsBox specs={[
                { label: 'BG', value: '#001048 navy' },
                { label: 'Name', value: 'Figtree 700 · 36px · white #ffffff · tracked 0.02em' },
                { label: 'Tagline', value: 'Figtree 400 italic · 18px · #CADCFF light blue' },
                { label: 'URL', value: 'Figtree 600 · 15px · #0012E7 electric blue · tracked 0.08em' },
                { label: 'Alignment', value: 'Centered all axes' },
              ]} />
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. PRODUCTION NOTES — blue wash                               */}
      {/* ============================================================ */}
      <section id="section-production" style={{ background: C.lightBlueWash, padding: '104px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 48px' }}>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <span style={{
                fontFamily: FF, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: C.electricBlue,
              }}>
                07 — Production Notes
              </span>
              <div style={{ width: 36, height: 2, background: C.electricBlue, borderRadius: 1, marginTop: 8, opacity: 0.4 }} />
            </motion.div>

            <motion.h2 variants={fadeUp} style={{
              fontFamily: FF, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 800,
              color: C.darkText, lineHeight: 1.05, letterSpacing: '-0.03em',
              margin: '24px 0 56px',
            }}>
              Delivery specs.
            </motion.h2>

            <motion.div variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 48 }}>
              {[
                {
                  title: 'Video Format',
                  items: [
                    ['Resolution', '1920 x 1080 (16:9)'],
                    ['Frame Rate', '23.976 fps'],
                    ['Codec', 'H.264 / ProRes 422'],
                    ['Color Space', 'Rec. 709'],
                  ],
                },
                {
                  title: 'File Delivery',
                  items: [
                    ['Platform', 'Frame.io'],
                    ['Format', 'H.264 MP4 + ProRes masters'],
                    ['Audio', '48kHz / 24-bit'],
                    ['Contact', 'elario.young@includedhealth.com'],
                  ],
                },
                {
                  title: 'Deliverables',
                  items: [
                    ['Hype reel', '60-90 sec'],
                    ['Interviews', '10-15 clips'],
                    ['Sessions', 'Full recordings'],
                    ['B-roll', 'Raw + selects'],
                  ],
                },
                {
                  title: 'Lower Third Rules',
                  items: [
                    ['Font', 'Figtree only'],
                    ['Name color', '#0012E7 electric blue'],
                    ['Title color', '#001048 navy'],
 ['Style'·'Text on frame, NO bar'],
                  ],
                },
              ].map(({ title, items }) => (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  style={{
                    background: C.white,
                    border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: '32px 28px',
                  }}
                >
                  <div style={{ fontFamily: FF, fontSize: 17, fontWeight: 800, color: C.darkText, marginBottom: 20 }}>
                    {title}
                  </div>
                  {items.map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: `1px solid rgba(0,18,231,0.06)`, marginBottom: 12 }}>
                      <span style={{ fontFamily: FF, fontSize: 14, fontWeight: 600, color: C.secondary }}>{label}</span>
                      <span style={{ fontFamily: FF, fontSize: 14, fontWeight: 600, color: C.darkText }}>{value}</span>
                    </div>
                  ))}
                </motion.div>
              ))}
            </motion.div>

            {/* Color reference bar */}
            <motion.div variants={fadeUp}>
              <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondary, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
                Color Reference Strip
              </div>
              <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', height: 56, boxShadow: '0 4px 20px rgba(0,18,231,0.1)' }}>
                {[
                  { hex: C.electricBlue, flex: 3 },
                  { hex: C.navy,         flex: 3 },
                  { hex: C.lightBlueWash,flex: 2 },
                  { hex: C.nearWhiteBlue,flex: 2 },
                  { hex: C.white,        flex: 2, border: true },
                  { hex: C.coral,        flex: 1 },
                  { hex: C.green,        flex: 1 },
                ].map(({ hex, flex, border }, i) => (
                  <div
                    key={i}
                    style={{
                      flex,
                      background: hex,
                      border: border ? `1px solid rgba(0,18,231,0.12)` : 'none',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
                {[C.electricBlue, C.navy, C.lightBlueWash, C.nearWhiteBlue, C.white, C.coral, C.green].map((hex) => (
                  <CopyHex key={hex} hex={hex} />
                ))}
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FOOTER                                                        */}
      {/* ============================================================ */}
      <footer style={{
        background: C.navy, padding: '48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ fontFamily: FF, fontSize: 14, fontWeight: 600, color: 'rgba(202,220,255,0.45)' }}>
          Included Health Brand Kit — AOM Production Reference
        </div>
        <button
          onClick={() => navigate('/brands')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,18,231,0.3)', border: '1px solid rgba(0,18,231,0.4)',
            borderRadius: 8, cursor: 'pointer', padding: '10px 20px',
            fontFamily: FF, fontSize: 14, fontWeight: 600, color: C.cardBlue,
          }}
        >
          <ArrowLeft size={14} /> All Brand Kits
        </button>
      </footer>

    </div>
  )
}

/* ================================================================== */
/*  SPECS BOX                                                          */
/* ================================================================== */

function SpecsBox({ specs }) {
  return (
    <div style={{
      marginTop: 14,
      background: C.nearWhiteBlue,
      border: `1px solid ${C.border}`,
      borderRadius: 10, padding: '14px 20px',
      display: 'flex', flexWrap: 'wrap', gap: '6px 28px',
    }}>
      <div style={{
        fontFamily: FF, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: C.electricBlue, width: '100%', marginBottom: 4,
      }}>
        Cleo Specs
      </div>
      {specs.map(({ label, value }) => (
        <div key={label} style={{ fontFamily: FF, fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: C.darkText }}>{label}: </span>
          <span style={{ fontWeight: 400, color: C.secondary, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}