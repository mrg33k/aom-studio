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

// DONE(bobby): SWAP HITBOX COORDINATES -- Coordinates now from Steffen's room-hitbox-map.json (warm variant). Matches office-full.png daytime image.
// TODO(bobby): PLAYWRIGHT HITBOX GROUND TRUTH -- Coordinates are Steffen's manual estimates. VERIFY by opening localhost in Playwright, clicking CENTER of each room at BOTH zoom levels (0.7 + 1.6), logging actual pixel coords, converting to percentages. If any room click opens the wrong agent panel, adjust coordinates. Real clicks = only truth. Ref: Patrik + Elon line 213.
// TODO(bobby): NIGHT HITBOX VARIANT -- Current coordinates are for office-full.png (warm/daytime). Night image (office-full-night.png) has DIFFERENT building scale/position per Steffen's analysis. Need separate ROOM_TARGETS_NIGHT and switch based on isNightMode. See room-hitbox-map.json "night" section.
// Room hit-target positions mapped to the Crossy Road voxel office image.
// Coordinates from Steffen's room-hitbox-map.json (warm variant, matches office-full.png).
// Diamond clip-paths match where rooms visually appear in isometric perspective.
export const ROOM_TARGETS = {
  // Row 0: top row, 4 rooms (back wall of building, smaller due to perspective)
  patrik:     { x: 28, y: 17, w: 18, h: 10, labelY: 14, clipPath: DIAMOND_CLIP },
  mom:        { x: 37, y: 18, w: 18, h: 10, labelY: 15, clipPath: DIAMOND_CLIP },
  alex:       { x: 46, y: 19, w: 18, h: 10, labelY: 16, clipPath: DIAMOND_CLIP },
  steve:      { x: 55, y: 20, w: 18, h: 10, labelY: 17, clipPath: DIAMOND_CLIP },
  // Row 1: steffen left, main-hall center (wide), jacob right
  steffen:    { x: 14, y: 27, w: 20, h: 12, labelY: 24, clipPath: DIAMOND_CLIP },
  'main-hall':{ x: 28, y: 29, w: 30, h: 15, labelY: 26, clipPath: DIAMOND_CLIP_WIDE },
  jacob:      { x: 54, y: 31, w: 22, h: 12, labelY: 28, clipPath: DIAMOND_CLIP },
  // Row 2: 4 rooms across lower-front (bigger due to perspective, closer to camera)
  bobby:      { x: 4,  y: 42, w: 22, h: 16, labelY: 39, clipPath: DIAMOND_CLIP },
  colton:     { x: 18, y: 44, w: 22, h: 16, labelY: 41, clipPath: DIAMOND_CLIP },
  cleo:       { x: 32, y: 46, w: 22, h: 16, labelY: 43, clipPath: DIAMOND_CLIP },
  tony:       { x: 46, y: 48, w: 24, h: 16, labelY: 45, clipPath: DIAMOND_CLIP },
  // Row 3: bottom 2 rooms (front of building, largest)
  elmo:       { x: 22, y: 58, w: 26, h: 16, labelY: 55, clipPath: DIAMOND_CLIP },
  elon:       { x: 40, y: 60, w: 28, h: 16, labelY: 57, clipPath: DIAMOND_CLIP },
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
