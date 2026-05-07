import React, { useState, useEffect } from 'react';
import LazyGumlet from './LazyGumlet';
import { WHAT_WE_MAKE } from './content';

/**
 * WhatWeMakeSection — services grid above the Articles timeline.
 *
 * Visual variants. Imagery + typography are the visual; no chrome (no chips,
 * no badges, no "Learn more →"). Variants explore different
 * image/type compositions to find the one that lands "uniform but sexy."
 *
 * Picker bottom-right.
 *   A: Cover    — magazine-cover. Full-bleed image with unified warm duotone.
 *                 Big sentence-case title overlaid bottom-left. Service number
 *                 top-left. The image is the visual; the type is the headline.
 *   B: Split    — card is half image (top) / half solid color block (bottom).
 *                 Title lives in the color block. Editorial half-and-half.
 *                 Color blocks alternate Night/Cream/Orange across the grid.
 *   C: Number   — huge outlined service number (01, 02...) is the visual. Tiny
 *                 image inset top-right. Title lives below the number. The
 *                 number IS the art.
 *   D: Tower    — tall card, image takes 70%, bottom 30% is a solid AOM color
 *                 band with the title in big type sitting on it. Cinematic.
 *
 * All image-bearing cards use a UnifiedCover that desaturates + warm-tints so
 * different source assets read as one family.
 */

const STORAGE_KEY = 'aom_what_we_make_variant';
const VARIANTS = ['A', 'B', 'C', 'D'];
const VARIANT_LABELS = { A: 'Cover', B: 'Split', C: 'Number', D: 'Tower' };
const DEFAULT_VARIANT = 'A';

function useVariant() {
  const [v, setV] = useState(DEFAULT_VARIANT);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VARIANTS.includes(stored)) setV(stored);
    } catch {}
  }, []);
  const set = (next) => {
    setV(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  };
  return [v, set];
}

function VariantPicker({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 border border-white/[0.10] rounded-full bg-black/40 backdrop-blur p-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 px-2">Layout</span>
      {VARIANTS.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`font-mono text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full transition-colors ${
            value === v ? 'bg-[#E85D26] text-[#0C0C0C]' : 'text-[#F0ECE6]/60 hover:text-[#F0ECE6]'
          }`}
        >
          {v} · {VARIANT_LABELS[v]}
        </button>
      ))}
    </div>
  );
}

/**
 * UnifiedCover — desaturate source asset + warm tint multiply so any reel/image
 * reads in the same color family.
 */
function UnifiedCover({ s, scale = true }) {
  const visualClass = scale
    ? 'transition-transform duration-700 group-hover:scale-[1.04]'
    : '';
  return (
    <>
      <div className="absolute inset-0" style={{ filter: 'grayscale(50%) contrast(1.08) brightness(0.88)' }}>
        {s.reel ? (
          <LazyGumlet id={s.reel} className={visualClass} />
        ) : (
          <img
            src={s.image}
            alt={s.title}
            loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover ${visualClass}`}
          />
        )}
      </div>
      <div
        className="absolute inset-0 pointer-events-none mix-blend-multiply"
        style={{ background: 'linear-gradient(135deg, rgba(232,93,38,0.45) 0%, rgba(253,246,236,0.10) 100%)' }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
    </>
  );
}

const COLOR_PATTERN = ['night', 'cream', 'orange', 'night', 'cream', 'night', 'orange', 'cream', 'night', 'orange'];
const COLOR_BG = { night: '#0C0C0C', cream: '#FDF6EC', orange: '#E85D26' };
const COLOR_TYPE = { night: '#F0ECE6', cream: '#0C0C0C', orange: '#0C0C0C' };
const COLOR_ACCENT = { night: '#E85D26', cream: '#E85D26', orange: '#0C0C0C' };
const COLOR_BODY = { night: 'rgba(240,236,230,0.55)', cream: 'rgba(12,12,12,0.55)', orange: 'rgba(12,12,12,0.65)' };
const COLOR_NUM = { night: 'rgba(240,236,230,0.18)', cream: 'rgba(12,12,12,0.18)', orange: 'rgba(12,12,12,0.22)' };

/* ───────────────────────── A — Cover (magazine cover) ───────────────────────── */
function VariantA() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {WHAT_WE_MAKE.map((s, i) => (
        <a
          key={s.href}
          href={s.href || '#'}
          className="group relative block aspect-[4/5] rounded-xl overflow-hidden bg-[#0a0a0a] no-underline"
        >
          <UnifiedCover s={s} />
          <span className="absolute top-5 left-6 font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#F0ECE6]/85">
            {String(i + 1).padStart(2, '0')} / 10
          </span>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#FFB58A] mb-3">{s.eyebrow}</p>
            <h3 className="font-headline text-[34px] md:text-[44px] leading-[0.98] tracking-[-0.025em] text-[#F0ECE6] group-hover:text-[#FF6B2C] transition-colors">
              {s.title}<span className="text-[#E85D26]">.</span>
            </h3>
          </div>
        </a>
      ))}
    </div>
  );
}

/* ───────────────────────── B — Split (image top / color block bottom) ───────────────────────── */
function VariantB() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {WHAT_WE_MAKE.map((s, i) => {
        const tone = COLOR_PATTERN[i % COLOR_PATTERN.length];
        return (
          <a
            key={s.href}
            href={s.href || '#'}
            className="group block rounded-xl overflow-hidden no-underline"
          >
            <div className="relative aspect-[5/4] overflow-hidden bg-[#0a0a0a]">
              <UnifiedCover s={s} />
            </div>
            <div
              className="p-6 md:p-7 flex flex-col gap-2"
              style={{ backgroundColor: COLOR_BG[tone] }}
            >
              <div className="flex items-baseline justify-between">
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.32em]"
                  style={{ color: COLOR_ACCENT[tone] }}
                >
                  {s.eyebrow}
                </p>
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: COLOR_BODY[tone] }}
                >
                  {String(i + 1).padStart(2, '0')}
                </p>
              </div>
              <h3
                className="font-headline text-[26px] md:text-[34px] leading-[1.0] tracking-[-0.022em] mt-1"
                style={{ color: COLOR_TYPE[tone] }}
              >
                {s.title}<span style={{ color: COLOR_ACCENT[tone] }}>.</span>
              </h3>
              <p
                className="font-body text-[13px] md:text-[14px] leading-[1.55] mt-2"
                style={{ color: COLOR_BODY[tone] }}
              >
                {s.body}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}

/* ───────────────────────── C — Number (huge number is the visual) ───────────────────────── */
function VariantC() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {WHAT_WE_MAKE.map((s, i) => {
        const tone = COLOR_PATTERN[i % COLOR_PATTERN.length];
        const num = String(i + 1).padStart(2, '0');
        return (
          <a
            key={s.href}
            href={s.href || '#'}
            className="group relative block aspect-[4/5] rounded-xl overflow-hidden no-underline"
            style={{ backgroundColor: COLOR_BG[tone] }}
          >
            {/* Tiny image inset top-right with unified treatment */}
            <div className="absolute top-5 right-5 w-24 h-24 md:w-28 md:h-28 rounded-md overflow-hidden">
              <UnifiedCover s={s} scale={false} />
            </div>

            {/* HUGE outlined number — the actual visual */}
            <div className="absolute inset-0 flex items-center justify-start pl-6 md:pl-8 pointer-events-none">
              <span
                className="font-headline leading-[0.85] tracking-[-0.04em] select-none"
                style={{
                  fontSize: 'clamp(180px, 28vw, 360px)',
                  color: 'transparent',
                  WebkitTextStroke: `1.5px ${COLOR_NUM[tone]}`,
                }}
              >
                {num}
              </span>
            </div>

            {/* Title bottom-left */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-7">
              <p
                className="font-mono text-[10px] uppercase tracking-[0.32em] mb-2"
                style={{ color: COLOR_ACCENT[tone] }}
              >
                {s.eyebrow}
              </p>
              <h3
                className="font-headline text-[26px] md:text-[36px] leading-[0.98] tracking-[-0.022em]"
                style={{ color: COLOR_TYPE[tone] }}
              >
                {s.title}<span style={{ color: COLOR_ACCENT[tone] }}>.</span>
              </h3>
            </div>
          </a>
        );
      })}
    </div>
  );
}

/* ───────────────────────── D — Tower (tall image + color band bottom) ───────────────────────── */
function VariantD() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {WHAT_WE_MAKE.map((s, i) => {
        const tone = COLOR_PATTERN[i % COLOR_PATTERN.length];
        return (
          <a
            key={s.href}
            href={s.href || '#'}
            className="group relative block aspect-[3/5] rounded-xl overflow-hidden no-underline"
          >
            {/* Image takes top 70% */}
            <div className="absolute top-0 left-0 right-0 h-[70%] overflow-hidden bg-[#0a0a0a]">
              <UnifiedCover s={s} />
              <span className="absolute top-4 left-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[#F0ECE6]/80">
                {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            {/* Color band bottom 30% */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[30%] flex flex-col justify-center px-5"
              style={{ backgroundColor: COLOR_BG[tone] }}
            >
              <p
                className="font-mono text-[9.5px] uppercase tracking-[0.32em] mb-1.5"
                style={{ color: COLOR_ACCENT[tone] }}
              >
                {s.eyebrow}
              </p>
              <h3
                className="font-headline text-[20px] md:text-[24px] leading-[1.0] tracking-[-0.018em]"
                style={{ color: COLOR_TYPE[tone] }}
              >
                {s.title}<span style={{ color: COLOR_ACCENT[tone] }}>.</span>
              </h3>
            </div>
          </a>
        );
      })}
    </div>
  );
}

const RENDER = { A: VariantA, B: VariantB, C: VariantC, D: VariantD };

export default function WhatWeMakeSection() {
  const [variant, setVariant] = useVariant();
  const Variant = RENDER[variant] || VariantA;

  return (
    <section className="bg-[#0a0a0a] border-t border-white/[0.06] py-20 md:py-28 px-6 md:px-12">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-12 md:mb-16">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-4">What we make</p>
            <h2 className="font-headline text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] max-w-3xl text-[#F0ECE6]">
              The work, in plain <em className="text-[#E85D26]">English.</em>
            </h2>
            <p className="font-body text-[15px] md:text-[17px] text-[#F0ECE6]/65 mt-5 max-w-xl leading-[1.6]">
              Ten things we make for clients. Pick the one that sounds like you.
            </p>
          </div>
        </div>

        <Variant />

        {VARIANTS.length > 1 && (
          <div className="mt-12 flex justify-end">
            <VariantPicker value={variant} onChange={setVariant} />
          </div>
        )}
      </div>
    </section>
  );
}
