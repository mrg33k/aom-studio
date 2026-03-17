import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'

// IslandBackground: Three.js floating island scene with day/night cycle
// The room grid sits ON a chunky voxel floating island.
// Features: grass/dirt/rock layers, voxel trees, lampposts, waterfalls,
// chunky clouds, stars, sun/moon orb, mouse-parallax camera.
//
// Renders BEHIND CanvasOffice (lower z-index). CanvasOffice sits on top with transparent bg.
// Uses real Arizona time (America/Phoenix, no DST) to determine day/night.
// Accepts isNightMode prop for external override:
//   true = force night, false = force day, undefined/null = use real time.

/**
 * Get current dayRatio (0 = full night, 1 = full day) based on Arizona time.
 */
function getArizonaDayRatio() {
  const now = new Date()
  const azString = now.toLocaleString('en-US', { timeZone: 'America/Phoenix' })
  const azDate = new Date(azString)
  const hour = azDate.getHours() + azDate.getMinutes() / 60

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }

  if (hour >= 8 && hour < 18) return 1  // Full day
  if (hour >= 6 && hour < 8) return smoothstep(6, 8, hour)  // Sunrise
  if (hour >= 18 && hour < 20) return 1 - smoothstep(18, 20, hour)  // Sunset
  return 0  // Full night
}

/**
 * Get the sun/moon arc angle based on Arizona time.
 */
function getArizonaOrbAngle() {
  const now = new Date()
  const azString = now.toLocaleString('en-US', { timeZone: 'America/Phoenix' })
  const azDate = new Date(azString)
  const hour = azDate.getHours() + azDate.getMinutes() / 60 + azDate.getSeconds() / 3600
  const fraction = (hour - 6) / 24
  return fraction * Math.PI * 2 - Math.PI / 2
}

// ---- MATERIAL FACTORY (flat shaded, Crossy Road style) ----
function voxelMat(color) {
  return new THREE.MeshLambertMaterial({ color, flatShading: true })
}

// ---- VOXEL TREE BUILDER ----
function createVoxelTree(x, y, z, scale = 1) {
  const group = new THREE.Group()
  // Trunk: 2x4x2 brown boxes
  const trunkGeo = new THREE.BoxGeometry(2 * scale, 4 * scale, 2 * scale)
  const trunk = new THREE.Mesh(trunkGeo, voxelMat(0x6B4E32))
  trunk.position.set(0, 2 * scale, 0)
  trunk.castShadow = true
  group.add(trunk)

  // Canopy: layered green boxes for chunky look
  const canopyColors = [0x5EA040, 0x7EC850]
  const canopyGeo = new THREE.BoxGeometry(5 * scale, 3 * scale, 5 * scale)
  const canopy = new THREE.Mesh(canopyGeo, voxelMat(canopyColors[0]))
  canopy.position.set(0, 5.5 * scale, 0)
  canopy.castShadow = true
  group.add(canopy)

  // Top tuft
  const topGeo = new THREE.BoxGeometry(3 * scale, 2 * scale, 3 * scale)
  const top = new THREE.Mesh(topGeo, voxelMat(canopyColors[1]))
  top.position.set(0, 7.5 * scale, 0)
  top.castShadow = true
  group.add(top)

  group.position.set(x, y, z)
  return group
}

// ---- LAMPPOST BUILDER ----
function createLamppost(x, y, z) {
  const group = new THREE.Group()

  // Pole
  const poleGeo = new THREE.BoxGeometry(0.6, 12, 0.6)
  const pole = new THREE.Mesh(poleGeo, voxelMat(0x666666))
  pole.position.set(0, 6, 0)
  pole.castShadow = true
  group.add(pole)

  // Lamp head
  const lampGeo = new THREE.BoxGeometry(2, 1.5, 2)
  const lampMat = new THREE.MeshLambertMaterial({
    color: 0xFFE4A0,
    emissive: 0xFFE4A0,
    emissiveIntensity: 0.3,
    flatShading: true,
  })
  const lamp = new THREE.Mesh(lampGeo, lampMat)
  lamp.position.set(0, 12.5, 0)
  lamp.userData.isLamp = true
  group.add(lamp)

  // Point light from lamp
  const light = new THREE.PointLight(0xFFE4A0, 0.5, 25, 1.5)
  light.position.set(0, 12, 0)
  light.userData.isLampLight = true
  group.add(light)

  group.position.set(x, y, z)
  return group
}

// ---- CLOUD BUILDER ----
function createCloud(x, y, z, scale = 1) {
  const group = new THREE.Group()
  const cloudMat = voxelMat(0xF0F0F0)

  // Center block
  const centerGeo = new THREE.BoxGeometry(8 * scale, 3 * scale, 5 * scale)
  const center = new THREE.Mesh(centerGeo, cloudMat)
  group.add(center)

  // Left bump
  const leftGeo = new THREE.BoxGeometry(4 * scale, 4 * scale, 4 * scale)
  const left = new THREE.Mesh(leftGeo, cloudMat)
  left.position.set(-3 * scale, 1 * scale, 0)
  group.add(left)

  // Right bump
  const rightGeo = new THREE.BoxGeometry(5 * scale, 5 * scale, 4 * scale)
  const right = new THREE.Mesh(rightGeo, cloudMat)
  right.position.set(3 * scale, 1.5 * scale, 0)
  group.add(right)

  group.position.set(x, y, z)
  group.userData.driftSpeed = (0.3 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1)
  group.userData.driftRange = 80 + Math.random() * 40
  group.userData.startX = x
  return group
}

// ---- WATERFALL PARTICLE SYSTEM ----
function createWaterfall(x, y, z, count = 40, dropHeight = 55) {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const velocities = []

  for (let i = 0; i < count; i++) {
    positions[i * 3] = x + (Math.random() - 0.5) * 4
    positions[i * 3 + 1] = y - Math.random() * dropHeight
    positions[i * 3 + 2] = z + (Math.random() - 0.5) * 4
    velocities.push({
      vy: -0.18 - Math.random() * 0.12,
      resetY: y,
      bottomY: y - dropHeight - 10,
    })
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color: 0x5599DD,
    size: 1.6,
    transparent: true,
    opacity: 0.8,
  })

  const points = new THREE.Points(geo, mat)
  points.userData.velocities = velocities
  points.userData.particleCount = count
  return points
}

// ---- CITY BUILDING BUILDER (with lit windows) ----
function createCityBuilding(x, z, w, h, d, colorHex) {
  const group = new THREE.Group()

  // Main building body
  const bodyGeo = new THREE.BoxGeometry(w, h, d)
  const bodyMat = voxelMat(colorHex)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.set(0, h / 2 - 30, 0)
  group.add(body)

  // Roof cap (darker)
  const roofH = h * 0.06
  const roofGeo = new THREE.BoxGeometry(w + 2, roofH, d + 2)
  const roofMat = voxelMat(0x2A3A4A)
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.set(0, h - 30 + roofH / 2, 0)
  group.add(roof)

  // Windows on front face (z + d/2)
  const windowLit = new THREE.MeshLambertMaterial({
    color: 0xFFE4A0,
    emissive: 0xFFE4A0,
    emissiveIntensity: 0.6,
    flatShading: true,
  })
  const windowDark = voxelMat(0x1A2030)
  const winW = 3
  const winH = 2.5
  const winSpacingX = winW + 2.5
  const winSpacingY = winH + 3
  const cols = Math.floor((w - 6) / winSpacingX)
  const rows = Math.floor((h - 10) / winSpacingY)
  const startX = -(cols - 1) * winSpacingX / 2
  const startY = -30 + 8

  // Seed windows deterministically based on position
  const seed = Math.abs(x * 13 + z * 7)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const winGeo = new THREE.BoxGeometry(winW, winH, 0.5)
      const isLit = ((seed + row * 7 + col * 3) % 5) !== 0 // ~80% lit
      const win = new THREE.Mesh(winGeo, isLit ? windowLit : windowDark)
      win.position.set(
        startX + col * winSpacingX,
        startY + row * winSpacingY,
        d / 2 + 0.3
      )
      if (isLit) win.userData.isWindow = true
      group.add(win)
    }
  }

  // Windows on right side face (x + w/2)
  const sideCols = Math.floor((d - 6) / winSpacingX)
  const sideStartX = -(sideCols - 1) * winSpacingX / 2
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < sideCols; col++) {
      const winGeo = new THREE.BoxGeometry(0.5, winH, winW)
      const isLit = ((seed + row * 11 + col * 5 + 1) % 4) !== 0
      const win = new THREE.Mesh(winGeo, isLit ? windowLit : windowDark)
      win.position.set(
        w / 2 + 0.3,
        startY + row * winSpacingY,
        sideStartX + col * winSpacingX
      )
      if (isLit) win.userData.isWindow = true
      group.add(win)
    }
  }

  // Windows on left side face (x - w/2)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < sideCols; col++) {
      const winGeo = new THREE.BoxGeometry(0.5, winH, winW)
      const isLit = ((seed + row * 9 + col * 4 + 2) % 5) !== 0
      const win = new THREE.Mesh(winGeo, isLit ? windowLit : windowDark)
      win.position.set(
        -w / 2 - 0.3,
        startY + row * winSpacingY,
        sideStartX + col * winSpacingX
      )
      if (isLit) win.userData.isWindow = true
      group.add(win)
    }
  }

  group.position.set(x, 0, z)
  return group
}

export default function IslandBackground({ isNightMode }) {
  const containerRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ---- COLOR PALETTE ----
    const colors = {
      nightSky: new THREE.Color(0x1a2a4a),
      daySky: new THREE.Color(0x7EC8E3),
      nightFog: new THREE.Color(0x1a2a4a),
      dayFog: new THREE.Color(0xB0DAF0),
      nightAmbient: new THREE.Color(0x3a5580),
      dayAmbient: new THREE.Color(0xffffff),
      sunLight: new THREE.Color(0xfff1b5),
      moonLight: new THREE.Color(0x94b9ff),
    }

    // ---- RENDERER ----
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      55,  // V2: slightly narrower FOV for pulled-back feel
      container.clientWidth / container.clientHeight,
      0.1,
      1500
    )
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    scene.fog = new THREE.FogExp2(colors.nightFog.clone(), 0.0012)  // V2: less dense fog for wider view
    scene.background = colors.nightSky.clone()

    // ---- LIGHTS ----
    const ambientLight = new THREE.AmbientLight(colors.nightAmbient.clone(), 0.6)
    scene.add(ambientLight)

    const celestialLight = new THREE.DirectionalLight(colors.sunLight.clone(), 1.2)
    celestialLight.position.set(60, 120, -40)
    celestialLight.castShadow = true
    celestialLight.shadow.camera.left = -120
    celestialLight.shadow.camera.right = 120
    celestialLight.shadow.camera.top = 120
    celestialLight.shadow.camera.bottom = -120
    celestialLight.shadow.mapSize.width = 2048
    celestialLight.shadow.mapSize.height = 2048
    scene.add(celestialLight)

    // Hemisphere light for natural sky/ground color bounce
    const hemiLight = new THREE.HemisphereLight(0x7EC8E3, 0x5EA040, 0.3)
    scene.add(hemiLight)

    // ---- STARS ----
    const starGeo = new THREE.BufferGeometry()
    const starCoords = []
    for (let i = 0; i < 1500; i++) {
      starCoords.push(
        (Math.random() - 0.5) * 800,
        100 + Math.random() * 400,
        (Math.random() - 0.5) * 800
      )
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.6,
      transparent: true,
      opacity: 1,
    })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ---- SUN / MOON ORB ----
    const orbGeo = new THREE.SphereGeometry(5, 16, 16)
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xfff1b5 })
    const orb = new THREE.Mesh(orbGeo, orbMat)
    scene.add(orb)

    // ==== FLOATING ISLAND ====
    const islandGroup = new THREE.Group()

    // Island dimensions - sized to frame the room grid area
    // V2: Chunkier Minecraft floating island, thicker layers, dramatic taper
    const islandW = 110  // width (x)
    const islandD = 80   // depth (z)
    const grassThick = 6
    const dirtThick = 16
    const rockThick = 22

    // ---- GRASS LAYER (top) ----
    const grassTopGeo = new THREE.BoxGeometry(islandW, grassThick, islandD)
    // Custom vertex colors: green top, darker sides
    const grassMat = voxelMat(0x7EC850)
    const grassTop = new THREE.Mesh(grassTopGeo, grassMat)
    grassTop.position.set(0, 0, 0)
    grassTop.receiveShadow = true
    grassTop.castShadow = true
    islandGroup.add(grassTop)

    // Grass edge trim (thick lip like reference image)
    const grassEdgeMat = voxelMat(0x5EA040)
    const edgeThick = 4  // V2: thicker grass edge
    // Front edge
    const frontEdgeGeo = new THREE.BoxGeometry(islandW + 4, edgeThick, 3)
    const frontEdge = new THREE.Mesh(frontEdgeGeo, grassEdgeMat)
    frontEdge.position.set(0, -edgeThick / 2 + 0.5, islandD / 2 + 0.5)
    islandGroup.add(frontEdge)
    // Back edge
    const backEdge = new THREE.Mesh(frontEdgeGeo, grassEdgeMat)
    backEdge.position.set(0, -edgeThick / 2 + 0.5, -islandD / 2 - 0.5)
    islandGroup.add(backEdge)
    // Left edge
    const sideEdgeGeo = new THREE.BoxGeometry(3, edgeThick, islandD + 4)
    const leftEdge = new THREE.Mesh(sideEdgeGeo, grassEdgeMat)
    leftEdge.position.set(-islandW / 2 - 0.5, -edgeThick / 2 + 0.5, 0)
    islandGroup.add(leftEdge)
    // Right edge
    const rightEdge = new THREE.Mesh(sideEdgeGeo, grassEdgeMat)
    rightEdge.position.set(islandW / 2 + 0.5, -edgeThick / 2 + 0.5, 0)
    islandGroup.add(rightEdge)
    // Corner blocks for chunky look
    const cornerGeo = new THREE.BoxGeometry(4, edgeThick, 4)
    const corners = [
      [-islandW / 2, islandD / 2],
      [islandW / 2, islandD / 2],
      [-islandW / 2, -islandD / 2],
      [islandW / 2, -islandD / 2],
    ]
    corners.forEach(([cx, cz]) => {
      const corner = new THREE.Mesh(cornerGeo, grassEdgeMat)
      corner.position.set(cx, -edgeThick / 2 + 0.5, cz)
      islandGroup.add(corner)
    })

    // ---- DIRT LAYER (middle, tapered like reference) ----
    const dirtTaper = 8  // V2: more visible taper
    const dirtW = islandW - dirtTaper
    const dirtD = islandD - dirtTaper
    const dirtGeo = new THREE.BoxGeometry(dirtW, dirtThick, dirtD)
    const dirtMat = voxelMat(0x8B6842)
    const dirt = new THREE.Mesh(dirtGeo, dirtMat)
    dirt.position.set(0, -(grassThick / 2 + dirtThick / 2), 0)
    dirt.castShadow = true
    islandGroup.add(dirt)

    // Secondary dirt layer (more taper, visible step)
    const dirt2W = dirtW - 6
    const dirt2D = dirtD - 6
    const dirt2Thick = 4
    const dirt2Geo = new THREE.BoxGeometry(dirt2W, dirt2Thick, dirt2D)
    const dirtMat2 = voxelMat(0x7A5A38)
    const dirt2 = new THREE.Mesh(dirt2Geo, dirtMat2)
    dirt2.position.set(0, -(grassThick / 2 + dirtThick + dirt2Thick / 2), 0)
    dirt2.castShadow = true
    islandGroup.add(dirt2)

    // Dirt side accents (darker brown strips)
    const dirtDarkMat = voxelMat(0x6B4E32)
    // V2: More dirt chunks for chunkier texture (20 instead of 12)
    for (let i = 0; i < 20; i++) {
      const chunkW = 4 + Math.random() * 10
      const chunkH = 3 + Math.random() * 6
      const chunkD = 4 + Math.random() * 10
      const chunkGeo = new THREE.BoxGeometry(chunkW, chunkH, chunkD)
      const chunk = new THREE.Mesh(chunkGeo, Math.random() > 0.5 ? dirtDarkMat : dirtMat)
      const side = Math.floor(Math.random() * 4)
      const yPos = -(grassThick / 2 + Math.random() * (dirtThick + dirt2Thick))
      if (side === 0) chunk.position.set((Math.random() - 0.5) * dirtW, yPos, dirtD / 2 + chunkD / 4)
      else if (side === 1) chunk.position.set((Math.random() - 0.5) * dirtW, yPos, -dirtD / 2 - chunkD / 4)
      else if (side === 2) chunk.position.set(-dirtW / 2 - chunkW / 4, yPos, (Math.random() - 0.5) * dirtD)
      else chunk.position.set(dirtW / 2 + chunkW / 4, yPos, (Math.random() - 0.5) * dirtD)
      chunk.castShadow = true
      islandGroup.add(chunk)
    }

    // ---- ROCK LAYER (bottom, dramatically tapered like reference) ----
    const rockTaper = 28  // V2: much more taper for dramatic underside
    const rockW = islandW - dirtTaper - rockTaper
    const rockD = islandD - dirtTaper - rockTaper
    const rockGeo = new THREE.BoxGeometry(rockW, rockThick, rockD)
    const rockMat = voxelMat(0x6B6B7B)
    const rock = new THREE.Mesh(rockGeo, rockMat)
    rock.position.set(0, -(grassThick / 2 + dirtThick + dirt2Thick + rockThick / 2), 0)
    rock.castShadow = true
    islandGroup.add(rock)

    // V2: Second rock tier (even more tapered)
    const rock2W = rockW - 20
    const rock2D = rockD - 16
    const rock2Thick = 12
    const rock2Geo = new THREE.BoxGeometry(rock2W, rock2Thick, rock2D)
    const rockMat2 = voxelMat(0x5A5A6A)
    const rock2 = new THREE.Mesh(rock2Geo, rockMat2)
    rock2.position.set(0, -(grassThick / 2 + dirtThick + dirt2Thick + rockThick + rock2Thick / 2), 0)
    rock2.castShadow = true
    islandGroup.add(rock2)

    // V2: Third rock tier (narrowest, the "point")
    const rock3W = rock2W - 16
    const rock3D = rock2D - 12
    const rock3Thick = 8
    const rock3Geo = new THREE.BoxGeometry(rock3W, rock3Thick, rock3D)
    const rockMat3 = voxelMat(0x4A4A5A)
    const rock3 = new THREE.Mesh(rock3Geo, rockMat3)
    rock3.position.set(0, -(grassThick / 2 + dirtThick + dirt2Thick + rockThick + rock2Thick + rock3Thick / 2), 0)
    rock3.castShadow = true
    islandGroup.add(rock3)

    // Stalactites (V2: more, longer, dramatic hanging chunks)
    const stalactiteMat = voxelMat(0x4A4A5A)
    const rockBottomY = -(grassThick / 2 + dirtThick + dirt2Thick + rockThick + rock2Thick + rock3Thick)
    // Large stalactites
    for (let i = 0; i < 12; i++) {
      const sw = 3 + Math.random() * 6
      const sh = 8 + Math.random() * 18
      const sd = 3 + Math.random() * 6
      const stalGeo = new THREE.BoxGeometry(sw, sh, sd)
      const stal = new THREE.Mesh(stalGeo, Math.random() > 0.4 ? stalactiteMat : rockMat2)
      stal.position.set(
        (Math.random() - 0.5) * rock2W * 0.7,
        rockBottomY - sh / 2 + 8,
        (Math.random() - 0.5) * rock2D * 0.7
      )
      stal.castShadow = true
      islandGroup.add(stal)
    }
    // Small stalactite tips
    for (let i = 0; i < 16; i++) {
      const sw = 1.5 + Math.random() * 3
      const sh = 4 + Math.random() * 12
      const sd = 1.5 + Math.random() * 3
      const stalGeo = new THREE.BoxGeometry(sw, sh, sd)
      const stal = new THREE.Mesh(stalGeo, stalactiteMat)
      stal.position.set(
        (Math.random() - 0.5) * rock3W * 1.2,
        rockBottomY - sh / 2,
        (Math.random() - 0.5) * rock3D * 1.2
      )
      stal.castShadow = true
      islandGroup.add(stal)
    }

    // Tapered transition chunks (dirt to rock, V2: more chunks)
    for (let i = 0; i < 14; i++) {
      const tw = 5 + Math.random() * 8
      const th = 4 + Math.random() * 7
      const td = 5 + Math.random() * 8
      const transGeo = new THREE.BoxGeometry(tw, th, td)
      const transMat = Math.random() > 0.5 ? dirtDarkMat : rockMat
      const trans = new THREE.Mesh(transGeo, transMat)
      const tAngle = Math.random() * Math.PI * 2
      const radius = (rockW / 2) + Math.random() * (dirtTaper + rockTaper / 2)
      trans.position.set(
        Math.cos(tAngle) * radius * 0.55,
        -(grassThick / 2 + dirtThick + dirt2Thick + Math.random() * rockThick * 0.5),
        Math.sin(tAngle) * radius * 0.55
      )
      islandGroup.add(trans)
    }

    // ---- PATHS (on grass surface) ----
    const pathMat = voxelMat(0xA0784A)
    const pathY = grassThick / 2 + 0.15 // Just above grass

    // Main cross paths
    const pathH1Geo = new THREE.BoxGeometry(islandW * 0.7, 0.3, 3)
    const pathH1 = new THREE.Mesh(pathH1Geo, pathMat)
    pathH1.position.set(0, pathY, 0)
    islandGroup.add(pathH1)

    const pathV1Geo = new THREE.BoxGeometry(3, 0.3, islandD * 0.6)
    const pathV1 = new THREE.Mesh(pathV1Geo, pathMat)
    pathV1.position.set(0, pathY, 0)
    islandGroup.add(pathV1)

    // Diagonal path segments
    const diagGeo = new THREE.BoxGeometry(18, 0.3, 3)
    const diag1 = new THREE.Mesh(diagGeo, pathMat)
    diag1.position.set(-20, pathY, -15)
    diag1.rotation.y = Math.PI / 4
    islandGroup.add(diag1)

    const diag2 = new THREE.Mesh(diagGeo, pathMat)
    diag2.position.set(20, pathY, 15)
    diag2.rotation.y = -Math.PI / 4
    islandGroup.add(diag2)

    // ---- TREES (edges only, not blocking rooms) ----
    const treePositions = [
      // Corners and edges
      [-48, grassThick / 2, -32, 1.0],
      [46, grassThick / 2, -30, 0.8],
      [-44, grassThick / 2, 28, 0.9],
      [42, grassThick / 2, 32, 1.1],
      [-50, grassThick / 2, 0, 0.7],
      [50, grassThick / 2, -10, 0.85],
    ]
    const treeMeshes = []
    treePositions.forEach(([tx, ty, tz, ts]) => {
      const tree = createVoxelTree(tx, ty, tz, ts)
      tree.userData.phase = Math.random() * Math.PI * 2
      islandGroup.add(tree)
      treeMeshes.push(tree)
    })

    // ---- LAMPPOSTS (along paths) ----
    const lampPosts = []
    const lampPositions = [
      [-25, grassThick / 2, 2],
      [25, grassThick / 2, 2],
      [0, grassThick / 2, -20],
      [0, grassThick / 2, 20],
      [-35, grassThick / 2, -18],
      [35, grassThick / 2, 18],
    ]
    lampPositions.forEach(([lx, ly, lz]) => {
      const lamp = createLamppost(lx, ly, lz)
      islandGroup.add(lamp)
      lampPosts.push(lamp)
    })

    // ---- SMALL GRASS TUFTS (decoration) ----
    const tuftMat = voxelMat(0x6DB840)
    for (let i = 0; i < 20; i++) {
      const tuftGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5)
      const tuft = new THREE.Mesh(tuftGeo, tuftMat)
      const angle = Math.random() * Math.PI * 2
      const radius = 20 + Math.random() * 28
      tuft.position.set(
        Math.cos(angle) * radius,
        grassThick / 2 + 0.5,
        Math.sin(angle) * radius
      )
      tuft.rotation.y = Math.random() * Math.PI
      islandGroup.add(tuft)
    }

    // ---- SMALL ROCKS on surface ----
    const smallRockMat = voxelMat(0x8A8A9A)
    for (let i = 0; i < 8; i++) {
      const srGeo = new THREE.BoxGeometry(1 + Math.random(), 0.8, 1 + Math.random())
      const sr = new THREE.Mesh(srGeo, smallRockMat)
      const angle = Math.random() * Math.PI * 2
      const radius = 25 + Math.random() * 25
      sr.position.set(
        Math.cos(angle) * radius,
        grassThick / 2 + 0.3,
        Math.sin(angle) * radius
      )
      sr.rotation.y = Math.random() * Math.PI
      islandGroup.add(sr)
    }

    // Position the island group so its surface aligns visually with the room grid
    // The camera looks at (0, 10, -40) from roughly (0, 50, 60)
    // Island surface should appear under the rooms in screen space
    islandGroup.position.set(0, 0, -25)
    scene.add(islandGroup)

    // ---- WATERFALLS (V2: more waterfalls, more particles, longer drop) ----
    const waterfalls = []
    // Left edge waterfall
    const waterfallLeft = createWaterfall(-islandW / 2, -2, -25, 80, 70)
    scene.add(waterfallLeft)
    waterfalls.push(waterfallLeft)
    // Right edge waterfall
    const waterfallRight = createWaterfall(islandW / 2, -2, -25, 80, 70)
    scene.add(waterfallRight)
    waterfalls.push(waterfallRight)
    // Front face waterfall (visible from camera)
    const waterfallFront = createWaterfall(15, -2, -25 + islandD / 2, 60, 65)
    scene.add(waterfallFront)
    waterfalls.push(waterfallFront)
    // Back left waterfall
    const waterfallBackLeft = createWaterfall(-30, -2, -25 - islandD / 2 + 5, 50, 60)
    scene.add(waterfallBackLeft)
    waterfalls.push(waterfallBackLeft)

    // ---- CLOUDS (V2: 18 clouds, fill the sky) ----
    const clouds = []
    const cloudConfigs = [
      // Original positions (adjusted for zoomed-out view)
      [-70, -10, -60, 1.2],
      [80, -5, -50, 0.9],
      [-50, 55, -80, 1.0],
      [60, 60, -70, 0.7],
      [0, -20, -30, 0.8],
      [-90, 25, -45, 1.1],
      [100, 30, -55, 0.6],
      // V2: Additional clouds at varying heights
      [-130, 45, -90, 1.4],      // Far left, large
      [140, 50, -85, 1.3],       // Far right, large
      [-20, 70, -100, 0.9],      // High center-left
      [30, 75, -110, 0.8],       // High center-right
      [-100, -15, -40, 0.7],     // Low left
      [110, -12, -35, 0.6],      // Low right
      [0, 85, -120, 1.1],        // Very high center
      [-60, 35, -55, 0.5],       // Small, mid-left
      [70, 40, -65, 0.5],        // Small, mid-right
      [-140, 65, -75, 1.0],      // Far upper left
      [150, 60, -80, 0.8],       // Far upper right
    ]
    cloudConfigs.forEach(([cx, cy, cz, cs]) => {
      const cloud = createCloud(cx, cy, cz, cs)
      scene.add(cloud)
      clouds.push(cloud)
    })

    // ---- DISTANT CITY BUILDINGS (background, with lit windows) ----
    const buildingGroup = new THREE.Group()
    const buildingWindowMeshes = []  // Track for day/night window toggling

    const buildingConfigs = [
      { x: -140, z: -200, w: 35, h: 80, d: 30, color: 0x3A4A5A },
      { x: -90, z: -220, w: 45, h: 110, d: 35, color: 0x4A5A6A },
      { x: -40, z: -210, w: 30, h: 65, d: 25, color: 0x3A5A7A },
      { x: 10, z: -230, w: 50, h: 130, d: 40, color: 0x4A6A8A },
      { x: 60, z: -215, w: 35, h: 90, d: 30, color: 0x3A4A5A },
      { x: 110, z: -200, w: 40, h: 75, d: 35, color: 0x4A5A6A },
      { x: 150, z: -225, w: 30, h: 100, d: 28, color: 0x3A5A7A },
      { x: -170, z: -240, w: 40, h: 60, d: 32, color: 0x4A6A8A },
      { x: 180, z: -210, w: 35, h: 55, d: 28, color: 0x3A4A5A },
    ]
    buildingConfigs.forEach((bc) => {
      const building = createCityBuilding(bc.x, bc.z, bc.w, bc.h, bc.d, bc.color)
      // Collect window meshes for animation
      building.traverse((child) => {
        if (child.userData.isWindow) {
          buildingWindowMeshes.push(child)
        }
      })
      buildingGroup.add(building)
    })
    scene.add(buildingGroup)

    // ---- ANIMATION ----
    const clock = new THREE.Clock()
    let animFrameId = null
    const tempColor1 = new THREE.Color()

    function animate() {
      animFrameId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Day/night ratio
      let dayRatio
      if (isNightMode === true) {
        dayRatio = 0
      } else if (isNightMode === false) {
        dayRatio = 1
      } else {
        dayRatio = getArizonaDayRatio()
      }

      // Sky and fog transitions
      scene.background.lerpColors(colors.nightSky, colors.daySky, dayRatio)
      scene.fog.color.lerpColors(colors.nightFog, colors.dayFog, dayRatio)
      ambientLight.color.lerpColors(colors.nightAmbient, colors.dayAmbient, dayRatio)
      celestialLight.color.lerpColors(colors.moonLight, colors.sunLight, dayRatio)

      // Light intensities
      ambientLight.intensity = 0.5 + dayRatio * 0.5
      celestialLight.intensity = 0.4 + dayRatio * 1.0

      // Hemisphere light adjusts
      hemiLight.intensity = 0.1 + dayRatio * 0.4

      // Sun/moon orb
      let angle
      if (isNightMode === true) {
        angle = Math.PI
      } else if (isNightMode === false) {
        angle = 0
      } else {
        angle = getArizonaOrbAngle()
      }

      const orbDist = 300
      orb.position.x = Math.cos(angle) * orbDist
      orb.position.y = Math.sin(angle) * orbDist
      orb.position.z = -200
      celestialLight.position.copy(orb.position)
      tempColor1.set(0xe0e0e0)
      orbMat.color.lerpColors(tempColor1, colors.sunLight, dayRatio)
      orb.scale.setScalar(dayRatio > 0.1 ? 1.2 : 0.7)

      // Stars
      starMat.opacity = Math.max(0, 1 - dayRatio * 2.5)
      stars.rotation.y += 0.0003

      // Lamppost glow (brighter at night)
      const lampEmissive = 0.1 + (1 - dayRatio) * 0.8
      const lampLightIntensity = 0.1 + (1 - dayRatio) * 1.5
      lampPosts.forEach((lp) => {
        lp.traverse((child) => {
          if (child.userData.isLamp) {
            child.material.emissiveIntensity = lampEmissive
          }
          if (child.userData.isLampLight) {
            child.intensity = lampLightIntensity
          }
        })
      })

      // Tree sway
      treeMeshes.forEach((tree) => {
        tree.rotation.z = Math.sin(elapsed * 0.5 + tree.userData.phase) * 0.015
        tree.rotation.x = Math.cos(elapsed * 0.3 + tree.userData.phase) * 0.008
      })

      // Cloud drift
      clouds.forEach((cloud) => {
        const drift = Math.sin(elapsed * 0.1 * Math.abs(cloud.userData.driftSpeed)) * cloud.userData.driftRange
        cloud.position.x = cloud.userData.startX + drift
        cloud.position.y += Math.sin(elapsed * 0.2 + cloud.userData.startX) * 0.003
      })

      // Waterfall particles (V2: all waterfalls)
      waterfalls.forEach((wf) => {
        const pos = wf.geometry.attributes.position
        const vels = wf.userData.velocities
        for (let i = 0; i < wf.userData.particleCount; i++) {
          let y = pos.getY(i)
          y += vels[i].vy
          // Add slight horizontal wobble
          let x = pos.getX(i)
          x += (Math.random() - 0.5) * 0.05
          if (y < vels[i].bottomY) {
            y = vels[i].resetY
            x = wf.position.x || pos.getX(i)
          }
          pos.setY(i, y)
          pos.setX(i, x)
        }
        pos.needsUpdate = true
      })

      // Camera with mouse parallax (V2: zoomed out ~40% for more sky)
      const targetX = mouseRef.current.x * 6
      const targetY = 75 + mouseRef.current.y * 3 + Math.sin(elapsed * 0.3) * 0.3
      const targetZ = 95 + Math.cos(elapsed * 0.15) * 1.5

      camera.position.x += (targetX - camera.position.x) * 0.02
      camera.position.y += (targetY - camera.position.y) * 0.02
      camera.position.z += (targetZ - camera.position.z) * 0.02

      camera.lookAt(0, 0, -35)

      // V2: Building window glow intensity based on day/night
      const windowGlow = 0.2 + (1 - dayRatio) * 0.8
      buildingWindowMeshes.forEach((win) => {
        if (win.material && win.material.emissiveIntensity !== undefined) {
          win.material.emissiveIntensity = windowGlow
        }
      })

      renderer.render(scene, camera)
    }

    animate()

    // ---- MOUSE TRACKING ----
    function onMouseMove(e) {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', onMouseMove)

    // ---- RESIZE ----
    function onResize() {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // ---- CLEANUP ----
    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="island-background"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  )
}
