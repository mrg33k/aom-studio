import React, { useRef, useEffect, useState, useCallback } from 'react'

// Canvas 2D layered room renderer.
// Composites multi-layer 512x512 RGBA PNGs in z-order onto a single Canvas.
// Supports: layered room assets (Steffen), production furniture sprites,
// alpha-channel click detection via off-screen hit canvas, hover glow,
// DPR-aware rendering for sharp output on Retina displays.
//
// FILE OWNER: Bobby (Canvas team). Bobby2 (HUD team) does NOT touch this file.
//
// Phase 2 POC: Elon's server room only. Extends to all rooms via same pattern.
//
// ========== PATRIK DIRECTIVES (Pass 25, lines 255-265) ==========
// TODO(bobby): ELON CHARACTER WALKING -- Elon's character must WALK AROUND his room. Not static placement. Pathfinding within room bounds. Idle = wander. Working = at desk. This is the GATE to scaling: "When Elon walks in his server room and it feels like a game, THEN we add room 2." Full checklist before scaling: (1) Room bg right, (2) Furniture sprites right (reskin until style nailed), (3) Click perfect, (4) Hover feels right, (5) Depth looks right, (6) Character placed correctly, (7) Character WALKS AROUND. Ref: Patrik directive line 265.
// TODO(bobby): CHARACTER ANIMATION ON CANVAS -- Elon's sprite must bounce/hop/animate INSIDE the Canvas room, not as a DOM overlay. The character is a Canvas-rendered sprite with idle bounce, walk cycle, and state transitions. CharacterAnimations.jsx patterns need to work on Canvas 2D context (drawImage with frame offsets, not CSS transforms). Ref: Patrik feedback line 256.
// TODO(bobby): ROOM DEPTH WAVE ON CANVAS -- Room itself must have depth wave effect. Not global float. Depth INTO the room with subtle parallax between layers (background vs furniture vs character). Each layer shifts slightly on hover or breathing cycle. Domino wave across rooms (future, when multi-room). Ref: Patrik feedback line 256.
// TODO(bobby): FURNITURE SPRITE RESKIN -- Current Elon room sprites may not match the target style. Reskin until they look RIGHT. Work with Steffen to iterate on sprite style. Do not move to room 2 until room 1 style is nailed. Ref: Patrik directive line 264.
// ==========

const CANVAS_SIZE = 512

// Production furniture sprites: 256x256 RGB with dark backgrounds.
// Rendered with 'lighten' blend mode to composite dark-bg sprites
// over the room background without clipping artifacts.
const PRODUCTION_FURNITURE = {
  elon: [
    {
      id: 'prod-server-rack',
      file: '/corner/furniture/server-rack.png',
      x: 285, y: 80,
      w: 155, h: 155,
      zIndex: 10,
    },
    {
      id: 'prod-desk',
      file: '/corner/furniture/desk-standard.png',
      x: 105, y: 295,
      w: 145, h: 105,
      zIndex: 12,
    },
    {
      id: 'prod-monitor',
      file: '/corner/furniture/monitor-single.png',
      x: 140, y: 215,
      w: 95, h: 95,
      zIndex: 14,
    },
    {
      id: 'prod-chair',
      file: '/corner/furniture/chair-office.png',
      x: 195, y: 335,
      w: 95, h: 95,
      zIndex: 16,
    },
  ],
}

const ROOM_LAYERS = {
  elon: {
    basePath: '/corner/rooms/elon-layered',
    canvasSize: CANVAS_SIZE,
    // Layers sorted by zIndex (ascending = drawn first = behind)
    layers: [
      { id: 'room-background', file: 'room-background.png', zIndex: 0, type: 'background' },
      { id: 'server-rack', file: 'server-rack.png', zIndex: 10, type: 'furniture' },
      { id: 'desk', file: 'desk.png', zIndex: 12, type: 'furniture' },
      { id: 'monitor', file: 'monitor.png', zIndex: 14, type: 'furniture' },
      { id: 'chair', file: 'chair.png', zIndex: 16, type: 'furniture' },
      { id: 'elon-sprite', file: 'elon-sprite.png', zIndex: 20, type: 'character' },
    ],
    // Agent glow color (Elon = green)
    glowColor: 'rgba(76, 175, 80, 0.04)',
    glowColorActive: 'rgba(76, 175, 80, 0.08)',
    hoverGlowColor: 'rgba(76, 175, 80, 0.12)',
  },
}

// Preload all images for a room (layered + optional production furniture)
function useImagePreloader(roomId, useProductionFurniture = false) {
  const [images, setImages] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const config = ROOM_LAYERS[roomId]
    if (!config) return

    let cancelled = false
    const imgMap = {}
    let loadCount = 0

    const toLoad = []

    // Layered room assets (512x512 RGBA)
    config.layers.forEach(layer => {
      toLoad.push({ id: layer.id, src: `${config.basePath}/${layer.file}` })
    })

    // Production furniture sprites (256x256 RGB) when enabled
    if (useProductionFurniture && PRODUCTION_FURNITURE[roomId]) {
      PRODUCTION_FURNITURE[roomId].forEach(item => {
        toLoad.push({ id: item.id, src: item.file })
      })
    }

    const total = toLoad.length

    toLoad.forEach(item => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        imgMap[item.id] = img
        loadCount++
        if (loadCount === total && !cancelled) {
          setImages(imgMap)
          setLoaded(true)
        }
      }
      img.onerror = () => {
        console.warn(`[CanvasRoom] Failed to load: ${item.src}`)
        loadCount++
        if (loadCount === total && !cancelled) {
          setImages(imgMap)
          setLoaded(true)
        }
      }
      img.src = item.src
    })

    return () => { cancelled = true }
  }, [roomId, useProductionFurniture])

  return { images, loaded }
}

export default function CanvasRoom({
  roomId = 'elon',
  isActive = false,
  isHovered = false,
  useProductionFurniture = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  style = {},
}) {
  const canvasRef = useRef(null)
  const hitCanvasRef = useRef(null) // Off-screen canvas for alpha hit-testing
  const containerRef = useRef(null)
  const { images, loaded } = useImagePreloader(roomId, useProductionFurniture)
  const config = ROOM_LAYERS[roomId]
  const [internalHover, setInternalHover] = useState(false)
  const hovered = isHovered || internalHover

  // Draw the composited room onto the visible canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !config) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = config.canvasSize
    const dpr = window.devicePixelRatio || 1

    // DPR-aware sizing for sharp rendering on Retina
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Clear
    ctx.clearRect(0, 0, size, size)

    // Pixelated rendering for pixel art
    ctx.imageSmoothingEnabled = false

    // Draw each layered asset in z-order
    config.layers.forEach(layer => {
      const img = images[layer.id]
      if (!img) return
      ctx.drawImage(img, 0, 0, size, size)
    })

    // Draw production furniture on top if enabled
    if (useProductionFurniture && PRODUCTION_FURNITURE[roomId]) {
      PRODUCTION_FURNITURE[roomId].forEach(item => {
        const img = images[item.id]
        if (!img) return
        ctx.save()
        // Production sprites are RGB on dark bg.
        // 'lighten' blend keeps bright pixels, hides dark background.
        ctx.globalCompositeOperation = 'lighten'
        ctx.globalAlpha = 0.85
        ctx.drawImage(img, item.x, item.y, item.w, item.h)
        ctx.restore()
      })
    }

    // Agent glow overlay (radial gradient)
    const glowColor = hovered
      ? config.hoverGlowColor
      : isActive
        ? config.glowColorActive
        : config.glowColor

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    )
    gradient.addColorStop(0, glowColor)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    // Hover glow: bright edge highlight
    if (hovered) {
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      const edgeGlow = ctx.createRadialGradient(
        size / 2, size / 2, size * 0.3,
        size / 2, size / 2, size * 0.5
      )
      edgeGlow.addColorStop(0, 'transparent')
      edgeGlow.addColorStop(0.7, 'rgba(76, 175, 80, 0.06)')
      edgeGlow.addColorStop(1, 'rgba(76, 175, 80, 0.15)')
      ctx.fillStyle = edgeGlow
      ctx.fillRect(0, 0, size, size)
      ctx.restore()
    }

    // Build off-screen hit-test canvas: clean composite without glow
    // so alpha detection works accurately on the actual room shape
    if (!hitCanvasRef.current) {
      hitCanvasRef.current = document.createElement('canvas')
    }
    const hitCanvas = hitCanvasRef.current
    hitCanvas.width = size
    hitCanvas.height = size
    const hitCtx = hitCanvas.getContext('2d')
    hitCtx.clearRect(0, 0, size, size)
    hitCtx.imageSmoothingEnabled = false

    config.layers.forEach(layer => {
      const img = images[layer.id]
      if (!img) return
      hitCtx.drawImage(img, 0, 0, size, size)
    })

    // Production furniture also counts for hit testing
    if (useProductionFurniture && PRODUCTION_FURNITURE[roomId]) {
      PRODUCTION_FURNITURE[roomId].forEach(item => {
        const img = images[item.id]
        if (!img) return
        hitCtx.drawImage(img, item.x, item.y, item.w, item.h)
      })
    }
  }, [images, config, isActive, hovered, useProductionFurniture, roomId])

  // Re-draw when state changes
  useEffect(() => {
    if (!loaded) return
    draw()
  }, [loaded, draw])

  // Alpha-channel hit test using the off-screen canvas (no glow artifacts)
  const hitTest = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    const hitCanvas = hitCanvasRef.current
    if (!canvas || !hitCanvas || !config) return false

    const rect = canvas.getBoundingClientRect()
    const scaleX = config.canvasSize / rect.width
    const scaleY = config.canvasSize / rect.height
    const x = Math.floor((clientX - rect.left) * scaleX)
    const y = Math.floor((clientY - rect.top) * scaleY)

    if (x < 0 || x >= config.canvasSize || y < 0 || y >= config.canvasSize) return false

    const hitCtx = hitCanvas.getContext('2d')
    if (!hitCtx) return false
    const pixel = hitCtx.getImageData(x, y, 1, 1).data
    // Alpha > 20 = visible pixel (filters out anti-aliased fringe)
    return pixel[3] > 20
  }, [config])

  // Click detection: alpha-channel aware
  const handleClick = useCallback((e) => {
    if (hitTest(e.clientX, e.clientY)) {
      const rect = canvasRef.current.getBoundingClientRect()
      onClick?.(roomId, {
        x: Math.floor((e.clientX - rect.left) * (config.canvasSize / rect.width)),
        y: Math.floor((e.clientY - rect.top) * (config.canvasSize / rect.height)),
      })
    }
  }, [hitTest, onClick, roomId, config])

  // Mouse move: alpha-aware hover
  const handleMouseMove = useCallback((e) => {
    const overRoom = hitTest(e.clientX, e.clientY)
    if (overRoom !== internalHover) {
      setInternalHover(overRoom)
    }
  }, [hitTest, internalHover])

  const handleMouseLeaveInternal = useCallback(() => {
    setInternalHover(false)
    onMouseLeave?.()
  }, [onMouseLeave])

  if (!config) return null

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: hovered ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={handleMouseLeaveInternal}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          imageRendering: 'pixelated',
          transition: 'none',
          filter: hovered
            ? 'brightness(1.1) drop-shadow(0 0 12px rgba(76,175,80,0.3))'
            : isActive
              ? 'brightness(1.05)'
              : 'none',
        }}
      />
      {/* Loading state */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(13, 13, 26, 0.8)',
          borderRadius: 8,
        }}>
          <div style={{
            width: 24, height: 24,
            border: '2px solid rgba(76,175,80,0.3)',
            borderTop: '2px solid #4CAF50',
            borderRadius: '50%',
            animation: 'canvasRoomSpin 0.8s linear infinite',
          }} />
        </div>
      )}
    </div>
  )
}

// Inline keyframes for the spinner
if (typeof document !== 'undefined') {
  const styleId = 'canvas-room-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes canvasRoomSpin {
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(style)
  }
}

export { ROOM_LAYERS, PRODUCTION_FURNITURE }
