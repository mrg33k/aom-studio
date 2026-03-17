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
function createWaterfall(x, y, z, count = 40) {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const velocities = []

  for (let i = 0; i < count; i++) {
    positions[i * 3] = x + (Math.random() - 0.5) * 3
    positions[i * 3 + 1] = y - Math.random() * 30
    positions[i * 3 + 2] = z + (Math.random() - 0.5) * 3
    velocities.push({
      vy: -0.15 - Math.random() * 0.1,
      resetY: y,
      bottomY: y - 35,
    })
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color: 0x4488CC,
    size: 1.2,
    transparent: true,
    opacity: 0.7,
  })

  const points = new THREE.Points(geo, mat)
  points.userData.velocities = velocities
  points.userData.particleCount = count
  return points
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
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1200
    )
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    scene.fog = new THREE.FogExp2(colors.nightFog.clone(), 0.0015)
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
    const islandW = 110  // width (x)
    const islandD = 80   // depth (z)
    const grassThick = 4
    const dirtThick = 10
    const rockThick = 14

    // ---- GRASS LAYER (top) ----
    const grassTopGeo = new THREE.BoxGeometry(islandW, grassThick, islandD)
    // Custom vertex colors: green top, darker sides
    const grassMat = voxelMat(0x7EC850)
    const grassTop = new THREE.Mesh(grassTopGeo, grassMat)
    grassTop.position.set(0, 0, 0)
    grassTop.receiveShadow = true
    grassTop.castShadow = true
    islandGroup.add(grassTop)

    // Grass edge trim (slightly overlapping to create a lip)
    const grassEdgeMat = voxelMat(0x5EA040)
    // Front edge
    const frontEdgeGeo = new THREE.BoxGeometry(islandW + 2, 2, 2)
    const frontEdge = new THREE.Mesh(frontEdgeGeo, grassEdgeMat)
    frontEdge.position.set(0, -1, islandD / 2)
    islandGroup.add(frontEdge)
    // Back edge
    const backEdge = new THREE.Mesh(frontEdgeGeo, grassEdgeMat)
    backEdge.position.set(0, -1, -islandD / 2)
    islandGroup.add(backEdge)
    // Left edge
    const sideEdgeGeo = new THREE.BoxGeometry(2, 2, islandD + 2)
    const leftEdge = new THREE.Mesh(sideEdgeGeo, grassEdgeMat)
    leftEdge.position.set(-islandW / 2, -1, 0)
    islandGroup.add(leftEdge)
    // Right edge
    const rightEdge = new THREE.Mesh(sideEdgeGeo, grassEdgeMat)
    rightEdge.position.set(islandW / 2, -1, 0)
    islandGroup.add(rightEdge)

    // ---- DIRT LAYER (middle, slightly tapered) ----
    const dirtTaper = 4
    const dirtW = islandW - dirtTaper
    const dirtD = islandD - dirtTaper
    const dirtGeo = new THREE.BoxGeometry(dirtW, dirtThick, dirtD)
    const dirtMat = voxelMat(0x8B6842)
    const dirt = new THREE.Mesh(dirtGeo, dirtMat)
    dirt.position.set(0, -(grassThick / 2 + dirtThick / 2), 0)
    dirt.castShadow = true
    islandGroup.add(dirt)

    // Dirt side accents (darker brown strips)
    const dirtDarkMat = voxelMat(0x6B4E32)
    // Random dirt chunks on sides for texture
    for (let i = 0; i < 12; i++) {
      const chunkW = 3 + Math.random() * 8
      const chunkH = 2 + Math.random() * 4
      const chunkD = 3 + Math.random() * 8
      const chunkGeo = new THREE.BoxGeometry(chunkW, chunkH, chunkD)
      const chunk = new THREE.Mesh(chunkGeo, Math.random() > 0.5 ? dirtDarkMat : dirtMat)
      const side = Math.floor(Math.random() * 4)
      const yPos = -(grassThick / 2 + Math.random() * dirtThick)
      if (side === 0) chunk.position.set((Math.random() - 0.5) * dirtW, yPos, dirtD / 2 + chunkD / 4)
      else if (side === 1) chunk.position.set((Math.random() - 0.5) * dirtW, yPos, -dirtD / 2 - chunkD / 4)
      else if (side === 2) chunk.position.set(-dirtW / 2 - chunkW / 4, yPos, (Math.random() - 0.5) * dirtD)
      else chunk.position.set(dirtW / 2 + chunkW / 4, yPos, (Math.random() - 0.5) * dirtD)
      chunk.castShadow = true
      islandGroup.add(chunk)
    }

    // ---- ROCK LAYER (bottom, more tapered, stalactites) ----
    const rockTaper = 16
    const rockW = islandW - dirtTaper - rockTaper
    const rockD = islandD - dirtTaper - rockTaper
    const rockGeo = new THREE.BoxGeometry(rockW, rockThick, rockD)
    const rockMat = voxelMat(0x6B6B7B)
    const rock = new THREE.Mesh(rockGeo, rockMat)
    rock.position.set(0, -(grassThick / 2 + dirtThick + rockThick / 2), 0)
    rock.castShadow = true
    islandGroup.add(rock)

    // Stalactites (random boxes hanging down)
    const stalactiteMat = voxelMat(0x4A4A5A)
    const rockBottomY = -(grassThick / 2 + dirtThick + rockThick)
    for (let i = 0; i < 18; i++) {
      const sw = 2 + Math.random() * 4
      const sh = 4 + Math.random() * 10
      const sd = 2 + Math.random() * 4
      const stalGeo = new THREE.BoxGeometry(sw, sh, sd)
      const stal = new THREE.Mesh(stalGeo, Math.random() > 0.4 ? stalactiteMat : rockMat)
      stal.position.set(
        (Math.random() - 0.5) * rockW * 0.8,
        rockBottomY - sh / 2,
        (Math.random() - 0.5) * rockD * 0.8
      )
      stal.castShadow = true
      islandGroup.add(stal)
    }

    // Tapered transition chunks (dirt to rock)
    for (let i = 0; i < 8; i++) {
      const tw = 4 + Math.random() * 6
      const th = 3 + Math.random() * 5
      const td = 4 + Math.random() * 6
      const transGeo = new THREE.BoxGeometry(tw, th, td)
      const transMat = Math.random() > 0.5 ? dirtDarkMat : rockMat
      const trans = new THREE.Mesh(transGeo, transMat)
      const angle = Math.random() * Math.PI * 2
      const radius = (rockW / 2) + Math.random() * (dirtTaper + rockTaper / 2)
      trans.position.set(
        Math.cos(angle) * radius * 0.6,
        -(grassThick / 2 + dirtThick + Math.random() * rockThick * 0.5),
        Math.sin(angle) * radius * 0.6
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

    // ---- WATERFALLS (left and right edges) ----
    const waterfallLeft = createWaterfall(-islandW / 2, -2, -25, 50)
    scene.add(waterfallLeft)
    const waterfallRight = createWaterfall(islandW / 2, -2, -25, 50)
    scene.add(waterfallRight)

    // ---- CLOUDS ----
    const clouds = []
    const cloudConfigs = [
      [-70, -10, -60, 1.2],
      [80, -5, -50, 0.9],
      [-50, 35, -80, 1.0],
      [60, 40, -70, 0.7],
      [0, -20, -30, 0.8],
      [-90, 15, -45, 1.1],
      [100, 20, -55, 0.6],
    ]
    cloudConfigs.forEach(([cx, cy, cz, cs]) => {
      const cloud = createCloud(cx, cy, cz, cs)
      scene.add(cloud)
      clouds.push(cloud)
    })

    // ---- DISTANT MOUNTAINS (background, very simple) ----
    const mountainGroup = new THREE.Group()
    const mountainMat = voxelMat(0x4A6A8A)
    const mountainMat2 = voxelMat(0x3A5A7A)
    const snowMat = voxelMat(0xE8E8F0)

    const mountainConfigs = [
      { x: -120, z: -200, w: 60, h: 50, d: 40 },
      { x: -40, z: -220, w: 80, h: 70, d: 50 },
      { x: 50, z: -210, w: 50, h: 45, d: 35 },
      { x: 130, z: -190, w: 70, h: 55, d: 45 },
      { x: -80, z: -240, w: 50, h: 40, d: 30 },
      { x: 100, z: -230, w: 60, h: 60, d: 40 },
    ]
    mountainConfigs.forEach((mc, idx) => {
      // Main mountain body
      const mGeo = new THREE.BoxGeometry(mc.w, mc.h, mc.d)
      const m = new THREE.Mesh(mGeo, idx % 2 === 0 ? mountainMat : mountainMat2)
      m.position.set(mc.x, mc.h / 2 - 30, mc.z)
      mountainGroup.add(m)

      // Peak (smaller box on top)
      const peakW = mc.w * 0.5
      const peakH = mc.h * 0.4
      const peakGeo = new THREE.BoxGeometry(peakW, peakH, mc.d * 0.5)
      const peak = new THREE.Mesh(peakGeo, idx % 2 === 0 ? mountainMat2 : mountainMat)
      peak.position.set(mc.x, mc.h - 30 + peakH / 2, mc.z)
      mountainGroup.add(peak)

      // Snow cap
      const snowH = mc.h * 0.15
      const snowGeo = new THREE.BoxGeometry(peakW * 0.7, snowH, mc.d * 0.4)
      const snow = new THREE.Mesh(snowGeo, snowMat)
      snow.position.set(mc.x, mc.h - 30 + peakH + snowH / 2, mc.z)
      mountainGroup.add(snow)
    })
    scene.add(mountainGroup)

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

      // Waterfall particles
      ;[waterfallLeft, waterfallRight].forEach((wf) => {
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

      // Camera with mouse parallax
      const targetX = mouseRef.current.x * 4
      const targetY = 50 + mouseRef.current.y * 2 + Math.sin(elapsed * 0.3) * 0.3
      const targetZ = 65 + Math.cos(elapsed * 0.15) * 1.5

      camera.position.x += (targetX - camera.position.x) * 0.02
      camera.position.y += (targetY - camera.position.y) * 0.02
      camera.position.z += (targetZ - camera.position.z) * 0.02

      camera.lookAt(0, 5, -30)

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
