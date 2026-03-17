import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react'

// CanvasOffice: MULTI-ROOM hex tessellation with wave crossfade transitions
//
// FILE OWNER: Bobby (Canvas team). Bobby2 (HUD team) does NOT touch this file.
//
// MEGA BUILD features:
// 1. HEX GRID SHUFFLE: Rooms live in indexed hex SLOTS. Drag = pick up, hover = shuffle (iOS style).
//    Drop snaps to nearest slot, others animate 200ms. Saves slot ORDER (not x/y) to localStorage.
// 2. CELEBRATION WAVE BOUNCE: Domino wave jump, 150ms stagger, glow pulse.
//    Auto-triggers every 15s for testing. Exposes triggerCelebration(roomId).
// 3. DIM INACTIVE ROOMS: Rooms with inactive agentStatus get globalAlpha 0.4, locked idle, no crossfade.
// 4. VIEW 2 (FOCUS) = NEIGHBORS VISIBLE: Zoomed room is big + centered but neighbors are around it.
// 5. CHARACTER LAYERS: character-layer.png composited on top of room shells (verified working).
//
// CAMERA: Two-view system (Overview + Focus). No free pan/scroll zoom.
//   View 1 (Overview): All 13 rooms visible, centered.
//   View 2 (Focus): Click room -> smooth 400ms zoom, room ~40% viewport so neighbors visible.
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

// Shuffle animation duration (ms)
const SHUFFLE_ANIM_MS = 200

// localStorage key for slot order
const SLOT_ORDER_KEY = 'corner-slot-order'

// ---- ALL 13 AGENT ROOMS (default order) ----
const DEFAULT_ROOM_IDS = [
  'elon', 'bobby', 'steffen', 'steve', 'cleo', 'alex',
  'mom', 'tony', 'colton', 'jacob', 'paige', 'elmo', 'pixel',
]

const ROOM_META = {
  elon:    { name: 'ELON',    color: '#4CAF50' },
  bobby:   { name: 'BOBBY',   color: '#E91E90' },
  steffen: { name: 'STEFFEN', color: '#FFD700' },
  steve:   { name: 'STEVE',   color: '#60A5FA' },
  cleo:    { name: 'CLEO',    color: '#C084FC' },
  alex:    { name: 'ALEX',    color: '#F97316' },
  mom:     { name: 'MOM',     color: '#EC4899' },
  tony:    { name: 'TONY',    color: '#22D3EE' },
  colton:  { name: 'COLTON',  color: '#8B5CF6' },
  jacob:   { name: 'JACOB',   color: '#A3E635' },
  paige:   { name: 'PAIGE',   color: '#FB923C' },
  elmo:    { name: 'ELMO',    color: '#F43F5E' },
  pixel:   { name: 'PIXEL',   color: '#06B6D4' },
}

// ---- HEX SLOT POSITIONS (diamond layout, indexed 0..12) ----
// Organic diamond growth: 1 room centered, 2 side by side, up to 13 = full diamond.
// These are the slot coordinates in hex-grid space (row, col).
// Slot 0 is top-center, slots grow outward to form a diamond.
const HEX_SLOTS = [
  // Row 0: 1 room (top center)
  { row: 0, col: 0 },
  // Row 1: 2 rooms
  { row: 1, col: -1 },
  { row: 1, col: 1 },
  // Row 2: 3 rooms (widest)
  { row: 2, col: -2 },
  { row: 2, col: 0 },
  { row: 2, col: 2 },
  // Row 3: 3 rooms
  { row: 3, col: -2 },
  { row: 3, col: 0 },
  { row: 3, col: 2 },
  // Row 4: 2 rooms
  { row: 4, col: -1 },
  { row: 4, col: 1 },
  // Row 5: 2 rooms (bottom)
  { row: 5, col: -2 },
  { row: 5, col: 0 },
]

// ---- IMAGE SOURCES ----
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
  return {
    working: `/corner/${id}-room.png`,
    idle: `/corner/${id}-room.png`,
  }
}

// ---- CHARACTER LAYER SOURCES ----
const ROOMS_WITH_CHARACTERS = [
  'elon', 'bobby', 'steffen', 'steve', 'cleo', 'alex', 'mom', 'jacob', 'tony', 'colton', 'elmo', 'paige',
]

// Preload ALL room images at module load
const roomImages = {}
DEFAULT_ROOM_IDS.forEach((id) => {
  const sources = getRoomImageSources(id)
  const workImg = new Image()
  workImg.crossOrigin = 'anonymous'
  workImg.src = sources.working
  const idleImg = new Image()
  idleImg.crossOrigin = 'anonymous'
  idleImg.src = sources.idle
  let charImg = null
  if (ROOMS_WITH_CHARACTERS.includes(id)) {
    charImg = new Image()
    charImg.crossOrigin = 'anonymous'
    charImg.src = `/corner/${id}-room/character-layer.png`
  }
  roomImages[id] = { working: workImg, idle: idleImg, character: charImg }
})

// ---- SMOOTHSTEP ----
function smoothstep(t) {
  t = Math.max(0, Math.min(1, t))
  return t * t * (3 - 2 * t)
}

// ---- WAVE BLEND ----
function getWaveBlend(elapsed, roomIndex) {
  const offset = roomIndex * WAVE_OFFSET
  const cyclePos = ((elapsed + offset) % CYCLE_TIME)
  const halfCycle = CYCLE_TIME / 2

  if (cyclePos < halfCycle) {
    const fadeProgress = cyclePos / FADE_DURATION
    if (fadeProgress < 1) return smoothstep(fadeProgress)
    return 1
  } else {
    const fadeProgress = (cyclePos - halfCycle) / FADE_DURATION
    if (fadeProgress < 1) return 1 - smoothstep(fadeProgress)
    return 0
  }
}

// ---- HEX LAYOUT ----
const VIS_W = ROOM_SIZE * 0.90
const VIS_H = ROOM_SIZE * 0.90

function hexPosition(row, col, originX, originY) {
  const x = originX + col * (VIS_W * 0.50)
  const y = originY + row * (VIS_H * 0.35)
  return { x, y }
}

// Get world-space position for a slot index
function slotWorldPos(slotIndex, originX, originY) {
  const slot = HEX_SLOTS[slotIndex]
  if (!slot) return { x: originX, y: originY }
  return hexPosition(slot.row, slot.col, originX, originY)
}

// ---- DIAMOND HIT TEST ----
function isInsideDiamond(px, py, cx, cy, hw, hh) {
  return Math.abs(px - cx) / hw + Math.abs(py - cy) / hh <= 1
}

const DIAMOND_HW = ROOM_SIZE / 2
const DIAMOND_HH = ROOM_SIZE / 4

// Hit test using slot positions (returns roomId or null)
function hitTestSlots(cx, cy, originX, originY, slotOrder) {
  for (let i = slotOrder.length - 1; i >= 0; i--) {
    const roomId = slotOrder[i]
    const pos = slotWorldPos(i, originX, originY)
    const roomCX = pos.x + ROOM_SIZE / 2
    const roomCY = pos.y + ROOM_SIZE / 2
    if (isInsideDiamond(cx, cy, roomCX, roomCY, DIAMOND_HW, DIAMOND_HH)) {
      return roomId
    }
  }
  return null
}

// Find nearest slot to a world-space point
function findNearestSlot(wx, wy, originX, originY, totalSlots) {
  let bestIdx = 0
  let bestDist = Infinity
  for (let i = 0; i < totalSlots; i++) {
    const pos = slotWorldPos(i, originX, originY)
    const scx = pos.x + ROOM_SIZE / 2
    const scy = pos.y + ROOM_SIZE / 2
    const d = Math.sqrt((wx - scx) ** 2 + (wy - scy) ** 2)
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  }
  return bestIdx
}

// ---- LOAD/SAVE SLOT ORDER FROM LOCALSTORAGE ----
function loadSlotOrder() {
  try {
    const raw = localStorage.getItem(SLOT_ORDER_KEY)
    if (raw) {
      const order = JSON.parse(raw)
      if (Array.isArray(order) && order.length === DEFAULT_ROOM_IDS.length) {
        const valid = DEFAULT_ROOM_IDS.every(id => order.includes(id))
        if (valid) return order
      }
    }
  } catch (e) {
    // Ignore corrupt data
  }
  return [...DEFAULT_ROOM_IDS]
}

function saveSlotOrder(order) {
  try {
    localStorage.setItem(SLOT_ORDER_KEY, JSON.stringify(order))
  } catch (e) {
    // localStorage full or unavailable
  }
}

// ---- EASE-OUT CUBIC ----
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

// ---- EASE-OUT BOUNCE ----
function easeOutBounce(t) {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t
  } else if (t < 2 / 2.75) {
    t -= 1.5 / 2.75
    return 7.5625 * t * t + 0.75
  } else if (t < 2.5 / 2.75) {
    t -= 2.25 / 2.75
    return 7.5625 * t * t + 0.9375
  } else {
    t -= 2.625 / 2.75
    return 7.5625 * t * t + 0.984375
  }
}

// ---- CELEBRATION BOUNCE ----
const CELEBRATION_JUMP_PX = 18
const CELEBRATION_UP_MS = 300
const CELEBRATION_DOWN_MS = 200
const CELEBRATION_TOTAL_MS = CELEBRATION_UP_MS + CELEBRATION_DOWN_MS
const CELEBRATION_ROOM_DELAY_MS = 150

function getCelebrationOffset(elapsed, roomDelay) {
  const localT = elapsed - roomDelay
  if (localT < 0 || localT > CELEBRATION_TOTAL_MS) return 0
  if (localT <= CELEBRATION_UP_MS) {
    const t = localT / CELEBRATION_UP_MS
    return -CELEBRATION_JUMP_PX * easeOutCubic(t)
  } else {
    const t = (localT - CELEBRATION_UP_MS) / CELEBRATION_DOWN_MS
    return -CELEBRATION_JUMP_PX * (1 - easeOutBounce(t))
  }
}

// ---- CELEBRATION GLOW ----
function getCelebrationGlow(elapsed, roomDelay) {
  const localT = elapsed - roomDelay
  if (localT < 0 || localT > CELEBRATION_TOTAL_MS) return 0
  if (localT <= CELEBRATION_UP_MS) {
    return easeOutCubic(localT / CELEBRATION_UP_MS) * 0.6
  } else {
    const t = (localT - CELEBRATION_UP_MS) / CELEBRATION_DOWN_MS
    return 0.6 * (1 - t)
  }
}

// ---- HEX DISTANCE (using slot positions) ----
function slotDistance(slotA, slotB) {
  const a = HEX_SLOTS[slotA]
  const b = HEX_SLOTS[slotB]
  if (!a || !b) return 0
  const dr = Math.abs(a.row - b.row)
  const dc = Math.abs(a.col - b.col)
  return Math.max(dr, dc)
}

// ---- COMPONENT ----
const CanvasOffice = forwardRef(function CanvasOffice({
  agentStatus = {},
  onRoomClick,
  selectedRoom,
  hoveredRoom: extHover,
  setHoveredRoom: setExtHover,
  isNightMode = true,
}, ref) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1.0 })
  const cameraAnimRef = useRef(null)
  const [focusedRoom, setFocusedRoom] = useState(null)

  // ---- HEX GRID SHUFFLE STATE ----
  // slotOrder: array of roomIds indexed by slot position
  const [slotOrder, setSlotOrder] = useState(loadSlotOrder)

  // Shuffle animation: tracks rooms transitioning between slots
  // Map<roomId, { fromX, fromY, toX, toY, startTime }>
  const shuffleAnimRef = useRef({})

  // Drag state for grid shuffle
  const dragStateRef = useRef({
    active: false,
    roomId: null,
    fromSlot: -1,
    currentSlot: -1,
    worldX: 0,
    worldY: 0,
    offsetX: 0,
    offsetY: 0,
    startClientX: 0,
    startClientY: 0,
    totalMovement: 0,
  })
  const mouseDownRef = useRef({ active: false, didDrag: false, startX: 0, startY: 0 })

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null)

  // Toast notification state
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  // ---- CELEBRATION WAVE STATE ----
  const celebrationRef = useRef({ active: false, sourceRoomId: null, startTime: 0 })

  const triggerCelebration = useCallback((roomId) => {
    if (!DEFAULT_ROOM_IDS.includes(roomId)) return
    celebrationRef.current = {
      active: true,
      sourceRoomId: roomId,
      startTime: performance.now(),
    }
  }, [])

  useImperativeHandle(ref, () => ({
    triggerCelebration,
  }), [triggerCelebration])

  // ---- AUTO-TEST: trigger celebration wave every 15 seconds ----
  useEffect(() => {
    let roomIdx = 0
    const timer = setInterval(() => {
      const id = DEFAULT_ROOM_IDS[roomIdx % DEFAULT_ROOM_IDS.length]
      triggerCelebration(id)
      roomIdx++
    }, 15000)
    const initial = setTimeout(() => {
      triggerCelebration(DEFAULT_ROOM_IDS[0])
      roomIdx = 1
    }, 3000)
    return () => { clearInterval(timer); clearTimeout(initial) }
  }, [triggerCelebration])

  // Animation time reference
  const startTimeRef = useRef(performance.now())

  // Track image loading
  useEffect(() => {
    let loadCount = 0
    const totalImages = DEFAULT_ROOM_IDS.length * 2
    const checkDone = () => {
      loadCount++
      if (loadCount >= totalImages) setLoaded(true)
    }
    DEFAULT_ROOM_IDS.forEach((id) => {
      const imgs = roomImages[id]
      if (imgs.working.complete) checkDone()
      else imgs.working.onload = checkDone
      if (imgs.idle.complete) checkDone()
      else imgs.idle.onload = checkDone
    })
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

  // ---- COMPUTE GRID BOUNDING BOX ----
  const getGridBounds = useCallback(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (let i = 0; i < slotOrder.length; i++) {
      const pos = slotWorldPos(i, ORIGIN_X, ORIGIN_Y)
      minX = Math.min(minX, pos.x)
      maxX = Math.max(maxX, pos.x + ROOM_SIZE)
      minY = Math.min(minY, pos.y)
      maxY = Math.max(maxY, pos.y + ROOM_SIZE)
    }
    return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY }
  }, [ORIGIN_X, ORIGIN_Y, slotOrder.length])

  // ---- OVERVIEW CAMERA ----
  const getOverviewCamera = useCallback((viewW, viewH) => {
    const bounds = getGridBounds()
    const padX = bounds.w * 0.10
    const padY = bounds.h * 0.10
    const totalW = bounds.w + padX * 2
    const totalH = bounds.h + padY * 2
    const zoomFit = Math.min(viewW / totalW, viewH / totalH)
    const cx = (viewW - bounds.w * zoomFit) / 2 - bounds.minX * zoomFit
    const cy = (viewH - bounds.h * zoomFit) / 2 - bounds.minY * zoomFit
    return { x: cx, y: cy, zoom: zoomFit }
  }, [getGridBounds])

  // ---- FOCUS CAMERA (neighbors visible) ----
  // Zoom so focused room fills ~40% viewport (not 60%) so neighbors are visible around it
  const getFocusCamera = useCallback((roomId, viewW, viewH) => {
    const slotIdx = slotOrder.indexOf(roomId)
    if (slotIdx < 0) return getOverviewCamera(viewW, viewH)
    const pos = slotWorldPos(slotIdx, ORIGIN_X, ORIGIN_Y)
    const roomCX = pos.x + ROOM_SIZE / 2
    const roomCY = pos.y + ROOM_SIZE / 2
    // 40% of viewport = focused room. Neighbors at the edges.
    const visibleRoomSize = ROOM_SIZE * 0.90
    const targetScreenSize = Math.min(viewW, viewH) * 0.40
    const zoomFocus = targetScreenSize / visibleRoomSize
    const panX = viewW / 2 - roomCX * zoomFocus
    const panY = viewH / 2 - roomCY * zoomFocus
    return { x: panX, y: panY, zoom: zoomFocus }
  }, [slotOrder, ORIGIN_X, ORIGIN_Y, getOverviewCamera])

  // ---- ANIMATE CAMERA TRANSITION ----
  const animateCamera = useCallback((targetCamera) => {
    const from = { ...cameraRef.current }
    cameraAnimRef.current = { from, to: targetCamera, startTime: performance.now(), duration: CAMERA_TRANSITION_MS }
  }, [])

  // ---- SET INITIAL CAMERA on mount ----
  useEffect(() => {
    if (size.w > 0 && size.h > 0) {
      const overview = getOverviewCamera(size.w, size.h)
      cameraRef.current = { x: overview.x, y: overview.y, zoom: overview.zoom }
      cameraAnimRef.current = null
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

    ctx.clearRect(0, 0, size.w, size.h)

    ctx.save()
    ctx.translate(cam.x, cam.y)
    ctx.scale(cam.zoom, cam.zoom)

    ctx.imageSmoothingEnabled = false

    const elapsed = (performance.now() - startTimeRef.current) / 1000
    const now = performance.now()

    // ---- CELEBRATION WAVE: compute per-room offsets ----
    const celeb = celebrationRef.current
    let celebElapsed = 0
    let sourceSlotIdx = -1
    if (celeb.active) {
      celebElapsed = now - celeb.startTime
      sourceSlotIdx = slotOrder.indexOf(celeb.sourceRoomId)
      // Auto-deactivate after all rooms finished bouncing
      let maxDist = 0
      for (let i = 0; i < slotOrder.length; i++) {
        if (sourceSlotIdx >= 0) {
          maxDist = Math.max(maxDist, slotDistance(sourceSlotIdx, i))
        }
      }
      const maxTotalTime = maxDist * CELEBRATION_ROOM_DELAY_MS + CELEBRATION_TOTAL_MS
      if (celebElapsed > maxTotalTime) {
        celebrationRef.current.active = false
      }
    }

    // ---- RENDER ALL ROOMS BY SLOT ----
    const drag = dragStateRef.current
    const draggedRoomId = drag.active ? drag.roomId : null

    for (let slotIdx = 0; slotIdx < slotOrder.length; slotIdx++) {
      const roomId = slotOrder[slotIdx]
      if (roomId === draggedRoomId) continue // draw dragged room last

      const meta = ROOM_META[roomId]
      if (!meta) continue
      const imgs = roomImages[roomId]
      if (!imgs) continue

      // Get position: check shuffle animation first, then static slot position
      let posX, posY
      const shuffleAnim = shuffleAnimRef.current[roomId]
      if (shuffleAnim && now < shuffleAnim.startTime + SHUFFLE_ANIM_MS) {
        const t = (now - shuffleAnim.startTime) / SHUFFLE_ANIM_MS
        const e = easeOutCubic(t)
        posX = shuffleAnim.fromX + (shuffleAnim.toX - shuffleAnim.fromX) * e
        posY = shuffleAnim.fromY + (shuffleAnim.toY - shuffleAnim.fromY) * e
      } else {
        if (shuffleAnim) delete shuffleAnimRef.current[roomId]
        const slotPos = slotWorldPos(slotIdx, ORIGIN_X, ORIGIN_Y)
        posX = slotPos.x
        posY = slotPos.y
      }

      // ---- DIM INACTIVE ROOMS (#3) ----
      const roomStatus = agentStatus?.[roomId]?.status || 'IDLE'
      const isActive = roomStatus === 'WORKING'

      // Wave blend: active rooms crossfade, inactive rooms locked on idle
      const alpha = isActive ? getWaveBlend(elapsed, slotIdx) : 1.0 // 1.0 = fully idle

      const isHL = roomId === hover || roomId === selectedRoom || roomId === focusedRoom

      // Celebration wave offset
      let celebOffsetY = 0
      let celebGlow = 0
      if (celeb.active && sourceSlotIdx >= 0) {
        const dist = slotDistance(sourceSlotIdx, slotIdx)
        const roomDelay = dist * CELEBRATION_ROOM_DELAY_MS
        celebOffsetY = getCelebrationOffset(celebElapsed, roomDelay)
        celebGlow = getCelebrationGlow(celebElapsed, roomDelay)
      }

      // Apply dim for inactive rooms
      ctx.save()
      if (!isActive) {
        ctx.globalAlpha = 0.4
      }
      drawRoom(ctx, posX, posY + celebOffsetY, imgs.working, imgs.idle, imgs.character, alpha, meta.name, meta.color, isHL, cam.zoom, celebGlow)
      ctx.restore()
    }

    // ---- DRAW DRAGGED ROOM ON TOP ----
    if (draggedRoomId) {
      const meta = ROOM_META[draggedRoomId]
      const imgs = roomImages[draggedRoomId]
      if (meta && imgs) {
        const posX = drag.worldX - drag.offsetX
        const posY = drag.worldY - drag.offsetY

        // Dragged room is always full brightness
        ctx.save()
        ctx.globalAlpha = 0.9

        // Celebration offset for dragged room too
        let celebOffsetY = 0
        let celebGlow = 0
        if (celeb.active && sourceSlotIdx >= 0) {
          const dragSlotIdx = slotOrder.indexOf(draggedRoomId)
          if (dragSlotIdx >= 0) {
            const dist = slotDistance(sourceSlotIdx, dragSlotIdx)
            const roomDelay = dist * CELEBRATION_ROOM_DELAY_MS
            celebOffsetY = getCelebrationOffset(celebElapsed, roomDelay)
            celebGlow = getCelebrationGlow(celebElapsed, roomDelay)
          }
        }

        const dragSlotIdx = slotOrder.indexOf(draggedRoomId)
        const roomStatus = agentStatus?.[draggedRoomId]?.status || 'IDLE'
        const isActive = roomStatus === 'WORKING'
        const alpha = isActive ? getWaveBlend(elapsed, dragSlotIdx >= 0 ? dragSlotIdx : 0) : 1.0

        drawRoom(ctx, posX, posY + celebOffsetY, imgs.working, imgs.idle, imgs.character, alpha, meta.name, meta.color, true, cam.zoom, celebGlow)
        ctx.restore()

        // ---- DRAW DROP INDICATOR (ghost outline at target slot) ----
        if (drag.currentSlot >= 0 && drag.currentSlot !== drag.fromSlot) {
          const targetPos = slotWorldPos(drag.currentSlot, ORIGIN_X, ORIGIN_Y)
          ctx.save()
          ctx.globalAlpha = 0.3
          ctx.strokeStyle = meta.color
          ctx.lineWidth = 3
          ctx.setLineDash([8, 6])
          const S = ROOM_SIZE
          ctx.beginPath()
          ctx.moveTo(targetPos.x + S * 0.50, targetPos.y + S * 0.05)
          ctx.lineTo(targetPos.x + S * 0.95, targetPos.y + S * 0.28)
          ctx.lineTo(targetPos.x + S * 0.95, targetPos.y + S * 0.75)
          ctx.lineTo(targetPos.x + S * 0.50, targetPos.y + S * 0.95)
          ctx.lineTo(targetPos.x + S * 0.05, targetPos.y + S * 0.75)
          ctx.lineTo(targetPos.x + S * 0.05, targetPos.y + S * 0.28)
          ctx.closePath()
          ctx.stroke()
          ctx.setLineDash([])
          ctx.restore()
        }
      }
    }

    ctx.restore() // undo pan/zoom

  }, [size, hover, selectedRoom, focusedRoom, slotOrder, agentStatus, ORIGIN_X, ORIGIN_Y])

  // ---- HELPER: Draw one room ----
  function drawRoom(ctx, offsetX, offsetY, workImg, idleImg, charImg, alpha, nameText, nameColor, isHighlighted, currentZoom, celebGlow = 0) {
    // Capture the current globalAlpha BEFORE saving (so dim + crossfade compound correctly)
    const parentAlpha = ctx.globalAlpha

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
      ctx.globalAlpha = (1 - alpha) * parentAlpha
      ctx.drawImage(workImg, 0, 0, S, S)
      ctx.restore()
      ctx.save()
      ctx.globalAlpha = alpha * parentAlpha
      ctx.drawImage(idleImg, 0, 0, S, S)
      ctx.restore()
    } else if (workImg?.complete) {
      ctx.drawImage(workImg, 0, 0, S, S)
    } else if (idleImg?.complete) {
      ctx.drawImage(idleImg, 0, 0, S, S)
    }

    // ---- CHARACTER LAYER (#5: drawn on top of room shell, inside hex clip) ----
    if (charImg?.complete) {
      ctx.drawImage(charImg, 0, 0, S, S)
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

    // ---- CELEBRATION GLOW PULSE ----
    if (celebGlow > 0.01) {
      const hexAlpha = Math.round(celebGlow * 80).toString(16).padStart(2, '0')
      ctx.fillStyle = `${nameColor}${hexAlpha}`
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

  // ---- SHUFFLE LOGIC: Insert dragged room at target slot, animate others ----
  const shuffleToSlot = useCallback((draggedRoomId, targetSlot) => {
    setSlotOrder(prev => {
      const currentSlot = prev.indexOf(draggedRoomId)
      if (currentSlot === targetSlot || currentSlot < 0) return prev

      const now = performance.now()
      const newOrder = [...prev]

      // Remove from current position
      newOrder.splice(currentSlot, 1)
      // Insert at target
      newOrder.splice(targetSlot, 0, draggedRoomId)

      // For every room that changed slot, start a shuffle animation
      for (let i = 0; i < newOrder.length; i++) {
        const id = newOrder[i]
        if (id === draggedRoomId) continue
        const oldSlot = prev.indexOf(id)
        if (oldSlot !== i) {
          const fromPos = slotWorldPos(oldSlot, ORIGIN_X, ORIGIN_Y)
          const toPos = slotWorldPos(i, ORIGIN_X, ORIGIN_Y)
          shuffleAnimRef.current[id] = {
            fromX: fromPos.x,
            fromY: fromPos.y,
            toX: toPos.x,
            toY: toPos.y,
            startTime: now,
          }
        }
      }

      return newOrder
    })
  }, [ORIGIN_X, ORIGIN_Y])

  // ---- MOUSE DOWN ----
  const onDown = useCallback((e) => {
    setContextMenu(null)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const cam = cameraRef.current
    const cx = (e.clientX - rect.left - cam.x) / cam.zoom
    const cy = (e.clientY - rect.top - cam.y) / cam.zoom
    const hitRoom = hitTestSlots(cx, cy, ORIGIN_X, ORIGIN_Y, slotOrder)

    mouseDownRef.current = {
      active: true,
      didDrag: false,
      startX: e.clientX,
      startY: e.clientY,
    }

    if (hitRoom) {
      const slotIdx = slotOrder.indexOf(hitRoom)
      const pos = slotWorldPos(slotIdx, ORIGIN_X, ORIGIN_Y)
      dragStateRef.current = {
        active: false,
        roomId: hitRoom,
        fromSlot: slotIdx,
        currentSlot: slotIdx,
        worldX: cx,
        worldY: cy,
        offsetX: cx - pos.x,
        offsetY: cy - pos.y,
        startClientX: e.clientX,
        startClientY: e.clientY,
        totalMovement: 0,
      }
    }
  }, [ORIGIN_X, ORIGIN_Y, slotOrder])

  // ---- MOUSE MOVE ----
  const onMove = useCallback((e) => {
    // Hover detection
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const cam = cameraRef.current
      const cx = (e.clientX - rect.left - cam.x) / cam.zoom
      const cy = (e.clientY - rect.top - cam.y) / cam.zoom
      const hitRoom = hitTestSlots(cx, cy, ORIGIN_X, ORIGIN_Y, slotOrder)
      if (hitRoom !== hover) {
        setHover(hitRoom)
        setExtHover?.(hitRoom)
      }
    }

    if (!mouseDownRef.current.active) return

    const drag = dragStateRef.current
    if (drag.roomId && !drag.active) {
      const dx = e.clientX - drag.startClientX
      const dy = e.clientY - drag.startClientY
      drag.totalMovement = Math.sqrt(dx * dx + dy * dy)
      if (drag.totalMovement >= DRAG_THRESHOLD) {
        drag.active = true
        mouseDownRef.current.didDrag = true
      }
    }

    // If dragging: update world position + check for slot shuffle
    if (drag.active && drag.roomId) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cam = cameraRef.current
        const cx = (e.clientX - rect.left - cam.x) / cam.zoom
        const cy = (e.clientY - rect.top - cam.y) / cam.zoom
        drag.worldX = cx
        drag.worldY = cy

        // Find which slot we're hovering over
        const nearestSlot = findNearestSlot(cx, cy, ORIGIN_X, ORIGIN_Y, slotOrder.length)

        // If we moved to a new slot, trigger shuffle
        if (nearestSlot !== drag.currentSlot) {
          drag.currentSlot = nearestSlot
          shuffleToSlot(drag.roomId, nearestSlot)
        }
      }
    }
  }, [hover, setExtHover, ORIGIN_X, ORIGIN_Y, slotOrder, shuffleToSlot])

  // ---- MOUSE UP ----
  const onUp = useCallback(() => {
    const drag = dragStateRef.current
    if (drag.active && drag.roomId) {
      setSlotOrder(prev => {
        saveSlotOrder(prev)
        return prev
      })
      drag.active = false
      drag.roomId = null
    } else {
      drag.roomId = null
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
    const hitRoom = hitTestSlots(cx, cy, ORIGIN_X, ORIGIN_Y, slotOrder)

    if (hitRoom) {
      setFocusedRoom(hitRoom)
      onRoomClick?.(hitRoom)
    } else {
      setFocusedRoom(null)
    }
  }, [onRoomClick, ORIGIN_X, ORIGIN_Y, slotOrder])

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
    const hitRoom = hitTestSlots(cx, cy, ORIGIN_X, ORIGIN_Y, slotOrder)
    if (hitRoom) {
      const meta = ROOM_META[hitRoom]
      setContextMenu({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        roomId: hitRoom,
        roomName: meta?.name || hitRoom,
      })
    } else {
      setContextMenu(null)
    }
  }, [ORIGIN_X, ORIGIN_Y, slotOrder])

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

  const handleResetOrder = useCallback(() => {
    setSlotOrder([...DEFAULT_ROOM_IDS])
    saveSlotOrder([...DEFAULT_ROOM_IDS])
    showToast('Room order reset to default')
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
        const hitRoom = hitTestSlots(cx, cy, ORIGIN_X, ORIGIN_Y, slotOrder)
        if (hitRoom) {
          const slotIdx = slotOrder.indexOf(hitRoom)
          const pos = slotWorldPos(slotIdx, ORIGIN_X, ORIGIN_Y)
          dragStateRef.current = {
            active: false,
            roomId: hitRoom,
            fromSlot: slotIdx,
            currentSlot: slotIdx,
            worldX: cx,
            worldY: cy,
            offsetX: cx - pos.x,
            offsetY: cy - pos.y,
            startClientX: t.clientX,
            startClientY: t.clientY,
            totalMovement: 0,
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
  }, [ORIGIN_X, ORIGIN_Y, slotOrder])

  const onTouchMove = useCallback((e) => {
    if (!mouseDownRef.current.active || e.touches.length !== 1) return
    const t = e.touches[0]

    const drag = dragStateRef.current
    if (drag.roomId && !drag.active) {
      const dx = t.clientX - drag.startClientX
      const dy = t.clientY - drag.startClientY
      drag.totalMovement = Math.sqrt(dx * dx + dy * dy)
      if (drag.totalMovement >= DRAG_THRESHOLD) {
        drag.active = true
        mouseDownRef.current.didDrag = true
      }
    }

    if (drag.active && drag.roomId) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cam = cameraRef.current
        const cx = (t.clientX - rect.left - cam.x) / cam.zoom
        const cy = (t.clientY - rect.top - cam.y) / cam.zoom
        drag.worldX = cx
        drag.worldY = cy

        const nearestSlot = findNearestSlot(cx, cy, ORIGIN_X, ORIGIN_Y, slotOrder.length)
        if (nearestSlot !== drag.currentSlot) {
          drag.currentSlot = nearestSlot
          shuffleToSlot(drag.roomId, nearestSlot)
        }
      }
    }
  }, [ORIGIN_X, ORIGIN_Y, slotOrder, shuffleToSlot])

  const onTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      const drag = dragStateRef.current
      if (drag.active && drag.roomId) {
        setSlotOrder(prev => {
          saveSlotOrder(prev)
          return prev
        })
        drag.active = false
        drag.roomId = null
      } else {
        drag.roomId = null
      }

      if (!mouseDownRef.current.didDrag) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const cam = cameraRef.current
          const lx = mouseDownRef.current.startX
          const ly = mouseDownRef.current.startY
          const cx = (lx - rect.left - cam.x) / cam.zoom
          const cy = (ly - rect.top - cam.y) / cam.zoom
          const hitRoom = hitTestSlots(cx, cy, ORIGIN_X, ORIGIN_Y, slotOrder)
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
  }, [onRoomClick, ORIGIN_X, ORIGIN_Y, slotOrder])

  const cursor = dragStateRef.current.active
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
            label="Reset Room Order"
            icon="&#x2316;"
            onClick={() => handleResetOrder()}
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
})

export default CanvasOffice

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
