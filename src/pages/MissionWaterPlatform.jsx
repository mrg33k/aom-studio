// R9 — Conrad Foundation aesthetic blend (navy + white + orange, not pure AOM black)
// /MissionWaterPlatform · /missionwaterplatform · /platform
// Mission: conrad-foundation:mission-water
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
    setMeta('description', 'Mission Water — the interactive learning platform for the Conrad Foundation masterclass.');
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

// Conrad palette
// --cf-navy:   #071530  (primary dark)
// --cf-navy2:  #0D2045  (mid navy)
// --cf-orange: #E85D26  (warm accent)
// --cf-white:  #FFFFFF  (section bg)
// --cf-cream:  #F4F2EF  (card bg)
// --cf-muted:  rgba(7,21,48,0.60) (secondary text)

// ─── Wordmark + Nav ───────────────────────────────────────────────────────────
function ConradNav() {
  return (
    <nav className="w-full bg-white border-b border-[#071530]/[0.08] px-6 md:px-12 py-4">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Placeholder emblem circle */}
          <div className="w-7 h-7 rounded-full bg-[#071530] flex items-center justify-center">
            <span className="font-mono text-[8px] text-white uppercase tracking-widest">CF</span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#071530] font-semibold">
            Conrad<span className="font-normal">Foundation</span>
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#071530]/40">
          Mission Water · Private
        </span>
      </div>
    </nav>
  );
}

// ─── Kicker ───────────────────────────────────────────────────────────────────
function Kicker({ children, light = false, className = '' }) {
  return (
    <p className={`font-mono text-[10px] uppercase tracking-[0.28em] ${light ? 'text-[#E85D26]' : 'text-[#E85D26]'} ${className}`}>
      {children}
    </p>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MissionWaterPlatform() {
  useSEO();

  return (
    <div className="bg-white text-[#071530] min-h-screen" style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}>

      <ConradNav />

      {/* ─── Hero — deep navy, mission-driven ────────────────────────────────── */}
      <section
        className="px-6 md:px-12 pt-20 md:pt-28 pb-20 md:pb-28"
        style={{ background: 'linear-gradient(160deg, #071530 0%, #0D2045 60%, #0D2A5C 100%)' }}
      >
        <div className="max-w-[1280px] mx-auto">
          <motion.div {...fadeUp()}>
            <Kicker className="mb-6 opacity-80">The platform · 2026</Kicker>
            <h1
              className="font-display-serif text-[44px] md:text-[80px] lg:text-[100px] leading-[0.95] tracking-[-0.03em] max-w-[960px] mb-6 text-white"
            >
              The platform your{' '}
              <em className="font-display-italic italic font-medium text-[#E85D26]">masterclass</em>{' '}
              deserves.
            </h1>
            <p className="font-body text-[17px] md:text-[20px] leading-[1.55] max-w-[580px] text-white/65 mb-10">
              Conrad Foundation convenes the program. AOM builds the platform students, educators, and parents actually use.
            </p>
            <a
              href="mailto:hello@aheadofmarket.com?subject=Mission%20Water%20Platform"
              className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-white font-mono text-[10.5px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-full transition-colors"
            >
              Build this together →
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── Game Demo — dark panel on cream ──────────────────────────────────── */}
      <section className="bg-[#F4F2EF] px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-8" {...fadeUp()}>
            <Kicker className="mb-3">Live demo · play it now</Kicker>
            <h2 className="font-display-serif text-[32px] md:text-[48px] leading-[1.0] tracking-[-0.025em] text-[#071530]">
              The game is already built.<br />
              <span className="text-[#E85D26]">Try it here.</span>
            </h2>
          </motion.div>

          <motion.div
            className="rounded-2xl overflow-hidden shadow-xl"
            style={{ border: '1px solid rgba(7,21,48,0.12)' }}
            {...fadeUp(0.1)}
          >
            {/* Browser chrome bar */}
            <div className="bg-[#071530] px-5 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
              </div>
              <span className="font-mono text-[9.5px] text-white/35 uppercase tracking-[0.15em]">
                aheadofmarket.com/missionwater
              </span>
              <a
                href="https://aheadofmarket.com/missionwater"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto font-mono text-[9px] text-[#E85D26]/80 hover:text-[#E85D26] uppercase tracking-[0.15em] transition-colors"
              >
                Full screen ↗
              </a>
            </div>
            <div className="aspect-video bg-[#071530] relative">
              {/* Loading backdrop — visible until iframe paints */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none z-0">
                <div className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-[#E85D26]/40" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/20">Loading game…</span>
              </div>
              <iframe
                src="https://aheadofmarket.com/missionwater"
                title="Mission Water Interactive Game"
                className="w-full h-full border-0 relative z-10"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Platform Pillars — white section ────────────────────────────────── */}
      <section className="bg-white px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-12" {...fadeUp()}>
            <Kicker className="mb-3">The platform</Kicker>
            <h2 className="font-display-serif text-[32px] md:text-[48px] leading-[1.0] tracking-[-0.025em] text-[#071530]">
              Self-paced. Tracked.{' '}
              <span className="text-[#E85D26]">Complete.</span>
            </h2>
            <p className="font-body text-[16px] text-[#071530]/55 leading-[1.6] max-w-[580px] mt-4">
              Built on the proven summer-school engine we shipped in 2026. Themed for water science. Ready to scale across every Conrad Foundation masterclass.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                kicker: 'Students',
                title: 'Self-paced modules',
                desc: 'Sequential lessons with timers, progress tracking, and student teach-back submissions.',
                icon: '◎',
              },
              {
                kicker: 'Progress',
                title: 'Weekly report cards',
                desc: 'Real-time dashboards for educators to see where every student stands — no spreadsheets.',
                icon: '◈',
              },
              {
                kicker: 'Submit',
                title: 'Student deliverables',
                desc: 'Students upload reflections and project work. Educators grade and give feedback inside the platform.',
                icon: '◇',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="p-8 rounded-xl bg-[#F4F2EF]"
                style={{ border: '1px solid rgba(7,21,48,0.08)' }}
                {...fadeUp(0.08 + i * 0.06)}
              >
                <div className="text-[#E85D26] text-[20px] mb-4">{item.icon}</div>
                <Kicker className="mb-2">{item.kicker}</Kicker>
                <p className="font-display-serif text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.015em] text-[#071530] mb-3">
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

      {/* ─── Admin + Stream — navy band ───────────────────────────────────────── */}
      <section
        className="px-6 md:px-12 py-16 md:py-24"
        style={{ background: 'linear-gradient(160deg, #071530 0%, #0D2045 100%)' }}
      >
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="mb-10" {...fadeUp()}>
            <Kicker className="mb-3">For educators + parents</Kicker>
            <h2 className="font-display-serif text-[32px] md:text-[48px] leading-[1.0] tracking-[-0.025em] text-white">
              Everyone has a seat<br />
              <span className="text-[#E85D26]">at the table.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                kicker: 'Admin Dashboard',
                title: 'Educators & parents',
                desc: 'Separate logins, same dashboard — different views. Educators see the full roster; parents see their student.',
              },
              {
                kicker: 'Live Stream Portal',
                title: 'Classes + archive',
                desc: 'Upcoming sessions previewed with set-a-reminder. Every recorded class archived indefinitely. Powered by YouTube Live.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="p-8 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                {...fadeUp(0.08 + i * 0.08)}
              >
                <Kicker className="mb-3">{item.kicker}</Kicker>
                <p className="font-display-serif text-[22px] md:text-[28px] leading-[1.1] tracking-[-0.015em] text-white mb-3">
                  {item.title}
                </p>
                <p className="font-body text-[14px] text-white/55 leading-[1.65]">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA — white ──────────────────────────────────────────────────────── */}
      <section className="bg-white px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[640px]" {...fadeUp()}>
            <Kicker className="mb-5">Ready when you are</Kicker>
            <h2 className="font-display-serif text-[36px] md:text-[56px] leading-[0.95] tracking-[-0.025em] text-[#071530] mb-6">
              Conrad Foundation convenes.<br />
              <span className="text-[#E85D26]">AOM builds.</span>
            </h2>
            <p className="font-body text-[16px] text-[#071530]/55 leading-[1.65] mb-8 max-w-[480px]">
              The game is live. The summer-school engine is proven. Let&apos;s talk about what Mission Water looks like at full build.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="mailto:hello@aheadofmarket.com?subject=Mission%20Water%20Platform%20Partnership"
                className="inline-flex items-center gap-2 bg-[#071530] hover:bg-[#0D2045] text-white font-mono text-[10.5px] uppercase tracking-[0.2em] px-8 py-4 rounded-full transition-colors"
              >
                Let&apos;s talk →
              </a>
              <p className="font-body text-[13px] text-[#071530]/40 italic">
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
              Mission Water Platform · Confidential · 2026
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3.5 py-2 rounded-full"
            style={{ border: '1px solid rgba(7,21,48,0.10)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#071530]/20" />
            <span className="font-mono text-[9px] text-[#071530]/35 uppercase tracking-[0.18em]">
              Private · Not for distribution
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
