// R10 — Conrad Foundation · Mission Water platform
// Title page ("The future of water in space") + one big interactive stage
// (Play the Game / Watch Live / Archive) that fills the viewport so the game
// needs no scrolling. All surfaces are config-driven for easy updates.
// /MissionWaterPlatform · /missionwaterplatform · /platform
// Mission: conrad-foundation:mission-water
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ─── Config (update these as the game + videos evolve) ──────────────────────────
const GAME_URL = 'https://aheadofmarket.com/missionwater';

// Live stream — drop the YouTube Live (unlisted) embed URL in when a class airs.
const LIVE = {
  status: 'standby',          // 'live' | 'scheduled' | 'standby'
  embedUrl: '',               // e.g. 'https://www.youtube.com/embed/VIDEO_ID'
  title: 'Mission Water — Live Class 01',
  nextSession: 'Schedule to be announced',
};

// Archive — recorded sessions land here after each live class is filmed.
const ARCHIVE = [
  // { title: 'Class 01 — What happens when water is no more?', date: 'Apr 2026', duration: '52 min', url: '', thumb: '' },
];

// Big interactive stage height — sized to fill the viewport (no page scroll to play).
const STAGE_H = 'clamp(460px, 76vh, 820px)';

// ─── SEO ──────────────────────────────────────────────────────────────────────
function useSEO() {
  useEffect(() => {
    document.title = 'Mission Water | The future of water in space';
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
    setMeta('description', 'Mission Water — the interactive learning platform for the Conrad Foundation masterclass. The future of water in space.');
    setMeta('og:title', 'Mission Water | The future of water in space', true);
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

// Scattered starfield for the navy title page — restrained, evokes Conrad's space heritage.
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

// ─── Wordmark + Nav ───────────────────────────────────────────────────────────
function ConradNav() {
  return (
    <nav className="w-full bg-white border-b border-[#071530]/[0.08] px-6 md:px-12 py-4 sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#071530] flex items-center justify-center">
            <span className="font-mono text-[8px] text-white uppercase tracking-widest">CF</span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#071530] font-semibold">
            Conrad<span className="font-normal">Foundation</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#stage" className="hidden sm:inline font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#071530]/50 hover:text-[#E85D26] transition-colors">
            Play
          </a>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#071530]/40">
            Mission Water · Private
          </span>
        </div>
      </div>
    </nav>
  );
}

// ─── Kicker ───────────────────────────────────────────────────────────────────
function Kicker({ children, className = '' }) {
  return (
    <p className={`font-mono text-[10px] uppercase tracking-[0.28em] text-[#E85D26] ${className}`}>
      {children}
    </p>
  );
}

// ─── Live broadcast console (inside the stage) ──────────────────────────────────
// Sample broadcast — Nancy's footage stands in as the live feed so the live-class
// experience is visible before a real class airs. Swap LIVE.embedUrl + status='live'
// when a class goes on air and the production iframe takes over.
const SAMPLE_FEED = '/ConradFoundation/nancy-sample-tile-v1.mp4';
const SAMPLE_POSTER = '/ConradFoundation/nancy-still-placeholder.jpg';

const LIVE_QUESTIONS = [
  { who: 'Maya R.', txt: 'How much of Earth’s water can we actually drink?', t: '00:42' },
  { who: 'Devon K.', txt: 'Could we recycle water the same way on Mars?', t: '01:15' },
  { who: 'Priya S.', txt: 'Which city is closest to running out right now?', t: '02:03' },
  { who: 'Liam T.', txt: 'Is desalination too expensive to scale up?', t: '02:48' },
  { who: 'Aisha J.', txt: 'What can students actually do about it locally?', t: '03:05' },
];
const ROSTER = ['MR', 'DK', 'PS', 'LT', 'AJ', 'CN', 'EO', 'TW'];

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('');
}

function LivePanel() {
  const [muted, setMuted] = useState(true);

  // Real class airing — production path takes over the whole stage.
  if (LIVE.status === 'live' && LIVE.embedUrl) {
    return (
      <iframe
        src={LIVE.embedUrl}
        title={LIVE.title}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Sample broadcast console — feed + interactive class rail.
  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-[#071530]">
      {/* ── Feed ──────────────────────────────────────────────────────────── */}
      <div className="relative flex-[2] lg:flex-1 min-h-0 bg-black overflow-hidden">
        <video
          src={SAMPLE_FEED}
          poster={SAMPLE_POSTER}
          autoPlay
          muted={muted}
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Top scrim + telemetry */}
        <div
          className="absolute inset-x-0 top-0 px-4 md:px-5 pt-4 pb-8 flex items-start justify-between"
          style={{ background: 'linear-gradient(180deg, rgba(7,21,48,0.85) 0%, transparent 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 bg-[#E85D26] text-white font-mono text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-[3px]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              Live
            </span>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-white/45">Sample broadcast</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/50">
            <span><span className="text-white/85">312</span> watching</span>
            <span className="hidden sm:inline">Elapsed <span className="text-white/85">03:11</span></span>
          </div>
        </div>

        {/* Bottom scrim + now-teaching + mute control */}
        <div
          className="absolute inset-x-0 bottom-0 px-4 md:px-5 pt-10 pb-4 flex items-end justify-between gap-4"
          style={{ background: 'linear-gradient(0deg, rgba(7,21,48,0.92) 0%, transparent 100%)' }}
        >
          <div className="min-w-0">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#E85D26] mb-1.5">Now teaching · Nancy Conrad</p>
            <p className="font-display-serif text-[18px] md:text-[22px] leading-[1.12] text-white truncate">
              Class 01 — <span className="italic font-display-italic text-white/90">What happens when water is no more?</span>
            </p>
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            className="shrink-0 flex items-center gap-2 border border-white/25 hover:border-[#E85D26] text-white/85 hover:text-[#E85D26] font-mono text-[9px] uppercase tracking-[0.18em] px-3.5 py-2 rounded-full transition-colors"
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      </div>

      {/* ── Interactive class rail ─────────────────────────────────────────── */}
      <aside className="flex-1 lg:flex-none lg:w-[316px] min-h-0 flex flex-col bg-[#0A1C3D] border-t lg:border-t-0 lg:border-l border-white/10">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/70">Live class · Q&amp;A</span>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/35">In the room</span>
        </div>

        {/* Watching */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2.5">
          <div className="flex -space-x-2">
            {ROSTER.slice(0, 6).map((i, ix) => (
              <span
                key={ix}
                className="w-6 h-6 rounded-full bg-[#143B6E] border border-[#0A1C3D] flex items-center justify-center font-mono text-[7.5px] text-white/75 uppercase"
              >
                {i}
              </span>
            ))}
          </div>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/40">+306 watching</span>
        </div>

        {/* Questions feed */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 space-y-4">
          {LIVE_QUESTIONS.map((q, i) => (
            <div key={i} className="flex gap-2.5">
              <span className="w-6 h-6 shrink-0 rounded-full bg-[#143B6E] flex items-center justify-center font-mono text-[7.5px] text-white/75 uppercase mt-0.5">
                {initials(q.who)}
              </span>
              <div className="min-w-0">
                <p className="font-body text-[12.5px] text-white/80 leading-[1.45]">{q.txt}</p>
                <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/30 mt-1">{q.who} · {q.t}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Composer + reactions */}
        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full pl-3.5 pr-2 py-1.5">
            <input
              disabled
              placeholder="Ask Nancy a question…"
              className="flex-1 min-w-0 bg-transparent font-body text-[12px] text-white/70 placeholder-white/30 outline-none cursor-default"
            />
            <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#E85D26] px-2">Send</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5">
            {['Raise hand', 'Helpful', 'Mind blown'].map((r) => (
              <span
                key={r}
                className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/45 border border-white/12 rounded-full px-2.5 py-1"
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── Archive panel (inside the stage) ───────────────────────────────────────────
function ArchivePanel() {
  if (ARCHIVE.length > 0) {
    return (
      <div className="w-full h-full overflow-y-auto p-6 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ARCHIVE.map((v, i) => (
            <a
              key={i}
              href={v.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl overflow-hidden bg-white/[0.04] border border-white/10 hover:border-[#E85D26]/50 transition-colors"
            >
              <div className="aspect-video bg-[#0D2045] relative overflow-hidden">
                {v.thumb
                  ? <img src={v.thumb} alt={v.title} className="w-full h-full object-cover" />
                  : <div className="absolute inset-0 flex items-center justify-center text-white/20 text-3xl">▷</div>}
                <span className="absolute top-2 right-2 font-mono text-[8px] uppercase tracking-[0.15em] text-white/60 bg-black/40 px-2 py-1 rounded">
                  {v.duration}
                </span>
              </div>
              <div className="p-4">
                <p className="font-display-serif text-[16px] leading-[1.2] text-white mb-1.5 group-hover:text-[#E85D26] transition-colors">{v.title}</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">{v.date}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }
  // Empty state — designed "coming soon" so the archive reads intentional, not blank.
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
      <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-[440px] opacity-40">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-video rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center">
            <span className="text-white/20 text-lg">▷</span>
          </div>
        ))}
      </div>
      <Kicker className="mb-3">Archive</Kicker>
      <h3 className="font-display-serif text-[24px] md:text-[32px] leading-[1.05] tracking-[-0.02em] text-white max-w-[500px] mb-3">
        Every class, kept <span className="text-[#E85D26] italic font-display-italic">forever.</span>
      </h3>
      <p className="font-body text-[14px] text-white/50 leading-[1.6] max-w-[440px]">
        Recordings appear here after each live session — a permanent library students, families, sponsors, and future cohorts can return to anytime.
      </p>
    </div>
  );
}

// ─── Stage (tabbed: game / live / archive) ──────────────────────────────────────
function Stage({ tab, setTab }) {
  const tabs = [
    { id: 'live', label: 'Watch Live', url: 'aheadofmarket.com/missionwaterlive' },
    { id: 'game', label: 'Play the Game', url: 'aheadofmarket.com/missionwater' },
    { id: 'archive', label: 'Archive', url: 'aheadofmarket.com/missionwater/archive' },
  ];
  const active = tabs.find((t) => t.id === tab);

  return (
    <section id="stage" className="bg-[#F4F2EF] px-4 sm:px-6 md:px-12 py-12 md:py-20 scroll-mt-20">
      <div className="max-w-[1320px] mx-auto">
        <motion.div className="mb-7 flex flex-col md:flex-row md:items-end md:justify-between gap-5" {...fadeUp()}>
          <div>
            <Kicker className="mb-3">The platform · live now</Kicker>
            <h2 className="font-display-serif text-[30px] md:text-[46px] leading-[1.0] tracking-[-0.025em] text-[#071530]">
              One window. <span className="text-[#E85D26]">Everything inside.</span>
            </h2>
          </div>

          {/* Tab switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((t) => {
              const isActive = t.id === tab;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`font-mono text-[10px] uppercase tracking-[0.18em] px-4 py-2.5 rounded-full border transition-colors ${
                    isActive
                      ? 'bg-[#071530] text-white border-[#071530]'
                      : 'bg-transparent text-[#071530]/55 border-[#071530]/15 hover:border-[#071530]/40 hover:text-[#071530]'
                  }`}
                >
                  {t.id === 'live' && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E85D26] mr-1.5 align-middle" />
                  )}
                  {t.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Framed stage */}
        <motion.div
          className="rounded-2xl overflow-hidden shadow-xl"
          style={{ border: '1px solid rgba(7,21,48,0.12)' }}
          {...fadeUp(0.1)}
        >
          {/* Chrome bar */}
          <div className="bg-[#071530] px-5 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/15" />
            </div>
            <span className="font-mono text-[9.5px] text-white/35 uppercase tracking-[0.15em] truncate">
              {active.url}
            </span>
            {tab === 'game' && (
              <a
                href={GAME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto font-mono text-[9px] text-[#E85D26]/80 hover:text-[#E85D26] uppercase tracking-[0.15em] transition-colors whitespace-nowrap"
              >
                Full screen ↗
              </a>
            )}
          </div>

          {/* Panels — game iframe stays mounted; live/archive toggle on top */}
          <div className="relative bg-[#071530]" style={{ height: STAGE_H }}>
            {/* Game (always mounted to preserve progress) */}
            <div className={tab === 'game' ? 'block h-full' : 'hidden'}>
              <div className="relative w-full h-full">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none z-0">
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-[#E85D26]/40" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/20">Loading game…</span>
                </div>
                <iframe
                  src={GAME_URL}
                  title="Mission Water Interactive Game"
                  className="w-full h-full border-0 relative z-10"
                />
              </div>
            </div>

            {/* Live */}
            <div className={tab === 'live' ? 'block h-full' : 'hidden'}>
              <LivePanel />
            </div>

            {/* Archive */}
            <div className={tab === 'archive' ? 'block h-full' : 'hidden'}>
              <ArchivePanel />
            </div>
          </div>
        </motion.div>

        <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#071530]/35 mt-4 text-center">
          The game grows — this window grows with it. Live classes + recordings stream in the same place.
        </p>
      </div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MissionWaterPlatform() {
  useSEO();
  const [tab, setTab] = useState('live');

  const goToStage = (id) => {
    setTab(id);
    requestAnimationFrame(() =>
      document.getElementById('stage')?.scrollIntoView({ behavior: 'smooth' })
    );
  };

  return (
    <div className="bg-white text-[#071530] min-h-screen scroll-smooth" style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}>

      <ConradNav />

      {/* ─── Title page — "The future of water in space" ─────────────────────── */}
      <section
        className="relative overflow-hidden px-6 md:px-12 pt-20 md:pt-28 pb-20 md:pb-24"
        style={{ background: 'radial-gradient(125% 85% at 50% -8%, #143b6e 0%, #0D2045 40%, #071530 100%)' }}
      >
        {/* Starfield */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: STARFIELD }} />
        {/* Orbital arcs */}
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
              <Kicker>Conrad Foundation · Mission Water</Kicker>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">Est. 2008</span>
            </div>
            <h1 className="font-display-serif text-[46px] md:text-[84px] lg:text-[108px] leading-[0.92] tracking-[-0.035em] max-w-[1040px] mb-7 text-white">
              The future of water<br />
              <em className="font-display-italic italic font-medium text-[#E85D26]">in space.</em>
            </h1>
            <p className="font-body text-[17px] md:text-[20px] leading-[1.55] max-w-[600px] text-white/65 mb-10">
              The interactive masterclass where students learn the science of water, play it, and present real solutions for life on Earth — and beyond.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#stage"
                onClick={(e) => { e.preventDefault(); goToStage('game'); }}
                className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-white font-mono text-[10.5px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-full transition-colors"
              >
                Play the game ↓
              </a>
              <a
                href="/missionwaterlive"
                className="inline-flex items-center gap-2 border border-white/25 hover:border-white/60 text-white/85 font-mono text-[10.5px] uppercase tracking-[0.2em] px-7 py-3.5 rounded-full transition-colors"
              >
                Watch live →
              </a>
            </div>
          </motion.div>

          {/* Mission readout strip */}
          <motion.div
            className="mt-16 md:mt-20 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/10 pt-7"
            {...fadeUp(0.15)}
          >
            {[
              ['Format', 'Live + self-paced'],
              ['Audience', 'Students 13–18'],
              ['Built on', 'Proven course engine'],
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

      {/* ─── Interactive stage (game / live / archive) ───────────────────────── */}
      <Stage tab={tab} setTab={setTab} />

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
              Built on the proven course engine we shipped in 2026. Themed for water science. Ready to scale across every Conrad Foundation masterclass.
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

      {/* ─── Admin — navy band ────────────────────────────────────────────────── */}
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
                kicker: 'Live + Archive',
                title: 'Stream then keep',
                desc: 'Upcoming sessions previewed with set-a-reminder. Every recorded class kept indefinitely — and it all plays in the window above.',
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
              The game is live. The course engine is proven. Let&apos;s talk about what Mission Water looks like at full build.
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
