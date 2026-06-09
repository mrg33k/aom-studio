// Conrad Foundation · Mission Water — Scope of Work / what we're offering
// The page behind "Let's talk" on /platform. Lays out the full scope of what
// AOM builds for the Mission Water platform: what's included, how it rolls out,
// and what AOM brings. Conrad editorial system (navy/orange, serif + mono).
// /missionwateroffering · /mission-water-offering · /missionwater/offering
// Mission: conrad-foundation:mission-water
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

// ─── SEO ──────────────────────────────────────────────────────────────────────
function useSEO() {
  useEffect(() => {
    document.title = 'Mission Water | Scope of Work';
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
    setMeta('description', 'Mission Water — the full scope of what AOM builds for the Conrad Foundation masterclass platform.');
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

// Scattered starfield (matches /platform).
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
            Scope of work · Private
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

// ─── The full scope: what's included ────────────────────────────────────────────
const INCLUDED = [
  {
    n: '01',
    kicker: 'The experience',
    title: 'The interactive game',
    desc: 'A story-driven, branching water-science game students play start to finish. Real science embedded in real choices — Earth’s water crisis, the journey to the Moon, and the search for lunar water. Live now and growing chapter by chapter.',
    status: 'Live now',
  },
  {
    n: '02',
    kicker: 'The classroom',
    title: 'Live class broadcast',
    desc: 'Nancy teaches live, students watch and ask questions in real time. A broadcast console with a class Q&A rail, roster, reactions, and set-a-reminder for upcoming sessions — the masterclass, on air.',
    status: 'In build',
  },
  {
    n: '03',
    kicker: 'The library',
    title: 'Session archive',
    desc: 'Every live class kept forever. A permanent, searchable library students, families, sponsors, and future cohorts return to anytime — the course never expires.',
    status: 'Planned',
  },
  {
    n: '04',
    kicker: 'The coursework',
    title: 'Self-paced modules',
    desc: 'Sequential lessons with timers, progress tracking, and student teach-back submissions. Students move at their own pace between live sessions and never lose their place.',
    status: 'Planned',
  },
  {
    n: '05',
    kicker: 'The proof',
    title: 'Student deliverables',
    desc: 'Students upload reflections and project work. Educators review, grade, and give feedback inside the platform — real solutions, presented and assessed in one place.',
    status: 'Planned',
  },
  {
    n: '06',
    kicker: 'The oversight',
    title: 'Educator + parent dashboards',
    desc: 'Separate logins, same dashboard, different views. Educators see the full roster and weekly report cards; parents see their own student. No spreadsheets, no guesswork.',
    status: 'Planned',
  },
];

// ─── How it rolls out ───────────────────────────────────────────────────────────
const PHASES = [
  {
    n: 'Phase 01',
    title: 'The game, live',
    desc: 'The interactive game ships and grows chapter by chapter. This is the proof — the thing Nancy can put in front of a school, a sponsor, or a student today.',
    state: 'Live now',
  },
  {
    n: 'Phase 02',
    title: 'Live classroom',
    desc: 'The broadcast platform goes on air. Nancy teaches, students watch and ask, sessions are scheduled and reminded. The masterclass becomes a place, not a calendar invite.',
    state: 'Next',
  },
  {
    n: 'Phase 03',
    title: 'The full course',
    desc: 'Self-paced modules, student deliverables, and the educator + parent dashboards come online. Mission Water becomes a complete, tracked learning program.',
    state: 'Then',
  },
  {
    n: 'Phase 04',
    title: 'Scale across masterclasses',
    desc: 'The same proven engine, re-themed for the next Conrad Foundation masterclass. Build it once for water, run it for everything that follows.',
    state: 'Horizon',
  },
];

// ─── What AOM brings ────────────────────────────────────────────────────────────
const BRINGS = [
  {
    title: 'A proven course engine',
    desc: 'We’re not prototyping from zero. Mission Water is built on the same course platform we shipped in 2026 — themed for water science, ready to scale.',
  },
  {
    title: 'Design + build, end to end',
    desc: 'Interface, illustration, motion, copy, and code — one team. The look you see in the game is the bar for every surface we ship.',
  },
  {
    title: 'A partner, not a vendor',
    desc: 'Conrad Foundation convenes. AOM builds and keeps building. Hosting, iteration, and new chapters as the program grows.',
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
        <div
          className="absolute -right-[18%] -top-[42%] w-[720px] h-[720px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(232,93,38,0.16)' }}
        />
        <div
          className="absolute -right-[8%] -top-[28%] w-[460px] h-[460px] rounded-full pointer-events-none"
          style={{ border: '1px solid rgba(255,255,255,0.06)' }}
        />

        <div className="max-w-[1280px] mx-auto relative">
          <motion.div {...fadeUp()}>
            <div className="flex items-center gap-3 mb-7">
              <Kicker>Mission Water · Scope of Work</Kicker>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">Confidential</span>
            </div>
            <h1 className="font-display-serif text-[44px] md:text-[78px] lg:text-[96px] leading-[0.94] tracking-[-0.035em] max-w-[1000px] mb-7 text-white">
              Here&apos;s exactly<br />
              <em className="font-display-italic italic font-medium text-[#E85D26]">what we build.</em>
            </h1>
            <p className="font-body text-[17px] md:text-[20px] leading-[1.55] max-w-[620px] text-white/65 mb-10">
              Mission Water is one platform with six moving parts. The game is live today. Below is the full picture — what&apos;s included, how it rolls out, and what you get from AOM at every step.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#scope"
                className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-white font-mono text-[10.5px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-full transition-colors"
              >
                See the scope ↓
              </a>
              <a
                href="/platform"
                className="inline-flex items-center gap-2 border border-white/25 hover:border-white/60 text-white/85 font-mono text-[10.5px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-full transition-colors"
              >
                ← Back to the platform
              </a>
            </div>
          </motion.div>

          {/* Readout strip */}
          <motion.div
            className="mt-16 md:mt-20 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-7"
            {...fadeUp(0.15)}
          >
            {[
              ['Live today', 'The interactive game'],
              ['Built on', 'Proven course engine'],
              ['Themed for', 'Water science · 13–18'],
              ['Convened by', 'Conrad Foundation'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-white/30 mb-1.5">{k}</p>
                <p className="font-body text-[14px] text-white/80">{v}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── The full scope ───────────────────────────────────────────────────── */}
      <section id="scope" className="bg-white px-6 md:px-12 py-16 md:py-24 scroll-mt-20">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-12" {...fadeUp()}>
            <Kicker className="mb-3">What&apos;s included</Kicker>
            <h2 className="font-display-serif text-[32px] md:text-[50px] leading-[1.0] tracking-[-0.025em] text-[#071530]">
              The whole platform,{' '}
              <span className="text-[#E85D26]">part by part.</span>
            </h2>
            <p className="font-body text-[16px] text-[#071530]/55 leading-[1.6] max-w-[580px] mt-4">
              Six surfaces, one experience. Each is a real deliverable with a clear job. The game proves it works today; the rest builds the masterclass around it.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {INCLUDED.map((item, i) => {
              const live = item.status === 'Live now';
              return (
                <motion.div
                  key={item.n}
                  className="relative p-7 rounded-xl bg-[#F4F2EF] flex flex-col"
                  style={{ border: live ? '1px solid rgba(232,93,38,0.45)' : '1px solid rgba(7,21,48,0.08)' }}
                  {...fadeUp(0.05 + i * 0.05)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[13px] tracking-[0.18em] text-[#E85D26]">{item.n}</span>
                    <span
                      className={`font-mono text-[8px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full ${
                        live
                          ? 'bg-[#E85D26] text-white'
                          : item.status === 'In build'
                          ? 'bg-[#071530]/[0.06] text-[#071530]/55 border border-[#071530]/15'
                          : 'text-[#071530]/35 border border-[#071530]/12'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <Kicker className="mb-2">{item.kicker}</Kicker>
                  <p className="font-display-serif text-[21px] md:text-[24px] leading-[1.12] tracking-[-0.015em] text-[#071530] mb-3">
                    {item.title}
                  </p>
                  <p className="font-body text-[14px] text-[#071530]/55 leading-[1.65]">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How it rolls out ─────────────────────────────────────────────────── */}
      <section
        className="px-6 md:px-12 py-16 md:py-24"
        style={{ background: 'linear-gradient(160deg, #071530 0%, #0D2045 100%)' }}
      >
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-12" {...fadeUp()}>
            <Kicker className="mb-3">How it rolls out</Kicker>
            <h2 className="font-display-serif text-[32px] md:text-[50px] leading-[1.0] tracking-[-0.025em] text-white">
              Live first.{' '}
              <span className="text-[#E85D26]">Then the rest.</span>
            </h2>
            <p className="font-body text-[16px] text-white/55 leading-[1.6] max-w-[560px] mt-4">
              We ship the proof, then build the program around it. Nothing waits on everything.
            </p>
          </motion.div>

          <div className="space-y-3">
            {PHASES.map((p, i) => {
              const live = p.state === 'Live now';
              return (
                <motion.div
                  key={p.n}
                  className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] md:items-center gap-3 md:gap-8 p-6 md:p-7 rounded-xl"
                  style={{
                    background: live ? 'rgba(232,93,38,0.08)' : 'rgba(255,255,255,0.04)',
                    border: live ? '1px solid rgba(232,93,38,0.4)' : '1px solid rgba(255,255,255,0.10)',
                  }}
                  {...fadeUp(0.05 + i * 0.06)}
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E85D26]">{p.n}</span>
                  <div>
                    <p className="font-display-serif text-[22px] md:text-[26px] leading-[1.1] tracking-[-0.015em] text-white mb-1.5">
                      {p.title}
                    </p>
                    <p className="font-body text-[14px] text-white/55 leading-[1.6] max-w-[620px]">{p.desc}</p>
                  </div>
                  <span
                    className={`justify-self-start md:justify-self-end font-mono text-[8.5px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full whitespace-nowrap ${
                      live ? 'bg-[#E85D26] text-white' : 'text-white/45 border border-white/15'
                    }`}
                  >
                    {p.state}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── What AOM brings ──────────────────────────────────────────────────── */}
      <section className="bg-white px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-12" {...fadeUp()}>
            <Kicker className="mb-3">What AOM brings</Kicker>
            <h2 className="font-display-serif text-[32px] md:text-[50px] leading-[1.0] tracking-[-0.025em] text-[#071530]">
              You convene.{' '}
              <span className="text-[#E85D26]">We build.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {BRINGS.map((item, i) => (
              <motion.div
                key={i}
                className="p-8 rounded-xl bg-[#F4F2EF]"
                style={{ border: '1px solid rgba(7,21,48,0.08)' }}
                {...fadeUp(0.08 + i * 0.06)}
              >
                <p className="font-display-serif text-[21px] md:text-[25px] leading-[1.15] tracking-[-0.015em] text-[#071530] mb-3">
                  {item.title}
                </p>
                <p className="font-body text-[14px] text-[#071530]/55 leading-[1.65]">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────────── */}
      <section
        className="px-6 md:px-12 py-16 md:py-24"
        style={{ background: 'linear-gradient(160deg, #071530 0%, #0D2045 100%)' }}
      >
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[640px]" {...fadeUp()}>
            <Kicker className="mb-5">Ready when you are</Kicker>
            <h2 className="font-display-serif text-[36px] md:text-[56px] leading-[0.95] tracking-[-0.025em] text-white mb-6">
              The game is live.<br />
              <span className="text-[#E85D26]">Let&apos;s build the rest.</span>
            </h2>
            <p className="font-body text-[16px] text-white/55 leading-[1.65] mb-8 max-w-[480px]">
              You’ve seen the proof and the plan. Tell us which phase you want next and we’ll scope it to your timeline and your cohort.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="mailto:hello@aheadofmarket.com?subject=Mission%20Water%20Platform%20—%20Scope"
                className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-white font-mono text-[10.5px] uppercase tracking-[0.2em] px-8 py-4 rounded-full transition-colors"
              >
                Let&apos;s talk →
              </a>
              <p className="font-body text-[13px] text-white/40 italic">
                Confidential — for Nancy Conrad
              </p>
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
              Mission Water · Scope of Work · Confidential · 2026
            </p>
          </div>
          <a
            href="/platform"
            className="flex items-center gap-2 px-3.5 py-2 rounded-full hover:border-[#E85D26]/40 transition-colors"
            style={{ border: '1px solid rgba(7,21,48,0.10)' }}
          >
            <span className="font-mono text-[9px] text-[#071530]/45 uppercase tracking-[0.18em]">
              ← Back to the platform
            </span>
          </a>
        </div>
      </footer>

    </div>
  );
}
