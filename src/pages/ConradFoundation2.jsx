import React from 'react';
import { motion } from 'framer-motion';

/**
 * ConradFoundation2 — Mission Water interactive platform pitch.
 *
 * Concept: narrative-driven interactive educational platform.
 * Tagline: "Not a course. A world students live inside."
 *
 * Design system matches ConradFoundation.jsx:
 *   - bg `#0C0C0C`, text `#F0ECE6` warm bone, accent `#E85D26` AOM orange
 *   - font-display-serif headlines, font-display-italic italic, font-mono kickers
 *   - Framer Motion fadeUp animations on scroll, noindex meta
 *
 * Route: /conradfoundation2
 * Task id: d3928453-7daa-4736-8da5-d43e25e913ab
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

function SectionDivider() {
  return <div className="border-t border-[#F0ECE6]/[0.08]" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConradFoundation2() {
  React.useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    document.title = 'Mission Water Platform · Conrad Foundation | AOM';
    return () => meta.remove();
  }, []);

  return (
    <div
      className="bg-[#0C0C0C] text-[#F0ECE6] min-h-screen antialiased"
      style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
    >

      {/* ──── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative pt-28 md:pt-44 pb-28 md:pb-40 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto">

          <motion.div {...fadeUp()}>
            <div className="inline-flex items-center gap-3 border border-[#E85D26]/30 bg-[#0C0C0C]/60 backdrop-blur-sm px-3.5 py-1.5 rounded-full mb-12">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
              <Kicker className="!text-[#F0ECE6]">For Nancy Conrad · Conrad Foundation</Kicker>
            </div>
          </motion.div>

          <motion.h1
            className="font-display-serif text-[13vw] md:text-[88px] lg:text-[112px] xl:text-[132px] leading-[0.88] tracking-[-0.035em] max-w-[1050px]"
            {...fadeUp(0.08)}
          >
            Mission{' '}
            <em className="font-display-italic italic font-medium text-[#E85D26]">Water.</em>
          </motion.h1>

          <motion.p
            className="font-display-serif text-[20px] md:text-[28px] leading-[1.2] tracking-[-0.02em] text-[#F0ECE6]/75 mt-8 max-w-[55ch]"
            {...fadeUp(0.16)}
          >
            A story about the future of water.{' '}
            <em className="font-display-italic italic text-[#F0ECE6]/55">Built for the next generation.</em>
          </motion.p>

          <motion.p
            className="font-body text-[15px] md:text-[17px] text-[#F0ECE6]/50 mt-6 leading-[1.65] max-w-[48ch]"
            {...fadeUp(0.22)}
          >
            Not a course. A world students live inside — story-driven, interactive, built to hold attention and teach real science.
          </motion.p>

        </div>
      </section>

      <SectionDivider />

      {/* ──── THE STORY: 3-CHAPTER ARC ─────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-36">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="mb-16 md:mb-20 max-w-[680px]" {...fadeUp()}>
            <Kicker>The story</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Three chapters.{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">One mission.</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {[
              {
                num: '01',
                title: 'Earth is running out.',
                body: 'Water scarcity. Local problems. Students think like engineers.',
              },
              {
                num: '02',
                title: 'The Moon holds the answer.',
                body: 'Resource discovery, extraction. The real mission to space.',
              },
              {
                num: '03',
                title: 'The future looks like this.',
                body: 'Students design and defend a water-secure world.',
              },
            ].map((chapter, i) => (
              <motion.div
                key={chapter.num}
                className="border border-[#F0ECE6]/[0.10] rounded-2xl bg-[#F0ECE6]/[0.02] p-8 md:p-10 flex flex-col gap-8"
                {...fadeUp(i * 0.08)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26]">
                    Chapter {chapter.num}
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E85D26]/40" />
                </div>
                <div className="mt-auto">
                  <h3 className="font-display-serif text-[26px] md:text-[32px] lg:text-[38px] leading-[1.05] tracking-[-0.025em] text-[#F0ECE6] mb-4">
                    {chapter.title}
                  </h3>
                  <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/55 leading-[1.65]">
                    {chapter.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      <SectionDivider />

      {/* ──── HOW THEY LEARN ─────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-36">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="mb-16 md:mb-20 max-w-[680px]" {...fadeUp()}>
            <Kicker>The platform</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Games. Story.{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">Real science.</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {[
              {
                label: 'Games',
                headline: 'Decision-based challenges.',
                body: 'Resource allocation, survival scenarios, engineering trade-offs. Science dressed up as choices.',
              },
              {
                label: 'Interactive content',
                headline: 'Content you move through.',
                body: 'Not video you watch. Maps, simulations, branching paths. The student is always active.',
              },
              {
                label: 'Storyline',
                headline: 'A narrative thread.',
                body: 'Characters, stakes, a mission that unfolds. Every lesson connected. Every week earns the next.',
              },
              {
                label: 'Submissions',
                headline: 'Students present their solutions.',
                body: 'Document findings, build a proposal, get reviewed. Real stakes, real work.',
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.label}
                className={`border rounded-2xl p-8 md:p-10 ${
                  i === 0
                    ? 'border-[#E85D26]/35 bg-[#E85D26]/[0.04]'
                    : 'border-[#F0ECE6]/[0.10] bg-[#F0ECE6]/[0.02]'
                }`}
                {...fadeUp(i * 0.07)}
              >
                <Kicker className="mb-5">{feature.label}</Kicker>
                <h3 className="font-display-serif text-[24px] md:text-[32px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mb-4">
                  {feature.headline}
                </h3>
                <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/55 leading-[1.65]">
                  {feature.body}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      <SectionDivider />

      {/* ──── THE AUDIENCE ───────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-36">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="mb-16 md:mb-20 max-w-[680px]" {...fadeUp()}>
            <Kicker>Who it's for</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              Three{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">audiences.</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                audience: 'Students',
                ages: 'Ages 13–22',
                headline: 'They play the story.',
                body: 'Games are the hook. Science is underneath. Every choice moves the mission forward.',
              },
              {
                audience: 'Educators',
                ages: 'Teachers & administrators',
                headline: 'They run the cohort.',
                body: 'Lesson plans, pacing guides, assessment tools. The platform does the heavy lifting.',
              },
              {
                audience: 'Parents',
                ages: 'Family view',
                headline: 'They watch progress.',
                body: 'Clean view of where their kid is, what they\'ve built, what\'s coming next.',
              },
            ].map((tile, i) => (
              <motion.div
                key={tile.audience}
                className="border border-[#F0ECE6]/[0.10] rounded-2xl bg-[#F0ECE6]/[0.02] p-8 md:p-10"
                {...fadeUp(i * 0.08)}
              >
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <Kicker>{tile.audience}</Kicker>
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/35 mt-1">
                      {tile.ages}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full border border-[#E85D26]/50 mt-1" />
                </div>
                <h3 className="font-display-serif text-[26px] md:text-[30px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mb-4">
                  {tile.headline}
                </h3>
                <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/55 leading-[1.65]">
                  {tile.body}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      <SectionDivider />

      {/* ──── PETE CONRAD ────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20 items-center">

            <motion.div className="md:col-span-5" {...fadeUp()}>
              <Kicker>The foundation</Kicker>
              <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
                Founded in{' '}
                <em className="font-display-italic italic font-medium text-[#E85D26]">his honor.</em>
              </h2>
            </motion.div>

            <motion.div className="md:col-span-6 md:col-start-7" {...fadeUp(0.1)}>
              <div className="relative border border-[#E85D26]/20 rounded-xl bg-[#E85D26]/[0.03] p-8 md:p-10">
                <p className="font-display-serif text-[20px] md:text-[26px] leading-[1.3] tracking-[-0.02em] text-[#F0ECE6]">
                  Pete Conrad. Apollo 12. The third man to walk on the moon.
                </p>
                <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/55 mt-5 leading-[1.65]">
                  The belief that anyone can reach the stars. That's the emotional anchor for everything Mission Water is built on.
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ──── AOM'S ROLE ─────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-36">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="mb-16 md:mb-20 max-w-[680px]" {...fadeUp()}>
            <Kicker>What we deliver</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              What we build.{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">What we deliver.</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                n: '01',
                title: 'Platform',
 desc: 'The full interactive experience, games, story, submissions, progress tracking.',
              },
              {
                n: '02',
                title: 'Content',
                desc: 'Story arc, game design, interactive scenarios. Every chapter built from scratch.',
              },
              {
                n: '03',
                title: 'Video',
                desc: 'Nancy and experts filmed MasterClass-tier, embedded inside the chapters.',
              },
              {
                n: '04',
                title: 'Marketing',
                desc: 'Reaching educators, parents, and students at launch.',
              },
            ].map((item, i) => (
              <motion.div
                key={item.n}
                className={`border rounded-2xl p-7 md:p-8 ${
                  i === 0
                    ? 'border-[#E85D26]/35 bg-[#E85D26]/[0.04]'
                    : 'border-[#F0ECE6]/[0.10] bg-[#F0ECE6]/[0.02]'
                }`}
                {...fadeUp(i * 0.07)}
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26] block mb-6">
                  {item.n}
                </span>
                <h3 className="font-display-serif text-[24px] md:text-[28px] leading-[1.05] tracking-[-0.02em] text-[#F0ECE6] mb-3">
                  {item.title}
                </h3>
                <p className="font-body text-[13px] md:text-[14px] text-[#F0ECE6]/55 leading-[1.65]">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      <SectionDivider />

      {/* ──── FOOTER / CTA ───────────────────────────────────────────────── */}
      <footer className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="max-w-[680px] mb-16" {...fadeUp()}>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6]">
              Let's talk about{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">Mission Water.</em>
            </h2>
          </motion.div>

          <motion.div
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 pt-12 border-t border-[#F0ECE6]/[0.08]"
            {...fadeUp(0.1)}
          >
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
                className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/80 hover:text-[#E85D26] transition-colors"
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
          </motion.div>

        </div>
      </footer>

    </div>
  );
}