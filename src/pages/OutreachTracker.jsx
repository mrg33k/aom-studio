// AOM Construction Outreach Tracker
// Route: /outreach — soft password gate (AOM2026, remembered in localStorage)
// Backend: Supabase outreach_leads + outreach_touchpoints
// Brand: obsidian #060606 / ivory #F6F6F4 / gold #C4A46A / Bricolage Grotesque + Inter

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

// ─── Constants ───────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mcngatprgluexjjcqpkp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbmdhdHByZ2x1ZXhqamNxcGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjU3MTUsImV4cCI6MjA4OTQwMTcxNX0.Rgn57thbT_kZf-PEvcS1ix4l8CTO1fwz0I2t589hSd8'
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const PASSWORD = 'AOM2026'
const REPS = ['Courtney', 'Patrik', 'Ash', 'James']
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

function needScoreColor(score) {
  const s = Number(score) || 0
  if (s >= 7) return '#D95050' // red
  if (s >= 6) return '#D07830' // orange
  if (s >= 5) return '#C4A46A' // gold
  if (s >= 1) return '#5E7A5E' // muted green
  return '#444'
}

function needScoreTextColor(score) {
  const s = Number(score) || 0
  if (s >= 5) return '#060606' // dark text on light badge
  return '#F6F6F4'
}

function statusBadgeStyle(status) {
  const map = {
    'Won':               { bg: '#0F2B0F', color: '#5ECF5E', border: '#1a4a1a' },
    'Meeting booked':    { bg: '#0A1E30', color: '#5EB5CF', border: '#1a3a50' },
    'Proposal sent':     { bg: '#1A0F30', color: '#A87ECF', border: '#3a1a50' },
    'Spoke':             { bg: '#0F1F0F', color: '#8FC88F', border: '#1a3a1a' },
    'Left VM':           { bg: '#1E1800', color: '#C8A84A', border: '#3a3010' },
    'Called (no answer)':{ bg: '#1E1200', color: '#A87A30', border: '#3a2a00' },
    'Lost / Not a fit':  { bg: '#1a1a1a', color: '#666', border: '#333' },
  }
  const m = map[status] || { bg: '#111', color: '#888', border: '#2a2a2a' }
  return {
    background: m.bg,
    color: m.color,
    border: `1px solid ${m.border}`,
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
      background: '#060606',
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
        color: '#C4A46A',
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
          color: '#F6F6F4',
          margin: '0 0 0.5rem',
          textTransform: 'uppercase',
        }}>
          Construction Outreach
        </h1>
        <p style={{
          color: '#666',
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
              background: '#111',
              border: `1px solid ${err ? '#D95050' : '#2a2a2a'}`,
              color: '#F6F6F4',
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
            <p style={{ color: '#D95050', fontSize: '0.8rem', margin: '0 0 1rem' }}>
              Incorrect access code.
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              background: '#C4A46A',
              color: '#060606',
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
      background: '#060606',
      borderBottom: '1px solid #1a1a1a',
      padding: '1rem 1rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Top row: logo + meta + actions */}
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
            color: '#C4A46A',
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
            color: '#F6F6F4',
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
          }}>
            Outreach Tracker
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: '1.5rem',
              color: '#F6F6F4',
              lineHeight: 1,
            }}>{contactedToday}</div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.65rem',
              color: '#555',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>Today</div>
          </div>
          <button
            onClick={onLock}
            style={{
              background: 'transparent',
              border: '1px solid #2a2a2a',
              color: '#555',
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
            color: '#F6F6F4',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {wonCount} Won
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.7rem',
            color: '#555',
          }}>
            Goal: {GOAL} retainers
          </span>
        </div>
        <div style={{
          height: 4,
          background: '#1a1a1a',
          width: '100%',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#C4A46A',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Per-rep row */}
      <div style={{
        display: 'flex',
        gap: '0',
        borderTop: '1px solid #1a1a1a',
        borderLeft: '1px solid #1a1a1a',
        marginBottom: '0.75rem',
      }}>
        {repStats.map(rep => (
          <div key={rep.name} style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.5rem 0.25rem',
            borderRight: '1px solid #1a1a1a',
            borderBottom: '1px solid #1a1a1a',
          }}>
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: '0.65rem',
              color: '#C4A46A',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '0.2rem',
            }}>
              {rep.name}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.65rem',
              color: '#666',
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
            border: '1px solid #1a1a1a',
            background: '#0a0a0a',
          }}>
            <div style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: '1rem',
              color: '#F6F6F4',
              lineHeight: 1,
            }}>
              {statusCounts[s] || 0}
            </div>
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6rem',
              color: '#B6B2AB',
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
      borderLeft: `4px solid ${score >= 1 ? scoreColor : '#222'}`,
      borderBottom: '1px solid #1a1a1a',
      background: expanded ? '#080808' : '#060606',
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
            color: '#F6F6F4',
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
            color: '#666',
            marginTop: '0.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexWrap: 'wrap',
          }}>
            {lead.trade && <span>{lead.trade}</span>}
            {lead.trade && lead.city && <span style={{ color: '#333' }}>·</span>}
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
          </div>
          {lead.contact_name && (
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.75rem',
              color: '#888',
              marginTop: '0.15rem',
            }}>
              {lead.contact_name}{lead.title ? `, ${lead.title}` : ''}
            </div>
          )}

          {/* Contact row — phone + email visible on the card face, tap to call/email */}
          {(lead.phone || lead.email) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginTop: '0.4rem',
            }}>
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#0f0f0f',
                    border: '1px solid #2a2a2a',
                    color: '#C4A46A',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.72rem',
                    letterSpacing: '0.02em',
                    padding: '0.3rem 0.5rem',
                    textDecoration: 'none',
                    minHeight: 30,
                    boxSizing: 'border-box',
                  }}
                >
                  {lead.phone}
                </a>
              )}
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#0f0f0f',
                    border: '1px solid #2a2a2a',
                    color: '#C4A46A',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.72rem',
                    letterSpacing: '0.02em',
                    padding: '0.3rem 0.5rem',
                    textDecoration: 'none',
                    minHeight: 30,
                    boxSizing: 'border-box',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {lead.email}
                </a>
              ) : (
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.68rem',
                  color: '#555',
                  letterSpacing: '0.02em',
                  padding: '0.3rem 0',
                }}>
                  email pending
                </span>
              )}
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
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23666'/%3E%3C/svg%3E")`,
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
              color: '#555',
              letterSpacing: '0.04em',
            }}>
              {lead.assigned_to}
            </div>
          )}

          {/* Expand caret */}
          <div style={{ color: '#333', fontSize: '0.6rem' }}>
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{
          padding: '0 1rem 1.25rem 1rem',
          borderTop: '1px solid #131313',
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
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: '#C4A46A',
                  color: '#060606',
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
                Call {lead.phone}
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
                  color: '#C4A46A',
                  border: '1px solid #C4A46A',
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

          {/* Address + revenue row */}
          {(lead.street_address || lead.revenue || lead.email) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              marginBottom: '0.85rem',
            }}>
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
              {lead.email && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={labelStyle}>Email</div>
                  <a
                    href={`mailto:${lead.email}`}
                    style={{ ...valueStyle, color: '#C4A46A', textDecoration: 'none' }}
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
          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '0.85rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.6rem',
            }}>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.65rem',
                color: '#555',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                Touchpoints
              </div>
              <button
                onClick={() => setAddingTp(p => !p)}
                style={{
                  background: 'transparent',
                  border: '1px solid #2a2a2a',
                  color: '#888',
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
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
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
                      background: '#C4A46A',
                      color: '#060606',
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
                      border: '1px solid #2a2a2a',
                      color: '#666',
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
                borderBottom: '1px solid #111',
                fontSize: '0.75rem',
                fontFamily: "'Inter', sans-serif",
              }}>
                <span style={{ color: '#555', flexShrink: 0, minWidth: 88 }}>{tp.date}</span>
                <span style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.6rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#C4A46A',
                  flexShrink: 0,
                  minWidth: 52,
                  paddingTop: '0.05rem',
                }}>
                  {tp.channel}
                </span>
                <span style={{ color: '#aaa', lineHeight: 1.4 }}>{tp.note}</span>
              </div>
            ))}

            {tpsLoaded && touchpoints.length === 0 && !addingTp && (
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                color: '#333',
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
  color: '#555',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: '0.25rem',
}

const valueStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '0.8rem',
  color: '#aaa',
  lineHeight: 1.4,
}

const editInputStyle = {
  background: '#0a0a0a',
  border: '1px solid #1a1a1a',
  color: '#F6F6F4',
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
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23555'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.6rem center',
  paddingRight: '1.75rem',
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────
function CallBlock({ num, label, text, bullets, wide }) {
  if (!text) return null
  return (
    <div style={{
      background: '#0d0d0d',
      border: '1px solid #1a1a1a',
      borderLeft: '2px solid #C4A46A',
      padding: '0.6rem 0.75rem',
      gridColumn: wide ? '1 / -1' : 'auto',
    }}>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.6rem',
        color: '#C4A46A',
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
              color: '#D0D0CE',
              lineHeight: 1.5,
              marginBottom: '0.2rem',
            }}>
              <span style={{ color: '#C4A46A', flexShrink: 0 }}>•</span>
              <span>{g.replace(/^[-•*]\s*/, '')}</span>
            </div>
          ))
        : (
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.8rem',
            color: '#D0D0CE',
            lineHeight: 1.5,
          }}>
            {text}
          </div>
        )}
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
      <CallBlock num={6} label="How we help" text={lead.gaps} bullets wide />
      {lead.questions && lead.proof_points && (
        <div style={{
          gridColumn: '1 / -1',
          background: '#0a0a0a',
          border: '1px solid #161616',
          borderLeft: '2px solid #333',
          padding: '0.55rem 0.75rem',
        }}>
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.6rem',
            color: '#777',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '0.3rem',
          }}>
            Context for you — don't recite this at them
          </div>
          {lead.proof_points.split('\n').filter(Boolean).map((g, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '0.5rem',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.74rem',
              color: '#999',
              lineHeight: 1.5,
              marginBottom: '0.15rem',
            }}>
              <span style={{ color: '#555', flexShrink: 0 }}>•</span>
              <span>{g.replace(/^[-•*]\s*/, '')}</span>
            </div>
          ))}
        </div>
      )}
      {lead.notes && !lead.proof_points && (
        <div style={{
          gridColumn: '1 / -1',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.72rem',
          color: '#777',
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
    { key: 'company', label: 'Company', w: '16%' },
    { key: 'trade', label: 'Trade', w: '12%' },
    { key: 'city', label: 'City', w: '7%' },
    { key: 'day_route', label: 'Day', w: '4%' },
    { key: 'need_score', label: 'Need', w: '5%' },
    { key: 'employees', label: 'Emp', w: '5%' },
    { key: 'phone', label: 'Contact', w: '14%' },
    { key: 'street_address', label: 'Address', w: '17%' },
    { key: 'status', label: 'Status', w: '11%' },
    { key: 'assigned_to', label: 'Rep', w: '9%' },
  ]
  const sorted = [...leads].sort((a, b) => {
    const va = a[sort.key] ?? '', vb = b[sort.key] ?? ''
    if (va < vb) return -1 * sort.dir
    if (va > vb) return 1 * sort.dir
    return (b.need_score || 0) - (a.need_score || 0)
  })
  const th = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.6rem',
    color: '#C4A46A',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    textAlign: 'left',
    padding: '0.6rem 0.6rem',
    borderBottom: '1px solid #1f1f1f',
    background: '#060606',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  }
  const td = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.78rem',
    color: '#D0D0CE',
    padding: '0.55rem 0.6rem',
    borderBottom: '1px solid #101010',
    verticalAlign: 'top',
  }
  const sel = {
    background: '#0d0d0d',
    color: '#D0D0CE',
    border: '1px solid #1f1f1f',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.72rem',
    padding: '0.25rem 0.3rem',
    maxWidth: '9.5rem',
  }
  return (
    <div style={{ overflow: 'auto', maxHeight: '75vh' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1150, tableLayout: 'fixed' }}>
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
                  style={{ cursor: 'pointer', background: open ? '#0a0a0a' : 'transparent' }}
                >
                  <td style={{ ...td, fontWeight: 600, color: '#EDEDEB' }}>
                    {lead.company}
                    {lead.contact_name && (
                      <div style={{ fontWeight: 400, fontSize: '0.68rem', color: '#777', marginTop: '0.1rem' }}>
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
                      color: '#0a0a0a',
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      padding: '0.12rem 0.4rem',
                    }}>
                      {lead.need_score}
                    </span>
                  </td>
                  <td
                    title={lead.employees || ''}
                    style={{ ...td, fontSize: '0.72rem', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {lead.employees
                      ? lead.employees.replace(/\s*\(.*$/, '')
                      : <span style={{ color: '#444' }}>—</span>}
                  </td>
                  <td style={td}>
                    {lead.phone
                      ? <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} style={{ color: '#C4A46A', textDecoration: 'none', whiteSpace: 'nowrap', display: 'block' }}>{lead.phone}</a>
                      : <span style={{ color: '#444' }}>—</span>}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        onClick={e => e.stopPropagation()}
                        title={lead.email}
                        style={{
                          color: '#C4A46A',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '0.72rem',
                          marginTop: '0.15rem',
                        }}
                      >{lead.email}</a>
                    )}
                  </td>
                  <td style={{ ...td, fontSize: '0.72rem', color: '#999' }}>
                    {lead.street_address
                      ? <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(MAPS_ORIGIN)}&destination=${encodeURIComponent(lead.street_address)}`}
                          target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          title="Open drive route from Dunbar Dr"
                          style={{ color: '#999', textDecoration: 'none' }}
                        >{lead.street_address} <span style={{ color: '#C4A46A', fontSize: '0.65rem' }}>↗</span></a>
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
                    <td colSpan={cols.length} style={{ ...td, background: '#0a0a0a', padding: '0.75rem 0.9rem' }}>
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
    <div style={{ borderBottom: '1px solid #131313', background: '#050505' }}>
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
          color: '#C4A46A',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        <span>How this list is built — what the NEED number means</span>
        <span style={{ color: '#555' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          padding: '0 1rem 0.9rem 1rem',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.75rem',
          color: '#aaa',
          lineHeight: 1.55,
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            Every company on this page cleared two bars before it was added:
          </div>
          <div style={{ marginBottom: '0.35rem' }}>
            <span style={{ color: '#D0D0CE', fontWeight: 600 }}>1. Can they afford us.</span>{' '}
            15+ years state-licensed, commercial trade, a real crew (not a one-man shop), and not an
            enterprise that already runs an agency.
          </div>
          <div style={{ marginBottom: '0.4rem' }}>
            <span style={{ color: '#D0D0CE', fontWeight: 600 }}>2. Do they need us.</span>{' '}
            The <span style={{ color: '#C4A46A' }}>NEED</span> badge is a count of marketing gaps we
            verified by checking each company by hand. Minimum 4 to make the list. The gaps we look for:
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.3rem 0.9rem',
            marginBottom: '0.5rem',
          }}>
            {gapItems.map((g, i) => (
              <span key={i} style={{ color: '#888' }}>• {g}</span>
            ))}
          </div>
          <div style={{ color: '#888' }}>
            <span style={{ color: '#D95050', fontWeight: 600 }}>NEED 7</span> = worst presence, hottest door.
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
  const activeChip = { ...chipBase, background: '#C4A46A', color: '#060606' }
  const inactiveChip = { ...chipBase, background: '#0f0f0f', color: '#666', border: '1px solid #1a1a1a' }

  return (
    <div style={{
      background: '#060606',
      borderBottom: '1px solid #1a1a1a',
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

        <div style={{ width: 1, background: '#1a1a1a', flexShrink: 0, margin: '0 0.15rem' }} />

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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function OutreachTracker() {
  const [unlocked, setUnlocked] = useState(() =>
    localStorage.getItem('outreach_unlocked') === '1'
  )
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
      setLeads(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (unlocked) loadLeads()
  }, [unlocked, loadLeads])

  const updateLead = useCallback(async (id, field, value) => {
    const { error: err } = await sb
      .from('outreach_leads')
      .update({ [field]: value })
      .eq('id', id)
    if (!err) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
    }
  }, [])

  // Filter + group
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

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#060606',
      color: '#F6F6F4',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Sticky header */}
      <DashboardHeader
        leads={leads}
        onLock={() => {
          localStorage.removeItem('outreach_unlocked')
          setUnlocked(false)
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

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '0.4rem',
        padding: '0.45rem 1rem',
        borderBottom: '1px solid #131313',
        background: '#050505',
      }}>
        {['table', 'cards'].map(v => (
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
              background: view === v ? '#C4A46A' : 'none',
              color: view === v ? '#0a0a0a' : '#777',
              border: view === v ? '1px solid #C4A46A' : '1px solid #222',
              fontWeight: view === v ? 700 : 400,
            }}
          >
            {v === 'table' ? 'Spreadsheet' : 'Cards'}
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
          color: '#444',
        }}>
          Loading leads...
        </div>
      )}

      {error && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: '#D95050',
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
            background: '#060606',
            borderBottom: '1px solid #1a1a1a',
            borderTop: day !== (days[0]) ? '2px solid #0f0f0f' : '1px solid #1a1a1a',
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
                color: '#C4A46A',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '0.1rem',
              }}>
                {DAY_LABELS[day]}
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.65rem',
                color: '#444',
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
                  border: '1px solid #C4A46A',
                  color: '#C4A46A',
                  padding: '0.4rem 0.65rem',
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  display: 'inline-block',
                  minHeight: 36,
                  lineHeight: '36px',
                  boxSizing: 'border-box',
                  lineHeight: 'normal',
                  display: 'flex',
                  alignItems: 'center',
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
              color: '#333',
              borderBottom: '1px solid #1a1a1a',
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

      {/* Import note at bottom */}
      {!loading && !error && (
        <div style={{
          padding: '2rem 1rem',
          borderTop: '1px solid #111',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.7rem',
          color: '#2a2a2a',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          Batch 1 — 20 leads loaded.
          <br />
          To load aom-construction-master.csv: run{' '}
          <code style={{ color: '#3a3a3a', fontFamily: 'monospace' }}>
            scripts/import-outreach-leads.py
          </code>
        </div>
      )}
    </div>
  )
}
