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

// ─── PIPELINE DATA ────────────────────────────────────────────────────────────
const PIPELINE_STATS = {
  totalContacts: 712,
  apolloExport: 675,
  logOnlyBatch: 37,
  tier1: { total: 114, icp: 23, offIcp: 91, label: 'Warm (opened, no reply)' },
  tier2Icp: { total: 160, label: 'ICP (uncontacted, on-target)' },
  tier2OffIcp: { total: 190, label: 'Off-ICP (uncontacted, low priority)' },
  tier3: { total: 198, icp: 48, offIcp: 150, label: 'Cold Ghost (sent, never opened)' },
  skipped: { total: 13, label: 'Bounced / Replied / DNC' },
  feb28Batch: { total: 37, label: 'Feb 28 log-only check-ins' },
}

const INDUSTRY_BREAKDOWN = [
  { name: 'Construction', tier2: 50, tier3: 11, tier1: 0, color: ORANGE, priority: 'TOP' },
  { name: 'Real Estate', tier2: 31, tier3: 30, tier1: 13, color: BLUE, priority: 'HIGH' },
  { name: 'Hospitality', tier2: 18, tier3: 0, tier1: 0, color: YELLOW, priority: 'GOOD' },
  { name: 'Nonprofit', tier2: 27, tier3: 0, tier1: 0, color: GREEN, priority: 'MODERATE' },
  { name: 'Healthcare', tier2: 11, tier3: 7, tier1: 10, color: CYAN, priority: 'NICHE' },
  { name: 'Off-ICP (Finance, Insurance, Auto, IT)', tier2: 190, tier3: 150, tier1: 91, color: MUTED, priority: 'LOW' },
]

const CURRENT_STATS = {
  emailsSentToday: 19,
  emailsDraftedTomorrow: 17,
  emailsDraftedDay3: 15,
  totalPipeline30Day: 385,
  repliesReceived: 2,
  replyRate: '0.7%',
  daysIntoPlan: 4,
}

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

const BATCH_HISTORY = [
  { date: 'Oct 2025', count: 6, status: 're-intro territory', replies: 2, note: 'Big Marble + Keep It Cut replied' },
  { date: 'Feb 18-19', count: 140, status: 'hook window (35+ days)', replies: 0, note: 'Agencies, Defense, Nonprofit, Tech, RE, Healthcare, Events' },
  { date: 'Feb 22-23', count: 90, status: 'nudge window (15+ days)', replies: 2, note: 'Elijah Salazar replied. Paige Soucie DNC.' },
  { date: 'Feb 28', count: 37, status: 'check-in window (10 days)', replies: 0, note: 'Apollo pipeline run. All enriched + emailed.' },
  { date: 'Mar 11-13', count: 51, status: 'sending now', replies: 0, note: 'Tier 1 re-engage + Tier 2 ICP first-touch' },
]

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
          <span>Jacob's Pipeline</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span>Updated Mar 10, 2026</span>
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
                <StatCard label="Total Pipeline" value={PIPELINE_STATS.totalContacts} color={ORANGE} large sub="675 Apollo + 37 log-only" />
                <StatCard label="Emails Sent" value={emailsSent} color={GREEN} large sub="Days 1-3 complete" />
                <StatCard label="Remaining (30-day)" value={emailsRemaining} color={YELLOW} large sub={`${THIRTY_DAY_SCHEDULE.filter(d => d.status !== 'done' && d.status !== 'rest').length} send days left`} />
                <StatCard label="Replies" value={CURRENT_STATS.repliesReceived} color={BLUE} large sub={`${CURRENT_STATS.replyRate} reply rate (historical)`} />
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

            {/* Batch History */}
            <SectionTitle sub="Everything sent so far, grouped by batch">Outreach History</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BATCH_HISTORY.map((batch, i) => (
                <div key={i} style={{
                  background: '#151515',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6' }}>{batch.date}</div>
                    <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{batch.note}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: ORANGE }}>{batch.count}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>contacts</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: batch.replies > 0 ? GREEN : '#333' }}>{batch.replies}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>replies</div>
                    </div>
                    <span style={{
                      fontSize: 12,
                      color: batch.status === 'sending now' ? ORANGE : MUTED,
                      fontWeight: 500,
                      background: batch.status === 'sending now' ? `${ORANGE}18` : 'rgba(255,255,255,0.04)',
                      padding: '4px 12px',
                      borderRadius: 20,
                      whiteSpace: 'nowrap',
                    }}>{batch.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ 30-DAY SCHEDULE TAB ═══ */}
        {activeTab === 'schedule' && (
          <>
            <SectionTitle sub={`${CURRENT_STATS.totalPipeline30Day} emails over 30 days. Weekends off. ~15 per send day.`}>
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
                <span style={{ fontSize: 14, color: ORANGE, fontWeight: 600 }}>Day {CURRENT_STATS.daysIntoPlan} of 30</span>
              </div>
              <div style={{ background: '#1A1A1A', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${(CURRENT_STATS.daysIntoPlan / 30) * 100}%`,
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
            <SectionTitle sub="Contacts segmented by engagement level and ICP fit">Pipeline Breakdown</SectionTitle>

            <div style={{
              background: '#151515',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '28px 24px',
            }}>
              <TierBar
                label="Tier 1: Warm (opened, no reply)"
                count={PIPELINE_STATS.tier1.total}
                maxCount={200}
                color={ORANGE}
                sub={`${PIPELINE_STATS.tier1.icp} ICP (healthcare + real estate)  |  ${PIPELINE_STATS.tier1.offIcp} off-ICP`}
              />
              <TierBar
                label="Tier 2 ICP: Uncontacted, On-Target"
                count={PIPELINE_STATS.tier2Icp.total}
                maxCount={200}
                color={GREEN}
                sub="Construction, Real Estate, Hospitality, Nonprofit, Healthcare"
              />
              <TierBar
                label="Tier 2 Off-ICP: Uncontacted, Low Priority"
                count={PIPELINE_STATS.tier2OffIcp.total}
                maxCount={200}
                color={MUTED}
                sub="Financial services, Insurance, Automotive, IT/SaaS"
              />
              <TierBar
                label="Tier 3: Cold Ghost (sent, never opened)"
                count={PIPELINE_STATS.tier3.total}
                maxCount={200}
                color={RED}
                sub={`${PIPELINE_STATS.tier3.icp} ICP  |  ${PIPELINE_STATS.tier3.offIcp} off-ICP  |  All 290+ days old`}
              />
              <TierBar
                label="Feb 28 Log Batch (check-in window)"
                count={PIPELINE_STATS.feb28Batch.total}
                maxCount={200}
                color={BLUE}
                sub="Apollo pipeline run. All enriched + emailed. 10 days old."
              />
              <TierBar
                label="Skipped (bounced / replied / DNC)"
                count={PIPELINE_STATS.skipped.total}
                maxCount={200}
                color="#333"
                sub="Includes Paige Soucie (DNC) and bounced emails"
              />
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
                {[
                  { rank: 1, vertical: 'Construction', why: 'Target vertical for $3k/month retainers. 50 fresh contacts + 11 re-intros. Most valuable in the entire export.', color: ORANGE },
                  { rank: 2, vertical: 'Real Estate', why: '31 fresh + 30 re-intros. Brokers want listings content and agent recruiting videos. Good for project-based.', color: BLUE },
                  { rank: 3, vertical: 'Hospitality', why: '18 fresh contacts. Restaurants, resorts, event venues. Social content is a natural fit. Retainer candidates.', color: YELLOW },
                  { rank: 4, vertical: 'Nonprofit', why: '27 fresh contacts. Strong story potential, tighter budgets. Documentary-style projects, not retainers.', color: GREEN },
                  { rank: 5, vertical: 'Healthcare', why: '11 fresh + 7 re-intros. Niche. Some are national/government-adjacent. Worth one touch for the right ones.', color: CYAN },
                ].map(item => (
                  <div key={item.rank} style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                    padding: '12px 0',
                    borderBottom: item.rank < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: `2px solid ${item.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      color: item.color,
                      flexShrink: 0,
                    }}>{item.rank}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#F0ECE6' }}>{item.vertical}</div>
                      <div style={{ fontSize: 14, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{item.why}</div>
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
            <SectionTitle sub="Contact counts by industry across all tiers">Industry Breakdown</SectionTitle>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {INDUSTRY_BREAKDOWN.map((ind) => {
                const total = ind.tier2 + ind.tier3 + ind.tier1
                return (
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
                      <div style={{ fontSize: 28, fontWeight: 700, color: ind.color }}>{total}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {ind.tier2 > 0 && (
                        <div style={{
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 8,
                          padding: '8px 14px',
                          flex: '1 1 auto',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>{ind.tier2}</div>
                          <div style={{ fontSize: 11, color: MUTED }}>Fresh</div>
                        </div>
                      )}
                      {ind.tier1 > 0 && (
                        <div style={{
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 8,
                          padding: '8px 14px',
                          flex: '1 1 auto',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: ORANGE }}>{ind.tier1}</div>
                          <div style={{ fontSize: 11, color: MUTED }}>Warm</div>
                        </div>
                      )}
                      {ind.tier3 > 0 && (
                        <div style={{
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 8,
                          padding: '8px 14px',
                          flex: '1 1 auto',
                          textAlign: 'center',
                        }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: RED }}>{ind.tier3}</div>
                          <div style={{ fontSize: 11, color: MUTED }}>Ghost</div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
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
