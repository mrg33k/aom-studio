import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// ─── RESPONSIVE HOOK ─────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'aomhq'

// Dark Frame v4 palette
const C = {
  bg: '#0C0C0C',
  card: '#151515',
  cardHover: '#1A1A1A',
  surface: '#1E1E1E',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.15)',
  orange: '#E85D26',
  orangeHover: '#FF6B2B',
  orangeMuted: 'rgba(232,93,38,0.12)',
  cream: '#FAF7F2',
  creamMuted: '#A8A29E',
  green: '#22c55e',
  greenMuted: 'rgba(34,197,94,0.1)',
  yellow: '#eab308',
  yellowMuted: 'rgba(234,179,8,0.1)',
  red: '#ef4444',
  redMuted: 'rgba(239,68,68,0.1)',
  blue: '#60a5fa',
  blueMuted: 'rgba(96,165,250,0.1)',
  purple: '#a78bfa',
  textPrimary: '#F5F0EB',
  textSecondary: '#A8A29E',
  textMuted: '#78716C',
  textDim: '#44403C',
}

const AGENT_COLORS = {
  Bobby: C.orange, Jacob: C.blue, Alex: C.purple, Cleo: '#f472b6',
  Steffen: '#34d399', Mom: C.red, Paige: '#06b6d4', Tony: '#a3e635',
  Elon: '#8b8b8b', Steve: '#facc15', Patrik: '#fff',
}

// ─── GITHUB API ───────────────────────────────────────────────────────────────
async function fetchFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  const raw = atob(data.content.replace(/\n/g, ''))
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// ─── PARSERS ──────────────────────────────────────────────────────────────────

function parseEmailStatus(md) {
  if (!md) return { unreadCount: 0, actionable: [], watched: [] }
  const lines = md.split('\n')
  const actionable = []
  const watched = []
  let inInbox = false
  let inWatched = false
  let unreadCount = 0

  for (const line of lines) {
    if (line.includes('Inbox Last 24h')) { inInbox = true; inWatched = false; continue }
    if (line.includes('Watched Threads')) { inWatched = true; inInbox = false; continue }
    if (line.startsWith('## ') && !line.includes('Inbox') && !line.includes('Watched')) {
      inInbox = false; inWatched = false; continue
    }

    if (inInbox && line.startsWith('- ')) {
      const isNew = /\*\*\[NEW\]\*\*|\[NEW\]/.test(line)
      if (isNew) unreadCount++
      const match = line.match(/\[([^\]]+)\]\s*(.+?)\s*--\s*(.+?)(?:\s*\*\*\[NEW\]\*\*|\s*$)/)
      if (match) {
        const sender = match[2].trim()
        const subject = match[3].replace(/\*\*\[NEW\]\*\*/g, '').trim()
        const time = match[1].trim()
        // Filter out newsletters/spam
        const isSpam = /apollo|clickup|artlist|similarweb|claude team|mail delivery/i.test(sender)
        if (!isSpam) {
          actionable.push({ sender, subject, time, isNew })
        }
      }
    }

    if (inWatched && line.startsWith('|') && !line.startsWith('|--') && !line.startsWith('| Thread')) {
      const cols = line.split('|').map(s => s.trim()).filter(Boolean)
      if (cols.length >= 4) {
        watched.push({ thread: cols[0], from: cols[1], when: cols[2], snippet: cols[3] })
      }
    }
  }

  return { unreadCount, actionable: actionable.slice(0, 5), watched }
}

function parsePrioritiesV2(md) {
  if (!md) return { asap: [], today: [], thisWeek: [], agentStatus: [] }
  const lines = md.split('\n')
  const asap = []
  const today = []
  const thisWeek = []
  const agentStatus = []
  let section = ''

  for (const line of lines) {
    if (line.startsWith('## ASAP')) { section = 'asap'; continue }
    if (line.startsWith('## TODAY') || line.startsWith('## Today')) { section = 'today'; continue }
    if (line.startsWith('## THIS WEEK') || line.startsWith('## This Week')) { section = 'thisweek'; continue }
    if (line.startsWith('## AGENTS')) { section = 'agents'; continue }
    if (line.startsWith('## LATEST WINS')) { section = 'wins'; continue }
    if (line.startsWith('## ACTIVE RIGHT NOW')) { section = 'active'; continue }
    if (line.startsWith('## HORIZON')) { section = 'horizon'; continue }
    if (line.startsWith('## PIPELINE')) { section = 'pipeline'; continue }
    if (line.startsWith('## ')) { section = ''; continue }

    // Parse numbered items
    const numbered = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[-:]?\s*(.*)/)
    if (numbered) {
      const item = { label: numbered[1], desc: numbered[2].replace(/\[.*?\]/g, '').trim() }
      if (section === 'asap') asap.push(item)
      else if (section === 'today') today.push(item)
      else if (section === 'thisweek') thisWeek.push(item)
      continue
    }

    // Parse simple list items for today and this week
    if ((section === 'today' || section === 'thisweek') && line.startsWith('- ')) {
      const text = line.replace(/^-\s+/, '').trim()
      if (text) {
        const target = section === 'today' ? today : thisWeek
        // Try to split on first colon or double-dash for label/desc
        const split = text.match(/^(.+?)(?:\s*[-:]+\s*)(.+)$/)
        if (split) {
          target.push({ label: split[1].trim(), desc: split[2].trim() })
        } else {
          target.push({ label: text, desc: '' })
        }
      }
    }

    // Parse agent status table
    if (section === 'agents' && line.startsWith('|') && !line.startsWith('|--') && !line.startsWith('| Agent')) {
      const cols = line.split('|').map(s => s.trim()).filter(Boolean)
      if (cols.length >= 3) {
        agentStatus.push({ name: cols[0], status: cols[1], next: cols[2] })
      }
    }
  }

  return { asap, today, thisWeek, agentStatus }
}

function parsePunchList(md) {
  const items = []
  let currentCategory = 'Misc'
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) { currentCategory = line.replace('## ', '').trim(); continue }
    const checkbox = line.match(/^\s*- \[([ xX])\]\s*(.+)/)
    if (!checkbox) continue
    const done = checkbox[1].toLowerCase() === 'x'
    const text = checkbox[2].trim()
    items.push({ id: `punch-${items.length}`, text, done, category: currentCategory })
  }
  return items
}

function parseAgentResults(md) {
  if (!md) return []
  const results = []
  const lines = md.split('\n')
  for (const line of lines) {
    const match = line.match(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|/)
    if (match) {
      results.push({ date: match[1], action: match[2].trim() })
    }
  }
  return results.reverse().slice(0, 5)
}

function parseActionsLog(md) {
  if (!md) return []
  return md.split('\n').filter(l => l.startsWith('- ')).slice(-15).reverse()
    .map(l => {
      const text = l.replace(/^- /, '').trim()
      const dateMatch = text.match(/\[(\d{4}-\d{2}-\d{2}[^\]]*)\]/)
      return { text: dateMatch ? text.replace(dateMatch[0], '').trim() : text, date: dateMatch ? dateMatch[1] : '' }
    })
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    timeZone: 'America/Phoenix'
  })
}

function getTimeAz() {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Phoenix'
  })
}

// ─── AGENTS CONFIG ────────────────────────────────────────────────────────────
const AGENTS_CONFIG = [
  { name: 'Bobby', role: 'Web Dev', agentFile: 'projects/bobby/AGENT.md' },
  { name: 'Jacob', role: 'Outreach & Pipeline', agentFile: 'projects/jacob/AGENT.md' },
  { name: 'Alex', role: 'Deal Architect', agentFile: 'projects/aom-strategy/AGENT.md' },
  { name: 'Cleo', role: 'Content & Video', agentFile: 'projects/content-agent/AGENT.md' },
  { name: 'Mom', role: 'Operations', agentFile: 'projects/mom/AGENT.md' },
  { name: 'Steffen', role: 'Brand & Design', agentFile: null },
  { name: 'Paige', role: 'Client Success', agentFile: 'projects/paige/AGENT.md' },
  { name: 'Tony', role: 'Social Media', agentFile: 'projects/tony/AGENT.md' },
  { name: 'Elon', role: 'Systems', agentFile: 'projects/sys/AGENT.md' },
  { name: 'Steve', role: 'AI Advisory Lead', agentFile: 'projects/steve/AGENT.md' },
]

const REFRESH_INTERVAL = 30000

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────

function AgentDot({ name, size = 28 }) {
  const color = AGENT_COLORS[name] || '#888'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}18`, border: `1.5px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(size * 0.38, 12), fontWeight: 800, color, flexShrink: 0,
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
    }}>
      {name[0]}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    Active: { color: C.green, bg: C.greenMuted },
    Idle: { color: C.textMuted, bg: 'rgba(255,255,255,0.04)' },
    Done: { color: C.green, bg: C.greenMuted },
    Blocked: { color: C.red, bg: C.redMuted },
    'Done (waiting)': { color: C.yellow, bg: C.yellowMuted },
    'Semi-active': { color: C.blue, bg: C.blueMuted },
    Available: { color: C.textMuted, bg: 'rgba(255,255,255,0.04)' },
    UNBLOCKED: { color: C.green, bg: C.greenMuted },
  }
  const c = map[status] || map.Idle
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
      color: c.color, background: c.bg,
      borderRadius: 4, padding: '3px 8px', textTransform: 'uppercase',
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
    }}>
      {status}
    </span>
  )
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)

  const attempt = () => {
    if (input === DASHBOARD_PASSWORD) { localStorage.setItem('aom_ops_auth', '1'); onAuth() }
    else { setShake(true); setInput(''); setTimeout(() => setShake(false), 600) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      background: C.bg, fontFamily: '"Space Grotesk", system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{
          fontSize: 12, letterSpacing: '0.3em', color: C.orange,
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
          fontFamily: 'Syne, system-ui, sans-serif',
        }}>AOM</div>
        <div style={{
          fontSize: 28, fontWeight: 800, color: C.cream, letterSpacing: '-0.02em',
          fontFamily: 'Syne, system-ui, sans-serif',
        }}>Command Center</div>
        <div style={{ fontSize: 14, color: C.textMuted, marginTop: 8 }}>
          Your AI operations dashboard
        </div>
      </div>
      <div style={{
        transform: shake ? 'translateX(8px)' : 'translateX(0)',
        transition: shake ? 'transform 0.1s ease' : 'transform 0.3s ease',
        display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: 280,
      }}>
        <input
          autoFocus type="password" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          placeholder="access code"
          style={{
            background: C.card, border: `1px solid ${shake ? C.red : C.border}`,
            borderRadius: 2, color: C.cream, fontSize: 16, padding: '14px 20px',
            outline: 'none', width: '100%', textAlign: 'center', letterSpacing: '0.12em',
            transition: 'border-color 0.15s', fontFamily: '"Space Grotesk", monospace',
          }}
        />
        <button
          onClick={attempt}
          style={{
            background: C.orange, color: '#fff', border: 'none', borderRadius: 2,
            padding: '12px 28px', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em',
            cursor: 'pointer', textTransform: 'uppercase', width: '100%',
            fontFamily: 'Syne, system-ui, sans-serif',
          }}
        >
          Enter
        </button>
      </div>
    </div>
  )
}

// ─── MORNING BRIEFING CARD ────────────────────────────────────────────────────
function MorningBriefing({ priorities, emails, agentStatus, isMobile }) {
  const greeting = getGreeting()
  const dateStr = formatDate()
  const timeStr = getTimeAz()

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 2,
      padding: isMobile ? 16 : 32, marginBottom: isMobile ? 16 : 24,
      boxSizing: 'border-box', width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <div style={{
          fontSize: 12, letterSpacing: '0.25em', color: C.orange,
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
          fontFamily: 'Syne, system-ui, sans-serif',
        }}>
          {dateStr}
        </div>
        <div style={{
          fontSize: isMobile ? 26 : 32, fontWeight: 800, color: C.cream,
          letterSpacing: '-0.02em', lineHeight: 1.1,
          fontFamily: 'Syne, system-ui, sans-serif',
        }}>
          {greeting}.
        </div>
        <div style={{
          fontSize: 16, color: C.textSecondary, marginTop: 8, lineHeight: 1.5,
          fontFamily: '"Space Grotesk", system-ui, sans-serif',
        }}>
          Here's what needs your attention.
        </div>
      </div>

      {/* Grid: Priorities + Emails side by side on desktop, stacked on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? 20 : 24,
      }}>

        {/* Top Priorities */}
        <div>
          <div style={{
            fontSize: 12, letterSpacing: '0.2em', color: C.textMuted,
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 12,
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
          }}>
            Top Priorities
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {priorities.asap.slice(0, 5).map((p, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '12px 14px', background: i === 0 ? 'rgba(232,93,38,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${i === 0 ? 'rgba(232,93,38,0.15)' : C.border}`,
                borderRadius: 2, minWidth: 0,
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 2, flexShrink: 0,
                  background: i === 0 ? C.orangeMuted : 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: i === 0 ? C.orange : C.textMuted,
                  fontFamily: 'Syne, system-ui, sans-serif',
                }}>{i + 1}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 15, fontWeight: 600, color: C.cream, lineHeight: 1.3,
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    overflowWrap: 'break-word', wordBreak: 'break-word',
                  }}>{p.label}</div>
                  {p.desc && (
                    <div style={{
                      fontSize: 14, color: C.textMuted, marginTop: 4, lineHeight: 1.4,
                      fontFamily: '"Space Grotesk", system-ui, sans-serif',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>{p.desc}</div>
                  )}
                </div>
              </div>
            ))}
            {priorities.asap.length === 0 && (
              <div style={{ fontSize: 14, color: C.textMuted, padding: '12px 0' }}>
                No urgent priorities right now.
              </div>
            )}
          </div>
        </div>

        {/* Emails */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 12, letterSpacing: '0.2em', color: C.textMuted,
              textTransform: 'uppercase', fontWeight: 700,
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
            }}>
              Email
            </div>
            {emails.unreadCount > 0 && (
              <span style={{
                fontSize: 12, fontWeight: 700, color: C.orange,
                background: C.orangeMuted, borderRadius: 10, padding: '2px 8px',
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
              }}>
                {emails.unreadCount} unread
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {emails.actionable.map((e, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '10px 14px',
                background: e.isNew ? 'rgba(232,93,38,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${e.isNew ? 'rgba(232,93,38,0.1)' : C.border}`,
                borderRadius: 2,
              }}>
                {e.isNew && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', background: C.orange,
                    flexShrink: 0, marginTop: 7,
                  }} />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 14, fontWeight: e.isNew ? 600 : 400, color: C.cream,
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{e.sender}</div>
                  <div style={{
                    fontSize: 14, color: C.textMuted, marginTop: 2,
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{e.subject}</div>
                </div>
                <span style={{
                  fontSize: 12, color: C.textDim, flexShrink: 0,
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                }}>{e.time}</span>
              </div>
            ))}
            {emails.actionable.length === 0 && (
              <div style={{ fontSize: 14, color: C.textMuted, padding: '12px 0' }}>
                Inbox is clear.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TASK DASHBOARD ───────────────────────────────────────────────────────────
function TaskDashboard({ priorities, isMobile }) {
  const todayItems = priorities.today || []
  const weekItems = priorities.thisWeek || []

  if (todayItems.length === 0 && weekItems.length === 0) return null

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 2,
      padding: isMobile ? 16 : 32, marginBottom: isMobile ? 16 : 24,
      boxSizing: 'border-box', width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 12, letterSpacing: '0.2em', color: C.textMuted,
        textTransform: 'uppercase', fontWeight: 700, marginBottom: 16,
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
      }}>
        Active Work
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: isMobile ? 20 : 24,
      }}>
        {/* Today */}
        {todayItems.length > 0 && (
          <div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.cream, marginBottom: 10,
              fontFamily: 'Syne, system-ui, sans-serif', textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>Today</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {todayItems.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${C.border}`, borderRadius: 2,
                  minWidth: 0,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: C.orange,
                    flexShrink: 0, marginTop: 7,
                  }} />
                  <div style={{
                    fontSize: 14, color: C.textPrimary, lineHeight: 1.4,
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word',
                  }}>
                    {item.label}
                    {item.desc && (
                      <span style={{ color: C.textMuted }}> {item.desc}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* This Week */}
        {weekItems.length > 0 && (
          <div>
            <div style={{
              fontSize: 12, fontWeight: 700, color: C.cream, marginBottom: 10,
              fontFamily: 'Syne, system-ui, sans-serif', textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>This Week</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {weekItems.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${C.border}`, borderRadius: 2,
                  minWidth: 0,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: C.textDim,
                    flexShrink: 0, marginTop: 7,
                  }} />
                  <div style={{
                    fontSize: 14, color: C.textPrimary, lineHeight: 1.4,
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word',
                  }}>
                    {item.label}
                    {item.desc && (
                      <span style={{ color: C.textMuted }}> {item.desc}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AGENT ACTIVITY FEED ──────────────────────────────────────────────────────
function AgentActivityFeed({ agentStatus, agentResults, actions, isMobile }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 2,
      padding: isMobile ? 16 : 32, marginBottom: isMobile ? 16 : 24,
      boxSizing: 'border-box', width: '100%', maxWidth: '100%', minWidth: 0, overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 12, letterSpacing: '0.2em', color: C.textMuted,
        textTransform: 'uppercase', fontWeight: 700, marginBottom: 16,
        fontFamily: '"Space Grotesk", system-ui, sans-serif',
      }}>
        Agent Activity
      </div>

      {/* Agent Status Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 10, marginBottom: 20,
      }}>
        {agentStatus.filter(a => a.status !== 'Idle' && a.status !== 'Available').map((agent, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, alignItems: 'center',
            padding: '12px 14px', background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${C.border}`, borderRadius: 2,
          }}>
            <AgentDot name={agent.name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 14, fontWeight: 600, color: C.cream,
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                }}>{agent.name}</span>
                <StatusBadge status={agent.status} />
              </div>
              <div style={{
                fontSize: 14, color: C.textMuted, marginTop: 3, lineHeight: 1.3,
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflowWrap: 'break-word', wordBreak: 'break-word',
              }}>{agent.next}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Idle agents compact row */}
      {agentStatus.filter(a => a.status === 'Idle' || a.status === 'Available').length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20,
          padding: '12px 14px', background: 'rgba(255,255,255,0.015)',
          border: `1px solid ${C.border}`, borderRadius: 2,
        }}>
          <span style={{
            fontSize: 12, color: C.textDim, fontWeight: 600, letterSpacing: '0.1em',
            textTransform: 'uppercase', alignSelf: 'center', marginRight: 4,
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
          }}>Idle:</span>
          {agentStatus.filter(a => a.status === 'Idle' || a.status === 'Available').map((agent, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <AgentDot name={agent.name} size={26} />
              <span style={{
                fontSize: 14, color: C.textDim,
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
              }}>{agent.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Actions Log */}
      {actions.length > 0 && (
        <div>
          <div style={{
            fontSize: 12, letterSpacing: '0.15em', color: C.textDim,
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 10,
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
          }}>
            Recent Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {actions.slice(0, 8).map((item, i) => (
              <div key={i} style={{
                padding: '8px 0', borderBottom: `1px solid ${C.border}`,
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  flexShrink: 0, marginTop: 7, background: C.textDim,
                }} />
                <div style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                  {item.date && (
                    <span style={{
                      fontSize: 12, color: C.textDim, marginRight: 8,
                      fontFamily: '"Space Grotesk", system-ui, sans-serif',
                    }}>{item.date}</span>
                  )}
                  <span style={{
                    fontSize: 14, color: C.textSecondary, lineHeight: 1.4,
                    fontFamily: '"Space Grotesk", system-ui, sans-serif',
                  }}>{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CHAT PANEL ───────────────────────────────────────────────────────────────
function ChatPanel({ isMobile, onRefresh }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    setExpanded(true)

    setMessages(m => [...m, { role: 'user', text }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', message: text, agent: 'All' }),
      })
      const data = await res.json()
      if (data.error) {
        setMessages(m => [...m, { role: 'system', text: data.error, isError: true }])
      } else {
        setMessages(m => [...m, { role: 'assistant', text: data.reply || 'No response.', agent: data.agent || 'System' }])
        if (data.actions_taken?.length > 0) setTimeout(onRefresh, 2000)
      }
    } catch {
      setMessages(m => [...m, { role: 'system', text: 'Network error.', isError: true }])
    }
    setSending(false)
  }

  const addTask = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    setExpanded(true)

    setMessages(m => [...m, { role: 'user', text: `+ ${text}` }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_task', task: text }),
      })
      const data = await res.json()
      if (data.ok) {
        const msg = data.assignedAgent ? `Task added. Assigned to ${data.assignedAgent}.` : 'Task added.'
        setMessages(m => [...m, { role: 'system', text: msg, isSuccess: true }])
        setTimeout(onRefresh, 2000)
      } else {
        setMessages(m => [...m, { role: 'system', text: data.error || 'Failed to add.', isError: true }])
      }
    } catch {
      setMessages(m => [...m, { role: 'system', text: 'Network error.', isError: true }])
    }
    setSending(false)
  }

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 2,
      marginBottom: isMobile ? 16 : 24, overflow: 'hidden',
      boxSizing: 'border-box', width: '100%', maxWidth: '100%', minWidth: 0,
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '14px 16px' : '14px 32px', cursor: 'pointer',
          borderBottom: expanded ? `1px solid ${C.border}` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontSize: 12, letterSpacing: '0.2em', color: C.textMuted,
            textTransform: 'uppercase', fontWeight: 700,
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
          }}>
            System Chat
          </div>
          {messages.length > 0 && (
            <span style={{
              fontSize: 12, color: C.orange, background: C.orangeMuted,
              borderRadius: 10, padding: '1px 7px', fontWeight: 700,
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
            }}>
              {messages.length}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 12, color: C.textDim, transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>&#9660;</span>
      </div>

      {/* Messages */}
      {expanded && messages.length > 0 && (
        <div style={{
          maxHeight: 320, overflowY: 'auto',
          padding: isMobile ? '12px 16px' : '12px 32px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
            }}>
              {m.role === 'assistant' && <AgentDot name={m.agent || 'System'} size={22} />}
              <div style={{
                maxWidth: '85%', padding: '10px 14px', borderRadius: 2,
                fontSize: 14, lineHeight: 1.5,
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                background: m.role === 'user' ? C.orangeMuted
                  : m.isError ? C.redMuted
                  : m.isSuccess ? C.greenMuted
                  : 'rgba(255,255,255,0.03)',
                color: m.role === 'user' ? '#ffb38a'
                  : m.isError ? '#fca5a5'
                  : m.isSuccess ? '#86efac'
                  : C.textSecondary,
                border: `1px solid ${m.role === 'user' ? 'rgba(232,93,38,0.2)' : C.border}`,
                whiteSpace: 'pre-wrap',
              }}>
                {m.role === 'assistant' && (
                  <div style={{
                    fontSize: 12, color: AGENT_COLORS[m.agent] || C.textMuted,
                    fontWeight: 700, marginBottom: 4, letterSpacing: '0.06em',
                  }}>{m.agent}</div>
                )}
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <AgentDot name="Bobby" size={22} />
              <div style={{
                padding: '10px 14px', borderRadius: 2,
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`,
              }}>
                <span style={{
                  fontSize: 14, color: C.textDim, letterSpacing: '0.06em',
                  fontFamily: '"Space Grotesk", system-ui, sans-serif',
                }}>thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: isMobile ? '10px 12px' : '12px 32px',
        borderTop: expanded && messages.length > 0 ? `1px solid ${C.border}` : 'none',
        boxSizing: 'border-box', width: '100%', minWidth: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={isMobile ? "Message..." : "Ask a question or add a task..."}
          style={{
            flex: 1, minWidth: 0, background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 2, color: C.cream, fontSize: 15, padding: isMobile ? '10px 12px' : '12px 16px',
            outline: 'none', fontFamily: '"Space Grotesk", system-ui, sans-serif',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={addTask}
          disabled={!input.trim() || sending}
          title="Add as task"
          style={{
            background: C.greenMuted, color: C.green, border: `1px solid rgba(34,197,94,0.2)`,
            borderRadius: 2, padding: isMobile ? '10px 10px' : '12px 14px', fontSize: 12, fontWeight: 800,
            letterSpacing: '0.04em', cursor: input.trim() ? 'pointer' : 'default',
            opacity: input.trim() ? 1 : 0.3, textTransform: 'uppercase',
            fontFamily: 'Syne, system-ui, sans-serif', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          +
        </button>
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            background: C.orange, color: '#fff', border: 'none',
            borderRadius: 2, padding: isMobile ? '10px 14px' : '12px 18px', fontSize: 12, fontWeight: 800,
            letterSpacing: '0.08em', cursor: input.trim() ? 'pointer' : 'default',
            opacity: input.trim() ? 1 : 0.3, textTransform: 'uppercase',
            fontFamily: 'Syne, system-ui, sans-serif', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {sending ? '...' : 'SEND'}
        </button>
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const isMobile = useIsMobile()
  const [authed, setAuthed] = useState(() => localStorage.getItem('aom_ops_auth') === '1')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState(null)
  const [refreshProgress, setRefreshProgress] = useState(0)
  const progressRef = useRef(null)

  const load = useCallback(async () => {
    if (!GITHUB_TOKEN) { setData(null); return }
    setLoading(true)
    setRefreshProgress(0)
    try {
      const [prioritiesMd, punchMd, actionsMd, emailMd, ...agentMds] = await Promise.all([
        fetchFile('context/current-priorities.md'),
        fetchFile('punch-list.md'),
        fetchFile('context/actions-log.md'),
        fetchFile('context/email-status.md'),
        ...AGENTS_CONFIG.map(a => a.agentFile ? fetchFile(a.agentFile) : Promise.resolve(null)),
      ])

      const priorities = parsePrioritiesV2(prioritiesMd)
      const emails = parseEmailStatus(emailMd)
      const punchItems = punchMd ? parsePunchList(punchMd) : []
      const actions = parseActionsLog(actionsMd)
      const agentResults = AGENTS_CONFIG.map((a, i) => ({
        name: a.name,
        role: a.role,
        results: agentMds[i] ? parseAgentResults(agentMds[i]) : [],
      }))

      const openCount = punchItems.filter(p => !p.done).length
      const doneCount = punchItems.filter(p => p.done).length

      setData({ priorities, emails, punchItems, actions, agentResults, openCount, doneCount })
      setLastFetched(new Date())
    } finally { setLoading(false) }
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!authed) return
    load()

    let startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / REFRESH_INTERVAL, 1)
      setRefreshProgress(progress)
      if (progress >= 1) {
        load().then(() => {
          startTime = Date.now()
          setRefreshProgress(0)
        })
      }
      progressRef.current = requestAnimationFrame(tick)
    }
    progressRef.current = requestAnimationFrame(tick)

    return () => {
      if (progressRef.current) cancelAnimationFrame(progressRef.current)
    }
  }, [authed, load])

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      width: '100%', maxWidth: '100vw', overflowX: 'hidden',
    }}>
      {/* Noise texture overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        mixBlendMode: 'overlay',
      }} />

      {/* Refresh progress bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2, zIndex: 300,
      }}>
        <div style={{
          height: '100%', width: `${refreshProgress * 100}%`,
          background: `${C.orange}40`,
          transition: refreshProgress === 0 ? 'none' : 'width 0.3s linear',
        }} />
      </div>

      {/* Top bar */}
      <header style={{
        borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? '0 16px' : '0 32px',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: C.bg, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{
            fontSize: 13, fontWeight: 800, letterSpacing: '0.2em', color: C.cream,
            textTransform: 'uppercase', fontFamily: 'Syne, system-ui, sans-serif',
          }}>AOM</span>
          {!isMobile && (
            <span style={{
              fontSize: 12, letterSpacing: '0.15em', color: C.orange, fontWeight: 700,
              textTransform: 'uppercase', fontFamily: 'Syne, system-ui, sans-serif',
            }}>Command Center</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          {loading && (
            <span style={{
              fontSize: 12, color: C.textDim, letterSpacing: '0.06em',
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
            }}>syncing...</span>
          )}
          {lastFetched && !loading && (
            <span style={{
              fontSize: 12, color: C.textDim,
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
            }}>
              {lastFetched.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' })}
            </span>
          )}
          {data && !isMobile && (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{
                  fontSize: 16, fontWeight: 800, color: C.cream,
                  fontFamily: 'Syne, system-ui, sans-serif',
                }}>{data.openCount}</span>
                <span style={{
                  fontSize: 12, color: C.textDim, letterSpacing: '0.08em',
                  textTransform: 'uppercase', fontFamily: '"Space Grotesk", system-ui, sans-serif',
                }}>open</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{
                  fontSize: 16, fontWeight: 800, color: C.green,
                  fontFamily: 'Syne, system-ui, sans-serif',
                }}>{data.doneCount}</span>
                <span style={{
                  fontSize: 12, color: C.textDim, letterSpacing: '0.08em',
                  textTransform: 'uppercase', fontFamily: '"Space Grotesk", system-ui, sans-serif',
                }}>done</span>
              </div>
            </div>
          )}
          <button
            onClick={load}
            style={{
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
              borderRadius: 2, color: C.textMuted, fontSize: 12, padding: isMobile ? '8px 10px' : '8px 14px',
              cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 700,
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
              textTransform: 'uppercase',
            }}
          >
            {isMobile ? '↻' : 'Refresh'}
          </button>
          <button
            onClick={() => { localStorage.removeItem('aom_ops_auth'); setAuthed(false) }}
            style={{
              background: 'none', border: `1px solid ${C.border}`,
              borderRadius: 2, color: C.textDim, fontSize: 16,
              cursor: 'pointer', width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Log out"
          >
            &#8599;
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{
        maxWidth: isMobile ? '100%' : 960, margin: '0 auto',
        padding: isMobile ? '16px 16px 80px' : '28px 32px 60px',
        position: 'relative', zIndex: 1,
        boxSizing: 'border-box', width: '100%', overflow: 'hidden',
      }}>
        {/* No token state */}
        {!GITHUB_TOKEN && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '60vh', gap: 16, textAlign: 'center',
          }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: C.cream,
              fontFamily: 'Syne, system-ui, sans-serif',
            }}>VITE_GITHUB_TOKEN not set</div>
            <div style={{
              fontSize: 14, color: C.textMuted, lineHeight: 1.7, maxWidth: 400,
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
            }}>
              Add VITE_GITHUB_TOKEN to your Vercel environment variables, then redeploy and reload this page.
            </div>
          </div>
        )}

        {/* Morning Briefing */}
        {GITHUB_TOKEN && data && (
          <MorningBriefing
            priorities={data.priorities}
            emails={data.emails}
            agentStatus={data.priorities.agentStatus}
            isMobile={isMobile}
          />
        )}

        {/* Task Dashboard */}
        {GITHUB_TOKEN && data && (
          <TaskDashboard priorities={data.priorities} isMobile={isMobile} />
        )}

        {/* Agent Activity */}
        {GITHUB_TOKEN && data && (
          <AgentActivityFeed
            agentStatus={data.priorities.agentStatus}
            agentResults={data.agentResults}
            actions={data.actions}
            isMobile={isMobile}
          />
        )}

        {/* System Chat */}
        {GITHUB_TOKEN && (
          <ChatPanel isMobile={isMobile} onRefresh={load} />
        )}

        {/* Loading state */}
        {GITHUB_TOKEN && !data && loading && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '60vh', gap: 16,
          }}>
            <div style={{
              width: 40, height: 40, border: `2px solid ${C.border}`,
              borderTopColor: C.orange, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{
              fontSize: 14, color: C.textMuted,
              fontFamily: '"Space Grotesk", system-ui, sans-serif',
            }}>Loading your dashboard...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}
      </main>
    </div>
  )
}
