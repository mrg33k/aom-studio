import React, { useEffect, useRef } from 'react';

// Cache loaded background images so phase swaps don't re-download.
const _imageCache = new Map();
function loadImage(src) {
  if (!src) return null;
  if (_imageCache.has(src)) return _imageCache.get(src);
  const img = new Image();
  img.src = src;
  _imageCache.set(src, img);
  return img;
}

/**
 * Canvas — pixel-art parallax background renderer.
 *
 * Two render modes:
 *   1. RASTER  — when phase.visuals.background is a real asset path. Drawn
 *      with image-rendering: pixelated so it stays crisp.
 *   2. PROCEDURAL — when no background is given. Draws four pixel layers
 *      (sky / far / mid / ground) using the phase's procedural palette, plus
 *      simple accent sprites (sun, stars, cracked_earth, etc.) so each phase
 *      looks distinct until Cleo's Nano Banana assets land.
 *
 * Parallax: on phase change, the renderer slides the previous-phase composite
 * out and the new-phase composite in over ~700ms. Each layer moves at a
 * different rate keyed off phase.visuals.parallax_offset.
 *
 * No layout dependency; fills its parent <div> via ResizeObserver.
 */

export default function Canvas({ phase }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animRef = useRef({ raf: 0, prevPhase: null, t: 1 });

  // Repaint when the phase changes; animate the swap.
  useEffect(() => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    const ctx = cnv.getContext('2d');
    ctx.imageSmoothingEnabled = true; // raster backgrounds want smoothing

    // Pre-load background image (raster mode) so it's ready before painting.
    const bgSrc = phase && phase.visuals && phase.visuals.background;
    const bgImg = bgSrc ? loadImage(bgSrc) : null;

    const startedAt = performance.now();
    const prevPhase = animRef.current.prevPhase;
    const DURATION = prevPhase ? 700 : 0;

    // Read CSS dimensions FRESH from the canvas every paint — the resize
    // effect can write cnv.width/height after this effect mounts, so we
    // never want to capture stale values in the closure.
    const cssDims = () => {
      const dpr = window.devicePixelRatio || 1;
      return {
        W: Math.max(1, Math.floor(cnv.width / dpr)),
        H: Math.max(1, Math.floor(cnv.height / dpr)),
      };
    };

    let imgFadeStartedAt = bgImg && bgImg.complete ? startedAt : null;
    const tick = (now) => {
      const elapsed = now - startedAt;
      const t = DURATION === 0 ? 1 : Math.min(1, elapsed / DURATION);
      animRef.current.t = t;
      const { W, H } = cssDims();
      // Image fade-in (0→1 over 400ms after the image becomes available).
      const imgAlpha = imgFadeStartedAt
        ? Math.min(1, (now - imgFadeStartedAt) / 400)
        : 0;
      paint(ctx, W, H, phase, prevPhase, easeOutCubic(t), imgAlpha);
      // Keep animating until both the parallax swap AND the image fade are done.
      const stillFading = imgFadeStartedAt != null && imgAlpha < 1;
      if (t < 1 || stillFading) {
        animRef.current.raf = requestAnimationFrame(tick);
      } else {
        animRef.current.prevPhase = phase;
      }
    };

    cancelAnimationFrame(animRef.current.raf);
    animRef.current.raf = requestAnimationFrame(tick);

    // If the image wasn't ready, start fade once it loads — and re-arm the RAF
    // loop so the paint actually happens.
    if (bgImg && !bgImg.complete) {
      const onLoad = () => {
        imgFadeStartedAt = performance.now();
        cancelAnimationFrame(animRef.current.raf);
        animRef.current.raf = requestAnimationFrame(tick);
      };
      bgImg.addEventListener('load', onLoad, { once: true });
      return () => {
        cancelAnimationFrame(animRef.current.raf);
        bgImg.removeEventListener('load', onLoad);
      };
    }
    return () => cancelAnimationFrame(animRef.current.raf);
  }, [phase]);

  // Keep canvas sized to its container.
  useEffect(() => {
    const cnv = canvasRef.current;
    const container = containerRef.current;
    if (!cnv || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Render at a moderate internal resolution so pixel chunks read.
      const W = Math.max(320, Math.floor(rect.width));
      const H = Math.max(240, Math.floor(rect.height));
      cnv.width = Math.floor(W * dpr);
      cnv.height = Math.floor(H * dpr);
      cnv.style.width = `${W}px`;
      cnv.style.height = `${H}px`;
      const ctx = cnv.getContext('2d');
      ctx.imageSmoothingEnabled = true; // raster backgrounds want smoothing
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // If the current phase has a loaded background image, show it at full
      // opacity immediately on resize (don't let imgAlpha silently default to 0).
      const bgSrc = phase && phase.visuals && phase.visuals.background;
      const bgImg = bgSrc ? loadImage(bgSrc) : null;
      const resizeImgAlpha = (bgImg && bgImg.complete && bgImg.naturalWidth > 0) ? 1 : 0;
      paint(ctx, W, H, phase, animRef.current.prevPhase, 1, resizeImgAlpha);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [phase]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}

// ─── painter ─────────────────────────────────────────────────────────────────

function paint(ctx, W, H, phase, prevPhase, t, imgAlpha = 0) {
  // Fill with deep space base color — prevents transparent canvas edges from
  // showing the CSS container black (#000) during phase transition animations.
  // clearRect would leave alpha=0 gaps; fillRect gives a solid #070B14 floor.
  ctx.fillStyle = '#070B14';
  ctx.fillRect(0, 0, W, H);
  // Render the previous composite first, sliding out left as t→1.
  if (prevPhase && t < 1) {
    ctx.save();
    ctx.translate(-W * t * 0.4, 0);
    drawPhase(ctx, W, H, prevPhase, t, true, imgAlpha);
    ctx.restore();
  }
  // Render the new composite sliding in from the right.
  ctx.save();
  ctx.translate(W * (1 - t) * 0.4, 0);
  drawPhase(ctx, W, H, phase, t, false, imgAlpha);
  ctx.restore();
}

function drawPhase(ctx, W, H, phase, t, isOutgoing, imgAlpha = 0) {
  if (!phase) return;
  const v = phase.visuals || {};

  // Always paint procedural first as the floor — guarantees something is
  // visible the moment the canvas mounts, no waiting on a 3MB PNG.
  drawProceduralLayers(ctx, W, H, v.procedural || defaultPalette(), v.parallax_offset || 0);
  drawAccents(ctx, W, H, v.procedural || defaultPalette(), phase, t);

  // RASTER MODE — fade Cleo's Nano Banana background in OVER the procedural
  // once it's available. imgAlpha drives the 400ms fade from 0→1.
  const bgImg = v.background ? loadImage(v.background) : null;
  if (bgImg && bgImg.complete && bgImg.naturalWidth > 0 && imgAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, imgAlpha));
    drawCoverImage(ctx, W, H, bgImg, v.parallax_offset || 0);
    ctx.restore();
  }

  // Subtle bottom vignette so the narrative card has somewhere to live.
  const vg = ctx.createLinearGradient(0, H * 0.45, 0, H);
  vg.addColorStop(0, 'rgba(8,10,16,0)');
  vg.addColorStop(1, 'rgba(8,10,16,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);

  // Fade the outgoing composite so the swap reads even at the seam.
  if (isOutgoing) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${t * 0.6})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
}

function drawCoverImage(ctx, W, H, img, parallaxOffset) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  // Cover fit (preserve aspect, fill viewport, crop overflow).
  const scale = Math.max(W / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  // Slight downward bias keyed off parallax_offset so later phases sit lower.
  const dy = (H - dh) / 2 + parallaxOffset * 6;
  const dx = (W - dw) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawProceduralLayers(ctx, W, H, p, offset) {
  // SKY — full canvas, gradient from sky color into far color.
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.75);
  skyGrad.addColorStop(0, p.sky);
  skyGrad.addColorStop(1, p.far);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // FAR — distant horizon silhouette, faint stepped pixel ridges.
  ctx.fillStyle = p.far;
  drawPixelRidge(ctx, W, H, H * 0.55, 8, 4, seedFromString(p.far));

  // MID — closer ridge, deeper color.
  ctx.fillStyle = p.mid;
  drawPixelRidge(ctx, W, H, H * 0.7, 14, 6, seedFromString(p.mid));

  // GROUND — solid ground band at the bottom, parallax-tinted.
  ctx.fillStyle = p.ground;
  ctx.fillRect(0, H * 0.85 - offset * 8, W, H - (H * 0.85 - offset * 8));
}

function drawPixelRidge(ctx, W, H, baseY, stepW, stepH, seed) {
  // Stepped pixel silhouette across the width — gives the "low-res landscape"
  // feel without needing assets. Deterministic per palette so a phase's
  // landscape doesn't reshuffle every paint.
  let rng = mulberry32(seed);
  const steps = Math.ceil(W / stepW) + 2;
  let y = baseY;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, y);
  for (let i = 0; i < steps; i++) {
    const x = i * stepW;
    const r = rng();
    const dy = (r - 0.5) * stepH * 2;
    y = Math.max(H * 0.35, Math.min(H * 0.92, y + dy));
    ctx.lineTo(x, Math.round(y));
    ctx.lineTo(x + stepW, Math.round(y));
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function drawAccents(ctx, W, H, p, phase, t) {
  const accents = (phase.visuals && phase.visuals.procedural && phase.visuals.procedural.accents) || [];
  accents.forEach((a) => {
    switch (a) {
      case 'stars':
      case 'stars_dense':
        drawStars(ctx, W, H, a === 'stars_dense' ? 80 : 40, seedFromString(phase.id + 's'));
        break;
      case 'horizon_glow':
        drawHorizonGlow(ctx, W, H, p.sky);
        break;
      case 'sun':
      case 'sun_low':
      case 'sun_haze':
        drawSun(ctx, W, H, a, p);
        break;
      case 'moon_silhouette':
      case 'moon_close':
        drawMoon(ctx, W, H, a, p);
        break;
      case 'earth':
      case 'earth_distant':
        drawEarth(ctx, W, H, a, p);
        break;
      case 'satellite_grid':
      case 'data_grid':
        drawGrid(ctx, W, H, p);
        break;
      case 'cracked_earth':
      case 'cracked_ground':
        drawCracks(ctx, W, H, p);
        break;
      case 'windmill':
        drawWindmill(ctx, W, H, p);
        break;
      case 'well':
        drawWell(ctx, W, H, p);
        break;
      case 'skyline':
      case 'skyline_dense':
        drawSkyline(ctx, W, H, a === 'skyline_dense' ? 18 : 10, p);
        break;
      case 'pipes':
        drawPipes(ctx, W, H, p);
        break;
      case 'monsoon_cloud':
      case 'rain':
        drawClouds(ctx, W, H, p, a === 'rain');
        break;
      case 'dry_reservoir':
        drawReservoir(ctx, W, H, p);
        break;
      case 'farmland':
        drawFarmland(ctx, W, H, p);
        break;
      case 'haze':
        drawHaze(ctx, W, H, p);
        break;
      default:
        break;
    }
  });
}

// ─── accent sprites (pixel rectangles, no images) ────────────────────────────

function drawStars(ctx, W, H, count, seed) {
  let rng = mulberry32(seed);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * W);
    const y = Math.floor(rng() * H * 0.55);
    const sz = rng() > 0.85 ? 3 : 2;
    ctx.fillRect(x, y, sz, sz);
  }
}

function drawHorizonGlow(ctx, W, H, color) {
  const grad = ctx.createLinearGradient(0, H * 0.4, 0, H * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, hexWithAlpha(color, 0.4));
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.4, W, H * 0.3);
}

function drawSun(ctx, W, H, variant, p) {
  const cx = variant === 'sun_low' ? W * 0.7 : W * 0.78;
  const cy = variant === 'sun_low' ? H * 0.55 : H * 0.3;
  const r = variant === 'sun_haze' ? 48 : 36;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
  grad.addColorStop(0, '#FFE39A');
  grad.addColorStop(0.4, hexWithAlpha(p.sky, 0.7));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  // Pixel disk
  ctx.fillStyle = '#FFE39A';
  fillPixelDisk(ctx, cx, cy, r, 4);
}

function drawMoon(ctx, W, H, variant, p) {
  const cx = variant === 'moon_close' ? W * 0.72 : W * 0.78;
  const cy = H * 0.34;
  const r = variant === 'moon_close' ? 56 : 30;
  ctx.fillStyle = '#D9DCE6';
  fillPixelDisk(ctx, cx, cy, r, 4);
  ctx.fillStyle = 'rgba(120,128,144,0.55)';
  // a few crater dots
  fillPixelDisk(ctx, cx - r * 0.3, cy - r * 0.1, 5, 2);
  fillPixelDisk(ctx, cx + r * 0.25, cy + r * 0.15, 7, 2);
  fillPixelDisk(ctx, cx - r * 0.1, cy + r * 0.4, 4, 2);
}

function drawEarth(ctx, W, H, variant, p) {
  const cx = variant === 'earth_distant' ? W * 0.18 : W * 0.5;
  const cy = variant === 'earth_distant' ? H * 0.7 : H * 0.45;
  const r = variant === 'earth_distant' ? 14 : 70;
  ctx.fillStyle = '#3C6E9C';
  fillPixelDisk(ctx, cx, cy, r, 4);
  ctx.fillStyle = '#3E8C5A';
  fillPixelDisk(ctx, cx - r * 0.3, cy - r * 0.1, r * 0.35, 4);
  fillPixelDisk(ctx, cx + r * 0.25, cy + r * 0.2, r * 0.25, 4);
}

function drawGrid(ctx, W, H, p) {
  ctx.strokeStyle = hexWithAlpha('#88B4D6', 0.18);
  ctx.lineWidth = 1;
  const step = 32;
  for (let x = 0; x < W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, H * 0.55);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = H * 0.55; y < H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

function drawCracks(ctx, W, H, p) {
  ctx.strokeStyle = hexWithAlpha('#1A0F08', 0.7);
  ctx.lineWidth = 2;
  const seed = seedFromString(p.ground + 'c');
  const rng = mulberry32(seed);
  for (let i = 0; i < 12; i++) {
    const x = rng() * W;
    const y = H * (0.88 + rng() * 0.1);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) {
      ctx.lineTo(x + (rng() - 0.5) * 60, y + rng() * 10);
    }
    ctx.stroke();
  }
}

function drawWindmill(ctx, W, H, p) {
  const x = W * 0.85;
  const y = H * 0.65;
  ctx.fillStyle = '#1A0F08';
  ctx.fillRect(x - 2, y, 4, 60);
  // blades — simple plus shape
  ctx.fillRect(x - 18, y - 2, 36, 4);
  ctx.fillRect(x - 2, y - 18, 4, 36);
}

function drawWell(ctx, W, H, p) {
  const x = W * 0.2;
  const y = H * 0.78;
  ctx.fillStyle = '#3A2415';
  ctx.fillRect(x - 14, y, 28, 6);
  ctx.fillRect(x - 12, y + 6, 24, 12);
  ctx.fillStyle = '#1A0F08';
  ctx.fillRect(x - 8, y + 8, 16, 8);
}

function drawSkyline(ctx, W, H, count, p) {
  const baseY = H * 0.68;
  const seed = seedFromString(p.mid + 'sk');
  const rng = mulberry32(seed);
  ctx.fillStyle = '#0E1E2B';
  for (let i = 0; i < count; i++) {
    const w = 24 + Math.floor(rng() * 36);
    const h = 40 + Math.floor(rng() * 100);
    const x = Math.floor((i / count) * W + rng() * 12);
    ctx.fillRect(x, baseY - h, w, h);
    // pixel window dots
    ctx.fillStyle = 'rgba(255,217,140,0.45)';
    for (let r = 0; r < Math.floor(h / 16); r++) {
      for (let c = 0; c < Math.floor(w / 12); c++) {
        if (rng() > 0.55) {
          ctx.fillRect(x + 4 + c * 12, baseY - h + 8 + r * 16, 4, 4);
        }
      }
    }
    ctx.fillStyle = '#0E1E2B';
  }
}

function drawPipes(ctx, W, H, p) {
  ctx.fillStyle = '#6B4423';
  ctx.fillRect(0, H * 0.86, W, 10);
  ctx.fillStyle = '#3A2415';
  for (let x = 0; x < W; x += 80) {
    ctx.fillRect(x, H * 0.84, 12, 14);
  }
}

function drawClouds(ctx, W, H, p, withRain) {
  ctx.fillStyle = 'rgba(60,70,82,0.85)';
  const clouds = [
    { x: W * 0.15, y: H * 0.18, w: 120, h: 30 },
    { x: W * 0.55, y: H * 0.12, w: 160, h: 36 },
    { x: W * 0.78, y: H * 0.22, w: 100, h: 26 },
  ];
  clouds.forEach((c) => ctx.fillRect(c.x, c.y, c.w, c.h));
  if (withRain) {
    ctx.fillStyle = 'rgba(180,210,230,0.45)';
    const rng = mulberry32(seedFromString(p.sky + 'r'));
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(rng() * W);
      const y = Math.floor(H * 0.25 + rng() * H * 0.55);
      ctx.fillRect(x, y, 2, 6);
    }
  }
}

function drawReservoir(ctx, W, H, p) {
  const baseY = H * 0.82;
  // dry basin ring
  ctx.strokeStyle = hexWithAlpha('#3D2614', 0.85);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(W * 0.55, baseY, W * 0.35, 22, 0, 0, Math.PI * 2);
  ctx.stroke();
  // tiny water remnant
  ctx.fillStyle = '#3C6E9C';
  ctx.beginPath();
  ctx.ellipse(W * 0.55, baseY, W * 0.08, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFarmland(ctx, W, H, p) {
  ctx.strokeStyle = hexWithAlpha('#2D1F12', 0.45);
  ctx.lineWidth = 1;
  for (let y = H * 0.86; y < H; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + 2);
    ctx.stroke();
  }
}

function drawHaze(ctx, W, H, p) {
  const grad = ctx.createLinearGradient(0, H * 0.4, 0, H);
  grad.addColorStop(0, 'rgba(255,220,170,0)');
  grad.addColorStop(1, 'rgba(255,220,170,0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.4, W, H * 0.6);
}

// ─── tiny utils ──────────────────────────────────────────────────────────────

function defaultPalette() {
  return { sky: '#0B132B', far: '#1C2541', mid: '#3A506B', ground: '#0B132B' };
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function fillPixelDisk(ctx, cx, cy, r, chunk) {
  // Approximate a circle with chunk×chunk pixel blocks.
  const r2 = r * r;
  for (let y = -r; y <= r; y += chunk) {
    for (let x = -r; x <= r; x += chunk) {
      if (x * x + y * y <= r2) {
        ctx.fillRect(Math.round(cx + x), Math.round(cy + y), chunk, chunk);
      }
    }
  }
}

function seedFromString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexWithAlpha(hex, alpha) {
  const c = hex.replace('#', '');
  const n = c.length === 3
    ? c.split('').map((x) => x + x).join('')
    : c;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
