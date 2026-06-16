// CV6Gallery.jsx — corner:corner-ui-cv6. The /cv6 COMPONENT GALLERY.
//
// One navigable page that renders the REAL Corner app components (the same
// files /dashboard runs), each shown in every state, on one surface. This is
// the design surface for the CV6 redesign: restyle a piece here and the app
// inherits it, because the gallery imports the live component — it does not
// copy it.
//
// Each rendered state is wrapped in an ErrorBoundary so one piece that throws
// degrades to a small note instead of taking down the whole page.
//
// Adding a piece = append an entry to REGISTRY. Nothing else changes.
// Data-driven views (chat list, files, tasks, mail room) fetch on mount and
// need a fixture / mock-provider mode — that is the next batch, tracked in
// cv4/COMPONENT-MANIFEST.md (NEEDS-PROVIDERS).

import { Component, useEffect, useState } from 'react'

// ── Real CV4 components (the same files the live app renders) ──
import SkillsBadge from './cv4/SkillsBadge.jsx'
import MissionChip from './cv4/MissionChip.jsx'
import MailChip from './cv4/MailChip.jsx'
import BucketSection from './cv4/BucketSection.jsx'
import ProjectFileReader from './cv4/ProjectFileReader.jsx'
import MailAccountSwitcher from './cv4/MailAccountSwitcher.jsx'

const SHELL = {
  bg: '#0A0F14',
  panel: '#121A22',
  line: 'rgba(255,255,255,0.08)',
  text: '#E8EBEF',
  text2: '#9AA4B0',
  text3: '#5E6975',
  accent: '#10B981',
  mono: "'JetBrains Mono', ui-monospace, monospace",
  sans: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
}

// ── Crash isolation: one broken piece must not white-screen the gallery ──
class StateBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false, msg: '' }
  }
  static getDerivedStateFromError(err) {
    return { failed: true, msg: (err && err.message) || 'render error' }
  }
  render() {
    if (this.state.failed) {
      return (
        <div
          style={{
            fontFamily: SHELL.mono,
            fontSize: 12,
            color: '#F59E9E',
            border: '1px solid rgba(245,158,158,0.3)',
            background: 'rgba(245,158,158,0.06)',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          couldn’t render this state · {this.state.msg}
        </div>
      )
    }
    return this.props.children
  }
}

// Sample rows for the BucketSection expanded state.
const bucketRows = (
  <div style={{ padding: '4px 0' }}>
    {['Elon', 'Studio', 'Gary'].map((n) => (
      <div
        key={n}
        style={{ padding: '8px 14px', fontSize: 13, color: '#C7CDD6', fontFamily: SHELL.sans }}
      >
        {n}
      </div>
    ))}
  </div>
)

// Realistic markdown for the file reader.
const CANON_MD = `# corner:integrations

**Status:** IN PROGRESS

Build real-time Slack sync into the room so a message in Slack lands in the
matching Corner room within seconds.

## Pillars
1. Two-way sync, not a one-way mirror.
2. The room is the source of truth.
3. No bytes through Supabase Storage.`

const TAPE_MD = `Session 2026-06-16: framed the Skills button on a defined canvas
plate after Steffen's send-back. Tightened the state-card rhythm. Next: pull
the rest of the safe pieces onto /cv6 behind an error boundary.`

// ── The component registry. One entry per real piece. ──
const REGISTRY = [
  {
    id: 'skills-badge',
    name: 'Skills button',
    purpose: 'Left-rail button that opens the Skills shelf. Lives on the dark drawer.',
    canvasBg: '#0E1621',
    stageWidth: 520,
    frame: 264,
    states: [
      { label: 'Resting', render: () => <SkillsBadge open={false} onToggle={() => {}} /> },
      { label: 'Open', render: () => <SkillsBadge open={true} onToggle={() => {}} /> },
    ],
  },
  {
    id: 'mission-chip',
    name: 'Mission chip',
    purpose: 'Sits above the composer when a mission is attached, scoping the next message to that room.',
    canvasBg: '#0B0F14',
    stageWidth: 680,
    frame: 612,
    states: [
      {
        label: 'Attached',
        render: () => (
          <MissionChip mission={{ name: 'Slack real-time sync', path: 'corner:integrations' }} onClear={() => {}} />
        ),
      },
      {
        label: 'Long name (truncation)',
        render: () => (
          <MissionChip
            mission={{ name: 'Brandon Wiley documentary — LBX launch film cut review', path: 'corner:brandon-wiley:lbx' }}
            onClear={() => {}}
          />
        ),
      },
    ],
  },
  {
    id: 'mail-chip',
    name: 'Mail chip',
    purpose: 'Sits above the composer when an email is attached, so the reply gets the thread as context.',
    canvasBg: '#0B0F14',
    stageWidth: 680,
    frame: 612,
    states: [
      {
        label: 'Named sender',
        render: () => (
          <MailChip email={{ from: { name: 'Alice Chen' }, subject: 'Re: Q3 partnership deck' }} onClear={() => {}} />
        ),
      },
      {
        label: 'No name (falls back to address)',
        render: () => (
          <MailChip email={{ from: { email: 'billing@acme.com' }, subject: 'Invoice #2231 is ready' }} onClear={() => {}} />
        ),
      },
    ],
  },
  {
    id: 'bucket-section',
    name: 'Bucket section',
    purpose: 'Collapsible group header in the left rail (agents, projects). Shows a count and folds its contents.',
    canvasBg: '#0E1621',
    stageWidth: 440,
    frame: 320,
    states: [
      {
        label: 'Collapsed',
        render: () => <BucketSection slug="agents" label="PINNED AGENTS" count={3} open={false} onToggle={() => {}} />,
      },
      {
        label: 'Expanded',
        render: () => (
          <BucketSection slug="agents" label="PINNED AGENTS" count={3} open={true} onToggle={() => {}}>
            {bucketRows}
          </BucketSection>
        ),
      },
      {
        label: 'Empty (disabled)',
        render: () => <BucketSection slug="projects" label="PROJECTS" count={0} open={false} onToggle={() => {}} />,
      },
    ],
  },
  {
    id: 'file-reader',
    name: 'File reader',
    purpose: "Article-style reader for a room's canon docs (VISION/BUILD) and the agent's tape.",
    canvasBg: '#0A0E13',
    stageWidth: 760,
    frame: 720,
    maxHeight: 420,
    states: [
      {
        label: 'Canon doc',
        render: () => (
          <ProjectFileReader content={CANON_MD} kind="canon" name="VISION.md" lastModified="2026-06-16T14:32:00Z" />
        ),
      },
      {
        label: 'Tape (agent notes)',
        render: () => (
          <ProjectFileReader content={TAPE_MD} kind="tape" name="last-conversation.md" lastModified="2 hours ago" />
        ),
      },
    ],
  },
  {
    id: 'mail-switcher',
    name: 'Mail account switcher',
    purpose: 'Switches the active connected email account in the Mail Room.',
    canvasBg: '#0E1621',
    stageWidth: 460,
    frame: 360,
    states: [
      {
        label: 'Resting',
        render: () => (
          <MailAccountSwitcher
            connections={[
              { id: 'c1', account_email: 'patrik@aheadofmarket.com', scope: 'personal' },
              { id: 'c2', account_email: 'team@aom.com', scope: 'shared' },
            ]}
            active={{ id: 'c1', account_email: 'patrik@aheadofmarket.com', scope: 'personal' }}
            onChange={() => {}}
          />
        ),
      },
    ],
  },
  // NOTE: ChatWaveBackground (the animated WebGL chat backdrop) was trialled
  // here but reads as a blank box in a static gallery frame and is not a
  // CSS-restyleable piece. Backgrounds need a dedicated live-preview treatment
  // (animated, with sample chat overlaid) — tracked for a later round.
]

const idFromHash = () => {
  if (typeof window === 'undefined') return REGISTRY[0].id
  // Query param (?piece=mail-chip) is the robust deep-link — survives tools and
  // shares that mangle URL fragments. Hash (#mail-chip) is the in-app shortcut.
  const q = new URLSearchParams(window.location.search).get('piece')
  if (q && REGISTRY.some((c) => c.id === q)) return q
  const h = window.location.hash.replace(/^#/, '')
  return REGISTRY.some((c) => c.id === h) ? h : REGISTRY[0].id
}

export default function CV6Gallery() {
  const [activeId, setActiveId] = useState(idFromHash)
  const active = REGISTRY.find((c) => c.id === activeId) || REGISTRY[0]

  // Hash deep-linking: each piece is shareable (/cv6#mail-chip) and the
  // back/forward buttons move between pieces.
  useEffect(() => {
    const onHash = () => setActiveId(idFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const select = (id) => {
    if (typeof window !== 'undefined') window.location.hash = id
    setActiveId(id)
  }

  return (
    <div
      data-cv6
      style={{
        minHeight: '100vh',
        background: SHELL.bg,
        color: SHELL.text,
        fontFamily: SHELL.sans,
        display: 'flex',
      }}
    >
      {/* ── Left nav: every piece in the app ── */}
      <aside
        style={{
          width: 248,
          flexShrink: 0,
          borderRight: `1px solid ${SHELL.line}`,
          padding: '22px 16px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: SHELL.accent, display: 'inline-block' }} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>CV6 Gallery</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: SHELL.text3,
            fontFamily: SHELL.mono,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: 20,
            paddingLeft: 16,
          }}
        >
          {REGISTRY.length} pieces
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {REGISTRY.map((c) => {
            const on = c.id === activeId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                style={{
                  textAlign: 'left',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid transparent',
                  background: on ? 'rgba(16,185,129,0.10)' : 'transparent',
                  borderColor: on ? 'rgba(16,185,129,0.30)' : 'transparent',
                  color: on ? SHELL.text : SHELL.text2,
                  fontSize: 13,
                  fontWeight: on ? 600 : 500,
                  cursor: 'pointer',
                  fontFamily: SHELL.sans,
                }}
              >
                {c.name}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Main stage: the selected piece in all its states ── */}
      <main style={{ flex: 1, padding: '40px 48px', maxWidth: 1100 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            {active.name}
          </h1>
          <p style={{ fontSize: 14, color: SHELL.text2, margin: 0, maxWidth: 620 }}>{active.purpose}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {active.states.map((s) => (
            <div
              key={s.label}
              style={{
                border: `1px solid ${SHELL.line}`,
                borderRadius: 14,
                overflow: 'hidden',
                background: SHELL.panel,
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  borderBottom: `1px solid ${SHELL.line}`,
                  fontSize: 11,
                  fontFamily: SHELL.mono,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: SHELL.text3,
                }}
              >
                {s.label}
              </div>
              <div style={{ padding: 18, display: 'flex', justifyContent: 'center' }}>
                {/* Defined canvas plate: the component sits on a tightly-sized,
                    centered stage (its home dark surface) that hugs the piece. */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: active.stageWidth || 560,
                    background: active.canvasBg || 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    padding: '28px 32px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    maxHeight: active.maxHeight || 'none',
                    overflow: active.maxHeight ? 'auto' : 'visible',
                  }}
                >
                  <div style={{ width: '100%', maxWidth: active.frame || 'none' }}>
                    <StateBoundary>{s.render()}</StateBoundary>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
