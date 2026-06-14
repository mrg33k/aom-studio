import React, { useEffect, useRef, useState } from 'react'

/**
 * Corner ASCII Hero v3 — ELEVATED
 *
 * SURGE palette:
 * - Purple: #7c3aed
 * - Cyan: #06b6d4
 * - Charcoal: #2d2d2d
 * - Off-white: #fafafa
 *
 * v3 fixes:
 * - LARGE, CRISP glyphs (JetBrains Mono 16-18px) — legible at first glance
 * - MEANINGFUL motion — glyphs compute/cascade from top, resolving into visible patterns
 * - VIVID gradient at full saturation on every glyph
 * - PURE charcoal background — no vignette darkening
 * - Headline crisp white with subtle glow, sits cleanly over motion
 *
 * Design: ASCII flow DOWNWARD from top, cascading like data computation.
 * Glyphs brighten → resolve into solid characters → fade.
 * Each glyph mapped to purple→cyan gradient based on vertical position + time.
 * Motion = clear "something is computing" read.
 */

const ASCII_CHARS = '@%#*+=-:. '
const CHAR_WIDTH = 11  // Larger character cells for 16-18px font
const CHAR_HEIGHT = 20 // Larger vertical spacing

function interpolateColor(t) {
  // Purple to Cyan gradient at FULL SATURATION
  // t = 0 → pure purple, t = 1 → pure cyan
  const r = Math.round(124 * (1 - t) + 6 * t)
  const g = Math.round(58 * (1 - t) + 182 * t)
  const b = Math.round(237 * (1 - t) + 212 * t)
  return `rgb(${r}, ${g}, ${b})`
}

function getComputePhase(x, y, time) {
  // Cascade effect: continuous downward flow across entire viewport
  // Glyphs activate row-by-row based on time, creating a "computing" cascade
  // Slower time progression (time * 0.5) makes cascade more visible/smooth
  const cascadeDelay = y * 1.2 + time * 0.5
  const cascadePhase = (cascadeDelay % 100) / 100 // 0-1, repeating slowly

  // Horizontal wave: stronger motion adds energy and prevents stillness
  // Faster oscillation (0.04 vs 0.02) makes motion feel more alive
  const horizontalWave = Math.sin(x * 0.12 + time * 0.04) * 0.3

  return {
    phase: cascadePhase,
    horizontalShift: horizontalWave
  }
}

function CornerAsciiHeroPoc() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const particlesRef = useRef([])
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
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      canvas.width = rect.width
      canvas.height = rect.height
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize particles: grid of ASCII glyphs
    const initParticles = () => {
      const particles = []
      const cols = Math.ceil(canvas.width / CHAR_WIDTH)
      const rows = Math.ceil(canvas.height / CHAR_HEIGHT)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          particles.push({
            x,
            y,
            char: ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)],
            life: 0,
            colorT: y / rows // Color gradient based on vertical position
          })
        }
      }
      particlesRef.current = particles
    }
    initParticles()

    // Animation loop
    let animationFrameId
    const animate = () => {
      timeRef.current += 1

      if (canvas.width === 0 || canvas.height === 0) {
        animationFrameId = requestAnimationFrame(animate)
        return
      }

      // PURE charcoal background — no gradient, no vignette
      ctx.fillStyle = '#2d2d2d'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      const particles = particlesRef.current
      particles.forEach((p) => {
        const { phase, horizontalShift } = getComputePhase(p.x, p.y, timeRef.current)

        // Life cycle: cascade creates a "wave" of computation
        // phase 0-0.15: dormant (life=0)
        // phase 0.15-0.35: brighten (life ramps 0→1) — VISIBLE ramp
        // phase 0.35-0.65: solid (life stays 1) — SUSTAINED visibility
        // phase 0.65-0.85: fade (life ramps 1→0)
        // phase 0.85-1.0: dormant
        let life = 0
        if (phase < 0.15) {
          life = 0
        } else if (phase < 0.35) {
          life = (phase - 0.15) / 0.2 // Ramp 0→1
        } else if (phase < 0.65) {
          life = 1 // HOLD visibility longer
        } else if (phase < 0.85) {
          life = (0.85 - phase) / 0.2 // Ramp 1→0
        } else {
          life = 0
        }
        p.life = life

        // Character cycling: animate character as life progresses
        // More cycles = more visible "computation" happening
        const charCyclePhase = (phase * 4) % 1 // 4 full cycles per phase loop
        const charIndex = Math.floor(charCyclePhase * ASCII_CHARS.length)
        p.char = ASCII_CHARS[Math.max(0, Math.min(charIndex, ASCII_CHARS.length - 1))]

        // Position: grid position + horizontal wave
        // Stronger shift for more visible motion
        const screenX = p.x * CHAR_WIDTH + horizontalShift * 2.5
        const screenY = p.y * CHAR_HEIGHT

        // Color: purple → cyan gradient based on vertical position
        // Top = more purple, bottom = more cyan
        const color = interpolateColor(p.colorT)

        // Draw glyph — LARGE, CRISP, VIVID
        // Alpha ramps up sharply to full visibility when active
        ctx.font = 'bold 16px "JetBrains Mono", monospace'
        ctx.fillStyle = color
        ctx.globalAlpha = p.life // Direct life alpha — crisp activation
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(p.char, screenX, screenY)
        ctx.globalAlpha = 1
      })

      // Headline: clean white over ASCII, sits at vertical center
      // Adaptive font size for mobile (canvas height < 650px)
      const isMobileHeight = canvas.height < 650
      const headlineFontSize = isMobileHeight ? 24 : 48
      const headlineY = canvas.height * 0.4
      ctx.font = `bold ${headlineFontSize}px Outfit, sans-serif`
      ctx.fillStyle = '#fafafa'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(124, 58, 237, 0.25)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 0

      // Text line-wrapping for smaller screens
      const text = 'Your business just got an upgrade'
      if (isMobileHeight) {
        // Multi-line for mobile
        const lines = ['Your business just', 'got an upgrade']
        lines.forEach((line, idx) => {
          ctx.fillText(line, canvas.width / 2, headlineY + (idx - 0.5) * (headlineFontSize + 4))
        })
      } else {
        // Desktop: ensure full text fits, may need to break if very narrow
        // Measure text width to check if it fits
        const metrics = ctx.measureText(text)
        const textFits = metrics.width < canvas.width * 0.9
        if (textFits) {
          ctx.fillText(text, canvas.width / 2, headlineY)
        } else {
          // If text is too wide, break it
          const lines = ['Your business just', 'got an upgrade']
          lines.forEach((line, idx) => {
            ctx.fillText(line, canvas.width / 2, headlineY + (idx - 0.5) * (headlineFontSize + 4))
          })
        }
      }
      ctx.shadowColor = 'transparent'

      // Wordmark: "corner" with SURGE gradient (purple-to-cyan centered on text)
      const logoFontSize = isMobileHeight ? 18 : 36
      const logoY = headlineY + (isMobileHeight ? 45 : 85)
      ctx.font = `bold ${logoFontSize}px Outfit, sans-serif`

      // Gradient: horizontal sweep showing full purple→cyan range
      // Measure "corner" width accurately
      const cornerMetrics = ctx.measureText('corner')
      const cornerWidth = cornerMetrics.width
      const cornerStartX = canvas.width / 2 - cornerWidth / 2
      const cornerEndX = canvas.width / 2 + cornerWidth / 2
      const textGradient = ctx.createLinearGradient(cornerStartX, logoY, cornerEndX, logoY)
      textGradient.addColorStop(0, '#7c3aed')     // Left: pure purple
      textGradient.addColorStop(0.5, '#06b6d4')   // Middle: pure cyan
      textGradient.addColorStop(1, '#7c3aed')     // Right: back to purple

      ctx.fillStyle = textGradient
      ctx.shadowColor = 'rgba(124, 58, 237, 0.3)'
      ctx.shadowBlur = 18
      ctx.fillText('corner', canvas.width / 2, logoY)
      ctx.shadowColor = 'transparent'

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  if (prefersReducedMotion) {
    return (
      <div
        ref={containerRef}
        className="w-full h-screen bg-gradient-to-br from-purple-700 to-cyan-500 flex items-center justify-center"
      >
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-6">Your business just got an upgrade</h1>
          <p className="text-xl text-white/80">corner</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden bg-charcoal"
      style={{ backgroundColor: '#2d2d2d' }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  )
}

export default CornerAsciiHeroPoc
