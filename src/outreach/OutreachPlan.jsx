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

// ─── STATIC DATA (multi-touch + schedule stay hardcoded) ────────────────────

const MULTI_TOUCH_FLOW = [
  { step: 1, label: 'Cold Email', timing: 'Day 0', desc: 'Personalized first touch. Industry-specific angle. Not a template.', color: ORANGE },
  { step: 2, label: 'Follow-Up', timing: 'Day 5', desc: 'Different angle. Not a bump. New observation about their business.', color: YELLOW },
  { step: 3, label: 'Final Touch', timing: 'Day 12', desc: 'Shorter. Direct. Last chance before archive.', color: RED },
  { step: 4, label: 'LinkedIn / IG', timing: 'Day 14+', desc: 'Social touch. Connect, engage with their content. No pitch.', color: PURPLE },
]

const THIRTY_DAY_SCHEDULE = [
  { day: 1, date: 'Mar 8', count: 20, type: 'Check-ins + Priority Replies', industry: 'Construction, Hospitality, RE, Events', status: 'done' },
  { day: 2, date: 'Mar 9', count: 18, type: 'Check-ins continued', industry: 'Feb 28 batch', status: 'done' },
  { day: 3, date: 'Mar 10', count: 15, type: 'Hook emails', industry: 'Tech/SaaS, Nonprofit', status: 'done' },
  { day: 4, date: 'Mar 11', count: 19, type: 'Tier 1 ICP Re-Engagement', industry: 'Healthcare, Real Estate', status: 'today' },
  { day: 5, date: 'Mar 12', count: 17, type: 'Tier 2 ICP First-Touch', industry: 'Construction, Healthcare', status: 'drafted' },
  { day: 6, date: 'Mar 13', count: 15, type: 'Tier 2 ICP Continued', industry: 'Construction, Healthcare', status: 'drafted' },
  { day: 7, date: 'Mar 14', count: 0, type: 'Weekend', industry: '', status: 'rest' },
  { day: 8, date: 'Mar 15', count: 15, type: 'Re-intro (Agency batch)', industry: 'Agencies', status: 'planned' },
  { day: 9, date: 'Mar 16', count: 15, type: 'Hook emails', industry: 'Nonprofit', status: 'planned' },
  { day: 10, date: 'Mar 17', count: 15, type: 'Tier 2 ICP First-Touch', industry: 'Real Estate', status: 'planned' },
  { day: 11, date: 'Mar 18', count: 16, type: 'Tier 2 ICP First-Touch', industry: 'Real Estate', status: 'planned' },
  { day: 12, date: 'Mar 19', count: 15, type: 'Tier 2 ICP First-Touch', industry: 'Nonprofit', status: 'planned' },
  { day: 13, date: 'Mar 20', count: 15, type: 'Re-intro (Oct 2025)', industry: 'Construction, RE', status: 'planned' },
  { day: 14, date: 'Mar 21', count: 0, type: 'Weekend', industry: '', status: 'rest' },
  { day: 15, date: 'Mar 22', count: 15, type: 'Tier 1 Warm Re-Engage', industry: 'Healthcare', status: 'planned' },
  { day: 16, date: 'Mar 23', count: 15, type: 'Tier 1 Warm Re-Engage', industry: 'Real Estate', status: 'planned' },
  { day: 17, date: 'Mar 24', count: 15, type: 'Tier 3 Cold Ghost Re-intro', industry: 'Construction', status: 'planned' },
  { day: 18, date: 'Mar 25', count: 15, type: 'Tier 2 ICP First-Touch', industry: 'Health/Fitness', status: 'planned' },
  { day: 19, date: 'Mar 26', count: 15, type: 'Hook emails', industry: 'Nonprofit', status: 'planned' },
  { day: 20, date: 'Mar 27', count: 15, type: 'Tier 3 Cold Ghost Re-intro', industry: 'Real Estate', status: 'planned' },
  { day: 21, date: 'Mar 28', count: 0, type: 'Weekend', industry: '', status: 'rest' },
  { day: 22, date: 'Mar 29', count: 15, type: 'Tier 3 Cold Ghost Re-intro', industry: 'Real Estate', status: 'planned' },
  { day: 23, date: 'Mar 30', count: 15, type: 'Hook emails', industry: 'Events/Culture', status: 'planned' },
  { day: 24, date: 'Mar 31', count: 15, type: 'Tier 2 ICP First-Touch', industry: 'Sports/Events', status: 'planned' },
  { day: 25, date: 'Apr 1', count: 15, type: 'Hook emails', industry: 'Tech/SaaS', status: 'planned' },
  { day: 26, date: 'Apr 2', count: 15, type: 'Hook emails', industry: 'Defense, Healthcare', status: 'planned' },
  { day: 27, date: 'Apr 3', count: 15, type: 'Tier 3 Cold Ghost Re-intro', industry: 'Healthcare', status: 'planned' },
  { day: 28, date: 'Apr 4', count: 0, type: 'Weekend', industry: '', status: 'rest' },
  { day: 29, date: 'Apr 5', count: 15, type: 'Hook emails', industry: 'Tech/SaaS', status: 'planned' },
  { day: 30, date: 'Apr 6', count: 15, type: 'Buffer / Review / Q2 Plan', industry: 'All', status: 'planned' },
]

// ─── FALLBACK DATA (used if API is unreachable) ─────────────────────────────
const FALLBACK_PIPELINE = {
  icpContacts: 281,
  offIcpContacts: 431,
  totalContacts: 712,
  statusCounts: { no_response: 706, replied: 4, meeting: 0, closed: 0, dead: 0 },
  icpByIndustry: {
    Construction: { total: 61, no_response: 61, replied: 0 },
    'Real Estate': { total: 61, no_response: 61, replied: 0 },
    Hospitality: { total: 18, no_response: 18, replied: 0 },
    Nonprofit: { total: 87, no_response: 87, replied: 0 },
    Healthcare: { total: 46, no_response: 46, replied: 0 },
    Events: { total: 8, no_response: 8, replied: 0 },
  },
  offIcpByIndustry: {
    'Tech/SaaS': { total: 280 },
    Defense: { total: 8 },
    'Media/Agency': { total: 25 },
    'Research/Energy': { total: 12 },
    Other: { total: 5 },
  },
  batches: {},
  lastUpdated: null,
}

// Industry display config
const INDUSTRY_COLORS = {
  Construction: ORANGE,
  'Real Estate': BLUE,
  Hospitality: YELLOW,
  Nonprofit: GREEN,
  Healthcare: CYAN,
  Events: PURPLE,
}

const INDUSTRY_PRIORITY = {
  Construction: 'TOP',
  'Real Estate': 'HIGH',
  Hospitality: 'GOOD',
  Nonprofit: 'MODERATE',
  Healthcare: 'NICHE',
  Events: 'NICHE',
}

const INDUSTRY_WHY = {
  Construction: 'Target vertical for $3k/month retainers. Highest value in the pipeline.',
  'Real Estate': 'Brokers want listings content and agent recruiting videos. Good for project-based.',
  Hospitality: 'Restaurants, resorts, event venues. Social content is a natural fit. Retainer candidates.',
  Nonprofit: 'Strong story potential, tighter budgets. Documentary-style projects, not retainers.',
  Healthcare: 'Niche. Some are national/government-adjacent. Worth one touch for the right ones.',
  Events: 'Event coverage, recap videos. Project-based with repeat potential.',
}

// ─── UTILITY COMPONENTS ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#fff', large = false }) {
  return (
    <div style={{
      background: '#151515',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: large ? '28px 24px' : '20px 20px',
      flex: '1 1 200px',
      minWidth: 180,
    }}>
      <div style={{
        fontSize: large ? 40 : 32,
        fontWeight: 700,
        color: color,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
      }}>{value}</div>
      <div style={{
        fontSize: 15,
        color: '#F0ECE6',
        marginTop: 6,
        fontWeight: 500,
      }}>{label}</div>
      {sub && (
        <div style={{
          fontSize: 13,
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
        fontWeight: 700,
        color: '#F0ECE6',
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      }}>{children}</h2>
      {sub && (
        <p style={{ fontSize: 15, color: MUTED, marginTop: 6 }}>{sub}</p>
      )}
    </div>
  )
}

function TierBar({ label, count, maxCount, color, sub }) {
  const pct = Math.max((count / maxCount) * 100, 2)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 15, color: '#F0ECE6', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 20, fontWeight: 700, color }}>{count}</span>
      </div>
      <div style={{ background: '#1A1A1A', borderRadius: 6, height: 10, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 6,
          transition: 'width 0.6s ease',
        }} />
      </div>
      {sub && <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{sub}</div>}
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
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 700,
          color: '#020202',
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
          <span style={{ fontSize: 18, fontWeight: 600, color: '#F0ECE6' }}>{label}</span>
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: color,
            background: `${color}18`,
            padding: '2px 10px',
            borderRadius: 20,
          }}>{timing}</span>
        </div>
        <p style={{ fontSize: 15, color: MUTED, marginTop: 6, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const configs = {
    done: { bg: `${GREEN}20`, color: GREEN, label: 'SENT' },
    today: { bg: `${ORANGE}20`, color: ORANGE, label: 'TODAY' },
    drafted: { bg: `${YELLOW}20`, color: YELLOW, label: 'DRAFTED' },
    planned: { bg: 'rgba(255,255,255,0.06)', color: MUTED, label: 'PLANNED' },
    rest: { bg: 'transparent', color: '#333', label: 'REST' },
  }
  const cfg = configs[status] || configs.planned
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.05em',
      color: cfg.color,
      background: cfg.bg,
      padding: '3px 10px',
      borderRadius: 20,
      whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  )
}

function LiveBadge({ isLive }) {
  if (!isLive) return null
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.05em',
      color: GREEN,
      background: `${GREEN}18`,
      padding: '3px 10px',
      borderRadius: 20,
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: GREEN,
        display: 'inline-block',
      }} />
      LIVE DATA
    </span>
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
  const [pipeline, setPipeline] = useState(FALLBACK_PIPELINE)
  const [isLive, setIsLive] = useState(false)
  const [dataError, setDataError] = useState(null)
  const isMobile = useIsMobile()

  // Fetch live data from API
  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('/api/outreach-data')
        if (!res.ok) throw new Error(`API returned ${res.status}`)
        const data = await res.json()
        if (!cancelled && data.icpContacts != null) {
          setPipeline(data)
          setIsLive(true)
        }
      } catch (err) {
        console.warn('Outreach API unavailable, using fallback data:', err.message)
        setDataError(err.message)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'schedule', label: '30-Day Schedule' },
    { id: 'pipeline', label: 'Pipeline Tiers' },
    { id: 'verticals', label: 'By Vertical' },
  ]

  const emailsSent = useMemo(() => {
    return THIRTY_DAY_SCHEDULE
      .filter(d => d.status === 'done')
      .reduce((sum, d) => sum + d.count, 0)
  }, [])

  const emailsRemaining = useMemo(() => {
    return THIRTY_DAY_SCHEDULE
      .filter(d => d.status !== 'done' && d.status !== 'rest')
      .reduce((sum, d) => sum + d.count, 0)
  }, [])

  // Build industry list from live data
  const icpIndustries = useMemo(() => {
    if (!pipeline.icpByIndustry) return []
    return Object.entries(pipeline.icpByIndustry)
      .map(([name, data]) => ({
        name,
        total: data.total,
        replied: data.replied || 0,
        no_response: data.no_response || 0,
        color: INDUSTRY_COLORS[name] || MUTED,
        priority: INDUSTRY_PRIORITY[name] || 'OTHER',
        why: INDUSTRY_WHY[name] || '',
      }))
      .sort((a, b) => b.total - a.total)
  }, [pipeline])

  const offIcpTotal = pipeline.offIcpContacts || 0
  const icpTotal = pipeline.icpContacts || 0
  const repliesCount = pipeline.statusCounts?.replied || 0
  const replyRate = pipeline.totalContacts > 0
    ? ((repliesCount / pipeline.totalContacts) * 100).toFixed(1) + '%'
    : '0%'

  // Format last updated
  const lastUpdatedStr = useMemo(() => {
    if (!pipeline.lastUpdated) return 'Static data'
    const d = new Date(pipeline.lastUpdated)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }, [pipeline.lastUpdated])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020202',
      color: '#F0ECE6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
    }}>
      {/* ─── HEADER ────────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: ORANGE, letterSpacing: '0.1em' }}>AOM</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>Outreach Plan</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED }}>
          <LiveBadge isLive={isLive} />
          <span>Jacob's Pipeline</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span>{isLive ? `Updated ${lastUpdatedStr}` : 'Static data'}</span>
        </div>
      </header>

      {/* ─── TAB BAR ───────────────────────────────────────────────────── */}
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
        display: 'flex',
        gap: 0,
        overflowX: 'auto',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${ORANGE}` : '2px solid transparent',
              color: activeTab === tab.id ? '#F0ECE6' : MUTED,
              fontSize: 15,
              fontWeight: 500,
              padding: '14px 20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ─── CONTENT ───────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Row */}
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <StatCard
                  label="ICP Pipeline"
                  value={icpTotal}
                  color={ORANGE}
                  large
                  sub={`${offIcpTotal} off-ICP excluded`}
                />
                <StatCard label="Emails Sent" value={emailsSent} color={GREEN} large sub="Days 1-3 complete" />
                <StatCard label="Remaining (30-day)" value={emailsRemaining} color={YELLOW} large sub={`${THIRTY_DAY_SCHEDULE.filter(d => d.status !== 'done' && d.status !== 'rest').length} send days left`} />
                <StatCard label="Replies" value={repliesCount} color={BLUE} large sub={`${replyRate} reply rate`} />
              </div>
            </div>

            {/* ICP Breakdown Mini */}
            <div style={{
              marginTop: 16,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}>
              {icpIndustries.map(ind => (
                <div key={ind.name} style={{
                  background: '#151515',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  borderLeft: `3px solid ${ind.color}`,
                }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: ind.color }}>{ind.total}</span>
                  <span style={{ fontSize: 13, color: MUTED }}>{ind.name}</span>
                </div>
              ))}
              <div style={{
                background: '#0e0e0e',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 8,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                opacity: 0.6,
              }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: MUTED }}>{offIcpTotal}</span>
                <span style={{ fontSize: 13, color: '#555' }}>Off-ICP</span>
              </div>
            </div>

            {/* Today's Status */}
            <SectionTitle sub="What's going out right now">Today: Mar 11 (Day 4)</SectionTitle>
            <div style={{
              background: '#151515',
              border: `1px solid ${ORANGE}30`,
              borderRadius: 12,
              padding: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: ORANGE }}>19 emails</span>
                <StatusBadge status="today" />
              </div>
              <p style={{ fontSize: 16, color: '#F0ECE6', lineHeight: 1.5, marginBottom: 8 }}>
                Tier 1 ICP Re-Engagement. Healthcare + Real Estate contacts who opened 330+ days ago but never replied.
              </p>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
                These are not bumps. They are re-intros with a new angle. Healthcare gets the Included Health reference. Real estate gets the Ambition Mechanical case study.
              </p>
              <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 14, color: CYAN }}>7 Healthcare</div>
                <div style={{ fontSize: 14, color: BLUE }}>5 Real Estate / Construction</div>
                <div style={{ fontSize: 14, color: YELLOW }}>7 Construction (Tier 2 new)</div>
              </div>
            </div>

            {/* Tomorrow + Day After */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
              <div style={{
                flex: '1 1 300px',
                background: '#151515',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: YELLOW }}>17 emails</span>
                  <StatusBadge status="drafted" />
                </div>
                <div style={{ fontSize: 15, color: '#F0ECE6', fontWeight: 500 }}>Mar 12: Tier 2 ICP First-Touch</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Construction + Healthcare. New contacts, never emailed. Ambition + IH references.</div>
              </div>
              <div style={{
                flex: '1 1 300px',
                background: '#151515',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: YELLOW }}>15 emails</span>
                  <StatusBadge status="drafted" />
                </div>
                <div style={{ fontSize: 15, color: '#F0ECE6', fontWeight: 500 }}>Mar 13: Tier 2 ICP Continued</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>More construction + healthcare. Same approach, fresh contacts.</div>
              </div>
            </div>

            {/* Multi-Touch Flow */}
            <SectionTitle sub="Each prospect gets up to 4 touches over 14+ days">Multi-Touch Sequence</SectionTitle>
            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
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

            {/* Status Breakdown */}
            <SectionTitle sub="Current status across all contacts">Contact Status</SectionTitle>
            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '28px 24px',
            }}>
              {[
                { label: 'No Response', count: pipeline.statusCounts?.no_response || 0, color: MUTED },
                { label: 'Replied', count: pipeline.statusCounts?.replied || 0, color: GREEN },
                { label: 'Meeting Scheduled', count: pipeline.statusCounts?.meeting || 0, color: BLUE },
                { label: 'Closed (Client)', count: pipeline.statusCounts?.closed || 0, color: ORANGE },
                { label: 'Dead / DNC', count: pipeline.statusCounts?.dead || 0, color: RED },
              ].filter(s => s.count > 0 || s.label === 'Replied' || s.label === 'Meeting Scheduled').map(s => (
                <TierBar
                  key={s.label}
                  label={s.label}
                  count={s.count}
                  maxCount={pipeline.totalContacts || 1}
                  color={s.color}
                />
              ))}
            </div>
          </>
        )}

        {/* ═══ 30-DAY SCHEDULE TAB ═══ */}
        {activeTab === 'schedule' && (
          <>
            <SectionTitle sub={`385 emails over 30 days. Weekends off. ~15 per send day.`}>
              30-Day Outreach Calendar
            </SectionTitle>

            {/* Progress bar */}
            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '20px 24px',
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#F0ECE6' }}>Progress</span>
                <span style={{ fontSize: 14, color: ORANGE, fontWeight: 600 }}>Day 4 of 30</span>
              </div>
              <div style={{ background: '#1A1A1A', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${(4 / 30) * 100}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${ORANGE}, ${YELLOW})`,
                  borderRadius: 6,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: MUTED }}>
                <span>{emailsSent} sent</span>
                <span>{emailsRemaining} remaining</span>
              </div>
            </div>

            {/* Schedule grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {THIRTY_DAY_SCHEDULE.map((day) => (
                <div key={day.day} style={{
                  background: day.status === 'today' ? '#1a1510' : day.status === 'rest' ? '#0a0a0a' : '#151515',
                  border: day.status === 'today' ? `1px solid ${ORANGE}40` : '1px solid rgba(255,255,255,0.04)',
                  borderRadius: 8,
                  padding: isMobile ? '14px 16px' : '14px 20px',
                  display: isMobile ? 'flex' : 'grid',
                  flexDirection: isMobile ? 'column' : undefined,
                  gridTemplateColumns: isMobile ? undefined : '50px 70px 60px 1fr 200px 90px',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  gap: isMobile ? 6 : 12,
                  opacity: day.status === 'rest' ? 0.4 : 1,
                  fontSize: 14,
                }}>
                  {isMobile ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                          <span style={{ color: MUTED, fontWeight: 500 }}>D{day.day}</span>
                          <span style={{ color: '#F0ECE6', fontWeight: 500 }}>{day.date}</span>
                          <span style={{ fontWeight: 700, color: day.count > 0 ? ORANGE : '#333' }}>
                            {day.count > 0 ? day.count : '--'}
                          </span>
                        </div>
                        <StatusBadge status={day.status} />
                      </div>
                      <div style={{ color: '#F0ECE6', fontSize: 13 }}>{day.type}</div>
                      {day.industry && <div style={{ color: MUTED, fontSize: 12 }}>{day.industry}</div>}
                    </>
                  ) : (
                    <>
                      <span style={{ color: MUTED, fontWeight: 500 }}>D{day.day}</span>
                      <span style={{ color: '#F0ECE6', fontWeight: 500 }}>{day.date}</span>
                      <span style={{ fontWeight: 700, color: day.count > 0 ? ORANGE : '#333' }}>
                        {day.count > 0 ? day.count : '--'}
                      </span>
                      <span style={{ color: '#F0ECE6' }}>{day.type}</span>
                      <span style={{ color: MUTED, fontSize: 13 }}>{day.industry}</span>
                      <div style={{ textAlign: 'right' }}><StatusBadge status={day.status} /></div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Schedule legend */}
            <div style={{
              marginTop: 24,
              display: 'flex',
              gap: 20,
              flexWrap: 'wrap',
              fontSize: 13,
              color: MUTED,
            }}>
              <span><span style={{ color: GREEN }}>SENT</span> = emails delivered</span>
              <span><span style={{ color: ORANGE }}>TODAY</span> = going out now</span>
              <span><span style={{ color: YELLOW }}>DRAFTED</span> = written, pending approval</span>
              <span><span style={{ color: MUTED }}>PLANNED</span> = not yet drafted</span>
            </div>
          </>
        )}

        {/* ═══ PIPELINE TIERS TAB ═══ */}
        {activeTab === 'pipeline' && (
          <>
            <SectionTitle sub="ICP contacts by industry with status breakdown">ICP Pipeline Breakdown</SectionTitle>

            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '28px 24px',
            }}>
              {icpIndustries.map(ind => (
                <TierBar
                  key={ind.name}
                  label={ind.name}
                  count={ind.total}
                  maxCount={Math.max(...icpIndustries.map(i => i.total), 1)}
                  color={ind.color}
                  sub={ind.replied > 0 ? `${ind.replied} replied` : `${ind.no_response} awaiting response`}
                />
              ))}

              {/* Off-ICP summary */}
              <div style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontSize: 15, color: MUTED, fontWeight: 500 }}>Off-ICP (excluded from pipeline count)</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#444' }}>{offIcpTotal}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#555' }}>
                  {pipeline.offIcpByIndustry && Object.entries(pipeline.offIcpByIndustry).map(([name, data]) => (
                    <span key={name}>{name}: {data.total}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* ICP Priority */}
            <SectionTitle sub="Where to focus for the $45k/month retainer goal">ICP Priority Stack</SectionTitle>
            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '24px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {icpIndustries
                  .filter(ind => INDUSTRY_WHY[ind.name])
                  .map((ind, idx) => (
                  <div key={ind.name} style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                    padding: '12px 0',
                    borderBottom: idx < icpIndustries.filter(i => INDUSTRY_WHY[i.name]).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: `2px solid ${ind.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      color: ind.color,
                      flexShrink: 0,
                    }}>{idx + 1}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6' }}>{ind.name}</span>
                        <span style={{ fontSize: 20, fontWeight: 700, color: ind.color }}>{ind.total}</span>
                        <span style={{ fontSize: 12, color: MUTED }}>contacts</span>
                      </div>
                      <div style={{ fontSize: 14, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{ind.why}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══ BY VERTICAL TAB ═══ */}
        {activeTab === 'verticals' && (
          <>
            <SectionTitle sub="ICP verticals with live contact counts">Industry Breakdown</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {icpIndustries.map((ind) => (
                <div key={ind.name} style={{
                  background: '#151515',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '24px',
                  borderLeft: `3px solid ${ind.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#F0ECE6' }}>{ind.name}</div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: ind.color,
                        background: `${ind.color}18`,
                        padding: '2px 8px',
                        borderRadius: 10,
                        marginTop: 4,
                        display: 'inline-block',
                      }}>{ind.priority} PRIORITY</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: ind.color }}>{ind.total}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ind.no_response > 0 && (
                      <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 8,
                        padding: '8px 14px',
                        flex: '1 1 auto',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: MUTED }}>{ind.no_response}</div>
                        <div style={{ fontSize: 11, color: MUTED }}>No Reply</div>
                      </div>
                    )}
                    {ind.replied > 0 && (
                      <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 8,
                        padding: '8px 14px',
                        flex: '1 1 auto',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>{ind.replied}</div>
                        <div style={{ fontSize: 11, color: MUTED }}>Replied</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Off-ICP Card */}
              <div style={{
                background: '#0e0e0e',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 12,
                padding: '24px',
                borderLeft: '3px solid #333',
                opacity: 0.7,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: MUTED }}>Off-ICP</div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#555',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '2px 8px',
                      borderRadius: 10,
                      marginTop: 4,
                      display: 'inline-block',
                    }}>LOW PRIORITY</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#444' }}>{offIcpTotal}</div>
                </div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                  {pipeline.offIcpByIndustry && Object.entries(pipeline.offIcpByIndustry).map(([name, data]) => (
                    <span key={name} style={{ marginRight: 12 }}>{name} ({data.total})</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>
                  Not counted in ICP pipeline. Finance, Insurance, Auto, IT, Defense, etc.
                </div>
              </div>
            </div>

            {/* Apollo Credits Note */}
            <div style={{
              marginTop: 32,
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '20px 24px',
            }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6', marginBottom: 8 }}>Apollo Status</div>
              <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
                All 37 Apollo-enriched contacts have been emailed. Zero unused enrichments remaining.
                The 675-contact CSV is a separate export used for pipeline planning. Next enrichment run
                requires new credits. Budget: 100 credits/day.
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
        fontSize: 12,
        color: '#333',
      }}>
        AOM Internal. Not public.
      </footer>
    </div>
  )
}
