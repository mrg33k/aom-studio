import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Play, Plus } from 'lucide-react';

/**
 * HeroVariants -- four very different hero layouts with a localStorage-backed picker.
 * V1 Editorial   -- magazine cover, oversized serif, numbered manifesto column, no video.
 * V2 Split       -- 50/50 type/video, billboard energy, asymmetric.
 * V3 Cinema      -- full-bleed video, anchored bottom-left type, single CTA.
 * V4 Marquee     -- scrolling client/tag strips, mid-page slab type, mini portfolio row.
 */

const GUMLET_IDS = [
  '698a6296fc23d3d76fa8d992', // Journey To Gary Vee
  '698a5b86fc23d3d76fa82ece', // Noble Real Estate
  '698a6106aec3d4e420c2fd85', // Rainbow Rider
  '698a5d24aec3d4e420c2a0a0', // Pretty Penny
  '698a5ef5fc23d3d76fa87ef4', // Virtu Hospitality
  '698a64e5873071aec5ca99ac', // AZ Arts Foundation
  '698a63e5aec3d4e420c34783', // Cynshine Pilates
  '698a6127873071aec5ca3b36', // ASU:Peoria Forward
  '698a6177873071aec5ca4374', // Keep it Cut
  '698a5fcdfc23d3d76fa893b8', // United Food Bank
  '698a58c0aec3d4e420c21b78', // Aiper Pool Party
  '698a53a4aec3d4e420c17ee0', // Ducor Event Recap
  '698a53a9873071aec5c8b9d7', // Cook & Craft
  '698a5ebcaec3d4e420c2c573', // Ulisgold Pilates
];

const CLIENT_TAGS = [
  'Ambition Mechanical', 'ISA Energy', 'Skylar', 'Brandon Wiley',
  'Kohrs', 'Pala', 'S3C', 'Space Rising',
];

const VARIANTS = [
  { key: 'editorial', label: '01  Editorial' },
  { key: 'split',     label: '02  Split' },
  { key: 'cinema',    label: '03  Cinema' },
  { key: 'marquee',   label: '04  Marquee' },
];

const STORAGE_KEY = 'aom_hero_variant';

// ---------- helpers ----------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function GumletBg({ id, opacity = 0.55, contain = false }) {
  return (
    <iframe
      key={id}
      src={`https://play.gumlet.io/embed/${id}?autoplay=true&muted=true&loop=true&preload=true&controls=false&disable_player_controls=true`}
      className="absolute inset-0 w-full h-full border-none"
      style={{
        opacity,
        filter: 'grayscale(0.1) contrast(1.12)',
        objectFit: contain ? 'contain' : 'cover',
      }}
      allow="autoplay"
      tabIndex={-1}
    />
  );
}

// ============================================================
// V1 — EDITORIAL
// Magazine-cover energy. No video, oversized serif, edge stamp.
// ============================================================
export function HeroEditorial({ openBrief }) {
  return (
    <section className="relative min-h-[100svh] bg-[#0C0C0C] text-[#F0ECE6] overflow-hidden">
      {/* Edge stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#E85D26]" />

      {/* Edition stamp */}
      <div className="absolute top-28 right-8 md:right-12 text-right z-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F0ECE6]/50 leading-[1.6]">
          Vol. 010<br />
          Edition 04 / 2026<br />
          Phoenix, AZ
        </p>
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 pt-40 pb-24 md:pt-48 md:pb-32 grid grid-cols-12 gap-6 md:gap-10">
        {/* Left: Big headline */}
        <div className="col-span-12 md:col-span-9">
          <p className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-[#E85D26] mb-10">
            The Studio Issue · 002
          </p>
          <h1 className="font-headline text-[14vw] md:text-[10.5vw] leading-[0.92] tracking-[-0.025em]">
            We make<br />
            companies<br />
            <em className="text-[#E85D26]">impossible</em><br />
            to ignore.
          </h1>
          <div className="mt-12 max-w-2xl border-l-2 border-[#E85D26] pl-6">
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/80 leading-[1.55]">
              An independent Phoenix studio for brand, story, motion, and web.
              Available by subscription, by project, or by walking through the door.
            </p>
          </div>
        </div>

        {/* Right column: numbered manifesto */}
        <aside className="col-span-12 md:col-span-3 md:border-l md:border-white/[0.08] md:pl-6 mt-10 md:mt-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#F0ECE6]/50 mb-6">In this issue</p>
          {[
            { n: '01', t: 'Brand systems' },
            { n: '02', t: 'Brand films' },
            { n: '03', t: 'Web rebuilds' },
            { n: '04', t: 'Editorial cuts' },
            { n: '05', t: 'Studio retainer' },
          ].map((row) => (
            <div key={row.n} className="flex items-baseline gap-3 py-2 border-b border-white/[0.06] last:border-b-0">
              <span className="font-mono text-[11px] text-[#E85D26] tracking-[0.2em]">{row.n}</span>
              <span className="font-body text-[14px] text-[#F0ECE6]/85">{row.t}</span>
            </div>
          ))}
        </aside>
      </div>

      {/* Bottom band */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.08] bg-[#0C0C0C]/80 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-5 flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#F0ECE6]/50">
            Open for new work / 2026
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => openBrief?.()}
              className="bg-[#E85D26] text-[#0C0C0C] px-5 py-2.5 rounded-full font-body font-semibold text-[13px] hover:bg-[#FF6B2C] transition-colors flex items-center gap-2"
            >
              Start a project <ArrowRight size={14} />
            </button>
            <a href="#work" className="border border-white/20 px-5 py-2.5 rounded-full font-body font-medium text-[13px] hover:bg-white/5 transition-colors no-underline text-[#F0ECE6]">
              See the work
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// V2 — SPLIT
// 50/50: oversized type left, full video right. Billboard.
// ============================================================
export function HeroSplit({ openBrief }) {
  const [vid] = useState(() => GUMLET_IDS[Math.floor(Math.random() * GUMLET_IDS.length)]);

  return (
    <section className="relative min-h-[100svh] bg-[#0C0C0C] text-[#F0ECE6] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[100svh]">
        {/* Left: Type */}
        <div className="relative flex flex-col justify-between px-6 md:px-12 py-32 md:py-24 border-b md:border-b-0 md:border-r border-white/[0.08]">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26]">
            <span className="inline-block w-6 h-px bg-[#E85D26] mr-3 align-middle" />
            Phoenix Studio · 2026
          </p>

          <div>
            <h1 className="font-headline text-[12vw] md:text-[7.5vw] leading-[0.92] tracking-[-0.025em]">
              The studio<br />
              that <em className="text-[#E85D26]">moves</em><br />
              with you.
            </h1>
            <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/80 leading-[1.55] mt-8 max-w-md">
              Brand, story, motion, web. Days, not months. Phoenix-built, available anywhere.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-10">
              <button
                onClick={() => openBrief?.()}
                className="bg-[#E85D26] text-[#0C0C0C] px-6 py-3.5 rounded-full font-body font-semibold text-[14px] hover:bg-[#FF6B2C] transition-colors flex items-center gap-2"
              >
                Start a project <ArrowRight size={15} />
              </button>
              <a href="#work" className="border border-white/20 px-6 py-3.5 rounded-full font-body font-medium text-[14px] hover:bg-white/5 transition-colors no-underline text-[#F0ECE6]">
                See the work
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[#F0ECE6]/50 font-mono text-[10.5px] uppercase tracking-[0.22em]">
            <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E85D26] mr-2 align-middle" />Phoenix, AZ</span>
            <span>Brand · Story · Motion · Web</span>
          </div>
        </div>

        {/* Right: Video */}
        <div className="relative bg-black overflow-hidden min-h-[60svh] md:min-h-full">
          <div className="absolute inset-0">
            <iframe
              key={vid}
              src={`https://play.gumlet.io/embed/${vid}?autoplay=true&muted=true&loop=true&preload=true&controls=false&disable_player_controls=true`}
              className="absolute top-1/2 left-1/2 border-none"
              style={{
                width: '177.78%',
                height: '100%',
                minHeight: '177.78%',
                minWidth: '100%',
                transform: 'translate(-50%, -50%)',
                filter: 'grayscale(0.05) contrast(1.1)',
              }}
              allow="autoplay"
              tabIndex={-1}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#0C0C0C]/30" />
          {/* Now showing badge */}
          <div className="absolute top-8 left-8 z-10 flex items-center gap-2 bg-[#0C0C0C]/70 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#E85D26] animate-pulse" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#F0ECE6]">Now showing · Live reel</p>
          </div>
          {/* Bottom credits */}
          <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between z-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#F0ECE6]/60 max-w-xs">
              From the AOM client roster.
            </p>
            <a href="#work" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#F0ECE6] flex items-center gap-1.5 no-underline group">
              See all <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// V3 — CINEMA
// Full-bleed video, single anchored block bottom-left.
// ============================================================
export function HeroCinema({ openBrief }) {
  const [playlist] = useState(() => shuffle(GUMLET_IDS).slice(0, 5));
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((p) => (p + 1) % playlist.length);
        setVisible(true);
      }, 1200);
    }, 9000);
    return () => clearInterval(t);
  }, [playlist]);

  return (
    <section className="relative min-h-[100svh] bg-[#0C0C0C] text-[#F0ECE6] overflow-hidden">
      {/* Full-bleed video */}
      <div className="absolute inset-0 z-0">
        <iframe
          key={playlist[idx]}
          src={`https://play.gumlet.io/embed/${playlist[idx]}?autoplay=true&muted=true&loop=true&preload=true&controls=false&disable_player_controls=true`}
          className="absolute top-1/2 left-1/2 border-none transition-opacity duration-[1200ms]"
          style={{
            width: '177.78vh',
            height: '56.25vw',
            minWidth: '100%',
            minHeight: '100%',
            transform: 'translate(-50%, -50%)',
            opacity: visible ? 0.7 : 0,
            filter: 'grayscale(0.15) contrast(1.18)',
          }}
          allow="autoplay"
          tabIndex={-1}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0C] via-[#0C0C0C]/70 to-[#0C0C0C]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0C0C]/70 via-transparent to-transparent" />
      </div>

      {/* Top stamp */}
      <div className="relative z-10 pt-28 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3 bg-[#0C0C0C]/60 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#E85D26] animate-pulse" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#F0ECE6]">
            Reel {idx + 1} of {playlist.length}
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#F0ECE6]/70 hidden sm:block">
          Phoenix · 2026
        </p>
      </div>

      {/* Anchored block bottom-left */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12 absolute bottom-0 left-0 right-0 pb-20 md:pb-28 mt-[40svh]">
        <div className="max-w-3xl">
          <h1 className="font-headline text-[12vw] md:text-[8.5vw] leading-[0.92] tracking-[-0.025em]">
            Made <em className="text-[#E85D26]">to be<br />seen.</em>
          </h1>
          <p className="font-body text-[16px] md:text-[18px] text-[#F0ECE6]/85 leading-[1.55] mt-6 max-w-xl">
            Brand films, websites, and creative systems for companies that do real work.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-8">
            <button
              onClick={() => openBrief?.()}
              className="bg-[#E85D26] text-[#0C0C0C] px-6 py-3.5 rounded-full font-body font-semibold text-[14px] hover:bg-[#FF6B2C] transition-colors flex items-center gap-2"
            >
              Start a project <ArrowRight size={15} />
            </button>
            <a href="#work" className="text-[#F0ECE6] flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.22em] no-underline group">
              <Play size={14} className="fill-current" />
              Watch the reel
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// V4 — MARQUEE
// Scrolling client/tag strips top + bottom, slab type middle, mini reel row.
// ============================================================
export function HeroMarquee({ openBrief }) {
  const tiles = useMemo(() => shuffle(GUMLET_IDS).slice(0, 5), []);

  return (
    <section className="relative min-h-[100svh] bg-[#0C0C0C] text-[#F0ECE6] overflow-hidden flex flex-col">
      {/* Top marquee strip */}
      <div className="relative pt-28 border-b border-white/[0.08] overflow-hidden">
        <div className="flex items-center gap-12 whitespace-nowrap py-5 animate-marquee-slow font-headline text-[36px] md:text-[44px] tracking-[-0.02em] text-[#F0ECE6]/85">
          {[...CLIENT_TAGS, ...CLIENT_TAGS].map((t, i) => (
            <React.Fragment key={`top-${i}`}>
              <span>{t}</span>
              <span className="w-2 h-2 rounded-full bg-[#E85D26]" />
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Center type slab */}
      <div className="flex-1 flex items-center px-6 md:px-12 py-16">
        <div className="max-w-[1440px] mx-auto w-full">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-[#E85D26] mb-6">
            <span className="inline-block w-6 h-px bg-[#E85D26] mr-3 align-middle" />
            A studio in motion
          </p>
          <h1 className="font-headline text-[14vw] md:text-[9vw] leading-[0.9] tracking-[-0.025em] max-w-[18ch]">
            We don't slow down<br />
            <em className="text-[#E85D26]">for anyone.</em>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-10">
            <p className="md:col-span-6 font-body text-[16px] md:text-[18px] text-[#F0ECE6]/80 leading-[1.55] max-w-2xl">
              Brand. Story. Motion. Web. Built in days, not months. Hire us by subscription, by project, or by walking into the studio.
            </p>
            <div className="md:col-span-6 flex flex-wrap items-center gap-3 md:justify-end">
              <button
                onClick={() => openBrief?.()}
                className="bg-[#E85D26] text-[#0C0C0C] px-6 py-3.5 rounded-full font-body font-semibold text-[14px] hover:bg-[#FF6B2C] transition-colors flex items-center gap-2"
              >
                Start a project <ArrowRight size={15} />
              </button>
              <a href="#work" className="border border-white/20 px-6 py-3.5 rounded-full font-body font-medium text-[14px] hover:bg-white/5 transition-colors no-underline text-[#F0ECE6]">
                See the work
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mini reel row */}
      <div className="relative border-t border-white/[0.08] grid grid-cols-2 md:grid-cols-5">
        {tiles.map((id, i) => (
          <a
            key={id}
            href="#work"
            className="relative h-[26svh] md:h-[20svh] overflow-hidden group border-r border-white/[0.06] last:border-r-0"
          >
            <iframe
              src={`https://play.gumlet.io/embed/${id}?autoplay=true&muted=true&loop=true&preload=true&controls=false&disable_player_controls=true`}
              className="absolute top-1/2 left-1/2 border-none"
              style={{
                width: '177.78%',
                height: '100%',
                minHeight: '177.78%',
                minWidth: '100%',
                transform: 'translate(-50%, -50%)',
                filter: 'grayscale(0.4) contrast(1.05)',
              }}
              allow="autoplay"
              tabIndex={-1}
            />
            <div className="absolute inset-0 bg-[#0C0C0C]/40 group-hover:bg-[#0C0C0C]/10 transition-colors" />
            <div className="absolute bottom-2 left-3 z-10">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/80">
                Reel {String(i + 1).padStart(2, '0')}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Local marquee animation */}
      <style>{`
        @keyframes marquee-slow {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-marquee-slow {
          animation: marquee-slow 60s linear infinite;
        }
      `}</style>
    </section>
  );
}

// ============================================================
// PICKER + SHELL
// ============================================================
export default function HeroVariants({ openBrief, scrollToSection }) {
  const [variant, setVariant] = useState(() => {
    if (typeof window === 'undefined') return 'cinema';
    return localStorage.getItem(STORAGE_KEY) || 'cinema';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, variant);
  }, [variant]);

  const Active = {
    editorial: HeroEditorial,
    split: HeroSplit,
    cinema: HeroCinema,
    marquee: HeroMarquee,
  }[variant] || HeroCinema;

  return (
    <>
      <Active openBrief={openBrief} scrollToSection={scrollToSection} />

      {/* Variant picker -- floating bottom-right */}
      <div className="fixed bottom-4 right-4 z-[300] flex flex-col items-end gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-[#0C0C0C]/90 backdrop-blur-md border border-white/[0.12] rounded-2xl p-1.5 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#F0ECE6]/50 px-2.5 py-1.5">Hero</p>
            {VARIANTS.map((v) => (
              <button
                key={v.key}
                onClick={() => setVariant(v.key)}
                className={`font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full transition-all ${
                  variant === v.key
                    ? 'bg-[#E85D26] text-[#0C0C0C] font-semibold'
                    : 'text-[#F0ECE6]/70 hover:text-[#F0ECE6] hover:bg-white/[0.06]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
