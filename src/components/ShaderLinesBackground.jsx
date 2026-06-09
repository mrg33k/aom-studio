import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// ShaderLinesBackground — full-bleed, calm, slow flowing shader lines on a deep
// cool-ink ground. The only motion on the Support Desk "speak freely" surface.
// Self-contained Three.js (the repo isn't a shadcn project, so we render the
// shader-lines effect directly with the already-installed `three`).
//
// Visual DNA: a calm night-sky canvas with living lines behind one open space to
// speak — the opposite of a support form. Honors prefers-reduced-motion (freezes).
// ─────────────────────────────────────────────────────────────────────────────

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

// deep cool-ink ground + warm bone lines with a single amber breath
const vec3 INK   = vec3(0.039, 0.055, 0.110);  // ~#0A0E1C
const vec3 INK2  = vec3(0.024, 0.035, 0.078);  // darker corners
const vec3 BONE  = vec3(0.913, 0.890, 0.835);  // warm bone
const vec3 AMBER = vec3(0.960, 0.620, 0.230);  // AOM amber accent

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_res.x / u_res.y;

  float t = u_time * 0.06;

  // radial vignette toward the darker ink in the corners
  float vig = smoothstep(1.6, 0.2, length(p));
  vec3 col = mix(INK2, INK, vig);

  // layered flowing lines — each a drifting sine field, accumulated softly
  float lines = 0.0;
  float amberMix = 0.0;
  for (float i = 0.0; i < 7.0; i += 1.0) {
    float fi = i / 7.0;
    float speed = 0.35 + fi * 0.5;
    float freq  = 2.2 + fi * 3.1;
    float amp   = 0.42 - fi * 0.035;
    // a gently waving baseline that drifts vertically over time
    float y = sin(p.x * freq + t * speed + i * 1.7) * amp
            + sin(p.x * (freq * 0.5) - t * speed * 0.7) * amp * 0.4;
    float base = (fi - 0.5) * 2.2 + sin(t * 0.4 + i) * 0.15;
    float d = abs(p.y - (y + base));
    // thin, soft line
    float line = smoothstep(0.045, 0.0, d) * (0.30 + 0.20 * sin(t + i));
    lines += line;
    // the middle band breathes amber
    amberMix += line * smoothstep(0.9, 0.0, abs(fi - 0.5)) * 0.9;
  }

  lines = clamp(lines, 0.0, 1.0);
  amberMix = clamp(amberMix, 0.0, 1.0);

  vec3 lineCol = mix(BONE, AMBER, amberMix);
  col += lineCol * lines * 0.5;

  // faint film grain so the dark never bands
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`

const VERT = `
void main() { gl_Position = vec4(position, 1.0); }
`

export default function ShaderLinesBackground({ style }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const reduce = typeof window !== 'undefined' &&
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' })
    } catch (e) {
      // WebGL unavailable — leave the CSS fallback background in place.
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    mount.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    const scene = new THREE.Scene()
    const camera = new THREE.Camera()
    const geometry = new THREE.PlaneGeometry(2, 2)
    const uniforms = {
      u_res: { value: new THREE.Vector2(1, 1) },
      u_time: { value: 0 },
    }
    const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    function resize() {
      const w = mount.clientWidth || window.innerWidth
      const h = mount.clientHeight || window.innerHeight
      renderer.setSize(w, h, false)
      uniforms.u_res.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio())
    }
    resize()
    window.addEventListener('resize', resize)

    let raf
    const start = performance.now()
    function frame(now) {
      uniforms.u_time.value = (now - start) / 1000
      renderer.render(scene, camera)
      if (!reduce) raf = requestAnimationFrame(frame)
    }
    if (reduce) {
      uniforms.u_time.value = 12.0  // a pleasant frozen pose
      renderer.render(scene, camera)
    } else {
      raf = requestAnimationFrame(frame)
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(circle at 50% 40%, #0A0E1C 0%, #06090F 100%)',
        ...style,
      }}
    />
  )
}
