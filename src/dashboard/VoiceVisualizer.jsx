// VoiceVisualizer.jsx -- Animated waveform bars shown when agent is speaking

import { useEffect, useRef } from 'react'

const BAR_COUNT = 5
const BASE_HEIGHTS = [0.4, 0.7, 1.0, 0.7, 0.4]

export default function VoiceVisualizer({ active, color = '#60A5FA', size = 20 }) {
  const barsRef = useRef([])

  useEffect(() => {
    if (!active) return

    let frameId
    let tick = 0

    const animate = () => {
      tick += 0.18
      barsRef.current.forEach((bar, i) => {
        if (!bar) return
        const wave = Math.sin(tick + i * 0.9) * 0.5 + 0.5
        const h = Math.round((BASE_HEIGHTS[i] * 0.4 + wave * 0.6) * size)
        bar.style.height = `${h}px`
        bar.style.opacity = 0.6 + wave * 0.4
      })
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [active, size])

  // Reset to flat when inactive
  useEffect(() => {
    if (!active) {
      barsRef.current.forEach((bar, i) => {
        if (!bar) return
        bar.style.height = `${Math.round(BASE_HEIGHTS[i] * 0.25 * size)}px`
        bar.style.opacity = '0.3'
      })
    }
  }, [active, size])

  const barWidth = Math.max(2, Math.round(size / 8))
  const gap = Math.max(2, Math.round(size / 10))

  return (
    <div
      aria-label={active ? 'Agent speaking' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        height: size,
        padding: '0 2px',
      }}
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={el => { barsRef.current[i] = el }}
          style={{
            width: barWidth,
            height: Math.round(BASE_HEIGHTS[i] * 0.25 * size),
            borderRadius: barWidth,
            background: color,
            opacity: 0.3,
            transition: active ? 'none' : 'height 0.3s ease, opacity 0.3s ease',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}
