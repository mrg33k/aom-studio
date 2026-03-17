import React, { useRef, useEffect, useState, useMemo } from 'react'

// CrossyBackground: Crossy Road-style 3D background for the game viewport
// CSS/Canvas implementation (no Three.js deps required)
//
// DAYTIME (before 8pm AZ): Chunky green voxel grass, blue gradient sky, sunny & cheerful
// NIGHTTIME (8pm+ AZ): Dark muted grass, starry sky with moon, soft blue moonlight
//
// Renders BEHIND CanvasOffice (lower z-index). CanvasOffice sits on top with transparent bg.

// ---- GRASS CHUNK GENERATOR ----
// Pre-generate random grass block positions for the chunky voxel look
function generateGrassChunks(count, seed = 42) {
  const chunks = []
  let rng = seed
  const next = () => {
    rng = (rng * 16807 + 0) % 2147483647
    return (rng - 1) / 2147483646
  }
  for (let i = 0; i < count; i++) {
    chunks.push({
      x: next() * 100,           // % position
      y: 50 + next() * 50,       // bottom half only (grass area)
      w: 2 + next() * 4,         // chunk width %
      h: 1.5 + next() * 3,       // chunk height %
      shade: next(),              // darkness variation
      delay: next() * 2,         // animation delay
    })
  }
  return chunks
}

// Pre-generate star positions
function generateStars(count, seed = 99) {
  const stars = []
  let rng = seed
  const next = () => {
    rng = (rng * 16807 + 0) % 2147483647
    return (rng - 1) / 2147483646
  }
  for (let i = 0; i < count; i++) {
    stars.push({
      x: next() * 100,
      y: next() * 55,            // top 55% only (sky area)
      size: 1 + next() * 2.5,
      opacity: 0.3 + next() * 0.7,
      twinkleDelay: next() * 4,
      twinkleDuration: 2 + next() * 3,
    })
  }
  return stars
}

const GRASS_CHUNKS = generateGrassChunks(80)
const STARS = generateStars(120)

// ---- CROSSY ROAD GRASS EDGE ----
// Generates the chunky pixel-art grass edge between sky and ground
function GrassEdge({ isNight }) {
  const blocks = useMemo(() => {
    const b = []
    const blockWidth = 3.5 // % of viewport
    const count = Math.ceil(100 / blockWidth) + 2
    let rng = 77
    const next = () => {
      rng = (rng * 16807 + 0) % 2147483647
      return (rng - 1) / 2147483646
    }
    for (let i = 0; i < count; i++) {
      b.push({
        x: i * blockWidth,
        heightVar: next() * 3,   // slight height variation
        shade: next(),
      })
    }
    return b
  }, [])

  const baseGreen = isNight ? [30, 60, 25] : [76, 175, 80]
  const darkGreen = isNight ? [20, 45, 18] : [56, 142, 60]

  return (
    <>
      {blocks.map((block, i) => {
        const green = block.shade > 0.5 ? baseGreen : darkGreen
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${block.x}%`,
              top: `${47 - block.heightVar}%`,
              width: `${3.8}%`,
              height: `${5 + block.heightVar}%`,
              background: `rgb(${green[0]}, ${green[1]}, ${green[2]})`,
              borderTop: `2px solid rgba(${green[0] + 30}, ${green[1] + 30}, ${green[2] + 10}, 0.6)`,
              transition: 'background 2s ease, border-color 2s ease',
            }}
          />
        )
      })}
    </>
  )
}

// ---- MOON ----
function Moon() {
  return (
    <div style={{
      position: 'absolute',
      top: '8%',
      right: '15%',
      width: 60,
      height: 60,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 40% 40%, #FFF8E1, #FFE082, #FFCA28)',
      boxShadow: '0 0 40px 15px rgba(255, 236, 179, 0.25), 0 0 80px 30px rgba(255, 236, 179, 0.1)',
      transition: 'opacity 2s ease',
    }} />
  )
}

// ---- SUN GLOW (daytime ambient) ----
function SunGlow() {
  return (
    <div style={{
      position: 'absolute',
      top: '-5%',
      right: '20%',
      width: 200,
      height: 200,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,235,59,0.15) 0%, rgba(255,235,59,0.05) 40%, transparent 70%)',
      pointerEvents: 'none',
    }} />
  )
}

// ---- CLOUD (simple chunky cloud) ----
function Cloud({ x, y, scale, speed }) {
  return (
    <div style={{
      position: 'absolute',
      top: `${y}%`,
      left: `${x}%`,
      transform: `scale(${scale})`,
      animation: `crossy-cloud-drift ${speed}s linear infinite`,
      pointerEvents: 'none',
      opacity: 0.85,
    }}>
      {/* Chunky voxel cloud shape */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end' }}>
        <div style={{ width: 16, height: 12, background: 'rgba(255,255,255,0.9)', borderRadius: 3 }} />
        <div style={{ width: 20, height: 18, background: 'rgba(255,255,255,0.95)', borderRadius: 3, marginBottom: 2 }} />
        <div style={{ width: 24, height: 22, background: 'white', borderRadius: 4 }} />
        <div style={{ width: 20, height: 16, background: 'rgba(255,255,255,0.95)', borderRadius: 3, marginBottom: 1 }} />
        <div style={{ width: 14, height: 10, background: 'rgba(255,255,255,0.85)', borderRadius: 3 }} />
      </div>
    </div>
  )
}

// ---- MAIN COMPONENT ----
export default function CrossyBackground({ isNightMode }) {
  const isNight = isNightMode

  // Day colors
  const daySkyTop = '#4FC3F7'       // Bright Crossy Road blue
  const daySkyBottom = '#81D4FA'    // Lighter blue near horizon
  const dayGrass = '#66BB6A'        // Classic Crossy green
  const dayGrassLight = '#81C784'   // Lighter grass variation

  // Night colors
  const nightSkyTop = '#0A0E1A'     // Deep night
  const nightSkyBottom = '#162236'  // Slightly lighter near horizon
  const nightGrass = '#1A3318'      // Dark muted green
  const nightGrassLight = '#1E3D1C' // Slightly lighter night grass

  const skyTop = isNight ? nightSkyTop : daySkyTop
  const skyBottom = isNight ? nightSkyBottom : daySkyBottom
  const grass = isNight ? nightGrass : dayGrass
  const grassLight = isNight ? nightGrassLight : dayGrassLight

  return (
    <div
      className="crossy-background"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        transition: 'none', // children handle their own transitions
      }}
    >
      {/* Keyframes for animations */}
      <style>{`
        @keyframes crossy-twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes crossy-cloud-drift {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(100vw + 200px)); }
        }
        @keyframes crossy-grass-sway {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.05); }
        }
      `}</style>

      {/* SKY GRADIENT */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '52%',
        background: `linear-gradient(180deg, ${skyTop} 0%, ${skyBottom} 100%)`,
        transition: 'background 2s ease',
      }} />

      {/* GRASS GROUND */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '52%',
        background: `linear-gradient(180deg, ${grass} 0%, ${grassLight} 40%, ${grass} 100%)`,
        transition: 'background 2s ease',
      }} />

      {/* CHUNKY GRASS EDGE (pixel-art border between sky and ground) */}
      <GrassEdge isNight={isNight} />

      {/* GRASS CHUNKS (voxel-style variation across the ground) */}
      {GRASS_CHUNKS.map((chunk, i) => {
        const baseGreen = isNight ? [25, 55, 20] : [67, 160, 70]
        const darkGreen = isNight ? [18, 40, 15] : [56, 142, 60]
        const green = chunk.shade > 0.5 ? baseGreen : darkGreen
        return (
          <div
            key={`chunk-${i}`}
            style={{
              position: 'absolute',
              left: `${chunk.x}%`,
              top: `${chunk.y}%`,
              width: `${chunk.w}%`,
              height: `${chunk.h}%`,
              background: `rgba(${green[0]}, ${green[1]}, ${green[2]}, ${isNight ? 0.4 : 0.3})`,
              borderRadius: 2,
              transition: 'background 2s ease',
            }}
          />
        )
      })}

      {/* GRASS LINE MARKERS (Crossy Road lane dividers feel) */}
      {[55, 65, 75, 85, 92].map((y, i) => (
        <div
          key={`lane-${i}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${y}%`,
            height: 1,
            background: isNight
              ? 'rgba(100, 200, 100, 0.06)'
              : 'rgba(56, 142, 60, 0.08)',
            transition: 'background 2s ease',
          }}
        />
      ))}

      {/* DAYTIME: Sun glow + clouds */}
      {!isNight && (
        <>
          <SunGlow />
          <Cloud x={-10} y={8} scale={1.2} speed={80} />
          <Cloud x={-30} y={18} scale={0.8} speed={120} />
          <Cloud x={-60} y={5} scale={1.0} speed={100} />
          <Cloud x={-80} y={22} scale={0.6} speed={90} />
        </>
      )}

      {/* NIGHTTIME: Stars + moon + moonlight */}
      {isNight && (
        <>
          {/* Stars */}
          {STARS.map((star, i) => (
            <div
              key={`star-${i}`}
              style={{
                position: 'absolute',
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size,
                height: star.size,
                borderRadius: '50%',
                background: '#FFFFFF',
                opacity: star.opacity,
                animation: `crossy-twinkle ${star.twinkleDuration}s ease-in-out ${star.twinkleDelay}s infinite`,
                boxShadow: star.size > 2 ? '0 0 3px 1px rgba(255,255,255,0.3)' : 'none',
              }}
            />
          ))}

          {/* Moon */}
          <Moon />

          {/* Moonlight overlay: soft blue glow on grass */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '55%',
            background: 'linear-gradient(180deg, rgba(100,180,255,0.04) 0%, rgba(100,180,255,0.08) 50%, rgba(100,180,255,0.03) 100%)',
            pointerEvents: 'none',
          }} />
        </>
      )}

      {/* Subtle horizon haze (both modes) */}
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '44%',
        height: '12%',
        background: isNight
          ? 'linear-gradient(180deg, transparent 0%, rgba(20,40,60,0.3) 50%, transparent 100%)'
          : 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
        pointerEvents: 'none',
        transition: 'background 2s ease',
      }} />

      {/* Bottom gradient fade to match any UI elements below */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '8%',
        background: isNight
          ? 'linear-gradient(180deg, transparent, rgba(10,13,26,0.5))'
          : 'linear-gradient(180deg, transparent, rgba(76,175,80,0.2))',
        pointerEvents: 'none',
        transition: 'background 2s ease',
      }} />
    </div>
  )
}
