// R11 — Conrad Foundation · Mission Water — Live Class
// Dedicated live class viewing experience. Fullscreen mission-control layout.
// Nancy's video plays as "preview" state so the page never feels empty.
// Routes: /missionwaterlive | /MissionWaterLive
// Mission: conrad-foundation:mission-water
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// ── Config — flip this when a class is airing ─────────────────────────────────
const LIVE = {
  status: 'preview',     // 'live' | 'preview' | 'standby'
 embedUrl: '', // YouTube Live unlisted embed URL, paste when airing
  classNumber: '01',
  title: 'What happens when water is no more?',
  speaker: 'Nancy Conrad',
  speakerTitle: 'Founding Chairman\nConrad Foundation',
  nextSession: 'Schedule to be announced',
};

// Nancy's video — plays as a "taste of the class" when nothing is live.
const PREVIEW_VIDEO = '/ConradFoundation/nancy-sample-tile-v1.mp4';
const SPEAKER_IMG   = '/ConradFoundation/nancy-expert-masterclass.jpg';

// ── SEO ───────────────────────────────────────────────────────────────────────
function useSEO() {
  useEffect(() => {
 document.title = 'Watch Live | Mission Water, Conrad Foundation';
    const set = (name, content, prop = false) => {
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
 set('description'·'Watch Mission Water live classes, Conrad Foundation');
    set('robots', 'noindex, nofollow');
  }, []);
}

// ── Live badge ────────────────────────────────────────────────────────────────
function LiveBadge({ status }) {
  if (status === 'live') return (
    <span className="flex items-center gap-2 bg-[#E85D26] text-white font-mono text-[9px] uppercase tracking-[0.22em] px-3.5 py-1.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      Live
    </span>
  );
  if (status === 'preview') return (
    <span className="flex items-center gap-2 bg-white/[0.06] text-white/45 font-mono text-[9px] uppercase tracking-[0.22em] px-3.5 py-1.5 rounded-full border border-white/10">
      <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
      Preview
    </span>
  );
  return (
    <span className="flex items-center gap-2 bg-white/[0.04] text-white/30 font-mono text-[9px] uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full border border-white/[0.08]">
      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
      Off air
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MissionWaterLive() {
  useSEO();
  const isLive = LIVE.status === 'live' && LIVE.embedUrl;

  return (
    <div
      className="bg-[#071530] text-white min-h-screen flex flex-col select-none"
      style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
    >

      {/* ── Top bar ── */}
      <header className="flex-none border-b border-white/[0.07] px-5 md:px-7 py-3.5 flex items-center justify-between gap-4">
        {/* Back */}
        <Link
          to="/missionwaterplatform"
          className="flex items-center gap-2 text-white/35 hover:text-white/70 transition-colors font-mono text-[9px] uppercase tracking-[0.2em] whitespace-nowrap"
        >
          <span className="text-[11px]">←</span> Platform
        </Link>

        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-white/10 flex items-center justify-center">
            <span className="font-mono text-[6.5px] text-white/50 uppercase tracking-widest">CF</span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            Conrad<span className="text-white/20 ml-0.5">Foundation</span>
          </span>
        </div>

        {/* Status */}
        <LiveBadge status={LIVE.status} />
      </header>

      {/* ── Main: video + sidebar ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" style={{ minHeight: 0 }}>

        {/* Video pane */}
        <div className="relative flex-1 bg-black overflow-hidden" style={{ minHeight: '40vw' }}>

          {isLive ? (
            <iframe
              src={LIVE.embedUrl}
 title={`Mission Water, Class ${LIVE.classNumber}`}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
 {/* Nancy's video as preview, muted autoplay loop */}
              <video
                src={PREVIEW_VIDEO}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
              {/* Gradient overlay — darker at edges, lighter at center */}
              <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(7,21,48,0.05) 0%, rgba(7,21,48,0.35) 100%)' }}
              />
              {/* Preview label — top-left floating chip */}
              {LIVE.status === 'preview' && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-[#071530]/70 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-white/50">
                    Preview · Class {LIVE.classNumber}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Chyron — class info overlaid at video bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 px-6 md:px-8 py-6"
            style={{ background: 'linear-gradient(to top, rgba(7,21,48,0.95) 0%, rgba(7,21,48,0.6) 60%, transparent 100%)' }}
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#E85D26] mb-2">
              Conrad Foundation · Mission Water · Class {LIVE.classNumber}
            </p>
            <h1 className="font-display-serif text-[22px] md:text-[32px] lg:text-[38px] leading-[1.05] tracking-[-0.02em] text-white max-w-[720px]">
              {LIVE.title}
            </h1>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="w-full lg:w-[300px] xl:w-[340px] flex-none bg-[#0A1C40] border-l border-white/[0.07] flex flex-col overflow-hidden">

          {/* Speaker */}
          <motion.div
            className="p-6 border-b border-white/[0.07]"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/25 mb-3.5">Instructor</p>
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full overflow-hidden flex-none border border-white/10">
                <img src={SPEAKER_IMG} alt={LIVE.speaker} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-display-serif text-[16px] text-white leading-[1.1]">{LIVE.speaker}</p>
                {LIVE.speakerTitle.split('\n').map((line, i) => (
                  <p key={i} className="font-mono text-[8.5px] text-white/35 leading-[1.6] mt-0.5">{line}</p>
                ))}
              </div>
            </div>
          </motion.div>

          {/* About this class */}
          <motion.div
            className="p-6 border-b border-white/[0.07]"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
          >
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/25 mb-3">This class</p>
            <p className="font-display-serif text-[17px] leading-[1.25] text-white mb-3">{LIVE.title}</p>
            <div className="flex flex-wrap gap-2">
              {['Water science', 'Space systems', 'Student-led'].map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/35 border border-white/[0.08] px-2.5 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Q&A panel */}
          <motion.div
            className="flex-1 p-6 flex flex-col"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-white/25 mb-4">Q&amp;A</p>

            {isLive ? (
              /* Live Q&A — real chat would go here */
              <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] flex items-end p-4">
                <div className="w-full">
                  <div className="rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 mb-2">
                    <p className="font-body text-[13px] text-white/60 italic">Ask Nancy a question…</p>
                  </div>
                  <p className="font-mono text-[8.5px] text-white/20 text-center uppercase tracking-[0.15em]">Q&A is open</p>
                </div>
              </div>
            ) : (
              /* Off-air / standby Q&A placeholder */
              <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col items-center justify-center text-center p-6 gap-5">
                {/* Ghost chat bubbles */}
                <div className="w-full max-w-[200px] space-y-2 opacity-15">
                  <div className="h-5 rounded-full bg-white/30 w-[75%]" />
                  <div className="h-5 rounded-full bg-white/20 w-[55%] ml-auto" />
                  <div className="h-5 rounded-full bg-white/30 w-[80%]" />
                  <div className="h-5 rounded-full bg-white/20 w-[40%] ml-auto" />
                </div>
                <div>
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-white/25 mb-2">Opens during class</p>
                  <p className="font-body text-[13px] text-white/35 leading-[1.6] max-w-[200px]">
                    Ask questions and interact with Nancy in real time.
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Next session + reminder */}
          {LIVE.status !== 'live' && (
            <motion.div
              className="p-5 border-t border-white/[0.07]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <p className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/20 mb-1.5">Next session</p>
              <p className="font-body text-[13px] text-white/45 mb-3">{LIVE.nextSession}</p>
              <a
                href="mailto:hello@aheadofmarket.com?subject=Mission%20Water%20%E2%80%94%20Class%20Reminder"
                className="flex items-center justify-center gap-2 border border-white/10 hover:border-[#E85D26]/50 text-white/40 hover:text-[#E85D26] font-mono text-[8.5px] uppercase tracking-[0.2em] px-4 py-2.5 rounded-full transition-colors w-full"
              >
                Set a reminder →
              </a>
            </motion.div>
          )}

        </aside>
      </div>

      {/* ── Footer strip ── */}
      <footer className="flex-none border-t border-white/[0.07] px-6 py-3 flex items-center justify-between">
        <p className="font-mono text-[8.5px] text-white/18 uppercase tracking-[0.15em]">
          Mission Water · Private · Confidential · 2026
        </p>
        <Link
          to="/missionwaterplatform"
          className="font-mono text-[8.5px] text-white/20 hover:text-white/50 uppercase tracking-[0.15em] transition-colors"
        >
          ← Back to platform
        </Link>
      </footer>

    </div>
  );
}