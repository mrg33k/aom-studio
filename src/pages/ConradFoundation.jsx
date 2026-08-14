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
 * R8 — 2026-06-08 — LEAN TRIM. Patrik: "way too much information. shorten this
 *      way down and showcase more of what's being built. once the game + Mission
 *      Water is built we finalize." Cut from 9 sections to 4: Hero → The Game
 *      (live playable demo) → The Platform (interactive) → light CTA. Dropped the
 *      20-years narrative, water-is-first, expert-video options, educator
 *      dashboard mockup, rough scope, budget, and 3-card next steps. This is a
 *      working showcase, not a finished pitch — finalize once the build is done.
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

      {/* ──── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative pt-28 md:pt-40 pb-20 md:pb-28 px-6 md:px-12">
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
            className="font-body text-[17px] md:text-[20px] text-[#F0ECE6]/75 mt-10 leading-[1.6] max-w-[52ch]"
            {...fadeUp(0.2)}
          >
            A platform that delivers the course. A game that makes students feel it. Both are built — play and explore below.
          </motion.p>
        </div>
      </section>

      {/* ──── THE GAME · LIVE DEMO ──────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-20 md:py-28 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[820px] mb-12 md:mb-14" {...fadeUp()}>
            <Kicker>The game · playable now</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              An interactive that makes them{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">feel it.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              A decision game from Earth to the Moon. Every choice has a consequence, every fact is true. Play it right here.
            </p>
          </motion.div>

          {/* Live demo embed */}
          <motion.div
            className="border border-[#E85D26]/30 rounded-2xl bg-[#0C0C0C] overflow-hidden"
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
 title="Mission Water, interactive demo"
              className="w-full h-[560px] md:h-[680px] border-0 block bg-[#0C0C0C]"
              loading="lazy"
            />
          </motion.div>
        </div>
      </section>

      {/* ──── THE PLATFORM ──────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-20 md:py-28 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[820px] mb-12 md:mb-14" {...fadeUp()}>
            <Kicker>The platform · already built</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[72px] leading-[0.93] tracking-[-0.025em] text-[#F0ECE6] mt-6">
              The course delivers{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">itself.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/70 mt-8 leading-[1.65]">
              The same engine running a 12-week program right now — self-paced lessons, progress tracking, gold stars, and teach-back submissions. Themed for Water.
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
                    Short, focused lessons with a built-in timer. Sections unlock in order, so nobody clicks through without learning. Expert videos sit inside the lessons.
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
                    Finish a lesson, earn a gold star. Keep a streak. Each week, a report card shows what they completed and their fastest moments. It turns a curriculum into something kids actually want to finish.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {[
                      ['★ 14', 'Gold stars earned this week'],
                      ['5 day', 'Streak, every day, in a row'],
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
 Students research a local water issue, build a proposal, and submit it, a video, a doc, or a deck. The lesson doesn't advance until the work is in. That's how you know they actually learned it.
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

      {/* ──── CTA ───────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32 border-t border-[#F0ECE6]/[0.08]">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[820px]" {...fadeUp()}>
            <Kicker>Let's build this together</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[80px] leading-[0.92] tracking-[-0.03em] text-[#F0ECE6] mt-6">
              The course is{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">in motion.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[19px] text-[#F0ECE6]/70 mt-8 leading-[1.6] max-w-[50ch]">
              The platform and the game are built. As Mission Water comes together, we'll shape the rest with you.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row sm:items-center gap-5">
              <a
                href="mailto:hello@aom-inhouse.com?subject=Mission%20Water"
                className="inline-flex items-center gap-3 bg-[#E85D26] text-[#0C0C0C] font-mono text-[11px] uppercase tracking-[0.22em] px-8 py-4 rounded-full hover:bg-[#F0ECE6] transition-colors no-underline"
              >
                Start the conversation
                <span aria-hidden="true">→</span>
              </a>
              <a
                href="https://aheadofmarket.com/missionwater"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/45 hover:text-[#E85D26] transition-colors no-underline"
              >
                Or play the game ↗
              </a>
            </div>
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