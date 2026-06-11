// corner:corner-ui-cv4 — ambient chat background.
// Faithful canvas port of 21st.dev "ai-input-hero" (erikx). The original is
// Three.js + GSAP + UnrealBloom; this reproduces its look without those deps:
//   - skewed bars (23.4°) with tapered tips, additive glow
//   - dual waves driven by the demo's exact 55s keyframe timeline
//     (gain swells 10→500, frequency shifts) with power2.inOut easing
//   - mouse-proximity glow accumulation
//   - bars reach ~60% of the surface height, min-height baseline stubs
// Per-chat color: hue hashed from `chatKey`. Light/dark aware via `theme`.
import React, { useEffect, useRef } from 'react'

function hashHue(str) {
  let h = 0
  const s = String(str || 'chat')
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return ((h % 360) + 360) % 360
}

// Demo keyframes, verbatim (time s, gain px@500 scale, frequency rad/s, waveLength)
const PI15 = Math.PI * 1.5
const KEYS1 = [
  [0, 10, 0, 0.5], [4, 300, 1, 0.5], [6, 300, 4, PI15], [8, 225, 4, PI15],
  [10, 500, 1, PI15], [14, 225, 3, PI15], [22, 100, 6, PI15], [28, 0, 0.9, 0.5],
  [30, 128, 0.9, 0.5], [32, 190, 1.42, 0.5], [39, 499, 4, PI15], [40, 500, 4, PI15],
  [42, 400, 2.82, PI15], [44, 327, 2.56, PI15], [48, 188, 5.4, 0.5],
  [52, 32, 0.1, 0.5], [55, 10, 0, 0.5],
]
const KEYS2 = [
  [0, 0, 0, 0.5], [9, 0, 0, 0.5], [10, 400, 1, 0.5], [13, 300, 4, PI15],
  [24, 96, 2, 0.5], [28, 0, 0.9, 0.5], [30, 142, 0.9, 0.5], [36, 374, 4, PI15],
  [38, 375, 4, PI15], [40, 300, 2.26, PI15], [44, 245, 2.05, PI15],
  [48, 141, 5.12, 0.5], [52, 24, 0.08, 0.5], [55, 8, 0, 0.5],
]
const LOOP = 55

// GSAP power2.inOut
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)

function sampleKeys(keys, t) {
  if (t <= keys[0][0]) return keys[0]
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1]
    if (t >= a[0] && t < b[0]) {
      const p = easeInOut((t - a[0]) / (b[0] - a[0]))
      return [t, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p, a[3] + (b[3] - a[3]) * p]
    }
  }
  return keys[keys.length - 1]
}

const SKEW = Math.tan((23.4 * Math.PI) / 180) // bars lean right like the demo
const BAR_W = 14
const BAR_GAP = 10
const COVERAGE = 0.6   // demo SCREEN_COVERAGE
const MAX_GAIN = 500

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
    let width = 0, height = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let barCount = 0
    let glow = new Float32Array(0)

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
      barCount = Math.max(8, Math.floor((width + BAR_GAP) / (BAR_W + BAR_GAP)))
      if (glow.length !== barCount) glow = new Float32Array(barCount)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    // Mouse-proximity glow (demo glowDynamics). Canvas is pointer-events:none,
    // so track on window and map into local coords.
    const mouse = { x: -1e4, active: false }
    let proxyX = -1e4
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect()
      if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) {
        mouse.active = false
        return
      }
      mouse.x = e.clientX - r.left
      if (proxyX < -1e3) proxyX = mouse.x
      mouse.active = true
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    // demo phase accumulators
    let phase1 = 0, phase2 = 0
    let last = performance.now()
    let smoothSpeed = 0
    let prevProxyX = proxyX

    const sineH = (gain, len, ph, t, gainMul, floor) =>
      Math.max(floor, (Math.sin(ph + t * len) * 0.5 + 0.6) * gain * gainMul)

    const drawBar = (x, h, alpha, lightnessBoost) => {
      // tapered, skewed bar: full width at base, ~2px tip, leaning right
      const tipW = 2
      const topX = x + h * SKEW
      ctx.beginPath()
      ctx.moveTo(x - BAR_W / 2, height)
      ctx.lineTo(x + BAR_W / 2, height)
      ctx.lineTo(topX + tipW / 2, height - h)
      ctx.lineTo(topX - tipW / 2, height - h)
      ctx.closePath()
      if (isLight) {
        ctx.fillStyle = `hsla(${hue}, 70%, ${Math.min(60, 38 + lightnessBoost)}%, ${alpha})`
      } else {
        ctx.fillStyle = `hsla(${hue}, 100%, ${Math.min(75, 55 + lightnessBoost)}%, ${alpha})`
      }
      ctx.fill()
    }

    const draw = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const t = (now / 1000) % LOOP

      const [, g1, f1, l1] = sampleKeys(KEYS1, t)
      const [, g2, f2, l2] = sampleKeys(KEYS2, t)
      phase1 = (phase1 + f1 * dt) % (Math.PI * 2)
      phase2 = (phase2 + f2 * dt) % (Math.PI * 2)

      // mouse smoothing + speed-driven glow accumulation (demo glowDynamics)
      const kMouse = 1 - Math.exp(-30 * dt)
      prevProxyX = proxyX
      proxyX += (mouse.x - proxyX) * kMouse
      const rawSpeed = mouse.active ? Math.abs(mouse.x - proxyX) * 0.52 : 0
      smoothSpeed += (rawSpeed - smoothSpeed) * (1 - Math.exp(-8.5 * dt))
      const maxGlowDist = width * 0.3
      const decayLerp = 1 - Math.exp(-3.3 * dt)
      const addEase = 1 - Math.exp(-1.5 * dt)

      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = isLight ? 'source-over' : 'lighter'

      const gainMul = (height * COVERAGE) / MAX_GAIN
      const floor = Math.max(6, height * 0.012) // demo min 20px at full height
      const span = barCount * (BAR_W + BAR_GAP) - BAR_GAP
      const startX = (width - span) / 2 + BAR_W / 2

      // bloom approximation: soft shadow glow on every bar
      ctx.shadowBlur = isLight ? 10 : 22
      ctx.shadowColor = isLight
        ? `hsla(${hue}, 70%, 45%, 0.35)`
        : `hsla(${hue}, 100%, 60%, 0.55)`

      for (let i = 0; i < barCount; i++) {
        const x = startX + i * (BAR_W + BAR_GAP)
        const tn = barCount > 1 ? i / (barCount - 1) : 0

        // glow accumulation per bar
        const dx = Math.abs(proxyX - x)
        const hit = dx < maxGlowDist ? 1 - Math.pow(dx / maxGlowDist, 0.6) : 0
        let g = glow[i] + hit * smoothSpeed * 0.02 * addEase - glow[i] * decayLerp
        glow[i] = Math.min(1.5, Math.max(0, g))

        const h1 = sineH(g1, l1, phase1, tn, gainMul, floor)
        const h2 = sineH(g2, l2, phase2, tn, gainMul, floor)

        const baseA = isLight ? 0.22 : 0.30
        drawBar(x, h1, baseA + glow[i] * 0.25, glow[i] * 14)
        drawBar(x, h2, baseA * 0.85 + glow[i] * 0.2, glow[i] * 14)
      }
      ctx.shadowBlur = 0

      // horizon glow under the bars, like the bloom wash in the demo
      const wash = ctx.createRadialGradient(
        width / 2, height + height * 0.1, 0,
        width / 2, height + height * 0.1, Math.max(width, height) * 0.6
      )
      if (isLight) {
        wash.addColorStop(0, `hsla(${hue}, 65%, 50%, 0.10)`)
        wash.addColorStop(1, 'hsla(0,0%,100%,0)')
      } else {
        wash.addColorStop(0, `hsla(${hue}, 90%, 55%, 0.16)`)
        wash.addColorStop(1, 'hsla(0,0%,0%,0)')
      }
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, width, height)
    }

    if (reduced) {
      // static frame mid-swell so it still looks intentional
      last = performance.now() - 16
      draw(performance.now() - (LOOP - 12) * 1000)
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
      window.removeEventListener('pointermove', onMove)
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
        opacity: 0.8, // demo wave layer opacity
      }}
    />
  )
}
