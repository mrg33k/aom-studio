import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Copy, Check, ThumbsUp, ThumbsDown, Filter, ChevronDown, Linkedin, Instagram, ArrowLeft } from 'lucide-react'

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN
const REPO = 'mrg33k/AOM-EA'
const BRANCH = 'master'
const DASHBOARD_PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD || 'aomhq'

const ORANGE = '#FF4F00'
const GREEN = '#22c55e'
const YELLOW = '#eab308'
const RED = '#ef4444'

const DRAFT_FILES = [
  { path: 'projects/content-agent/output/ambition/training-day-posts.md', client: 'Ambition Mechanical' },
  { path: 'projects/content-agent/output/ambition/first-linkedin-post-drafts.md', client: 'Ambition Mechanical' },
]

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

// ─── MARKDOWN PARSER ──────────────────────────────────────────────────────────
function parseDraftFile(md, client) {
  const posts = []

  // Extract file-level metadata
  const dateMatch = md.match(/\*\*Date:\*\*\s*(.+)/)
  const platformMatch = md.match(/\*\*Platform:\*\*\s*(.+)/)
  const statusMatch = md.match(/\*\*Status:\*\*\s*(.+)/)
  const draftedByMatch = md.match(/\*\*Drafted by:\*\*\s*(.+)/)
  const fileDate = dateMatch ? dateMatch[1].trim() : null
  const filePlatform = platformMatch ? platformMatch[1].trim() : null
  const fileStatus = statusMatch && /DRAFT/i.test(statusMatch[1]) ? 'DRAFT' : 'DRAFT'
  const draftedBy = draftedByMatch ? draftedByMatch[1].trim() : null

  // Split by --- separators to find post blocks
  const sections = md.split(/^---$/m)

  for (const section of sections) {
    // Look for ## headings that indicate a post
    const headingMatch = section.match(/^##\s+(.+)/m)
    if (!headingMatch) continue

    const heading = headingMatch[1].trim()

    // Skip "Notes for Patrik" section
    if (/notes for patrik/i.test(heading)) continue

    // Determine platform + account from heading
    let platform = 'LinkedIn'
    let account = ''
    if (/mo.*personal/i.test(heading)) {
      account = "Mo's Personal Page"
    } else if (/business.*page/i.test(heading) || /ambition.*business/i.test(heading)) {
      account = 'Business Page'
    } else {
      account = heading
    }

    // Option identifier
    const optionMatch = heading.match(/option\s+([A-Z])/i) || heading.match(/["']([^"']+)["']/)
    const optionLabel = optionMatch ? optionMatch[1] : ''

    // Extract post body (everything after heading, before hashtags)
    const afterHeading = section.slice(section.indexOf(headingMatch[0]) + headingMatch[0].length).trim()

    // Split body and hashtags
    const lines = afterHeading.split('\n')
    const bodyLines = []
    const hashtags = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (/^#[A-Z]/.test(trimmed)) {
        // Hashtag line
        const tags = trimmed.match(/#[A-Za-z0-9_]+/g)
        if (tags) hashtags.push(...tags)
      } else {
        bodyLines.push(line)
      }
    }

    const body = bodyLines.join('\n').trim()
    if (!body) continue

    // Build copyable text (body + hashtags)
    const copyText = body + (hashtags.length ? '\n\n' + hashtags.join(' ') : '')

    posts.push({
      id: `${client}-${heading}`.replace(/\s+/g, '-').toLowerCase(),
      client,
      platform,
      account,
      heading,
      optionLabel,
      body,
      hashtags,
      copyText,
      date: fileDate,
      draftedBy,
      status: fileStatus,
    })
  }

  return posts
}

// ─── PASSWORD GATE ────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)

  const attempt = () => {
    if (input === DASHBOARD_PASSWORD) {
      localStorage.setItem('aom_social_auth', '1')
      onAuth()
    } else {
      setShake(true)
      setInput('')
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: '#020202' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.22em', color: ORANGE, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>AOM</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Social Drafts</div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 6 }}>Review and approve social media posts.</div>
      </div>
      <div style={{ transform: shake ? 'translateX(8px)' : 'translateX(0)', transition: shake ? 'transform 0.1s ease' : 'transform 0.3s ease', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <input autoFocus type="password" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && attempt()} placeholder="access code"
          style={{ background: '#111', border: `1px solid ${shake ? RED : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, color: '#fff', fontSize: 16, padding: '12px 18px', outline: 'none', width: 260, textAlign: 'center', letterSpacing: '0.12em', transition: 'border-color 0.15s' }} />
        <button onClick={attempt} style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase', width: '100%' }}>
          Enter
        </button>
      </div>
    </div>
  )
}

// ─── POST CARD ────────────────────────────────────────────────────────────────
function PostCard({ post, onStatusChange }) {
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState(post.status)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(post.copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = post.copyText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleApprove = () => {
    const newStatus = status === 'APPROVED' ? 'DRAFT' : 'APPROVED'
    setStatus(newStatus)
    onStatusChange(post.id, newStatus)
  }

  const handleReject = () => {
    const newStatus = status === 'REJECTED' ? 'DRAFT' : 'REJECTED'
    setStatus(newStatus)
    onStatusChange(post.id, newStatus)
  }

  const statusColor = status === 'APPROVED' ? GREEN : status === 'REJECTED' ? RED : YELLOW
  const statusBg = status === 'APPROVED' ? 'rgba(34,197,94,0.1)' : status === 'REJECTED' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)'

  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Linkedin size={14} style={{ color: '#0a66c2' }} />
            <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{post.account}</span>
            {post.optionLabel && (
              <span style={{ fontSize: 10, color: ORANGE, fontWeight: 700, letterSpacing: '0.08em', background: 'rgba(255,79,0,0.1)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                {/^[A-Z]$/i.test(post.optionLabel) ? `Option ${post.optionLabel}` : post.optionLabel}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: statusColor,
            background: statusBg,
            padding: '3px 10px',
            borderRadius: 4,
            textTransform: 'uppercase',
          }}>
            {status}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#555' }}>
          {post.client} {post.date ? ` \u00b7 ${post.date}` : ''} {post.draftedBy ? ` \u00b7 ${post.draftedBy}` : ''}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          fontSize: 14,
          lineHeight: 1.65,
          color: '#e5e5e5',
          whiteSpace: 'pre-wrap',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
        }}>
          {post.body}
        </div>

        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {post.hashtags.map((tag, i) => (
              <span key={i} style={{
                fontSize: 11,
                color: '#0a66c2',
                background: 'rgba(10,102,194,0.08)',
                padding: '3px 10px',
                borderRadius: 12,
                fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        padding: '12px 20px 16px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <button
          onClick={handleApprove}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: status === 'APPROVED' ? GREEN : 'rgba(255,255,255,0.04)',
            color: status === 'APPROVED' ? '#fff' : '#888',
            border: 'none', borderRadius: 8, padding: '8px 16px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <ThumbsUp size={14} />
          Approve
        </button>
        <button
          onClick={handleReject}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: status === 'REJECTED' ? RED : 'rgba(255,255,255,0.04)',
            color: status === 'REJECTED' ? '#fff' : '#888',
            border: 'none', borderRadius: 8, padding: '8px 16px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <ThumbsDown size={14} />
          Reject
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: copied ? GREEN : ORANGE,
            color: '#fff',
            border: 'none', borderRadius: 8, padding: '8px 16px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Social() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('aom_social_auth') === '1')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [clientFilter, setClientFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [statuses, setStatuses] = useState({}) // id -> status overrides

  const loadDrafts = useCallback(async () => {
    if (!GITHUB_TOKEN) {
      setError('Missing GitHub token')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.all(
        DRAFT_FILES.map(async ({ path, client }) => {
          const md = await fetchFile(path)
          if (!md) return []
          return parseDraftFile(md, client)
        })
      )
      setPosts(results.flat())
    } catch (err) {
      setError('Failed to load drafts')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) loadDrafts()
  }, [authed, loadDrafts])

  const handleStatusChange = (id, newStatus) => {
    setStatuses(prev => ({ ...prev, [id]: newStatus }))
  }

  // Get unique values for filters
  const clients = useMemo(() => [...new Set(posts.map(p => p.client))], [posts])
  const platforms = useMemo(() => [...new Set(posts.map(p => p.platform))], [posts])

  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (clientFilter !== 'all' && p.client !== clientFilter) return false
      if (platformFilter !== 'all' && p.platform !== platformFilter) return false
      const currentStatus = statuses[p.id] || p.status
      if (statusFilter !== 'all' && currentStatus !== statusFilter) return false
      return true
    })
  }, [posts, clientFilter, platformFilter, statusFilter, statuses])

  // Group posts by source file / heading context
  const groupedPosts = useMemo(() => {
    const groups = {}
    for (const post of filteredPosts) {
      // Group by account
      const key = `${post.client} - ${post.account}`
      if (!groups[key]) groups[key] = []
      groups[key].push(post)
    }
    return groups
  }, [filteredPosts])

  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />

  const approvedCount = posts.filter(p => (statuses[p.id] || p.status) === 'APPROVED').length
  const totalCount = posts.length

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020202',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
    }}>
      {/* Top Bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(2,2,2,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 20px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/dashboard" style={{ color: '#555', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={16} />
            </a>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.22em', color: ORANGE, textTransform: 'uppercase', fontWeight: 700 }}>AOM</div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Social Drafts</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {totalCount > 0 && (
              <span style={{ fontSize: 11, color: '#666' }}>
                {approvedCount}/{totalCount} approved
              </span>
            )}
            <button
              onClick={loadDrafts}
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: '#888',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 60px' }}>
        {/* Filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 24,
        }}>
          {/* Client filter */}
          {clients.length > 1 && (
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              style={{
                background: '#111',
                color: '#ccc',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Clients</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* Platform filter */}
          {platforms.length > 1 && (
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              style={{
                background: '#111',
                color: '#ccc',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Platforms</option>
              {platforms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              background: '#111',
              color: '#ccc',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
            <div style={{ fontSize: 13 }}>Loading drafts...</div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: 60, color: RED }}>
            <div style={{ fontSize: 13 }}>{error}</div>
          </div>
        )}

        {/* Posts */}
        {!loading && !error && Object.keys(groupedPosts).length === 0 && posts.length > 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
            <div style={{ fontSize: 13 }}>No posts match your filters.</div>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>
            <div style={{ fontSize: 13 }}>No draft files found.</div>
          </div>
        )}

        {Object.entries(groupedPosts).map(([group, groupPosts]) => (
          <div key={group} style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#666',
              letterSpacing: '0.04em',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              {group}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {groupPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={{ ...post, status: statuses[post.id] || post.status }}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
