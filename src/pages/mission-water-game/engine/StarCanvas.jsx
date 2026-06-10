import React, { useEffect, useRef } from 'react';

/**
 * StarCanvas — THE canonical living starfield for Mission Water.
 *
 * R18a: one shared component replaces the five per-screen copies. Patrik's
 * note: "Stars feel fake and dont move" — the old field drifted at
 * 0.012 px/frame (imperceptible). This one is alive:
 *
 *   - Three parallax layers with visible upward drift (far 0.03 / mid 0.07 /
 *     near 0.16 px per frame at 60fps) plus slight diagonal lean.
 *   - Per-star twinkle (sine alpha modulation, randomized speed + phase).
 *   - Occasional shooting star every ~6–14s — short cyan-white streak with
 *     a fading tail.
 *   - prefers-reduced-motion: paints one static field, no animation loop.
 *
 * Props:
 *   seed {number} optional — deterministic star placement per screen
 *
 * Mission: conrad-foundation:interactive-game · DESIGN.md "Space Backgrounds"
 */

const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LAYERS = [
  // far field — dense, dim, slow
  { count: 150, minR: 0.4, maxR: 1.0, minA: 0.18, maxA: 0.50, spd: 0.030, tw: 0.6 },
  // mid field
  { count: 80,  minR: 0.8, maxR: 1.6, minA: 0.40, maxA: 0.80, spd: 0.070, tw: 1.0 },
  // near field — few, bright, fast, strong twinkle
  { count: 26,  minR: 1.4, maxR: 2.4, minA: 0.60, maxA: 1.00, spd: 0.160, tw: 1.6 },
];

export default function StarCanvas({ seed = 0xA1B2C3 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rand = mulberry32(seed);

    let W = 0, H = 0, raf = 0;
    let stars = [];
    let shooter = null;          // active shooting star
    let nextShooterAt = 0;       // timestamp for the next one

    function buildStars(w, h) {
      stars = [];
      for (const L of LAYERS) {
        for (let i = 0; i < L.count; i++) {
          stars.push({
            x: rand() * w,
            y: rand() * h,
            r: L.minR + rand() * (L.maxR - L.minR),
            a: L.minA + rand() * (L.maxA - L.minA),
            spd: L.spd * (0.7 + rand() * 0.6),
            dx: (rand() - 0.5) * 0.04,
            // twinkle: speed in rad/s + phase offset; tw scales depth
            twSpd: (0.5 + rand() * 1.5) * L.tw,
            twPh: rand() * Math.PI * 2,
            // a few near stars carry the mission cyan
            cyan: L.tw >= 1.6 && rand() > 0.7,
          });
        }
      }
    }

    function spawnShooter(now) {
      const angle = (25 + Math.random() * 20) * (Math.PI / 180); // down-right
      shooter = {
        x: Math.random() * W * 0.7,
        y: Math.random() * H * 0.45,
        vx: Math.cos(angle) * 900,   // px/s
        vy: Math.sin(angle) * 900,
        born: now,
        life: 650 + Math.random() * 250, // ms
      };
      nextShooterAt = now + 6000 + Math.random() * 8000;
    }

    function drawField(now) {
      ctx.clearRect(0, 0, W, H);
      const tSec = now / 1000;
      for (const s of stars) {
        s.y -= s.spd;
        s.x += s.dx;
        if (s.y < -3) { s.y = H + 3; s.x = Math.random() * W; }
        if (s.x < -3) s.x = W + 3;
        if (s.x > W + 3) s.x = -3;
        const twinkle = 0.65 + 0.35 * Math.sin(tSec * s.twSpd + s.twPh);
        const alpha = Math.max(0, Math.min(1, s.a * twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.cyan
          ? `rgba(140,240,225,${alpha})`
          : `rgba(200,220,255,${alpha})`;
        ctx.fill();
      }
    }

    function drawShooter(now) {
      if (!shooter) {
        if (now >= nextShooterAt && W > 0) spawnShooter(now);
        return;
      }
      const age = now - shooter.born;
      if (age > shooter.life) { shooter = null; return; }
      const t = age / 1000;
      const hx = shooter.x + shooter.vx * t;
      const hy = shooter.y + shooter.vy * t;
      const fade = 1 - age / shooter.life;
      const tail = 90 * fade + 30;
      const tx = hx - (shooter.vx / 900) * tail;
      const ty = hy - (shooter.vy / 900) * tail;
      const grad = ctx.createLinearGradient(tx, ty, hx, hy);
      grad.addColorStop(0, 'rgba(0,229,204,0)');
      grad.addColorStop(1, `rgba(235,250,255,${0.9 * fade})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    }

    function frame(now) {
      drawField(now);
      drawShooter(now);
      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      canvas.width = width;
      canvas.height = height;
      W = width; H = height;
      buildStars(W, H);
      if (REDUCED) drawField(0); // single static paint
    });
    ro.observe(canvas);

    if (!REDUCED) {
      nextShooterAt = performance.now() + 3500 + Math.random() * 5000;
      raf = requestAnimationFrame(frame);
    }

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [seed]);

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
