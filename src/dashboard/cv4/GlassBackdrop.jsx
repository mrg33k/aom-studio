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

// Bright, colourful photos first (the dark-glass card style needs the contrast),
// then the two procedural favourites. Keep in sync with GLASS_BACKDROP_COUNT in
// hooks/useThemeMode.js. This list is the seam the future Settings tool repoints
// at the user's own photos.
export const CORNER_GLASS_BACKDROPS = [
  '/corner-glass/us-fuji.jpg',
  '/corner-glass/us-ocean.jpg',
  '/corner-glass/us-blinds.jpg',
  '/corner-glass/us-clock.jpg',
  '/corner-glass/us-laptop.jpg',
  '/corner-glass/us-lambo.jpg',
  '/corner-glass/glass-nebula.jpg',
  '/corner-glass/glass-aurora.jpg',
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
      {/* Scrim: darken the imagery down to the design's moody-dark glass ground
          (Home desktop.dc.html → glass --ground: near-black #0c1218→#05080b with
          faint teal/amber glows). The photo stays a dim texture beneath so the
          transparent rows (All Rooms) read like the mockup instead of washing out
          over a bright photo. (2026-06-18, Patrik: match the design.) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(7,10,17,0.82) 0%, rgba(6,9,14,0.90) 100%),' +
            'radial-gradient(58% 42% at 22% 12%, rgba(74,116,148,0.20), transparent 62%),' +
            'radial-gradient(52% 38% at 86% 20%, rgba(206,148,70,0.12), transparent 58%),' +
            'radial-gradient(48% 36% at 72% 88%, rgba(46,96,128,0.16), transparent 64%)',
        }}
      />
    </div>
  )
}
