// R7 — MissionWaterPlatform — brand-new Conrad Foundation pitch
// Separate page at /MissionWaterPlatform — Nancy has seen /ConradFoundation
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function useSEO() {
  useEffect(() => {
    document.title = 'Mission Water Platform | AOM \xd7 Conrad Foundation';
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
    setMeta('description', 'The Mission Water Platform — curriculum, interactive game, and educator tools built for the Conrad Foundation.');
    setMeta('og:title', 'Mission Water Platform | AOM \xd7 Conrad Foundation', true);
    setMeta('og:type', 'article', true);
    setMeta('robots', 'noindex, nofollow');
  }, []);
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

function Kicker({ children, className = '' }) {
  return (
    <p className={`font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] ${className}`}>
      {children}
    </p>
  );
}

function StatBlock({ value, label, delay = 0 }) {
  return (
    <motion.div className="flex flex-col gap-2" {...fadeUp(delay)}>
      <span className="font-display-serif text-[64px] md:text-[80px] leading-none tracking-[-0.04em] text-[#F0ECE6]">
        {value}
      </span>
      <span className="font-body text-[13px] text-[#F0ECE6]/50 leading-[1.4] max-w-[16ch]">{label}</span>
    </motion.div>
  );
}

function ScopeRow({ n, title, status, statusType = 'built' }) {
  const colors = {
    built:    'bg-[#E85D26]/15 text-[#E85D26] border border-[#E85D26]/30',
    live:     'bg-[#E85D26]/15 text-[#E85D26] border border-[#E85D26]/30',
    together: 'bg-[#F0ECE6]/10 text-[#F0ECE6]/60 border border-[#F0ECE6]/15',
    new:      'bg-[#F0ECE6]/10 text-[#F0ECE6]/60 border border-[#F0ECE6]/15',
  };
  return (
    <motion.div
      className="flex items-center gap-5 py-7 border-b border-[#F0ECE6]/[0.08] last:border-0"
      {...fadeUp(n * 0.07)}
    >
      <span className="font-mono text-[11px] tracking-[0.22em] text-[#E85D26] w-8 flex-shrink-0">
        {String(n).padStart(2, '0')}
      </span>
      <p className="font-display-serif text-[22px] md:text-[28px] leading-[1.1] tracking-[-0.015em] text-[#F0ECE6] flex-1">
        {title}
      </p>
      <span className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${colors[statusType]}`}>
        {status}
      </span>
    </motion.div>
  );
}

const PLATFORM_TABS = [
  {
    id: 'lessons',
    label: 'Lessons',
    content: {
      headline: 'Self-paced. Chapter-locked. Always moving forward.',
      bullets: [
        'Students unlock each lesson only after completing the one before',
        'Built-in timer keeps sessions focused — no passive clicking through',
        'Video, audio, written, or interactive — any format works',
        "Expert video library: Nancy's team films it, or AOM produces it",
      ],
    },
  },
  {
    id: 'progress',
    label: 'Progress',
    content: {
      headline: 'Stars. Streaks. A real report card every week.',
      bullets: [
        'Gold stars for completed lessons — bonus stars for teach-back quality',
        'Streaks reward consistency across the full program',
        'Weekly report card sent home to parents automatically',
        "At-a-glance dashboard: who's stuck, who's flying, who's ready to advance",
      ],
    },
  },
  {
    id: 'submit',
    label: 'Teach-Back',
    content: {
      headline: 'Learn it. Teach it back. Then advance.',
      bullets: [
        'Students record a video, write a response, or submit a real artifact',
        'No teach-back = no next chapter — the gate is structural, not optional',
        'Submissions go to the educator review queue for async feedback',
        'The platform waits for real comprehension before moving on',
      ],
    },
  },
];

const STUDENTS = [
  { name: 'Maya R.',   progress: 87, stars: 9,  status: 'On track'        },
  { name: 'Carlos T.', progress: 62, stars: 6,  status: 'Needs check-in'  },
  { name: 'Priya S.',  progress: 94, stars: 11, status: 'Advanced'         },
  { name: 'Jordan K.', progress: 41, stars: 4,  status: 'Falling behind'  },
];

export default function MissionWaterPlatform() {
  useSEO();
  const [activeTab, setActiveTab] = useState('lessons');
  const tab = PLATFORM_TABS.find(t => t.id === activeTab);

  return (
    <div
      className="bg-[#0C0C0C] text-[#F0ECE6] min-h-screen"
      style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
    >

      {/* HERO */}
      <section className="relative pt-28 md:pt-44 pb-24 md:pb-36 px-6 md:px-12 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 60% 120%, #0066ff 0%, transparent 70%)' }}
        />
        <div className="max-w-[1280px] mx-auto relative">
          <motion.div {...fadeUp()}>
            <div className="inline-flex items-center gap-3 border border-[#E85D26]/30 bg-[#E85D26]/5 px-3.5 py-1.5 rounded-full mb-10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
              <Kicker className="!text-[#F0ECE6]">For Nancy Conrad \xb7 Conrad Foundation</Kicker>
            </div>
          </motion.div>

          <motion.h1
            className="font-display-serif text-[13vw] md:text-[80px] lg:text-[104px] xl:text-[128px] leading-[0.88] tracking-[-0.035em] max-w-[1000px]"
            {...fadeUp(0.08)}
          >
            The platform your<br />
            <em className="font-display-italic italic font-medium text-[#E85D26]">masterclass deserves.</em>
          </motion.h1>

          <motion.p
            className="font-body text-[17px] md:text-[20px] text-[#F0ECE6]/65 mt-10 leading-[1.65] max-w-[60ch]"
            {...fadeUp(0.18)}
          >
            Water security is the defining challenge of the next century. The Conrad Foundation has
            been building the next generation of problem-solvers for twenty years. This is the
            infrastructure to make Mission Water the flagship program that reaches every classroom.
          </motion.p>

          <motion.p
            className="font-display-serif text-[24px] md:text-[32px] leading-[1.2] tracking-[-0.02em] mt-8"
            {...fadeUp(0.26)}
          >
            Conrad Foundation convenes.{' '}
            <em className="not-italic text-[#E85D26]">AOM builds.</em>
          </motion.p>

          <motion.div className="mt-12 flex gap-4 flex-wrap" {...fadeUp(0.33)}>
            <a
              href="mailto:hello@aom-inhouse.com?subject=Mission Water Platform Partnership"
              className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-[#0C0C0C] font-mono text-[11px] uppercase tracking-[0.22em] px-6 py-3.5 rounded-full transition-colors"
            >
              Schedule a call →
            </a>
            <a
              href="#game"
              className="inline-flex items-center gap-2 border border-[#F0ECE6]/20 hover:border-[#F0ECE6]/40 text-[#F0ECE6]/70 hover:text-[#F0ECE6] font-mono text-[11px] uppercase tracking-[0.22em] px-6 py-3.5 rounded-full transition-colors"
            >
              See the game ↓
            </a>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="px-6 md:px-12 pb-28 md:pb-36">
        <div className="max-w-[1280px] mx-auto">
          <div className="border-t border-[#F0ECE6]/[0.08] pt-16 grid grid-cols-2 md:grid-cols-4 gap-12">
            <StatBlock value="3" label="chapters across Earth, deep space, and the Moon" delay={0} />
            <StatBlock value="8" label="branching decisions with real science consequences" delay={0.06} />
            <StatBlock value="12" label="weeks of structured curriculum — already built" delay={0.12} />
            <StatBlock value="1" label="platform proven with a live cohort this summer" delay={0.18} />
          </div>
        </div>
      </section>

      {/* THE GAME */}
      <section id="game" className="px-6 md:px-12 pb-28 md:pb-36">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-10" {...fadeUp()}>
            <Kicker className="mb-4">Live Demo — Play It Now</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.92] tracking-[-0.03em] max-w-[700px]">
              We built the game.<br />
              <em className="not-italic text-[#E85D26]">It already works.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/60 mt-5 leading-[1.6] max-w-[55ch]">
              Mission Water is a 3-chapter interactive experience built on real ISS science.
              Students make decisions that affect survival — water allocation, electrolysis,
              radiation shielding. The closing line: "The mission to the Moon was always about water."
            </p>
          </motion.div>

          <motion.div
            className="relative rounded-2xl overflow-hidden border border-[#F0ECE6]/[0.07]"
            style={{ height: 'clamp(560px, 68vh, 720px)' }}
            {...fadeUp(0.1)}
          >
            <div className="absolute top-0 left-0 right-0 z-10 bg-[#181818] border-b border-[#F0ECE6]/[0.08] flex items-center gap-3 px-4 h-10">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#F0ECE6]/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#F0ECE6]/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#F0ECE6]/10" />
              </div>
              <span className="font-mono text-[10px] text-[#F0ECE6]/30 tracking-[0.15em] uppercase">
                Live demo \xb7 aheadofmarket.com/missionwater
              </span>
              <a
                href="https://aheadofmarket.com/missionwater"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto font-mono text-[10px] text-[#E85D26]/70 hover:text-[#E85D26] tracking-[0.15em] uppercase transition-colors"
              >
                Open full screen ↗
              </a>
            </div>
            <iframe
              src="https://aheadofmarket.com/missionwater"
              loading="lazy"
              title="Mission Water interactive game"
              className="absolute inset-0 w-full border-0"
              style={{ top: '40px', height: 'calc(100% - 40px)' }}
            />
          </motion.div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { ch: 'Chapter 1', title: 'Earth',       color: '#E85D26', fact: '1.1 billion people lack safe drinking water today.' },
              { ch: 'Chapter 2', title: 'The Journey', color: '#A78BFA', fact: 'The ISS recycles 93% of all water aboard through electrolysis.' },
              { ch: 'Chapter 3', title: 'The Moon',    color: '#3B82F6', fact: 'Water ice in lunar craters may be the key to deep-space survival.' },
            ].map(({ ch, title, color, fact }, i) => (
              <motion.div
                key={ch}
                className="border border-[#F0ECE6]/[0.07] rounded-xl p-6"
                style={{ borderTopColor: color + '60' }}
                {...fadeUp(i * 0.08)}
              >
                <Kicker className="mb-2" style={{ color }}>{ch}</Kicker>
                <p className="font-display-serif text-[22px] tracking-[-0.015em] mb-3">{title}</p>
                <p className="font-body text-[13px] text-[#F0ECE6]/50 leading-[1.5]">{fact}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* THE PLATFORM */}
      <section className="px-6 md:px-12 pb-28 md:pb-36">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-10" {...fadeUp()}>
            <Kicker className="mb-4">The Curriculum Engine</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[64px] leading-[0.92] tracking-[-0.03em] max-w-[700px]">
              The course delivers{' '}
              <em className="not-italic text-[#E85D26]">itself.</em>
            </h2>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/60 mt-5 leading-[1.6] max-w-[55ch]">
              We already built this for a 12-week summer cohort. Chapter locks, teach-back
              gates, streaks, report cards — all proven. We skin it for Mission Water and it
              runs without you in the room.
            </p>
          </motion.div>

          <motion.div
            className="border border-[#F0ECE6]/[0.08] rounded-2xl overflow-hidden"
            {...fadeUp(0.1)}
          >
            <div className="flex border-b border-[#F0ECE6]/[0.08] bg-[#111]">
              {PLATFORM_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 font-mono text-[11px] uppercase tracking-[0.2em] py-4 transition-colors ${
                    activeTab === t.id
                      ? 'text-[#E85D26] border-b-2 border-[#E85D26]'
                      : 'text-[#F0ECE6]/40 hover:text-[#F0ECE6]/70'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-8 md:p-12">
              <p className="font-display-serif text-[26px] md:text-[34px] leading-[1.15] tracking-[-0.02em] mb-8 max-w-[50ch]">
                {tab.content.headline}
              </p>
              <ul className="space-y-4">
                {tab.content.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mt-2 flex-shrink-0" />
                    <span className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/70 leading-[1.55]">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* EDUCATOR DASHBOARD */}
      <section className="px-6 md:px-12 pb-28 md:pb-36">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div {...fadeUp()}>
              <div className="inline-flex items-center gap-2 border border-[#F0ECE6]/15 px-3 py-1 rounded-full mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F0ECE6]/30" />
                <Kicker className="!text-[#F0ECE6]/50">In Development</Kicker>
              </div>
              <h2 className="font-display-serif text-[38px] md:text-[52px] leading-[0.95] tracking-[-0.03em] mb-6">
                Every educator sees<br />
                <em className="not-italic text-[#E85D26]">every student.</em>
              </h2>
              <p className="font-body text-[16px] text-[#F0ECE6]/60 leading-[1.65] mb-6">
                A private login portal for teachers and parents to track individual progress —
                which lessons are done, where students are stuck, who needs a call. No spreadsheets.
                No guessing.
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#F0ECE6]/35">
                Part of Phase 2 build — we scope it together
              </p>
            </motion.div>

            <motion.div
              className="border border-[#F0ECE6]/[0.07] rounded-2xl overflow-hidden bg-[#111]"
              {...fadeUp(0.1)}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0ECE6]/[0.07]">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#F0ECE6]/40">Class Roster</span>
                <span className="font-mono text-[10px] text-[#E85D26]/60 border border-[#E85D26]/20 px-2.5 py-1 rounded-full">
                  Week 6 of 12
                </span>
              </div>
              <div className="divide-y divide-[#F0ECE6]/[0.06]">
                {STUDENTS.map((s, i) => (
                  <motion.div
                    key={s.name}
                    className="flex items-center gap-4 px-6 py-4"
                    {...fadeUp(0.15 + i * 0.06)}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#E85D26]/10 border border-[#E85D26]/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-mono text-[10px] text-[#E85D26]">{s.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-body text-[13px] text-[#F0ECE6]/80">{s.name}</span>
                        <span className="font-mono text-[10px] text-[#F0ECE6]/40">{s.progress}%</span>
                      </div>
                      <div className="h-1 bg-[#F0ECE6]/[0.06] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[#E85D26]"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${s.progress}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-[10px] text-[#E85D26]">★ {s.stars}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="px-6 py-4 bg-[#0C0C0C]/50 border-t border-[#F0ECE6]/[0.06]">
                <p className="font-mono text-[10px] text-[#F0ECE6]/25 uppercase tracking-[0.2em]">
                  Educator login — coming in Phase 2
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* VIDEO OPTIONS */}
      <section className="px-6 md:px-12 pb-28 md:pb-36">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-10" {...fadeUp()}>
            <Kicker className="mb-4">Expert Video Library</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[60px] leading-[0.93] tracking-[-0.03em] max-w-[600px]">
              Your team or ours —<br />
              <em className="not-italic text-[#E85D26]">we build around it.</em>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                option: 'Option A',
                title: 'Your team films it.',
                desc: "Nancy and the Conrad team have a video production relationship already. You bring the footage — we structure it into chapters, host it inside the platform, and make it navigable for students.",
                bullets: [
                  'We build the chapter structure and lesson flow',
                  'We host and serve all video securely inside the platform',
                  'We write the curriculum around your existing content',
                ],
                delay: 0,
              },
              {
                option: 'Option B',
                title: 'We produce it.',
                desc: "AOM films Nancy and domain experts in a MasterClass-style production. Water security scientists, NASA engineers, conservationists. One shoot day. Full editorial. A video library that lasts a decade.",
                bullets: [
                  'AOM films Nancy and domain experts on-location',
                  'MasterClass-level production quality',
                  'Built into the platform curriculum from day one',
                ],
                delay: 0.1,
              },
            ].map(({ option, title, desc, bullets, delay }) => (
              <motion.div
                key={option}
                className="border border-[#F0ECE6]/[0.08] hover:border-[#F0ECE6]/15 rounded-2xl p-8 transition-colors"
                {...fadeUp(delay)}
              >
                <Kicker className="mb-3">{option}</Kicker>
                <p className="font-display-serif text-[28px] md:text-[34px] leading-[1.1] tracking-[-0.02em] mb-4">{title}</p>
                <p className="font-body text-[14px] md:text-[15px] text-[#F0ECE6]/55 leading-[1.6] mb-6">{desc}</p>
                <ul className="space-y-3">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26]/60 mt-1.5 flex-shrink-0" />
                      <span className="font-body text-[13px] text-[#F0ECE6]/60 leading-[1.5]">{b}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ROUGH SCOPE */}
      <section className="px-6 md:px-12 pb-28 md:pb-36">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-10" {...fadeUp()}>
            <Kicker className="mb-4">What This Builds</Kicker>
            <h2 className="font-display-serif text-[42px] md:text-[60px] leading-[0.93] tracking-[-0.03em]">
              Rough scope.
            </h2>
          </motion.div>
          <div className="border border-[#F0ECE6]/[0.07] rounded-2xl overflow-hidden">
            <ScopeRow n={1} title="The Platform — curriculum shell, chapter locks, progress, teach-back" status="Built ✓" statusType="built" />
            <ScopeRow n={2} title="The Game — Mission Water, 3 chapters, 8 decisions, real ISS science" status="Live ✓" statusType="live" />
            <ScopeRow n={3} title="Expert video library — hosted inside the platform, chapter-structured" status="Together" statusType="together" />
            <ScopeRow n={4} title="Educator and parent dashboard — login, roster, progress tracking" status="New build" statusType="new" />
          </div>
          <motion.p
            className="font-display-serif text-[20px] md:text-[24px] text-[#F0ECE6]/50 mt-8 leading-[1.4] max-w-[65ch]"
            {...fadeUp(0.3)}
          >
            Items 1 and 2 are already built and live. Items 3 and 4 are the
            partnership — we scope the budget together based on what Mission Water needs.
          </motion.p>
        </div>
      </section>

      {/* OPPORTUNITY / CTA */}
      <section className="px-6 md:px-12 pb-32 md:pb-44">
        <div className="max-w-[1280px] mx-auto">
          <div className="border border-[#F0ECE6]/[0.07] rounded-3xl p-10 md:p-16 relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.06]"
              style={{ background: 'radial-gradient(ellipse 60% 60% at 80% 50%, #E85D26 0%, transparent 70%)' }}
            />
            <div className="relative max-w-[800px]">
              <motion.div {...fadeUp()}>
                <Kicker className="mb-6">The Partnership</Kicker>
              </motion.div>
              <motion.h2
                className="font-display-serif text-[42px] md:text-[68px] lg:text-[80px] leading-[0.9] tracking-[-0.035em] mb-8"
                {...fadeUp(0.08)}
              >
                Conrad Foundation<br />
                <em className="not-italic text-[#E85D26]">convenes.</em> AOM{' '}
                <em className="not-italic text-[#E85D26]">builds.</em>
              </motion.h2>
              <motion.p
                className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/60 leading-[1.65] mb-8 max-w-[55ch]"
                {...fadeUp(0.15)}
              >
                This is a partnership play, not a vendor relationship. Conrad Foundation brings
                Nancy’s credibility, the Spirit of Innovation network, and access to STEM
                funding. AOM brings the platform, the game, the production, and the technology.
                Together we build something neither side could do alone.
              </motion.p>
              <motion.div {...fadeUp(0.2)} className="mb-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#F0ECE6]/35 mb-4">
                  Potential funding sources for Mission Water
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Xylem \xb7 Veolia \xb7 water sector sponsors',
                    'NSF STEM Next grants',
                    'Blue Origin Foundation',
                    'Conrad Spirit alumni network',
                    'Department of Education',
                  ].map(f => (
                    <span
                      key={f}
                      className="font-mono text-[10px] text-[#F0ECE6]/45 border border-[#F0ECE6]/10 px-3 py-1.5 rounded-full"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </motion.div>
              <motion.div className="flex gap-4 flex-wrap items-center" {...fadeUp(0.25)}>
                <a
                  href="mailto:hello@aom-inhouse.com?subject=Mission Water Platform Partnership"
                  className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-[#0C0C0C] font-mono text-[11px] uppercase tracking-[0.22em] px-7 py-4 rounded-full transition-colors"
                >
                  Build this together →
                </a>
                <p className="font-body text-[14px] text-[#F0ECE6]/40 italic">
                  Based on what you see here — what do you think this partnership is worth to Mission Water?
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#F0ECE6]/[0.06] px-6 md:px-12 py-10">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="font-display-serif text-[18px] tracking-[-0.01em]">
              AOM <span className="text-[#F0ECE6]/30">\xd7</span> Conrad Foundation
            </p>
            <p className="font-mono text-[10px] text-[#F0ECE6]/25 uppercase tracking-[0.2em] mt-1">
              Mission Water Platform \xb7 Confidential
            </p>
          </div>
          <div className="flex items-center gap-2 border border-[#F0ECE6]/10 px-3.5 py-2 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F0ECE6]/20" />
            <span className="font-mono text-[10px] text-[#F0ECE6]/30 uppercase tracking-[0.2em]">
              Private \xb7 Not for distribution
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
