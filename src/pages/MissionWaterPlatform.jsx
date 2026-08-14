// R14 — Conrad Foundation · Mission Water platform
// Interactive Q&A, video centering + seek, add-on trim (from R11 base).
// /MissionWaterPlatform · /missionwaterplatform · /platform
// Mission: conrad-foundation:mission-water
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ─── Config (update these as the game + videos evolve) ──────────────────────────
const GAME_URL = 'https://aheadofmarket.com/missionwater';

// Live stream — flip status to 'live' + drop embed URL when a class airs.
const LIVE = {
  status: 'scheduled',         // 'live' | 'scheduled' | 'standby'
  embedUrl: '',                // e.g. 'https://www.youtube.com/embed/VIDEO_ID'
 title: 'Mission Water, Live Class 01',
  nextSession: 'August 14, 2026 · 4:00 PM ET',
};

// Upcoming sessions — dates, titles, descriptions for the calendar rail.
const SESSIONS = [
  {
    id: 1,
    date: 'Aug 14, 2026',
    time: '4:00 PM ET',
 title: 'Class 01, What happens when water is no more?',
    desc: 'Nancy Conrad opens Mission Water. Where does water come from, where is it going, and what happens when it runs out?',
    registered: false,
  },
  {
    id: 2,
    date: 'Aug 21, 2026',
    time: '4:00 PM ET',
 title: 'Class 02, Water on other worlds',
    desc: 'Ice on the Moon, oceans under Europa. We explore how water shapes the possibility of life beyond Earth.',
    registered: false,
  },
  {
    id: 3,
    date: 'Aug 28, 2026',
    time: '4:00 PM ET',
 title: 'Class 03, Engineering solutions',
    desc: 'From desalination to closed-loop water systems for deep space. Students design a water plan for a Mars colony.',
    registered: false,
  },
  {
    id: 4,
    date: 'Sep 4, 2026',
    time: '4:00 PM ET',
 title: 'Class 04, Student presentations',
    desc: 'Cadets present their water-crisis solutions. The best ideas go to the Conrad Foundation board.',
    registered: false,
  },
];

// Archive — recorded sessions land here after each live class.
const ARCHIVE = [
  // { title: 'Class 01 — What happens when water is no more?', date: 'Apr 2026', duration: '52 min', url: '', thumb: '' },
];

// Stage height — fills viewport so the game needs no scrolling.
const STAGE_H = 'clamp(480px, 80vh, 860px)';

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
    setMeta('description', 'Mission Water, the interactive learning platform for the Conrad Foundation masterclass. The future of water in space.');
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

// Scattered starfield for the navy title page
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
          <a href="/missionwateroffering" className="hidden sm:inline font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#071530]/50 hover:text-[#E85D26] transition-colors">
            Partnership
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

// ─── Sign-up Modal ─────────────────────────────────────────────────────────────
function SignUpModal({ session, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    // In production, wire to an API endpoint
    setDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(7,21,48,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[440px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#0D2045', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <Kicker className="mb-2">Register · {session.date}</Kicker>
          <h3 className="font-display-serif text-[20px] leading-[1.2] tracking-[-0.015em] text-white">
            {session.title}
          </h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 mt-2">
            {session.time}
          </p>
        </div>

        {done ? (
          <div className="px-6 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#E85D26]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-[#E85D26] text-xl">✓</span>
            </div>
            <p className="font-display-serif text-[18px] text-white mb-2">You're registered.</p>
            <p className="font-body text-[13px] text-white/50 mb-5">
              A reminder will be sent to {email} before the class goes live.
            </p>
            <button
              onClick={onClose}
              className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/60 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5">
                Your name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name"
                required
                className="w-full px-4 py-2.5 rounded-lg font-body text-[13px] text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-[#E85D26]"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 rounded-lg font-body text-[13px] text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-[#E85D26]"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                className="flex-1 bg-[#E85D26] hover:bg-[#E85D26]/90 text-white font-mono text-[10px] uppercase tracking-[0.2em] py-3 rounded-full transition-colors"
              >
                Register + set reminder
              </button>
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Upcoming Sessions Calendar ────────────────────────────────────────────────
function SessionCalendar({ onRegister }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
          Upcoming sessions
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
          {SESSIONS.length} classes
        </span>
      </div>
      {SESSIONS.map((s) => (
        <div
          key={s.id}
          className="flex items-start gap-3 p-3.5 rounded-xl group"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Date block */}
          <div
            className="shrink-0 text-center rounded-lg px-2.5 py-2 min-w-[48px]"
            style={{ background: 'rgba(232,93,38,0.15)', border: '1px solid rgba(232,93,38,0.3)' }}
          >
            <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#E85D26] leading-none mb-0.5">
              {s.date.split(',')[0].split(' ')[0]}
            </p>
            <p className="font-mono text-[18px] font-bold text-[#E85D26] leading-none">
              {s.date.split(',')[0].split(' ')[1]}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p title={s.title} className="font-body text-[13px] text-white leading-[1.3] mb-0.5 truncate">{s.title}</p>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/35">{s.time}</p>
          </div>

          {/* Bell / register */}
          <button
            onClick={() => onRegister(s)}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-white/15 hover:border-[#E85D26] hover:bg-[#E85D26]/10 transition-colors group-hover:opacity-100 opacity-70"
            title="Register for reminder"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/70 group-hover:text-[#E85D26]">
              <path d="M7 1a4.5 4.5 0 0 1 4.5 4.5c0 2.5.9 3.5 1.5 4H1c.6-.5 1.5-1.5 1.5-4A4.5 4.5 0 0 1 7 1Z" strokeLinecap="round" />
              <path d="M5.5 12.5a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Live Q&A Widget ───────────────────────────────────────────────────────────
const LIVE_QUESTIONS = [
  { who: 'Maya R.', txt: "How much of Earth's water can we actually drink?", t: '00:42' },
  { who: 'Devon K.', txt: 'Could we recycle water the same way on Mars?', t: '01:15' },
  { who: 'Priya S.', txt: 'Which city is closest to running out right now?', t: '02:03' },
  { who: 'Liam T.', txt: 'Is desalination too expensive to scale up?', t: '02:48' },
  { who: 'Aisha J.', txt: 'What can students actually do about it locally?', t: '03:05' },
];
const ROSTER = ['MR', 'DK', 'PS', 'LT', 'AJ', 'CN', 'EO', 'TW'];

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('');
}

function QAWidget() {
  const [questions, setQuestions] = useState(LIVE_QUESTIONS.slice(0, 3));
  const [draft, setDraft] = useState('');
  const [roomCount, setRoomCount] = useState(306);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom when a new question arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [questions]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setQuestions((prev) => [...prev, { who: 'You', txt: text, t }]);
    setDraft('');
    setRoomCount((c) => c + 1);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.12)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#E85D26]/60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E85D26]" />
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/70">Live class · Q&amp;A</span>
        </div>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/35">In the room</span>
      </div>

      {/* Watching avatars */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
        <div className="flex -space-x-1.5">
          {ROSTER.slice(0, 5).map((i, ix) => (
            <span key={ix} className="w-5 h-5 rounded-full bg-[#143B6E] border border-[#071530] flex items-center justify-center font-mono text-[6.5px] text-white/75 uppercase">
              {i}
            </span>
          ))}
        </div>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/40">+{roomCount} watching</span>
      </div>

      {/* Questions */}
      <div
        ref={scrollRef}
        className="px-4 py-3 space-y-3 max-h-[180px] overflow-y-auto"
        style={{ background: 'rgba(0,0,0,0.10)' }}
      >
        {questions.map((q, i) => (
          <div key={i} className="flex gap-2">
            <span className="w-5 h-5 shrink-0 rounded-full bg-[#143B6E] flex items-center justify-center font-mono text-[6.5px] text-white/75 uppercase mt-0.5">
              {initials(q.who)}
            </span>
            <div>
              <p className="font-body text-[12px] text-white/75 leading-[1.4]">{q.txt}</p>
              <p className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-white/28 mt-0.5">{q.who} · {q.t}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="px-3 py-2.5 border-t border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full pl-3 pr-2 py-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nancy a question…"
            className="flex-1 min-w-0 bg-transparent font-body text-[11px] text-white/80 placeholder-white/25 outline-none"
          />
          <button
            onClick={handleSend}
            className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#E85D26] px-2 cursor-pointer hover:text-[#E85D26]/70 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Archive Preview ───────────────────────────────────────────────────────────
function ArchivePreview() {
  if (ARCHIVE.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
            Session recordings
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-video rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span className="text-white/15 text-sm">▷</span>
            </div>
          ))}
        </div>
        <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/28 mt-2 text-center">
          Recordings appear after each live class
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
          Session recordings
        </span>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#E85D26]">
          {ARCHIVE.length} recorded
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ARCHIVE.slice(0, 3).map((v, i) => (
          <a
            key={i}
            href={v.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group aspect-video rounded-lg overflow-hidden relative"
            style={{ background: '#0D2045', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {v.thumb
              ? <img src={v.thumb} alt={v.title} className="w-full h-full object-cover" />
              : <div className="absolute inset-0 flex items-center justify-center text-white/20 text-lg">▷</div>}
            <span className="absolute top-1 right-1 font-mono text-[7px] uppercase tracking-[0.1em] text-white/60 bg-black/40 px-1.5 py-0.5 rounded">
              {v.duration}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Enhanced Live Panel (Watch Live tab) ──────────────────────────────────────
const SAMPLE_FEED = '/ConradFoundation/nancy-sample-tile-v1.mp4';
const SAMPLE_POSTER = '/ConradFoundation/nancy-still-placeholder.jpg';

function LivePanel({ onRegister }) {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);
  const isLive = LIVE.status === 'live';

  // Real class airing — full-screen stream
  if (isLive && LIVE.embedUrl) {
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

  return (
    <div className="w-full h-full flex overflow-hidden" style={{ background: '#071530' }}>

      {/* ── Left column: video feed ────────────────────────────────────────── */}
      <div className="relative flex-1 min-w-0 bg-black overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          src={SAMPLE_FEED}
          poster={SAMPLE_POSTER}
          autoPlay
          muted={muted}
          loop
          playsInline
          onLoadedData={() => {
            if (videoRef.current) videoRef.current.currentTime = 2;
          }}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center center' }}
        />

        {/* Top overlay */}
        <div
          className="absolute inset-x-0 top-0 px-4 pt-4 pb-8 flex items-start justify-between"
          style={{ background: 'linear-gradient(180deg, rgba(7,21,48,0.88) 0%, transparent 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            {isLive ? (
              <span className="flex items-center gap-1.5 bg-[#E85D26] text-white font-mono text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-[3px]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-white/10 text-white/60 font-mono text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-[3px] border border-white/15">
                Sample broadcast
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/50">
            {isLive && <span><span className="text-white/85">312</span> watching</span>}
            {!isLive && LIVE.status === 'scheduled' && (
              <span className="text-white/50">
                Live {SESSIONS[0]?.date || LIVE.nextSession}
              </span>
            )}
          </div>
        </div>

        {/* Bottom overlay */}
        <div
          className="absolute inset-x-0 bottom-0 px-4 pt-10 pb-4 flex items-end justify-between gap-4"
          style={{ background: 'linear-gradient(0deg, rgba(7,21,48,0.95) 0%, transparent 100%)' }}
        >
          <div className="min-w-0">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-[#E85D26] mb-1.5">
              {isLive ? 'Now teaching · Nancy Conrad' : 'Upcoming · Nancy Conrad'}
            </p>
            <p className="font-display-serif text-[16px] md:text-[20px] leading-[1.12] text-white truncate">
              {SESSIONS[0]?.title || LIVE.title}
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

      {/* ── Right rail: calendar + Q&A + archive ──────────────────────────── */}
      <aside
        className="w-[300px] xl:w-[340px] shrink-0 flex flex-col overflow-y-auto"
        style={{ background: '#0A1C3D', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex-1 p-4 space-y-5">

          {/* Upcoming sessions */}
          <SessionCalendar onRegister={onRegister} />

          {/* Divider */}
          <div className="border-t border-white/8" />

          {/* Q&A widget */}
          <QAWidget />

          {/* Divider */}
          <div className="border-t border-white/8" />

          {/* Archive preview */}
          <ArchivePreview />

        </div>
      </aside>

    </div>
  );
}

// ─── Courses Preview Panel ────────────────────────────────────────────────────
// Shows Nancy (and any visitor) what the interactive course experience looks like.
// Follows the Holistic Balance / Summer School card aesthetic adapted for
// Conrad Foundation's Mission Water palette (navy + orange).
const PREVIEW_COURSES = [
  {
    id: 'c01',
    stage: 'Foundation',
    number: '01',
    title: 'Water Science Fundamentals',
 intro: 'The starting point, how water moves, what it carries, and why every living system on Earth depends on it.',
    accent: '#2A6E9E',
    modules: [
 { title: 'The Water Cycle', body: 'Evaporation, condensation, precipitation, tracking water as it moves across the planet' },
 { title: 'Properties of Water', body: 'Why water is unique, polarity, surface tension, its unmatched dissolving power' },
      { title: 'Aquifers & Water Tables', body: 'Underground storage systems and how they connect to your community\'s water supply' },
 { title: 'Water Quality Basics', body: 'What makes water safe or unsafe, physical, chemical, and biological factors' },
      { title: 'Measuring Water', body: 'Tools and field techniques scientists use to monitor water in real environments' },
    ],
  },
  {
    id: 'c02',
    stage: 'Applied Science',
    number: '02',
    title: 'Clean Water Technologies',
 intro: 'How engineers solve the water problems communities face, from filtration to desalination to real-time monitoring.',
    accent: '#E85D26',
    modules: [
      { title: 'Filtration Systems', body: 'How sand, carbon, and membrane filters remove contaminants from water' },
      { title: 'Biological Treatment', body: 'Using microorganisms to break down pollutants the natural way' },
      { title: 'Chemical Treatment', body: 'Chlorination, pH control, and targeted interventions for safe water' },
 { title: 'Desalination', body: 'Turning seawater into drinking water, the promise, the limits, the future' },
      { title: 'Field Monitoring', body: 'Real-time sensors and remote systems for continuous water quality data' },
    ],
  },
  {
    id: 'c03',
    stage: 'Systems Thinking',
    number: '03',
    title: 'Water as a Global Resource',
 intro: 'Water security, agriculture, policy, and the choices that define the next 50 years, and the role students play in the solution.',
    accent: '#3A7D4F',
    modules: [
 { title: 'Water Scarcity Today', body: 'Where the world is running dry, regional case studies and what\'s driving them' },
 { title: 'Agriculture & Water', body: 'Farming uses 70% of the world\'s freshwater, how that changes with new approaches' },
      { title: 'Industry & Pollution', body: 'Industrial water use, contamination pathways, and cleanup strategies' },
      { title: 'Policy & Governance', body: 'Water rights, international agreements, and who makes the decisions' },
 { title: 'Your Water Action Project', body: 'Student capstone, identify a local issue, propose a solution, present it' },
    ],
  },
];

function CoursesPreviewPanel() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: '#F5F3EE' }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(7,21,48,0.08)' }}>
        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#E85D26', fontWeight: 700, marginBottom: 6 }}>
          Course Preview
        </p>
        <h3 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 700, color: '#071530', lineHeight: 1.15, margin: '0 0 6px' }}>
          What students experience inside.
        </h3>
        <p style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: 13, color: 'rgba(7,21,48,0.5)', lineHeight: 1.55, margin: 0, maxWidth: 520 }}>
          Three science courses. Each broken into modules students work through at their own pace — with live sessions, the game, and mentors woven throughout.
        </p>
      </div>

      {/* Course cards */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PREVIEW_COURSES.map(course => {
          const isOpen = openId === course.id;
          return (
            <article key={course.id} style={{ background: '#fff', border: '1px solid rgba(7,21,48,0.10)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ borderLeft: `4px solid ${course.accent}`, padding: '20px 24px' }}>
                <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: course.accent, fontWeight: 700, marginBottom: 8 }}>
                  Stage {course.number} — {course.stage}
                </p>
                <h4 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(17px, 2vw, 21px)', fontWeight: 700, color: '#071530', lineHeight: 1.2, margin: '0 0 8px' }}>
                  {course.title}
                </h4>
                <p style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: 13, color: 'rgba(7,21,48,0.52)', lineHeight: 1.6, margin: '0 0 16px', maxWidth: 480 }}>
                  {course.intro}
                </p>
                <button
                  onClick={() => setOpenId(isOpen ? null : course.id)}
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 9,
                    letterSpacing: '0.26em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    color: course.accent,
                    background: 'transparent',
                    border: `1.5px solid ${course.accent}`,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isOpen ? 'Hide modules' : `View ${course.modules.length} modules`}
                  <span style={{ fontSize: 11 }}>{isOpen ? '↑' : '↓'}</span>
                </button>
              </div>

              {isOpen && (
                <div style={{ padding: '4px 24px 24px', background: '#FAFAF6' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10, paddingTop: 14 }}>
                    {course.modules.map((mod, i) => (
                      <div key={i} style={{ padding: '14px 16px', background: '#fff', border: '1px solid rgba(7,21,48,0.08)', borderRadius: 2 }}>
                        <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: course.accent, fontWeight: 700, marginBottom: 5 }}>
                          Module {String(i + 1).padStart(2, '0')}
                        </p>
                        <p style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: 13, fontWeight: 600, color: '#071530', lineHeight: 1.3, marginBottom: 5 }}>
                          {mod.title}
                        </p>
                        <p style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif', fontSize: 12, color: 'rgba(7,21,48,0.5)', lineHeight: 1.55, margin: 0 }}>
                          {mod.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(7,21,48,0.28)', textAlign: 'center', padding: '16px 16px 20px' }}>
        Curriculum developed with Conrad Foundation and NCEE — adapts as the program grows.
      </p>
    </div>
  );
}

// ─── Stage (tabbed: watch live / game / archive) ──────────────────────────────
function Stage({ tab, setTab }) {
  const [signUpSession, setSignUpSession] = useState(null);

  const tabs = [
    { id: 'live', label: 'Watch Live', url: 'aheadofmarket.com/missionwaterlive' },
    { id: 'game', label: 'Play the Game', url: 'aheadofmarket.com/missionwater' },
    { id: 'courses', label: 'Courses', url: 'aheadofmarket.com/missionwater/courses' },
  ];
  const active = tabs.find((t) => t.id === tab);

  return (
    <>
      {signUpSession && (
        <SignUpModal session={signUpSession} onClose={() => setSignUpSession(null)} />
      )}

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
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${LIVE.status === 'live' ? 'bg-[#E85D26] animate-pulse' : 'bg-[#E85D26]'}`} />
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
              {tab === 'live' && LIVE.status === 'scheduled' && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/35">
                    Next class:
                  </span>
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-white/60">
                    {SESSIONS[0]?.date || LIVE.nextSession}
                  </span>
                </div>
              )}
            </div>

            {/* Panels */}
            <div className="relative bg-[#071530]" style={{ height: STAGE_H }}>
              {/* Game — always mounted to preserve progress */}
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

              {/* Watch Live */}
              <div className={tab === 'live' ? 'block h-full' : 'hidden'}>
                <LivePanel onRegister={setSignUpSession} />
              </div>

              {/* Courses Preview */}
              <div className={tab === 'courses' ? 'block h-full' : 'hidden'}>
                <CoursesPreviewPanel />
              </div>
            </div>
          </motion.div>

          <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#071530]/35 mt-4 text-center">
            The game grows — this window grows with it. Live classes, recordings, and courses all in one place.
          </p>
        </div>
      </section>
    </>
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

 {/* ─── Title page, "The future of water in space" ─────────────────────── */}
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
                href="#stage"
                onClick={(e) => { e.preventDefault(); goToStage('live'); }}
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

      {/* ─── Interactive stage ───────────────────────────────────────────────── */}
      <Stage tab={tab} setTab={setTab} />

      {/* ─── Platform Pillars ─────────────────────────────────────────────────── */}
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
 desc: 'Real-time dashboards for educators to see where every student stands, no spreadsheets.',
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
 desc: 'Separate logins, same dashboard, different views. Educators see the full roster; parents see their student.',
              },
              {
                kicker: 'Live + Archive',
                title: 'Stream then keep',
 desc: 'Upcoming sessions previewed with set-a-reminder. Every recorded class kept indefinitely, and it all plays in the window above.',
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

      {/* ─── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="bg-white px-6 md:px-12 py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto">
          <motion.div className="max-w-[640px]" {...fadeUp()}>
            <Kicker className="mb-5">Ready when you are</Kicker>
            <h2 className="font-display-serif text-[36px] md:text-[56px] leading-[0.95] tracking-[-0.025em] text-[#071530] mb-6">
              Classes begin.<br />
              <span className="text-[#E85D26]">AOM builds.</span>
            </h2>
            <p className="font-body text-[16px] text-[#071530]/55 leading-[1.65] mb-8 max-w-[480px]">
              The game is live. The course engine is proven. Let&apos;s talk about what Mission Water looks like at full build.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="/missionwateroffering"
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