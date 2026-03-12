import React, { useState, useMemo, useEffect } from 'react'

// ─── BRAND CONSTANTS ──────────────────────────────────────────────────────────
const ORANGE = '#E85D26'
const GREEN = '#22c55e'
const YELLOW = '#eab308'
const RED = '#ef4444'
const BLUE = '#60a5fa'
const PURPLE = '#a78bfa'
const CYAN = '#22d3ee'
const MUTED = '#8A847C'

// ─── CURRENT PIPELINE DATA (Updated Mar 12, 2026) ─────────────────────────────

const PIPELINE_DATA = {
  totalContactsReached: 320,
  totalEmailsSent: 51,
  batchesSent: 5,
  replyRate: 0.7,
  bounces: 2,
  warmLeads: [
    { name: 'Elijah Salazar', company: 'Sure Leverage Funding', status: 'Replied Feb 23-25. Needs response from Patrik. 14+ days waiting.', priority: 'RED' },
    { name: 'Keep It Cut', company: 'Keep It Cut', status: 'Oct 2025 contact. AOM portfolio client. Check if relationship active.', priority: 'WARM' },
  ],
  cpasDraftsPending: 33,
  partnershipDraftsReady: 5,
  newProspectsResearched: 10,
}

const BATCH_HISTORY = [
  { id: 1, date: 'Feb 18-19', name: 'Tech/SaaS + Agencies', count: '~90', status: 'sent', notes: 'First big batch. Defense, agencies, nonprofits, tech.' },
  { id: 2, date: 'Feb 22-23', name: 'Tech/SaaS + Nonprofits', count: '~90', status: 'sent', notes: '2 replies (Elijah Salazar, Paige Soucie). Paige is DEAD/DNC.' },
  { id: 3, date: 'Feb 28', name: 'Apollo Pipeline', count: '37', status: 'sent', notes: 'Apollo-enriched contacts. All credits used. Follow-ups sent Mar 11.' },
  { id: 4, date: 'Mar 8-10', name: 'Check-ins + Hook Emails', count: '53', status: 'sent', notes: 'Follow-ups on Feb batches. 19 by Jacob, 16 by Patrik, 18 hooks.' },
  { id: 5, date: 'Mar 12', name: 'Construction + Partnerships', count: '18', status: 'sent', notes: '15 construction cold (HVAC, roofing, restoration, landscaping) + 3 partnership emails. 1 bounced (Midstate Mechanical).' },
]

const STRATEGIC_SHIFTS = [
  {
    title: 'V2 Email Template',
    status: 'IN PROGRESS',
    color: YELLOW,
    desc: 'Complete rewrite. Zero-risk offer framework, social proof from Ambition Mechanical + Included Health, new subject lines tested.',
  },
  {
    title: 'Niche Database: AZ ROC',
    status: 'GOLD MINE',
    color: GREEN,
    desc: 'Arizona Registrar of Contractors has 45k+ licensed contractors as free CSV download. Eliminates need for paid enrichment tools.',
  },
  {
    title: 'Separate Outreach Domains',
    status: 'RECOMMENDED',
    color: ORANGE,
    desc: 'Protect aom-inhouse.com deliverability. Dedicated domains for cold outreach prevent primary domain reputation damage.',
  },
  {
    title: 'Cold Email Analysis',
    status: 'COMPLETE',
    color: GREEN,
    desc: '10 actionable improvements identified. Shorter emails, curiosity-driven subjects, clear CTAs, less pitch, more value.',
  },
  {
    title: 'Offer Framework',
    status: 'IN PROGRESS',
    color: YELLOW,
    desc: 'Shifting from "hire us" to zero-risk entry: free 15-min video audit of their social presence. Lower barrier, higher conversion.',
  },
]

const KEY_FINDINGS = [
  { label: 'Zero-risk offer framework needed', desc: 'Current pitch asks too much too early. Free audit or teardown video drops the barrier.' },
  { label: 'Separate outreach domains needed', desc: 'Sending cold from primary domain risks deliverability for all AOM email.' },
  { label: 'AZ ROC database = gold mine', desc: '45k+ contractors with license numbers, categories, and addresses. Free CSV. No Apollo needed.' },
  { label: 'Subject lines need work', desc: '"Quick question about your [X]" is overused. Curiosity-driven, observation-based subjects perform better.' },
  { label: 'Construction vertical is right', desc: 'Highest retainer potential ($3k/month). Underserved by serious social. Budgets are there.' },
  { label: 'CPA partnerships > cold CPA outreach', desc: 'CPAs refer. Partnering with 3 good CPAs = access to 50+ construction clients each.' },
]

const MULTI_TOUCH_FLOW = [
  { step: 1, label: 'Cold Email', timing: 'Day 0', desc: 'Personalized first touch. Industry-specific angle. Not a template. Observation about their business.', color: ORANGE },
  { step: 2, label: 'Follow-Up', timing: 'Day 5-7', desc: 'Different angle. Not a bump. New observation or a free value-add (teardown, comparison, tip).', color: YELLOW },
  { step: 3, label: 'Final Touch', timing: 'Day 12-14', desc: 'Shorter. Direct. Last chance before archive. "Figured I\'d try one more time."', color: RED },
  { step: 4, label: 'LinkedIn / IG', timing: 'Day 14+', desc: 'Social touch. Connect, engage with their content. No pitch. Build familiarity.', color: PURPLE },
]

const ICP_INDUSTRIES = [
  { name: 'Construction', count: 76, color: ORANGE, priority: 'TOP', why: 'Target vertical for $3k/month retainers. 15 new cold emails Mar 12. AZ ROC has 45k+ leads.' },
  { name: 'Nonprofit', count: 87, color: GREEN, priority: 'MODERATE', why: 'Strong story potential, tighter budgets. Documentary-style projects, not retainers.' },
  { name: 'Real Estate', count: 61, color: BLUE, priority: 'HIGH', why: 'Brokers want listings content and agent recruiting videos. Good for project-based.' },
  { name: 'Healthcare', count: 46, color: CYAN, priority: 'NICHE', why: 'Some are national/government-adjacent. Included Health ($9k) proves the model.' },
  { name: 'Hospitality', count: 18, color: YELLOW, priority: 'GOOD', why: 'Restaurants, resorts, event venues. Social content is a natural fit.' },
  { name: 'CPA / Partnerships', count: 21, color: PURPLE, priority: 'STRATEGIC', why: '18 CPA cold emails + 5 partnership emails. CPAs refer construction clients. Force multiplier.' },
  { name: 'Events', count: 8, color: '#f472b6', priority: 'NICHE', why: 'Event coverage, recap videos. Project-based with repeat potential.' },
]

// ─── UTILITY COMPONENTS ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#fff', large = false }) {
  return (
    <div style={{
      background: '#151515',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: large ? '28px 24px' : '20px 20px',
      flex: '1 1 200px',
      minWidth: 180,
    }}>
      <div style={{
        fontSize: large ? 40 : 32,
        fontWeight: 900,
        fontStyle: 'italic',
        color: color,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        fontFamily: "'Inter Tight', 'Inter', sans-serif",
      }}>{value}</div>
      <div style={{
        fontSize: 16,
        color: '#F5F0EB',
        marginTop: 6,
        fontWeight: 500,
      }}>{label}</div>
      {sub && (
        <div style={{
          fontSize: 14,
          color: MUTED,
          marginTop: 4,
        }}>{sub}</div>
      )}
    </div>
  )
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 24, marginTop: 48 }}>
      <h2 style={{
        fontSize: 28,
        fontWeight: 900,
        fontStyle: 'italic',
        textTransform: 'uppercase',
        letterSpacing: '-0.02em',
        color: '#F5F0EB',
        lineHeight: 1.2,
        fontFamily: "'Inter Tight', 'Inter', sans-serif",
      }}>{children}</h2>
      {sub && (
        <p style={{ fontSize: 16, color: MUTED, marginTop: 6 }}>{sub}</p>
      )}
    </div>
  )
}

function TierBar({ label, count, maxCount, color, sub }) {
  const pct = Math.max((count / maxCount) * 100, 2)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 16, color: '#F5F0EB', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 20, fontWeight: 700, color }}>{count}</span>
      </div>
      <div style={{ background: '#1A1A17', height: 10, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          transition: 'width 0.6s ease',
        }} />
      </div>
      {sub && <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function FlowStep({ step, label, timing, desc, color, isLast }) {
  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
        <div style={{
          width: 40,
          height: 40,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 700,
          color: '#0A0A08',
          flexShrink: 0,
        }}>{step}</div>
        {!isLast && (
          <div style={{
            width: 2,
            flex: 1,
            background: 'rgba(255,255,255,0.08)',
            minHeight: 40,
          }} />
        )}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 32, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#F5F0EB' }}>{label}</span>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: color,
            background: `${color}18`,
            padding: '2px 10px',
          }}>{timing}</span>
        </div>
        <p style={{ fontSize: 16, color: MUTED, marginTop: 6, lineHeight: 1.6 }}>{desc}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const configs = {
    sent: { bg: `${GREEN}20`, color: GREEN, label: 'SENT' },
    today: { bg: `${ORANGE}20`, color: ORANGE, label: 'TODAY' },
    drafted: { bg: `${YELLOW}20`, color: YELLOW, label: 'DRAFTED' },
    pending_review: { bg: `${PURPLE}20`, color: PURPLE, label: 'PENDING REVIEW' },
    in_progress: { bg: `${CYAN}20`, color: CYAN, label: 'IN PROGRESS' },
    complete: { bg: `${GREEN}20`, color: GREEN, label: 'COMPLETE' },
    recommended: { bg: `${ORANGE}20`, color: ORANGE, label: 'RECOMMENDED' },
    red: { bg: `${RED}20`, color: RED, label: 'RED' },
    warm: { bg: `${YELLOW}20`, color: YELLOW, label: 'WARM' },
  }
  const cfg = configs[status?.toLowerCase()] || configs.sent
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.1em',
      color: cfg.color,
      background: cfg.bg,
      padding: '3px 10px',
      whiteSpace: 'nowrap',
      fontFamily: "'JetBrains Mono', monospace",
      textTransform: 'uppercase',
    }}>{cfg.label}</span>
  )
}

function PriorityBadge({ priority }) {
  const colors = {
    RED: RED,
    WARM: YELLOW,
    TOP: ORANGE,
    HIGH: BLUE,
    GOOD: YELLOW,
    MODERATE: GREEN,
    NICHE: CYAN,
    STRATEGIC: PURPLE,
  }
  const c = colors[priority] || MUTED
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.15em',
      color: c,
      background: `${c}15`,
      padding: '3px 10px',
      fontFamily: "'JetBrains Mono', monospace",
      textTransform: 'uppercase',
    }}>{priority}</span>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

export default function OutreachPlan() {
  const [activeTab, setActiveTab] = useState('overview')
  const isMobile = useIsMobile()

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'batches', label: 'Batch History' },
    { id: 'strategy', label: 'Strategy Shifts' },
    { id: 'verticals', label: 'By Vertical' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A08',
      color: '#F5F0EB',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Film grain overlay */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.03, mixBlendMode: 'overlay', zIndex: 0 }}>
        <svg width="100%" height="100%">
          <filter id="outreach-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#outreach-grain)" />
        </svg>
      </div>

      {/* ─── HEADER ────────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ fontSize: 13, fontWeight: 900, color: ORANGE, letterSpacing: '0.15em', textDecoration: 'none', fontFamily: "'Inter Tight', sans-serif", textTransform: 'uppercase' }}>AOM</a>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Inter Tight', sans-serif" }}>Outreach Pipeline</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: GREEN,
            background: `${GREEN}15`,
            padding: '3px 10px',
            fontFamily: "'JetBrains Mono', monospace",
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ width: 6, height: 6, background: GREEN, display: 'inline-block' }} />
            LIVE
          </span>
          <span>Jacob's Pipeline</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span>Updated Mar 12, 2026</span>
        </div>
      </header>

      {/* ─── TAB BAR ───────────────────────────────────────────────────── */}
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
        display: 'flex',
        gap: 0,
        overflowX: 'auto',
        position: 'relative',
        zIndex: 10,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${ORANGE}` : '2px solid transparent',
              color: activeTab === tab.id ? '#F5F0EB' : MUTED,
              fontSize: 16,
              fontWeight: 500,
              padding: '14px 20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ─── CONTENT ───────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px', position: 'relative', zIndex: 10 }}>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Row */}
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <StatCard label="Emails Sent" value={PIPELINE_DATA.totalEmailsSent} color={GREEN} large sub="Across 5 batches" />
                <StatCard label="Total Contacts" value={`${PIPELINE_DATA.totalContactsReached}+`} color={ORANGE} large sub="In pipeline database" />
                <StatCard label="Reply Rate" value={`${PIPELINE_DATA.replyRate}%`} color={YELLOW} large sub="Industry avg: 1-3%" />
                <StatCard label="Bounces" value={PIPELINE_DATA.bounces} color={RED} large sub="Midstate Mech + Whyte CPA" />
              </div>
            </div>

            {/* Action Items */}
            <SectionTitle sub="What needs attention right now">Action Items</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Warm leads */}
              {PIPELINE_DATA.warmLeads.map((lead, i) => (
                <div key={i} style={{
                  background: '#151515',
                  border: `1px solid ${lead.priority === 'RED' ? RED : YELLOW}30`,
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: 12,
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#F5F0EB' }}>{lead.name}</span>
                      <PriorityBadge priority={lead.priority} />
                    </div>
                    <div style={{ fontSize: 14, color: MUTED }}>{lead.company}</div>
                    <div style={{ fontSize: 14, color: '#A8A29E', marginTop: 4 }}>{lead.status}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: lead.priority === 'RED' ? RED : YELLOW }}>
                    {lead.priority === 'RED' ? 'RESPOND NOW' : 'FOLLOW UP'}
                  </div>
                </div>
              ))}

              {/* Pending review items */}
              <div style={{
                background: '#151515',
                border: `1px solid ${PURPLE}30`,
                padding: '20px 24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#F5F0EB' }}>33 CPA Email Drafts</span>
                  <StatusBadge status="pending_review" />
                </div>
                <div style={{ fontSize: 14, color: '#A8A29E', lineHeight: 1.6 }}>
                  18 CPA cold emails + 5 partnership emails + 10 follow-ups. Tax season window closing. 15 min of review from Patrik unlocks 33 touchpoints.
                </div>
              </div>

              <div style={{
                background: '#151515',
                border: `1px solid ${YELLOW}30`,
                padding: '20px 24px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#F5F0EB' }}>5 Partnership Drafts Ready</span>
                  <StatusBadge status="drafted" />
                </div>
                <div style={{ fontSize: 14, color: '#A8A29E', lineHeight: 1.6 }}>
                  CPA firms and construction service providers. Strategic partnerships that multiply reach without more cold outreach.
                </div>
              </div>
            </div>

            {/* Latest batch */}
            <SectionTitle sub="Most recent outreach activity">Latest: Batch 5 (Mar 12)</SectionTitle>
            <div style={{
              background: '#151515',
              border: `1px solid ${ORANGE}30`,
              padding: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', color: ORANGE, fontFamily: "'Inter Tight', sans-serif" }}>18 emails</span>
                <StatusBadge status="sent" />
              </div>
              <div style={{ fontSize: 16, color: '#F5F0EB', lineHeight: 1.6, marginBottom: 12 }}>
                15 construction cold emails (HVAC, roofing, restoration, landscaping) + 3 partnership emails to CPA firms and surety providers.
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
                <span style={{ color: ORANGE }}>5 HVAC/Mechanical</span>
                <span style={{ color: BLUE }}>3 Roofing</span>
                <span style={{ color: CYAN }}>3 Restoration</span>
                <span style={{ color: GREEN }}>3 Landscaping</span>
                <span style={{ color: PURPLE }}>3 Partnerships</span>
              </div>
              <div style={{ marginTop: 16, padding: '12px 16px', background: `${RED}10`, border: `1px solid ${RED}20` }}>
                <span style={{ fontSize: 13, color: RED, fontWeight: 600 }}>1 Bounce:</span>
                <span style={{ fontSize: 13, color: MUTED, marginLeft: 8 }}>Midstate Mechanical (info@midstatemechanical.com) -- "suspects spam." Removed.</span>
              </div>
            </div>

            {/* Multi-Touch Flow */}
            <SectionTitle sub="Each prospect gets up to 4 touches over 14+ days">Multi-Touch Sequence</SectionTitle>
            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '28px 24px',
            }}>
              {MULTI_TOUCH_FLOW.map((step, i) => (
                <FlowStep
                  key={step.step}
                  {...step}
                  isLast={i === MULTI_TOUCH_FLOW.length - 1}
                />
              ))}
            </div>

            {/* Key Findings */}
            <SectionTitle sub="What we've learned from 320+ contacts and 5 batches">Key Findings</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
              {KEY_FINDINGS.map((finding, i) => (
                <div key={i} style={{
                  background: '#151515',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '20px',
                  borderLeft: `3px solid ${ORANGE}`,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F0EB', marginBottom: 6 }}>{finding.label}</div>
                  <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>{finding.desc}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ BATCH HISTORY TAB ═══ */}
        {activeTab === 'batches' && (
          <>
            <SectionTitle sub={`${PIPELINE_DATA.batchesSent} batches sent. ${PIPELINE_DATA.totalEmailsSent} emails delivered.`}>
              Batch History
            </SectionTitle>

            {/* Summary bar */}
            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '20px 24px',
              marginBottom: 24,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div>
                <span style={{ fontSize: 14, color: '#F5F0EB' }}>Total Progress</span>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>51 emails sent across 5 batches. 2 bounces. 0 meetings.</div>
              </div>
              <div style={{ fontSize: 14, color: ORANGE, fontWeight: 700 }}>{PIPELINE_DATA.replyRate}% reply rate</div>
            </div>

            {/* Batch cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {BATCH_HISTORY.slice().reverse().map((batch) => (
                <div key={batch.id} style={{
                  background: '#151515',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '20px 24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: MUTED,
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.1em',
                      }}>BATCH {batch.id}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#F5F0EB' }}>{batch.name}</span>
                    </div>
                    <StatusBadge status={batch.status} />
                  </div>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14, marginBottom: 8 }}>
                    <span style={{ color: MUTED }}>{batch.date}</span>
                    <span style={{ color: ORANGE, fontWeight: 700 }}>{batch.count} emails</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#A8A29E', lineHeight: 1.6 }}>{batch.notes}</div>
                </div>
              ))}
            </div>

            {/* Bounce log */}
            <SectionTitle sub="Addresses confirmed undeliverable. Do not retry.">Bounce Log</SectionTitle>
            <div style={{
              background: '#151515',
              border: `1px solid ${RED}20`,
              padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#F5F0EB' }}>Midstate Mechanical</span>
                    <span style={{ fontSize: 13, color: MUTED, marginLeft: 12 }}>info@midstatemechanical.com</span>
                  </div>
                  <span style={{ fontSize: 13, color: RED }}>"suspects your message is spam"</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#F5F0EB' }}>Whyte CPA</span>
                    <span style={{ fontSize: 13, color: MUTED, marginLeft: 12 }}>devin@whytecpapc.com</span>
                  </div>
                  <span style={{ fontSize: 13, color: RED }}>"devin wasn't found at whytecpapc.com"</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ STRATEGY SHIFTS TAB ═══ */}
        {activeTab === 'strategy' && (
          <>
            <SectionTitle sub="What's changing in the approach based on 5 batches of data">Strategic Shifts</SectionTitle>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {STRATEGIC_SHIFTS.map((shift, i) => (
                <div key={i} style={{
                  background: '#151515',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '24px',
                  borderLeft: `3px solid ${shift.color}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#F5F0EB' }}>{shift.title}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      color: shift.color,
                      background: `${shift.color}15`,
                      padding: '3px 10px',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{shift.status}</span>
                  </div>
                  <div style={{ fontSize: 16, color: '#A8A29E', lineHeight: 1.6 }}>{shift.desc}</div>
                </div>
              ))}
            </div>

            {/* V2 Template Preview */}
            <SectionTitle sub="What the next round of emails will look like">V2 Email Template Direction</SectionTitle>
            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '24px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 20 }}>
                <div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    color: RED,
                    marginBottom: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>OLD APPROACH</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {[
                      'Generic intro pitch',
                      'Feature-focused',
                      '"Let me know if you want to chat"',
                      'Same template for all verticals',
                      'No social proof',
                    ].map((item, i) => (
                      <li key={i} style={{ fontSize: 14, color: '#78716C', padding: '4px 0', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: RED, flexShrink: 0 }}>-</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    color: GREEN,
                    marginBottom: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>NEW APPROACH</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {[
                      'Observation about THEIR business first',
                      'Zero-risk offer (free 15-min video audit)',
                      'Social proof: Ambition Mechanical, Included Health',
                      'Vertical-specific templates (construction, CPA, hospitality)',
                      'Curiosity-driven subject lines',
                    ].map((item, i) => (
                      <li key={i} style={{ fontSize: 14, color: '#A8A29E', padding: '4px 0', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: GREEN, flexShrink: 0 }}>+</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 10 Improvements */}
            <SectionTitle sub="From cold email strategy analysis">10 Actionable Improvements</SectionTitle>
            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '24px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  'Shorter emails (under 100 words)',
                  'Observation-based openers, not intros',
                  'One clear CTA per email',
                  'Curiosity subjects, not pitch subjects',
                  'Separate outreach domain',
                  'Zero-risk offer (free audit/teardown)',
                  'Social proof in every touch',
                  'Vertical-specific templates',
                  'Follow-up cadence: 5-7-12 days',
                  'Track opens + adjust by engagement',
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <span style={{
                      width: 28,
                      height: 28,
                      background: ORANGE,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0A0A08',
                      flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 14, color: '#F5F0EB' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══ BY VERTICAL TAB ═══ */}
        {activeTab === 'verticals' && (
          <>
            <SectionTitle sub="ICP verticals with contact counts and priority ranking">Industry Breakdown</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {ICP_INDUSTRIES.map((ind) => (
                <div key={ind.name} style={{
                  background: '#151515',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '24px',
                  borderLeft: `3px solid ${ind.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#F5F0EB' }}>{ind.name}</div>
                      <PriorityBadge priority={ind.priority} />
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, fontStyle: 'italic', color: ind.color, fontFamily: "'Inter Tight', sans-serif" }}>{ind.count}</div>
                  </div>
                  <div style={{ fontSize: 14, color: '#A8A29E', lineHeight: 1.6 }}>{ind.why}</div>
                </div>
              ))}
            </div>

            {/* Pipeline bars */}
            <SectionTitle sub="Visual comparison of pipeline by vertical">Pipeline Volume</SectionTitle>
            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '28px 24px',
            }}>
              {ICP_INDUSTRIES.map(ind => (
                <TierBar
                  key={ind.name}
                  label={ind.name}
                  count={ind.count}
                  maxCount={Math.max(...ICP_INDUSTRIES.map(i => i.count), 1)}
                  color={ind.color}
                  sub={`${ind.priority} priority`}
                />
              ))}
            </div>

            {/* AZ ROC callout */}
            <SectionTitle sub="Next-level lead source identified">AZ ROC Database</SectionTitle>
            <div style={{
              background: '#151515',
              border: `2px solid ${GREEN}30`,
              padding: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: GREEN, fontFamily: "'Inter Tight', sans-serif" }}>45,000+</span>
                <span style={{ fontSize: 16, color: '#F5F0EB' }}>licensed Arizona contractors</span>
              </div>
              <div style={{ fontSize: 16, color: '#A8A29E', lineHeight: 1.6, marginBottom: 16 }}>
                Arizona Registrar of Contractors provides a free CSV download of all licensed contractors. Includes license numbers, categories (HVAC, plumbing, roofing, electrical, general), and addresses. Eliminates the need for paid enrichment tools like Apollo for construction vertical targeting.
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
                <span style={{ color: GREEN }}>Free CSV download</span>
                <span style={{ color: MUTED }}>|</span>
                <span style={{ color: '#A8A29E' }}>License categories included</span>
                <span style={{ color: MUTED }}>|</span>
                <span style={{ color: '#A8A29E' }}>No API credits needed</span>
              </div>
            </div>
          </>
        )}

      </main>

      {/* ─── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: 13,
        color: '#44403C',
        position: 'relative',
        zIndex: 10,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        AOM Internal / Jacob's Pipeline / Updated Mar 12, 2026
      </footer>
    </div>
  )
}
