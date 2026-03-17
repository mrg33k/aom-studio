import React, { useRef, useEffect, useState, useCallback } from 'react'

// CanvasOffice: MULTI-ROOM hex tessellation with wave crossfade transitions
//
// FILE OWNER: Bobby (Canvas team). Bobby2 (HUD team) does NOT touch this file.
//
// All 13 agent rooms from public/corner/ rendered as hex puzzle pieces.
// Wave effect: each room crossfades between working/idle at a staggered time offset.
// Drag-and-drop: rooms can be repositioned, positions saved to localStorage.
// Right-click context menu: Regenerate Room, Reset Position, View Agent.
//
// CAMERA: Two-view system (Overview + Focus). No free pan/scroll zoom.
//   View 1 (Overview): All 13 rooms visible, centered.
//   View 2 (Focus): Click room -> smooth 400ms zoom to fill ~60% viewport.
//   Escape or click empty space -> back to Overview.

// ---- ROOM CONFIG ----
const ROOM_SIZE = 512        // Base room size (px, scales with zoom)

// Wave timing
const CYCLE_TIME = 10        // Full working+idle cycle in seconds
const FADE_DURATION = 4.5    // Crossfade duration in seconds
const WAVE_OFFSET = 1.2      // Stagger between consecutive rooms in seconds

// Drag threshold (px) - less than this = click, more = drag
const DRAG_THRESHOLD = 5

// Camera transition duration (ms)
const CAMERA_TRANSITION_MS = 400

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

// ---- EASE-OUT CUBIC ----
// Smooth deceleration for camera transitions
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
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

  // Camera state: current pan/zoom values driven by animation
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1.0 })
  // Camera transition animation ref
  const cameraAnimRef = useRef(null) // { from, to, startTime, duration }
  // Focused room id (null = overview)
  const [focusedRoom, setFocusedRoom] = useState(null)

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
  // Track if a mousedown started a potential drag (to distinguish click vs drag)
  const mouseDownRef = useRef({ active: false, didDrag: false, startX: 0, startY: 0 })

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

  // Origin for hex layout
  const ORIGIN_X = ROOM_SIZE * 1.5
  const ORIGIN_Y = ROOM_SIZE * 0.1

  // Helper: get room position (custom or default hex)
  const getRoomPos = useCallback((room) => {
    if (roomPositions[room.id]) return roomPositions[room.id]
    return hexPosition(room.row, room.col, ORIGIN_X, ORIGIN_Y)
  }, [roomPositions, ORIGIN_X, ORIGIN_Y])

  // ---- COMPUTE GRID BOUNDING BOX ----
  const getGridBounds = useCallback(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    ALL_ROOMS.forEach((room) => {
      const pos = getRoomPos(room)
      minX = Math.min(minX, pos.x)
      maxX = Math.max(maxX, pos.x + ROOM_SIZE)
      minY = Math.min(minY, pos.y)
      maxY = Math.max(maxY, pos.y + ROOM_SIZE)
    })
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY }
  }, [getRoomPos])

  // ---- COMPUTE OVERVIEW CAMERA (all rooms centered, fit in viewport) ----
  const getOverviewCamera = useCallback((viewW, viewH) => {
    const bounds = getGridBounds()
    // Add some padding (10% on each side)
    const padX = bounds.w * 0.10
    const padY = bounds.h * 0.10
    const totalW = bounds.w + padX * 2
    const totalH = bounds.h + padY * 2
    // Zoom to fit: pick the smaller scale so everything fits
    const zoomFit = Math.min(viewW / totalW, viewH / totalH)
    // Center the grid
    const cx = (viewW - bounds.w * zoomFit) / 2 - bounds.minX * zoomFit
    const cy = (viewH - bounds.h * zoomFit) / 2 - bounds.minY * zoomFit
    return { x: cx, y: cy, zoom: zoomFit }
  }, [getGridBounds])

  // ---- COMPUTE FOCUS CAMERA (center on room, fill ~60% viewport) ----
  const getFocusCamera = useCallback((roomId, viewW, viewH) => {
    const room = ALL_ROOMS.find(r => r.id === roomId)
    if (!room) return getOverviewCamera(viewW, viewH)
    const pos = getRoomPos(room)
    // Room center in world space
    const roomCX = pos.x + ROOM_SIZE / 2
    const roomCY = pos.y + ROOM_SIZE / 2
    // We want the room to fill ~60% of the viewport
    // Room visible size is ~ROOM_SIZE * 0.90 (the hex clipped region)
    const visibleRoomSize = ROOM_SIZE * 0.90
    const targetScreenSize = Math.min(viewW, viewH) * 0.60
    const zoomFocus = targetScreenSize / visibleRoomSize
    // Pan so room center is at viewport center
    const panX = viewW / 2 - roomCX * zoomFocus
    const panY = viewH / 2 - roomCY * zoomFocus
    return { x: panX, y: panY, zoom: zoomFocus }
  }, [getRoomPos, getOverviewCamera])

  // ---- ANIMATE CAMERA TRANSITION ----
  const animateCamera = useCallback((targetCamera) => {
    const from = { ...cameraRef.current }
    const to = targetCamera
    const startTime = performance.now()
    cameraAnimRef.current = { from, to, startTime, duration: CAMERA_TRANSITION_MS }
  }, [])

  // ---- SET INITIAL CAMERA on mount ----
  useEffect(() => {
    if (size.w > 0 && size.h > 0) {
      const overview = getOverviewCamera(size.w, size.h)
      cameraRef.current = { x: overview.x, y: overview.y, zoom: overview.zoom }
      cameraAnimRef.current = null // no animation, just snap
    }
  }, [size.w, size.h, getOverviewCamera])

  // ---- RECALCULATE CAMERA when focused room changes or viewport resizes ----
  useEffect(() => {
    if (size.w <= 0 || size.h <= 0) return
    if (focusedRoom) {
      animateCamera(getFocusCamera(focusedRoom, size.w, size.h))
    } else {
      animateCamera(getOverviewCamera(size.w, size.h))
    }
  }, [focusedRoom, size.w, size.h, animateCamera, getFocusCamera, getOverviewCamera])

  // ---- DRAW ----
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Advance camera animation
    const anim = cameraAnimRef.current
    if (anim) {
      const elapsed = performance.now() - anim.startTime
      const t = Math.min(1, elapsed / anim.duration)
      const e = easeOutCubic(t)
      cameraRef.current = {
        x: anim.from.x + (anim.to.x - anim.from.x) * e,
        y: anim.from.y + (anim.to.y - anim.from.y) * e,
        zoom: anim.from.zoom + (anim.to.zoom - anim.from.zoom) * e,
      }
      if (t >= 1) cameraAnimRef.current = null
    }

    const cam = cameraRef.current
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    canvas.style.width = `${size.w}px`
    canvas.style.height = `${size.h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Clear to transparent so Crossy Road background shows through
    ctx.clearRect(0, 0, size.w, size.h)

    ctx.save()
    ctx.translate(cam.x, cam.y)
    ctx.scale(cam.zoom, cam.zoom)

    ctx.imageSmoothingEnabled = false

    const elapsed = (performance.now() - startTimeRef.current) / 1000

    // ---- RENDER ALL ROOMS ----
    // Draw dragged room last so it renders on top
    const dragId = roomDragRef.current.active ? roomDragRef.current.roomId : null
    ALL_ROOMS.forEach((room, idx) => {
      if (room.id === dragId) return // skip, draw last
      const pos = getRoomPos(room)
      const imgs = roomImages[room.id]
      const alpha = getWaveBlend(elapsed, idx)
      const isHL = room.id === hover || room.id === selectedRoom || room.id === focusedRoom
      drawRoom(ctx, pos.x, pos.y, imgs.working, imgs.idle, alpha, room.name, room.color, isHL, cam.zoom)
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
        drawRoom(ctx, pos.x, pos.y, imgs.working, imgs.idle, alpha, dragRoom.name, dragRoom.color, true, cam.zoom)
        ctx.restore()
      }
    }

    ctx.restore() // undo pan/zoom

  }, [size, hover, selectedRoom, focusedRoom, getRoomPos])

  // ---- HELPER: Draw one room with hex clip + BIGGER name badge BELOW hex ----
  function drawRoom(ctx, offsetX, offsetY, workImg, idleImg, alpha, nameText, nameColor, isHighlighted, currentZoom) {
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
      ctx.save()
      ctx.globalAlpha = 1 - alpha
      ctx.drawImage(workImg, 0, 0, S, S)
      ctx.restore()
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.drawImage(idleImg, 0, 0, S, S)
      ctx.restore()
    } else if (workImg?.complete) {
      ctx.drawImage(workImg, 0, 0, S, S)
    } else if (idleImg?.complete) {
      ctx.drawImage(idleImg, 0, 0, S, S)
    }

    // Highlight glow for hovered/selected/focused rooms
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

    ctx.restore() // undo hex clip so badge renders OUTSIDE/BELOW the hex

    // ---- NAME BADGE (below the hex, not clipped) ----
    ctx.save()
    ctx.translate(offsetX, offsetY)

    // Scale font inversely with zoom so badges stay readable at overview zoom
    // At zoom ~0.3 (overview), font renders at ~16/0.3 = 53px world-space -> 16px screen
    // At zoom ~1.0 (focus), font renders at 16px world-space -> 16px screen
    // We clamp so it doesn't get absurdly large or small
    const baseFontSize = 17
    const invZoomScale = Math.min(3.0, Math.max(1.0, 1.0 / (currentZoom || 1)))
    const fontSize = baseFontSize * invZoomScale
    const dotSize = 7 * invZoomScale
    const pillPadH = 10 * invZoomScale
    const pillPadV = 6 * invZoomScale
    const pillRadius = 6 * invZoomScale

    ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`
    const tw = ctx.measureText(nameText).width
    const badgeW = tw + dotSize + pillPadH * 3 + 4 * invZoomScale
    const badgeH = fontSize + pillPadV * 2

    // Position: centered below the hex bottom point (S * 0.50, S * 0.95)
    const badgeX = S * 0.50 - badgeW / 2
    const badgeY = S * 0.97 + 2 * invZoomScale

    // Dark pill background
    ctx.fillStyle = 'rgba(8, 12, 24, 0.92)'
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, pillRadius)
    ctx.fill()

    // Subtle border
    ctx.strokeStyle = `${nameColor}40`
    ctx.lineWidth = 1.2 * invZoomScale
    ctx.beginPath()
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, pillRadius)
    ctx.stroke()

    // Status dot
    const dotCX = badgeX + pillPadH + dotSize / 2
    const dotCY = badgeY + badgeH / 2
    ctx.beginPath()
    ctx.arc(dotCX, dotCY, dotSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = nameColor
    ctx.fill()

    // Name text
    ctx.fillStyle = '#EDF2FA'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(nameText, dotCX + dotSize / 2 + 4 * invZoomScale, dotCY)
    ctx.restore()
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

  // Block mousewheel zoom (killed)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e) => { e.preventDefault() }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ---- MOUSE DOWN: Start potential room drag ----
  const onDown = useCallback((e) => {
    setContextMenu(null)

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const cam = cameraRef.current
    const cx = (e.clientX - rect.left - cam.x) / cam.zoom
    const cy = (e.clientY - rect.top - cam.y) / cam.zoom
    const hitRoom = hitTestRoomsWithPositions(cx, cy, ORIGIN_X, ORIGIN_Y, roomPositions)

    mouseDownRef.current = {
      active: true,
      didDrag: false,
      startX: e.clientX,
      startY: e.clientY,
    }

    if (hitRoom) {
      const room = ALL_ROOMS.find(r => r.id === hitRoom)
      if (room) {
        const pos = roomPositions[hitRoom] || hexPosition(room.row, room.col, ORIGIN_X, ORIGIN_Y)
        roomDragRef.current = {
          active: false,
          roomId: hitRoom,
          offsetX: cx - pos.x,
          offsetY: cy - pos.y,
          startClientX: e.clientX,
          startClientY: e.clientY,
          totalMovement: 0,
        }
      }
    }
  }, [ORIGIN_X, ORIGIN_Y, roomPositions])

  // ---- MOUSE MOVE: Hover + room drag only (no viewport pan) ----
  const onMove = useCallback((e) => {
    // Hover detection
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const cam = cameraRef.current
      const cx = (e.clientX - rect.left - cam.x) / cam.zoom
      const cy = (e.clientY - rect.top - cam.y) / cam.zoom
      const hitRoom = hitTestRoomsWithPositions(cx, cy, ORIGIN_X, ORIGIN_Y, roomPositions)
      if (hitRoom !== hover) {
        setHover(hitRoom)
        setExtHover?.(hitRoom)
      }
    }

    if (!mouseDownRef.current.active) return

    // Check if we should start a room drag (past threshold)
    const rd = roomDragRef.current
    if (rd.roomId && !rd.active) {
      const dx = e.clientX - rd.startClientX
      const dy = e.clientY - rd.startClientY
      rd.totalMovement = Math.sqrt(dx * dx + dy * dy)
      if (rd.totalMovement >= DRAG_THRESHOLD) {
        rd.active = true
        mouseDownRef.current.didDrag = true
      }
    }

    // If dragging a room, update its position
    if (rd.active && rd.roomId) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cam = cameraRef.current
        const cx = (e.clientX - rect.left - cam.x) / cam.zoom
        const cy = (e.clientY - rect.top - cam.y) / cam.zoom
        const newX = cx - rd.offsetX
        const newY = cy - rd.offsetY
        setRoomPositions(prev => ({ ...prev, [rd.roomId]: { x: newX, y: newY } }))
      }
    }
  }, [hover, setExtHover, ORIGIN_X, ORIGIN_Y, roomPositions])

  // ---- MOUSE UP: End room drag ----
  const onUp = useCallback(() => {
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
    mouseDownRef.current.active = false
  }, [])

  // ---- CLICK: Focus/unfocus room ----
  const onClick = useCallback((e) => {
    if (mouseDownRef.current.didDrag) {
      mouseDownRef.current.didDrag = false
      return
    }
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const cam = cameraRef.current
    const cx = (e.clientX - rect.left - cam.x) / cam.zoom
    const cy = (e.clientY - rect.top - cam.y) / cam.zoom
    const hitRoom = hitTestRoomsWithPositions(cx, cy, ORIGIN_X, ORIGIN_Y, roomPositions)

    if (hitRoom) {
      // Focus on the clicked room (or switch to a different room)
      setFocusedRoom(hitRoom)
      onRoomClick?.(hitRoom)
    } else {
      // Clicked empty space: back to overview
      setFocusedRoom(null)
    }
  }, [onRoomClick, ORIGIN_X, ORIGIN_Y, roomPositions])

  // ---- ESCAPE: back to overview ----
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setFocusedRoom(null)
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ---- RIGHT-CLICK: Context menu on rooms ----
  const onContextMenu = useCallback((e) => {
    e.preventDefault()
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const cam = cameraRef.current
    const cx = (e.clientX - rect.left - cam.x) / cam.zoom
    const cy = (e.clientY - rect.top - cam.y) / cam.zoom
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
  }, [ORIGIN_X, ORIGIN_Y, roomPositions])

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
    setFocusedRoom(roomId)
    onRoomClick?.(roomId)
    setContextMenu(null)
  }, [onRoomClick])

  // ---- TOUCH EVENTS ----
  const onTouchStart = useCallback((e) => {
    setContextMenu(null)
    if (e.touches.length === 1) {
      const t = e.touches[0]

      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cam = cameraRef.current
        const cx = (t.clientX - rect.left - cam.x) / cam.zoom
        const cy = (t.clientY - rect.top - cam.y) / cam.zoom
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

      mouseDownRef.current = {
        active: true,
        didDrag: false,
        startX: t.clientX,
        startY: t.clientY,
      }
    }
  }, [ORIGIN_X, ORIGIN_Y, roomPositions])

  const onTouchMove = useCallback((e) => {
    if (!mouseDownRef.current.active || e.touches.length !== 1) return
    const t = e.touches[0]

    const rd = roomDragRef.current
    if (rd.roomId && !rd.active) {
      const dx = t.clientX - rd.startClientX
      const dy = t.clientY - rd.startClientY
      rd.totalMovement = Math.sqrt(dx * dx + dy * dy)
      if (rd.totalMovement >= DRAG_THRESHOLD) {
        rd.active = true
        mouseDownRef.current.didDrag = true
      }
    }

    if (rd.active && rd.roomId) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cam = cameraRef.current
        const cx = (t.clientX - rect.left - cam.x) / cam.zoom
        const cy = (t.clientY - rect.top - cam.y) / cam.zoom
        const newX = cx - rd.offsetX
        const newY = cy - rd.offsetY
        setRoomPositions(prev => ({ ...prev, [rd.roomId]: { x: newX, y: newY } }))
      }
    }
  }, [])

  const onTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
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

      if (!mouseDownRef.current.didDrag) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const cam = cameraRef.current
          const lx = mouseDownRef.current.startX
          const ly = mouseDownRef.current.startY
          const cx = (lx - rect.left - cam.x) / cam.zoom
          const cy = (ly - rect.top - cam.y) / cam.zoom
          const hitRoom = hitTestRoomsWithPositions(cx, cy, ORIGIN_X, ORIGIN_Y, roomPositions)
          if (hitRoom) {
            setFocusedRoom(hitRoom)
            onRoomClick?.(hitRoom)
          } else {
            setFocusedRoom(null)
          }
        }
      }
      mouseDownRef.current = { active: false, didDrag: false, startX: 0, startY: 0 }
    }
  }, [onRoomClick, ORIGIN_X, ORIGIN_Y, roomPositions])

  const cursor = roomDragRef.current.active
    ? 'grabbing'
    : (hover ? 'pointer' : 'default')

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
