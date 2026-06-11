// corner:corner-ui-cv4 — ambient chat background.
// Adaptation of 21st.dev "ai-input-hero" (erikx): the shader renders glowing
// audio-bar waves driven by dual sines. The original is Three.js + GSAP +
// bloom post-processing; that's a heavy payload to mount behind every chat,
// so this re-implements the same dual-sine bar field on a 2D canvas with
// additive compositing — visually close, ~zero bundle cost.
//
// Per-chat color: the hue is hashed from `chatKey`, so every room gets its
// own tint and keeps it across visits. Light/dark aware via the `theme` prop
// (dark = additive glow on ink, light = soft saturated bars on bone).
import React, { useEffect, useRef } from 'react'

function hashHue(str) {
  let h = 0
  const s = String(str || 'chat')
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return ((h % 360) + 360) % 360
}

export default function ChatWaveBackground({ chatKey, theme = 'dark' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const hue = hashHue(chatKey)
    const isLight = theme === 'light'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let width = 0
    let height = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    // Dual-sine gain, mirroring the original shader's
    // sineH(gain, len, phase, t) = max(floor, (sin(ph + t*len)*0.5+0.6)*gain)
    const waveH = (x, t, gain, freq, speed, phase) => {
      const v = Math.sin(phase + x * freq + t * speed) * 0.5 + 0.6
      return Math.max(0.02, v * gain)
    }

    const draw = (now) => {
      const t = now / 1000
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = isLight ? 'source-over' : 'lighter'

      const barCount = Math.max(40, Math.min(110, Math.floor(width / 12)))
      const gap = width / barCount
      const barW = Math.max(2, gap * 0.42)
      const maxH = height * 0.30

      for (let i = 0; i < barCount; i++) {
        const x = i / barCount
        // two overlapping waves at different frequencies, slowly breathing
        const breathe = 0.75 + 0.25 * Math.sin(t * 0.18)
        const h1 = waveH(x, t, 0.85 * breathe, 7.0, 0.55, 0)
        const h2 = waveH(x, t, 0.55, 13.0, -0.8, 2.1)
        const h = (h1 * 0.7 + h2 * 0.5) * maxH
        const px = i * gap + (gap - barW) / 2
        const py = height - h

        const grad = ctx.createLinearGradient(0, py, 0, height)
        if (isLight) {
          grad.addColorStop(0, `hsla(${hue}, 55%, 42%, 0.16)`)
          grad.addColorStop(1, `hsla(${hue}, 55%, 42%, 0.03)`)
        } else {
          grad.addColorStop(0, `hsla(${hue}, 80%, 60%, 0.20)`)
          grad.addColorStop(1, `hsla(${hue}, 80%, 50%, 0.02)`)
        }
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.roundRect(px, py, barW, h, barW / 2)
        ctx.fill()
      }

      // soft horizon glow pinned to the bottom, like the bloom pass
      const glow = ctx.createRadialGradient(
        width / 2, height + height * 0.15, 0,
        width / 2, height + height * 0.15, Math.max(width, height) * 0.55
      )
      if (isLight) {
        glow.addColorStop(0, `hsla(${hue}, 60%, 50%, 0.10)`)
        glow.addColorStop(1, 'hsla(0, 0%, 100%, 0)')
      } else {
        glow.addColorStop(0, `hsla(${hue}, 85%, 55%, 0.14)`)
        glow.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
      }
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)
    }

    if (reduced) {
      draw(0) // single static frame, no animation
    } else {
      const loop = (now) => {
        if (!document.hidden) draw(now)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [chatKey, theme])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
