import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, agentColors } from '../../lib/cv3Colors.js'
import { useCleoWorkspaces } from '../../hooks/useCleoWorkspaces.js'

const CLEO = agentColors.cleo  // #F472B6

function timeAgo(iso) {
 if (!iso) return '·'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatusPill({ status }) {
  const colors = {
    active:   { bg: 'rgba(34,197,94,0.12)',  text: '#22C55E'  },
    paused:   { bg: 'rgba(234,179,8,0.12)',   text: '#EAB308'  },
    archived: { bg: 'rgba(71,85,105,0.25)',   text: '#475569'  },
    complete: { bg: 'rgba(96,165,250,0.12)',  text: '#60A5FA'  },
  }
  const c = colors[status?.toLowerCase()] || colors.active
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: c.bg,
      color: c.text,
      textTransform: 'capitalize',
    }}>{status || 'active'}</span>
  )
}

function WorkspaceCard({ workspace, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.s2 : C.s1,
        border: `1px solid ${hovered ? 'rgba(244,114,182,0.18)' : C.border2}`,
        borderRadius: 14,
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'background 150ms ease, border-color 150ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        outline: 'none',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{workspace.name}</div>
          <div style={{ fontSize: 12, color: C.text2, marginTop: 3 }}>
 {workspace.client_name || '·'}
          </div>
        </div>
        <StatusPill status={workspace.status} />
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {workspace.deliverable_count > 0 && (
          <span style={{ fontSize: 11, color: C.muted }}>
            {workspace.deliverable_count} deliverable{workspace.deliverable_count !== 1 ? 's' : ''}
          </span>
        )}
        <span style={{ fontSize: 11, color: C.muted }}>
          touched {timeAgo(workspace.last_touched)}
        </span>
      </div>

      {/* Slug tag */}
      <div style={{
        fontSize: 10, fontWeight: 600, color: CLEO,
        fontFamily: 'monospace', opacity: 0.7,
      }}>{workspace.slug}</div>
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: C.s1,
        border: `1px solid ${C.border2}`,
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 13,
        color: C.text,
        outline: 'none',
        width: '100%',
        maxWidth: 220,
      }}
    />
  )
}

export default function CleoWorkspacesIndex() {
  const navigate = useNavigate()
  const [clientFilter, setClientFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { workspaces, loading, error } = useCleoWorkspaces({ clientFilter, statusFilter })

  const clients = useMemo(() => {
    const set = new Set(workspaces.map(w => w.client_name).filter(Boolean))
    return [...set].sort()
  }, [workspaces])

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '0 0 80px',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: C.bg,
        borderBottom: `1px solid ${C.border2}`,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.text2, fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>←</span> Dashboard
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: CLEO, flexShrink: 0,
          }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            Cleo / Workspaces
          </span>
          {!loading && (
            <span style={{ fontSize: 12, color: C.muted, marginLeft: 4 }}>
              {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={clientFilter} onChange={setClientFilter} placeholder="Filter by client…" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              background: C.s1, border: `1px solid ${C.border2}`, borderRadius: 8,
              padding: '8px 12px', fontSize: 13, color: statusFilter ? C.text : C.muted,
              outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="complete">Complete</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto' }}>
        {loading && (
          <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', padding: '60px 0' }}>
            Loading workspaces…
          </div>
        )}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, padding: '14px 16px', color: C.red, fontSize: 13,
          }}>
            <strong>Error:</strong> {error}
            {error.includes('relation') && (
              <div style={{ marginTop: 6, color: C.text2 }}>
                The <code style={{ color: CLEO }}>video_workspaces</code> table doesn't exist yet.
                Run <code>workspace_catalog.py register</code> for the first workspace to create it.
              </div>
            )}
          </div>
        )}
        {!loading && !error && workspaces.length === 0 && (
          <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
            No workspaces found.
            {clientFilter || statusFilter
              ? <div style={{ marginTop: 8 }}>Clear filters to see all.</div>
              : <div style={{ marginTop: 8 }}>Create one with <code style={{ color: CLEO }}>/video-workspace-init</code> in Cleo.</div>
            }
          </div>
        )}
        {!loading && !error && workspaces.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 14,
          }}>
            {workspaces.map(ws => (
              <WorkspaceCard
                key={ws.id || ws.slug}
                workspace={ws}
                onClick={() => navigate(`/dashboard/cleo/workspaces/${ws.slug}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}