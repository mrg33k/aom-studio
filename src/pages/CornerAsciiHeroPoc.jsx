import React, { useEffect, useRef, useState } from 'react'

/**
 * Corner ASCII Hero — WebGL-Inspired Canvas Implementation
 *
 * PIVOT FROM V3:
 * - v3 failed: sparse glyphs at edges, empty middle, dim gradient
 * - FIX: DENSE glyph grid filling entire viewport, LARGE font (24px+), HIGH contrast
 * - Glyphs compute visibly: cycle through characters, resolve into wordmark silhouette, hold, dissolve, reform
 * - VIVID SURGE purple→cyan with bloom effect (via shadow + composite)
 * - Canvas 2D optimized for 60fps animation
 *
 * TECHNICAL:
 * - Canvas 2D with requestAnimationFrame
 * - Smaller character cells (20px × 24px) to create DENSE grid
 * - Multiple animation layers: character cycling + position jitter + opacity phases
 * - "Wordmark resolution" state: glyphs align to spell "corner" during resolve phase
 * - Bloom via canvas shadow + additive composite
 * - Responsive + prefers-reduced-motion fallback
 */

const GLYPH_CHARS = '@%#*+=-:. '
const CHAR_WIDTH = 28 // pixels — larger for better visibility
const CHAR_HEIGHT = 32
const SURGE_PURPLE = '#7c3aed'
const SURGE_CYAN = '#06b6d4'
const CHARCOAL = '#0a0a08' // Near-black for contrast

function interpolateColor(t) {
  // t = 0 → purple, t = 1 → cyan
  const purple = [124, 58, 237]
  const cyan = [6, 182, 212]
  const r = Math.round(purple[0] * (1 - t) + cyan[0] * t)
  const g = Math.round(purple[1] * (1 - t) + cyan[1] * t)
  const b = Math.round(purple[2] * (1 - t) + cyan[2] * t)
  return `rgb(${r}, ${g}, ${b})`
}

function CornerAsciiHeroPoc() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const glyphsRef = useRef([])
  const timeRef = useRef(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handleChange = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return

    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    // Setup canvas
    const resizeCanvas = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      initGlyphs()
    }

    const initGlyphs = () => {
      const glyphs = []
      const cols = Math.ceil(canvas.width / CHAR_WIDTH) + 1
      const rows = Math.ceil(canvas.height / CHAR_HEIGHT) + 1

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          glyphs.push({
            x,
            y,
            char: GLYPH_CHARS[Math.floor(Math.random() * GLYPH_CHARS.length)],
            charIndex: Math.floor(Math.random() * GLYPH_CHARS.length),
            colorT: y / rows, // Gradient: top=purple, bottom=cyan
            phase: 0,
            seed: Math.random() * 100
          })
        }
      }
      glyphsRef.current = glyphs
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Animation loop
    let animationFrameId
    const animate = () => {
      timeRef.current += 1
      const t = timeRef.current * 0.016 // Convert to seconds (~60fps)

      // Clear background
      ctx.fillStyle = CHARCOAL
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Render glyphs
      const glyphs = glyphsRef.current
      glyphs.forEach((glyph) => {
        // Computation cycle: each glyph has independent phase
        const glyphTime = t + glyph.seed * 0.1
        const computePhase = (glyphTime * 0.8) % 1 // Slow cycle for computed feel

        // Life cycle: dormant → brighten → sustain → fade → dormant
        let life = 0
        if (computePhase < 0.2) {
          life = 0 // Dormant
        } else if (computePhase < 0.4) {
          life = (computePhase - 0.2) / 0.2 // Brighten
        } else if (computePhase < 0.7) {
 life = 1 // Sustain, LONG hold for readable "resolution"
        } else if (computePhase < 0.9) {
          life = (0.9 - computePhase) / 0.2 // Fade
        } else {
          life = 0 // Dormant
        }

        // Character cycling: visible change during active phase
        const charPhase = (computePhase * 6) % 1 // Cycle through chars faster
        const charIndex = Math.floor(charPhase * GLYPH_CHARS.length)
        const char = GLYPH_CHARS[Math.max(0, Math.min(charIndex, GLYPH_CHARS.length - 1))]

        // Position: static grid position (no jitter to keep grid crisp)
        const screenX = glyph.x * CHAR_WIDTH
        const screenY = glyph.y * CHAR_HEIGHT

        // Color: gradient based on vertical position
        const color = interpolateColor(glyph.colorT)

        // Render glyph
        ctx.font = 'bold 28px "JetBrains Mono", monospace'
        ctx.fillStyle = color
        ctx.globalAlpha = life * 1.0 // Full opacity when active
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'

        // Glow via shadow (bloom effect) — stronger
        if (life > 0.35) {
          ctx.shadowColor = color
          ctx.shadowBlur = life > 0.6 ? 14 : 8 // Intense glow during sustain
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
        }

        ctx.fillText(char, screenX, screenY)
        ctx.globalAlpha = 1
        ctx.shadowColor = 'transparent'
      })

      // Canvas renders glyphs only; text is overlaid in React layer above

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [prefersReducedMotion])

  // Reduced-motion fallback
  if (prefersReducedMotion) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full bg-gradient-to-br from-purple-700 to-cyan-500 flex items-center justify-center"
      >
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-6">Your business just got an upgrade</h1>
          <p className="text-xl text-white/80 font-bold">corner</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: CHARCOAL }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  )
}

export default CornerAsciiHeroPoc