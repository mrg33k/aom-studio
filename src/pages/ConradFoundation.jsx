import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * ConradFoundation — pitch page for Nancy Conrad / Conrad Foundation.
 *
 * Design system mirrors HigherOrbitsPitch (Higher Orbits):
 *   - bg `#0C0C0C` ground, text `#F0ECE6` warm bone, accent `#E85D26` AOM orange
 *   - font-display-serif (Playfair Display) headlines, italic accent in orange
 *   - font-mono kicker 10.5px tracking-[0.28em] uppercase
 *   - Framer Motion fadeUp animations on scroll
 *   - Water as visual + conceptual highlight throughout
 *
 * R1 redesign — 2026-05-30 — dark theme, Higher Orbits style
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
      <p className="font-display-serif text-[56px] md:text-[80px] leading-[0.9] tracking-[-0.025em] text-[#F0ECE6]">
        {value}
      </p>
      <p className="font-body text-[13px] md:text-[14px] text-[#F0ECE6]/55 mt-3 leading-[1.5] max-w-[20ch]">
        {label}
      </p>
    </motion.div>
  );
}

function Deliverable({ title, desc }) {
  return (
    <li className="flex gap-5 py-6 border-b border-[#F0ECE6]/[0.08] last:border-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mt-[14px] flex-shrink-0" />
      <div className="flex-1">
        <p className="font-display-serif text-[22px] md:text-[26px] leading-[1.15] tracking-[-0.015em] text-[#F0ECE6] mb-2">
          {title}
        </p>
        <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/65 leading-[1.65]">
          {desc}
        </p>
      </div>
    </li>
  );
}

function ProcessStep({ n, title, body }) {
  return (
    <motion.div className="flex gap-6 md:gap-8" {...fadeUp(n * 0.06)}>
      <span className="font-mono text-[11px] tracking-[0.22em] text-[#E85D26] pt-[7px] w-8 flex-shrink-0">
        {String(n + 1).padStart(2, '0')}
      </span>
      <div className="flex-1 pb-10 border-b border-[#F0ECE6]/[0.08] last:border-0 last:pb-0">
        <p className="font-display-serif text-[26px] md:text-[32px] leading-[1.1] tracking-[-0.02em] text-[#F0ECE6] mb-3">
          {title}
        </p>
        <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/65 leading-[1.7] max-w-[55ch]">
          {body}
        </p>
      </div>
    </motion.div>
  );
}

function OutcomeCard({ n, title, desc, delay = 0 }) {
  return (
    <motion.div
      className="border border-[#F0ECE6]/[0.10] rounded-xl bg-[#F0ECE6]/[0.02] p-6 md:p-8"
      {...fadeUp(delay)}
    >
      <span className="font-mono text-[10px] tracking-[0.22em] text-[#E85D26] block mb-4">
        {String(n).padStart(2, '0')}
      </span>
      <h3 className="font-display-serif text-[22px] md:text-[28px] leading-[1.15] tracking-[-0.02em] text-[#F0ECE6] mb-3">
        {title}
      </h3>
      <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/65 leading-[1.65]">
        {desc}
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

      {/* ──────────────────────────────── HERO ────────────────────────────── */}
      <section className="relative pt-28 md:pt-40 pb-24 md:pb-32 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto">
          <motion.div {...fadeUp()}>
            <div className="inline-flex items-center gap-3 border border-[#E85D26]/30 bg-[#0C0C0C]/60 backdrop-blur-sm px-3.5 py-1.5 rounded-full mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
              <Kicker className="!text-[#F0ECE6]">For Nancy Conrad · Conrad Foundation</Kicker>
            </div>
          </motion.div>

          <motion.h1
            className="font-display-serif text-[14vw] md:text-[80px] lg:text-[104px] xl:text-[128px] leading-[0.88] tracking-[-0.035em] max-w-[1000px]"
            {...fadeUp(0.1)}
          >
            What happens when there's{' '}
            <em className="font-display-italic italic font-medium text-[#E85D26]">no more water?</em>
          </motion.h1>

          <motion.p
            className="font-body text-[17px] md:text-[20px] text-[#F0ECE6]/75 mt-10 leading-[1.6] max-w-[58ch]"
            {...fadeUp(0.2)}
          >
            Twenty years. Critical thinking. Youth. Now the world needs to find Mission Water — and AOM is the activation engine that makes it happen.
          </motion.p>

          <motion.p
            className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#F0ECE6]/45 mt-8"
            {...fadeUp(0.28)}
          >
            The marketing + activation engine for Mission Water
          </motion.p>
        </div>
      </section>

      {/* ──────────────────────────── FOUNDATION STATS ────────────────────── */}
      <section className="px-6 md:px-12 pb-24 md:pb-32">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-14 border-t border-[#F0ECE6]/[0.10] pt-14 md:pt-20">
            <StatBlock value="20+" label="years. Critical thinking in youth." delay={0.05} />
            <StatBlock value="3" label="continents. Alabama to Afghanistan." delay={0.10} />
            <StatBlock value="1st" label="in the curriculum line. Water, Space, Plants." delay={0.15} />
            <StatBlock value="Conrad" label="Challenge. The model is proven." delay={0.20} />
          </div>
        </div>
      </section>

      {/* ──────────────────────────── NANCY'S VISION ──────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 items-start">

          {/* Quote column */}
          <motion.div className="md:col-span-5" {...fadeUp()}>
            <div className="relative border border-[#E85D26]/25 rounded-xl bg-[#E85D26]/[0.04] p-8 md:p-10">
              {/* Decorative quotemark */}
              <span
                className="absolute top-6 left-8 font-display-serif text-[80px] md:text-[100px] leading-none text-[#E85D26]/20 select-none pointer-events-none"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <blockquote className="relative pt-10">
                <p className="font-display-serif text-[26px] md:text-[34px] leading-[1.25] tracking-[-0.02em] text-[#F0ECE6]">
                  Water is not just a resource — it's the entry point for teaching young people
                  how to{' '}
                  <em className="font-display-italic italic text-[#E85D26]">
                    think critically and solve the problems that matter.
                  </em>
                </p>
                <footer className="mt-8 border-t border-[#F0ECE6]/[0.10] pt-6">
                  <p className="font-display-serif text-[17px] md:text-[19px] text-[#F0ECE6]/80">
                    Nancy Conrad
                  </p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/40 mt-1">
                    Founder · Conrad Foundation
                  </p>
                </footer>
              </blockquote>
            </div>
          </motion.div>

          {/* Text column */}
          <motion.div className="md:col-span-7 md:col-start-6" {...fadeUp(0.12)}>
            <Kicker>Nancy's vision</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Twenty years building the{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">model.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/75 mt-8 leading-[1.7]">
              The Conrad Challenge proved the model — Alabama to Afghanistan. Mission Water is first in a curriculum line: Water, Space, Plants.
            </p>
            <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/60 mt-5 leading-[1.7]">
              Plants in space extend the water curriculum — hydroponics, closed-loop systems, food security in zero-g. Every lesson here is a survival skill for Mars.
            </p>
            <p className="font-display-serif text-[22px] md:text-[26px] leading-[1.2] tracking-[-0.02em] text-[#F0ECE6] pt-6 mt-2">
              Now she needs the world to find it.{' '}
              <em className="font-display-italic italic text-[#E85D26]">That's where we come in.</em>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────── FIVE OUTCOMES ───────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[760px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>Five core outcomes</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              What a student becomes after{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">Water.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              Every student who completes Water Needs Your Voice walks away shaped in five ways. Not soft goals — curriculum design.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <OutcomeCard
              n={1}
              title="Water Literate"
              desc="Rivers, aquifers, climate realities. The science before the policy debate."
              delay={0.05}
            />
            <OutcomeCard
              n={2}
              title="Civically Ready"
              desc="Water law, governance, public process. How decisions get made — and how to navigate them."
              delay={0.10}
            />
            <OutcomeCard
              n={3}
              title="Culturally Grounded"
              desc="Indigenous stewardship, rural knowledge, equity at the center. Water is history, culture, identity."
              delay={0.15}
            />
            <OutcomeCard
              n={4}
              title="Workforce Ready"
              desc="STEM, infrastructure, conservation, public service — pathways into the crisis."
              delay={0.20}
            />
            <OutcomeCard
              n={5}
              title="Community Connected"
              desc="Families engaged. Local conversations. Real stakes."
              delay={0.25}
            />
            <motion.div
              className="border border-[#E85D26]/25 rounded-xl bg-gradient-to-br from-[#E85D26]/[0.06] to-transparent p-6 md:p-8 flex flex-col justify-between"
              {...fadeUp(0.30)}
            >
              <p className="font-display-serif text-[20px] md:text-[24px] leading-[1.2] tracking-[-0.015em] text-[#F0ECE6]">
                Water is first. Space, Plants, and beyond are next.
              </p>
              <p className="font-body text-[13px] text-[#F0ECE6]/50 mt-4 leading-[1.6]">
                The NoBoxToolBox model scales to every challenge the next generation inherits.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ──────────────────────── PROGRAM STRUCTURE ───────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
          <motion.div className="md:col-span-4" {...fadeUp()}>
            <Kicker>Program structure</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              How the{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">cohort runs.</em>
            </h2>
            <div className="mt-10 space-y-4 border-t border-[#F0ECE6]/[0.08] pt-8">
              {[
                ['Ages', '13–22 · Out-of-school'],
                ['Duration', '6 weeks · 12 sessions'],
                ['Format', 'Live + on-demand'],
                ['Deliverable', 'Pick a water issue. Argue your solution. Present it.'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#E85D26] w-20 flex-shrink-0 pt-0.5">{label}</p>
                  <p className="font-body text-[14px] text-[#F0ECE6]/75 leading-[1.5]">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="md:col-span-8 md:col-start-6">
            {[
              { title: 'Week 1–2: The water system.', body: 'Rivers, aquifers, climate. Urban supply and scarcity. The Colorado River as the case study. Learn the system before arguing about it.' },
              { title: 'Week 3: Agriculture vs. everything.', body: 'Farming, industry, cities — who gets the water? Students dig into who decides when there isn\'t enough.' },
              { title: 'Week 4: The expert library.', body: 'Water scientists, engineers, indigenous leaders, policy makers — on-demand. Filmed by AOM, not a Zoom recording.' },
              { title: 'Week 5: The dilemma round.', body: 'Phoenix farmers vs. Vegas casinos. Both pull from the Colorado. Whose claim is stronger? 90 seconds. Class votes.' },
              { title: 'Week 6: Showcase.', body: 'Students present their local water issue and solution. Families, teachers, community in the room. Real stakes.' },
            ].map((s, i) => (
              <ProcessStep key={i} n={i} title={s.title} body={s.body} />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── THE FUTURE OF WATER IN SPACE ───────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 items-center">
            <motion.div className="md:col-span-6" {...fadeUp()}>
              <Kicker>The expanding curriculum</Kicker>
              <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
                The future of water is{' '}
                <em className="font-display-italic italic font-medium text-[#E85D26]">in space.</em>
              </h2>
            </motion.div>
            <motion.div className="md:col-span-6" {...fadeUp(0.12)}>
              <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 leading-[1.7]">
                Water scarcity on Earth is the training ground for the hardest problem in space — how do you purify, recycle, and sustain every drop when there's no more? Mission Water doesn't stop at Earth's edge. Mars habitation requires everything learned here, and more.
              </p>
              <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/55 mt-5 leading-[1.65]">
                Water is the first chapter. Space is where the stakes get existential.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── PLATFORM DEMO ──────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[760px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>The platform</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Built for Water.{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">Reusable for everything after.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              Expert library, cohort management, submissions, live sessions — the infrastructure every NoBoxToolBox course runs on. Water builds it. Space and Plants inherit it.
            </p>
          </motion.div>

          {/* Platform shell */}
          <motion.div
            className="border border-[#F0ECE6]/[0.10] rounded-2xl bg-[#F0ECE6]/[0.02] overflow-hidden"
            {...fadeUp(0.1)}
          >
            {/* Shell chrome */}
            <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-[#F0ECE6]/[0.08] bg-[#F0ECE6]/[0.03]">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#F0ECE6]/50">
                conradfoundation.org / masterclass
              </p>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
                <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/40">
                  Live
                </p>
              </div>
            </div>

            {/* Tab nav */}
            <div className="flex flex-wrap gap-8 px-6 md:px-8 pt-4 border-b border-[#F0ECE6]/[0.08]">
              {[
                ['cohort', 'cohort home'],
                ['schedule', 'schedule'],
                ['expert', 'outcomes'],
                ['deliverables', 'submit'],
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
            <div className="px-6 md:px-8 py-10 md:py-12 min-h-[380px]">

              {platformTab === 'cohort' && (
                <div>
                  <Kicker className="mb-4">Water Needs Your Voice</Kicker>
                  <h3 className="font-display-serif text-[28px] md:text-[44px] leading-[1.0] tracking-[-0.025em] max-w-[800px] mb-10">
                    Pick a local water issue. Propose a solution. Present it.
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    {[
                      ['Ages', '13–22 · Out-of-school'],
                      ['Duration', '6 weeks · 12 sessions'],
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
                    ['Week 1', 'Water systems & climate'],
                    ['Week 2', 'Urban water — supply & scarcity'],
                    ['Week 3', 'Agriculture & the Colorado River'],
                    ['Week 4', 'Expert library — pre-recorded'],
                    ['Week 5', 'Student dilemmas & defense'],
                    ['Week 6', 'Showcase + deliverables'],
                  ].map(([week, title]) => (
                    <div
                      key={week}
                      className="flex items-start justify-between gap-4 py-4 border-b border-[#F0ECE6]/[0.08]"
                    >
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#E85D26] shrink-0">{week}</p>
                      <p className="font-display-serif text-[16px] md:text-[18px] leading-[1.2] tracking-[-0.01em] text-[#F0ECE6] flex-1 text-right">{title}</p>
                    </div>
                  ))}
                </div>
              )}

              {platformTab === 'expert' && (
                <div>
                  <Kicker className="mb-6">Five outcomes</Kicker>
                  <div className="space-y-0">
                    {[
                      ['Water Literate', 'Rivers, aquifers, climate realities — how water actually works.'],
                      ['Civically Ready', 'Water law, governance, public process — how decisions get made.'],
                      ['Culturally Grounded', 'Indigenous stewardship, rural knowledge, equity at the center.'],
                      ['Workforce Ready', 'STEM, infrastructure, conservation, public service — pathways open.'],
                      ['Community Connected', 'Families engaged. Local conversations. Real stakes.'],
                    ].map(([outcome, desc]) => (
                      <div key={outcome} className="border-b border-[#F0ECE6]/[0.08] py-5 last:border-0">
                        <h4 className="font-display-serif text-[18px] md:text-[20px] leading-[1.2] tracking-[-0.015em] text-[#F0ECE6] mb-1">{outcome}</h4>
                        <p className="font-body text-[14px] md:text-[15px] leading-[1.5] text-[#F0ECE6]/55">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {platformTab === 'deliverables' && (
                <div>
                  <h3 className="font-display-serif text-[24px] md:text-[36px] leading-[1.05] tracking-[-0.02em] max-w-[600px] mb-4">
                    Argue your case. Upload your proof.
                  </h3>
                  <p className="font-body text-[14px] text-[#F0ECE6]/55 mb-8 max-w-[50ch]">
                    Research a local water issue. Build a proposal. Present it. The platform handles the submission, the cohort handles the critique.
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

      {/* ──────────────────────────── WHY AOM ────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">
          <motion.div className="md:col-span-4" {...fadeUp()}>
            <Kicker>The activation engine</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Why{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">AOM.</em>
            </h2>
          </motion.div>

          <div className="md:col-span-8 md:col-start-6">
            <motion.p
              className="font-body text-[17px] md:text-[19px] text-[#F0ECE6]/80 leading-[1.7] mb-10"
              {...fadeUp(0.1)}
            >
              The curriculum exists. The model is proven. Mission Water needs one thing now: an activation engine — marketing, media, expert capture, partnership infrastructure.
            </motion.p>

            <ul className="border border-[#F0ECE6]/[0.10] rounded-2xl bg-[#F0ECE6]/[0.02] px-6 md:px-8">
              <Deliverable
                title="Expert filming, done right."
                desc="Standard Zoom recordings are washed out and gone. AOM films experts lit, framed, archived — reusable in the platform library."
              />
              <Deliverable
                title="Critical thinking dilemmas, built in."
                desc="Phoenix farmers vs. Vegas casinos. Both pull from the Colorado. 90 seconds. Class votes. AOM designs and produces this engine."
              />
              <Deliverable
                title="Partnership infrastructure, on-brand."
                desc="Sponsors put their name on the platform, an expert, a course, or a dilemma. AOM builds the pitch deck, assets, and identity that makes a sponsor say yes."
              />
              <Deliverable
                title="The curriculum line, scaled."
                desc="Water is first. AOM builds the activation model — and replicates it when Space, Plants, and the next challenge arrive."
              />
            </ul>
          </div>
        </div>
      </section>

      {/* ──────────────────────── PARTNERSHIP ENGINE ──────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[760px] mb-16 md:mb-20" {...fadeUp()}>
            <Kicker>Sponsorship</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Four ways sponsors put their name on the{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">mission.</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                n: '01',
                title: 'Sponsor the Platform',
                desc: 'Their name on the infrastructure every course runs on — Water, Space, Plants, and beyond. Permanent infrastructure credit.',
              },
              {
                n: '02',
                title: 'Sponsor an Expert',
                desc: 'A library asset that lives beyond the cohort. AOM films the expert. The sponsor owns the session credit forever.',
              },
              {
                n: '03',
                title: 'Sponsor a Course',
                desc: "Their name on a hook students remember for years. 'Water Needs Your Voice, presented by [Sponsor].' That's brand in education.",
              },
              {
                n: '04',
                title: 'Sponsor a Dilemma',
                desc: "Their domain becomes a session. Students argue in their world — pipeline economics, aquifer rights, municipal policy. Real industry, real stakes.",
              },
            ].map((cell, i) => (
              <motion.div
                key={i}
                className="border border-[#F0ECE6]/[0.10] rounded-xl bg-[#F0ECE6]/[0.02] p-6 md:p-8"
                {...fadeUp(i * 0.06)}
              >
                <span className="font-mono text-[10px] tracking-[0.22em] text-[#E85D26] block mb-4">{cell.n}</span>
                <h3 className="font-display-serif text-[22px] md:text-[28px] leading-[1.1] tracking-[-0.02em] text-[#F0ECE6] mb-3">
                  {cell.title}
                </h3>
                <p className="font-body text-[14px] md:text-[15px] leading-[1.65] text-[#F0ECE6]/65">
                  {cell.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────── CURRICULUM LINE ─────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[760px] mb-14" {...fadeUp()}>
            <Kicker>What comes next</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.95] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Water is first. The system scales to{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">Space, Plants, and beyond.</em>
            </h2>
          </motion.div>

          <div className="space-y-3">
            {[
              { num: '01', topic: 'Water', hook: 'What happens when there\'s no more water?', status: 'Live now' },
              { num: '02', topic: 'Space', hook: 'What happens when water is the rarest resource in the universe?', status: 'Next' },
              { num: '03', topic: 'Plants', hook: 'Plant Growth in Space', status: 'Coming' },
              { num: '04', topic: 'Future', hook: 'The Future of Water in Space', status: 'TBD' },
            ].map((row, i) => (
              <motion.div
                key={row.num}
                className="border border-[#F0ECE6]/[0.10] rounded-xl px-6 py-5 md:py-6 flex items-start justify-between gap-6 bg-[#F0ECE6]/[0.02]"
                {...fadeUp(i * 0.06)}
              >
                <div className="flex gap-6 flex-1 min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#E85D26] shrink-0 pt-0.5">{row.num}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/35 mb-1">{row.topic}</p>
                    <p className="font-display-serif text-[16px] md:text-[18px] leading-[1.2] text-[#F0ECE6]">{row.hook}</p>
                  </div>
                </div>
                <p className={`font-mono text-[9.5px] uppercase tracking-[0.22em] shrink-0 pt-1 ${row.status === 'Live now' ? 'text-[#E85D26]' : 'text-[#F0ECE6]/35'}`}>
                  {row.status}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── CLOSE / CTA ────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">

          {/* Hero CTA card */}
          <motion.div
            className="relative rounded-3xl border border-[#E85D26]/40 bg-gradient-to-br from-[#E85D26]/[0.06] to-transparent p-8 md:p-14 mb-10 overflow-hidden"
            {...fadeUp()}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 items-start">
              <div className="md:col-span-7">
                <Kicker className="!text-[#E85D26]">Next step</Kicker>
                <h2 className="font-display-serif text-[44px] md:text-[72px] leading-[0.92] tracking-[-0.025em] text-[#F0ECE6] mt-5">
                  We didn't bring you a deck.{' '}
                  <em className="font-display-italic italic font-medium text-[#E85D26]">We built this page.</em>
                </h2>
                <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/75 mt-7 leading-[1.65] max-w-[48ch]">
                  One week with Patrik and the AOM team. Full activation plan for Water — expert filming, marketing assets, partnership pitch deck, sponsorship infrastructure.
                </p>
              </div>

              <div className="md:col-span-4 md:col-start-9 md:border-l md:border-[#F0ECE6]/[0.10] md:pl-10">
                <Kicker className="!text-[#F0ECE6]/45 mb-5">What we need</Kicker>
                <ul className="space-y-5">
                  {[
                    'An intro call with Nancy',
                    'Access to NoBoxToolBox materials',
                    'A week to get this right',
                  ].map((item, i) => (
                    <li key={i} className="flex items-baseline gap-3">
                      <span className="font-mono text-[10px] tracking-[0.22em] text-[#E85D26] flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="font-body text-[15px] text-[#F0ECE6]/75">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Closing line */}
          <motion.div
            className="rounded-2xl border border-[#F0ECE6]/[0.06] bg-[#F0ECE6]/[0.015] p-7 md:p-10"
            {...fadeUp(0.1)}
          >
            <Kicker className="!text-[#F0ECE6]/40 mb-4">AOM Studio</Kicker>
            <p className="font-display-serif text-[22px] md:text-[30px] leading-[1.2] tracking-[-0.02em] text-[#F0ECE6]">
              Water is the crisis the next generation inherits.{' '}
              <em className="font-display-italic italic text-[#E85D26]">Nancy's given them the tools to fight back. We help the world find her.</em>
            </p>
          </motion.div>
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
              Pitch prepared for Nancy Conrad · Conrad Foundation
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
