import React, { useEffect, useState } from 'react';
import {
  Layers, Repeat, Zap, Workflow,
  Network, Brain, GitBranch, MessageSquare,
  Check, Minus, Quote, ArrowRight,
} from 'lucide-react';
import LazyGumlet from './LazyGumlet';
import { COMPARISON, TESTIMONIALS, PLATFORM_FEATURES, PILLARS } from './content';

/**
 * SystemSection — consolidated infographic that replaces the old
 * Comparison + Testimonials + Platform Features + Pillars stack.
 *
 * Two variants exist so you can compare:
 *   A · Guide       — original "field guide" infographic. 2×2 pillar compass +
 *                     scorecard rows + platform ribbon. Tidy. The kind of page
 *                     you'd see in a service manual.
 *   B · Centerfold  — campaign-book chapter. Massive typography, vertical
 *                     hero-per-pillar with imagery columns, comparison rendered
 *                     as a "rounds" card. Loud. The kind of page you'd see in
 *                     a Nike book.
 *
 * Picker bottom-right of section. Default = B (new direction first).
 */

const STORAGE_KEY = 'aom_system_variant';
const VARIANTS = ['A', 'B', 'C', 'D'];
const VARIANT_LABELS = { A: 'Guide', B: 'Centerfold', C: 'Manual', D: 'Atlas' };
const DEFAULT_VARIANT = 'B';

const PILLAR_VIEWS = [
  {
    pillar: PILLARS[0], // Scalable
    Icon: Layers,
    stat: { value: '50+', label: 'Brands shipped' },
 quote: TESTIMONIALS[1], // Brandon, "twice as fast"
    reels: [
      { id: '698a596eaec3d4e420c22a9a', aspect: 'vertical' },   // Lagos White Party
      { id: '698a5d24aec3d4e420c2a0a0', aspect: 'horizontal' }, // Pretty Penny
      { id: '698a5391fc23d3d76fa7306c', aspect: 'vertical' },   // PA'LA HARUMI
    ],
    accent: '#E85D26',
  },
  {
    pillar: PILLARS[1], // Flexible
    Icon: Repeat,
    stat: { value: '10+', label: 'Years doing this' },
 quote: TESTIMONIALS[2], // Skylar, "creative team already on staff"
    reels: [
      { id: '698a5d24aec3d4e420c2a0a0', aspect: 'horizontal' },
      { id: '698a581daec3d4e420c20b94', aspect: 'vertical' },
      { id: '698a5b86fc23d3d76fa82ece', aspect: 'horizontal' },
    ],
    accent: '#C9A84C',
  },
  {
    pillar: PILLARS[2], // Responsive
    Icon: Zap,
    stat: { value: '24h', label: 'Reply window' },
 quote: TESTIMONIALS[3], // ISA Energy, "Tuesday → Thursday"
    reels: [
      { id: '698a64e5873071aec5ca99ac', aspect: 'horizontal' },
      { id: '698a5391873071aec5c8b654', aspect: 'vertical' },
      { id: '698a6177873071aec5ca4374', aspect: 'horizontal' },
    ],
    accent: '#7C9A72',
  },
  {
    pillar: PILLARS[3], // Seamless
    Icon: Workflow,
    stat: { value: '48h', label: 'First draft, most jobs' },
 quote: TESTIMONIALS[0], // Patrick, "didn't just shoot a film"
    reels: [
      { id: '698a6296fc23d3d76fa8d992', aspect: 'horizontal' },
      { id: '698a580bfc23d3d76fa7bd7c', aspect: 'vertical' },
      { id: '698a63e5aec3d4e420c34783', aspect: 'horizontal' },
    ],
    accent: '#E85D26',
  },
];

const PLATFORM_ICONS = [Network, Brain, GitBranch, MessageSquare];

/* ─────────── Hooks + picker ─────────── */
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

/* ─────────── Decorative pattern backdrop ─────────── */
function DotGrid({ className = '' }) {
  return (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} aria-hidden="true">
      <defs>
        <pattern id="aom-dots" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(232,93,38,0.10)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#aom-dots)" />
    </svg>
  );
}

function DiagonalStripe({ className = '', height = 'h-3' }) {
  return (
    <div className={`relative ${height} ${className}`} aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(232,93,38,0.55) 0 2px, transparent 2px 12px)',
        }}
      />
    </div>
  );
}

/* ─────────────────────────── A · Guide (the original tidy infographic) ─────────────────────────── */
function VariantA() {
  return (
    <>
      {/* Header */}
      <header className="flex items-end justify-between gap-8 flex-wrap mb-16 md:mb-20">
        <div className="flex-1 min-w-[280px]">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-8 h-px bg-[#E85D26]" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">The AOM Field Guide · How we work</p>
          </div>
          <h2 className="font-headline text-[40px] md:text-[80px] leading-[0.92] tracking-[-0.025em] text-[#F0ECE6]">
            Our system, <em className="text-[#E85D26]">on one page.</em>
          </h2>
          <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/65 mt-5 max-w-2xl leading-[1.6]">
            How we work, what makes us different, and what clients say. The infographic version of the pitch.
          </p>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          {[
            { color: '#E85D26', label: '04 pillars' },
            { color: '#7C9A72', label: `${COMPARISON.rows.length} comparisons` },
            { color: '#C9A84C', label: `${PLATFORM_FEATURES.length} system inputs` },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">{l.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Pillar compass */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-7">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">01 · The four pillars</p>
          <span className="flex-1 h-px bg-[#E85D26]/25" />
        </div>
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {PILLAR_VIEWS.map((view, i) => {
            const { pillar, Icon, stat, quote, reels, accent } = view;
            const heroReel = reels[0];
            const isVertical = heroReel.aspect === 'vertical';
            return (
              <article key={pillar.title} className="relative bg-[#0C0C0C] border border-white/[0.08] rounded-2xl overflow-hidden p-7 md:p-8 flex flex-col gap-6 group hover:border-[#E85D26]/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}55` }}>
                      <Icon size={20} style={{ color: accent }} />
                    </div>
                    <div>
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.32em]" style={{ color: accent }}>No. {String(i + 1).padStart(2, '0')} / 04</p>
                      <h3 className="font-headline text-[26px] md:text-[32px] leading-[1.0] tracking-[-0.02em] text-[#F0ECE6]">{pillar.title}</h3>
                    </div>
                  </div>
                  <div className={`shrink-0 ${isVertical ? 'w-16 h-24' : 'w-24 h-16'} rounded-lg overflow-hidden bg-black relative border border-white/[0.10]`}>
                    <LazyGumlet id={heroReel.id} portrait={isVertical} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
                  </div>
                </div>
                <p className="font-body text-[14.5px] md:text-[15px] text-[#F0ECE6]/70 leading-[1.6]">{pillar.body}</p>
                <div className="flex items-baseline gap-3 border-t border-white/[0.08] pt-4">
                  <p className="font-headline text-[40px] md:text-[48px] leading-none tracking-[-0.03em]" style={{ color: accent }}>{stat.value}</p>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/65 max-w-[140px]">{stat.label}</p>
                </div>
                <figure className="border-l-2 pl-4 mt-auto" style={{ borderColor: accent }}>
                  <Quote size={14} className="text-[#F0ECE6]/35 mb-2" />
                  <blockquote className="font-headline text-[15px] md:text-[16px] leading-[1.4] tracking-[-0.005em] text-[#F0ECE6]">"{quote.quote}"</blockquote>
                  <figcaption className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 mt-3">{quote.author} · {quote.role}</figcaption>
                </figure>
              </article>
            );
          })}
          <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-[#0a0a0a] border-2 border-[#E85D26] flex items-center justify-center shadow-[0_0_60px_rgba(232,93,38,0.25)]">
              <p className="font-headline text-[18px] tracking-[-0.02em] text-[#E85D26]">AOM</p>
            </div>
          </div>
        </div>
      </div>

      <div className="my-16 md:my-20"><DiagonalStripe /></div>

      {/* Scorecard */}
      <div>
        <div className="flex items-center gap-3 mb-7">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">02 · The scorecard</p>
          <span className="flex-1 h-px bg-[#E85D26]/25" />
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C]/60 backdrop-blur p-5 md:p-7">
          {COMPARISON.rows.map((row, i) => (
            <div key={row.label} className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 py-5 border-b border-white/[0.08] last:border-b-0 items-center">
              <div className="md:col-span-3 flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26]/85">{String(i + 1).padStart(2, '0')} / {String(COMPARISON.rows.length).padStart(2, '0')}</span>
                <p className="font-headline text-[18px] md:text-[20px] tracking-[-0.012em] text-[#F0ECE6]">{row.label}</p>
              </div>
              <div className="md:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
                {row.cells.map((cell, ci) => {
                  const isAOM = ci === 0;
                  return (
                    <div key={ci} className={`relative rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 ${isAOM ? 'bg-[#E85D26]/12 border border-[#E85D26]/55' : 'bg-white/[0.02] border border-white/[0.08]'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isAOM ? 'bg-[#E85D26] text-[#0C0C0C]' : 'bg-white/[0.04] text-[#F0ECE6]/40'}`}>
                        {isAOM ? <Check size={12} strokeWidth={3} /> : <Minus size={12} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`font-mono text-[9.5px] uppercase tracking-[0.22em] ${isAOM ? 'text-[#E85D26]' : 'text-[#F0ECE6]/45'}`}>{COMPARISON.cols[ci]}</p>
                        <p className={`font-body text-[12.5px] leading-tight truncate mt-0.5 ${isAOM ? 'text-[#F0ECE6] font-medium' : 'text-[#F0ECE6]/60'}`}>{cell}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="my-16 md:my-20"><DiagonalStripe /></div>

      {/* Platform footer */}
      <div>
        <div className="flex items-center gap-3 mb-7">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">03 · System inputs</p>
          <span className="flex-1 h-px bg-[#E85D26]/25" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {PLATFORM_FEATURES.map((f, i) => {
            const Icon = PLATFORM_ICONS[i] || Network;
            return (
              <div key={f.title} className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C]/60 backdrop-blur p-6 hover:border-[#E85D26]/35 transition-colors flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-[#E85D26]/10 border border-[#E85D26]/30 flex items-center justify-center">
                    <Icon size={18} className="text-[#E85D26]" />
                  </div>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#E85D26]/70">{String(i + 1).padStart(2, '0')} / 04</p>
                </div>
                <h4 className="font-headline text-[20px] md:text-[22px] leading-[1.1] tracking-[-0.012em] text-[#F0ECE6]">{f.title}</h4>
                <p className="font-body text-[13px] md:text-[13.5px] text-[#F0ECE6]/65 leading-[1.55]">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── B · Centerfold (campaign-book chapter) ───────────────────────────
 * Vertical chapter layout. Massive typography. Hero-per-pillar with a 3-up
 * imagery column. Comparison as a "rounds" boxing-card. Platform features as
 * a sticker pack at the close. Reads like a campaign-book spread.
 */
function VariantB() {
  return (
    <>
      {/* Chapter title page */}
      <header className="relative pb-20 md:pb-28 mb-20 md:mb-28 border-b-2 border-[#E85D26]/40">
        <div className="flex items-baseline gap-4 mb-8">
          <span className="w-12 h-px bg-[#E85D26]" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Chapter · OPS-01 · The system</p>
          <span className="flex-1" />
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 hidden md:block">A campaign book by AOM · Vol. 04 · 2026</p>
        </div>

        <h2 className="font-headline tracking-[-0.04em] leading-[0.78] text-[#F0ECE6]">
          <span className="block text-[64px] md:text-[180px] xl:text-[220px]">OUR SYSTEM,</span>
          <span className="block text-[64px] md:text-[180px] xl:text-[220px] text-[#E85D26]">ON ONE</span>
          <span className="block text-[64px] md:text-[180px] xl:text-[220px]">PAGE.</span>
        </h2>

        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-12 gap-8">
          <p className="md:col-span-7 font-body text-[16px] md:text-[20px] text-[#F0ECE6]/70 leading-[1.55] first-letter:font-headline first-letter:text-[64px] first-letter:float-left first-letter:mr-3 first-letter:leading-[0.95] first-letter:text-[#E85D26]">
 Four pillars. One scorecard. The thing under the hood. Read it the way you'd read a campaign book, top to bottom, no skimming.
          </p>
          <div className="md:col-span-5 grid grid-cols-2 gap-3 md:gap-4">
            {PILLAR_VIEWS.map((v, i) => (
              <div key={i} className="border border-white/[0.10] rounded-lg p-4 flex flex-col gap-1 hover:border-[#E85D26]/40 transition-colors">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.28em]" style={{ color: v.accent }}>No. {String(i + 1).padStart(2, '0')}</p>
                <p className="font-headline text-[18px] tracking-[-0.012em] text-[#F0ECE6]">{v.pillar.title}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/50 mt-1">{v.stat.value} · {v.stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Hero per pillar — vertical chapter layout */}
      <div className="space-y-24 md:space-y-32">
        {PILLAR_VIEWS.map((view, i) => {
          const { pillar, Icon, stat, quote, reels, accent } = view;
          return (
            <article key={pillar.title} className="relative">
              {/* Massive numeral as zone marker */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
                {/* Numeral column */}
                <div className="lg:col-span-3 flex flex-col gap-4">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.32em]" style={{ color: accent }}>Pillar No. {String(i + 1).padStart(2, '0')} / 04</p>
                  <p className="font-headline text-[180px] md:text-[260px] xl:text-[320px] leading-[0.78] tracking-[-0.06em]" style={{ color: accent }}>
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}55` }}>
                      <Icon size={22} style={{ color: accent }} />
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#F0ECE6]/70">{pillar.title}</p>
                  </div>
                </div>

                {/* Headline + body + quote */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <h3 className="font-headline text-[44px] md:text-[88px] leading-[0.9] tracking-[-0.03em] text-[#F0ECE6]">
                    {pillar.title}.
                  </h3>
                  <p className="font-body text-[16px] md:text-[20px] text-[#F0ECE6]/75 leading-[1.55] max-w-xl">{pillar.body}</p>
                  <div className="flex items-baseline gap-4 mt-2">
                    <p className="font-headline text-[80px] md:text-[120px] leading-none tracking-[-0.03em]" style={{ color: accent }}>{stat.value}</p>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/65 max-w-[160px]">{stat.label}</p>
                  </div>
                  {/* Pull quote */}
                  <figure className="mt-4 pt-6 border-t-2" style={{ borderColor: accent }}>
                    <blockquote className="font-headline text-[20px] md:text-[28px] leading-[1.25] tracking-[-0.012em] text-[#F0ECE6]">
                      "{quote.quote}"
                    </blockquote>
                    <figcaption className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#F0ECE6]/65 mt-4 inline-flex items-center gap-2">
                      <span className="w-3 h-px" style={{ background: accent }} />
                      {quote.author} · {quote.role}
                    </figcaption>
                  </figure>
                </div>

                {/* Imagery stack — 3 reels */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#F0ECE6]/45 mb-1">Receipts · The work</p>
                  {reels.map((r, ri) => {
                    const isVertical = r.aspect === 'vertical';
                    return (
                      <div key={ri} className={`bg-black relative overflow-hidden rounded-lg border border-white/[0.08] hover:border-[#E85D26]/40 transition-colors ${isVertical ? 'aspect-[9/12]' : 'aspect-[16/10]'}`}>
                        <LazyGumlet id={r.id} portrait={isVertical} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Big diagonal stripe between zones (except last) */}
              {i < PILLAR_VIEWS.length - 1 && (
                <div className="mt-24 md:mt-32 -mx-6 md:-mx-12">
                  <DiagonalStripe height="h-6" />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* THE SCORECARD — fight card style */}
      <div className="my-24 md:my-32 -mx-6 md:-mx-12">
        <DiagonalStripe height="h-6" />
      </div>
      <section className="relative">
        <div className="flex items-baseline gap-4 mb-10">
          <span className="w-12 h-px bg-[#E85D26]" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Round card · AOM vs the alternatives</p>
        </div>
        <h3 className="font-headline text-[60px] md:text-[160px] leading-[0.85] tracking-[-0.04em] text-[#F0ECE6] mb-12">
          ROUND<span className="text-[#E85D26]">.</span> BY<span className="text-[#E85D26]">.</span> ROUND<span className="text-[#E85D26]">.</span>
        </h3>

        <div className="space-y-3 md:space-y-4">
          {COMPARISON.rows.map((row, i) => {
            const aomCell = row.cells[0];
            const others = row.cells.slice(1);
            return (
              <div key={row.label} className="border-2 border-[#E85D26]/30 rounded-2xl bg-[#0C0C0C] overflow-hidden">
                {/* Round header */}
                <div className="flex items-baseline justify-between px-6 md:px-8 pt-5 pb-3 border-b border-white/[0.06]">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Round {String(i + 1).padStart(2, '0')} of {String(COMPARISON.rows.length).padStart(2, '0')}</p>
                  <p className="font-headline text-[28px] md:text-[40px] tracking-[-0.02em] text-[#F0ECE6]">{row.label}</p>
                </div>
                {/* Fight body */}
                <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
                  {/* AOM corner — orange */}
                  <div className="md:col-span-7 bg-[#E85D26]/[0.08] p-7 md:p-9 border-b md:border-b-0 md:border-r border-[#E85D26]/30 flex flex-col gap-3 relative">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#E85D26] text-[#0C0C0C] flex items-center justify-center"><Check size={16} strokeWidth={3} /></span>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">AOM corner</p>
                    </div>
                    <p className="font-headline text-[28px] md:text-[44px] leading-[1.0] tracking-[-0.022em] text-[#F0ECE6]">{aomCell}</p>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#E85D26]/70 mt-2">Winner · {row.label}</p>
                  </div>
                  {/* Others corner — dim */}
                  <div className="md:col-span-5 p-7 md:p-9 flex flex-col gap-3 bg-[#0a0a0a]">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.10] text-[#F0ECE6]/40 flex items-center justify-center"><Minus size={14} /></span>
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#F0ECE6]/55">The alternatives</p>
                    </div>
                    <ul className="space-y-2.5 mt-1">
                      {others.map((cell, ci) => (
                        <li key={ci} className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-2 last:border-b-0">
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">{COMPARISON.cols[ci + 1]}</p>
                          <p className="font-body text-[13.5px] text-[#F0ECE6]/65 text-right">{cell}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* PLATFORM — sticker pack */}
      <div className="my-24 md:my-32 -mx-6 md:-mx-12">
        <DiagonalStripe height="h-6" />
      </div>
      <section>
        <div className="flex items-baseline gap-4 mb-10">
          <span className="w-12 h-px bg-[#E85D26]" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Sticker pack · What runs underneath</p>
        </div>
        <h3 className="font-headline text-[44px] md:text-[120px] leading-[0.85] tracking-[-0.04em] text-[#F0ECE6] mb-12">
          THE <em className="text-[#E85D26]">OPS</em>.
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORM_FEATURES.map((f, i) => {
            const Icon = PLATFORM_ICONS[i] || Network;
            const accents = ['#E85D26', '#7C9A72', '#C9A84C', '#E85D26'];
            const accent = accents[i];
            return (
              <div key={f.title} className="relative rounded-2xl p-7 md:p-8 flex flex-col gap-5 hover:scale-[1.02] transition-transform" style={{ background: `${accent}10`, border: `1px solid ${accent}50` }}>
                {/* Sticker corner badge */}
                <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full flex items-center justify-center font-headline text-[14px] tracking-[-0.01em] shadow-[0_4px_20px_rgba(0,0,0,0.4)]" style={{ background: accent, color: '#0C0C0C' }}>
                  No.{String(i + 1).padStart(2, '0')}
                </div>
                <Icon size={32} style={{ color: accent }} />
                <h4 className="font-headline text-[22px] md:text-[28px] leading-[1.05] tracking-[-0.018em] text-[#F0ECE6]">{f.title}</h4>
                <p className="font-body text-[13.5px] md:text-[14px] text-[#F0ECE6]/70 leading-[1.6]">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing colophon */}
      <div className="mt-24 md:mt-28 pt-10 border-t-2 border-[#E85D26]/40 flex items-baseline justify-between gap-6 flex-wrap">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-2">End of chapter</p>
          <p className="font-headline text-[28px] md:text-[44px] tracking-[-0.025em] text-[#F0ECE6]">The campaign continues.</p>
        </div>
        <a href="/articles" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] hover:text-[#FF6B2C] transition-colors no-underline">
          Browse the articles <ArrowRight size={13} />
        </a>
      </div>
    </>
  );
}

/* ─────────────────────────── C · Manual (industrial blueprint) ───────────────────────────
 * Technical-manual aesthetic. Header is a doc cover. Pillars are spec-sheet
 * entries with revision numbers and technical labels. Comparison is a dense
 * test-results table with PASS/FAIL indicators. Platform is a control panel.
 * Heavy mono type, dot grid more prominent, blueprint connectors.
 */
function VariantC() {
  return (
    <>
      {/* Doc cover header */}
      <header className="mb-16 md:mb-20 border-2 border-[#E85D26]/40 rounded-2xl p-7 md:p-10 bg-[#0C0C0C] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 opacity-50 pointer-events-none">
          <DotGrid className="opacity-60" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-end">
          <div className="md:col-span-8">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-3">AOM / SYS / MANUAL · Rev.04 · 2026</p>
            <h2 className="font-headline text-[44px] md:text-[96px] leading-[0.85] tracking-[-0.035em] text-[#F0ECE6] mb-4">
              OPERATING<br /><em className="text-[#E85D26]">MANUAL</em>
            </h2>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 max-w-md">
              Section 01 · System inputs, pillars, performance scorecard.<br />
              Read in full, retained for the operations record.
            </p>
          </div>
          <div className="md:col-span-4 grid grid-cols-2 gap-2">
            {[
              { label: 'Document', value: 'OPS-SYS-001' },
              { label: 'Revision',  value: '04 / 2026'  },
              { label: 'Sections',  value: '03'         },
              { label: 'Approved',  value: 'Yes'        },
            ].map((m) => (
              <div key={m.label} className="border border-white/[0.10] rounded-lg p-3 bg-[#0a0a0a]">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.28em] text-[#F0ECE6]/45">{m.label}</p>
                <p className="font-mono text-[12px] uppercase tracking-[0.15em] text-[#E85D26] mt-1">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Section A — Pillars as spec sheet entries */}
      <div className="mb-20 md:mb-24">
        <div className="flex items-baseline gap-4 mb-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Section A · Operating pillars</p>
          <span className="flex-1 h-px bg-[#E85D26]/25" />
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">04 entries</p>
        </div>
        <div className="border-t-2 border-b-2 border-[#E85D26]/40">
          {PILLAR_VIEWS.map((view, i) => {
            const { pillar, Icon, stat, quote, reels, accent } = view;
            const heroReel = reels[0];
            const isVertical = heroReel.aspect === 'vertical';
            return (
              <div key={pillar.title} className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-7 py-7 md:py-9 border-b border-white/[0.08] last:border-b-0 items-start">
                {/* Spec marker */}
                <div className="md:col-span-2 flex md:flex-col gap-3 md:gap-2">
                  <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: `${accent}15`, border: `1px solid ${accent}55` }}>
                    <Icon size={18} style={{ color: accent }} />
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.32em]" style={{ color: accent }}>P/N · AOM-P{String(i + 1).padStart(2, '0')}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 mt-1">Rev. 04</p>
                  </div>
                </div>
                {/* Spec body */}
                <div className="md:col-span-5 flex flex-col gap-3">
                  <h3 className="font-headline text-[28px] md:text-[40px] leading-[0.95] tracking-[-0.022em] text-[#F0ECE6]">{pillar.title}</h3>
                  <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/65 leading-[1.6]">{pillar.body}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 mt-1 inline-flex items-center gap-2 flex-wrap">
                    <span style={{ color: accent }}>Operator quote ·</span>
                    <span className="text-[#F0ECE6]/75 italic">"{quote.quote}"</span>
                    <span className="text-[#F0ECE6]/45">by {quote.author}</span>
                  </p>
                </div>
                {/* Performance metric */}
                <div className="md:col-span-2 border-l border-[#E85D26]/30 pl-5">
                  <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-[#E85D26]/70 mb-2">Measured</p>
                  <p className="font-headline text-[44px] md:text-[56px] leading-none tracking-[-0.03em]" style={{ color: accent }}>{stat.value}</p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 mt-2">{stat.label}</p>
                </div>
                {/* Field photo */}
                <div className="md:col-span-3">
                  <div className={`bg-black relative overflow-hidden rounded border border-white/[0.10] ${isVertical ? 'aspect-[9/12]' : 'aspect-[16/10]'}`}>
                    <LazyGumlet id={heroReel.id} portrait={isVertical} />
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 mt-2">FIG.{String(i + 1).padStart(2, '0')} · Field reference</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section B — Performance scorecard, dense test results */}
      <div className="mb-20 md:mb-24">
        <div className="flex items-baseline gap-4 mb-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Section B · Performance scorecard</p>
          <span className="flex-1 h-px bg-[#E85D26]/25" />
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">{COMPARISON.rows.length} test rows</p>
        </div>
        <div className="border-2 border-white/[0.08] bg-[#0C0C0C] rounded-lg overflow-hidden">
          {/* Column header */}
          <div className="grid grid-cols-12 gap-3 md:gap-4 px-5 md:px-7 py-3 bg-[#E85D26]/[0.08] border-b border-[#E85D26]/30">
            <p className="col-span-3 font-mono text-[9px] uppercase tracking-[0.28em] text-[#E85D26]">Test parameter</p>
            <p className="col-span-2 font-mono text-[9px] uppercase tracking-[0.28em] text-[#E85D26]">AOM result</p>
            <div className="col-span-7 grid grid-cols-3 gap-3">
              {COMPARISON.cols.slice(1).map((c) => (
                <p key={c} className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#F0ECE6]/45">{c}</p>
              ))}
            </div>
          </div>
          {/* Rows */}
          {COMPARISON.rows.map((row, i) => (
            <div key={row.label} className="grid grid-cols-12 gap-3 md:gap-4 px-5 md:px-7 py-4 border-b border-white/[0.06] last:border-b-0 items-center hover:bg-white/[0.02] transition-colors">
              <div className="col-span-3 flex items-center gap-3">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#E85D26]/70">B{String(i + 1).padStart(2, '0')}</span>
                <p className="font-headline text-[15px] md:text-[16px] tracking-[-0.01em] text-[#F0ECE6]">{row.label}</p>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-sm bg-[#E85D26] text-[#0C0C0C] flex items-center justify-center"><Check size={12} strokeWidth={3} /></span>
                <p className="font-body text-[12.5px] text-[#F0ECE6] font-medium truncate">{row.cells[0]}</p>
              </div>
              <div className="col-span-7 grid grid-cols-3 gap-3">
                {row.cells.slice(1).map((cell, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-sm bg-white/[0.04] border border-white/[0.10] text-[#F0ECE6]/30 flex items-center justify-center"><Minus size={10} /></span>
                    <p className="font-body text-[12px] text-[#F0ECE6]/55 truncate">{cell}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section C — Platform as control panel */}
      <div>
        <div className="flex items-baseline gap-4 mb-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Section C · Control panel inputs</p>
          <span className="flex-1 h-px bg-[#E85D26]/25" />
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">{PLATFORM_FEATURES.length} inputs</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[#E85D26]/30 border-2 border-[#E85D26]/40 rounded-lg overflow-hidden">
          {PLATFORM_FEATURES.map((f, i) => {
            const Icon = PLATFORM_ICONS[i] || Network;
            return (
              <div key={f.title} className="bg-[#0C0C0C] p-6 md:p-7 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className="text-[#E85D26]" />
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#E85D26]">INPUT.{String(i + 1).padStart(2, '0')}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7C9A72] animate-pulse" />
                    <p className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-[#7C9A72]">Active</p>
                  </span>
                </div>
                <h4 className="font-headline text-[18px] md:text-[20px] leading-[1.1] tracking-[-0.012em] text-[#F0ECE6]">{f.title}</h4>
                <p className="font-body text-[12.5px] text-[#F0ECE6]/65 leading-[1.55]">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer signature */}
      <div className="mt-16 pt-6 border-t border-white/[0.08] flex items-baseline justify-between gap-6 flex-wrap">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#F0ECE6]/45">END OF DOCUMENT · OPS-SYS-001 · Rev.04</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26]">Approved by AOM · 2026</p>
      </div>
    </>
  );
}

/* ─────────────────────────── D · Atlas (editorial spread with imagery as protagonist) ───────────────────────────
 * Editorial / world-atlas feel. Cover-style title page with hero imagery.
 * Each pillar is a region with a wide imagery band + body text + supporting
 * data card. Comparison reads as a dossier. Platform features inset as map
 * legend chips. Visual emphasis on photography over data.
 */
function VariantD() {
  const heroReels = [
    { id: '698a596eaec3d4e420c22a9a', aspect: 'vertical' },
    { id: '698a6296fc23d3d76fa8d992', aspect: 'horizontal' },
    { id: '698a5391fc23d3d76fa7306c', aspect: 'vertical' },
  ];
  return (
    <>
      {/* Atlas cover */}
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-20 md:mb-28 items-end">
        <div className="lg:col-span-7 order-2 lg:order-1">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="w-12 h-px bg-[#E85D26]" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">An atlas · The AOM territory</p>
          </div>
          <h2 className="font-headline text-[44px] md:text-[120px] leading-[0.85] tracking-[-0.035em] text-[#F0ECE6]">
            Our system,<br /><em className="text-[#E85D26]">mapped.</em>
          </h2>
          <p className="font-body text-[16px] md:text-[19px] text-[#F0ECE6]/70 leading-[1.55] mt-7 max-w-xl first-letter:font-headline first-letter:text-[60px] first-letter:float-left first-letter:mr-3 first-letter:leading-[0.95] first-letter:text-[#E85D26]">
            Four pillars. One scorecard. The work that proves it. Treat this like a dossier — flip through, get the lay of the land.
          </p>
        </div>
        <div className="lg:col-span-5 order-1 lg:order-2 grid grid-cols-3 gap-2 md:gap-3">
          {heroReels.map((r, i) => {
            const isVertical = r.aspect === 'vertical';
            return (
              <div key={i} className={`bg-black relative overflow-hidden rounded-lg border border-white/[0.10] ${isVertical ? 'aspect-[9/14]' : 'aspect-[5/7]'}`}>
                <LazyGumlet id={r.id} portrait={isVertical} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
                <p className="absolute bottom-2 left-2 font-mono text-[8.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/85">Plate {String(i + 1).padStart(2, '0')}</p>
              </div>
            );
          })}
        </div>
      </header>

      {/* Pillar regions — wide imagery band + body + sidecar */}
      <div className="space-y-16 md:space-y-20">
        {PILLAR_VIEWS.map((view, i) => {
          const { pillar, Icon, stat, quote, reels, accent } = view;
          return (
            <article key={pillar.title} className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
              {/* Hero imagery band — left */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-2 md:gap-3 content-start">
                {reels.map((r, ri) => {
                  const isVertical = r.aspect === 'vertical';
                  const big = ri === 0;
                  return (
                    <div
                      key={ri}
                      className={`bg-black relative overflow-hidden rounded-lg border border-white/[0.08] ${
                        big ? 'col-span-2 aspect-[16/10]' : isVertical ? 'aspect-[9/14]' : 'aspect-[5/4]'
                      }`}
                    >
                      <LazyGumlet id={r.id} portrait={isVertical} />
                    </div>
                  );
                })}
              </div>
              {/* Content — right */}
              <div className="lg:col-span-7 flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.32em]" style={{ color: accent }}>Region No. {String(i + 1).padStart(2, '0')} / 04</p>
                  <span className="flex-1 h-px" style={{ background: `${accent}40` }} />
                  <Icon size={16} style={{ color: accent }} />
                </div>
                <h3 className="font-headline text-[40px] md:text-[72px] leading-[0.92] tracking-[-0.025em] text-[#F0ECE6]">
                  {pillar.title}.
                </h3>
                <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 leading-[1.55] max-w-2xl">
                  {pillar.body}
                </p>
                {/* Inset card with stat + quote */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-3 pt-5 border-t" style={{ borderColor: `${accent}40` }}>
                  <div>
                    <p className="font-headline text-[64px] md:text-[88px] leading-none tracking-[-0.03em]" style={{ color: accent }}>{stat.value}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 mt-2">{stat.label}</p>
                  </div>
                  <figure className="md:border-l md:pl-5" style={{ borderColor: `${accent}30` }}>
                    <Quote size={14} style={{ color: accent }} className="mb-2" />
                    <blockquote className="font-headline text-[16px] md:text-[18px] leading-[1.35] tracking-[-0.005em] text-[#F0ECE6]">
                      "{quote.quote}"
                    </blockquote>
                    <figcaption className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 mt-3">
                      {quote.author} · {quote.role}
                    </figcaption>
                  </figure>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Dossier — comparison rendered as horizontal index cards */}
      <div className="my-20 md:my-24"><DiagonalStripe /></div>
      <section className="mb-20 md:mb-24">
        <div className="flex items-baseline gap-4 mb-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Appendix · The dossier</p>
          <span className="flex-1 h-px bg-[#E85D26]/25" />
        </div>
        <h3 className="font-headline text-[36px] md:text-[80px] leading-[0.92] tracking-[-0.03em] text-[#F0ECE6] mb-10">
          What the alternatives look like.
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
          {COMPARISON.rows.map((row, i) => (
            <article key={row.label} className={`md:col-span-${i === 0 ? 6 : i === 1 ? 6 : 4} rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-7 hover:border-[#E85D26]/35 transition-colors`}>
              <div className="flex items-baseline justify-between mb-5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.32em] text-[#E85D26]">App.{String(i + 1).padStart(2, '0')}</p>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">{row.label}</p>
              </div>
              <p className="font-headline text-[24px] md:text-[28px] leading-[1.05] tracking-[-0.018em] text-[#E85D26] mb-4">{row.cells[0]}</p>
              <ul className="space-y-2 border-t border-white/[0.08] pt-4">
                {row.cells.slice(1).map((cell, ci) => (
                  <li key={ci} className="flex items-baseline justify-between gap-3">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">{COMPARISON.cols[ci + 1]}</p>
                    <p className="font-body text-[13px] text-[#F0ECE6]/65 text-right">{cell}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Map legend — platform features */}
      <section>
        <div className="flex items-baseline gap-4 mb-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Legend · How to read the map</p>
          <span className="flex-1 h-px bg-[#E85D26]/25" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
          {PLATFORM_FEATURES.map((f, i) => {
            const Icon = PLATFORM_ICONS[i] || Network;
            return (
              <div key={f.title} className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-6 flex flex-col gap-4 hover:border-[#E85D26]/35 transition-colors">
                <div className="flex items-center justify-between">
                  <Icon size={18} className="text-[#E85D26]" />
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#E85D26]/70">Symbol {String(i + 1).padStart(2, '0')}</p>
                </div>
                <h4 className="font-headline text-[18px] md:text-[20px] leading-[1.1] tracking-[-0.012em] text-[#F0ECE6]">{f.title}</h4>
                <p className="font-body text-[12.5px] text-[#F0ECE6]/65 leading-[1.55]">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

/* ─────────────────────────── Wrapper ─────────────────────────── */
const RENDER = { A: VariantA, B: VariantB, C: VariantC, D: VariantD };

export default function SystemSection() {
  const [variant, setVariant] = useVariant();
  const Variant = RENDER[variant] || RENDER[DEFAULT_VARIANT];

  return (
    <section className="relative px-6 md:px-12 py-24 md:py-32 border-t border-white/[0.08] bg-[#0a0a0a] overflow-hidden">
      <DotGrid className="opacity-50" />
      <div className="absolute top-0 left-0 right-0"><DiagonalStripe /></div>

      <div className="relative max-w-[1440px] mx-auto">
        <Variant />

        <div className="mt-16 flex justify-end">
          <VariantPicker value={variant} onChange={setVariant} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0"><DiagonalStripe /></div>
    </section>
  );
}