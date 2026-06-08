// R8 — Lean, interactive-first pitch showcase
// /MissionWaterPlatform · /missionwaterplatform
// Mission: conrad-foundation:masterclass-pitch-deck
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

// ─── SEO ──────────────────────────────────────────────────────────────────────
function useSEO() {
  useEffect(() => {
    document.title = 'Mission Water Platform | Conrad Foundation';
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
    setMeta('description', 'Mission Water — the interactive platform for the Conrad Foundation masterclass.');
    setMeta('og:title', 'Mission Water Platform | Conrad Foundation', true);
    setMeta('og:type', 'article', true);
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

// ─── Primitives ───────────────────────────────────────────────────────────────
function Kicker({ children, className = '' }) {
  return (
    <p className={`font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] ${className}`}>
      {children}
    </p>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MissionWaterPlatform() {
  useSEO();

  return (
    <div className="bg-[#0C0C0C] text-[#F0ECE6] min-h-screen" style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}>

      {/* ─── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 pt-24 md:pt-32 pb-16 md:pb-24">
        <div className="max-w-[1280px] mx-auto">
          <motion.div {...fadeUp()}>
            <Kicker className="mb-6">The mission</Kicker>
            <h1 className="font-display-serif text-[48px] md:text-[88px] lg:text-[104px] leading-[0.95] tracking-[-0.035em] max-w-[1000px] mb-8">
              The platform your <em className="font-display-italic italic font-medium text-[#E85D26]">masterclass</em> deserves.
            </h1>
            <p className="font-display-serif text-[18px] md:text-[22px] leading-[1.4] tracking-[-0.015em] max-w-[700px] text-[#F0ECE6]/70">
              Conrad Foundation convenes. AOM builds.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Live Game Demo ───────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 pb-16 md:pb-24">
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            className="rounded-2xl overflow-hidden border border-[#E85D26]/20 bg-[#0C0C0C]"
            {...fadeUp()}
          >
            <div className="aspect-video bg-[#0C0C0C]">
              <iframe
                src="https://aheadofmarket.com/missionwater"
                title="Mission Water Interactive Game"
                className="w-full h-full border-0"
              />
            </div>
            <div className="px-6 md:px-8 py-4 border-t border-[#E85D26]/10 flex items-center justify-between">
              <Kicker>Live demo · play it now</Kicker>
              <a
                href="https://aheadofmarket.com/missionwater"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#E85D26] hover:text-[#F0ECE6] font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
              >
                Open full screen ↗
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Platform Being Built ─────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 pb-24 md:pb-32">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-10" {...fadeUp()}>
            <Kicker className="mb-4">The platform</Kicker>
            <h2 className="font-display-serif text-[40px] md:text-[56px] leading-[0.95] tracking-[-0.025em]">
              Self-paced. Tracked. <em className="not-italic text-[#E85D26]">Complete.</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                kicker: 'Lessons',
                title: 'Self-paced modules',
                desc: 'Sequential lessons with timers, progress tracking, and student-submitted teach-back.',
              },
              {
                kicker: 'Progress',
                title: 'Weekly report cards',
                desc: 'Stars, streaks, and real-time dashboards for educators to see where every student stands.',
              },
              {
                kicker: 'Submit',
                title: 'Student deliverables',
                desc: 'Students upload reflections, analyses, and project work. Educators grade and feedback.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="p-8 rounded-2xl border border-[#F0ECE6]/[0.08] bg-[#F0ECE6]/[0.02]"
                {...fadeUp(0.1 + i * 0.05)}
              >
                <Kicker className="mb-3">{item.kicker}</Kicker>
                <p className="font-display-serif text-[22px] md:text-[26px] leading-[1.1] tracking-[-0.02em] mb-3">
                  {item.title}
                </p>
                <p className="font-body text-[14px] text-[#F0ECE6]/60 leading-[1.6]">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.p
            className="mt-12 font-body text-[15px] text-[#F0ECE6]/55 leading-[1.7] max-w-[700px]"
            {...fadeUp(0.3)}
          >
            Built on the proven summer-school engine we shipped in 2026. Themed for water science. Ready to scale.
          </motion.p>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 pb-32 md:pb-40">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="flex items-center gap-6" {...fadeUp()}>
            <a
              href="mailto:hello@aheadofmarket.com?subject=Mission%20Water%20Platform"
              className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-[#0C0C0C] font-mono text-[11px] uppercase tracking-[0.22em] px-8 py-4 rounded-full transition-colors"
            >
              Build this together →
            </a>
            <p className="font-body text-[14px] text-[#F0ECE6]/50">
              Let's talk partnership, timeline, and scope.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#F0ECE6]/[0.06] px-6 md:px-12 py-8 mt-10">
        <div className="max-w-[1280px] mx-auto">
          <p className="font-display-serif text-[16px] tracking-[-0.01em]">
            AOM <span className="text-[#F0ECE6]/30">×</span> Conrad Foundation
          </p>
          <p className="font-mono text-[9px] text-[#F0ECE6]/25 uppercase tracking-[0.2em] mt-1">
            Mission Water · Interactive platform · 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
