import React from 'react';
import LazyGumlet from './LazyGumlet';
import { REEL_IDS } from './content';

/**
 * MaskedVideoDeck -- Superside-shape hero deck with autonomous vertical drift.
 *
 * Two columns of large video tiles (alternating 9:10 and 2:3 aspects) wrapped
 * in a vertical mask gradient. Each column auto-scrolls vertically at a slow
 * pace via CSS keyframes (looped seamlessly by duplicating the tile list).
 * Columns drift at slightly different speeds and opposite directions for a
 * parallax feel.
 *
 * Performance: only the first ~4 cards in each column eager-mount; the rest
 * load lazily via IntersectionObserver as they scroll into view. Drops initial
 * iframe count from ~28 to ~8.
 */
export default function StickyVideoDeck({ items = [], theme = 'classic' }) {
  // Build a tile list dense enough to look full but light enough to load fast
  const base = items.length ? items : REEL_IDS.map((id) => ({ id }));
  const tiles = [];
  while (tiles.length < 10) tiles.push(...base);
  const all = tiles.slice(0, 10);

  const cardChrome = {
    classic:   'bg-[#161616] border border-white/[0.08]',
    editorial: 'bg-[#FDF6EC] border border-[#0C0C0C]/10',
    cinema:    'bg-black border border-[#E85D26]/25',
    paper:     'bg-[#EDE9E1] border border-[#0A0A08]/10',
  }[theme] || '';

  const filter = (theme === 'editorial' || theme === 'paper') ? 'grayscale(0)' : 'grayscale(0.05) contrast(1.08)';
  const poster = theme === 'editorial' ? '#EFE7DA' : theme === 'paper' ? '#EDE9E1' : '#161616';

  // Split tiles to two columns
  const colA = all.filter((_, i) => i % 2 === 0);
  const colB = all.filter((_, i) => i % 2 === 1);

  // Duplicate each column for seamless marquee loop
  const dupA = [...colA, ...colA];
  const dupB = [...colB, ...colB];

  // Vertical 9:16 reels — alternate between full 9:16 and a slightly squarer 9:14
  // so the two columns brick-pattern (different heights = staircase feel).
  const aspectFor = (col, i) => {
    if (col === 'A') return i % 2 === 0 ? '9 / 16' : '9 / 13';
    return i % 2 === 0 ? '9 / 13' : '9 / 16';
  };

  // First 3 unique cards per column eager-mount; rest defer to IntersectionObserver
  const Card = ({ it, aspect, eager }) => (
    <div
      className={`relative rounded-xl overflow-hidden ${cardChrome}`}
      style={{ aspectRatio: aspect }}
    >
      <LazyGumlet id={it.id} eager={eager} filter={filter} poster={poster} cover={true} portrait={true} />
      {it.client && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/65 to-transparent pointer-events-none z-10" />
          <div className="absolute bottom-3 left-4 right-4 z-20">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6] truncate">{it.client}</p>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="lg:h-full">
      {/* Desktop: 2 columns, each marquee-scrolling vertically */}
      <div
        className="hidden lg:flex flex-row gap-5 h-full overflow-hidden"
        style={{
          maskImage: 'linear-gradient(rgba(0,0,0,0), rgb(0,0,0) 10%, rgb(0,0,0) 90%, rgba(0,0,0,0))',
          WebkitMaskImage: 'linear-gradient(rgba(0,0,0,0), rgb(0,0,0) 10%, rgb(0,0,0) 90%, rgba(0,0,0,0))',
        }}
      >
        <div className="flex-1 min-w-0 relative">
          <div className="aom-deck-up flex flex-col gap-5">
            {dupA.map((it, i) => (
              <Card
                key={'A' + i}
                it={it}
                aspect={aspectFor('A', i % colA.length)}
                eager={i === 0}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0 relative">
          <div className="aom-deck-down flex flex-col gap-5">
            {dupB.map((it, i) => (
              <Card
                key={'B' + i}
                it={it}
                aspect={aspectFor('B', i % colB.length)}
                eager={i === 0}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: horizontal scroll strip */}
      <div className="flex lg:hidden gap-3 overflow-x-auto px-6 -mx-6 pb-4 scrollbar-hide"
        style={{
          maskImage: 'linear-gradient(to right, rgba(0,0,0,0), rgb(0,0,0) 8%, rgb(0,0,0) 92%, rgba(0,0,0,0))',
          WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0), rgb(0,0,0) 8%, rgb(0,0,0) 92%, rgba(0,0,0,0))',
        }}
      >
        {all.map((it, i) => (
          <div key={'M' + i} className={`relative rounded-lg overflow-hidden ${cardChrome} w-[160px] h-[280px] shrink-0`}>
            <LazyGumlet id={it.id} eager={i < 2} filter={filter} poster={poster} cover={true} portrait={true} />
          </div>
        ))}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes aom-deck-scroll-up {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
        @keyframes aom-deck-scroll-down {
          from { transform: translateY(-50%); }
          to   { transform: translateY(0); }
        }
        .aom-deck-up   { animation: aom-deck-scroll-up   72s linear infinite; will-change: transform; }
        .aom-deck-down { animation: aom-deck-scroll-down 96s linear infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) {
          .aom-deck-up, .aom-deck-down { animation: none; }
        }
      `}</style>
    </div>
  );
}
