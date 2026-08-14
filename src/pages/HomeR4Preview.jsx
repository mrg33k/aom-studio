import React, { useState, useEffect } from 'react';
import HomeClassic from '../components/home/HomeClassic';
import HomeEditorial from '../components/home/HomeEditorial';
import HomeCinema from '../components/home/HomeCinema';
import SiteNavR4 from '../components/SiteNavR4';

/**
 * Preview surface for the recovered R4 homepage.
 * Recovered from stash@{3} (homepage-redesign-r1, 2026-05-04).
 *
 * Renders the three variants (Classic / Editorial / Cinema) under the
 * Superside-precise nav. Floating picker bottom-right toggles between them.
 * Default lands on Cinema (the dark/scrolling-video-deck variant Patrik called out).
 */

const VARIANTS = [
  { key: 'cinema',    label: '03 Cinema'    },
  { key: 'editorial', label: '02 Editorial' },
  { key: 'classic',   label: '01 Classic'   },
];

const STORAGE_KEY = 'aom_r4_preview_variant';

export default function HomeR4Preview() {
  const [variant, setVariant] = useState(() => {
    if (typeof window === 'undefined') return 'cinema';
    return localStorage.getItem(STORAGE_KEY) || 'cinema';
  });
  const [briefOpen, setBriefOpen] = useState(false);
  const openBrief = () => setBriefOpen(true);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, variant);
  }, [variant]);

  const Active = {
    classic: HomeClassic,
    editorial: HomeEditorial,
    cinema: HomeCinema,
  }[variant] || HomeCinema;

  return (
    <>
      <SiteNavR4 transparent onStartProject={openBrief} />
      <Active openBrief={openBrief} />

      {/* Floating variant picker */}
      <div className="fixed bottom-5 right-5 z-[500] flex flex-col gap-2 bg-black/85 backdrop-blur-md border border-white/15 rounded-2xl p-3 shadow-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55 px-2 pb-1">R4 Preview</p>
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            onClick={() => setVariant(v.key)}
            className={`text-left font-body text-[12px] font-semibold tracking-[0.04em] uppercase px-3 py-1.5 rounded-full transition-colors ${
              variant === v.key
                ? 'bg-[#E85D26] text-[#0C0C0C]'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Lightweight brief modal stub so CTAs don't no-op */}
      {briefOpen && (
        <div
          onClick={() => setBriefOpen(false)}
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0C0C0C] border border-white/10 rounded-xl p-10 max-w-md mx-4 cursor-default"
          >
            <h3 className="font-headline font-extrabold text-2xl text-[#F0ECE6] uppercase tracking-tight mb-3">
              Start a project
            </h3>
            <p className="font-body text-[#F0ECE6]/75 mb-6">
 R4 preview, CTAs work but the real brief drawer isn't wired here.
              Email <a href="mailto:hello@aom-inhouse.com" className="text-[#E85D26] underline">hello@aom-inhouse.com</a> to start a brief.
            </p>
            <button
              onClick={() => setBriefOpen(false)}
              className="px-5 py-2.5 rounded-full bg-[#E85D26] text-[#0C0C0C] font-body font-semibold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}