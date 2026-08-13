import React from 'react';
import { ArrowRight, ArrowUpRight, Play } from 'lucide-react';
import StickyVideoDeck from './StickyVideoDeck';
import LazyGumlet from './LazyGumlet';
import { HERO_DECK, RECENT_WORK, CASE_TILES } from './content';

// Trades and job-site reels lead the deck on the contractor-first page.
const DECK_TRADES_FIRST = [...HERO_DECK].sort((a, b) => {
  const lead = ['Primrose Ambition', 'NGOTS Restoration', "Tiffany's", 'Nook 10 Year'];
  const ai = lead.indexOf(a.client); const bi = lead.indexOf(b.client);
  return (ai === -1 ? lead.length : ai) - (bi === -1 ? lead.length : bi);
});
import { HERO, DEPT, NINETY, MONTH, FILMS, WORK, ALACARTE, MATH, PROOF, CLOSING } from './contentR38';

/**
 * HomeConsoleR38 — the r4 Cinema structure in the R38 console system.
 * Light world: paper ground, carbon blocks, safety orange, Anton display +
 * Hanken body + JetBrains mono labels. Copy is V6.1 LOCKED verbatim.
 */

const Kick = ({ children, dark }) => (
  <p className={`font-mono text-[10.5px] uppercase tracking-[0.32em] mb-5 ${dark ? 'text-[#F04404]' : 'text-[#C43800]'}`}>
    {children}
  </p>
);

const H2 = ({ children, dark, className = '' }) => (
  <h2 className={`font-anton font-normal uppercase text-[40px] md:text-[72px] leading-[0.94] tracking-[-0.01em] ${dark ? 'text-[#F5F3EE]' : 'text-[#0A0A08]'} ${className}`}>
    {children}
  </h2>
);

export default function HomeConsoleR38({ openBrief }) {
  return (
    <div className="bg-[#F5F3EE] text-[#0A0A08] font-hanken">

      {/* 1. HERO — light split, living background behind the drifting deck */}
      <section className="relative overflow-hidden lg:min-h-[900px]">
        {/* moving background: drifting drafting grid + breathing orange air */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-[-80px] hero-grid-drift" />
          <div className="absolute inset-0 hero-air-breathe" />
        </div>

        <div className="relative px-6 md:px-12 pt-28 md:pt-36 pb-12 lg:pb-0 lg:py-40 max-w-[1608px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-24 relative lg:min-h-[700px]">
            <div className="lg:w-1/2 flex flex-col">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#C43800] mb-8">
                {HERO.eyebrow}
              </p>
              <h1 className="font-anton font-normal uppercase text-[12.5vw] md:text-[56px] lg:text-[62px] xl:text-[74px] leading-[0.96] tracking-[-0.01em]">
                {HERO.h1Lines[0]}<br />
                {HERO.h1Lines[1]}<br />
                <em className="font-hanken normal-case italic font-medium tracking-[-0.02em] text-[#F04404]">{HERO.h1Emphasis}</em>
              </h1>
              <p className="text-[16px] md:text-[18px] text-[#0A0A08]/70 mt-8 leading-[1.55] max-w-xl">
                {HERO.sub}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-10">
                <button
                  onClick={() => openBrief?.()}
                  className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] bg-[#F04404] text-[#F5F3EE] px-8 py-4 rounded-full transition-transform duration-200 hover:scale-[1.04] flex items-center gap-2"
                >
                  {HERO.cta} <ArrowRight size={14} />
                </button>
                <a href="#work" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#0A0A08] no-underline flex items-center gap-2 px-2 py-3 border-b border-[#0A0A08]/40 hover:border-[#F04404] hover:text-[#C43800] transition-colors">
                  <Play size={13} className="fill-current" /> {HERO.ctaSub}
                </a>
              </div>
            </div>
            <div className="lg:absolute lg:top-0 lg:right-0 lg:bottom-0 lg:w-1/2 lg:pr-8 lg:pl-4">
              <StickyVideoDeck items={DECK_TRADES_FIRST} theme="paper" />
            </div>
          </div>
        </div>

        <style>{`
          .hero-grid-drift {
            background-image:
              repeating-linear-gradient(0deg, rgba(10,10,8,0.055) 0 1px, transparent 1px 56px),
              repeating-linear-gradient(90deg, rgba(10,10,8,0.055) 0 1px, transparent 1px 56px);
            animation: heroGridDrift 46s linear infinite;
          }
          @keyframes heroGridDrift {
            from { transform: translate(0, 0); }
            to   { transform: translate(56px, 56px); }
          }
          .hero-air-breathe {
            background: radial-gradient(52% 44% at 68% 38%, rgba(240,68,4,0.07), transparent 70%);
            animation: heroAirBreathe 9s ease-in-out infinite alternate;
          }
          @keyframes heroAirBreathe {
            from { opacity: 0.55; transform: scale(1); }
            to   { opacity: 1;    transform: scale(1.06); }
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-grid-drift, .hero-air-breathe { animation: none; }
          }
        `}</style>
      </section>

      {/* 2. RECENT WORK — honest marquee, paper-soft band */}
      <section className="border-y border-[#0A0A08]/10 py-6 overflow-hidden bg-[#EDE9E1]">
        <div className="px-6 md:px-12 max-w-[1440px] mx-auto pb-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#C43800]">Recent work</p>
        </div>
        <div className="flex items-center gap-5 whitespace-nowrap animate-marquee-console">
          {[...RECENT_WORK, ...RECENT_WORK, ...RECENT_WORK].map((w, i) => (
            <div key={i} className="inline-flex items-center gap-3 border border-[#0A0A08]/12 bg-[#F5F3EE] rounded-full pl-5 pr-4 py-2.5 shrink-0">
              <span className="font-anton uppercase text-[18px] md:text-[22px] tracking-[0.01em] text-[#0A0A08]">{w.client}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#0A0A08]/55 border-l border-[#0A0A08]/15 pl-3">{w.tag}</span>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes marquee-console { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
          .animate-marquee-console { animation: marquee-console 70s linear infinite; }
          @media (prefers-reduced-motion: reduce) { .animate-marquee-console { animation: none; } }
        `}</style>
      </section>

      {/* 3. THE DEPARTMENT — carbon block, staggered module cards */}
      <section id="department" className="py-24 md:py-32 px-6 md:px-12 bg-[#0A0A08] text-[#F5F3EE]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <Kick dark>{DEPT.kick}</Kick>
            <H2 dark>{DEPT.open}</H2>
            <p className="text-[16px] text-[#F5F3EE]/72 mt-7 leading-[1.6] max-w-lg">{DEPT.para}</p>
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {DEPT.modules.map((m, i) => (
              <div
                key={m.label}
                className={`border border-[#F5F3EE]/14 p-8 flex flex-col gap-3 hover:border-[#F04404]/60 transition-colors ${i % 2 === 1 ? 'sm:translate-y-10' : ''}`}
              >
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#F04404]">{m.label}</p>
                <p className="text-[15px] text-[#F5F3EE]/85 leading-[1.6]">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. A MONTH WITH US — paper block, week ledger + first 90 days */}
      <section className="py-24 md:py-32 px-6 md:px-12 bg-[#F5F3EE]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-6">
            <Kick>{MONTH.kick}</Kick>
            <H2>{MONTH.tail}</H2>
            <p className="text-[16px] text-[#0A0A08]/60 mt-7 leading-[1.6] max-w-lg">{MONTH.body}</p>
            <div className="mt-10">
              {MONTH.weeks.map((w) => (
                <div key={w.wk} className="flex items-baseline gap-6 py-4 border-t border-[#0A0A08]/12 last:border-b">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#C43800] min-w-[76px]">{w.wk}</span>
                  <span className="font-anton uppercase text-[24px] md:text-[30px] tracking-[0.01em] text-[#0A0A08]">{w.what}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="border-l-2 border-[#F04404] pl-8 py-2">
              <Kick>{NINETY.kick}</Kick>
              <p className="text-[18px] md:text-[20px] text-[#0A0A08]/85 leading-[1.6] max-w-xl">{NINETY.body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FILMS — carbon block, two honest film posters */}
      <section id="films" className="py-24 md:py-32 px-6 md:px-12 bg-[#0A0A08] text-[#F5F3EE]">
        <div className="max-w-[1440px] mx-auto">
          <Kick dark>{FILMS.kick}</Kick>
          <H2 dark className="mb-14 max-w-3xl">{FILMS.h2}</H2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {FILMS.items.map((f) => (
              <a key={f.reel} href="#" className="group relative block aspect-[16/10] overflow-hidden border border-[#F5F3EE]/15 hover:border-[#F04404]/60 transition-colors bg-black no-underline">
                <LazyGumlet id={f.reel} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-7 left-7 right-7 z-20">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#F04404] mb-3">{f.label}</p>
                  <h3 className="font-anton uppercase text-[26px] md:text-[36px] leading-[0.98] tracking-[0.005em] text-[#F5F3EE]">{f.title}</h3>
                  <span className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#F5F3EE]">
                    <Play size={13} className="fill-current text-[#F04404]" /> Watch
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 6. THE WORK — paper block, screening grid */}
      <section id="work" className="py-24 md:py-32 px-6 md:px-12 bg-[#F5F3EE]">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-6">
            <div>
              <Kick>{WORK.kick}</Kick>
              <H2>{WORK.h2}</H2>
            </div>
          </div>
          <p className="text-[16px] text-[#0A0A08]/60 leading-[1.6] max-w-xl mb-12">{WORK.lede}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CASE_TILES.map((t) => (
              <a key={t.client} href="#" className="group block relative aspect-[5/4] overflow-hidden bg-[#0A0A08] no-underline border border-[#0A0A08]/15 hover:border-[#F04404]/70 transition-colors">
                <LazyGumlet id={t.reel} className="transition-transform duration-700 group-hover:scale-[1.05]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#F04404] mb-1.5">{t.tag}</p>
                  <p className="font-anton uppercase text-[20px] md:text-[24px] leading-tight tracking-[0.01em] text-[#F5F3EE]">{t.client}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 7. A LA CARTE — paper-soft band, mid-page */}
      <section id="one-thing" className="py-20 md:py-24 px-6 md:px-12 bg-[#EDE9E1] border-y border-[#0A0A08]/10">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <H2 className="!text-[32px] md:!text-[52px]">{ALACARTE.kick}</H2>
            <p className="text-[16px] text-[#0A0A08]/65 mt-5 leading-[1.6] max-w-xl">{ALACARTE.body}</p>
          </div>
          <button
            onClick={() => openBrief?.()}
            className="self-start md:self-center shrink-0 font-mono text-[11px] uppercase tracking-[0.22em] text-[#0A0A08] border border-[#0A0A08]/35 rounded-full px-7 py-4 hover:border-[#F04404] hover:text-[#C43800] transition-colors inline-flex items-center gap-2"
          >
            {ALACARTE.link} <ArrowUpRight size={14} />
          </button>
        </div>
      </section>

      {/* 8. THE MATH — carbon block, money's one appearance */}
      <section id="math" className="py-24 md:py-32 px-6 md:px-12 bg-[#0A0A08] text-[#F5F3EE]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7">
            <Kick dark>{MATH.kick}</Kick>
            <H2 dark>{MATH.h2}</H2>
            <p className="text-[17px] text-[#F5F3EE]/80 mt-8 leading-[1.65] max-w-2xl">{MATH.body}</p>
          </div>
          <div className="lg:col-span-5 flex flex-col justify-center gap-8">
            <p className="font-anton uppercase text-[30px] md:text-[42px] leading-[1.02] tracking-[0.005em] text-[#F04404]">{MATH.punch}</p>
            <button
              onClick={() => openBrief?.()}
              className="self-start font-mono text-[11px] font-medium uppercase tracking-[0.22em] bg-[#F04404] text-[#F5F3EE] px-8 py-4 rounded-full transition-transform duration-200 hover:scale-[1.04] flex items-center gap-2"
            >
              {CLOSING.cta} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* 9. PROOF — paper block */}
      <section id="proof" className="py-24 md:py-32 px-6 md:px-12 bg-[#F5F3EE]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <Kick>{PROOF.kick}</Kick>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#0A0A08]/55 mb-6">{PROOF.label}</p>
            <p className="font-hanken text-[22px] md:text-[30px] font-medium leading-[1.4] tracking-[-0.01em] text-[#0A0A08] max-w-3xl">{PROOF.body}</p>
          </div>
          <div className="lg:col-span-5">
            <div className="border-l-2 border-[#F04404] pl-8 py-2">
              <p className="text-[17px] text-[#0A0A08]/70 leading-[1.65]">{PROOF.aside}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. CLOSING — carbon end card */}
      <section className="py-32 md:py-44 px-6 md:px-12 text-center bg-[#0A0A08] text-[#F5F3EE]">
        <div className="max-w-[1440px] mx-auto">
          <h2 className="font-anton uppercase text-[56px] md:text-[140px] leading-[0.9] tracking-[-0.01em]">{CLOSING.h2}</h2>
          <button
            onClick={() => openBrief?.()}
            className="mt-12 font-mono text-[12px] font-medium uppercase tracking-[0.22em] bg-[#F04404] text-[#F5F3EE] px-10 py-5 rounded-full transition-transform duration-200 hover:scale-[1.04] inline-flex items-center gap-2"
          >
            {CLOSING.cta} <ArrowRight size={15} />
          </button>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F5F3EE]/45 mt-10 max-w-xl mx-auto leading-[1.8]">
            {CLOSING.footnote}
          </p>
        </div>
      </section>
    </div>
  );
}
