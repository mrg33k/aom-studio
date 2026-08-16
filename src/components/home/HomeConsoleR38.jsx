import React from 'react';
import { ArrowRight, Play, ClipboardList, Camera, Globe, Megaphone, MessageSquare, ArrowUpRight } from 'lucide-react';
import StickyVideoDeck from './StickyVideoDeck';
import LazyGumlet from './LazyGumlet';
import { HERO_DECK, RECENT_WORK, CASE_TILES } from './content';
import { HERO, DEPT, NINETY, MONTH, FILMS, WORK, ALACARTE, PROMISES, PROOF, CLOSING } from './contentR38';

const MODULE_ICONS = [ClipboardList, Camera, Globe, Megaphone, MessageSquare];

const DECK_TRADES_FIRST = [...HERO_DECK].sort((a, b) => {
  const lead = ['Primrose Ambition', 'NGOTS Restoration', "Tiffany's", 'Nook 10 Year'];
  const ai = lead.indexOf(a.client);
  const bi = lead.indexOf(b.client);
  return (ai === -1 ? lead.length : ai) - (bi === -1 ? lead.length : bi);
});

const Kick = ({ children, dark }) => (
  <p className={`font-mono text-[10px] uppercase tracking-[0.28em] ${dark ? 'text-[#F04404]' : 'text-[#8A6A2B]'}`}>{children}</p>
);

const H2 = ({ children, dark, className = '' }) => (
  <h2 className={`font-anton font-normal uppercase text-[36px] md:text-[64px] lg:text-[72px] leading-[0.94] tracking-[-0.02em] ${dark ? 'text-[#F5F3EE]' : 'text-[#0A0A08]'} ${className}`}>
    {children}
  </h2>
);

export default function HomeConsoleR38({ openBrief }) {
  return (
    <div className="r38-root bg-[#F5F3EE] text-[#0A0A08] font-hanken antialiased">
      <div
        dangerouslySetInnerHTML={{
          __html: `<!-- THESIS: AOM is a visible operating system for marketing. The first screen shows the monthly loop and the promises that make it trustworthy.\nOWN-WORLD: Paper #F5F3EE / ink #0A0A08 / accent #F04404→#C43800 (ink) / #8A6A2B on bone; Anton display, Hanken Grotesk/mono tracked caps; paper-ledger rows, 1px hairlines, no glass or gradient text, grid-drift + breathe as the authored motion.\nSTORY: A busy owner sees one team running a repeatable monthly loop, understands exactly what moves and what stays theirs, then looks for proof in the work.\nFIRST VIEWPORT: System statement + CTA on the left, four-part monthly loop on carbon at right, three operating promises across the bottom.\nFINISH: unreviewed and undocumented is unfinished; this build ends with a production visual check. -->`,
        }}
      />

      {/* 1. HERO — THE MONTHLY OPERATING SYSTEM */}
      <section className="relative overflow-hidden border-b border-[#0A0A08]/10">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-[-80px] hero-grid-drift" />
          <div className="absolute inset-0 hero-air-breathe" />
        </div>

        <div className="relative max-w-[1440px] mx-auto px-6 md:px-12 pt-24 md:pt-28 pb-10 md:pb-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-0 items-stretch">
            <div className="lg:col-span-7 lg:pr-14 flex flex-col justify-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8A6A2B]">{HERO.eyebrow}</p>

              <h1 className="font-anton font-normal uppercase text-[11vw] md:text-[56px] lg:text-[68px] leading-[0.94] tracking-[-0.02em] mt-4 text-balance">
                {HERO.h1Lines[0]}
                <br />
                {HERO.h1Lines[1]}
                <br />
                <em className="font-hanken normal-case italic font-medium tracking-[-0.03em] text-[#F04404]">{HERO.h1Emphasis}</em>
              </h1>

              <p className="text-[16px] md:text-[18px] text-[#0A0A08]/70 mt-6 leading-[1.6] max-w-[62ch] text-pretty">{HERO.sub}</p>

              <div className="flex flex-wrap items-center gap-4 mt-8">
              <button
                onClick={() => openBrief?.()}
                className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] bg-[#F04404] text-[#0A0A08] px-8 py-4 rounded-full transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-[#E93E00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F04404] focus-visible:outline-offset-2 inline-flex items-center gap-2"
              >
                {HERO.cta} <ArrowRight size={14} aria-hidden="true" />
              </button>
              <a
                href="#system"
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#0A0A08] no-underline inline-flex items-center gap-2 px-2 py-3 border-b border-[#0A0A08]/30 hover:border-[#F04404] hover:text-[#8A6A2B] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F04404] focus-visible:outline-offset-2"
              >
                {HERO.ctaSub} <ArrowRight size={13} aria-hidden="true" />
              </a>
              <a
                href="tel:+14808001234"
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#0A0A08] no-underline inline-flex items-center gap-2 px-3 py-3 border border-[#0A0A08]/15 rounded-full hover:border-[#F04404] hover:text-[#8A6A2B] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F04404] focus-visible:outline-offset-2"
                aria-label="Call Ahead of Market at 480-800-1234"
              >
                480-800-1234
              </a>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#0A0A08] text-[#F5F3EE] border border-[#0A0A08] overflow-hidden">
              <div className="px-6 md:px-8 py-6 border-b border-[#F5F3EE]/10 flex items-baseline justify-between gap-4">
                <Kick dark>The monthly loop</Kick>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F5F3EE]/35">Repeat</span>
              </div>
              {(HERO.loop || []).map((step) => (
                <div key={step.n} className="grid grid-cols-12 gap-4 px-6 md:px-8 py-5 border-b border-[#F5F3EE]/10 last:border-b-0 items-start">
                  <span className="col-span-2 font-anton text-[28px] leading-none text-[#F04404]">{step.n}</span>
                  <span className="col-span-10">
                    <span className="block font-anton uppercase text-[22px] leading-none tracking-[0.01em] text-[#F5F3EE]">{step.label}</span>
                    <span className="block font-hanken text-[13px] leading-[1.45] text-[#F5F3EE]/55 mt-1.5">{step.detail}</span>
                  </span>
                </div>
              ))}
              <div className="px-6 md:px-8 py-5 bg-[#F04404] text-[#0A0A08]">
                <p className="font-anton uppercase text-[24px] md:text-[28px] leading-none tracking-[0.01em]">Then we do it again.</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] mt-2 opacity-60">That is what a department is.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 border-y border-[#0A0A08]/10">
            {(HERO.promises || []).map((promise, index) => (
              <div key={promise.label} className={`py-5 md:px-6 ${index > 0 ? 'border-t md:border-t-0 md:border-l border-[#0A0A08]/10' : ''}`}>
                <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#8A6A2B]">Promise {String(index + 1).padStart(2, '0')}</p>
                <p className="font-hanken text-[15px] font-semibold text-[#0A0A08] mt-1">{promise.label}</p>
                <p className="font-hanken text-[13px] text-[#0A0A08]/50 mt-0.5">{promise.detail}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#0A0A08]/30 mt-4">Phoenix · Since 2014 · Every industry, a soft spot for construction</p>
        </div>

        <style>{`
          .r38-root ::selection { background: #F04404; color: #0A0A08; }
          .r38-root ::-moz-selection { background: #F04404; color: #0A0A08; }
          .r38-root a:focus-visible, .r38-root button:focus-visible { outline: 2px solid #F04404; outline-offset: 3px; border-radius: 2px; }
          .r38-root * { scrollbar-color: #0A0A08 #F5F3EE; scrollbar-width: thin; }
          .r38-root ::-webkit-scrollbar { width: 8px; height: 8px; }
          .r38-root ::-webkit-scrollbar-thumb { background: #0A0A08; border-radius: 999px; }
          .r38-root ::-webkit-scrollbar-track { background: #F5F3EE; }
          .hero-grid-drift {
            background-image:
              repeating-linear-gradient(0deg, rgba(10,10,8,0.045) 0 1px, transparent 1px 56px),
              repeating-linear-gradient(90deg, rgba(10,10,8,0.045) 0 1px, transparent 1px 56px);
            animation: heroGridDrift 46s linear infinite;
          }
          @keyframes heroGridDrift { from { transform: translate(0, 0); } to { transform: translate(56px, 56px); } }
          .hero-air-breathe {
            background: radial-gradient(52% 44% at 68% 38%, rgba(240,68,4,0.06), transparent 70%);
            animation: heroAirBreathe 10s ease-in-out infinite alternate;
          }
          @keyframes heroAirBreathe { from { opacity: 0.5; transform: scale(1); } to { opacity: 1; transform: scale(1.04); } }
          @media (prefers-reduced-motion: reduce) { .hero-grid-drift, .hero-air-breathe { animation: none; } }
        `}</style>
      </section>

      {/* 1b. DEPARTMENT IN ACTION — real work substantiates the system */}
      <section className="bg-white border-b border-[#0A0A08]/10">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-8 md:py-10">
          <div className="flex items-baseline justify-between gap-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8A6A2B]">Department in action — real jobs, this month</p>
            <p className="hidden md:block font-mono text-[10px] uppercase tracking-[0.18em] text-[#0A0A08]/35">Swipe →</p>
          </div>
          <div className="mt-6">
            <StickyVideoDeck items={DECK_TRADES_FIRST} theme="paper" />
          </div>
        </div>
      </section>

      {/* 2. RECENT WORK — fills frame: header + dense marquee */}
      <section className="border-b border-[#0A0A08]/10 bg-[#EDE9E1] overflow-hidden">
        <div className="px-6 md:px-12 max-w-[1440px] mx-auto flex items-baseline justify-between gap-6 pt-5 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#8A6A2B]">Recent work — what shipped in the last 30 days</p>
          <p className="hidden md:block font-mono text-[10px] uppercase tracking-[0.18em] text-[#0A0A08]/40">{RECENT_WORK.length} active projects</p>
        </div>
        <div className="flex items-center gap-5 whitespace-nowrap animate-marquee-console pb-5">
          {[...RECENT_WORK, ...RECENT_WORK, ...RECENT_WORK].map((w, i) => (
            <div key={i} className="inline-flex items-center gap-3 border border-[#0A0A08]/12 bg-[#F5F3EE] rounded-full pl-5 pr-4 py-2.5 shrink-0">
              <span className="font-anton uppercase text-[17px] md:text-[20px] tracking-[0.01em] text-[#0A0A08]">{w.client}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.20em] text-[#0A0A08]/55 border-l border-[#0A0A08]/15 pl-3">{w.tag}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A6A2B] border-l border-[#0A0A08]/10 pl-3 hidden md:inline">{w.when}</span>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes marquee-console { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
          .animate-marquee-console { animation: marquee-console 70s linear infinite; }
          @media (prefers-reduced-motion: reduce) { .animate-marquee-console { animation: none; } }
        `}</style>
      </section>

      {/* 3. THE DEPARTMENT — ledger, not cards. Fills frame. */}
      <section id="department" className="bg-[#0A0A08] text-[#F5F3EE]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-5 px-6 md:px-12 lg:pr-12 pt-16 md:pt-20 lg:py-20 lg:sticky lg:top-0 lg:self-start">
            <div className="mb-4">
              <Kick dark>{DEPT.kick}</Kick>
            </div>
            <H2 dark className="max-w-sm text-balance">
              {DEPT.open}
            </H2>
            <p className="text-[18px] md:text-[19px] text-[#F5F3EE]/85 mt-6 leading-[1.65] max-w-[60ch] text-pretty">{DEPT.para}</p>
            <div className="mt-10 flex items-center gap-3">
              <div className="h-px w-10 bg-[#F04404]" />
              <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#F5F3EE]/50">Five people who do one thing well</p>
            </div>
            <figure className="mt-10 -mx-6 md:-mx-12 lg:mx-0">
              <img src="/aom-kit/img/ambition-crew.jpg" alt="Ambition Mechanical crew on the job, photographed by AOM" className="w-full aspect-[16/10] object-cover" loading="lazy" />
              <figcaption className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F5F3EE]/40 mt-3 px-6 md:px-12 lg:px-0">
                Ambition Mechanical · Phoenix · shot on the job, not in a studio
              </figcaption>
            </figure>
          </div>
          <div className="lg:col-span-7 lg:border-l lg:border-[#F5F3EE]/10">
            {(DEPT.ledger || DEPT.modules.map((m, i) => ({ n: String(i + 1).padStart(2, '0'), label: m.label, meta: '', detail: '' }))).map((row) => {
              const idx = parseInt(row.n, 10) - 1;
              const Icon = MODULE_ICONS[idx] || ClipboardList;
              const mod = DEPT.modules[idx];
              return (
                <div
                  key={row.n}
                  className="grid grid-cols-12 gap-4 px-6 md:px-12 py-9 md:py-10 border-t border-[#F5F3EE]/10 first:border-t-0 hover:bg-[#F5F3EE]/[0.04] transition-colors"
                >
                  <div className="col-span-2 md:col-span-1">
                    <p className="font-anton text-[28px] md:text-[32px] leading-none tracking-[-0.02em] text-[#F04404] tabular-nums">{row.n}</p>
                  </div>
                  <div className="col-span-10 md:col-span-11">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon size={16} strokeWidth={1.75} className="text-[#F04404] shrink-0" aria-hidden="true" />
                      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-[#F04404]">{row.label}</p>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F5F3EE]/40 mb-3">{row.meta}</p>
                    <p className="text-[15px] md:text-[16px] text-[#F5F3EE]/88 leading-[1.65] max-w-[68ch] text-pretty">{mod.body}</p>
                    <p className="font-hanken text-[13px] text-[#F5F3EE]/35 mt-2">{row.detail}</p>
                  </div>
                </div>
              );
            })}
            <div className="px-6 md:px-12 py-8 bg-[#F04404] text-[#0A0A08]">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-60">The loop</p>
              <p className="font-anton uppercase text-[22px] md:text-[26px] leading-[0.98] tracking-[0.01em] mt-2 text-balance">At the end of the month you get one page that shows what happened.</p>
              <p className="font-hanken text-[14px] leading-[1.6] opacity-70 mt-3 max-w-[60ch]">What ran, what it did, and what is next. No deck. One page you can forward.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. A MONTH WITH US — diagram + photo: fills frame edge-to-edge */}
      <section id="system" className="bg-[#F5F3EE] scroll-mt-16">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-7 px-6 md:px-12 py-16 md:py-20 lg:pr-12">
            <div className="mb-4">
              <Kick>{MONTH.kick}</Kick>
            </div>
            <H2 className="max-w-lg text-balance">{MONTH.tail}</H2>
            <p className="text-[17px] md:text-[18px] text-[#0A0A08]/65 mt-6 leading-[1.65] max-w-[60ch] text-pretty">{MONTH.body}</p>
            <div className="mt-10 border border-[#0A0A08]/12 bg-white overflow-hidden">
              <div className="grid grid-cols-12 gap-0 font-mono text-[10px] uppercase tracking-[0.20em] text-[#0A0A08]/40 px-5 py-3 border-b border-[#0A0A08]/10 bg-[#EDE9E1]">
                <span className="col-span-3">Week</span>
                <span className="col-span-5">Focus</span>
                <span className="col-span-4 text-right hidden md:block">Ships</span>
              </div>
              {MONTH.weeks.map((w) => (
                <div key={w.wk} className="grid grid-cols-12 gap-2 md:gap-4 px-5 py-5 border-t border-[#0A0A08]/10 first:border-t-0 items-baseline">
                  <span className="col-span-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[#8A6A2B]">{w.wk}</span>
                  <span className="col-span-9 md:col-span-5 font-anton uppercase text-[20px] md:text-[26px] leading-[0.98] tracking-[0.01em] text-[#0A0A08]">{w.what}</span>
                  <span className="col-span-12 md:col-span-4 font-hanken text-[13px] text-[#0A0A08]/55 leading-tight md:text-right mt-1 md:mt-0">{w.out}</span>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#0A0A08]/30 mt-4">Work goes live as it is ready — no batch at month end.</p>
          </div>
          <div className="lg:col-span-5 bg-[#0A0A08] text-[#F5F3EE] flex flex-col">
            <div className="grid grid-cols-2 gap-0 flex-1">
              <div className="relative overflow-hidden">
                <img src="/aom-kit/img/welder.png" alt="Welder on a structural beam — AOM filming on the job" className="w-full h-full object-cover min-h-[320px]" loading="lazy" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-white/80">Shoot</p>
                  <p className="font-hanken text-[13px] font-medium text-white leading-tight mt-1">On your jobs, not in a studio.</p>
                </div>
              </div>
              <div className="relative overflow-hidden border-l border-[#F5F3EE]/10">
                <img src="/aom-kit/img/jobsite.png" alt="Construction crew framing a roof on site" className="w-full h-full object-cover min-h-[320px]" loading="lazy" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-white/80">Report</p>
                  <p className="font-hanken text-[13px] font-medium text-white leading-tight mt-1">One page at month end.</p>
                </div>
              </div>
            </div>
            <div className="px-6 md:px-8 py-8">
              <Kick dark>{NINETY.kick}</Kick>
              <p className="text-[16px] md:text-[17px] text-[#F5F3EE]/85 leading-[1.65] mt-3 max-w-[60ch] text-pretty">{NINETY.body}</p>
              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[#F5F3EE]/12 pt-5">
                {(NINETY.steps || []).map((s) => (
                  <div key={s.d}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F04404]">{s.d}</p>
                    <p className="font-hanken text-[13px] font-semibold text-[#F5F3EE] leading-tight mt-1">{s.what}</p>
                    <p className="font-hanken text-[12px] text-[#F5F3EE]/45 leading-tight mt-1">{s.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FILMS — asymmetric hero + dossier */}
      <section id="films" className="bg-[#0A0A08] text-[#F5F3EE] border-t border-[#F5F3EE]/10">
        <div className="max-w-[1440px] mx-auto">
          <div className="px-6 md:px-12 pt-16 md:pt-20 pb-8 flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="mb-4">
                <Kick dark>{FILMS.kick}</Kick>
              </div>
              <H2 dark className="max-w-xl text-balance">
                {FILMS.h2}
              </H2>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F5F3EE]/40 max-w-xs leading-relaxed">Every reel is a real client job. No stock, no staged set.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-t border-[#F5F3EE]/10">
            <a
              href="#"
              className="lg:col-span-7 group relative block aspect-[16/10] lg:aspect-[4/3] overflow-hidden border-r-0 lg:border-r border-[#F5F3EE]/10 bg-black no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F04404] focus-visible:outline-offset-[-2px]"
            >
              <LazyGumlet id={FILMS.items[0].reel} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent z-10 pointer-events-none" />
              <div className="absolute top-5 left-5 z-20">
                <span className="font-mono text-[10px] uppercase tracking-[0.20em] bg-[#F04404] text-[#0A0A08] px-3 py-1.5">01 — Feature</span>
              </div>
              <div className="absolute bottom-7 left-7 right-7 z-20">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#F04404] mb-3">{FILMS.items[0].label}</p>
                <h3 className="font-anton uppercase text-[24px] md:text-[32px] leading-[0.96] tracking-[0.005em] text-[#F5F3EE] max-w-lg text-balance">{FILMS.items[0].title}</h3>
                <span className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#F5F3EE] border border-[#F5F3EE]/20 rounded-full px-4 py-2 group-hover:border-[#F04404]/60 transition-colors">
                  <Play size={13} className="fill-current text-[#F04404]" aria-hidden="true" /> Watch — 1:00
                </span>
              </div>
            </a>
            <div className="lg:col-span-5 flex flex-col">
              <a
                href="#"
                className="group relative block aspect-[16/10] overflow-hidden bg-black no-underline flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F04404] focus-visible:outline-offset-[-2px]"
              >
                <LazyGumlet id={FILMS.items[1].reel} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent z-10 pointer-events-none" />
                <div className="absolute top-5 left-5 z-20">
                  <span className="font-mono text-[10px] uppercase tracking-[0.20em] bg-[#F5F3EE] text-[#0A0A08] px-3 py-1.5">02 — Documentary</span>
                </div>
                <div className="absolute bottom-6 left-6 right-6 z-20">
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#F04404] mb-2">{FILMS.items[1].label}</p>
                  <h3 className="font-anton uppercase text-[20px] md:text-[24px] leading-[0.98] tracking-[0.005em] text-[#F5F3EE] text-balance">{FILMS.items[1].title}</h3>
                  <span className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#F5F3EE]">
                    <Play size={13} className="fill-current text-[#F04404]" aria-hidden="true" /> Watch
                  </span>
                </div>
              </a>
              <div className="grid grid-cols-2 gap-0 border-t border-[#F5F3EE]/10 bg-[#141412]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src="/aom-kit/img/jobsite.png" alt="Job site behind the scenes, filmed by AOM" className="w-full h-full object-cover opacity-90" loading="lazy" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/70">On the job</p>
                  </div>
                </div>
                <div className="px-5 py-5 flex flex-col justify-center border-l border-[#F5F3EE]/10">
                  <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#F5F3EE]/40">How it is made</p>
                  <p className="font-hanken text-[14px] leading-[1.5] text-[#F5F3EE]/85 mt-2 text-pretty">Two people, one day, real work happening around us. Back in two days cut.</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F5F3EE]/30 mt-3">No studio · No actors</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. THE WORK — featured tile breaks the grid */}
      <section id="work" className="py-16 md:py-20 px-6 md:px-12 bg-[#F5F3EE]">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-4">
            <div>
              <div className="mb-4">
                <Kick>{WORK.kick}</Kick>
              </div>
              <H2 className="max-w-xl text-balance">{WORK.h2}</H2>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#0A0A08]/35 max-w-xs leading-relaxed text-right hidden md:block">Tap any tile to watch. Every reel is a real job — no stock.</p>
          </div>
          <p className="text-[16px] text-[#0A0A08]/55 leading-[1.6] max-w-[60ch] mb-8 text-pretty">{WORK.lede}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
            {CASE_TILES.map((t, idx) => {
              const isFeature = idx === 0;
              return (
                <a
                  key={t.client}
                  href="#"
                  className={`group block relative overflow-hidden bg-[#0A0A08] no-underline border border-[#0A0A08]/12 hover:border-[#F04404]/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F04404] focus-visible:outline-offset-2 ${isFeature ? 'lg:col-span-8 aspect-[16/9] lg:aspect-[16/8]' : 'lg:col-span-4 aspect-[5/4]'}`}
                >
                  <LazyGumlet id={t.reel} className="transition-transform duration-700 group-hover:scale-[1.04]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  {isFeature && <span className="absolute top-4 left-4 font-mono text-[10px] uppercase tracking-[0.20em] bg-[#F04404] text-[#0A0A08] px-3 py-1.5 z-20">Featured</span>}
                  <div className="absolute bottom-5 left-5 right-5 z-10">
                    <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#F04404] mb-1.5">{t.tag}</p>
                    <p className={`font-anton uppercase leading-tight tracking-[0.01em] text-[#F5F3EE] ${isFeature ? 'text-[26px] md:text-[30px]' : 'text-[20px] md:text-[22px]'} text-balance`}>{t.client}</p>
                  </div>
                </a>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#0A0A08]/10 pt-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#0A0A08]/35">Also:</span>
            {['Walkthroughs', 'Brand films', 'Event recaps', 'Drone', 'Social cuts', 'Photography'].map((tag) => (
              <span key={tag} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#0A0A08]/60 border border-[#0A0A08]/12 bg-white rounded-full px-3.5 py-1.5">
                {tag}
              </span>
            ))}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#0A0A08]/25 ml-auto hidden md:inline">All shot on your jobs</span>
          </div>
        </div>
      </section>

      {/* 7. A LA CARTE */}
      <section id="one-thing" className="bg-[#EDE9E1] border-y border-[#0A0A08]/10">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-7 px-6 md:px-12 py-16 md:py-20">
            <H2 className="!text-[30px] md:!text-[40px] text-balance">{ALACARTE.kick}</H2>
            <p className="text-[16px] md:text-[17px] text-[#0A0A08]/60 mt-4 leading-[1.6] max-w-[60ch] text-pretty">{ALACARTE.body}</p>
            <div className="mt-8 border border-[#0A0A08]/12 bg-[#F5F3EE] overflow-hidden">
              {(ALACARTE.items || ['A crew for a day', 'A website', 'Somebody to run your ads'].map((t) => ({ title: t, detail: '', meta: '' }))).map((item) => (
                <button
                  key={item.title}
                  onClick={() => openBrief?.()}
                  className="group w-full flex items-center gap-6 px-6 md:px-8 py-6 border-b border-[#0A0A08]/10 text-left hover:bg-white transition-colors last:border-b-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F04404] focus-visible:outline-offset-[-2px]"
                >
                  <span className="flex-1 min-w-0">
                    <span className="font-hanken text-[17px] font-semibold text-[#0A0A08] group-hover:text-[#8A6A2B] transition-colors block text-balance">{item.title}</span>
                    <span className="font-hanken text-[13px] text-[#0A0A08]/50 block mt-0.5">{item.detail}</span>
                  </span>
                  <span className="hidden md:block font-mono text-[10px] uppercase tracking-[0.16em] text-[#0A0A08]/30 text-right max-w-[140px] leading-tight">{item.meta}</span>
                  <span className="shrink-0 w-9 h-9 rounded-full border border-[#0A0A08]/12 flex items-center justify-center group-hover:border-[#F04404] group-hover:bg-[#F04404] transition-colors">
                    <ArrowUpRight size={16} className="text-[#8A6A2B] group-hover:text-[#0A0A08] transition-colors" aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#0A0A08]/35 mt-4">{ALACARTE.link}</p>
          </div>
          <div className="lg:col-span-5 lg:border-l border-[#0A0A08]/10 bg-[#0A0A08] text-[#F5F3EE] p-6 md:p-8 flex flex-col">
            <figure className="relative overflow-hidden flex-1 min-h-[280px]">
              <img src="/aom-kit/img/owner1.png" alt="Business owner on a job site, photographed by AOM" className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <figcaption className="absolute bottom-4 left-4 right-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-white/70">A crew for a day</p>
                <p className="font-hanken text-[14px] font-medium text-white leading-tight mt-1">You get the photos, the cuts, and the files. Yours to keep.</p>
              </figcaption>
            </figure>
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[#F5F3EE]/12 pt-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F5F3EE]/40">Turnaround</p>
                <p className="font-hanken text-[13px] font-semibold text-[#F5F3EE] mt-1">2 days</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F5F3EE]/40">You own</p>
                <p className="font-hanken text-[13px] font-semibold text-[#F5F3EE] mt-1">Every file</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F5F3EE]/40">Where</p>
                <p className="font-hanken text-[13px] font-semibold text-[#F5F3EE] mt-1">Your job site</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. THE PROMISES — the operating standard */}
      <section id="promises" className="bg-[#0A0A08] text-[#F5F3EE] border-t border-[#F5F3EE]/10">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-5 px-6 md:px-12 py-16 md:py-20 flex flex-col justify-center">
            <div className="mb-4">
              <Kick dark>{PROMISES.kick}</Kick>
            </div>
            <H2 dark className="max-w-md text-balance">
              {PROMISES.h2}
            </H2>
            <p className="text-[16px] md:text-[17px] text-[#F5F3EE]/70 mt-6 leading-[1.65] max-w-[60ch] text-pretty">{PROMISES.body}</p>
            <div className="mt-10">
              <p className="font-anton uppercase text-[28px] md:text-[38px] leading-[0.98] tracking-[-0.02em] text-[#F04404] max-w-md text-balance">{PROMISES.punch}</p>
              <button
                onClick={() => openBrief?.()}
                className="mt-8 font-mono text-[11px] font-medium uppercase tracking-[0.22em] bg-[#F04404] text-[#0A0A08] px-8 py-4 rounded-full transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-[#E93E00] inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F04404] focus-visible:outline-offset-2"
              >
                {CLOSING.cta} <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="lg:col-span-7 lg:border-l border-[#F5F3EE]/10 bg-[#141412]">
            {(PROMISES.items || []).map((item) => (
              <div key={item.n} className="grid grid-cols-12 gap-4 px-6 md:px-10 lg:px-12 py-7 md:py-9 border-t border-[#F5F3EE]/10 first:border-t-0 items-start hover:bg-[#F5F3EE]/[0.03] transition-colors">
                <span className="col-span-2 md:col-span-1 font-anton text-[28px] md:text-[32px] leading-none text-[#F04404]">{item.n}</span>
                <div className="col-span-10 md:col-span-11">
                  <p className="font-anton uppercase text-[22px] md:text-[26px] leading-none tracking-[0.01em] text-[#F5F3EE]">{item.title}</p>
                  <p className="font-hanken text-[14px] md:text-[15px] leading-[1.55] text-[#F5F3EE]/55 mt-2 max-w-[62ch] text-pretty">{item.detail}</p>
                </div>
              </div>
            ))}
            <div className="px-6 md:px-10 lg:px-12 py-6 bg-[#F04404] text-[#0A0A08]">
              <p className="font-mono text-[10px] uppercase tracking-[0.20em] opacity-55">The short version</p>
              <p className="font-anton uppercase text-[24px] md:text-[30px] leading-none tracking-[0.01em] mt-2">Clear plan. Real work. No disappearing act.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PROOF — photo + data */}
      <section id="proof" className="bg-[#F5F3EE]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-6 relative overflow-hidden bg-[#0A0A08] min-h-[480px] lg:min-h-0">
            <img src="/aom-kit/img/ambition-crew.jpg" alt="Ambition Mechanical crew on site, shot by AOM" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white">{PROOF.label}</p>
              <p className="font-hanken text-[13px] text-white/70 mt-1">Phoenix · photographed on the job — that is the whole point.</p>
            </div>
          </div>
          <div className="lg:col-span-6 px-6 md:px-10 lg:px-12 py-16 md:py-20 flex flex-col justify-center">
            <div className="mb-4">
              <Kick>{PROOF.kick}</Kick>
            </div>
            <p className="font-hanken text-[22px] md:text-[28px] font-medium leading-[1.35] tracking-[-0.01em] text-[#0A0A08] max-w-[60ch] text-pretty">{PROOF.body}</p>
            <div className="mt-8 grid grid-cols-3 gap-4 border-y border-[#0A0A08]/10 py-6">
              {(PROOF.stats || [
                { k: 'Shoots', v: '46', d: 'A year on his jobs' },
                { k: 'Photos', v: '399', d: 'Edited, yours' },
                { k: 'Months', v: '12', d: 'Kept earning the next month' },
              ]).map((s) => (
                <div key={s.k} className="border-l border-[#0A0A08]/10 pl-4 first:border-l-0 first:pl-0">
                  <p className="font-anton uppercase text-[32px] md:text-[40px] leading-none tracking-[-0.02em] text-[#0A0A08] tabular-nums">{s.v}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A6A2B] mt-1">{s.k}</p>
                  <p className="font-hanken text-[12px] text-[#0A0A08]/40 leading-tight mt-1">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="border-l-2 border-[#F04404] pl-6 py-1 mt-8">
              <p className="text-[16px] md:text-[17px] text-[#0A0A08]/65 leading-[1.65] max-w-[60ch] text-pretty">{PROOF.aside}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. CLOSING — type + photo */}
      <section className="bg-[#0A0A08] text-[#F5F3EE] overflow-hidden">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-8 px-6 md:px-12 py-20 md:py-28 lg:py-32">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#F04404] mb-6">Phoenix, Arizona — since 2014</p>
            <h2 className="font-anton uppercase text-[52px] md:text-[88px] lg:text-[104px] leading-[0.9] tracking-[-0.02em] text-balance">{CLOSING.h2}</h2>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={() => openBrief?.()}
                className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] bg-[#F04404] text-[#0A0A08] px-10 py-5 rounded-full transition-[transform,background-color] duration-200 hover:scale-[1.02] hover:bg-[#E93E00] inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F04404] focus-visible:outline-offset-2"
              >
                {CLOSING.cta} <ArrowRight size={15} aria-hidden="true" />
              </button>
              <a
                href="tel:+14808001234"
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#F5F3EE] border border-[#F5F3EE]/20 rounded-full px-5 py-4 hover:border-[#F04404] hover:text-[#F04404] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F04404] focus-visible:outline-offset-2"
                aria-label="Call Ahead of Market at 480-800-1234"
              >
                480-800-1234
              </a>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#F5F3EE]/40 px-2">One team · One monthly loop · Everything stays yours</span>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#F5F3EE]/40 mt-10 max-w-[68ch] leading-[1.8] text-pretty">{CLOSING.footnote}</p>
          </div>
          <div className="lg:col-span-4 lg:border-l border-[#F5F3EE]/10 flex flex-col">
            <div className="relative flex-1 min-h-[260px] overflow-hidden">
              <img src="/aom-kit/img/jobsite.png" alt="A job site at golden hour, Phoenix" className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className="absolute inset-0 bg-[#0A0A08]/15" />
            </div>
            <div className="px-6 md:px-8 py-8 bg-[#141412] border-t border-[#F5F3EE]/10">
              <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#F5F3EE]/40">What happens next</p>
              <ol className="mt-4 space-y-3">
                <li className="flex gap-3">
                  <span className="font-mono text-[11px] text-[#F04404]">01</span>
                  <span className="font-hanken text-[14px] text-[#F5F3EE]/80 leading-tight">You tell us what you need — a sentence is fine.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-[11px] text-[#F04404]">02</span>
                  <span className="font-hanken text-[14px] text-[#F5F3EE]/80 leading-tight">We reply within 24 hours with a clear recommendation and next steps.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-[11px] text-[#F04404]">03</span>
                  <span className="font-hanken text-[14px] text-[#F5F3EE]/80 leading-tight">We start. You get a rough draft in 48 to 72 hours.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
