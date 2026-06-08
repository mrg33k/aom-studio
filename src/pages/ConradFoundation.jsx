import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * ConradFoundation — pitch page for Nancy Conrad / Conrad Foundation.
 *
 * Design system mirrors HigherOrbitsPitch:
 *   - bg `#0C0C0C` ground, text `#F0ECE6` warm bone, accent `#E85D26` AOM orange
 *   - font-display-serif headlines, italic accent in orange
 *   - font-mono kicker 10.5px tracking-[0.28em] uppercase
 *   - Framer Motion fadeUp animations on scroll
 *
 * R2 — 2026-06-01 — rescoped to platform-first pitch + video options
 * R3 — 2026-06-01 — added Budget section (no price, open-ended question)
 * R4 — 2026-06-01 — tightened all copy (cut wordiness, 1-2 sentences per block)
 * R5 — 2026-06-08 — platform-focused rebuild. Platform mirrors the summer-school
 *      engine (self-paced lessons, progress + stars, teach-back submissions).
 *      New: The Game section (Mission Water interactive, /missionwater link),
 *      Educator & Parent dashboard (to build), Rough Scope. Video folded into platform.
 * Structure: Space hook → 20 years → Water is first → Platform → The Game →
 *      Educator & parent dashboard → Rough scope → Budget → Next steps
 */

// ─── Animation helper ─────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

// ─── Reusable components ──────────────────────────────────────────────────────

function Kicker({ children, className = '' }) {
  return (
    <p className={`font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] ${className}`}>
      {children}
    </p>
  );
}

function StatBlock({ value, label, delay = 0.05 }) {
  return (
    <motion.div className="text-left" {...fadeUp(delay)}>
      <p className="font-display-serif text-[48px] md:text-[64px] leading-[0.9] tracking-[-0.025em] text-[#F0ECE6]">
        {value}
      </p>
      <p className="font-body text-[13px] md:text-[14px] text-[#F0ECE6]/55 mt-3 leading-[1.5] max-w-[20ch]">
        {label}
      </p>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConradFoundation() {
  const [platformTab, setPlatformTab] = useState('lessons');

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    document.title = 'Mission Water · Conrad Foundation | AOM';
    return () => meta.remove();
  }, []);

  return (
    <div
      className="bg-[#0C0C0C] text-[#F0ECE6] min-h-screen antialiased"
      style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
    >

      {/* ──── SLIDE 1: THE FUTURE OF WATER IS IN SPACE ─────────────────── */}
      <section className="relative pt-28 md:pt-40 pb-24 md:pb-32 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto">
          <motion.div {...fadeUp()}>
            <div className="inline-flex items-center gap-3 border border-[#E85D26]/30 bg-[#0C0C0C]/60 backdrop-blur-sm px-3.5 py-1.5 rounded-full mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
              <Kicker className="!text-[#F0ECE6]">For Nancy Conrad · Conrad Foundation</Kicker>
            </div>
          </motion.div>

          <motion.h1
            className="font-display-serif text-[12vw] md:text-[80px] lg:text-[104px] xl:text-[120px] leading-[0.9] tracking-[-0.035em] max-w-[1100px]"
            {...fadeUp(0.1)}
          >
            The future of water
            <br />
            in{' '}
            <em className="font-display-italic italic font-medium text-[#E85D26]">space.</em>
          </motion.h1>

          <motion.p
            className="font-body text-[17px] md:text-[20px] text-[#F0ECE6]/75 mt-10 leading-[1.6] max-w-[58ch]"
            {...fadeUp(0.2)}
          >
            Twenty years of curriculum. A platform that delivers it. A game that makes students feel it. Here's what we built.
          </motion.p>
        </div>
      </section>

      {/* ──── SLIDE 2: TWENTY YEARS BUILDING THE MODEL ─────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 items-start">

          <motion.div className="md:col-span-7" {...fadeUp()}>
            <Kicker>Nancy's foundation</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Twenty years building the{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">model.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/75 mt-8 leading-[1.7] max-w-[52ch]">
              The Conrad Challenge proved it — Alabama to Afghanistan. Mission Water is first.
            </p>
            <p className="font-body text-[13px] text-[#F0ECE6]/40 mt-5 leading-[1.6] max-w-[48ch]">
              Founded in honor of Pete Conrad — astronaut, Apollo 12, the third man to walk on the moon.
            </p>
            <div className="grid grid-cols-3 gap-8 mt-12 border-t border-[#F0ECE6]/[0.08] pt-10">
              <StatBlock value="20+" label="years building the model." delay={0.05} />
              <StatBlock value="many" label="continents. Alabama to Afghanistan." delay={0.10} />
              <StatBlock value="Conrad" label="Challenge. The proof." delay={0.15} />
            </div>
          </motion.div>

          <motion.div className="md:col-span-5" {...fadeUp(0.12)}>
            <div className="relative border border-[#E85D26]/25 rounded-xl bg-[#E85D26]/[0.04] p-8 md:p-10">
              <span
                className="absolute top-6 left-8 font-display-serif text-[80px] leading-none text-[#E85D26]/20 select-none pointer-events-none"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <blockquote className="relative pt-10">
                <p className="font-display-serif text-[22px] md:text-[28px] leading-[1.25] tracking-[-0.02em] text-[#F0ECE6]">
                  Water is not just a resource — it's the entry point for teaching young people how to{' '}
                  <em className="font-display-italic italic text-[#E85D26]">
                    think critically.
                  </em>
                </p>
                <footer className="mt-6 border-t border-[#F0ECE6]/[0.10] pt-5">
                  <p className="font-display-serif text-[16px] text-[#F0ECE6]/80">Nancy Conrad</p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/40 mt-1">
                    Founder · Conrad Foundation
                  </p>
                </footer>
              </blockquote>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ──── SLIDE 3: WATER IS FIRST ───────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 items-center">

            <motion.div className="md:col-span-5" {...fadeUp()}>
              <Kicker>Mission Water</Kicker>
              <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
                Water is{' '}
                <em className="font-display-italic italic font-medium text-[#E85D26]">first.</em>
              </h2>
              <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/75 mt-8 leading-[1.7]">
                What happens when there's no more water? Water launches the curriculum. Space and Plants follow.
              </p>
            </motion.div>

            <div className="md:col-span-6 md:col-start-7 space-y-3">
              {[
                { num: '01', topic: 'Water', hook: 'What happens when there\'s no more water?', status: 'First', active: true },
                { num: '02', topic: 'Space', hook: 'The future of water is in space.', status: 'Next', active: false },
                { num: '03', topic: 'Plants', hook: 'How do you grow food when there\'s no soil?', status: 'Coming', active: false },
              ].map((row, i) => (
                <motion.div
                  key={row.num}
                  className={`border rounded-xl px-6 py-5 md:py-6 flex items-start justify-between gap-6 ${
                    row.active
                      ? 'border-[#E85D26]/40 bg-[#E85D26]/[0.04]'
                      : 'border-[#F0ECE6]/[0.10] bg-[#F0ECE6]/[0.02]'
                  }`}
                  {...fadeUp(i * 0.07)}
                >
                  <div className="flex gap-5 flex-1 min-w-0">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26] shrink-0 pt-0.5">
                      {row.num}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/35 mb-1">{row.topic}</p>
                      <p className="font-display-serif text-[16px] md:text-[18px] leading-[1.2] text-[#F0ECE6]">{row.hook}</p>
                    </div>
                  </div>
                  <p className={`font-mono text-[9.5px] uppercase tracking-[0.22em] shrink-0 pt-1 ${
                    row.active ? 'text-[#E85D26]' : 'text-[#F0ECE6]/35'
                  }`}>
                    {row.status}
                  </p>
                </motion.div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ──── THE PLATFORM ──────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[820px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>The platform · already built</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              The course delivers{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">itself.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              This isn't a concept. We built this engine for a 12-week program running right now — self-paced lessons, progress tracking, gold stars, weekly report cards, and teach-back submissions. Mission Water gets the same platform, themed for water.
            </p>
          </motion.div>

          {/* Platform shell */}
          <motion.div
            className="border border-[#F0ECE6]/[0.10] rounded-2xl bg-[#F0ECE6]/[0.02] overflow-hidden"
            {...fadeUp(0.1)}
          >
            {/* Chrome bar */}
            <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-[#F0ECE6]/[0.08] bg-[#F0ECE6]/[0.03]">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#F0ECE6]/50">
                conradfoundation.org / masterclass
              </p>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
                <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/40">Live</p>
              </div>
            </div>

            {/* Tab nav */}
            <div className="flex flex-wrap gap-8 px-6 md:px-8 pt-4 border-b border-[#F0ECE6]/[0.08]">
              {[
                ['lessons', 'Lessons'],
                ['progress', 'Progress'],
                ['submit', 'Submit'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPlatformTab(key)}
                  className={`pb-4 font-mono text-[10px] uppercase tracking-[0.26em] transition-colors relative ${
                    platformTab === key
                      ? 'text-[#F0ECE6]'
                      : 'text-[#F0ECE6]/35 hover:text-[#F0ECE6]/60'
                  }`}
                >
                  {label}
                  {platformTab === key && (
                    <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#E85D26]" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="px-6 md:px-8 py-10 md:py-12 min-h-[320px]">

              {platformTab === 'lessons' && (
                <div>
                  <Kicker className="mb-4">Water Needs Your Voice</Kicker>
                  <h3 className="font-display-serif text-[28px] md:text-[44px] leading-[1.0] tracking-[-0.025em] max-w-[700px] mb-8">
                    One concept at a time. No skipping ahead.
                  </h3>
                  <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/60 leading-[1.7] max-w-[60ch] mb-10">
                    Each day is a set of short, focused lessons across a few subjects. A built-in timer keeps students on task. Sections unlock in order, so nobody clicks through without learning. Expert videos sit inside the lessons — we produce them with Nancy and her experts, or you bring your own footage and we structure it in.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    {[
                      ['Ages', '13–22'],
                      ['Duration', '6 weeks'],
                      ['Format', 'Live + self-paced'],
                    ].map(([label, value]) => (
                      <div key={label} className="border-t border-[#F0ECE6]/[0.10] pt-4">
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/40 mb-2">{label}</p>
                        <p className="font-display-serif text-[20px] md:text-[24px] leading-[1.1] tracking-[-0.02em] text-[#F0ECE6]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {platformTab === 'progress' && (
                <div>
                  <Kicker className="mb-4">Every lesson counts</Kicker>
                  <h3 className="font-display-serif text-[28px] md:text-[44px] leading-[1.0] tracking-[-0.025em] max-w-[700px] mb-8">
                    Students see how far they've come.
                  </h3>
                  <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/60 leading-[1.7] max-w-[60ch] mb-10">
                    Finish a lesson, earn a gold star. Move fast, get a speed bonus. Keep a streak going day to day. At the end of each week, a report card shows what they completed, time on task, and their fastest moments. It turns a curriculum into something kids actually want to finish.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[
                      ['★ 14', 'Gold stars earned this week'],
                      ['5 day', 'Streak — every day, in a row'],
                      ['Report card', 'Modules done · time · fastest lesson'],
                    ].map(([value, label]) => (
                      <div key={label} className="border border-[#E85D26]/20 rounded-xl bg-[#E85D26]/[0.03] px-6 py-7">
                        <p className="font-display-serif text-[26px] md:text-[30px] leading-[1.0] tracking-[-0.02em] text-[#F0ECE6] mb-3">{value}</p>
                        <p className="font-body text-[12.5px] text-[#F0ECE6]/55 leading-[1.5]">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {platformTab === 'submit' && (
                <div>
                  <Kicker className="mb-4">Teach it back</Kicker>
                  <h3 className="font-display-serif text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.02em] max-w-[640px] mb-4">
                    Argue your case. Upload your proof.
                  </h3>
                  <p className="font-body text-[14px] text-[#F0ECE6]/55 mb-8 max-w-[56ch] leading-[1.7]">
                    Students don't just click "I get it." They research a local water issue, build a proposal, and submit it — a video, a doc, or a deck. The lesson doesn't advance until the work is in. That's how you know they actually learned it.
                  </p>
                  <div className="border border-dashed border-[#F0ECE6]/[0.15] rounded-xl px-8 py-12 text-center">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/35 mb-2">Video, doc, or deck</p>
                    <p className="font-display-serif text-[16px] md:text-[18px] leading-[1.3] tracking-[-0.01em] text-[#F0ECE6]/45">
                      Drop file or click to browse
                    </p>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      </section>

      {/* ──── EXPERT VIDEO · YOUR TEAM OR OURS ──────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[760px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>Expert video</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Your team or{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">ours.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              The expert library lives inside the lessons. You already have a video team — so this is an option, not a requirement. Use them, or use us. Either way, it slots into the platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Option A — your team */}
            <motion.div
              className="border border-[#E85D26]/35 rounded-xl bg-[#E85D26]/[0.04] p-8 md:p-10 flex flex-col gap-6"
              {...fadeUp(0.05)}
            >
              <span className="font-mono text-[10px] tracking-[0.22em] text-[#E85D26]">Option A</span>
              <div>
                <h3 className="font-display-serif text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mb-4">
                  Your team{' '}
                  <em className="font-display-italic italic text-[#E85D26]">films it.</em>
                </h3>
                <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/70 leading-[1.7]">
                  Already have footage or a crew? Hand it over. We structure it into the course format and host it on the platform — you own the content.
                </p>
              </div>
              <ul className="space-y-3 mt-auto pt-6 border-t border-[#F0ECE6]/[0.10]">
                {[
                  'Use your existing video team',
                  'We cut and structure it into lessons',
                  'Platform handles delivery and access',
                ].map((item, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] text-[#E85D26] flex-shrink-0">→</span>
                    <span className="font-body text-[13px] md:text-[14px] text-[#F0ECE6]/65 leading-[1.5]">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Option B — we produce */}
            <motion.div
              className="border border-[#F0ECE6]/[0.12] rounded-xl bg-[#F0ECE6]/[0.02] p-8 md:p-10 flex flex-col gap-6"
              {...fadeUp(0.10)}
            >
              <span className="font-mono text-[10px] tracking-[0.22em] text-[#E85D26]">Option B</span>
              <div>
                <h3 className="font-display-serif text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mb-4">
                  We produce{' '}
                  <em className="font-display-italic italic text-[#E85D26]">it.</em>
                </h3>
                <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/70 leading-[1.7]">
                  Want a hand? We film Nancy and the experts — lit, framed, MasterClass-tier. Each session builds the library, reusable across Water, Space, and Plants.
                </p>
              </div>
              <ul className="space-y-3 mt-auto pt-6 border-t border-[#F0ECE6]/[0.10]">
                {[
                  'Professional filming — location or studio',
                  'Edited and archived in the platform library',
                  'Reusable across the whole curriculum',
                ].map((item, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] text-[#E85D26] flex-shrink-0">→</span>
                    <span className="font-body text-[13px] md:text-[14px] text-[#F0ECE6]/65 leading-[1.5]">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ──── THE GAME ──────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[820px] mb-14 md:mb-16" {...fadeUp()}>
            <Kicker>The game · playable now</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              An interactive that makes them{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">feel it.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              A decision game that takes a student from Earth to the Moon, making real calls about water along the way. Every choice has a consequence. Every fact is true. Play it right here.
            </p>
          </motion.div>

          {/* Live demo embed */}
          <motion.div
            className="border border-[#E85D26]/30 rounded-2xl bg-[#0C0C0C] overflow-hidden mb-5"
            {...fadeUp(0.08)}
          >
            <div className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-[#F0ECE6]/[0.08] bg-[#F0ECE6]/[0.03]">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
                <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#F0ECE6]/60">Live demo · play it here</p>
              </div>
              <a
                href="https://aheadofmarket.com/missionwater"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 hover:text-[#E85D26] transition-colors no-underline"
              >
                Open full screen ↗
              </a>
            </div>
            <iframe
              src="https://aheadofmarket.com/missionwater"
              title="Mission Water — interactive demo"
              className="w-full h-[560px] md:h-[680px] border-0 block bg-[#0C0C0C]"
              loading="lazy"
            />
          </motion.div>

          {/* Feature card */}
          <motion.div
            className="border border-[#E85D26]/30 rounded-2xl bg-[#E85D26]/[0.04] overflow-hidden"
            {...fadeUp(0.1)}
          >
            <div className="px-7 md:px-12 pt-10 md:pt-12 pb-10">
              {/* Three chapters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                {[
                  { num: 'Chapter 1', topic: 'Earth', hook: 'Ration the water. Build the infrastructure. The crisis starts at home.' },
                  { num: 'Chapter 2', topic: 'The Journey', hook: 'A sick crew. A leaking tank. Drink the reserves or split them for air?' },
                  { num: 'Chapter 3', topic: 'The Moon', hook: 'Find the crater. Pull the water from the rock. Bring them home.' },
                ].map((c, i) => (
                  <motion.div
                    key={c.num}
                    className="border border-[#F0ECE6]/[0.10] rounded-xl bg-[#0C0C0C]/40 px-6 py-7"
                    {...fadeUp(0.1 + i * 0.08)}
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#E85D26] mb-3">{c.num}</p>
                    <p className="font-display-serif text-[22px] md:text-[26px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mb-3">{c.topic}</p>
                    <p className="font-body text-[13px] text-[#F0ECE6]/60 leading-[1.6]">{c.hook}</p>
                  </motion.div>
                ))}
              </div>

              {/* Closing line + facts */}
              <div className="mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-end">
                <div className="md:col-span-7">
                  <p className="font-display-serif text-[22px] md:text-[30px] leading-[1.2] tracking-[-0.02em] text-[#F0ECE6]">
                    The mission to the Moon wasn't about space.{' '}
                    <em className="font-display-italic italic text-[#E85D26]">It was always about water.</em>
                  </p>
                  <p className="font-body text-[13px] text-[#F0ECE6]/45 mt-5 leading-[1.6] max-w-[52ch]">
                    Real facts woven in: the ISS recycles 93% of its water, electrolysis splits water for oxygen, and water tanks double as radiation shielding.
                  </p>
                </div>
                <div className="md:col-span-5 md:text-right">
                  <a
                    href="https://aheadofmarket.com/missionwater"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 bg-[#E85D26] text-[#0C0C0C] font-mono text-[11px] uppercase tracking-[0.22em] px-7 py-4 rounded-full hover:bg-[#F0ECE6] transition-colors no-underline"
                  >
                    Play it now
                    <span aria-hidden="true">→</span>
                  </a>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#F0ECE6]/35 mt-4">
                    aheadofmarket.com / missionwater
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ──── EDUCATOR & PARENT DASHBOARD ───────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 items-start">

            <motion.div className="md:col-span-5" {...fadeUp()}>
              <Kicker>Educator &amp; parent view · next build</Kicker>
              <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
                Watching it{' '}
                <em className="font-display-italic italic font-medium text-[#E85D26]">click.</em>
              </h2>
              <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.7] max-w-[46ch]">
                A login for teachers and parents to see how each student is doing — lessons completed, stars earned, submissions in, and where they're stuck. The piece we build next.
              </p>
            </motion.div>

            {/* Roster mockup */}
            <motion.div className="md:col-span-6 md:col-start-7" {...fadeUp(0.12)}>
              <div className="border border-[#F0ECE6]/[0.10] rounded-2xl bg-[#F0ECE6]/[0.02] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0ECE6]/[0.08] bg-[#F0ECE6]/[0.03]">
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[#F0ECE6]/50">Cohort · Water 01</p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#F0ECE6]/35">24 students</p>
                </div>
                <div className="divide-y divide-[#F0ECE6]/[0.06]">
                  {[
                    { name: 'Maya R.', pct: 82, stars: 18 },
                    { name: 'Devon K.', pct: 64, stars: 12 },
                    { name: 'Priya S.', pct: 91, stars: 21 },
                    { name: 'Liam T.', pct: 38, stars: 6 },
                  ].map((s, i) => (
                    <div key={s.name} className="flex items-center gap-5 px-6 py-4">
                      <p className="font-display-serif text-[15px] text-[#F0ECE6] w-[88px] shrink-0">{s.name}</p>
                      <div className="flex-1 h-1.5 rounded-full bg-[#F0ECE6]/[0.08] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[#E85D26]"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${s.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <p className="font-mono text-[10px] tracking-[0.1em] text-[#F0ECE6]/45 w-[36px] text-right shrink-0">{s.pct}%</p>
                      <p className="font-mono text-[10px] tracking-[0.1em] text-[#E85D26] w-[40px] text-right shrink-0">★ {s.stars}</p>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-3 border-t border-[#F0ECE6]/[0.08]">
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/30">Preview · in development</p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ──── ROUGH SCOPE ───────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[760px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>Rough scope</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              What it takes to{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">launch.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              Four pieces. Two are already built. Two we build together.
            </p>
          </motion.div>

          <div className="space-y-3">
            {[
              {
                n: '01',
                title: 'The platform',
                state: 'Built',
                built: true,
                desc: 'The lesson engine, progress tracking, stars, and submissions. Already running. We theme and load it for Water.',
              },
              {
                n: '02',
                title: 'The game',
                state: 'Built · live',
                built: true,
                desc: 'The Mission Water interactive is done and playable. We extend it with new scenarios as the course grows.',
              },
              {
                n: '03',
                title: 'Expert video library',
                state: 'Together',
                built: false,
                desc: 'We film Nancy and the experts MasterClass-tier, or structure your existing footage into the lessons.',
              },
              {
                n: '04',
                title: 'Educator & parent dashboard',
                state: 'New build',
                built: false,
                desc: 'The login where teachers and parents track each student. Scoped and built next.',
              },
            ].map((row, i) => (
              <motion.div
                key={row.n}
                className={`border rounded-xl px-6 md:px-8 py-6 md:py-7 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 md:items-center ${
                  row.built
                    ? 'border-[#E85D26]/30 bg-[#E85D26]/[0.04]'
                    : 'border-[#F0ECE6]/[0.10] bg-[#F0ECE6]/[0.02]'
                }`}
                {...fadeUp(i * 0.06)}
              >
                <div className="md:col-span-4 flex items-center gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26]">{row.n}</span>
                  <h3 className="font-display-serif text-[22px] md:text-[28px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6]">
                    {row.title}
                  </h3>
                </div>
                <p className="md:col-span-6 font-body text-[14px] md:text-[15px] text-[#F0ECE6]/60 leading-[1.6]">
                  {row.desc}
                </p>
                <div className="md:col-span-2 md:text-right">
                  <span className={`font-mono text-[9.5px] uppercase tracking-[0.2em] ${
                    row.built ? 'text-[#E85D26]' : 'text-[#F0ECE6]/45'
                  }`}>
                    {row.state}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──── BUDGET ────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 items-start">

            <motion.div className="md:col-span-5" {...fadeUp()}>
              <Kicker>Budget</Kicker>
              <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
                No price.{' '}
                <em className="font-display-italic italic font-medium text-[#E85D26]">A question.</em>
              </h2>
            </motion.div>

            <motion.div className="md:col-span-6 md:col-start-7" {...fadeUp(0.1)}>
              <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 leading-[1.7] mb-10">
                Two pieces are already built. The rest we scope together. Now's the moment to shape it.
              </p>
              <div className="border border-[#E85D26]/25 rounded-xl bg-[#E85D26]/[0.03] p-8 md:p-10">
                <p className="font-display-serif text-[22px] md:text-[30px] leading-[1.2] tracking-[-0.02em] text-[#F0ECE6]">
                  Based on what you see here — what do you think this partnership is worth to Mission Water?
                </p>
                <p className="font-body text-[14px] text-[#F0ECE6]/50 mt-6 leading-[1.6]">
                  That's the starting point.
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ──── NEXT STEPS (open-ended) ───────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[760px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>Let's talk</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              We move at{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">your pace.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65] max-w-[52ch]">
              What helps Mission Water most. That's the conversation.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                n: '01',
                title: 'Walk the platform.',
                desc: 'See how a cohort runs — lessons, progress, submissions, and the game live.',
              },
              {
                n: '02',
                title: 'Scope the build.',
                desc: 'Decide the expert videos and the educator dashboard. What fits Mission Water.',
              },
              {
                n: '03',
                title: 'How we can help.',
                desc: 'Open conversation. What does Mission Water need right now?',
              },
            ].map((card, i) => (
              <motion.div
                key={card.n}
                className="border border-[#F0ECE6]/[0.10] rounded-xl bg-[#F0ECE6]/[0.02] p-7 md:p-9"
                {...fadeUp(i * 0.07)}
              >
                <span className="font-mono text-[10px] tracking-[0.22em] text-[#E85D26] block mb-5">{card.n}</span>
                <h3 className="font-display-serif text-[22px] md:text-[28px] leading-[1.1] tracking-[-0.015em] text-[#F0ECE6] mb-3">
                  {card.title}
                </h3>
                <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/60 leading-[1.65]">
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── FOOTER ────────────────────────────── */}
      <footer className="px-6 md:px-12 py-16 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <a
              href="https://aheadofmarket.com"
              className="font-display-serif text-[28px] md:text-[36px] leading-[1] tracking-[-0.02em] text-[#F0ECE6] hover:text-[#E85D26] transition-colors no-underline"
            >
              Ahead of Market
            </a>
            <p className="font-body text-[13px] text-[#F0ECE6]/40 mt-2">
              Prepared for Nancy Conrad · Conrad Foundation
            </p>
          </div>
          <div className="flex flex-col md:items-end gap-2">
            <a
              href="mailto:hello@aom-inhouse.com"
              className="font-body text-[15px] text-[#F0ECE6]/70 hover:text-[#E85D26] transition-colors"
            >
              hello@aom-inhouse.com
            </a>
            <a
              href="https://aheadofmarket.com"
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 hover:text-[#E85D26] transition-colors"
            >
              aheadofmarket.com
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
