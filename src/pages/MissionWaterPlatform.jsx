// R3 — MissionWaterPlatform — interactive platform demo
// /MissionWaterPlatform · /missionwaterplatform · /platform
// Mission: conrad-foundation:mission-water · task 5faf1eb7-942b-4310-82d5-28c4e943ac7b
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    setMeta('description', 'Mission Water — the learning platform for the Conrad Foundation. Interactive game, live classes, student progress, educator tools.');
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
function Kicker({ children, className = '', style }) {
  return (
    <p
      className={`font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] ${className}`}
      style={style}
    >
      {children}
    </p>
  );
}

function StatusPill({ tone = 'neutral', children }) {
  const tones = {
    on:        'bg-[#E85D26]/15 text-[#E85D26] border-[#E85D26]/30',
    behind:    'bg-[#F0ECE6]/[0.05] text-[#F0ECE6]/55 border-[#F0ECE6]/15',
    done:      'bg-[#7C9A72]/15 text-[#9BB593] border-[#7C9A72]/30',
    neutral:   'bg-[#F0ECE6]/[0.05] text-[#F0ECE6]/55 border-[#F0ECE6]/15',
    submitted: 'bg-[#E85D26]/12 text-[#E85D26] border-[#E85D26]/25',
    reviewed:  'bg-[#7C9A72]/12 text-[#9BB593] border-[#7C9A72]/25',
    upcoming:  'bg-[#F0ECE6]/[0.05] text-[#F0ECE6]/55 border-[#F0ECE6]/15',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full whitespace-nowrap border ${tones[tone] || tones.neutral}`}
    >
      {children}
    </span>
  );
}

function ProgressBar({ pct, height = 6, accent = '#E85D26' }) {
  return (
    <div
      className="w-full rounded-full overflow-hidden bg-[#F0ECE6]/[0.06]"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: accent }}
      />
    </div>
  );
}

// ─── Persistent demo header ───────────────────────────────────────────────────
function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 bg-[#0C0C0C]/95 backdrop-blur-sm border-b border-[#E85D26]/20">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-2.5 flex items-center gap-3">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse flex-shrink-0" />
        <Kicker className="!text-[#F0ECE6]/80">
          Live demo · explore every section
        </Kicker>
      </div>
    </div>
  );
}

function TopBar({ view, setView }) {
  const tabs = [
    { id: 'landing',  label: 'Sign in' },
    { id: 'student',  label: 'Student portal' },
    { id: 'admin',    label: 'Educator / parent' },
    { id: 'stream',   label: 'Live classes' },
  ];
  return (
    <div className="sticky top-[40px] z-40 bg-[#0C0C0C]/90 backdrop-blur-sm border-b border-[#F0ECE6]/[0.06]">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between gap-6 py-4">
          <button
            onClick={() => setView('landing')}
            className="flex items-center gap-3 group"
          >
            <div className="w-7 h-7 rounded-full border border-[#E85D26]/40 flex items-center justify-center">
              <span className="text-[#E85D26] text-[12px]">◐</span>
            </div>
            <div className="text-left">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/40 leading-none mb-0.5">
                Conrad Foundation
              </p>
              <p className="font-display-serif text-[15px] leading-none tracking-[-0.01em]">
                Mission Water
              </p>
            </div>
          </button>
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`font-mono text-[10.5px] uppercase tracking-[0.18em] px-3.5 py-2 rounded-full transition-colors whitespace-nowrap ${
                  view === t.id
                    ? 'bg-[#E85D26] text-[#0C0C0C]'
                    : 'text-[#F0ECE6]/55 hover:text-[#F0ECE6] hover:bg-[#F0ECE6]/[0.05]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="md:hidden">
            <select
              value={view}
              onChange={e => setView(e.target.value)}
              className="bg-[#181818] border border-[#F0ECE6]/15 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#F0ECE6]/80"
            >
              {tabs.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View: Landing / role selector ───────────────────────────────────────────
function Landing({ setView }) {
  return (
    <section className="px-6 md:px-12 pt-16 md:pt-24 pb-24">
      <div className="max-w-[1280px] mx-auto">
        <motion.div {...fadeUp()}>
          <Kicker className="mb-5">For students, educators, parents</Kicker>
          <h1 className="font-display-serif text-[44px] md:text-[88px] lg:text-[112px] leading-[0.9] tracking-[-0.035em] max-w-[1000px]">
            Welcome to{' '}
            <em className="font-display-italic italic font-medium text-[#E85D26]">
              Mission Water.
            </em>
          </h1>
          <p className="font-display-serif text-[19px] md:text-[24px] leading-[1.35] tracking-[-0.015em] mt-7 max-w-[700px] text-[#F0ECE6]/65">
            The learning platform built around the global water crisis — Earth, deep
            space, and the systems that keep us alive.
          </p>
        </motion.div>

        {/* Login panels */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.button
            onClick={() => setView('student')}
            className="text-left p-8 md:p-10 rounded-2xl border border-[#F0ECE6]/[0.07] hover:border-[#E85D26]/40 hover:bg-[#E85D26]/[0.03] transition-all group"
            {...fadeUp(0.1)}
          >
            <div className="flex items-start justify-between mb-8">
              <div className="w-12 h-12 rounded-full border border-[#E85D26]/30 flex items-center justify-center">
                <span className="text-[#E85D26] text-[16px]">◐</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/35 group-hover:text-[#E85D26] transition-colors">
                Sign in →
              </span>
            </div>
            <Kicker className="mb-2.5">For students</Kicker>
            <p className="font-display-serif text-[28px] md:text-[34px] leading-[1.05] tracking-[-0.02em] mb-3">
              Student Portal
            </p>
            <p className="font-body text-[14px] text-[#F0ECE6]/50 leading-[1.55]">
              Your courses, the Mission Water game, your live class schedule, and what
              your teacher has reviewed.
            </p>
          </motion.button>

          <motion.button
            onClick={() => setView('admin')}
            className="text-left p-8 md:p-10 rounded-2xl border border-[#F0ECE6]/[0.07] hover:border-[#E85D26]/40 hover:bg-[#E85D26]/[0.03] transition-all group"
            {...fadeUp(0.18)}
          >
            <div className="flex items-start justify-between mb-8">
              <div className="w-12 h-12 rounded-full border border-[#E85D26]/30 flex items-center justify-center">
                <span className="text-[#E85D26] text-[14px]">◎</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/35 group-hover:text-[#E85D26] transition-colors">
                Sign in →
              </span>
            </div>
            <Kicker className="mb-2.5">For educators &amp; parents</Kicker>
            <p className="font-display-serif text-[28px] md:text-[34px] leading-[1.05] tracking-[-0.02em] mb-3">
              Admin Dashboard
            </p>
            <p className="font-body text-[14px] text-[#F0ECE6]/50 leading-[1.55]">
              Track your class roster or your child&rsquo;s progress, review submissions,
              and join live sessions.
            </p>
          </motion.button>
        </div>

        {/* The Game teaser */}
        <motion.div
          className="mt-12 md:mt-16 rounded-2xl border border-[#E85D26]/25 bg-gradient-to-br from-[#E85D26]/[0.06] to-transparent p-8 md:p-12 relative overflow-hidden"
          {...fadeUp(0.25)}
        >
          <div
            className="absolute -right-32 -top-32 w-[400px] h-[400px] rounded-full opacity-[0.10] pointer-events-none"
            style={{ background: 'radial-gradient(circle, #E85D26 0%, transparent 60%)' }}
          />
          <div className="relative grid grid-cols-1 md:grid-cols-[1.3fr_auto] gap-8 md:gap-12 items-center">
            <div>
              <Kicker className="mb-3.5">The Game · Chapter 1 live now</Kicker>
              <h2 className="font-display-serif text-[34px] md:text-[48px] leading-[0.95] tracking-[-0.025em] mb-4">
                Step into the mission.
              </h2>
              <p className="font-body text-[15px] md:text-[16px] text-[#F0ECE6]/60 leading-[1.6] max-w-[55ch]">
                A three-chapter interactive journey — across Earth, deep space, and the
                Moon — built on real ISS science. Open it in a new tab and play right
                now. No sign-in required for the demo.
              </p>
            </div>
            <a
              href="https://aheadofmarket.com/missionwater"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-[#0C0C0C] font-mono text-[11px] uppercase tracking-[0.22em] px-7 py-4 rounded-full transition-colors whitespace-nowrap"
            >
              Launch game ↗
            </a>
          </div>
        </motion.div>

        {/* Below the fold: explore prompt */}
        <motion.div className="mt-20 text-center" {...fadeUp(0.3)}>
          <Kicker className="!text-[#F0ECE6]/35 mb-3">Or explore the platform</Kicker>
          <p className="font-display-serif text-[18px] md:text-[20px] text-[#F0ECE6]/55 italic">
            Use the nav above to walk through every surface — student portal,
            educator dashboard, parent view, live classes.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── View: Student Portal ────────────────────────────────────────────────────
function StudentPortal({ setView }) {
  const [tab, setTab] = useState('dashboard');

  return (
    <section className="px-6 md:px-12 pt-12 pb-24">
      <div className="max-w-[1280px] mx-auto">
        {/* User strip */}
        <motion.div
          className="flex items-center justify-between gap-4 pb-6 border-b border-[#F0ECE6]/[0.07] mb-10"
          {...fadeUp()}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-[#E85D26]/15 border border-[#E85D26]/30 flex items-center justify-center font-display-serif text-[18px] text-[#E85D26]">
              J
            </div>
            <div>
              <p className="font-display-serif text-[18px] leading-tight tracking-[-0.01em]">
                Jordan Mendez
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/35 mt-0.5">
                Grade 8 · Phoenix, AZ
              </p>
            </div>
          </div>
          <StatusPill tone="on">
            <span className="w-1 h-1 rounded-full bg-[#E85D26]" /> Enrolled
          </StatusPill>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex items-center gap-1 mb-10 overflow-x-auto pb-1"
          {...fadeUp(0.05)}
        >
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'classes',   label: 'My Classes' },
            { id: 'progress',  label: 'Progress' },
            { id: 'resources', label: 'Resources' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`font-mono text-[10.5px] uppercase tracking-[0.18em] px-4 py-2 rounded-full transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-[#F0ECE6]/[0.08] text-[#F0ECE6] border border-[#F0ECE6]/12'
                  : 'text-[#F0ECE6]/45 hover:text-[#F0ECE6]/80 border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <StudentDashboard />
            </motion.div>
          )}
          {tab === 'classes' && (
            <motion.div
              key="classes"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <StudentClasses setView={setView} />
            </motion.div>
          )}
          {tab === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <StudentProgress />
            </motion.div>
          )}
          {tab === 'resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <StudentResources />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function StudentDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
      <div className="space-y-6">
        {/* Welcome / hero */}
        <div className="p-8 md:p-10 rounded-2xl border border-[#F0ECE6]/[0.07] bg-[#F0ECE6]/[0.02]">
          <Kicker className="mb-3">Today · Tuesday</Kicker>
          <p className="font-display-serif text-[28px] md:text-[34px] leading-[1.1] tracking-[-0.02em] mb-2">
            Welcome back, Jordan.
          </p>
          <p className="font-body text-[14px] text-[#F0ECE6]/55 mb-7 max-w-[55ch]">
            You&rsquo;re 40% through Chapter 1: <em className="not-italic text-[#F0ECE6]/80">Earth Investigation</em>.
            Your next live session is Thursday at 11 AM PT.
          </p>
          <div className="flex items-center justify-between mb-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/45">
              Course progress
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E85D26]">
              40%
            </p>
          </div>
          <ProgressBar pct={40} height={7} />
        </div>

        {/* THE GAME — featured */}
        <div className="relative rounded-2xl border border-[#E85D26]/30 bg-gradient-to-br from-[#E85D26]/[0.08] via-transparent to-transparent p-8 md:p-10 overflow-hidden">
          <div
            className="absolute -right-24 -bottom-24 w-[320px] h-[320px] rounded-full opacity-[0.10] pointer-events-none"
            style={{ background: 'radial-gradient(circle, #E85D26 0%, transparent 60%)' }}
          />
          <div className="relative">
            <Kicker className="mb-3">The Mission Water Game</Kicker>
            <p className="font-display-serif text-[26px] md:text-[32px] leading-[1.05] tracking-[-0.02em] mb-2">
              Continue Chapter 1 — Earth Investigation.
            </p>
            <p className="font-body text-[14px] text-[#F0ECE6]/55 mb-7 max-w-[50ch]">
              You left off in Phoenix tracing groundwater systems. Pick up where you stopped.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <a
                href="https://aheadofmarket.com/missionwater"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#E85D26] hover:bg-[#E85D26]/90 text-[#0C0C0C] font-mono text-[11px] uppercase tracking-[0.22em] px-6 py-3.5 rounded-full transition-colors"
              >
                Launch game →
              </a>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/40">
                Last played · 2 days ago
              </p>
            </div>
          </div>
        </div>

        {/* Deliverables */}
        <div className="p-7 md:p-8 rounded-2xl border border-[#F0ECE6]/[0.07]">
          <div className="flex items-center justify-between mb-5">
            <Kicker>Your submissions</Kicker>
            <button className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F0ECE6]/40 hover:text-[#E85D26]">
              View all →
            </button>
          </div>
          <div className="divide-y divide-[#F0ECE6]/[0.06]">
            {[
              { title: 'Water Scarcity Investigation — Phoenix region',  tone: 'reviewed',  status: 'Reviewed', sub: 'Returned 2 days ago · 92%' },
              { title: 'Groundwater systems analysis (written)',          tone: 'submitted', status: 'Submitted', sub: 'Awaiting review · 1 day ago' },
              { title: 'Mission log: Chapter 1 reflection',               tone: 'reviewed',  status: 'Reviewed', sub: 'Returned 6 days ago · 88%' },
            ].map((d, i) => (
              <div key={i} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-body text-[14px] text-[#F0ECE6]/85 leading-snug">{d.title}</p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#F0ECE6]/35 mt-1">
                    {d.sub}
                  </p>
                </div>
                <StatusPill tone={d.tone}>{d.status}</StatusPill>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Next session */}
        <div className="p-7 rounded-2xl border border-[#F0ECE6]/[0.07]">
          <div className="flex items-center justify-between mb-4">
            <Kicker>Next live session</Kicker>
            <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
          </div>
          <p className="font-display-serif text-[22px] leading-[1.15] tracking-[-0.015em] mb-1.5">
            Phoenix Water Systems Deep Dive
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F0ECE6]/45 mb-5">
            Thu, Mar 14 · 11:00 AM PT · Nancy Conrad
          </p>
          <div className="flex flex-col gap-2">
            <button className="w-full bg-[#E85D26] hover:bg-[#E85D26]/90 text-[#0C0C0C] font-mono text-[10.5px] uppercase tracking-[0.2em] py-3 rounded-full transition-colors">
              Add to calendar
            </button>
            <button className="w-full border border-[#F0ECE6]/[0.12] text-[#F0ECE6]/70 hover:text-[#F0ECE6] hover:border-[#F0ECE6]/25 font-mono text-[10.5px] uppercase tracking-[0.2em] py-3 rounded-full transition-colors">
              View agenda
            </button>
          </div>
        </div>

        {/* Recent activity */}
        <div className="p-7 rounded-2xl border border-[#F0ECE6]/[0.07]">
          <Kicker className="mb-5">Recent activity</Kicker>
          <div className="space-y-4">
            {[
              { dot: '#E85D26', text: 'Completed: Water Scarcity Investigation', when: '2 days ago' },
              { dot: '#E85D26', text: 'Submitted: Phoenix region analysis',       when: '1 day ago' },
              { dot: '#9BB593', text: 'Badge earned: Groundwater Hydrology',      when: '4 days ago' },
              { dot: '#9BB593', text: 'Watched: Session 2 recording',             when: '1 week ago' },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                  style={{ background: a.dot }}
                />
                <div className="min-w-0">
                  <p className="font-body text-[13.5px] text-[#F0ECE6]/80 leading-snug">{a.text}</p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#F0ECE6]/35 mt-0.5">
                    {a.when}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Streak */}
        <div className="p-7 rounded-2xl border border-[#F0ECE6]/[0.07] bg-[#F0ECE6]/[0.02]">
          <Kicker className="mb-3">Streak</Kicker>
          <p className="font-display-serif text-[44px] leading-none tracking-[-0.025em] text-[#E85D26]">
            6 days
          </p>
          <p className="font-body text-[13px] text-[#F0ECE6]/45 mt-2">
            Keep it going. Next badge unlocks at 10.
          </p>
        </div>
      </div>
    </div>
  );
}

function StudentClasses({ setView }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="p-8 rounded-2xl border border-[#E85D26]/25 bg-[#E85D26]/[0.03]">
        <div className="flex items-center justify-between mb-4">
          <StatusPill tone="on">Active</StatusPill>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E85D26]">
            40%
          </span>
        </div>
        <p className="font-display-serif text-[26px] leading-[1.1] tracking-[-0.02em] mb-2.5">
          Mission Water: What happens when there is no more water?
        </p>
        <p className="font-body text-[13.5px] text-[#F0ECE6]/55 mb-5 leading-[1.55]">
          A 12-module course exploring the global water crisis, the science of ISS water
          recycling, and the engineering of lunar survival systems.
        </p>
        <ProgressBar pct={40} />
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => setView('stream')}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E85D26] hover:text-[#F0ECE6]"
          >
            View classes →
          </button>
        </div>
      </div>

      <div className="p-8 rounded-2xl border border-[#F0ECE6]/[0.07] opacity-70">
        <div className="flex items-center justify-between mb-4">
          <StatusPill>Coming soon</StatusPill>
        </div>
        <p className="font-display-serif text-[26px] leading-[1.1] tracking-[-0.02em] mb-2.5">
          Mission Energy: The grid of the future
        </p>
        <p className="font-body text-[13.5px] text-[#F0ECE6]/50 mb-5 leading-[1.55]">
          A new Conrad Foundation masterclass exploring renewable infrastructure.
          Enrollment opens fall semester.
        </p>
        <button className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/40 hover:text-[#F0ECE6]/70">
          Get notified
        </button>
      </div>
    </div>
  );
}

function StudentProgress() {
  const modules = [
    { n: '01', t: 'What is the water crisis?',                  pct: 100 },
    { n: '02', t: 'Earth&rsquo;s freshwater systems',           pct: 100 },
    { n: '03', t: 'Phoenix: a case study in scarcity',          pct: 100 },
    { n: '04', t: 'Groundwater hydrology',                      pct: 100 },
    { n: '05', t: 'Investigation: your region',                 pct: 60  },
    { n: '06', t: 'The journey: water in transit',              pct: 0   },
    { n: '07', t: 'ISS water reclamation',                      pct: 0   },
    { n: '08', t: 'Electrolysis &amp; recycling',               pct: 0   },
  ];
  return (
    <div className="rounded-2xl border border-[#F0ECE6]/[0.07] overflow-hidden">
      <div className="px-7 py-5 border-b border-[#F0ECE6]/[0.07] flex items-center justify-between">
        <div>
          <Kicker className="mb-1.5">Course progress</Kicker>
          <p className="font-display-serif text-[20px] tracking-[-0.015em]">
            5 of 12 modules complete
          </p>
        </div>
        <p className="font-display-serif text-[40px] tracking-[-0.025em] text-[#E85D26]">
          40%
        </p>
      </div>
      <div className="divide-y divide-[#F0ECE6]/[0.06]">
        {modules.map((m, i) => (
          <div key={i} className="px-7 py-4 grid grid-cols-[40px_1fr_140px_60px] gap-4 items-center">
            <span className="font-mono text-[11px] tracking-[0.2em] text-[#E85D26]/60">{m.n}</span>
            <p
              className="font-body text-[14px] text-[#F0ECE6]/85"
              dangerouslySetInnerHTML={{ __html: m.t }}
            />
            <ProgressBar pct={m.pct} height={4} />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-right text-[#F0ECE6]/50">
              {m.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentResources() {
  const items = [
    { tag: 'PDF',   title: 'Mission Water field journal',         sub: 'Printable workbook · 24 pages' },
    { tag: 'Video', title: 'How the ISS recycles water',          sub: 'Nancy Conrad · 6 min' },
    { tag: 'Link',  title: 'NASA: Lunar water ice repository',    sub: 'External resource' },
    { tag: 'PDF',   title: 'Phoenix groundwater dataset',         sub: 'For Module 05 investigation' },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((r, i) => (
        <button
          key={i}
          className="text-left p-6 rounded-2xl border border-[#F0ECE6]/[0.07] hover:border-[#E85D26]/30 transition-colors"
        >
          <Kicker className="mb-3">{r.tag}</Kicker>
          <p className="font-display-serif text-[20px] leading-[1.15] tracking-[-0.015em] mb-1">
            {r.title}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F0ECE6]/35">
            {r.sub}
          </p>
        </button>
      ))}
    </div>
  );
}

// ─── View: Admin dashboard (educator + parent toggle) ────────────────────────
function AdminDashboard() {
  const [role, setRole] = useState('educator');
  return (
    <section className="px-6 md:px-12 pt-12 pb-24">
      <div className="max-w-[1280px] mx-auto">
        <motion.div className="mb-10" {...fadeUp()}>
          <Kicker className="mb-3">Admin dashboard</Kicker>
          <p className="font-display-serif text-[36px] md:text-[48px] leading-[0.95] tracking-[-0.025em]">
            Track every student. <em className="not-italic text-[#E85D26]">In real time.</em>
          </p>
        </motion.div>

        {/* Role toggle */}
        <motion.div
          className="inline-flex items-center bg-[#F0ECE6]/[0.04] border border-[#F0ECE6]/[0.08] rounded-full p-1 mb-10"
          {...fadeUp(0.05)}
        >
          {[
            { id: 'educator', label: 'Educator view' },
            { id: 'parent',   label: 'Parent view' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`font-mono text-[10.5px] uppercase tracking-[0.18em] px-5 py-2.5 rounded-full transition-colors ${
                role === r.id
                  ? 'bg-[#E85D26] text-[#0C0C0C]'
                  : 'text-[#F0ECE6]/55 hover:text-[#F0ECE6]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {role === 'educator' ? (
            <motion.div
              key="educator"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <EducatorView />
            </motion.div>
          ) : (
            <motion.div
              key="parent"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <ParentView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function EducatorView() {
  const roster = [
    { name: 'Jordan Mendez',     pct: 40, last: '2 hr ago',  status: 'on'     },
    { name: 'Priya Sharma',      pct: 67, last: '1 day ago', status: 'on'     },
    { name: 'Liam O’Connor', pct: 92, last: '4 hr ago',  status: 'done'   },
    { name: 'Aisha Bello',       pct: 25, last: '6 days ago',status: 'behind' },
    { name: 'Marco Russo',       pct: 58, last: '1 day ago', status: 'on'     },
    { name: 'Hana Kim',          pct: 71, last: '3 hr ago',  status: 'on'     },
  ];
  return (
    <div className="space-y-8">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Students enrolled', value: '24'   },
          { label: 'Avg progress',      value: '67%'  },
          { label: 'Sessions remaining',value: '4'    },
          { label: 'Submissions pending', value: '8'  },
        ].map((m, i) => (
          <motion.div
            key={i}
            className="p-6 rounded-2xl border border-[#F0ECE6]/[0.07]"
            {...fadeUp(i * 0.04)}
          >
            <p className="font-display-serif text-[36px] md:text-[44px] leading-none tracking-[-0.025em] mb-3">
              {m.value}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/45">
              {m.label}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6">
        {/* Roster */}
        <motion.div
          className="rounded-2xl border border-[#F0ECE6]/[0.07] overflow-hidden"
          {...fadeUp(0.1)}
        >
          <div className="px-6 py-5 border-b border-[#F0ECE6]/[0.07] flex items-center justify-between">
            <Kicker>Class roster · Spring cohort</Kicker>
            <button className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F0ECE6]/40 hover:text-[#E85D26]">
              + Add student
            </button>
          </div>
          <div className="hidden md:grid grid-cols-[1.4fr_1.2fr_1fr_0.8fr] gap-3 px-6 py-3 border-b border-[#F0ECE6]/[0.04]">
            {['Student', 'Progress', 'Last active', 'Status'].map(h => (
              <p
                key={h}
                className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#F0ECE6]/30"
              >
                {h}
              </p>
            ))}
          </div>
          <div className="divide-y divide-[#F0ECE6]/[0.05]">
            {roster.map((s, i) => (
              <div
                key={i}
                className="grid grid-cols-1 md:grid-cols-[1.4fr_1.2fr_1fr_0.8fr] gap-3 px-6 py-4 items-center hover:bg-[#F0ECE6]/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F0ECE6]/[0.06] border border-[#F0ECE6]/12 flex items-center justify-center font-mono text-[11px] text-[#F0ECE6]/80">
                    {s.name.charAt(0)}
                  </div>
                  <p className="font-body text-[13.5px] text-[#F0ECE6]/90">{s.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-[140px]">
                    <ProgressBar pct={s.pct} height={4} />
                  </div>
                  <span className="font-mono text-[10px] tracking-[0.15em] text-[#F0ECE6]/55">
                    {s.pct}%
                  </span>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F0ECE6]/45">
                  {s.last}
                </p>
                <StatusPill tone={s.status}>
                  {s.status === 'on'     ? 'On track'  : ''}
                  {s.status === 'behind' ? 'Behind'    : ''}
                  {s.status === 'done'   ? 'Completed' : ''}
                </StatusPill>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-[#F0ECE6]/[0.05] flex items-center gap-4 flex-wrap">
            <button className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/60 hover:text-[#E85D26]">
              Download report
            </button>
            <span className="text-[#F0ECE6]/15">·</span>
            <button className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/60 hover:text-[#E85D26]">
              Message students
            </button>
            <span className="text-[#F0ECE6]/15">·</span>
            <button className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/60 hover:text-[#E85D26]">
              View submissions
            </button>
          </div>
        </motion.div>

        {/* Upcoming sessions */}
        <motion.div className="space-y-5" {...fadeUp(0.18)}>
          <div className="p-7 rounded-2xl border border-[#F0ECE6]/[0.07]">
            <Kicker className="mb-5">Upcoming sessions</Kicker>
            <div className="space-y-5">
              {[
                { title: 'Phoenix Water Systems Deep Dive', when: 'Thu, Mar 14 · 11:00 AM PT' },
                { title: 'Mumbai &amp; the Monsoon Cycle',  when: 'Tue, Mar 19 · 10:00 AM PT' },
              ].map((s, i) => (
                <div key={i} className="pb-5 last:pb-0 border-b last:border-0 border-[#F0ECE6]/[0.05]">
                  <p
                    className="font-display-serif text-[19px] leading-[1.2] tracking-[-0.015em] mb-1.5"
                    dangerouslySetInnerHTML={{ __html: s.title }}
                  />
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F0ECE6]/45 mb-4">
                    {s.when}
                  </p>
                  <button className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E85D26] hover:text-[#F0ECE6]">
                    Send reminder →
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-7 rounded-2xl border border-[#E85D26]/25 bg-[#E85D26]/[0.04]">
            <Kicker className="mb-3">Action needed</Kicker>
            <p className="font-display-serif text-[19px] leading-[1.2] tracking-[-0.015em] mb-3">
              8 submissions awaiting review
            </p>
            <p className="font-body text-[13px] text-[#F0ECE6]/55 mb-5">
              Module 4 reflection essays from this week.
            </p>
            <button className="bg-[#E85D26] text-[#0C0C0C] font-mono text-[10.5px] uppercase tracking-[0.2em] px-5 py-2.5 rounded-full">
              Review now
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ParentView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
      <div className="space-y-6">
        <motion.div
          className="p-8 md:p-10 rounded-2xl border border-[#F0ECE6]/[0.07] bg-[#F0ECE6]/[0.02]"
          {...fadeUp()}
        >
          <div className="flex items-center gap-4 mb-7">
            <div className="w-12 h-12 rounded-full bg-[#E85D26]/15 border border-[#E85D26]/30 flex items-center justify-center font-display-serif text-[18px] text-[#E85D26]">
              J
            </div>
            <div>
              <Kicker className="mb-1">Your child</Kicker>
              <p className="font-display-serif text-[24px] leading-tight tracking-[-0.015em]">
                Jordan&rsquo;s Progress
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-8 items-center">
            <div className="flex items-center justify-center">
              {/* Circular progress */}
              <div className="relative w-[180px] h-[180px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="44"
                    stroke="rgba(240,236,230,0.06)" strokeWidth="6" fill="none"
                  />
                  <circle
                    cx="50" cy="50" r="44"
                    stroke="#E85D26" strokeWidth="6" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - 0.40)}`}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-display-serif text-[40px] leading-none tracking-[-0.025em] text-[#E85D26]">
                    40%
                  </p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#F0ECE6]/45 mt-1.5">
                    Complete
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="font-display-serif text-[22px] leading-[1.15] tracking-[-0.015em] mb-2">
                5 of 12 modules complete.
              </p>
              <p className="font-body text-[14px] text-[#F0ECE6]/55 leading-[1.55] mb-6">
                Jordan is on track. They&rsquo;ve completed Earth Investigation and are
                halfway through Module 5: regional water analysis.
              </p>
              <StatusPill tone="on">
                <span className="w-1 h-1 rounded-full bg-[#E85D26]" /> On track
              </StatusPill>
            </div>
          </div>
        </motion.div>

        {/* Game engagement */}
        <motion.div
          className="p-8 rounded-2xl border border-[#E85D26]/25 bg-gradient-to-br from-[#E85D26]/[0.05] to-transparent"
          {...fadeUp(0.08)}
        >
          <Kicker className="mb-3">Game engagement · this week</Kicker>
          <p className="font-display-serif text-[22px] leading-[1.2] tracking-[-0.015em] mb-3">
            Jordan launched the Mission Water game{' '}
            <em className="not-italic text-[#E85D26]">3 times this week.</em>
          </p>
          <p className="font-body text-[14px] text-[#F0ECE6]/55 leading-[1.55]">
            Currently in <em className="not-italic text-[#F0ECE6]/80">Chapter 1: Phoenix Investigation</em>.
            Total game time this month: 2 hr 18 min.
          </p>
        </motion.div>

        {/* Milestones */}
        <motion.div
          className="p-7 rounded-2xl border border-[#F0ECE6]/[0.07]"
          {...fadeUp(0.14)}
        >
          <Kicker className="mb-5">Recent milestones</Kicker>
          <div className="space-y-4">
            {[
              { t: 'Completed Module 4: Groundwater hydrology', when: 'Mar 6' },
              { t: 'Earned the &ldquo;Hydrologist&rdquo; badge', when: 'Mar 6' },
              { t: 'Submitted Phoenix regional analysis',       when: 'Mar 4' },
              { t: 'Attended live session: ISS Water Recycling', when: 'Feb 28' },
            ].map((m, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] mt-2 flex-shrink-0" />
                <div className="flex-1 flex items-baseline justify-between gap-3">
                  <p
                    className="font-body text-[14px] text-[#F0ECE6]/85"
                    dangerouslySetInnerHTML={{ __html: m.t }}
                  />
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#F0ECE6]/35 whitespace-nowrap">
                    {m.when}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Next session */}
        <div className="p-7 rounded-2xl border border-[#F0ECE6]/[0.07]">
          <Kicker className="mb-4">Next live session</Kicker>
          <p className="font-display-serif text-[20px] leading-[1.2] tracking-[-0.015em] mb-2">
            Phoenix Water Systems Deep Dive
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F0ECE6]/45 mb-5">
            Thu, Mar 14 · 11:00 AM PT
          </p>
          <button className="w-full border border-[#F0ECE6]/[0.15] text-[#F0ECE6]/80 hover:bg-[#F0ECE6]/[0.05] font-mono text-[10.5px] uppercase tracking-[0.2em] py-3 rounded-full transition-colors">
            Add to calendar
          </button>
        </div>

        {/* Teacher note */}
        <div className="p-7 rounded-2xl border border-[#E85D26]/25 bg-[#E85D26]/[0.04]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[#E85D26]/20 border border-[#E85D26]/40 flex items-center justify-center font-display-serif text-[14px] text-[#E85D26]">
              R
            </div>
            <div>
              <p className="font-body text-[14px] text-[#F0ECE6]/90">Ms. Rivera</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#F0ECE6]/35">
                Lead educator · Mar 7
              </p>
            </div>
          </div>
          <p className="font-display-serif text-[16px] leading-[1.45] tracking-[-0.005em] italic text-[#F0ECE6]/85">
            &ldquo;Jordan asked excellent questions during the Phoenix session this week.
            Their groundwater analysis was one of the strongest in the cohort.&rdquo;
          </p>
        </div>

        <button className="w-full bg-[#F0ECE6]/[0.04] hover:bg-[#F0ECE6]/[0.07] border border-[#F0ECE6]/[0.08] text-[#F0ECE6]/80 font-mono text-[10.5px] uppercase tracking-[0.2em] py-4 rounded-full transition-colors">
          Contact educator →
        </button>
      </div>
    </div>
  );
}

// ─── View: Live Stream Portal ────────────────────────────────────────────────
function LiveStreamPortal() {
  const [filter, setFilter] = useState('all');
  const videoRef = useRef(null);

  const sessions = [
    { n: '01', title: 'Earth Water Crisis',         duration: '52 min', date: 'Feb 14', tag: 'earth'    },
    { n: '02', title: 'Phoenix Investigation',       duration: '48 min', date: 'Feb 21', tag: 'earth'    },
    { n: '03', title: 'Mumbai Water Systems',        duration: '55 min', date: 'Feb 28', tag: 'earth'    },
    { n: '04', title: 'São Paulo Drought',      duration: '46 min', date: 'Mar 06', tag: 'earth'    },
    { n: '05', title: 'Space Water Solutions',       duration: '58 min', date: 'Mar 13', tag: 'space'    },
    { n: '06', title: 'Mission Debrief',             duration: '41 min', date: 'Mar 20', tag: 'solutions' },
  ];
  const visible = sessions.filter(s => filter === 'all' || s.tag === filter);

  return (
    <section className="px-6 md:px-12 pt-12 pb-24">
      <div className="max-w-[1280px] mx-auto">
        <motion.div className="mb-12" {...fadeUp()}>
          <Kicker className="mb-3">Live classes &amp; recordings</Kicker>
          <p className="font-display-serif text-[36px] md:text-[52px] leading-[0.95] tracking-[-0.025em] max-w-[800px]">
            Every session, on demand. <em className="not-italic text-[#E85D26]">Forever.</em>
          </p>
        </motion.div>

        {/* Upcoming */}
        <motion.div className="mb-14" {...fadeUp(0.05)}>
          <Kicker className="mb-5">Upcoming</Kicker>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Phoenix Water Systems Deep Dive', presenter: 'Nancy Conrad', when: 'Thu, Mar 14 · 11:00 AM PT' },
              { title: 'Mumbai &amp; the Monsoon Cycle',  presenter: 'Dr. Priya Sharma', when: 'Tue, Mar 19 · 10:00 AM PT' },
              { title: 'Lunar Water: The Next Frontier',  presenter: 'Dr. Michael Vasquez', when: 'Thu, Mar 21 · 11:00 AM PT' },
            ].map((s, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-[#F0ECE6]/[0.07] hover:border-[#E85D26]/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E85D26] animate-pulse" />
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#E85D26]">
                    Upcoming
                  </span>
                </div>
                <p
                  className="font-display-serif text-[20px] leading-[1.15] tracking-[-0.015em] mb-2"
                  dangerouslySetInnerHTML={{ __html: s.title }}
                />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F0ECE6]/45 mb-1">
                  {s.presenter}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F0ECE6]/45 mb-5">
                  {s.when}
                </p>
                <button className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E85D26] hover:text-[#F0ECE6]">
                  Set reminder →
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Featured recording */}
        <motion.div className="mb-14" {...fadeUp(0.1)}>
          <Kicker className="mb-5">Featured recording</Kicker>
          <div className="rounded-2xl overflow-hidden border border-[#F0ECE6]/[0.08] bg-[#181818]">
            <div className="relative aspect-video bg-[#0C0C0C]">
              <video
                ref={videoRef}
                src="/ConradFoundation/nancy-sample-tile-v1.mp4"
                poster="/ConradFoundation/nancy-still-placeholder.jpg"
                muted
                loop
                playsInline
                preload="metadata"
                onMouseEnter={() => videoRef.current?.play()}
                onMouseLeave={() => videoRef.current?.pause()}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0C] via-transparent to-transparent pointer-events-none" />
              <button
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  if (v.paused) v.play(); else v.pause();
                }}
                className="absolute inset-0 flex items-center justify-center group"
              >
                <div className="w-20 h-20 rounded-full bg-[#E85D26] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-[#0C0C0C] text-[22px] ml-1">▶</span>
                </div>
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 pointer-events-none">
                <Kicker className="mb-2 !text-[#F0ECE6]/70">Session 1 · Spring 2026</Kicker>
                <p className="font-display-serif text-[24px] md:text-[32px] leading-[1.05] tracking-[-0.02em]">
                  What Happens When Water Runs Out?
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F0ECE6]/55 mt-2">
                  Nancy Conrad · Founding Chairman, Conrad Foundation · 52 min
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Class directory */}
        <motion.div {...fadeUp(0.15)}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
            <Kicker>Class directory · 6 recorded sessions</Kicker>
            <div className="inline-flex items-center bg-[#F0ECE6]/[0.04] border border-[#F0ECE6]/[0.08] rounded-full p-1">
              {[
                { id: 'all',       label: 'All' },
                { id: 'earth',     label: 'Earth' },
                { id: 'space',     label: 'Space' },
                { id: 'solutions', label: 'Solutions' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`font-mono text-[10px] uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full transition-colors ${
                    filter === f.id
                      ? 'bg-[#E85D26] text-[#0C0C0C]'
                      : 'text-[#F0ECE6]/50 hover:text-[#F0ECE6]/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((s, i) => (
              <motion.div
                key={s.n}
                className="rounded-2xl overflow-hidden border border-[#F0ECE6]/[0.07] hover:border-[#E85D26]/30 transition-colors group cursor-pointer"
                {...fadeUp(i * 0.04)}
              >
                <div className="relative aspect-video bg-[#181818] overflow-hidden">
                  <img
                    src="/ConradFoundation/nancy-still-placeholder.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0C]/80 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/90 bg-[#0C0C0C]/60 backdrop-blur-sm px-2 py-1 rounded-full">
                    Session {s.n}
                  </div>
                  <div className="absolute bottom-3 right-3 font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#F0ECE6]/85 bg-[#0C0C0C]/60 backdrop-blur-sm px-2 py-1 rounded-full">
                    {s.duration}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-[#E85D26] flex items-center justify-center">
                      <span className="text-[#0C0C0C] text-[14px] ml-0.5">▶</span>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="font-display-serif text-[18px] leading-[1.2] tracking-[-0.015em] mb-2">
                    {s.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#F0ECE6]/40">
                      Recorded {s.date}
                    </p>
                    <button className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#E85D26] hover:text-[#F0ECE6]">
                      Watch →
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-[#F0ECE6]/[0.06] px-6 md:px-12 py-10 mt-10">
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="font-display-serif text-[18px] tracking-[-0.01em]">
            AOM <span className="text-[#F0ECE6]/30">×</span> Conrad Foundation
          </p>
          <p className="font-mono text-[10px] text-[#F0ECE6]/25 uppercase tracking-[0.2em] mt-1">
            Mission Water Platform · Demo build
          </p>
        </div>
        <div className="flex items-center gap-2 border border-[#F0ECE6]/10 px-3.5 py-2 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F0ECE6]/20" />
          <span className="font-mono text-[10px] text-[#F0ECE6]/30 uppercase tracking-[0.2em]">
            Private · Not for distribution
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function MissionWaterPlatform() {
  useSEO();
  const [view, setView] = useState('landing');

  useEffect(() => {
    // Scroll to top when view changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  return (
    <div
      className="bg-[#0C0C0C] text-[#F0ECE6] min-h-screen"
      style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
    >
      <DemoBanner />
      <TopBar view={view} setView={setView} />

      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Landing setView={setView} />
          </motion.div>
        )}
        {view === 'student' && (
          <motion.div
            key="student"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StudentPortal setView={setView} />
          </motion.div>
        )}
        {view === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AdminDashboard />
          </motion.div>
        )}
        {view === 'stream' && (
          <motion.div
            key="stream"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LiveStreamPortal />
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
