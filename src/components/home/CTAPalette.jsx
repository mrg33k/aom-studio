import React from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

/**
 * CTAPalette
 * Temporary design-lab section. Shows 8 CTA button variants side-by-side so
 * Patrik can pick the strongest one. Once chosen, the winner gets wired into
 * a shared <CTAButton> and replaces all current Start/Send/Book buttons.
 *
 * Drop in after the hero, remove once a winner is picked.
 */

const VARIANTS = [
  {
    id: '01',
    name: 'Orange pill · Body',
    note: 'Current. Body Grotesk semibold on orange. Pill.',
    Render: () => (
      <button className="bg-[#E85D26] text-[#0C0C0C] font-body font-semibold text-[14px] px-7 py-3.5 rounded-full hover:bg-[#FF6B2C] transition-colors inline-flex items-center gap-2">
        Start a project <ArrowRight size={15} />
      </button>
    ),
  },
  {
    id: '02',
    name: 'Orange pill · Syne',
    note: 'Same shape, headline font (Syne 800). Reads premium.',
    Render: () => (
      <button className="bg-[#E85D26] text-[#0C0C0C] font-headline text-[16px] tracking-[-0.005em] px-7 py-3.5 rounded-full hover:bg-[#FF6B2C] transition-colors inline-flex items-center gap-2">
        Start a project <ArrowRight size={16} />
      </button>
    ),
  },
  {
    id: '03',
    name: 'Mono caps · Label',
    note: 'Letterspaced mono uppercase. Industrial / labeled-machine energy.',
    Render: () => (
      <button className="bg-[#E85D26] text-[#0C0C0C] font-mono text-[11px] uppercase tracking-[0.28em] font-bold px-7 py-4 rounded-full hover:bg-[#FF6B2C] transition-colors inline-flex items-center gap-3">
        Start a project <ArrowRight size={14} />
      </button>
    ),
  },
  {
    id: '04',
    name: 'Cream pill · Dark text',
    note: 'Cream background, black text, orange arrow. High contrast, warm.',
    Render: () => (
      <button className="bg-[#FDF6EC] text-[#0C0C0C] font-body font-semibold text-[14px] px-7 py-3.5 rounded-full hover:bg-white transition-colors inline-flex items-center gap-2">
        Start a project <ArrowRight size={15} className="text-[#E85D26]" />
      </button>
    ),
  },
  {
    id: '05',
    name: 'Outlined orange',
    note: 'Transparent bg, orange border + text. Hover fills. Restrained.',
    Render: () => (
      <button className="bg-transparent text-[#E85D26] border-2 border-[#E85D26] font-body font-semibold text-[14px] px-7 py-3 rounded-full hover:bg-[#E85D26] hover:text-[#0C0C0C] transition-colors inline-flex items-center gap-2">
        Start a project <ArrowRight size={15} />
      </button>
    ),
  },
  {
    id: '06',
    name: 'Dark pill · Orange arrow circle',
    note: 'Black pill, white text, orange circular arrow on the right edge. Two-piece visual.',
    Render: () => (
      <button className="group bg-[#0C0C0C] text-[#FDF6EC] border border-white/15 hover:border-[#E85D26]/60 font-body font-semibold text-[14px] pl-6 pr-2 py-2 rounded-full transition-colors inline-flex items-center gap-4">
        Start a project
        <span className="w-9 h-9 rounded-full bg-[#E85D26] flex items-center justify-center text-[#0C0C0C] group-hover:bg-[#FF6B2C] transition-colors">
          <ArrowRight size={15} />
        </span>
      </button>
    ),
  },
  {
    id: '07',
    name: 'Sharp block · Syne',
    note: 'Square corners, Syne, orange. Editorial / brutalist.',
    Render: () => (
      <button className="bg-[#E85D26] text-[#0C0C0C] font-headline text-[15px] tracking-[-0.005em] px-7 py-4 hover:bg-[#FF6B2C] transition-colors inline-flex items-center gap-3">
        Start a project <ArrowRight size={16} />
      </button>
    ),
  },
  {
    id: '08',
    name: 'Editorial link · Big Syne',
    note: 'No bg, no border. Large Syne text, underline, orange arrow. NYT energy.',
    Render: () => (
      <button className="bg-transparent text-[#F0ECE6] font-headline text-[28px] md:text-[36px] leading-none tracking-[-0.02em] inline-flex items-baseline gap-3 border-b-2 border-[#E85D26] pb-2 hover:text-[#E85D26] transition-colors">
        Start a project <ArrowUpRight size={22} className="text-[#E85D26] self-center" />
      </button>
    ),
  },
  {
    id: '09',
    name: 'Split two-tone',
    note: 'Black left half (label) + orange right half (arrow). Asymmetric.',
    Render: () => (
      <button className="inline-flex items-stretch border border-[#E85D26]/60 rounded-full overflow-hidden hover:border-[#E85D26] transition-colors">
        <span className="bg-[#0C0C0C] text-[#FDF6EC] font-body font-semibold text-[14px] pl-6 pr-5 py-3.5 inline-flex items-center">Start a project</span>
        <span className="bg-[#E85D26] text-[#0C0C0C] px-4 inline-flex items-center">
          <ArrowRight size={16} />
        </span>
      </button>
    ),
  },
  {
    id: '10',
    name: 'Orange · White text',
    note: 'Orange bg with WHITE text instead of black. Often more legible.',
    Render: () => (
      <button className="bg-[#E85D26] text-white font-body font-semibold text-[14px] px-7 py-3.5 rounded-full hover:bg-[#FF6B2C] transition-colors inline-flex items-center gap-2">
        Start a project <ArrowRight size={15} />
      </button>
    ),
  },
];

export default function CTAPalette() {
  return (
    <section className="border-y border-[#E85D26]/30 py-14 md:py-16 px-6 md:px-12 bg-[#0a0a0a]">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-baseline justify-between gap-6 flex-wrap mb-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#E85D26] mb-3">Design lab · CTA palette</p>
            <h2 className="font-headline text-[28px] md:text-[40px] leading-[1.0] tracking-[-0.02em] text-[#F0ECE6]">
              Pick a button.
            </h2>
          </div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 max-w-md">
            Tell me a number. I'll wire it into every Start / Send / Book CTA on the site.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {VARIANTS.map(({ id, name, note, Render }) => (
            <div key={id} className="border border-white/[0.08] rounded-2xl p-6 bg-white/[0.02] hover:border-[#E85D26]/40 transition-colors flex flex-col gap-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#E85D26]">{id}</span>
                <p className="font-headline text-[16px] tracking-[-0.01em] text-[#F0ECE6]">{name}</p>
              </div>
              <div className="flex-1 flex items-center justify-center py-4 min-h-[110px]">
                <Render />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/55 leading-[1.55]">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
