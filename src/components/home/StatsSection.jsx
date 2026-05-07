import React, { useEffect, useState } from 'react';
import { Clock, Zap, Award, Calendar } from 'lucide-react';
import { STATS } from './content';

/**
 * StatsSection
 * Four layout variants of the by-the-numbers strip.
 * A: Minimal grid (current, lightly upgraded) — 4 numbers in a row.
 * B: Hero stat + cluster                       — one massive featured stat, 3 smaller.
 * C: Horizontal ticker                         — single row, bullets between, very wide.
 * D: Editorial cards                           — each stat is a card with eyebrow + supporting copy.
 */

const STORAGE_KEY = 'aom_stats_variant';
const VARIANTS = ['D'];
const VARIANT_LABELS = { D: 'Cards' };
const DEFAULT_VARIANT = 'D';

const STAT_ICONS = [Clock, Zap, Award, Calendar];

// Supporting copy for variant D (in stat order: matches STATS in content.js)
const STAT_NOTES = [
  'A real person replies. Within one business day. Always.',
  'Most of our work moves before most agencies have scheduled the kickoff.',
  'Across hospitality, real estate, healthcare, founder brands, and more.',
  'A small crew that has been at this since 2014.',
];

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

/* ───────────────────────── A — Minimal grid ───────────────────────── */
function VariantA() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
      {STATS.map((s, i) => {
        const Icon = STAT_ICONS[i];
        return (
          <div key={s.label} className="border-l border-[#E85D26]/40 pl-5 group hover:border-[#E85D26] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={14} className="text-[#E85D26]/70" />
              <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#E85D26]">Metric {String(i + 1).padStart(2, '0')}</p>
            </div>
            <p className="font-headline text-[56px] md:text-[80px] leading-none tracking-[-0.03em] text-[#F0ECE6]">{s.value}</p>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 mt-3">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────── B — Hero stat + cluster ───────────────────────── */
function VariantB() {
  const [hero, ...rest] = STATS;
  const HeroIcon = STAT_ICONS[0];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
      {/* Hero stat — left half */}
      <div className="lg:col-span-7 rounded-3xl border border-[#E85D26]/30 bg-gradient-to-br from-[#E85D26]/12 via-[#E85D26]/[0.04] to-transparent p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-7 right-7 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
          <p className="font-mono text-[9.5px] uppercase tracking-[0.32em] text-[#E85D26]">Headline metric</p>
        </div>
        <HeroIcon size={28} className="text-[#E85D26] mb-8" />
        <p className="font-headline text-[140px] md:text-[200px] leading-[0.85] tracking-[-0.04em] text-[#F0ECE6]">{hero.value}</p>
        <p className="font-headline text-[24px] md:text-[32px] tracking-[-0.015em] text-[#F0ECE6]/85 mt-4 leading-[1.1]">{hero.label}</p>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 mt-5 max-w-md leading-[1.6]">
          A real person replies. Within one business day. Always.
        </p>
      </div>
      {/* Supporting cluster — right half */}
      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
        {rest.map((s, i) => {
          const Icon = STAT_ICONS[i + 1];
          return (
            <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex items-center gap-5 hover:border-[#E85D26]/35 transition-colors">
              <Icon size={20} className="text-[#E85D26] shrink-0" />
              <div className="flex-1">
                <p className="font-headline text-[40px] md:text-[48px] leading-none tracking-[-0.03em] text-[#F0ECE6]">{s.value}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 mt-2">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── C — Horizontal ticker ───────────────────────── */
function VariantC() {
  return (
    <div className="border-y border-[#E85D26]/25 py-10">
      <div className="flex items-center justify-around flex-wrap gap-y-8 gap-x-4">
        {STATS.map((s, i) => {
          const Icon = STAT_ICONS[i];
          return (
            <React.Fragment key={s.label}>
              <div className="flex items-baseline gap-5 flex-1 min-w-[200px] justify-center">
                <Icon size={18} className="text-[#E85D26] self-center" />
                <p className="font-headline text-[64px] md:text-[88px] leading-none tracking-[-0.03em] text-[#F0ECE6]">{s.value}</p>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/65 max-w-[120px]">{s.label}</p>
              </div>
              {i < STATS.length - 1 && (
                <span className="hidden md:block w-2 h-2 rounded-full bg-[#E85D26] shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── D — Editorial cards ───────────────────────── */
function VariantD() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {STATS.map((s, i) => {
        const Icon = STAT_ICONS[i];
        return (
          <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 flex flex-col gap-5 hover:border-[#E85D26]/35 transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#E85D26]/12 border border-[#E85D26]/25 flex items-center justify-center">
                <Icon size={18} className="text-[#E85D26]" />
              </div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#E85D26]">No. {String(i + 1).padStart(2, '0')}</p>
            </div>
            <div>
              <p className="font-headline text-[64px] md:text-[80px] leading-none tracking-[-0.03em] text-[#F0ECE6]">{s.value}</p>
              <p className="font-headline text-[18px] md:text-[20px] tracking-[-0.01em] text-[#F0ECE6]/85 mt-3 leading-[1.15]">{s.label}</p>
            </div>
            <p className="font-body text-[13.5px] text-[#F0ECE6]/60 leading-[1.55] mt-auto border-t border-white/[0.06] pt-4">
              {STAT_NOTES[i]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const RENDER = { A: VariantA, B: VariantB, C: VariantC, D: VariantD };

export default function StatsSection() {
  const [variant, setVariant] = useVariant();
  const Variant = RENDER[variant] || RENDER[DEFAULT_VARIANT];

  return (
    <section className="py-20 md:py-24 px-6 md:px-12 border-t border-white/[0.06]">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-3">By the numbers</p>
            <h2 className="font-headline text-[36px] md:text-[60px] leading-[0.94] tracking-[-0.025em] text-[#F0ECE6]">
              Real numbers. <em className="text-[#E85D26]">Real work.</em>
            </h2>
          </div>
        </div>
        <Variant />
        {VARIANTS.length > 1 && (
          <div className="mt-10 flex justify-end">
            <VariantPicker value={variant} onChange={setVariant} />
          </div>
        )}
      </div>
    </section>
  );
}
