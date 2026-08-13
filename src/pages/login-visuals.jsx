// login-visuals.jsx — Shared visual components for login + change-password screens.
// Ports the iOS native login's full visual treatment (SignInView.swift, ASCIIBackground.swift)
// to the web. Emerald on deep navy, ASCII flow field, mesh blobs, corner marks.

import React, { useRef, useEffect, useState } from 'react'

// ── Palette — matches iOS SignInView colors exactly ────────────────────────

export const DARK = {
  bgBase:     '#040810',
  text:       '#F8FAFC',
  textMuted:  'rgba(255,255,255,0.30)',
  textDim:    'rgba(255,255,255,0.18)',
  fieldLine:  'rgba(255,255,255,0.10)',
  divider:    'rgba(255,255,255,0.06)',
  accent:     '#10B981',
  accent2:    '#34D399',
  blobs: [
    'rgba(16,185,129,0.07)',
    'rgba(6,95,70,0.08)',
    'rgba(52,211,153,0.04)',
    'rgba(16,185,129,0.05)',
  ],
  errBg:      'rgba(239,68,68,0.08)',
  errFg:      '#F87171',
  buttonText: '#FFFFFF',
}

export const LIGHT = {
  bgBase:     '#F2EFE8',
  text:       '#1A1F2C',
  textMuted:  'rgba(26,31,44,0.55)',
  textDim:    'rgba(26,31,44,0.38)',
  fieldLine:  'rgba(26,31,44,0.16)',
  divider:    'rgba(26,31,44,0.10)',
  accent:     '#0E8F66',
  accent2:    '#10B981',
  blobs: [
    'rgba(255,180,120,0.18)',
    'rgba(255,205,140,0.16)',
    'rgba(180,210,255,0.14)',
    'rgba(14,143,102,0.10)',
  ],
  errBg:      'rgba(220,38,38,0.08)',
  errFg:      '#B91C1C',
  buttonText: '#FFFFFF',
}

export const FONT = "'Hanken Grotesk', system-ui, -apple-system, sans-serif"

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

// ── Animated mesh background — 4 soft gradient blobs (MeshBlobBackground) ─

export function MeshBackground({ palette }) {
  const canvasRef = useRef(null)
  const raf = useRef(null)
  const paletteRef = useRef(palette)
  paletteRef.current = palette

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h
    let t = 0

    const handleResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
    }
    window.addEventListener('resize', handleResize)

    const draw = () => {
      t += 0.003
      const p = paletteRef.current
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = p.bgBase
      ctx.fillRect(0, 0, w, h)
      const positions = [
        { cx: w * 0.3 + Math.sin(t * 0.7) * w * 0.15, cy: h * 0.25 + Math.cos(t * 0.5) * h * 0.1, r: Math.max(w, h) * 0.4 },
        { cx: w * 0.7 + Math.cos(t * 0.6) * w * 0.12, cy: h * 0.7  + Math.sin(t * 0.8) * h * 0.15, r: Math.max(w, h) * 0.35 },
        { cx: w * 0.5 + Math.sin(t * 1.1) * w * 0.2,  cy: h * 0.5  + Math.cos(t * 0.9) * h * 0.2,  r: Math.max(w, h) * 0.3 },
        { cx: w * 0.15 + Math.cos(t * 0.4) * w * 0.08, cy: h * 0.8 + Math.sin(t * 0.6) * h * 0.1,  r: Math.max(w, h) * 0.25 },
      ]
      positions.forEach((b, i) => {
        const grad = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, b.r)
        grad.addColorStop(0, p.blobs[i] || p.blobs[0])
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      })
      if (!mq.matches) raf.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  )
}

// ── ASCII flow field — ported from ASCIIBackground.swift ───────────────────
// A real-time sine-noise flow field with emerald embers at wave crests.
// Deterministic, allocation-free, GPU-backed via canvas drawingGroup equivalent.

export function ASCIIBackground({ palette }) {
  const canvasRef = useRef(null)
  const raf = useRef(null)
  const colorsRef = useRef({ text: [248, 250, 252], ember: [52, 211, 153] })

  // Update cached RGB values when palette changes (without restarting the loop)
  colorsRef.current = {
    text: hexToRgb(palette.text),
    ember: hexToRgb(palette.accent2),
  }

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = window.innerWidth
    let h = window.innerHeight

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // Sparse ASCII ramp, space-weighted so the field breathes (matches iOS)
    const RAMP = '  ..::-=+*oO#'
    const CELL = 15    // glyph pitch in px (matches iOS 15pt)
    const startTime = performance.now()
    let lastDraw = 0

    const draw = (now) => {
      // Throttle to ~30fps (matches iOS minimumInterval: 1/30)
      if (now - lastDraw < 33) {
        if (!mq.matches) raf.current = requestAnimationFrame(draw)
        return
      }
      lastDraw = now

      const t = (now - startTime) / 1000 // seconds, matching iOS timeIntervalSinceReferenceDate delta
      ctx.clearRect(0, 0, w, h)
      ctx.font = '600 13px monospace'
      ctx.textBaseline = 'top'

      const cols = Math.ceil(w / CELL) + 1
      const rows = Math.ceil(h / CELL) + 1
      const cx = cols * 0.5
      const cy = rows * 0.42  // optical center, biased up toward the wordmark (matches iOS)

      const { text: [tr, tg, tb], ember: [er, eg, eb] } = colorsRef.current
      const textSolid = `rgb(${tr},${tg},${tb})`
      const emberSolid = `rgb(${er},${eg},${eb})`

      for (let r = 0; r < rows; r++) {
        // Top-to-bottom mask: [top=1.0 → mid=0.85 → bottom=0.35] (matches iOS mask gradient)
        const frac = r / rows
        const maskA = frac < 0.5 ? 1.0 - 0.3 * frac : 1.35 - frac

        for (let c = 0; c < cols; c++) {
          const x = c, y = r

          // Layered sine flow field — exactly matches iOS ASCIIBackground.swift
          const n =
            Math.sin(x * 0.28 + t * 0.70) +
            Math.sin(y * 0.34 - t * 0.55) +
            Math.sin((x + y) * 0.18 + t * 0.40) +
            Math.sin(Math.hypot(x - cx, y - cy) * 0.30 - t * 0.90)
          const v = (n + 4) / 8 // normalized 0..1

          // Radial gather biases density toward center
          const d = Math.hypot(x - cx, y - cy) / Math.max(cols, rows)
          const gather = Math.max(0, 1 - d * 1.6)
          const level = v * (0.55 + gather * 0.75)

          let idx = Math.floor(level * RAMP.length)
          idx = Math.min(Math.max(idx, 0), RAMP.length - 1)
          if (idx === 0) continue // space — skip draw

          // Emerald embers ride wave crests; everything else is cream/dark
          const goldScore = v + gather * 0.28
          if (goldScore > 1.05) {
            const glow = Math.min(1, (goldScore - 1.05) * 5)
            ctx.globalAlpha = (0.32 + glow * 0.44) * maskA
            ctx.fillStyle = emberSolid
          } else {
            ctx.globalAlpha = (0.05 + level * 0.16) * maskA
            ctx.fillStyle = textSolid
          }

          ctx.fillText(RAMP[idx], c * CELL, r * CELL)
        }
      }

      ctx.globalAlpha = 1
      if (!mq.matches) raf.current = requestAnimationFrame(draw)
    }

    raf.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
      }}
    />
  )
}

// ── Center scrim — keeps form content readable over the field ──────────────
// Matches iOS: RadialGradient from bg@85% center to bg@0% at 330pt radius

export function CenterScrim({ palette }) {
  const [r, g, b] = hexToRgb(palette.bgBase)
  // At phone widths the iOS-ratio circle leaves the form's reading zone
  // unprotected — field glyphs collide with labels and placeholders
  // (390px QA walkthrough, 2026-08-13). Under 640px the scrim becomes a
  // taller, stronger ellipse so the form column reads clean while the
  // field stays visible around it.
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const onChange = (e) => setNarrow(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const background = narrow
    ? `radial-gradient(ellipse 150% 52% at center, rgba(${r},${g},${b},0.94) 0%, rgba(${r},${g},${b},0.55) 58%, rgba(${r},${g},${b},0) 82%)`
    : `radial-gradient(circle at center, rgba(${r},${g},${b},0.85) 0%, rgba(${r},${g},${b},0) 50%)`
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0,
        background,
      }}
    />
  )
}

// ── Corner marks — four hairline L-shapes framing the viewport ─────────────
// iOS: inset 18pt, arm 14pt, white@14% opacity, 1px stroke

export function CornerMarks({ color }) {
  const len = 14
  const margin = 18
  const stroke = 1
  const mark = (style) => ({
    position: 'fixed', width: len, height: len,
    pointerEvents: 'none', zIndex: 1,
    ...style,
  })
  const line = (orient) => ({
    position: 'absolute', background: color,
    ...(orient === 'h'
      ? { left: 0, width: '100%', height: stroke }
      : { top: 0, height: '100%', width: stroke }),
  })
  return (
    <>
      <div style={mark({ top: margin, left: margin })}>
        <div style={{ ...line('h'), top: 0 }} />
        <div style={{ ...line('v'), left: 0 }} />
      </div>
      <div style={mark({ top: margin, right: margin })}>
        <div style={{ ...line('h'), top: 0 }} />
        <div style={{ ...line('v'), right: 0 }} />
      </div>
      <div style={mark({ bottom: margin, left: margin })}>
        <div style={{ ...line('h'), bottom: 0 }} />
        <div style={{ ...line('v'), left: 0 }} />
      </div>
      <div style={mark({ bottom: margin, right: margin })}>
        <div style={{ ...line('h'), bottom: 0 }} />
        <div style={{ ...line('v'), right: 0 }} />
      </div>
    </>
  )
}
