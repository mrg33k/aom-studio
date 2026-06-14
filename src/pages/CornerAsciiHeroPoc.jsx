import React, { useEffect, useRef, useState } from 'react'

/**
 * Corner ASCII Hero PoC
 *
 * SURGE palette:
 * - Purple: #7c3aed
 * - Cyan: #06b6d4
 * - Charcoal: #2d2d2d
 * - Off-white: #fafafa
 *
 * ASCII art effect: animated glyphs that form/dissolve in real-time,
 * responding to mouse position. The "corner" wordmark sits as headline.
 */

const ASCII_CHARS = '@%#*+=-:. '
const CHAR_WIDTH = 6
const CHAR_HEIGHT = 12

function interpolateColor(t) {
  // Purple to Cyan gradient with boosted saturation (0 = purple, 1 = cyan)
  // Amplify the gradient range for more vivid color separation
  const r = Math.round(124 * (1 - t) + 6 * t)
  const g = Math.round(58 * (1 - t) + 182 * t)
  const b = Math.round(237 * (1 - t) + 212 * t)
  return `rgb(${r}, ${g}, ${b})`
}

function getFlowVector(x, y, time) {
  // Generate directional flow patterns based on position and time
  // Creates a sense of motion/computation across the grid
  const waveX = Math.sin(x * 0.1 + time * 0.05) * 0.3
  const waveY = Math.cos(y * 0.1 + time * 0.05) * 0.3
  return { x: waveX, y: waveY }
}

function CornerAsciiHeroPoc() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const particlesRef = useRef([])
  const timeRef = useRef(0)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handleChange = (e) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) {
      console.warn('Canvas or container not available')
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Could not get 2D context')
      return
    }

    // Set canvas to full container size
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        console.warn('Container has zero dimensions')
        return
      }
      canvas.width = rect.width
      canvas.height = rect.height
      console.log(`Canvas resized to ${canvas.width}x${canvas.height}`)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Track mouse
    const handleMouseMove = (e) => {
      const { left, top, width, height } = container.getBoundingClientRect()
      mouseRef.current = {
        x: (e.clientX - left) / width,
        y: (e.clientY - top) / height
      }
    }
    container.addEventListener('mousemove', handleMouseMove)

    // Initialize particles (ASCII glyphs)
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
            life: Math.random(),
            targetLife: Math.random(),
            vx: (Math.random() - 0.5) * 0.02,
            vy: (Math.random() - 0.5) * 0.02
          })
        }
      }
      particlesRef.current = particles
    }
    initParticles()

    // Animation loop
    let animationFrameId
    const animate = () => {
      timeRef.current++

      if (canvas.width === 0 || canvas.height === 0) {
        animationFrameId = requestAnimationFrame(animate)
        return
      }

      // Background: dark charcoal with subtle gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#1a1a1a')
      gradient.addColorStop(1, '#2d2d2d')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      const particles = particlesRef.current
      const { x: mouseX, y: mouseY } = mouseRef.current
      particles.forEach((p) => {
        // Distance to mouse
        const px = (p.x * CHAR_WIDTH) / canvas.width
        const py = (p.y * CHAR_HEIGHT) / canvas.height
        const dx = px - mouseX
        const dy = py - mouseY
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Mouse proximity increases life (glyphs "activate" near cursor)
        // Wider activation radius (0-3 units) for more visible effect
        const proximityInfluence = Math.max(0, 1 - dist * 1.2)
        p.targetLife = 0.2 + proximityInfluence * 0.8

        // Faster lerp for snappier response (0.15 instead of 0.1)
        p.life += (p.targetLife - p.life) * 0.15

        // Faster oscillation: 2x speed for more "computational" feel
        const t = (timeRef.current * 0.04 + p.x * 0.1 + p.y * 0.1) % 1
        const charIndex = Math.floor(p.life * ASCII_CHARS.length)
        p.char = ASCII_CHARS[Math.max(0, Math.min(charIndex, ASCII_CHARS.length - 1))]

        // Apply directional flow for visual motion
        const flow = getFlowVector(p.x, p.y, timeRef.current)
        const screenX = p.x * CHAR_WIDTH + flow.x * 2
        const screenY = p.y * CHAR_HEIGHT + flow.y * 2

        // Color: purple → cyan gradient based on life
        const color = interpolateColor(p.life)

        // Alpha: more vivid (0.9 max instead of 0.8)
        const alpha = Math.min(1, p.life * 1.2)

        // Draw glyph
        ctx.font = 'bold 11px "Courier New", monospace'
        ctx.fillStyle = color
        ctx.globalAlpha = alpha
        ctx.fillText(p.char, screenX, screenY + 8)
        ctx.globalAlpha = 1
      })

      // Headline: "Your business just got an upgrade"
      const headlineY = canvas.height * 0.35
      ctx.font = 'bold 48px Outfit, sans-serif'
      ctx.fillStyle = '#fafafa'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(124, 58, 237, 0.3)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 0
      ctx.fillText('Your business just got an upgrade', canvas.width / 2, headlineY)
      ctx.shadowColor = 'transparent'

      // Wordmark: "corner" in Outfit Bold with gradient
      const logoY = headlineY + 80
      ctx.font = 'bold 36px Outfit, sans-serif'

      // Create gradient for "corner"
      const textGradient = ctx.createLinearGradient(
        canvas.width / 2 - 60,
        logoY - 20,
        canvas.width / 2 + 60,
        logoY + 20
      )
      textGradient.addColorStop(0, '#7c3aed')
      textGradient.addColorStop(0.5, '#06b6d4')
      textGradient.addColorStop(1, '#7c3aed')

      ctx.fillStyle = textGradient
      ctx.shadowColor = 'rgba(124, 58, 237, 0.4)'
      ctx.shadowBlur = 15
      ctx.fillText('corner', canvas.width / 2, logoY)
      ctx.shadowColor = 'transparent'

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
      container.removeEventListener('mousemove', handleMouseMove)
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
