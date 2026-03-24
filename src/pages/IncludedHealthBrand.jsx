import React, { useState, useEffect } from 'react'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/* ------------------------------------------------------------------ */
/*  Included Health Brand Kit                                          */
/*  Client brand reference for AOM video production team              */
/*  Font: Figtree (Google Fonts) -- 400/500/600/700/800              */
/*  Brand DNA: white-dominant, electric blue accents, dark navy hero  */
/* ------------------------------------------------------------------ */

/* ================================================================== */
/*  DESIGN TOKENS                                                      */
/* ================================================================== */

const C = {
  // Included Health brand palette
  electricBlue:   '#0012E7',
  navy:           '#001048',
  lightBlueWash:  '#E6EFFE',
  nearWhiteBlue:  '#F6FAFE',
  white:          '#ffffff',
  darkText:       '#101015',
  secondaryText:  '#95999F',
  coralAccent:    '#FF5E4D',
  green:          '#008961',
  sage:           '#B6CFD0',
  // UI helpers
  cardBlue:       '#CADCFF',
  borderLight:    'rgba(0,18,231,0.12)',
}

const FF = 'Figtree, sans-serif'

/* ================================================================== */
/*  NAV SECTIONS                                                       */
/* ================================================================== */

const NAV_SECTIONS = [
  { id: 'section-overview',   num: '01', label: 'Overview' },
  { id: 'section-colors',     num: '02', label: 'Colors' },
  { id: 'section-type',       num: '03', label: 'Typography' },
  { id: 'section-logo',       num: '04', label: 'Logo' },
  { id: 'section-voice',      num: '05', label: 'Voice' },
  { id: 'section-messaging',  num: '06', label: 'Messaging' },
  { id: 'section-templates',  num: '07', label: 'Templates' },
  { id: 'section-production', num: '08', label: 'Production' },
]

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
        setTimeout(() => setCopied(false), 1500)
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        fontFamily: FF,
        fontSize: 13,
        fontWeight: 500,
        color: dark ? 'rgba(255,255,255,0.65)' : C.secondaryText,
        letterSpacing: '0.03em',
      }}
      title="Copy hex"
    >
      {hex}
      {copied
        ? <Check size={12} color={C.electricBlue} />
        : <Copy size={12} style={{ opacity: 0.5 }} />}
    </button>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

/* ================================================================== */
/*  STICKY NAV                                                         */
/* ================================================================== */

function StickyNav() {
  const [active, setActive] = useState(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { threshold: 0.4 }
    )
    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav
      style={{
        position: 'fixed',
        top: '50%',
        right: 28,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 100,
      }}
    >
      {NAV_SECTIONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          title={label}
          style={{
            width: active === id ? 28 : 8,
            height: 8,
            borderRadius: 4,
            background: active === id ? C.electricBlue : 'rgba(0,18,231,0.25)',
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
/*  SECTION WRAPPER                                                    */
/* ================================================================== */

function Section({ id, bg = C.white, children, style = {} }) {
  return (
    <section
      id={id}
      style={{
        background: bg,
        padding: '96px 0',
        ...style,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
        {children}
      </div>
    </section>
  )
}

function SectionLabel({ children, dark = false }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <span
        style={{
          fontFamily: FF,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: dark ? 'rgba(202,220,255,0.7)' : C.electricBlue,
        }}
      >
        {children}
      </span>
      <div
        style={{
          width: 40,
          height: 2,
          background: dark ? 'rgba(202,220,255,0.35)' : C.electricBlue,
          borderRadius: 1,
          marginTop: 8,
          opacity: dark ? 1 : 0.5,
        }}
      />
    </div>
  )
}

function SectionHeading({ children, dark = false }) {
  return (
    <h2
      style={{
        fontFamily: FF,
        fontSize: 'clamp(32px, 4vw, 48px)',
        fontWeight: 800,
        color: dark ? '#ffffff' : C.darkText,
        lineHeight: 1.1,
        margin: '0 0 16px',
        letterSpacing: '-0.02em',
      }}
    >
      {children}
    </h2>
  )
}

function BodyText({ children, dark = false, style = {} }) {
  return (
    <p
      style={{
        fontFamily: FF,
        fontSize: 17,
        fontWeight: 400,
        color: dark ? 'rgba(255,255,255,0.75)' : C.secondaryText,
        lineHeight: 1.7,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </p>
  )
}

/* ================================================================== */
/*  COLOR SWATCH                                                       */
/* ================================================================== */

function ColorSwatch({ hex, name, role, dark = false, size = 'md' }) {
  const h = size === 'lg' ? 100 : 72
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: C.white,
        boxShadow: '0 2px 12px rgba(0,18,231,0.07)',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,18,231,0.08)'}`,
      }}
    >
      <div style={{ height: h, background: hex }} />
      <div style={{ padding: '12px 14px', background: dark ? 'rgba(255,255,255,0.04)' : C.white }}>
        <div
          style={{
            fontFamily: FF,
            fontSize: 14,
            fontWeight: 700,
            color: dark ? '#ffffff' : C.darkText,
            marginBottom: 2,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: FF,
            fontSize: 12,
            color: dark ? 'rgba(255,255,255,0.45)' : C.secondaryText,
            marginBottom: 6,
          }}
        >
          {role}
        </div>
        <CopyHex hex={hex} dark={dark} />
      </div>
    </div>
  )
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function IncludedHealthBrand() {
  const navigate = useNavigate()

  // Inject Figtree font
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
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section
        style={{
          background: C.navy,
          padding: '120px 0 96px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 80% 60% at 60% 40%, rgba(0,18,231,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px', position: 'relative' }}>
          {/* Back link */}
          <button
            onClick={() => navigate('/brands')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 56,
              fontFamily: FF,
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(202,220,255,0.7)',
              letterSpacing: '0.03em',
            }}
          >
            <ArrowLeft size={16} />
            All Brand Kits
          </button>

          <motion.div initial="hidden" animate="visible" variants={stagger}>
            {/* Label */}
            <motion.div variants={fadeUp}>
              <span
                style={{
                  display: 'inline-block',
                  fontFamily: FF,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: C.cardBlue,
                  background: 'rgba(0,18,231,0.25)',
                  padding: '5px 14px',
                  borderRadius: 100,
                  marginBottom: 28,
                  border: '1px solid rgba(202,220,255,0.2)',
                }}
              >
                Client Brand Kit
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              style={{
                fontFamily: FF,
                fontSize: 'clamp(48px, 7vw, 80px)',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.0,
                margin: '0 0 16px',
                letterSpacing: '-0.03em',
              }}
            >
              Included Health
            </motion.h1>

            {/* Tagline */}
            <motion.p
              variants={fadeUp}
              style={{
                fontFamily: FF,
                fontSize: 22,
                fontWeight: 400,
                color: C.cardBlue,
                margin: '0 0 56px',
                letterSpacing: '-0.01em',
              }}
            >
              Designed to treat you better.™
            </motion.p>

            {/* Metadata row */}
            <motion.div
              variants={fadeUp}
              style={{
                display: 'flex',
                gap: 0,
                flexWrap: 'wrap',
                borderTop: '1px solid rgba(202,220,255,0.15)',
                paddingTop: 32,
              }}
            >
              {[
                ['Client', 'Included Health'],
                ['Industry', 'Healthcare Technology'],
                ['HQ', 'San Francisco, CA'],
                ['Founded', '2021 (merger)'],
              ].map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    paddingRight: 48,
                    marginRight: 48,
                    borderRight: '1px solid rgba(202,220,255,0.12)',
                    lastChild: { borderRight: 'none' },
                  }}
                >
                  <div
                    style={{
                      fontFamily: FF,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: 'rgba(202,220,255,0.5)',
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontFamily: FF,
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {val}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 01 OVERVIEW                                                  */}
      {/* ============================================================ */}
      <Section id="section-overview" bg={C.white}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}>
            <SectionLabel>01 — Overview</SectionLabel>
            <SectionHeading>Who They Are</SectionHeading>
            <BodyText style={{ maxWidth: 680, marginBottom: 48 }}>
              Included Health is the result of a merger between Grand Rounds and Doctor On Demand — two of the most trusted names in virtual care. Together they form one integrated platform that gives members access to doctors, specialists, therapists, and health advocates, all in one place. Their mission: get people the right care, at the right time, every time.
            </BodyText>
          </motion.div>

          <motion.div
            variants={stagger}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {[
              { stat: '6M+', desc: 'Members served' },
              { stat: '>4%', desc: 'Cost reduction for health plans' },
              { stat: '1,500+', desc: 'Specialist physicians' },
              { stat: '#50', desc: 'Fast Company Best Workplaces 2024' },
            ].map(({ stat, desc }) => (
              <motion.div
                key={stat}
                variants={fadeUp}
                style={{
                  background: C.nearWhiteBlue,
                  borderRadius: 12,
                  padding: '28px 24px',
                  border: `1px solid ${C.borderLight}`,
                }}
              >
                <div
                  style={{
                    fontFamily: FF,
                    fontSize: 40,
                    fontWeight: 800,
                    color: C.electricBlue,
                    lineHeight: 1,
                    marginBottom: 8,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {stat}
                </div>
                <div style={{ fontFamily: FF, fontSize: 15, fontWeight: 500, color: C.secondaryText }}>
                  {desc}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/* 02 COLORS                                                    */}
      {/* ============================================================ */}
      <Section id="section-colors" bg={C.lightBlueWash}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}>
            <SectionLabel>02 — Colors</SectionLabel>
            <SectionHeading>Brand Palette</SectionHeading>
            <BodyText style={{ marginBottom: 48 }}>
              The three-tier blue system is the visual foundation. Electric blue for emphasis, navy for premium sections, light washes for breathing room. Accent colors add warmth and signal meaning.
            </BodyText>
          </motion.div>

          {/* Primary blues */}
          <motion.div variants={fadeUp}>
            <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondaryText, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
              Core Blue System
            </div>
          </motion.div>
          <motion.div
            variants={stagger}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 40,
            }}
          >
            {[
              { hex: C.electricBlue, name: 'Electric Blue',   role: 'CTAs, links, accents',    size: 'lg' },
              { hex: C.navy,         name: 'Dark Navy',       role: 'Hero sections, premium',  size: 'lg' },
              { hex: C.lightBlueWash, name: 'Light Wash',     role: 'Section backgrounds',     size: 'lg' },
              { hex: C.nearWhiteBlue, name: 'Near White',     role: 'Subtle tint sections',    size: 'lg' },
            ].map((s) => (
              <motion.div key={s.hex} variants={fadeUp}>
                <ColorSwatch {...s} />
              </motion.div>
            ))}
          </motion.div>

          {/* Accents */}
          <motion.div variants={fadeUp}>
            <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondaryText, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
              Accent Colors
            </div>
          </motion.div>
          <motion.div
            variants={stagger}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 16,
            }}
          >
            {[
              { hex: C.darkText,      name: 'Dark Text',       role: 'Body copy, headings' },
              { hex: C.secondaryText, name: 'Secondary',       role: 'Labels, captions' },
              { hex: C.coralAccent,   name: 'Coral',           role: 'Emphasis, alerts' },
              { hex: C.green,         name: 'Green',           role: 'Success, positive' },
              { hex: C.sage,          name: 'Sage',            role: 'Calming secondary' },
              { hex: C.white,         name: 'White',           role: 'Primary background' },
            ].map((s) => (
              <motion.div key={s.hex} variants={fadeUp}>
                <ColorSwatch {...s} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/* 03 TYPOGRAPHY                                                */}
      {/* ============================================================ */}
      <Section id="section-type" bg={C.white}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}>
            <SectionLabel>03 — Typography</SectionLabel>
            <SectionHeading>Figtree — One Font. All Weights.</SectionHeading>
            <BodyText style={{ marginBottom: 56 }}>
              IH uses a single typeface: Figtree. It's geometric and friendly without being casual. All weights from 400 to 800 carry the brand.
            </BodyText>
          </motion.div>

          <motion.div variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { weight: 800, size: 56, label: 'Display / Hero', sample: 'Designed to treat you better.™' },
              { weight: 700, size: 40, label: 'Heading H1', sample: 'Get the right care.' },
              { weight: 700, size: 28, label: 'Heading H2', sample: 'Virtual care, real results.' },
              { weight: 600, size: 20, label: 'Subheading', sample: 'Specialists available today.' },
              { weight: 500, size: 17, label: 'Body Large', sample: 'Included Health connects members with the right doctor, the first time.' },
              { weight: 400, size: 15, label: 'Body Regular', sample: 'Schedule an appointment, review your results, or message your care team — all in one place.' },
              { weight: 600, size: 14, label: 'CTA / Button', sample: 'Get started today →' },
              { weight: 400, size: 13, label: 'Caption', sample: 'Results vary. Based on 2023 member outcomes data.' },
            ].map(({ weight, size, label, sample }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                style={{
                  padding: '24px 0',
                  borderBottom: `1px solid ${C.borderLight}`,
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr',
                  alignItems: 'center',
                  gap: 24,
                }}
              >
                <div>
                  <div style={{ fontFamily: FF, fontSize: 12, fontWeight: 700, color: C.electricBlue, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                    {label}
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 12, color: C.secondaryText }}>
                    Figtree {weight} / {size}px
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: FF,
                    fontSize: Math.min(size, 36),
                    fontWeight: weight,
                    color: C.darkText,
                    lineHeight: 1.2,
                  }}
                >
                  {sample}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/* 04 LOGO & IDENTITY                                           */}
      {/* ============================================================ */}
      <Section id="section-logo" bg={C.nearWhiteBlue}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}>
            <SectionLabel>04 — Logo & Identity</SectionLabel>
            <SectionHeading>Wordmark & Clear Space</SectionHeading>
            <BodyText style={{ marginBottom: 48 }}>
              The Included Health wordmark is set in Figtree 700. It uses tight tracking and consistent capitalization. Always maintain clear space equal to the height of the "I" on all sides.
            </BodyText>
          </motion.div>

          <motion.div
            variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}
          >
            {[
              { bg: C.white, textColor: C.navy, label: 'On White' },
              { bg: C.navy, textColor: '#ffffff', label: 'On Dark Navy' },
              { bg: C.electricBlue, textColor: '#ffffff', label: 'On Electric Blue' },
              { bg: C.lightBlueWash, textColor: C.navy, label: 'On Light Wash' },
            ].map(({ bg, textColor, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                style={{
                  background: bg,
                  borderRadius: 12,
                  padding: '40px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 20,
                  border: bg === C.white ? `1px solid ${C.borderLight}` : 'none',
                }}
              >
                <div
                  style={{
                    fontFamily: FF,
                    fontSize: 22,
                    fontWeight: 700,
                    color: textColor,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Included Health
                </div>
                <div
                  style={{
                    fontFamily: FF,
                    fontSize: 12,
                    color: textColor,
                    opacity: 0.5,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            style={{
              marginTop: 32,
              padding: '24px 28px',
              background: C.white,
              borderRadius: 12,
              border: `1px solid ${C.borderLight}`,
            }}
          >
            <div style={{ fontFamily: FF, fontSize: 14, fontWeight: 700, color: C.darkText, marginBottom: 12 }}>
              Usage Rules
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Never stretch or distort the wordmark.',
                'Never use on a busy photographic background without a scrim.',
                'Never recreate in a different typeface.',
                'Minimum size: 120px wide for digital use.',
              ].map((rule) => (
                <div key={rule} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.electricBlue, marginTop: 6, flexShrink: 0 }} />
                  <span style={{ fontFamily: FF, fontSize: 15, color: C.secondaryText }}>{rule}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/* 05 VOICE & TONE                                              */}
      {/* ============================================================ */}
      <Section id="section-voice" bg={C.lightBlueWash}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}>
            <SectionLabel>05 — Voice & Tone</SectionLabel>
            <SectionHeading>Warm. Confident. Empathetic.</SectionHeading>
            <BodyText style={{ marginBottom: 48 }}>
              IH talks to people like a trusted doctor, not a corporation. They make complex health concepts feel accessible and personal.
            </BodyText>
          </motion.div>

          {/* Voice pillars */}
          <motion.div
            variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}
          >
            {[
              { pillar: 'Access', desc: 'We make getting care easy. No runaround, no wait, no guessing who to call.' },
              { pillar: 'Answers', desc: 'We give real information, not disclaimers. Members leave conversations knowing more.' },
              { pillar: 'Advocacy', desc: 'We fight for the member. If the system is complicated, we navigate it for you.' },
            ].map(({ pillar, desc }) => (
              <motion.div
                key={pillar}
                variants={fadeUp}
                style={{
                  background: C.white,
                  borderRadius: 12,
                  padding: '28px 24px',
                  borderTop: `3px solid ${C.electricBlue}`,
                  boxShadow: '0 2px 16px rgba(0,18,231,0.06)',
                }}
              >
                <div style={{ fontFamily: FF, fontSize: 20, fontWeight: 700, color: C.darkText, marginBottom: 10 }}>
                  {pillar}
                </div>
                <div style={{ fontFamily: FF, fontSize: 15, color: C.secondaryText, lineHeight: 1.6 }}>
                  {desc}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Say this / Not this */}
          <motion.div variants={fadeUp}>
            <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondaryText, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              Tone in Practice
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { say: 'Get the right doctor, the first time.', not: 'Utilize our comprehensive provider matching algorithm.' },
                { say: 'Your health, your team.', not: 'Leverage our integrated multi-specialty care delivery network.' },
                { say: "We're here when you need us.", not: 'Our platform offers 24/7 on-demand telehealth accessibility.' },
                { say: 'Care that actually fits your life.', not: 'Providing flexible, patient-centric care modalities.' },
              ].map(({ say, not }) => (
                <div
                  key={say}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: `1px solid ${C.borderLight}`,
                  }}
                >
                  <div style={{ background: C.white, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ color: C.green, fontWeight: 700, fontSize: 16, marginTop: 1 }}>✓</div>
                    <span style={{ fontFamily: FF, fontSize: 15, fontWeight: 600, color: C.darkText }}>{say}</span>
                  </div>
                  <div style={{ background: '#FFF5F4', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 10, borderLeft: `1px solid ${C.borderLight}` }}>
                    <div style={{ color: C.coralAccent, fontWeight: 700, fontSize: 16, marginTop: 1 }}>✗</div>
                    <span style={{ fontFamily: FF, fontSize: 15, color: C.secondaryText }}>{not}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/* 06 KEY MESSAGING                                             */}
      {/* ============================================================ */}
      <section id="section-messaging" style={{ background: C.navy, padding: '96px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.div variants={fadeUp}>
              <SectionLabel dark>06 — Key Messaging</SectionLabel>
            </motion.div>

            {/* Hero tagline */}
            <motion.div
              variants={fadeUp}
              style={{
                borderBottom: '1px solid rgba(202,220,255,0.12)',
                paddingBottom: 56,
                marginBottom: 56,
              }}
            >
              <div
                style={{
                  fontFamily: FF,
                  fontSize: 'clamp(36px, 5vw, 64px)',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  marginBottom: 20,
                }}
              >
                Designed to treat you better.™
              </div>
              <div
                style={{
                  fontFamily: FF,
                  fontSize: 18,
                  color: 'rgba(202,220,255,0.7)',
                  lineHeight: 1.6,
                  maxWidth: 600,
                }}
              >
                One place for everything health. A doctor, a specialist, a mental health provider, and a health guide — all connected, all included.
              </div>
            </motion.div>

            {/* Proof points */}
            <motion.div
              variants={stagger}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}
            >
              {[
                { point: '>4% cost reduction', context: 'For health plans using Included Health vs. traditional care' },
                { point: 'Fast Company 2024', context: 'Named one of the Best Workplaces for Innovators' },
                { point: 'Grand Rounds + DOD', context: 'Merger creating the most complete virtual care platform' },
                { point: 'Whole-person care', context: 'Physical health, mental health, and benefits navigation in one app' },
              ].map(({ point, context }) => (
                <motion.div
                  key={point}
                  variants={fadeUp}
                  style={{
                    background: 'rgba(0,18,231,0.15)',
                    borderRadius: 12,
                    padding: '24px 20px',
                    border: '1px solid rgba(202,220,255,0.1)',
                  }}
                >
                  <div style={{ fontFamily: FF, fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>
                    {point}
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 14, color: 'rgba(202,220,255,0.6)', lineHeight: 1.5 }}>
                    {context}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 07 TITLE TEMPLATES                                           */}
      {/* ============================================================ */}
      <Section id="section-templates" bg={C.white}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}>
            <SectionLabel>07 — Title Templates</SectionLabel>
            <SectionHeading>Production Title Cards</SectionHeading>
            <BodyText style={{ marginBottom: 56 }}>
              Three production-ready templates for the Client Summit 2026 video deliverables. All set in Figtree. All using IH's brand palette.
            </BodyText>
          </motion.div>

          {/* A: BIG TITLE CARD */}
          <motion.div variants={fadeUp} style={{ marginBottom: 48 }}>
            <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondaryText, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              A — Full-Screen Title Card
            </div>
            <div
              style={{
                background: C.navy,
                borderRadius: 16,
                padding: '80px 60px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 340,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background glow */}
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0,18,231,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <div
                style={{
                  fontFamily: FF,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: C.cardBlue,
                  marginBottom: 24,
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                INCLUDED HEALTH
              </div>

              {/* Divider */}
              <div style={{ width: 80, height: 1, background: C.electricBlue, marginBottom: 24, position: 'relative' }} />

              <div
                style={{
                  fontFamily: FF,
                  fontSize: 'clamp(32px, 4vw, 52px)',
                  fontWeight: 800,
                  color: '#ffffff',
                  textAlign: 'center',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  marginBottom: 16,
                  position: 'relative',
                }}
              >
                Designed to Treat
                <br />
                You Better.™
              </div>

              <div
                style={{
                  fontFamily: FF,
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(202,220,255,0.55)',
                  marginTop: 28,
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                Client Summit 2026
              </div>
            </div>
            <div style={{ marginTop: 12, fontFamily: FF, fontSize: 13, color: C.secondaryText }}>
              Use for: opening title, section transitions, closing card. Export at 1920x1080.
            </div>
          </motion.div>

          {/* B: LOWER THIRD */}
          <motion.div variants={fadeUp} style={{ marginBottom: 48 }}>
            <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondaryText, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              B — Lower Third (Name / Title)
            </div>
            <div
              style={{
                background: 'linear-gradient(135deg, #dde8f0 0%, #c8d8e8 100%)',
                borderRadius: 16,
                padding: '60px 40px',
                display: 'flex',
                alignItems: 'flex-end',
                minHeight: 280,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Simulated background image placeholder */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, transparent 40%, rgba(0,16,72,0.3) 100%)',
                  pointerEvents: 'none',
                }}
              />
              {/* Lower third bar */}
              <div
                style={{
                  background: 'rgba(0,16,72,0.88)',
                  borderRadius: 10,
                  padding: '16px 22px',
                  borderLeft: `4px solid ${C.electricBlue}`,
                  backdropFilter: 'blur(8px)',
                  position: 'relative',
                  minWidth: 320,
                }}
              >
                <div
                  style={{
                    fontFamily: FF,
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '-0.01em',
                    marginBottom: 4,
                  }}
                >
                  Dr. Sarah Chen
                </div>
                <div
                  style={{
                    fontFamily: FF,
                    fontSize: 14,
                    fontWeight: 400,
                    color: C.cardBlue,
                    letterSpacing: '0.01em',
                  }}
                >
                  VP of Clinical Operations
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, fontFamily: FF, fontSize: 13, color: C.secondaryText }}>
              Use for: all interview subjects, speaker IDs. Always include name + title. Min 4s hold.
            </div>
          </motion.div>

          {/* C: ON-SCREEN TITLE */}
          <motion.div variants={fadeUp}>
            <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondaryText, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              C — On-Screen Section Title
            </div>
            <div
              style={{
                background: C.nearWhiteBlue,
                borderRadius: 16,
                padding: '60px 40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 260,
              }}
            >
              <div
                style={{
                  background: C.white,
                  borderRadius: 12,
                  padding: '28px 32px',
                  boxShadow: '0 4px 32px rgba(0,18,231,0.10)',
                  borderLeft: `5px solid ${C.electricBlue}`,
                  maxWidth: 520,
                  width: '100%',
                }}
              >
                <div
                  style={{
                    fontFamily: FF,
                    fontSize: 24,
                    fontWeight: 700,
                    color: C.darkText,
                    letterSpacing: '-0.02em',
                    marginBottom: 8,
                  }}
                >
                  The Future of Virtual Care
                </div>
                <div
                  style={{
                    fontFamily: FF,
                    fontSize: 15,
                    fontWeight: 400,
                    color: C.secondaryText,
                  }}
                >
                  Panel Discussion
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, fontFamily: FF, fontSize: 13, color: C.secondaryText }}>
              Use for: section headers, topic introductions. Works on any background.
            </div>
          </motion.div>
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/* 08 PRODUCTION NOTES                                          */}
      {/* ============================================================ */}
      <Section id="section-production" bg={C.lightBlueWash}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
          <motion.div variants={fadeUp}>
            <SectionLabel>08 — Production Notes</SectionLabel>
            <SectionHeading>AOM Video Deliverables</SectionHeading>
            <BodyText style={{ marginBottom: 40 }}>
              Reference for AOM's team during the Included Health Client Summit 2026 production. Three-day shoot: all formats, all templates, delivered via Frame.io.
            </BodyText>
          </motion.div>

          <motion.div
            variants={stagger}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 40 }}
          >
            {[
              {
                title: 'Hype Reel',
                detail: '60–90s. Opens with full-screen title card. Navy background with electric blue accents throughout.',
              },
              {
                title: 'Interviews (10–15)',
                detail: 'Lower third template on every subject. Figtree 700 name, Figtree 400 title. Electric blue left border.',
              },
              {
                title: 'Session Recordings',
                detail: 'On-screen title at session start. White card, electric blue left accent. Topic + panel type.',
              },
              {
                title: 'B-Roll Package',
                detail: 'No overlay needed. Clean footage. Client color grade: cool tones, slight blue cast.',
              },
            ].map(({ title, detail }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                style={{
                  background: C.white,
                  borderRadius: 12,
                  padding: '24px 22px',
                  boxShadow: '0 2px 12px rgba(0,18,231,0.06)',
                  borderTop: `3px solid ${C.electricBlue}`,
                }}
              >
                <div style={{ fontFamily: FF, fontSize: 16, fontWeight: 700, color: C.darkText, marginBottom: 8 }}>
                  {title}
                </div>
                <div style={{ fontFamily: FF, fontSize: 14, color: C.secondaryText, lineHeight: 1.6 }}>
                  {detail}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Color reference bar */}
          <motion.div variants={fadeUp}>
            <div style={{ fontFamily: FF, fontSize: 13, fontWeight: 700, color: C.secondaryText, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>
              Quick Color Reference
            </div>
            <div
              style={{
                background: C.white,
                borderRadius: 12,
                padding: '20px 24px',
                boxShadow: '0 2px 12px rgba(0,18,231,0.06)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {[
                  { hex: C.electricBlue, name: 'Electric Blue' },
                  { hex: C.navy, name: 'Dark Navy' },
                  { hex: C.lightBlueWash, name: 'Light Wash' },
                  { hex: C.cardBlue, name: 'Card Blue' },
                  { hex: C.coralAccent, name: 'Coral' },
                  { hex: C.green, name: 'Green' },
                  { hex: C.white, name: 'White', border: true },
                ].map(({ hex, name, border }) => (
                  <div key={hex} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: hex,
                        border: border ? `1px solid ${C.borderLight}` : 'none',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontFamily: FF, fontSize: 12, fontWeight: 600, color: C.darkText }}>
                        {name}
                      </div>
                      <CopyHex hex={hex} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Delivery */}
          <motion.div
            variants={fadeUp}
            style={{
              marginTop: 32,
              padding: '24px 28px',
              background: C.navy,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontFamily: FF, fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
                Delivery: Frame.io
              </div>
              <div style={{ fontFamily: FF, fontSize: 14, color: C.cardBlue, opacity: 0.7 }}>
                Contact: Elario Young — elario.young@includedhealth.com
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {['1920×1080', 'H.264', 'Camera LUTs included'].map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: FF,
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.cardBlue,
                    background: 'rgba(0,18,231,0.25)',
                    padding: '4px 12px',
                    borderRadius: 100,
                    border: '1px solid rgba(202,220,255,0.15)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </Section>

      {/* Footer */}
      <div
        style={{
          background: C.white,
          borderTop: `1px solid ${C.borderLight}`,
          padding: '32px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontFamily: FF, fontSize: 13, color: C.secondaryText }}>
          Included Health Brand Kit — AOM Internal Reference
        </span>
        <button
          onClick={() => navigate('/brands')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: FF,
            fontSize: 13,
            fontWeight: 600,
            color: C.electricBlue,
          }}
        >
          <ArrowLeft size={14} />
          All Brand Kits
        </button>
      </div>
    </div>
  )
}
