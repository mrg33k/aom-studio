import React, { useRef, useEffect, useState, useCallback } from 'react'

// Canvas 2D layered room renderer.
// Replaces flat PNG room with composited multi-layer rendering.
// Each layer is a 512x512 transparent PNG drawn in z-order.
// Implements: Y-based z-sorting, click detection, hover glow.
//
// Phase 2 POC: Elon's server room only. Extends to all rooms via same pattern.

const ROOM_LAYERS = {
  elon: {
    basePath: '/corner/rooms/elon-layered',
    canvasSize: 512,
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

// Preload all images for a room and return them keyed by layer id
function useImagePreloader(roomId) {
  const [images, setImages] = useState({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const config = ROOM_LAYERS[roomId]
    if (!config) return

    let cancelled = false
    const imgMap = {}
    let loadCount = 0
    const total = config.layers.length

    config.layers.forEach(layer => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        imgMap[layer.id] = img
        loadCount++
        if (loadCount === total && !cancelled) {
          setImages(imgMap)
          setLoaded(true)
        }
      }
      img.onerror = () => {
        console.warn(`[CanvasRoom] Failed to load: ${config.basePath}/${layer.file}`)
        loadCount++
        if (loadCount === total && !cancelled) {
          setImages(imgMap)
          setLoaded(true)
        }
      }
      img.src = `${config.basePath}/${layer.file}`
    })

    return () => { cancelled = true }
  }, [roomId])

  return { images, loaded }
}

export default function CanvasRoom({
  roomId = 'elon',
  isActive = false,
  isHovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  style = {},
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const animFrameRef = useRef(null)
  const { images, loaded } = useImagePreloader(roomId)
  const config = ROOM_LAYERS[roomId]
  const [internalHover, setInternalHover] = useState(false)
  const hovered = isHovered || internalHover

  // Draw the composited room onto the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !config) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = config.canvasSize
    canvas.width = size
    canvas.height = size

    // Clear
    ctx.clearRect(0, 0, size, size)

    // Enable pixelated rendering for pixel art
    ctx.imageSmoothingEnabled = false

    // Draw each layer in z-order (already sorted in config)
    config.layers.forEach(layer => {
      const img = images[layer.id]
      if (!img) return
      ctx.drawImage(img, 0, 0, size, size)
    })

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
  }, [images, config, isActive, hovered])

  // Render loop: draw when state changes
  useEffect(() => {
    if (!loaded) return
    draw()
  }, [loaded, draw])

  // Click detection: check if click hits non-transparent pixels
  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = config.canvasSize / rect.width
    const scaleY = config.canvasSize / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)

    // Check if pixel at click position is non-transparent
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pixel = ctx.getImageData(x, y, 1, 1).data
    if (pixel[3] > 10) {
      // Hit a visible pixel
      onClick?.(roomId, { x, y })
    }
  }, [config, onClick, roomId])

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = config.canvasSize / rect.width
    const scaleY = config.canvasSize / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pixel = ctx.getImageData(x, y, 1, 1).data
    const overRoom = pixel[3] > 10
    if (overRoom !== internalHover) {
      setInternalHover(overRoom)
    }
  }, [config, internalHover])

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
        width={config.canvasSize}
        height={config.canvasSize}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          imageRendering: 'pixelated',
          transition: 'filter 200ms ease',
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

export { ROOM_LAYERS }
