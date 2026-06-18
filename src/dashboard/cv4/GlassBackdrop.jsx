import { useEffect, useState } from 'react'

// GlassBackdrop — the cycling image layer that sits behind the frosted-glass
// UI in CV6 "glass" theme mode (the 3rd theme, after light + dark).
//
// Renders a fixed, full-viewport layer of cross-fading Corner background
// images plus a dark scrim so the translucent glass surfaces on top stay
// legible. It is purely decorative (aria-hidden, pointer-events:none) and is
// only mounted while glass mode is active, so it costs nothing in light/dark.
//
// The image list is data-driven on purpose: today it points at Corner's own
// office-world renders (a curated default), and is the exact seam the future
// Settings tool will repoint at the user's own approved photos.

export const CORNER_GLASS_BACKDROPS = [
  '/corner-glass/glass-nebula.jpg',
  '/corner-glass/glass-aurora.jpg',
  '/corner-glass/glass-sunset.jpg',
]

const CYCLE_MS = 9000      // how long each image holds before crossfading
const FADE_MS = 2000       // crossfade duration

export default function GlassBackdrop({ images = CORNER_GLASS_BACKDROPS }) {
  const list = Array.isArray(images) && images.length ? images : CORNER_GLASS_BACKDROPS
  const [idx, setIdx] = useState(0)

  // Advance the active image on a timer (no-op for a single image).
  useEffect(() => {
    if (list.length <= 1) return undefined
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % list.length)
    }, CYCLE_MS)
    return () => window.clearInterval(id)
  }, [list])

  // Preload the next image so the crossfade never flashes an unloaded frame.
  useEffect(() => {
    if (typeof window === 'undefined' || list.length <= 1) return
    const next = new window.Image()
    next.src = list[(idx + 1) % list.length]
  }, [idx, list])

  return (
    <div
      aria-hidden="true"
      data-cv6-glass-backdrop
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {list.map((src, i) => (
        <div
          key={src}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${src}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            // gentle ken-burns drift so the still images feel alive
            transform: 'scale(1.06)',
            opacity: i === idx ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
          }}
        />
      ))}
      {/* Scrim: darken + cool the imagery so frosted glass cards and light
          text stay readable over any backdrop. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(120% 120% at 50% 0%, rgba(8,11,20,0.30) 0%, rgba(8,11,20,0.52) 55%, rgba(6,9,15,0.68) 100%)',
        }}
      />
    </div>
  )
}
