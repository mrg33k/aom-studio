// Conrad Foundation · Mission Water — Scope of Work / what we're offering
// The page behind "Let's talk" on /platform. Three priced pieces (Game $15K,
// Platform $12K, Marketing $10K), each with 5 plain-language deliverables and
// add-on options. A managed ad budget is a separate optional add-on package at
// the end. Conrad editorial system (navy/orange).
// /missionwateroffering · /mission-water-offering · /missionwater/offering
// Mission: conrad-foundation:mission-water
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── SEO ──────────────────────────────────────────────────────────────────────
function useSEO() {
  useEffect(() => {
    document.title = 'Mission Water | Scope & Investment';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Mission Water, three pieces (Game, Platform, Marketing) with plain deliverables, pricing, and add-ons.');
    setMeta('robots', 'noindex, nofollow');
  }, []);
}

// ─── Motion ───────────────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const STARFIELD = `
  radial-gradient(1.5px 1.5px at 12% 22%, rgba(255,255,255,0.55), transparent),
  radial-gradient(1px 1px at 28% 64%, rgba(255,255,255,0.38), transparent),
  radial-gradient(1px 1px at 47% 31%, rgba(255,255,255,0.42), transparent),
  radial-gradient(1.5px 1.5px at 66% 16%, rgba(255,255,255,0.5), transparent),
  radial-gradient(1px 1px at 78% 52%, rgba(255,255,255,0.32), transparent),
  radial-gradient(1px 1px at 88% 26%, rgba(255,255,255,0.42), transparent),
  radial-gradient(1px 1px at 36% 82%, rgba(255,255,255,0.3), transparent),
  radial-gradient(1.5px 1.5px at 58% 74%, rgba(255,255,255,0.36), transparent),
  radial-gradient(1px 1px at 8% 50%, rgba(255,255,255,0.3), transparent),
  radial-gradient(1px 1px at 92% 70%, rgba(255,255,255,0.3), transparent)
`;

function ConradNav() {
  return (
    <nav className="w-full bg-white border-b border-[#071530]/[0.08] px-6 md:px-12 py-4 sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between">
        <a href="/platform" className="flex items-center gap-3 group">
          <div className="w-7 h-7 rounded-full bg-[#071530] flex items-center justify-center">
            <span className="font-mono text-[8px] text-white uppercase tracking-widest">CF</span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#071530] font-semibold">
            Conrad<span className="font-normal">Foundation</span>
          </span>
        </a>
        <div className="flex items-center gap-6">
          <a href="/platform" className="hidden sm:inline font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#071530]/50 hover:text-[#E85D26] transition-colors">
            &larr; The platform
          </a>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#071530]/40">
            Scope &amp; investment · Private
          </span>
        </div>
      </div>
    </nav>
  );
}

function Kicker({ children, className = '' }) {
  return (
    <p className={`font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26] ${className}`}>
      {children}
    </p>
  );
}

// ─── Cost allocation bar ───────────────────────────────────────────────────────
function AllocationBar({ cost, total, visible }) {
  const pct = Math.round((cost / total) * 100);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="mt-2 mb-0.5">
            <div className="h-[3px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(7,21,48,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: '#E85D26' }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#071530]/35 mt-1">{pct}% of piece total</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── The three pieces ───────────────────────────────────────────────────────────
// Cost allocation reasoning:
//   Game ($15K):      $6,500 game engine/branching · $3,000 NASA visuals+HUD · $1,800 characters+badges · $2,200 Blippy mascot · $1,500 hosting+updates
//   Platform ($12K):  $3,500 live broadcast+roster · $1,800 archive+search · $3,000 self-paced modules · $2,200 submissions+grading · $1,500 dashboards
//   Marketing ($10K): $2,000 brand system · $2,200 landing pages+SEO · $1,800 launch creative+assets · $2,500 sizzle video · $1,500 email+calendar

const PILLARS = [
  {
    n: '01',
    name: 'The Game',
    price: '$15,000',
    priceNum: 15000,
    tagline: 'The interactive experience',
    summary:
      'The story-driven, branching water-science game students play start to finish. Live today and built to grow.',
    deliverables: [
 'Preproduction, Story outline, character design, science consultant alignment',
 'Development, Branching narrative engine, NASA visual system, interactive mechanics',
 'Editing & Polish, Animation refinement, difficulty balancing, audio/visual quality assurance',
 'Testing & Launch, Full QA cycle, teacher onboarding materials, live hosting setup',
 'Ongoing Support, Mobile/desktop optimization, performance monitoring, feature updates',
    ],
    costs: [6500, 3000, 1800, 2200, 1500],
    addons: [
      { label: 'Additional story chapters', price: '$4,500' },
      { label: 'Classroom / multiplayer mode', price: '$3,200' },
      { label: 'Localization / translation', price: '$2,200' },
    ],
  },
  {
    n: '02',
    name: 'The Platform',
    price: '$12,000',
    priceNum: 12000,
    tagline: 'The masterclass, online',
    summary:
 'Everything around the game that turns it into a real program, live classes, an archive, coursework, and dashboards. One window, everything inside.',
    deliverables: [
 'Preproduction, Architecture design, database schema, user flow mapping',
 'Development, Student portal, live broadcast system, educator dashboard',
 'Content & Archive, Self-paced modules, searchable session archive, progress tracking',
 'Testing & Deployment, Security audit, full QA cycle, production deployment',
 'Ongoing Support, Parent/educator dashboards, grading tools, submission tracking',
    ],
    costs: [3500, 1800, 3000, 2200, 1500],
    addons: [
      { label: 'Completion certificates', price: '$800' },
      { label: 'Payments / paid enrollment', price: '$2,500' },
      { label: 'LMS integration (Google Classroom, Canvas)', price: '$1,800' },
    ],
  },
  {
    n: '03',
    name: 'The Marketing',
    price: '$10,000',
    priceNum: 10000,
    tagline: 'Go-to-market for all of it',
    summary:
      'The brand, the story, and the campaign that gets Mission Water in front of students, schools, and funders.',
    deliverables: [
 'Preproduction, Brand audit, audience research, messaging framework',
 'Strategy & Planning, Campaign planning, content calendar, SEO strategy',
 'Creative Development, Video production, landing pages, ad-ready assets',
 'Testing & Launch, Campaign optimization, A/B testing, launch coordination',
 'Ongoing Promotion, Email sequences, social content, funder one-pager, grant deck',
    ],
    costs: [2000, 2200, 1800, 2500, 1500],
    addons: [
      { label: 'Ongoing monthly social management', price: '$2,000/mo' },
      { label: 'Funder + district one-pager', price: '$1,200' },
      { label: 'Sponsor / grant deck', price: '$2,500' },
    ],
  },
];

// ─── Format dollar amount ──────────────────────────────────────────────────────
function fmt(n) {
  return '$' + n.toLocaleString('en-US');
}

export default function MissionWaterOffering() {
  useSEO();
  const [activeAddon, setActiveAddon] = useState(null); // 'pi-ai' format
  const [showCosts, setShowCosts] = useState(false);

  return (
    <div className="bg-white text-[#071530] min-h-screen scroll-smooth" style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}>

      <ConradNav />

      {/* ─── Hero (intro only, no numbers) ────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 md:px-12 pt-20 md:pt-28 pb-16 md:pb-20"
        style={{ background: 'radial-gradient(125% 85% at 50% -8%, #143b6e 0%, #0D2045 40%, #071530 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: STARFIELD }} />
        <div className="absolute -right-[18%] -top-[42%] w-[720px] h-[720px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(232,93,38,0.16)' }} />
        <div className="absolute -right-[8%] -top-[28%] w-[460px] h-[460px] rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,0.06)' }} />

        <div className="max-w-[1280px] mx-auto relative">
          <motion.div {...fadeUp()}>
            <div className="flex items-center gap-3 mb-7">
              <Kicker>Mission Water · Scope &amp; Investment</Kicker>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">Confidential</span>
            </div>
            <h1 className="font-display-serif text-[44px] md:text-[78px] lg:text-[92px] leading-[0.94] tracking-[-0.035em] max-w-[1000px] mb-7 text-white">
              Three pieces.<br />
              <em className="font-display-italic italic font-medium text-[#E85D26]">Build what you need.</em>
            </h1>
            <p className="font-body text-[17px] md:text-[20px] leading-[1.55] max-w-[640px] text-white/65 mb-10">
              Mission Water is delivered in three independent, complete pieces — the Game, the Platform, and the Marketing. Pick one, two, or the full program, and tailor the deliverables as you go.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a href="#pieces" className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-white font-mono text-[10.5px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-full transition-colors">
                See the deliverables &darr;
              </a>
              <a href="/platform" className="inline-flex items-center gap-2 border border-white/25 hover:border-white/60 text-white/85 font-mono text-[10.5px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-full transition-colors">
                &larr; Back to the platform
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── The three pieces ─────────────────────────────────────────────────── */}
      <section id="pieces" className="bg-white px-6 md:px-12 py-16 md:py-24 scroll-mt-20">
        <div className="max-w-[1200px] mx-auto">
          <motion.div className="mb-12" {...fadeUp()}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <Kicker className="mb-3">What you get</Kicker>
                <h2 className="font-display-serif text-[32px] md:text-[50px] leading-[1.0] tracking-[-0.025em] text-[#071530]">
                  Every piece, in plain terms.
                </h2>
                <p className="font-body text-[16px] text-[#071530]/55 leading-[1.6] max-w-[600px] mt-4">
                  No vague line items. Here is exactly what each piece delivers — and what you can add or swap as you go.
                </p>
              </div>
              {/* Cost toggle */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => setShowCosts(v => !v)}
                  className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.18em] px-5 py-2.5 rounded-full transition-all duration-250 cursor-pointer"
                  style={{
                    border: showCosts ? '1px solid rgba(232,93,38,0.55)' : '1px solid rgba(7,21,48,0.18)',
                    color: showCosts ? '#E85D26' : 'rgba(7,21,48,0.55)',
                    background: showCosts ? 'rgba(232,93,38,0.06)' : 'transparent',
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      borderColor: showCosts ? '#E85D26' : 'rgba(7,21,48,0.35)',
                      background: showCosts ? '#E85D26' : 'transparent',
                    }}
                  >
                    {showCosts && (
                      <svg width="6" height="5" viewBox="0 0 6 5" fill="none">
                        <path d="M1 2.5L2.5 4L5 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  {showCosts ? 'Cost breakdown on' : 'Show cost breakdown'}
                </button>
                {showCosts && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-[#071530]/35 mt-2 text-right"
                  >
                    Per-deliverable allocation
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>

          <div className="space-y-7">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.n}
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(7,21,48,0.10)', boxShadow: '0 1px 0 rgba(7,21,48,0.04)' }}
                {...fadeUp(0.05 + i * 0.05)}
              >
                <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
                  {/* Left — identity */}
                  <div className="p-8 md:p-10 flex flex-col" style={{ background: 'linear-gradient(160deg, #071530 0%, #0D2045 100%)' }}>
                    <h3 className="font-display-serif text-[30px] md:text-[36px] leading-[1.0] tracking-[-0.02em] text-white mb-1">{p.name}</h3>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/45 mb-6">{p.tagline}</p>
                    <p className="font-body text-[14px] text-white/60 leading-[1.6]">{p.summary}</p>

                    {/* Total cost pill inside the dark panel */}
                    <AnimatePresence>
                      {showCosts && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                          className="mt-auto pt-6"
                        >
                          <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(232,93,38,0.12)', border: '1px solid rgba(232,93,38,0.25)' }}>
                            <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/45 mb-1">Piece total</p>
                            <p className="font-display-serif text-[28px] text-[#E85D26] tracking-[-0.02em] leading-none">{p.price}</p>
                            <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35 mt-1">Split across 5 deliverables</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right — deliverables + add-ons + price (bottom right) */}
                  <div className="p-8 md:p-10 bg-[#F4F2EF] flex flex-col">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#071530]/45 mb-5">What she gets</p>
                    <ul className="space-y-3.5 mb-8">
                      {p.deliverables.map((d, di) => {
                        const cost = p.costs[di];
                        const total = p.priceNum;
                        return (
                          <li key={di}>
                            <div className="flex gap-3 items-start">
                              <span className="text-[#E85D26] font-mono text-[13px] leading-[1.4] shrink-0 mt-[1px]">▸</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                                  <span className="font-body text-[15px] text-[#071530]/80 leading-[1.5]">{d}</span>
                                  <AnimatePresence>
                                    {showCosts && (
                                      <motion.span
                                        initial={{ opacity: 0, x: 6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 4 }}
                                        transition={{ duration: 0.25, delay: 0.05 + di * 0.04, ease: [0.22, 1, 0.36, 1] }}
                                        className="font-mono text-[11px] tracking-[0.08em] whitespace-nowrap flex-shrink-0"
                                        style={{ color: '#E85D26' }}
                                      >
                                        {fmt(cost)}
                                      </motion.span>
                                    )}
                                  </AnimatePresence>
                                </div>
                                <AllocationBar cost={cost} total={total} visible={showCosts} />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <AnimatePresence>
                      {showCosts && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.3, delay: 0.2 + p.deliverables.length * 0.04, ease: [0.22, 1, 0.36, 1] }}
                          className="flex items-center justify-between mb-7 pt-4 border-t border-[#071530]/10"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#071530]/30">
                              {p.deliverables.length} deliverables
                            </span>
 <span className="font-mono text-[8px] text-[#071530]/20">·</span>
                            <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#071530]/30">adds up to</span>
                          </div>
                          <span className="font-mono text-[10px] tracking-[0.06em]" style={{ color: 'rgba(7,21,48,0.50)' }}>
                            {p.price}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
 <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#071530]/45 mb-3">Add-ons &amp; options <span className="text-[#071530]/30 normal-case tracking-normal font-body" style={{ fontSize: '9px' }}>, tap to see pricing</span></p>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {p.addons.map((a, ai) => {
                        const key = `${i}-${ai}`;
                        const open = activeAddon === key;
                        return (
                          <button
                            key={ai}
                            onClick={() => setActiveAddon(open ? null : key)}
                            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] rounded-full px-3 py-1.5 transition-all duration-200 cursor-pointer"
                            style={{
                              border: open ? '1px solid rgba(232,93,38,0.55)' : '1px solid rgba(7,21,48,0.15)',
                              color: open ? '#E85D26' : 'rgba(7,21,48,0.60)',
                              background: open ? 'rgba(232,93,38,0.06)' : 'transparent',
                            }}
                          >
                            <span>+ {a.label}</span>
                            {open && (
                              <span
                                className="font-mono tracking-[0.05em] whitespace-nowrap"
                                style={{ fontSize: '10px', color: '#E85D26', fontStyle: 'normal' }}
                              >
                                · {a.price}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-auto pt-6 border-t border-[#071530]/10">
                      <div className="flex items-end justify-between">
                        <div></div>
                        <div className="text-right flex flex-col items-end">
                          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#071530]/35 mb-3">Piece {p.n}</span>
                          <div>
                            <p className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#071530]/35 mb-1.5">Investment</p>
                            <p className="font-display-serif text-[13px] md:text-[14px] text-[#071530]/25 tracking-[-0.02em] leading-none">
                              {p.price}<span className="font-mono text-[7px] tracking-[0.15em] text-[#071530]/15 ml-2">fixed</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bundle + how it works ─────────────────────────────────────────────── */}
      <section className="bg-white px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-[1200px] mx-auto">
          <motion.div className="mb-12" {...fadeUp()}>
            <Kicker className="mb-3">Putting it together</Kicker>
            <h2 className="font-display-serif text-[32px] md:text-[50px] leading-[1.0] tracking-[-0.025em] text-[#071530]">
              Take one. Or take all three.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {[
              { k: 'Start small', t: 'One piece', d: 'Begin with the Game ($15K, already live), the Platform ($12K), or the Marketing ($10K). Each stands on its own.', price: 'from $10,000' },
              { k: 'Most popular', t: 'Two pieces', d: 'Game + Platform makes the full learning experience. Or pair any two to fit your moment.', price: 'from $22,000' },
 { k: 'The whole program', t: 'All three', d: 'Game, Platform, and Marketing together, the complete Mission Water build, end to end.', price: '$37,000', feature: true },
            ].map((b, i) => (
              <motion.div
                key={b.t}
                className="p-8 rounded-xl flex flex-col"
                style={{
                  background: b.feature ? 'linear-gradient(160deg, #071530 0%, #0D2045 100%)' : '#F4F2EF',
                  border: b.feature ? '1px solid rgba(232,93,38,0.4)' : '1px solid rgba(7,21,48,0.08)',
                }}
                {...fadeUp(0.06 + i * 0.06)}
              >
                <Kicker className="mb-3">{b.k}</Kicker>
                <p className={`font-display-serif text-[24px] md:text-[28px] leading-[1.1] tracking-[-0.015em] mb-3 ${b.feature ? 'text-white' : 'text-[#071530]'}`}>{b.t}</p>
                <p className={`font-body text-[14px] leading-[1.6] mb-6 ${b.feature ? 'text-white/60' : 'text-[#071530]/55'}`}>{b.d}</p>
                <p className={`mt-auto font-display-serif text-[32px] tracking-[-0.02em] ${b.feature ? 'text-white' : 'text-[#071530]'}`}>
                  {b.price}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5" {...fadeUp(0.1)}>
            {[
              { t: 'Phase it over time', d: 'No need to do everything at once. Start with one piece, prove it, and add the next when you are ready.' },
              { t: 'Swap deliverables', d: 'Every line item is a starting point. Trade something you do not need for something you do, and the price holds.' },
 { t: 'Add on anytime', d: 'New chapters, more video, paid ads, integrations, bolt them on as the program grows. Quoted as you go.' },
            ].map((c) => (
              <div key={c.t} className="p-6 rounded-xl bg-[#F4F2EF]" style={{ border: '1px solid rgba(7,21,48,0.08)' }}>
                <p className="font-display-serif text-[19px] tracking-[-0.01em] text-[#071530] mb-2">{c.t}</p>
                <p className="font-body text-[13.5px] text-[#071530]/55 leading-[1.6]">{c.d}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Optional ad add-on package (separate, at the end) ─────────────────── */}
      <section className="px-6 md:px-12 py-16 md:py-24 bg-[#F4F2EF] border-t border-[#071530]/[0.06]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-center">
            <motion.div {...fadeUp()}>
              <Kicker className="mb-3">Optional add-on package</Kicker>
              <h2 className="font-display-serif text-[32px] md:text-[46px] leading-[1.0] tracking-[-0.025em] text-[#071530] mb-5">
                Add a managed ad budget.
              </h2>
              <p className="font-body text-[16px] text-[#071530]/65 leading-[1.65] max-w-[560px] mb-5">
 A separate package on top of any piece, not baked into the build fees. A managed paid-media budget of <span className="text-[#071530] font-semibold">$5,000 to $10,000</span> puts Mission Water in front of students, parents, and educators across Meta, Google, and YouTube.
              </p>
              <ul className="space-y-2.5">
                {[
                  'Add it to any piece, or run it on its own',
 'Fully managed by AOM, strategy, creative, targeting, optimization',
                  'Transparent reporting on every dollar and what it returns',
                  'Scales up or down month to month',
                ].map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-[#E85D26] font-mono text-[13px] shrink-0 mt-[1px]">▸</span>
                    <span className="font-body text-[14px] text-[#071530]/70 leading-[1.55]">{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'linear-gradient(160deg, #071530 0%, #0D2045 100%)', border: '1px solid rgba(232,93,38,0.4)' }}
              {...fadeUp(0.1)}
            >
              <p className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-white/45 mb-2">Add-on package</p>
              <p className="font-display-serif text-[48px] md:text-[56px] text-white tracking-[-0.03em] leading-none mb-1">$5–10K</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D26] mb-5">per launch window</p>
              <p className="font-body text-[13px] text-white/55 leading-[1.6]">
                Optional. Management included. Budget flexes to your goals.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-16 md:py-24" style={{ background: 'linear-gradient(160deg, #071530 0%, #0D2045 100%)' }}>
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[640px]" {...fadeUp()}>
            <Kicker className="mb-5">Ready when you are</Kicker>
            <h2 className="font-display-serif text-[36px] md:text-[56px] leading-[0.95] tracking-[-0.025em] text-white mb-6">
              The game is live.<br />
              <span className="text-[#E85D26]">Let&apos;s scope your build.</span>
            </h2>
            <p className="font-body text-[16px] text-white/55 leading-[1.65] mb-8 max-w-[480px]">
              Tell us which piece you want to start with and we&apos;ll tailor the deliverables, the timeline, and the ad budget to your cohort.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a href="mailto:hello@aheadofmarket.com?subject=Mission%20Water%20%E2%80%94%20Scope%20%26%20Investment" className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-white font-mono text-[10.5px] uppercase tracking-[0.2em] px-8 py-4 rounded-full transition-colors">
                Let&apos;s talk &rarr;
              </a>
 <p className="font-body text-[13px] text-white/40 italic">Confidential, for Nancy Conrad</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#F4F2EF] border-t border-[#071530]/[0.08] px-6 md:px-12 py-8">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#071530] font-semibold">
              Conrad<span className="font-normal">Foundation</span>
              <span className="text-[#071530]/30 mx-2">×</span>
              AOM
            </p>
            <p className="font-mono text-[9px] text-[#071530]/30 uppercase tracking-[0.18em] mt-1">
              Mission Water · Scope &amp; Investment · Confidential · 2026
            </p>
          </div>
          <a href="/platform" className="flex items-center gap-2 px-3.5 py-2 rounded-full hover:border-[#E85D26]/40 transition-colors" style={{ border: '1px solid rgba(7,21,48,0.10)' }}>
            <span className="font-mono text-[9px] text-[#071530]/45 uppercase tracking-[0.18em]">&larr; Back to the platform</span>
          </a>
        </div>
      </footer>

    </div>
  );
}