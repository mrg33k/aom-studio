import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'

// CrossyBackground: Three.js city park scene with REAL TIME day/night cycle
// Features: stars, sun/moon orb, lumpy grass ground, city skyline with glowing windows,
// animated trees, volumetric fog, mouse-parallax camera
//
// Renders BEHIND CanvasOffice (lower z-index). CanvasOffice sits on top with transparent bg.
// Uses real Arizona time (America/Phoenix, no DST) to determine day/night.
// Accepts isNightMode prop for external override:
//   true = force night, false = force day, undefined/null = use real time.

/**
 * Get current dayRatio (0 = full night, 1 = full day) based on Arizona time.
 *
 * Schedule:
 *   6:00 AM - 8:00 AM  -> sunrise (0 -> 1 smooth)
 *   8:00 AM - 6:00 PM  -> full day (1)
 *   6:00 PM - 8:00 PM  -> sunset (1 -> 0 smooth)
 *   8:00 PM - 6:00 AM  -> full night (0)
 *
 * Transitions use a smoothstep for natural-feeling light changes.
 */
function getArizonaDayRatio() {
  // Get current time in Arizona (America/Phoenix never observes DST = UTC-7 year-round)
  const now = new Date()
  const azString = now.toLocaleString('en-US', { timeZone: 'America/Phoenix' })
  const azDate = new Date(azString)
  const hour = azDate.getHours() + azDate.getMinutes() / 60

  // Smoothstep helper: smooth transition from 0 to 1 between edge0 and edge1
  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }

  if (hour >= 8 && hour < 18) {
    // Full day: 8am to 6pm
    return 1
  } else if (hour >= 6 && hour < 8) {
    // Sunrise: 6am to 8am, smooth 0->1
    return smoothstep(6, 8, hour)
  } else if (hour >= 18 && hour < 20) {
    // Sunset: 6pm to 8pm, smooth 1->0
    return 1 - smoothstep(18, 20, hour)
  } else {
    // Full night: 8pm to 6am
    return 0
  }
}

/**
 * Get the sun/moon arc angle based on Arizona time.
 * Maps 24 hours to a full circle. The orb rises in the east (left),
 * peaks at noon, and sets in the west (right).
 *
 * 6am = horizon (angle 0), noon = top (angle PI/2), 6pm = horizon (angle PI),
 * midnight = bottom (angle 3PI/2 i.e. -PI/2).
 */
function getArizonaOrbAngle() {
  const now = new Date()
  const azString = now.toLocaleString('en-US', { timeZone: 'America/Phoenix' })
  const azDate = new Date(azString)
  const hour = azDate.getHours() + azDate.getMinutes() / 60 + azDate.getSeconds() / 3600

  // Map 24h to full circle. 6am = -PI/2 (horizon), noon = 0 (top), 6pm = PI/2, midnight = PI
  // We shift so that hour 6 maps to angle -PI/2
  const fraction = (hour - 6) / 24 // 0 at 6am, 1 at 6am next day
  return fraction * Math.PI * 2 - Math.PI / 2
}

export default function CrossyBackground({ isNightMode }) {
  const containerRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ---- COLOR PALETTE ----
    const colors = {
      nightSky: new THREE.Color(0x020408),
      daySky: new THREE.Color(0x40a4df),
      nightFog: new THREE.Color(0x020408),
      dayFog: new THREE.Color(0x8ecae6),
      nightLight: new THREE.Color(0x1a2a44),
      dayLight: new THREE.Color(0xffffff),
      sunLight: new THREE.Color(0xfff1b5),
      moonLight: new THREE.Color(0x94b9ff),
      windowGlow: new THREE.Color(0xffd700),
    }

    // ---- RENDERER ----
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    scene.fog = new THREE.FogExp2(colors.nightFog.clone(), 0.004)
    scene.background = colors.nightSky.clone()

    // ---- LIGHTS ----
    const ambientLight = new THREE.AmbientLight(colors.nightLight.clone(), 0.4)
    scene.add(ambientLight)

    const celestialLight = new THREE.DirectionalLight(colors.sunLight.clone(), 1)
    celestialLight.position.set(50, 100, -50)
    celestialLight.castShadow = true
    celestialLight.shadow.camera.left = -150
    celestialLight.shadow.camera.right = 150
    celestialLight.shadow.camera.top = 150
    celestialLight.shadow.camera.bottom = -150
    celestialLight.shadow.mapSize.width = 2048
    celestialLight.shadow.mapSize.height = 2048
    scene.add(celestialLight)

    // ---- STARS ----
    const starGeo = new THREE.BufferGeometry()
    const starCoords = []
    for (let i = 0; i < 2000; i++) {
      starCoords.push(
        (Math.random() - 0.5) * 1000,
        Math.random() * 500,
        (Math.random() - 0.5) * 1000
      )
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3))
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      transparent: true,
      opacity: 1,
    })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ---- SUN / MOON ORB ----
    const orbGeo = new THREE.SphereGeometry(5, 32, 32)
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xfff1b5 })
    const orb = new THREE.Mesh(orbGeo, orbMat)
    scene.add(orb)

    // ---- GROUND (lumpy grass) ----
    const groundGeometry = new THREE.PlaneGeometry(600, 600, 100, 100)
    const pos = groundGeometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const wave = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 2
      pos.setZ(i, wave + Math.random() * 0.5)
    }
    groundGeometry.computeVertexNormals()
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x142b10, roughness: 0.9 })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    // ---- CITY SKYLINE ----
    const cityGroup = new THREE.Group()
    const windowPlanes = []

    for (let i = 0; i < 70; i++) {
      const w = 12 + Math.random() * 15
      const h = 40 + Math.random() * 100
      const d = 12 + Math.random() * 15

      const buildingGeo = new THREE.BoxGeometry(w, h, d)
      const buildingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 })
      const building = new THREE.Mesh(buildingGeo, buildingMat)

      building.position.set(
        (Math.random() - 0.5) * 400,
        h / 2 - 2,
        -180 - Math.random() * 100
      )
      building.castShadow = true
      building.receiveShadow = true
      cityGroup.add(building)

      // Windows on each building
      for (let j = 0; j < 15; j++) {
        const winGeo = new THREE.PlaneGeometry(1.5, 2.5)
        const winMat = new THREE.MeshBasicMaterial({
          color: colors.windowGlow.clone(),
          transparent: true,
          opacity: 0,
        })
        const win = new THREE.Mesh(winGeo, winMat)
        win.position.set(
          (Math.random() - 0.5) * (w - 4),
          (Math.random() - 0.5) * (h - 10),
          d / 2 + 0.1
        )
        win.userData.flickerOffset = Math.random() * 10
        building.add(win)
        windowPlanes.push(win)
      }
    }
    scene.add(cityGroup)

    // ---- TREES ----
    const trees = []
    const treeGroup = new THREE.Group()
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.8, 5)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2d1b0c })
    const leafGeo = new THREE.SphereGeometry(4, 8, 8)
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x0a2208 })

    for (let i = 0; i < 120; i++) {
      const tree = new THREE.Group()
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.y = 2.5
      const leaves = new THREE.Mesh(leafGeo, leafMat)
      leaves.position.y = 7
      leaves.scale.set(1, 1.2 + Math.random() * 0.5, 1)

      tree.add(trunk)
      tree.add(leaves)
      tree.position.set(
        (Math.random() - 0.5) * 250,
        0,
        -10 - Math.random() * 140
      )

      if (Math.abs(tree.position.x) > 18) {
        tree.rotation.y = Math.random() * Math.PI
        tree.userData.phase = Math.random() * Math.PI * 2
        treeGroup.add(tree)
        trees.push(tree)
        tree.castShadow = true
      }
    }
    scene.add(treeGroup)

    // ---- ANIMATION ----
    const clock = new THREE.Clock()
    let animFrameId = null

    // Temp colors for lerp (avoid allocating in the loop)
    const tempColor1 = new THREE.Color()

    function animate() {
      animFrameId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Day/night ratio from real Arizona time (or prop override)
      let dayRatio
      if (isNightMode === true) {
        dayRatio = 0 // Force night
      } else if (isNightMode === false) {
        dayRatio = 1 // Force day
      } else {
        dayRatio = getArizonaDayRatio() // Real time
      }

      // Sky and fog color transitions
      scene.background.lerpColors(colors.nightSky, colors.daySky, dayRatio)
      scene.fog.color.lerpColors(colors.nightFog, colors.dayFog, dayRatio)
      ambientLight.color.lerpColors(colors.nightLight, colors.dayLight, dayRatio)
      celestialLight.color.lerpColors(colors.moonLight, colors.sunLight, dayRatio)

      // Light intensities
      ambientLight.intensity = 0.15 + dayRatio * 0.6
      celestialLight.intensity = 0.3 + dayRatio * 1.2

      // Sun/moon orb arc based on real time (or prop override)
      let angle
      if (isNightMode === true) {
        // Force night: put orb below horizon (midnight position)
        angle = Math.PI * 1.5 - Math.PI / 2 // = PI, bottom of arc
      } else if (isNightMode === false) {
        // Force day: put orb at noon position (top of arc)
        angle = 0 // top
      } else {
        angle = getArizonaOrbAngle() // Real time position
      }

      const dist = 250
      orb.position.x = Math.cos(angle) * dist
      orb.position.y = Math.sin(angle) * dist
      orb.position.z = -150

      celestialLight.position.copy(orb.position)
      tempColor1.set(0xe0e0e0)
      orb.material.color.lerpColors(tempColor1, colors.sunLight, dayRatio)
      orb.scale.setScalar(dayRatio > 0.1 ? 1 : 0.6)

      // Stars fade with daylight
      starMat.opacity = Math.max(0, 1 - dayRatio * 2)
      stars.rotation.y += 0.0005

      // Window glow (brighter at night)
      const windowOpacityTarget = Math.max(0, 1 - dayRatio * 1.5)
      for (let i = 0; i < windowPlanes.length; i++) {
        const win = windowPlanes[i]
        const flicker = Math.sin(elapsed * 2 + win.userData.flickerOffset) * 0.1
        win.material.opacity = Math.max(0, windowOpacityTarget + flicker)
      }

      // Tree sway
      for (let i = 0; i < trees.length; i++) {
        const tree = trees[i]
        tree.rotation.z = Math.sin(elapsed * 0.5 + tree.userData.phase) * 0.02
        tree.rotation.x = Math.cos(elapsed * 0.3 + tree.userData.phase) * 0.01
      }

      // Camera with mouse parallax
      const targetX = mouseRef.current.x * 5
      const targetY = 6 + mouseRef.current.y * 2 + Math.sin(elapsed * 0.4) * 0.5

      camera.position.x += (targetX - camera.position.x) * 0.02
      camera.position.y += (targetY - camera.position.y) * 0.02
      camera.position.z = 35 + Math.cos(elapsed * 0.2) * 2

      camera.lookAt(0, 15, -100)

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

      // Dispose all geometries and materials in the scene
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

      // Dispose renderer
      renderer.dispose()

      // Remove canvas from DOM
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, []) // Run once on mount. isNightMode available as override but real time is default.

  return (
    <div
      ref={containerRef}
      className="crossy-background"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  )
}
