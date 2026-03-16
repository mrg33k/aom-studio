import React, { useRef, useEffect, useState, useCallback } from 'react'
import { GRID_SPEC, ROOM_MAP } from './gridSpec.js'

// CanvasOffice: Renders ALL 13 rooms on a single HTML5 Canvas in isometric grid layout.
// Replaces flat office-full.png with composited room-background PNGs.
// Features: isometric grid, click-to-select room, mouse drag pan, scroll zoom,
// hover glow, active agent glow, room labels, smooth interactions.
//
// FILE OWNER: Bobby (Canvas team). Bobby2 (HUD team) does NOT touch this file.
//
// ========== PATRIK DIRECTIVES (Pass 25, lines 255-265) ==========
// TODO(bobby): DARK BACKGROUND + ELON ROOM ONLY -- Remove ALL old flat PNG office images. Set canvas background to dark/night (#0D0D1A or similar). Render ONLY Elon's CanvasRoom on a dark background. No other rooms until Elon's room is PERFECT. Clean slate. "1 turns into 13 if you can count to 1." Ref: Patrik directive line 255, 264.
// TODO(bobby): ELON ROOM FOCUS -- Strip multi-room grid rendering temporarily. Single room centered on canvas. All agent energy on ONE room: style, spacing, click, hover, depth, character. When Elon walks in his server room and it feels like a game, THEN add room 2. Ref: Patrik directive line 264-265.
// TODO(bobby): CLICK SELECTION PERFECTION -- Current hitTest is rectangular bounding box. Needs to feel crisp: click on room = instant highlight, click outside = deselect. Test at multiple zoom levels. No ambiguity. Ref: Patrik feedback line 262.
// TODO(bobby): ROOM SPACING PERFECTION -- When rooms eventually scale back to 13, spacing between rooms must feel intentional. No overlap, no cramping, no dead space. But DO NOT add rooms yet. Elon first. Ref: Patrik feedback line 262.
// TODO(bobby): BIG ROOM TILING (FUTURE) -- Main hall and large rooms render as 4 PIECES that tile into one large room. Same diamond shape, 4 quadrants. 2x2 grid of tiles = one big room. Scales infinitely. Any room can be 1x1, 2x2, or bigger. NOT a current priority. Perfect single room first. Ref: Patrik feedback line 257, 262.
// TODO(bobby): MULTI-CELL ROOM SUPPORT (FUTURE) -- Grid must support variable room sizes. Standard rooms = 1x1 cell. Main hall = 2x2 or 3x1 cells. All same isometric diamond shape, just spanning more cells. Blocked until single room is perfect. Ref: Patrik feedback line 257.
// TODO(bobby): STRIP ALL OTHER ROOMS -- Remove ALL rooms except Elon from the Canvas. Elon's room FRONT AND CENTER on dark background. One room only on screen. Nothing else. Ref: Patrik directive line 268.
// TODO(bobby): AGENT NAME ON WALL -- Agent name tag should be ON THE WALL inside the room, not underneath as a DOM label. Like a real office nameplate. Part of the Canvas room scene. Render as a wall element inside the Canvas, not a text overlay below. Ref: Patrik feedback line 269.
// ==========

// ---- LAYOUT ----
// Room images are 512x512. We render each at RENDER_SIZE and space them in a grid.
// Grid from GRID_SPEC: 8 cols x 4 rows. Each room is 2 cols wide (main-hall is 4).
// Isometric stagger: odd rows offset to the right by half a cell.
const RENDER_SIZE = 320  // Rendered size per standard room (2-col)
const GAP_X = 20         // Horizontal gap between rooms
const GAP_Y = -60        // Vertical gap (negative = overlap for isometric depth feel)

// Build room positions using the grid spec.
// Grid: col 0-7, row 0-3. Each standard room = 2 cols wide.
// We convert to "room columns" (0-3) and use row directly.
function buildRoomPositions() {
  const positions = []
  for (const room of GRID_SPEC.rooms) {
    const { col, row } = room.position
    const { cols } = room.size
    const roomCol = col / 2  // Convert grid cols (0,2,4,6) to room cols (0,1,2,3)
    const widthMult = cols / 2  // main-hall = 2x width

    // Isometric-style stagger: each row shifts right and down
    // Row 0 = back wall (highest, offset left)
    // Row 3 = front (lowest, offset right)
    const staggerX = row * (RENDER_SIZE * 0.45)  // Each row shifts right
    const staggerY = row * (RENDER_SIZE * 0.55)  // Each row shifts down

    const x = roomCol * (RENDER_SIZE + GAP_X) + staggerX
    const y = staggerY

    positions.push({
      id: room.id,
      agent: room.agent,
      agentColor: room.agentColor || '#FFD87A',
      name: room.name,
      gridCol: col,
      gridRow: row,
      gridCols: cols,
      widthMult,
      x,
      y,
      w: RENDER_SIZE * widthMult + (widthMult > 1 ? GAP_X * (widthMult - 1) : 0),
      h: RENDER_SIZE,
    })
  }
  return positions
}

const ROOM_POSITIONS = buildRoomPositions()

// Compute total canvas world size
function computeBounds() {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const r of ROOM_POSITIONS) {
    minX = Math.min(minX, r.x)
    maxX = Math.max(maxX, r.x + r.w)
    minY = Math.min(minY, r.y)
    maxY = Math.max(maxY, r.y + r.h + 30) // Extra for labels
  }
  const pad = 60
  return {
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
    ox: -minX + pad,
    oy: -minY + pad,
  }
}

const BOUNDS = computeBounds()

// ---- IMAGE PRELOADER ----
function useRoomImages() {
  const [images, setImages] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const imgMap = {}
    let count = 0
    const ids = GRID_SPEC.rooms.map(r => r.id)
    const total = ids.length

    ids.forEach(id => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      const done = () => {
        count++
        if (count === total && !cancelled) {
          setImages(imgMap)
          setLoaded(true)
        }
      }
      img.onload = () => { imgMap[id] = img; done() }
      img.onerror = () => { console.warn(`[CanvasOffice] Failed: ${id}`); done() }
      img.src = `/corner/rooms/layered/${id}.png`
    })

    return () => { cancelled = true }
  }, [])

  return { images, loaded }
}

// ---- HIT TEST ----
function hitTestRoom(px, py, room) {
  const rx = room.x + BOUNDS.ox
  const ry = room.y + BOUNDS.oy
  return px >= rx && px <= rx + room.w && py >= ry && py <= ry + room.h
}

// ---- COMPONENT ----
export default function CanvasOffice({
  agentStatus = {},
  onRoomClick,
  selectedRoom,
  hoveredRoom: extHover,
  setHoveredRoom: setExtHover,
  isNightMode = false,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const { images, loaded } = useRoomImages()
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState(null)
  const hoveredRoom = extHover || hover

  // Pan + zoom
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(0.45)
  const panRef = useRef({ dragging: false, sx: 0, sy: 0, lx: 0, ly: 0, vx: 0, vy: 0, didDrag: false })
  const momRef = useRef(null)
  const ZOOM_MIN = 0.2
  const ZOOM_MAX = 2.5

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

  // Center on mount
  useEffect(() => {
    if (size.w > 0 && size.h > 0) {
      setPan({
        x: (size.w - BOUNDS.width * zoom) / 2,
        y: (size.h - BOUNDS.height * zoom) / 2,
      })
    }
  }, [size.w, size.h]) // eslint-disable-line

  // Screen to canvas coords
  const s2c = useCallback((cx, cy) => {
    const r = containerRef.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom }
  }, [pan, zoom])

  // Find room at canvas coords
  const findRoom = useCallback((cx, cy) => {
    // Check front-to-back (higher row = closer to viewer = on top)
    for (let i = ROOM_POSITIONS.length - 1; i >= 0; i--) {
      if (hitTestRoom(cx, cy, ROOM_POSITIONS[i])) return ROOM_POSITIONS[i]
    }
    return null
  }, [])

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

    // Background
    ctx.fillStyle = isNightMode ? '#0A0F1E' : '#E8F0FA'
    ctx.fillRect(0, 0, size.w, size.h)

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Ground shadow
    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.fillStyle = isNightMode ? '#1A2040' : '#94B8D8'
    ctx.beginPath()
    ctx.ellipse(
      BOUNDS.ox + BOUNDS.width / 2 - BOUNDS.ox,
      BOUNDS.oy + BOUNDS.height * 0.55,
      BOUNDS.width * 0.48,
      BOUNDS.height * 0.18,
      0, 0, Math.PI * 2
    )
    ctx.fill()
    ctx.restore()

    // Sort rooms: back rows first (lower gridRow = further back = drawn first)
    const sorted = [...ROOM_POSITIONS].sort((a, b) => {
      if (a.gridRow !== b.gridRow) return a.gridRow - b.gridRow
      return a.gridCol - b.gridCol
    })

    for (const room of sorted) {
      const img = images[room.id]
      const rx = room.x + BOUNDS.ox
      const ry = room.y + BOUNDS.oy

      const status = agentStatus[room.id]?.status || 'IDLE'
      const isActive = status === 'WORKING'
      const isSel = selectedRoom === room.id
      const isHov = hoveredRoom === room.id

      if (img) {
        ctx.save()
        ctx.imageSmoothingEnabled = false

        // Dim inactive rooms
        if (!isActive && !isHov && !isSel) ctx.globalAlpha = 0.82

        // Draw room image
        ctx.drawImage(img, rx, ry, room.w, room.h)
        ctx.globalAlpha = 1

        // Hover glow overlay
        if (isHov && room.agent) {
          ctx.save()
          ctx.globalAlpha = 0.18
          const g = ctx.createRadialGradient(
            rx + room.w / 2, ry + room.h / 2, 0,
            rx + room.w / 2, ry + room.h / 2, room.w * 0.5
          )
          g.addColorStop(0, room.agentColor)
          g.addColorStop(1, 'transparent')
          ctx.fillStyle = g
          ctx.fillRect(rx, ry, room.w, room.h)
          ctx.restore()
        }

        // Selected border
        if (isSel && room.agent) {
          ctx.save()
          ctx.strokeStyle = room.agentColor
          ctx.lineWidth = 3
          ctx.globalAlpha = 0.7
          ctx.shadowColor = room.agentColor
          ctx.shadowBlur = 20
          ctx.strokeRect(rx + 1, ry + 1, room.w - 2, room.h - 2)
          ctx.restore()
        }

        // Active pulse
        if (isActive) {
          ctx.save()
          ctx.globalAlpha = 0.12
          const pg = ctx.createRadialGradient(
            rx + room.w / 2, ry + room.h * 0.55, 0,
            rx + room.w / 2, ry + room.h * 0.55, room.w * 0.4
          )
          pg.addColorStop(0, '#22C55E')
          pg.addColorStop(1, 'transparent')
          ctx.fillStyle = pg
          ctx.fillRect(rx, ry, room.w, room.h)
          ctx.restore()
        }

        ctx.restore()
      } else {
        // Placeholder
        ctx.save()
        ctx.fillStyle = isNightMode ? 'rgba(20,30,50,0.5)' : 'rgba(180,200,220,0.3)'
        ctx.fillRect(rx, ry, room.w, room.h)
        ctx.restore()
      }

      // Room label
      if (room.agent) {
        const label = room.agent
        ctx.save()
        ctx.font = '600 13px Inter, system-ui, sans-serif'
        const tw = ctx.measureText(label).width
        const lx = rx + room.w / 2
        const ly = ry + room.h + 16

        // Pill background
        const pw = tw + 18
        const ph = 22
        ctx.fillStyle = (isHov || isSel)
          ? 'rgba(10, 18, 35, 0.92)'
          : 'rgba(10, 18, 35, 0.65)'
        ctx.beginPath()
        ctx.roundRect(lx - pw / 2, ly - ph / 2, pw, ph, 4)
        ctx.fill()

        // Pill border
        ctx.strokeStyle = (isHov || isSel)
          ? `${room.agentColor}99`
          : 'rgba(255,255,255,0.12)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Status dot
        const dc = isActive ? '#22C55E' : (status === 'BLOCKED' ? '#EF4444' : '#6B7280')
        ctx.beginPath()
        ctx.arc(lx - pw / 2 + 9, ly, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = dc
        ctx.fill()

        // Label text
        ctx.fillStyle = (isHov || isSel) ? '#fff' : 'rgba(255,255,255,0.85)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, lx + 4, ly)

        ctx.restore()
      }
    }

    ctx.restore()
  }, [images, size, pan, zoom, agentStatus, selectedRoom, hoveredRoom, isNightMode])

  // Render
  useEffect(() => {
    if (!loaded && Object.keys(images).length === 0) return
    draw()
  }, [draw, loaded])

  // ---- WHEEL ZOOM ----
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      // Zoom toward cursor position
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      setZoom(z => {
        const nz = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * factor))
        // Adjust pan to zoom toward cursor
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
    // Hover
    const cp = s2c(e.clientX, e.clientY)
    const hit = findRoom(cp.x, cp.y)
    const nh = hit?.agent ? hit.id : null
    if (nh !== hover) {
      setHover(nh)
      setExtHover?.(nh)
    }

    if (!panRef.current.dragging) return
    const nx = e.clientX - panRef.current.sx
    const ny = e.clientY - panRef.current.sy
    panRef.current.vx = e.clientX - panRef.current.lx
    panRef.current.vy = e.clientY - panRef.current.ly
    panRef.current.lx = e.clientX
    panRef.current.ly = e.clientY
    // Track if we actually dragged (for click vs drag detection)
    if (Math.abs(panRef.current.vx) > 1 || Math.abs(panRef.current.vy) > 1) {
      panRef.current.didDrag = true
    }
    setPan({ x: nx, y: ny })
  }, [s2c, findRoom, hover, setExtHover])

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

  // Click (only if not dragging)
  const onClick = useCallback((e) => {
    if (panRef.current.didDrag) {
      panRef.current.didDrag = false
      return
    }
    const cp = s2c(e.clientX, e.clientY)
    const hit = findRoom(cp.x, cp.y)
    if (hit?.agent) onRoomClick?.(hit.id)
  }, [s2c, findRoom, onRoomClick])

  // Touch
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
        // Tap = click
        const cp = s2c(panRef.current.lx, panRef.current.ly)
        const hit = findRoom(cp.x, cp.y)
        if (hit?.agent) onRoomClick?.(hit.id)
      }
      panRef.current.didDrag = false
      onUp()
    }
  }, [s2c, findRoom, onRoomClick, onUp])

  const cursor = panRef.current.dragging ? 'grabbing' : (hoveredRoom ? 'pointer' : 'grab')

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        position: 'relative', overflow: 'hidden', cursor,
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
          background: isNightMode ? 'rgba(10,15,30,0.8)' : 'rgba(232,240,250,0.8)',
        }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid rgba(59,130,246,0.2)',
            borderTop: '3px solid #3B82F6',
            borderRadius: '50%',
            animation: 'canvasOfficeSpin 0.8s linear infinite',
          }} />
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
