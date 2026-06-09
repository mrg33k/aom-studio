// Conrad Foundation · Mission Water — Scope of Work / what we're offering
// The page behind "Let's talk" on /platform. Three priced pillars (Game,
// Platform, Marketing) at $15K each + a managed ad budget, with detailed
// deliverables and add-on options. Conrad editorial system (navy/orange).
// /missionwateroffering · /mission-water-offering · /missionwater/offering
// Mission: conrad-foundation:mission-water
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

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
    setMeta('description', 'Mission Water — three pillars (Game, Platform, Marketing) with detailed deliverables, pricing, and add-ons.');
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
            ← The platform
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

// ─── The three pillars ──────────────────────────────────────────────────────────
const PILLARS = [
  {
    n: ‘01’,
    name: ‘The Game’,
    price: ‘$15,000’,
    tagline: ‘The interactive experience’,
    summary:
      ‘The story-driven, branching water-science game students play start to finish. Live today and built to grow. This is the proof — the thing you put in front of a student, a school, or a sponsor and watch them get it.’,
    deliverables: [
      ‘Three-chapter branching narrative with embedded science’,
      ‘NASA mission-console design with cinematic visuals’,
      ‘Character roles, resource system, progression badges’,
      ‘Blippy mascot that reacts throughout the story’,
      ‘Responsive game, live hosting, ongoing updates’,
    ],
    addons: [
      ‘Additional story chapters’,
      ‘Classroom / multiplayer mode’,
      ‘Cinematic AI video backgrounds (Veo3)’,
      ‘Teacher authoring tools’,
      ‘Localization / translation’,
    ],
  },
  {
    n: ‘02’,
    name: ‘The Platform’,
    price: ‘$12,000’,
    tagline: ‘The masterclass, online’,
    summary:
      ‘Everything around the game that turns it into a real program — live classes, a permanent archive, self-paced coursework, and dashboards for educators and parents. One window, everything inside.’,
    deliverables: [
      ‘Live broadcasts with real-time Q&A and scheduling’,
      ‘Full session archive, forever searchable and accessible’,
      ‘Self-paced course modules with progress tracking and submissions’,
      ‘Student work uploads with educator feedback in-platform’,
      ‘Educator and parent dashboards with weekly reports’,
    ],
    addons: [
      ‘Payments / paid enrollment’,
      ‘LMS integration (Google Classroom, Canvas)’,
      ‘Completion certificates’,
      ‘Multi-school / cohort management’,
      ‘White-label for the next masterclass’,
    ],
  },
  {
    n: ‘03’,
    name: ‘The Marketing’,
    price: ‘$10,000’,
    tagline: ‘Go-to-market for all of it’,
    summary:
      ‘The brand, the story, and the campaign that gets Mission Water in front of students, schools, and funders. Build it beautifully, then make sure the right people see it.’,
    deliverables: [
      ‘Complete brand system with guidelines and usage rules’,
      ‘Landing pages optimized for enrollment and search’,
      ‘Campaign assets: social kit, email sequences, ad creative’,
      ‘Launch video: sizzle reel under one minute’,
      ‘Funder one-pager and performance dashboard’,
    ],
    addons: [
      ‘Ongoing monthly social management’,
      ‘Additional video production’,
      ‘PR / press outreach’,
      ‘Sponsor / grant deck’,
      ‘Managed paid ads (see ad budget)’,
    ],
  },
];

export default function MissionWaterOffering() {
  useSEO();

  return (
    <div className="bg-white text-[#071530] min-h-screen scroll-smooth" style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}>

      <ConradNav />

      {/* ─── Hero ─────────────────────────────────────────────────────────────── */}
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
              <em className="font-display-italic italic font-medium text-[#E85D26]">Build what you need.</em>
            </h1>
            <p className="font-body text-[17px] md:text-[20px] leading-[1.55] max-w-[640px] text-white/65 mb-10">
              Mission Water is delivered in independent, complete pieces that work together or stand alone. Pick one, two, or the full program — and tailor the deliverables as you go.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a href="#pillars" className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-white font-mono text-[10.5px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-full transition-colors">
                See the deliverables ↓
              </a>
              <a href="/platform" className="inline-flex items-center gap-2 border border-white/25 hover:border-white/60 text-white/85 font-mono text-[10.5px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-full transition-colors">
                ← Back to the platform
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── The three pillars ────────────────────────────────────────────────── */}
      <section id="pillars" className="bg-white px-6 md:px-12 py-16 md:py-24 scroll-mt-20">
        <div className="max-w-[1200px] mx-auto">
          <motion.div className="mb-12" {...fadeUp()}>
            <Kicker className="mb-3">What you get</Kicker>
            <h2 className="font-display-serif text-[32px] md:text-[50px] leading-[1.0] tracking-[-0.025em] text-[#071530]">
              Every pillar, in detail.
            </h2>
            <p className="font-body text-[16px] text-[#071530]/55 leading-[1.6] max-w-[600px] mt-4">
              No vague line items. Here is exactly what each pillar delivers — and what you can add or swap as you go.
            </p>
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
                  </div>

                  {/* Right — deliverables + add-ons + price */}
                  <div className="p-8 md:p-10 bg-[#F4F2EF] flex flex-col relative">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#071530]/45 mb-5">Deliverables</p>
                    <ul className="space-y-3.5 mb-8">
                      {p.deliverables.map((d, di) => (
                        <li key={di} className="flex gap-3">
                          <span className="text-[#E85D26] font-mono text-[13px] leading-[1.4] shrink-0 mt-[1px]">▸</span>
                          <span className="font-body text-[14.5px] text-[#071530]/75 leading-[1.55]">{d}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#071530]/45 mb-3">Add-ons &amp; options</p>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {p.addons.map((a) => (
                        <span key={a} className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#071530]/60 border border-[#071530]/15 rounded-full px-3 py-1.5">
                          + {a}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto pt-6 border-t border-[#071530]/10">
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <p className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#071530]/45 mb-1.5">Investment</p>
                          <p className="font-display-serif text-[40px] md:text-[44px] text-[#071530] tracking-[-0.02em] leading-none">
                            {p.price}<span className="font-mono text-[11px] tracking-[0.15em] text-[#071530]/40 ml-2">fixed</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-display-serif text-[48px] md:text-[56px] text-[#071530]/15 tracking-[-0.03em] leading-none font-light">{p.n}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Ad budget ─────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-16 md:py-24" style={{ background: 'linear-gradient(160deg, #071530 0%, #0D2045 100%)' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-center">
            <motion.div {...fadeUp()}>
              <Kicker className="mb-3">Get it in front of people</Kicker>
              <h2 className="font-display-serif text-[32px] md:text-[46px] leading-[1.0] tracking-[-0.025em] text-white mb-5">
                A managed ad budget.
              </h2>
              <p className="font-body text-[16px] text-white/60 leading-[1.65] max-w-[560px] mb-5">
                Separate from the build fees, a paid-media budget of <span className="text-white font-semibold">$5,000 to $10,000</span> drives enrollment and awareness across the channels students, parents, and educators actually use — Meta, Google, and YouTube.
              </p>
              <ul className="space-y-2.5">
                {[
                  'Fully managed by AOM — strategy, creative, targeting, and optimization',
                  'Spend goes to the platforms; AOM’s management is included in the Marketing pillar',
                  'Transparent reporting — you see exactly where every dollar goes and what it returns',
                  'Scales up or down month to month based on what’s working',
                ].map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-[#E85D26] font-mono text-[13px] shrink-0 mt-[1px]">▸</span>
                    <span className="font-body text-[14px] text-white/65 leading-[1.55]">{t}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(232,93,38,0.10)', border: '1px solid rgba(232,93,38,0.4)' }}
              {...fadeUp(0.1)}
            >
              <p className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-white/45 mb-2">Recommended ad spend</p>
              <p className="font-display-serif text-[48px] md:text-[56px] text-white tracking-[-0.03em] leading-none mb-1">$5–10K</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D26] mb-5">per launch window</p>
              <p className="font-body text-[13px] text-white/55 leading-[1.6]">
                Management included with the Marketing pillar. Budget flexes to your goals.
              </p>
            </motion.div>
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
              { k: ‘Start small’, t: ‘One pillar’, d: ‘Begin with the Game (it’s already live), the Platform, or the Marketing. Each stands on its own.’, price: ‘$10K–$15K’ },
              { k: ‘Most popular’, t: ‘Two pillars’, d: ‘Game + Platform makes the full learning experience. Or Game + Marketing to launch loud. Mix to fit your moment.’, price: ‘$22K–$27K’ },
              { k: ‘The whole program’, t: ‘All three’, d: ‘Game, Platform, and Marketing together — the complete Mission Water build, end to end.’, price: ‘$37,000’, feature: true },
            ].map((b, i) => (
              <motion.div
                key={b.t}
                className="p-8 rounded-xl flex flex-col"
                style={{
                  background: b.feature ? ‘linear-gradient(160deg, #071530 0%, #0D2045 100%)’ : ‘#F4F2EF’,
                  border: b.feature ? ‘1px solid rgba(232,93,38,0.4)’ : ‘1px solid rgba(7,21,48,0.08)’,
                }}
                {...fadeUp(0.06 + i * 0.06)}
              >
                <Kicker className="mb-3">{b.k}</Kicker>
                <p className={`font-display-serif text-[24px] md:text-[28px] leading-[1.1] tracking-[-0.015em] mb-3 ${b.feature ? ‘text-white’ : ‘text-[#071530]’}`}>{b.t}</p>
                <p className={`font-body text-[14px] leading-[1.6] mb-6 ${b.feature ? ‘text-white/60’ : ‘text-[#071530]/55’}`}>{b.d}</p>
                <p className={`mt-auto font-display-serif text-[32px] tracking-[-0.02em] ${b.feature ? ‘text-white’ : ‘text-[#071530]’}`}>
                  {b.price}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5" {...fadeUp(0.1)}>
            {[
              { t: 'Phase it over time', d: 'No need to do everything at once. Start with one pillar, prove it, and add the next when you’re ready.' },
              { t: 'Swap deliverables', d: 'Every line item is a starting point. Trade something you don’t need for something you do — the price holds.' },
              { t: 'Add on anytime', d: 'New chapters, more video, paid ads, integrations — bolt them on as the program grows. Quoted as you go.' },
            ].map((c) => (
              <div key={c.t} className="p-6 rounded-xl bg-[#F4F2EF]" style={{ border: '1px solid rgba(7,21,48,0.08)' }}>
                <p className="font-display-serif text-[19px] tracking-[-0.01em] text-[#071530] mb-2">{c.t}</p>
                <p className="font-body text-[13.5px] text-[#071530]/55 leading-[1.6]">{c.d}</p>
              </div>
            ))}
          </motion.div>
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
              Tell us which pillar you want to start with and we&apos;ll tailor the deliverables, the timeline, and the ad budget to your cohort.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a href="mailto:hello@aheadofmarket.com?subject=Mission%20Water%20%E2%80%94%20Scope%20%26%20Investment" className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-white font-mono text-[10.5px] uppercase tracking-[0.2em] px-8 py-4 rounded-full transition-colors">
                Let&apos;s talk →
              </a>
              <p className="font-body text-[13px] text-white/40 italic">Confidential — for Nancy Conrad</p>
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
            <span className="font-mono text-[9px] text-[#071530]/45 uppercase tracking-[0.18em]">← Back to the platform</span>
          </a>
        </div>
      </footer>

    </div>
  );
}
