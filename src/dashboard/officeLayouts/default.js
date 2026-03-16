// Corner Office Layout: Default (Crossy Road Voxel)
// Pairs background images with room hit-target mapping.
// Swap this config = new office skin. Framework = skeleton, image = skin.
//
// Room targets are percentage-based (0-100) relative to the background image.
// Each room defines: x, y, w, h (bounding box), labelY (nameplate position),
// and clipPath (hit area shape).
//
// Clip paths:
//   DIAMOND       = standard isometric room (4-point diamond, 45-degree rotation)
//   DIAMOND_WIDE  = wide rooms like main-hall (slightly inset diamond)

export const DIAMOND_CLIP = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
export const DIAMOND_CLIP_WIDE = 'polygon(50% 5%, 95% 50%, 50% 95%, 5% 50%)'

// Two zoom presets: overview (full building) and detail (room close-up)
export const ZOOM_PRESETS = [0.7, 1.6]

// Background images: daytime and nighttime variants
export const IMAGES = {
  day: '/corner/office-full.png',
  night: '/corner/office-full-night.png',
}

// Room hit-target positions mapped to the Crossy Road voxel office image.
// Recalibrated for Crossy Road building geometry: wider rooms, isometric perspective.
// Diamond clip-paths match where rooms visually appear in isometric perspective.
export const ROOM_TARGETS = {
  // Row 0: top row, 4 rooms (back wall of building, smaller due to perspective)
  patrik:     { x: 22, y: 8,  w: 15, h: 15, labelY: 5,  clipPath: DIAMOND_CLIP },
  mom:        { x: 37, y: 8,  w: 14, h: 15, labelY: 5,  clipPath: DIAMOND_CLIP },
  alex:       { x: 51, y: 8,  w: 14, h: 15, labelY: 5,  clipPath: DIAMOND_CLIP },
  steve:      { x: 63, y: 8,  w: 15, h: 15, labelY: 5,  clipPath: DIAMOND_CLIP },
  // Row 1: steffen left, main-hall center (wide), jacob right
  steffen:    { x: 14, y: 25, w: 16, h: 17, labelY: 22, clipPath: DIAMOND_CLIP },
  'main-hall':{ x: 30, y: 25, w: 30, h: 17, labelY: 22, clipPath: DIAMOND_CLIP_WIDE },
  jacob:      { x: 58, y: 25, w: 18, h: 17, labelY: 22, clipPath: DIAMOND_CLIP },
  // Row 2: 4 rooms across lower-front (bigger due to perspective, closer to camera)
  bobby:      { x: 7,  y: 43, w: 17, h: 17, labelY: 40, clipPath: DIAMOND_CLIP },
  colton:     { x: 23, y: 43, w: 16, h: 17, labelY: 40, clipPath: DIAMOND_CLIP },
  cleo:       { x: 38, y: 43, w: 16, h: 17, labelY: 40, clipPath: DIAMOND_CLIP },
  tony:       { x: 53, y: 43, w: 18, h: 17, labelY: 40, clipPath: DIAMOND_CLIP },
  // Row 3: bottom 2 rooms (front of building, largest)
  elmo:       { x: 22, y: 62, w: 17, h: 16, labelY: 59, clipPath: DIAMOND_CLIP },
  elon:       { x: 38, y: 62, w: 17, h: 16, labelY: 59, clipPath: DIAMOND_CLIP },
}

// Wave animation order: staggered delay per room for load-in ripple effect
// Center first, then ripples outward
export const WAVE_ORDER = [
  'main-hall', // center first
  'mom', 'alex', 'steffen', 'jacob', // row 1 ripples out
  'patrik', 'steve', // corners
  'bobby', 'colton', 'cleo', 'tony', // row 2
  'elmo', 'elon', // row 3
]

// Get staggered wave delay for a room (0.06s per position in wave order)
export function getWaveDelay(roomId) {
  const idx = WAVE_ORDER.indexOf(roomId)
  return idx >= 0 ? idx * 0.06 : 0.3
}

// Full layout export: everything needed to render an office skin
const defaultLayout = {
  name: 'Crossy Road Voxel Office',
  images: IMAGES,
  zoomPresets: ZOOM_PRESETS,
  roomTargets: ROOM_TARGETS,
  waveOrder: WAVE_ORDER,
  clipPaths: { DIAMOND_CLIP, DIAMOND_CLIP_WIDE },
}

export default defaultLayout
