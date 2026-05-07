import React, { useEffect, useState } from 'react';
import { RECENT_WORK } from './content';

/**
 * RecentWorkSection
 * Four layout variants of the "In the room" recent work strip.
 * A: Chip wall (current)        — wrapping pills, casual.
 * B: Marquee ticker             — single line scrolling, ambient.
 * C: Editorial manifest         — numbered table, dense, formal.
 * D: Bento board                — feature tile + supporting chips, asymmetric.
 *
 * Picker top-right of section. Choice persists in localStorage.
 */

const STORAGE_KEY = 'aom_recent_variant';
const VARIANTS = ['B'];
const VARIANT_LABELS = { B: 'Marquee' };
const DEFAULT_VARIANT = 'B';

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

function Header({ count }) {
  return (
    <div className="flex items-center justify-between gap-6 flex-wrap mb-5">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-[#E85D26] animate-pulse" />
        <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26]">In the room · Last 30 days</p>
      </div>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/45">{count} active projects</p>
    </div>
  );
}

/* ───────────────────────── A — Chip wall ───────────────────────── */
function VariantA() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-3">
      {RECENT_WORK.map((w) => (
        <div key={w.client} className="group inline-flex items-center gap-3 border border-white/[0.10] hover:border-[#E85D26]/50 bg-white/[0.02] hover:bg-white/[0.04] rounded-full pl-4 pr-3 py-2 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26]" />
          <span className="font-headline text-[15px] md:text-[16px] tracking-[-0.01em] text-[#F0ECE6]">{w.client}</span>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 border-l border-white/[0.10] pl-3">{w.tag}</span>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#E85D26]/85 hidden md:inline">· {w.when}</span>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── B — Marquee ticker ───────────────────────── */
function VariantB() {
  return (
    <>
      <div className="-mx-6 md:-mx-12 overflow-hidden mask-fade-x">
        <div className="flex items-center gap-10 whitespace-nowrap animate-recent-marquee py-2">
          {[...RECENT_WORK, ...RECENT_WORK, ...RECENT_WORK].map((w, i) => (
            <div key={i} className="inline-flex items-center gap-4 shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#E85D26]" />
              <span className="font-headline text-[28px] md:text-[40px] tracking-[-0.02em] text-[#F0ECE6]">{w.client}</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#F0ECE6]/55 border-l border-white/15 pl-4">{w.tag}</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26]/85">· {w.when}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes recent-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        .animate-recent-marquee { animation: recent-marquee 60s linear infinite; }
        .mask-fade-x {
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
                  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
        }
      `}</style>
    </>
  );
}

/* ───────────────────────── C — Editorial manifest ───────────────────────── */
function VariantC() {
  const half = Math.ceil(RECENT_WORK.length / 2);
  const cols = [RECENT_WORK.slice(0, half), RECENT_WORK.slice(half)];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0 border-t-2 border-[#E85D26]/40">
      {cols.flat().map((w, i) => (
        <div key={w.client} className="border-b border-white/[0.10] py-4 flex items-baseline gap-5 group hover:bg-white/[0.02] transition-colors px-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] shrink-0 w-7">{String(i + 1).padStart(2, '0')}</span>
          <p className="font-headline text-[20px] md:text-[24px] tracking-[-0.015em] text-[#F0ECE6] flex-1 truncate">{w.client}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 hidden sm:block">{w.tag}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26]/80 shrink-0 text-right w-24">{w.when}</p>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────────── D — Bento board ───────────────────────── */
function VariantD() {
  const [feature, ...rest] = RECENT_WORK;
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 auto-rows-[minmax(80px,auto)]">
      {/* Feature tile */}
      <div className="col-span-2 md:col-span-3 row-span-2 rounded-2xl border border-[#E85D26]/40 bg-gradient-to-br from-[#E85D26]/12 via-[#E85D26]/[0.04] to-transparent p-7 md:p-8 flex flex-col justify-between min-h-[200px] relative overflow-hidden">
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
          <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#E85D26]">Hero this week</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26] mb-2">Featured · {feature.tag}</p>
          <p className="font-headline text-[36px] md:text-[56px] leading-[0.95] tracking-[-0.02em] text-[#F0ECE6]">{feature.client}</p>
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/65">{feature.when} · In flight</p>
      </div>

      {/* Supporting tiles */}
      {rest.map((w, i) => {
        const span = i === 0 || i === 5 ? 'md:col-span-3' : 'md:col-span-2';
        return (
          <div key={w.client} className={`col-span-1 ${span} rounded-xl border border-white/[0.10] bg-white/[0.02] hover:border-[#E85D26]/40 hover:bg-white/[0.04] transition-colors p-4 md:p-5 flex flex-col justify-between min-h-[80px]`}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-headline text-[15px] md:text-[18px] tracking-[-0.01em] text-[#F0ECE6] leading-tight">{w.client}</p>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mt-2 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 truncate">{w.tag}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#E85D26]/80 shrink-0">{w.when}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const RENDER = { A: VariantA, B: VariantB, C: VariantC, D: VariantD };

export default function RecentWorkSection() {
  const [variant, setVariant] = useVariant();
  const Variant = RENDER[variant] || VariantA;

  return (
    <section className="border-y border-white/[0.06] py-9 md:py-10 px-6 md:px-12 bg-[#0a0a0a] relative">
      <div className="max-w-[1440px] mx-auto">
        <Header count={RECENT_WORK.length} />
        <Variant />
        {VARIANTS.length > 1 && (
          <div className="mt-6 flex justify-end">
            <VariantPicker value={variant} onChange={setVariant} />
          </div>
        )}
      </div>
    </section>
  );
}
