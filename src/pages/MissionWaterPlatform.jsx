import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * MissionWaterPlatform — All-new Conrad Foundation pitch page.
 * URL: /MissionWaterPlatform
 *
 * Built fresh — NOT a variant of ConradFoundation.jsx.
 * Feels like a product launch page (Notion / Linear / Framer).
 * Same brand tokens: #0C0C0C bg, #F0ECE6 text, #E85D26 orange accent.
 * Playfair Display + Space Grotesk + JetBrains Mono.
 *
 * Structure:
 *   1. Hero — headline + two anchored CTAs
 *   2. The Game — live iframe embed + 3 chapter cards
 *   3. The Platform — tab UI (Lessons / Progress / Teach-back)
 *   4. Educator & Parent Dashboard — "In development" mockup
 *   5. Video (Optional) — two option cards
 *   6. Rough Scope — 4 line items with status tags
 *   7. Opportunity / CTA — funding + final button
 *
 * R7 — 2026-06-08
 */

// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.55, delay, ease: 'easeOut' },
});

// ─── Shared primitives ────────────────────────────────────────────────────────

function Kicker({ children, className = '' }) {
  return (
    <p className={`font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] ${className}`}>
      {children}
    </p>
  );
}

function SectionDivider() {
  return <div className="border-t border-[#F0ECE6]/[0.07] w-full" />;
}

function Tag({ children, variant = 'neutral' }) {
  const styles = {
    built: 'bg-[#E85D26]/15 text-[#E85D26] border border-[#E85D26]/30',
    live:  'bg-[#E85D26]/15 text-[#E85D26] border border-[#E85D26]/30',
    together: 'bg-[#F0ECE6]/[0.06] text-[#F0ECE6]/70 border border-[#F0ECE6]/15',
    new: 'bg-[#F0ECE6]/[0.06] text-[#F0ECE6]/70 border border-[#F0ECE6]/15',
    dev: 'bg-[#4A90D9]/10 text-[#4A90D9] border border-[#4A90D9]/25',
  };
  return (
    <span className={`inline-block font-mono text-[9.5px] uppercase tracking-[0.22em] px-2.5 py-1 rounded-full ${styles[variant]}`}>
      {children}
    </span>
  );
}

// ─── Section components ───────────────────────────────────────────────────────

function ChapterCard({ chapter, title, tagline, color, delay }) {
  const bg = {
    earth: 'from-[#E85D26]/10 to-transparent border-[#E85D26]/25',
    journey: 'from-[#7C3FBD]/10 to-transparent border-[#7C3FBD]/25',
    moon: 'from-[#2D6FBD]/10 to-transparent border-[#2D6FBD]/25',
  }[color];

  const dot = {
    earth: 'bg-[#E85D26]',
    journey: 'bg-[#9B59D9]',
    moon: 'bg-[#4A8FD9]',
  }[color];

  return (
    <motion.div
      className={`rounded-xl border bg-gradient-to-br ${bg} p-6 flex flex-col gap-3`}
      {...fadeUp(delay)}
    >
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#F0ECE6]/50">
          {chapter}
        </span>
      </div>
      <p className="font-display-serif text-[22px] leading-[1.15] tracking-[-0.015em] text-[#F0ECE6]">
        {title}
      </p>
      <p className="font-body text-[14px] text-[#F0ECE6]/60 leading-[1.55]">
        {tagline}
      </p>
    </motion.div>
  );
}

function PlatformTab({ id, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-5 py-2.5 rounded-full font-mono text-[10.5px] uppercase tracking-[0.22em] transition-all duration-200 ${
        active
          ? 'bg-[#E85D26] text-white'
          : 'bg-[#F0ECE6]/[0.05] text-[#F0ECE6]/55 hover:bg-[#F0ECE6]/[0.09] hover:text-[#F0ECE6]/80'
      }`}
    >
      {label}
    </button>
  );
}

const platformContent = {
  lessons: {
    headline: 'Self-paced. Sequential. Built to hold students accountable.',
    bullets: [
      'Chapters unlock only after the previous one is complete',
      'Built-in timer on each lesson — no rushing through',
      'Students progress at their own pace, but they have to progress',
      'Works on any device, no app required',
    ],
    tag: 'Lessons',
    color: '#E85D26',
  },
  progress: {
    headline: 'Students see exactly where they are. So do teachers.',
    bullets: [
      'Gold stars on completed chapters, visible to the student',
      'Streak tracking — consecutive days of activity',
      'Weekly report card auto-generated for each student',
      'Dashboard rollup shows every student on one screen',
    ],
    tag: 'Progress',
    color: '#9B59D9',
  },
  teachback: {
    headline: 'Proving you learned it. The mechanism that actually works.',
    bullets: [
      'Students cannot advance without submitting their teach-back',
      'Text, audio, or short video — flexible but required',
      'No algorithm grades it — educators review submissions',
      'The teach-back is the receipt of learning',
    ],
    tag: 'Teach-back',
    color: '#4A8FD9',
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function MissionWaterPlatform() {
  const [platformTab, setPlatformTab] = useState('lessons');

  useEffect(() => {
    document.title = 'Mission Water Platform | Conrad Foundation × AOM';
    const noindex = document.createElement('meta');
    noindex.name = 'robots';
    noindex.content = 'noindex,nofollow';
    document.head.appendChild(noindex);
    return () => noindex.remove();
  }, []);

  const content = platformContent[platformTab];

  return (
    <div
      className="bg-[#0C0C0C] text-[#F0ECE6] min-h-screen antialiased overflow-x-hidden"
      style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
    >

      {/* ─────────────────────────── 01 · HERO ─────────────────────────────── */}
      <section className="relative pt-28 md:pt-40 pb-20 md:pb-28 px-6 md:px-12">
        {/* Subtle water-glow background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(45,111,189,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative max-w-[1280px] mx-auto">
          {/* Badge */}
          <motion.div {...fadeUp()}>
            <div className="inline-flex items-center gap-3 border border-[#E85D26]/30 bg-[#0C0C0C]/70 backdrop-blur-sm px-3.5 py-1.5 rounded-full mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
              <Kicker className="!text-[#F0ECE6]">For Nancy Conrad · Conrad Foundation</Kicker>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="font-display-serif text-[13vw] md:text-[82px] lg:text-[106px] xl:text-[124px] leading-[0.88] tracking-[-0.035em] max-w-[1100px]"
            {...fadeUp(0.08)}
          >
            Mission Water{' '}
            <em className="font-display-italic italic font-medium text-[#E85D26]">Platform.</em>
          </motion.h1>

          {/* Subline */}
          <motion.p
            className="font-body text-[17px] md:text-[20px] text-[#F0ECE6]/70 mt-8 leading-[1.6] max-w-[56ch]"
            {...fadeUp(0.16)}
          >
            A complete learning experience built around the world&rsquo;s most urgent resource. Three chapters. Eight decisions. A platform that delivers the curriculum and proves students actually learned it.
          </motion.p>

          {/* CTAs */}
          <motion.div className="flex flex-wrap gap-4 mt-10" {...fadeUp(0.22)}>
            <a
              href="#game"
              className="inline-flex items-center gap-2 bg-[#E85D26] text-white font-mono text-[10.5px] uppercase tracking-[0.22em] px-6 py-3.5 rounded-full hover:bg-[#d94e1a] transition-colors"
            >
              Play the live demo ↓
            </a>
            <a
              href="#platform"
              className="inline-flex items-center gap-2 border border-[#F0ECE6]/20 text-[#F0ECE6]/80 font-mono text-[10.5px] uppercase tracking-[0.22em] px-6 py-3.5 rounded-full hover:border-[#F0ECE6]/40 hover:text-[#F0ECE6] transition-colors"
            >
              See the platform ↓
            </a>
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* ────────────────── 02 · THE GAME — LEAD WITH PROOF ────────────────── */}
      <section id="game" className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="max-w-[680px] mb-14" {...fadeUp()}>
            <Kicker>Section 02 — The game</Kicker>
            <h2 className="font-display-serif text-[44px] md:text-[72px] leading-[0.92] tracking-[-0.03em] text-[#F0ECE6] mt-5">
              We built it.{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">Play it now.</em>
            </h2>
          </motion.div>

          {/* Game embed */}
          <motion.div
            className="rounded-2xl overflow-hidden border border-[#F0ECE6]/[0.08] bg-[#0D0D0D] mb-10"
            {...fadeIn(0.1)}
          >
            {/* Chrome bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0ECE6]/[0.07] bg-[#111111]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E85D26]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#F0ECE6]/55">
                  Mission Water &middot; Live Demo
                </span>
              </div>
              <a
                href="https://aheadofmarket.com/missionwater"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/40 hover:text-[#E85D26] transition-colors"
              >
                Open full screen ↗
              </a>
            </div>

            {/* Iframe */}
            <div className="relative w-full" style={{ height: '680px' }}>
              <iframe
                src="https://aheadofmarket.com/missionwater"
                title="Mission Water — Live Demo"
                loading="lazy"
                className="w-full h-full border-0"
                allow="fullscreen"
              />
            </div>
          </motion.div>

          {/* Chapter cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
            <ChapterCard
              chapter="Chapter 1"
              title="Earth"
              tagline="The water crisis is here. Students make real decisions about where resources go — and live with the tradeoffs."
              color="earth"
              delay={0}
            />
            <ChapterCard
              chapter="Chapter 2"
              title="The Journey"
              tagline="Aboard the ISS, water behaves differently. Students discover why recycling isn't optional — it's physics."
              color="journey"
              delay={0.08}
            />
            <ChapterCard
              chapter="Chapter 3"
              title="The Moon"
              tagline="The lunar mission depends on water found at the poles. Students choose how humanity gets there — and at what cost."
              color="moon"
              delay={0.16}
            />
          </div>

          {/* Closing line */}
          <motion.p
            className="font-display-serif text-[28px] md:text-[40px] lg:text-[52px] leading-[1.1] tracking-[-0.02em] text-[#F0ECE6] max-w-[820px]"
            {...fadeUp(0.08)}
          >
            The mission to the Moon wasn&rsquo;t about space.{' '}
            <em className="font-display-italic italic text-[#E85D26]">It was always about water.</em>
          </motion.p>
        </div>
      </section>

      <SectionDivider />

      {/* ────────────────────── 03 · THE PLATFORM ──────────────────────────── */}
      <section id="platform" className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="max-w-[700px] mb-14" {...fadeUp()}>
            <Kicker>Section 03 — The platform</Kicker>
            <h2 className="font-display-serif text-[44px] md:text-[72px] leading-[0.92] tracking-[-0.03em] text-[#F0ECE6] mt-5">
              The course{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">delivers itself.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/60 mt-6 leading-[1.65]">
              Built and running as a 12-week summer curriculum. Themed for water.
            </p>
          </motion.div>

          {/* Tabs */}
          <motion.div className="flex flex-wrap gap-3 mb-10" {...fadeUp(0.08)}>
            <PlatformTab id="lessons" label="Lessons" active={platformTab === 'lessons'} onClick={setPlatformTab} />
            <PlatformTab id="progress" label="Progress" active={platformTab === 'progress'} onClick={setPlatformTab} />
            <PlatformTab id="teachback" label="Teach-back" active={platformTab === 'teachback'} onClick={setPlatformTab} />
          </motion.div>

          {/* Tab content */}
          <motion.div
            key={platformTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 rounded-2xl border border-[#F0ECE6]/[0.08] bg-[#F0ECE6]/[0.02] p-8 md:p-12"
          >
            <div className="md:col-span-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] px-2.5 py-1 rounded-full border border-[#F0ECE6]/15 text-[#F0ECE6]/55">
                {content.tag}
              </span>
              <p className="font-display-serif text-[28px] md:text-[38px] leading-[1.1] tracking-[-0.02em] text-[#F0ECE6] mt-6">
                {content.headline}
              </p>
            </div>

            <div className="md:col-span-7">
              <ul className="space-y-5">
                {content.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-[10px] flex-shrink-0"
                      style={{ backgroundColor: content.color }}
                    />
                    <p className="font-body text-[16px] md:text-[17px] text-[#F0ECE6]/80 leading-[1.6]">
                      {bullet}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Proof-of-concept callout */}
          <motion.div
            className="mt-8 flex items-start gap-4 rounded-xl border border-[#E85D26]/20 bg-[#E85D26]/[0.04] px-6 py-5"
            {...fadeUp(0.1)}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mt-[10px] flex-shrink-0" />
            <p className="font-body text-[15px] text-[#F0ECE6]/70 leading-[1.6]">
              <span className="text-[#F0ECE6] font-medium">Proof of concept: </span>
              Built and running as a 12-week summer curriculum at AOM. Student progress tracking, chapter locks, teach-back submissions — all live. Now themed for water.
            </p>
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* ─────────────────── 04 · EDUCATOR & PARENT DASHBOARD ──────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="max-w-[700px] mb-14" {...fadeUp()}>
            <Kicker>Section 04 — The dashboard</Kicker>
            <h2 className="font-display-serif text-[44px] md:text-[72px] leading-[0.92] tracking-[-0.03em] text-[#F0ECE6] mt-5">
              Teachers and parents{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">stay in the loop.</em>
            </h2>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            className="rounded-2xl border border-[#F0ECE6]/[0.08] bg-[#0D0D0D] overflow-hidden mb-10"
            {...fadeIn(0.1)}
          >
            {/* Mockup header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0ECE6]/[0.07] bg-[#111111]">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/50">
                  Educator Dashboard — Mission Water · Class 4B
                </span>
              </div>
              <Tag variant="dev">In development</Tag>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#F0ECE6]/[0.05] bg-[#0D0D0D]">
              {['Student', 'Chapter', 'Progress', 'Teach-back', 'Streak', 'Stars'].map((h, i) => (
                <div
                  key={h}
                  className={`font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/30 ${
                    i === 0 ? 'col-span-3' : i === 2 ? 'col-span-2' : 'col-span-1'
                  }`}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Mockup rows */}
            {[
              { name: 'Ava Chen', chapter: 'Chapter 2', progress: 65, submitted: true, streak: 7, stars: 4 },
              { name: 'Marcus T.', chapter: 'Chapter 3', progress: 90, submitted: true, streak: 12, stars: 5 },
              { name: 'Sofia R.', chapter: 'Chapter 1', progress: 40, submitted: false, streak: 3, stars: 2 },
              { name: 'Eli Johnson', chapter: 'Chapter 2', progress: 55, submitted: true, streak: 5, stars: 3 },
              { name: 'Priya K.', chapter: 'Chapter 3', progress: 100, submitted: true, streak: 21, stars: 5 },
            ].map((student, i) => (
              <div
                key={student.name}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-[#F0ECE6]/[0.04] last:border-0 hover:bg-[#F0ECE6]/[0.02] transition-colors"
              >
                {/* Name */}
                <div className="col-span-3">
                  <p className="font-body text-[14px] text-[#F0ECE6]/85">{student.name}</p>
                </div>
                {/* Chapter */}
                <div className="col-span-1">
                  <p className="font-mono text-[11px] text-[#F0ECE6]/50">{student.chapter.split(' ')[1]}</p>
                </div>
                {/* Progress bar */}
                <div className="col-span-2">
                  <div className="relative h-1.5 bg-[#F0ECE6]/[0.08] rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-[#E85D26]"
                      style={{ width: `${student.progress}%` }}
                    />
                  </div>
                  <p className="font-mono text-[9.5px] text-[#F0ECE6]/35 mt-1">{student.progress}%</p>
                </div>
                {/* Teach-back */}
                <div className="col-span-1">
                  <span className={`font-mono text-[9.5px] uppercase tracking-[0.18em] ${student.submitted ? 'text-[#E85D26]' : 'text-[#F0ECE6]/25'}`}>
                    {student.submitted ? 'Done ✓' : 'Pending'}
                  </span>
                </div>
                {/* Streak */}
                <div className="col-span-1">
                  <p className="font-mono text-[12px] text-[#F0ECE6]/60">{student.streak}d</p>
                </div>
                {/* Stars */}
                <div className="col-span-1">
                  <p className="font-mono text-[12px] text-[#F0ECE6]/60">
                    {'★'.repeat(student.stars)}{'☆'.repeat(5 - student.stars)}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Feature bullets */}
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10" {...fadeUp(0.08)}>
            {[
              { text: 'See exactly where each student is stuck — chapter, step, and submission status.' },
              { text: 'Track completions, teach-back submissions, and streaks across your whole class.' },
              { text: 'One login for teachers and parents — both see the same live view.' },
            ].map((feat, i) => (
              <div key={i} className="flex gap-4 p-5 rounded-xl border border-[#F0ECE6]/[0.07] bg-[#F0ECE6]/[0.02]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mt-[9px] flex-shrink-0" />
                <p className="font-body text-[15px] text-[#F0ECE6]/70 leading-[1.6]">{feat.text}</p>
              </div>
            ))}
          </motion.div>

          {/* Dev note */}
          <motion.div
            className="flex flex-wrap items-center gap-4 rounded-xl border border-[#4A90D9]/20 bg-[#4A90D9]/[0.04] px-6 py-5"
            {...fadeUp(0.12)}
          >
            <Tag variant="dev">In development — ready when the partnership is locked</Tag>
            <p className="font-body text-[14px] text-[#F0ECE6]/55 leading-[1.55]">
              This is Patrik&rsquo;s next build — separate project, scoped and ready to go once the platform partnership is confirmed.
            </p>
          </motion.div>
        </div>
      </section>

      <SectionDivider />

      {/* ─────────────────────── 05 · VIDEO (OPTIONAL) ─────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="max-w-[700px] mb-14" {...fadeUp()}>
            <Kicker>Section 05 — Video</Kicker>
            <h2 className="font-display-serif text-[44px] md:text-[72px] leading-[0.92] tracking-[-0.03em] text-[#F0ECE6] mt-5">
              Your team{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">or ours.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/60 mt-6 leading-[1.65]">
              Start without video and layer it in later. The platform works either way.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Option A */}
            <motion.div
              className="rounded-2xl border border-[#F0ECE6]/[0.10] bg-[#F0ECE6]/[0.02] p-8 md:p-10 flex flex-col gap-5"
              {...fadeUp(0.06)}
            >
              <Kicker>Option A</Kicker>
              <h3 className="font-display-serif text-[32px] md:text-[42px] leading-[1.0] tracking-[-0.02em] text-[#F0ECE6]">
                Your team <em className="font-display-italic italic text-[#E85D26]">films it.</em>
              </h3>
              <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/65 leading-[1.65] flex-1">
                Conrad Foundation or Nancy&rsquo;s team films the expert sessions. AOM structures the curriculum, hosts and delivers the content. You bring the subject-matter authority. We bring the platform.
              </p>
              <p className="font-body text-[14px] text-[#F0ECE6]/40 italic">
                Best when: you already have a video team and clear production cadence.
              </p>
            </motion.div>

            {/* Option B */}
            <motion.div
              className="rounded-2xl border border-[#E85D26]/25 bg-gradient-to-br from-[#E85D26]/[0.06] to-transparent p-8 md:p-10 flex flex-col gap-5"
              {...fadeUp(0.12)}
            >
              <Kicker>Option B</Kicker>
              <h3 className="font-display-serif text-[32px] md:text-[42px] leading-[1.0] tracking-[-0.02em] text-[#F0ECE6]">
                AOM <em className="font-display-italic italic text-[#E85D26]">produces it.</em>
              </h3>
              <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/65 leading-[1.65] flex-1">
                AOM films Nancy and water science experts. MasterClass-tier production. Full post-production, music licensing, and delivery in every format included. The video library becomes the course backbone.
              </p>
              <p className="font-body text-[14px] text-[#F0ECE6]/40 italic">
                Best when: you want high-production value without managing a crew.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ─────────────────────────── 06 · ROUGH SCOPE ──────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="max-w-[700px] mb-14" {...fadeUp()}>
            <Kicker>Section 06 — Rough scope</Kicker>
            <h2 className="font-display-serif text-[44px] md:text-[72px] leading-[0.92] tracking-[-0.03em] text-[#F0ECE6] mt-5">
              What it takes{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">to build this.</em>
            </h2>
          </motion.div>

          {/* Scope items */}
          <motion.div
            className="rounded-2xl border border-[#F0ECE6]/[0.08] bg-[#F0ECE6]/[0.02] overflow-hidden"
            {...fadeUp(0.08)}
          >
            {[
              {
                n: '01',
                title: 'Platform shell',
                desc: 'Self-paced lesson engine, chapter locks, progress tracking, teach-back submission system.',
                tagLabel: 'Built ✓',
                tagVariant: 'built',
              },
              {
                n: '02',
                title: 'Mission Water Game',
                desc: '3-chapter interactive experience. 8 branching decisions. Real ISS science. Live now.',
                tagLabel: 'Live ✓',
                tagVariant: 'live',
              },
              {
                n: '03',
                title: 'Expert video library',
                desc: 'Nancy and water scientists filmed and embedded as chapter segments. Optional — your team or ours.',
                tagLabel: 'Together',
                tagVariant: 'together',
              },
              {
                n: '04',
                title: 'Educator dashboard',
                desc: 'Roster view, student progress, completion tracking, teach-back review queue. One login for teachers and parents.',
                tagLabel: 'New build',
                tagVariant: 'new',
              },
            ].map((item, i) => (
              <div
                key={item.n}
                className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 px-7 py-6 border-b border-[#F0ECE6]/[0.06] last:border-0"
              >
                <span className="font-mono text-[11px] tracking-[0.22em] text-[#E85D26]/70 w-8 flex-shrink-0">
                  {item.n}
                </span>
                <div className="flex-1">
                  <p className="font-display-serif text-[22px] md:text-[26px] leading-[1.15] tracking-[-0.015em] text-[#F0ECE6] mb-1.5">
                    {item.title}
                  </p>
                  <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/55 leading-[1.55]">
                    {item.desc}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Tag variant={item.tagVariant}>{item.tagLabel}</Tag>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Context paragraph */}
          <motion.p
            className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/60 leading-[1.7] mt-10 max-w-[72ch]"
            {...fadeUp(0.1)}
          >
            The platform and game already exist. The partnership funds the educator dashboard, video production (optional), and launch activation. Conrad Foundation brings the mission — AOM brings the infrastructure.
          </motion.p>
        </div>
      </section>

      <SectionDivider />

      {/* ─────────────────────── 07 · THE OPPORTUNITY ──────────────────────── */}
      <section className="px-6 md:px-12 py-24 md:py-32">
        <div className="max-w-[1280px] mx-auto">

          <motion.div className="max-w-[800px] mb-14" {...fadeUp()}>
            <Kicker>Section 07 — The opportunity</Kicker>
            <h2 className="font-display-serif text-[44px] md:text-[72px] leading-[0.92] tracking-[-0.03em] text-[#F0ECE6] mt-5">
              Conrad Foundation convenes.{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">AOM builds.</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-20">

            {/* Left — funding sources */}
            <motion.div className="md:col-span-5 space-y-6" {...fadeUp(0.08)}>
              <p className="font-body text-[16px] md:text-[17px] text-[#F0ECE6]/70 leading-[1.7]">
                This doesn&rsquo;t have to come out of the Foundation&rsquo;s operating budget. There are natural funders for exactly this kind of work:
              </p>

              <ul className="space-y-3">
                {[
                  'Corporate water sponsors (Xylem, Veolia, SUEZ)',
                  'STEM grants — NSF, STEM Next, 100Kin10',
                  'Blue Origin Club for the Future',
                  'Audubon Society / water conservation orgs',
                  'Space Center Houston education partnerships',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mt-[10px] flex-shrink-0" />
                    <p className="font-body text-[15px] text-[#F0ECE6]/65 leading-[1.6]">{item}</p>
                  </li>
                ))}
              </ul>

              <p className="font-body text-[15px] text-[#F0ECE6]/55 leading-[1.6] italic">
                We help identify and pursue the right partners. You own the relationships — we know the landscape.
              </p>
            </motion.div>

            {/* Right — closing CTA */}
            <motion.div className="md:col-span-7" {...fadeUp(0.14)}>
              <div className="rounded-2xl border border-[#E85D26]/30 bg-gradient-to-br from-[#E85D26]/[0.07] to-transparent p-8 md:p-12 flex flex-col gap-7">
                <p className="font-display-serif text-[30px] md:text-[44px] leading-[1.05] tracking-[-0.025em] text-[#F0ECE6]">
                  The platform exists. The game is live. The mission is real.{' '}
                  <em className="font-display-italic italic text-[#E85D26]">Let&rsquo;s build this together.</em>
                </p>

                <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/65 leading-[1.65]">
                  One call to align on scope and partners. We bring the technical infrastructure, the platform, and production capacity. Nancy and the Conrad Foundation bring the mission authority, the water expertise, and the network. The combination is what makes this fundable.
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <a
                    href="mailto:hello@aom-inhouse.com?subject=Mission Water Platform — Let%27s talk"
                    className="inline-flex items-center gap-2 bg-[#E85D26] text-white font-mono text-[10.5px] uppercase tracking-[0.22em] px-7 py-4 rounded-full hover:bg-[#d94e1a] transition-colors"
                  >
                    Schedule a call →
                  </a>
                  <a
                    href="https://aheadofmarket.com/missionwater"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-[#F0ECE6]/20 text-[#F0ECE6]/70 font-mono text-[10.5px] uppercase tracking-[0.22em] px-7 py-4 rounded-full hover:border-[#F0ECE6]/35 hover:text-[#F0ECE6] transition-colors"
                  >
                    Play the game ↗
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ─────────────────────────── FOOTER ────────────────────────────────── */}
      <footer className="px-6 md:px-12 py-16">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <a
              href="https://aheadofmarket.com"
              className="font-display-serif text-[28px] md:text-[36px] leading-[1] tracking-[-0.02em] text-[#F0ECE6] hover:text-[#E85D26] transition-colors no-underline"
            >
              Ahead of Market
            </a>
            <p className="font-body text-[13px] text-[#F0ECE6]/45 mt-2">
              Platform pitch prepared for Nancy Conrad · Conrad Foundation
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
