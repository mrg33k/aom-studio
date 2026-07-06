import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Center } from '@react-three/drei';

// Real-time 3D layer for the /r5 identity act. Mirrors the 2D choreography:
// Ronin owns beat 1 and turns away; laptop owns beat 2; both hold a dimmed
// pair through "neither"; the stage clears for the payoff. Driven by the act's
// scroll progress (a framer-motion MotionValue read per frame — no re-renders).

// piecewise linear interpolation, clamped at the ends (same semantics as useTransform)
function pw(p, stops, vals) {
  if (p <= stops[0]) return vals[0];
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i]) {
      const t = (p - stops[i - 1]) / (stops[i] - stops[i - 1]);
      return vals[i - 1] + (vals[i] - vals[i - 1]) * t;
    }
  }
  return vals[vals.length - 1];
}

function Rig({ url, mv, map, onFirstFrame }) {
  const { scene } = useGLTF(url);
  const ref = useRef();
  const fired = useRef(false);

  // one-time: normalize scale/center, collect materials for opacity control
  const mats = useMemo(() => {
    const list = [];
    scene.traverse(o => {
      if (o.isMesh && o.material) {
        o.material.transparent = true;
        o.frustumCulled = false;
        list.push(o.material);
      }
    });
    return list;
  }, [scene]);

  useFrame(() => {
    if (!ref.current) return;
    if (!fired.current) { fired.current = true; onFirstFrame && onFirstFrame(); }
    const s = map(mv.get());
    ref.current.visible = s.o > 0.02;
    ref.current.position.set(s.x, s.y, 0);
    ref.current.scale.setScalar(s.s);
    ref.current.rotation.set(s.rx || 0, s.ry, s.rz || 0);
    for (const m of mats) m.opacity = s.o;
  });

  return (
    <group ref={ref}>
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

const roninMap = p => ({
  o: pw(p, [0, 0.02, 0.18, 0.28, 0.52, 0.6, 0.72, 0.8], [0.95, 1, 1, 0, 0, 0.65, 0.65, 0]),
  x: pw(p, [0, 0.28, 0.52, 0.62], [0, -3.4, -3.4, -1.7]),
  y: pw(p, [0, 0.28], [-0.5, 0.2]),
  s: pw(p, [0, 0.28, 0.6, 0.8], [2.5, 1.7, 1.1, 1.0]),
  ry: pw(p, [0, 0.28, 0.62], [-0.35, 2.4, 3.2]),
  rz: pw(p, [0, 0.28], [-0.02, -0.1]),
});

const laptopMap = p => ({
  o: pw(p, [0.26, 0.34, 0.52, 0.6, 0.72, 0.8], [0, 1, 1, 0.65, 0.65, 0]),
  x: pw(p, [0.26, 0.4, 0.52, 0.62], [3.6, 0, 0, 1.7]),
  y: pw(p, [0.26, 0.5], [-0.55, -0.35]),
  s: pw(p, [0.26, 0.45, 0.62, 0.8], [2.2, 2.6, 1.4, 1.2]),
  ry: pw(p, [0.26, 0.5, 0.66], [0.8, -0.35, -2.2]),
  rz: pw(p, [0.26, 0.5], [0.04, 0]),
});

export default function ActGear3D({ mv, onReady }) {
  useEffect(() => {
    useGLTF.preload('/gear/ronin-4d.opt.glb');
    useGLTF.preload('/gear/laptop.opt.glb');
  }, []);

  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 6], fov: 40 }}
      gl={{ alpha: true, antialias: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[-4, 3, 4]} intensity={3.2} color="#E8D9B8" />
      <directionalLight position={[4, 2, -4]} intensity={4.5} color="#C4A46A" />
      <pointLight position={[0, -3, 2.5]} intensity={2.4} color="#C4A46A" />
      <React.Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.35} />
        <Rig url="/gear/ronin-4d.opt.glb" mv={mv} map={roninMap} onFirstFrame={onReady} />
        <Rig url="/gear/laptop.opt.glb" mv={mv} map={laptopMap} />
      </React.Suspense>
    </Canvas>
  );
}
