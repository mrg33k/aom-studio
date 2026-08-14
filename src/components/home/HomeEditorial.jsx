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
 * HomeEditorial -- Same Superside section list, magazine/newspaper treatment.
 * Cream paper base, serif-led, numbered manifesto, table-of-contents service nav.
 */

export default function HomeEditorial({ openBrief }) {
  return (
    <div className="bg-[#FDF6EC] text-[#0C0C0C]">
      {/* 1. HERO -- Superside-shape, editorial themed */}
      <section className="relative overflow-hidden lg:min-h-[900px] xl:min-h-[965px] border-b border-[#0C0C0C]/12">
        <div className="px-6 md:px-12 pt-28 md:pt-36 pb-12 lg:pb-0 lg:py-40 max-w-[1608px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-24 xl:gap-32 relative lg:min-h-[700px] xl:min-h-[805px]">
            <div className="lg:w-1/2 flex flex-col">
              <div className="flex items-center gap-4 mb-7">
                <span className="w-10 h-px bg-[#E85D26]" />
                <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26]">Available anywhere · 2026</p>
              </div>
              <h1 className="font-display-serif text-[14vw] md:text-[80px] lg:text-[96px] xl:text-[120px] leading-[0.92] tracking-[-0.025em] max-w-[700px]">
                A creative team<br />you can <em className="font-display-italic italic font-medium text-[#E85D26]">hire.</em>
              </h1>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#E85D26] mt-8">Brand, websites, ads, and video. Online or in person.</p>
              <p className="font-body text-[16.5px] md:text-[18px] text-[#0C0C0C]/75 mt-8 leading-[1.55] max-w-xl">
                Send us files online or come visit. Either way, we reply within 24 hours and you have a rough draft in 48 to 72.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-10">
                <button onClick={() => openBrief?.()}
                  className="bg-[#0C0C0C] text-[#FDF6EC] font-body font-semibold text-[14px] px-6 py-3.5 rounded-full hover:bg-[#E85D26] transition-colors flex items-center gap-2">
                  Start a project <ArrowRight size={15} />
                </button>
                <a href="#work" className="border border-[#0C0C0C]/20 px-6 py-3.5 rounded-full font-body font-medium text-[14px] hover:bg-[#0C0C0C] hover:text-[#FDF6EC] transition-colors no-underline text-[#0C0C0C]">
                  See the work
                </a>
              </div>
            </div>
            <div className="lg:absolute lg:top-0 lg:right-0 lg:bottom-0 lg:w-1/2 lg:pr-8 xl:pr-10 lg:pl-4">
              <StickyVideoDeck items={HERO_DECK} theme="editorial" />
            </div>
          </div>
        </div>
      </section>

 {/* 2. RECENT WORK, masthead "what shipped this month" */}
      <section className="border-b border-[#0C0C0C]/12 py-10 md:py-12 px-6 md:px-12 bg-[#0C0C0C] text-[#FDF6EC]">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-7 border-b border-[#FDF6EC]/15 pb-5">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-2">In the room · Last 30 days</p>
              <p className="font-display-serif text-[28px] md:text-[40px] leading-[1.0] tracking-[-0.02em]">14 projects in flight</p>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#FDF6EC]/50">Edition · April 2026</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-3">
            {RECENT_WORK.map((w, i) => (
              <div key={w.client} className="flex items-baseline gap-3 border-b border-[#FDF6EC]/10 py-2.5">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] shrink-0 w-7">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display-serif text-[16px] md:text-[18px] tracking-[-0.01em] text-[#FDF6EC] truncate">{w.client}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#FDF6EC]/55 mt-0.5">{w.tag} · {w.when}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS — TwoWaysSection with A/B/C/D layout picker */}
      <TwoWaysSection openBrief={openBrief} />

      {/* 5. STATS — editorial chart */}
      <section className="py-20 md:py-24 px-6 md:px-12 border-b border-[#0C0C0C]/12">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-10">By the numbers</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {STATS.map((s) => (
              <div key={s.label} className="border-t-2 border-[#E85D26] pt-4">
                <p className="font-display-serif text-[64px] md:text-[88px] leading-none tracking-[-0.03em]">{s.value}</p>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#0C0C0C]/65 mt-3">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 + 7. CUSTOMER STORIES — feature article style */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#0C0C0C]/12">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-10">Field reports</p>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <article className="lg:col-span-7">
              <div className="aspect-[16/10] relative overflow-hidden border border-[#0C0C0C]/12 mb-7">
                <LazyGumlet id="698a6296fc23d3d76fa8d992" />
              </div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] mb-3">Customer story · Ambition Mechanical</p>
              <h3 className="font-display-serif text-[32px] md:text-[52px] leading-[0.95] tracking-[-0.02em]">
                Three decades of work, <em className="font-display-italic italic font-medium text-[#E85D26]">finally on film.</em>
              </h3>
              <a href="#" className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] no-underline">
                <Play size={13} className="fill-current" /> Watch the film
              </a>
            </article>
            <article className="lg:col-span-5">
              <div className="aspect-[4/3] relative overflow-hidden border border-[#0C0C0C]/12 mb-7">
                <LazyGumlet id="698a5d24aec3d4e420c2a0a0" />
              </div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] mb-3">Customer story · Skylar</p>
              <h3 className="font-display-serif text-[26px] md:text-[34px] leading-[1.0] tracking-[-0.015em]">
                A wellness brand the city showed up to.
              </h3>
              <a href="#" className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] no-underline">
                Read the story <ArrowUpRight size={13} />
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* 8. SERVICES TABLE OF CONTENTS */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#0C0C0C]/12">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-4">Capabilities</p>
              <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em] max-w-2xl">
                Move fast with <em className="font-display-italic italic font-medium text-[#E85D26]">16+ services.</em>
              </h2>
            </div>
            <a href="#services" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] inline-flex items-center gap-1.5 no-underline">
              See all services <ArrowRight size={13} />
            </a>
          </div>
          <div className="border-t-2 border-[#0C0C0C]">
            {SERVICES.map((g, gi) => (
              <div key={g.group} className="border-b border-[#0C0C0C]/15 grid grid-cols-1 md:grid-cols-12 py-6 md:py-7 gap-y-4">
                <div className="md:col-span-3 flex items-baseline gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26]">{String(gi + 1).padStart(2, '0')}</span>
                  <p className="font-display-serif text-[24px] md:text-[28px] tracking-[-0.015em]">{g.group}</p>
                </div>
                <div className="md:col-span-9 flex flex-wrap gap-x-8 gap-y-2">
                  {g.items.map((it, i) => (
                    <span key={it} className="font-body text-[15px] text-[#0C0C0C]/85 hover:text-[#E85D26] transition-colors cursor-pointer">
                      {it}{i < g.items.length - 1 ? '' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CLIENT WORK — editorial spread */}
      <section id="work" className="py-24 md:py-32 px-6 md:px-12 border-b border-[#0C0C0C]/12">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5">Recent work · 06 features</p>
          <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em] mb-14 max-w-3xl">
            From the <em className="font-display-italic italic font-medium text-[#E85D26]">archive.</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {CASE_TILES.map((t, i) => (
              <a key={t.client} href="#" className="group block no-underline">
                <div className="aspect-[5/4] relative overflow-hidden border border-[#0C0C0C]/12 mb-4 bg-black">
                  <LazyGumlet id={t.reel} className="transition-transform duration-700 group-hover:scale-[1.04]" />
                </div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#E85D26] mb-1">No. {String(i + 1).padStart(2, '0')} · {t.tag}</p>
                <p className="font-display-serif text-[22px] md:text-[26px] tracking-[-0.015em] leading-[1.05] text-[#0C0C0C]">{t.client}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 10. COMPARISON — decision table */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#0C0C0C]/12 bg-[#0C0C0C] text-[#FDF6EC]">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5">Editorial · Decision table</p>
          <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em] mb-12 max-w-3xl">
            Hiring or outsourcing? <em className="font-display-italic italic font-medium text-[#E85D26]">Neither.</em>
          </h2>
          <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#FDF6EC]/30">
                  <th className="text-left p-4 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#FDF6EC]/45 w-[18%]"></th>
                  {COMPARISON.cols.map((c, i) => (
                    <th key={c} className={`text-left p-4 font-mono text-[11px] uppercase tracking-[0.22em] ${i === 0 ? 'text-[#E85D26]' : 'text-[#FDF6EC]/55'}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.rows.map((r) => (
                  <tr key={r.label} className="border-b border-[#FDF6EC]/15">
                    <td className="p-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[#FDF6EC]/55">{r.label}</td>
                    {r.cells.map((c, i) => (
                      <td key={i} className={`p-4 font-body text-[14.5px] ${i === 0 ? 'text-[#FDF6EC] font-medium' : 'text-[#FDF6EC]/55'}`}>
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

      {/* 11. TESTIMONIALS — pull-quote letterpress */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#0C0C0C]/12">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-12">Letters from clients</p>
          <div className="columns-1 md:columns-2 lg:columns-3 gap-10 [column-fill:_balance]">
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} className="break-inside-avoid mb-12">
                <blockquote className="font-display-serif text-[20px] md:text-[26px] leading-[1.3] tracking-[-0.01em] text-[#0C0C0C]">
                  "<em className="text-[#E85D26] not-italic">{t.quote.split(' ').slice(0, 4).join(' ')}</em> {t.quote.split(' ').slice(4).join(' ')}"
                </blockquote>
                <figcaption className="mt-5">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#0C0C0C]/65">{t.author} · {t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 12. PLATFORM — system diagram */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#0C0C0C]/12">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5">The system</p>
          <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em] mb-14 max-w-3xl">
            One team, <em className="font-display-italic italic font-medium text-[#E85D26]">one system.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12 max-w-4xl">
            {PLATFORM_FEATURES.map((f, i) => (
              <div key={f.title} className="flex gap-5">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] mt-1 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-display-serif text-[24px] md:text-[28px] tracking-[-0.015em] mb-3 leading-[1.05]">{f.title}</h3>
                  <p className="font-body text-[15px] text-[#0C0C0C]/70 leading-[1.6]">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 13. PILLARS */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#0C0C0C]/12">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5">The standard</p>
          <h2 className="font-display-serif text-[44px] md:text-[80px] leading-[0.92] tracking-[-0.025em] mb-14 max-w-3xl">
            For brands that <em className="font-display-italic italic font-medium text-[#E85D26]">refuse to compromise.</em>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-[#0C0C0C]/12">
            {PILLARS.map((p, i) => (
              <div key={p.title} className="border-r border-b border-[#0C0C0C]/12 p-6 md:p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26] mb-3">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="font-display-serif text-[24px] tracking-[-0.015em] mb-3">{p.title}</h3>
                <p className="font-body text-[13.5px] text-[#0C0C0C]/70 leading-[1.55]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 14. TALENT */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#0C0C0C]/12">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5">The team</p>
            <h2 className="font-display-serif text-[40px] md:text-[80px] leading-[0.93] tracking-[-0.025em]">
              Senior craft. <em className="font-display-italic italic font-medium text-[#E85D26]">No middle layer.</em>
            </h2>
            <p className="font-body text-[16.5px] text-[#0C0C0C]/75 mt-7 max-w-xl leading-[1.65]">
              Designers, directors, editors, strategists, writers. The person who shoots is the person who edits is the person you talk to.
            </p>
          </div>
          <div className="lg:col-span-5 order-1 lg:order-2 relative aspect-[4/5] overflow-hidden border border-[#0C0C0C]/12 bg-black">
            <LazyGumlet id="698a6177873071aec5ca4374" />
          </div>
        </div>
      </section>

      {/* 15. EMPATHY / CTA */}
      <section className="py-24 md:py-32 px-6 md:px-12 border-b border-[#0C0C0C]/12 bg-[#0C0C0C] text-[#FDF6EC]">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-5">For in-house teams</p>
            <h2 className="font-display-serif text-[40px] md:text-[80px] leading-[0.93] tracking-[-0.025em]">
              Your team deserves <em className="font-display-italic italic font-medium text-[#E85D26]">a partner</em>, not another tool.
            </h2>
            <p className="font-body text-[16.5px] text-[#FDF6EC]/80 mt-7 max-w-xl leading-[1.65]">
 In-house creative teams ship the most when they have a partner to send the spillover to. We're built to be that partner, flexible, fast, and on-brand from day one.
            </p>
            <button onClick={() => openBrief?.()}
              className="mt-9 bg-[#E85D26] text-[#0C0C0C] font-body font-semibold text-[14px] px-7 py-3.5 rounded-full hover:bg-[#FF6B2C] transition-colors flex items-center gap-2">
              Start a project <ArrowRight size={15} />
            </button>
          </div>
          <div className="lg:col-span-5 relative aspect-[4/5] overflow-hidden bg-black border border-[#FDF6EC]/15">
            <LazyGumlet id="698a64e5873071aec5ca99ac" />
          </div>
        </div>
      </section>

      {/* 16. FOOTER CTA */}
      <section className="py-32 md:py-44 px-6 md:px-12 text-center">
        <div className="max-w-[1440px] mx-auto">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-[#E85D26] mb-7">
            Volume 010 · Ends here
          </p>
          <h2 className="font-display-serif text-[60px] md:text-[160px] leading-[0.85] tracking-[-0.03em]">
            Make <em className="font-display-italic italic font-medium text-[#E85D26]">something.</em>
          </h2>
          <button onClick={() => openBrief?.()}
            className="mt-12 bg-[#0C0C0C] text-[#FDF6EC] font-body font-semibold text-[15px] px-8 py-4 rounded-full hover:bg-[#E85D26] hover:text-[#0C0C0C] transition-colors inline-flex items-center gap-2">
            Start a project <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}