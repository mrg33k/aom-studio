// corner:corner-ui-cv4 — ambient chat background.
// REAL Three.js port of 21st.dev "ai-input-hero" (erikx) — the actual shader
// pipeline from the demo: instanced bars with the demo's vertex/fragment
// shaders (smooth pow-curve taper, 23.4° lean, additive blending),
// UnrealBloomPass for glow, and the demo's FilmGrainShader for texture.
// gsap is replaced by a small rAF keyframe interpolator (same keyframes,
// same power2.inOut easing) so no new animation dependency is needed.
//
// Tuning vs the demo (Patrik 2026-06-11 "slow subtle sexy and smooth"):
//   - SPEED 0.5: timeline + oscillation run at half tempo
//   - per-chat hue hashed from `chatKey` (demo hardcodes blue)
//   - light/dark variants: dark = demo additive glow; light = deeper,
//     less-bright color + softer bloom so it reads on the bone background
import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

function hashHue(str) {
  let h = 0
  const s = String(str || 'chat')
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return ((h % 360) + 360) % 360
}

const SPEED = 0.1 // 1/10 demo tempo (Patrik 2026-06-11: "way slower, 20% of what it is now")

// Demo keyframes verbatim
const PI15 = Math.PI * 1.5
const KEYS1 = [
  { time: 0, gain: 10, frequency: 0, waveLength: 0.5 },
  { time: 4, gain: 300, frequency: 1, waveLength: 0.5 },
  { time: 6, gain: 300, frequency: 4, waveLength: PI15 },
  { time: 8, gain: 225, frequency: 4, waveLength: PI15 },
  { time: 10, gain: 500, frequency: 1, waveLength: PI15 },
  { time: 14, gain: 225, frequency: 3, waveLength: PI15 },
  { time: 22, gain: 100, frequency: 6, waveLength: PI15 },
  { time: 28, gain: 0, frequency: 0.9, waveLength: 0.5 },
  { time: 30, gain: 128, frequency: 0.9, waveLength: 0.5 },
  { time: 32, gain: 190, frequency: 1.42, waveLength: 0.5 },
  { time: 39, gain: 499, frequency: 4.0, waveLength: PI15 },
  { time: 40, gain: 500, frequency: 4.0, waveLength: PI15 },
  { time: 42, gain: 400, frequency: 2.82, waveLength: PI15 },
  { time: 44, gain: 327, frequency: 2.56, waveLength: PI15 },
  { time: 48, gain: 188, frequency: 5.4, waveLength: 0.5 },
  { time: 52, gain: 32, frequency: 0.1, waveLength: 0.5 },
  { time: 55, gain: 10, frequency: 0, waveLength: 0.5 },
]
const KEYS2 = [
  { time: 0, gain: 0, frequency: 0, waveLength: 0.5 },
  { time: 9, gain: 0, frequency: 0, waveLength: 0.5 },
  { time: 10, gain: 400, frequency: 1, waveLength: 0.5 },
  { time: 13, gain: 300, frequency: 4, waveLength: PI15 },
  { time: 24, gain: 96, frequency: 2, waveLength: 0.5 },
  { time: 28, gain: 0, frequency: 0.9, waveLength: 0.5 },
  { time: 30, gain: 142, frequency: 0.9, waveLength: 0.5 },
  { time: 36, gain: 374, frequency: 4.0, waveLength: PI15 },
  { time: 38, gain: 375, frequency: 4.0, waveLength: PI15 },
  { time: 40, gain: 300, frequency: 2.26, waveLength: PI15 },
  { time: 44, gain: 245, frequency: 2.05, waveLength: PI15 },
  { time: 48, gain: 141, frequency: 5.12, waveLength: 0.5 },
  { time: 52, gain: 24, frequency: 0.08, waveLength: 0.5 },
  { time: 55, gain: 8, frequency: 0, waveLength: 0.5 },
]
const LOOP = 55

const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)

function sampleKeys(keys, t) {
  if (t <= keys[0].time) return keys[0]
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1]
    if (t >= a.time && t < b.time) {
      const p = easeInOut((t - a.time) / (b.time - a.time))
      return {
        gain: a.gain + (b.gain - a.gain) * p,
        frequency: a.frequency + (b.frequency - a.frequency) * p,
        waveLength: a.waveLength + (b.waveLength - a.waveLength) * p,
      }
    }
  }
  return keys[keys.length - 1]
}

export default function ChatWaveBackground({ chatKey, theme = 'dark' }) {
  const waveRef = useRef(null)

  useEffect(() => {
    const waveContainer = waveRef.current
    if (!waveContainer) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hue = hashHue(chatKey)
    const isLight = theme === 'light'

    // --- FilmGrainShader (demo verbatim) ---
    const FilmGrainShader = {
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        intensity: { value: 1.1 },
        grainScale: { value: 0.5 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float intensity;
        uniform float grainScale;
        varying vec2 vUv;

        float sparkleNoise(vec2 p) {
          vec2 jPos = p + vec2(37.0, 17.0) * fract(time * 0.07);
          vec3 p3 = fract(vec3(jPos.xyx) * vec3(.1031, .1030, .0973) + time * 0.1);
          p3 += dot(p3, p3.yxz + 19.19);
          return fract((p3.x + p3.y) * p3.z);
        }

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          vec2 pos = gl_FragCoord.xy * 0.5 * grainScale;
          float noise = sparkleNoise(pos);
          noise = noise * 2.0 - 1.0;
          vec3 result = color.rgb + noise * intensity * 0.1 * color.a;
          gl_FragColor = vec4(result, color.a);
        }
      `,
    }

    // --- Wave state ---
    const wave1 = { gain: 10, frequency: 0, waveLength: 0.5, currentAngle: 0 }
    const wave2 = { gain: 0, frequency: 0, waveLength: 0.5, currentAngle: 0 }

    const mouse = { x: 0, y: 0, active: false }
    let proxyMouseX = 0, proxyInitialized = false
    const glowConfig = { maxGlowDistance: 690, speedScale: 0.52, glowFalloff: 0.6, mouseSmoothing: 30.0 }
    const glowDynamics = { decay: 3.3, max: 40.0, accumEase: 1.5, speedEase: 8.5 }

    const DPR_CAP = (window.devicePixelRatio || 1) > 1.8 ? 1.5 : 2
    const EFFECT_PR = Math.min(window.devicePixelRatio || 1, DPR_CAP) * 0.5

    while (waveContainer.firstChild) waveContainer.removeChild(waveContainer.firstChild)
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true })
    renderer.setPixelRatio(EFFECT_PR)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.autoClear = false
    renderer.setClearColor(0x000000, 0)
    waveContainer.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.2))

    let camera, composer, bloomPass, grainPass
    let cameraWidth = 0, cameraHeight = 0, initialized = false

    const MAX_BARS = 256
    const FIXED_BAR_WIDTH = 14
    const FIXED_BAR_GAP = 10
    let instancedBars = null
    let currentBarCount = 0
    let barMaterial
    let barCenters = null

    function updateGlowDistance() {
      if (!barMaterial) return
      const totalWidth = currentBarCount * (FIXED_BAR_WIDTH + FIXED_BAR_GAP) - FIXED_BAR_GAP
      const spanPx = totalWidth * 0.3
      glowConfig.maxGlowDistance = spanPx
      barMaterial.uniforms.uMaxGlowDist.value = spanPx
    }

    function createInstancedMaterial() {
      // demo: base hsl(220,100%,50%), emissive #1f3dbc — re-derived per chat hue.
      // Light theme is NOT a faded dark theme: rich saturated ink bars whose
      // bloom halo tints the bone ground — a "printed light" look with the
      // same energy as dark's additive glow.
      const baseCol = isLight
        ? new THREE.Color(`hsl(${hue},85%,30%)`)
        : new THREE.Color(`hsl(${hue},100%,50%)`)
      const emisCol = isLight
        ? new THREE.Color(`hsl(${hue},80%,46%)`)
        : new THREE.Color(`hsl(${hue},72%,43%)`)

      return new THREE.ShaderMaterial({
        defines: { USE_INSTANCING: '' },
        uniforms: {
          uMouseClipX: { value: 0 },
          uHalfW: { value: 0 },
          uMaxGlowDist: { value: glowConfig.maxGlowDistance },
          uGlowFalloff: { value: glowConfig.glowFalloff },
          uSmoothSpeed: { value: 0 },
          uGainMul: { value: 1 },
          uBaseY: { value: 0 },
          w1Gain: { value: wave1.gain },
          w1Len: { value: wave1.waveLength },
          w1Phase: { value: 0 },
          w2Gain: { value: wave2.gain },
          w2Len: { value: wave2.waveLength },
          w2Phase: { value: 0 },
          uFixedTipPx: { value: 10 },
          uMinBottomWidthPx: { value: 0 },
          uColor: { value: baseCol },
          uEmissive: { value: emisCol },
          uBaseEmissive: { value: 0.05 },
          uRotationAngle: { value: THREE.MathUtils.degToRad(23.4) },
          uAlphaMul: { value: isLight ? 0.95 : 1.0 },
        },
        vertexShader: `
          attribute float aXPos, aPosNorm, aGroup, aGlow;
          uniform float uMouseClipX, uHalfW, uMaxGlowDist, uGlowFalloff;
          uniform float uGainMul, uBaseY;
          uniform float w1Gain, w1Len, w1Phase;
          uniform float w2Gain, w2Len, w2Phase;
          uniform float uRotationAngle;
          varying float vGlow, vPulse, vHeight;
          varying vec2 vUv;

          float sineH(float g, float len, float ph, float t){
            return max(20.0, (sin(ph + t * len) * 0.5 + 0.6) * g * uGainMul);
          }

          void main(){
            vUv = uv;
            float h1 = sineH(w1Gain, w1Len, w1Phase, aPosNorm);
            float h2 = sineH(w2Gain, w2Len, w2Phase, aPosNorm);
            vHeight = mix(h1, h2, aGroup);

            vec3 pos = position;
            pos.x += aXPos;
            pos.y = 0.0;

            float height = vHeight * uv.y;
            pos.x += height * tan(uRotationAngle);
            pos.y += height;

            pos.y += uBaseY;

            vec4 clip = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
            float dxPx = abs(uMouseClipX - clip.x/clip.w) * uHalfW;
            float prox = clamp(1.0 - pow(dxPx / uMaxGlowDist, uGlowFalloff), 0.0, 1.0);

            vGlow  = aGlow;
            vPulse = prox;
            gl_Position = clip;
          }
        `,
        fragmentShader: `
          precision mediump float;
          uniform vec3 uColor, uEmissive;
          uniform float uBaseEmissive;
          uniform float uFixedTipPx, uMinBottomWidthPx;
          uniform float uAlphaMul;
          varying float vGlow, vPulse, vHeight;
          varying vec2 vUv;

          void main(){
            float tipProp = clamp(uFixedTipPx / vHeight, 0.0, 0.95);
            float transitionY = 1.0 - tipProp;
            float xFromCenter = abs(vUv.x - 0.5) * 2.0;
            float px = fwidth(vUv.x);
            float allowedWidth;

            if (vUv.y >= transitionY){
              float topPos = (vUv.y - transitionY) / tipProp;
              allowedWidth = 1.0 - pow(topPos, 0.9);
            } else {
              float bottomPos = vUv.y / transitionY;
              allowedWidth = max(uMinBottomWidthPx * px * 10.0, pow(bottomPos, 0.5));
            }

            float alpha = smoothstep(-px, px, allowedWidth - xFromCenter);
            if (alpha < 0.01) discard;

            float emissiveStrength = uBaseEmissive + vGlow * 0.9 + vPulse * 0.15;
            vec3 finalColor = uColor + uEmissive * emissiveStrength;
            gl_FragColor = vec4(finalColor, 0.35 * alpha * uAlphaMul);
          }
        `,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: false,
        blending: isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
      })
    }

    const MAX_KEYFRAME_GAIN = 500
    const SCREEN_COVERAGE = 0.6
    function updateGainMultiplier() {
      if (!barMaterial) return
      barMaterial.uniforms.uGainMul.value = (cameraHeight * SCREEN_COVERAGE) / MAX_KEYFRAME_GAIN
    }

    let rect = { left: 0, top: 0, right: 0, bottom: 0 }
    const onPointerMove = (e) => {
      if (e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right) {
        mouse.active = false
        return
      }
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
      if (!proxyInitialized) { proxyMouseX = mouse.x; proxyInitialized = true }
    }
    const onPointerEnd = () => { mouse.active = false }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerEnd, { passive: true })

    function accumulateGlow(dt) {
      if (!instancedBars) return
      const attr = instancedBars.geometry.getAttribute('aGlow')
      const arr = attr.array
      const mouseWorldX = proxyMouseX - cameraWidth * 0.5
      const mDist = glowConfig.maxGlowDistance
      const fall = glowConfig.glowFalloff
      const decayLerp = 1.0 - Math.exp(-glowDynamics.decay * dt)
      const addEase = 1.0 - Math.exp(-glowDynamics.accumEase * dt)
      const vmax = glowDynamics.max
      for (let i = 0; i < currentBarCount; i++) {
        const dx = Math.abs(mouseWorldX - barCenters[i])
        const hit = dx < mDist ? 1.0 - Math.pow(dx / mDist, fall) : 0.0
        let g = arr[i] + hit * smoothSpeed * addEase - arr[i] * decayLerp
        if (g > vmax) g = vmax
        arr[i] = arr[i + currentBarCount] = g
      }
      attr.needsUpdate = true
    }

    function createInstancedBars() {
      if (instancedBars) {
        scene.remove(instancedBars)
        instancedBars.geometry.dispose()
        instancedBars.material.dispose()
        instancedBars = null
      }

      const span = cameraWidth
      let barCount = Math.min(MAX_BARS, Math.max(1, Math.floor((span + FIXED_BAR_GAP) / (FIXED_BAR_WIDTH + FIXED_BAR_GAP))))
      const gap = barCount > 1 ? (span - barCount * FIXED_BAR_WIDTH) / (barCount - 1) : 0
      currentBarCount = barCount

      const startX = -cameraWidth / 2
      const instCnt = barCount * 2
      barCenters = new Float32Array(barCount)

      const aXPos = new Float32Array(instCnt)
      const aPosNorm = new Float32Array(instCnt)
      const aGroup = new Float32Array(instCnt)
      const aGlow = new Float32Array(instCnt).fill(0)

      for (let i = 0; i < barCount; i++) {
        const x = startX + FIXED_BAR_WIDTH / 2 + i * (FIXED_BAR_WIDTH + gap)
        barCenters[i] = x
        const t = barCount > 1 ? i / (barCount - 1) : 0
        aXPos[i] = x; aXPos[i + barCount] = x
        aPosNorm[i] = t; aPosNorm[i + barCount] = t
        aGroup[i] = 0; aGroup[i + barCount] = 1
      }

      const geo = new THREE.PlaneGeometry(FIXED_BAR_WIDTH, 1, 1, 1)
      geo.translate(0, 0.5, 0)
      geo.setAttribute('aXPos', new THREE.InstancedBufferAttribute(aXPos, 1))
      geo.setAttribute('aPosNorm', new THREE.InstancedBufferAttribute(aPosNorm, 1))
      geo.setAttribute('aGroup', new THREE.InstancedBufferAttribute(aGroup, 1))
      geo.setAttribute('aGlow', new THREE.InstancedBufferAttribute(aGlow, 1).setUsage(THREE.DynamicDrawUsage))

      barMaterial = createInstancedMaterial()
      instancedBars = new THREE.InstancedMesh(geo, barMaterial, instCnt)
      instancedBars.frustumCulled = false
      scene.add(instancedBars)
      updateGlowDistance()
    }

    function initThree() {
      cameraWidth = waveContainer.clientWidth || 800
      cameraHeight = waveContainer.clientHeight || 600
      camera = new THREE.OrthographicCamera(-cameraWidth / 2, cameraWidth / 2, cameraHeight / 2, -cameraHeight / 2, -1000, 1000)
      camera.position.z = 10
      camera.lookAt(0, 0, 0)

      renderer.setSize(cameraWidth, cameraHeight)
      composer = new EffectComposer(renderer)
      composer.setPixelRatio(EFFECT_PR)
      composer.addPass(new RenderPass(scene, camera))

      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(cameraWidth, cameraHeight),
        isLight ? 0.85 : 1.0, // light keeps real bloom — ink bars + colored halo
        0.68,
        0.0
      )
      bloomPass.resolution.set(cameraWidth * 0.5, cameraHeight * 0.5)
      composer.addPass(bloomPass)

      grainPass = new ShaderPass(FilmGrainShader)
      grainPass.uniforms.intensity.value = isLight ? 0.8 : 0.9
      grainPass.uniforms.grainScale.value = 0.3
      composer.addPass(grainPass)

      createInstancedBars()
      updateGainMultiplier()
      rect = renderer.domElement.getBoundingClientRect()
      initialized = true
    }

    let pendingW = 0, pendingH = 0, heavyResizeTimer = null
    function onResize(newW, newH) {
      if (!initialized || newW < 2 || newH < 2) return
      pendingW = newW; pendingH = newH
      cameraWidth = newW; cameraHeight = newH
      camera.left = -newW / 2; camera.right = newW / 2
      camera.top = newH / 2; camera.bottom = -newH / 2
      camera.updateProjectionMatrix()

      const span = newW
      let barCount = Math.min(MAX_BARS, Math.max(1, Math.floor((span + FIXED_BAR_GAP) / (FIXED_BAR_WIDTH + FIXED_BAR_GAP))))
      if (barCount !== currentBarCount) {
        createInstancedBars()
      } else {
        const gap = barCount > 1 ? (span - barCount * FIXED_BAR_WIDTH) / (barCount - 1) : 0
        const startX = -newW / 2
        const aX = instancedBars.geometry.getAttribute('aXPos')
        for (let i = 0; i < barCount; i++) {
          const x = startX + FIXED_BAR_WIDTH / 2 + i * (FIXED_BAR_WIDTH + gap)
          barCenters[i] = x
          aX.array[i] = aX.array[i + barCount] = x
        }
        aX.needsUpdate = true
      }

      barMaterial.uniforms.uHalfW.value = newW * 0.5
      updateGainMultiplier()
      updateGlowDistance()

      clearTimeout(heavyResizeTimer)
      heavyResizeTimer = setTimeout(() => {
        renderer.setPixelRatio(EFFECT_PR)
        renderer.setSize(pendingW, pendingH)
        renderer.domElement.style.width = '100%'
        renderer.domElement.style.height = '100%'
        composer.setSize(pendingW, pendingH)
        bloomPass?.setSize(pendingW, pendingH)
        rect = renderer.domElement.getBoundingClientRect()
      }, 60)
    }

    // --- rAF loop: keyframe timeline (replaces gsap) + render ticker ---
    let raf = 0
    let smoothSpeed = 0
    let last = performance.now()
    const t0 = performance.now()

    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      if (document.hidden || !initialized || !instancedBars) { last = now; return }
      const dt = Math.min(0.1, (now - last) / 1000) * SPEED
      last = now

      // timeline sample (looping, demo keyframes, slowed). Start at t=6 —
      // mid first swell — so a freshly opened chat is already breathing
      // instead of sitting near-flat for the slowed loop's long intro.
      const t = (6 + ((now - t0) / 1000) * SPEED) % LOOP
      const s1 = sampleKeys(KEYS1, t)
      const s2 = sampleKeys(KEYS2, t)
      wave1.gain = s1.gain; wave1.frequency = s1.frequency; wave1.waveLength = s1.waveLength
      wave2.gain = s2.gain; wave2.frequency = s2.frequency; wave2.waveLength = s2.waveLength

      wave1.currentAngle = (wave1.currentAngle + wave1.frequency * dt) % (Math.PI * 2)
      wave2.currentAngle = (wave2.currentAngle + wave2.frequency * dt) % (Math.PI * 2)

      const rdt = dt / SPEED // real dt for mouse/glow smoothing
      const kMouse = 1.0 - Math.exp(-glowConfig.mouseSmoothing * rdt)
      proxyMouseX += (mouse.x - proxyMouseX) * kMouse
      const dx = mouse.active ? mouse.x - proxyMouseX : 0
      const rawSpeed = Math.abs(dx) * glowConfig.speedScale
      const kSpeed = 1.0 - Math.exp(-glowDynamics.speedEase * rdt)
      smoothSpeed += (rawSpeed - smoothSpeed) * kSpeed

      const u = instancedBars.material.uniforms
      u.w1Gain.value = wave1.gain
      u.w1Len.value = wave1.waveLength
      u.w1Phase.value = wave1.currentAngle
      u.w2Gain.value = wave2.gain
      u.w2Len.value = wave2.waveLength
      u.w2Phase.value = wave2.currentAngle
      u.uSmoothSpeed.value = smoothSpeed
      u.uMouseClipX.value = (proxyMouseX / cameraWidth) * 2 - 1
      u.uBaseY.value = -cameraHeight * 0.5 + (window.innerWidth < 768 ? 20 : 40)

      grainPass.uniforms.time.value += rdt * 0.2

      accumulateGlow(rdt)
      composer.render()
    }

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        if (e.target === waveContainer) onResize(e.contentRect.width, e.contentRect.height)
      }
    })

    initThree()
    ro.observe(waveContainer)

    if (reduced) {
      // single static frame mid-swell
      const s1 = sampleKeys(KEYS1, 12)
      const s2 = sampleKeys(KEYS2, 12)
      Object.assign(wave1, s1); Object.assign(wave2, s2)
      const u = instancedBars.material.uniforms
      u.w1Gain.value = wave1.gain; u.w1Len.value = wave1.waveLength
      u.w2Gain.value = wave2.gain; u.w2Len.value = wave2.waveLength
      u.uBaseY.value = -cameraHeight * 0.5 + 40
      composer.render()
    } else {
      raf = requestAnimationFrame(tick)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      clearTimeout(heavyResizeTimer)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
          else obj.material.dispose()
        }
      })
      grainPass?.dispose?.()
      bloomPass?.dispose?.()
      composer?.dispose?.()
      renderer?.dispose?.()
      try {
        if (renderer.domElement.parentElement === waveContainer) waveContainer.removeChild(renderer.domElement)
      } catch { /* already gone */ }
    }
  }, [chatKey, theme])

  return (
    <div
      ref={waveRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.8, // demo wave layer opacity
        overflow: 'hidden',
      }}
    />
  )
}
