// FilesPanelDemo — local demo route at /cv4/files-demo. Mounts the
// FilesPanel primitive (R79-f3) against a real project (ambition-mechanical
// by default; override via ?slug=<project-slug>) so the rail-shaped panel +
// reader modal can be eyeballed without standing up Supabase auth.
//
// Mission: corner:files-in-app (R79-f3). Demo only — not part of the
// production Files surface. Production mount lives inside RightMenu.jsx.

import { useMemo } from 'react'
import FilesPanel from '../cv4/FilesPanel.jsx'
import { C } from '../lib/cv3Colors.js'

const FF_MONO = `"JetBrains Mono", "SF Mono", Menlo, Monaco, monospace`

export default function FilesPanelDemo() {
  const slug = useMemo(() => {
    if (typeof window === 'undefined') return 'ambition-mechanical'
    const u = new URL(window.location.href)
    return u.searchParams.get('slug') || 'ambition-mechanical'
  }, [])

  return (
    <div
      data-cv4-files-demo
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        padding: 0,
        display: 'flex',
      }}
    >
      {/* Left: explanatory column. Right: the rail-width FilesPanel. */}
      <div style={{
        flex: 1,
        padding: '40px 32px',
        borderRight: '1px solid ' + C.border,
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          fontFamily: FF_MONO,
          fontSize: 11,
          color: C.muted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>R79-f3 · Files panel demo</div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 600,
          lineHeight: 1.2,
          marginBottom: 12,
          color: C.text,
        }}>FilesPanel mounted against <code style={{ fontFamily: FF_MONO, fontSize: 22 }}>{slug}</code></h1>
        <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.6, maxWidth: 540 }}>
          The panel on the right is the same component that mounts as the
          last section of <code style={{ fontFamily: FF_MONO }}>RightMenu</code>
          in production CV4. Hidden files (PHONEBOOK / history / rules /
          decisions / archive / vision-qa / assets) are filtered server-side
          by the R79-f1 API.
        </p>
        <p style={{ fontSize: 14, color: C.text2, lineHeight: 1.6, maxWidth: 540 }}>
          Tap any row → the article-style reader (R79-f2) opens as a
          fullscreen modal. Esc / × / click-outside dismisses.
        </p>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, maxWidth: 540, marginTop: 24 }}>
          Override the project: <code style={{ fontFamily: FF_MONO }}>?slug=&lt;project-slug&gt;</code>.
          Demo-only route — production mount lives inside
          <code style={{ fontFamily: FF_MONO }}> src/dashboard/cv4/RightMenu.jsx</code>.
        </p>
      </div>

      <aside
        data-cv4-tasks-drawer
        style={{
          width: 'clamp(300px, 22vw, 460px)',
          flexShrink: 0,
          background: C.bg,
          borderLeft: '1px solid ' + C.border,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <FilesPanel projectSlug={slug} />
      </aside>
    </div>
  )
}
