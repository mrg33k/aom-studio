// AOM Construction Outreach Tracker
// Route: /outreach — soft password gate (AOM2026, remembered in localStorage)
// Backend: Supabase outreach_leads + outreach_touchpoints
// Brand: AOM light editorial (unified w/ Call Mode 2026-08-10) — ivory ground #F7F6F3,
//   surface #FFFFFF, secondary #F1EFEA, ink #17170F, body #43423A, muted #77746A,
//   hairline #E4E2DB / control #D3D0C7, single bronze accent #B58A38 (text #8A6828),
//   square corners, flat, 1px hairlines. Bricolage Grotesque display + Inter body.

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Constants ───────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mcngatprgluexjjcqpkp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbmdhdHByZ2x1ZXhqamNxcGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjU3MTUsImV4cCI6MjA4OTQwMTcxNX0.Rgn57thbT_kZf-PEvcS1ix4l8CTO1fwz0I2t589hSd8'
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const PASSWORD = 'AOM2026'
const REPS = ['Courtney', 'Patrik', 'Ash', 'James']

// ─── Rep Portal: session storage helpers ────────────────────────────────────
const STORAGE_REP_SESSION    = 'outreach_rep_session'
const STORAGE_REP_ONBOARDING = 'outreach_rep_onboarding_'

function getRepSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_REP_SESSION)) } catch { return null }
}
function saveRepSession(data) {
  localStorage.setItem(STORAGE_REP_SESSION, JSON.stringify(data))
}
function clearRepSession() {
  localStorage.removeItem(STORAGE_REP_SESSION)
  localStorage.removeItem('outreach_unlocked')
}
function repOnboardingDone(username) {
  return localStorage.getItem(STORAGE_REP_ONBOARDING + username) === '1'
}
function markOnboardingDone(username) {
  localStorage.setItem(STORAGE_REP_ONBOARDING + username, '1')
}
const STATUSES = [
  'Not contacted',
  'Called (no answer)',
  'Left VM',
  'Spoke',
  'Meeting booked',
  'Proposal sent',
  'Won',
  'Lost / Not a fit',
]
const STATUS_SHORT = {
  'Not contacted': 'Uncontacted',
  'Called (no answer)': 'No answer',
  'Left VM': 'Left VM',
  'Spoke': 'Spoke',
  'Meeting booked': 'Booked',
  'Proposal sent': 'Proposal',
  'Won': 'Won',
  'Lost / Not a fit': 'Lost',
}
const CHANNELS = ['call', 'text', 'email', 'walk-in']
const GOAL = 12
const MAPS_ORIGIN = '1128 W Dunbar Dr, Tempe, AZ'
const DAY_LABELS = {
  1: 'Day 1 — Tempe + Chandler',
  2: 'Day 2 — Gilbert / San Tan Valley / Mesa',
  3: 'Day 3 — Phoenix Central + South',
  4: 'Day 4 — Phoenix North + Scottsdale',
  5: 'Day 5 — Glendale + Peoria',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// Website warmth. A lead that HAS a site (even a bad/dated/broken one) is warmer
// than one with no site at all: they already believe in having a web presence,
// so there's less convincing. "No website" leads still score a high NEED because
// the score counts the GAP, not whether they'd fill it — those are the cold
// false-positives. This splits the two off the site_issue text so warm leads
// can float to the top of the call list.
const NO_SITE_RE = /no website|no real website|no web presence|zero web presence|no online presence|no website found|no website of any kind|almost no online presence|zero online footprint|no web presence found|invisible online|only third-party|directory listings only|only directory/i
function hasWebsite(lead) {
  const s = (lead && lead.site_issue) || ''
  if (!s.trim()) return true // unknown → don't demote
  return !NO_SITE_RE.test(s)
}

// Canonical call order: warmest first (has a site), then by NEED within each
// bucket, then company. This is what changed on 2026-07-21 so "bad website"
// ranks above "no website" — the top of the list is no longer the cold 7s.
function warmthCompare(a, b) {
  const wa = hasWebsite(a) ? 1 : 0
  const wb = hasWebsite(b) ? 1 : 0
  if (wa !== wb) return wb - wa                       // has-site first
  const na = Number(a.need_score) || 0, nb = Number(b.need_score) || 0
  if (na !== nb) return nb - na                       // higher NEED first
  return (a.company || '').localeCompare(b.company || '')
}

function needScoreColor(score) {
  const s = Number(score) || 0
  if (s >= 7) return '#D95050' // red
  if (s >= 6) return '#D07830' // orange
  if (s >= 5) return '#B58A38' // bronze
  if (s >= 1) return '#5E7A5E' // muted green
  return '#8B8880'
}

function needScoreTextColor(score) {
  const s = Number(score) || 0
  if (s >= 5) return '#17170F' // ink text on warm (orange/bronze) badge
  return '#F6F6F4'              // ivory on green / neutral fill
}

function statusBadgeStyle(status) {
  // Light-theme status chips — soft tints on ivory, all text clears AA
  const map = {
    'Won':               { bg: '#E7F0E7', color: '#2E5A2E', border: '#C5DCC5' },
    'Meeting booked':    { bg: '#E4EEF3', color: '#2A5A72', border: '#C3DBE6' },
    'Proposal sent':     { bg: '#EDE7F3', color: '#5A3E72', border: '#D5C6E2' },
    'Spoke':             { bg: '#EAF1EA', color: '#3E5E3E', border: '#CBDDCB' },
    'Left VM':           { bg: '#FBF4E4', color: '#8A6828', border: '#E9D9AE' },
    'Called (no answer)':{ bg: '#F4EEE2', color: '#7A5A28', border: '#E2D3B0' },
    'Lost / Not a fit':  { bg: '#F1EFEA', color: '#77746A', border: '#D3D0C7' },
  }
  const m = map[status] || { bg: '#FFFFFF', color: '#77746A', border: '#D3D0C7' }
  return {
    background: m.bg,
    color: m.color,
    border: `1px solid ${m.border}`,
  }
}

// Build a LinkedIn people-search URL — one tap lands on the person (or company),
// no guessed profile URLs that could point at the wrong John Smith
function buildLinkedInURL(lead) {
  const parts = lead.contact_name
    ? [lead.contact_name, lead.company]
    : [lead.company, lead.city, 'Arizona']
  const kw = parts.filter(Boolean).join(' ')
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(kw)}`
}

// Returns true only when a real confirmed profile URL is stored (not a search URL)
function hasRealLinkedIn(lead) {
  return !!(lead.linkedin && (lead.linkedin.includes('/in/') || lead.linkedin.includes('/company/')))
}

// Extract instagram handle from a URL or @handle string
function extractInstagramHandle(val) {
  if (!val) return null
  // Strip URL: https://www.instagram.com/handle/ → handle
  const m = val.match(/instagram\.com\/([^/?#\s]+)/i)
  if (m) return m[1].replace(/\/$/, '')
  // Strip @ prefix and whitespace
  const clean = val.replace(/^@/, '').trim()
  return clean || null
}

// Returns true when a real instagram handle or URL is stored
function hasRealInstagram(lead) {
  return !!(lead.instagram && extractInstagramHandle(lead.instagram))
}

// Build the Instagram profile URL (or a Google Images fallback search)
function buildInstagramURL(lead) {
  const handle = lead.instagram ? extractInstagramHandle(lead.instagram) : null
  if (handle) return `https://www.instagram.com/${handle}/`
  const kw = [lead.company, lead.city, 'Arizona', 'construction site work'].filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(kw)}&tbm=isch`
}

// Strip https://www. from a URL and return the bare domain (e.g. "hinkleci.com")
function cleanDomain(url) {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  }
}

// Build a Google Maps multi-stop directions URL for a group of leads
function buildMapsURL(leads) {
  const addrs = leads
    .filter(l => l.street_address && l.city)
    .map(l => encodeURIComponent(`${l.street_address}, ${l.city}, AZ`))
  if (!addrs.length) return null
  const origin = encodeURIComponent(MAPS_ORIGIN)
  // Use slash-path form: /dir/origin/stop1/stop2/.../dest
  return `https://www.google.com/maps/dir/${origin}/${addrs.join('/')}`
}

// ─── Call Mode — Outcome to status mapping ──────────────────────────────────
const CM_OUTCOME_STATUS = {
  'No answer': 'Called (no answer)',
  'Left VM':   'Left VM',
  'Spoke':     'Spoke',
  'Booked':    'Meeting booked',
  'Not a fit': 'Lost / Not a fit',
  'Sent email': 'Spoke',
}

// ─── Call Mode ────────────────────────────────────────────────────────────────
function CallMode({ leads, updateLead, repSession, onCallLogged }) {
  const [idx, setIdx]             = useState(0)
  const [noteInput, setNoteInput] = useState('')
  const [toastText, setToastText] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [loggedIds, setLoggedIds] = useState(() => new Set())
  const [siteState, setSiteState] = useState({}) // {leadId: 'loading'|'loaded'|'dead'}
  const toastTimer   = useRef(null)
  const logRef       = useRef(null)

  const lead = leads[Math.min(idx, leads.length - 1)]

  // Keep logRef in sync so the keyboard handler always has the latest closure
  const logOutcome = async (outcome) => {
    if (!lead) return
    const isSkip = outcome === 'Skip'
    if (!isSkip) {
      const today = todayStr()
      const statusVal = CM_OUTCOME_STATUS[outcome] || outcome
      await updateLead(lead.id, 'status', statusVal)
      await updateLead(lead.id, 'last_touch', today)
      if (noteInput.trim()) {
        const existing = lead.notes || ''
        const appended = existing
          ? `${existing}\n${today} — ${noteInput.trim()}`
          : `${today} — ${noteInput.trim()}`
        await updateLead(lead.id, 'notes', appended)
      }
      await sb.from('outreach_touchpoints').insert([{
        lead_id: lead.id,
        date: today,
        channel: outcome === 'Sent email' ? 'email' : 'call',
        note: noteInput.trim() || outcome,
        ...(repSession ? { rep_username: repSession.username } : {}),
      }])
      onCallLogged?.()
      clearTimeout(toastTimer.current)
      // Every logged call gets a payoff line, not a database receipt — the job
      // has to feel light or the reps stop dialing
      const TOAST_LINES = {
        'Booked':     "BOOKED — that's the whole job. Patrik takes it from here.",
        'No answer':  'No answer. Costs you nothing — next.',
        'Left VM':    'Voicemail left. Seed planted.',
        'Spoke':      "A real conversation — that's the hard part done.",
        'Not a fit':  'Not a fit. Their loss — next lead.',
        'Sent email': "Email away. Ball's in their court.",
      }
      setToastText(`${lead.company} — ${TOAST_LINES[outcome] || outcome}${noteInput.trim() ? ' · note saved' : ''}`)
      toastTimer.current = setTimeout(() => setToastText(''), 2200)
    }
    const newLogged = new Set(loggedIds)
    if (!isSkip) newLogged.add(lead.id)
    setLoggedIds(newLogged)
    setNoteInput('')
    setSheetOpen(false)
    // Advance: next unlogged forward, then wrap
    const nextFwd = leads.findIndex((l, n) => n > idx && !newLogged.has(l.id))
    const nextAny = leads.findIndex((l) => !newLogged.has(l.id))
    const nextIdx = nextFwd !== -1 ? nextFwd : (nextAny !== -1 ? nextAny : idx)
    setIdx(nextIdx)
    setTimeout(() => window.scrollTo({ top: 0 }), 0)
  }
  logRef.current = logOutcome

  // Keyboard shortcuts — 1-5 for outcomes, space/enter for next
  useEffect(() => {
    const OUTCOMES = ['No answer', 'Left VM', 'Spoke', 'Booked', 'Not a fit', 'Sent email']
    const handler = (e) => {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key >= '1' && e.key <= '6') {
        e.preventDefault()
        logRef.current && logRef.current(OUTCOMES[parseInt(e.key) - 1])
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        logRef.current && logRef.current('Skip')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Reset site state when lead changes
  useEffect(() => {
    if (!lead) return
    if (!siteState[lead.id]) {
      setSiteState(prev => ({ ...prev, [lead.id]: 'loading' }))
    }
  }, [lead && lead.id])

  if (!leads.length) {
    return (
      <div style={{ padding: '3rem 1.5rem', color: '#77746A', textAlign: 'center', background: '#F7F6F3', minHeight: '60vh', fontFamily: 'Inter,sans-serif' }}>
        No leads match the current filters. Adjust filters above and try Call Mode again.
      </div>
    )
  }
  if (!lead) return null

  const phone      = lead.owner_phone || lead.phone || ''
  const telHref    = phone ? `tel:${phone.replace(/\D/g, '')}` : null
  const phoneLabel = lead.owner_phone ? lead.owner_phone : lead.phone || 'No phone'
  const phoneNote  = lead.owner_phone ? 'Tap to dial · owner cell' : lead.phone ? 'Tap to dial · office line' : ''
  const domain     = cleanDomain(lead.website)
  // iframes never fire onError for refused connections, so a dead site renders
  // as a blank frame — trust the audit text first, iframe events as fallback
  const auditSaysDead = /refused the connection|not serving a working site|doesn't connect at all|website (?:is )?(?:down|dead|unreachable)|domain (?:doesn't|does not) (?:resolve|load|connect)/i
    .test(`${lead.site_issue || ''} ${lead.gaps || ''}`)
  const isDead     = auditSaysDead || siteState[lead.id] === 'dead'
  const leftCount  = leads.length - loggedIds.size

  const OUTCOME_BTNS = [
    { label: 'No answer',  win: false },
    { label: 'Left VM',    win: false },
    { label: 'Spoke',      win: false },
    { label: 'Booked',     win: true  },
    { label: 'Not a fit',  win: false },
    { label: 'Sent email', win: false },
  ]

  // One sentence the rep reads verbatim — the only content in the setter call.
  // The call's whole job is booking discovery; anything more is a reason to say no.
  // Source is why_calling, NOT hook: hook holds the old script's greeting line
  // ("Hi Charles, this is a cold call...") which double-greets when inlined here;
  // why_calling is written in caller voice and leads with the company fact.
  const hookLine = isDead && domain
    ? `Your website at ${domain} isn't loading at all right now.`
    : (() => {
        const src = (lead.why_calling || '').trim()
        if (!src) return 'We took a look at how your company shows up online.'
        let first = src.split(/\.\s+/)[0]
        // one FACT, not a paragraph — cut at the ", and " clause break when long
        if (first.length > 100 && first.includes(', and ')) first = first.split(', and ')[0]
        return first.endsWith('.') ? first : `${first}.`
      })()
  const isRep     = repSession?.role === 'rep'
  const firstName = (lead.contact_name || '').split(' ')[0] || ''
  const repName   = repSession?.display_name || 'the team'

  const fullSteps = [
    { num: 1, label: 'Front desk — first words',         text: lead.intro_line,   bullets: false, highlight: false },
    { num: 2, label: 'When the owner picks up',          text: lead.hook,         bullets: false, highlight: false },
    { num: 3, label: 'Why we\'re calling',               text: lead.why_calling,  bullets: false, highlight: false },
    { num: 4, label: 'Questions to ask',                 text: lead.questions,    bullets: true,  highlight: false },
    { num: 5, label: 'The ask — permission to stop by',  text: lead.meeting_ask,  bullets: false, highlight: true  },
  ]
  // Rep view renders the visual setter flow (SAY cards + IF branches) inline below;
  // the generic steps array is the admin script only.
  const scriptSteps = fullSteps

  const emailTo      = lead.owner_email || lead.email || ''
  const emailSubject = lead.company || ''
  const emailBody    = `Hi ${firstName || 'there'},\n\n${repName} from Ahead of Market — we spoke earlier. The one thing worth repeating: ${hookLine}\n\nPatrik would like 15 minutes to walk you through what we found and see if we can help. Reply with a day that works.\n\n${repName}\naheadofmarket.com`

  const linkBtnStyle = {
    fontFamily: 'Inter,sans-serif',
    fontSize: 13,
    color: '#43423A',
    textDecoration: 'none',
    border: '1px solid #D3D0C7',
    padding: '8px 12px',
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 44,
    boxSizing: 'border-box',
  }

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', background: '#F7F6F3', color: '#17170F' }}>

      {/* ── Responsive CSS ─────────────────────────────────────────────────── */}
      <style>{`
        .cm-top {
          position: sticky; top: 0; z-index: 20; height: 56px;
          display: flex; align-items: center; gap: 24px;
          padding: 0 24px; background: #FFFFFF;
          border-bottom: 1px solid #E4E2DB;
        }
        .cm-shell {
          display: grid;
          grid-template-columns: 264px minmax(0,1fr);
          min-height: calc(100vh - 56px);
        }
        .cm-rail {
          border-right: 1px solid #E4E2DB;
          background: #F1EFEA;
          padding: 24px 0 64px;
          position: sticky;
          top: 56px;
          height: calc(100vh - 56px);
          overflow-y: auto;
          box-sizing: border-box;
        }
        .cm-sheet { padding: 32px 48px 140px; max-width: 1180px; }
        .cm-idbar { display: flex; align-items: flex-start; gap: 24px; margin-bottom: 24px; }
        .cm-cols {
          display: grid;
          grid-template-columns: minmax(0,1.35fr) minmax(0,1fr);
          column-gap: 48px;
          row-gap: 24px;
        }
        .cm-script  { grid-column: 1; grid-row: 1 / span 2; }
        .cm-brief   { grid-column: 2; grid-row: 1 / span 2; border-left: 1px solid #E4E2DB; padding-left: 32px; }
        .cm-outcome {
          position: fixed; left: 264px; right: 0; bottom: 0; z-index: 30;
          background: #FFFFFF; border-top: 1px solid #D3D0C7;
          padding: 12px 48px;
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
          box-shadow: 0 -4px 24px rgba(23,23,15,.05);
        }
        .cm-mbar   { display: none; }
        .cm-qbtn   { display: none; }
        .cm-scrim  { display: none; }
        @media (max-width: 760px) {
          .cm-shell { display: block; }
          .cm-rail {
            position: fixed;
            inset: 56px 0 0 0;
            height: auto;
            width: 100%;
            z-index: 25;
            border-right: none;
            transform: translateX(-100%);
            transition: transform .2s ease;
            padding-bottom: 80px;
            top: 56px;
          }
          .cm-rail.cm-open { transform: none; }
          .cm-scrim { display: block; position: fixed; inset: 0; background: rgba(23,23,15,.4); z-index: 24; }
          .cm-sheet { padding: 16px 16px 140px; max-width: none; }
          .cm-idbar { display: block; }
          .cm-cols  { display: flex; flex-direction: column; gap: 24px; }
          .cm-script  { order: 2; }
          .cm-brief   { order: 1; border-left: none; padding-left: 0; }
          .cm-outcome {
            left: 0; padding: 16px;
            padding-bottom: calc(env(safe-area-inset-bottom,0px) + 16px);
            flex-wrap: wrap;
            transform: translateY(100%);
            transition: transform .2s ease;
          }
          .cm-outcome.cm-open { transform: none; }
          .cm-outcome-oc { flex: 1 1 46%; min-height: 48px; }
          .cm-outcome-note { flex: 1 1 100%; min-height: 48px; }
          .cm-outcome-next { flex: 1 1 100%; min-height: 48px; }
          .cm-mbar {
            display: flex;
            position: fixed; left: 0; right: 0; bottom: 0; z-index: 31;
            gap: 8px; padding: 12px 16px;
            padding-bottom: calc(env(safe-area-inset-bottom,0px) + 12px);
            background: #FFFFFF; border-top: 1px solid #D3D0C7;
          }
          .cm-qbtn { display: inline-flex; }
          .cm-dial { text-align: center !important; min-height: 64px !important; font-size: 30px !important; }
          .cm-callbtn { margin-left: 0 !important; align-items: stretch !important; margin-top: 16px !important; }
        }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="cm-top">
        <div style={{ fontFamily: "'Bricolage Grotesque','Inter',sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '-.01em' }}>
          AOM. <span style={{ color: '#8A6828' }}>Call Mode</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <b style={{ fontFamily: "'Bricolage Grotesque','Inter',sans-serif", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{leftCount}</b>
          <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600 }}>left</span>
        </div>
        <button
          className="cm-qbtn"
          onClick={() => setQueueOpen(q => !q)}
          style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase', color: '#43423A', background: 'transparent', border: '1px solid #D3D0C7', padding: '8px 12px', cursor: 'pointer', lineHeight: 1 }}
        >
          Queue
        </button>
      </div>

      {/* ── Shell ───────────────────────────────────────────────────────────── */}
      <div className="cm-shell">

        {/* Queue rail */}
        <aside className={`cm-rail${queueOpen ? ' cm-open' : ''}`}>
          <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600 }}>Today's queue</span>
            <span style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600 }}>{leftCount} left</span>
          </div>
          <button
            onClick={() => setQueueOpen(false)}
            style={{ display: 'block', margin: '0 16px 8px', width: 'calc(100% - 32px)', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 13, letterSpacing: '.06em', textTransform: 'uppercase', color: '#43423A', background: 'transparent', border: '1px solid #D3D0C7', padding: '8px 12px', cursor: 'pointer' }}
          >
            Close
          </button>
          <div>
            {leads.map((l, n) => {
              const isActive  = n === idx
              const isLogged  = loggedIds.has(l.id)
              return (
                <button
                  key={l.id}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => { setIdx(n); setQueueOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    border: 'none',
                    borderLeft: `2px solid ${isActive ? '#B58A38' : 'transparent'}`,
                    padding: '12px 16px',
                    fontFamily: 'Inter,sans-serif',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: isLogged ? '#A5A29A' : '#17170F', display: 'block', lineHeight: 1.35, textDecoration: isLogged ? 'line-through' : 'none' }}>
                    {l.company}
                  </span>
                  <span style={{ fontSize: 11, color: '#77746A', display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLogged ? '#A5A29A' : '#B58A38', display: 'inline-block', flexShrink: 0 }} />
                    {l.city || ''}{l.day_route ? ` · Day ${l.day_route}` : ''}
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Queue overlay scrim (mobile) */}
        {queueOpen && <div className="cm-scrim" onClick={() => setQueueOpen(false)} />}

        {/* Main sheet */}
        <main className="cm-sheet">

          {/* ID bar */}
          <div className="cm-idbar">
            <div>
              <h1 style={{ fontFamily: "'Bricolage Grotesque','Inter',sans-serif", fontSize: 44, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.02, margin: 0 }}>
                {lead.company}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 12, color: '#77746A', fontFamily: 'Inter,sans-serif', fontSize: 13 }}>
                {lead.need_score && (
                  <span style={{ fontWeight: 700, fontSize: 11, lineHeight: 1, letterSpacing: '.1em', textTransform: 'uppercase', padding: '4px 8px', color: needScoreTextColor(lead.need_score), background: needScoreColor(lead.need_score), fontFamily: 'Inter,sans-serif' }}>
                    Need {lead.need_score}
                  </span>
                )}
                {lead.trade && <span>{lead.trade}</span>}
                {lead.trade && lead.city && <span>·</span>}
                {lead.city && <span>{lead.city}</span>}
                {lead.day_route && <span>· Day {lead.day_route}</span>}
              </div>
              {lead.contact_name && (
                <div style={{ marginTop: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#43423A', fontWeight: 600 }}>
                  {lead.contact_name}{lead.title ? `, ${lead.title}` : ''}
                </div>
              )}
            </div>

            {/* Dial button */}
            <div className="cm-callbtn" style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              {telHref ? (
                <a href={telHref} className="cm-dial" style={{ display: 'block', background: '#B58A38', color: '#17170F', textDecoration: 'none', fontFamily: "'Bricolage Grotesque','Inter',sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: '-.015em', padding: '12px 24px', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                  {phoneLabel}
                </a>
              ) : (
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, color: '#A5A29A', fontStyle: 'italic' }}>No phone on record</div>
              )}
              {phoneNote && (
                <small style={{ fontSize: 11, color: '#77746A', letterSpacing: '.1em', textTransform: 'uppercase' }}>{phoneNote}</small>
              )}
            </div>
          </div>

          {/* Two-column content */}
          <div className="cm-cols">

            {/* Script — left column (desktop), order:2 on mobile.
                Reps get script FIRST on mobile: mid-call the SAY cards must sit
                right under the dial button, not below the research panels. */}
            <section className="cm-script" style={isRep ? { order: 1 } : undefined}>
              {isRep && (() => {
                // Visual grammar: WHITE CARD WITH QUOTES = words that leave your mouth.
                // Everything else is coaching and never spoken. Colored IF cards = branches.
                const sayCard = { margin: 0, fontFamily: 'Inter,sans-serif', fontSize: 17, lineHeight: 1.62, color: '#17170F', background: '#FFFFFF', border: '1px solid #D3D0C7', borderLeft: '2px solid #B58A38', padding: 16 }
                const coach   = { margin: 0, marginTop: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, fontStyle: 'italic', color: '#77746A', lineHeight: 1.5 }
                const stepLbl = { display: 'block', marginBottom: 8, fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600 }
                const numeral = { fontFamily: "'Bricolage Grotesque','Inter',sans-serif", fontWeight: 800, fontSize: 17, color: '#8A6828', lineHeight: 1.3 }
                const row     = { display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', gap: 16, marginBottom: 24 }
                const ifCard  = (rail, bg) => ({ borderLeft: `2px solid ${rail}`, background: bg, padding: 16, marginBottom: 8 })
                const ifLabel = (color) => ({ display: 'block', marginBottom: 8, fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color, fontWeight: 600 })
                const ifSay   = { margin: 0, fontFamily: 'Inter,sans-serif', fontSize: 15, lineHeight: 1.6, color: '#17170F' }
                const ifDo    = { margin: 0, marginTop: 8, fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600 }
                return (
                  <div>
                    <div style={{ background: '#FBF4E4', borderLeft: '2px solid #B58A38', padding: 16, marginBottom: 24 }}>
                      <span style={{ ...stepLbl, color: '#8A6828', marginBottom: 4 }}>You're asking for</span>
                      <p style={{ margin: 0, fontFamily: 'Inter,sans-serif', fontSize: 17, fontWeight: 600, color: '#17170F', lineHeight: 1.4 }}>
                        {lead.contact_name || 'The owner'}{lead.title ? ` — ${lead.title}` : ''}
                      </p>
                      <p style={{ margin: 0, marginTop: 8, fontFamily: 'Inter,sans-serif', fontSize: 15, lineHeight: 1.6, color: '#17170F' }}>
                        Your whole job: get Patrik 15 minutes with {firstName || 'them'}. Every no
                        costs you nothing — there are {leftCount} more in the queue.
                      </p>
                    </div>
                    <div style={row}>
                      <div style={numeral}>1</div>
                      <div>
                        <span style={stepLbl}>Ask for {firstName || 'the owner'}</span>
                        <p style={sayCard}>"Hi, this is {repName} with Ahead of Market, out here in Phoenix — is {firstName || 'the owner'} around?"</p>
                        <div style={{ ...ifCard('#B58A38', '#FBF4E4'), marginTop: 8, marginBottom: 0 }}>
                          <span style={ifLabel('#8A6828')}>"What's this about?"</span>
                          <p style={ifSay}>"We took a look at {lead.company}'s website and Patrik found something he wanted to run by {firstName || 'the owner'}. It's quick — is {firstName || 'the owner'} around?"</p>
                          <p style={ifDo}>Not available? Ask when's better, log Left VM or No answer.</p>
                        </div>
                      </div>
                    </div>
                    <div style={row}>
                      <div style={numeral}>2</div>
                      <div>
                        <span style={stepLbl}>They're on — break the ice, they talk first</span>
                        <p style={sayCard}>"{firstName ? `${firstName}!` : 'Hey!'} {repName} with Ahead of Market."</p>
                        <span style={{ ...stepLbl, marginTop: 16 }}>Then pick one — make it yours</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <p style={{ ...sayCard, fontSize: 15, flex: '1 1 240px' }}>"Hope it's finally cooling down out your way?"</p>
                          <p style={{ ...sayCard, fontSize: 15, flex: '1 1 240px' }}>"You out on a job in this heat?"</p>
                        </div>
                        <p style={coach}>Then STOP and listen. They talk first — now it's a conversation, not a pitch.</p>
                      </div>
                    </div>
                    <div style={row}>
                      <div style={numeral}>3</div>
                      <div>
                        <span style={stepLbl}>The reason — one fact, one ask</span>
                        <p style={sayCard}>"{hookLine}"</p>
                        <p style={{ ...sayCard, marginTop: 8 }}>"We don't want to assume, but we think there might be something there — Patrik would like 15 minutes to walk you through it and see if we can help. Would Tuesday or Thursday work?"</p>
                      </div>
                    </div>
                    <div style={row}>
                      <div style={numeral}>4</div>
                      <div>
                        <span style={stepLbl}>Then — whatever they say next</span>
                        <div style={ifCard('#4A6B4A', '#F0F4EE')}>
                          <span style={ifLabel('#4A6B4A')}>They pick a day</span>
                          <p style={ifSay}>"Perfect. Patrik will call you then — what's the best number for him?"</p>
                          <p style={ifDo}>Log Booked. That's the whole job.</p>
                        </div>
                        <div style={ifCard('#B58A38', '#FBF4E4')}>
                          <span style={ifLabel('#8A6828')}>They ask anything — price, what, who</span>
                          <p style={ifSay}>"Honestly, that's Patrik's side, I just book his time. Tuesday or Thursday?"</p>
                          <p style={ifDo}>Every question gets this same answer.</p>
                        </div>
                        <div style={ifCard('#B58A38', '#FBF4E4')}>
                          <span style={ifLabel('#8A6828')}>"Send me an email"</span>
                          <p style={ifSay}>"Will do, it'll be from me within the hour. Fair?"</p>
                          <p style={ifDo}>Copy the email from the panel, send it, log Sent email.</p>
                        </div>
                        <div style={ifCard('#D3D0C7', '#F1EFEA')}>
                          <span style={ifLabel('#77746A')}>A no, or they're short with you</span>
                          <p style={ifSay}>"No problem, I'll leave you be. Good luck out there."</p>
                          <p style={ifDo}>Log it, next lead. No defending, no convincing.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
              {!isRep && scriptSteps.map(({ num, label, text, bullets, highlight }) => {
                if (!text) return null
                return (
                  <div key={num} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', gap: 16, marginBottom: 24 }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque','Inter',sans-serif", fontWeight: 800, fontSize: 17, color: '#8A6828', lineHeight: 1.3 }}>
                      {num}
                    </div>
                    <div>
                      <span style={{ display: 'block', marginBottom: 8, fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600 }}>
                        {label}
                      </span>
                      {bullets ? (
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {text.split('\n').filter(Boolean).map((line, i) => (
                            <li key={i} style={{ fontFamily: 'Inter,sans-serif', fontSize: 15, lineHeight: 1.6, color: '#43423A', marginBottom: 8 }}>
                              {line.replace(/^[-•*]\s*/, '')}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ margin: 0, fontFamily: 'Inter,sans-serif', fontSize: 17, lineHeight: 1.62, color: '#17170F', ...(highlight ? { background: '#FBF4E4', borderLeft: '2px solid #B58A38', padding: 16 } : {}) }}>
                          {text}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </section>

            {/* Brief sidebar — right column (desktop), order:1 on mobile (order:2 for reps) */}
            <aside className="cm-brief" style={isRep ? { order: 2 } : undefined}>

              {/* Their site */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600, marginBottom: 8 }}>
                  Their site right now
                </div>
                {!lead.website ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 128, border: '1px solid #D3D0C7', background: '#F1EFEA', color: '#77746A', fontFamily: 'Inter,sans-serif', fontSize: 13, fontStyle: 'italic', padding: '0 16px', textAlign: 'center', boxSizing: 'border-box' }}>
                    No website on record. That is the call.
                  </div>
                ) : isDead ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 128, border: '1px solid #D3D0C7', background: '#F1EFEA', color: '#B03A3A', fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 600, padding: '0 16px', textAlign: 'center', boxSizing: 'border-box' }}>
                    {domain} does not load at all. That is the pitch.
                  </div>
                ) : (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ display: 'block', border: '1px solid #D3D0C7', overflow: 'hidden', position: 'relative', height: 240 }}>
                    <iframe
                      key={lead.id}
                      src={lead.website}
                      title={`${lead.company} website`}
                      style={{ width: '200%', height: 480, border: 'none', transform: 'scale(0.5)', transformOrigin: '0 0', pointerEvents: 'none', display: 'block' }}
                      sandbox="allow-scripts allow-same-origin"
                      onError={() => setSiteState(p => ({ ...p, [lead.id]: 'dead' }))}
                      onLoad={() => setSiteState(p => ({ ...p, [lead.id]: 'loaded' }))}
                      loading="lazy"
                    />
                  </a>
                )}
                {lead.website && (
                  isDead ? (
                    <span style={{ display: 'block', marginTop: 8, textAlign: 'center', border: '1px solid #D3D0C7', background: '#F1EFEA', color: '#77746A', fontFamily: 'Inter,sans-serif', fontWeight: 400, fontSize: 13, padding: '10px 12px', minHeight: 44, lineHeight: '20px', boxSizing: 'border-box' }}>
                      Nothing to open. That is the call.
                    </span>
                  ) : (
                    <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 8, textAlign: 'center', border: '1px solid #B58A38', color: '#8A6828', background: '#FBF4E4', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 13, padding: '10px 12px', minHeight: 44, lineHeight: '20px', textDecoration: 'none', boxSizing: 'border-box' }}>
                      Open {domain} ↗
                    </a>
                  )
                )}
              </div>

              {/* Instagram panel */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '30%', background: 'linear-gradient(135deg,#f09433,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888)', flexShrink: 0 }} />
                  Instagram
                </div>
                {hasRealInstagram(lead) ? (
                  <div>
                    <a
                      href={buildInstagramURL(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', border: '1px solid #D3D0C7', background: '#F8F4F0', padding: '12px 16px', textDecoration: 'none', marginBottom: 8, position: 'relative' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* IG gradient icon — 36px (4px-grid: 36÷4=9) */}
                        <div style={{ width: 36, height: 36, borderRadius: '30%', background: 'linear-gradient(135deg,#f09433,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2"/>
                            <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2"/>
                            <circle cx="17.5" cy="6.5" r="1.5" fill="white"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 13, color: '#17170F', lineHeight: 1.2 }}>
                            @{extractInstagramHandle(lead.instagram)}
                          </div>
                          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: '#77746A', marginTop: 4 }}>
                            Tap to open their profile · see recent posts
                          </div>
                        </div>
                        <div style={{ marginLeft: 'auto', fontFamily: 'Inter,sans-serif', fontSize: 11, color: '#8A6828', fontWeight: 600 }}>↗</div>
                      </div>
                    </a>
                    {/* Recent posts hint */}
                    <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: '#77746A', lineHeight: 1.5 }}>
                      Open their profile to see recent project photos before you call.
                    </div>
                  </div>
                ) : (
                  <div>
                    <a
                      href={buildInstagramURL(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #D3D0C7', background: '#FFFFFF', padding: '10px 12px', textDecoration: 'none', color: '#43423A', fontFamily: 'Inter,sans-serif', fontSize: 13, minHeight: 44, boxSizing: 'border-box' }}
                    >
                      <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '30%', background: 'linear-gradient(135deg,#f09433,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888)', flexShrink: 0 }} />
                      Find on Instagram ↗
                    </a>
                    <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: '#A5A29A', marginTop: 8 }}>
                      No handle stored — paste it in their lead card to save for next time.
                    </div>
                  </div>
                )}
              </div>

              {/* Follow-up email — preset, merge fields filled; "send me an email" is the
                  most common positive exit and speed is the whole impression */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600, marginBottom: 8 }}>
                  Follow-up email
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`).then(() => {
                      clearTimeout(toastTimer.current)
                      setToastText('Email copied — paste it into your mail app')
                      toastTimer.current = setTimeout(() => setToastText(''), 2200)
                    })
                  }}
                  style={{ display: 'block', width: '100%', textAlign: 'center', border: '1px solid #B58A38', color: '#8A6828', background: '#FBF4E4', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 13, padding: '10px 12px', minHeight: 44, lineHeight: '20px', cursor: 'pointer', boxSizing: 'border-box' }}
                >
                  Copy the email
                </button>
                {emailTo ? (
                  <a
                    href={`mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                    style={{ display: 'block', marginTop: 8, textAlign: 'center', border: '1px solid #D3D0C7', background: '#FFFFFF', color: '#43423A', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 13, padding: '10px 12px', minHeight: 44, lineHeight: '20px', textDecoration: 'none', boxSizing: 'border-box' }}
                  >
                    Open in Mail → {emailTo}
                  </a>
                ) : (
                  <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: '#A5A29A', marginTop: 8 }}>
                    No email on file — ask for one on the call, then paste and send.
                  </div>
                )}
              </div>

              {/* Alive evidence */}
              {lead.alive_evidence && (
                <div style={{ background: '#F0F4EE', borderLeft: '2px solid #4A6B4A', padding: '12px 16px', marginBottom: 24 }}>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#4A6B4A', fontWeight: 600, marginBottom: 4 }}>
                    Proof they're open
                  </div>
                  <p style={{ margin: 0, fontFamily: 'Inter,sans-serif', fontSize: 13, lineHeight: 1.6, color: '#43423A' }}>
                    {lead.alive_evidence}
                  </p>
                </div>
              )}

              {/* Site issue */}
              {lead.site_issue && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600, marginBottom: 8 }}>
                    The gap we found
                  </div>
                  <p style={{ margin: 0, fontFamily: 'Inter,sans-serif', fontSize: 13, lineHeight: 1.6, color: '#43423A' }}>
                    {lead.site_issue}
                  </p>
                </div>
              )}

              {/* Proof points */}
              {lead.proof_points && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600, marginBottom: 8 }}>
                    If they push back
                  </div>
                  {lead.proof_points.split('\n').filter(Boolean).map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, fontFamily: 'Inter,sans-serif', fontSize: 13, lineHeight: 1.55, color: '#43423A', marginBottom: 4 }}>
                      <span style={{ color: '#B58A38', flexShrink: 0 }}>•</span>
                      <span>{pt.replace(/^[-•*]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Open before you dial */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600, marginBottom: 8 }}>
                  Open before you dial
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <a href={hasRealLinkedIn(lead) ? lead.linkedin : buildLinkedInURL(lead)} target="_blank" rel="noopener noreferrer" style={linkBtnStyle}>
                    {hasRealLinkedIn(lead) ? 'LinkedIn ↗' : 'Find on LinkedIn ↗'}
                  </a>
                  <a href={buildInstagramURL(lead)} target="_blank" rel="noopener noreferrer" style={{ ...linkBtnStyle, gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '30%', background: 'linear-gradient(135deg,#f09433,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888)', flexShrink: 0 }} />
                    {hasRealInstagram(lead) ? 'Instagram ↗' : 'Find on Instagram ↗'}
                  </a>
                  {lead.street_address && lead.city && (
                    <a href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(MAPS_ORIGIN)}&destination=${encodeURIComponent(`${lead.street_address}, ${lead.city}, AZ`)}&travelmode=driving`} target="_blank" rel="noopener noreferrer" style={linkBtnStyle}>
                      Directions ↗
                    </a>
                  )}
                  {(lead.email || lead.owner_email) && (
                    <a href={`mailto:${lead.email || lead.owner_email}`} style={linkBtnStyle}>
                      Email {(lead.contact_name || '').split(' ')[0] || 'them'}
                    </a>
                  )}
                </div>
              </div>

              {/* Last touch */}
              <div>
                <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600, marginBottom: 8 }}>
                  Last touch
                </div>
                <dl style={{ margin: 0 }}>
                  {[
                    ['Status', loggedIds.has(lead.id) ? '✓ Logged this session' : (lead.status || 'Not contacted')],
                    ['Assigned to', lead.assigned_to || '—'],
                    ['Last touch', lead.last_touch || 'Never'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid #E4E2DB', fontFamily: 'Inter,sans-serif', fontSize: 13 }}>
                      <dt style={{ color: '#77746A', margin: 0 }}>{k}</dt>
                      <dd style={{ margin: 0, color: '#17170F', textAlign: 'right', fontWeight: loggedIds.has(lead.id) && k === 'Status' ? 600 : 400 }}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

            </aside>
          </div>
        </main>
      </div>

      {/* ── Outcome bar (desktop pinned, mobile bottom sheet) ──────────────── */}
      <div className={`cm-outcome${sheetOpen ? ' cm-open' : ''}`}>
        <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#77746A', fontWeight: 600, flexShrink: 0, marginRight: 8, width: '100%' }}>
          How did it go
        </span>
        {OUTCOME_BTNS.map(({ label, win }, ki) => (
          <button
            key={label}
            className="cm-outcome-oc"
            onClick={() => logOutcome(label)}
            title={`${label} (key: ${ki + 1})`}
            style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 13, lineHeight: 1, letterSpacing: '.04em', padding: '12px 16px', cursor: 'pointer', background: win ? '#4A6B4A' : '#FFFFFF', border: win ? '1px solid #4A6B4A' : '1px solid #D3D0C7', color: win ? '#fff' : '#43423A', whiteSpace: 'nowrap', minHeight: 44 }}
          >
            {ki + 1}. {label}
          </button>
        ))}
        <input
          className="cm-outcome-note"
          placeholder="One line of notes (optional)"
          value={noteInput}
          onChange={e => setNoteInput(e.target.value)}
          style={{ flex: 1, minWidth: 120, background: '#F1EFEA', border: '1px solid #E4E2DB', padding: '12px', fontFamily: 'Inter,sans-serif', fontWeight: 400, fontSize: 13, color: '#17170F', outline: 'none', minHeight: 44 }}
        />
        <button
          className="cm-outcome-next"
          onClick={() => logOutcome('Skip')}
          style={{ background: '#17170F', color: '#F7F6F3', border: '1px solid #17170F', fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 13, lineHeight: 1, letterSpacing: '.08em', textTransform: 'uppercase', padding: '12px 24px', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }}
        >
          Next lead → <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', fontSize: 11 }}>Space</span>
        </button>
      </div>

      {/* ── Mobile thumb bar ────────────────────────────────────────────────── */}
      <div className="cm-mbar">
        <button onClick={() => setSheetOpen(true)} style={{ flex: 1, background: '#B58A38', border: '1px solid #B58A38', color: '#17170F', fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: '.04em', padding: 0, minHeight: 48, cursor: 'pointer' }}>
          Log this call
        </button>
        <button onClick={() => logOutcome('Skip')} style={{ flex: '0 0 34%', background: '#FFFFFF', border: '1px solid #D3D0C7', color: '#43423A', fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 14, padding: 0, minHeight: 48, cursor: 'pointer' }}>
          Next →
        </button>
      </div>

      {/* Mobile outcome sheet scrim */}
      {sheetOpen && <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(23,23,15,.4)', zIndex: 29 }} />}

      {/* Toast */}
      {toastText && (
        <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', background: '#17170F', color: '#F7F6F3', padding: '12px 24px', fontFamily: 'Inter,sans-serif', fontSize: 13, zIndex: 40, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {toastText}
        </div>
      )}
    </div>
  )
}

// ─── Rep Login ───────────────────────────────────────────────────────────────
// Handles both rep login (via outreach_reps table) and admin fallback (AOM2026 password).
// Security note: uses the anon Supabase client — consistent with the rest of this app's
// client-side model. No server route is introduced, so the known service-key footgun
// (open endpoint with no caller check) is not repeated here.
function RepLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr]           = useState(false)
  const [loading, setLoading]   = useState(false)

  const S = {
    wrap: { minHeight: '100dvh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', padding: 24 },
    card: { background: '#FFFFFF', border: '1px solid #E4E2DB', padding: '40px 36px', maxWidth: 380, width: '100%' },
    wordmark: { fontFamily: 'Bricolage Grotesque,sans-serif', fontWeight: 700, fontSize: 18, color: '#17170F', letterSpacing: '-0.02em', marginBottom: 32 },
    heading: { fontFamily: 'Bricolage Grotesque,sans-serif', fontWeight: 700, fontSize: 22, color: '#17170F', letterSpacing: '-0.02em', marginBottom: 6 },
    sub: { fontSize: 13, color: '#77746A', marginBottom: 28, lineHeight: 1.5 },
    label: { fontSize: 12, fontWeight: 600, color: '#43423A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' },
    input: { width: '100%', boxSizing: 'border-box', border: '1px solid #D3D0C7', padding: '10px 12px', fontSize: 14, color: '#17170F', background: '#F7F6F3', outline: 'none', fontFamily: 'Inter,sans-serif', marginBottom: 16 },
    btn: { width: '100%', background: '#B58A38', color: '#FFFFFF', border: 'none', padding: '12px 0', fontSize: 14, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', letterSpacing: '0.02em', marginTop: 8 },
    err: { fontSize: 12, color: '#B04030', marginBottom: 12 },
  }

  async function submit(e) {
    e.preventDefault()
    setErr(false)
    setLoading(true)

    // 1. Try outreach_reps table first (rep or admin in the table)
    if (username.trim()) {
      const { data } = await sb
        .from('outreach_reps')
        .select('username, display_name, role, trusted')
        .eq('username', username.trim().toLowerCase())
        .eq('password', password)
        .maybeSingle()

      if (data) {
        const session = { username: data.username, display_name: data.display_name, role: data.role, trusted: data.trusted }
        saveRepSession(session)
        setLoading(false)
        onLogin(session)
        return
      }
    }

    // 2. Fallback: original AOM2026 password — sets the old unlock flag so existing
    //    admins continue to see the full view exactly as before
    if (password === PASSWORD) {
      localStorage.setItem('outreach_unlocked', '1')
      setLoading(false)
      onLogin({ username: username.trim() || 'admin', display_name: 'Admin', role: 'admin', trusted: true, legacyAdmin: true })
      return
    }

    setErr(true)
    setLoading(false)
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.wordmark}>AOM</div>
        <div style={S.heading}>Sales Portal</div>
        <div style={S.sub}>Log in to access the outreach tool.</div>

        <form onSubmit={submit} autoComplete="off">
          <label style={S.label}>Username</label>
          <input
            style={S.input}
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setErr(false) }}
            placeholder="your username"
            autoFocus
          />
          <label style={S.label}>Password</label>
          <input
            style={S.input}
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setErr(false) }}
            placeholder="••••••••"
          />
          {err && <div style={S.err}>Incorrect username or password.</div>}
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Rep Onboarding Walkthrough ───────────────────────────────────────────────
// Typeform-style slide sequence shown on first login. Skip always visible.
const ONBOARDING_SLIDES = [
  {
    step: '01 / 05',
    title: 'Welcome to AOM.',
    body: 'AOM is the marketing department for construction companies that don\'t have one. We rebuild their site, run ads, produce video, and grow their presence everywhere buyers look. One team. One retainer.',
    script: null,
    howTo: null,
  },
  {
    step: '02 / 05',
    title: 'What we\'re selling.',
    body: 'Most contractors are invisible online and losing jobs because of it. We fix that. $3,000/mo gets them a full marketing department — what it would cost $10k+ to staff on their own. The entry point is a $1,500 Foundation Sprint that puts the first month toward the retainer.',
    script: null,
    howTo: null,
  },
  {
    step: '03 / 05',
    title: 'Why we\'re calling.',
    body: 'We\'re not pitching ads. We\'re calling to offer a real solution to a real problem these business owners have. The goal of the call is not a sale — it\'s booking a 20-minute walk-through with the owner. That\'s it.',
    script: null,
    howTo: null,
  },
  {
    step: '04 / 05',
    title: 'The 5-part call script.',
    body: 'Every lead card shows the full script broken into 5 numbered blocks. Here\'s how to read them:',
    script: [
      { num: '1', label: 'Front desk opener', desc: 'When a receptionist answers. Get through to the owner. Short, sounds like you belong.' },
      { num: '2', label: 'Hook — owner picks up', desc: 'Why you\'re calling, delivered in 10 seconds. Mention something real about their business.' },
      { num: '3', label: 'Why we\'re calling', desc: 'Frame the problem: they\'re losing jobs to contractors who show up online. You noticed theirs.' },
      { num: '4', label: 'Questions', desc: 'Get them talking. How they get clients. What\'s working. You\'re listening, not pitching.' },
      { num: '5', label: 'The ask', desc: 'Book a 20-minute walk-through. That\'s the whole call. Not a sale — just a meeting.' },
    ],
    howTo: null,
  },
  {
    step: '05 / 05',
    title: 'Using Call Mode.',
    body: null,
    script: null,
    howTo: [
      { icon: '📞', label: 'Tap the number', desc: 'The gold button at the top dials on mobile. On desktop, it copies the number.' },
      { icon: '📋', label: 'Read the script', desc: 'The 5 blocks load for each lead. Scroll down to read and take notes.' },
      { icon: '✓', label: 'Log the outcome', desc: 'After each call: No answer / Left VM / Spoke / Booked / Not a fit. Saves automatically.' },
      { icon: '→', label: 'Next lead', desc: 'The queue advances. You can always revisit a lead you\'ve already started.' },
    ],
    isFinal: true,
  },
]

function RepOnboarding({ repSession, onDone }) {
  const [slide, setSlide] = useState(0)
  const s = ONBOARDING_SLIDES[slide]
  const isLast = slide === ONBOARDING_SLIDES.length - 1

  function advance() {
    if (isLast) {
      markOnboardingDone(repSession.username)
      onDone()
    } else {
      setSlide(slide + 1)
    }
  }

  function skip() {
    markOnboardingDone(repSession.username)
    onDone()
  }

  const S = {
    wrap: { minHeight: '100dvh', background: '#F7F6F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', padding: '24px 24px env(safe-area-inset-bottom,24px)' },
    card: { background: '#FFFFFF', border: '1px solid #E4E2DB', padding: '40px 36px', maxWidth: 520, width: '100%', position: 'relative' },
    step: { fontSize: 11, fontWeight: 600, color: '#B58A38', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 },
    title: { fontFamily: 'Bricolage Grotesque,sans-serif', fontWeight: 700, fontSize: 26, color: '#17170F', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 16 },
    body: { fontSize: 15, color: '#43423A', lineHeight: 1.65, marginBottom: 28 },
    scriptRow: { display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' },
    scriptNum: { width: 24, height: 24, minWidth: 24, background: '#B58A38', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginTop: 1 },
    scriptLabel: { fontSize: 13, fontWeight: 600, color: '#17170F', marginBottom: 3 },
    scriptDesc: { fontSize: 13, color: '#77746A', lineHeight: 1.5 },
    howRow: { display: 'flex', gap: 14, marginBottom: 16, alignItems: 'flex-start' },
    howIcon: { fontSize: 20, width: 28, textAlign: 'center', marginTop: 1 },
    howLabel: { fontSize: 13, fontWeight: 600, color: '#17170F', marginBottom: 3 },
    howDesc: { fontSize: 13, color: '#77746A', lineHeight: 1.5 },
    actions: { display: 'flex', gap: 12, marginTop: 8 },
    btn: { flex: 1, background: '#B58A38', color: '#FFFFFF', border: 'none', padding: '13px 0', fontSize: 14, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', letterSpacing: '0.02em' },
    skip: { background: 'none', border: '1px solid #D3D0C7', padding: '13px 20px', fontSize: 14, color: '#77746A', fontFamily: 'Inter,sans-serif', cursor: 'pointer' },
    dots: { display: 'flex', gap: 6, justifyContent: 'center', marginTop: 24 },
    dot: (active) => ({ width: 6, height: 6, borderRadius: '50%', background: active ? '#B58A38' : '#D3D0C7' }),
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.step}>{s.step}</div>
        <div style={S.title}>{s.title}</div>
        {s.body && <div style={S.body}>{s.body}</div>}

        {s.script && (
          <div style={{ marginBottom: 28 }}>
            {s.script.map(b => (
              <div key={b.num} style={S.scriptRow}>
                <div style={S.scriptNum}>{b.num}</div>
                <div>
                  <div style={S.scriptLabel}>{b.label}</div>
                  <div style={S.scriptDesc}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {s.howTo && (
          <div style={{ marginBottom: 28 }}>
            {s.howTo.map(h => (
              <div key={h.label} style={S.howRow}>
                <div style={S.howIcon}>{h.icon}</div>
                <div>
                  <div style={S.howLabel}>{h.label}</div>
                  <div style={S.howDesc}>{h.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={S.actions}>
          <button style={S.skip} onClick={skip}>Skip</button>
          <button style={S.btn} onClick={advance}>
            {isLast ? 'Start calling' : 'Next'}
          </button>
        </div>

        <div style={S.dots}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <div key={i} style={S.dot(i === slide)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Rep Dashboard Header (simplified, reps-only) ────────────────────────────
function RepDashboardHeader({ repSession, todayCallCount, onSignOut, onRestartOnboarding }) {
  const S = {
    bar: { background: '#FFFFFF', borderBottom: '1px solid #E4E2DB', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter,sans-serif', position: 'sticky', top: 0, zIndex: 20 },
    wordmark: { fontFamily: 'Bricolage Grotesque,sans-serif', fontWeight: 700, fontSize: 17, color: '#17170F', letterSpacing: '-0.02em' },
    right: { display: 'flex', alignItems: 'center', gap: 20 },
    name: { fontSize: 13, color: '#43423A', fontWeight: 500 },
    count: { fontSize: 13, color: '#B58A38', fontWeight: 600 },
    btn: { fontSize: 12, color: '#77746A', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', padding: 0 },
  }

  return (
    <div style={S.bar}>
      <div style={S.wordmark}>AOM Outreach</div>
      <div style={S.right}>
        <span style={S.count}>{todayCallCount} calls today</span>
        <span style={S.name}>{repSession.display_name}</span>
        <button style={S.btn} onClick={onRestartOnboarding} title="Restart walkthrough">Guide</button>
        <button style={S.btn} onClick={onSignOut}>Sign out</button>
      </div>
    </div>
  )
}

// ─── Password Gate ────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (pw === PASSWORD) {
      localStorage.setItem('outreach_unlocked', '1')
      onUnlock()
    } else {
      setErr(true)
      setPw('')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F7F6F3',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      padding: '2rem',
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 800,
        fontSize: '1.75rem',
        color: '#17170F',
        letterSpacing: '-0.02em',
        marginBottom: '2.5rem',
      }}>
        AOM.
      </div>

      <div style={{
        width: '100%',
        maxWidth: 340,
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 800,
          fontSize: '1.2rem',
          letterSpacing: '0.12em',
          color: '#17170F',
          margin: '0 0 0.5rem',
          textTransform: 'uppercase',
        }}>
          Construction Outreach
        </h1>
        <p style={{
          color: '#77746A',
          fontSize: '0.85rem',
          margin: '0 0 2rem',
          letterSpacing: '0.04em',
        }}>
          Internal sales tracker. Team access only.
        </p>

        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Access code"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(false) }}
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#FFFFFF',
              border: `1px solid ${err ? '#B03A3A' : '#D3D0C7'}`,
              color: '#17170F',
              padding: '0.85rem 1rem',
              fontSize: '1rem',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
              marginBottom: err ? '0.5rem' : '1rem',
              textAlign: 'center',
              letterSpacing: '0.12em',
            }}
          />
          {err && (
            <p style={{ color: '#B03A3A', fontSize: '0.8rem', margin: '0 0 1rem' }}>
              Incorrect access code.
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              background: '#B58A38',
              color: '#17170F',
              border: 'none',
              padding: '0.85rem',
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Dashboard Header ─────────────────────────────────────────────────────────
function DashboardHeader({ leads, onLock }) {
  const today = todayStr()
  const wonCount = leads.filter(l => l.status === 'Won').length
  const contactedToday = leads.filter(l => l.last_touch === today).length
  const progress = Math.min((wonCount / GOAL) * 100, 100)

  // Status counts
  const statusCounts = {}
  STATUSES.forEach(s => { statusCounts[s] = 0 })
  leads.forEach(l => { if (l.status) statusCounts[l.status] = (statusCounts[l.status] || 0) + 1 })

  // Per-rep stats
  const repStats = REPS.map(rep => ({
    name: rep,
    total: leads.filter(l => l.assigned_to === rep).length,
    won: leads.filter(l => l.assigned_to === rep && l.status === 'Won').length,
  }))

  return (
    <div style={{
      background: '#FFFFFF',
      borderBottom: '1px solid #E4E2DB',
      padding: '1rem 1rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Top row: logo + meta + actions.
          Right zone (rolezone) is where a future rep/role indicator drops in
          without disturbing the lockup. */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
      }}>
        <div>
          <div style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 800,
            fontSize: '0.7rem',
            color: '#8A6828',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '0.15rem',
          }}>
            AOM Construction
          </div>
          <div style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 800,
            fontSize: '1.1rem',
            color: '#17170F',
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
          }}>
            Outreach Tracker
          </div>
        </div>
        <div data-rolezone style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: '1.5rem',
              color: '#17170F',
              lineHeight: 1,
            }}>{contactedToday}</div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.65rem',
              color: '#77746A',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>Today</div>
          </div>
          <button
            onClick={onLock}
            style={{
              background: 'transparent',
              border: '1px solid #D3D0C7',
              color: '#43423A',
              padding: '0.4rem 0.75rem',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.7rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              minHeight: '36px',
            }}
          >
            Lock
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '0.35rem',
        }}>
          <span style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: '0.8rem',
            color: '#17170F',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {wonCount} Won
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.7rem',
            color: '#77746A',
          }}>
            Goal: {GOAL} retainers
          </span>
        </div>
        <div style={{
          height: 4,
          background: '#E4E2DB',
          width: '100%',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#B58A38',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Per-rep row */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderTop: '1px solid #E4E2DB',
        borderLeft: '1px solid #E4E2DB',
        marginBottom: '0.75rem',
      }}>
        {repStats.map(rep => (
          <div key={rep.name} style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.5rem 0.25rem',
            borderRight: '1px solid #E4E2DB',
            borderBottom: '1px solid #E4E2DB',
          }}>
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: '0.65rem',
              color: '#8A6828',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '0.2rem',
            }}>
              {rep.name}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.65rem',
              color: '#77746A',
            }}>
              {rep.total}L / {rep.won}W
            </div>
          </div>
        ))}
      </div>

      {/* Status counts — horizontal scroll */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.75rem',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {STATUSES.map(s => (
          <div key={s} style={{
            flexShrink: 0,
            textAlign: 'center',
            padding: '0.35rem 0.6rem',
            border: '1px solid #E4E2DB',
            background: '#F1EFEA',
          }}>
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: '1rem',
              color: '#17170F',
              lineHeight: 1,
            }}>
              {statusCounts[s] || 0}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6rem',
              color: '#77746A',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginTop: '0.2rem',
            }}>
              {STATUS_SHORT[s] || s}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({ lead, expanded, onToggle, onUpdate }) {
  const [touchpoints, setTouchpoints] = useState([])
  const [tpsLoaded, setTpsLoaded] = useState(false)
  const [addingTp, setAddingTp] = useState(false)
  const [tpForm, setTpForm] = useState({ date: todayStr(), channel: 'call', note: '' })
  const [tpSaving, setTpSaving] = useState(false)
  const [localNotes, setLocalNotes] = useState(lead.notes || '')

  useEffect(() => {
    setLocalNotes(lead.notes || '')
  }, [lead.notes])

  useEffect(() => {
    if (expanded && !tpsLoaded) {
      loadTouchpoints()
    }
  }, [expanded])

  async function loadTouchpoints() {
    const { data } = await sb
      .from('outreach_touchpoints')
      .select('*')
      .eq('lead_id', lead.id)
      .order('date', { ascending: false })
    if (data) setTouchpoints(data)
    setTpsLoaded(true)
  }

  async function saveTouchpoint() {
    if (!tpForm.note.trim() && !tpForm.date) return
    setTpSaving(true)
    const { data, error } = await sb
      .from('outreach_touchpoints')
      .insert([{ lead_id: lead.id, date: tpForm.date, channel: tpForm.channel, note: tpForm.note }])
      .select()
    if (!error && data) {
      setTouchpoints(prev => [data[0], ...prev])
      onUpdate('last_touch', tpForm.date)
      setTpForm({ date: todayStr(), channel: 'call', note: '' })
      setAddingTp(false)
    }
    setTpSaving(false)
  }

  const scoreColor = needScoreColor(lead.need_score)
  const score = Number(lead.need_score) || 0

  const singleMapURL = lead.street_address && lead.city
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(MAPS_ORIGIN)}&destination=${encodeURIComponent(`${lead.street_address}, ${lead.city}, AZ`)}&travelmode=driving`
    : null

  const badgeStyle = statusBadgeStyle(lead.status)

  return (
    <div style={{
      borderLeft: `4px solid ${score >= 1 ? scoreColor : '#D3D0C7'}`,
      borderBottom: '1px solid #E4E2DB',
      background: expanded ? '#FFFFFF' : '#F7F6F3',
      transition: 'background 0.15s',
    }}>
      {/* Card header — always visible, tap to expand */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '0.9rem 0.9rem 0.9rem 1rem',
          cursor: 'pointer',
          gap: '0.75rem',
          minHeight: 44,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: '0.95rem',
            color: '#17170F',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {lead.company || 'Unnamed'}
          </div>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.75rem',
            color: '#77746A',
            marginTop: '0.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexWrap: 'wrap',
          }}>
            {lead.trade && <span>{lead.trade}</span>}
            {lead.trade && lead.city && <span style={{ color: '#C0BDB5' }}>·</span>}
            {lead.city && <span>{lead.city}</span>}
            {score >= 1 && (
              <span style={{
                background: scoreColor,
                color: needScoreTextColor(lead.need_score),
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: '0.65rem',
                letterSpacing: '0.06em',
                padding: '0.1rem 0.35rem',
              }}>
                NEED {score}
              </span>
            )}
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: '0.58rem',
              letterSpacing: '0.08em',
              padding: '0.1rem 0.35rem',
              border: `1px solid ${hasWebsite(lead) ? '#E9D9AE' : '#D3D0C7'}`,
              color: hasWebsite(lead) ? '#8A6828' : '#77746A',
              background: hasWebsite(lead) ? '#FBF4E4' : '#F1EFEA',
            }}>
              {hasWebsite(lead) ? 'HAS SITE' : 'NO SITE'}
            </span>
          </div>
          {lead.contact_name && (
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.75rem',
              color: '#77746A',
              marginTop: '0.15rem',
            }}>
              {lead.contact_name}{lead.title ? `, ${lead.title}` : ''}
            </div>
          )}

          {/* Contact row — website · office · owner cell · email · LinkedIn */}
          {(lead.website || lead.phone || lead.owner_phone || lead.email || lead.owner_email || lead.company) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginTop: '0.4rem',
            }}>
              {/* Website link — clean domain label, opens new tab */}
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: '#FFFFFF',
                    border: '1px solid #D3D0C7',
                    color: '#8A6828',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.7rem',
                    letterSpacing: '0.01em',
                    padding: '0.3rem 0.5rem',
                    textDecoration: 'none',
                    minHeight: 30,
                    boxSizing: 'border-box',
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cleanDomain(lead.website)} ↗
                </a>
              )}

              {/* Office phone */}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: '#FFFFFF',
                    border: '1px solid #D3D0C7',
                    color: '#43423A',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.72rem',
                    letterSpacing: '0.02em',
                    padding: '0.3rem 0.5rem',
                    textDecoration: 'none',
                    minHeight: 30,
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ fontSize: '0.58rem', color: '#77746A', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Office</span>
                  {lead.phone}
                </a>
              )}

              {/* Owner cell — emphasized (what reps want) */}
              {lead.owner_phone && (
                <a
                  href={`tel:${lead.owner_phone}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: '#FBF4E4',
                    border: '1px solid #B58A38',
                    color: '#17170F',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    padding: '0.3rem 0.5rem',
                    textDecoration: 'none',
                    minHeight: 30,
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ fontSize: '0.58rem', color: '#8A6828', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>Cell</span>
                  {lead.owner_phone}
                </a>
              )}

              {/* Email — owner_email is primary when present */}
              {(lead.owner_email || lead.email) ? (
                <a
                  href={`mailto:${lead.owner_email || lead.email}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: '#FFFFFF',
                    border: '1px solid #D3D0C7',
                    color: '#8A6828',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.7rem',
                    letterSpacing: '0.02em',
                    padding: '0.3rem 0.5rem',
                    textDecoration: 'none',
                    minHeight: 30,
                    boxSizing: 'border-box',
                    maxWidth: 200,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {lead.owner_email && (
                    <span style={{ fontSize: '0.58rem', color: '#77746A', letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Owner</span>
                  )}
                  {lead.owner_email || lead.email}
                </a>
              ) : null}

              <a
                href={hasRealLinkedIn(lead) ? lead.linkedin : buildLinkedInURL(lead)}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                title={hasRealLinkedIn(lead)
                  ? `View ${lead.contact_name || lead.company} on LinkedIn`
                  : `Search for ${lead.contact_name || lead.company} on LinkedIn`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: hasRealLinkedIn(lead) ? '#FFFFFF' : 'transparent',
                  border: hasRealLinkedIn(lead) ? '1px solid #D3D0C7' : '1px solid #D3D0C7',
                  color: hasRealLinkedIn(lead) ? '#43423A' : '#77746A',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.72rem',
                  letterSpacing: '0.02em',
                  padding: '0.3rem 0.5rem',
                  textDecoration: 'none',
                  minHeight: 30,
                  boxSizing: 'border-box',
                }}
              >
                {hasRealLinkedIn(lead) ? 'LinkedIn ↗' : 'Search LinkedIn ⌕'}
              </a>

              <a
                href={buildInstagramURL(lead)}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                title={hasRealInstagram(lead)
                  ? `View @${extractInstagramHandle(lead.instagram)} on Instagram`
                  : `Find ${lead.company} on Instagram`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: hasRealInstagram(lead) ? '#FFFFFF' : 'transparent',
                  border: '1px solid #D3D0C7',
                  color: hasRealInstagram(lead) ? '#43423A' : '#77746A',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.72rem',
                  letterSpacing: '0.02em',
                  padding: '0.3rem 0.5rem',
                  textDecoration: 'none',
                  minHeight: 30,
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '30%', background: 'linear-gradient(135deg,#f09433,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888)', flexShrink: 0 }} />
                {hasRealInstagram(lead) ? `@${extractInstagramHandle(lead.instagram)}` : 'Instagram ⌕'}
              </a>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '0.4rem',
          flexShrink: 0,
        }}>
          {/* Status dropdown */}
          <select
            value={lead.status || ''}
            onChange={e => { e.stopPropagation(); onUpdate('status', e.target.value) }}
            onClick={e => e.stopPropagation()}
            style={{
              ...badgeStyle,
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.65rem',
              letterSpacing: '0.04em',
              padding: '0.25rem 0.4rem',
              cursor: 'pointer',
              maxWidth: 130,
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              paddingRight: '1.2rem',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%2377746A'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.4rem center',
            }}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Assigned rep */}
          {lead.assigned_to && (
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.65rem',
              color: '#77746A',
              letterSpacing: '0.04em',
            }}>
              {lead.assigned_to}
            </div>
          )}

          {/* Expand caret */}
          <div style={{ color: '#A5A29A', fontSize: '0.6rem' }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{
          padding: '0 1rem 1.25rem 1rem',
          borderTop: '1px solid #E4E2DB',
        }}>
          {/* Call kit */}
          <div style={{ margin: '0.85rem 0' }}>
            <CallKit lead={lead} columns={1} />
          </div>

          {/* Quick action buttons */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}>
            {/* Owner cell is the primary CTA — emphasized gold when present */}
            {lead.owner_phone && (
              <a
                href={`tel:${lead.owner_phone}`}
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: '#B58A38',
                  color: '#17170F',
                  padding: '0.6rem 1rem',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  minHeight: 44,
                  boxSizing: 'border-box',
                  flex: '2 1 auto',
                  justifyContent: 'center',
                }}
              >
                Owner Cell — {lead.owner_phone}
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: lead.owner_phone ? 'transparent' : '#B58A38',
                  color: lead.owner_phone ? '#43423A' : '#17170F',
                  border: lead.owner_phone ? '1px solid #D3D0C7' : 'none',
                  padding: '0.6rem 1rem',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  minHeight: 44,
                  boxSizing: 'border-box',
                  flex: '1 1 auto',
                  justifyContent: 'center',
                }}
              >
                {lead.owner_phone ? `Office: ${lead.phone}` : `Call ${lead.phone}`}
              </a>
            )}
            {singleMapURL && (
              <a
                href={singleMapURL}
                target="_blank"
                rel="noreferrer"
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: 'transparent',
                  color: '#8A6828',
                  border: '1px solid #B58A38',
                  padding: '0.6rem 1rem',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  minHeight: 44,
                  boxSizing: 'border-box',
                  flex: '1 1 auto',
                  justifyContent: 'center',
                }}
              >
                Navigate
              </a>
            )}
          </div>

          {/* Address + revenue + website + email row */}
          {(lead.street_address || lead.revenue || lead.email || lead.owner_email || lead.website || true) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              marginBottom: '0.85rem',
            }}>
              {lead.website && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={labelStyle}>Website</div>
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...valueStyle, color: '#8A6828', textDecoration: 'none' }}
                  >
                    {cleanDomain(lead.website)} ↗
                  </a>
                </div>
              )}
              {/* Instagram — editable field for reps to paste the handle */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '30%', background: 'linear-gradient(135deg,#f09433,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888)' }} />
                  Instagram
                </label>
                <input
                  type="text"
                  defaultValue={lead.instagram || ''}
                  placeholder="@handle or instagram.com/handle"
                  onBlur={e => {
                    const val = e.target.value.trim()
                    if (val !== (lead.instagram || '')) onUpdate('instagram', val || null)
                  }}
                  style={{ ...editInputStyle, width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              {lead.street_address && (
                <div>
                  <div style={labelStyle}>Address</div>
                  <div style={valueStyle}>{lead.street_address}, {lead.city}, AZ</div>
                </div>
              )}
              {lead.revenue && (
                <div>
                  <div style={labelStyle}>Revenue</div>
                  <div style={valueStyle}>{lead.revenue}</div>
                </div>
              )}
              {lead.owner_email && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={labelStyle}>Owner Email</div>
                  <a
                    href={`mailto:${lead.owner_email}`}
                    style={{ ...valueStyle, color: '#8A6828', textDecoration: 'none' }}
                  >
                    {lead.owner_email}
                  </a>
                </div>
              )}
              {lead.email && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={labelStyle}>{lead.owner_email ? 'Office Email' : 'Email'}</div>
                  <a
                    href={`mailto:${lead.email}`}
                    style={{ ...valueStyle, color: lead.owner_email ? '#77746A' : '#8A6828', textDecoration: 'none' }}
                  >
                    {lead.email}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Assigned + Next Touch */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            marginBottom: '0.85rem',
          }}>
            <div>
              <label style={labelStyle}>Assigned To</label>
              <select
                value={lead.assigned_to || ''}
                onChange={e => onUpdate('assigned_to', e.target.value)}
                style={editSelectStyle}
              >
                <option value="">Unassigned</option>
                {REPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Next Touch</label>
              <input
                type="date"
                value={lead.next_touch ? lead.next_touch.slice(0, 10) : ''}
                onChange={e => onUpdate('next_touch', e.target.value)}
                style={editInputStyle}
              />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={localNotes}
              onChange={e => setLocalNotes(e.target.value)}
              onBlur={e => { if (e.target.value !== lead.notes) onUpdate('notes', e.target.value) }}
              rows={3}
              placeholder="Add notes..."
              style={{
                ...editInputStyle,
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Touchpoints */}
          <div style={{ borderTop: '1px solid #E4E2DB', paddingTop: '0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.6rem',
            }}>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.65rem',
                color: '#77746A',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                Touchpoints
              </div>
              <button
                onClick={() => setAddingTp(p => !p)}
                style={{
                  background: 'transparent',
                  border: '1px solid #D3D0C7',
                  color: '#43423A',
                  padding: '0.3rem 0.6rem',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.65rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  minHeight: 36,
                }}
              >
                + Add
              </button>
            </div>

            {/* Add touchpoint form */}
            {addingTp && (
              <div style={{
                background: '#F1EFEA',
                border: '1px solid #E4E2DB',
                padding: '0.75rem',
                marginBottom: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={tpForm.date}
                    onChange={e => setTpForm(p => ({ ...p, date: e.target.value }))}
                    style={{ ...editInputStyle, flex: '1 1 130px' }}
                  />
                  <select
                    value={tpForm.channel}
                    onChange={e => setTpForm(p => ({ ...p, channel: e.target.value }))}
                    style={{ ...editSelectStyle, flex: '1 1 100px' }}
                  >
                    {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <input
                  type="text"
                  value={tpForm.note}
                  onChange={e => setTpForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Note (outcome, next step...)"
                  onKeyDown={e => { if (e.key === 'Enter') saveTouchpoint() }}
                  style={{ ...editInputStyle, width: '100%', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={saveTouchpoint}
                    disabled={tpSaving}
                    style={{
                      flex: 1,
                      background: '#B58A38',
                      color: '#17170F',
                      border: 'none',
                      padding: '0.6rem',
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: tpSaving ? 'wait' : 'pointer',
                      minHeight: 44,
                    }}
                  >
                    {tpSaving ? 'Saving...' : 'Save Touchpoint'}
                  </button>
                  <button
                    onClick={() => setAddingTp(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #D3D0C7',
                      color: '#77746A',
                      padding: '0.6rem 0.75rem',
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Touchpoint list */}
            {touchpoints.map(tp => (
              <div key={tp.id} style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
                padding: '0.5rem 0',
                borderBottom: '1px solid #E4E2DB',
                fontSize: '0.75rem',
                fontFamily: "'Inter', sans-serif",
              }}>
                <span style={{ color: '#77746A', flexShrink: 0, minWidth: 88 }}>{tp.date}</span>
                <span style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.6rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#8A6828',
                  flexShrink: 0,
                  minWidth: 52,
                  paddingTop: '0.05rem',
                }}>
                  {tp.channel}
                </span>
                <span style={{ color: '#43423A', lineHeight: 1.4 }}>{tp.note}</span>
              </div>
            ))}

            {tpsLoaded && touchpoints.length === 0 && !addingTp && (
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                color: '#A5A29A',
                padding: '0.5rem 0',
              }}>
                No touchpoints yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Shared input styles
const labelStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.62rem',
  color: '#77746A',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '0.25rem',
}

const valueStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.8rem',
  color: '#43423A',
  lineHeight: 1.4,
}

const editInputStyle = {
  background: '#FFFFFF',
  border: '1px solid #D3D0C7',
  color: '#17170F',
  padding: '0.5rem 0.6rem',
  fontSize: '0.8rem',
  fontFamily: "'Inter', sans-serif",
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  appearance: 'none',
  WebkitAppearance: 'none',
}

const editSelectStyle = {
  ...editInputStyle,
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%2377746A'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.6rem center',
  paddingRight: '1.75rem',
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function CallBlock({ num, label, text, bullets, wide }) {
  if (!text) return null
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E4E2DB',
      borderLeft: '2px solid #B58A38',
      padding: '0.6rem 0.75rem',
      gridColumn: wide ? '1 / -1' : 'auto',
    }}>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.6rem',
        color: '#8A6828',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: '0.35rem',
      }}>
        {num != null && (
          <span style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: '0.7rem',
            marginRight: '0.45rem',
          }}>
            {num}
          </span>
        )}
        {label}
      </div>
      {bullets
        ? text.split('\n').filter(Boolean).map((g, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '0.5rem',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.8rem',
              color: '#17170F',
              lineHeight: 1.5,
              marginBottom: '0.2rem',
            }}>
              <span style={{ color: '#B58A38', flexShrink: 0 }}>•</span>
              <span>{g.replace(/^[-•*]\s*/, '')}</span>
            </div>
          ))
        : (
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8rem',
            color: '#17170F',
            lineHeight: 1.5,
          }}>
            {text}
          </div>
        )}
    </div>
  )
}

function MutedBlock({ label, text }) {
  if (!text) return null
  return (
    <div style={{
      gridColumn: '1 / -1',
      background: '#F1EFEA',
      border: '1px solid #E4E2DB',
      borderLeft: '2px solid #C0BDB5',
      padding: '0.55rem 0.75rem',
    }}>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.6rem',
        color: '#77746A',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: '0.3rem',
      }}>
        {label}
      </div>
      {text.split('\n').filter(Boolean).map((g, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: '0.5rem',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.74rem',
          color: '#5F5D56',
          lineHeight: 1.5,
          marginBottom: '0.15rem',
        }}>
          <span style={{ color: '#A5A29A', flexShrink: 0 }}>•</span>
          <span>{g.replace(/^[-•*]\s*/, '')}</span>
        </div>
      ))}
    </div>
  )
}

function CallKit({ lead, columns }) {
  const hasKit = lead.intro_line || lead.why_calling || lead.meeting_ask
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: columns === 2 ? '1fr 1fr' : '1fr',
      gap: '0.6rem',
    }}>
      {lead.alive_evidence && (
        <div style={{
          gridColumn: '1 / -1',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'baseline',
          background: '#F0F4EE',
          border: '1px solid #DCE5D8',
          borderLeft: '2px solid #4A6B4A',
          padding: '0.5rem 0.75rem',
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.6rem',
            color: '#4A6B4A',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            Confirmed open
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.76rem',
            color: '#43423A',
            lineHeight: 1.45,
          }}>
            {lead.alive_evidence}
          </span>
        </div>
      )}
      {hasKit ? (
        <>
          <CallBlock num={1} label="Front desk — first words" text={lead.intro_line} />
          <CallBlock num={2} label="When the owner picks up" text={lead.hook} />
          <CallBlock num={3} label="Why we're calling" text={lead.why_calling} />
          {lead.questions
            ? <CallBlock num={4} label="Questions to ask" text={lead.questions} bullets />
            : <CallBlock num={4} label="Proof we did our homework" text={lead.proof_points} bullets />}
          <CallBlock num={5} label="The ask — permission to stop by" text={lead.meeting_ask} wide />
        </>
      ) : (
        <CallBlock label="Opener" text={lead.hook} wide />
      )}
      <MutedBlock label="If they ask what you'd do — reference, not a script" text={lead.gaps} />
      {lead.questions && (
        <MutedBlock label="Context for you — don't recite this at them" text={lead.proof_points} />
      )}
      {lead.notes && !lead.proof_points && (
        <div style={{
          gridColumn: '1 / -1',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.72rem',
          color: '#77746A',
          lineHeight: 1.5,
        }}>
          {lead.notes}
        </div>
      )}
    </div>
  )
}

function LeadTable({ leads, expandedId, onToggle, onUpdate }) {
  const [sort, setSort] = useState({ key: 'day_route', dir: 1 })
  const cols = [
    { key: 'company', label: 'Company', w: '14%' },
    { key: 'trade', label: 'Trade', w: '10%' },
    { key: 'city', label: 'City', w: '6%' },
    { key: 'day_route', label: 'Day', w: '4%' },
    { key: 'need_score', label: 'Need', w: '5%' },
    { key: 'employees', label: 'Emp', w: '4%' },
    { key: 'website', label: 'Website', w: '9%' },
    { key: 'phone', label: 'Contact', w: '14%' },
    { key: 'street_address', label: 'Address', w: '15%' },
    { key: 'status', label: 'Status', w: '10%' },
    { key: 'assigned_to', label: 'Rep', w: '9%' },
  ]
  const sorted = [...leads].sort((a, b) => {
    const va = a[sort.key] ?? '', vb = b[sort.key] ?? ''
    if (va < vb) return -1 * sort.dir
    if (va > vb) return 1 * sort.dir
    return warmthCompare(a, b) // ties break warmest-first (has-site), then NEED
  })
  const th = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.6rem',
    color: '#8A6828',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    textAlign: 'left',
    padding: '0.6rem 0.6rem',
    borderBottom: '1px solid #D3D0C7',
    background: '#F1EFEA',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  }
  const td = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.78rem',
    color: '#43423A',
    padding: '0.55rem 0.6rem',
    borderBottom: '1px solid #E4E2DB',
    verticalAlign: 'top',
  }
  const sel = {
    background: '#FFFFFF',
    color: '#43423A',
    border: '1px solid #D3D0C7',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.72rem',
    padding: '0.25rem 0.3rem',
    maxWidth: '9.5rem',
  }
  return (
    <div style={{ overflow: 'auto', maxHeight: '75vh' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1320, tableLayout: 'fixed' }}>
        <colgroup>
          {cols.map(c => <col key={c.key} style={{ width: c.w }} />)}
        </colgroup>
        <thead>
          <tr>
            {cols.map(c => (
              <th
                key={c.key}
                style={{ ...th, position: 'sticky', top: 0, zIndex: 2 }}
                onClick={() => setSort(s => ({ key: c.key, dir: s.key === c.key ? -s.dir : 1 }))}
              >
                {c.label}{sort.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(lead => {
            const open = expandedId === lead.id
            return (
              <React.Fragment key={lead.id}>
                <tr
                  onClick={() => onToggle(lead.id)}
                  style={{ cursor: 'pointer', background: open ? '#FBFAF8' : 'transparent' }}
                >
                  <td style={{ ...td, fontWeight: 600, color: '#17170F' }}>
                    {lead.company}
                    {lead.contact_name && (
                      <div style={{ fontWeight: 400, fontSize: '0.68rem', color: '#77746A', marginTop: '0.1rem' }}>
                        {lead.contact_name}{lead.title ? `, ${lead.title}` : ''}
                      </div>
                    )}
                  </td>
                  <td style={td}>{lead.trade}</td>
                  <td style={td}>{lead.city}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{lead.day_route}</td>
                  <td style={td}>
                    <span style={{
                      background: needScoreColor(lead.need_score),
                      color: needScoreTextColor(lead.need_score),
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      padding: '0.12rem 0.4rem',
                    }}>
                      {lead.need_score}
                    </span>
                    <div style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: '0.54rem',
                      letterSpacing: '0.07em',
                      marginTop: '0.2rem',
                      color: hasWebsite(lead) ? '#8A6828' : '#77746A',
                    }}>
                      {hasWebsite(lead) ? 'HAS SITE' : 'NO SITE'}
                    </div>
                  </td>
                  <td
                    title={lead.employees || ''}
                    style={{ ...td, fontSize: '0.72rem', color: '#77746A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {lead.employees
                      ? lead.employees.replace(/\s*\(.*$/, '')
                      : <span style={{ color: '#A5A29A' }}>—</span>}
                  </td>
                  {/* Website column */}
                  <td style={{ ...td, fontSize: '0.72rem' }}>
                    {lead.website
                      ? <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            color: '#8A6828',
                            textDecoration: 'none',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {cleanDomain(lead.website)} ↗
                        </a>
                      : <span style={{ color: '#A5A29A', fontSize: '0.66rem' }}>site pending</span>
                    }
                  </td>
                  {/* Contact column — office / owner cell / email / LinkedIn */}
                  <td style={td}>
                    {/* Office phone */}
                    {lead.phone
                      ? <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} style={{ color: '#8A6828', textDecoration: 'none', whiteSpace: 'nowrap', display: 'block', fontSize: '0.72rem' }}>
                          <span style={{ color: '#77746A', fontSize: '0.58rem', marginRight: '0.2rem' }}>Office</span>{lead.phone}
                        </a>
                      : <span style={{ color: '#A5A29A' }}>—</span>}
                    {/* Owner cell — emphasized */}
                    {lead.owner_phone && (
                      <a
                        href={`tel:${lead.owner_phone}`}
                        onClick={e => e.stopPropagation()}
                        style={{
                          color: '#17170F',
                          fontWeight: 600,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          fontSize: '0.72rem',
                          marginTop: '0.2rem',
                        }}
                      >
                        <span style={{ color: '#8A6828', fontSize: '0.58rem', marginRight: '0.2rem', fontWeight: 700 }}>Cell</span>{lead.owner_phone}
                      </a>
                    )}
                    {/* Email — owner first */}
                    {(lead.owner_email || lead.email) && (
                      <a
                        href={`mailto:${lead.owner_email || lead.email}`}
                        onClick={e => e.stopPropagation()}
                        title={lead.owner_email || lead.email}
                        style={{
                          color: '#8A6828',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '0.68rem',
                          marginTop: '0.15rem',
                        }}
                      >
                        {lead.owner_email
                          ? <><span style={{ color: '#77746A', fontSize: '0.58rem', marginRight: '0.2rem' }}>Owner</span>{lead.owner_email}</>
                          : lead.email}
                      </a>
                    )}
                    <a
                      href={hasRealLinkedIn(lead) ? lead.linkedin : buildLinkedInURL(lead)}
                      target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      title={hasRealLinkedIn(lead)
                        ? `View ${lead.contact_name || lead.company} on LinkedIn`
                        : `Search for ${lead.contact_name || lead.company} on LinkedIn`}
                      style={{
                        color: hasRealLinkedIn(lead) ? '#43423A' : '#77746A',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        fontSize: '0.72rem',
                        marginTop: '0.15rem',
                      }}
                    >{hasRealLinkedIn(lead) ? 'LinkedIn ↗' : 'Search LinkedIn ⌕'}</a>
                  </td>
                  <td style={{ ...td, fontSize: '0.72rem', color: '#43423A' }}>
                    {lead.street_address
                      ? <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(MAPS_ORIGIN)}&destination=${encodeURIComponent(lead.street_address)}`}
                          target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          title="Open drive route from Dunbar Dr"
                          style={{ color: '#43423A', textDecoration: 'none' }}
                        >{lead.street_address} <span style={{ color: '#8A6828', fontSize: '0.65rem' }}>↗</span></a>
                      : '—'}
                  </td>
                  <td style={{ ...td, verticalAlign: 'middle' }}>
                    <select
                      value={lead.status || 'Not contacted'}
                      onClick={e => e.stopPropagation()}
                      onChange={e => onUpdate(lead.id, 'status', e.target.value)}
                      style={sel}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, verticalAlign: 'middle' }}>
                    <select
                      value={lead.assigned_to || ''}
                      onClick={e => e.stopPropagation()}
                      onChange={e => onUpdate(lead.id, 'assigned_to', e.target.value || null)}
                      style={sel}
                    >
                      <option value="">—</option>
                      {REPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={cols.length} style={{ ...td, background: '#FBFAF8', padding: '0.75rem 0.9rem' }}>
                      <CallKit lead={lead} columns={2} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CriteriaStrip() {
  const [open, setOpen] = useState(false)
  const gapItems = [
    'No website, or a dated pre-2018 one',
    'No real project photos',
    'No quote or contact form',
    'Broken or clumsy on mobile',
    'Weak or missing Google listing, few reviews',
    'No case studies or search content',
    'Dated or inconsistent branding',
  ]
  return (
    <div style={{ borderBottom: '1px solid #E4E2DB', background: '#F1EFEA' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.6rem',
          color: '#8A6828',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        <span>How this list is built — what the NEED number means</span>
        <span style={{ color: '#77746A' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          padding: '0 1rem 0.9rem 1rem',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.75rem',
          color: '#43423A',
          lineHeight: 1.55,
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            Every company on this page cleared two bars before it was added:
          </div>
          <div style={{ marginBottom: '0.35rem' }}>
            <span style={{ color: '#17170F', fontWeight: 600 }}>1. Can they afford us.</span>{' '}
            15+ years state-licensed, commercial trade, a real crew (not a one-man shop), and not an
            enterprise that already runs an agency.
          </div>
          <div style={{ marginBottom: '0.4rem' }}>
            <span style={{ color: '#17170F', fontWeight: 600 }}>2. Do they need us.</span>{' '}
            The <span style={{ color: '#8A6828', fontWeight: 600 }}>NEED</span> badge is a count of marketing gaps we
            verified by checking each company by hand. Minimum 4 to make the list. The gaps we look for:
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.3rem 0.9rem',
            marginBottom: '0.5rem',
          }}>
            {gapItems.map((g, i) => (
              <span key={i} style={{ color: '#77746A' }}>• {g}</span>
            ))}
          </div>
          <div style={{ color: '#77746A' }}>
            <span style={{ color: '#B03A3A', fontWeight: 600 }}>NEED 7</span> = worst presence, hottest door.
            Open a lead to see the opener line and the exact ways we can help that company.
          </div>
        </div>
      )}
    </div>
  )
}

function FilterBar({ filterDay, setFilterDay, filterStatus, setFilterStatus, filterRep, setFilterRep, search, setSearch }) {
  const chipBase = {
    flexShrink: 0,
    padding: '0.4rem 0.75rem',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.7rem',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
    whiteSpace: 'nowrap',
    minHeight: 36,
  }
  const activeChip = { ...chipBase, background: '#B58A38', color: '#17170F' }
  const inactiveChip = { ...chipBase, background: '#FFFFFF', color: '#43423A', border: '1px solid #D3D0C7' }

  return (
    <div style={{
      background: '#F7F6F3',
      borderBottom: '1px solid #E4E2DB',
      padding: '0.5rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      {/* Search */}
      <input
        type="search"
        placeholder="Search company, contact, city..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          ...editInputStyle,
          fontSize: '0.85rem',
        }}
      />

      {/* Day filter */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {['all', '1', '2', '3', '4', '5'].map(d => (
          <button
            key={d}
            onClick={() => setFilterDay(d)}
            style={filterDay === d ? activeChip : inactiveChip}
          >
            {d === 'all' ? 'All Days' : DAY_LABELS[Number(d)].split(' — ')[0]}
          </button>
        ))}

        <div style={{ width: 1, background: '#D3D0C7', flexShrink: 0, margin: '0 0.15rem' }} />

        {/* Rep filter */}
        {['all', ...REPS].map(r => (
          <button
            key={r}
            onClick={() => setFilterRep(r)}
            style={filterRep === r ? activeChip : inactiveChip}
          >
            {r === 'all' ? 'All Reps' : r}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setFilterStatus('all')}
          style={filterStatus === 'all' ? activeChip : inactiveChip}
        >
          All Statuses
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={filterStatus === s ? activeChip : inactiveChip}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Admin Team View ──────────────────────────────────────────────────────────
// Shows all reps (role='rep') with batch progress, outcome breakdown,
// a Reload Batch button (assigns fresh 15), and a Promote/Demote button.
function AdminTeamView({ leads }) {
  const [reps, setReps] = useState([])
  const [assignments, setAssignments] = useState({}) // { username: [lead_id, ...] }
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [reloading, setReloading] = useState({})   // { username: bool }
  const [promoting, setPromoting] = useState({})   // { username: bool }
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function loadTeamData() {
    setLoadingTeam(true)
    const [{ data: repData }, { data: assignData }] = await Promise.all([
      sb.from('outreach_reps').select('*').eq('role', 'rep').order('display_name'),
      sb.from('outreach_rep_assignments').select('rep_username, lead_id').eq('is_current', true),
    ])
    setReps(repData || [])
    const map = {}
    for (const row of (assignData || [])) {
      if (!map[row.rep_username]) map[row.rep_username] = []
      map[row.rep_username].push(row.lead_id)
    }
    setAssignments(map)
    setLoadingTeam(false)
  }

  useEffect(() => { loadTeamData() }, [])

  async function handleReload(rep) {
    setReloading(prev => ({ ...prev, [rep.username]: true }))
    try {
      // 1. Retire current batch
      await sb.from('outreach_rep_assignments')
        .update({ is_current: false })
        .eq('rep_username', rep.username)
        .eq('is_current', true)

      // 2. Next batch number
      const { data: existing } = await sb.from('outreach_rep_assignments')
        .select('batch_number')
        .eq('rep_username', rep.username)
        .order('batch_number', { ascending: false })
        .limit(1)
      const nextBatch = (existing && existing[0] ? existing[0].batch_number : 0) + 1

      // 3. Leads currently in other reps' active batches (excluded from eligibility)
      const { data: otherBatches } = await sb.from('outreach_rep_assignments')
        .select('lead_id')
        .eq('is_current', true)
      const otherIds = new Set((otherBatches || []).map(r => r.lead_id))

      // 4. Today's touchpoints by reps OTHER than the target rep
      const today = todayStr()
      const { data: touchData } = await sb.from('outreach_touchpoints')
        .select('lead_id, rep_username')
        .eq('date', today)
        .eq('channel', 'call')
      const calledByOthers = new Set(
        (touchData || [])
          .filter(r => r.rep_username !== rep.username)
          .map(r => r.lead_id)
      )

      // 5. Filter eligible leads (same rules as auto-assign)
      const eligible = leads.filter(l => {
        if (!rep.trusted && (l.need_score || 0) >= 7) return false
        if (otherIds.has(l.id)) return false
        if (calledByOthers.has(l.id)) return false
        return true
      })

      const batch = eligible.slice(0, 15)
      if (batch.length > 0) {
        const rows = batch.map(l => ({
          rep_username: rep.username,
          lead_id: l.id,
          batch_number: nextBatch,
          is_current: true,
        }))
        await sb.from('outreach_rep_assignments').insert(rows)
      }
      showToast(`${rep.display_name}: batch #${nextBatch} — ${batch.length} leads assigned`)
      await loadTeamData()
    } catch (e) {
      showToast(`Error: ${e.message}`)
    } finally {
      setReloading(prev => ({ ...prev, [rep.username]: false }))
    }
  }

  async function handlePromote(rep) {
    setPromoting(prev => ({ ...prev, [rep.username]: true }))
    try {
      const newTrusted = !rep.trusted
      await sb.from('outreach_reps').update({ trusted: newTrusted }).eq('username', rep.username)
      setReps(prev => prev.map(r => r.username === rep.username ? { ...r, trusted: newTrusted } : r))
      showToast(`${rep.display_name} ${newTrusted ? 'promoted to Trusted' : 'set to Standard'}`)
    } catch (e) {
      showToast(`Error: ${e.message}`)
    } finally {
      setPromoting(prev => ({ ...prev, [rep.username]: false }))
    }
  }

  const OUTCOME_LABELS = {
    booked: 'Booked',
    spoke: 'Spoke',
    left_vm: 'Left VM',
    no_answer: 'No Answer',
    not_a_fit: 'Not a Fit',
    new: 'Pending',
  }
  const OUTCOME_COLORS = {
    booked: '#1A7A4A',
    spoke: '#2563EB',
    left_vm: '#B58A38',
    no_answer: '#77746A',
    not_a_fit: '#B03A3A',
    new: '#A5A29A',
  }

  if (loadingTeam) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#A5A29A', fontSize: '0.85rem', fontFamily: "'Inter', sans-serif" }}>
        Loading team data...
      </div>
    )
  }

  if (reps.length === 0) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#A5A29A', fontSize: '0.85rem', fontFamily: "'Inter', sans-serif" }}>
        No reps found. Add reps in the outreach_reps table.
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: '#17170F', color: '#F7F6F3',
          padding: '0.65rem 1rem', fontSize: '0.8rem',
          fontFamily: "'Inter', sans-serif",
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          maxWidth: 320,
        }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '1.05rem', color: '#17170F', marginBottom: '0.25rem' }}>
          Rep Team
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#77746A' }}>
          Current batch progress for each rep. Reload assigns a fresh batch of 15. Promote unlocks S-tier leads for future batches.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {reps.map(rep => {
          const batchIds = assignments[rep.username] || []
          const batchLeads = batchIds.map(id => leads.find(l => l.id === id)).filter(Boolean)
          const called = batchLeads.filter(l => l.status && l.status !== 'Not contacted').length
          const total = batchIds.length

          // Count outcomes across leads in this batch
          const outcomes = {}
          for (const l of batchLeads) {
            const s = l.status || 'Not contacted'
            outcomes[s] = (outcomes[s] || 0) + 1
          }

          return (
            <div key={rep.username} style={{
              background: '#FFFFFF',
              border: '1px solid #E4E2DB',
              padding: '1rem 1.25rem',
            }}>
              {/* Top row: name + trust badge + actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#17170F' }}>
                    {rep.display_name}
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.62rem', color: '#A5A29A', marginTop: '0.1rem' }}>
                    @{rep.username}
                  </div>
                </div>

                {/* Trust badge */}
                <div style={{
                  background: rep.trusted ? '#F0F9F4' : '#F1EFEA',
                  border: `1px solid ${rep.trusted ? '#1A7A4A' : '#D3D0C7'}`,
                  color: rep.trusted ? '#1A7A4A' : '#77746A',
                  padding: '0.2rem 0.5rem',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.58rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {rep.trusted ? 'Trusted' : 'Standard'}
                </div>

                {/* Promote / Demote */}
                <button
                  onClick={() => handlePromote(rep)}
                  disabled={promoting[rep.username]}
                  style={{
                    background: 'transparent',
                    border: '1px solid #D3D0C7',
                    color: '#43423A',
                    padding: '0.3rem 0.65rem',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.62rem',
                    cursor: promoting[rep.username] ? 'default' : 'pointer',
                    fontWeight: 500,
                    opacity: promoting[rep.username] ? 0.5 : 1,
                    minHeight: 32,
                    flexShrink: 0,
                  }}
                >
                  {promoting[rep.username] ? '...' : rep.trusted ? 'Demote' : 'Promote'}
                </button>

                {/* Reload Batch */}
                <button
                  onClick={() => handleReload(rep)}
                  disabled={reloading[rep.username]}
                  style={{
                    background: reloading[rep.username] ? '#F1EFEA' : '#B58A38',
                    border: '1px solid #B58A38',
                    color: reloading[rep.username] ? '#77746A' : '#17170F',
                    padding: '0.3rem 0.75rem',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    cursor: reloading[rep.username] ? 'default' : 'pointer',
                    minHeight: 32,
                    flexShrink: 0,
                  }}
                >
                  {reloading[rep.username] ? 'Assigning...' : 'Reload Batch'}
                </button>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.68rem', color: '#77746A' }}>
                    Batch progress
                  </div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: '0.82rem', color: '#17170F' }}>
                    {called} of {total} called
                  </div>
                </div>
                <div style={{ height: 3, background: '#F1EFEA' }}>
                  <div style={{
                    height: '100%',
                    width: total > 0 ? `${Math.round((called / total) * 100)}%` : '0%',
                    background: called === total && total > 0 ? '#1A7A4A' : '#B58A38',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>

              {/* Outcome breakdown chips */}
              {total > 0 ? (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {Object.entries(outcomes)
                    .sort(([a], [b]) => {
                      const ORDER = ['booked', 'spoke', 'left_vm', 'no_answer', 'not_a_fit', 'new']
                      return ORDER.indexOf(a) - ORDER.indexOf(b)
                    })
                    .map(([status, count]) => (
                      <div key={status} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: '#F7F6F3',
                        border: '1px solid #E4E2DB',
                        padding: '0.2rem 0.5rem',
                      }}>
                        <div style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: OUTCOME_COLORS[status] || '#77746A',
                          flexShrink: 0,
                        }} />
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.62rem', color: '#43423A' }}>
                          {count} {OUTCOME_LABELS[status] || status}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.68rem', color: '#A5A29A' }}>
                  No batch assigned. Click Reload Batch to assign 15 leads.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function OutreachTracker() {
  // Auth: legacy admin flag OR rep session from outreach_reps table
  const [unlocked, setUnlocked] = useState(() =>
    localStorage.getItem('outreach_unlocked') === '1'
  )
  const [repSession, setRepSession] = useState(() => getRepSession())
  const [showOnboarding, setShowOnboarding] = useState(false)
  // Today's call tracking: lead_ids called by OTHER reps today, and this rep's own count
  const [calledTodayByOthers, setCalledTodayByOthers] = useState(() => new Set())
  const [todayRepCallCount, setTodayRepCallCount] = useState(0)
  // repBatch: null = initializing/unset, array of lead IDs = ready (may be empty)
  const [repBatch, setRepBatch] = useState(null)

  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterDay, setFilterDay] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRep, setFilterRep] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [view, setView] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 900 ? 'table' : 'cards'
  )

  const loadLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await sb
      .from('outreach_leads')
      .select('*')
      .order('need_score', { ascending: false })
      .order('company', { ascending: true })
    if (err) {
      setError(err.message)
    } else {
      // Re-order warmest-first (has a site) before NEED — see warmthCompare.
      setLeads([...(data || [])].sort(warmthCompare))
    }
    setLoading(false)
  }, [])

  // Load today's rep touchpoints so we can enforce the no-same-day-double-call rule.
  // Pure client-side: uses the anon key, consistent with the rest of this app's model.
  const loadTodayTouchpoints = useCallback(async (session) => {
    if (!session) return
    const today = todayStr()
    const { data } = await sb
      .from('outreach_touchpoints')
      .select('lead_id, rep_username')
      .eq('date', today)
      .eq('channel', 'call')
      .not('rep_username', 'is', null)
    if (!data) return
    const byOthers = new Set()
    let myCount = 0
    for (const row of data) {
      if (row.rep_username !== session.username) {
        byOthers.add(row.lead_id)
      } else {
        myCount++
      }
    }
    setCalledTodayByOthers(byOthers)
    setTodayRepCallCount(myCount)
  }, [])

  useEffect(() => {
    if (!unlocked && !repSession) return

    async function init() {
      setLoading(true)
      setError(null)

      // 1. Load all leads
      const { data: leadsData, error: leadsErr } = await sb
        .from('outreach_leads')
        .select('*')
        .order('need_score', { ascending: false })
        .order('company', { ascending: true })
      if (leadsErr) { setError(leadsErr.message); setLoading(false); return }
      const sortedLeads = [...(leadsData || [])].sort(warmthCompare)
      setLeads(sortedLeads)
      setLoading(false)

      if (repSession) {
        // 2. Load today's touchpoints
        const today = todayStr()
        const { data: touchData } = await sb
          .from('outreach_touchpoints')
          .select('lead_id, rep_username')
          .eq('date', today)
          .eq('channel', 'call')
          .not('rep_username', 'is', null)
        const byOthers = new Set()
        let myCount = 0
        for (const row of (touchData || [])) {
          if (row.rep_username !== repSession.username) byOthers.add(row.lead_id)
          else myCount++
        }
        setCalledTodayByOthers(byOthers)
        setTodayRepCallCount(myCount)

        // 3. Batch check / auto-assign (reps only, not admin)
        if (repSession.role === 'rep') {
          const { data: batchData } = await sb
            .from('outreach_rep_assignments')
            .select('lead_id')
            .eq('rep_username', repSession.username)
            .eq('is_current', true)
            .order('assigned_at', { ascending: true })
          if (batchData && batchData.length > 0) {
            // Existing batch: use it
            setRepBatch(batchData.map(r => r.lead_id))
          } else {
            // No active batch — auto-assign first 15 eligible leads
            const { data: otherBatches } = await sb
              .from('outreach_rep_assignments')
              .select('lead_id')
              .eq('is_current', true)
            const otherIds = new Set((otherBatches || []).map(r => r.lead_id))
            const eligible = sortedLeads.filter(l => {
              if (!repSession.trusted && (l.need_score || 0) >= 7) return false
              if (otherIds.has(l.id)) return false
              if (byOthers.has(l.id)) return false
              return true
            })
            const batch = eligible.slice(0, 15)
            if (batch.length > 0) {
              const rows = batch.map(l => ({
                rep_username: repSession.username,
                lead_id: l.id,
                batch_number: 1,
                is_current: true,
              }))
              await sb.from('outreach_rep_assignments').insert(rows)
            }
            setRepBatch(batch.map(l => l.id))
          }
        }

        // 4. Onboarding on first login
        if (repSession.role === 'rep' && !repOnboardingDone(repSession.username)) {
          setShowOnboarding(true)
        }
      }
    }

    init()
  }, [unlocked, repSession])

  const updateLead = useCallback(async (id, field, value) => {
    const { error: err } = await sb
      .from('outreach_leads')
      .update({ [field]: value })
      .eq('id', id)
    if (!err) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
    }
  }, [])

  // ── Admin filter + group (full view) ────────────────────────────────────────
  const filtered = leads.filter(l => {
    if (filterDay !== 'all' && String(l.day_route) !== filterDay) return false
    if (filterStatus !== 'all' && l.status !== filterStatus) return false
    if (filterRep !== 'all' && l.assigned_to !== filterRep) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (l.company || '').toLowerCase().includes(q) ||
        (l.contact_name || '').toLowerCase().includes(q) ||
        (l.city || '').toLowerCase().includes(q) ||
        (l.trade || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const days = filterDay === 'all' ? [1, 2, 3, 4, 5] : [Number(filterDay)]
  const groups = days.map(day => ({
    day,
    leads: filtered.filter(l => l.day_route === day),
  }))

  // ── Rep queue (batch-based) ──────────────────────────────────────────────────
  // Reps see only their current assigned batch of 15 leads, in assignment order.
  // repBatch is null while initializing, an array of lead IDs once ready.
  const repFiltered = repSession && repBatch !== null
    ? repBatch.map(id => leads.find(l => l.id === id)).filter(Boolean)
    : []

  // ── Auth gate ────────────────────────────────────────────────────────────────
  // Order: rep session > legacy admin unlock > login screen
  const isRepSession  = repSession !== null
  const isAdminUnlock = unlocked

  function handleLogin(session) {
    if (session.legacyAdmin) {
      // Old AOM2026 path: sets outreach_unlocked, shows full admin view
      setUnlocked(true)
    } else {
      setRepSession(session)
      // Onboarding check happens in useEffect via the repSession change
    }
  }

  function handleSignOut() {
    clearRepSession()
    setRepSession(null)
    setUnlocked(false)
    setShowOnboarding(false)
    setCalledTodayByOthers(new Set())
    setTodayRepCallCount(0)
  }

  if (!isAdminUnlock && !isRepSession) {
    return <RepLogin onLogin={handleLogin} />
  }

  // Onboarding shown after rep login, before they reach Call Mode
  if (isRepSession && repSession.role === 'rep' && showOnboarding) {
    return (
      <RepOnboarding
        repSession={repSession}
        onDone={() => setShowOnboarding(false)}
      />
    )
  }

  // ── Rep-restricted view ──────────────────────────────────────────────────────
  // Role=rep sees only Call Mode. No spreadsheet, no cards, no export, no filters.
  if (isRepSession && repSession.role === 'rep') {
    return (
      <div style={{ minHeight: '100dvh', background: '#F7F6F3', color: '#17170F', fontFamily: "'Inter', sans-serif" }}>
        <RepDashboardHeader
          repSession={repSession}
          todayCallCount={todayRepCallCount}
          onSignOut={handleSignOut}
          onRestartOnboarding={() => setShowOnboarding(true)}
        />

        {(loading || repBatch === null) && !error && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', fontSize: '0.85rem', color: '#A5A29A' }}>
            {loading ? 'Loading leads...' : 'Assigning your batch...'}
          </div>
        )}
        {error && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#B03A3A', fontSize: '0.85rem' }}>
            Error: {error}
          </div>
        )}
        {!loading && !error && repBatch !== null && (
          <CallMode
            leads={repFiltered}
            updateLead={updateLead}
            repSession={repSession}
            onCallLogged={() => setTodayRepCallCount(c => c + 1)}
          />
        )}
      </div>
    )
  }

  // ── Full admin view ───────────────────────────────────────────────────────────
  // Shown when: legacy outreach_unlocked flag OR rep with role=admin.
  // Exactly what existed before — no behavior change for existing admin users.
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F7F6F3',
      color: '#17170F',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Sticky header */}
      <DashboardHeader
        leads={leads}
        onLock={() => {
          handleSignOut()
        }}
      />

      {/* Filter bar — sticky below header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 99,
      }}>
        <FilterBar
          filterDay={filterDay}
          setFilterDay={setFilterDay}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterRep={filterRep}
          setFilterRep={setFilterRep}
          search={search}
          setSearch={setSearch}
        />
      </div>

      {/* View switcher — a discrete tab group. A future restricted-rep role can
          filter this VIEWS array (e.g. Call Mode only) without touching layout. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '0.4rem',
        padding: '0.45rem 1rem',
        borderBottom: '1px solid #E4E2DB',
        background: '#F1EFEA',
      }}>
        {['table', 'cards', 'call', 'team'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.3rem 0.7rem',
              cursor: 'pointer',
              background: view === v ? '#B58A38' : '#FFFFFF',
              color: view === v ? '#17170F' : '#43423A',
              border: view === v ? '1px solid #B58A38' : '1px solid #D3D0C7',
              fontWeight: view === v ? 700 : 400,
            }}
          >
            {v === 'table' ? 'Spreadsheet' : v === 'cards' ? 'Cards' : v === 'call' ? '📞 Call Mode' : 'Team'}
          </button>
        ))}
      </div>

      <CriteriaStrip />

      {/* Content */}
      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.85rem',
          color: '#A5A29A',
        }}>
          Loading leads...
        </div>
      )}

      {error && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: '#B03A3A',
          fontSize: '0.85rem',
        }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && view === 'table' && (
        <LeadTable
          leads={filtered}
          expandedId={expandedId}
          onToggle={id => setExpandedId(expandedId === id ? null : id)}
          onUpdate={(id, field, value) => updateLead(id, field, value)}
        />
      )}

      {!loading && !error && view === 'cards' && groups.map(({ day, leads: dayLeads }) => (
        <div key={day}>
          {/* Day group header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: '#F1EFEA',
            borderBottom: '1px solid #E4E2DB',
            borderTop: day !== (days[0]) ? '2px solid #E4E2DB' : '1px solid #E4E2DB',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            gap: '0.5rem',
          }}>
            <div>
              <div style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: '0.75rem',
                color: '#8A6828',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.1rem',
              }}>
                {DAY_LABELS[day]}
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.65rem',
                color: '#77746A',
              }}>
                {dayLeads.length} lead{dayLeads.length !== 1 ? 's' : ''}
              </div>
            </div>
            {dayLeads.length > 0 && buildMapsURL(dayLeads) && (
              <a
                href={buildMapsURL(dayLeads)}
                target="_blank"
                rel="noreferrer"
                style={{
                  flexShrink: 0,
                  background: 'transparent',
                  border: '1px solid #B58A38',
                  color: '#8A6828',
                  padding: '0.4rem 0.65rem',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 36,
                  lineHeight: 'normal',
                  boxSizing: 'border-box',
                }}
              >
                Open Route
              </a>
            )}
          </div>

          {/* Lead cards */}
          {dayLeads.length === 0 ? (
            <div style={{
              padding: '1.5rem 1rem',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.8rem',
              color: '#A5A29A',
              borderBottom: '1px solid #E4E2DB',
            }}>
              No leads match the current filters.
            </div>
          ) : (
            dayLeads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                expanded={expandedId === lead.id}
                onToggle={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                onUpdate={(field, value) => updateLead(lead.id, field, value)}
              />
            ))
          )}
        </div>
      ))}

      {!loading && !error && view === 'call' && (
        <CallMode
          leads={filtered}
          updateLead={updateLead}
          repSession={repSession}
        />
      )}

      {view === 'team' && (
        <AdminTeamView leads={leads} />
      )}

      {/* Import note at bottom */}
      {!loading && !error && (
        <div style={{
          padding: '2rem 1rem',
          borderTop: '1px solid #E4E2DB',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.7rem',
          color: '#A5A29A',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          Batch 1 — 20 leads loaded.
          <br />
          To load aom-construction-master.csv: run{' '}
          <code style={{ color: '#77746A', fontFamily: 'monospace' }}>
            scripts/import-outreach-leads.py
          </code>
        </div>
      )}
    </div>
  )
}
