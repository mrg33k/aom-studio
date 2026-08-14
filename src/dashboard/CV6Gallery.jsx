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
// Feedback: every piece has a notes box (saved to localStorage) + a "Copy my
// feedback" button that bundles all notes into one block to paste back. The
// page is responsive — sidebar collapses to a top picker under 720px.
//
// Adding a piece = append an entry to REGISTRY. Nothing else changes.
// Data-driven views (chat list, files, tasks, mail room) fetch on mount and
// need a fixture / mock-provider mode — that is the next batch, tracked in
// cv4/COMPONENT-MANIFEST.md (NEEDS-PROVIDERS).

import { Component, useEffect, useState } from 'react'
import './cv6.css'

// ── Real CV4 components (the same files the live app renders) ──
import SkillsBadge from './cv4/SkillsBadge.jsx'
import MissionChip from './cv4/MissionChip.jsx'
import MailChip from './cv4/MailChip.jsx'
import BucketSection from './cv4/BucketSection.jsx'
import ProjectFileReader from './cv4/ProjectFileReader.jsx'
import MailAccountSwitcher from './cv4/MailAccountSwitcher.jsx'

// ── Real full screens (rendered live so Steffen restyles them in place) ──
import HomeView, { SupportToolOverlay } from './cv4/HomeView.jsx'
import SupportDashboard from './cv4/SupportDashboard.jsx'

// R54: light NEUTRAL canvas (was near-black #0A0F14). A dark page made every
// LIGHT app frame look like it had black margins ("black edges of the page").
// A clean light canvas lets light frames blend and dark frames read as intentional
// dark windows — the same way Storybook/Figma present components on a neutral desk.
const SHELL = {
  bg: '#ECECEE',
  panel: '#FFFFFF',
  line: 'rgba(0,0,0,0.10)',
  text: '#1A1A1A',
  text2: '#555B63',
  text3: '#8A9099',
  accent: '#0E8E63',
  mono: "'JetBrains Mono', ui-monospace, monospace",
  sans: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
}
// Inputs/surfaces that were hardcoded dark in the chrome, now light to match.
const SHELL_INPUT_BG = '#FFFFFF'

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
            mission={{ name: 'Brandon Wiley documentary for LBX launch film cut review', path: 'corner:brandon-wiley:lbx' }}
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

// ── Sample data for the live full screens (no auth, no backend) ──
const MOCK_USER = { name: 'Patrik', initials: 'P', email: 'patrik@aheadofmarket.com' }
const MOCK_AGENTS = [
  { slug: 'elon', name: 'Elon', initials: 'E', is_ea: true, status: 'idle' },
  { slug: 'rex', name: 'Rex', initials: 'R', is_ea: true, status: 'running' },
  { slug: 'gary', name: 'Gary', initials: 'G', is_ea: true, status: 'idle' },
]
const MOCK_PROJECTS = [
  { slug: 'corner', name: 'Corner', status: 'in-progress', unread: 0 },
  { slug: 'space-rising', name: 'Space Rising', status: 'in-progress', unread: 2 },
  { slug: 'ambition-mechanical', name: 'Ambition Mechanical', status: 'in-progress', unread: 0 },
  { slug: 'brandon-wiley', name: 'Brandon Wiley Documentary', status: 'in-progress', unread: 0 },
  { slug: 'iso-wizard', name: 'Iso Wizard', status: 'in-progress', unread: 1 },
]
const SCREEN_PROPS = {
  user: MOCK_USER,
  worldId: 'aom',
  agents: MOCK_AGENTS,
  projectRooms: MOCK_PROJECTS,
  needsYou: [
    {
      key: 'support-1',
      label: '3 support requests',
      detail: 'Waiting for your reply',
      onOpen: () => console.log('navigate to support'),
    },
    {
      key: 'command-1',
      label: 'Corner • Deploy',
      detail: 'Ready for approval',
      onOpen: () => console.log('navigate to corner deploy command'),
    },
    {
      key: 'command-2',
      label: 'Space Rising • Review',
      detail: 'Design gates pending',
      onOpen: () => console.log('navigate to space rising review command'),
    },
  ],
  onSelectAgent: () => {},
  onSelectProject: () => {},
  onOpenSearch: () => {},
  cv6: true, // R7: enable CV6 layout (keyboard nav, missions-primary, happening now)
}

// Themed device frame: an app-window preview (browser chrome + bordered,
// scrollable viewport) that scopes the CV4/CV5 theme so light + dark render.
// The window chrome makes a full screen read unmistakably as "a screen",
// distinct from the small component pieces.
function ScreenFrame({ theme, cv5, label, children }) {
  const attrs = { 'data-shell': 'cv4', 'data-theme': theme, 'data-cv4': 'true', 'data-cv6': 'true' }
  if (cv5) attrs['data-cv5'] = 'true'
  const light = theme === 'light'
  const edge = light ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.13)'
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: `1px solid ${edge}`,
        boxShadow: '0 10px 34px rgba(0,0,0,0.40)',
        background: light ? '#EDE9E0' : '#0A0F14',
      }}
    >
      {/* window chrome */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '9px 13px',
          borderBottom: `1px solid ${edge}`,
          background: light ? '#E3DED3' : '#0E141B',
        }}
      >
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.9 }} />
        ))}
        <span
          style={{
            marginLeft: 8,
            fontSize: 11,
            fontFamily: SHELL.mono,
            letterSpacing: '0.04em',
            color: light ? '#857C70' : SHELL.text3,
          }}
        >
          {label}
        </span>
      </div>
      <div style={{ minHeight: '100vh', overflow: 'auto' }}>
        <div {...attrs} style={{ minHeight: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Full screens, rendered live in both themes ──
const SCREENS = [
  {
    id: 'screen-home',
    name: 'Home',
    purpose: 'The dashboard home with projects, agents and where you left off.',
    wide: true,
    states: [
      { label: 'Dark', render: () => <ScreenFrame theme="dark" label="Home · Dark"><HomeView {...SCREEN_PROPS} /></ScreenFrame> },
      { label: 'Light', render: () => <ScreenFrame theme="light" label="Home · Light"><HomeView {...SCREEN_PROPS} /></ScreenFrame> },
    ],
  },
  // Command Deck removed 2026-06-16 (Patrik): it was an unapproved attempt at
  // the home screen, not a real surface. Out of the CV6 redesign scope.
  {
    id: 'screen-support',
    name: 'Support',
    purpose: 'Clean 3-column layout (Needs You | In Progress | Handled) with real support data and Resolve + Open Gmail actions.',
    wide: true,
    states: [
      {
        label: 'Default',
        render: () => (
          <ScreenFrame theme="dark" label="Support · CV6">
            <div style={{ padding: '16px 20px', height: '100%' }}>
              <SupportToolOverlay worldId="aom" />
            </div>
          </ScreenFrame>
        ),
      },
    ],
  },
  {
    id: 'screen-projects',
    name: 'Projects tool',
    purpose: 'Finder/Dropbox 3-column browser. Drag a mission onto a project to move it (macOS-style confirm), live create, mobile drill.',
    wide: true,
    states: [
      { label: 'Dark', render: () => <ScreenFrame theme="dark" label="Projects · CV6"><HomeView {...SCREEN_PROPS} initialTool="projects" /></ScreenFrame> },
      { label: 'Light', render: () => <ScreenFrame theme="light" label="Projects · CV6"><HomeView {...SCREEN_PROPS} initialTool="projects" /></ScreenFrame> },
    ],
  },
  {
    id: 'screen-review',
    name: 'Review tool',
    purpose: 'Excel/inventory list (Project · Mission · Item · Type · eye). Click a ready item for the full review modal.',
    wide: true,
    states: [
      { label: 'Dark', render: () => <ScreenFrame theme="dark" label="Review · CV6"><HomeView {...SCREEN_PROPS} initialTool="review" /></ScreenFrame> },
      { label: 'Light', render: () => <ScreenFrame theme="light" label="Review · CV6"><HomeView {...SCREEN_PROPS} initialTool="review" /></ScreenFrame> },
    ],
  },
  {
    id: 'screen-tracker',
    name: 'Tracker tool',
    purpose: 'Per-room custom spreadsheets (bug tracker / storyboard templates). Toggle ON and the agent works the list to done.',
    wide: true,
    states: [
      { label: 'Dark', render: () => <ScreenFrame theme="dark" label="Tracker · CV6"><HomeView {...SCREEN_PROPS} initialTool="tracker" /></ScreenFrame> },
      { label: 'Light', render: () => <ScreenFrame theme="light" label="Tracker · CV6"><HomeView {...SCREEN_PROPS} initialTool="tracker" /></ScreenFrame> },
    ],
  },
  {
    id: 'screen-files',
    name: 'Files tool',
    purpose: 'Finder/Dropbox 3-column file browser for a project. Folders → subfolders → file preview.',
    wide: true,
    states: [
      { label: 'Dark', render: () => <ScreenFrame theme="dark" label="Files · CV6"><HomeView {...SCREEN_PROPS} initialTool="files" /></ScreenFrame> },
      { label: 'Light', render: () => <ScreenFrame theme="light" label="Files · CV6"><HomeView {...SCREEN_PROPS} initialTool="files" /></ScreenFrame> },
    ],
  },
  {
    id: 'screen-chat',
    name: 'Chat tool',
    purpose: 'Full room view: rooms list + inline create (left), the room chat (middle), the room files (right).',
    wide: true,
    states: [
      { label: 'Dark', render: () => <ScreenFrame theme="dark" label="Chat · CV6"><HomeView {...SCREEN_PROPS} initialTool="chat" /></ScreenFrame> },
      { label: 'Light', render: () => <ScreenFrame theme="light" label="Chat · CV6"><HomeView {...SCREEN_PROPS} initialTool="chat" /></ScreenFrame> },
    ],
  },
  {
    id: 'screen-command',
    name: 'Command Deck',
    purpose: 'Live response deck with one card per thing needing you and a best guess reply preloaded with a countdown that auto sends.',
    wide: true,
    states: [
      { label: 'Dark', render: () => <ScreenFrame theme="dark" label="Command · CV6"><HomeView {...SCREEN_PROPS} initialTool="command" /></ScreenFrame> },
      { label: 'Light', render: () => <ScreenFrame theme="light" label="Command · CV6"><HomeView {...SCREEN_PROPS} initialTool="command" /></ScreenFrame> },
    ],
  },
  {
    id: 'screen-scribe',
    name: 'Live Scribe',
    purpose: 'Call companion in the CV6 shell with live transcript and tap to name speakers plus a living brief.',
    wide: true,
    states: [
      { label: 'Dark', render: () => <ScreenFrame theme="dark" label="Live Scribe · CV6"><HomeView {...SCREEN_PROPS} initialTool="scribe" /></ScreenFrame> },
      { label: 'Light', render: () => <ScreenFrame theme="light" label="Live Scribe · CV6"><HomeView {...SCREEN_PROPS} initialTool="scribe" /></ScreenFrame> },
    ],
  },
]

// Screens first, then pieces. One flat list for lookup + feedback.
const ALL = [...SCREENS, ...REGISTRY]

const idFromHash = () => {
  if (typeof window === 'undefined') return ALL[0].id
  // Query param (?piece=mail-chip) is the robust deep-link — survives tools and
  // shares that mangle URL fragments. Hash (#mail-chip) is the in-app shortcut.
  const q = new URLSearchParams(window.location.search).get('piece')
  if (q && ALL.some((c) => c.id === q)) return q
  const h = window.location.hash.replace(/^#/, '')
  return ALL.some((c) => c.id === h) ? h : ALL[0].id
}

// ── Feedback: per-piece notes, saved locally, copied out as one block ──
const FB_KEY = 'cv6-feedback-v1'
const loadFeedback = () => {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(FB_KEY) || '{}')
  } catch {
    return {}
  }
}

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

export default function CV6Gallery() {
  const [activeId, setActiveId] = useState(idFromHash)
  const active = ALL.find((c) => c.id === activeId) || ALL[0]
  const isMobile = useIsMobile()
  const [feedback, setFeedback] = useState(loadFeedback)
  const [copied, setCopied] = useState(false)

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
    if (isMobile && typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  const saveNote = (id, text) => {
    setFeedback((prev) => {
      const next = { ...prev, [id]: text }
      try {
        window.localStorage.setItem(FB_KEY, JSON.stringify(next))
      } catch {
        /* private mode / quota — notes stay in memory for this session */
      }
      return next
    })
  }

  const notedCount = ALL.filter((c) => (feedback[c.id] || '').trim()).length

  const copyAll = () => {
    const blocks = ALL.filter((c) => (feedback[c.id] || '').trim()).map(
      (c) => `## ${c.name}\n${feedback[c.id].trim()}`
    )
    const text = blocks.length
      ? `CV6 gallery feedback\n\n${blocks.join('\n\n')}`
      : 'No notes yet. Type some under a piece first.'
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      })
    }
  }

  // ── Shared bits ──
  const copyButton = (
    <button
      type="button"
      onClick={copyAll}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 13px',
        borderRadius: 9,
        border: `1px solid ${copied ? 'rgba(16,185,129,0.5)' : SHELL.line}`,
        background: copied ? 'rgba(14,142,99,0.12)' : 'rgba(0,0,0,0.03)',
        color: copied ? SHELL.accent : SHELL.text2,
        fontFamily: SHELL.sans,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
 {copied ? 'Copied, paste it to me' : `Copy my feedback${notedCount ? ` (${notedCount})` : ''}`}
    </button>
  )

  const navItem = (c) => {
    const on = c.id === activeId
    const hasNote = (feedback[c.id] || '').trim().length > 0
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => select(c.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
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
        <span>{c.name}</span>
        {hasNote && (
          <span
            title="You left a note"
            style={{ width: 6, height: 6, borderRadius: '50%', background: SHELL.accent, flexShrink: 0 }}
          />
        )}
      </button>
    )
  }

  const groupHeader = (label) => (
    <div
      style={{
        fontSize: 10,
        color: SHELL.text3,
        fontFamily: SHELL.mono,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '0 12px',
        margin: '14px 0 6px',
      }}
    >
      {label}
    </div>
  )

  const nav = (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {groupHeader('Screens')}
      {SCREENS.map(navItem)}
      {groupHeader('Pieces')}
      {REGISTRY.map(navItem)}
    </nav>
  )

  const stage = (
    <main
      style={{
        flex: 1,
        padding: isMobile ? '20px 16px 64px' : '40px 48px',
        maxWidth: isMobile ? '100%' : active.wide ? 1500 : 1100,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
          {active.name}
        </h1>
        <p style={{ fontSize: 14, color: SHELL.text2, margin: 0, maxWidth: 620 }}>{active.purpose}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: active.wide ? 32 : 14 }}>
        {active.states.map((s) =>
          active.wide ? (
            // Full screens: the window frame IS the container. No outer panel.
            <StateBoundary key={s.label}>{s.render()}</StateBoundary>
          ) : (
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
              <div style={{ padding: isMobile ? 12 : 18, display: 'flex', justifyContent: 'center' }}>
                {/* Defined canvas plate: the component sits on a tightly-sized,
                    centered stage (its home dark surface) that hugs the piece. */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: isMobile ? '100%' : active.stageWidth || 560,
                    background: active.canvasBg || 'rgba(255,255,255,0.02)',
                    borderRadius: 12,
                    padding: isMobile ? '22px 16px' : '28px 32px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    maxHeight: active.maxHeight || 'none',
                    overflow: active.maxHeight ? 'auto' : 'visible',
                  }}
                >
                  <div style={{ width: '100%', maxWidth: isMobile ? '100%' : active.frame || 'none' }}>
                    <StateBoundary>{s.render()}</StateBoundary>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* ── Per-piece feedback ── */}
      <div
        style={{
          marginTop: 22,
          border: `1px solid ${SHELL.line}`,
          borderRadius: 14,
          background: SHELL.panel,
          padding: 16,
        }}
      >
        <label
          htmlFor="cv6-note"
          style={{
            display: 'block',
            fontSize: 11,
            fontFamily: SHELL.mono,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: SHELL.text3,
            marginBottom: 10,
          }}
        >
          Your notes on {active.name}
        </label>
        <textarea
          id="cv6-note"
          value={feedback[active.id] || ''}
          onChange={(e) => saveNote(active.id, e.target.value)}
 placeholder="What should change here? Be as rough as you like, it saves as you type."
          rows={4}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            background: SHELL_INPUT_BG,
            border: `1px solid ${SHELL.line}`,
            borderRadius: 10,
            color: SHELL.text,
            fontFamily: SHELL.sans,
            fontSize: 14,
            lineHeight: 1.5,
            padding: '12px 14px',
            outline: 'none',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: SHELL.text3, fontFamily: SHELL.sans }}>
            Saves automatically. {notedCount ? `${notedCount} piece${notedCount > 1 ? 's' : ''} noted.` : 'No notes yet.'}
          </span>
          {copyButton}
        </div>
      </div>
    </main>
  )

  // ── Mobile: top picker bar instead of the side rail ──
  if (isMobile) {
    return (
      <div data-cv6 style={{ minHeight: '100vh', background: SHELL.bg, color: SHELL.text, fontFamily: SHELL.sans }}>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'rgba(236,236,238,0.92)',
            backdropFilter: 'blur(8px)',
            borderBottom: `1px solid ${SHELL.line}`,
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: SHELL.accent }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>CV6 Gallery</span>
              <span style={{ fontSize: 11, color: SHELL.text3, fontFamily: SHELL.mono }}>{SCREENS.length} screens · {REGISTRY.length} pieces</span>
            </div>
            {copyButton}
          </div>
          <select
            value={activeId}
            onChange={(e) => select(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: SHELL_INPUT_BG,
              border: `1px solid ${SHELL.line}`,
              borderRadius: 10,
              color: SHELL.text,
              fontFamily: SHELL.sans,
              fontSize: 15,
              fontWeight: 600,
              padding: '11px 12px',
              appearance: 'none',
              outline: 'none',
            }}
          >
            <optgroup label="Screens">
              {SCREENS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {(feedback[c.id] || '').trim() ? '  •' : ''}
                </option>
              ))}
            </optgroup>
            <optgroup label="Pieces">
              {REGISTRY.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {(feedback[c.id] || '').trim() ? '  •' : ''}
                </option>
              ))}
            </optgroup>
          </select>
        </header>
        {stage}
      </div>
    )
  }

  // ── Desktop: side rail + stage ──
  return (
    <div
      data-cv6
      style={{ minHeight: '100vh', background: SHELL.bg, color: SHELL.text, fontFamily: SHELL.sans, display: 'flex' }}
    >
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
          {SCREENS.length} screens · {REGISTRY.length} pieces
        </div>
        {nav}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${SHELL.line}` }}>{copyButton}</div>
      </aside>
      {stage}
    </div>
  )
}