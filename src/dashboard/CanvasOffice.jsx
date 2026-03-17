import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'

// CanvasOffice: ELON'S ROOM with LAYERED SPRITE SYSTEM (Steffen spec)
// Renders 8 layers from JSON sidecars: floor -> walls -> furniture -> character -> lights -> glow
//
// FILE OWNER: Bobby (Canvas team). Bobby2 (HUD team) does NOT touch this file.
//
// Layers loaded from /corner/elon-room/layers.json manifest.
// Each layer has: *-final.png (sprite) + *-final.json (position/z/size metadata)
// Character layer uses walk system (not static Steffen character sprite).
// Floor + walls + lights + glow = full 512x512 overlays.
// Furniture items (desk, rack, chair) = positioned sprites from JSON x/y.

// ---- ROOM CONFIG ----
const ROOM_SIZE = 512        // Base room size (px, scales with zoom)
const BG_COLOR = '#0A0D1A'   // Dark night background
const ELON_COLOR = '#4CAF50' // Elon's signature green
const LAYER_BASE_PATH = '/corner/elon-room'

// Walk cycle waypoints (% of room size)
const WALKABLE_POINTS = [
  { x: 0.35, y: 0.72, label: 'desk' },
  { x: 0.50, y: 0.65, label: 'center' },
  { x: 0.65, y: 0.45, label: 'servers-1' },
  { x: 0.70, y: 0.55, label: 'servers-2' },
  { x: 0.45, y: 0.55, label: 'mid' },
  { x: 0.30, y: 0.60, label: 'near-door' },
]

const WALK_SPEED = 0.08

// ---- LAYER LOADER ----
// Loads layers.json manifest, then loads all PNGs + JSON sidecars in parallel.
// Returns sorted layers array with loaded Image objects and metadata.
function useLayerLoader() {
  const [layers, setLayers] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadLayers() {
      try {
        // Load manifest
        const manifestRes = await fetch(`${LAYER_BASE_PATH}/layers.json`)
        if (!manifestRes.ok) {
          console.warn('[CanvasOffice] layers.json not found, falling back to flat image')
          // Fallback: load single room image
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            if (!cancelled) {
              setLayers([{
                id: 'room',
                img,
                meta: { name: 'room', x: 0, y: 0, z: 0, width: 512, height: 512, layer: 'background' },
              }])
              setLoaded(true)
            }
          }
          img.onerror = () => {
            if (!cancelled) setLoaded(true)
          }
          img.src = '/corner/rooms/elon-v2.png'
          return
        }

        const manifest = await manifestRes.json()
        const layerDefs = manifest.layers || []

        // Load all images + metadata in parallel
        const loadPromises = layerDefs.map(async (def) => {
          // Load metadata JSON
          let meta = { name: def.id, x: 0, y: 0, z: 0, width: 512, height: 512, layer: 'background' }
          try {
            const metaRes = await fetch(`${LAYER_BASE_PATH}/${def.meta}`)
            if (metaRes.ok) meta = await metaRes.json()
          } catch {}

          // Load image
          return new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve({ id: def.id, img, meta })
            img.onerror = () => {
              console.warn(`[CanvasOffice] Failed to load layer: ${def.src}`)
              resolve(null)
            }
            img.src = `${LAYER_BASE_PATH}/${def.src}`
          })
        })

        const results = (await Promise.all(loadPromises)).filter(Boolean)

        // Sort by z-index from metadata
        results.sort((a, b) => (a.meta.z || 0) - (b.meta.z || 0))

        if (!cancelled) {
          setLayers(results)
          setLoaded(true)
        }
      } catch (err) {
        console.error('[CanvasOffice] Layer loading failed:', err)
        if (!cancelled) setLoaded(true)
      }
    }

    loadLayers()
    return () => { cancelled = true }
  }, [])

  return { layers, loaded }
}

// ---- CHARACTER SPRITE LOADER ----
function useCharacterSprites() {
  const [sprites, setSprites] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const spriteMap = {}
    let count = 0

    const toLoad = [
      { id: 'elon-idle', src: '/corner/sprites/elon-idle.png' },
      { id: 'elon-working', src: '/corner/sprites/elon-working.png' },
      { id: 'elon-hop-ground', src: '/corner/sprites/hop/elon-hop-ground.png' },
      { id: 'elon-hop-peak', src: '/corner/sprites/hop/elon-hop-peak.png' },
      { id: 'elon-hop-landing', src: '/corner/sprites/hop/elon-hop-landing.png' },
    ]
    const total = toLoad.length

    toLoad.forEach(item => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      const done = () => {
        count++
        if (count === total && !cancelled) {
          setSprites(spriteMap)
          setLoaded(true)
        }
      }
      img.onload = () => { spriteMap[item.id] = img; done() }
      img.onerror = () => { console.warn(`[CanvasOffice] Sprite failed: ${item.src}`); done() }
      img.src = item.src
    })

    return () => { cancelled = true }
  }, [])

  return { sprites, loaded }
}

// ---- ELON WALK SYSTEM ----
function useElonWalk(isWorking) {
  const [position, setPosition] = useState({ x: 0.35, y: 0.72 })
  const [targetIdx, setTargetIdx] = useState(0)
  const [walkState, setWalkState] = useState('idle')
  const [hopFrame, setHopFrame] = useState(null)
  const [facingLeft, setFacingLeft] = useState(false)
  const lastUpdateRef = useRef(performance.now())
  const idleTimerRef = useRef(null)
  const hopTimerRef = useRef(null)
  const rafRef = useRef(null)

  const pickNewTarget = useCallback(() => {
    if (isWorking) {
      setTargetIdx(0)
      return
    }
    let next
    do {
      next = Math.floor(Math.random() * WALKABLE_POINTS.length)
    } while (next === targetIdx && WALKABLE_POINTS.length > 1)
    setTargetIdx(next)
    setWalkState('walking')
  }, [targetIdx, isWorking])

  const doHop = useCallback((onComplete) => {
    setWalkState('hop')
    setHopFrame('ground')
    hopTimerRef.current = setTimeout(() => {
      setHopFrame('peak')
      hopTimerRef.current = setTimeout(() => {
        setHopFrame('landing')
        hopTimerRef.current = setTimeout(() => {
          setHopFrame(null)
          onComplete?.()
        }, 80)
      }, 80)
    }, 80)
  }, [])

  useEffect(() => {
    const animate = (now) => {
      const dt = (now - lastUpdateRef.current) / 1000
      lastUpdateRef.current = now

      if (walkState === 'walking') {
        const target = WALKABLE_POINTS[targetIdx]
        if (!target) {
          setWalkState('idle')
          rafRef.current = requestAnimationFrame(animate)
          return
        }

        setPosition(prev => {
          const dx = target.x - prev.x
          const dy = target.y - prev.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 0.02) {
            doHop(() => {
              setWalkState('idle')
              idleTimerRef.current = setTimeout(() => {
                pickNewTarget()
              }, 1500 + Math.random() * 1500)
            })
            return { x: target.x, y: target.y }
          }

          const step = Math.min(WALK_SPEED * dt, dist)
          const nx = prev.x + (dx / dist) * step
          const ny = prev.y + (dy / dist) * step

          if (Math.abs(dx) > 0.01) {
            setFacingLeft(dx < 0)
          }

          return { x: nx, y: ny }
        })
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [walkState, targetIdx, doHop, pickNewTarget])

  useEffect(() => {
    if (isWorking) {
      setTargetIdx(0)
      setWalkState('walking')
      return
    }
    idleTimerRef.current = setTimeout(() => {
      pickNewTarget()
    }, 2000)
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (hopTimerRef.current) clearTimeout(hopTimerRef.current)
    }
  }, [isWorking]) // eslint-disable-line

  return { position, walkState, hopFrame, facingLeft }
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
  const { layers, loaded: layersLoaded } = useLayerLoader()
  const { sprites, loaded: spritesLoaded } = useCharacterSprites()
  const loaded = layersLoaded && spritesLoaded
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState(false)
  const [breathe, setBreathe] = useState(0)

  // Pan + zoom
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1.0)
  const panRef = useRef({ dragging: false, sx: 0, sy: 0, lx: 0, ly: 0, vx: 0, vy: 0, didDrag: false })
  const momRef = useRef(null)
  const ZOOM_MIN = 0.5
  const ZOOM_MAX = 3.0

  // Elon's status
  const elonStatus = agentStatus['elon']?.status || 'IDLE'
  const isElonWorking = elonStatus === 'WORKING'
  const isSelected = selectedRoom === 'elon'

  // Walk system
  const { position: elonPos, walkState, hopFrame, facingLeft } = useElonWalk(isElonWorking)

  // Separate layers into categories for rendering order
  // FIX: desk-monitor-final.png is a FULL room composite (512x512) that already
  // contains the server rack inside it. The standalone server-rack layer was
  // drawing on top, causing a double-rack. Skip server-rack when desk-monitor exists.
  // FIX: character-final.png is the new Gemini/Steffen art. When it exists,
  // the old walk sprite system must be disabled to prevent double-character.
  const layerCategories = useMemo(() => {
    const bg = []      // floor, walls (z 0-1)
    const furniture = [] // desk, rack, chair (z 5-10)
    const overlays = [] // lights, glow (z 20-25)
    const charLayer = layers.find(l => l.id === 'character')
    const hasDeskMonitor = layers.some(l => l.id === 'desk-monitor')

    for (const layer of layers) {
      if (layer.id === 'character') continue // character handled separately below
      // Skip server-rack when desk-monitor composite already contains it
      if (layer.id === 'server-rack' && hasDeskMonitor) continue
      const z = layer.meta.z || 0
      if (z <= 1) bg.push(layer)
      else if (z < 20) furniture.push(layer)
      else overlays.push(layer)
    }

    return { bg, furniture, overlays, charLayer }
  }, [layers])

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

  // Center room on mount
  useEffect(() => {
    if (size.w > 0 && size.h > 0) {
      setPan({
        x: (size.w - ROOM_SIZE * zoom) / 2,
        y: (size.h - ROOM_SIZE * zoom) / 2,
      })
    }
  }, [size.w, size.h]) // eslint-disable-line

  // Breathing animation
  useEffect(() => {
    let raf
    const start = performance.now()
    const animate = (now) => {
      const elapsed = (now - start) / 1000
      setBreathe(Math.sin(elapsed * 0.5) * 2)
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
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

    // Dark background
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, size.w, size.h)

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)
    ctx.translate(0, breathe * 0.3) // subtle depth breathing

    ctx.imageSmoothingEnabled = false

    // ---- LAYER 1: BACKGROUND LAYERS (floor, walls) ----
    for (const layer of layerCategories.bg) {
      const m = layer.meta
      ctx.drawImage(layer.img, m.x || 0, m.y || 0, m.width || ROOM_SIZE, m.height || ROOM_SIZE)
    }

    // ---- LAYER 2: FURNITURE LAYERS (desk, server-rack, chair) ----
    // Some furniture PNGs are pre-positioned on 512x512 canvas (draw full).
    // Others are actual-size sprites that need JSON x/y positioning.
    // Detect by comparing image natural size to canvas size.
    for (const layer of layerCategories.furniture) {
      const m = layer.meta
      const isFullCanvas = layer.img.naturalWidth === ROOM_SIZE && layer.img.naturalHeight === ROOM_SIZE
      if (isFullCanvas) {
        // Pre-composited on 512x512 canvas -- draw as full overlay
        ctx.drawImage(layer.img, 0, 0, ROOM_SIZE, ROOM_SIZE)
      } else {
        // Actual-size sprite -- position from JSON sidecar
        ctx.drawImage(layer.img, m.x || 0, m.y || 0, m.width || layer.img.naturalWidth, m.height || layer.img.naturalHeight)
      }
    }

    // ---- LAYER 3: CHARACTER (z ~15) ----
    // When the new character-final.png layer exists (Gemini/Steffen art),
    // draw it ONCE and skip the old walk sprite system to prevent double-character.
    // When no character layer exists, fall back to the old walk sprite system.
    // ALWAYS use the old walk sprite system for the character.
    // The Gemini character-final.png is too large (fills 512x512 canvas = giant head).
    // The walk sprites are properly sized and animated. Character layer is SKIPPED.
    {
      // Old walk sprite system (fallback when no character layer PNG exists)
      const charSize = 80
      const charX = elonPos.x * ROOM_SIZE - charSize / 2
      let charY = elonPos.y * ROOM_SIZE - charSize / 2

      // Hop frame Y offset
      let hopOffsetY = 0
      if (hopFrame === 'peak') hopOffsetY = -12
      if (hopFrame === 'landing') hopOffsetY = 3
      charY += hopOffsetY

      // Determine sprite
      let spriteKey = 'elon-idle'
      if (walkState === 'walking') spriteKey = 'elon-idle'
      if (isElonWorking && walkState === 'idle') spriteKey = 'elon-working'
      if (hopFrame === 'ground') spriteKey = 'elon-hop-ground'
      if (hopFrame === 'peak') spriteKey = 'elon-hop-peak'
      if (hopFrame === 'landing') spriteKey = 'elon-hop-landing'

      const spriteImg = sprites[spriteKey]
      if (spriteImg) {
        ctx.save()
        ctx.imageSmoothingEnabled = false

        if (facingLeft) {
          ctx.translate(charX + charSize, charY)
          ctx.scale(-1, 1)
          ctx.drawImage(spriteImg, 0, 0, charSize, charSize)
        } else {
          ctx.drawImage(spriteImg, charX, charY, charSize, charSize)
        }
        ctx.restore()

        // Shadow under character
        ctx.save()
        ctx.globalAlpha = hopFrame === 'peak' ? 0.12 : 0.25
        const shadowW = charSize * 0.6
        const shadowH = charSize * 0.12
        const shadowX = elonPos.x * ROOM_SIZE - shadowW / 2
        const shadowY = elonPos.y * ROOM_SIZE + charSize * 0.35

        ctx.beginPath()
        ctx.ellipse(shadowX + shadowW / 2, shadowY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fill()
        ctx.restore()

        // Dust on landing
        if (hopFrame === 'landing') {
          ctx.save()
          ctx.globalAlpha = 0.3
          for (let i = 0; i < 4; i++) {
            const dx = (Math.random() - 0.5) * 20
            const dy = Math.random() * 5
            ctx.beginPath()
            ctx.arc(
              elonPos.x * ROOM_SIZE + dx,
              elonPos.y * ROOM_SIZE + charSize * 0.35 + dy,
              2 + Math.random() * 2, 0, Math.PI * 2
            )
            ctx.fillStyle = 'rgba(160,180,200,0.4)'
            ctx.fill()
          }
          ctx.restore()
        }
      }
    }

    // ---- LAYER 4: OVERLAY LAYERS (lights, glow) ----
    // Both use screen blend mode. Lights at 0.6 alpha, glow at 0.4 alpha.
    // Prevents green wash while keeping ambient lighting feel.
    for (const layer of layerCategories.overlays) {
      const m = layer.meta
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      if (layer.id === 'lights') {
        ctx.globalAlpha = 0.6
      } else if (layer.id === 'glow') {
        ctx.globalAlpha = 0.4
      }
      ctx.drawImage(layer.img, m.x || 0, m.y || 0, m.width || ROOM_SIZE, m.height || ROOM_SIZE)
      ctx.restore()
    }

    // ---- INTERACTION: Hover glow ----
    if (hover) {
      ctx.save()
      ctx.globalAlpha = 0.12
      const g = ctx.createRadialGradient(
        ROOM_SIZE / 2, ROOM_SIZE / 2, 0,
        ROOM_SIZE / 2, ROOM_SIZE / 2, ROOM_SIZE * 0.45
      )
      g.addColorStop(0, ELON_COLOR)
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, ROOM_SIZE, ROOM_SIZE)
      ctx.restore()
    }

    // ---- INTERACTION: Selected border ----
    if (isSelected) {
      ctx.save()
      ctx.strokeStyle = ELON_COLOR
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6
      ctx.shadowColor = ELON_COLOR
      ctx.shadowBlur = 16
      ctx.strokeRect(2, 2, ROOM_SIZE - 4, ROOM_SIZE - 4)
      ctx.restore()
    }

    // ---- WORKING: Active pulse glow ----
    if (isElonWorking) {
      ctx.save()
      ctx.globalAlpha = 0.08
      const pg = ctx.createRadialGradient(
        ROOM_SIZE / 2, ROOM_SIZE * 0.5, 0,
        ROOM_SIZE / 2, ROOM_SIZE * 0.5, ROOM_SIZE * 0.35
      )
      pg.addColorStop(0, ELON_COLOR)
      pg.addColorStop(1, 'transparent')
      ctx.fillStyle = pg
      ctx.fillRect(0, 0, ROOM_SIZE, ROOM_SIZE)
      ctx.restore()
    }

    // ---- NAMEPLATE ----
    ctx.save()
    ctx.font = '600 14px Inter, system-ui, sans-serif'
    const nameText = 'ELON'
    const tw = ctx.measureText(nameText).width
    const npX = ROOM_SIZE * 0.5 - tw / 2 - 8
    const npY = ROOM_SIZE * 0.88

    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)'
    ctx.beginPath()
    ctx.roundRect(npX - 2, npY - 10, tw + 20, 24, 4)
    ctx.fill()

    ctx.strokeStyle = `${ELON_COLOR}55`
    ctx.lineWidth = 1
    ctx.stroke()

    const statusColor = isElonWorking ? '#22C55E' : (elonStatus === 'BLOCKED' ? '#EF4444' : '#6B7280')
    ctx.beginPath()
    ctx.arc(npX + 6, npY + 2, 4, 0, Math.PI * 2)
    ctx.fillStyle = statusColor
    ctx.fill()

    ctx.fillStyle = '#EDF2FA'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(nameText, npX + 14, npY + 2)
    ctx.restore()

    ctx.restore()

    // Ambient glow in background
    ctx.save()
    ctx.globalAlpha = 0.06
    const ambientG = ctx.createRadialGradient(
      size.w / 2, size.h / 2, 0,
      size.w / 2, size.h / 2, Math.max(size.w, size.h) * 0.4
    )
    ambientG.addColorStop(0, ELON_COLOR)
    ambientG.addColorStop(1, 'transparent')
    ctx.fillStyle = ambientG
    ctx.fillRect(0, 0, size.w, size.h)
    ctx.restore()

  }, [layers, layerCategories, sprites, size, pan, zoom, hover, isSelected, isElonWorking, elonStatus, elonPos, walkState, hopFrame, facingLeft, breathe])

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
      const isOver = cx >= 0 && cx <= ROOM_SIZE && cy >= 0 && cy <= ROOM_SIZE
      if (isOver !== hover) {
        setHover(isOver)
        setExtHover?.(isOver ? 'elon' : null)
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
  }, [pan, zoom, hover, setExtHover])

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
      const isOver = cx >= 0 && cx <= ROOM_SIZE && cy >= 0 && cy <= ROOM_SIZE
      if (isOver) {
        onRoomClick?.('elon')
      }
    }
  }, [pan, zoom, onRoomClick])

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
          if (cx >= 0 && cx <= ROOM_SIZE && cy >= 0 && cy <= ROOM_SIZE) {
            onRoomClick?.('elon')
          }
        }
      }
      panRef.current.didDrag = false
      onUp()
    }
  }, [pan, zoom, onRoomClick, onUp])

  const cursor = panRef.current.dragging ? 'grabbing' : (hover ? 'pointer' : 'grab')

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%',
        position: 'relative', overflow: 'hidden', cursor,
        background: BG_COLOR,
      }}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={() => { onUp(); setHover(false); setExtHover?.(null) }}
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
              LOADING SERVER ROOM
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
