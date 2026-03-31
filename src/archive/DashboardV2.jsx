import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'aomhq'

const STATUS_COLORS = {
  WORKING: { bg: 'rgba(34,197,94,0.15)', border: '#22C55E', text: '#22C55E', dot: '#22C55E' },
  IDLE: { bg: 'rgba(120,113,108,0.15)', border: '#78716C', text: '#78716C', dot: '#78716C' },
  BLOCKED: { bg: 'rgba(239,68,68,0.15)', border: '#EF4444', text: '#EF4444', dot: '#EF4444' },
  DONE: { bg: 'rgba(59,130,246,0.15)', border: '#3B82F6', text: '#3B82F6', dot: '#3B82F6' },
  WAITING: { bg: 'rgba(234,179,8,0.15)', border: '#EAB308', text: '#EAB308', dot: '#EAB308' },
  PAUSED: { bg: 'rgba(249,115,22,0.15)', border: '#F97316', text: '#F97316', dot: '#F97316' },
}

// ─── HOOKS ───────────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < breakpoint)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

function useDashboardData(endpoint, interval = 30000) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastRaw = useRef(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(endpoint)
      if (!res.ok) throw new Error(`${res.status}`)
      const text = await res.text()
      // Only update if data changed
      if (text !== lastRaw.current) {
        lastRaw.current = text
        setData(JSON.parse(text))
      }
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, interval)
    return () => clearInterval(timer)
  }, [fetchData, interval])

  return { data, error, loading }
}

// ─── FORMATTING ──────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const now = new Date()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Phoenix' })
}

function azTime() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/Phoenix',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// ─── STATUS PILL ─────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.IDLE
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.15em] rounded-sm"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.dot }}>
        {status === 'WORKING' && (
          <span className="absolute w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: colors.dot, opacity: 0.4 }} />
        )}
      </span>
      {status}
    </span>
  )
}

// ─── SKELETON ────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-[#141412] border border-[#292524] rounded-sm p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-24 bg-[#292524] rounded" />
        <div className="h-5 w-16 bg-[#292524] rounded" />
      </div>
      <div className="h-3 w-32 bg-[#1A1A17] rounded mt-2" />
      <div className="h-3 w-48 bg-[#1A1A17] rounded mt-3" />
    </div>
  )
}

// ─── THROUGHPUT BAR ──────────────────────────────────────────────────────────
function ThroughputBar({ throughput }) {
  if (!throughput) return null
  const metrics = [
    { label: 'Working', value: throughput.working, color: '#22C55E' },
    { label: 'Idle', value: throughput.idle, color: '#78716C' },
    { label: 'Blocked', value: throughput.blocked, color: '#EF4444' },
    { label: 'Done', value: throughput.doneToday, color: '#3B82F6' },
    { label: 'Commits', value: throughput.commitsToday, color: '#F5F0EB' },
  ]

  return (
    <div className="sticky top-0 z-40 bg-[#141412] border-b border-[#292524] px-4 md:px-8 py-4">
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center gap-6 md:gap-10">
        {metrics.map(m => (
          <div key={m.label} className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
            <div>
              <p className="font-mono text-xl md:text-2xl font-black text-[#F5F0EB]" style={{ fontStyle: 'italic' }}>
                {m.value}
              </p>
              <p className="text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-[#78716C]">{m.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AGENT CARD ──────────────────────────────────────────────────────────────
function AgentCard({ agent, onClick }) {
  const colors = STATUS_COLORS[agent.status] || STATUS_COLORS.IDLE

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#141412] border border-[#292524] rounded-sm p-5 md:p-6 cursor-pointer hover:border-[#FF4F00]/30 transition-all duration-300 group"
      style={{ borderLeftColor: colors.border, borderLeftWidth: '4px' }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-headline font-bold text-[#F5F0EB] text-base md:text-lg">{agent.name}</h3>
        <StatusPill status={agent.status} />
      </div>
      <p className="text-[11px] font-mono text-[#78716C] uppercase tracking-wider mb-3">{agent.role}</p>
      <p className="text-sm text-[#A8A29E] leading-relaxed line-clamp-2">{agent.currentTask || 'Standing by'}</p>
      {agent.timeActive && (
        <p className="text-[10px] font-mono text-[#44403C] mt-3">Since {agent.timeActive}</p>
      )}
      <div className="flex items-center justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[11px] font-mono text-[#FF4F00]">View Agent →</span>
      </div>
    </motion.div>
  )
}

// ─── PIPELINE FEED ───────────────────────────────────────────────────────────
function PipelineFeed({ feed }) {
  if (!feed || feed.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#44403C] font-mono">Waiting for activity...</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {feed.slice(0, 20).map((entry, i) => (
        <motion.div
          key={`${entry.commitHash}-${i}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-start gap-3 py-3 border-b border-[#292524]/50 last:border-0"
        >
          <div className="flex-shrink-0 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#44403C]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-[#44403C]">{timeAgo(entry.time)}</span>
              {entry.agent && (
                <span className="text-[10px] font-mono font-bold text-[#A8A29E] uppercase">{entry.agent}</span>
              )}
              {entry.repo && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#1A1A17] text-[#44403C] rounded">{entry.repo}</span>
              )}
            </div>
            <p className="text-xs text-[#A8A29E] mt-1 leading-relaxed truncate">{entry.description}</p>
            {entry.commitHash && entry.commitUrl && (
              <a
                href={entry.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-[#FF4F00]/60 hover:text-[#FF4F00] transition-colors mt-1 inline-block"
              >
                {entry.commitHash}
              </a>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── BLOCKERS SECTION ────────────────────────────────────────────────────────
function BlockersSection({ blockers }) {
  if (!blockers || blockers.length === 0) return null

  return (
    <div className="bg-[#141412] border border-[#292524] rounded-sm p-6 mt-6" style={{ borderLeftColor: '#EF4444', borderLeftWidth: '4px' }}>
      <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#EF4444] mb-4">Blockers</h3>
      <div className="space-y-3">
        {blockers.map((b, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-2 flex-shrink-0" />
            <div>
              {b.agent && <span className="text-xs font-mono font-bold text-[#A8A29E] mr-2">{b.agent}</span>}
              <span className="text-sm text-[#A8A29E]">{b.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── COMMAND VIEW ────────────────────────────────────────────────────────────
function CommandView({ data, onSelectAgent }) {
  const isMobile = useIsMobile()
  const [clockStr, setClockStr] = useState(azTime)

  useEffect(() => {
    const timer = setInterval(() => setClockStr(azTime()), 60000)
    return () => clearInterval(timer)
  }, [])

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0A0A08]">
        <div className="max-w-[1400px] mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-20">
            {Array.from({ length: 13 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A08]">
      {/* Header */}
      <div className="bg-[#0C0C0C] border-b border-[#292524] px-4 md:px-8 py-5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <h1 className="font-headline font-black uppercase text-[#F5F0EB] text-lg md:text-xl tracking-wider">
            AOM Mission Control
          </h1>
          <span className="text-[11px] font-mono text-[#44403C]">{clockStr}</span>
        </div>
      </div>

      {/* Throughput */}
      <ThroughputBar throughput={data.throughput} />

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Agent Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(data.agents || []).map((agent, i) => (
                <AgentCard
                  key={agent.slug}
                  agent={agent}
                  onClick={() => onSelectAgent(agent.slug)}
                />
              ))}
            </div>

            {/* Blockers */}
            <BlockersSection blockers={data.blockers} />
          </div>

          {/* Pipeline Feed */}
          <div className="lg:w-[350px] flex-shrink-0">
            <div className="bg-[#141412] border border-[#292524] rounded-sm p-5 sticky top-[100px]">
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C] mb-4">Pipeline Feed</h3>
              <div className="max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#292524 transparent' }}>
                <PipelineFeed feed={data.pipelineFeed} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Last updated */}
      {data.lastUpdated && (
        <div className="text-center py-4">
          <p className="text-[10px] font-mono text-[#292524]">Last synced {timeAgo(data.lastUpdated)}</p>
        </div>
      )}
    </div>
  )
}

// ─── INDIVIDUAL AGENT VIEW ───────────────────────────────────────────────────
function AgentView({ slug, onBack }) {
  const { data, error, loading } = useDashboardData(`/api/dashboard/agent?slug=${slug}`, 30000)
  const agent = data?.agent

  if (loading && !agent) {
    return (
      <div className="min-h-screen bg-[#0A0A08] flex items-center justify-center">
        <div className="animate-pulse text-[#44403C] font-mono text-sm">Loading agent data...</div>
      </div>
    )
  }

  if (error && !agent) {
    return (
      <div className="min-h-screen bg-[#0A0A08] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#EF4444] font-mono text-sm mb-4">Failed to load agent: {error}</p>
          <button onClick={onBack} className="text-sm font-mono text-[#FF4F00] hover:underline">← Back to Command View</button>
        </div>
      </div>
    )
  }

  if (!agent) return null

  const colors = STATUS_COLORS[agent.status] || STATUS_COLORS.IDLE

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0A0A08]"
    >
      {/* Nav */}
      <div className="bg-[#0C0C0C] border-b border-[#292524] px-4 md:px-8 py-4">
        <div className="max-w-[1000px] mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-sm font-mono text-[#78716C] hover:text-[#F5F0EB] transition-colors flex items-center gap-2"
          >
            ← Back to Command View
          </button>
          <StatusPill status={agent.status} />
        </div>
      </div>

      {/* Agent header */}
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 pt-8 pb-6">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="font-headline font-black text-3xl md:text-4xl text-[#F5F0EB]">{agent.name}</h1>
          <span className="text-sm font-mono text-[#78716C] uppercase tracking-wider">{agent.role}</span>
        </div>
        {agent.currentTask && (
          <p className="text-[#A8A29E] text-lg">{agent.currentTask}</p>
        )}
      </div>

      {/* Vitals + Mission */}
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 pb-6">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Current Mission */}
          <div className="bg-[#141412] border border-[#292524] rounded-sm p-6" style={{ borderLeftColor: colors.border, borderLeftWidth: '4px' }}>
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C] mb-4">Current Mission</h3>
            {agent.currentMission ? (
              <div>
                <p className="text-[#F5F0EB] leading-relaxed mb-3">{agent.currentMission.description}</p>
                {agent.currentMission.launched && (
                  <p className="text-[10px] font-mono text-[#44403C]">Launched: {agent.currentMission.launched}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#78716C] animate-pulse" />
                <p className="text-[#44403C] font-mono text-sm">Standing by</p>
              </div>
            )}
          </div>

          {/* Vitals */}
          <div className="bg-[#141412] border border-[#292524] rounded-sm p-6">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C] mb-4">Vitals</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-mono text-[#44403C] uppercase tracking-wider mb-1">Status</p>
                <StatusPill status={agent.vitals?.status || agent.status} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-[#44403C] uppercase tracking-wider mb-1">Since</p>
                <p className="text-[#F5F0EB] font-mono text-sm">{agent.vitals?.since || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-[#44403C] uppercase tracking-wider mb-1">Files Today</p>
                <p className="font-mono text-xl font-black text-[#F5F0EB]" style={{ fontStyle: 'italic' }}>{agent.vitals?.filesTouchedToday || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-[#44403C] uppercase tracking-wider mb-1">Commits Today</p>
                <p className="font-mono text-xl font-black text-[#F5F0EB]" style={{ fontStyle: 'italic' }}>{agent.vitals?.commitsToday || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 pb-6">
        <div className="bg-[#141412] border border-[#292524] rounded-sm p-6">
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C] mb-4">Activity Log</h3>
          {agent.activityLog && agent.activityLog.length > 0 ? (
            <div className="space-y-0 max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#292524 transparent' }}>
              {agent.activityLog.map((entry, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b border-[#292524]/50 last:border-0">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-2 h-2 rounded-full ${entry.type === 'commit' ? 'bg-[#22C55E]' : 'bg-[#78716C]'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-[#44403C] mb-1">
                      {entry.time ? (isNaN(new Date(entry.time)) ? entry.time : `${timeAgo(entry.time)} / ${formatTime(entry.time)}`) : ''}
                    </p>
                    <p className="text-sm text-[#A8A29E] leading-relaxed">{entry.description}</p>
                    {entry.url && (
                      <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-[#FF4F00]/60 hover:text-[#FF4F00] mt-1 inline-block">
                        View commit →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#44403C] font-mono">No activity recorded</p>
          )}
        </div>
      </div>

      {/* Recent Completions */}
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 pb-6">
        <div className="bg-[#141412] border border-[#292524] rounded-sm p-6">
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C] mb-4">Recent Completions</h3>
          {agent.recentCompletions && agent.recentCompletions.length > 0 ? (
            <div className="space-y-3">
              {agent.recentCompletions.map((c, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-[#292524]/30 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-[#3B82F6] mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-[#A8A29E]">{c.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {c.date && <span className="text-[10px] font-mono text-[#44403C]">{c.date}</span>}
                      {c.result && <span className="text-[10px] font-mono text-[#78716C] truncate max-w-[300px]">{c.result}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#44403C] font-mono">No completions in the last 7 days</p>
          )}
        </div>
      </div>

      {/* Active Files */}
      {agent.activeFiles && agent.activeFiles.length > 0 && (
        <div className="max-w-[1000px] mx-auto px-4 md:px-8 pb-8">
          <details className="bg-[#141412] border border-[#292524] rounded-sm">
            <summary className="p-6 cursor-pointer text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C] hover:text-[#A8A29E] transition-colors">
              Active Files ({agent.activeFiles.length})
            </summary>
            <div className="px-6 pb-6 space-y-1">
              {agent.activeFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${f.status === 'added' ? 'bg-[#22C55E]/10 text-[#22C55E]' : f.status === 'removed' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#EAB308]/10 text-[#EAB308]'}`}>
                    {f.status === 'added' ? '+' : f.status === 'removed' ? '-' : '~'}
                  </span>
                  <span className="text-xs font-mono text-[#A8A29E] truncate">{f.path}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Latest Result */}
      {agent.latestResult && (
        <div className="max-w-[1000px] mx-auto px-4 md:px-8 pb-8">
          <details className="bg-[#141412] border border-[#292524] rounded-sm">
            <summary className="p-6 cursor-pointer text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C] hover:text-[#A8A29E] transition-colors">
              Latest Result
            </summary>
            <div className="px-6 pb-6">
              <pre className="text-xs font-mono text-[#A8A29E] whitespace-pre-wrap leading-relaxed">{agent.latestResult}</pre>
            </div>
          </details>
        </div>
      )}

      {/* Footer */}
      {data?.lastUpdated && (
        <div className="text-center py-4">
          <p className="text-[10px] font-mono text-[#292524]">Last synced {timeAgo(data.lastUpdated)}</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── PASSWORD GATE ───────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('dashboard-auth')
    if (saved === 'true') onAuth()
    else inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pw === DASHBOARD_PASSWORD) {
      sessionStorage.setItem('dashboard-auth', 'true')
      onAuth()
    } else {
      setError(true)
      setTimeout(() => setError(false), 1500)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A08] flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="font-headline font-black text-2xl text-[#F5F0EB] text-center mb-8 uppercase tracking-wider">Mission Control</h1>
        <div className={`relative ${error ? 'animate-shake' : ''}`}>
          <input
            ref={inputRef}
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="Password"
            className="w-full bg-[#141412] border border-[#292524] rounded-sm px-4 py-3 text-[#F5F0EB] font-mono text-sm placeholder-[#44403C] outline-none focus:border-[#FF4F00]/40 transition-colors"
            autoComplete="off"
          />
        </div>
        {error && <p className="text-[#EF4444] text-xs font-mono text-center mt-2">Access denied</p>}
      </form>
    </div>
  )
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function DashboardV2() {
  const [authed, setAuthed] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const { data, error, loading } = useDashboardData('/api/dashboard/status', 30000)

  // Check URL for agent slug on mount
  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/\/dashboard\/agent\/(.+)/)
    if (match) setSelectedAgent(match[1])
  }, [])

  // Update URL when selecting agent
  const selectAgent = (slug) => {
    setSelectedAgent(slug)
    window.history.pushState({}, '', `/dashboard/agent/${slug}`)
  }

  const goBack = () => {
    setSelectedAgent(null)
    window.history.pushState({}, '', '/dashboard')
  }

  // Handle browser back button
  useEffect(() => {
    const handlePop = () => {
      const path = window.location.pathname
      const match = path.match(/\/dashboard\/agent\/(.+)/)
      setSelectedAgent(match ? match[1] : null)
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />

  return (
    <AnimatePresence mode="wait">
      {selectedAgent ? (
        <AgentView key="agent" slug={selectedAgent} onBack={goBack} />
      ) : (
        <CommandView key="command" data={data} onSelectAgent={selectAgent} />
      )}
    </AnimatePresence>
  )
}
