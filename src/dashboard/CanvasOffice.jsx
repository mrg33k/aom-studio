import React, { useRef, useEffect, useState, useCallback } from 'react'

// CanvasOffice: MULTI-ROOM hex tessellation with wave crossfade transitions
//
// FILE OWNER: Bobby (Canvas team). Bobby2 (HUD team) does NOT touch this file.
//
// All available agent rooms from public/corner/ rendered as hex puzzle pieces.
// Wave effect: each room crossfades between working/idle at a staggered time offset.
// Dark backdrop behind rooms so skyline doesn't peek through gaps.

// ---- ROOM CONFIG ----
const ROOM_SIZE = 512        // Base room size (px, scales with zoom)
const BG_COLOR = '#0A0D1A'   // Dark night background

// Wave timing
const CYCLE_TIME = 10        // Full working+idle cycle in seconds
const FADE_DURATION = 4.5    // Crossfade duration in seconds
const WAVE_OFFSET = 1.2      // Stagger between consecutive rooms in seconds

// ---- ALL AGENT ROOMS ----
// Rooms with dedicated folders (working + idle states)
// Rooms without folders use their single PNG for both states
const ALL_ROOMS = [
  // Row 0: top center
  { id: 'elon',    name: 'ELON',    color: '#4CAF50', row: 0, col: 0 },
  // Row 1: offset left and right
  { id: 'bobby',   name: 'BOBBY',   color: '#E91E90', row: 1, col: -1 },
  { id: 'steffen', name: 'STEFFEN', color: '#FFD700', row: 1, col: 1 },
  // Row 2: three across
  { id: 'steve',   name: 'STEVE',   color: '#60A5FA', row: 2, col: -2 },
  { id: 'cleo',    name: 'CLEO',    color: '#C084FC', row: 2, col: 0 },
  { id: 'alex',    name: 'ALEX',    color: '#F97316', row: 2, col: 2 },
  // Row 3: offset
  { id: 'mom',     name: 'MOM',     color: '#EC4899', row: 3, col: -1 },
  { id: 'tony',    name: 'TONY',    color: '#22D3EE', row: 3, col: 1 },
  // Row 4: three across
  { id: 'jacob',   name: 'JACOB',   color: '#A3E635', row: 4, col: -2 },
  { id: 'paige',   name: 'PAIGE',   color: '#FB923C', row: 4, col: 0 },
  { id: 'elmo',    name: 'ELMO',    color: '#F43F5E', row: 4, col: 2 },
]

// ---- IMAGE SOURCES ----
// Rooms with folders get working + idle variants
// Rooms with only a single PNG use that for both states
function getRoomImageSources(id) {
  const folderRooms = ['elon', 'bobby', 'steffen', 'steve', 'alex', 'cleo', 'jacob', 'mom']
  if (folderRooms.includes(id)) {
    return {
      working: `/corner/${id}-room/room-shell-working.png`,
      idle: `/corner/${id}-room/room-shell-idle.png`,
    }
  }
  // Single PNG rooms: same image for both states
  return {
    working: `/corner/${id}-room.png`,
    idle: `/corner/${id}-room.png`,
  }
}

// Preload ALL room images at module load
const roomImages = {}
ALL_ROOMS.forEach((room) => {
  const sources = getRoomImageSources(room.id)
  const workImg = new Image()
  workImg.crossOrigin = 'anonymous'
  workImg.src = sources.working
  const idleImg = new Image()
  idleImg.crossOrigin = 'anonymous'
  idleImg.src = sources.idle
  roomImages[room.id] = { working: workImg, idle: idleImg }
})

// ---- SMOOTHSTEP ----
// Hermite interpolation for buttery smooth transitions
function smoothstep(t) {
  t = Math.max(0, Math.min(1, t))
  return t * t * (3 - 2 * t)
}

// ---- WAVE BLEND ----
// Returns blend alpha (0 = working, 1 = idle) for a given room index at time t
function getWaveBlend(elapsed, roomIndex) {
  const offset = roomIndex * WAVE_OFFSET
  const t = ((elapsed + offset) % CYCLE_TIME) / CYCLE_TIME

  // First half of cycle: working -> idle (fade up)
  // Second half: idle -> working (fade down)
  const halfCycle = CYCLE_TIME / 2
  const fadeFraction = FADE_DURATION / halfCycle

  const cyclePos = ((elapsed + offset) % CYCLE_TIME)

  if (cyclePos < halfCycle) {
    // Working -> Idle phase
    const fadeProgress = cyclePos / FADE_DURATION
    if (fadeProgress < 1) {
      return smoothstep(fadeProgress)
    }
    return 1 // fully idle, holding
  } else {
    // Idle -> Working phase
    const fadeProgress = (cyclePos - halfCycle) / FADE_DURATION
    if (fadeProgress < 1) {
      return 1 - smoothstep(fadeProgress)
    }
    return 0 // fully working, holding
  }
}

// ---- HEX LAYOUT ----
// Compute pixel position for a room given its row/col in the hex grid.
// Even rows are centered, odd rows are offset by half a hex width.
const VIS_W = ROOM_SIZE * 0.90   // visible hex width (clip uses 0.05-0.95)
const VIS_H = ROOM_SIZE * 0.90   // visible hex height

function hexPosition(row, col, originX, originY) {
  // Each column step is half the visible width
  const x = originX + col * (VIS_W * 0.50)
  // Each row step is 70% of visible height (hex tessellation vertical overlap)
  const y = originY + row * (VIS_H * 0.35)
  return { x, y }
}

// ---- DIAMOND HIT TEST ----
function isInsideDiamond(px, py, cx, cy, hw, hh) {
  return Math.abs(px - cx) / hw + Math.abs(py - cy) / hh <= 1
}

const DIAMOND_HW = ROOM_SIZE / 2
const DIAMOND_HH = ROOM_SIZE / 4

// Test if a canvas-space point hits any room's diamond
function hitTestRooms(cx, cy, originX, originY) {
  for (let i = ALL_ROOMS.length - 1; i >= 0; i--) {
    const room = ALL_ROOMS[i]
    const pos = hexPosition(room.row, room.col, originX, originY)
    const roomCX = pos.x + ROOM_SIZE / 2
    const roomCY = pos.y + ROOM_SIZE / 2
    if (isInsideDiamond(cx, cy, roomCX, roomCY, DIAMOND_HW, DIAMOND_HH)) {
      return room.id
    }
  }
  return null
}

// ---- COMPONENT ----
export default function CanvasOffice({
  agentStatus = {},
  onRoomClick,
  selectedRoom,
  hoveredRoom: extHover,
  setHoveredRoom: setExtHover,
  isNightMode = true,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState(null) // hovered room id
  const [loaded, setLoaded] = useState(false)

  // Pan + zoom
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1.0)
  const panRef = useRef({ dragging: false, sx: 0, sy: 0, lx: 0, ly: 0, vx: 0, vy: 0, didDrag: false })
  const momRef = useRef(null)
  const ZOOM_MIN = 0.3
  const ZOOM_MAX = 3.0

  // Animation time reference
  const startTimeRef = useRef(performance.now())

  // Track image loading
  useEffect(() => {
    let loadCount = 0
    const totalImages = ALL_ROOMS.length * 2
    const checkDone = () => {
      loadCount++
      if (loadCount >= totalImages) setLoaded(true)
    }
    ALL_ROOMS.forEach((room) => {
      const imgs = roomImages[room.id]
      if (imgs.working.complete) checkDone()
      else imgs.working.onload = checkDone
      if (imgs.idle.complete) checkDone()
      else imgs.idle.onload = checkDone
    })
    // Fallback: mark loaded after 3s even if some images fail
    const fallback = setTimeout(() => setLoaded(true), 3000)
    return () => clearTimeout(fallback)
  }, [])

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect()
        setSize({ w: r.width, h: r.height })
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Center the grid on mount
  useEffect(() => {
    if (size.w > 0 && size.h > 0) {
      // Find bounding box of all rooms
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      ALL_ROOMS.forEach((room) => {
        const pos = hexPosition(room.row, room.col, 0, 0)
        minX = Math.min(minX, pos.x)
        maxX = Math.max(maxX, pos.x + ROOM_SIZE)
        minY = Math.min(minY, pos.y)
        maxY = Math.max(maxY, pos.y + ROOM_SIZE)
      })
      const gridW = maxX - minX
      const gridH = maxY - minY
      // Center the grid, accounting for zoom
      const cx = (size.w - gridW * zoom) / 2 - minX * zoom
      const cy = (size.h - gridH * zoom) / 2 - minY * zoom
      setPan({ x: cx, y: cy })
    }
  }, [size.w, size.h]) // eslint-disable-line

  // Origin for hex layout (will be adjusted by centering)
  const ORIGIN_X = ROOM_SIZE * 1.5
  const ORIGIN_Y = ROOM_SIZE * 0.1

  // ---- DRAW ----
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    canvas.style.width = `${size.w}px`
    canvas.style.height = `${size.h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Clear to transparent so Crossy Road background shows through
    ctx.clearRect(0, 0, size.w, size.h)

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    ctx.imageSmoothingEnabled = false

    const elapsed = (performance.now() - startTimeRef.current) / 1000

    // ---- DARK BACKDROP ----
    // Draw a dark solid shape behind all rooms so the city doesn't peek through gaps.
    // We compute a convex hull-ish polygon that covers all room hexes plus padding.
    ctx.save()
    ctx.fillStyle = '#080B16'

    // Collect all hex vertices from all rooms, then draw a padded bounding region
    const PAD = 20
    let bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity
    ALL_ROOMS.forEach((room) => {
      const pos = hexPosition(room.row, room.col, ORIGIN_X, ORIGIN_Y)
      const S = ROOM_SIZE
      // The hex vertices
      const verts = [
        [pos.x + S * 0.50, pos.y + S * 0.05],
        [pos.x + S * 0.95, pos.y + S * 0.28],
        [pos.x + S * 0.95, pos.y + S * 0.75],
        [pos.x + S * 0.50, pos.y + S * 0.95],
        [pos.x + S * 0.05, pos.y + S * 0.75],
        [pos.x + S * 0.05, pos.y + S * 0.28],
      ]
      verts.forEach(([vx, vy]) => {
        bMinX = Math.min(bMinX, vx)
        bMaxX = Math.max(bMaxX, vx)
        bMinY = Math.min(bMinY, vy)
        bMaxY = Math.max(bMaxY, vy)
      })
    })

    // Draw a rounded dark rectangle behind the entire room cluster
    const bdX = bMinX - PAD
    const bdY = bMinY - PAD
    const bdW = (bMaxX - bMinX) + PAD * 2
    const bdH = (bMaxY - bMinY) + PAD * 2
    ctx.beginPath()
    ctx.roundRect(bdX, bdY, bdW, bdH, 24)
    ctx.fill()

    // Subtle edge glow on the backdrop
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.08)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()

    // ---- RENDER ALL ROOMS ----
    ALL_ROOMS.forEach((room, idx) => {
      const pos = hexPosition(room.row, room.col, ORIGIN_X, ORIGIN_Y)
      const imgs = roomImages[room.id]
      const alpha = getWaveBlend(elapsed, idx)

      drawRoom(ctx, pos.x, pos.y, imgs.working, imgs.idle, alpha, room.name, room.color, room.id === hover || room.id === selectedRoom)
    })

    ctx.restore() // undo pan/zoom

  }, [size, pan, zoom, hover, selectedRoom, ORIGIN_X, ORIGIN_Y])

  // ---- HELPER: Draw one room with hex clip ----
  function drawRoom(ctx, offsetX, offsetY, workImg, idleImg, alpha, nameText, nameColor, isHighlighted) {
    ctx.save()
    ctx.translate(offsetX, offsetY)

    // Hex clip path
    ctx.beginPath()
    const S = ROOM_SIZE
    ctx.moveTo(S * 0.50, S * 0.05)
    ctx.lineTo(S * 0.95, S * 0.28)
    ctx.lineTo(S * 0.95, S * 0.75)
    ctx.lineTo(S * 0.50, S * 0.95)
    ctx.lineTo(S * 0.05, S * 0.75)
    ctx.lineTo(S * 0.05, S * 0.28)
    ctx.closePath()
    ctx.clip()

    // Crossfade blend between working and idle
    if (workImg?.complete && idleImg?.complete) {
      // Draw working state
      ctx.save()
      ctx.globalAlpha = 1 - alpha
      ctx.drawImage(workImg, 0, 0, S, S)
      ctx.restore()
      // Draw idle state on top
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.drawImage(idleImg, 0, 0, S, S)
      ctx.restore()
    } else if (workImg?.complete) {
      ctx.drawImage(workImg, 0, 0, S, S)
    } else if (idleImg?.complete) {
      ctx.drawImage(idleImg, 0, 0, S, S)
    }

    // Highlight glow for hovered/selected rooms
    if (isHighlighted) {
      ctx.fillStyle = `${nameColor}15`
      ctx.beginPath()
      ctx.moveTo(S * 0.50, S * 0.05)
      ctx.lineTo(S * 0.95, S * 0.28)
      ctx.lineTo(S * 0.95, S * 0.75)
      ctx.lineTo(S * 0.50, S * 0.95)
      ctx.lineTo(S * 0.05, S * 0.75)
      ctx.lineTo(S * 0.05, S * 0.28)
      ctx.closePath()
      ctx.fill()
    }

    // Nameplate
    ctx.save()
    ctx.font = '600 14px Inter, system-ui, sans-serif'
    const tw = ctx.measureText(nameText).width
    const npX = S * 0.5 - tw / 2 - 8
    const npY = S * 0.88
    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)'
    ctx.beginPath()
    ctx.roundRect(npX - 2, npY - 10, tw + 20, 24, 4)
    ctx.fill()
    ctx.strokeStyle = `${nameColor}55`
    ctx.lineWidth = 1
    ctx.stroke()
    // Status dot
    ctx.beginPath()
    ctx.arc(npX + 6, npY + 2, 4, 0, Math.PI * 2)
    ctx.fillStyle = nameColor
    ctx.fill()
    // Name text
    ctx.fillStyle = '#EDF2FA'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(nameText, npX + 14, npY + 2)
    ctx.restore()

    ctx.restore() // undo translate + clip
  }

  // Render loop
  useEffect(() => {
    if (!loaded) return
    let raf
    const loop = () => {
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [draw, loaded])

  // ---- WHEEL ZOOM ----
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      setZoom(z => {
        const nz = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * factor))
        const ratio = nz / z
        setPan(p => ({
          x: mx - (mx - p.x) * ratio,
          y: my - (my - p.y) * ratio,
        }))
        return nz
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, []) // eslint-disable-line

  // ---- PAN ----
  const onDown = useCallback((e) => {
    if (momRef.current) cancelAnimationFrame(momRef.current)
    panRef.current = {
      dragging: true, sx: e.clientX - pan.x, sy: e.clientY - pan.y,
      lx: e.clientX, ly: e.clientY, vx: 0, vy: 0, didDrag: false,
    }
  }, [pan])

  const onMove = useCallback((e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const cx = (e.clientX - rect.left - pan.x) / zoom
      const cy = (e.clientY - rect.top - pan.y) / zoom
      const hitRoom = hitTestRooms(cx, cy, ORIGIN_X, ORIGIN_Y)
      if (hitRoom !== hover) {
        setHover(hitRoom)
        setExtHover?.(hitRoom)
      }
    }

    if (!panRef.current.dragging) return
    const nx = e.clientX - panRef.current.sx
    const ny = e.clientY - panRef.current.sy
    panRef.current.vx = e.clientX - panRef.current.lx
    panRef.current.vy = e.clientY - panRef.current.ly
    panRef.current.lx = e.clientX
    panRef.current.ly = e.clientY
    if (Math.abs(panRef.current.vx) > 1 || Math.abs(panRef.current.vy) > 1) {
      panRef.current.didDrag = true
    }
    setPan({ x: nx, y: ny })
  }, [pan, zoom, hover, setExtHover, ORIGIN_X, ORIGIN_Y])

  const onUp = useCallback(() => {
    if (!panRef.current.dragging) return
    panRef.current.dragging = false
    let vx = panRef.current.vx
    let vy = panRef.current.vy
    const drift = () => {
      if (Math.abs(vx) < 0.4 && Math.abs(vy) < 0.4) return
      vx *= 0.91
      vy *= 0.91
      setPan(p => ({ x: p.x + vx, y: p.y + vy }))
      momRef.current = requestAnimationFrame(drift)
    }
    if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
      momRef.current = requestAnimationFrame(drift)
    }
  }, [])

  const onClick = useCallback((e) => {
    if (panRef.current.didDrag) {
      panRef.current.didDrag = false
      return
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const cx = (e.clientX - rect.left - pan.x) / zoom
      const cy = (e.clientY - rect.top - pan.y) / zoom
      const hitRoom = hitTestRooms(cx, cy, ORIGIN_X, ORIGIN_Y)
      if (hitRoom) {
        onRoomClick?.(hitRoom)
      }
    }
  }, [pan, zoom, onRoomClick, ORIGIN_X, ORIGIN_Y])

  // Touch events
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      if (momRef.current) cancelAnimationFrame(momRef.current)
      panRef.current = {
        dragging: true, sx: t.clientX - pan.x, sy: t.clientY - pan.y,
        lx: t.clientX, ly: t.clientY, vx: 0, vy: 0, didDrag: false,
      }
    }
  }, [pan])

  const onTouchMove = useCallback((e) => {
    if (!panRef.current.dragging || e.touches.length !== 1) return
    const t = e.touches[0]
    const nx = t.clientX - panRef.current.sx
    const ny = t.clientY - panRef.current.sy
    panRef.current.vx = t.clientX - panRef.current.lx
    panRef.current.vy = t.clientY - panRef.current.ly
    panRef.current.lx = t.clientX
    panRef.current.ly = t.clientY
    if (Math.abs(panRef.current.vx) > 1 || Math.abs(panRef.current.vy) > 1) {
      panRef.current.didDrag = true
    }
    setPan({ x: nx, y: ny })
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      if (!panRef.current.didDrag) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const cx = (panRef.current.lx - rect.left - pan.x) / zoom
          const cy = (panRef.current.ly - rect.top - pan.y) / zoom
          const hitRoom = hitTestRooms(cx, cy, ORIGIN_X, ORIGIN_Y)
          if (hitRoom) {
            onRoomClick?.(hitRoom)
          }
        }
      }
      panRef.current.didDrag = false
      onUp()
    }
  }, [pan, zoom, onRoomClick, onUp, ORIGIN_X, ORIGIN_Y])

  const cursor = panRef.current.dragging ? 'grabbing' : (hover ? 'pointer' : 'grab')

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        position: 'relative', overflow: 'hidden', cursor,
        background: 'transparent', zIndex: 1,
      }}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={() => { onUp(); setHover(null); setExtHover?.(null) }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onClick={onClick}
      />
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(10,13,26,0.9)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 40, height: 40, margin: '0 auto 12px',
              border: '3px solid rgba(76,175,80,0.2)',
              borderTop: '3px solid #4CAF50',
              borderRadius: '50%',
              animation: 'canvasOfficeSpin 0.8s linear infinite',
            }} />
            <div style={{
              color: '#4CAF50', fontSize: 13, fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.1em',
            }}>
              LOADING OFFICE
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Inject keyframes
if (typeof document !== 'undefined') {
  const id = 'canvas-office-styles'
  if (!document.getElementById(id)) {
    const s = document.createElement('style')
    s.id = id
    s.textContent = `@keyframes canvasOfficeSpin { to { transform: rotate(360deg); } }`
    document.head.appendChild(s)
  }
}
