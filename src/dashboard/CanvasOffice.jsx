import React, { useRef, useEffect, useState, useCallback } from 'react'

// CanvasOffice: MULTI-ROOM hex tessellation with wave crossfade transitions
//
// FILE OWNER: Bobby (Canvas team). Bobby2 (HUD team) does NOT touch this file.
//
// All 13 agent rooms from public/corner/ rendered as hex puzzle pieces.
// Wave effect: each room crossfades between working/idle at a staggered time offset.
// Drag-and-drop: rooms can be repositioned, positions saved to localStorage.
// Right-click context menu: Regenerate Room, Reset Position, View Agent.

// ---- ROOM CONFIG ----
const ROOM_SIZE = 512        // Base room size (px, scales with zoom)
const BG_COLOR = '#0A0D1A'   // Dark night background

// Wave timing
const CYCLE_TIME = 10        // Full working+idle cycle in seconds
const FADE_DURATION = 4.5    // Crossfade duration in seconds
const WAVE_OFFSET = 1.2      // Stagger between consecutive rooms in seconds

// Drag threshold (px) - less than this = click, more = drag
const DRAG_THRESHOLD = 5

// localStorage key for custom room positions
const POSITIONS_KEY = 'corner-room-positions'

// ---- ALL 13 AGENT ROOMS ----
// Full roster: Elon, Bobby, Steffen, Steve, Cleo, Alex, Mom, Tony, Colton, Jacob, Paige, Elmo, Pixel
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
  // Row 3: three across (Mom, Tony, Colton)
  { id: 'mom',     name: 'MOM',     color: '#EC4899', row: 3, col: -2 },
  { id: 'tony',    name: 'TONY',    color: '#22D3EE', row: 3, col: 0 },
  { id: 'colton',  name: 'COLTON',  color: '#8B5CF6', row: 3, col: 2 },
  // Row 4: two offset
  { id: 'jacob',   name: 'JACOB',   color: '#A3E635', row: 4, col: -1 },
  { id: 'paige',   name: 'PAIGE',   color: '#FB923C', row: 4, col: 1 },
  // Row 5: bottom pair
  { id: 'elmo',    name: 'ELMO',    color: '#F43F5E', row: 5, col: -2 },
  { id: 'pixel',   name: 'PIXEL',   color: '#06B6D4', row: 5, col: 0 },
]

// ---- IMAGE SOURCES ----
// All 13 rooms have dedicated folders with working + idle variants
function getRoomImageSources(id) {
  const folderRooms = [
    'elon', 'bobby', 'steffen', 'steve', 'alex', 'cleo', 'jacob', 'mom',
    'tony', 'paige', 'elmo', 'colton', 'pixel',
  ]
  if (folderRooms.includes(id)) {
    return {
      working: `/corner/${id}-room/room-shell-working.png`,
      idle: `/corner/${id}-room/room-shell-idle.png`,
    }
  }
  // Fallback: single PNG rooms
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

// Test if a canvas-space point hits any room's diamond, using custom positions if available
function hitTestRoomsWithPositions(cx, cy, originX, originY, customPositions) {
  for (let i = ALL_ROOMS.length - 1; i >= 0; i--) {
    const room = ALL_ROOMS[i]
    let pos
    if (customPositions && customPositions[room.id]) {
      pos = customPositions[room.id]
    } else {
      pos = hexPosition(room.row, room.col, originX, originY)
    }
    const roomCX = pos.x + ROOM_SIZE / 2
    const roomCY = pos.y + ROOM_SIZE / 2
    if (isInsideDiamond(cx, cy, roomCX, roomCY, DIAMOND_HW, DIAMOND_HH)) {
      return room.id
    }
  }
  return null
}

// ---- LOAD/SAVE POSITIONS FROM LOCALSTORAGE ----
function loadSavedPositions() {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    // Ignore corrupt data
  }
  return {}
}

function savePositions(positions) {
  try {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions))
  } catch (e) {
    // localStorage full or unavailable
  }
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

  // Custom room positions (drag-and-drop overrides hex layout)
  const [roomPositions, setRoomPositions] = useState(loadSavedPositions)

  // Room drag state
  const roomDragRef = useRef({
    active: false,
    roomId: null,
    offsetX: 0,
    offsetY: 0,
    startClientX: 0,
    startClientY: 0,
    totalMovement: 0,
  })

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null) // { x, y, roomId, roomName }

  // Toast notification state
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

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
      // Find bounding box of all rooms (using custom positions if saved)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      ALL_ROOMS.forEach((room) => {
        const pos = roomPositions[room.id] || hexPosition(room.row, room.col, 0, 0)
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

  // Helper: get room position (custom or default hex)
  const getRoomPos = useCallback((room) => {
    if (roomPositions[room.id]) return roomPositions[room.id]
    return hexPosition(room.row, room.col, ORIGIN_X, ORIGIN_Y)
  }, [roomPositions, ORIGIN_X, ORIGIN_Y])

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

    // No backdrop - rooms float directly on the Three.js scene

    // ---- RENDER ALL ROOMS ----
    // Draw dragged room last so it renders on top
    const dragId = roomDragRef.current.active ? roomDragRef.current.roomId : null
    ALL_ROOMS.forEach((room, idx) => {
      if (room.id === dragId) return // skip, draw last
      const pos = getRoomPos(room)
      const imgs = roomImages[room.id]
      const alpha = getWaveBlend(elapsed, idx)
      drawRoom(ctx, pos.x, pos.y, imgs.working, imgs.idle, alpha, room.name, room.color, room.id === hover || room.id === selectedRoom)
    })

    // Draw dragged room on top with slight transparency
    if (dragId) {
      const dragRoom = ALL_ROOMS.find(r => r.id === dragId)
      if (dragRoom) {
        const dragIdx = ALL_ROOMS.indexOf(dragRoom)
        const pos = getRoomPos(dragRoom)
        const imgs = roomImages[dragRoom.id]
        const alpha = getWaveBlend(elapsed, dragIdx)
        ctx.save()
        ctx.globalAlpha = 0.9
        drawRoom(ctx, pos.x, pos.y, imgs.working, imgs.idle, alpha, dragRoom.name, dragRoom.color, true)
        ctx.restore()
      }
    }

    ctx.restore() // undo pan/zoom

  }, [size, pan, zoom, hover, selectedRoom, ORIGIN_X, ORIGIN_Y, getRoomPos])

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

  // ---- MOUSE DOWN: Start pan or room drag ----
  const onDown = useCallback((e) => {
    // Close context menu on any mousedown
    setContextMenu(null)

    if (momRef.current) cancelAnimationFrame(momRef.current)

    // Check if mouse is on a room (for room drag)
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const cx = (e.clientX - rect.left - pan.x) / zoom
      const cy = (e.clientY - rect.top - pan.y) / zoom
      const hitRoom = hitTestRoomsWithPositions(cx, cy, ORIGIN_X, ORIGIN_Y, roomPositions)
      if (hitRoom) {
        const room = ALL_ROOMS.find(r => r.id === hitRoom)
        if (room) {
          const pos = roomPositions[hitRoom] || hexPosition(room.row, room.col, ORIGIN_X, ORIGIN_Y)
          roomDragRef.current = {
            active: false, // becomes true after threshold
            roomId: hitRoom,
            offsetX: cx - pos.x,
            offsetY: cy - pos.y,
            startClientX: e.clientX,
            startClientY: e.clientY,
            totalMovement: 0,
          }
        }
      }
    }

    panRef.current = {
      dragging: true, sx: e.clientX - pan.x, sy: e.clientY - pan.y,
      lx: e.clientX, ly: e.clientY, vx: 0, vy: 0, didDrag: false,
    }
  }, [pan, zoom, ORIGIN_X, ORIGIN_Y, roomPositions])

  // ---- MOUSE MOVE: Pan canvas or drag room ----
  const onMove = useCallback((e) => {
    // Hover detection
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const cx = (e.clientX - rect.left - pan.x) / zoom
      const cy = (e.clientY - rect.top - pan.y) / zoom
      const hitRoom = hitTestRoomsWithPositions(cx, cy, ORIGIN_X, ORIGIN_Y, roomPositions)
      if (hitRoom !== hover) {
        setHover(hitRoom)
        setExtHover?.(hitRoom)
      }
    }

    if (!panRef.current.dragging) return

    // Check if we should start a room drag (past threshold)
    const rd = roomDragRef.current
    if (rd.roomId && !rd.active) {
      const dx = e.clientX - rd.startClientX
      const dy = e.clientY - rd.startClientY
      rd.totalMovement = Math.sqrt(dx * dx + dy * dy)
      if (rd.totalMovement >= DRAG_THRESHOLD) {
        rd.active = true
        panRef.current.didDrag = true // prevent click-select
      }
    }

    // If dragging a room, update its position
    if (rd.active && rd.roomId) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cx = (e.clientX - rect.left - pan.x) / zoom
        const cy = (e.clientY - rect.top - pan.y) / zoom
        const newX = cx - rd.offsetX
        const newY = cy - rd.offsetY
        setRoomPositions(prev => ({ ...prev, [rd.roomId]: { x: newX, y: newY } }))
      }
      return // don't pan while room dragging
    }

    // Regular canvas pan
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
  }, [pan, zoom, hover, setExtHover, ORIGIN_X, ORIGIN_Y, roomPositions])

  // ---- MOUSE UP: End pan or room drag ----
  const onUp = useCallback(() => {
    // If room was being dragged, save positions to localStorage
    const rd = roomDragRef.current
    if (rd.active && rd.roomId) {
      setRoomPositions(prev => {
        savePositions(prev)
        return prev
      })
      rd.active = false
      rd.roomId = null
    } else {
      rd.roomId = null
    }

    if (!panRef.current.dragging) return
    panRef.current.dragging = false

    // Momentum drift
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

  // ---- CLICK: Select room (if not dragged) ----
  const onClick = useCallback((e) => {
    if (panRef.current.didDrag) {
      panRef.current.didDrag = false
      return
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const cx = (e.clientX - rect.left - pan.x) / zoom
      const cy = (e.clientY - rect.top - pan.y) / zoom
      const hitRoom = hitTestRoomsWithPositions(cx, cy, ORIGIN_X, ORIGIN_Y, roomPositions)
      if (hitRoom) {
        onRoomClick?.(hitRoom)
      }
    }
  }, [pan, zoom, onRoomClick, ORIGIN_X, ORIGIN_Y, roomPositions])

  // ---- RIGHT-CLICK: Context menu on rooms ----
  const onContextMenu = useCallback((e) => {
    e.preventDefault()
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const cx = (e.clientX - rect.left - pan.x) / zoom
    const cy = (e.clientY - rect.top - pan.y) / zoom
    const hitRoom = hitTestRoomsWithPositions(cx, cy, ORIGIN_X, ORIGIN_Y, roomPositions)
    if (hitRoom) {
      const room = ALL_ROOMS.find(r => r.id === hitRoom)
      setContextMenu({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        roomId: hitRoom,
        roomName: room?.name || hitRoom,
      })
    } else {
      setContextMenu(null)
    }
  }, [pan, zoom, ORIGIN_X, ORIGIN_Y, roomPositions])

  // Close context menu on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setContextMenu(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Show toast notification
  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // Context menu actions
  const handleRegenerate = useCallback((roomId, roomName) => {
    console.log(`Regenerate: ${roomName}`)
    showToast(`Regenerating ${roomName}'s room...`)
    setContextMenu(null)
  }, [showToast])

  const handleResetPosition = useCallback((roomId) => {
    setRoomPositions(prev => {
      const next = { ...prev }
      delete next[roomId]
      savePositions(next)
      return next
    })
    showToast('Position reset')
    setContextMenu(null)
  }, [showToast])

  const handleViewAgent = useCallback((roomId) => {
    onRoomClick?.(roomId)
    setContextMenu(null)
  }, [onRoomClick])

  // ---- TOUCH EVENTS ----
  const onTouchStart = useCallback((e) => {
    setContextMenu(null)
    if (e.touches.length === 1) {
      const t = e.touches[0]
      if (momRef.current) cancelAnimationFrame(momRef.current)

      // Check for room hit (for touch drag)
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cx = (t.clientX - rect.left - pan.x) / zoom
        const cy = (t.clientY - rect.top - pan.y) / zoom
        const hitRoom = hitTestRoomsWithPositions(cx, cy, ORIGIN_X, ORIGIN_Y, roomPositions)
        if (hitRoom) {
          const room = ALL_ROOMS.find(r => r.id === hitRoom)
          if (room) {
            const pos = roomPositions[hitRoom] || hexPosition(room.row, room.col, ORIGIN_X, ORIGIN_Y)
            roomDragRef.current = {
              active: false,
              roomId: hitRoom,
              offsetX: cx - pos.x,
              offsetY: cy - pos.y,
              startClientX: t.clientX,
              startClientY: t.clientY,
              totalMovement: 0,
            }
          }
        }
      }

      panRef.current = {
        dragging: true, sx: t.clientX - pan.x, sy: t.clientY - pan.y,
        lx: t.clientX, ly: t.clientY, vx: 0, vy: 0, didDrag: false,
      }
    }
  }, [pan, zoom, ORIGIN_X, ORIGIN_Y, roomPositions])

  const onTouchMove = useCallback((e) => {
    if (!panRef.current.dragging || e.touches.length !== 1) return
    const t = e.touches[0]

    // Check room drag threshold
    const rd = roomDragRef.current
    if (rd.roomId && !rd.active) {
      const dx = t.clientX - rd.startClientX
      const dy = t.clientY - rd.startClientY
      rd.totalMovement = Math.sqrt(dx * dx + dy * dy)
      if (rd.totalMovement >= DRAG_THRESHOLD) {
        rd.active = true
        panRef.current.didDrag = true
      }
    }

    // Room drag
    if (rd.active && rd.roomId) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cx = (t.clientX - rect.left - pan.x) / zoom
        const cy = (t.clientY - rect.top - pan.y) / zoom
        const newX = cx - rd.offsetX
        const newY = cy - rd.offsetY
        setRoomPositions(prev => ({ ...prev, [rd.roomId]: { x: newX, y: newY } }))
      }
      panRef.current.lx = t.clientX
      panRef.current.ly = t.clientY
      return
    }

    // Canvas pan
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
  }, [pan, zoom])

  const onTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      // Save room drag
      const rd = roomDragRef.current
      if (rd.active && rd.roomId) {
        setRoomPositions(prev => {
          savePositions(prev)
          return prev
        })
        rd.active = false
        rd.roomId = null
      } else {
        rd.roomId = null
      }

      if (!panRef.current.didDrag) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const cx = (panRef.current.lx - rect.left - pan.x) / zoom
          const cy = (panRef.current.ly - rect.top - pan.y) / zoom
          const hitRoom = hitTestRoomsWithPositions(cx, cy, ORIGIN_X, ORIGIN_Y, roomPositions)
          if (hitRoom) {
            onRoomClick?.(hitRoom)
          }
        }
      }
      panRef.current.didDrag = false
      onUp()
    }
  }, [pan, zoom, onRoomClick, onUp, ORIGIN_X, ORIGIN_Y, roomPositions])

  const cursor = roomDragRef.current.active
    ? 'grabbing'
    : panRef.current.dragging
      ? 'grabbing'
      : (hover ? 'pointer' : 'grab')

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
      onMouseLeave={() => { onUp(); setHover(null); setExtHover?.(null); setContextMenu(null) }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onContextMenu={onContextMenu}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onClick={onClick}
      />

      {/* ---- CONTEXT MENU ---- */}
      {contextMenu && (
        <div
          style={{
            position: 'absolute',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 100,
            minWidth: 180,
            background: 'rgba(12, 16, 30, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(96, 165, 250, 0.25)',
            borderRadius: 10,
            padding: '6px 0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Menu header */}
          <div style={{
            padding: '6px 14px 8px',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(96, 165, 250, 0.7)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderBottom: '1px solid rgba(96, 165, 250, 0.12)',
            marginBottom: 4,
          }}>
            {contextMenu.roomName}
          </div>
          <ContextMenuItem
            label="Regenerate Room"
            icon="&#x21BB;"
            onClick={() => handleRegenerate(contextMenu.roomId, contextMenu.roomName)}
          />
          <ContextMenuItem
            label="Reset Position"
            icon="&#x2316;"
            onClick={() => handleResetPosition(contextMenu.roomId)}
          />
          <ContextMenuItem
            label="View Agent"
            icon="&#x2192;"
            onClick={() => handleViewAgent(contextMenu.roomId)}
          />
        </div>
      )}

      {/* ---- TOAST NOTIFICATION ---- */}
      {toast && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(12, 16, 30, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          borderRadius: 8,
          padding: '10px 20px',
          color: '#EDF2FA',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: "'Inter', system-ui, sans-serif",
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          animation: 'canvasOfficeToastIn 0.2s ease-out',
        }}>
          {toast}
        </div>
      )}

      {/* ---- LOADING OVERLAY ---- */}
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

// ---- CONTEXT MENU ITEM COMPONENT ----
function ContextMenuItem({ label, icon, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '8px 14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 13,
        fontWeight: 500,
        color: hovered ? '#fff' : '#C8D6E5',
        background: hovered ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
        transition: 'all 0.12s ease',
      }}
    >
      <span style={{
        fontSize: 15,
        opacity: 0.7,
        width: 18,
        textAlign: 'center',
      }}>
        {icon}
      </span>
      {label}
    </div>
  )
}

// Inject keyframes
if (typeof document !== 'undefined') {
  const id = 'canvas-office-styles'
  if (!document.getElementById(id)) {
    const s = document.createElement('style')
    s.id = id
    s.textContent = [
      '@keyframes canvasOfficeSpin { to { transform: rotate(360deg); } }',
      '@keyframes canvasOfficeToastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }',
    ].join('\n')
    document.head.appendChild(s)
  }
}
