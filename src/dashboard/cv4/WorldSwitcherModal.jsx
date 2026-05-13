// CV4 WorldSwitcherModal — lifts the WorldSelector out of the top nav.
// Triggered from the sidebar account row. Closes on backdrop click or escape.

import { useEffect } from 'react'
import { useCornerAuth } from '../CornerContext.jsx'
import WorldSelector from '../components/WorldSelector.jsx'

export default function WorldSwitcherModal({ open, onClose, onEnterWorld, onReturnToMyWorld }) {
  const { currentUser, worldId } = useCornerAuth()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[300] flex items-end justify-start bg-black/60 p-3 sm:items-center sm:justify-center"
      data-testid="cv4-world-switcher"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0d111a] p-4 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wider text-aom-text-light">
            Switch world
          </h2>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-aom-text-muted hover:bg-white/[0.06] hover:text-aom-text-light"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <WorldSelector
          currentWorldId={worldId}
          currentUser={currentUser}
          onEnterWorld={(world) => { onEnterWorld(world); onClose() }}
          onReturnToMyWorld={() => { onReturnToMyWorld(); onClose() }}
          isNightMode={true}
          isMobile={false}
        />
      </div>
    </div>
  )
}
