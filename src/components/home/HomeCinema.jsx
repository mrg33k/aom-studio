import React from 'react';
import { ArrowRight, ArrowUpRight, Play } from 'lucide-react';
import StickyVideoDeck from './StickyVideoDeck';
import LazyGumlet from './LazyGumlet';
import TwoWaysSection from './TwoWaysSection';
import {
  HERO_DECK, RECENT_WORK, STATS, SERVICES, CASE_TILES,
  COMPARISON, TESTIMONIALS, PLATFORM_FEATURES, PILLARS,
} from './content';

/**
 * HomeCinema -- All Superside sections, dark/film-festival treatment.
 * Heavier video usage, bigger orange punches, marquee strips, motion-led.
 */

export default function HomeCinema({ openBrief }) {
  return (
    <div className="bg-black text-[#F0ECE6]">
      {/* 1. HERO -- Superside-shape, cinema themed */}
      <section className="relative overflow-hidden lg:min-h-[900px] xl:min-h-[965px]">
        <div className="px-6 md:px-12 pt-28 md:pt-36 pb-12 lg:pb-0 lg:py-40 max-w-[1608px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-24 xl:gap-32 relative lg:min-h-[700px] xl:min-h-[805px]">
            <div className="lg:w-1/2 flex flex-col">
              <div className="inline-flex items-center gap-3 bg-[#0C0C0C]/60 backdrop-blur-sm border border-[#E85D26]/30 px-3 py-1.5 rounded-full mb-8 self-start">
                <span className="w-2 h-2 rounded-full bg-[#E85D26] animate-pulse" />
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#F0ECE6]">Now streaming · Live reels</p>
              </div>
              <h1 className="font-display-serif text-[14vw] md:text-[80px] lg:text-[96px] xl:text-[120px] leading-[0.88] tracking-[-0.03em] max-w-[700px]">
                A creative team<br />you can <em className="font-display-italic italic font-medium text-[#E85D26]">hire.</em>
              </h1>
              <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/85 mt-8 leading-[1.55] max-w-xl">
                Brand films, websites, and ads for real businesses. Hire us online by sending a few files. Or hire us in person. We reply within 24 hours.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-10">
                <button onClick={() => openBrief?.()}
                  className="bg-[#E85D26] text-[#0C0C0C] font-body font-semibold text-[14px] px-6 py-3.5 rounded-full hover:bg-[#FF6B2C] transition-colors flex items-center gap-2">
                  Start a project <ArrowRight size={15} />
                </button>
                <a href="#work" className="text-[#F0ECE6] flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.22em] no-underline px-2 py-3 hover:text-[#E85D26] transition-colors">
                  <Play size={14} className="fill-current" /> Watch the reel
                </a>
              </div>
            </div>
            <div className="lg:absolute lg:top-0 lg:right-0 lg:bottom-0 lg:w-1/2 lg:pr-8 xl:pr-10 lg:pl-4">
              <StickyVideoDeck items={HERO_DECK} theme="cinema" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. RECENT WORK — live activity ticker */}
      <section className="border-y border-[#E85D26]/20 py-5 overflow-hidden bg-[#0a0a0a]">
        <div className="px-6 md:px-12 max-w-[1440px] mx-auto pb-3 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#E85D26] animate-pulse" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">In the room · Last 30 days</p>
          </div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/50">14 projects in flight</p>
        </div>
        <div className="flex items-center gap-6 whitespace-nowrap animate-marquee-cinema">
          {[...RECENT_WORK, ...RECENT_WORK, ...RECENT_WORK].map((w, i) => (
            <div key={i} className="inline-flex items-center gap-3 border border-[#E85D26]/20 bg-black/50 rounded-full pl-5 pr-4 py-2.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26]" />
              <span className="font-display-serif text-[20px] md:text-[26px] tracking-[-0.015em] text-[#F0ECE6]">{w.client}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/65 border-l border-[#E85D26]/25 pl-3">{w.tag}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26]/85">· {w.when}</span>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes marquee-cinema { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
          .animate-marquee-cinema { animation: marquee-cinema 80s linear infinite; }
        `}</style>
      </section>

      {/* 3. HOW IT WORKS — TwoWaysSection with A/B/C/D layout picker */}
      <TwoWaysSection openBrief={openBrief} />

      {/* 5. STATS -- ticker */}
      <section className="py-20 md:py-24 px-6 md:px-12 border-y border-[#E85D26]/15 bg-[#0a0a0a]">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="md:border-r last:border-r-0 border-[#E85D26]/20 md:px-5">
                <p className="font-display-serif text-[64px] md:text-[88px] leading-none tracking-[-0.03em] text-[#E85D26]">{s.value}</p>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/65 mt-3">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 + 7. CUSTOMER STORIES -- film posters */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#E85D26]/15">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5">Featured · 02 stories</p>
          <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em] mb-14 max-w-3xl">
            From the <em className="font-display-italic italic font-medium text-[#E85D26]">field.</em>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <a href="#" className="group relative block aspect-[16/10] overflow-hidden rounded-lg border border-[#E85D26]/20 bg-black no-underline">
              <LazyGumlet id="698a6296fc23d3d76fa8d992" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-10 pointer-events-none" />
              <div className="absolute bottom-7 left-7 right-7 z-20">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] mb-3">Customer film · Ambition Mechanical</p>
                <h3 className="font-display-serif text-[32px] md:text-[44px] leading-[0.95] tracking-[-0.025em]">
                  Three decades of work, <em className="font-display-italic italic font-medium text-[#E85D26]">finally on film.</em>
                </h3>
                <span className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#F0ECE6]">
                  <Play size={13} className="fill-current text-[#E85D26]" /> Watch
                </span>
              </div>
            </a>
            <a href="#" className="group relative block aspect-[16/10] overflow-hidden rounded-lg border border-[#E85D26]/20 bg-black no-underline">
              <LazyGumlet id="698a5d24aec3d4e420c2a0a0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent z-10 pointer-events-none" />
              <div className="absolute bottom-7 left-7 right-7">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] mb-3">Customer story · Skylar</p>
                <h3 className="font-display-serif text-[32px] md:text-[44px] leading-[0.95] tracking-[-0.025em]">
                  Wellness brand, <em className="font-display-italic italic font-medium text-[#E85D26]">city showed up.</em>
                </h3>
                <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[#F0ECE6]">
                  Read the story <ArrowUpRight size={13} />
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* 8. SERVICES -- index card stack */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#E85D26]/15">
        <div className="max-w-[1440px] mx-auto">
          <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em] mb-12">
            <em className="font-display-italic italic font-medium text-[#E85D26]">Capabilities.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {SERVICES.map((g, gi) => (
              <div key={g.group} className="border border-[#E85D26]/20 bg-[#0a0a0a] p-6 hover:border-[#E85D26]/60 transition-colors">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] mb-4">{String(gi + 1).padStart(2, '0')} · {g.group}</p>
                <ul className="space-y-2.5">
                  {g.items.map((it) => (
                    <li key={it} className="font-body text-[14.5px] text-[#F0ECE6]/90 hover:text-[#E85D26] transition-colors">{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. WORK -- screening room grid */}
      <section id="work" className="py-24 md:py-32 px-6 md:px-12 border-b border-[#E85D26]/15">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em]">
              The <em className="font-display-italic italic font-medium text-[#E85D26]">screening room.</em>
            </h2>
            <a href="#" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] inline-flex items-center gap-1.5 no-underline">
              Full archive <ArrowRight size={13} />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CASE_TILES.map((t, i) => (
              <a key={t.client} href="#" className="group block relative aspect-[5/4] overflow-hidden bg-black no-underline border border-[#E85D26]/15 hover:border-[#E85D26]/60 transition-colors">
                <LazyGumlet id={t.reel} className="transition-transform duration-700 group-hover:scale-[1.06]" filter="grayscale(0.15) contrast(1.15)" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute top-4 left-5 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26]" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#F0ECE6]">Reel {String(i + 1).padStart(2, '0')}</p>
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26] mb-1.5">{t.tag}</p>
                  <p className="font-display-serif text-[24px] md:text-[26px] leading-tight tracking-[-0.01em]">{t.client}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 10. COMPARISON -- title-card "vs" treatment */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#E85D26]/15 bg-[#0a0a0a]">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5 text-center">VS · Compare</p>
          <h2 className="font-display-serif text-[44px] md:text-[100px] leading-[0.9] tracking-[-0.03em] mb-16 text-center">
            Hiring or outsourcing? <em className="font-display-italic italic font-medium text-[#E85D26]">Neither.</em>
          </h2>
          <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
            <table className="w-full min-w-[760px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left p-4"></th>
                  {COMPARISON.cols.map((c, i) => (
                    <th key={c} className={`text-left p-4 border-b-2 ${i === 0 ? 'border-[#E85D26]' : 'border-[#F0ECE6]/15'}`}>
                      <p className={`font-mono text-[11px] uppercase tracking-[0.28em] ${i === 0 ? 'text-[#E85D26]' : 'text-[#F0ECE6]/55'}`}>{c}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.rows.map((r) => (
                  <tr key={r.label}>
                    <td className="p-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 border-b border-[#F0ECE6]/10">{r.label}</td>
                    {r.cells.map((c, i) => (
                      <td key={i} className={`p-4 font-body text-[14px] border-b ${i === 0 ? 'text-[#F0ECE6] font-medium border-[#E85D26]/30 bg-[#E85D26]/[0.05]' : 'text-[#F0ECE6]/55 border-[#F0ECE6]/10'}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 11. TESTIMONIALS -- bigger marquee */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#E85D26]/15 overflow-hidden">
        <div className="max-w-[1440px] mx-auto mb-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-4">From the audience</p>
          <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em]">
            Wins, <em className="font-display-italic italic font-medium text-[#E85D26]">told by clients.</em>
          </h2>
        </div>
        <div className="flex gap-5 animate-marquee-cinema-wide">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <div key={i} className="shrink-0 w-[480px] md:w-[540px] whitespace-normal border border-[#E85D26]/25 bg-[#0a0a0a] p-7 md:p-9">
              <p className="font-display-serif text-[20px] md:text-[24px] leading-[1.35] text-[#F0ECE6] tracking-[-0.005em]">"{t.quote}"</p>
              <div className="mt-7 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-[#E85D26] text-[#0C0C0C] flex items-center justify-center font-mono text-[12px] font-bold">{t.author.split(' ')[0]?.[0]}</span>
                <div>
                  <p className="font-body font-medium text-[13.5px] text-[#F0ECE6]">{t.author}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes marquee-cinema-wide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .animate-marquee-cinema-wide { animation: marquee-cinema-wide 90s linear infinite; }
        `}</style>
      </section>

      {/* 12. PLATFORM */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#E85D26]/15">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5">The system</p>
          <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em] mb-14 max-w-3xl">
            One team, <em className="font-display-italic italic font-medium text-[#E85D26]">one system.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PLATFORM_FEATURES.map((f, i) => (
              <div key={f.title} className="border border-[#E85D26]/15 bg-[#0a0a0a] p-7 md:p-9 hover:border-[#E85D26]/50 transition-colors">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] mb-4">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="font-display-serif text-[26px] md:text-[32px] leading-[1.0] tracking-[-0.018em] mb-4">{f.title}</h3>
                <p className="font-body text-[15px] text-[#F0ECE6]/75 leading-[1.6]">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 13. PILLARS */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#E85D26]/15 bg-[#0a0a0a]">
        <div className="max-w-[1440px] mx-auto">
          <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em] mb-14 max-w-3xl">
            Refuse to <em className="font-display-italic italic font-medium text-[#E85D26]">compromise.</em>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PILLARS.map((p, i) => (
              <div key={p.title} className="border-l-2 border-l-[#E85D26] border-y border-r border-[#E85D26]/15 bg-black p-6">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] mb-4">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="font-display-serif text-[24px] tracking-[-0.015em] mb-3">{p.title}</h3>
                <p className="font-body text-[13.5px] text-[#F0ECE6]/70 leading-[1.55]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 14. TALENT */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#E85D26]/15">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5">The team</p>
            <h2 className="font-display-serif text-[40px] md:text-[80px] leading-[0.92] tracking-[-0.025em]">
              <em className="font-display-italic italic font-medium text-[#E85D26]">Senior craft.</em><br />
              No middle layer.
            </h2>
            <p className="font-body text-[16px] text-[#F0ECE6]/80 mt-7 max-w-xl leading-[1.6]">
              Designers, directors, editors, strategists, writers. The person who shoots is the person who edits is the person you talk to.
            </p>
          </div>
          <div className="lg:col-span-6 order-1 lg:order-2 relative aspect-[4/3] overflow-hidden bg-black border border-[#E85D26]/20">
            <LazyGumlet id="698a6177873071aec5ca4374" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* 15. EMPATHY / CTA */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#E85D26]/15 bg-[#0a0a0a]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 relative aspect-[4/3] overflow-hidden bg-black border border-[#E85D26]/20">
            <LazyGumlet id="698a64e5873071aec5ca99ac" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />
          </div>
          <div className="lg:col-span-6">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5">For in-house teams</p>
            <h2 className="font-display-serif text-[40px] md:text-[80px] leading-[0.92] tracking-[-0.025em]">
              Your team deserves <em className="font-display-italic italic font-medium text-[#E85D26]">a partner.</em>
            </h2>
            <p className="font-body text-[16px] text-[#F0ECE6]/80 mt-7 max-w-xl leading-[1.6]">
              In-house creative teams ship the most when they have a partner to send the spillover to. Be that team. We'll be the partner.
            </p>
            <button onClick={() => openBrief?.()}
              className="mt-9 bg-[#E85D26] text-[#0C0C0C] font-body font-semibold text-[14px] px-7 py-3.5 rounded-full hover:bg-[#FF6B2C] transition-colors flex items-center gap-2">
              Start a project <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* 16. FOOTER CTA — end card */}
      <section className="py-32 md:py-44 px-6 md:px-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          <LazyGumlet id="698a6296fc23d3d76fa8d992" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-7">Final scene</p>
          <h2 className="font-display-serif text-[60px] md:text-[180px] leading-[0.82] tracking-[-0.035em]">
            Roll <em className="font-display-italic italic font-medium text-[#E85D26]">credits.</em>
          </h2>
          <p className="font-body text-[18px] text-[#F0ECE6]/80 mt-8 max-w-xl mx-auto">
            We're open for new work in 2026. Send us a brief.
          </p>
          <button onClick={() => openBrief?.()}
            className="mt-12 bg-[#E85D26] text-[#0C0C0C] font-body font-semibold text-[15px] px-8 py-4 rounded-full hover:bg-[#FF6B2C] transition-colors inline-flex items-center gap-2">
            Start a project <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
