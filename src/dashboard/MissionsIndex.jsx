// MissionsIndex — R5 of corner:mission-rooms (2026-05-15).
//
// Standalone /dashboard/missions index page. Lists every mission room that's
// currently navigable via /dashboard/mission/<slug>. Demotes the task table
// by giving missions their own primary information architecture: missions
// are first-class navigable units alongside projects, not buried inside
// the right-rail tasks panel.
//
// Discovery is hardcoded for now — the canary + the four R4-migrated
// missions. Dynamic discovery (read corner/missions/ via an API endpoint)
// is future work; the architectural point of R5 is demoting the task
// table, which a hardcoded list satisfies just as well as a dynamic one
// for the visual-check round.

import React from 'react'
import { Link } from 'react-router-dom'

const MISSIONS = [
  {
    slug: 'mission-rooms',
    title: 'Mission Rooms',
    summary: 'The mission about this work with persistent per mission agents, sleep and wake daemon and mission as clickable unit. Canary for the migration.',
  },
  {
    slug: 'mission-corner-files-in-app',
    title: 'Files In App',
    summary: 'In-app reader surface for project files (CONTEXT/VISION/RESEARCH/BUILD).',
  },
  {
    slug: 'mission-corner-launch-readiness',
    title: 'Launch Readiness',
    summary: 'Cross-cutting readiness mission for Corner public launch.',
  },
  {
    slug: 'mission-ambition-mechanical-google-ads-launch',
    title: 'Ambition Mechanical Google Ads Launch',
    summary: 'Google Ads launch motion for Ambition Mechanical.',
  },
  {
    slug: 'mission-kohrs-social-content-pipeline',
    title: 'Kohrs Social Content Pipeline',
    summary: 'Production pipeline for Kohrs social content.',
  },
]

export default function MissionsIndex() {
  return (
    <div data-cv4 style={{
      minHeight: '100vh',
      background: 'var(--bg, #0f1115)',
      color: 'var(--text, #e8e6df)',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      padding: '32px 40px',
    }}>
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 20,
        marginBottom: 28,
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            opacity: 0.55,
            marginBottom: 4,
          }}>
            missions · primary surface · R5
          </div>
          <h1 style={{
            fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 800,
            fontSize: 38,
            margin: 0,
            letterSpacing: '-0.03em',
          }}>Missions</h1>
          <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7, maxWidth: 720 }}>
            Each mission has a persistent agent attached to it. Click into a
            mission to see its conversation, history, and live work.
          </p>
        </div>
        <Link to="/dashboard" style={{
          color: 'var(--accent, #d4a04a)',
          fontSize: 12,
        }}>← back to dashboard</Link>
      </header>

      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: 14,
      }}>
        {MISSIONS.map(m => (
          <li key={m.slug}>
            <Link to={`/dashboard/mission/${m.slug}`} style={{
              display: 'block',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
              padding: '18px 20px',
              color: 'inherit',
              textDecoration: 'none',
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.borderColor = 'rgba(212,160,74,0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            }}>
              <div style={{
                fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 6,
                letterSpacing: '-0.02em',
              }}>{m.title}</div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                opacity: 0.45,
                marginBottom: 10,
              }}>{m.slug}</div>
              <div style={{
                fontSize: 13,
                lineHeight: 1.5,
                opacity: 0.78,
              }}>{m.summary}</div>
            </Link>
          </li>
        ))}
      </ul>

      <footer style={{
        marginTop: 40,
        paddingTop: 20,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 12,
        opacity: 0.5,
        maxWidth: 720,
      }}>
        Tasks are now mission-internal substeps (R5 demote). The dashboard
        chat surface still exists at <Link to="/dashboard" style={{ color: 'var(--accent, #d4a04a)' }}>/dashboard</Link>; the
        right-rail task list is no longer the primary navigation.
      </footer>
    </div>
  )
}
