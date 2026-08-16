import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Menu, Play, Radar } from 'lucide-react';

const OPTIONS = [
  { id: 'editorial', short: 'A', label: 'Editorial field report' },
  { id: 'operations', short: 'B', label: 'Monthly operations board' },
  { id: 'cinematic', short: 'C', label: 'Cinematic story rail' },
];

const MONTH = [
  { n: '01', phase: 'Decide', detail: 'One-page plan and priorities.' },
  { n: '02', phase: 'Capture', detail: 'Photos, drone, and video on your jobs.' },
  { n: '03', phase: 'Ship', detail: 'Site updates, edits, and ads go live.' },
  { n: '04', phase: 'Run', detail: 'Tune, answer, report, repeat.' },
];

const PROMISES = [
  ['A plan you can read', 'The next 90 days fit on one page.'],
  ['Work ships all month', 'Nothing waits for a monthly reveal.'],
  ['A person calls back', 'The same small team owns the work.'],
  ['Everything stays yours', 'Files, site, domain, and ad account.'],
];

function ReviewBar({ active, onChange }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[500] h-14 bg-[#0A0A08] text-[#F5F3EE] border-b border-white/10 flex items-center px-3 md:px-5 gap-2 font-hanken">
      <div className="hidden md:flex items-center gap-3 pr-4 mr-1 border-r border-white/15">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Homepage studies</span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto min-w-0">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`shrink-0 h-9 rounded-full px-3 md:px-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
              active === option.id ? 'bg-[#F04404] text-[#0A0A08]' : 'text-white/55 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="font-semibold">{option.short}</span>
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        ))}
      </div>
      <a href="/" className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50 hover:text-white no-underline px-2">
        Live site ↗
      </a>
    </div>
  );
}

function EditorialOption() {
  return (
    <main className="pt-14 bg-[#EEEAE1] text-[#171714] min-h-screen font-hanken">
      <header className="h-[72px] px-5 md:px-10 flex items-center justify-between border-b border-black/15">
        <span className="font-mono text-[14px] font-semibold uppercase tracking-[0.24em]">Ahead of Market</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">Field report · Phoenix, Arizona</span>
      </header>

      <section className="min-h-[calc(100vh-126px)] grid grid-cols-1 lg:grid-cols-12 border-b border-black/15">
        <aside className="hidden lg:flex lg:col-span-1 border-r border-black/15 p-5 flex-col justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] [writing-mode:vertical-rl] rotate-180">Issue 01 · The monthly system</span>
          <span className="font-mono text-[10px] text-black/35">2014—26</span>
        </aside>
        <div className="lg:col-span-6 px-6 md:px-10 lg:px-12 py-12 md:py-16 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#A13A14]">A department, documented</p>
            <h1 className="font-display-serif text-[48px] sm:text-[68px] lg:text-[82px] leading-[0.91] tracking-[-0.045em] mt-7 max-w-[9ch]">
              Marketing moves when someone owns the whole month.
            </h1>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-black/15 pt-6">
            <p className="text-[17px] leading-[1.55] max-w-[34ch]">We plan it, film it, build it, run it, and show you what happened. Then the next month starts smarter.</p>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/40">The promise</p>
              <p className="font-display-serif italic text-[24px] leading-tight mt-2">No mystery. No disappearing act. Everything stays yours.</p>
              <a href="#editorial-system" className="inline-flex items-center gap-2 mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#A13A14] no-underline border-b border-[#A13A14] pb-1">Read the system <ArrowRight size={13} /></a>
            </div>
          </div>
        </div>
        <figure className="lg:col-span-5 relative min-h-[520px] lg:min-h-0 overflow-hidden bg-black">
          <img src="/aom-kit/img/ambition-crew.jpg" alt="Ambition Mechanical crew at work" className="absolute inset-0 w-full h-full object-cover grayscale" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
          <figcaption className="absolute bottom-0 inset-x-0 p-6 md:p-8 text-white">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Evidence 01</p>
            <p className="font-display-serif text-[28px] leading-tight mt-2">46 shoots on one client’s real jobs in one year.</p>
          </figcaption>
        </figure>
      </section>

      <section id="editorial-system" className="grid grid-cols-1 lg:grid-cols-12 border-b border-black/15">
        <div className="lg:col-span-4 p-6 md:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-black/15">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#A13A14]">The running order</p>
          <h2 className="font-display-serif text-[48px] md:text-[64px] leading-[0.92] tracking-[-0.04em] mt-5">Four moves. Every month.</h2>
          <p className="text-[16px] leading-[1.6] text-black/60 mt-7 max-w-[34ch]">A simple rhythm keeps the work visible without turning your company into a marketing meeting.</p>
        </div>
        <div className="lg:col-span-8">
          {MONTH.map((step) => (
            <div key={step.n} className="grid grid-cols-12 gap-4 px-6 md:px-10 py-7 md:py-9 border-t border-black/15 first:border-t-0 items-baseline">
              <span className="col-span-2 font-mono text-[11px] text-[#A13A14]">{step.n}</span>
              <span className="col-span-5 font-display-serif text-[30px] md:text-[40px] leading-none">{step.phase}</span>
              <span className="col-span-5 text-[14px] md:text-[16px] text-black/55 leading-snug">{step.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-10 lg:px-12 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <p className="font-display-serif text-[34px] md:text-[52px] leading-[1.08] max-w-[18ch]">“The phone started ringing, but the bigger change was that the company finally looked like the work.”</p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 gap-px bg-black/15 border border-black/15">
            {PROMISES.map(([title, detail], index) => (
              <div key={title} className="bg-[#EEEAE1] p-5 md:p-7 min-h-[180px]">
                <p className="font-mono text-[10px] text-[#A13A14]">0{index + 1}</p>
                <p className="font-display-serif text-[24px] leading-tight mt-6">{title}</p>
                <p className="text-[13px] text-black/50 mt-3 leading-snug">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function OperationsOption() {
  return (
    <main className="pt-14 bg-[#090A08] text-[#F1F0E9] min-h-screen font-hanken">
      <header className="h-[72px] px-5 md:px-8 flex items-center gap-5 border-b border-white/10 bg-[#10110E]">
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.22em]">AOM / OPS</span>
        <span className="hidden md:inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35"><span className="w-1.5 h-1.5 rounded-full bg-[#F04404] animate-pulse" /> Monthly system active</span>
        <button className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] border border-white/15 rounded-full px-4 py-2 text-white/70">Start a conversation</button>
      </header>

      <section className="min-h-[calc(100vh-126px)] grid grid-cols-1 xl:grid-cols-12">
        <div className="xl:col-span-7 p-5 md:p-8 lg:p-10 border-b xl:border-b-0 xl:border-r border-white/10">
          <div className="flex items-center justify-between gap-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F04404]">Your marketing department</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">Cycle 08 / Phoenix</p>
          </div>
          <h1 className="font-anton uppercase text-[48px] sm:text-[70px] lg:text-[88px] leading-[0.9] tracking-[-0.02em] mt-8 max-w-[10ch]">See the whole month moving.</h1>
          <p className="text-[16px] md:text-[18px] text-white/55 leading-[1.6] max-w-[54ch] mt-7">One small team owns the plan, the shoot, the site, the ads, the reviews, and the report. Nothing hides in a deck.</p>

          <div className="mt-10 border border-white/12 bg-[#11120F]">
            <div className="grid grid-cols-4 border-b border-white/10">
              {['Plan', 'Capture', 'Ship', 'Run'].map((label, index) => (
                <div key={label} className={`px-3 md:px-5 py-4 ${index > 0 ? 'border-l border-white/10' : ''}`}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">0{index + 1}</p>
                  <p className="font-anton uppercase text-[18px] md:text-[24px] mt-2">{label}</p>
                </div>
              ))}
            </div>
            <div className="h-2 grid grid-cols-12 gap-1 p-1 bg-black/30">
              {Array.from({ length: 12 }).map((_, i) => <span key={i} className={`${i < 9 ? 'bg-[#F04404]' : 'bg-white/10'}`} />)}
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 bg-[#0D0E0B] p-5 md:p-8 lg:p-10 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">This month</p>
            <Radar size={18} className="text-[#F04404]" />
          </div>
          <div className="mt-7 space-y-3 flex-1">
            {[
              ['Plan approved', '90-day priorities locked', 'Done'],
              ['Job-site shoot', 'Thursday · Phoenix', 'Next'],
              ['Website updates', '3 pages shipping', 'Active'],
              ['Ads + reviews', 'Tuned every week', 'Running'],
            ].map(([title, detail, status], index) => (
              <div key={title} className="border border-white/10 bg-[#151612] p-5 flex gap-4 items-start">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${index === 0 ? 'bg-white/35' : 'bg-[#F04404]'}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-anton uppercase text-[20px] leading-none">{title}</p>
                  <p className="text-[13px] text-white/40 mt-2">{detail}</p>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">{status}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 bg-[#F04404] text-[#0A0A08] p-5 flex items-center justify-between gap-5">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-55">Month-end output</p>
              <p className="font-anton uppercase text-[26px] leading-none mt-2">One page. What ran. What’s next.</p>
            </div>
            <ArrowRight size={22} />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5 relative min-h-[430px] overflow-hidden">
          <img src="/aom-kit/img/welder.png" alt="Welder working on a structural beam" className="absolute inset-0 w-full h-full object-cover grayscale" />
          <div className="absolute inset-0 bg-[#F04404]/20 mix-blend-color" />
          <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black to-transparent">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Captured on the work</p>
            <p className="font-anton uppercase text-[34px] leading-none mt-2">No stock. No staged set.</p>
          </div>
        </div>
        <div className="lg:col-span-7 p-6 md:p-10 lg:p-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F04404]">Service-level promises</p>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10">
            {PROMISES.map(([title, detail]) => (
              <div key={title} className="bg-[#10110E] p-6 min-h-[160px]">
                <Check size={16} className="text-[#F04404]" />
                <p className="font-anton uppercase text-[24px] leading-none mt-7">{title}</p>
                <p className="text-[13px] text-white/40 leading-snug mt-3">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function CinematicOption() {
  return (
    <main className="pt-14 bg-[#080808] text-white min-h-screen font-hanken">
      <section className="relative min-h-[calc(100vh-56px)] overflow-hidden flex flex-col">
        <img src="/aom-kit/img/jobsite.png" alt="Construction crew framing a roof" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
        <header className="relative z-10 h-[78px] px-6 md:px-10 flex items-center justify-between border-b border-white/15">
          <span className="font-mono text-[14px] font-semibold uppercase tracking-[0.24em]">Ahead of Market</span>
          <div className="hidden md:flex gap-8 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60"><span>The system</span><span>The work</span><span>The promise</span></div>
          <Menu size={20} className="md:hidden" />
        </header>
        <div className="relative z-10 flex-1 px-6 md:px-10 lg:px-14 py-14 md:py-20 flex flex-col justify-end">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#FF6A32]">A monthly marketing system</p>
          <h1 className="font-anton uppercase text-[15vw] sm:text-[86px] lg:text-[118px] leading-[0.83] tracking-[-0.025em] mt-6 max-w-[8ch]">Show up. Make it. Move it.</h1>
          <div className="mt-9 flex flex-col md:flex-row md:items-end gap-7 md:gap-12">
            <p className="text-[16px] md:text-[18px] leading-[1.55] text-white/70 max-w-[46ch]">We turn the work already happening inside your company into a month of marketing people can see.</p>
            <button className="shrink-0 self-start inline-flex items-center gap-3 rounded-full bg-[#F04404] text-black px-7 py-4 font-mono text-[10px] uppercase tracking-[0.2em]">Watch how the month moves <Play size={13} className="fill-current" /></button>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-4 border-t border-white/15 bg-black/40 backdrop-blur-sm">
          {MONTH.map((step, index) => (
            <div key={step.n} className={`px-3 md:px-6 py-4 md:py-5 ${index > 0 ? 'border-l border-white/15' : ''}`}>
              <p className="font-mono text-[9px] text-[#FF6A32]">{step.n}</p>
              <p className="font-anton uppercase text-[16px] md:text-[24px] leading-none mt-2">{step.phase}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        <div className="p-6 md:p-12 lg:p-16 flex flex-col justify-center bg-[#F04404] text-[#0A0A08]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-55">Chapter one · The plan</p>
          <p className="font-anton uppercase text-[66px] md:text-[96px] lg:text-[116px] leading-[0.82] mt-8">Know what happens next.</p>
          <p className="text-[17px] leading-[1.55] max-w-[34ch] mt-10 opacity-70">The next 90 days fit on one page. The priorities are clear. The plan changes when the business does.</p>
        </div>
        <div className="relative min-h-[620px] lg:min-h-0 overflow-hidden">
          <img src="/aom-kit/img/owner1.png" alt="Business owner in a workshop" className="absolute inset-0 w-full h-full object-cover grayscale" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
          <p className="absolute bottom-8 left-8 right-8 font-display-serif italic text-[28px] md:text-[40px] leading-tight">“A plan you can actually read, held by the people doing the work.”</p>
        </div>
      </section>

      <section className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#ECE8DE] text-[#0A0A08]">
        <div className="lg:col-span-7 relative min-h-[620px] lg:min-h-0 overflow-hidden">
          <img src="/aom-kit/img/ambition-crew.jpg" alt="Ambition Mechanical crew on a job" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/25" />
          <div className="absolute top-8 left-8 bg-[#F04404] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em]">46 shoots · one year</div>
        </div>
        <div className="lg:col-span-5 p-6 md:p-12 lg:p-14 flex flex-col justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#A13A14]">Chapter two · The proof</p>
            <h2 className="font-anton uppercase text-[58px] md:text-[78px] leading-[0.86] mt-8">Real work becomes visible work.</h2>
          </div>
          <div className="mt-14 space-y-0 border-y border-black/15">
            {PROMISES.map(([title], index) => (
              <div key={title} className="flex items-center gap-5 py-5 border-t border-black/15 first:border-t-0">
                <span className="font-mono text-[10px] text-[#A13A14]">0{index + 1}</span>
                <span className="font-display-serif text-[22px] md:text-[26px]">{title}</span>
              </div>
            ))}
          </div>
          <button className="mt-12 self-start inline-flex items-center gap-3 rounded-full bg-black text-white px-7 py-4 font-mono text-[10px] uppercase tracking-[0.2em]">Tell us what you need <ArrowRight size={14} /></button>
        </div>
      </section>
    </main>
  );
}

export default function HomeLayoutOptions() {
  const initial = typeof window !== 'undefined' && OPTIONS.some((option) => option.id === window.location.hash.slice(1))
    ? window.location.hash.slice(1)
    : 'editorial';
  const [active, setActive] = useState(initial);

  useEffect(() => {
    const onHash = () => {
      const next = window.location.hash.slice(1);
      if (OPTIONS.some((option) => option.id === next)) setActive(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const choose = (id) => {
    setActive(id);
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <>
      <ReviewBar active={active} onChange={choose} />
      {active === 'editorial' && <EditorialOption />}
      {active === 'operations' && <OperationsOption />}
      {active === 'cinematic' && <CinematicOption />}
    </>
  );
}
