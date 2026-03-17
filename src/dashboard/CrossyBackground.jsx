import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'

// CrossyBackground: Organic grass field + sky background for the game viewport
// Canvas2D implementation (no Three.js deps required)
//
// DAYTIME (before 8pm AZ): Lush green grass blades, blue gradient sky, warm sun, drifting clouds
// NIGHTTIME (8pm+ AZ): Dark moonlit grass, starry sky with moon, soft blue moonlight
//
// Renders BEHIND CanvasOffice (lower z-index). CanvasOffice sits on top with transparent bg.
// Grass blades are drawn on HTML5 Canvas with gentle wind animation for organic feel.

// ---- SEEDED RNG ----
function createRng(seed) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ---- GRASS BLADE DATA GENERATOR ----
// Pre-generate blade positions, heights, curves for deterministic rendering
function generateGrassBlades(count, seed = 42) {
  const blades = []
  const rng = createRng(seed)
  for (let i = 0; i < count; i++) {
    blades.push({
      x: rng(),                          // 0-1 position across width
      height: 0.02 + rng() * 0.06,       // blade height as fraction of canvas height (2-8%)
      lean: (rng() - 0.5) * 0.4,         // base lean direction (-0.2 to 0.2)
      width: 1 + rng() * 2.5,            // blade width in pixels
      shade: rng(),                       // color variation 0-1
      windPhase: rng() * Math.PI * 2,    // offset for wind animation
      windStrength: 0.3 + rng() * 0.7,   // how much this blade responds to wind
      row: rng(),                         // depth position (0 = horizon, 1 = bottom)
    })
  }
  // Sort by row so back blades render first (painter's algorithm)
  blades.sort((a, b) => a.row - b.row)
  return blades
}

// Pre-generate star positions
function generateStars(count, seed = 99) {
  const stars = []
  const rng = createRng(seed)
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng() * 100,
      y: rng() * 55,            // top 55% only (sky area)
      size: 1 + rng() * 2.5,
      opacity: 0.3 + rng() * 0.7,
      twinkleDelay: rng() * 4,
      twinkleDuration: 2 + rng() * 3,
    })
  }
  return stars
}

// Static data (generated once at module load)
// 1800 blades balances organic density with 30fps Canvas2D perf
const GRASS_BLADES = generateGrassBlades(1800, 42)
const STARS = generateStars(120)

// ---- GRASS CANVAS ----
// Renders organic grass blades on an HTML5 canvas with wind animation
function GrassCanvas({ isNight, width, height }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const timeRef = useRef(0)
  const lastFrameRef = useRef(0)
  const isNightRef = useRef(isNight)

  // Keep ref in sync so animation loop doesn't need re-creation
  useEffect(() => {
    isNightRef.current = isNight
  }, [isNight])

  // Day palette: multiple shades for depth
  const dayColors = useMemo(() => [
    [76, 175, 80],    // base green
    [67, 160, 70],    // medium green
    [56, 142, 60],    // dark green
    [102, 187, 106],  // light green
    [85, 166, 88],    // mid-light
    [46, 125, 50],    // deep green
  ], [])

  // Night palette
  const nightColors = useMemo(() => [
    [25, 60, 22],     // base dark
    [20, 50, 18],     // darker
    [30, 70, 28],     // slightly lighter
    [18, 42, 16],     // very dark
    [22, 55, 20],     // medium dark
    [15, 38, 14],     // deepest
  ], [])

  const drawGrass = useCallback((ctx, w, h, time) => {
    const night = isNightRef.current
    const colors = night ? nightColors : dayColors
    const grassStartY = h * 0.48  // grass starts at 48% from top
    const grassHeight = h - grassStartY

    // Clear just the grass area
    ctx.clearRect(0, grassStartY - 10, w, grassHeight + 10)

    // Draw ground fill first
    const groundGrad = ctx.createLinearGradient(0, grassStartY, 0, h)
    if (night) {
      groundGrad.addColorStop(0, '#1A3318')
      groundGrad.addColorStop(0.4, '#1E3D1C')
      groundGrad.addColorStop(1, '#162B14')
    } else {
      groundGrad.addColorStop(0, '#5CAD60')
      groundGrad.addColorStop(0.3, '#66BB6A')
      groundGrad.addColorStop(0.7, '#72C276')
      groundGrad.addColorStop(1, '#5CAD60')
    }
    ctx.fillStyle = groundGrad
    ctx.fillRect(0, grassStartY, w, grassHeight)

    // Soft horizon blend (so grass edge isn't a hard line)
    const horizonGrad = ctx.createLinearGradient(0, grassStartY - 8, 0, grassStartY + 20)
    if (night) {
      horizonGrad.addColorStop(0, 'rgba(22, 34, 54, 0.8)')
      horizonGrad.addColorStop(0.3, 'rgba(26, 51, 24, 0.6)')
      horizonGrad.addColorStop(1, 'rgba(26, 51, 24, 0)')
    } else {
      horizonGrad.addColorStop(0, 'rgba(129, 212, 250, 0.5)')
      horizonGrad.addColorStop(0.3, 'rgba(92, 173, 96, 0.6)')
      horizonGrad.addColorStop(1, 'rgba(92, 173, 96, 0)')
    }
    ctx.fillStyle = horizonGrad
    ctx.fillRect(0, grassStartY - 8, w, 28)

    // Wind wave parameters
    const windSpeed = night ? 0.4 : 0.8
    const windAmplitude = night ? 0.012 : 0.02

    // Draw each blade
    for (let i = 0; i < GRASS_BLADES.length; i++) {
      const blade = GRASS_BLADES[i]
      const bx = blade.x * w
      // Map row to vertical position: 0 = at horizon, 1 = at bottom
      const by = grassStartY + blade.row * grassHeight

      // Blades near horizon are shorter and thinner (depth perspective)
      const depthScale = 0.3 + blade.row * 0.7
      const bladeH = blade.height * h * depthScale
      const bladeW = blade.width * depthScale

      // Wind: sin wave with per-blade phase offset
      const windOffset = Math.sin(time * windSpeed + blade.windPhase + bx * 0.005) * windAmplitude * w * blade.windStrength * depthScale

      // Pick color based on shade + depth
      const colorIdx = Math.floor(blade.shade * colors.length) % colors.length
      const c = colors[colorIdx]
      // Darken blades near the back (depth fog), lighten near front
      const depthDarken = night ? (1 - blade.row * 0.3) : (0.85 + blade.row * 0.15)
      const r = Math.round(c[0] * depthDarken)
      const g = Math.round(c[1] * depthDarken)
      const b = Math.round(c[2] * depthDarken)
      const alpha = 0.7 + blade.row * 0.3 // back blades slightly transparent

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
      ctx.lineWidth = bladeW
      ctx.lineCap = 'round'

      // Draw blade as a quadratic bezier curve
      const baseX = bx
      const baseY = by
      const tipX = bx + blade.lean * bladeH + windOffset
      const tipY = by - bladeH
      const cpX = bx + (blade.lean * bladeH * 0.5) + windOffset * 0.6
      const cpY = by - bladeH * 0.6

      ctx.beginPath()
      ctx.moveTo(baseX, baseY)
      ctx.quadraticCurveTo(cpX, cpY, tipX, tipY)
      ctx.stroke()
    }

    // Add subtle highlight patches (dappled sunlight / moonlight)
    const patchCount = night ? 3 : 5
    const patchRng = createRng(123)
    for (let i = 0; i < patchCount; i++) {
      const px = patchRng() * w
      const py = grassStartY + 0.2 * grassHeight + patchRng() * grassHeight * 0.6
      const pr = 30 + patchRng() * 60
      const grad = ctx.createRadialGradient(px, py, 0, px, py, pr)
      if (night) {
        grad.addColorStop(0, 'rgba(100, 180, 255, 0.04)')
        grad.addColorStop(1, 'rgba(100, 180, 255, 0)')
      } else {
        grad.addColorStop(0, 'rgba(255, 255, 200, 0.08)')
        grad.addColorStop(1, 'rgba(255, 255, 200, 0)')
      }
      ctx.fillStyle = grad
      ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2)
    }

    // Night: moonlight sheen across grass
    if (night) {
      const moonGrad = ctx.createLinearGradient(0, grassStartY, 0, h)
      moonGrad.addColorStop(0, 'rgba(100, 180, 255, 0.03)')
      moonGrad.addColorStop(0.5, 'rgba(100, 180, 255, 0.06)')
      moonGrad.addColorStop(1, 'rgba(100, 180, 255, 0.02)')
      ctx.fillStyle = moonGrad
      ctx.fillRect(0, grassStartY, w, grassHeight)
    }
  }, [dayColors, nightColors])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width <= 0 || height <= 0) return

    // Use devicePixelRatio for crisp rendering
    const dpr = Math.min(window.devicePixelRatio || 1, 2) // cap at 2x for perf
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const animate = (timestamp) => {
      // Throttle to ~30fps for performance (background doesn't need 60fps)
      if (timestamp - lastFrameRef.current < 33) {
        animRef.current = requestAnimationFrame(animate)
        return
      }
      lastFrameRef.current = timestamp
      timeRef.current = timestamp * 0.001 // convert to seconds

      // Clear sky area (grass area cleared inside drawGrass)
      ctx.clearRect(0, 0, width, height * 0.48)

      // Draw sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.52)
      if (isNightRef.current) {
        skyGrad.addColorStop(0, '#0A0E1A')
        skyGrad.addColorStop(1, '#162236')
      } else {
        skyGrad.addColorStop(0, '#4FC3F7')
        skyGrad.addColorStop(1, '#81D4FA')
      }
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, width, height * 0.52)

      drawGrass(ctx, width, height, timeRef.current)

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [width, height, drawGrass])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}

// ---- MOON ----
function Moon() {
  return (
    <div style={{
      position: 'absolute',
      top: '8%',
      right: '15%',
      width: 60,
      height: 60,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 40% 40%, #FFF8E1, #FFE082, #FFCA28)',
      boxShadow: '0 0 40px 15px rgba(255, 236, 179, 0.25), 0 0 80px 30px rgba(255, 236, 179, 0.1)',
      transition: 'opacity 2s ease',
    }} />
  )
}

// ---- SUN (visible warm disc + glow) ----
function Sun() {
  return (
    <>
      {/* Sun disc */}
      <div style={{
        position: 'absolute',
        top: '6%',
        right: '18%',
        width: 50,
        height: 50,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 45% 45%, #FFF9C4, #FFEE58, #FFD54F)',
        boxShadow: '0 0 30px 10px rgba(255, 235, 59, 0.3), 0 0 60px 25px rgba(255, 235, 59, 0.12)',
      }} />
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-5%',
        right: '12%',
        width: 240,
        height: 240,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,235,59,0.12) 0%, rgba(255,235,59,0.04) 40%, transparent 70%)',
        pointerEvents: 'none',
      }} />
    </>
  )
}

// ---- CLOUD (soft fluffy cloud) ----
function Cloud({ x, y, scale, speed }) {
  return (
    <div style={{
      position: 'absolute',
      top: `${y}%`,
      left: `${x}%`,
      transform: `scale(${scale})`,
      animation: `crossy-cloud-drift ${speed}s linear infinite`,
      pointerEvents: 'none',
      opacity: 0.85,
    }}>
      {/* Softer cloud shape with rounded edges */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end' }}>
        <div style={{ width: 18, height: 14, background: 'rgba(255,255,255,0.8)', borderRadius: 8 }} />
        <div style={{ width: 22, height: 20, background: 'rgba(255,255,255,0.88)', borderRadius: 10, marginBottom: 3 }} />
        <div style={{ width: 28, height: 26, background: 'rgba(255,255,255,0.95)', borderRadius: 14 }} />
        <div style={{ width: 22, height: 18, background: 'rgba(255,255,255,0.88)', borderRadius: 10, marginBottom: 2 }} />
        <div style={{ width: 16, height: 12, background: 'rgba(255,255,255,0.75)', borderRadius: 8 }} />
      </div>
    </div>
  )
}

// ---- MAIN COMPONENT ----
export default function CrossyBackground({ isNightMode }) {
  const isNight = isNightMode
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // Measure container for canvas sizing
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="crossy-background"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* Keyframes for animations */}
      <style>{`
        @keyframes crossy-twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes crossy-cloud-drift {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(100vw + 200px)); }
        }
      `}</style>

      {/* CANVAS: sky gradient + organic grass blades with wind animation */}
      {size.w > 0 && size.h > 0 && (
        <GrassCanvas isNight={isNight} width={size.w} height={size.h} />
      )}

      {/* DAYTIME: Sun + clouds */}
      {!isNight && (
        <>
          <Sun />
          <Cloud x={-10} y={8} scale={1.2} speed={80} />
          <Cloud x={-30} y={18} scale={0.8} speed={120} />
          <Cloud x={-60} y={5} scale={1.0} speed={100} />
          <Cloud x={-80} y={22} scale={0.6} speed={90} />
        </>
      )}

      {/* NIGHTTIME: Stars + moon */}
      {isNight && (
        <>
          {/* Stars */}
          {STARS.map((star, i) => (
            <div
              key={`star-${i}`}
              style={{
                position: 'absolute',
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                borderRadius: '50%',
                background: '#FFFFFF',
                opacity: star.opacity,
                animation: `crossy-twinkle ${star.twinkleDuration}s ease-in-out ${star.twinkleDelay}s infinite`,
                boxShadow: star.size > 2 ? '0 0 3px 1px rgba(255,255,255,0.3)' : 'none',
              }}
            />
          ))}

          {/* Moon */}
          <Moon />
        </>
      )}

      {/* Bottom gradient fade to match UI elements below */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '8%',
        background: isNight
          ? 'linear-gradient(180deg, transparent, rgba(10,13,26,0.5))'
          : 'linear-gradient(180deg, transparent, rgba(76,175,80,0.2))',
        pointerEvents: 'none',
        transition: 'background 2s ease',
      }} />
    </div>
  )
}
