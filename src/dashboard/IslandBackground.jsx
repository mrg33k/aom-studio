import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'

// IslandBackground: Three.js scene with day/night cycle and dense city skyline
// Rooms float directly in the scene (no island underneath).
// Features: dense city skyline, chunky clouds, stars, sun/moon orb,
// countryside ground plane far below, voxel cars, mouse-parallax camera.
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

// ---- CITY BUILDING BUILDER (with lit windows) ----
function createCityBuilding(x, z, w, h, d, colorHex) {
  const group = new THREE.Group()

  // Main building body
  const bodyGeo = new THREE.BoxGeometry(w, h, d)
  const bodyMat = voxelMat(colorHex)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.set(0, h / 2 - 95, 0)
  group.add(body)

  // Roof cap (darker)
  const roofH = h * 0.06
  const roofGeo = new THREE.BoxGeometry(w + 2, roofH, d + 2)
  const roofMat = voxelMat(0x2A3A4A)
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.set(0, h - 95 + roofH / 2, 0)
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
  const startY = -95 + 8

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

    // ---- CLOUDS (18 clouds, fill the sky) ----
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
      // Additional clouds at varying heights
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

    // ---- DENSE CITY SKYLINE (multiple rows, 28 buildings, real metropolis) ----
    const buildingGroup = new THREE.Group()
    const buildingWindowMeshes = []  // Track for day/night window toggling

    // Building color palette: grays, blues, tans, whites
    const buildingColors = [
      0x3A4A5A,  // dark steel gray
      0x4A5A6A,  // medium gray-blue
      0x3A5A7A,  // blue-gray
      0x4A6A8A,  // lighter blue
      0x5A6A7A,  // warm gray
      0x4A4A5A,  // dark gray
      0x6A7A8A,  // light steel
      0x3A3A4A,  // charcoal
      0x5A5A6A,  // medium gray
      0xC8C0B0,  // warm tan
      0xB8B0A0,  // sandstone
      0xD0D0D8,  // near white
      0xE0DDD5,  // off-white
      0x8A9AAA,  // silver blue
    ]

    const buildingConfigs = [
      // ===== ROW 1 (front row, z = -180 to -200) =====
      // Left wing
      { x: -220, z: -185, w: 30, h: 55, d: 28, color: buildingColors[0] },
      { x: -185, z: -195, w: 35, h: 90, d: 30, color: buildingColors[1] },
      { x: -148, z: -188, w: 28, h: 65, d: 25, color: buildingColors[10] },
      { x: -115, z: -192, w: 40, h: 110, d: 35, color: buildingColors[2] },
      { x: -78, z: -186, w: 32, h: 75, d: 28, color: buildingColors[3] },
      // Center cluster (tallest)
      { x: -40, z: -195, w: 45, h: 130, d: 38, color: buildingColors[4] },
      { x: 5, z: -188, w: 35, h: 100, d: 32, color: buildingColors[11] },
      { x: 42, z: -193, w: 50, h: 150, d: 40, color: buildingColors[5] },  // tallest
      { x: 88, z: -187, w: 38, h: 85, d: 30, color: buildingColors[6] },
      // Right wing
      { x: 130, z: -192, w: 32, h: 120, d: 28, color: buildingColors[2] },
      { x: 168, z: -186, w: 40, h: 70, d: 35, color: buildingColors[7] },
      { x: 210, z: -194, w: 28, h: 95, d: 25, color: buildingColors[12] },
      { x: 242, z: -189, w: 35, h: 50, d: 30, color: buildingColors[0] },

      // ===== ROW 2 (mid row, z = -220 to -245, peeking between row 1) =====
      { x: -200, z: -230, w: 38, h: 80, d: 32, color: buildingColors[8] },
      { x: -155, z: -240, w: 45, h: 140, d: 38, color: buildingColors[3] },
      { x: -105, z: -235, w: 30, h: 60, d: 26, color: buildingColors[13] },
      { x: -60, z: -242, w: 42, h: 160, d: 36, color: buildingColors[9] },  // second tallest
      { x: -15, z: -232, w: 35, h: 95, d: 30, color: buildingColors[1] },
      { x: 30, z: -245, w: 50, h: 125, d: 40, color: buildingColors[7] },
      { x: 80, z: -238, w: 28, h: 70, d: 25, color: buildingColors[10] },
      { x: 125, z: -230, w: 42, h: 145, d: 35, color: buildingColors[4] },
      { x: 175, z: -242, w: 35, h: 85, d: 28, color: buildingColors[8] },
      { x: 225, z: -235, w: 30, h: 60, d: 25, color: buildingColors[13] },

      // ===== ROW 3 (back row, z = -265 to -290, furthest, tallest silhouettes) =====
      { x: -175, z: -275, w: 40, h: 100, d: 35, color: buildingColors[5] },
      { x: -120, z: -285, w: 50, h: 170, d: 40, color: buildingColors[6] },  // very tall back
      { x: -55, z: -278, w: 35, h: 75, d: 30, color: buildingColors[0] },
      { x: 10, z: -288, w: 48, h: 135, d: 38, color: buildingColors[9] },
      { x: 70, z: -280, w: 38, h: 115, d: 32, color: buildingColors[2] },
      { x: 140, z: -286, w: 45, h: 155, d: 36, color: buildingColors[12] },
      { x: 200, z: -275, w: 32, h: 80, d: 28, color: buildingColors[1] },
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

    // ---- CITY GROUND PLANE (dark road/street surface under buildings) ----
    const groundGroup = new THREE.Group()
    // Main road surface (wider to match expanded city)
    const roadGeo = new THREE.BoxGeometry(600, 2, 160)
    const roadMat = voxelMat(0x2A2A35)
    const road = new THREE.Mesh(roadGeo, roadMat)
    road.position.set(10, -96, -230)
    road.receiveShadow = true
    groundGroup.add(road)

    // Sidewalk edge (lighter strip along the front of the road)
    const sidewalkGeo = new THREE.BoxGeometry(600, 2.5, 6)
    const sidewalkMat = voxelMat(0x4A4A55)
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat)
    sidewalk.position.set(10, -95.5, -158)
    groundGroup.add(sidewalk)

    // Secondary sidewalk along back
    const sidewalk2 = new THREE.Mesh(sidewalkGeo, sidewalkMat)
    sidewalk2.position.set(10, -95.5, -300)
    groundGroup.add(sidewalk2)

    scene.add(groundGroup)
    scene.add(buildingGroup)

    // ---- SMALL CHUNKY VOXEL CARS ----
    function createVoxelCar(x, y, z, bodyColor, rotation = 0) {
      const carGroup = new THREE.Group()
      // Car body (main block)
      const bodyGeo = new THREE.BoxGeometry(6, 2.5, 3)
      const body = new THREE.Mesh(bodyGeo, voxelMat(bodyColor))
      body.position.set(0, 1.8, 0)
      carGroup.add(body)

      // Car roof/cabin (smaller block on top)
      const roofGeo = new THREE.BoxGeometry(3.5, 2, 2.6)
      const roof = new THREE.Mesh(roofGeo, voxelMat(bodyColor))
      roof.position.set(-0.3, 3.5, 0)
      carGroup.add(roof)

      // Wheels (4 dark blocks)
      const wheelMat = voxelMat(0x222222)
      const wheelGeo = new THREE.BoxGeometry(1.2, 1.2, 0.8)
      const wheelPositions = [
        [-1.8, 0.6, 1.5], [-1.8, 0.6, -1.5],
        [1.8, 0.6, 1.5], [1.8, 0.6, -1.5],
      ]
      wheelPositions.forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat)
        wheel.position.set(wx, wy, wz)
        carGroup.add(wheel)
      })

      carGroup.position.set(x, y, z)
      carGroup.rotation.y = rotation
      return carGroup
    }

    // Place cars on the streets near the city buildings
    const carConfigs = [
      { x: -60,  y: -95, z: -165, color: 0xCC4444, rot: 0 },          // muted red, on front road
      { x: -10,  y: -95, z: -168, color: 0x4466AA, rot: Math.PI },    // muted blue, parked slightly off
      { x: 50,   y: -95, z: -163, color: 0xCCAA44, rot: 0.1 },       // muted yellow, slight angle (parked)
      { x: 120,  y: -95, z: -167, color: 0xCCCCCC, rot: Math.PI },   // white, on the road
      { x: -120, y: -95, z: -162, color: 0x885533, rot: 0.3 },       // brown, parked at angle
    ]
    carConfigs.forEach((cc) => {
      const car = createVoxelCar(cc.x, cc.y, cc.z, cc.color, cc.rot)
      scene.add(car)
    })

    // ---- TOWN LANDSCAPE (ground plane far below) ----
    const townGroup = new THREE.Group()
    const groundY = -95  // Far below

    // === GREEN FIELDS (base) ===
    // Main grass field (large, covers the whole ground area)
    const fieldGeo = new THREE.BoxGeometry(600, 2, 500)
    const fieldMat = voxelMat(0x6BAF4A)
    const mainField = new THREE.Mesh(fieldGeo, fieldMat)
    mainField.position.set(0, groundY, -100)
    mainField.receiveShadow = true
    townGroup.add(mainField)

    // Farmland patches (different green shades for variety)
    const patchConfigs = [
      { x: -120, z: -60, w: 80, d: 50, color: 0x5A9E3A },   // darker green
      { x: 80, z: -40, w: 70, d: 60, color: 0x7CC55A },     // lighter green
      { x: -60, z: -150, w: 90, d: 40, color: 0x5A9E3A },   // darker green
      { x: 150, z: -120, w: 60, d: 70, color: 0x7CC55A },   // lighter green
      { x: -180, z: -130, w: 70, d: 55, color: 0x62A845 },  // mid green
      { x: 40, z: -200, w: 85, d: 45, color: 0x62A845 },    // mid green
      { x: -150, z: 30, w: 65, d: 50, color: 0x7CC55A },    // lighter green
      { x: 200, z: -60, w: 55, d: 65, color: 0x5A9E3A },    // darker green
    ]
    patchConfigs.forEach(({ x, z, w, d, color }) => {
      const patchGeo = new THREE.BoxGeometry(w, 2.5, d)
      const patch = new THREE.Mesh(patchGeo, voxelMat(color))
      patch.position.set(x, groundY + 0.3, z)
      townGroup.add(patch)
    })

    // === DIRT ROADS (country roads cutting through fields) ===
    const dirtRoadMat = voxelMat(0xA0784A)
    // Main north-south road
    const nsRoadGeo = new THREE.BoxGeometry(4, 2.8, 300)
    const nsRoad = new THREE.Mesh(nsRoadGeo, dirtRoadMat)
    nsRoad.position.set(0, groundY + 0.5, -80)
    townGroup.add(nsRoad)

    // Main east-west road
    const ewRoadGeo = new THREE.BoxGeometry(350, 2.8, 4)
    const ewRoad = new THREE.Mesh(ewRoadGeo, dirtRoadMat)
    ewRoad.position.set(20, groundY + 0.5, -100)
    townGroup.add(ewRoad)

    // Secondary winding road (diagonal)
    const diagRoadGeo = new THREE.BoxGeometry(120, 2.8, 4)
    const diagRoad = new THREE.Mesh(diagRoadGeo, dirtRoadMat)
    diagRoad.position.set(-80, groundY + 0.5, -50)
    diagRoad.rotation.y = Math.PI / 5
    townGroup.add(diagRoad)

    // Another secondary road
    const diagRoad2Geo = new THREE.BoxGeometry(100, 2.8, 4)
    const diagRoad2 = new THREE.Mesh(diagRoad2Geo, dirtRoadMat)
    diagRoad2.position.set(90, groundY + 0.5, -140)
    diagRoad2.rotation.y = -Math.PI / 6
    townGroup.add(diagRoad2)

    // === HIGHWAY (wider road connecting town to city) ===
    const highwayMat = voxelMat(0x555555)
    // Main highway running north toward city buildings
    const highwayGeo = new THREE.BoxGeometry(8, 2.9, 200)
    const highway = new THREE.Mesh(highwayGeo, highwayMat)
    highway.position.set(10, groundY + 0.6, -200)
    townGroup.add(highway)

    // Highway lane markings (dashed yellow center line)
    const laneMarkMat = voxelMat(0xDDCC44)
    for (let i = 0; i < 15; i++) {
      const markGeo = new THREE.BoxGeometry(0.6, 3.0, 4)
      const mark = new THREE.Mesh(markGeo, laneMarkMat)
      mark.position.set(10, groundY + 0.8, -110 - i * 13)
      townGroup.add(mark)
    }

    // Secondary highway spur to the right
    const spurGeo = new THREE.BoxGeometry(100, 2.9, 7)
    const spur = new THREE.Mesh(spurGeo, highwayMat)
    spur.position.set(80, groundY + 0.6, -180)
    spur.rotation.y = -Math.PI / 8
    townGroup.add(spur)

    // === SMALL TOWN CLUSTER (tiny buildings seen from high above) ===
    const townBuildingConfigs = [
      // { x, z, w, h, d, wallColor, roofColor }
      { x: -8, z: -95, w: 3, h: 3, d: 3, wall: 0xE8DCC8, roof: 0xA04030 },      // cream walls, red roof
      { x: 5, z: -92, w: 4, h: 2.5, d: 3, wall: 0xF5F0E0, roof: 0x8B4513 },     // white walls, brown roof
      { x: -3, z: -105, w: 3.5, h: 4, d: 3, wall: 0xD4C4A0, roof: 0xA04030 },   // tan walls, red roof
      { x: 8, z: -103, w: 2.5, h: 2, d: 2.5, wall: 0xF5F0E0, roof: 0x666666 },  // white, grey roof (church?)
      { x: -12, z: -100, w: 3, h: 2.5, d: 4, wall: 0xE8DCC8, roof: 0x8B4513 },  // cream, brown roof
      { x: 2, z: -110, w: 3, h: 3, d: 2.5, wall: 0xCCBB99, roof: 0xA04030 },    // tan, red roof
      { x: -6, z: -88, w: 4, h: 2, d: 3, wall: 0xF5F0E0, roof: 0x8B4513 },     // white, brown roof
      { x: 12, z: -98, w: 2.5, h: 3.5, d: 2.5, wall: 0xD4C4A0, roof: 0x666666 }, // tan, grey roof (tall)
      { x: -15, z: -108, w: 3, h: 2, d: 3.5, wall: 0xE8DCC8, roof: 0xA04030 },  // cream, red roof
      { x: 6, z: -85, w: 5, h: 2, d: 6, wall: 0xCCBB99, roof: 0x8B4513 },       // large barn-like
    ]
    townBuildingConfigs.forEach(({ x, z, w, h, d, wall, roof }) => {
      const bGroup = new THREE.Group()
      // Walls
      const wallGeo = new THREE.BoxGeometry(w, h, d)
      const wallMesh = new THREE.Mesh(wallGeo, voxelMat(wall))
      wallMesh.position.set(0, h / 2, 0)
      bGroup.add(wallMesh)
      // Roof (slightly wider than walls)
      const roofGeo = new THREE.BoxGeometry(w + 0.5, h * 0.3, d + 0.5)
      const roofMesh = new THREE.Mesh(roofGeo, voxelMat(roof))
      roofMesh.position.set(0, h + h * 0.15, 0)
      bGroup.add(roofMesh)
      bGroup.position.set(x, groundY + 1, z)
      townGroup.add(bGroup)
    })

    // === SMALL DETAILS ===
    // Tiny trees (green dots/cubes scattered around fields and town)
    const tinyTreeMat = voxelMat(0x4A8A30)
    const tinyTreeTrunkMat = voxelMat(0x6B4E32)
    const tinyTreePositions = [
      [-30, -80], [-45, -95], [25, -75], [35, -115],
      [-20, -120], [50, -90], [-55, -70], [65, -105],
      [-70, -135], [40, -130], [-25, -60], [55, -65],
      [-80, -100], [75, -80], [-40, -145], [20, -145],
    ]
    tinyTreePositions.forEach(([tx, tz]) => {
      // Trunk
      const trunkGeo = new THREE.BoxGeometry(0.5, 1.5, 0.5)
      const trunk = new THREE.Mesh(trunkGeo, tinyTreeTrunkMat)
      trunk.position.set(tx, groundY + 1.8, tz)
      townGroup.add(trunk)
      // Canopy (a chunky cube)
      const canopySize = 1.2 + Math.random() * 0.8
      const canopyGeo = new THREE.BoxGeometry(canopySize, canopySize, canopySize)
      const canopy = new THREE.Mesh(canopyGeo, tinyTreeMat)
      canopy.position.set(tx, groundY + 3, tz)
      townGroup.add(canopy)
    })

    // Pond / small lake (blue rectangle)
    const pondGeo = new THREE.BoxGeometry(15, 2.6, 10)
    const pondMat = voxelMat(0x4488BB)
    const pond = new THREE.Mesh(pondGeo, pondMat)
    pond.position.set(-50, groundY + 0.2, -110)
    townGroup.add(pond)

    // Second smaller pond
    const pond2Geo = new THREE.BoxGeometry(8, 2.6, 6)
    const pond2 = new THREE.Mesh(pond2Geo, pondMat)
    pond2.position.set(70, groundY + 0.2, -70)
    townGroup.add(pond2)

    // Field rows (plowed farmland lines for visual texture)
    const plowMat = voxelMat(0x8B6842)
    for (let i = 0; i < 12; i++) {
      const rowGeo = new THREE.BoxGeometry(40, 2.6, 1.5)
      const row = new THREE.Mesh(rowGeo, plowMat)
      row.position.set(-130, groundY + 0.3, -40 - i * 5)
      townGroup.add(row)
    }
    for (let i = 0; i < 8; i++) {
      const rowGeo = new THREE.BoxGeometry(1.5, 2.6, 35)
      const row = new THREE.Mesh(rowGeo, plowMat)
      row.position.set(160 + i * 5, groundY + 0.3, -50)
      townGroup.add(row)
    }

    // Fences along some roads (tiny posts)
    const fenceMat = voxelMat(0x8B7355)
    for (let i = 0; i < 20; i++) {
      const postGeo = new THREE.BoxGeometry(0.3, 1.5, 0.3)
      const post = new THREE.Mesh(postGeo, fenceMat)
      post.position.set(3, groundY + 1.8, -30 - i * 12)
      townGroup.add(post)
    }

    scene.add(townGroup)

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

      // Cloud drift
      clouds.forEach((cloud) => {
        const drift = Math.sin(elapsed * 0.1 * Math.abs(cloud.userData.driftSpeed)) * cloud.userData.driftRange
        cloud.position.x = cloud.userData.startX + drift
        cloud.position.y += Math.sin(elapsed * 0.2 + cloud.userData.startX) * 0.003
      })

      // Camera with mouse parallax (zoomed out for vast open sky)
      const targetX = mouseRef.current.x * 8
      const targetY = 105 + mouseRef.current.y * 4 + Math.sin(elapsed * 0.3) * 0.3
      const targetZ = 130 + Math.cos(elapsed * 0.15) * 1.5

      camera.position.x += (targetX - camera.position.x) * 0.02
      camera.position.y += (targetY - camera.position.y) * 0.02
      camera.position.z += (targetZ - camera.position.z) * 0.02

      camera.lookAt(0, -5, -45)

      // Building window glow intensity based on day/night
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
