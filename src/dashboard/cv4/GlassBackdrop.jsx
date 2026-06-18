import { useEffect } from 'react'

// GlassBackdrop — the image layer that sits behind the frosted-glass UI in CV6
// "glass" theme mode. The active backdrop is CONTROLLED by the caller (the
// theme toggle steps it on each click); it does not auto-drift.
//
// Renders a fixed, full-viewport layer of the chosen backdrop (crossfading when
// the index changes) plus a dark scrim so the translucent glass surfaces on top
// stay legible. Purely decorative (aria-hidden, pointer-events:none) and only
// mounted while glass mode is active, so it costs nothing in light/dark.
//
// The image list is data-driven on purpose — it is the exact seam the future
// Settings tool will repoint at the user's own approved photos.

export const CORNER_GLASS_BACKDROPS = [
  '/corner-glass/glass-nebula.jpg',
  '/corner-glass/glass-aurora.jpg',
  '/corner-glass/glass-sunset.jpg',
]

const FADE_MS = 1100       // crossfade duration when the user steps backdrop

export default function GlassBackdrop({ images = CORNER_GLASS_BACKDROPS, index = 0 }) {
  const list = Array.isArray(images) && images.length ? images : CORNER_GLASS_BACKDROPS
  // Controlled: the active backdrop is chosen by the caller (the theme toggle
  // steps it). No auto-drift — it holds until the user clicks the crystal-ball
  // again. Clamp to a valid index defensively.
  const idx = ((index % list.length) + list.length) % list.length

  // Preload every backdrop once so stepping crossfades instantly, no flash.
  useEffect(() => {
    if (typeof window === 'undefined') return
    list.forEach((src) => { const im = new window.Image(); im.src = src })
  }, [list])

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
