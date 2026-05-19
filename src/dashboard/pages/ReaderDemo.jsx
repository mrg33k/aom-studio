// ReaderDemo — local demo route at /cv4/reader-demo. Mounts the
// ProjectFileReader primitive against three real fixtures (canon, tape,
// research drop) so the article-style typography + tape labeling + link
// behavior can be eyeballed at once.
//
// Mission: corner:files-in-app (R79-f2). Demo only — not part of the
// production Files surface. Fixtures live next to the component in
// cv4/fixtures/ so Vite can bundle them via ?raw without needing to
// open up server.fs.allow.

import { useState } from 'react'
import ProjectFileReader from '../cv4/ProjectFileReader.jsx'
import { C } from '../lib/cv3Colors.js'

import visionMd  from '../cv4/fixtures/sample-vision.md?raw'
import tapeMd    from '../cv4/fixtures/sample-tape.md?raw'
import researchMd from '../cv4/fixtures/sample-research.md?raw'

const FIXTURES = [
  {
    id: 'canon',
    name: 'VISION.md',
    kind: 'canon',
    content: visionMd,
    lastModified: '2026-05-19T10:14:00Z',
    chipLabel: 'CANON',
  },
  {
    id: 'tape',
    name: 'last-conversation.md',
    kind: 'tape',
    content: tapeMd,
    lastModified: '2026-05-19T14:02:00Z',
    chipLabel: 'TAPE',
  },
  {
    id: 'research',
    name: 'research/2026-05-19-r79-f1-read-api.md',
    kind: 'research-drop',
    content: researchMd,
    lastModified: '2026-05-19T11:48:00Z',
    chipLabel: 'RESEARCH DROP',
  },
]

const FF_MONO = `"JetBrains Mono", "SF Mono", Menlo, Monaco, monospace`

export default function ReaderDemo() {
  // Click events from intra-article links bubble up here; logged so the
  // verification screenshot also confirms the click-trap works.
  const [lastLink, setLastLink] = useState('')

  return (
    <div
      data-cv4-reader-demo
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        padding: '32px 16px 80px',
        boxSizing: 'border-box',
      }}
    >
      <DemoHeader lastLink={lastLink} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 28,
          maxWidth: 1440,
          margin: '0 auto',
        }}
      >
        {FIXTURES.map((f) => (
          <section
            key={f.id}
            data-fixture={f.id}
            style={{
              background: C.s1,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            <div
              style={{
                padding: '12px 20px',
                borderBottom: `1px solid ${C.border}`,
                background: C.bg2,
                fontFamily: FF_MONO,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: C.text2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{f.chipLabel}</span>
              <span style={{ opacity: 0.55 }}>{f.name}</span>
            </div>
            <div style={{ padding: '0 0 24px' }}>
              <ProjectFileReader
                content={f.content}
                kind={f.kind}
                name={f.name}
                lastModified={f.lastModified}
                onLinkClick={(href) => setLastLink(`${f.id} → ${href}`)}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function DemoHeader({ lastLink }) {
  return (
    <header
      style={{
        maxWidth: 1440,
        margin: '0 auto 28px',
        padding: '0 6px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          fontFamily: FF_MONO,
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: C.text2,
          opacity: 0.8,
        }}
      >
        corner:files-in-app · R79-f2 · reader primitive demo
      </div>
      <h1
        style={{
          fontFamily: `-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, sans-serif`,
          fontSize: 'clamp(22px, 3vw, 30px)',
          fontWeight: 700,
          margin: 0,
          letterSpacing: '-0.02em',
          color: C.text,
        }}
      >
        ProjectFileReader — canon · tape · research drop
      </h1>
      <p
        style={{
          margin: 0,
          color: C.text2,
          maxWidth: 720,
          lineHeight: 1.55,
          fontSize: 14,
        }}
      >
        Three real fixtures from <code style={{ fontFamily: FF_MONO, fontSize: 12, color: C.accent }}>corner/missions/files-in-app/</code>.
        Same primitive renders all three; the <strong>tape</strong> variant adds the agent-memory chip and a subtle accent tint.
        Internal links are intercepted (no navigation); external links open in a new tab.
      </p>
      <div
        style={{
          fontFamily: FF_MONO,
          fontSize: 11,
          color: lastLink ? C.accent : C.muted,
          letterSpacing: '0.04em',
          minHeight: 14,
        }}
      >
        {lastLink ? `last intercepted link: ${lastLink}` : 'click a link inside any article to test the intercept →'}
      </div>
    </header>
  )
}
