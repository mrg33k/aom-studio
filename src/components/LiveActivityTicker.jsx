import React from 'react';
import { RECENT_WORK } from './home/content';

/**
 * LiveActivityTicker — ESPN-style scrolling marquee of recent client work.
 * Ported from /r4 Cinema R3b. Faster than the /r4 source (50s vs 80s loop).
 */
export default function LiveActivityTicker() {
  const tape = [...RECENT_WORK, ...RECENT_WORK, ...RECENT_WORK];

  return (
    <section className="border-y border-[#E85D26]/20 py-5 overflow-hidden bg-[#0a0a0a]">
      <div className="px-6 md:px-12 max-w-[1440px] mx-auto pb-3 flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#E85D26] animate-pulse" />
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">
            In the room · Last 30 days
          </p>
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/50">
          {RECENT_WORK.length} projects in flight
        </p>
      </div>
      <div className="flex items-center gap-6 whitespace-nowrap animate-marquee-live">
        {tape.map((w, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-3 border border-[#E85D26]/20 bg-black/50 rounded-full pl-5 pr-4 py-2.5 shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26]" />
            <span className="font-display-serif text-[20px] md:text-[26px] tracking-[-0.015em] text-[#F0ECE6]">
              {w.client}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/65 border-l border-[#E85D26]/25 pl-3">
              {w.tag}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26]/85">
              · {w.when}
            </span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee-live { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        .animate-marquee-live { animation: marquee-live 50s linear infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .animate-marquee-live { animation: none; } }
      `}</style>
    </section>
  );
}
