import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { ALL_ROOMS, PROJECTS } from './gridSpec.js'

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
// 6. CHARACTER WALKING: Each character walks a casual loop inside their room hex on unique timing.
//    Vegas energy: random phase offsets, speed multipliers, idle pauses, subtle hop.
// 7. CHARACTER VISITING: Characters occasionally visit neighboring rooms (every 30-60s).
//    Walk to edge -> cross gap (world space) -> wander neighbor -> walk home.
//    Click room to recall its character home (hustle speed 1.6x). Visitors drawn at 85% opacity.
// 8. PROJECT ROOMS: Projects from gridSpec.js appear on the grid alongside agent rooms.
//    Dynamic hex grid grows to accommodate N rooms. Right-click to hide. "+ New Room" to create.
//
// CAMERA: Two-view system (Overview + Focus). No free pan/scroll zoom.
//   View 1 (Overview): All N rooms visible, centered.
//   View 2 (Focus): Click room -> smooth 400ms zoom, room ~40% viewport so neighbors visible.
//   Escape or click empty space -> back to Overview.

// ---- ROOM CONFIG ----
const ROOM_SIZE = 512        // Base room size (px, scales with zoom)

// Source-crop: room PNGs are 1024x1024 with navy (#0D0D1A) padding.
// Actual hex content sits roughly at x=[88,936] y=[0,862] in the source.
// We crop to an 864x864 square centered on the hex content, then draw it
// into the full ROOM_SIZE destination so rooms fill tighter with less gap.
const SRC_CROP_X = 80
const SRC_CROP_Y = 160
const SRC_CROP_W = 864
const SRC_CROP_H = 680

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

// localStorage keys
const SLOT_ORDER_KEY = 'corner-slot-order'
const HIDDEN_ROOMS_KEY = 'corner-hidden-rooms'
const CUSTOM_ROOMS_KEY = 'corner-custom-rooms'
const FREE_POSITIONS_KEY = 'corner-free-positions'

// Load free room positions from localStorage
// Returns: { [roomId]: { x, y } } or {}
function loadFreePositions() {
  try {
    const raw = localStorage.getItem(FREE_POSITIONS_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved && typeof saved === 'object') return saved
    }
  } catch (e) { /* ignore */ }
  return {}
}

// Save free room positions to localStorage
function saveFreePositions(positions) {
  try {
    localStorage.setItem(FREE_POSITIONS_KEY, JSON.stringify(positions))
  } catch (e) { /* ignore */ }
}

// ---- ROOM DATA FROM gridSpec.js (ALL_ROOMS = agents + projects) ----
// Build ROOM_META lookup from ALL_ROOMS so both agents and projects get names/colors
const ROOM_META = {}
ALL_ROOMS.forEach(r => {
  ROOM_META[r.slug] = {
    name: (r.name || r.slug).toUpperCase(),
    color: r.color || '#60A5FA',
    type: r.type || 'agent',
  }
})

// The default room order: all non-hidden rooms from ALL_ROOMS
function getDefaultRoomIDs() {
  return ALL_ROOMS.filter(r => !r.hidden).map(r => r.slug)
}

// Load user-created custom rooms from localStorage
function loadCustomRooms() {
  try {
    const raw = localStorage.getItem(CUSTOM_ROOMS_KEY)
    if (raw) {
      const rooms = JSON.parse(raw)
      if (Array.isArray(rooms)) return rooms
    }
  } catch (e) { /* ignore */ }
  return []
}

// Save custom rooms to localStorage
function saveCustomRooms(rooms) {
  try {
    localStorage.setItem(CUSTOM_ROOMS_KEY, JSON.stringify(rooms))
  } catch (e) { /* ignore */ }
}

// Load hidden room IDs from localStorage
function loadHiddenRooms() {
  try {
    const raw = localStorage.getItem(HIDDEN_ROOMS_KEY)
    if (raw) {
      const ids = JSON.parse(raw)
      if (Array.isArray(ids)) return ids
    }
  } catch (e) { /* ignore */ }
  return []
}

// Save hidden room IDs to localStorage
function saveHiddenRooms(ids) {
  try {
    localStorage.setItem(HIDDEN_ROOMS_KEY, JSON.stringify(ids))
  } catch (e) { /* ignore */ }
}

// Build the visible room ID list: ALL_ROOMS (non-hidden) + custom rooms (non-hidden) - user-hidden
function buildVisibleRoomIDs(hiddenSet) {
  const customRooms = loadCustomRooms()
  // Register custom rooms in ROOM_META if not already there
  customRooms.forEach(cr => {
    if (!ROOM_META[cr.slug]) {
      ROOM_META[cr.slug] = { name: cr.name.toUpperCase(), color: cr.color || '#60A5FA', type: 'custom' }
    }
  })
  const allSlugs = [
    ...ALL_ROOMS.filter(r => !r.hidden).map(r => r.slug),
    ...customRooms.map(cr => cr.slug),
  ]
  return allSlugs.filter(id => !hiddenSet.has(id))
}

// ---- ROW-GROUPED HEX SLOT GENERATION ----
// Generates hex slot positions using explicit row widths so rooms cluster by group.
// Row widths match the ALL_ROOMS order in gridSpec.js:
//   Row 0 (3): Core team      -- Elon, Bobby, Steffen
//   Row 1 (4): Creative+     -- Cleo, Jacob, AOM Team, Patrik
//   Row 2 (5): Top projects  -- Corner, Ambition, KOHRS, ISA, Skylar
//   Row 3 (4): More projects -- Brandon Wiley, NABI, Outreach, AI Advisory
//   Row 4+: overflow rows    -- 6 per row (custom rooms, future agents)
// Hex stagger: each row col is centered at 0, step 2, giving offset-column hex packing.
const ROW_SIZES = [3, 4, 5, 4]
const OVERFLOW_ROW_SIZE = 6

function generateHexSlots(n) {
  if (n <= 0) return []
  const slots = []
  let remaining = n

  for (let row = 0; remaining > 0; row++) {
    const rowWidth = row < ROW_SIZES.length
      ? Math.min(ROW_SIZES[row], remaining)
      : Math.min(OVERFLOW_ROW_SIZE, remaining)

    // Center the row at col 0 with step-2 columns
    // e.g. width 3 -> cols [-2, 0, 2], width 4 -> cols [-3, -1, 1, 3]
    const startCol = -(rowWidth - 1)
    for (let c = 0; c < rowWidth; c++) {
      slots.push({ row, col: startCol + c * 2 })
    }
    remaining -= rowWidth
  }
  return slots
}

// Keep a cached version so we don't regenerate every frame
let _cachedSlotCount = 0
let _cachedSlots = []
function getHexSlots(n) {
  if (n === _cachedSlotCount && _cachedSlots.length >= n) return _cachedSlots
  _cachedSlots = generateHexSlots(n)
  _cachedSlotCount = n
  return _cachedSlots
}

// ---- IMAGE SOURCES ----
// Rooms that have actual PNG folders (agents + projects)
const AGENT_FOLDER_ROOMS = [
  'elon', 'bobby', 'steffen', 'steve', 'alex', 'cleo', 'jacob', 'mom',
  'tony', 'paige', 'elmo', 'colton', 'pixel',
  'ambition-mechanical', 'corner', 'isa-energy', 'skylar', 'brandon-wiley',
  'kohrs', 'nabi', 'outreach', 'ai-advisory', 'included-health',
]

// Rooms with a single static PNG (no working/idle pair). 512x512 transparent PNGs.
// Crop coords are scaled by (naturalWidth/1024) so these render identically to 1024px rooms.
const SINGLE_IMAGE_ROOMS = {
  'patrik': '/rooms/patrik-office.png',
  'aom-team': '/rooms/aom-team-room.png',
}

// Static version string for room images. Increment when room PNGs are updated.
// Using Date.now() previously caused EVERY mount to re-download all PNGs (never cached).
const ROOM_IMAGE_VERSION = '1'

function getRoomImageSources(id) {
  if (AGENT_FOLDER_ROOMS.includes(id)) {
    return {
      working: `/corner/${id}-room/room-shell-working.png?v=${ROOM_IMAGE_VERSION}`,
      idle: `/corner/${id}-room/room-shell-idle.png?v=${ROOM_IMAGE_VERSION}`,
      hasImages: true,
    }
  }
  if (SINGLE_IMAGE_ROOMS[id]) {
    // Single static PNG -- use same image for both working and idle slots
    return {
      working: SINGLE_IMAGE_ROOMS[id],
      idle: SINGLE_IMAGE_ROOMS[id],
      hasImages: true,
    }
  }
  // Project rooms or custom rooms: no PNGs yet, use color placeholder
  return {
    working: null,
    idle: null,
    hasImages: false,
  }
}

// ---- CHARACTER LAYER SOURCES ----
const ROOMS_WITH_CHARACTERS = [
  'elon', 'bobby', 'steffen', 'steve', 'cleo', 'alex', 'mom', 'jacob', 'tony', 'colton', 'elmo', 'paige',
]

// Preload room images. For project/custom rooms, we draw a colored hex placeholder on canvas.
const roomImages = {}

function ensureRoomImages(id) {
  if (roomImages[id]) return
  const sources = getRoomImageSources(id)
  if (sources.hasImages) {
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
    roomImages[id] = { working: workImg, idle: idleImg, character: charImg, isPlaceholder: false }
  } else {
    // Placeholder: no actual images, drawRoom will render a colored hex
    roomImages[id] = { working: null, idle: null, character: null, isPlaceholder: true }
  }
}

// Preload all known rooms at module load
ALL_ROOMS.forEach(r => ensureRoomImages(r.slug))

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
const VIS_W = ROOM_SIZE * 0.94
const VIS_H = ROOM_SIZE * 0.94

function hexPosition(row, col, originX, originY) {
  const x = originX + col * (VIS_W * 0.52)
  const y = originY + row * (VIS_H * 0.72)
  return { x, y }
}

// Module-level slot count -- updated whenever visible rooms change.
// All slotWorldPos callers use this automatically.
let _currentTotalSlots = 13

// Get world-space position for a slot index (uses dynamic hex slots)
function slotWorldPos(slotIndex, originX, originY) {
  const slots = getHexSlots(_currentTotalSlots)
  const slot = slots[slotIndex]
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

// ---- SNAP TO NEAREST HEX GRID CELL ----
// Given a world-space point (the top-left of where the room wants to land),
// find the nearest hex grid cell and return its top-left world position {x, y}.
//
// The hex layout uses hexPosition(row, col, ox, oy) where:
//   x = ox + col * HEX_COL_STEP
//   y = oy + row * HEX_ROW_STEP
//
// For the VISIBLE snap grid we use only even col values per row (same as generateHexSlots),
// which creates the diamond/offset pattern. Each row r has a col offset parity that
// alternates: even rows use even cols, odd rows use odd cols.
// This way rooms don't stack on top of each other (they fit the isometric grid).
const HEX_COL_STEP = VIS_W * 0.52   // world-space x step per col unit
const HEX_ROW_STEP = VIS_H * 0.72   // world-space y step per row unit

function snapToNearestHexCell(wx, wy, originX, originY) {
  // Convert top-left to center for distance calculations
  const cx = wx + ROOM_SIZE / 2
  const cy = wy + ROOM_SIZE / 2

  // Estimate row from y
  const rawRow = (cy - originY - ROOM_SIZE / 2) / HEX_ROW_STEP
  const bestRow = Math.round(rawRow)

  // For each candidate row, the valid cols are those with the same parity as
  // the row itself (matching generateHexSlots diamond pattern).
  // We search bestRow ± 1 to handle boundary cases.
  let nearest = { row: bestRow, col: 0 }
  let nearestDist = Infinity

  for (let dr = -1; dr <= 1; dr++) {
    const r = bestRow + dr
    // Estimate col from x
    const rawCol = (cx - originX - ROOM_SIZE / 2) / HEX_COL_STEP
    const bestColRaw = Math.round(rawCol)

    // Candidate cols: the nearest integer cols, stepped by 2 (same parity)
    // In our grid, even rows use even cols, odd rows use odd cols.
    const parity = ((r % 2) + 2) % 2 // 0 for even rows, 1 for odd rows
    // Align bestColRaw to correct parity
    let alignedCol = bestColRaw
    if (((alignedCol % 2) + 2) % 2 !== parity) alignedCol += 1

    for (let dc = -2; dc <= 2; dc += 2) {
      const c = alignedCol + dc
      const pos = hexPosition(r, c, originX, originY)
      const pcx = pos.x + ROOM_SIZE / 2
      const pcy = pos.y + ROOM_SIZE / 2
      const d = Math.sqrt((cx - pcx) ** 2 + (cy - pcy) ** 2)
      if (d < nearestDist) {
        nearestDist = d
        nearest = { row: r, col: c }
      }
    }
  }

  return hexPosition(nearest.row, nearest.col, originX, originY)
}

// ---- LOAD/SAVE SLOT ORDER FROM LOCALSTORAGE ----
// Reconciles saved order with current visible rooms: removes rooms no longer visible,
// appends new rooms that weren't in the saved order. Handles dynamic room counts.
function loadSlotOrder() {
  const hiddenSet = new Set(loadHiddenRooms())
  const visibleIDs = buildVisibleRoomIDs(hiddenSet)

  try {
    const raw = localStorage.getItem(SLOT_ORDER_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (Array.isArray(saved)) {
        const visibleSet = new Set(visibleIDs)
        // Keep saved order for rooms that are still visible
        const reconciled = saved.filter(id => visibleSet.has(id))
        // Add any new rooms not in saved order
        const reconciledSet = new Set(reconciled)
        for (const id of visibleIDs) {
          if (!reconciledSet.has(id)) reconciled.push(id)
        }
        if (reconciled.length > 0) return reconciled
      }
    }
  } catch (e) {
    // Ignore corrupt data
  }
  return visibleIDs
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

// ---- CHARACTER WALK CONFIG ----
// Waypoints define a casual loop inside the room hex interior safe zone.
// Coordinates are in room-local space (0..512). The safe interior is roughly x:56-456, y:180-345.
// Characters walk this loop, each on their own timing.
const WALK_WAYPOINTS = [
  { x: 180, y: 220 },  // upper-left area (near desk)
  { x: 320, y: 200 },  // upper-right
  { x: 380, y: 280 },  // right side
  { x: 300, y: 340 },  // lower-right
  { x: 200, y: 320 },  // lower-left
  { x: 140, y: 260 },  // left side
]

// Per-character speed multipliers and pause tendencies. Bobby/Tony = fast. Mom/Paige = slow.
const CHAR_WALK_SPEEDS = {
  elon:    { speed: 0.7,  pauseChance: 0.4 },
  bobby:   { speed: 1.3,  pauseChance: 0.15 },
  steffen: { speed: 0.65, pauseChance: 0.5 },
  steve:   { speed: 0.8,  pauseChance: 0.35 },
  cleo:    { speed: 0.9,  pauseChance: 0.3 },
  alex:    { speed: 1.0,  pauseChance: 0.25 },
  mom:     { speed: 0.5,  pauseChance: 0.55 },
  tony:    { speed: 1.4,  pauseChance: 0.1 },
  colton:  { speed: 1.1,  pauseChance: 0.2 },
  jacob:   { speed: 0.85, pauseChance: 0.3 },
  paige:   { speed: 0.45, pauseChance: 0.6 },
  elmo:    { speed: 1.05, pauseChance: 0.2 },
  pixel:   { speed: 1.2,  pauseChance: 0.15 },
}

// Base walk speed: pixels per second (before multiplier)
const WALK_BASE_SPEED = 40

// Hop amplitude (pixels) for walking bounce
const WALK_HOP_PX = 2

// Hop frequency (full bounces per second)
const WALK_HOP_FREQ = 3.5

// ---- VISIT CONFIG ----
const VISIT_MIN_INTERVAL = 999999  // min seconds between visit attempts
const VISIT_MAX_INTERVAL = 999999  // max seconds between visit attempts
const VISIT_DURATION_MIN = 10  // min seconds spent in neighbor room
const VISIT_DURATION_MAX = 20  // max seconds spent in neighbor room
const VISIT_HUSTLE_MULTIPLIER = 1.6 // speed boost when recalled

// Visit phases: null (home) -> 'exiting' -> 'crossing' -> 'entering' -> 'wandering' -> 'exit_neighbor' -> 'crossing_home' -> 'entering_home' -> null
// 'exiting': walking to edge of home hex
// 'crossing': traversing the gap between rooms (drawn in world space, unclipped)
// 'entering': walking from neighbor hex edge to interior
// 'wandering': walking waypoints in neighbor room
// 'exit_neighbor': walking to edge of neighbor hex (heading home)
// 'crossing_home': traversing gap back (drawn in world space, unclipped)
// 'entering_home': walking from home hex edge to interior waypoint

// Edge points on the hex for exiting/entering (in room-local 0..512 space)
// These are midpoints of each hex edge
const HEX_EDGE_POINTS = [
  { x: 256, y: 38 },   // top edge midpoint
  { x: 448, y: 166 },  // upper-right edge midpoint
  { x: 448, y: 397 },  // lower-right edge midpoint
  { x: 256, y: 480 },  // bottom edge midpoint
  { x: 64, y: 397 },   // lower-left edge midpoint
  { x: 64, y: 166 },   // upper-left edge midpoint
]

// Get neighbors for a given slot index (distance 1 or 2 in hex grid)
function getNeighborSlots(slotIdx, totalSlots) {
  const neighbors = []
  for (let i = 0; i < totalSlots; i++) {
    if (i === slotIdx) continue
    const d = slotDistance(slotIdx, i)
    if (d >= 1 && d <= 2) neighbors.push(i)
  }
  return neighbors
}

// Pick the best hex edge to exit toward a target room position
function pickExitEdge(homePos, targetPos) {
  const S = ROOM_SIZE
  // Direction from home center to target center
  const homeCX = homePos.x + S / 2
  const homeCY = homePos.y + S / 2
  const targetCX = targetPos.x + S / 2
  const targetCY = targetPos.y + S / 2
  const dx = targetCX - homeCX
  const dy = targetCY - homeCY

  // Find edge point whose direction from center best matches the target direction
  let bestIdx = 0
  let bestDot = -Infinity
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ndx = dx / len
  const ndy = dy / len
  for (let i = 0; i < HEX_EDGE_POINTS.length; i++) {
    const ep = HEX_EDGE_POINTS[i]
    const edx = ep.x - S / 2
    const edy = ep.y - S / 2
    const elen = Math.sqrt(edx * edx + edy * edy) || 1
    const dot = (edx / elen) * ndx + (edy / elen) * ndy
    if (dot > bestDot) { bestDot = dot; bestIdx = i }
  }
  return bestIdx
}

// Initialize walk state for a character
function initCharWalkState(roomId) {
  // Seeded pseudo-random from roomId string so it's deterministic but unique
  let seed = 0
  for (let i = 0; i < roomId.length; i++) seed = (seed * 31 + roomId.charCodeAt(i)) | 0
  const pseudoRand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 2147483647 }

  const startWaypoint = Math.floor(pseudoRand() * WALK_WAYPOINTS.length)
  const nextWaypoint = (startWaypoint + 1) % WALK_WAYPOINTS.length
  return {
    currentWaypoint: startWaypoint,
    nextWaypoint: nextWaypoint,
    progress: pseudoRand() * 0.5, // start partway through first segment
    paused: false,
    pauseTimer: 0,
    pauseDuration: 0,
    phaseOffset: pseudoRand() * 100, // large offset so hop cycles don't sync
    x: WALK_WAYPOINTS[startWaypoint].x,
    y: WALK_WAYPOINTS[startWaypoint].y,
    // ---- VISIT STATE ----
    visiting: null,        // roomId of room being visited, null = home
    visitPhase: null,      // current visit phase (see phases above)
    returning: false,      // true = hustling back home (click-to-recall)
    visitTimer: VISIT_MIN_INTERVAL + pseudoRand() * (VISIT_MAX_INTERVAL - VISIT_MIN_INTERVAL),
    visitDuration: 0,      // how long to wander in neighbor
    visitWanderTimer: 0,   // countdown while wandering
    // World-space coordinates for crossing between rooms
    visitWorldX: 0,
    visitWorldY: 0,
    visitTargetWorldX: 0,
    visitTargetWorldY: 0,
    visitCrossProgress: 0,
    // Edge indices for exit/enter
    visitExitEdge: 0,
    visitEnterEdge: 0,
    // Target position within the visited room (local coords)
    visitLocalTargetX: 0,
    visitLocalTargetY: 0,
  }
}

// Advance walk state by dt seconds, returns { x, y, isWalking }
// This handles normal in-room walking only (visit phases handled separately)
function advanceCharWalk(state, roomId, dt) {
  const cfg = CHAR_WALK_SPEEDS[roomId] || { speed: 1.0, pauseChance: 0.3 }
  const speedMult = state.returning ? VISIT_HUSTLE_MULTIPLIER : 1.0
  const speed = WALK_BASE_SPEED * cfg.speed * speedMult

  if (state.paused) {
    state.pauseTimer -= dt
    if (state.pauseTimer <= 0) {
      state.paused = false
    }
    return { x: state.x, y: state.y, isWalking: false }
  }

  // Move toward next waypoint
  const from = WALK_WAYPOINTS[state.currentWaypoint]
  const to = WALK_WAYPOINTS[state.nextWaypoint]
  const dx = to.x - from.x
  const dy = to.y - from.y
  const segLen = Math.sqrt(dx * dx + dy * dy)
  if (segLen < 0.01) {
    state.progress = 1
  } else {
    state.progress += (speed * dt) / segLen
  }

  if (state.progress >= 1) {
    // Arrived at waypoint
    state.x = to.x
    state.y = to.y
    state.currentWaypoint = state.nextWaypoint
    state.nextWaypoint = (state.nextWaypoint + 1) % WALK_WAYPOINTS.length
    state.progress = 0

    // Maybe pause at this waypoint (skip pause if returning/hustling)
    if (!state.returning) {
      const roll = ((state.phaseOffset * 7 + state.currentWaypoint * 13) % 100) / 100
      if (roll < cfg.pauseChance) {
        state.paused = true
        state.pauseDuration = 1 + ((state.phaseOffset * 3 + state.currentWaypoint * 17) % 200) / 100 // 1-3s
        state.pauseTimer = state.pauseDuration
        return { x: state.x, y: state.y, isWalking: false }
      }
    }
  } else {
    // Smooth interpolation along segment
    const t = state.progress
    state.x = from.x + dx * t
    state.y = from.y + dy * t
  }

  return { x: state.x, y: state.y, isWalking: true }
}

// Move character toward a specific local point, returns true when arrived
function moveTowardPoint(state, targetX, targetY, speed, dt) {
  const dx = targetX - state.x
  const dy = targetY - state.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 2) {
    state.x = targetX
    state.y = targetY
    return true // arrived
  }
  const step = speed * dt
  if (step >= dist) {
    state.x = targetX
    state.y = targetY
    return true
  }
  state.x += (dx / dist) * step
  state.y += (dy / dist) * step
  return false
}

// Advance the visit state machine. Called every frame for characters that have visit logic.
// slotOrder + ORIGIN needed to compute world positions.
// Returns: { x, y, isWalking, inWorldSpace, worldX, worldY }
// inWorldSpace = true means the character should be drawn in world coords (not room-local)
function advanceVisitState(state, roomId, dt, slotOrder, originX, originY) {
  const cfg = CHAR_WALK_SPEEDS[roomId] || { speed: 1.0, pauseChance: 0.3 }
  const speedMult = state.returning ? VISIT_HUSTLE_MULTIPLIER : 1.0
  const speed = WALK_BASE_SPEED * cfg.speed * speedMult
  const crossSpeed = speed * 1.2 // slightly faster when crossing open space

  const homeSlot = slotOrder.indexOf(roomId)
  if (homeSlot < 0) return null // room not in layout

  // Not visiting: count down visit timer, maybe start a visit
  if (!state.visitPhase) {
    state.visitTimer -= dt
    if (state.visitTimer <= 0) {
      // Time to try visiting a neighbor
      const neighbors = getNeighborSlots(homeSlot, slotOrder.length)
      if (neighbors.length > 0) {
        // Pick a random neighbor using phase offset for determinism variation
        const pickIdx = Math.floor((state.phaseOffset * 7 + performance.now() * 0.001) % neighbors.length)
        const targetSlot = neighbors[Math.abs(pickIdx) % neighbors.length]
        const targetRoomId = slotOrder[targetSlot]

        // Don't visit if the target character is also visiting us (avoid crossing paths)
        // Simple: just go
        state.visiting = targetRoomId
        state.visitPhase = 'exiting'
        state.returning = false

        const homePos = slotWorldPos(homeSlot, originX, originY)
        const targetPos = slotWorldPos(targetSlot, originX, originY)

        // Pick exit/enter edges
        const exitEdgeIdx = pickExitEdge(homePos, targetPos)
        const enterEdgeIdx = pickExitEdge(targetPos, homePos) // opposite direction
        state.visitExitEdge = exitEdgeIdx
        state.visitEnterEdge = enterEdgeIdx

        // Set visit duration
        const durationRange = VISIT_DURATION_MAX - VISIT_DURATION_MIN
        state.visitDuration = VISIT_DURATION_MIN + ((state.phaseOffset * 11 + targetSlot * 7) % (durationRange * 100)) / 100
        state.visitWanderTimer = state.visitDuration
      }
      // Reset timer regardless
      state.visitTimer = VISIT_MIN_INTERVAL + ((state.phaseOffset * 13 + performance.now() * 0.0007) % (VISIT_MAX_INTERVAL - VISIT_MIN_INTERVAL))
    }
    return null // normal walk, no visit active
  }

  // ---- VISIT PHASES ----
  const homePos = slotWorldPos(homeSlot, originX, originY)
  const visitSlot = slotOrder.indexOf(state.visiting)
  if (visitSlot < 0) {
    // Target room disappeared from layout, abort visit
    state.visitPhase = null
    state.visiting = null
    state.returning = false
    return null
  }
  const visitPos = slotWorldPos(visitSlot, originX, originY)

  const exitEdge = HEX_EDGE_POINTS[state.visitExitEdge]
  const enterEdge = HEX_EDGE_POINTS[state.visitEnterEdge]

  switch (state.visitPhase) {
    case 'exiting': {
      // Walk toward exit edge of home room (room-local coords)
      const arrived = moveTowardPoint(state, exitEdge.x, exitEdge.y, speed, dt)
      if (arrived) {
        // Switch to crossing phase, set up world-space coordinates
        state.visitPhase = 'crossing'
        state.visitWorldX = homePos.x + exitEdge.x
        state.visitWorldY = homePos.y + exitEdge.y
        state.visitTargetWorldX = visitPos.x + enterEdge.x
        state.visitTargetWorldY = visitPos.y + enterEdge.y
        state.visitCrossProgress = 0
      }
      return { x: state.x, y: state.y, isWalking: true, inWorldSpace: false }
    }

    case 'crossing': {
      // Move in world space from home edge to neighbor edge
      const dx = state.visitTargetWorldX - state.visitWorldX
      const dy = state.visitTargetWorldY - state.visitWorldY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 2) {
        // Arrived at neighbor entrance
        state.visitPhase = 'entering'
        state.x = enterEdge.x
        state.y = enterEdge.y
        // Pick a waypoint to walk to inside the neighbor room
        const wpIdx = Math.floor((state.phaseOffset * 3) % WALK_WAYPOINTS.length)
        state.visitLocalTargetX = WALK_WAYPOINTS[wpIdx].x
        state.visitLocalTargetY = WALK_WAYPOINTS[wpIdx].y
        return { x: enterEdge.x, y: enterEdge.y, isWalking: true, inWorldSpace: false, currentRoom: state.visiting }
      }
      state.visitCrossProgress += (crossSpeed * dt) / dist
      if (state.visitCrossProgress >= 1) state.visitCrossProgress = 1
      const wx = state.visitWorldX + dx * state.visitCrossProgress
      const wy = state.visitWorldY + dy * state.visitCrossProgress
      // Convert world coords to local coords relative to... we need world space drawing
      return { x: 0, y: 0, isWalking: true, inWorldSpace: true, worldX: wx, worldY: wy }
    }

    case 'entering': {
      // Walk from neighbor edge to interior waypoint (in neighbor's local space)
      const arrived = moveTowardPoint(state, state.visitLocalTargetX, state.visitLocalTargetY, speed, dt)
      if (arrived) {
        state.visitPhase = 'wandering'
        // Set up waypoint walking in neighbor room
        const wpIdx = Math.floor((state.phaseOffset * 5) % WALK_WAYPOINTS.length)
        state.currentWaypoint = wpIdx
        state.nextWaypoint = (wpIdx + 1) % WALK_WAYPOINTS.length
        state.progress = 0
      }
      return { x: state.x, y: state.y, isWalking: true, inWorldSpace: false, currentRoom: state.visiting }
    }

    case 'wandering': {
      // Walk waypoints in neighbor room, just like at home
      state.visitWanderTimer -= dt
      const result = advanceCharWalk(state, roomId, dt)
      if (state.visitWanderTimer <= 0 || state.returning) {
        // Time to head home (or recalled)
        state.visitPhase = 'exit_neighbor'
      }
      return { x: result.x, y: result.y, isWalking: result.isWalking, inWorldSpace: false, currentRoom: state.visiting }
    }

    case 'exit_neighbor': {
      // Walk to edge of neighbor room
      const arrived = moveTowardPoint(state, enterEdge.x, enterEdge.y, speed, dt)
      if (arrived) {
        state.visitPhase = 'crossing_home'
        state.visitWorldX = visitPos.x + enterEdge.x
        state.visitWorldY = visitPos.y + enterEdge.y
        state.visitTargetWorldX = homePos.x + exitEdge.x
        state.visitTargetWorldY = homePos.y + exitEdge.y
        state.visitCrossProgress = 0
      }
      return { x: state.x, y: state.y, isWalking: true, inWorldSpace: false, currentRoom: state.visiting }
    }

    case 'crossing_home': {
      // Cross back in world space
      const dx = state.visitTargetWorldX - state.visitWorldX
      const dy = state.visitTargetWorldY - state.visitWorldY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 2) {
        state.visitPhase = 'entering_home'
        state.x = exitEdge.x
        state.y = exitEdge.y
        // Pick a waypoint to settle into at home
        const wpIdx = Math.floor((state.phaseOffset * 9) % WALK_WAYPOINTS.length)
        state.visitLocalTargetX = WALK_WAYPOINTS[wpIdx].x
        state.visitLocalTargetY = WALK_WAYPOINTS[wpIdx].y
        return { x: exitEdge.x, y: exitEdge.y, isWalking: true, inWorldSpace: false }
      }
      state.visitCrossProgress += (crossSpeed * dt) / dist
      if (state.visitCrossProgress >= 1) state.visitCrossProgress = 1
      const wx = state.visitWorldX + dx * state.visitCrossProgress
      const wy = state.visitWorldY + dy * state.visitCrossProgress
      return { x: 0, y: 0, isWalking: true, inWorldSpace: true, worldX: wx, worldY: wy }
    }

    case 'entering_home': {
      // Walk from home edge to interior
      const arrived = moveTowardPoint(state, state.visitLocalTargetX, state.visitLocalTargetY, speed, dt)
      if (arrived) {
        // Visit complete, reset
        state.visitPhase = null
        state.visiting = null
        state.returning = false
        // Resume normal walking from this position
        const wpIdx = Math.floor((state.phaseOffset * 2) % WALK_WAYPOINTS.length)
        state.currentWaypoint = wpIdx
        state.nextWaypoint = (wpIdx + 1) % WALK_WAYPOINTS.length
        state.progress = 0
        // Reset visit timer
        state.visitTimer = VISIT_MIN_INTERVAL + ((state.phaseOffset * 17 + performance.now() * 0.001) % (VISIT_MAX_INTERVAL - VISIT_MIN_INTERVAL))
      }
      return { x: state.x, y: state.y, isWalking: true, inWorldSpace: false }
    }

    default:
      state.visitPhase = null
      state.visiting = null
      return null
  }
}

// ---- HEX DISTANCE (using dynamic slot positions) ----
function slotDistance(slotA, slotB) {
  const slots = getHexSlots(_currentTotalSlots)
  const a = slots[slotA]
  const b = slots[slotB]
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
  drawerSnap = null,
  isMobile = false,
  initialFocusRoom = null, // If set, start camera focused on this room instead of overview
  onOpenChat,    // (roomId) -> open chat panel for room
  onSendMessage, // (roomId) -> open chat + focus input
  onViewTasks,   // (roomId) -> switch to tasks tab for room
  onSetAsHome,   // (roomId) -> save as default home room in localStorage
  unreadAgents = {},  // { agentSlug: count } -- rooms with unread messages
}, ref) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1.0 })
  const cameraAnimRef = useRef(null)
  const [focusedRoom, setFocusedRoom] = useState(initialFocusRoom || null)


  // ---- HEX GRID SHUFFLE STATE ----
  // slotOrder: array of roomIds indexed by slot position
  const [slotOrder, setSlotOrder] = useState(loadSlotOrder)
  // Hidden rooms tracked in state for re-render on hide/show
  const [hiddenRooms, setHiddenRooms] = useState(() => new Set(loadHiddenRooms()))

  // ---- FREE POSITION OVERRIDES ----
  // When a room is dropped freely (no snap-to-slot), its {x, y} world position is saved here.
  // On render, freePositions[roomId] takes priority over slotWorldPos(slotIdx).
  // Persisted to localStorage under FREE_POSITIONS_KEY.
  const freePositionsRef = useRef(loadFreePositions())
  // New room creation modal
  const [showNewRoomModal, setShowNewRoomModal] = useState(false)

  // Keep the module-level slot count in sync with visible rooms
  useEffect(() => {
    _currentTotalSlots = slotOrder.length
  }, [slotOrder])

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
    // Snap target: the nearest hex grid cell world position (updated every frame during drag)
    snapX: 0,
    snapY: 0,
  })
  const mouseDownRef = useRef({ active: false, didDrag: false, startX: 0, startY: 0 })

  // ---- MAP PAN STATE (touch drag on empty space) ----
  // Stores pan velocity and animation frame for momentum/inertia after finger lifts.
  // panRef.offset is the user's current pan delta added on top of the camera's base position.
  const panRef = useRef({
    active: false,
    startCamX: 0, startCamY: 0,     // camera position when pan started
    startTouchX: 0, startTouchY: 0, // initial touch position
    lastTouchX: 0, lastTouchY: 0,   // last touch position (for velocity)
    lastTouchTime: 0,               // timestamp of last touch move
    velX: 0, velY: 0,               // velocity in px/frame
    momentumFrame: null,             // requestAnimationFrame ID for momentum
  })

  // Touch-specific drag threshold (higher than mouse to prevent accidental pans from taps)
  const TOUCH_DRAG_THRESHOLD = 10

  // Long-press timer for touch context menu (500ms threshold)
  const longPressTimerRef = useRef(null)
  const longPressFiredRef = useRef(false)

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null)

  // Toast notification state
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  // ---- CHARACTER WALK STATE ----
  const characterWalkRef = useRef({})
  const lastWalkTimeRef = useRef(performance.now())

  // Initialize walk states for all characters on mount
  useEffect(() => {
    const walkStates = {}
    ROOMS_WITH_CHARACTERS.forEach(id => {
      walkStates[id] = initCharWalkState(id)
    })
    characterWalkRef.current = walkStates
    lastWalkTimeRef.current = performance.now()
  }, [])

  // ---- CELEBRATION WAVE STATE ----
  const celebrationRef = useRef({ active: false, sourceRoomId: null, startTime: 0 })

  const triggerCelebration = useCallback((roomId) => {
    if (!slotOrder.includes(roomId)) return
    celebrationRef.current = {
      active: true,
      sourceRoomId: roomId,
      startTime: performance.now(),
    }
  }, [])

  useImperativeHandle(ref, () => ({
    triggerCelebration,
    focusRoom: (roomId) => {
      if (roomId && slotOrder.includes(roomId)) {
        setFocusedRoom(roomId)
      } else {
        setFocusedRoom(null)
      }
    },
    resetLayout: () => {
      // Clear free-position overrides AND saved slot order so rooms snap back to
      // default grouped layout defined by ALL_ROOMS order in gridSpec.js
      try { localStorage.removeItem(FREE_POSITIONS_KEY) } catch {}
      try { localStorage.removeItem(SLOT_ORDER_KEY) } catch {}
      freePositionsRef.current = {}
      // Reload slot order from defaults (triggers re-render so rooms visually snap)
      setSlotOrder(loadSlotOrder())
    },
  }), [triggerCelebration, slotOrder])

  // ---- AUTO-TEST: trigger celebration wave every 60 seconds ----
  useEffect(() => {
    let roomIdx = 0
    const timer = setInterval(() => {
      if (slotOrder.length === 0) return
      const id = slotOrder[roomIdx % slotOrder.length]
      triggerCelebration(id)
      roomIdx++
    }, 60000)
    const initial = setTimeout(() => {
      if (slotOrder.length > 0) {
        triggerCelebration(slotOrder[0])
        roomIdx = 1
      }
    }, 3000)
    return () => { clearInterval(timer); clearTimeout(initial) }
  }, [triggerCelebration, slotOrder])

  // Animation time reference
  const startTimeRef = useRef(performance.now())

  // Track image loading -- count agent rooms with actual images, skip placeholder project rooms
  useEffect(() => {
    let loadCount = 0
    let totalImages = 0
    // Ensure all visible rooms have image entries
    slotOrder.forEach(id => ensureRoomImages(id))
    // Count only rooms with actual images
    slotOrder.forEach(id => {
      const imgs = roomImages[id]
      if (imgs && !imgs.isPlaceholder) totalImages += 2
    })
    if (totalImages === 0) { setLoaded(true); return }
    const checkDone = () => {
      loadCount++
      if (loadCount >= totalImages) setLoaded(true)
    }
    slotOrder.forEach((id) => {
      const imgs = roomImages[id]
      if (!imgs || imgs.isPlaceholder) return
      if (imgs.working?.complete) checkDone()
      else if (imgs.working) imgs.working.onload = checkDone
      if (imgs.idle?.complete) checkDone()
      else if (imgs.idle) imgs.idle.onload = checkDone
    })
    const fallback = setTimeout(() => setLoaded(true), 3000)
    return () => clearTimeout(fallback)
  }, [slotOrder])

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
  const ORIGIN_Y = ROOM_SIZE * 0.1 - 100

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
    // Mobile: tighter zoom (less padding) so rooms fill more of the screen
    const isMobileView = viewW < 768
    const padRatio = isMobileView ? 0.02 : 0.10
    const padX = bounds.w * padRatio
    const padY = bounds.h * padRatio
    const totalW = bounds.w + padX * 2
    const totalH = bounds.h + padY * 2
    const zoomFit = Math.min(viewW / totalW, viewH / totalH)
    const cx = (viewW - bounds.w * zoomFit) / 2 - bounds.minX * zoomFit
    const cy = (viewH - bounds.h * zoomFit) / 2 - bounds.minY * zoomFit
    return { x: cx, y: cy, zoom: zoomFit }
  }, [getGridBounds])

  // ---- FOCUS CAMERA (neighbors visible) ----
  // Zoom so focused room fills ~40% viewport (not 60%) so neighbors are visible around it
  // On mobile with drawer open, offset Y so room centers in the visible area ABOVE the drawer
  const getFocusCamera = useCallback((roomId, viewW, viewH) => {
    const slotIdx = slotOrder.indexOf(roomId)
    if (slotIdx < 0) return getOverviewCamera(viewW, viewH)
    const pos = slotWorldPos(slotIdx, ORIGIN_X, ORIGIN_Y)
    const roomCX = pos.x + ROOM_SIZE / 2
    const roomCY = pos.y + ROOM_SIZE / 2
    // Desktop: 40% of viewport = focused room. Neighbors at the edges.
    // Mobile: 65% of viewport width so you see 3-4 rooms total, not the whole grid.
    const isMobileView = viewW < 768
    const visibleRoomSize = ROOM_SIZE * 0.94
    const targetScreenSize = isMobileView
      ? viewW * 0.65
      : Math.min(viewW, viewH) * 0.40
    const zoomFocus = targetScreenSize / visibleRoomSize
    const panX = viewW / 2 - roomCX * zoomFocus

    // Mobile drawer offset: when drawer is at 'half' (~52% of screen), center the room
    // in the top ~48% of the viewport instead of dead center
    let panY = viewH / 2 - roomCY * zoomFocus
    if (isMobile && drawerSnap === 'half') {
      // Drawer covers ~52% of viewport from bottom. Visible area = top ~48%.
      // Center of visible area = viewH * 0.48 / 2 = viewH * 0.24
      const visibleCenterY = viewH * 0.24
      panY = visibleCenterY - roomCY * zoomFocus
    } else if (isMobile && drawerSnap === 'full') {
      // Full drawer covers everything, but user can still see the top sliver
      // Keep room centered in top ~20%
      const visibleCenterY = viewH * 0.10
      panY = visibleCenterY - roomCY * zoomFocus
    }

    return { x: panX, y: panY, zoom: zoomFocus }
  }, [slotOrder, ORIGIN_X, ORIGIN_Y, getOverviewCamera, isMobile, drawerSnap])

  // ---- ANIMATE CAMERA TRANSITION ----
  const animateCamera = useCallback((targetCamera) => {
    // Cancel any ongoing pan momentum when a room-focus animation starts
    if (panRef.current.momentumFrame) {
      cancelAnimationFrame(panRef.current.momentumFrame)
      panRef.current.momentumFrame = null
    }
    const from = { ...cameraRef.current }
    cameraAnimRef.current = { from, to: targetCamera, startTime: performance.now(), duration: CAMERA_TRANSITION_MS }
  }, [])

  // ---- SET INITIAL CAMERA on mount ----
  const initialCameraSet = useRef(false)
  useEffect(() => {
    if (size.w > 0 && size.h > 0 && !initialCameraSet.current) {
      initialCameraSet.current = true
      if (focusedRoom && slotOrder.includes(focusedRoom)) {
        // Start focused on the specified room (e.g. default agent on mobile)
        const focusCam = getFocusCamera(focusedRoom, size.w, size.h)
        cameraRef.current = { x: focusCam.x, y: focusCam.y, zoom: focusCam.zoom }
      } else {
        const overview = getOverviewCamera(size.w, size.h)
        cameraRef.current = { x: overview.x, y: overview.y, zoom: overview.zoom }
      }
      cameraAnimRef.current = null
    }
  }, [size.w, size.h, getOverviewCamera, getFocusCamera, focusedRoom, slotOrder])

  // ---- RECALCULATE CAMERA when focused room changes, viewport resizes, or drawer state changes ----
  useEffect(() => {
    if (size.w <= 0 || size.h <= 0) return
    if (focusedRoom) {
      animateCamera(getFocusCamera(focusedRoom, size.w, size.h))
    } else {
      animateCamera(getOverviewCamera(size.w, size.h))
    }
  }, [focusedRoom, size.w, size.h, animateCamera, getFocusCamera, getOverviewCamera, drawerSnap])

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

    // ---- HEX GRID LINES: draw snap grid as visible lines behind rooms ----
    // Compute which cells are visible in the current viewport (with a 2-cell margin)
    {
      const viewL = -cam.x / cam.zoom
      const viewT = -cam.y / cam.zoom
      const viewR = viewL + size.w / cam.zoom
      const viewB = viewT + size.h / cam.zoom

      // How many rows/cols fit in the viewport (plus margin)
      const rowMin = Math.floor((viewT - ORIGIN_Y) / HEX_ROW_STEP) - 2
      const rowMax = Math.ceil((viewB - ORIGIN_Y) / HEX_ROW_STEP) + 2
      const colMin = Math.floor((viewL - ORIGIN_X) / HEX_COL_STEP) - 2
      const colMax = Math.ceil((viewR - ORIGIN_X) / HEX_COL_STEP) + 2

      ctx.save()
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.14)'  // #3B82F6 at low opacity
      ctx.lineWidth = 1.5 / cam.zoom  // keep lines 1.5px on screen regardless of zoom

      const S = ROOM_SIZE
      // Draw a diamond outline at each hex grid cell.
      // For each row, start at the correct parity col and step by 2.
      // Even rows use even cols, odd rows use odd cols (matches generateHexSlots).
      for (let r = rowMin; r <= rowMax; r++) {
        const parity = ((r % 2) + 2) % 2  // 0 for even rows, 1 for odd rows
        // Find the first col >= colMin that has the right parity
        let cStart = colMin
        if (((cStart % 2) + 2) % 2 !== parity) cStart += 1
        for (let c = cStart; c <= colMax; c += 2) {
          const pos = hexPosition(r, c, ORIGIN_X, ORIGIN_Y)
          // Diamond path matching the hit-test shape: hw=ROOM_SIZE/2, hh=ROOM_SIZE/4
          // Grid lines shifted up by half a hex height (hh = S/4)
          const px = pos.x + S * 0.5
          const py = pos.y + S * 0.5 - S / 4
          const hw = S / 2
          const hh = S / 4
          ctx.beginPath()
          ctx.moveTo(px, py - hh)      // top
          ctx.lineTo(px + hw, py)      // right
          ctx.lineTo(px, py + hh)      // bottom
          ctx.lineTo(px - hw, py)      // left
          ctx.closePath()
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    // ---- DRAW SNAP INDICATOR (ghost diamond at snap target during room drag) ----
    {
      const drag = dragStateRef.current
      if (drag.active && drag.roomId) {
        // Compute snap target for current drag position
        const rawX = drag.worldX - drag.offsetX
        const rawY = drag.worldY - drag.offsetY
        const snap = snapToNearestHexCell(rawX, rawY, ORIGIN_X, ORIGIN_Y)
        // Store on drag state so onUp can read it
        drag.snapX = snap.x
        drag.snapY = snap.y

        const S = ROOM_SIZE
        const meta = ROOM_META[drag.roomId]
        const color = meta?.color || '#3B82F6'
        ctx.save()
        ctx.strokeStyle = color
        ctx.globalAlpha = 0.35
        ctx.lineWidth = 2.5 / (cameraRef.current?.zoom || 1)
        ctx.setLineDash([8, 6])
        const px = snap.x + S / 2
        const py = snap.y + S / 2
        const hw = S / 2
        const hh = S / 4
        ctx.beginPath()
        ctx.moveTo(px, py - hh)
        ctx.lineTo(px + hw, py)
        ctx.lineTo(px, py + hh)
        ctx.lineTo(px - hw, py)
        ctx.closePath()
        ctx.stroke()
        ctx.restore()
      }
    }

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

    // ---- ADVANCE CHARACTER WALK STATES (with visit logic) ----
    const walkNow = performance.now()
    const walkDt = Math.min((walkNow - lastWalkTimeRef.current) / 1000, 0.1) // cap dt to avoid jumps
    lastWalkTimeRef.current = walkNow
    const walkStates = characterWalkRef.current
    const walkPositions = {}       // room-local positions for home characters
    const visitingChars = []       // characters currently visiting (need second-pass drawing)

    for (const charId of ROOMS_WITH_CHARACTERS) {
      if (!walkStates[charId]) walkStates[charId] = initCharWalkState(charId)
      const state = walkStates[charId]

      // Try visit state machine first
      const visitResult = advanceVisitState(state, charId, walkDt, slotOrder, ORIGIN_X, ORIGIN_Y)

      if (visitResult) {
        // Character is in a visit phase
        let hop = 0
        if (visitResult.isWalking) {
          const hopTime = elapsed + state.phaseOffset
          hop = Math.abs(Math.sin(hopTime * Math.PI * WALK_HOP_FREQ)) * WALK_HOP_PX
        }

        if (visitResult.inWorldSpace) {
          // Crossing between rooms: draw in world space (unclipped)
          visitingChars.push({
            charId,
            drawMode: 'world',
            worldX: visitResult.worldX,
            worldY: visitResult.worldY - hop,
            isWalking: visitResult.isWalking,
          })
          // Don't put in walkPositions (character not in home room)
          walkPositions[charId] = null
        } else if (visitResult.currentRoom) {
          // Inside neighbor room: draw clipped to neighbor's hex
          visitingChars.push({
            charId,
            drawMode: 'neighbor',
            currentRoom: visitResult.currentRoom,
            localX: visitResult.x,
            localY: visitResult.y - hop,
            isWalking: visitResult.isWalking,
          })
          walkPositions[charId] = null
        } else {
          // In home room during exit/enter phases
          walkPositions[charId] = { x: visitResult.x, y: visitResult.y - hop }
        }
      } else {
        // Normal in-room walking
        const result = advanceCharWalk(state, charId, walkDt)
        let hop = 0
        if (result.isWalking) {
          const hopTime = elapsed + state.phaseOffset
          hop = Math.abs(Math.sin(hopTime * Math.PI * WALK_HOP_FREQ)) * WALK_HOP_PX
        }
        walkPositions[charId] = { x: result.x, y: result.y - hop }
      }
    }

    // ---- RENDER ALL ROOMS BY SLOT (back-to-front: sort by row so lower rows draw on top) ----
    const drag = dragStateRef.current
    const draggedRoomId = drag.active ? drag.roomId : null

    // Build sorted render order: top rows first (background), bottom rows last (foreground)
    const dynSlots = getHexSlots(slotOrder.length)
    const renderOrder = slotOrder.map((id, idx) => ({ id, slotIdx: idx, row: dynSlots[idx]?.row ?? 0 }))
    renderOrder.sort((a, b) => a.row - b.row)

    // Helper: get room world position (handles shuffle animation + free position override)
    function getRoomWorldPos(roomId, slotIdx) {
      let posX, posY
      const shuffleAnim = shuffleAnimRef.current[roomId]
      if (shuffleAnim && now < shuffleAnim.startTime + SHUFFLE_ANIM_MS) {
        const t = (now - shuffleAnim.startTime) / SHUFFLE_ANIM_MS
        const e = easeOutCubic(t)
        posX = shuffleAnim.fromX + (shuffleAnim.toX - shuffleAnim.fromX) * e
        posY = shuffleAnim.fromY + (shuffleAnim.toY - shuffleAnim.fromY) * e
      } else {
        if (shuffleAnim) delete shuffleAnimRef.current[roomId]
        // Free position override: if user placed this room freely, use that position
        const freePos = freePositionsRef.current[roomId]
        if (freePos) {
          posX = freePos.x
          posY = freePos.y
        } else {
          const slotPos = slotWorldPos(slotIdx, ORIGIN_X, ORIGIN_Y)
          posX = slotPos.x
          posY = slotPos.y
        }
      }
      return { posX, posY }
    }

    // Collect badge draw data so we can render ALL badges in a final pass on top of everything
    const badgeQueue = []

    for (const { id: roomId, slotIdx } of renderOrder) {
      if (roomId === draggedRoomId) continue // draw dragged room last

      const meta = ROOM_META[roomId]
      if (!meta) continue
      // Ensure image entry exists (for dynamically added rooms)
      ensureRoomImages(roomId)
      const imgs = roomImages[roomId]
      if (!imgs) continue

      const { posX, posY } = getRoomWorldPos(roomId, slotIdx)

      // ---- DIM INACTIVE ROOMS (#3) ----
      const roomStatus = agentStatus?.[roomId]?.status || 'IDLE'
      const isActive = roomStatus === 'WORKING'

      // Wave blend: active rooms crossfade, inactive rooms locked on idle
      const alpha = isActive ? getWaveBlend(elapsed, slotIdx) : 1.0 // 1.0 = fully idle

      const isCtxRoom = contextMenu?.roomId === roomId
      const isHL = roomId === hover || roomId === selectedRoom || roomId === focusedRoom || isCtxRoom

      // Celebration wave offset
      let celebOffsetY = 0
      let celebGlow = 0
      if (celeb.active && sourceSlotIdx >= 0) {
        const dist = slotDistance(sourceSlotIdx, slotIdx)
        const roomDelay = dist * CELEBRATION_ROOM_DELAY_MS
        celebOffsetY = getCelebrationOffset(celebElapsed, roomDelay)
        celebGlow = getCelebrationGlow(celebElapsed, roomDelay)
      }

      // Context menu pop-out: lift + scale the room
      ctx.save()
      if (isCtxRoom) {
        const popScale = 1.08
        const centerX = posX + ROOM_SIZE / 2
        const centerY = posY + ROOM_SIZE / 2 + celebOffsetY
        ctx.translate(centerX, centerY)
        ctx.scale(popScale, popScale)
        ctx.translate(-centerX, -centerY)
        // Slight lift
        celebOffsetY -= 12
      }

      // All rooms full brightness (dimming off for now, can be a setting later)
      drawRoom(ctx, posX, posY + celebOffsetY, imgs.working, imgs.idle, imgs.character, alpha, meta.name, meta.color, isHL, cam.zoom, celebGlow, walkPositions[roomId])

      // Queue badge for deferred rendering (on top of all rooms)
      badgeQueue.push({ roomId, offsetX: posX, offsetY: posY + celebOffsetY, nameText: meta.name, nameColor: meta.color, currentZoom: cam.zoom })

      // Context menu dotted hex outline (drawn AFTER room, outside clip)
      if (isCtxRoom) {
        const S = ROOM_SIZE
        const pad = 8 // outline offset outside hex
        ctx.save()
        ctx.translate(posX, posY + celebOffsetY)
        ctx.beginPath()
        ctx.moveTo(S * 0.50, -pad)
        ctx.lineTo(S * 0.99 + pad * 0.87, S * 0.31 - pad * 0.5)
        ctx.lineTo(S * 0.99 + pad * 0.87, S * 0.72 + pad * 0.5)
        ctx.lineTo(S * 0.50, S * 0.99 + pad)
        ctx.lineTo(S * 0.01 - pad * 0.87, S * 0.72 + pad * 0.5)
        ctx.lineTo(S * 0.01 - pad * 0.87, S * 0.31 - pad * 0.5)
        ctx.closePath()
        // Animated dashed stroke
        const dashLen = 14
        const gapLen = 10
        const dashOffset = (elapsed * 40) % (dashLen + gapLen)
        ctx.setLineDash([dashLen, gapLen])
        ctx.lineDashOffset = -dashOffset
        ctx.strokeStyle = meta.color || '#60A5FA'
        ctx.lineWidth = 3
        ctx.shadowColor = meta.color || '#60A5FA'
        ctx.shadowBlur = 12
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.setLineDash([])
        ctx.restore()
      }

      ctx.restore()
    }

    // ---- SECOND PASS: DRAW VISITING CHARACTERS ----
    // These are characters outside their home room (crossing gaps or inside neighbor rooms)
    for (const vc of visitingChars) {
      const charImg = roomImages[vc.charId]?.character
      if (!charImg?.complete) continue

      const cw = charImg.naturalWidth || 100
      const ch = charImg.naturalHeight || 118
      const S = ROOM_SIZE
      const charScale = (S * 0.22) / ch
      const drawW = cw * charScale
      const drawH = ch * charScale

      if (vc.drawMode === 'world') {
        // Draw in world space, unclipped
        ctx.save()
        ctx.globalAlpha = 1.0
        ctx.drawImage(charImg, vc.worldX - drawW / 2, vc.worldY - drawH / 2, drawW, drawH)
        ctx.restore()
      } else if (vc.drawMode === 'neighbor') {
        // Draw clipped to neighbor room's hex
        const neighborSlot = slotOrder.indexOf(vc.currentRoom)
        if (neighborSlot >= 0) {
          const { posX: nPosX, posY: nPosY } = getRoomWorldPos(vc.currentRoom, neighborSlot)
          // Apply celebration offset to neighbor room position
          let nCelebOffsetY = 0
          if (celeb.active && sourceSlotIdx >= 0) {
            const dist = slotDistance(sourceSlotIdx, neighborSlot)
            const roomDelay = dist * CELEBRATION_ROOM_DELAY_MS
            nCelebOffsetY = getCelebrationOffset(celebElapsed, roomDelay)
          }
          ctx.save()
          ctx.translate(nPosX, nPosY + nCelebOffsetY)
          // Clip to neighbor's hex (tightened to match source-cropped content)
          ctx.beginPath()
          ctx.moveTo(S * 0.50, S * 0.03)
          ctx.lineTo(S * 0.97, S * 0.27)
          ctx.lineTo(S * 0.97, S * 0.76)
          ctx.lineTo(S * 0.50, S * 0.97)
          ctx.lineTo(S * 0.03, S * 0.76)
          ctx.lineTo(S * 0.03, S * 0.27)
          ctx.closePath()
          ctx.clip()
          ctx.globalAlpha = 0.85 // slightly translucent so visitors look like guests
          const chX = vc.localX - drawW / 2
          const chY = vc.localY - drawH / 2
          ctx.drawImage(charImg, chX, chY, drawW, drawH)
          ctx.restore()
        }
      }
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

        drawRoom(ctx, posX, posY + celebOffsetY, imgs.working, imgs.idle, imgs.character, alpha, meta.name, meta.color, true, cam.zoom, celebGlow, walkPositions[draggedRoomId])
        ctx.restore()

        // Queue badge for dragged room too
        badgeQueue.push({ roomId: draggedRoomId, offsetX: posX, offsetY: posY + celebOffsetY, nameText: meta.name, nameColor: meta.color, currentZoom: cam.zoom })

        // DROP INDICATOR: shown in the hex grid draw pass above (snap target diamond)
      }
    }

    // ---- FINAL PASS: DRAW ALL NAME BADGES ON TOP OF EVERYTHING ----
    for (const badge of badgeQueue) {
      const { roomId: badgeRoomId, offsetX: bx, offsetY: by, nameText, nameColor, currentZoom } = badge
      const S = ROOM_SIZE
      const baseFontSize = 17
      const invZoomScale = Math.min(3.0, Math.max(1.0, 1.0 / (currentZoom || 1)))
      const fontSize = baseFontSize * invZoomScale
      const dotSize = 7 * invZoomScale
      const pillPadH = 10 * invZoomScale
      const pillPadV = 6 * invZoomScale
      const pillRadius = 6 * invZoomScale

      ctx.save()
      ctx.translate(bx, by)

      ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`
      const tw = ctx.measureText(nameText).width
      const badgeW = tw + dotSize + pillPadH * 3 + 4 * invZoomScale
      const badgeH = fontSize + pillPadV * 2

      // Position on the right wall, pulled left and up, rotated to match isometric angle
      const wallAngle = 27 * (Math.PI / 180)
      const wallX = S * 0.72
      const wallY = S * 0.28

      ctx.save()
      ctx.translate(wallX, wallY)
      ctx.rotate(wallAngle)

      // Dark pill background
      ctx.fillStyle = 'rgba(8, 12, 24, 0.92)'
      ctx.beginPath()
      ctx.roundRect(-pillPadH, -badgeH / 2, badgeW, badgeH, pillRadius)
      ctx.fill()

      // Subtle border
      ctx.strokeStyle = `${nameColor}40`
      ctx.lineWidth = 1.2 * invZoomScale
      ctx.beginPath()
      ctx.roundRect(-pillPadH, -badgeH / 2, badgeW, badgeH, pillRadius)
      ctx.stroke()

      // Status dot
      const dotCX = dotSize / 2
      const dotCY = 0
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
      ctx.restore()

      // ---- UNREAD NOTIFICATION DOT ----
      // If this room has unread messages, draw a pulsing iOS-style badge dot at the top-right of the hex
      const unreadCount = unreadAgents?.[badgeRoomId] || 0
      if (unreadCount > 0) {
        const badgePulse = Math.sin(now / 350) * 0.35 + 0.65 // pulse between 0.30 and 1.0 -- noticeable blink
        const badgeR = 14 * invZoomScale
        // Top-right corner of the hex (near the peak of the right wall)
        const bdgX = S * 0.82
        const bdgY = S * 0.08

        ctx.save()
        ctx.translate(bx, by)
        ctx.globalAlpha = badgePulse

        // Outer glow ring
        ctx.beginPath()
        ctx.arc(bdgX, bdgY, badgeR * 1.6, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)'
        ctx.fill()

        // Solid badge circle
        ctx.beginPath()
        ctx.arc(bdgX, bdgY, badgeR, 0, Math.PI * 2)
        ctx.fillStyle = '#3B82F6'
        ctx.shadowColor = '#3B82F6'
        ctx.shadowBlur = 8 * invZoomScale
        ctx.fill()
        ctx.shadowBlur = 0

        // Count label (cap at 9+)
        const label = unreadCount > 9 ? '9+' : String(unreadCount)
        const countFontSize = Math.max(9, badgeR * 1.1)
        ctx.font = `800 ${countFontSize}px Inter, system-ui, sans-serif`
        ctx.fillStyle = '#FFFFFF'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, bdgX, bdgY)

        ctx.restore()
      }
    }

    ctx.restore() // undo pan/zoom

  }, [size, hover, selectedRoom, focusedRoom, slotOrder, agentStatus, ORIGIN_X, ORIGIN_Y, contextMenu, unreadAgents])

  // ---- HELPER: Draw one room ----
  function drawRoom(ctx, offsetX, offsetY, workImg, idleImg, charImg, alpha, nameText, nameColor, isHighlighted, currentZoom, celebGlow = 0, charWalkPos = null) {
    // Capture the current globalAlpha BEFORE saving (so dim + crossfade compound correctly)
    const parentAlpha = ctx.globalAlpha

    ctx.save()
    ctx.translate(offsetX, offsetY)

    // Hex clip path (tightened to match source-cropped content)
    ctx.beginPath()
    const S = ROOM_SIZE
    ctx.moveTo(S * 0.50, S * 0.00)
    ctx.lineTo(S * 0.99, S * 0.31)
    ctx.lineTo(S * 0.99, S * 0.72)
    ctx.lineTo(S * 0.50, S * 0.99)
    ctx.lineTo(S * 0.01, S * 0.72)
    ctx.lineTo(S * 0.01, S * 0.31)
    ctx.closePath()
    ctx.clip()

    // Crossfade blend between working and idle
    // Use 9-arg drawImage to source-crop the navy border padding. Crop coords are defined
    // in 1024px reference space and automatically scaled for 512px images (SINGLE_IMAGE_ROOMS)
    // so both sizes render identically inside the hex cell.
    const hasWorkImg = workImg?.complete
    const hasIdleImg = idleImg?.complete

    // Helper: draw a room image with source-crop normalized to 1024px reference space.
    // Rooms may be 1024x1024 OR 512x512 (SINGLE_IMAGE_ROOMS). Either way we apply the
    // same crop ratios so both render identically inside the hex cell.
    const drawRoomImage = (img, alpha) => {
      const iw = img.naturalWidth || 1024
      const ih = img.naturalHeight || 1024
      const scale = iw / 1024  // 1.0 for 1024px, 0.5 for 512px
      if (scale > 0) {
        const cx = SRC_CROP_X * scale
        const cy = SRC_CROP_Y * scale
        const cw = SRC_CROP_W * scale
        const ch = SRC_CROP_H * scale
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.drawImage(img, cx, cy, cw, ch, 0, 0, S, S)
        ctx.restore()
      }
    }

    if (hasWorkImg && hasIdleImg) {
      drawRoomImage(workImg, (1 - alpha) * parentAlpha)
      drawRoomImage(idleImg, alpha * parentAlpha)
    } else if (hasWorkImg) {
      drawRoomImage(workImg, parentAlpha)
    } else if (hasIdleImg) {
      drawRoomImage(idleImg, parentAlpha)
    } else {
      // ---- PLACEHOLDER: colored hex for project/custom rooms without images ----
      // Dark interior fill
      ctx.save()
      ctx.globalAlpha = parentAlpha
      ctx.fillStyle = '#0D1225'
      ctx.fill() // fill the existing hex clip path
      // Colored accent fill (subtle)
      ctx.fillStyle = nameColor + '30' // 30 = ~19% alpha hex
      ctx.fill()
      // Floor gradient from bottom
      const floorGrad = ctx.createLinearGradient(S * 0.5, S * 0.3, S * 0.5, S * 0.99)
      floorGrad.addColorStop(0, 'transparent')
      floorGrad.addColorStop(1, nameColor + '40')
      ctx.fillStyle = floorGrad
      ctx.fill()
      // Inner border glow
      ctx.strokeStyle = nameColor + '50'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(S * 0.50, S * 0.02)
      ctx.lineTo(S * 0.97, S * 0.30)
      ctx.lineTo(S * 0.97, S * 0.73)
      ctx.lineTo(S * 0.50, S * 0.97)
      ctx.lineTo(S * 0.03, S * 0.73)
      ctx.lineTo(S * 0.03, S * 0.30)
      ctx.closePath()
      ctx.stroke()
      // Project icon: folder shape in the center
      const iconSize = S * 0.18
      const ix = S * 0.5 - iconSize * 0.5
      const iy = S * 0.45 - iconSize * 0.5
      ctx.fillStyle = nameColor + '80'
      // Simple folder shape
      ctx.beginPath()
      ctx.moveTo(ix, iy + iconSize * 0.2)
      ctx.lineTo(ix + iconSize * 0.35, iy + iconSize * 0.2)
      ctx.lineTo(ix + iconSize * 0.42, iy)
      ctx.lineTo(ix + iconSize * 0.7, iy)
      ctx.lineTo(ix + iconSize, iy + iconSize * 0.2)
      ctx.lineTo(ix + iconSize, iy + iconSize)
      ctx.lineTo(ix, iy + iconSize)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // ---- CHARACTER LAYER (#5 + #6: walking animation, each on own timing) ----
    // charWalkPos === null means character is visiting elsewhere (don't draw here)
    // charWalkPos === undefined means no walk data (draw at fallback centered position)
    if (charImg?.complete && charWalkPos !== null) {
      ctx.save()
      ctx.globalAlpha = 1.0
      const cw = charImg.naturalWidth || 100
      const ch = charImg.naturalHeight || 118
      const charScale = (S * 0.22) / ch
      const drawW = cw * charScale
      const drawH = ch * charScale
      // Use walk position if available, otherwise fall back to centered desk position
      let chX, chY
      if (charWalkPos) {
        // charWalkPos.x/y are in 512px room-local space. Center the sprite on that point.
        chX = charWalkPos.x - drawW / 2
        chY = charWalkPos.y - drawH / 2
      } else {
        chX = (S - drawW) / 2
        chY = S * 0.55 - drawH / 2
      }
      ctx.drawImage(charImg, chX, chY, drawW, drawH)
      ctx.restore()
    }

    // Highlight: no transparency overlay (Patrik: "no wall transparency for me")

    // ---- CELEBRATION GLOW PULSE ----
    if (celebGlow > 0.01) {
      const hexAlpha = Math.round(celebGlow * 80).toString(16).padStart(2, '0')
      ctx.fillStyle = `${nameColor}${hexAlpha}`
      ctx.beginPath()
      ctx.moveTo(S * 0.50, S * 0.03)
      ctx.lineTo(S * 0.97, S * 0.27)
      ctx.lineTo(S * 0.97, S * 0.76)
      ctx.lineTo(S * 0.50, S * 0.97)
      ctx.lineTo(S * 0.03, S * 0.76)
      ctx.lineTo(S * 0.03, S * 0.27)
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore() // undo hex clip so badge renders OUTSIDE/BELOW the hex
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

  // iPad touch drag fix: register non-passive touchmove listener so e.preventDefault()
  // can block Safari scroll/zoom interference during room drag. React synthetic events
  // are passive by default and cannot call preventDefault().
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e) => {
      if (dragStateRef.current.active && dragStateRef.current.roomId) {
        e.preventDefault()
      }
    }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
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
    // Cancel any running momentum animation
    if (panRef.current.momentumFrame) {
      cancelAnimationFrame(panRef.current.momentumFrame)
      panRef.current.momentumFrame = null
    }

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

    // Prepare pan state for empty-space drag
    panRef.current = {
      active: false,
      startCamX: cam.x,
      startCamY: cam.y,
      startTouchX: e.clientX,
      startTouchY: e.clientY,
      lastTouchX: e.clientX,
      lastTouchY: e.clientY,
      lastTouchTime: performance.now(),
      velX: 0,
      velY: 0,
      momentumFrame: null,
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
    const pan = panRef.current

    if (drag.roomId && !drag.active && !pan.active) {
      const dx = e.clientX - drag.startClientX
      const dy = e.clientY - drag.startClientY
      drag.totalMovement = Math.sqrt(dx * dx + dy * dy)
      if (drag.totalMovement >= DRAG_THRESHOLD) {
        drag.active = true
        mouseDownRef.current.didDrag = true
      }
    }

    // If dragging a room: update world position freely (no slot shuffle)
    if (drag.active && drag.roomId) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const cam = cameraRef.current
        const cx = (e.clientX - rect.left - cam.x) / cam.zoom
        const cy = (e.clientY - rect.top - cam.y) / cam.zoom
        drag.worldX = cx
        drag.worldY = cy
      }
      return
    }

    // Mouse pan on empty space
    if (!drag.roomId) {
      const totalDx = e.clientX - mouseDownRef.current.startX
      const totalDy = e.clientY - mouseDownRef.current.startY
      const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy)
      if (totalDist >= DRAG_THRESHOLD) {
        if (!pan.active) {
          pan.active = true
          mouseDownRef.current.didDrag = true
          cameraAnimRef.current = null
        }
        // Track velocity for momentum
        const now = performance.now()
        const dt = now - pan.lastTouchTime
        if (dt > 0) {
          const ivx = (e.clientX - pan.lastTouchX) / dt * 16.67
          const ivy = (e.clientY - pan.lastTouchY) / dt * 16.67
          pan.velX = pan.velX * 0.2 + ivx * 0.8
          pan.velY = pan.velY * 0.2 + ivy * 0.8
        }
        pan.lastTouchX = e.clientX
        pan.lastTouchY = e.clientY
        pan.lastTouchTime = now
        // Apply pan
        cameraRef.current.x = pan.startCamX + (e.clientX - pan.startTouchX)
        cameraRef.current.y = pan.startCamY + (e.clientY - pan.startTouchY)
      }
    }
  }, [hover, setExtHover, ORIGIN_X, ORIGIN_Y, slotOrder])

  // ---- MOUSE UP ----
  const onUp = useCallback(() => {
    const drag = dragStateRef.current
    const pan = panRef.current

    if (drag.active && drag.roomId) {
      // SNAP DROP: snap to nearest hex grid cell, save that position
      const rawX = drag.worldX - drag.offsetX
      const rawY = drag.worldY - drag.offsetY
      const snapped = snapToNearestHexCell(rawX, rawY, ORIGIN_X, ORIGIN_Y)
      freePositionsRef.current = {
        ...freePositionsRef.current,
        [drag.roomId]: { x: snapped.x, y: snapped.y },
      }
      saveFreePositions(freePositionsRef.current)
      drag.active = false
      drag.roomId = null
    } else {
      drag.roomId = null
    }

    // Start momentum after mouse pan
    if (pan.active) {
      pan.active = false
      const FRICTION = 0.94
      const MIN_VELOCITY = 0.3
      if (Math.abs(pan.velX) > MIN_VELOCITY || Math.abs(pan.velY) > MIN_VELOCITY) {
        let vx = pan.velX
        let vy = pan.velY
        const applyMomentum = () => {
          vx *= FRICTION
          vy *= FRICTION
          if (Math.abs(vx) < MIN_VELOCITY && Math.abs(vy) < MIN_VELOCITY) {
            pan.momentumFrame = null
            return
          }
          cameraRef.current.x += vx
          cameraRef.current.y += vy
          pan.momentumFrame = requestAnimationFrame(applyMomentum)
        }
        pan.momentumFrame = requestAnimationFrame(applyMomentum)
      }
    }

    mouseDownRef.current.active = false
  }, [ORIGIN_X, ORIGIN_Y])

  // ---- CLICK: Focus/unfocus room + recall visiting character ----
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
      // ---- CLICK TO RECALL: if this room's character is visiting elsewhere, hustle them home ----
      const walkStates = characterWalkRef.current
      const charState = walkStates[hitRoom]
      if (charState && charState.visiting && !charState.returning) {
        charState.returning = true
        // If currently wandering, immediately trigger exit
        if (charState.visitPhase === 'wandering') {
          charState.visitPhase = 'exit_neighbor'
        }
      }

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
      const MENU_W = 180
      const MENU_H = 220
      const rawX = e.clientX - rect.left
      const rawY = e.clientY - rect.top
      setContextMenu({
        x: Math.min(rawX, rect.width - MENU_W - 16),
        y: Math.min(rawY, rect.height - MENU_H - 16),
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
    // Clear hidden rooms and reset order
    setHiddenRooms(new Set())
    saveHiddenRooms([])
    const defaultOrder = buildVisibleRoomIDs(new Set())
    setSlotOrder(defaultOrder)
    saveSlotOrder(defaultOrder)
    showToast('Room order reset to default')
    setContextMenu(null)
  }, [showToast])

  const handleViewAgent = useCallback((roomId) => {
    setFocusedRoom(roomId)
    onRoomClick?.(roomId)
    setContextMenu(null)
  }, [onRoomClick])

  // ---- HIDE ROOM ----
  const handleHideRoom = useCallback((roomId) => {
    const newHidden = new Set(hiddenRooms)
    newHidden.add(roomId)
    setHiddenRooms(newHidden)
    saveHiddenRooms([...newHidden])
    // Remove from slot order
    setSlotOrder(prev => {
      const next = prev.filter(id => id !== roomId)
      saveSlotOrder(next)
      return next
    })
    if (focusedRoom === roomId) setFocusedRoom(null)
    const meta = ROOM_META[roomId]
    showToast(`${meta?.name || roomId} hidden`)
    setContextMenu(null)
  }, [hiddenRooms, focusedRoom, showToast])

  // ---- SHOW ALL HIDDEN ROOMS ----
  const handleShowHidden = useCallback(() => {
    if (hiddenRooms.size === 0) {
      showToast('No hidden rooms')
      setContextMenu(null)
      return
    }
    // Restore all hidden rooms
    setHiddenRooms(new Set())
    saveHiddenRooms([])
    // Rebuild slot order with all rooms
    const allVisible = buildVisibleRoomIDs(new Set())
    setSlotOrder(prev => {
      const prevSet = new Set(prev)
      const newRooms = allVisible.filter(id => !prevSet.has(id))
      const next = [...prev, ...newRooms]
      saveSlotOrder(next)
      return next
    })
    showToast(`${hiddenRooms.size} room${hiddenRooms.size > 1 ? 's' : ''} restored`)
    setContextMenu(null)
  }, [hiddenRooms, showToast])

  // ---- CREATE NEW ROOM ----
  const handleCreateRoom = useCallback((name, color) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!slug) { showToast('Invalid room name'); return }
    if (slotOrder.includes(slug)) { showToast('Room already exists'); return }

    // Save to custom rooms in localStorage
    const customRooms = loadCustomRooms()
    customRooms.push({ slug, name, color, type: 'custom' })
    saveCustomRooms(customRooms)

    // Register in ROOM_META
    ROOM_META[slug] = { name: name.toUpperCase(), color, type: 'custom' }

    // Ensure image entry
    ensureRoomImages(slug)

    // Add to slot order at end
    setSlotOrder(prev => {
      const next = [...prev, slug]
      saveSlotOrder(next)
      return next
    })

    showToast(`${name} room created`)
    setShowNewRoomModal(false)
  }, [slotOrder, showToast])

  // ---- TOUCH EVENTS ----
  const onTouchStart = useCallback((e) => {
    setContextMenu(null)
    // Clear any previous long-press timer
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressFiredRef.current = false
    // Cancel any running momentum animation
    if (panRef.current.momentumFrame) {
      cancelAnimationFrame(panRef.current.momentumFrame)
      panRef.current.momentumFrame = null
    }

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

          // Start long-press timer (500ms) for context menu
          const touchClientX = t.clientX
          const touchClientY = t.clientY
          const longPressHitRoom = hitRoom
          longPressTimerRef.current = setTimeout(() => {
            // Only fire if we haven't dragged
            if (mouseDownRef.current.active && !mouseDownRef.current.didDrag) {
              longPressFiredRef.current = true
              // Pan camera to center the long-pressed room before showing menu
              setFocusedRoom(longPressHitRoom)
              const meta = ROOM_META[longPressHitRoom]
              const r = containerRef.current?.getBoundingClientRect()
              if (r) {
                const MENU_W = 180
                const MENU_H = 220
                const rawX = touchClientX - r.left
                const rawY = touchClientY - r.top
                setContextMenu({
                  x: Math.min(rawX, r.width - MENU_W - 16),
                  y: Math.min(rawY, r.height - MENU_H - 16),
                  roomId: longPressHitRoom,
                  roomName: meta?.name || longPressHitRoom,
                })
              }
            }
          }, 500)
        }

        // Always prepare pan state (used if touch moves to empty space or started on empty space)
        panRef.current = {
          active: false,
          startCamX: cam.x,
          startCamY: cam.y,
          startTouchX: t.clientX,
          startTouchY: t.clientY,
          lastTouchX: t.clientX,
          lastTouchY: t.clientY,
          lastTouchTime: performance.now(),
          velX: 0,
          velY: 0,
          momentumFrame: null,
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
    const pan = panRef.current
    const totalDx = t.clientX - mouseDownRef.current.startX
    const totalDy = t.clientY - mouseDownRef.current.startY
    const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy)

    // Room drag (shuffling rooms on the grid)
    if (drag.roomId && !drag.active && !pan.active) {
      drag.totalMovement = totalDist
      if (drag.totalMovement >= DRAG_THRESHOLD) {
        drag.active = true
        mouseDownRef.current.didDrag = true
        // Cancel long-press on drag
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current)
          longPressTimerRef.current = null
        }
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
        // FREE DRAG: no slot shuffle, room follows finger
      }
      return
    }

    // Map pan (touch drag on empty space -- Clash of Clans / Civilization feel)
    if (!drag.roomId && totalDist >= TOUCH_DRAG_THRESHOLD) {
      if (!pan.active) {
        pan.active = true
        mouseDownRef.current.didDrag = true
        // Cancel any camera animation so pan feels immediate
        cameraAnimRef.current = null
        // Cancel long-press on pan
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current)
          longPressTimerRef.current = null
        }
      }

      // Track velocity for momentum (weighted moving average)
      const now = performance.now()
      const dt = now - pan.lastTouchTime
      if (dt > 0) {
        const instantVelX = (t.clientX - pan.lastTouchX) / dt * 16.67 // normalize to ~60fps frame
        const instantVelY = (t.clientY - pan.lastTouchY) / dt * 16.67
        // Smooth velocity (80% new, 20% old) for natural feel
        pan.velX = pan.velX * 0.2 + instantVelX * 0.8
        pan.velY = pan.velY * 0.2 + instantVelY * 0.8
      }
      pan.lastTouchX = t.clientX
      pan.lastTouchY = t.clientY
      pan.lastTouchTime = now

      // Apply pan offset directly to camera
      const dx = t.clientX - pan.startTouchX
      const dy = t.clientY - pan.startTouchY
      cameraRef.current.x = pan.startCamX + dx
      cameraRef.current.y = pan.startCamY + dy
    }
  }, [ORIGIN_X, ORIGIN_Y, slotOrder])

  const onTouchEnd = useCallback((e) => {
    // Clear long-press timer on any touch end
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (e.touches.length === 0) {
      const drag = dragStateRef.current
      const pan = panRef.current

      if (drag.active && drag.roomId) {
        // SNAP DROP: snap to nearest hex grid cell
        const rawX = drag.worldX - drag.offsetX
        const rawY = drag.worldY - drag.offsetY
        const snapped = snapToNearestHexCell(rawX, rawY, ORIGIN_X, ORIGIN_Y)
        freePositionsRef.current = {
          ...freePositionsRef.current,
          [drag.roomId]: { x: snapped.x, y: snapped.y },
        }
        saveFreePositions(freePositionsRef.current)
        drag.active = false
        drag.roomId = null
      } else {
        drag.roomId = null
      }

      // Start momentum animation after map pan (Clash of Clans feel)
      if (pan.active) {
        pan.active = false
        const FRICTION = 0.94       // Deceleration factor per frame (higher = longer coast)
        const MIN_VELOCITY = 0.3    // Stop threshold
        const startVelX = pan.velX
        const startVelY = pan.velY

        if (Math.abs(startVelX) > MIN_VELOCITY || Math.abs(startVelY) > MIN_VELOCITY) {
          let vx = startVelX
          let vy = startVelY
          const applyMomentum = () => {
            vx *= FRICTION
            vy *= FRICTION
            if (Math.abs(vx) < MIN_VELOCITY && Math.abs(vy) < MIN_VELOCITY) {
              pan.momentumFrame = null
              return
            }
            cameraRef.current.x += vx
            cameraRef.current.y += vy
            pan.momentumFrame = requestAnimationFrame(applyMomentum)
          }
          pan.momentumFrame = requestAnimationFrame(applyMomentum)
        }
      }

      // Skip tap action if long-press already fired (context menu shown)
      if (!mouseDownRef.current.didDrag && !longPressFiredRef.current) {
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
      longPressFiredRef.current = false
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
        userSelect: 'none', WebkitUserSelect: 'none',
        touchAction: 'none', WebkitTouchCallout: 'none',
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
          {/* Primary room actions */}
          <ContextMenuItem
            label="Open Chat"
            icon="&#x1F4AC;"
            accent
            onClick={() => {
              onOpenChat?.(contextMenu.roomId)
              handleViewAgent(contextMenu.roomId)
            }}
          />
          <ContextMenuItem
            label="Send Message"
            icon="&#x2197;"
            onClick={() => {
              onSendMessage?.(contextMenu.roomId)
              setContextMenu(null)
            }}
          />
          <ContextMenuItem
            label="View Tasks"
            icon="&#x2713;"
            onClick={() => {
              onViewTasks?.(contextMenu.roomId)
              setContextMenu(null)
            }}
          />
          <ContextMenuItem
            label="Set as Home"
            icon="&#x2302;"
            onClick={() => {
              onSetAsHome?.(contextMenu.roomId)
              showToast(`${contextMenu.roomName} set as home`)
              setContextMenu(null)
            }}
          />
          {/* Separator */}
          <div style={{ height: 1, background: 'rgba(96, 165, 250, 0.12)', margin: '4px 0' }} />
          {/* Room management */}
          <ContextMenuItem
            label="Hide Room"
            icon="&#x2715;"
            onClick={() => handleHideRoom(contextMenu.roomId)}
          />
          {hiddenRooms.size > 0 && (
            <ContextMenuItem
              label={`Show Hidden (${hiddenRooms.size})`}
              icon="&#x25CE;"
              onClick={() => handleShowHidden()}
            />
          )}
          <ContextMenuItem
            label="Reset Room Order"
            icon="&#x2316;"
            onClick={() => handleResetOrder()}
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

      {/* ---- + NEW ROOM BUTTON ---- */}
      <div
        onClick={() => setShowNewRoomModal(true)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 50,
          width: 44,
          height: 44,
          borderRadius: 10,
          background: 'rgba(12, 16, 30, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(96, 165, 250, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 22,
          color: 'rgba(96, 165, 250, 0.8)',
          fontWeight: 300,
          transition: 'all 0.15s ease',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(96, 165, 250, 0.2)'; e.currentTarget.style.color = '#fff' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(12, 16, 30, 0.85)'; e.currentTarget.style.color = 'rgba(96, 165, 250, 0.8)' }}
        title="Create new room"
      >
        +
      </div>

      {/* ---- NEW ROOM MODAL ---- */}
      {showNewRoomModal && (
        <NewRoomModal
          onClose={() => setShowNewRoomModal(false)}
          onCreate={handleCreateRoom}
        />
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
function ContextMenuItem({ label, icon, onClick, accent = false }) {
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
        fontWeight: accent ? 600 : 500,
        color: hovered ? '#fff' : (accent ? '#60A5FA' : '#C8D6E5'),
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

// ---- NEW ROOM MODAL COMPONENT ----
const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#4CAF50', '#AB47BC',
  '#26A69A', '#78909C',
]

function NewRoomModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) onCreate(name.trim(), color)
  }

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(12, 16, 30, 0.97)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          borderRadius: 12,
          padding: 24,
          minWidth: 280,
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#EDF2FA',
          marginBottom: 16, letterSpacing: '0.02em',
        }}>
          NEW ROOM
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Room name..."
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(96, 165, 250, 0.2)',
              borderRadius: 6,
              color: '#EDF2FA',
              fontSize: 14,
              fontFamily: "'Inter', system-ui, sans-serif",
              outline: 'none',
              marginBottom: 14,
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(96, 165, 250, 0.5)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(96, 165, 250, 0.2)' }}
          />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#78716C', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Color
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESET_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28,
                    borderRadius: 6,
                    background: c,
                    cursor: 'pointer',
                    border: color === c ? '2px solid #fff' : '2px solid transparent',
                    transition: 'border-color 0.1s',
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '8px 0',
                background: 'transparent',
                border: '1px solid rgba(96, 165, 250, 0.2)',
                borderRadius: 6,
                color: '#A8A29E',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                flex: 1, padding: '8px 0',
                background: name.trim() ? color : 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: 6,
                color: name.trim() ? '#fff' : '#78716C',
                fontSize: 13, fontWeight: 700,
                cursor: name.trim() ? 'pointer' : 'default',
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: 'all 0.15s',
              }}
            >
              Create
            </button>
          </div>
        </form>
      </div>
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
