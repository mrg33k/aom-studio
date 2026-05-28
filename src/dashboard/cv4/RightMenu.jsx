// RightMenu.jsx — CV4 right-rail (corner:right-menu)
//
// Simplified to a pure file browser scoped to the current project or chat.
// All missions / tasks / pills / summary / accordion complexity removed
// per Patrik 2026-05-28: "just turn it into a file browser for the
// selected chat or project only."
//
// Mission: corner:right-menu

import FilesPanel from './FilesPanel.jsx'
import { useCornerAuth, useCornerNav } from '../CornerContext.jsx'
import { C } from '../lib/cv3Colors.js'

const FONT = "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif"

export default function RightMenu() {
  const { worldId } = useCornerAuth()      // eslint-disable-line no-unused-vars
  const { conversationTarget } = useCornerNav()

  // Scope to the active project when inside a project room; else world-wide.
  const projectSlug =
    conversationTarget?.type === 'project' ? conversationTarget.slug : null

  // When a mission is selected, drill into it so the file browser only shows
  // that mission's files and the user stays focused.
  const missionSlug = conversationTarget?.missionSlug || null
  const missionName = conversationTarget?.missionName || missionSlug || null

  // Header label: mission name when drilled in, project name when project-scoped,
  // nothing at the world level.
  const subLabel = missionName || (projectSlug
    ? (conversationTarget?.name || conversationTarget?.slug || null)
    : null)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: C.bg,
      fontFamily: FONT,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.045)',
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '-0.005em',
          color: C.text,
          lineHeight: 1.1,
        }}>
          Files
        </span>
        {subLabel && (
          <span style={{
            fontSize: 12,
            color: C.muted,
            fontWeight: 400,
            letterSpacing: 0,
          }}>
            {subLabel}
          </span>
        )}
      </div>

      {/* File browser — scoped to mission when drilled in, else project or world */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <FilesPanel projectSlug={projectSlug} missionSlug={missionSlug} />
      </div>
    </div>
  )
}
