import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

/**
 * CTAButton — single source for every Start/Send/Book primary CTA on the home.
 *
 * Three live variants (Patrik's picks from the palette round):
 *   04 — Cream pill, dark text, orange arrow.
 *   06 — Dark pill, white text, orange arrow circle on right edge.
 *   08 — Editorial link · Big Syne text with orange underline + arrow.
 *
 * Sizes: sm | md | lg.
 * Global pick stored in localStorage ('aom_cta_variant'). Picker syncs across
 * instances via 'storage' event + a custom 'aom-cta-variant-change' event.
 */

const STORAGE_KEY = 'aom_cta_variant';
export const CTA_VARIANTS = ['04', '06', '08'];
export const CTA_VARIANT_LABELS = { '04': 'Cream', '06': 'Arrow', '08': 'Editorial' };
export const DEFAULT_CTA_VARIANT = '06';

const EVT = 'aom-cta-variant-change';

export function useCTAVariant() {
  const [v, setV] = useState(DEFAULT_CTA_VARIANT);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && CTA_VARIANTS.includes(stored)) setV(stored);
    } catch {}
    const onChange = (e) => {
      const next = e.detail || (typeof e.newValue === 'string' ? e.newValue : null);
      if (next && CTA_VARIANTS.includes(next)) setV(next);
    };
    window.addEventListener(EVT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  const set = (next) => {
    setV(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
  };
  return [v, set];
}

/* ─────────────── Variant renderers ─────────────── */

const V04_SIZE = {
  sm: { pad: 'px-5 py-2.5', text: 'text-[13px]', icon: 14 },
  md: { pad: 'px-7 py-3.5', text: 'text-[14px]', icon: 15 },
  lg: { pad: 'px-8 py-4',   text: 'text-[15px]', icon: 16 },
};

function Render04({ size, label, icon: Icon, onClick, fullWidth }) {
  const s = V04_SIZE[size] || V04_SIZE.md;
  return (
    <button
      onClick={onClick}
      className={`bg-[#FDF6EC] text-[#0C0C0C] font-body font-semibold ${s.text} ${s.pad} rounded-full hover:bg-white transition-colors inline-flex items-center justify-center gap-2 ${fullWidth ? 'w-full' : ''}`}
    >
      {label}
      <Icon size={s.icon} className="text-[#E85D26]" />
    </button>
  );
}

const V06_SIZE = {
  sm: { padL: 'pl-5', padR: 'pr-1.5', padY: 'py-1.5', text: 'text-[13px]', circle: 'w-7 h-7', icon: 13, gap: 'gap-3' },
  md: { padL: 'pl-6', padR: 'pr-2',   padY: 'py-2',   text: 'text-[14px]', circle: 'w-9 h-9', icon: 15, gap: 'gap-4' },
  lg: { padL: 'pl-8', padR: 'pr-2',   padY: 'py-2',   text: 'text-[15px]', circle: 'w-11 h-11', icon: 17, gap: 'gap-5' },
};

function Render06({ size, label, icon: Icon, onClick, fullWidth }) {
  const s = V06_SIZE[size] || V06_SIZE.md;
  return (
    <button
      onClick={onClick}
      className={`group bg-[#0C0C0C] text-[#FDF6EC] border border-white/15 hover:border-[#E85D26]/60 font-body font-semibold ${s.text} ${s.padL} ${s.padR} ${s.padY} rounded-full transition-colors inline-flex items-center ${s.gap} ${fullWidth ? 'w-full justify-between' : ''}`}
    >
      <span>{label}</span>
      <span className={`${s.circle} rounded-full bg-[#E85D26] flex items-center justify-center text-[#0C0C0C] group-hover:bg-[#FF6B2C] transition-colors shrink-0`}>
        <Icon size={s.icon} />
      </span>
    </button>
  );
}

const V08_SIZE = {
  sm: { text: 'text-[18px]', icon: 16, pb: 'pb-1.5', border: 'border-b' },
  md: { text: 'text-[24px] md:text-[28px]', icon: 20, pb: 'pb-2',   border: 'border-b-2' },
  lg: { text: 'text-[32px] md:text-[44px]', icon: 26, pb: 'pb-2.5', border: 'border-b-2' },
};

function Render08({ size, label, onClick, fullWidth }) {
  const s = V08_SIZE[size] || V08_SIZE.md;
  return (
    <button
      onClick={onClick}
      className={`bg-transparent text-[#F0ECE6] font-headline ${s.text} leading-none tracking-[-0.02em] inline-flex items-baseline gap-3 ${s.border} border-[#E85D26] ${s.pb} hover:text-[#E85D26] transition-colors ${fullWidth ? 'w-full justify-between' : ''}`}
    >
      <span>{label}</span>
      <ArrowUpRight size={s.icon} className="text-[#E85D26] self-center shrink-0" />
    </button>
  );
}

/* ─────────────── Public CTAButton ─────────────── */

export default function CTAButton({
  size = 'md',
  variant,                 // optional override; otherwise uses global
  children,                // label
  onClick,
  icon = ArrowRight,       // ignored by 08 (always ArrowUpRight)
  fullWidth = false,
}) {
  const [globalVariant] = useCTAVariant();
  const v = variant || globalVariant;
  const label = children;
  const props = { size, label, icon, onClick, fullWidth };
  if (v === '04') return <Render04 {...props} />;
  if (v === '08') return <Render08 {...props} />;
  return <Render06 {...props} />;
}

/* ─────────────── Floating picker (top-left) ─────────────── */

export function CTAVariantPicker({ position = 'top-left' }) {
  const [variant, setVariant] = useCTAVariant();
  const pos =
    position === 'top-left'      ? 'top-24 left-5' :
    position === 'top-right'     ? 'top-24 right-5' :
    position === 'bottom-left'   ? 'bottom-5 left-5' :
                                   'bottom-5 right-5';
  return (
    <div className={`fixed ${pos} z-[60] inline-flex items-center gap-1 border border-white/[0.10] rounded-full bg-black/70 backdrop-blur p-1.5 shadow-xl`}>
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 px-2">CTA</span>
      {CTA_VARIANTS.map((v) => (
        <button
          key={v}
          onClick={() => setVariant(v)}
          className={`font-mono text-[10px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full transition-colors ${
            variant === v ? 'bg-[#E85D26] text-[#0C0C0C]' : 'text-[#F0ECE6]/65 hover:text-[#F0ECE6]'
          }`}
        >
          {v} · {CTA_VARIANT_LABELS[v]}
        </button>
      ))}
    </div>
  );
}
