import React, { useState, useEffect, useCallback } from 'react'

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD

const ORANGE = '#FF4F00'
const GREEN = '#22c55e'
const YELLOW = '#eab308'
const RED = '#ef4444'
const BLUE = '#60a5fa'

// ─── GITHUB API ───────────────────────────────────────────────────────────────
async function fetchFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return { content: atob(data.content.replace(/\n/g, '')), sha: data.sha }
}

// ─── MARKDOWN UTILS ───────────────────────────────────────────────────────────
function parseSection(md, header) {
  const lines = md.split('\n')
  let inSection = false
  const result = []
  for (const line of lines) {
    if (line.match(new RegExp(`^#{1,3}\\s+${header}`, 'i'))) { inSection = true; continue }
    if (inSection && line.match(/^#{1,3}\s+/)) break
    if (inSection) result.push(line)
  }
  return result.join('\n').trim()
}

function parseCheckboxItems(md) {
  return md.split('\n')
    .filter(l => l.match(/^\s*- \[[ xX]\]/))
    .map(l => ({
      done: /\[x\]/i.test(l),
      text: l.replace(/^\s*- \[[ xX]\]\s*/, '').replace(/\s*--.*$/, '').trim(),
      note: (l.match(/--\s*(.+)$/) || [])[1] || '',
      deadline: /HARD DEADLINE/i.test(l),
    }))
}

function parsePriorities(md) {
  return md.split('\n')
    .filter(l => /^\d+\.\s+\*\*/.test(l))
    .map(l => {
      const match = l.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[-—]?\s*(.*)/)
      return match ? { label: match[1], desc: match[2] } : null
    })
    .filter(Boolean)
}

function parseAgentLog(md) {
  const lines = md.split('\n')
  const tableRows = lines.filter(l => l.match(/^\|\s*\d{4}-\d{2}-\d{2}/))
  if (tableRows.length === 0) return null
  const latest = tableRows[tableRows.length - 1]
  const cols = latest.split('|').map(s => s.trim()).filter(Boolean)
  return { date: cols[0], action: cols[1], notes: cols[2] || '' }
}

function inferAgentStatus(md) {
  const lower = md.toLowerCase()
  if (/holding|blocked|waiting on/i.test(md)) return 'hold'
  if (/complete|done|pushed|shipped/i.test(md.slice(-800))) return 'idle'
  return 'idle'
}

function extractHandoff(md) {
  const sections = []
  let current = null
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { title: line.replace('## ', ''), lines: [] }
    } else if (current && line.trim()) {
      current.lines.push(line)
    }
  }
  if (current) sections.push(current)
  return sections
}

function parseActionsLog(md) {
  return md.split('\n')
    .filter(l => l.startsWith('- '))
    .slice(-12)
    .reverse()
    .map(l => l.replace(/^- /, '').trim())
}

// ─── STATUS DOT ───────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const colors = { active: GREEN, idle: '#444', hold: YELLOW, blocked: RED, running: BLUE }
  const labels = { active: 'ACTIVE', idle: 'IDLE', hold: 'HOLD', blocked: 'BLOCKED', running: 'RUNNING' }
  const color = colors[status] || '#444'
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: color,
        boxShadow: status === 'active' || status === 'running' ? `0 0 6px ${color}` : 'none',
        display: 'inline-block', flexShrink: 0,
      }} />
      <span style={{ fontSize: 10, letterSpacing: '0.1em', color, fontWeight: 600 }}>
        {labels[status] || status.toUpperCase()}
      </span>
    </span>
  )
}

// ─── AGENT CARD ───────────────────────────────────────────────────────────────
function AgentCard({ name, role, status, lastDate, lastAction, loading }) {
  return (
    <div style={{
      background: '#0d0d0d',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{name}</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{role}</div>
        </div>
        {loading ? (
          <span style={{ fontSize: 10, color: '#444' }}>loading…</span>
        ) : (
          <StatusDot status={status} />
        )}
      </div>
      {lastAction && (
        <div style={{
          fontSize: 11, color: '#666', lineHeight: 1.4,
          borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8
        }}>
          <span style={{ color: '#444', marginRight: 6 }}>{lastDate}</span>
          {lastAction}
        </div>
      )}
    </div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ label, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 10, letterSpacing: '0.12em', color: '#444', fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 10, color: '#333', letterSpacing: '0.06em' }}>{count}</span>
      )}
    </div>
  )
}

// ─── PUNCH ITEM ───────────────────────────────────────────────────────────────
function PunchItem({ text, done, deadline }) {
  if (done) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      <span style={{
        width: 14, height: 14, border: `1px solid ${deadline ? RED : '#333'}`,
        borderRadius: 3, flexShrink: 0, marginTop: 1,
        background: deadline ? 'rgba(239,68,68,0.08)' : 'transparent',
      }} />
      <span style={{ fontSize: 12, color: deadline ? '#fca5a5' : '#aaa', lineHeight: 1.4, flex: 1 }}>
        {deadline && <span style={{ color: RED, fontWeight: 700, marginRight: 4, fontSize: 10 }}>DEADLINE</span>}
        {text}
      </span>
    </div>
  )
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  const attempt = () => {
    if (input === DASHBOARD_PASSWORD) {
      sessionStorage.setItem('aom_ops_auth', '1')
      onAuth()
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 1200)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: '#020202',
    }}>
      <div style={{ fontSize: 11, letterSpacing: '0.18em', color: '#333', textTransform: 'uppercase', marginBottom: 8 }}>
        AOM OPS
      </div>
      <input
        autoFocus
        type="password"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && attempt()}
        placeholder="password"
        style={{
          background: error ? 'rgba(239,68,68,0.06)' : '#111',
          border: `1px solid ${error ? RED : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 6,
          color: '#fff',
          fontSize: 14,
          padding: '10px 16px',
          outline: 'none',
          width: 240,
          textAlign: 'center',
          letterSpacing: '0.1em',
          transition: 'border-color 0.15s',
        }}
      />
      <button
        onClick={attempt}
        style={{
          background: ORANGE, color: '#fff', border: 'none', borderRadius: 6,
          padding: '8px 24px', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase',
        }}
      >
        Enter
      </button>
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('aom_ops_auth') === '1')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastFetched, setLastFetched] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!GITHUB_TOKEN) { setError('VITE_GITHUB_TOKEN not set.'); return }
    setLoading(true)
    try {
      const [handoff, priorities, punch, actions, bobbyAgent, jacobAgent, alexAgent, cleoAgent] = await Promise.all([
        fetchFile('HANDOFF.md'),
        fetchFile('context/current-priorities.md'),
        fetchFile('punch-list.md'),
        fetchFile('context/actions-log.md'),
        fetchFile('projects/ambition-mechanical/AGENT.md'),
        fetchFile('outreach/AGENT.md'),
        fetchFile('projects/aom-strategy/AGENT.md'),
        fetchFile('projects/content-agent/AGENT.md'),
      ])

      const agents = [
        {
          name: 'Bobby',
          role: 'Web Dev -- Ambition Mechanical',
          md: bobbyAgent?.content || '',
        },
        {
          name: 'Jacob',
          role: 'Outreach & Pipeline',
          md: jacobAgent?.content || '',
        },
        {
          name: 'Alex',
          role: 'Deal Architect',
          md: alexAgent?.content || '',
        },
        {
          name: 'Cleo',
          role: 'Content Creation',
          md: cleoAgent?.content || '',
        },
        {
          name: 'Steffen',
          role: 'Brand Guidelines',
          md: '',
        },
      ].map(a => ({
        ...a,
        status: a.md ? inferAgentStatus(a.md) : 'idle',
        lastEntry: a.md ? parseAgentLog(a.md) : null,
      }))

      setData({
        handoff: handoff ? extractHandoff(handoff.content) : [],
        priorities: priorities ? parsePriorities(priorities.content) : [],
        punch: punch ? parseCheckboxItems(punch.content) : [],
        actions: actions ? parseActionsLog(actions.content) : [],
        agents,
      })
      setLastFetched(new Date())
    } catch (e) {
      setError('Failed to load data: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (authed) load() }, [authed, load])

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />

  const now = new Date()
  const timeStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    + ' · ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })

  const openPunch = data?.punch?.filter(p => !p.done) || []
  const deadlineItems = openPunch.filter(p => p.deadline)
  const regularItems = openPunch.filter(p => !p.deadline)

  return (
    <div style={{ minHeight: '100vh', background: '#020202', padding: '28px 24px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', color: '#fff', textTransform: 'uppercase' }}>
            AOM
          </span>
          <span style={{ fontSize: 11, letterSpacing: '0.12em', color: ORANGE, textTransform: 'uppercase', fontWeight: 600 }}>
            Ops
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {loading && <span style={{ fontSize: 10, color: '#444', letterSpacing: '0.06em' }}>syncing…</span>}
          {lastFetched && !loading && (
            <span style={{ fontSize: 10, color: '#333', letterSpacing: '0.06em' }}>
              {lastFetched.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#444' }}>{timeStr}</span>
          <button
            onClick={load}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 5, color: '#555', fontSize: 10, padding: '4px 10px',
              cursor: 'pointer', letterSpacing: '0.08em',
            }}
          >
            REFRESH
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: `1px solid ${RED}`, borderRadius: 8, padding: '12px 16px', marginBottom: 24, color: '#fca5a5', fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left column: Agents + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Agents */}
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 20 }}>
            <SectionHeader label="Agents" count={`${data?.agents?.length || 0}`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data?.agents?.map(a => (
                <AgentCard
                  key={a.name}
                  name={a.name}
                  role={a.role}
                  status={a.status}
                  lastDate={a.lastEntry?.date}
                  lastAction={a.lastEntry?.action}
                  loading={loading && !data}
                />
              ))}
              {!data && loading && [1,2,3,4,5].map(i => (
                <AgentCard key={i} name="..." role="..." status="idle" loading />
              ))}
            </div>
          </div>

          {/* Recent Actions */}
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 20 }}>
            <SectionHeader label="Recent Actions" />
            {data?.actions?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {data.actions.map((a, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: '#555', padding: '6px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    lineHeight: 1.4,
                  }}>
                    {a}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: '#333' }}>No actions logged yet.</div>
            )}
          </div>
        </div>

        {/* Right column: Priorities + Handoff + Punch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Priorities + Handoff row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Current Priorities */}
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 20 }}>
              <SectionHeader label="Current Priorities" />
              {data?.priorities?.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  alignItems: 'flex-start',
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: ORANGE,
                    minWidth: 16, paddingTop: 1,
                  }}>{i + 1}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ddd' }}>{p.label}</div>
                    {p.desc && <div style={{ fontSize: 11, color: '#555', marginTop: 2, lineHeight: 1.4 }}>{p.desc}</div>}
                  </div>
                </div>
              ))}
              {!data?.priorities?.length && (
                <div style={{ fontSize: 11, color: '#333' }}>{loading ? 'Loading…' : 'No priorities loaded.'}</div>
              )}
            </div>

            {/* Handoff */}
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 20 }}>
              <SectionHeader label="Handoff" />
              {data?.handoff?.map((section, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#777', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {section.title}
                  </div>
                  {section.lines.map((l, j) => {
                    if (!l.trim() || l.startsWith('-  ')) return null
                    const isBullet = l.startsWith('- ')
                    return (
                      <div key={j} style={{
                        fontSize: 11, color: '#666', lineHeight: 1.5,
                        paddingLeft: isBullet ? 0 : 0,
                        marginBottom: 3,
                      }}>
                        {l.trim()}
                      </div>
                    )
                  })}
                </div>
              ))}
              {!data?.handoff?.length && (
                <div style={{ fontSize: 11, color: '#333' }}>{loading ? 'Loading…' : 'No handoff loaded.'}</div>
              )}
            </div>
          </div>

          {/* Punch List */}
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, padding: 20 }}>
            <SectionHeader label="Open Punch List" count={`${openPunch.length} open`} />

            {deadlineItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: RED, letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
                  Hard Deadlines
                </div>
                {deadlineItems.map((p, i) => <PunchItem key={i} {...p} />)}
              </div>
            )}

            <div style={{ columns: 2, columnGap: 24 }}>
              {regularItems.slice(0, 40).map((p, i) => (
                <div key={i} style={{ breakInside: 'avoid', display: 'block' }}>
                  <PunchItem {...p} />
                </div>
              ))}
            </div>

            {!data?.punch?.length && (
              <div style={{ fontSize: 11, color: '#333' }}>{loading ? 'Loading…' : 'No punch list loaded.'}</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#2a2a2a', letterSpacing: '0.08em' }}>AHEAD OF MARKET</span>
        <button
          onClick={() => { sessionStorage.removeItem('aom_ops_auth'); setAuthed(false) }}
          style={{ background: 'none', border: 'none', color: '#2a2a2a', fontSize: 10, cursor: 'pointer', letterSpacing: '0.08em' }}
        >
          LOCK
        </button>
      </div>
    </div>
  )
}
