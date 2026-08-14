import React, { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// AOM Stats Page
// Route: /stats
// Purpose: Public-facing business proof for investors and partners.
//          Answers: how many clients, what types, what revenue, what's coming.
// Data source: reconciliation in corner/users/aom/projects/andocia-deal/
//              missions/stats-page/research/2026-05-21-client-revenue-reconciliation.md
// Sanitization: ISA Energy → "Cleantech Energy Startup"
//               Included Health → "Healthcare Technology Company"
// ─────────────────────────────────────────────────────────────────────────────

const ORANGE = '#E85D26'
const INK = '#0C0C0C'
const CREAM = '#FDF6EC'
const INK_SOFT = '#3A3A34'
const INK_MUTED = '#6A6960'
const BORDER = '#E4DDD4'

// ── Animated counter hook ──────────────────────────────────────────────────
function useCountUp(target, duration = 1800, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    function step(ts) {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return val
}

// ── Stats section data ─────────────────────────────────────────────────────
const BIG_STATS = [
  { value: 8,      suffix: '',   label: 'Active client relationships', note: 'Across 6 industries' },
  { value: 77,     prefix: '$', suffix: 'K+', label: 'Revenue delivered', note: 'Documented closed projects' },
  { value: 4,      prefix: '$', suffix: 'K/mo', label: 'Monthly retainer base', note: '$48K annualized' },
  { value: 10,     suffix: '+',  label: 'Projects shipped', note: 'Films, sites, campaigns, brands' },
]

// ── Client roster ──────────────────────────────────────────────────────────
const CLIENTS = [
  {
    name: 'Ambition Mechanical',
    type: 'Social Media · Google Ads · Website',
    status: 'Active retainer',
    statusColor: '#22863a',
    industry: 'Construction / HVAC',
    value: '$2,000/mo + website',
    visible: true,
  },
  {
    name: 'KOHRS',
    type: 'Social Media Content',
    status: 'Active retainer',
    statusColor: '#22863a',
    industry: 'Demolition / Renovation',
    value: '$2,000/mo',
    visible: true,
  },
  {
    name: 'AZ CleanTech',
    type: 'Campaign Film + Assets',
    status: 'Completed',
    statusColor: '#0550ae',
    industry: 'Clean Energy / Nonprofit',
    value: '$55,500',
    visible: true,
  },
  {
    name: 'Healthcare Technology Company',
    type: 'Event Video Production',
    status: 'Completed',
    statusColor: '#0550ae',
    industry: 'Healthcare Tech (enterprise)',
    value: '$9,000',
    visible: true,
  },
  {
    name: 'Cleantech Energy Startup',
    type: 'Brand Film',
    status: 'Post-production',
    statusColor: '#9a6700',
    industry: 'Quantum Energy',
    value: '$9,000',
    visible: true,
  },
  {
    name: 'Higher Orbits',
    type: 'Mini-Doc Series',
    status: 'Active pitch',
    statusColor: '#8250df',
    industry: 'STEM Nonprofit',
    value: '$28,000 proposed',
    visible: true,
  },
  {
    name: 'PA\'LA',
    type: 'Social Content',
    status: 'Active',
    statusColor: '#22863a',
    industry: 'Hospitality',
    value: 'Ongoing',
    visible: true,
  },
  {
    name: 'Space Rising',
    type: 'Web Platform + Brand',
    status: 'Live',
    statusColor: '#0550ae',
    industry: 'Space Industry',
    value: 'Platform build',
    visible: true,
  },
]

// ── Pipeline ───────────────────────────────────────────────────────────────
const PIPELINE = [
  {
    label: 'Higher Orbits',
    type: 'Mini-documentary series',
 detail: '100th event, Deerfield IL, June 2026',
    range: '$28,000 Tier 1 (proposal sent)',
    timing: 'June 2026',
  },
  {
 label: 'Higher Orbits, Extended Series',
    type: 'Interview trips + return event',
    detail: 'Add-on tiers after Tier 1 confirmation',
    range: '$15K–$45K optioned',
    timing: '2026–2027',
  },
  {
    label: 'Nonprofit Foundation',
    type: 'Educational video series',
    detail: 'Mission Water Master Classes proposal',
 range: 'TBD, proposal in progress',
    timing: 'Q3 2026',
  },
  {
    label: 'Wellness + Nutrition Coach',
    type: 'Course platform + content',
    detail: 'Course map built, scope in definition',
    range: 'TBD',
    timing: 'Q3 2026',
  },
]

// ── Service categories ─────────────────────────────────────────────────────
const SERVICES = [
  { label: 'Video Production', count: 6, note: 'Brand films, docs, event coverage' },
  { label: 'Social Media Management', count: 3, note: 'Monthly content retainers' },
  { label: 'Performance Marketing', count: 1, note: 'Google Ads management' },
  { label: 'Web & Platform Builds', count: 2, note: 'Sites + product platforms' },
  { label: 'Brand Identity', count: 2, note: 'Wordmark + brand systems' },
  { label: 'Content Platforms', count: 1, note: 'Course + education systems' },
]

// ── StatCard component ─────────────────────────────────────────────────────
function StatCard({ value, prefix = '', suffix = '', label, note, delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const count = useCountUp(value, 1600, visible)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        borderTop: `2px solid ${INK}`,
        paddingTop: '24px',
        paddingBottom: '24px',
      }}
    >
      <div
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontWeight: 700,
          fontSize: 'clamp(48px, 6vw, 80px)',
          lineHeight: 1,
          color: INK,
          letterSpacing: '-0.02em',
        }}
      >
        <span style={{ color: ORANGE }}>{prefix}</span>
        {count}
        <span style={{ color: ORANGE }}>{suffix}</span>
      </div>
      <div
        style={{
          marginTop: '12px',
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
          fontWeight: 600,
          fontSize: '16px',
          color: INK,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: '4px',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '10.5px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: INK_MUTED,
        }}
      >
        {note}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AOMStats() {
  useEffect(() => {
 document.title = 'AOM, Business Stats'
    // noindex: this is an investor-facing page, not meant for Google
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <div
      style={{
        background: CREAM,
        color: INK,
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      {/* ── NAV strip ───────────────────────────────────────────────── */}
      <nav
        style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 1440,
          margin: '0 auto',
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
            fontSize: '18px',
            color: INK,
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          AOM
        </a>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: INK_MUTED,
          }}
        >
          Business overview · May 2026
        </span>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: 'clamp(64px, 8vw, 120px) 24px',
          maxWidth: 1440,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <span style={{ width: '40px', height: '1px', background: ORANGE, display: 'block' }} />
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10.5px',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: ORANGE,
            }}
          >
            Ahead of Market · aheadofmarket.com
          </span>
        </div>

        <h1
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(52px, 8vw, 120px)',
            fontWeight: 800,
            lineHeight: 0.92,
            letterSpacing: '-0.025em',
            color: INK,
            maxWidth: '1100px',
            marginBottom: '40px',
          }}
        >
          Real work.{' '}
          <em
            style={{
              fontStyle: 'italic',
              color: ORANGE,
              fontWeight: 500,
            }}
          >
            Real clients.
          </em>{' '}
          Real results.
        </h1>

        <div
          style={{
            maxWidth: '640px',
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '16px',
          }}
        >
          <p
            style={{
              fontSize: '18px',
              lineHeight: 1.6,
              color: INK_SOFT,
              fontWeight: 400,
            }}
          >
            AOM is a full-service creative and AI ops agency. We build video productions, content systems, brand identities, and intelligent workflows for companies that do real work — construction, energy, healthcare, nonprofits, and founders building things that matter.
          </p>
          <p
            style={{
              fontSize: '16px',
              lineHeight: 1.6,
              color: INK_MUTED,
            }}
          >
            We ship on time, we show up on job sites, and every piece we make is designed to move the needle on trust, visibility, and revenue.
          </p>
        </div>
      </section>

      {/* ── BY THE NUMBERS ──────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: 'clamp(56px, 7vw, 96px) 24px',
          maxWidth: 1440,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '48px',
          }}
        >
          <span style={{ width: '40px', height: '1px', background: ORANGE, display: 'block' }} />
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10.5px',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: ORANGE,
            }}
          >
            By the numbers
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '40px 56px',
          }}
        >
          {BIG_STATS.map((s, i) => (
            <StatCard
              key={i}
              value={s.value}
              prefix={s.prefix}
              suffix={s.suffix}
              label={s.label}
              note={s.note}
              delay={i * 100}
            />
          ))}
        </div>
      </section>

      {/* ── ACTIVE CLIENTS ──────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: 'clamp(56px, 7vw, 96px) 24px',
          maxWidth: 1440,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '12px',
          }}
        >
          <span style={{ width: '40px', height: '1px', background: ORANGE, display: 'block' }} />
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10.5px',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: ORANGE,
            }}
          >
            Client portfolio
          </span>
        </div>

        <h2
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: '-0.02em',
            color: INK,
            maxWidth: '900px',
            marginBottom: '48px',
          }}
        >
          Active clients and{' '}
          <em style={{ fontStyle: 'italic', color: ORANGE, fontWeight: 500 }}>completed work.</em>
        </h2>

        {/* Table — desktop */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
            }}
          >
            <thead>
              <tr
                style={{
                  borderTop: `2px solid ${INK}`,
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                {['Client', 'Type of work', 'Industry', 'Status', 'Value'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '12px 16px 12px 0',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '10px',
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: INK_MUTED,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CLIENTS.map((c, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  <td
                    style={{
                      padding: '18px 16px 18px 0',
                      fontWeight: 600,
                      fontSize: '15px',
                      color: INK,
                      minWidth: '180px',
                    }}
                  >
                    {c.name}
                  </td>
                  <td
                    style={{
                      padding: '18px 16px 18px 0',
                      fontSize: '14px',
                      color: INK_SOFT,
                      minWidth: '200px',
                    }}
                  >
                    {c.type}
                  </td>
                  <td
                    style={{
                      padding: '18px 16px 18px 0',
                      fontSize: '13px',
                      color: INK_MUTED,
                      minWidth: '160px',
                    }}
                  >
                    {c.industry}
                  </td>
                  <td
                    style={{
                      padding: '18px 16px 18px 0',
                      minWidth: '140px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '2px',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: '"JetBrains Mono", monospace',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: c.statusColor,
                        background: c.statusColor + '14',
                        border: `1px solid ${c.statusColor}30`,
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '18px 0 18px 0',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: INK_SOFT,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── SERVICE BREAKDOWN ───────────────────────────────────────── */}
      <section
        style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: 'clamp(56px, 7vw, 96px) 24px',
          maxWidth: 1440,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '12px',
          }}
        >
          <span style={{ width: '40px', height: '1px', background: ORANGE, display: 'block' }} />
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10.5px',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: ORANGE,
            }}
          >
            What we do
          </span>
        </div>

        <h2
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: '-0.02em',
            color: INK,
            maxWidth: '900px',
            marginBottom: '48px',
          }}
        >
          Work by{' '}
          <em style={{ fontStyle: 'italic', color: ORANGE, fontWeight: 500 }}>category.</em>
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0',
          }}
        >
          {SERVICES.map((s, i) => (
            <div
              key={i}
              style={{
                borderTop: `1px solid ${BORDER}`,
                borderRight: i % 2 === 0 ? `1px solid ${BORDER}` : 'none',
                padding: '28px 24px 28px 0',
                paddingLeft: i % 2 === 1 ? '24px' : '0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '12px',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: '40px',
                    fontWeight: 700,
                    color: ORANGE,
                    lineHeight: 1,
                  }}
                >
                  {s.count}
                </span>
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: INK_MUTED,
                  }}
                >
                  clients
                </span>
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '16px',
                  color: INK,
                  marginBottom: '6px',
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: INK_MUTED,
                  lineHeight: 1.5,
                }}
              >
                {s.note}
              </div>
            </div>
          ))}
          {/* close bottom border */}
          <div style={{ borderTop: `1px solid ${BORDER}`, gridColumn: '1 / -1', height: 0 }} />
        </div>
      </section>

      {/* ── PIPELINE ────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: `1px solid ${BORDER}`,
          padding: 'clamp(56px, 7vw, 96px) 24px',
          maxWidth: 1440,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '12px',
          }}
        >
          <span style={{ width: '40px', height: '1px', background: ORANGE, display: 'block' }} />
          <span
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '10.5px',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: ORANGE,
            }}
          >
            What's coming up
          </span>
        </div>

        <h2
          style={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 700,
            lineHeight: 0.98,
            letterSpacing: '-0.02em',
            color: INK,
            maxWidth: '900px',
            marginBottom: '48px',
          }}
        >
          Active pipeline and{' '}
          <em style={{ fontStyle: 'italic', color: ORANGE, fontWeight: 500 }}>upcoming engagements.</em>
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
          }}
        >
          {PIPELINE.map((p, i) => (
            <div
              key={i}
              style={{
                background: 'white',
                border: `1px solid ${BORDER}`,
                padding: '28px',
              }}
            >
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '10px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: ORANGE,
                  marginBottom: '12px',
                }}
              >
                {p.timing}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '17px',
                  color: INK,
                  marginBottom: '6px',
                  lineHeight: 1.3,
                }}
              >
                {p.label}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: INK_MUTED,
                  marginBottom: '16px',
                  lineHeight: 1.5,
                }}
              >
                {p.type} — {p.detail}
              </div>
              <div
                style={{
                  borderTop: `1px solid ${BORDER}`,
                  paddingTop: '14px',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: INK_SOFT,
                  letterSpacing: '0.04em',
                }}
              >
                {p.range}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REVENUE BREAKDOWN ───────────────────────────────────────── */}
      <section
        style={{
          background: INK,
          color: CREAM,
          padding: 'clamp(56px, 7vw, 96px) 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1440,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '12px',
            }}
          >
            <span style={{ width: '40px', height: '1px', background: ORANGE, display: 'block' }} />
            <span
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '10.5px',
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: ORANGE,
              }}
            >
              Revenue breakdown
            </span>
          </div>

          <h2
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: 700,
              lineHeight: 0.98,
              letterSpacing: '-0.02em',
              color: CREAM,
              maxWidth: '900px',
              marginBottom: '56px',
            }}
          >
            Where the money{' '}
            <em style={{ fontStyle: 'italic', color: ORANGE, fontWeight: 500 }}>comes from.</em>
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '40px',
              marginBottom: '56px',
            }}
          >
            {/* Closed one-time */}
            <div>
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '10px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: CREAM + 'aa',
                  marginBottom: '20px',
                }}
              >
                One-time projects (closed)
              </div>
              {[
                { client: 'AZ CleanTech', amount: '$55,500' },
                { client: 'ISA Energy (brand film)', amount: '$9,000' },
                { client: 'Healthcare Technology Company', amount: '$9,000' },
                { client: 'Ambition Mechanical (website)', amount: '$4,000' },
              ].map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px solid rgba(255,255,255,0.10)',
                    padding: '14px 0',
                  }}
                >
                  <span style={{ fontSize: '15px', color: CREAM, fontWeight: 400 }}>{r.client}</span>
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: CREAM,
                    }}
                  >
                    {r.amount}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  borderTop: `2px solid ${CREAM}40`,
                  paddingTop: '16px',
                  marginTop: '4px',
                }}
              >
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '10px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: CREAM + 'aa',
                  }}
                >
                  Total documented
                </span>
                <span
                  style={{
                    fontFamily: '"Playfair Display", Georgia, serif',
                    fontSize: '26px',
                    fontWeight: 700,
                    color: ORANGE,
                  }}
                >
                  $77,500
                </span>
              </div>
            </div>

            {/* Recurring */}
            <div>
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '10px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: CREAM + 'aa',
                  marginBottom: '20px',
                }}
              >
                Monthly retainers (ongoing)
              </div>
              {[
                { client: 'Ambition Mechanical', amount: '$2,000/mo' },
                { client: 'KOHRS', amount: '$2,000/mo' },
              ].map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px solid rgba(255,255,255,0.10)',
                    padding: '14px 0',
                  }}
                >
                  <span style={{ fontSize: '15px', color: CREAM, fontWeight: 400 }}>{r.client}</span>
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: CREAM,
                    }}
                  >
                    {r.amount}
                  </span>
                </div>
              ))}
              <div
                style={{
                  borderTop: `2px solid ${CREAM}40`,
                  paddingTop: '16px',
                  marginTop: '4px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: CREAM + 'aa',
                    }}
                  >
                    MRR
                  </span>
                  <span
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: '26px',
                      fontWeight: 700,
                      color: ORANGE,
                    }}
                  >
                    $4,000/mo
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginTop: '8px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: CREAM + 'aa',
                    }}
                  >
                    Annualized
                  </span>
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: CREAM,
                    }}
                  >
                    $48,000/yr
                  </span>
                </div>
              </div>
            </div>

            {/* Pipeline */}
            <div>
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '10px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: CREAM + 'aa',
                  marginBottom: '20px',
                }}
              >
                Active pipeline (not yet closed)
              </div>
              {[
 { client: 'Higher Orbits, Tier 1', amount: '$28,000' },
 { client: 'Higher Orbits, Tiers 2+', amount: 'Up to $45K' },
                { client: 'Nonprofit Foundation series', amount: 'TBD' },
                { client: 'Wellness content platform', amount: 'TBD' },
              ].map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px solid rgba(255,255,255,0.10)',
                    padding: '14px 0',
                  }}
                >
                  <span style={{ fontSize: '14px', color: CREAM + 'cc', fontWeight: 400 }}>{r.client}</span>
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: r.amount.startsWith('$') ? ORANGE : CREAM + 'aa',
                    }}
                  >
                    {r.amount}
                  </span>
                </div>
              ))}
              <div
                style={{
                  borderTop: `2px solid ${CREAM}40`,
                  paddingTop: '16px',
                  marginTop: '4px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '10px',
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: CREAM + 'aa',
                    }}
                  >
                    Pipeline value
                  </span>
                  <span
                    style={{
                      fontFamily: '"Playfair Display", Georgia, serif',
                      fontSize: '26px',
                      fontWeight: 700,
                      color: ORANGE,
                    }}
                  >
                    $28K+
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* note */}
          <p
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: CREAM + '55',
              borderTop: '1px solid rgba(255,255,255,0.10)',
              paddingTop: '24px',
              maxWidth: '700px',
              lineHeight: 1.6,
            }}
          >
            Revenue figures sourced from signed proposals, confirmed invoices, and retainer agreements on file as of May 2026. Two clients anonymized at this time (enterprise healthcare company, early-stage cleantech startup) — full details available under NDA. Pipeline values reflect proposals sent or in final scoping.
          </p>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section
        style={{
          background: CREAM,
          borderTop: `1px solid ${BORDER}`,
          padding: 'clamp(56px, 7vw, 96px) 24px',
          maxWidth: 1440,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            maxWidth: '640px',
          }}
        >
          <h2
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: 'clamp(32px, 4vw, 56px)',
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: '-0.02em',
              color: INK,
            }}
          >
            Let's talk about what{' '}
            <em style={{ fontStyle: 'italic', color: ORANGE, fontWeight: 500 }}>we can build together.</em>
          </h2>

          <p style={{ fontSize: '16px', color: INK_MUTED, lineHeight: 1.6 }}>
 Whether you're a client looking for the right creative partner, or a strategic partner interested in what AOM + Corner can become, the conversation starts here.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href="mailto:hello@aom-inhouse.com"
              style={{
                display: 'inline-block',
                background: ORANGE,
                color: 'white',
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: '14px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '14px 28px',
                textDecoration: 'none',
                border: 'none',
              }}
            >
              Get in touch
            </a>
            <a
              href="/"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: INK_MUTED,
                textDecoration: 'none',
              }}
            >
              aheadofmarket.com →
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: `1px solid ${BORDER}`,
          padding: '24px',
          maxWidth: 1440,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: INK_MUTED,
          }}
        >
          © 2026 Ahead of Market (AOM)
        </span>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: INK_MUTED,
          }}
        >
          Confidential · For investor reference
        </span>
      </footer>
    </div>
  )
}