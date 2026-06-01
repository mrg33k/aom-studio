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
 * Structure: Space hook → 20 years → Water is first → Platform → Video (AOM or yours) → Budget → Next steps
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
  const [platformTab, setPlatformTab] = useState('cohort');

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
            is in{' '}
            <em className="font-display-italic italic font-medium text-[#E85D26]">space.</em>
          </motion.h1>

          <motion.p
            className="font-body text-[17px] md:text-[20px] text-[#F0ECE6]/75 mt-10 leading-[1.6] max-w-[54ch]"
            {...fadeUp(0.2)}
          >
            Twenty years of curriculum. A proven model. Now the platform to bring it to the world.
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
          <motion.div className="max-w-[760px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>What we're offering</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              A platform built for{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">these courses.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              Expert library, cohort management, live sessions, submissions. Built for Water. Reusable for Space, Plants, and beyond.
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
                ['cohort', 'Cohort'],
                ['schedule', 'Schedule'],
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
            <div className="px-6 md:px-8 py-10 md:py-12 min-h-[300px]">

              {platformTab === 'cohort' && (
                <div>
                  <Kicker className="mb-4">Water Needs Your Voice</Kicker>
                  <h3 className="font-display-serif text-[28px] md:text-[44px] leading-[1.0] tracking-[-0.025em] max-w-[700px] mb-10">
                    Pick a local water issue. Propose a solution. Present it.
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    {[
                      ['Ages', '13–22'],
                      ['Duration', '6 weeks'],
                      ['Format', 'Live + on-demand'],
                    ].map(([label, value]) => (
                      <div key={label} className="border-t border-[#F0ECE6]/[0.10] pt-4">
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/40 mb-2">{label}</p>
                        <p className="font-display-serif text-[20px] md:text-[24px] leading-[1.1] tracking-[-0.02em] text-[#F0ECE6]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {platformTab === 'schedule' && (
                <div className="space-y-0">
                  {[
                    ['Week 1–2', 'Water systems, climate, and scarcity'],
                    ['Week 3', 'Agriculture, cities, and the Colorado River'],
                    ['Week 4', 'Expert library — pre-recorded sessions'],
                    ['Week 5', 'Student dilemmas and class defense'],
                    ['Week 6', 'Showcase and deliverables'],
                  ].map(([week, title]) => (
                    <div key={week} className="flex items-start justify-between gap-4 py-4 border-b border-[#F0ECE6]/[0.08]">
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#E85D26] shrink-0">{week}</p>
                      <p className="font-display-serif text-[16px] md:text-[18px] leading-[1.2] tracking-[-0.01em] text-[#F0ECE6] flex-1 text-right">{title}</p>
                    </div>
                  ))}
                </div>
              )}

              {platformTab === 'submit' && (
                <div>
                  <h3 className="font-display-serif text-[24px] md:text-[36px] leading-[1.05] tracking-[-0.02em] max-w-[600px] mb-4">
                    Argue your case. Upload your proof.
                  </h3>
                  <p className="font-body text-[14px] text-[#F0ECE6]/55 mb-8 max-w-[50ch]">
                    Research a local water issue. Build a proposal. Present it. The platform handles the submission.
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

      {/* ──── YOUR VIDEO OR OURS ────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[760px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>Video production</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Your video or{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">ours.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              Two ways to build the expert library. Nancy chooses what fits.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Option A */}
            <motion.div
              className="border border-[#E85D26]/35 rounded-xl bg-[#E85D26]/[0.04] p-8 md:p-10 flex flex-col gap-6"
              {...fadeUp(0.05)}
            >
              <span className="font-mono text-[10px] tracking-[0.22em] text-[#E85D26]">Option A</span>
              <div>
                <h3 className="font-display-serif text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mb-4">
                  AOM produces{' '}
                  <em className="font-display-italic italic text-[#E85D26]">it.</em>
                </h3>
                <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/70 leading-[1.7]">
                  We film Nancy and every expert — lit, framed, MasterClass-tier. Each session builds the library.
                </p>
              </div>
              <ul className="space-y-3 mt-auto pt-6 border-t border-[#F0ECE6]/[0.10]">
                {[
                  'Professional filming — location or studio',
                  'Edited and archived in the platform library',
                  'Reusable across Water, Space, Plants',
                ].map((item, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] text-[#E85D26] flex-shrink-0">→</span>
                    <span className="font-body text-[13px] md:text-[14px] text-[#F0ECE6]/65 leading-[1.5]">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Option B */}
            <motion.div
              className="border border-[#F0ECE6]/[0.12] rounded-xl bg-[#F0ECE6]/[0.02] p-8 md:p-10 flex flex-col gap-6"
              {...fadeUp(0.10)}
            >
              <span className="font-mono text-[10px] tracking-[0.22em] text-[#E85D26]">Option B</span>
              <div>
                <h3 className="font-display-serif text-[28px] md:text-[40px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mb-4">
                  Bring your own{' '}
                  <em className="font-display-italic italic text-[#E85D26]">video.</em>
                </h3>
                <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/70 leading-[1.7]">
                  Already have footage? We structure it, host it on the platform. You own the content. We build around it.
                </p>
              </div>
              <ul className="space-y-3 mt-auto pt-6 border-t border-[#F0ECE6]/[0.10]">
                {[
                  'Upload existing footage to the platform',
                  'We structure it into the course format',
                  'Platform handles delivery and access',
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
                title: 'Talk through the platform.',
                desc: 'See what a cohort looks like, how the library runs, how students submit.',
              },
              {
                n: '02',
                title: 'Explore video options.',
                desc: "Walk through what fits — produce it together or bring your own footage. No commitment.",
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
                Scope and structure are still open. Now's the moment to shape it together.
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
