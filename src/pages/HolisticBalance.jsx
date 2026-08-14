import React, { useEffect, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Holistic Balance — Course Map
// Route: /hb
// Content sourced from: 2026-05-17-course-map.md
// Author words only — no invented copy.
// ─────────────────────────────────────────────────────────────────────────────

const SAGE = '#5C7A54'
const SAGE_LIGHT = '#7C9A72'
const SAGE_PALE = '#EDF4EB'
const CREAM = '#FAFAF5'
const CREAM_WARM = '#F5EEE4'
const INK = '#1A1A16'
const INK_SOFT = '#3A3A34'
const INK_MUTED = '#6A6960'
const BORDER = '#DDD8CC'
const TERRACOTTA = '#C05A3A'

const PATH_STAGES = [
  {
    number: '01',
    stage: 'Foundation',
    course: 'The Best Diet for YOU!',
    rationale:
      'Establishes personalized nutrition fundamentals before any specific protocol. Individualization is explicitly the starting point of the functional nutrition framework.',
    color: SAGE,
  },
  {
    number: '02',
    stage: 'Targeted Healing',
    course: 'Techniques for Gut Healing',
    rationale:
      'Applies the dietary foundation to the specific goal of gut repair. Gut health builds on dietary basics.',
    color: TERRACOTTA,
  },
  {
    number: '03',
    stage: 'Whole Life Integration',
    course: '10 Ways to Recharge Your Life',
    rationale:
 'Expands beyond diet into lifestyle, sleep, movement, stress, alternative therapies. The sustainable layer: "long-term health changes rather than quick fixes."',
    color: '#4A7090',
  },
]

const COURSES = [
  {
    number: '01',
    name: 'The Best Diet for YOU!',
    stage: 'Foundation',
    stageColor: SAGE,
    intro: 'Individualization is the heart of functional nutrition. Recognizes that different people respond differently.',
    modules: [
      {
        title: 'Why One-Size-Fits-All Fails',
        body: 'Individualization: why your body is different from everyone else\'s',
      },
      {
        title: 'Your Food Journal',
 body: 'Tracking one week of eating to reveal your patterns, "Assess Your Current Diet, Keep a food journal for one week to identify patterns"',
      },
      {
        title: 'Reading Your Body\'s Signals',
 body: '"Listen to Your Body, Pay attention to individual responses; adjust accordingly"',
      },
      {
        title: 'Building Your Plate',
 body: '"Focus on Whole Foods, Fill plates with unprocessed options; limit processed foods and unhealthy fats"',
      },
      {
        title: 'Stress, Food & Your Body',
 body: '"Mind-Body Connection, Acknowledges stress and emotional factors affect physical health"',
      },
      {
        title: 'Making Changes That Stick',
 body: '"Sustainability, Focuses on long-term health changes rather than quick fixes"',
      },
    ],
  },
  {
    number: '02',
    name: 'Techniques for Gut Healing',
    stage: 'Targeted Healing',
    stageColor: TERRACOTTA,
 intro: '"Gut Health, the gut\'s role in digestion, boost immunity, and even enhance mental well-being"',
    modules: [
      {
        title: 'Understanding Your Gut',
        body: 'The gut\'s role in digestion, immunity, and mental well-being',
      },
      {
        title: 'Whole Foods as Medicine',
 body: '"Whole Foods, emphasizes unprocessed foods that are nutrient-rich"',
      },
      {
        title: 'Fermented Foods & Probiotics',
 body: '"Prioritize Gut Health, Incorporate fermented foods containing probiotics"',
      },
      {
        title: 'Anti-Inflammatory Eating',
        body: '"Anti-inflammatory foods like fatty fish, leafy greens, and berries" and turmeric, ginger',
      },
      {
        title: 'Hydration for Healing',
 body: '"Stay Hydrated, Drink water; herbal teas and infused water are alternatives"',
      },
    ],
  },
  {
    number: '03',
    name: '10 Ways to Recharge Your Life',
    stage: 'Whole Life Integration',
    stageColor: '#4A7090',
    intro: '"Managing chronic illness is a journey, not a destination"',
    modules: [
      {
        title: 'Understanding Holistic Health',
        body: 'Mind, body, spirit balance',
      },
      {
        title: 'Nutrition: Fueling Your Body',
        body: 'Whole foods, hydration, anti-inflammatory eating',
      },
      {
        title: 'Mindfulness & Stress Management',
        body: 'Meditation, breathing, yoga, gratitude journaling',
      },
      {
        title: 'Physical Activity: Moving Your Body',
        body: 'Finding enjoyable movement, building gradually',
      },
      {
        title: 'Building a Support System',
        body: 'Groups, family, professional support',
      },
      {
        title: 'Sleep: Prioritizing Rest',
        body: 'Consistent schedules, environment, relaxation before bed',
      },
      {
        title: 'Embracing Alternative Therapies',
        body: 'Acupuncture, massage, herbal remedies, aromatherapy',
      },
      {
        title: 'Staying Informed & Empowered',
        body: 'Educating yourself, tracking symptoms and triggers',
      },
      {
        title: 'Finding Balance in Life',
        body: 'Realistic goals, hobbies, self-compassion',
      },
      {
        title: 'Food as Medicine',
 body: 'Seasonal, heart-healthy, and whole-life eating, the full circle',
      },
    ],
  },
]

function CourseCard({ course }) {
  const [open, setOpen] = useState(false)

  return (
    <article
      style={{
        backgroundColor: '#fff',
        border: `1px solid ${BORDER}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Card header */}
      <div
        style={{
          borderLeft: `4px solid ${course.stageColor}`,
          padding: '36px 40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: course.stageColor,
                marginBottom: 10,
                fontWeight: 700,
              }}
            >
              Stage {course.number} — {course.stage}
            </p>
            <h3
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 'clamp(22px, 3vw, 32px)',
                fontWeight: 700,
                color: INK,
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {course.name}
            </h3>
            <p
              style={{
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontSize: 15,
                color: INK_MUTED,
                marginTop: 12,
                lineHeight: 1.6,
                fontStyle: 'italic',
                maxWidth: 560,
              }}
            >
              {course.intro}
            </p>
          </div>
          <div style={{ paddingTop: 4 }}>
            <p
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: INK_MUTED,
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              {course.modules.length} modules
            </p>
          </div>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          style={{
            marginTop: 24,
            padding: '10px 22px',
            backgroundColor: 'transparent',
            border: `1.5px solid ${course.stageColor}`,
            color: course.stageColor,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {open ? 'Hide modules' : 'View all modules'}
          <span style={{ fontSize: 12, lineHeight: 1 }}>{open ? '↑' : '↓'}</span>
        </button>
      </div>

      {/* Module list */}
      {open && (
        <div
          style={{
            padding: '0 40px 40px',
            backgroundColor: CREAM,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
              paddingTop: 28,
            }}
          >
            {course.modules.map((mod, i) => (
              <div
                key={i}
                style={{
                  padding: '20px 22px',
                  backgroundColor: '#fff',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 2,
                }}
              >
                <p
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 9,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: course.stageColor,
                    marginBottom: 6,
                    fontWeight: 700,
                  }}
                >
                  Module {String(i + 1).padStart(2, '0')}
                </p>
                <p
                  style={{
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    fontSize: 15,
                    fontWeight: 600,
                    color: INK,
                    marginBottom: 6,
                    lineHeight: 1.35,
                  }}
                >
                  {mod.title}
                </p>
                <p
                  style={{
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    fontSize: 13,
                    color: INK_MUTED,
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {mod.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

export default function HolisticBalance() {
  useEffect(() => {
 document.title = 'Holistic Balance, Course Path'
    // Prevent indexing — this is a client-facing proposal page
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    return () => {
      meta.remove()
      document.title = 'Ahead of Market'
    }
  }, [])

  return (
    <div
      style={{
        backgroundColor: CREAM,
        color: INK,
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >

      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: INK,
          color: CREAM,
          padding: 'clamp(64px, 10vw, 120px) clamp(24px, 6vw, 80px)',
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Botanical texture stripe */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 'clamp(160px, 28vw, 320px)',
            height: '100%',
            background: `linear-gradient(180deg, ${SAGE}22 0%, transparent 100%)`,
            borderLeft: `1px solid ${SAGE}33`,
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: 1200, width: '100%', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <span style={{ width: 40, height: 1, backgroundColor: SAGE_LIGHT, display: 'inline-block' }} />
            <p
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: SAGE_LIGHT,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Holistic Balance · Course Map · 2026
            </p>
          </div>

          <h1
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(40px, 7vw, 88px)',
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: '-0.02em',
              maxWidth: 900,
              color: '#F5EEE4',
              margin: '0 0 24px 0',
            }}
          >
            A suggested path to{' '}
            <em
              style={{
                fontStyle: 'italic',
                fontWeight: 400,
                color: SAGE_LIGHT,
              }}
            >
              lasting wellness.
            </em>
          </h1>

          <p
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(16px, 2.2vw, 22px)',
              fontStyle: 'italic',
              fontWeight: 400,
              color: '#C8C0B4',
              maxWidth: 680,
              lineHeight: 1.6,
              margin: '0 0 48px 0',
            }}
          >
            "Our Food Should Be Our Medicine &amp; Our Medicine Should Be Our Food"
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: SAGE,
                color: '#fff',
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              3 Courses · 3 Stages · 21 Modules
            </div>
            <p
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#6A6960',
                fontWeight: 700,
                margin: 0,
              }}
            >
              Courtney Boyce · Functional Nutritionist, COTA/L
            </p>
          </div>
        </div>
      </section>

      {/* ─── THE PATH ──────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px, 8vw, 96px) clamp(24px, 6vw, 80px)', backgroundColor: CREAM_WARM }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <span style={{ width: 40, height: 1, backgroundColor: SAGE, display: 'inline-block' }} />
            <p
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: SAGE,
                fontWeight: 700,
                margin: 0,
              }}
            >
              The suggested path
            </p>
          </div>

          <h2
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(28px, 4vw, 52px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: INK,
              margin: '0 0 12px 0',
            }}
          >
            Diet foundation → Gut healing → Full-life recharge.
          </h2>
          <p
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontSize: 16,
              color: INK_MUTED,
              maxWidth: 640,
              lineHeight: 1.65,
              margin: '0 0 56px 0',
            }}
          >
 Based on the site's CTA structure, the services progression, and the blog content hierarchy, the three courses work in sequence. Each builds on the last.
          </p>

          {/* Path stages */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 24,
            }}
          >
            {PATH_STAGES.map((stage, idx) => (
              <div
                key={idx}
                style={{
                  padding: '36px 32px',
                  backgroundColor: '#fff',
                  border: `1px solid ${BORDER}`,
                  borderTop: `4px solid ${stage.color}`,
                  position: 'relative',
                }}
              >
                {/* Connector arrow (not on last) */}
                {idx < PATH_STAGES.length - 1 && (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: -20,
                      transform: 'translateY(-50%)',
                      color: INK_MUTED,
                      fontSize: 18,
                      fontFamily: 'system-ui',
                      zIndex: 2,
                      display: 'none', // hide on mobile; visible on desktop via a class trick
                    }}
                  >
                    →
                  </div>
                )}
                <p
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10,
                    letterSpacing: '0.32em',
                    textTransform: 'uppercase',
                    color: stage.color,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  Stage {stage.number}
                </p>
                <h3
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: 'clamp(20px, 2.5vw, 26px)',
                    fontWeight: 700,
                    color: INK,
                    margin: '0 0 8px 0',
                    lineHeight: 1.2,
                  }}
                >
                  {stage.stage}
                </h3>
                <p
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: stage.color,
                    fontWeight: 700,
                    marginBottom: 16,
                  }}
                >
                  {stage.course}
                </p>
                <p
                  style={{
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    fontSize: 14,
                    color: INK_MUTED,
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {stage.rationale}
                </p>
              </div>
            ))}
          </div>

          {/* Path line connector for desktop */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
              marginTop: 32,
              paddingTop: 24,
              borderTop: `1px solid ${BORDER}`,
            }}
          >
            {PATH_STAGES.map((s, i) => (
              <React.Fragment key={i}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: s.color,
                    flexShrink: 0,
                  }}
                />
                {i < PATH_STAGES.length - 1 && (
                  <span
                    style={{
                      flex: 1,
                      maxWidth: 200,
                      height: 1.5,
                      backgroundColor: BORDER,
                      display: 'block',
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              maxWidth: 500,
              marginTop: 10,
            }}
          >
            {PATH_STAGES.map((s) => (
              <p
                key={s.number}
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 9,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: s.color,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {s.stage}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COURSES ───────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px, 8vw, 96px) clamp(24px, 6vw, 80px)', backgroundColor: CREAM }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <span style={{ width: 40, height: 1, backgroundColor: SAGE, display: 'inline-block' }} />
            <p
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: SAGE,
                fontWeight: 700,
                margin: 0,
              }}
            >
              The courses
            </p>
          </div>

          <h2
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(28px, 4vw, 52px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
              color: INK,
              margin: '0 0 12px 0',
            }}
          >
            Three courses. One complete system.
          </h2>
          <p
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontSize: 16,
              color: INK_MUTED,
              maxWidth: 600,
              lineHeight: 1.65,
              margin: '0 0 56px 0',
            }}
          >
            Each course builds on the previous. Together they form a whole-body approach — one that nurtures the mind, body, and spirit.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {COURSES.map((course) => (
              <CourseCard key={course.number} course={course} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT COURTNEY ────────────────────────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(64px, 8vw, 96px) clamp(24px, 6vw, 80px)',
          backgroundColor: INK,
          color: CREAM,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(32px, 5vw, 80px)',
            alignItems: 'start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <span style={{ width: 40, height: 1, backgroundColor: SAGE_LIGHT, display: 'inline-block' }} />
              <p
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10,
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                  color: SAGE_LIGHT,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                About the founder
              </p>
            </div>
            <h2
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 'clamp(28px, 4vw, 48px)',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
                color: '#F5EEE4',
                margin: '0 0 24px 0',
              }}
            >
              Courtney Boyce
            </h2>
            <p
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: SAGE_LIGHT,
                fontWeight: 700,
                marginBottom: 24,
              }}
            >
              Functional Nutritionist · COTA/L · Founder of Holistic Balance
            </p>
            <p
              style={{
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontSize: 16,
                color: '#B8B0A8',
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              Courtney brings a whole-body approach — one that nurtures the mind, body, and spirit. Her work sits at the intersection of functional nutrition and occupational therapy.
            </p>
            <p
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 18,
                fontStyle: 'italic',
                color: '#C8C0B4',
                lineHeight: 1.65,
                borderLeft: `3px solid ${SAGE}`,
                paddingLeft: 20,
                margin: 0,
              }}
            >
              "Our Food Should Be Our Medicine &amp; Our Medicine Should Be Our Food"
            </p>
          </div>

          <div>
            <p
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: SAGE_LIGHT,
                fontWeight: 700,
                marginBottom: 20,
              }}
            >
              Specialties
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Sensory-based feeding challenges (children and adults)',
                'Digestive issues and complex health conditions',
                'Mindful eating and food as medicine',
                'Chronic illness support',
                'Picky eater management',
              ].map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    fontSize: 15,
                    color: '#B8B0A8',
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: SAGE_LIGHT,
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                  {item}
                </li>
              ))}
            </ul>

            <div
              style={{
                marginTop: 40,
                padding: '24px 28px',
                backgroundColor: '#2A2A24',
                border: `1px solid #3A3A34`,
              }}
            >
              <p
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: SAGE_LIGHT,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Services
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { name: 'Functional Nutrition Program', detail: '12 hrs · Comprehensive Nutrition for Any Chronic Illness' },
                  { name: 'Comprehensive Holistic Consultation', detail: '1 hr · Personal Guidance' },
                  { name: 'Movement Therapy Session', detail: '1 hr · Move well, Live well' },
                  { name: 'Feeding Therapy Session', detail: '1 hr · Interactive Feeding Therapy' },
                  { name: 'Lab Tests and Screenings', detail: '45 min · Test, don\'t guess' },
                ].map((svc, i) => (
                  <li
                    key={i}
                    style={{
                      padding: '10px 0',
                      borderBottom: i < 4 ? `1px solid #3A3A34` : 'none',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: '"Space Grotesk", system-ui, sans-serif',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#F0EAE0',
                        margin: '0 0 3px 0',
                      }}
                    >
                      {svc.name}
                    </p>
                    <p
                      style={{
                        fontFamily: '"Space Grotesk", system-ui, sans-serif',
                        fontSize: 12,
                        color: '#6A6960',
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {svc.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(64px, 8vw, 96px) clamp(24px, 6vw, 80px)',
          backgroundColor: SAGE_PALE,
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: SAGE,
              fontWeight: 700,
              marginBottom: 20,
            }}
          >
            Start your journey
          </p>
          <h2
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(26px, 4vw, 44px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              color: INK,
              margin: '0 0 20px 0',
            }}
          >
            "Join Me in Exploring a New World of Functional Nutrition"
          </h2>
          <p
            style={{
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontSize: 17,
              color: INK_MUTED,
              lineHeight: 1.7,
              marginBottom: 40,
            }}
          >
            A free 30-minute consultation to explore what this path might look like for you.
          </p>
          <a
            href="https://www.holisticbalancehealth.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '16px 40px',
              backgroundColor: SAGE,
              color: '#fff',
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textDecoration: 'none',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={e => (e.target.style.backgroundColor = '#4A6644')}
            onMouseLeave={e => (e.target.style.backgroundColor = SAGE)}
          >
            Visit Holistic Balance
          </a>
          <p
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: INK_MUTED,
              marginTop: 20,
              fontWeight: 700,
            }}
          >
            holisticbalancehealth.com · @courtneyboyceHB
          </p>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '28px clamp(24px, 6vw, 80px)',
          backgroundColor: INK,
          borderTop: `1px solid #2A2A24`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <p
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#4A4A44',
            fontWeight: 700,
            margin: 0,
          }}
        >
          Holistic Balance · Courtney Boyce, Functional Nutritionist, COTA/L
        </p>
        <p
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#4A4A44',
            fontWeight: 700,
            margin: 0,
          }}
        >
          Course path prepared by Ahead of Market · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}